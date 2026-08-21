// Shared across integration-test binaries; each `tests/*.rs` is its own crate
// and only uses a subset of these helpers, so unused ones are expected here.
#![allow(dead_code)]

pub mod mock_github_endpoint;
pub mod mock_registry;
pub mod temp_ossido_project;

/// Normalizes generated Rust source for formatting-insensitive comparison.
///
/// The generated `.ossido/main.rs` is now run through a Rust formatter, so
/// assertions on its contents must not depend on how it is formatted, only on
/// *what* is generated. Two formatter behaviours are normalized away:
/// - all whitespace (a single `.route(...)` call may be split over many lines);
/// - trailing commas the formatter inserts before a closing delimiter when it
///   wraps a call across lines (e.g. `post(x),\n)` vs `post(x))`).
pub fn normalize_generated_source(source: &str) -> String {
    let without_whitespace: String = source.chars().filter(|c| !c.is_whitespace()).collect();
    without_whitespace
        .replace(",)", ")")
        .replace(",]", "]")
        .replace(",}", "}")
}

/// Asserts that `haystack` contains `needle`, ignoring formatting differences
/// (whitespace and formatter-inserted trailing commas) in both.
pub fn assert_contains_ignoring_whitespace(haystack: &str, needle: &str) {
    let normalized_haystack = normalize_generated_source(haystack);
    let normalized_needle = normalize_generated_source(needle);
    assert!(
        normalized_haystack.contains(&normalized_needle),
        "expected generated source to contain (ignoring formatting):\n{needle}\n\n--- actual ---\n{haystack}"
    );
}
