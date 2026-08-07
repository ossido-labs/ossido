declare module "tuono/types" {
// START [/Users/chris/RustroverProjects/tuono/examples/tuono-tutorial/src/routes/page.rs]
export interface Pokemons {
  results: Pokemon[];
}
export interface Pokemon {
  name: string;
  url: string;
}
// END [/Users/chris/RustroverProjects/tuono/examples/tuono-tutorial/src/routes/page.rs]
export interface RouteProps {
  "/": Pokemons
}
export type TuonoPage<Path extends keyof RouteProps> = (
  props: RouteProps[Path],
) => import("react").ReactNode
export interface LayoutProps {
}
export type TuonoLayout<Path extends keyof LayoutProps> = (
  props: LayoutProps[Path] & { children: import("react").ReactNode },
) => import("react").ReactNode
}
