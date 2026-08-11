import type { ParsedLocation } from '../components/RouterContext';
import { sanitizePathname } from './match-route';

export function fromUrlToParsedLocation(href: string): ParsedLocation {
  const location = new URL(href, window.location.origin);
  return {
    href: location.href,
    // Canonical pathname (no trailing slash), matching the server payload so
    // `useRouter().pathname` is consistent across SSR, hydration, and navigation.
    pathname: sanitizePathname(location.pathname),
    search: Object.fromEntries(location.searchParams),
    searchStr: location.search,
    hash: location.hash,
  };
}
