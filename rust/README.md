# log-lazy for Rust

A lazy logging crate with the same bitwise level model as the JavaScript
`log-lazy` package.

## Core Idea

The entire closure passed to a log method is either executed or skipped. This
lets production code keep detailed diagnostics without paying for formatting,
serialization, or data collection when the level is disabled.

```rust
use log_lazy::{debug_lazy, levels, LogLazy};

let log = LogLazy::with_level(levels::PRODUCTION);

log.error(|| "this error message is emitted");

debug_lazy!(log, "debug payload: {}", expensive_payload());
```

`expensive_payload()` is not called while `debug` is disabled.

## Levels

The crate uses the same bit flags as the JavaScript package:

| Name | Value |
| --- | ---: |
| `none` | 0 |
| `fatal` | 1 |
| `error` | 2 |
| `warn` | 4 |
| `info` | 8 |
| `debug` | 16 |
| `verbose` | 32 |
| `trace` | 64 |
| `silly` | 128 |
| `all` | 255 |
| `production` | 7 |
| `development` | 31 |

Combine levels with bitwise OR:

```rust
use log_lazy::{levels, LogLazy};

let mut log = LogLazy::with_level(levels::ERROR | levels::WARN);
log.enable_level("info");
log.disable_level("warn");

assert_eq!(log.get_enabled_levels(), vec!["error", "info"]);
```

## Custom Sinks

By default, fatal/error/warn messages go to stderr and the other levels go to
stdout. Use `with_sink` to route messages into another logger:

```rust
use log_lazy::{levels, LogLazy};

let log = LogLazy::with_sink(levels::ALL, |level, message| {
    eprintln!("[{}] {}", level.name(), message);
});

log.info(|| "service started");
```
