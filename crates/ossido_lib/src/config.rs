use once_cell::sync::OnceCell;
use ossido_internal::config::Config;

pub static GLOBAL_CONFIG: OnceCell<Config> = OnceCell::new();
