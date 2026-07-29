import { Component } from 'react'
import type { ReactNode } from 'react'

import type { ErrorComponent } from '../types'

interface TuonoErrorBoundaryProps {
  fallback: ErrorComponent
  /**
   * Called by the fallback's `reset`. It bumps the navigation id, which changes
   * this boundary's `key` in {@link RouteMatch}, remounting it with clean state
   * and creating a fresh data resource (a refetch).
   */
  onReset: () => void
  children: ReactNode
}

interface TuonoErrorBoundaryState {
  error: Error | null
}

/**
 * Renders the nearest `error.tsx` (or the framework default) when a descendant
 * throws — including a rejected data resource surfaced through `use()`.
 */
export class TuonoErrorBoundary extends Component<
  TuonoErrorBoundaryProps,
  TuonoErrorBoundaryState
> {
  state: TuonoErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): TuonoErrorBoundaryState {
    return { error }
  }

  reset = (): void => {
    // Bumping the navigation id changes this boundary's `key`, so React
    // discards this errored instance and mounts a fresh one — no local state
    // reset needed.
    this.props.onReset()
  }

  render(): ReactNode {
    const { error } = this.state
    if (error) {
      const Fallback = this.props.fallback
      return <Fallback error={error} reset={this.reset} />
    }
    return this.props.children
  }
}
