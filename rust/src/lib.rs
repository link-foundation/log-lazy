//! Lazy logging with bitwise level control.
//!
//! Expensive log messages are supplied as closures and are only evaluated when
//! the requested level is enabled.
//!
//! ```
//! use log_lazy::{levels, LogLazy};
//!
//! let log = LogLazy::with_level(levels::ERROR);
//! let mut evaluated = false;
//!
//! log.debug(|| {
//!     evaluated = true;
//!     "debug details"
//! });
//!
//! assert!(!evaluated);
//! ```

use std::collections::BTreeMap;
use std::fmt::{self, Debug, Display};
use std::sync::Arc;

/// Bitmask used to represent enabled log levels.
pub type LevelMask = u16;

/// Standard bitwise log level constants.
pub mod levels {
    use super::LevelMask;

    pub const NONE: LevelMask = 0;
    pub const FATAL: LevelMask = 1;
    pub const ERROR: LevelMask = 2;
    pub const WARN: LevelMask = 4;
    pub const INFO: LevelMask = 8;
    pub const DEBUG: LevelMask = 16;
    pub const VERBOSE: LevelMask = 32;
    pub const TRACE: LevelMask = 64;
    pub const SILLY: LevelMask = 128;
    pub const ALL: LevelMask = 255;
    pub const PRODUCTION: LevelMask = FATAL | ERROR | WARN;
    pub const DEVELOPMENT: LevelMask = FATAL | ERROR | WARN | INFO | DEBUG;
}

/// One standard output log level.
#[derive(Clone, Copy, Eq, Hash, PartialEq)]
pub struct Level {
    mask: LevelMask,
    name: &'static str,
}

impl Level {
    pub const FATAL: Self = Self::new(levels::FATAL, "fatal");
    pub const ERROR: Self = Self::new(levels::ERROR, "error");
    pub const WARN: Self = Self::new(levels::WARN, "warn");
    pub const INFO: Self = Self::new(levels::INFO, "info");
    pub const DEBUG: Self = Self::new(levels::DEBUG, "debug");
    pub const VERBOSE: Self = Self::new(levels::VERBOSE, "verbose");
    pub const TRACE: Self = Self::new(levels::TRACE, "trace");
    pub const SILLY: Self = Self::new(levels::SILLY, "silly");

    pub const fn new(mask: LevelMask, name: &'static str) -> Self {
        Self { mask, name }
    }

    pub const fn mask(self) -> LevelMask {
        self.mask
    }

    pub const fn name(self) -> &'static str {
        self.name
    }

    pub const fn from_mask(mask: LevelMask) -> Option<Self> {
        match mask {
            levels::FATAL => Some(Self::FATAL),
            levels::ERROR => Some(Self::ERROR),
            levels::WARN => Some(Self::WARN),
            levels::INFO => Some(Self::INFO),
            levels::DEBUG => Some(Self::DEBUG),
            levels::VERBOSE => Some(Self::VERBOSE),
            levels::TRACE => Some(Self::TRACE),
            levels::SILLY => Some(Self::SILLY),
            _ => None,
        }
    }
}

impl Debug for Level {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("Level")
            .field("name", &self.name)
            .field("mask", &self.mask)
            .finish()
    }
}

/// Standard levels in the order returned by [`LogLazy::get_enabled_levels`].
pub const STANDARD_LEVELS: [Level; 8] = [
    Level::FATAL,
    Level::ERROR,
    Level::WARN,
    Level::INFO,
    Level::DEBUG,
    Level::VERBOSE,
    Level::TRACE,
    Level::SILLY,
];

/// Level input accepted by the logger.
#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub enum LevelSpec<'a> {
    Mask(LevelMask),
    Name(&'a str),
}

impl<'a> From<Level> for LevelSpec<'a> {
    fn from(level: Level) -> Self {
        Self::Mask(level.mask())
    }
}

impl<'a> From<LevelMask> for LevelSpec<'a> {
    fn from(mask: LevelMask) -> Self {
        Self::Mask(mask)
    }
}

impl<'a> From<u8> for LevelSpec<'a> {
    fn from(mask: u8) -> Self {
        Self::Mask(LevelMask::from(mask))
    }
}

impl<'a> From<u32> for LevelSpec<'a> {
    fn from(mask: u32) -> Self {
        Self::Mask(LevelMask::try_from(mask).unwrap_or(levels::NONE))
    }
}

