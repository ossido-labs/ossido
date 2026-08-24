import { describe, it, expect, vi } from 'vitest';

import { registerPropsRefetch, requestPropsRefetch } from './propsRefetch';

describe('propsRefetch bridge', () => {
  it('invokes the registered refetch', () => {
    const refetch = vi.fn();
    const unregister = registerPropsRefetch(refetch);

    requestPropsRefetch();
    expect(refetch).toHaveBeenCalledTimes(1);

    unregister();
  });

  it('is a no-op with nothing registered', () => {
    expect(() => requestPropsRefetch()).not.toThrow();
  });

  it('unregister removes the refetch', () => {
    const refetch = vi.fn();
    const unregister = registerPropsRefetch(refetch);
    unregister();

    requestPropsRefetch();
    expect(refetch).not.toHaveBeenCalled();
  });

  it('a stale unregister does not remove a newer registration', () => {
    const first = vi.fn();
    const second = vi.fn();

    const unregisterFirst = registerPropsRefetch(first);
    const unregisterSecond = registerPropsRefetch(second);

    // The first registration was already superseded; its unregister must not
    // clear the second one.
    unregisterFirst();
    requestPropsRefetch();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    unregisterSecond();
  });
});
