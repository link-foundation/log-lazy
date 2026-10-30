# Rust publishing migration

The `Rust` workflow publishes `rust/` as `log-lazy`. Authentication tries the
pinned `rust-lang/crates-io-auth-action` first. If that exchange fails, publishing
uses `CARGO_REGISTRY_TOKEN`, then `CARGO_TOKEN`. Keep those secrets as the fallback.
The workflow logs the selected authentication method without logging its token.

## Release gates

- Pull requests run the version check, lint, tests on Linux/macOS/Windows, and
  release build/package checks when Rust sources, Cargo files, or `rust.yml` change.
- Only a push to `main` with an unpublished version can publish. A manual dispatch
  validates the code but cannot publish. Pull requests cannot publish.
- Publishing depends on version checking, lint, tests, and build succeeding.
- GitHub releases are created only when the publish script reports `success`.
- Only the publish job receives `id-token: write`; registry secrets are passed
  only to the publishing step.
- The exact-version registry lookup accepts HTTP 200 (published) or 404 (missing).
  Transport failures and all other responses fail the check. The request includes
  a descriptive user agent as requested by crates.io's API policy.

Version `0.2.0` is already published. This PR prepares `0.2.1` in the crate manifest
and workspace lockfile so the migration can release after merge.

## Verification

Run `python3 experiments/test-rust-publishing.py` from the repository root. It
compiles the release scripts and supplies mock `curl` and `cargo` executables;
no package is uploaded. The version-check CI job runs this suite too.
Check the live PR checks for the final commit's GitHub Actions results; the PR
description records the verified run links.

The regression reproducer showed six failures before the fix: HTTP 403, 429,
500, 000, malformed output, and a failed curl process all incorrectly allowed
publication. After the fix, the suite also verifies the existing-version gate,
main-only push trigger, selected and legacy tokens, dry-run output, and failure
output used by the GitHub release condition.

The earlier successful CI run
[38428785801](https://github.com/link-foundation/log-lazy/actions/runs/38428785801)
at commit `0fd312e8604d8732fb45b827f12bca2c1dff7608` did not verify publishing:
its publish job was skipped. Downloaded log lines 1142–1147 show version `0.2.0`,
HTTP 403, and the incorrect `crates-io-version=not-found` result.

## Registration and first OIDC release: pending

Register the following trusted publisher for the existing `log-lazy` crate:

| Field | Value |
| --- | --- |
| GitHub owner | `link-foundation` |
| Repository | `log-lazy` |
| Caller workflow filename | `rust.yml` |
| Environment | None (the publish job has no environment) |

The original PR requests rerunning `setup --migrate`. That setup tool is not
included in this repository or available on the execution PATH. The current
execution environment has no crates.io credential or authenticated session to
register or inspect this configuration. GitHub reports an organization-level
`CARGO_TOKEN` secret available to this repository; its presence does not prove
that trusted publishing has been registered.

With the registry owner's authenticated setup tooling, rerun `setup --migrate`
for this repository to attach the publisher to `rust.yml`, or configure these
same fields in the crate's settings. Keep token publishing enabled to preserve
the requested fallback.

After the reviewed PR is merged, inspect the `main` release run: authentication
must succeed, the publish step must log `Publishing authentication: OIDC`, and
`0.2.1` must be published successfully. Verify the version's crates.io
`trustpub_data` identifies the expected repository and workflow. A token fallback
release, skipped publish, dry run, or successful PR checks do not satisfy this
criterion. Registry registration and an actual OIDC release remain unverified;
no legacy secrets have been removed.

## Completion checklist

- [x] Read the full PR description, conversation, inline comments, and reviews.
  GitHub reports no linked issue or required sub-issues for PR #11.
- [x] Review triggers, build, versioning, and job dependencies.
- [x] Reproduce and fix the registry-error version gate; prepare the next version.
- [x] Preserve OIDC-first authentication and both token fallback names.
- [x] Add automated regression checks and run local package/runtime checks.
- [ ] Register/confirm the crates.io trusted publisher using authenticated setup.
- [ ] Verify an actual OIDC release from `main` after merge.
