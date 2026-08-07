import mdx from "@mdx-js/rollup";
//#region tuono.config.ts
var config = { vite: {
	optimizeDeps: { exclude: ["@mdx-js/react"] },
	plugins: [{
		enforce: "pre",
		...mdx({ providerImportSource: "@mdx-js/react" })
	}]
} };
//#endregion
export { config as default };
