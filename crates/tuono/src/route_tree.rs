//! Renders the Next.js-style tree of routes printed on `tuono dev` start-up.

use std::collections::BTreeMap;

use colored::{ColoredString, Colorize};

use crate::app::App;

/// A route's kind, shown as a leading marker in the tree.
#[derive(Clone, Copy)]
enum Marker {
    /// Has a Rust data handler (`page.rs`).
    Handler,
    /// A page with no data handler.
    Static,
    /// An API route.
    Api,
}

impl Marker {
    fn glyph(self) -> ColoredString {
        match self {
            Marker::Handler => "ƒ".green(),
            Marker::Static => "○".dimmed(),
            Marker::Api => "λ".yellow(),
        }
    }
}

#[derive(Default)]
struct Node {
    children: BTreeMap<String, Node>,
    marker: Option<Marker>,
}

impl Node {
    fn insert(&mut self, segments: &[&str], marker: Marker) {
        match segments.split_first() {
            None => self.marker = Some(marker),
            Some((head, rest)) => self
                .children
                .entry((*head).to_string())
                .or_default()
                .insert(rest, marker),
        }
    }
}

fn marker_prefix(marker: Option<Marker>) -> String {
    match marker {
        Some(marker) => format!("{} ", marker.glyph()),
        // Align names under those that do have a marker.
        None => "  ".to_string(),
    }
}

fn render(node: &Node, prefix: &str, out: &mut String) {
    let count = node.children.len();
    for (index, (name, child)) in node.children.iter().enumerate() {
        let is_last = index + 1 == count;
        let branch = if is_last { "└─ " } else { "├─ " };
        let name = if child.marker.is_some() {
            name.as_str().normal()
        } else {
            // An intermediate path segment with no route of its own.
            name.as_str().dimmed()
        };
        out.push_str(&format!(
            "{prefix}{branch}{}{name}\n",
            marker_prefix(child.marker)
        ));

        let child_prefix = format!("{prefix}{}", if is_last { "   " } else { "│  " });
        render(child, &child_prefix, out);
    }
}

/// Build the route tree from an app's routes (pages + API routes; layouts are
/// omitted).
fn build_tree(app: &App) -> Node {
    let mut root = Node::default();

    for route in app.route_map.values() {
        if route.is_layout {
            continue;
        }
        let marker = if route.is_api() {
            Marker::Api
        } else if route.axum_info.is_some() {
            Marker::Handler
        } else {
            Marker::Static
        };
        let url = route.url_path();
        let segments: Vec<&str> = url.split('/').filter(|s| !s.is_empty()).collect();
        root.insert(&segments, marker);
    }

    root
}

/// Render the Next.js-style route tree (with a legend) to a string.
fn format_route_tree(app: &App) -> String {
    let root = build_tree(app);

    let mut out = String::new();
    out.push_str(&format!("{}\n", "Routes".bold()));
    out.push_str(&format!("{}{}\n", marker_prefix(root.marker), "/".bold()));
    render(&root, "", &mut out);

    out.push_str(&format!(
        "\n{}  {}    {}  {}    {}  {}\n",
        Marker::Handler.glyph(),
        "server data".dimmed(),
        Marker::Static.glyph(),
        "static".dimmed(),
        Marker::Api.glyph(),
        "API".dimmed(),
    ));

    out
}

/// Print the route tree (pages + API routes; layouts are omitted).
pub fn print_route_tree(app: &App) {
    println!();
    print!("{}", format_route_tree(app));
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::route::{ApiData, Route};

    /// Strip ANSI colour codes so the tree structure can be asserted regardless
    /// of whether `colored` emits escapes. The tree glyphs (`ƒ ○ λ`, `├─`, `└─`)
    /// are plain unicode and survive.
    fn strip(input: &str) -> String {
        let mut out = String::new();
        let mut chars = input.chars().peekable();
        while let Some(c) = chars.next() {
            if c == '\u{1b}' && chars.peek() == Some(&'[') {
                chars.next();
                for next in chars.by_ref() {
                    if next.is_ascii_alphabetic() {
                        break;
                    }
                }
            } else {
                out.push(c);
            }
        }
        out
    }

    #[test]
    fn render_draws_branches_markers_and_nested_prefixes() {
        let mut root = Node::default();
        root.insert(&["about"], Marker::Handler);
        root.insert(&["blog", "first"], Marker::Static);
        root.insert(&["blog", "second"], Marker::Handler);

        let mut out = String::new();
        render(&root, "", &mut out);
        let out = strip(&out);

        // `about` sorts first (branch `├─`) with a handler glyph; `blog` is the
        // last top-level entry (`└─`) and, having no route of its own, no glyph.
        assert!(out.contains("├─ ƒ about"), "got:\n{out}");
        assert!(out.contains("└─"), "got:\n{out}");
        assert!(out.contains("blog"), "got:\n{out}");
        // `blog`'s children are indented under it; the last child uses `└─`.
        assert!(out.contains("   ├─ ○ first"), "got:\n{out}");
        assert!(out.contains("   └─ ƒ second"), "got:\n{out}");
    }

    #[test]
    fn marker_prefix_aligns_markerless_rows() {
        // A row with a marker is `glyph + space`; one without is two spaces so
        // names line up in the same column.
        assert_eq!(strip(&marker_prefix(Some(Marker::Api))), "λ ");
        assert_eq!(marker_prefix(None), "  ");
    }

    #[test]
    fn format_route_tree_lists_pages_apis_and_a_legend() {
        let mut app = App::new();

        let mut about = Route::new("/about/page".to_string());
        about.update_axum_info(); // a page with a Rust data handler
        app.route_map.insert("/about/page".to_string(), about);

        // A page with no data handler renders as static.
        let contact = Route::new("/contact/page".to_string());
        app.route_map.insert("/contact/page".to_string(), contact);

        // An API route. Built directly (rather than via `Route::new`, which reads
        // the handler file from disk to discover its HTTP methods).
        let health = Route {
            path: "/api/health".to_string(),
            is_dynamic: false,
            is_layout: false,
            axum_info: None,
            api_data: Some(ApiData {
                methods: Vec::new(),
            }),
        };
        assert!(health.is_api());
        app.route_map.insert("/api/health".to_string(), health);

        let out = strip(&format_route_tree(&app));

        assert!(out.contains("Routes"), "got:\n{out}");
        // All three route kinds appear with their respective glyphs…
        assert!(out.contains("ƒ about"), "got:\n{out}");
        assert!(out.contains("○ contact"), "got:\n{out}");
        assert!(out.contains("health"), "got:\n{out}");
        assert!(out.contains('λ'), "got:\n{out}");
        // …followed by the legend.
        assert!(out.contains("server data"), "got:\n{out}");
        assert!(out.contains("static"), "got:\n{out}");
        assert!(out.contains("API"), "got:\n{out}");
    }

    #[test]
    fn layouts_are_omitted_from_the_tree() {
        let mut app = App::new();
        let layout = Route::new("/layout".to_string());
        assert!(layout.is_layout);
        app.route_map.insert("/layout".to_string(), layout);

        // Only the root `/` and the legend are printed; no layout row.
        let out = strip(&format_route_tree(&app));
        assert!(!out.contains("layout"), "got:\n{out}");
    }
}
