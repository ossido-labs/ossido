//! Build-time enumeration of the concrete pages to generate for a dynamic route
//! — Ossido's answer to Next's `getStaticPaths` / `generateStaticParams`.
//!
//! A `#[ossido::static_paths]` function in a dynamic route's `page.rs`
//! receives a borrowed [`StaticPaths`] and `register`s one [`StaticParams`] per
//! page to generate. Each [`StaticParams`] fills *every* dynamic slot of the
//! route: `[param]` → a single segment via [`StaticParams::param`], and
//! `[...catchall]` → an ordered list of segments via [`StaticParams::catchall`].
//!
//! The set is serialised onto an internal endpoint (wired by the codegen) that
//! `ossido build --static` queries to learn which concrete URLs to render. The
//! build owns path construction: it substitutes each [`StaticParams`] into the
//! route's pattern (validating the slot names) to form each concrete path.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

/// The value bound to one dynamic slot of a route: a single URL segment
/// (`[param]`) or an ordered list of segments (`[...catchall]`).
///
/// Serialised *untagged*, so a single value is a JSON string and a catch-all is
/// a JSON array — matching how the build substitutes each into the route
/// pattern (and how Next represents catch-all params).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum SegmentValue {
    /// A `[param]` slot — exactly one URL segment.
    One(String),
    /// A `[...catchall]` slot — zero or more URL segments, in order.
    Many(Vec<String>),
}

/// The parameters for a single generated page: a map from each dynamic slot name
/// to its [`SegmentValue`]. Built through the closure passed to
/// [`StaticPaths::register`].
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct StaticParams(HashMap<String, SegmentValue>);

impl StaticParams {
    pub fn new() -> Self {
        StaticParams(HashMap::new())
    }

    /// Bind a `[name]` slot to a single URL segment.
    pub fn param(&mut self, name: impl Into<String>, value: impl Into<String>) -> &mut Self {
        self.0.insert(name.into(), SegmentValue::One(value.into()));
        self
    }

    /// Bind a `[...name]` catch-all slot to an ordered list of URL segments.
    ///
    /// Accepts anything iterable into strings, e.g. `["a", "b"]`, a `Vec`, or
    /// `some_str.split('/')`.
    pub fn catchall<I>(&mut self, name: impl Into<String>, segments: I) -> &mut Self
    where
        I: IntoIterator,
        I::Item: Into<String>,
    {
        self.0.insert(
            name.into(),
            SegmentValue::Many(segments.into_iter().map(Into::into).collect()),
        );
        self
    }

    /// The value bound to `name`, if any.
    pub fn get(&self, name: &str) -> Option<&SegmentValue> {
        self.0.get(name)
    }

    /// The bound slots.
    pub fn iter(&self) -> impl Iterator<Item = (&String, &SegmentValue)> {
        self.0.iter()
    }

    /// Number of bound slots.
    pub fn len(&self) -> usize {
        self.0.len()
    }

    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }
}

/// The full set of pages to statically generate for a dynamic route. A
/// `#[ossido::static_paths]` function receives this borrowed and `register`s
/// one entry per page.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct StaticPaths(Vec<StaticParams>);

impl StaticPaths {
    pub fn new() -> Self {
        StaticPaths(Vec::new())
    }

    /// Register one page to generate. The closure receives a fresh, borrowed
    /// [`StaticParams`] to fill in every dynamic slot of the route.
    ///
    /// Any async work (fetching the list of pages) belongs in the function body
    /// *around* `register`; the closure itself is synchronous and only assembles
    /// one entry's params.
    pub fn register<F>(&mut self, build: F)
    where
        F: FnOnce(&mut StaticParams),
    {
        let mut params = StaticParams::new();
        build(&mut params);
        self.0.push(params);
    }

    /// The registered entries, for the build's substitution + validation.
    pub fn entries(&self) -> &[StaticParams] {
        &self.0
    }

    pub fn len(&self) -> usize {
        self.0.len()
    }

    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn register_builds_entries_with_single_and_catchall_slots() {
        let mut paths = StaticPaths::new();
        paths.register(|params| {
            params
                .param("param", "hello")
                .catchall("catchall", ["a", "b", "c"]);
        });

        assert_eq!(paths.len(), 1);
        let entry = &paths.entries()[0];
        assert_eq!(entry.get("param"), Some(&SegmentValue::One("hello".into())));
        assert_eq!(
            entry.get("catchall"),
            Some(&SegmentValue::Many(vec![
                "a".into(),
                "b".into(),
                "c".into()
            ]))
        );
    }

    #[test]
    fn catchall_accepts_a_split_iterator() {
        let mut params = StaticParams::new();
        params.catchall("slug", "getting-started/install".split('/'));
        assert_eq!(
            params.get("slug"),
            Some(&SegmentValue::Many(vec![
                "getting-started".into(),
                "install".into()
            ]))
        );
    }

    #[test]
    fn serialises_untagged_string_for_param_and_array_for_catchall() {
        let mut paths = StaticPaths::new();
        paths.register(|params| {
            params.param("id", "42").catchall("rest", ["x", "y"]);
        });

        let json = serde_json::to_value(&paths).unwrap();
        // A JSON array of param objects; single value is a string, catch-all an array.
        let entry = &json.as_array().unwrap()[0];
        assert_eq!(entry["id"], serde_json::json!("42"));
        assert_eq!(entry["rest"], serde_json::json!(["x", "y"]));
    }

    #[test]
    fn round_trips_through_json() {
        let mut paths = StaticPaths::new();
        paths.register(|p| {
            p.param("a", "1");
        });
        paths.register(|p| {
            p.catchall("b", ["c", "d"]);
        });

        let json = serde_json::to_string(&paths).unwrap();
        let parsed: StaticPaths = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, paths);
    }
}
