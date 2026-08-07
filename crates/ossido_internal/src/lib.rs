pub mod config;
pub mod log;
pub mod ossido_println;

// Re-exported so `ossido_println!` can reference the `Colorize` trait through
// `$crate` — callers then need nothing in scope beyond the macro itself.
pub use colored;
