#!/usr/bin/env rust-script
//! Publish the Rust crate to crates.io.

use std::env;
use std::fs::OpenOptions;
use std::io::Write;
use std::process::{exit, Command};

#[path = "rust-paths.rs"]
mod rust_paths;

fn has_arg(name: &str) -> bool {
    let flag = format!("--{name}");
    env::args().any(|arg| arg == flag)
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

fn main() {
    if has_arg("help") {
        println!("Usage: rust-script scripts/publish-crate.rs [--dry-run]");
        return;
    }

    let dry_run = has_arg("dry-run");
    let rust_root = rust_paths::get_rust_root(None, true).unwrap_or_else(|error| {
        eprintln!("Error: {error}");
        exit(1);
    });
    let manifest = rust_paths::get_cargo_toml_path(&rust_root);
    let package = rust_paths::read_package_info(&manifest).unwrap_or_else(|error| {
        eprintln!("Error: {error}");
        exit(1);
    });

    println!("Publishing {}@{}", package.name, package.version);

    let mut command = Command::new("cargo");
    command.arg("publish");
    if dry_run {
        command.arg("--dry-run");
    }

    if !dry_run {
        if let Ok(token) = env::var("CARGO_REGISTRY_TOKEN") {
            if !token.is_empty() {
                command.arg("--token").arg(token);
            }
        } else if let Ok(token) = env::var("CARGO_TOKEN") {
            if !token.is_empty() {
                command.arg("--token").arg(token);
            }
        }
    }

    if rust_paths::needs_cd(&rust_root) {
        command.current_dir(&rust_root);
    }

    let output = command.output().unwrap_or_else(|error| {
        eprintln!("Failed to run cargo publish: {error}");
        exit(1);
    });

    if output.status.success() {
        if dry_run {
            println!(
                "Dry-run publish check passed for {}@{}",
                package.name, package.version
            );
            set_output("publish_result", "dry_run");
            return;
        }
        println!("Published {}@{}", package.name, package.version);
        set_output("publish_result", "success");
        return;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let combined = format!("{stdout}\n{stderr}");

    if combined.contains("already uploaded") || combined.contains("already exists") {
        eprintln!(
            "Version {} is already published to crates.io",
            package.version
        );
        set_output("publish_result", "already_exists");
    } else if combined.contains("authentication")
        || combined.contains("unauthorized")
        || combined.contains("please provide a")
        || combined.contains("non-empty token")
    {
        eprintln!("Crates.io authentication failed.");
        set_output("publish_result", "auth_failed");
    } else {
        eprintln!("{combined}");
        set_output("publish_result", "failed");
    }

    exit(1);
}
