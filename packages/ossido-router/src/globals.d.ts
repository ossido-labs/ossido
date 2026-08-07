import type { Router } from './router'

declare global {
  interface Window {
    __OSSIDO__ROUTER__: Router
  }
}
