use crate::Request;
use crate::mode::{GLOBAL_MODE, Mode};
use crate::server_error::ServerError;
use crate::{Payload, ssr::Js};
use axum::Json;
use axum::http::{HeaderMap, StatusCode};
use axum::response::{Html, IntoResponse, Redirect, Response as AxumResponse};
use axum_extra::extract::cookie::{Cookie, CookieJar};
use erased_serde::Serialize;

const INTERNAL_SERVER_ERROR_HTML: &str = "500 Internal server error";

/// JSON body returned by the data endpoint (`/__tuono/data/...`) when a handler
/// panics. Mirrors the normal `{ data, info }` shape so the client parses it the
/// same way, with the error nested under `info.serverError` (dev only).
#[derive(serde::Serialize)]
struct JsonErrorResponse {
    data: Option<()>,
    info: JsonErrorInfo,
}

#[derive(serde::Serialize)]
struct JsonErrorInfo {
    #[serde(rename = "serverError", skip_serializing_if = "Option::is_none")]
    server_error: Option<ServerError>,
}

/// Render the SSR error page for a panicked handler. In development the page
/// boots the client with the error payload so the overlay renders; in
/// production it returns a detail-free `500` (no source/stack leaked).
pub fn render_error_to_string(req: Request, error: ServerError) -> AxumResponse {
    let mode = *GLOBAL_MODE.get().expect("Failed to get GLOBAL_MODE");

    if mode == Mode::Prod {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Html(INTERNAL_SERVER_ERROR_HTML.to_string()),
        )
            .into_response();
    }

    let mut payload = Payload::new_with_error(&req, error);
    match payload
        .client_payload()
        .ok()
        .and_then(|payload| Js::render_to_string(Some(&payload)).ok())
    {
        Some(html) => (StatusCode::INTERNAL_SERVER_ERROR, Html(html)).into_response(),
        None => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Html(INTERNAL_SERVER_ERROR_HTML.to_string()),
        )
            .into_response(),
    }
}

/// JSON error response for a panicked handler on the data endpoint. In
/// development it carries the structured error under `info.serverError`; in
/// production it returns a detail-free `500`.
pub fn error_json(error: ServerError) -> AxumResponse {
    let mode = *GLOBAL_MODE.get().expect("Failed to get GLOBAL_MODE");

    let server_error = if mode == Mode::Prod {
        None
    } else {
        Some(error)
    };

    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(JsonErrorResponse {
            data: None,
            info: JsonErrorInfo { server_error },
        }),
    )
        .into_response()
}

pub struct Props {
    data: Box<dyn Serialize>,
    http_code: StatusCode,
    cookies: CookieJar,
}

pub enum Response {
    Redirect(String),
    Props(Props),
    // TODO: improve this tuple to support a more generic IntoResponse
    Custom((StatusCode, HeaderMap, String)),
}

#[derive(serde::Serialize)]
struct JsonResponseInfo {
    redirect_destination: Option<String>,
}

impl JsonResponseInfo {
    fn new(redirect_destination: Option<String>) -> JsonResponseInfo {
        JsonResponseInfo {
            redirect_destination,
        }
    }
}

#[derive(serde::Serialize)]
struct JsonResponse<'a> {
    data: Option<&'a dyn Serialize>,
    #[serde(
        rename(serialize = "layoutData"),
        skip_serializing_if = "Option::is_none"
    )]
    layout_data: Option<&'a serde_json::Map<String, serde_json::Value>>,
    info: JsonResponseInfo,
}

impl<'a> JsonResponse<'a> {
    fn new(props: &'a dyn Serialize) -> Self {
        JsonResponse {
            data: Some(props),
            layout_data: None,
            info: JsonResponseInfo::new(None),
        }
    }

    fn new_with_layout(
        props: &'a dyn Serialize,
        layout_data: Option<&'a serde_json::Map<String, serde_json::Value>>,
    ) -> Self {
        JsonResponse {
            data: Some(props),
            layout_data,
            info: JsonResponseInfo::new(None),
        }
    }

