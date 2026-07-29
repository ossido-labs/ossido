// `.css` files are imported as raw strings (rolldown `moduleTypes` text loader,
// configured in tsdown.config.ts) and injected via `<style>` — the library has
// no CSS bundling step.
declare module '*.css' {
  const content: string
  export default content
}
