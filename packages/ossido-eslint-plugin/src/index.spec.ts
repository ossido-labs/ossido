import { describe, it, expect } from 'vitest';

import plugin from './index';

interface RuleShape {
  createOnce?: (ctx: unknown) => { Program?: (n: unknown) => void };
  create?: unknown;
}

describe('@ossido-labs/ossido-eslint-plugin', () => {
  it('is namespaced so the rule id is react-refresh/only-export-components', () => {
    expect(plugin.meta?.name).toBe('react-refresh');
  });

  it('authors the rule with createOnce and, via eslintCompatPlugin, also exposes create', () => {
    const rule = plugin.rules['only-export-components'] as RuleShape;
    expect(rule).toBeDefined();
    // Performant oxlint API.
    expect(typeof rule.createOnce).toBe('function');
    // eslintCompatPlugin adds an ESLint-compatible `create` delegating to it.
    expect(typeof rule.create).toBe('function');
  });

  it('createOnce returns a Program visitor', () => {
    const rule = plugin.rules['only-export-components'] as RuleShape;
    const visitor = rule.createOnce?.({});
    expect(typeof visitor?.Program).toBe('function');
  });
});