    fn new_redirect(destination: String) -> Self {
        JsonResponse {
            data: None,
            layout_data: None,
            info: JsonResponseInfo::new(Some(destination)),
        }
    }
}

impl Props {
    pub fn new(data: impl Serialize + 'static) -> Self {
        Props {
            data: Box::new(data),
            http_code: StatusCode::OK,
            cookies: CookieJar::new(),
        }
    }

    pub fn status(&mut self, http_code: StatusCode) {
        self.http_code = http_code;
    }

    pub fn new_with_status(data: impl Serialize + 'static, http_code: StatusCode) -> Self {
        Props {
            data: Box::new(data),
            http_code,
            cookies: CookieJar::new(),
        }
    }

    pub fn add_cookie(&mut self, cookie: Cookie) {
        let jar = self.cookies.clone().add(cookie.into_owned());
        self.cookies = jar
    }
}

impl Response {
    pub fn render_to_string(&self, req: Request) -> impl IntoResponse + use<> {
        match self {
            Self::Props(Props {
                data,
                http_code,
                cookies,
            }) => {
                let payload = Payload::new(&req, data.as_ref()).client_payload().unwrap();

                match Js::render_to_string(Some(&payload)) {
                    Ok(html) => (*http_code, cookies.clone(), Html(html)),
                    Err(_) => (
                        *http_code,
                        cookies.clone(),
                        Html("500 Internal server error".to_string()),
                    ),
                }
                .into_response()
            }
            Self::Redirect(to) => Redirect::permanent(to).into_response(),
            Self::Custom(response) => response.clone().into_response(),
        }
    }

    pub fn json(&self) -> impl IntoResponse + use<> {
        match self {
            Self::Props(Props {
                data,
                http_code,
                cookies,
            }) => (
                *http_code,
                cookies.clone(),
                Json(JsonResponse::new(data.as_ref())),
            )
                .into_response(),
            Self::Redirect(destination) => (
                StatusCode::PERMANENT_REDIRECT,
                Json(JsonResponse::new_redirect(destination.to_string())),
            )
                .into_response(),
            // Custom never needs the "data" response since its scope
            // is outside the react domain
            Self::Custom(_) => (StatusCode::OK, Json("{}")).into_response(),
        }
    }
}

/// A handler's resolved output in a `Send` form, so a composite can hold it
/// across the `await` of the next handler in the chain. Unlike [`Response`] (whose
/// `Props` box a non-`Send` `dyn Serialize`), the props are already serialized to
/// a `serde_json::Value`.
pub enum HandlerData {
    Props {
        data: serde_json::Value,
        http_code: StatusCode,
        cookies: CookieJar,
    },
    Redirect(String),
    Error(ServerError),
    Custom((StatusCode, HeaderMap, String)),
}

/// Resolve a handler's `Result<Response, ServerError>` into the `Send`
/// [`HandlerData`], serializing any props to a `Value` immediately. Called from
/// the generated `tuono_internal_props` so the value returned across `await`
/// boundaries is `Send`.
pub fn resolve_handler(result: Result<Response, ServerError>) -> HandlerData {
    match result {
        Err(error) => HandlerData::Error(error),
        Ok(Response::Redirect(destination)) => HandlerData::Redirect(destination),
        Ok(Response::Custom(response)) => HandlerData::Custom(response),
        Ok(Response::Props(Props {
            data,
            http_code,
            cookies,
        })) => HandlerData::Props {
            data: serde_json::to_value(data.as_ref()).unwrap_or(serde_json::Value::Null),
            http_code,
            cookies,
        },
    }
}

/// Collect the layouts' data into a map keyed by `dataKey`, short-circuiting on
/// the first redirect/error.
enum LayoutResolution {
    Map(serde_json::Map<String, serde_json::Value>),
    Redirect(String),
    Error(ServerError),
}

