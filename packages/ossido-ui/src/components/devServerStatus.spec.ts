import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { devServerStatus } from './devServerStatus';

describe('devServerStatus store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Reset the module singleton between tests.
    devServerStatus.dismissNotice();
    devServerStatus.setReady();
    vi.useRealTimers();
  });

  it('tracks the restart phase and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = devServerStatus.subscribe(listener);

    devServerStatus.setRestarting();
    expect(devServerStatus.getSnapshot().phase).toBe('restarting');
    expect(listener).toHaveBeenCalledTimes(1);

    // Same phase again: no extra notification.
    devServerStatus.setRestarting();
    expect(listener).toHaveBeenCalledTimes(1);

    devServerStatus.setReady();
    expect(devServerStatus.getSnapshot().phase).toBe('ready');
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });

  it('shows a notice and expires it', () => {
    devServerStatus.showNotice('Full reload caused by: /src/foo.ts');
    expect(devServerStatus.getSnapshot().notice).toBe(
      'Full reload caused by: /src/foo.ts',
    );

    vi.runAllTimers();
    expect(devServerStatus.getSnapshot().notice).toBeNull();
  });

  it('dismissNotice clears an active notice immediately', () => {
    devServerStatus.showNotice('note');
    devServerStatus.dismissNotice();
    expect(devServerStatus.getSnapshot().notice).toBeNull();
  });

  it('server snapshot is stable (hydration-safe)', () => {
    expect(devServerStatus.getServerSnapshot()).toBe(
      devServerStatus.getServerSnapshot(),
    );
  });
});
