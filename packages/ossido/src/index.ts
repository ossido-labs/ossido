export {
  createRoute,
  createRootRoute,
  createRouter,
  Link,
  useRouter,
} from '@ossido-labs/ossido-router';

export type { OssidoErrorProps } from '@ossido-labs/ossido-router';

export {
  dynamic,
  RouteLazyLoading as __ossido__internal__lazyLoadRoute,
} from './shared/dynamic';

export {
  __ossido__internal__applyRouteHot,
  __ossido__internal__applyRouteTree,
} from './shared/routeHot';

export { OssidoScripts } from './shared/OssidoScripts';

export type { OssidoLayoutProps } from './types';
