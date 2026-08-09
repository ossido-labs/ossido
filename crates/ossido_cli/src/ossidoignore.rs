//! `.ossidoignore` — drop files matching a glob from the build output.
//!
//! A `.ossidoignore` at the project root lists glob patterns (one per line,
//! `#` comments and blank lines ignored). After a build, any emitted file whose
//! path matches a pattern is removed from the output directories (`out/client`,
//! `out/server`, `out/static`) — e.g. to keep a draft asset, a `.map`, or a
//! `README` out of the deployed site. Applied before the `postbuild` hook, so a
//! hook's `manifest` reflects the final file set.

use std::path::Path;

use glob::Pattern;

const OSSIDOIGNORE_FILE: &str = ".ossidoignore";

/// Read `.ossidoignore` (from the current directory) into glob patterns. Blank
/// lines and `#` comments are skipped; a missing file yields no patterns.
pub fn load_patterns() -> Vec<Pattern> {
    let Ok(content) = std::fs::read_to_string(OSSIDOIGNORE_FILE) else {
        return Vec::new();
    };

    content
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty() && !line.starts_with('#'))
        .filter_map(|line| Pattern::new(line).ok())
        .collect()
}

/// Whether `rel` (a build-dir-relative, posix-style path) is ignored. A pattern
/// matches when it globs the whole relative path (`assets/*.js`, `**/*.map`),
/// matches the bare file name for a slash-free pattern (`*.map` at any depth),
/// or names a parent directory (`drafts` ignores everything under `drafts/`).
fn is_ignored(rel: &str, patterns: &[Pattern]) -> bool {
    let file_name = rel.rsplit('/').next().unwrap_or(rel);

    patterns.iter().any(|pattern| {
        let raw = pattern.as_str();
        pattern.matches(rel)
            || (!raw.contains('/') && pattern.matches(file_name))
            || rel == raw
            || rel.starts_with(&format!("{raw}/"))
    })
}

/// Remove every file under `dir` whose relative path [`is_ignored`], pruning any
/// directories left empty. No-op when there are no patterns or `dir` is absent.
/// Returns the number of files removed.
pub fn apply(dir: &Path, patterns: &[Pattern]) -> usize {
    if patterns.is_empty() || !dir.is_dir() {
        return 0;
    }

    let mut removed = 0;
    remove_matching(dir, dir, patterns, &mut removed);
    removed
}

fn remove_matching(root: &Path, current: &Path, patterns: &[Pattern], removed: &mut usize) {
    let Ok(entries) = std::fs::read_dir(current) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();

        if path.is_dir() {
            remove_matching(root, &path, patterns, removed);
            // Prune the directory if the removals emptied it.
            let is_empty = std::fs::read_dir(&path)
                .map(|mut dir| dir.next().is_none())
                .unwrap_or(false);
            if is_empty {
                let _ = std::fs::remove_dir(&path);
            }
            continue;
        }

        let rel = path
            .strip_prefix(root)
            .unwrap_or(&path)
            .to_string_lossy()
            .replace('\\', "/");

        if is_ignored(&rel, patterns) && std::fs::remove_file(&path).is_ok() {
            *removed += 1;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn patterns(lines: &[&str]) -> Vec<Pattern> {
        lines.iter().map(|l| Pattern::new(l).unwrap()).collect()
    }

    #[test]
    fn slash_free_patterns_match_the_file_name_at_any_depth() {
        let p = patterns(&["*.map"]);
        assert!(is_ignored("app.map", &p));
        assert!(is_ignored("assets/app.js.map", &p));
        assert!(!is_ignored("assets/app.js", &p));
    }

    #[test]
    fn a_bare_name_ignores_a_whole_directory() {
        let p = patterns(&["drafts"]);
        assert!(is_ignored("drafts/post.md", &p));
        assert!(is_ignored("drafts/nested/x.txt", &p));
        assert!(!is_ignored("published/post.md", &p));
    }

    #[test]
    fn path_and_recursive_globs_match() {
        assert!(is_ignored("assets/app.js", &patterns(&["assets/*.js"])));
        assert!(is_ignored("a/b/c.txt", &patterns(&["**/*.txt"])));
        assert!(is_ignored("secret.txt", &patterns(&["secret.txt"])));
        assert!(!is_ignored("keep.txt", &patterns(&["secret.txt"])));
    }

    #[test]
    fn nothing_matches_without_patterns() {
        assert!(!is_ignored("anything", &[]));
    }
}
