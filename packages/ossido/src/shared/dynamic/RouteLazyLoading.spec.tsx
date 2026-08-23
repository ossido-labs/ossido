import { describe, it, expect, vi } from 'vitest';

import { RouteLazyLoading } from './RouteLazyLoading';

const componentA = (): null => null;
const componentB = (): null => null;

describe('RouteLazyLoading dev identity cache', () => {
  it('returns the SAME wrapper for the same specifier across tree re-evaluations', () => {
    const first = RouteLazyLoading(
      () => Promise.resolve({ default: componentA }),
      './spec/routes/same/page',
    );
    const second = RouteLazyLoading(
      () => Promise.resolve({ default: componentA }),
      './spec/routes/same/page',
    );

    // Same component identity → React reconciles instead of remounting when a
    // structural route-tree swap re-runs the generated module.
    expect(second).toBe(first);
  });

  it('refreshes the cached wrapper factory to the newest one', async () => {
    const staleFactory = vi.fn(() => Promise.resolve({ default: componentA }));
    const freshFactory = vi.fn(() => Promise.resolve({ default: componentB }));

    const wrapper = RouteLazyLoading(staleFactory, './spec/routes/fresh/page');
    RouteLazyLoading(freshFactory, './spec/routes/fresh/page');

    await wrapper.preload?.();
    expect(staleFactory).not.toHaveBeenCalled();
    expect(freshFactory).toHaveBeenCalledTimes(1);
  });

  it('different specifiers produce different wrappers', () => {
    const a = RouteLazyLoading(
      () => Promise.resolve({ default: componentA }),
      './spec/routes/a/page',
    );
    const b = RouteLazyLoading(
      () => Promise.resolve({ default: componentB }),
      './spec/routes/b/page',
    );
    expect(a).not.toBe(b);
  });

  it('no specifier → no caching (prod call shape)', () => {
    const factory = (): Promise<{ default: typeof componentA }> =>
      Promise.resolve({ default: componentA });
    expect(RouteLazyLoading(factory)).not.toBe(RouteLazyLoading(factory));
  });
});
