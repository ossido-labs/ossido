//#region tuono.config.ts
var config = {
  vite: { alias: { '@': 'src' } },
  ssr: { renderThreads: 1 },
};
//#endregion
export { config as default };
