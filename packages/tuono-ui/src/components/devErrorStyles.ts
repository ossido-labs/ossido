/**
 * Styles for the dev error overlay. The overlay presents as a floating window
 * over a dimmed backdrop (like Vite/Next) rather than an opaque full-screen
 * page, using the shared tuono-ui design tokens (see base.css).
 */
export const DEV_ERROR_STYLES = `
.tuono-err-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow: auto;
  padding: var(--tuono-space-8);
  background: rgba(0, 0, 0, 0.62);
  font-family: var(--tuono-font-sans);
  font-size: var(--tuono-font-size);
  line-height: var(--tuono-line-height);
  color: var(--tuono-color-text);
}
.tuono-err-window {
  position: relative;
  width: 100%;
  max-width: 960px;
  margin: auto;
  background: var(--tuono-color-bg);
  color: var(--tuono-color-text);
  border: 1px solid var(--tuono-color-border);
  border-top: 4px solid var(--tuono-color-accent);
  border-radius: var(--tuono-radius);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  overflow: hidden;
}
/* Apply the sans token to every overlay element (0-1-0 beats an app-level
 * "* { font-family }" reset at 0-0-0). */
.tuono-err-window * { font-family: var(--tuono-font-sans); }

/* Pager header: prev/next through the collected errors, plus a dismiss. */
.tuono-err-pager {
  display: flex;
  align-items: center;
  gap: var(--tuono-space-3);
  padding: 10px 14px;
  border-bottom: 1px solid var(--tuono-color-border);
  background: var(--tuono-color-surface);
}
.tuono-err-pager-count {
  font-variant-numeric: tabular-nums;
  font-size: var(--tuono-font-size-sm);
  color: var(--tuono-color-text-muted);
}
.tuono-err-pager-kind {
  font-size: var(--tuono-font-size-xs);
  text-transform: uppercase;
  letter-spacing: var(--tuono-letter-spacing-wide);
  color: var(--tuono-color-text-subtle);
}
.tuono-err-pager-occurrences {
  flex: none;
  padding: 1px 7px;
  border-radius: var(--tuono-radius-pill);
  background: var(--tuono-color-accent);
  color: var(--tuono-color-on-accent);
  font-size: var(--tuono-font-size-xs);
  font-weight: var(--tuono-font-weight-bold);
  font-variant-numeric: tabular-nums;
}
.tuono-err-pager-spacer { flex: 1 1 auto; }
.tuono-err-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--tuono-color-border-strong);
  border-radius: var(--tuono-radius-sm);
  background: var(--tuono-color-surface-raised);
  color: var(--tuono-color-text);
  font: inherit;
  line-height: 1;
  cursor: pointer;
}
.tuono-err-nav:hover:not(:disabled) { background: var(--tuono-color-surface-hover); }
.tuono-err-nav:disabled { opacity: 0.4; cursor: default; }
.tuono-err-nav svg { width: 15px; height: 15px; display: block; }
.tuono-err-dismiss {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: var(--tuono-radius-sm);
  background: transparent;
  color: var(--tuono-color-text-muted);
  font: inherit;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.tuono-err-dismiss:hover { background: var(--tuono-color-surface-hover); color: var(--tuono-color-text); }

.tuono-err-body { padding: var(--tuono-space-8); }

.tuono-err-badge {
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
.tuono-err-name {
  margin: var(--tuono-space-3) 0 var(--tuono-space-4);
  font-size: var(--tuono-font-size-xl);
  font-weight: var(--tuono-font-weight-bold);
  color: var(--tuono-color-accent-text);
  word-break: break-word;
}
.tuono-err-message-card {
  border: 1px solid var(--tuono-color-border);
  border-radius: var(--tuono-radius);
  background: var(--tuono-color-surface);
  padding: 14px;
  margin-bottom: var(--tuono-space-6);
  gap: var(--tuono-space-2);
  display: flex;
}
.tuono-err-message-card svg {
  width: 1.5rem;
  height: 1.5rem;
  fill: var(--tuono-color-accent-text);
  flex: none;
}
.tuono-err-message {
  margin: 0;
  color: var(--tuono-color-accent-text);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5rem;
  font-size: 1rem;
}
.tuono-err-source,
.tuono-err-source *,
.tuono-err-stack,
.tuono-err-stack *,
.tuono-err-frame-code,
.tuono-err-rawstack {
  font-family: var(--tuono-font-mono);
}
.tuono-err-source {
  border: 1px solid var(--tuono-color-border);
  border-radius: var(--tuono-radius);
  overflow: hidden;
  margin-bottom: var(--tuono-space-6);
}
.tuono-err-source-file {
  padding: 8px 14px;
  background: var(--tuono-color-surface);
  border-bottom: 1px solid var(--tuono-color-border);
  color: var(--tuono-color-text-muted);
  font-size: var(--tuono-font-size-sm);
  word-break: break-all;
}
.tuono-err-code { margin: 0; overflow-x: auto; }
.tuono-err-skel-bar {
  display: inline-block;
  height: 0.7em;
  vertical-align: middle;
  border-radius: 3px;
  background: var(--tuono-color-border-strong);
  animation: tuono-err-skel-pulse 1.3s ease-in-out infinite;
}
@keyframes tuono-err-skel-pulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.9; }
}
.tuono-err-code-line { display: flex; white-space: pre; }
.tuono-err-code-line--error { background: var(--tuono-color-danger-surface); }
.tuono-err-gutter {
  width: 3.5rem;
  flex: none;
  padding: 0 12px;
  text-align: right;
  color: var(--tuono-color-text-faint);
  user-select: none;
}
.tuono-err-code-line--error .tuono-err-gutter { color: var(--tuono-color-accent-text); }
.tuono-err-code-text { padding-right: 14px; color: var(--tuono-color-text); }
.tuono-err-frame-code {
  margin: 0 0 var(--tuono-space-6);
  padding: 12px 14px;
  border: 1px solid var(--tuono-color-border);
  border-radius: var(--tuono-radius);
  background: var(--tuono-color-surface);
  overflow-x: auto;
  color: var(--tuono-color-text);
  font-size: var(--tuono-font-size-sm);
  white-space: pre;
}
.tuono-err-rawstack {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--tuono-color-border);
  border-radius: var(--tuono-radius);
  overflow-x: auto;
  color: var(--tuono-color-text-muted);
  white-space: pre-wrap;
  word-break: break-word;
}
.tuono-err-stack { border: 1px solid var(--tuono-color-border); border-radius: var(--tuono-radius); overflow: hidden; }
.tuono-err-frame { padding: 8px 14px; border-top: 1px solid var(--tuono-color-border); }
.tuono-err-frame:first-child { border-top: none; }
.tuono-err-frame--app { background: var(--tuono-color-surface); }
.tuono-err-frame--vendor { opacity: 0.55; }
.tuono-err-fn { color: var(--tuono-color-text); }
.tuono-err-loc { color: var(--tuono-color-text-subtle); font-size: var(--tuono-font-size-sm); word-break: break-all; }
.tuono-err-actions { margin-top: var(--tuono-space-6); display: flex; gap: var(--tuono-space-3); }
.tuono-err-btn {
  padding: 6px 16px;
  border: 1px solid var(--tuono-color-border-strong);
  border-radius: var(--tuono-radius-sm);
  background: var(--tuono-color-surface-raised);
  color: var(--tuono-color-text);
  font: inherit;
  cursor: pointer;
}
.tuono-err-btn:hover { background: var(--tuono-color-surface-hover); }
.tuono-err-hint { margin-top: var(--tuono-space-4); color: var(--tuono-color-text-faint); font-size: var(--tuono-font-size-xs); }
.tuono-err-frame-toggle {
  display: block;
  width: 100%;
  padding: 8px 14px;
  text-align: left;
  border: none;
  border-top: 1px solid var(--tuono-color-border);
  background: var(--tuono-color-surface-raised);
  color: var(--tuono-color-text-subtle);
  font: inherit;
  font-size: var(--tuono-font-size-sm);
  cursor: pointer;
}
.tuono-err-frame-toggle:hover { background: var(--tuono-color-surface-hover); }
.tuono-err-frame-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.tuono-err-frame-badge {
  flex: none;
  padding: 0 10px;
  border-radius: var(--tuono-radius-pill);
  background: var(--tuono-color-success-surface);
  border: 1px solid var(--tuono-color-success);
  color: var(--tuono-color-success-text);
  font-family: var(--tuono-font-sans);
  font-size: var(--tuono-font-size-xs);
  font-weight: var(--tuono-font-weight-bold);
  letter-spacing: var(--tuono-letter-spacing-wide);
  text-transform: uppercase;
  white-space: nowrap;
}

/* The persistent dev indicator: a fixed container in a chosen corner holding a
 * circular lightning badge (Next-style) with an error-count bubble, plus its
 * pop-up menu. */
.tuono-err-indicator {
  position: fixed;
  z-index: 2147483647;
}
.tuono-err-indicator--top-left { top: var(--tuono-space-6); left: var(--tuono-space-6); }
.tuono-err-indicator--top-right { top: var(--tuono-space-6); right: var(--tuono-space-6); }
.tuono-err-indicator--bottom-left { bottom: var(--tuono-space-6); left: var(--tuono-space-6); }
.tuono-err-indicator--bottom-right { bottom: var(--tuono-space-6); right: var(--tuono-space-6); }

.tuono-err-fab {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--tuono-color-border-strong);
  border-radius: 50%;
  background: var(--tuono-color-bg);
  color: var(--tuono-color-text);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
  cursor: pointer;
  transition: transform 0.12s ease;
}
.tuono-err-fab:hover { transform: scale(1.06); }
.tuono-err-fab svg { width: 22px; height: 22px; display: block; }
.tuono-err-fab-count {
  position: absolute;
  top: -5px;
  right: -5px;
  box-sizing: border-box;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 2px solid var(--tuono-color-bg);
  background: var(--tuono-color-accent);
  color: var(--tuono-color-on-accent);
  font-family: var(--tuono-font-sans);
  font-size: 11px;
  font-weight: var(--tuono-font-weight-bold);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

/* Click-away catcher behind the open menu. */
.tuono-err-menu-scrim {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
}

/* The indicator's pop-up menu, anchored to the badge and opening toward the
 * screen centre based on the chosen corner. */
.tuono-err-menu {
  position: absolute;
  min-width: 232px;
  padding: 6px;
  background: var(--tuono-color-surface);
  border: 1px solid var(--tuono-color-border);
  border-radius: var(--tuono-radius);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  font-family: var(--tuono-font-sans);
  color: var(--tuono-color-text);
}
.tuono-err-menu--top-left { top: calc(100% + 10px); left: 0; }
.tuono-err-menu--top-right { top: calc(100% + 10px); right: 0; }
.tuono-err-menu--bottom-left { bottom: calc(100% + 10px); left: 0; }
.tuono-err-menu--bottom-right { bottom: calc(100% + 10px); right: 0; }

.tuono-err-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--tuono-space-3);
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: var(--tuono-radius-sm);
  background: transparent;
  color: var(--tuono-color-text);
  font: inherit;
  font-size: var(--tuono-font-size-sm);
  text-align: left;
  cursor: pointer;
}
.tuono-err-menu-item:hover:not(:disabled) { background: var(--tuono-color-surface-hover); }
.tuono-err-menu-item:disabled { color: var(--tuono-color-text-faint); cursor: default; }
.tuono-err-menu-count {
  flex: none;
  min-width: 20px;
  padding: 0 7px;
  border-radius: var(--tuono-radius-pill);
  background: var(--tuono-color-accent);
  color: var(--tuono-color-on-accent);
  font-size: var(--tuono-font-size-xs);
  font-weight: var(--tuono-font-weight-bold);
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.tuono-err-menu-muted { color: var(--tuono-color-text-faint); font-size: var(--tuono-font-size-xs); }
.tuono-err-menu-sep {
  height: 1px;
  margin: 6px 4px;
  background: var(--tuono-color-border);
}
.tuono-err-menu-section { padding: 4px 10px 8px; }
.tuono-err-menu-label {
  display: block;
  margin-bottom: 8px;
  color: var(--tuono-color-text-subtle);
  font-size: var(--tuono-font-size-xs);
  text-transform: uppercase;
  letter-spacing: var(--tuono-letter-spacing-wide);
}
.tuono-err-menu-corners {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.tuono-err-corner {
  position: relative;
  height: 30px;
  border: 1px solid var(--tuono-color-border-strong);
  border-radius: var(--tuono-radius-sm);
  background: var(--tuono-color-surface-raised);
  cursor: pointer;
}
.tuono-err-corner:hover { background: var(--tuono-color-surface-hover); }
.tuono-err-corner--active {
  border-color: var(--tuono-color-accent);
  background: var(--tuono-color-surface-hover);
}
.tuono-err-corner-dot {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--tuono-color-text-subtle);
}
.tuono-err-corner--active .tuono-err-corner-dot { background: var(--tuono-color-accent); }
.tuono-err-corner-dot--top-left { top: 5px; left: 5px; }
.tuono-err-corner-dot--top-right { top: 5px; right: 5px; }
.tuono-err-corner-dot--bottom-left { bottom: 5px; left: 5px; }
.tuono-err-corner-dot--bottom-right { bottom: 5px; right: 5px; }
`
