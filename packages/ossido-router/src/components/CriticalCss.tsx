import type { JSX } from 'react';

import type { Mode } from '../types';

const VITE_PROXY_PATH = '/vite-server';
const CRITICAL_CSS_PATH = VITE_PROXY_PATH + '/ossido_internal__critical_css';

/**
 * Baked in by the vite `define` in ossido's build config, mirroring the
 * `dev.criticalCss` option. When the user disables critical CSS the vite
 * endpoint is disabled too, so the links must not render (they would be dead,
 * render-blocking requests). The `typeof` guard keeps this safe under
 * vitest/tsdown where the define is not applied.
 */
declare const __OSSIDO_CRITICAL_CSS__: boolean;
const CRITICAL_CSS_ENABLED =
  typeof __OSSIDO_CRITICAL_CSS__ === 'undefined' || __OSSIDO_CRITICAL_CSS__;

interface CriticalCssProps {
  routeFilePath?: string;
  mode?: Mode;
}

/**
 * Returns the critical CSS for the given route
 * This is required in order to avoid FOUC during development
 * since vite does not support CSS injection without JS waterfall
 */
export function CriticalCss({
  routeFilePath,
  mode,
}: CriticalCssProps): JSX.Element | null {
  if (!CRITICAL_CSS_ENABLED || !routeFilePath || mode !== 'Dev') {
    return null;
  }

  return (
    <link
      href={`${CRITICAL_CSS_PATH}?componentId=${routeFilePath}`}
      precedence="high"
      rel="stylesheet"
    />
  );
}
