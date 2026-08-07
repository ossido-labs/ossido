//! Composable scaffolding overlays for `ossido new`.
//!
//! Rather than shipping one example folder per feature combination (which grows
//! as 2^n), the wizard starts from the base `ossido-app` template and layers on
//! independent features (Tailwind, MDX, …). Each [`Feature`] is a small,
//! self-contained description — package.json deps plus its `ossido.config.ts`
//! contribution — and the whole `ossido.config.ts` is *generated* from the
//! selected set rather than string-patched, which keeps composition unambiguous.

use serde_json::Value;
pub use ossido_internal::config::OutputMode;

/// A composable scaffolding feature.
///
/// Most features are *patches* layered onto the base template (deps + config).
/// Tailwind is special: because its starter needs to actually use Tailwind, it
/// ships as a distinct base template (see [`base_template_for`]) rather than a
/// patch — but it still carries its config contribution here so the generated
/// `ossido.config.ts` stays a single source of truth.
pub struct Feature {
    /// Stable identifier, also used as the `--<key>` CLI flag.
    pub key: &'static str,
    /// Human label shown in the wizard.
    pub label: &'static str,
    /// `dependencies` entries (name, version) added to package.json.
    dependencies: &'static [(&'static str, &'static str)],
    /// `devDependencies` entries (name, version) added to package.json.
    dev_dependencies: &'static [(&'static str, &'static str)],
    /// A top-of-file import line for the generated `ossido.config.ts`.
    config_import: Option<&'static str>,
    /// An expression pushed into the generated `vite.plugins` array.
    config_plugin: Option<&'static str>,
    /// Package names added to `vite.optimizeDeps.exclude`.
    optimize_deps_exclude: &'static [&'static str],
}

/// The default base template (patched with any selected features).
pub const BASE_TEMPLATE: &str = "ossido-app";
/// The base template used when Tailwind is selected — its starter uses Tailwind.
pub const TAILWIND_TEMPLATE: &str = "with-tailwind";

pub const TAILWIND: Feature = Feature {
    key: "tailwind",
    label: "Tailwind CSS",
    dependencies: &[("@tailwindcss/vite", "^4.3.3"), ("tailwindcss", "^4.3.3")],
    dev_dependencies: &[],
    config_import: Some("import tailwindcss from '@tailwindcss/vite'"),
    config_plugin: Some("tailwindcss()"),
    // `@tailwindcss/oxide` is a native `.node` addon. Ossido's dev critical-CSS
    // step SSR-loads the stylesheet, pulling oxide into the graph; excluding it
    // from optimization stops Vite trying to bundle the binary on a cold cache.
    optimize_deps_exclude: &["@tailwindcss/oxide"],
};

pub const MDX: Feature = Feature {
    key: "mdx",
    label: "MDX",
    dependencies: &[("@mdx-js/react", "^3.1.0")],
    dev_dependencies: &[("@mdx-js/rollup", "^3.1.0")],
    config_import: Some("import mdx from '@mdx-js/rollup'"),
    config_plugin: Some("{ enforce: 'pre', ...mdx({ providerImportSource: '@mdx-js/react' }) }"),
    optimize_deps_exclude: &["@mdx-js/react"],
};

/// Every feature the wizard can offer, in display order.
pub const ALL_FEATURES: &[&Feature] = &[&TAILWIND, &MDX];

/// The base template to download for a feature selection. Tailwind swaps the
/// base for its dedicated example; every other feature is patched onto whatever
/// base is chosen.
pub fn base_template_for(features: &[&Feature]) -> &'static str {
    if features.iter().any(|feature| feature.key == TAILWIND.key) {
        TAILWIND_TEMPLATE
    } else {
        BASE_TEMPLATE
    }
}

/// Merge the selected features' dependencies into a package.json source string.
///
/// Existing keys keep their order (serde_json is built with `preserve_order`);
/// new deps are appended to the relevant object.
pub fn merge_package_json(source: &str, features: &[&Feature]) -> serde_json::Result<String> {
    let mut pkg: Value = serde_json::from_str(source)?;

    for feature in features {
        add_deps(&mut pkg, "dependencies", feature.dependencies);
        add_deps(&mut pkg, "devDependencies", feature.dev_dependencies);
    }

    let mut out = serde_json::to_string_pretty(&pkg)?;
    out.push('\n');
    Ok(out)
}

