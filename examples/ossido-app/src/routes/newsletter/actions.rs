use ossido::{ActionError, Files, Logger, PrevState, Type, action};

#[Type]
pub struct Subscribe {
    pub email: String,
}

#[Type]
pub struct SubscribeResult {
    pub id: u64,
    pub email: String,
}

#[Type]
pub struct FormState {
    pub ok: bool,
    pub message: String,
    pub attempts: u32,
}

/// A stateless action: usable imperatively (`await subscribe({ email })`) and as
/// a progressive-enhancement `<Form action={subscribe}>`.
#[action]
pub async fn subscribe(input: Subscribe, logger: Logger) -> Result<SubscribeResult, ActionError> {
    logger.info("subscribe action invoked");
    if !input.email.contains('@') {
        return Err(ActionError::message("Please enter a valid email address"));
    }
    Ok(SubscribeResult {
        id: 1,
        email: input.email,
    })
}

#[Type]
pub struct UploadMeta {
    pub title: String,
}

#[Type]
pub struct UploadResult {
    pub title: String,
    pub filename: String,
    pub size: u64,
}

/// A `multipart/form-data` action: text fields decode into `input`, uploaded
/// files arrive via the `Files` parameter.
#[action]
pub async fn upload_avatar(
    input: UploadMeta,
    files: Files,
    logger: Logger,
) -> Result<UploadResult, ActionError> {
    let file = files
        .get("avatar")
        .ok_or_else(|| ActionError::message("an avatar file is required"))?;
    logger.info("received an avatar upload");
    Ok(UploadResult {
        title: input.title,
        filename: file.filename().to_string(),
        size: file.len() as u64,
    })
}

/// A stateful action for `useActionState` — receives the previous form state and
/// returns the next one.
#[action]
pub async fn submit_signup(prev: PrevState<FormState>, input: Subscribe) -> FormState {
    let attempts = prev.get().map(|state| state.attempts + 1).unwrap_or(1);
    if !input.email.contains('@') {
        return FormState {
            ok: false,
            message: "Invalid email".into(),
            attempts,
        };
    }
    FormState {
        ok: true,
        message: format!("Subscribed {}", input.email),
        attempts,
    }
}
