import { Component } from 'react';
import type { ReactNode } from 'react';

import type { ErrorComponent } from '../types';

interface OssidoErrorBoundaryProps {
  fallback: ErrorComponent;
  /**
   * Changes per navigation/retry (the route's data-resource key). When it
   * changes the boundary clears any caught error and re-renders its children —
   * a reset without remounting. Not remounting matters: the surrounding
   * `<Suspense>` stays mounted, so a navigation (whose data + code are already
   * prefetched) swaps straight to the new page instead of flashing the fallback.
   */
  resetKey: string;
  /**
   * Called by the fallback's `reset`. It bumps the navigation id (which changes
   * `resetKey`), clearing the error and creating a fresh data resource.
   */
  onReset: () => void;
  children: ReactNode;
}

interface OssidoErrorBoundaryState {
  error: Error | null;
  resetKey: string;
}

/**
 * Renders the nearest `error.tsx` (or the framework default) when a descendant
 * throws — including a rejected data resource surfaced through `use()`.
 *
 * Resets via {@link OssidoErrorBoundaryProps.resetKey} rather than a `key` from
 * the caller, so its children re-render (not remount) on navigation.
 */
export class OssidoErrorBoundary extends Component<
  OssidoErrorBoundaryProps,
  OssidoErrorBoundaryState
> {
  state: OssidoErrorBoundaryState = {
    error: null,
    resetKey: this.props.resetKey,
  };

  static getDerivedStateFromError(
    error: Error,
  ): Partial<OssidoErrorBoundaryState> {
    return { error };
  }

  static getDerivedStateFromProps(
    props: OssidoErrorBoundaryProps,
    state: OssidoErrorBoundaryState,
  ): Partial<OssidoErrorBoundaryState> | null {
    // A new navigation/retry: drop the caught error and try the children again.
    if (props.resetKey !== state.resetKey) {
      return { error: null, resetKey: props.resetKey };
    }
    return null;
  }

  reset = (): void => {
    // Bumps the navigation id → `resetKey` changes → the error is cleared and a
    // fresh data resource is created (a refetch).
    this.props.onReset();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      const Fallback = this.props.fallback;
      return <Fallback error={error} reset={this.reset} />;
    }
    return this.props.children;
  }
}
