import { test, expect } from '@playwright/test';

/**
 * The dev-only unified error overlay (ossido-ui `DevErrorOverlayHost`) surfaces
 * every kind of dev error in one floating, browsable window. The `/throws`
 * route provides a button per JS error kind, and `/rust-error` panics in its
 * Rust handler. `ossido dev` runs in `Dev` mode, so the overlay host is mounted.
 */

test('surfaces a Rust handler panic with the embedded, highlighted panic site', async ({
  page,
}) => {
  // The handler panics during SSR, so the overlay is present on first load.
  await page.goto('/rust-error');

  const overlay = page.locator('.ossido-err-window');
  await expect(overlay).toBeVisible();
  await expect(page.locator('.ossido-err-name')).toHaveText('RustPanic');
  await expect(page.locator('.ossido-err-message')).toContainText(
    'This panic was raised inside a Rust route handler',
  );
  // The panic-site source is embedded by the server (no sourcemap) and shown
  // pointing at the exact `panic!` line.
  await expect(page.locator('.ossido-err-source-file')).toContainText(
    'src/routes/rust-error/page.rs',
  );
  await expect(
    page.locator('.ossido-err-code-line--error .ossido-err-code-text'),
  ).toContainText('panic!(');
});

test('surfaces a render error as a floating overlay and recovers on retry', async ({
  page,
}) => {
  // `networkidle` so the client bundle is fully loaded (and hydrated) before we
  // click — otherwise, on a cold dev server, the click can land before the
  // handler is attached.
  await page.goto('/throws', { waitUntil: 'networkidle' });

  await page.getByTestId('throw-render').click();

  const overlay = page.locator('.ossido-err-window');
  await expect(overlay).toBeVisible();
  await expect(page.locator('.ossido-err-pager-kind')).toHaveText(
    'Runtime error',
  );
  await expect(page.locator('.ossido-err-message')).toContainText(
    'a component threw during render',
  );

  // "Try again" resets the boundary, which clears the error and restores the page.
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(overlay).toHaveCount(0);
  await expect(page.getByTestId('throw-render')).toBeVisible();
});

test('collects multiple errors and pages through them, then dismisses to a badge', async ({
  page,
}) => {
  // `networkidle` so the client bundle is fully loaded (and hydrated) before we
  // click — otherwise, on a cold dev server, the click can land before the
  // handler is attached.
  await page.goto('/throws', { waitUntil: 'networkidle' });

  const overlay = page.locator('.ossido-err-window');
  const count = page.locator('.ossido-err-pager-count');
  const badge = page.locator('.ossido-err-fab');

  // The first error opens the (modal) overlay.
  await page.getByTestId('throw-uncaught').click();
  await expect(overlay).toBeVisible();
  await expect(count).toHaveText('1 of 1');

  // Dismiss to reach the page, then trigger a second, distinct error — a new
  // error re-opens the overlay, now with both entries.
  await page.keyboard.press('Escape');
  await expect(badge).toBeVisible();
  await page.getByTestId('throw-rejection').click();
  await expect(overlay).toBeVisible();
  // The pager jumps to the latest error, so it reads "2 of 2".
  await expect(count).toHaveText('2 of 2');

  // Browse back to the first error.
  await page.getByRole('button', { name: 'Previous error' }).click();
  await expect(count).toHaveText('1 of 2');

  // Closing collapses to the corner indicator, which keeps a count bubble.
  await page.keyboard.press('Escape');
  await expect(badge).toBeVisible();
  await expect(badge.locator('.ossido-err-fab-count')).toHaveText('2');
  await expect(overlay).toHaveCount(0);

  // The badge opens a menu; "View errors" reopens the overlay.
  await badge.click();
  await page.getByRole('menuitem', { name: /view errors/i }).click();
  await expect(overlay).toBeVisible();
});

test('the dev indicator is always visible and its menu repositions and hides it', async ({
  page,
}) => {
  // No errors on the index route, but the indicator is still shown by default.
  await page.goto('/', { waitUntil: 'networkidle' });
  const indicator = page.locator('.ossido-err-indicator');
  await expect(indicator).toBeVisible();
  await expect(indicator).toHaveClass(/ossido-err-indicator--bottom-left/);

  // The menu repositions the indicator, and the choice persists across reloads.
  await page.locator('.ossido-err-fab').click();
  await page.getByRole('button', { name: 'Top right' }).click();
  await expect(indicator).toHaveClass(/ossido-err-indicator--top-right/);

  // "Hide until reload" removes it for the session.
  await page.getByRole('menuitem', { name: /hide until reload/i }).click();
  await expect(indicator).toHaveCount(0);

  // A reload restores the indicator (hide is per-session) at the saved corner.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.ossido-err-indicator')).toHaveClass(
    /ossido-err-indicator--top-right/,
  );
});
