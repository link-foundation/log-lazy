#!/usr/bin/env rust-script
//! Shared path helpers for Rust CI/CD scripts.

#![allow(dead_code)]

use std::env;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PackageInfo {
    pub name: String,
    pub version: String,
}

pub fn get_rust_root(explicit_root: Option<&str>, verbose: bool) -> Result<String, String> {
    if let Some(root) = explicit_root {
        if verbose {
            eprintln!("Using configured Rust root: {root}");
        }
        return Ok(root.to_string());
    }

    let args: Vec<String> = env::args().collect();
    if let Some(index) = args.iter().position(|arg| arg == "--rust-root") {
        if let Some(root) = args.get(index + 1) {
            if verbose {
                eprintln!("Using CLI Rust root: {root}");
            }
            return Ok(root.clone());
        }
    }

    if let Ok(root) = env::var("RUST_ROOT") {
        if !root.is_empty() {
            if verbose {
                eprintln!("Using environment Rust root: {root}");
            }
            return Ok(root);
        }
    }

    if Path::new("./rust/Cargo.toml").exists() {
        if verbose {
            eprintln!("Detected multi-language Rust root: rust");
        }
        return Ok("rust".to_string());
    }

    if Path::new("./Cargo.toml").exists() {
        if verbose {
            eprintln!("Detected root Rust package or workspace");
        }
        return Ok(".".to_string());
    }

    Err("Could not find Cargo.toml in ./rust or repository root".to_string())
}

pub fn get_cargo_toml_path(rust_root: &str) -> PathBuf {
    if rust_root == "." {
        PathBuf::from("Cargo.toml")
    } else {
        PathBuf::from(rust_root).join("Cargo.toml")
    }
}

pub fn read_package_info(manifest_path: &Path) -> Result<PackageInfo, String> {
    let content = fs::read_to_string(manifest_path)
        .map_err(|error| format!("Failed to read {}: {error}", manifest_path.display()))?;
    let name = find_package_value(&content, "name")
        .ok_or_else(|| format!("Could not find package name in {}", manifest_path.display()))?;
    let version = find_package_value(&content, "version").ok_or_else(|| {
        format!(
            "Could not find package version in {}",
            manifest_path.display()
        )
    })?;
    Ok(PackageInfo { name, version })
}

pub fn needs_cd(rust_root: &str) -> bool {
    rust_root != "."
}

fn find_package_value(content: &str, key: &str) -> Option<String> {
    let mut in_package = false;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('[') && trimmed.ends_with(']') {
            in_package = trimmed == "[package]";
            continue;
        }

        if !in_package {
            continue;
        }

        let Some((line_key, value)) = trimmed.split_once('=') else {
            continue;
        };
        if line_key.trim() != key {
            continue;
        }

        return Some(value.trim().trim_matches('"').to_string());
    }

    None
}

#[cfg(not(test))]
fn main() {
    match get_rust_root(None, true) {
        Ok(root) => {
            println!("Rust root: {root}");
            println!("Cargo.toml: {}", get_cargo_toml_path(&root).display());
        }
        Err(error) => {
            eprintln!("Error: {error}");
            std::process::exit(1);
        }
    }
}
