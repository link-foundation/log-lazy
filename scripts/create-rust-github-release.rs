#!/usr/bin/env rust-script
//! Create the Rust GitHub release.

use std::env;
use std::process::{exit, Command, Stdio};

fn arg_value(name: &str) -> Option<String> {
    let args: Vec<String> = env::args().collect();
    let flag = format!("--{name}");
    args.iter()
        .position(|arg| arg == &flag)
        .and_then(|index| args.get(index + 1))
        .cloned()
}

fn has_arg(name: &str) -> bool {
    let flag = format!("--{name}");
    env::args().any(|arg| arg == flag)
}

fn run_status(command: &str, args: &[&str], quiet: bool) -> Option<i32> {
    let mut cmd = Command::new(command);
    cmd.args(args);
    if quiet {
        cmd.stdout(Stdio::null()).stderr(Stdio::null());
    }
    cmd.status().ok().and_then(|status| status.code())
}

fn main() {
    if has_arg("help") {
        println!(
            "Usage: rust-script scripts/create-rust-github-release.rs --release-version <version> [--crate-name <name>] [--repository <owner/repo>] [--dry-run]"
        );
        return;
    }

    let dry_run = has_arg("dry-run");
    let version = arg_value("release-version").unwrap_or_else(|| {
        eprintln!("--release-version is required");
        exit(1);
    });
    let crate_name = arg_value("crate-name").unwrap_or_else(|| "log-lazy".to_string());
    let repository = arg_value("repository")
        .or_else(|| env::var("GITHUB_REPOSITORY").ok())
        .unwrap_or_else(|| {
            eprintln!("--repository or GITHUB_REPOSITORY is required");
            exit(1);
        });

    let tag = format!("rust-v{version}");
    if run_status(
        "gh",
        &["release", "view", &tag, "--repo", &repository],
        true,
    ) == Some(0)
    {
        println!("GitHub release {tag} already exists; skipping.");
        return;
    }

    let target = env::var("GITHUB_SHA").unwrap_or_else(|_| "main".to_string());
    let notes = format!("Crates.io: https://crates.io/crates/{crate_name}/{version}");
    let title = format!("Rust v{version}");

    if dry_run {
        println!("Would create GitHub release {tag} in {repository}");
        println!("Target: {target}");
        println!("Title: {title}");
        println!("Notes: {notes}");
        return;
    }

    let status = run_status(
        "gh",
        &[
            "release",
            "create",
            &tag,
            "--repo",
            &repository,
            "--target",
            &target,
            "--title",
            &title,
            "--notes",
            &notes,
        ],
        false,
    );

    if status != Some(0) {
        exit(status.unwrap_or(1));
    }
}
