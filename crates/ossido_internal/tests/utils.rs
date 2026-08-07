use std::env;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;

use fs_extra::dir::create_all;
use tempfile::{TempDir, tempdir};

#[derive(Debug)]
pub struct TempOssidoProject {
    original_dir: PathBuf,
    #[allow(dead_code)]
    // Required for dropping the temp_dir when this struct drops
    temp_dir: TempDir,
}

impl Default for TempOssidoProject {
    fn default() -> Self {
        Self::new()
    }
}

impl TempOssidoProject {
    pub fn new() -> Self {
        let original_dir = env::current_dir().expect("Failed to read current_dir");
        let temp_dir = tempdir().expect("Failed to create temp_dir");

        env::set_current_dir(temp_dir.path()).expect("Failed to change current dir into temp_dir");

        TempOssidoProject {
            original_dir,
            temp_dir,
        }
    }

    pub fn add_file_with_content<'a>(&self, path: &'a str, content: &'a str) {
        let path = PathBuf::from(path);
        create_all(
            path.parent().expect("File path does not have any parent"),
            false,
        )
        .expect("Failed to create parent file directories");

        let mut file = File::create(path).expect("Failed to create the file");
        file.write_all(content.as_bytes())
            .expect("Failed to write into the file");
    }
}

impl Drop for TempOssidoProject {
    fn drop(&mut self) {
        // Set back the current dir in the previous state
        env::set_current_dir(&self.original_dir)
            .expect("Failed to restore the original directory.");
    }
}