fn resolve_layouts(layouts: Vec<(String, HandlerData)>) -> LayoutResolution {
    let mut map = serde_json::Map::new();
    for (key, data) in layouts {
        match data {
            HandlerData::Error(error) => return LayoutResolution::Error(error),
            HandlerData::Redirect(destination) => {
                return LayoutResolution::Redirect(destination);
            }
            // A layout renders no page body of its own, so `Custom` contributes
            // nothing to the data map.
            HandlerData::Custom(_) => {}
            HandlerData::Props { data, .. } => {
                map.insert(key, data);
            }
        }
    }
    LayoutResolution::Map(map)
}

/// Render the SSR HTML for a page together with the server data of every
/// `layout.rs` that wraps it. `layouts` is keyed by each layout's `dataKey`. A
/// redirect or panic from any handler in the chain short-circuits.
pub fn render_chain(
    req: Request,
    page: HandlerData,
    layouts: Vec<(String, HandlerData)>,
) -> AxumResponse {
    let layout_map = match resolve_layouts(layouts) {
        LayoutResolution::Error(error) => return render_error_to_string(req, error),
        LayoutResolution::Redirect(destination) => {
            return Redirect::permanent(&destination).into_response();
        }
        LayoutResolution::Map(map) => map,
    };

    match page {
        HandlerData::Error(error) => render_error_to_string(req, error),
        HandlerData::Redirect(destination) => Redirect::permanent(&destination).into_response(),
        HandlerData::Custom(response) => response.into_response(),
        HandlerData::Props {
            data,
            http_code,
            cookies,
        } => {
            let layout_data = if layout_map.is_empty() {
                None
            } else {
                Some(&layout_map)
            };
            let mut payload = Payload::new_with_layout(&req, &data, layout_data);

            match payload
                .client_payload()
                .ok()
                .and_then(|payload| Js::render_to_string(Some(&payload)).ok())
            {
                Some(html) => (http_code, cookies, Html(html)).into_response(),
                None => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Html(INTERNAL_SERVER_ERROR_HTML.to_string()),
                )
                    .into_response(),
            }
        }
    }
}

/// JSON for the data endpoint of a page wrapped by layouts: `{ data, layoutData,
/// info }`. Mirrors [`render_chain`]'s short-circuiting.
pub fn chain_json(page: HandlerData, layouts: Vec<(String, HandlerData)>) -> AxumResponse {
    let layout_map = match resolve_layouts(layouts) {
        LayoutResolution::Error(error) => return error_json(error),
        LayoutResolution::Redirect(destination) => {
            return (
                StatusCode::PERMANENT_REDIRECT,
                Json(JsonResponse::new_redirect(destination)),
            )
                .into_response();
        }
        LayoutResolution::Map(map) => map,
    };

    match page {
        HandlerData::Error(error) => error_json(error),
        HandlerData::Redirect(destination) => (
            StatusCode::PERMANENT_REDIRECT,
            Json(JsonResponse::new_redirect(destination)),
        )
            .into_response(),
        HandlerData::Custom(_) => (StatusCode::OK, Json("{}")).into_response(),
        HandlerData::Props {
            data,
            http_code,
            cookies,
        } => {
            let layout_data = if layout_map.is_empty() {
                None
            } else {
                Some(&layout_map)
            };
            (
                http_code,
                cookies,
                Json(JsonResponse::new_with_layout(&data, layout_data)),
            )
                .into_response()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_update_the_props_status_and_cookie() {
        let mut props = Props::new("{}");
        props.status(StatusCode::NOT_FOUND);
        props.add_cookie(Cookie::new("test", "cookie"));
        assert_eq!(props.http_code, StatusCode::NOT_FOUND);
        assert_eq!(
            props.cookies.get("test").unwrap(),
            &Cookie::new("test", "cookie")
        );
    }

    #[test]
    fn should_add_a_cookie_jar() {
        let mut props = Props::new("{}");
        props.status(StatusCode::NOT_FOUND);
        props.add_cookie(Cookie::new("test", "cookie"));
        assert_eq!(props.http_code, StatusCode::NOT_FOUND);
        assert_eq!(
            props.cookies.get("test").unwrap(),
            &Cookie::new("test", "cookie")
        );
    }
}
