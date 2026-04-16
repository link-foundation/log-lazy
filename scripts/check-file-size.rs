#!/usr/bin/env rust-script
//! Check maintainability line limits for Rust workflow files.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::exit;

const DEFAULT_LIMIT: usize = 1500;
const DOCS_LIMIT: usize = 2500;

#[derive(Debug)]
struct Violation {
    path: PathBuf,
    lines: usize,
    limit: usize,
}

fn should_skip(path: &Path) -> bool {
    let path_text = path.to_string_lossy();
    path_text.contains("/target/")
        || path_text.contains("/node_modules/")
        || path_text.contains("/.git/")
}

fn should_check(path: &Path) -> bool {
    let Some(extension) = path.extension().and_then(|value| value.to_str()) else {
        return false;
    };
    matches!(extension, "md" | "rs" | "toml" | "yaml" | "yml")
}

fn limit_for(path: &Path) -> usize {
    if path.extension().and_then(|value| value.to_str()) == Some("md") {
        DOCS_LIMIT
    } else {
        DEFAULT_LIMIT
    }
}

fn walk(path: &Path, files: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(path) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if should_skip(&path) {
            continue;
        }
        if path.is_dir() {
            walk(&path, files);
        } else if path.is_file() && should_check(&path) {
            files.push(path);
        }
    }
}

fn main() {
    let mut files = Vec::new();
    for root in ["rust", "scripts", "docs", ".github/workflows", "."] {
        let path = Path::new(root);
        if root == "." {
            for file in ["Cargo.toml", "Cargo.lock"] {
                let file_path = PathBuf::from(file);
                if file_path.exists() {
                    files.push(file_path);
                }
            }
            continue;
        }
        walk(path, &mut files);
    }

    files.sort();
    files.dedup();

    let mut violations = Vec::new();
    for path in files {
        let Ok(content) = fs::read_to_string(&path) else {
            eprintln!("Warning: could not read {}", path.display());
            continue;
        };
        let lines = content.lines().count();
        let limit = limit_for(&path);
        println!("{}: {lines} lines (limit: {limit})", path.display());
        if lines > limit {
            violations.push(Violation { path, lines, limit });
        }
    }

    if violations.is_empty() {
        println!("All checked Rust workflow files are within line limits.");
        return;
    }

    println!("Files exceeding line limits:");
    for violation in violations {
        println!(
            "  {}: {} lines (limit: {})",
            violation.path.display(),
            violation.lines,
            violation.limit
        );
    }
    exit(1);
}
