use std::path::Path;

use glob::glob;
use syn::{Item, ItemStruct};

use crate::macro_attr::is_ossido_attr;

/// One directional WebSocket event: its wire name and the Rust/TS type name.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WsEventDef {
    pub event: String,
    pub type_name: String,
}

/// The project's WebSocket events, split by direction.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct WsEvents {
    /// server → client events (the client receives these).
    pub server: Vec<WsEventDef>,
    /// client → server events (the client sends these).
    pub client: Vec<WsEventDef>,
}

/// Collect every `#[server_ws_event(..)]` / `#[client_ws_event(..)]` struct under
/// `src`, so the two direction-correct TypeScript unions can be generated.
pub fn collect_ws_events(base_path: &Path) -> WsEvents {
    let mut events = WsEvents::default();

    let Some(pattern) = base_path.join("src/**/*.rs").to_str().map(str::to_string) else {
        return events;
    };
    let Ok(entries) = glob(&pattern) else {
        return events;
    };

    for entry in entries.flatten() {
        let Ok(source) = std::fs::read_to_string(&entry) else {
            continue;
        };
        // Cheap filter before parsing.
        if !source.contains("ws_event") {
            continue;
        }
        let Ok(parsed) = syn::parse_file(&source) else {
            continue;
        };

        for item in parsed.items {
            let Item::Struct(item_struct) = item else {
                continue;
            };
            if let Some(def) = ws_event_def(&item_struct, "server_ws_event") {
                events.server.push(def);
            } else if let Some(def) = ws_event_def(&item_struct, "client_ws_event") {
                events.client.push(def);
            }
        }
    }

    events.server.sort_by(|a, b| a.event.cmp(&b.event));
    events.client.sort_by(|a, b| a.event.cmp(&b.event));
    events
}

/// Extract the event definition from a struct carrying `attr_name`, if present.
fn ws_event_def(item_struct: &ItemStruct, attr_name: &str) -> Option<WsEventDef> {
    let attr = item_struct
        .attrs
        .iter()
        .find(|attr| is_ossido_attr(attr.path(), attr_name))?;
    let event = event_name_from_attr(attr)?;
    Some(WsEventDef {
        event,
        type_name: item_struct.ident.to_string(),
    })
}

/// The event name from a `#[server_ws_event("name")]` / `#[..(name)]` attribute:
/// a string literal or a bare ident.
fn event_name_from_attr(attr: &syn::Attribute) -> Option<String> {
    if let Ok(lit) = attr.parse_args::<syn::LitStr>() {
        return Some(lit.value());
    }
    if let Ok(ident) = attr.parse_args::<syn::Ident>() {
        return Some(ident.to_string());
    }
    None
}

/// Render the direction-keyed event maps as merges into the global
/// `OssidoServerWsEvents` / `OssidoClientWsEvents` interfaces that
/// `@ossido-labs/ossido/ws` reads (event name → data type). Returns an empty
/// string when the project has no WebSocket events.
///
/// A global interface (not a `declare module` augmentation) is used on purpose,
/// mirroring `render_api_routes`: `.ossido/types.ts` is a global script, so this
/// merges into the empty interfaces the `ws` module declares — keeping the npm
/// package self-contained (it never imports the generated ambient module). Data
/// types are referenced via `import("@ossido-labs/ossido/types").T`.
pub fn render_ws_events(events: &WsEvents) -> String {
    if events.server.is_empty() && events.client.is_empty() {
        return String::new();
    }
    let mut ts = render_interface("OssidoServerWsEvents", &events.server);
    ts.push_str(&render_interface("OssidoClientWsEvents", &events.client));
    ts
}

fn render_interface(name: &str, defs: &[WsEventDef]) -> String {
    if defs.is_empty() {
        return String::new();
    }
    let mut ts = format!("interface {name} {{\n");
    for def in defs {
        ts.push_str(&format!(
            "  \"{}\": import(\"@ossido-labs/ossido/types\").{}\n",
            def.event, def.type_name
        ));
    }
    ts.push_str("}\n");
    ts
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renders_direction_keyed_global_interfaces() {
        let events = WsEvents {
            server: vec![WsEventDef {
                event: "user_joined".to_string(),
                type_name: "UserJoined".to_string(),
            }],
            client: vec![WsEventDef {
                event: "chat_message".to_string(),
                type_name: "ChatMessage".to_string(),
            }],
        };
        let ts = render_ws_events(&events);
        assert!(ts.contains("interface OssidoServerWsEvents {"));
        assert!(ts.contains(r#""user_joined": import("@ossido-labs/ossido/types").UserJoined"#));
        assert!(ts.contains("interface OssidoClientWsEvents {"));
        assert!(ts.contains(r#""chat_message": import("@ossido-labs/ossido/types").ChatMessage"#));
    }

    #[test]
    fn one_empty_direction_is_omitted() {
        let events = WsEvents {
            server: Vec::new(),
            client: vec![WsEventDef {
                event: "ping".to_string(),
                type_name: "Ping".to_string(),
            }],
        };
        let ts = render_ws_events(&events);
        assert!(!ts.contains("OssidoServerWsEvents"));
        assert!(ts.contains("interface OssidoClientWsEvents {"));
        assert!(ts.contains(r#""ping": import("@ossido-labs/ossido/types").Ping"#));
    }

    #[test]
    fn no_events_render_nothing() {
        assert_eq!(render_ws_events(&WsEvents::default()), "");
    }
}
