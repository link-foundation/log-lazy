# log-lazy

`log-lazy` is a multi-language lazy logging library. It keeps detailed logging
statements in production code while deferring expensive message construction
until the selected log level is enabled.

## Packages

- [JavaScript package](./js/README.md): published to npm as `log-lazy`.
- [Rust crate](./rust/README.md): a Rust implementation with the same bitmask
  level model and closure-based lazy evaluation.

## Repository Layout

```text
js/      JavaScript implementation, tests, examples, and npm metadata
rust/    Rust crate, tests, and examples
docs/    Case studies and implementation research
```

## Development

```bash
# JavaScript
cd js
bun install
bun test
bun run lint
bun run test:types

# Rust
cd rust
cargo test
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
```

The case study for the Rust implementation is in
[docs/case-studies/issue-8](./docs/case-studies/issue-8/README.md).
