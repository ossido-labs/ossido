import type { ReactNode } from 'react';

import type { ServerErrorPayload } from '@ossido-labs/ossido-router';

import type { OssidoConfigServer } from './config';

export type Mode = 'Dev' | 'Prod';

/**
 * Provided by the rust server and used in the ssr env
 * @see ossido-router {@link ServerInitialLocation}
 */
export interface ServerPayloadLocation {
  href: string;
  pathname: string;
  searchStr: string;
}

/**
 * @see crates/ossido/src/payload.rs
 */
export type ServerPayload<TData = unknown> = {
  location: ServerPayloadLocation;

  data: TData;

  /** Wrapping `layout.rs` handlers' data, keyed by each layout's `dataKey`. */
  layoutData?: Record<string, unknown>;

  /** Present (dev only) when the route's Rust handler panicked. */
  serverError?: ServerErrorPayload;
} & (
  | {
      mode: 'Prod';
      jsBundles: Array<string>;
      cssBundles: Array<string>;
    }
  | {
      mode: 'Dev';
      devServerConfig?: OssidoConfigServer;
    }
);

export interface OssidoLayoutProps {
  children: ReactNode;
}
