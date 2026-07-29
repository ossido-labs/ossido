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
    info: JsonResponseInfo,
}

impl<'a> JsonResponse<'a> {
    fn new(props: &'a dyn Serialize) -> Self {
        JsonResponse {
            data: Some(props),
            info: JsonResponseInfo::new(None),
        }
    }

    fn new_redirect(destination: String) -> Self {
        JsonResponse {
            data: None,
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
