# Issue 8 Case Study: Rust Version of log-lazy

Issue: <https://github.com/link-foundation/log-lazy/issues/8>

Pull request: <https://github.com/link-foundation/log-lazy/pull/9>

Date: 2026-04-16

## Source Data

This case study keeps the raw investigation data in `data/`:

- `issue-8.json`: issue title, body, labels, state, timestamps, and comments.
- `pr-9.json`, `pr-9-conversation-comments.json`,
  `pr-9-review-comments.json`, `pr-9-reviews.json`: pull request context.
- `ci-logs/ci-cd-24507877387.txt`: downloaded CI log for the initial draft run.
- `js-template-file-tree.txt`: file tree from
  `link-foundation/js-ai-driven-development-pipeline-template`.
- `rust-template-file-tree.txt`: file tree from
  `link-foundation/rust-ai-driven-development-pipeline-template`.
- `reference-pr-2-diff.patch`: most recent related merged workflow PR in this
  repository.
- `cargo-info-*.txt`: crates.io metadata captured with `cargo info`.
- `current-file-tree.txt`: repository file tree after the implementation.

## Requirements Extracted From the Issue

1. Implement a Rust version of `log-lazy`.
2. Preserve the core idea from JavaScript: expensive logging functions are
   either executed as a whole or not executed at all.
3. Reuse CI/CD best practices from the JavaScript and Rust pipeline templates.
4. Compare the full file tree and workflow/script layout from both templates.
5. Make the result a multi-language repository with `js/` and `rust/`
   directories at the repository root.
6. Compile issue-related data under `docs/case-studies/issue-8`.
7. Perform deeper case-study analysis, including online research and known
   related components or libraries.
8. Prepare the pull request for release by handling version-triggering metadata
   where applicable.

## Existing JavaScript Contract

The JavaScript package exposes:

- Bitwise level constants: `none`, `fatal`, `error`, `warn`, `info`, `debug`,
  `verbose`, `trace`, `silly`, `all`, `production`, and `development`.
- A default `info` level.
- String and numeric level parsing.
- Runtime `shouldLog`, `enableLevel`, `disableLevel`, and `getEnabledLevels`.
- Lazy evaluation by accepting function arguments and executing them only when
  the selected level is enabled.
- Custom output functions for logger integration.

The Rust crate mirrors that contract in Rust idioms:

- `levels::*` constants use the same numeric bit flags.
- `LogLazy::with_level` accepts strings, numbers, and `Level` constants.
- `LogLazy::should_log`, `enable_level`, `disable_level`, and
  `get_enabled_levels` match the JavaScript behavior.
- Log methods accept closures, so message construction is skipped when disabled.
- `with_sink` supports integration with other Rust logging stacks.
- `debug_lazy!`, `info_lazy!`, `error_lazy!`, and `log_lazy!` provide lazy
  formatting macros.

## Online Research

No existing `log-lazy` Rust crate was found with `cargo search log-lazy` on
2026-04-16.

Relevant Rust logging ecosystem components:

- `log` 0.4.29: lightweight logging facade for Rust.
  Source metadata: <https://crates.io/crates/log/0.4.29>
- `tracing` 0.1.44: application-level tracing for structured diagnostics.
  Source metadata: <https://crates.io/crates/tracing/0.1.44>
- `tracing-subscriber` 0.3.23: subscriber utilities for `tracing`.
  Source metadata: <https://crates.io/crates/tracing-subscriber/0.3.23>
- `env_logger` 0.11.10: environment-configured implementation for the `log`
  facade. Source metadata: <https://crates.io/crates/env_logger/0.11.10>
- `log4rs` 1.4.0: configurable multi-output implementation for the `log`
  facade. Source metadata: <https://crates.io/crates/log4rs/1.4.0>
- `slog` 2.8.2: structured, extensible, composable logging.
  Source metadata: <https://crates.io/crates/slog/2.8.2>

These crates solve logging facade, structured tracing, filtering, and output
configuration problems. The missing piece specific to this issue is the small
cross-language API pattern from `log-lazy`: bitmask-controlled lazy closure
evaluation that is intentionally easy to keep in production code.

## Template Comparison

JavaScript template practices observed:

- CI is consolidated into a checks/release workflow.
- Change detection runs before slower jobs.
- File line limits are enforced.
- PR checks avoid stale merge assumptions by using full fetch history.
- Version and changeset checks protect release automation.
- Separate link checking exists for documentation.

Rust template practices observed:

- CI uses a single release pipeline for checks and release automation.
- `RUSTFLAGS=-Dwarnings` makes warnings fail CI.
- Rust formatting, Clippy, tests, doc tests, package checks, and coverage are
  separate jobs.
- Cargo registry and target cache are used.
- Changelog/version scripts prevent accidental manual release drift.
- File size checks enforce maintainability.

Adopted in this repository:

- Root-level multi-language change detection.
- Fast file line limit check before test matrices.
- JavaScript tests across Bun, Node.js, and Deno from `js/`.
- Rust tests across Ubuntu, macOS, and Windows from `rust/`.
- Rust formatting, Clippy with `-D warnings`, unit tests, and doc tests.
- NPM version check updated to read `js/package.json`.
- Manual release workflow updated to publish from `js/`.
- Initial CI failure was resolved by bumping the npm package from `1.0.4` to
  `1.1.0`; the downloaded log showed `1.0.4` was already published.

## Solution Plan Chosen

The implementation uses a conservative crate design:

- No runtime dependencies.
- `LevelMask` is a `u16`, enough for the JavaScript-compatible 8-bit mask.
- `Level` represents the standard output levels.
- `LogLazy` owns the current mask, presets, and a sink function.
- Closures are evaluated only after `should_log` passes.
- Custom sinks receive the resolved level and message string.

This keeps the crate focused on the issue's core behavior while leaving
integration with `log`, `tracing`, `env_logger`, `log4rs`, or `slog` possible
through `with_sink`.

## Verification

The PR should be considered complete only when these checks pass:

```bash
cd js
bun test
bun run lint
bun run test:types
./test-all.sh

cd ../rust
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --all-features
cargo test --doc
```
