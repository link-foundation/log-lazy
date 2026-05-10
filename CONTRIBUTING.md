# Contributing to log-lazy

Thank you for your interest in contributing to `log-lazy`.

## Repository Layout

- `js/`: JavaScript package published to npm as `log-lazy`.
- `rust/`: Rust crate with the same lazy logging level model.
- `docs/`: case studies, research notes, and implementation records.

## Prerequisites

- Bun >= 1.0.0
- Node.js >= 20.0.0
- Deno >= 2.0.0 for compatibility checks
- Rust stable with Cargo

## JavaScript Development

```bash
cd js
bun install
bun test
bun run lint
bun run test:types
./test-all.sh
```

## Rust Development

```bash
cd rust
cargo test
cargo test --doc
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
```

## Guidelines

- Follow the existing code style in the language-specific package you touch.
- Keep functions focused and small.
- Add tests for new behavior.
- Update documentation when user-facing behavior changes.
- Keep performance-sensitive logging paths lazy; expensive data preparation must
  stay inside a closure or lazy formatting macro.

## Pull Requests

1. Run the relevant JavaScript and Rust checks locally.
2. Update changelog or release metadata when the CI/CD workflow requires it.
3. Keep changes focused on the issue being solved.
4. Include reproduction notes and verification commands in the PR description.
