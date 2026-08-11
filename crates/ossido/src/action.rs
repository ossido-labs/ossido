//! Runtime support for `#[ossido::action]` server actions.
//!
//! A server action is a Rust function the build mirrors into a typed TypeScript
//! function (see the CLI's `typescript/actions.rs`). At runtime the generated
//! Axum handler delegates to the helpers here so the wire protocol and its
//! content negotiation live in one versioned place rather than being expanded
//! into every macro invocation.
//!
//! ## Wire protocol (`x-ossido-action-version: 1`)
//! One endpoint, `POST /__ossido/action/<module>/<fn>`, serves two callers:
//! - **Hydrated** — the generated TS `callAction` sends header `x-ossido-action: 1`
//!   with either a JSON body `{ "input": <I>, "__ossido_prev_state"?: <P> }` or a
//!   URL-encoded form (React `<form action>`), and expects the JSON envelope
//!   `{ "data": <T> } | { "error": <ActionError> }`.
//! - **No-JS progressive enhancement** — a native browser `<form>` POST
//!   (URL-encoded, `Accept: text/html`, no marker header) gets a **303**
//!   Post/Redirect/Get back to the referring page.
use std::collections::HashMap;
use std::future::Future;

use axum::Json;
use axum::body::Bytes;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Redirect, Response as AxumResponse};
use serde::Serialize;
use serde::de::DeserializeOwned;
use serde_json::json;

use crate::request::{BodyParseError, Request};
use crate::response::{render_error_to_string, respond_to_api_error};
use crate::server_error::catch_handler;

/// Response header stamping the wire-format version so a client running against a
/// mismatched server (stale generated `actions.ts`) can warn.
const VERSION_HEADER: [(&str, &str); 1] = [("x-ossido-action-version", "1")];

/// The reserved form field / JSON key carrying the previous `useActionState`
/// value back to the server. Client-supplied — treat as untrusted input.
pub const PREV_STATE_FIELD: &str = "__ossido_prev_state";

/// A domain error returned from an action as `Err(ActionError)`. Serialized into
/// the `{ "error": ... }` envelope (HTTP 422) and surfaced on the client as a
/// thrown `OssidoActionError`. Distinct from a panic, which is caught and routed
/// through the framework's `ServerError` overlay.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ActionError {
    pub message: String,
    /// Optional per-field validation messages (e.g. `{ "email": "required" }`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fields: Option<HashMap<String, String>>,
}

impl ActionError {
    /// An error with just a message.
    pub fn message(message: impl Into<String>) -> ActionError {
        ActionError {
            message: message.into(),
            fields: None,
        }
    }

    /// An error carrying per-field validation messages.
    pub fn with_fields(message: impl Into<String>, fields: HashMap<String, String>) -> ActionError {
        ActionError {
            message: message.into(),
            fields: Some(fields),
        }
    }
}

impl std::fmt::Display for ActionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.message)
    }
}

impl std::error::Error for ActionError {}

/// The previous `useActionState` state, round-tripped from the client. `None` on
/// the first render (or when the action is called imperatively without a prior
/// state). A `PrevState<T>` parameter is how an action opts into React's
/// `(prevState, formData) => newState` contract.
///
/// The wrapped value is untrusted client input — never use it as authorization
/// state.
#[derive(Debug, Clone, Default)]
pub struct PrevState<T>(Option<T>);

impl<T> PrevState<T> {
    pub fn new(value: Option<T>) -> PrevState<T> {
        PrevState(value)
    }

    /// The previous state, if any.
    pub fn get(&self) -> Option<&T> {
        self.0.as_ref()
    }

    /// Take ownership of the previous state, if any.
    pub fn into_inner(self) -> Option<T> {
        self.0
    }
}

/// A file uploaded via a `multipart/form-data` server action.
#[derive(Debug, Clone)]
pub struct UploadedFile {
    filename: String,
    content_type: Option<String>,
    bytes: Bytes,
}

impl UploadedFile {
    /// The client-provided file name.
    pub fn filename(&self) -> &str {
        &self.filename
    }

    /// The part's declared content type, if any.
    pub fn content_type(&self) -> Option<&str> {
        self.content_type.as_deref()
    }

    /// The file's bytes.
    pub fn bytes(&self) -> &[u8] {
        &self.bytes
    }

    /// The file size in bytes.
    pub fn len(&self) -> usize {
        self.bytes.len()
    }

