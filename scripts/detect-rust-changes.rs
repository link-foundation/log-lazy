#!/usr/bin/env rust-script
//! Detect file changes for the Rust workflow.

use std::env;
use std::fs::OpenOptions;
use std::io::Write;
use std::process::Command;

fn git(args: &[&str]) -> Option<String> {
    let output = Command::new("git").args(args).output().ok()?;
    if !output.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn set_output(name: &str, value: &str) {
    if let Ok(output_file) = env::var("GITHUB_OUTPUT") {
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(output_file)
        {
            let _ = writeln!(file, "{name}={value}");
        }
    }
    println!("{name}={value}");
}

fn split_files(output: Option<String>) -> Vec<String> {
    output
        .unwrap_or_default()
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(ToOwned::to_owned)
        .collect()
}

fn is_merge_commit() -> bool {
    let Some(head) = git(&["cat-file", "-p", "HEAD"]) else {
        return false;
    };
    head.lines()
        .filter(|line| line.starts_with("parent "))
        .count()
        > 1
}

fn get_changed_files() -> Vec<String> {
    let event_name = env::var("GITHUB_EVENT_NAME").unwrap_or_default();
    if event_name == "pull_request" {
        if let (Ok(base_sha), Ok(head_sha)) =
            (env::var("GITHUB_BASE_SHA"), env::var("GITHUB_HEAD_SHA"))
        {
            println!("Comparing PR base/head: {base_sha}...{head_sha}");
            let _ = Command::new("git")
                .args(["fetch", "origin", &base_sha, "--depth=1"])
                .status();
            return split_files(git(&["diff", "--name-only", &base_sha, &head_sha]));
        }
    }

    if is_merge_commit() {
        println!("Merge commit detected; comparing HEAD^2^ to HEAD^2");
        let files = split_files(git(&["diff", "--name-only", "HEAD^2^", "HEAD^2"]));
        if !files.is_empty() {
            return files;
        }
        println!("Falling back to HEAD^..HEAD^2 for the first PR commit");
        return split_files(git(&["diff", "--name-only", "HEAD^", "HEAD^2"]));
    }

    println!("Comparing HEAD^ to HEAD");
    let files = split_files(git(&["diff", "--name-only", "HEAD^", "HEAD"]));
    if !files.is_empty() {
        return files;
    }

    println!("HEAD^ not available; listing all files in HEAD");
    split_files(git(&["ls-tree", "--name-only", "-r", "HEAD"]))
}

fn is_docs_path(file: &str) -> bool {
    file.ends_with(".md") || file.starts_with("docs/")
}

fn is_rust_source_path(file: &str) -> bool {
    (file.starts_with("rust/") && file.ends_with(".rs"))
        || (file.starts_with("scripts/") && file.ends_with(".rs"))
}

fn is_toml_path(file: &str) -> bool {
    file == "Cargo.toml"
        || file == "Cargo.lock"
        || (file.starts_with("rust/") && (file.ends_with(".toml") || file.ends_with("Cargo.lock")))
}

fn main() {
    println!("Detecting Rust workflow changes\n");
    let changed_files = get_changed_files();

    println!("Changed files:");
    if changed_files.is_empty() {
        println!("  (none)");
    } else {
        for file in &changed_files {
            println!("  {file}");
        }
    }
    println!();

    let rs_changed = changed_files.iter().any(|file| is_rust_source_path(file));
    let toml_changed = changed_files.iter().any(|file| is_toml_path(file));
    let docs_changed = changed_files.iter().any(|file| is_docs_path(file));
    let workflow_changed = changed_files
        .iter()
        .any(|file| file == ".github/workflows/rust.yml");

    let code_changed_files: Vec<&String> = changed_files
        .iter()
        .filter(|file| !is_docs_path(file))
        .collect();
    let any_code_changed = code_changed_files.iter().any(|file| {
        is_rust_source_path(file)
            || is_toml_path(file)
            || file.starts_with("scripts/")
            || file.as_str() == ".github/workflows/rust.yml"
    });

    println!("Files considered code changes:");
    if code_changed_files.is_empty() {
        println!("  (none)");
    } else {
        for file in &code_changed_files {
            println!("  {file}");
        }
    }
    println!();

    set_output("rs-changed", if rs_changed { "true" } else { "false" });
    set_output("toml-changed", if toml_changed { "true" } else { "false" });
    set_output("docs-changed", if docs_changed { "true" } else { "false" });
    set_output(
        "workflow-changed",
        if workflow_changed { "true" } else { "false" },
    );
    set_output(
        "any-code-changed",
        if any_code_changed { "true" } else { "false" },
    );
}