impl<'a> From<usize> for LevelSpec<'a> {
    fn from(mask: usize) -> Self {
        Self::Mask(LevelMask::try_from(mask).unwrap_or(levels::NONE))
    }
}

impl<'a> From<i32> for LevelSpec<'a> {
    fn from(mask: i32) -> Self {
        Self::Mask(LevelMask::try_from(mask).unwrap_or(levels::NONE))
    }
}

impl<'a> From<&'a str> for LevelSpec<'a> {
    fn from(name: &'a str) -> Self {
        Self::Name(name)
    }
}

impl<'a> From<&'a String> for LevelSpec<'a> {
    fn from(name: &'a String) -> Self {
        Self::Name(name.as_str())
    }
}

/// Function used to emit an already evaluated log message.
pub type LogSink = Arc<dyn Fn(Level, String) + Send + Sync + 'static>;

/// Logger instance with a mutable bitmask and lazy message evaluation.
#[derive(Clone)]
pub struct LogLazy {
    current_level: LevelMask,
    presets: BTreeMap<String, LevelMask>,
    sink: LogSink,
}

impl Debug for LogLazy {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("LogLazy")
            .field("current_level", &self.current_level)
            .field("presets", &self.presets)
            .finish_non_exhaustive()
    }
}

impl Default for LogLazy {
    fn default() -> Self {
        Self {
            current_level: levels::INFO,
            presets: default_presets(),
            sink: Arc::new(default_sink),
        }
    }
}

impl LogLazy {
    /// Creates a logger with the default `info` level.
    pub fn new() -> Self {
        Self::default()
    }

    /// Creates a logger with a custom level.
    pub fn with_level<'a, L>(level: L) -> Self
    where
        L: Into<LevelSpec<'a>>,
    {
        let mut logger = Self::default();
        logger.set_level(level);
        logger
    }

    /// Creates a logger with a custom level and custom presets.
    pub fn with_level_and_presets<'a, L, I, S>(level: L, presets: I) -> Self
    where
        L: Into<LevelSpec<'a>>,
        I: IntoIterator<Item = (S, LevelMask)>,
        S: Into<String>,
    {
        let mut logger = Self::default();
        for (name, mask) in presets {
            logger.add_preset(name, mask);
        }
        logger.set_level(level);
        logger
    }

    /// Creates a logger with a custom sink.
    pub fn with_sink<'a, L, F>(level: L, sink: F) -> Self
    where
        L: Into<LevelSpec<'a>>,
        F: Fn(Level, String) + Send + Sync + 'static,
    {
        let mut logger = Self::with_level(level);
        logger.sink = Arc::new(sink);
        logger
    }

    /// Adds or replaces a named preset.
    pub fn add_preset(&mut self, name: impl Into<String>, mask: LevelMask) {
        self.presets.insert(name.into(), mask);
    }

    /// Returns the active level bitmask.
    pub const fn level(&self) -> LevelMask {
        self.current_level
    }

    /// Sets the active level bitmask.
    pub fn set_level<'a, L>(&mut self, level: L)
    where
        L: Into<LevelSpec<'a>>,
    {
        self.current_level = self.level_or_default(level, levels::INFO);
    }

    /// Resolves a string or numeric level to a mask, falling back to `default`.
    pub fn level_or_default<'a, L>(&self, level: L, default: LevelMask) -> LevelMask
    where
        L: Into<LevelSpec<'a>>,
    {
        match level.into() {
            LevelSpec::Mask(mask) => mask,
            LevelSpec::Name(name) => self
                .presets
                .get(name)
                .copied()
                .or_else(|| builtin_level_mask(name))
                .or_else(|| name.parse::<LevelMask>().ok())
                .unwrap_or(default),
        }
    }

    /// Checks whether a level is currently enabled.
    pub fn should_log<'a, L>(&self, level: L) -> bool
    where
        L: Into<LevelSpec<'a>>,
    {
        if self.current_level == levels::NONE {
            return false;
        }

        let level_mask = self.level_or_default(level, levels::NONE);
        level_mask != levels::NONE && (self.current_level & level_mask) != 0
    }

    /// Enables one level bit or mask.
    pub fn enable_level<'a, L>(&mut self, level: L)
    where
        L: Into<LevelSpec<'a>>,
    {
        let level_mask = self.level_or_default(level, levels::NONE);
        self.current_level |= level_mask;
    }

    /// Disables one level bit or mask.
    pub fn disable_level<'a, L>(&mut self, level: L)
    where
        L: Into<LevelSpec<'a>>,
    {
        let level_mask = self.level_or_default(level, levels::NONE);
        self.current_level &= !level_mask;
    }

