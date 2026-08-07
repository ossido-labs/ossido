#[macro_export]
/// Log a message in the terminal using the custom ossido formatter.
/// The messages printed with this macro should inform or
/// guide the user.
///
/// The debug/error messages should be printed using the `tracing` crate
macro_rules! ossido_println {
    ($($arg:tt)*) => {{
        println!(
            "{} {}",
            $crate::colored::Colorize::yellow("[OSSIDO]"),
            format!($($arg)*)
        );
    }};
}
