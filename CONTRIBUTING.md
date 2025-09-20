# Contributing to log-lazy

Thank you for your interest in contributing to log-lazy! We welcome contributions from the community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/log-lazy.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Install dependencies: `bun install`

## Development Setup

### Prerequisites
- Bun >= 1.0.0 (primary runtime)
- Node.js >= 20.0.0 (for compatibility testing)
- Deno >= 2.0.0 (optional, for compatibility testing)

### Running Tests

```bash
# Run all tests with Bun
bun test

# Run tests with coverage
bun test --coverage

# Run tests in all runtimes
./test-all.sh

# Run specific test file
bun test tests/index.test.js
```

### Code Quality

```bash
# Run linter
bun run lint

# Fix linting issues
bun run lint:fix

# Run benchmarks
bun run bench
```

## Guidelines

### Code Style
- Follow the existing code style
- No unnecessary comments
- Keep functions focused and small
- Maintain 100% test coverage

### Commit Messages
- Use clear, descriptive commit messages
- Follow conventional commits format when possible:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `test:` for test additions/changes
  - `perf:` for performance improvements

### Pull Requests
1. Ensure all tests pass on all platforms
2. Update documentation if needed
3. Add tests for new features
4. Keep changes focused - one feature/fix per PR
5. Update CHANGELOG.md with your changes

### Testing Requirements
- All tests must pass in Bun, Node.js, and Deno
- Maintain 100% code coverage
- Test on multiple platforms if possible (Linux, macOS, Windows)

## Reporting Issues

- Use GitHub Issues to report bugs
- Include minimal reproduction steps
- Specify runtime and platform
- Include relevant error messages

## Performance Considerations

This is a performance-focused library. Please ensure:
- No performance regressions
- Run benchmarks before and after changes
- Lazy evaluation is maintained
- Zero-cost abstractions when possible

## Questions?

Feel free to open an issue for any questions about contributing.