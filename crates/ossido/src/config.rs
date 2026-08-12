use once_cell::sync::OnceCell;
use ossido_internal::config::Config;

pub static GLOBAL_CONFIG: OnceCell<Config> = OnceCell::new();

/// The host to *connect* to the local vite dev server on. `0.0.0.0` (and the
/// IPv6 `::`) are bind-all addresses: vite binds them fine, but they aren't
/// reliably connectable as a *client* (notably on macOS), so map them to
/// loopback. A specific host is used as-is (vite bound exactly that interface).
pub(crate) fn vite_connect_host(host: &str) -> &str {
    match host {
        "0.0.0.0" => "127.0.0.1",
        "::" | "[::]" => "[::1]",
        other => other,
    }
}

#[cfg(test)]
mod tests {
    use super::vite_connect_host;

    #[test]
    fn maps_bind_all_hosts_to_loopback_and_leaves_specifics_alone() {
        assert_eq!(vite_connect_host("0.0.0.0"), "127.0.0.1");
        assert_eq!(vite_connect_host("::"), "[::1]");
        assert_eq!(vite_connect_host("[::]"), "[::1]");
        assert_eq!(vite_connect_host("localhost"), "localhost");
        assert_eq!(vite_connect_host("127.0.0.1"), "127.0.0.1");
        assert_eq!(vite_connect_host("192.168.1.5"), "192.168.1.5");
    }
}