fn add_deps(pkg: &mut Value, section: &str, deps: &[(&str, &str)]) {
    if deps.is_empty() {
        return;
    }
    let Some(obj) = pkg.as_object_mut() else {
        return;
    };
    let entry = obj
        .entry(section)
        .or_insert_with(|| Value::Object(Default::default()));
    if let Some(map) = entry.as_object_mut() {
        for (name, version) in deps {
            map.insert((*name).to_string(), Value::String((*version).to_string()));
        }
    }
}

/// Generate a complete `ossido.config.ts` from the selected features and output
/// mode. The base template's config is replaced with this.
/// Generate `ossido.config.ts`.
///
/// `alias`, when set, is the prefix of a `src` path alias (e.g. `"@"` maps
/// `@/*` to `./src/*`). It emits a `vite.alias` entry resolved to an absolute
/// path via `import.meta.url` — vite's root is `.ossido`, so a relative value
/// would resolve against the wrong directory. The matching `tsconfig.json`
/// `paths` entry is written separately (see `new.rs`).
pub fn generate_ossido_config(
    features: &[&Feature],
    output: OutputMode,
    alias: Option<&str>,
) -> String {
    let mut imports = String::new();
    if alias.is_some() {
        imports.push_str("import { fileURLToPath } from 'node:url'\n");
    }
    let feature_imports: String = features
        .iter()
        .filter_map(|f| f.config_import)
        .map(|imp| format!("{imp}\n"))
        .collect();
    imports.push_str(&feature_imports);

    let plugins: Vec<&str> = features.iter().filter_map(|f| f.config_plugin).collect();
    let excludes: Vec<&str> = features
        .iter()
        .flat_map(|f| f.optimize_deps_exclude.iter().copied())
        .collect();

    let mut fields: Vec<String> = Vec::new();

    if output == OutputMode::Static {
        fields.push("  output: 'static',".to_string());
    }

    if alias.is_some() || !plugins.is_empty() || !excludes.is_empty() {
        let mut vite = String::from("  vite: {\n");
        if let Some(prefix) = alias {
            vite.push_str(&format!(
                "    alias: {{\n      '{prefix}': fileURLToPath(new URL('./src', import.meta.url)),\n    }},\n"
            ));
        }
        if !excludes.is_empty() {
            let list = excludes
                .iter()
                .map(|e| format!("'{e}'"))
                .collect::<Vec<_>>()
                .join(", ");
            vite.push_str(&format!(
                "    optimizeDeps: {{\n      exclude: [{list}],\n    }},\n"
            ));
        }
        if !plugins.is_empty() {
            vite.push_str("    plugins: [\n");
            for plugin in &plugins {
                vite.push_str(&format!("      {plugin},\n"));
            }
            vite.push_str("    ],\n");
        }
        vite.push_str("  },");
        fields.push(vite);
    }

    let body = if fields.is_empty() {
        "{}".to_string()
    } else {
        format!("{{\n{}\n}}", fields.join("\n"))
    };

    format!(
        "import type {{ OssidoConfig }} from 'ossido/config'\n{imports}\nconst config: OssidoConfig = {body}\n\nexport default config\n"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_selection_produces_a_minimal_config() {
        let config = generate_ossido_config(&[], OutputMode::Server, None);
        assert_eq!(
            config,
            "import type { OssidoConfig } from 'ossido/config'\n\nconst config: OssidoConfig = {}\n\nexport default config\n"
        );
    }

    #[test]
    fn static_output_adds_the_output_field() {
        let config = generate_ossido_config(&[], OutputMode::Static, None);
        assert!(config.contains("const config: OssidoConfig = {\n  output: 'static',\n}"));
    }

    #[test]
    fn tailwind_adds_import_plugin_and_oxide_exclude() {
        let config = generate_ossido_config(&[&TAILWIND], OutputMode::Server, None);
        assert!(config.contains("import tailwindcss from '@tailwindcss/vite'"));
        assert!(config.contains("plugins: [\n      tailwindcss(),\n    ],"));
        // The native oxide addon must be excluded from Vite dep optimization.
        assert!(config.contains("exclude: ['@tailwindcss/oxide']"));
    }

    #[test]
    fn mdx_adds_optimize_deps_exclude_and_pre_plugin() {
        let config = generate_ossido_config(&[&MDX], OutputMode::Server, None);
        assert!(config.contains("import mdx from '@mdx-js/rollup'"));
        assert!(config.contains("exclude: ['@mdx-js/react'],"));
        assert!(
            config
                .contains("{ enforce: 'pre', ...mdx({ providerImportSource: '@mdx-js/react' }) },")
        );
    }

    #[test]
    fn features_compose_together() {
        let config = generate_ossido_config(&[&TAILWIND, &MDX], OutputMode::Static, None);
        assert!(config.contains("output: 'static',"));
        assert!(config.contains("import tailwindcss from '@tailwindcss/vite'"));
        assert!(config.contains("import mdx from '@mdx-js/rollup'"));
        assert!(config.contains("tailwindcss(),"));
        assert!(config.contains("...mdx("));
        // Both native/awkward deps are excluded, in feature order.
        assert!(config.contains("exclude: ['@tailwindcss/oxide', '@mdx-js/react'],"));
    }

    #[test]
    fn alias_adds_the_url_import_and_vite_alias() {
        let config = generate_ossido_config(&[], OutputMode::Server, Some("@"));
        assert!(config.contains("import { fileURLToPath } from 'node:url'"));
        assert!(config.contains(
            "    alias: {\n      '@': fileURLToPath(new URL('./src', import.meta.url)),\n    },"
        ));
    }

    #[test]
    fn alias_composes_with_features_in_one_vite_block() {
        let config = generate_ossido_config(&[&TAILWIND], OutputMode::Server, Some("~"));
        // A single `vite` block carries both the alias and the feature plugin.
        assert_eq!(config.matches("vite: {").count(), 1);
        assert!(config.contains("'~': fileURLToPath(new URL('./src', import.meta.url))"));
        assert!(config.contains("tailwindcss(),"));
    }

    #[test]
    fn merge_adds_deps_and_keeps_existing_order() {
        let source = r#"{
  "name": "ossido-app",
  "dependencies": {
    "react": "^19.0.0",
    "ossido": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.3"
  }
}"#;
        let merged = merge_package_json(source, &[&TAILWIND, &MDX]).unwrap();

        // `name` still comes first (order preserved).
        assert!(merged.find("\"name\"").unwrap() < merged.find("\"dependencies\"").unwrap());
        // New runtime deps landed in `dependencies`.
        assert!(merged.contains("\"@tailwindcss/vite\": \"^4.3.3\""));
        assert!(merged.contains("\"tailwindcss\": \"^4.3.3\""));
        assert!(merged.contains("\"@mdx-js/react\": \"^3.1.0\""));
        // New build-time dep landed in `devDependencies`.
        assert!(merged.contains("\"@mdx-js/rollup\": \"^3.1.0\""));
        // Existing deps untouched.
        assert!(merged.contains("\"react\": \"^19.0.0\""));
    }

    #[test]
    fn tailwind_selects_the_dedicated_base_template() {
        assert_eq!(base_template_for(&[]), "ossido-app");
        assert_eq!(base_template_for(&[&MDX]), "ossido-app");
        assert_eq!(base_template_for(&[&TAILWIND]), "with-tailwind");
        // Tailwind wins the base even alongside patch features.
        assert_eq!(base_template_for(&[&MDX, &TAILWIND]), "with-tailwind");
    }

    #[test]
    fn merge_with_no_features_is_a_noop_reserialize() {
        let source = "{\n  \"name\": \"ossido-app\"\n}";
        let merged = merge_package_json(source, &[]).unwrap();
        assert!(merged.contains("\"name\": \"ossido-app\""));
    }
}
