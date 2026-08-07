/**
 * Styles for the dev error overlay. The overlay presents as a floating window
 * over a dimmed backdrop (like Vite/Next) rather than an opaque full-screen
 * page, using the shared ossido-ui design tokens (see base.css).
 */
export const DEV_ERROR_STYLES = `
.ossido-err-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow: auto;
  padding: var(--ossido-space-8);
  background: rgba(0, 0, 0, 0.62);
  font-family: var(--ossido-font-sans);
  font-size: var(--ossido-font-size);
  line-height: var(--ossido-line-height);
  color: var(--ossido-color-text);
}
.ossido-err-window {
  position: relative;
  width: 100%;
  max-width: 960px;
  margin: auto;
  background: var(--ossido-color-bg);
  color: var(--ossido-color-text);
  border: 1px solid var(--ossido-color-border);
  border-top: 4px solid var(--ossido-color-accent);
  border-radius: var(--ossido-radius);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  overflow: hidden;
}
/* Apply the sans token to every overlay element (0-1-0 beats an app-level
 * "* { font-family }" reset at 0-0-0). */
.ossido-err-window * { font-family: var(--ossido-font-sans); }

/* Pager header: prev/next through the collected errors, plus a dismiss. */
.ossido-err-pager {
  display: flex;
  align-items: center;
  gap: var(--ossido-space-3);
  padding: 10px 14px;
  border-bottom: 1px solid var(--ossido-color-border);
  background: var(--ossido-color-surface);
}
.ossido-err-pager-count {
  font-variant-numeric: tabular-nums;
  font-size: var(--ossido-font-size-sm);
  color: var(--ossido-color-text-muted);
}
.ossido-err-pager-kind {
  font-size: var(--ossido-font-size-xs);
  text-transform: uppercase;
  letter-spacing: var(--ossido-letter-spacing-wide);
  color: var(--ossido-color-text-subtle);
}
.ossido-err-pager-occurrences {
  flex: none;
  padding: 1px 7px;
  border-radius: var(--ossido-radius-pill);
  background: var(--ossido-color-accent);
  color: var(--ossido-color-on-accent);
  font-size: var(--ossido-font-size-xs);
  font-weight: var(--ossido-font-weight-bold);
  font-variant-numeric: tabular-nums;
}
.ossido-err-pager-spacer { flex: 1 1 auto; }
.ossido-err-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--ossido-color-border-strong);
  border-radius: var(--ossido-radius-sm);
  background: var(--ossido-color-surface-raised);
  color: var(--ossido-color-text);
  font: inherit;
  line-height: 1;
  cursor: pointer;
}
.ossido-err-nav:hover:not(:disabled) { background: var(--ossido-color-surface-hover); }
.ossido-err-nav:disabled { opacity: 0.4; cursor: default; }
.ossido-err-nav svg { width: 15px; height: 15px; display: block; }
.ossido-err-dismiss {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: var(--ossido-radius-sm);
  background: transparent;
  color: var(--ossido-color-text-muted);
  font: inherit;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.ossido-err-dismiss:hover { background: var(--ossido-color-surface-hover); color: var(--ossido-color-text); }

.ossido-err-body { padding: var(--ossido-space-8); }

.ossido-err-badge {
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
.ossido-err-name {
  margin: var(--ossido-space-3) 0 var(--ossido-space-4);
  font-size: var(--ossido-font-size-xl);
  font-weight: var(--ossido-font-weight-bold);
  color: var(--ossido-color-accent-text);
  word-break: break-word;
}
.ossido-err-message-card {
  border: 1px solid var(--ossido-color-border);
  border-radius: var(--ossido-radius);
  background: var(--ossido-color-surface);
  padding: 14px;
  margin-bottom: var(--ossido-space-6);
  gap: var(--ossido-space-2);
  display: flex;
}
.ossido-err-message-card svg {
  width: 1.5rem;
  height: 1.5rem;
  fill: var(--ossido-color-accent-text);
  flex: none;
}
.ossido-err-message {
  margin: 0;
  color: var(--ossido-color-accent-text);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5rem;
  font-size: 1rem;
}
.ossido-err-source,
.ossido-err-source *,
.ossido-err-stack,
.ossido-err-stack *,
.ossido-err-frame-code,
.ossido-err-rawstack {
  font-family: var(--ossido-font-mono);
}
.ossido-err-source {
  border: 1px solid var(--ossido-color-border);
  border-radius: var(--ossido-radius);
  overflow: hidden;
  margin-bottom: var(--ossido-space-6);
}
.ossido-err-source-file {
  padding: 8px 14px;
  background: var(--ossido-color-surface);
  border-bottom: 1px solid var(--ossido-color-border);
  color: var(--ossido-color-text-muted);
  font-size: var(--ossido-font-size-sm);
  word-break: break-all;
}
.ossido-err-code { margin: 0; overflow-x: auto; }
.ossido-err-skel-bar {
  display: inline-block;
  height: 0.7em;
  vertical-align: middle;
  border-radius: 3px;
  background: var(--ossido-color-border-strong);
  animation: ossido-err-skel-pulse 1.3s ease-in-out infinite;
}
@keyframes ossido-err-skel-pulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.9; }
}
.ossido-err-code-line { display: flex; white-space: pre; }
.ossido-err-code-line--error { background: var(--ossido-color-danger-surface); }
.ossido-err-gutter {
  width: 3.5rem;
  flex: none;
  padding: 0 12px;
  text-align: right;
  color: var(--ossido-color-text-faint);
  user-select: none;
}
.ossido-err-code-line--error .ossido-err-gutter { color: var(--ossido-color-accent-text); }
.ossido-err-code-text { padding-right: 14px; color: var(--ossido-color-text); }
.ossido-err-frame-code {
  margin: 0 0 var(--ossido-space-6);
  padding: 12px 14px;
  border: 1px solid var(--ossido-color-border);
  border-radius: var(--ossido-radius);
  background: var(--ossido-color-surface);
  overflow-x: auto;
  color: var(--ossido-color-text);
  font-size: var(--ossido-font-size-sm);
  white-space: pre;
}
.ossido-err-rawstack {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--ossido-color-border);
  border-radius: var(--ossido-radius);
  overflow-x: auto;
  color: var(--ossido-color-text-muted);
  white-space: pre-wrap;
  word-break: break-word;
}
.ossido-err-stack { border: 1px solid var(--ossido-color-border); border-radius: var(--ossido-radius); overflow: hidden; }
.ossido-err-frame { padding: 8px 14px; border-top: 1px solid var(--ossido-color-border); }
.ossido-err-frame:first-child { border-top: none; }
.ossido-err-frame--app { background: var(--ossido-color-surface); }
.ossido-err-frame--vendor { opacity: 0.55; }
.ossido-err-fn { color: var(--ossido-color-text); }
.ossido-err-loc { color: var(--ossido-color-text-subtle); font-size: var(--ossido-font-size-sm); word-break: break-all; }
.ossido-err-actions { margin-top: var(--ossido-space-6); display: flex; gap: var(--ossido-space-3); }
.ossido-err-btn {
  padding: 6px 16px;
  border: 1px solid var(--ossido-color-border-strong);
  border-radius: var(--ossido-radius-sm);
  background: var(--ossido-color-surface-raised);
  color: var(--ossido-color-text);
  font: inherit;
  cursor: pointer;
}
.ossido-err-btn:hover { background: var(--ossido-color-surface-hover); }
.ossido-err-hint { margin-top: var(--ossido-space-4); color: var(--ossido-color-text-faint); font-size: var(--ossido-font-size-xs); }
.ossido-err-frame-toggle {
  display: block;
  width: 100%;
  padding: 8px 14px;
  text-align: left;
  border: none;
  border-top: 1px solid var(--ossido-color-border);
  background: var(--ossido-color-surface-raised);
  color: var(--ossido-color-text-subtle);
  font: inherit;
  font-size: var(--ossido-font-size-sm);
  cursor: pointer;
}
.ossido-err-frame-toggle:hover { background: var(--ossido-color-surface-hover); }
.ossido-err-frame-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ossido-err-frame-badge {
  flex: none;
  padding: 0 10px;
  border-radius: var(--ossido-radius-pill);
  background: var(--ossido-color-success-surface);
  border: 1px solid var(--ossido-color-success);
  color: var(--ossido-color-success-text);
  font-family: var(--ossido-font-sans);
  font-size: var(--ossido-font-size-xs);
  font-weight: var(--ossido-font-weight-bold);
  letter-spacing: var(--ossido-letter-spacing-wide);
  text-transform: uppercase;
  white-space: nowrap;
}

/* The persistent dev indicator: a fixed container in a chosen corner holding a
 * circular lightning badge (Next-style) with an error-count bubble, plus its
 * pop-up menu. */
.ossido-err-indicator {
  position: fixed;
  z-index: 2147483647;
}
.ossido-err-indicator--top-left { top: var(--ossido-space-6); left: var(--ossido-space-6); }
.ossido-err-indicator--top-right { top: var(--ossido-space-6); right: var(--ossido-space-6); }
.ossido-err-indicator--bottom-left { bottom: var(--ossido-space-6); left: var(--ossido-space-6); }
.ossido-err-indicator--bottom-right { bottom: var(--ossido-space-6); right: var(--ossido-space-6); }

.ossido-err-fab {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--ossido-color-border-strong);
  border-radius: 50%;
  background: var(--ossido-color-bg);
  color: var(--ossido-color-text);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
  cursor: pointer;
  transition: transform 0.12s ease;
}
.ossido-err-fab:hover { transform: scale(1.06); }
.ossido-err-fab svg { width: 22px; height: 22px; display: block; }
.ossido-err-fab-count {
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
  border: 2px solid var(--ossido-color-bg);
  background: var(--ossido-color-accent);
  color: var(--ossido-color-on-accent);
  font-family: var(--ossido-font-sans);
  font-size: 11px;
  font-weight: var(--ossido-font-weight-bold);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

/* Click-away catcher behind the open menu. */
.ossido-err-menu-scrim {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
}

/* The indicator's pop-up menu, anchored to the badge and opening toward the
 * screen centre based on the chosen corner. */
.ossido-err-menu {
  position: absolute;
  min-width: 232px;
  padding: 6px;
  background: var(--ossido-color-surface);
  border: 1px solid var(--ossido-color-border);
  border-radius: var(--ossido-radius);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  font-family: var(--ossido-font-sans);
  color: var(--ossido-color-text);
}
.ossido-err-menu--top-left { top: calc(100% + 10px); left: 0; }
.ossido-err-menu--top-right { top: calc(100% + 10px); right: 0; }
.ossido-err-menu--bottom-left { bottom: calc(100% + 10px); left: 0; }
.ossido-err-menu--bottom-right { bottom: calc(100% + 10px); right: 0; }

.ossido-err-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ossido-space-3);
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: var(--ossido-radius-sm);
  background: transparent;
  color: var(--ossido-color-text);
  font: inherit;
  font-size: var(--ossido-font-size-sm);
  text-align: left;
  cursor: pointer;
}
.ossido-err-menu-item:hover:not(:disabled) { background: var(--ossido-color-surface-hover); }
.ossido-err-menu-item:disabled { color: var(--ossido-color-text-faint); cursor: default; }
.ossido-err-menu-count {
  flex: none;
  min-width: 20px;
  padding: 0 7px;
  border-radius: var(--ossido-radius-pill);
  background: var(--ossido-color-accent);
  color: var(--ossido-color-on-accent);
  font-size: var(--ossido-font-size-xs);
  font-weight: var(--ossido-font-weight-bold);
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.ossido-err-menu-muted { color: var(--ossido-color-text-faint); font-size: var(--ossido-font-size-xs); }
.ossido-err-menu-sep {
  height: 1px;
  margin: 6px 4px;
  background: var(--ossido-color-border);
}
.ossido-err-menu-section { padding: 4px 10px 8px; }
.ossido-err-menu-label {
  display: block;
  margin-bottom: 8px;
  color: var(--ossido-color-text-subtle);
  font-size: var(--ossido-font-size-xs);
  text-transform: uppercase;
  letter-spacing: var(--ossido-letter-spacing-wide);
}
.ossido-err-menu-corners {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.ossido-err-corner {
  position: relative;
  height: 30px;
  border: 1px solid var(--ossido-color-border-strong);
  border-radius: var(--ossido-radius-sm);
  background: var(--ossido-color-surface-raised);
  cursor: pointer;
}
.ossido-err-corner:hover { background: var(--ossido-color-surface-hover); }
.ossido-err-corner--active {
  border-color: var(--ossido-color-accent);
  background: var(--ossido-color-surface-hover);
}
.ossido-err-corner-dot {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ossido-color-text-subtle);
}
.ossido-err-corner--active .ossido-err-corner-dot { background: var(--ossido-color-accent); }
.ossido-err-corner-dot--top-left { top: 5px; left: 5px; }
.ossido-err-corner-dot--top-right { top: 5px; right: 5px; }
.ossido-err-corner-dot--bottom-left { bottom: 5px; left: 5px; }
.ossido-err-corner-dot--bottom-right { bottom: 5px; right: 5px; }
`
