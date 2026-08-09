import type { ReactNode, ComponentType } from 'react';
import type { ServerErrorSource } from 'ossido-ui';

export type Mode = 'Dev' | 'Prod';

export interface Segment {
  type: 'pathname' | 'param' | 'wildcard';
  value: string;
}

/**
 * Provided by the rust server and used in the ssr env
 * @see ossido {@link ServerPayloadLocation}
 */
export interface ServerInitialLocation {
  href: string;
  pathname: string;
  searchStr: string;
}

/**
 * Props a route component may receive.
 *
 * Page components receive their server data spread directly as props, so their
 * concrete prop shape is defined by the user's handler return type — not by this
 * type. Layout/root components receive `children`.
 */
export interface RouteProps {
  children?: ReactNode;
}

/**
 * A route (page or layout) component.
 *
 * Pages are called with the resolved server data spread as props, so props are
 * intentionally untyped here (`any`); the concrete shape lives in user code.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouteComponent = ComponentType<any> & {
  /**
   * Loads the component's code chunk, resolving when it's ready (and caching it
   * so the component then renders synchronously). Present on lazily-loaded route
   * components; absent on eagerly-imported ones (e.g. the root layout).
   */
  preload?: () => Promise<void>;
  /**
   * Dev-only. Swap the resolved component behind a lazily-loaded route in place,
   * so an HMR update to the route module renders without re-running the dynamic
   * import. Set by the lazy-load wrapper; used by the generated route tree's hot
   * accept handler. Absent in prod and on eagerly-imported components.
   */
  update?: (next: RouteComponent) => void;
};

/**
 * Serialized Rust handler error, sent by the server (dev mode only) so a
 * backend panic can surface in the error overlay like a JS error.
 * @see crates/ossido/src/server_error.rs
 */
export interface ServerErrorPayload {
  name: string;
  message: string;
  stack?: string;
  source?: ServerErrorSource;
}

/** A `loading.tsx` component. Rendered as a `<Suspense>` fallback (no props). */
export type LoadingComponent = ComponentType;

/** A `not-found.tsx` component. Rendered when no route matches (no props). */
export type NotFoundComponent = ComponentType;

// The error UI and its types live in the design system (ossido-ui); re-exported
// here so router consumers keep importing them from `ossido-router`.
export type {
  OssidoErrorProps,
  OssidoErrorWithSource,
  ServerErrorSource,
  ErrorComponent,
} from 'ossido-ui';
