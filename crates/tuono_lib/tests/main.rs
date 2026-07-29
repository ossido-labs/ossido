// The `#[handler]` macro's data entry point references
// `crate::tuono_main_state::ApplicationState`, which the generated `main.rs`
// always defines (aliased to `()` when the app has no custom state). Mirror that
// here so the handler fixtures compile.
mod tuono_main_state {
    pub type ApplicationState = ();
}

pub mod utils;