    /// Returns enabled standard level names in stable order.
    pub fn get_enabled_levels(&self) -> Vec<&'static str> {
        STANDARD_LEVELS
            .iter()
            .filter(|level| self.should_log(level.mask()))
            .map(|level| level.name())
            .collect()
    }

    /// Logs at the default `info` level.
    pub fn log<F, M>(&self, message: F)
    where
        F: FnOnce() -> M,
        M: Display,
    {
        self.emit(Level::INFO, message);
    }

    /// Logs at an explicit level.
    pub fn emit<'a, L, F, M>(&self, level: L, message: F)
    where
        L: Into<LevelSpec<'a>>,
        F: FnOnce() -> M,
        M: Display,
    {
        let level_mask = self.level_or_default(level, levels::NONE);
        if !self.should_log(level_mask) {
            return;
        }

        if let Some(level) = Level::from_mask(level_mask) {
            (self.sink)(level, message().to_string());
        }
    }

    pub fn fatal<F, M>(&self, message: F)
    where
        F: FnOnce() -> M,
        M: Display,
    {
        self.emit(Level::FATAL, message);
    }

    pub fn error<F, M>(&self, message: F)
    where
        F: FnOnce() -> M,
        M: Display,
    {
        self.emit(Level::ERROR, message);
    }

    pub fn warn<F, M>(&self, message: F)
    where
        F: FnOnce() -> M,
        M: Display,
    {
        self.emit(Level::WARN, message);
    }

    pub fn info<F, M>(&self, message: F)
    where
        F: FnOnce() -> M,
        M: Display,
    {
        self.emit(Level::INFO, message);
    }

    pub fn debug<F, M>(&self, message: F)
    where
        F: FnOnce() -> M,
        M: Display,
    {
        self.emit(Level::DEBUG, message);
    }

    pub fn verbose<F, M>(&self, message: F)
    where
        F: FnOnce() -> M,
        M: Display,
    {
        self.emit(Level::VERBOSE, message);
    }

    pub fn trace<F, M>(&self, message: F)
    where
        F: FnOnce() -> M,
        M: Display,
    {
        self.emit(Level::TRACE, message);
    }

    pub fn silly<F, M>(&self, message: F)
    where
        F: FnOnce() -> M,
        M: Display,
    {
        self.emit(Level::SILLY, message);
    }
}

/// Lazily formats and emits a message at an explicit level.
#[macro_export]
macro_rules! log_lazy {
    ($logger:expr, $level:expr, $($arg:tt)+) => {{
        $logger.emit($level, || format!($($arg)+));
    }};
}

/// Lazily formats and emits an `info` message.
#[macro_export]
macro_rules! info_lazy {
    ($logger:expr, $($arg:tt)+) => {{
        $logger.info(|| format!($($arg)+));
    }};
}

/// Lazily formats and emits a `debug` message.
#[macro_export]
macro_rules! debug_lazy {
    ($logger:expr, $($arg:tt)+) => {{
        $logger.debug(|| format!($($arg)+));
    }};
}

/// Lazily formats and emits an `error` message.
#[macro_export]
macro_rules! error_lazy {
    ($logger:expr, $($arg:tt)+) => {{
        $logger.error(|| format!($($arg)+));
    }};
}

fn default_presets() -> BTreeMap<String, LevelMask> {
    BTreeMap::from([
        ("production".to_string(), levels::PRODUCTION),
        ("development".to_string(), levels::DEVELOPMENT),
    ])
}

fn builtin_level_mask(name: &str) -> Option<LevelMask> {
    match name {
        "none" => Some(levels::NONE),
        "fatal" => Some(levels::FATAL),
        "error" => Some(levels::ERROR),
        "warn" => Some(levels::WARN),
        "info" => Some(levels::INFO),
        "debug" => Some(levels::DEBUG),
        "verbose" => Some(levels::VERBOSE),
        "trace" => Some(levels::TRACE),
        "silly" => Some(levels::SILLY),
        "all" => Some(levels::ALL),
        "production" => Some(levels::PRODUCTION),
        "development" => Some(levels::DEVELOPMENT),
        _ => None,
    }
}

fn default_sink(level: Level, message: String) {
    match level {
        Level::FATAL | Level::ERROR | Level::WARN => eprintln!("{message}"),
        _ => println!("{message}"),
    }
}
