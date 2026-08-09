import { readdirSync } from 'node:fs';
import { join } from 'node:path';

export const blockingAsync = (callback: () => Promise<void>): void => {
  void (async (): Promise<void> => {
    try {
      await callback();
    } catch (error) {
      // Surface build failures instead of silently swallowing them. A failed
      // SSR bundle build, for example, otherwise degrades to a confusing
      // client-side fallback with hydration mismatches.
      console.error(error);
      process.exitCode = 1;
    }
  })();
};

/**
 * Every file under `dir`, as paths relative to `dir` (posix-style separators).
 * Returns `[]` if `dir` doesn't exist. Used to build a build hook's `manifest`.
 */
export const listFilesRecursive = (dir: string): Array<string> => {
  const walk = (current: string, prefix: string): Array<string> => {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return []; // missing directory (e.g. no output produced)
    }
    const files: Array<string> = [];
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        files.push(...walk(join(current, entry.name), rel));
      } else if (entry.isFile()) {
        files.push(rel);
      }
    }
    return files;
  };
  return walk(dir, '');
};