    pub fn is_empty(&self) -> bool {
        self.bytes.is_empty()
    }

    /// Consume the file, returning its bytes.
    pub fn into_bytes(self) -> Vec<u8> {
        self.bytes.to_vec()
    }
}

/// The files uploaded by a `multipart/form-data` server action, keyed by form
/// field name. Declare a `Files` parameter on an `#[action]` to receive them;
/// it is empty for JSON / URL-encoded requests.
#[derive(Debug, Clone, Default)]
pub struct Files(HashMap<String, Vec<UploadedFile>>);

impl Files {
    /// The first file uploaded under `name`, if any.
    pub fn get(&self, name: &str) -> Option<&UploadedFile> {
        self.0.get(name).and_then(|files| files.first())
    }

    /// Every file uploaded under `name` (e.g. `<input type="file" multiple>`).
    pub fn get_all(&self, name: &str) -> &[UploadedFile] {
        self.0.get(name).map(Vec::as_slice).unwrap_or(&[])
    }

    pub fn contains(&self, name: &str) -> bool {
        self.0.contains_key(name)
    }

    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    /// The field names that carried at least one file.
    pub fn names(&self) -> impl Iterator<Item = &str> {
        self.0.keys().map(String::as_str)
    }
}

/// Failure to decode an action's input from the request body.
#[derive(Debug)]
pub enum ActionInputError {
    /// A JSON body (imperative / hydrated call) failed to parse.
    Body(BodyParseError),
    /// A URL-encoded form body (progressive enhancement) failed to parse.
    Form(BodyParseError),
}

impl std::fmt::Display for ActionInputError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ActionInputError::Body(e) => write!(f, "invalid JSON action input: {e:?}"),
            ActionInputError::Form(e) => write!(f, "invalid form action input: {e:?}"),
        }
    }
}

fn content_type(req: &Request) -> &str {
    req.headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
}

/// Whether to answer with the JSON envelope (hydrated fetch) rather than a 303
/// redirect (native no-JS form submit). True when the client sent the action
/// marker header or explicitly accepts JSON.
fn wants_json(req: &Request) -> bool {
    if req.headers.get("x-ossido-action").is_some() {
        return true;
    }
    req.headers
        .get("accept")
        .and_then(|v| v.to_str().ok())
        .map(|accept| accept.contains("application/json"))
        .unwrap_or(false)
}

/// A request body decoded once, ready to yield the typed input, the previous
/// `useActionState` value, and any uploaded files. Produced by [`decode_form`],
/// so a `multipart/form-data` body (potentially large, with files) is parsed a
/// single time.
pub struct DecodedForm {
    body: FormBody,
    files: Files,
}

enum FormBody {
    /// A JSON envelope: `{ "input": T, "__ossido_prev_state"?: … }`.
    Json(Vec<u8>),
    /// A URL-encoded form body (flat fields).
    UrlEncoded(Vec<u8>),
    /// The text fields of a multipart body (files are held in `Files`).
    Multipart(Vec<(String, String)>),
}

impl DecodedForm {
    /// The typed input. JSON reads `{ "input": T }`; URL-encoded / multipart
    /// text fields deserialize flatly (the reserved prev-state field is
    /// ignored). File fields are not part of the input — receive them via a
    /// `Files` parameter.
    pub fn input<T: DeserializeOwned>(&self) -> Result<T, ActionInputError> {
        match &self.body {
            FormBody::Json(bytes) => {
                #[derive(serde::Deserialize)]
                struct Wrapper<T> {
                    input: T,
                }
                serde_json::from_slice::<Wrapper<T>>(bytes)
                    .map(|wrapper| wrapper.input)
                    .map_err(|err| ActionInputError::Body(BodyParseError::Serde(err)))
            }
            FormBody::UrlEncoded(bytes) => {
                serde_urlencoded::from_bytes::<T>(bytes).map_err(input_form_err)
            }
            FormBody::Multipart(fields) => {
                // Re-encode the text fields as a query string so serde_urlencoded
                // performs the same scalar coercion as a URL-encoded body.
                let query = serde_urlencoded::to_string(fields).map_err(|err| {
                    ActionInputError::Form(BodyParseError::ContentType(err.to_string()))
                })?;
                serde_urlencoded::from_str::<T>(&query).map_err(input_form_err)
            }
        }
    }

