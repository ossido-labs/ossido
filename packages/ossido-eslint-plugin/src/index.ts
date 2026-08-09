import { defineRule, eslintCompatPlugin } from '@oxlint/plugins';
import type { Context, RuleMeta } from '@oxlint/plugins';
import reactRefresh from 'eslint-plugin-react-refresh';

// eslint-plugin-react-refresh authors the rule with ESLint's per-file
// `create(context)` API, doing all its work in a single `Program` visitor. We
// re-expose it through oxlint's performant `createOnce` API (called once, so
// oxlint can statically see the visited node types), delegating each file's
// check to the upstream rule. The rule reads per-file context (filename /
// source) at `create` time, so a fresh instance is created for each `Program`
// (i.e. per file) — reusing one instance across files reports nothing.
interface EslintRuleModule {
  meta?: RuleMeta;
  create: (context: unknown) => { Program?: (node: unknown) => void };
}

const eslintRule = reactRefresh.rules[
  'only-export-components'
] as unknown as EslintRuleModule;

const rule = defineRule({
  meta: eslintRule.meta,
  createOnce(context: Context) {
    return {
      Program(node): void {
        eslintRule.create(context).Program?.(node);
      },
    };
  },
});

/**
 * Oxlint (and ESLint) plugin for ossido projects.
 *
 * Exposes [eslint-plugin-react-refresh](https://github.com/ArnaudBarre/eslint-plugin-react-refresh)'s
 * `only-export-components` rule authored with oxlint's performant `createOnce`
 * API, then wrapped with {@link eslintCompatPlugin} so the same package works as
 * both an oxlint JS plugin (`jsPlugins`) and a standard ESLint plugin (the
 * wrapper adds ESLint-compatible `create` methods that delegate to `createOnce`).
 *
 * The rule keeps route/component files valid React Fast Refresh boundaries: it
 * flags a non-component export (object, function, class) co-located with a
 * component, which would otherwise force a full page reload on every edit to
 * that file instead of a state-preserving hot update. Primitive constant exports
 * are permitted via the rule's `allowConstantExport` option (they don't break
 * Fast Refresh under Vite).
 *
 * The plugin is namespaced `react-refresh`, so the rule id is
 * `react-refresh/only-export-components`.
 *
 * @example .oxlintrc.json
 * ```json
 * {
 *   "jsPlugins": ["ossido-eslint-plugin"],
 *   "rules": {
 *     "react-refresh/only-export-components": [
 *       "warn",
 *       { "allowConstantExport": true }
 *     ]
 *   }
 * }
 * ```
 */
const plugin = eslintCompatPlugin({
  meta: { name: 'react-refresh' },
  rules: { 'only-export-components': rule },
});

export default plugin;
