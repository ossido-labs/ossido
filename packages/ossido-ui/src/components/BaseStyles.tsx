import type { JSX } from 'react'

import baseCss from './base.css'

/**
 * Injects the shared design tokens ({@link file://./base.css}) — colours,
 * typography and the Google Font imports (Noto Sans / JetBrains Mono) — used by
 * the framework's default screens. Rendered once at the top of each default
 * screen so it is self-contained (no dependency on the app's stylesheet).
 */
export function BaseStyles(): JSX.Element {
  return <style>{baseCss}</style>
}