    /// The previous `useActionState` value from the reserved `__ossido_prev_state`
    /// field. Missing / unparsable → `None`.
    pub fn prev_state<T: DeserializeOwned>(&self) -> PrevState<T> {
        let value = match &self.body {
            FormBody::Json(bytes) => {
                #[derive(serde::Deserialize)]
                struct Wrapper {
                    #[serde(rename = "__ossido_prev_state")]
                    prev: Option<Box<serde_json::value::RawValue>>,
                }
                serde_json::from_slice::<Wrapper>(bytes)
                    .ok()
                    .and_then(|wrapper| wrapper.prev)
                    .and_then(|raw| serde_json::from_str::<T>(raw.get()).ok())
            }
            FormBody::UrlEncoded(bytes) => {
                #[derive(serde::Deserialize)]
                struct Wrapper {
                    #[serde(rename = "__ossido_prev_state")]
                    prev: Option<String>,
                }
                serde_urlencoded::from_bytes::<Wrapper>(bytes)
                    .ok()
                    .and_then(|wrapper| wrapper.prev)
                    .and_then(|encoded| serde_json::from_str::<T>(&encoded).ok())
            }
            FormBody::Multipart(fields) => fields
                .iter()
                .find(|(name, _)| name == "__ossido_prev_state")
                .and_then(|(_, encoded)| serde_json::from_str::<T>(encoded).ok()),
        };
        PrevState(value)
    }

    /// Take ownership of any uploaded files (empty for non-multipart requests).
    pub fn take_files(&mut self) -> Files {
        std::mem::take(&mut self.files)
    }
}

/// Decode a request body a single time into a [`DecodedForm`], choosing JSON,
/// URL-encoded, or multipart by `Content-Type`.
pub async fn decode_form(req: &Request) -> DecodedForm {
    let ct = content_type(req);
    if ct.contains("application/json") {
        DecodedForm {
            body: FormBody::Json(req.raw_body().to_vec()),
            files: Files::default(),
        }
    } else if ct.contains("multipart/form-data") {
        let (fields, files) = parse_multipart(req).await.unwrap_or_default();
        DecodedForm {
            body: FormBody::Multipart(fields),
            files,
        }
    } else {
        DecodedForm {
            body: FormBody::UrlEncoded(req.raw_body().to_vec()),
            files: Files::default(),
        }
    }
}

fn input_form_err(err: serde_urlencoded::de::Error) -> ActionInputError {
    ActionInputError::Form(BodyParseError::UrlEncoded(err))
}

/// Parse a `multipart/form-data` body (from the already-buffered bytes) into its
/// text fields and uploaded files.
async fn parse_multipart(
    req: &Request,
) -> Result<(Vec<(String, String)>, Files), multer::Error> {
    let content_type = content_type(req);
    let boundary = multer::parse_boundary(content_type)?;

    let body = Bytes::copy_from_slice(req.raw_body());
    let stream = futures_util::stream::once(async move {
        Ok::<Bytes, std::convert::Infallible>(body)
    });
    let mut multipart = multer::Multipart::new(stream, boundary);

    let mut fields: Vec<(String, String)> = Vec::new();
    let mut files: HashMap<String, Vec<UploadedFile>> = HashMap::new();

    while let Some(field) = multipart.next_field().await? {
        let name = field.name().unwrap_or_default().to_string();
        let filename = field.file_name().map(str::to_string);
        let content_type = field.content_type().map(|mime| mime.to_string());

        match filename {
            Some(filename) => {
                let bytes = field.bytes().await?;
                files.entry(name).or_default().push(UploadedFile {
                    filename,
                    content_type,
                    bytes,
                });
            }
            None => {
                let value = field.text().await?;
                fields.push((name, value));
            }
        }
    }

    Ok((fields, Files(files)))
}

/// Run an action that takes a decoded input, catching panics and negotiating the
/// response. The caller (the `#[action]` macro) normalizes any return shape to
/// `Result<T, ActionError>` — a bare-`T` action is wrapped as `Ok(value)`.
pub async fn run_action<I, F, Fut, T>(
    req: &Request,
    decoded: Result<I, ActionInputError>,
    call: F,
) -> AxumResponse
where
    F: FnOnce(I) -> Fut,
    Fut: Future<Output = Result<T, ActionError>>,
    T: Serialize,
{
    let json = wants_json(req);
    let input = match decoded {
        Ok(input) => input,
        Err(error) => return input_error_response(req, json, error),
    };
    finish(req, json, catch_handler(call(input)).await).await
}

