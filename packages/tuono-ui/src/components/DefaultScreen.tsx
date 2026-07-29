import type { JSX, ReactNode } from 'react'

import { BaseStyles } from './BaseStyles'

interface DefaultScreenProps {
  /** ARIA role for the container (e.g. `alert` for the error fallback). */
  role?: string
  /** Small uppercase pill above the title (e.g. `Error`, `404`). */
  badge: string
  /** The screen heading. */
  title: string
  /** Message paragraph(s) and action(s) — use `tuono-screen-*` classes. */
  children: ReactNode
}

// Matches the DevErrorOverlay's visual language (dark canvas, accent badge and
// heading) using the shared base.css tokens, so every framework default screen
// looks consistent. `.tuono-screen *` re-applies the sans token to beat an
// app-level `* { font-family: ... }` reset.
const STYLES = `
.tuono-screen {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--tuono-space-8);
  background: var(--tuono-color-bg);
  color: var(--tuono-color-text);
  font-family: var(--tuono-font-sans);
  font-size: var(--tuono-font-size);
  line-height: var(--tuono-line-height);
}
.tuono-screen * { font-family: var(--tuono-font-sans); }
.tuono-screen-card {
  max-width: 32rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--tuono-space-4);
  text-align: center;
}
.tuono-screen-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--tuono-radius-pill);
  background: var(--tuono-color-accent);
  color: var(--tuono-color-on-accent);
  font-size: var(--tuono-font-size-xs);
  font-weight: var(--tuono-font-weight-bold);
  letter-spacing: var(--tuono-letter-spacing-wide);
  text-transform: uppercase;
}
.tuono-screen-title {
  margin: 0;
  font-size: var(--tuono-font-size-xl);
  font-weight: var(--tuono-font-weight-bold);
  color: var(--tuono-color-accent-text);
}
.tuono-screen-text {
  margin: 0;
  color: var(--tuono-color-text-muted);
}
.tuono-screen-action {
  padding: 6px 16px;
  border: 1px solid var(--tuono-color-border-strong);
  border-radius: var(--tuono-radius-sm);
  background: var(--tuono-color-surface-raised);
  color: var(--tuono-color-text);
  font: inherit;
  cursor: pointer;
  text-decoration: none;
}
.tuono-screen-action:hover { background: var(--tuono-color-surface-hover); }
`

/**
 * Shared shell for the framework's full-page default screens — the production
 * error fallback ({@link DefaultError}) and the 404 page
 * ({@link NotFoundDefaultContent}) — styled to match the development
 * {@link DevErrorOverlay}: a dark canvas with an accent badge and heading.
 */
export function DefaultScreen({
  role,
  badge,
  title,
  children,
}: DefaultScreenProps): JSX.Element {
  return (
    <div className="tuono-screen" role={role}>
      <BaseStyles />
      <style>{STYLES}</style>
      <div className="tuono-screen-card">
        <span className="tuono-screen-badge">{badge}</span>
        <h1 className="tuono-screen-title">{title}</h1>
        {children}
      </div>
    </div>
  )
}
