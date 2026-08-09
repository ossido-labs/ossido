declare module 'tuono/types' {
  // START [/Users/chris/RustroverProjects/tuono/e2e/fixtures/base/src/routes/docs/[...slug]/page.rs]
  export interface DocResponse {
    slug: string;
  }
  // END [/Users/chris/RustroverProjects/tuono/e2e/fixtures/base/src/routes/docs/[...slug]/page.rs]
  // START [/Users/chris/RustroverProjects/tuono/e2e/fixtures/base/src/routes/page.rs]
  export interface MyResponse {
    subtitle: string;
  }
  // END [/Users/chris/RustroverProjects/tuono/e2e/fixtures/base/src/routes/page.rs]
  // START [/Users/chris/RustroverProjects/tuono/e2e/fixtures/base/src/routes/pokemons/[pokemon]/page.rs]
  export interface PokemonResponse {
    name: string;
  }
  // END [/Users/chris/RustroverProjects/tuono/e2e/fixtures/base/src/routes/pokemons/[pokemon]/page.rs]
  export interface RouteProps {}
  export type TuonoPage<Path extends keyof RouteProps> = (
    props: RouteProps[Path],
  ) => import('react').ReactNode;
  export interface LayoutProps {}
  export type TuonoLayout<Path extends keyof LayoutProps> = (
    props: LayoutProps[Path] & { children: import('react').ReactNode },
  ) => import('react').ReactNode;
}