/// Run an action that takes no input. Used for zero-argument actions.
pub async fn run_action_no_input<F, Fut, T>(req: &Request, call: F) -> AxumResponse
where
    F: FnOnce() -> Fut,
    Fut: Future<Output = Result<T, ActionError>>,
    T: Serialize,
{
    let json = wants_json(req);
    finish(req, json, catch_handler(call()).await).await
}

async fn finish<T: Serialize>(
    req: &Request,
    json: bool,
    outcome: Result<Result<T, ActionError>, crate::server_error::ServerError>,
) -> AxumResponse {
    match outcome {
        Ok(Ok(value)) => success_response(req, json, &value),
        Ok(Err(error)) => error_response(req, json, &error),
        // A panic in user code: reuse the framework's error paths so the dev
        // overlay renders it exactly like an API/page handler panic.
        Err(server_error) if json => respond_to_api_error(req.clone(), server_error).await,
        Err(server_error) => render_error_to_string(req.clone(), server_error).await,
    }
}

fn success_response<T: Serialize>(req: &Request, json: bool, value: &T) -> AxumResponse {
    if json {
        (StatusCode::OK, VERSION_HEADER, Json(json!({ "data": value }))).into_response()
    } else {
        redirect_back(req)
    }
}

fn error_response(req: &Request, json: bool, error: &ActionError) -> AxumResponse {
    if json {
        (
            StatusCode::UNPROCESSABLE_ENTITY,
            VERSION_HEADER,
            Json(json!({ "error": error })),
        )
            .into_response()
    } else {
        // No-JS: the error is not surfaced beyond re-rendering the page. Model
        // recoverable errors inside the returned state (Ok) for full fidelity.
        redirect_back(req)
    }
}

fn input_error_response(req: &Request, json: bool, error: ActionInputError) -> AxumResponse {
    if json {
        let error = ActionError::message(format!("Invalid action input: {error}"));
        (
            StatusCode::UNPROCESSABLE_ENTITY,
            VERSION_HEADER,
            Json(json!({ "error": error })),
        )
            .into_response()
    } else {
        redirect_back(req)
    }
}

