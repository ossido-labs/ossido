declare module "tuono/types" {
export interface RouteProps {
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
