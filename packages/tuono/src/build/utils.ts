export const blockingAsync = (callback: () => Promise<void>): void => {
  void (async (): Promise<void> => {
    try {
      await callback()
    } catch (error) {
      // Surface build failures instead of silently swallowing them. A failed
      // SSR bundle build, for example, otherwise degrades to a confusing
      // client-side fallback with hydration mismatches.
      console.error(error)
      process.exitCode = 1
    }
  })()
}
