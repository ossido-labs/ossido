import type { JSX, ReactNode } from 'react';

import { BaseStyles } from './BaseStyles';

interface DefaultScreenProps {
  /** ARIA role for the container (e.g. `alert` for the error fallback). */
  role?: string;
  /** Small uppercase pill above the title (e.g. `Error`, `404`). */
  badge: string;
  /** The screen heading. */
  title: string;
  /** Message paragraph(s) and action(s) — use `ossido-screen-*` classes. */
  children: ReactNode;
}

// Matches the DevErrorOverlay's visual language (dark canvas, accent badge and
// heading) using the shared base.css tokens, so every framework default screen
// looks consistent. `.ossido-screen *` re-applies the sans token to beat an
// app-level `* { font-family: ... }` reset.
const STYLES = `
.ossido-screen {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--ossido-space-8);
  background: var(--ossido-color-bg);
  color: var(--ossido-color-text);
  font-family: var(--ossido-font-sans);
  font-size: var(--ossido-font-size);
  line-height: var(--ossido-line-height);
}
.ossido-screen * { font-family: var(--ossido-font-sans); }
.ossido-screen-card {
  max-width: 32rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ossido-space-4);
  text-align: center;
}
.ossido-screen-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--ossido-radius-pill);
  background: var(--ossido-color-accent);
  color: var(--ossido-color-on-accent);
  font-size: var(--ossido-font-size-xs);
  font-weight: var(--ossido-font-weight-bold);
  letter-spacing: var(--ossido-letter-spacing-wide);
  text-transform: uppercase;
}
.ossido-screen-title {
  margin: 0;
  font-size: var(--ossido-font-size-xl);
  font-weight: var(--ossido-font-weight-bold);
  color: var(--ossido-color-accent-text);
}
.ossido-screen-text {
  margin: 0;
  color: var(--ossido-color-text-muted);
}
.ossido-screen-action {
  padding: 6px 16px;
  border: 1px solid var(--ossido-color-border-strong);
  border-radius: var(--ossido-radius-sm);
  background: var(--ossido-color-surface-raised);
  color: var(--ossido-color-text);
  font: inherit;
  cursor: pointer;
  text-decoration: none;
}
.ossido-screen-action:hover { background: var(--ossido-color-surface-hover); }
`;

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
    <div className="ossido-screen" role={role}>
      <BaseStyles />
      <style>{STYLES}</style>
      <div className="ossido-screen-card">
        <span className="ossido-screen-badge">{badge}</span>
        <h1 className="ossido-screen-title">{title}</h1>
        {children}
      </div>
    </div>
  );
}
