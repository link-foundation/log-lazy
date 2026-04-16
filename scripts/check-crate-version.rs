#!/usr/bin/env rust-script
//! Check whether the Rust crate version is publishable.

use std::env;
use std::fs::OpenOptions;
use std::io::Write;
use std::process::{exit, Command};

#[path = "rust-paths.rs"]
mod rust_paths;

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

fn crates_io_status(crate_name: &str, version: &str) -> Option<u16> {
    let url = format!("https://crates.io/api/v1/crates/{crate_name}/{version}");
    let output = Command::new("curl")
        .args(["-sS", "-o", "/dev/null", "-w", "%{http_code}", &url])
        .output()
        .ok()?;
    String::from_utf8_lossy(&output.stdout)
        .trim()
        .parse::<u16>()
        .ok()
}

fn main() {
    let rust_root = rust_paths::get_rust_root(None, true).unwrap_or_else(|error| {
        eprintln!("Error: {error}");
        exit(1);
    });
    let manifest = rust_paths::get_cargo_toml_path(&rust_root);
    let package = rust_paths::read_package_info(&manifest).unwrap_or_else(|error| {
        eprintln!("Error: {error}");
        exit(1);
    });

    let status = crates_io_status(&package.name, &package.version).unwrap_or(0);
    let published = status == 200;

    println!("Crate: {}", package.name);
    println!("Current version: {}", package.version);
    println!("crates.io status for exact version: {status}");

    set_output("crate-name", &package.name);
    set_output("version", &package.version);
    set_output(
        "crates-io-version",
        if published {
            &package.version
        } else {
            "not-found"
        },
    );

    let event_name = env::var("GITHUB_EVENT_NAME").unwrap_or_default();
    let ref_name = env::var("GITHUB_REF").unwrap_or_default();

    if event_name == "pull_request" && published {
        eprintln!(
            "::error::{} {} is already published to crates.io",
            package.name, package.version
        );
        exit(1);
    }

    let should_publish = event_name == "push" && ref_name == "refs/heads/main" && !published;
    set_output(
        "should-publish",
        if should_publish { "true" } else { "false" },
    );
}
