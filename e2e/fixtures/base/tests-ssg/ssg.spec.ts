import { test, expect } from '@playwright/test'

// These run against the `ossido build --static` output served from a plain static
// file server (no rewrites), so they prove the export is deployable as-is.

test('renders a dynamic [param] page from the static export', async ({
  page,
}) => {
  await page.goto('/pokemons/pikachu/')
  expect(await page.textContent('h1')).toContain('Pokemon: pikachu')
})

test('renders a catch-all [...slug] page from the static export', async ({
  page,
}) => {
  await page.goto('/docs/guides/advanced/ssg/')
  expect(await page.textContent('h1')).toContain('Doc: guides/advanced/ssg')
})

test('client-side navigation fetches the prerendered .json data', async ({
  page,
}) => {
  await page.goto('/')

  // On client-side navigation the router fetches the pre-rendered `.json` data
  // file (the static-export URL). A 200 here is the whole point of the fix — a
  // naive static host would 404 the extensionless `/__ossido/data/...` route.
  const dataResponse = page.waitForResponse(
    (res) =>
      res.url().includes('/__ossido/data/pokemons/pikachu.json') &&
      res.status() === 200,
  )

  await page.click('text=Pikachu')
  await dataResponse
  await page.waitForURL('**/pokemons/pikachu')
  expect(await page.textContent('h1')).toContain('Pokemon: pikachu')
})