/// 303 Post/Redirect/Get back to the referring page (or `/`). `Redirect::to`
/// emits `303 See Other`, which turns the browser's re-request into a GET.
fn redirect_back(req: &Request) -> AxumResponse {
    let destination = req
        .headers
        .get("referer")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("/")
        .to_string();
    Redirect::to(&destination).into_response()
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use axum::http::{HeaderMap, Uri};

    use super::*;

    fn json_request(body: &str) -> Request {
        let mut headers = HeaderMap::new();
        headers.insert("content-type", "application/json".parse().unwrap());
        headers.insert("x-ossido-action", "1".parse().unwrap());
        Request::new(
            Uri::from_static("http://localhost:3000/__ossido/action/x/y"),
            headers,
            HashMap::new(),
            Some(body.as_bytes().to_vec()),
        )
    }

    fn form_request(body: &str) -> Request {
        let mut headers = HeaderMap::new();
        headers.insert(
            "content-type",
            "application/x-www-form-urlencoded".parse().unwrap(),
        );
        headers.insert("accept", "text/html".parse().unwrap());
        Request::new(
            Uri::from_static("http://localhost:3000/__ossido/action/x/y"),
            headers,
            HashMap::new(),
            Some(body.as_bytes().to_vec()),
        )
    }

    #[derive(Debug, serde::Deserialize, PartialEq)]
    struct Subscribe {
        email: String,
    }

    #[derive(Debug, serde::Deserialize, Default, PartialEq)]
    struct FormState {
        attempts: u32,
    }

    fn multipart_request(boundary: &str, body: &str) -> Request {
        let mut headers = HeaderMap::new();
        headers.insert(
            "content-type",
            format!("multipart/form-data; boundary={boundary}")
                .parse()
                .unwrap(),
        );
        headers.insert("x-ossido-action", "1".parse().unwrap());
        Request::new(
            Uri::from_static("http://localhost:3000/__ossido/action/x/y"),
            headers,
            HashMap::new(),
            Some(body.replace('\n', "\r\n").into_bytes()),
        )
    }

    #[tokio::test]
    async fn decode_input_reads_json_envelope() {
        let req = json_request(r#"{"input":{"email":"a@b.c"}}"#);
        let input: Subscribe = decode_form(&req).await.input().unwrap();
        assert_eq!(input.email, "a@b.c");
    }

    #[tokio::test]
    async fn decode_input_reads_flat_form_fields_ignoring_prev_state() {
        let req = form_request("email=a%40b.c&__ossido_prev_state=%7B%22attempts%22%3A2%7D");
        let input: Subscribe = decode_form(&req).await.input().unwrap();
        assert_eq!(input.email, "a@b.c");
    }

    #[tokio::test]
    async fn decode_input_surfaces_a_parse_error() {
        let req = json_request(r#"{"input":{"wrong":1}}"#);
        let result: Result<Subscribe, _> = decode_form(&req).await.input();
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn decode_prev_state_reads_json_and_form() {
        let json = json_request(r#"{"input":{"email":"a@b.c"},"__ossido_prev_state":{"attempts":3}}"#);
        assert_eq!(
            decode_form(&json).await.prev_state::<FormState>().get().unwrap().attempts,
            3
        );

        let form = form_request("email=a%40b.c&__ossido_prev_state=%7B%22attempts%22%3A5%7D");
        assert_eq!(
            decode_form(&form).await.prev_state::<FormState>().get().unwrap().attempts,
            5
        );
    }

    #[tokio::test]
    async fn decode_prev_state_defaults_to_none_when_absent() {
        let req = json_request(r#"{"input":{"email":"a@b.c"}}"#);
        assert!(decode_form(&req).await.prev_state::<FormState>().get().is_none());
    }

    #[tokio::test]
    async fn decode_multipart_reads_text_fields_and_files() {
        // A multipart body with one text field (`email`) and one file (`avatar`).
        let body = "--BOUNDARY\n\
             Content-Disposition: form-data; name=\"email\"\n\
             \n\
             a@b.c\n\
             --BOUNDARY\n\
             Content-Disposition: form-data; name=\"avatar\"; filename=\"a.txt\"\n\
             Content-Type: text/plain\n\
             \n\
             hello bytes\n\
             --BOUNDARY--\n";
        let req = multipart_request("BOUNDARY", body);
        let mut form = decode_form(&req).await;
        let files = form.take_files();
        let input: Subscribe = form.input().unwrap();

        assert_eq!(input.email, "a@b.c");
        let avatar = files.get("avatar").expect("an avatar file");
        assert_eq!(avatar.filename(), "a.txt");
        assert_eq!(avatar.content_type(), Some("text/plain"));
        assert_eq!(avatar.bytes(), b"hello bytes");
    }

    #[test]
    fn wants_json_is_true_for_the_action_header_and_false_for_a_native_form() {
        assert!(wants_json(&json_request(r#"{"input":{"email":"a@b.c"}}"#)));
        assert!(!wants_json(&form_request("email=a%40b.c")));
    }

    #[tokio::test]
    async fn run_action_returns_the_json_envelope_on_success() {
        let req = json_request(r#"{"input":{"email":"a@b.c"}}"#);
        let decoded: Result<Subscribe, _> = decode_form(&req).await.input();
        let response = run_action(&req, decoded, |input| async move {
            Ok::<_, ActionError>(serde_json::json!({ "echo": input.email }))
        })
        .await;

        assert_eq!(response.status(), StatusCode::OK);
        let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let value: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(value["data"]["echo"], "a@b.c");
    }

    #[tokio::test]
    async fn run_action_returns_a_422_error_envelope() {
        let req = json_request(r#"{"input":{"email":"a@b.c"}}"#);
        let decoded: Result<Subscribe, _> = decode_form(&req).await.input();
        let response = run_action(&req, decoded, |_input| async move {
            Err::<serde_json::Value, _>(ActionError::message("nope"))
        })
        .await;

        assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
        let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let value: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(value["error"]["message"], "nope");
    }

    #[tokio::test]
    async fn run_action_redirects_a_native_form_submit() {
        let mut req = form_request("email=a%40b.c");
        // A native submit carries a Referer to return to.
        std::sync::Arc::get_mut(&mut req.headers)
            .unwrap()
            .insert("referer", "/newsletter".parse().unwrap());
        let decoded: Result<Subscribe, _> = decode_form(&req).await.input();
        let response = run_action(&req, decoded, |input| async move {
            Ok::<_, ActionError>(serde_json::json!({ "echo": input.email }))
        })
        .await;

        assert_eq!(response.status(), StatusCode::SEE_OTHER);
        assert_eq!(response.headers().get("location").unwrap(), "/newsletter");
    }
}
