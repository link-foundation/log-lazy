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

use chrono::{Local, SecondsFormat, Utc};
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

/// Owned level input accepted by [`LogLazyOptions`].
#[derive(Debug, Clone, Eq, PartialEq)]
pub enum OwnedLevelSpec {
    Mask(LevelMask),
    Name(String),
}

impl From<Level> for OwnedLevelSpec {
    fn from(level: Level) -> Self {
        Self::Mask(level.mask())
    }
}

impl From<LevelMask> for OwnedLevelSpec {
    fn from(mask: LevelMask) -> Self {
        Self::Mask(mask)
    }
}

impl From<u8> for OwnedLevelSpec {
    fn from(mask: u8) -> Self {
        Self::Mask(LevelMask::from(mask))
    }
}

impl From<u32> for OwnedLevelSpec {
    fn from(mask: u32) -> Self {
        Self::Mask(LevelMask::try_from(mask).unwrap_or(levels::NONE))
    }
}

impl From<usize> for OwnedLevelSpec {
    fn from(mask: usize) -> Self {
        Self::Mask(LevelMask::try_from(mask).unwrap_or(levels::NONE))
    }
}

impl From<i32> for OwnedLevelSpec {
    fn from(mask: i32) -> Self {
        Self::Mask(LevelMask::try_from(mask).unwrap_or(levels::NONE))
    }
}

impl From<&str> for OwnedLevelSpec {
    fn from(name: &str) -> Self {
        Self::Name(name.to_string())
    }
}

impl From<String> for OwnedLevelSpec {
    fn from(name: String) -> Self {
        Self::Name(name)
    }
}

/// Function used to emit an already evaluated log message.
pub type LogSink = Arc<dyn Fn(Level, String) + Send + Sync + 'static>;

/// One log argument that can be evaluated lazily.
pub struct LogArg {
    value: LogArgValue,
}

enum LogArgValue {
    Text(String),
    Lazy(Box<dyn FnOnce() -> String + Send + 'static>),
}

impl LogArg {
    /// Creates an already evaluated argument.
    pub fn text(value: impl Into<String>) -> Self {
        Self {
            value: LogArgValue::Text(value.into()),
        }
    }

    /// Creates an argument that is evaluated only after the level is enabled
    /// and preprocessors have run.
    pub fn lazy<F, M>(value: F) -> Self
    where
        F: FnOnce() -> M + Send + 'static,
        M: Display,
    {
        Self {
            value: LogArgValue::Lazy(Box::new(move || value().to_string())),
        }
    }

    /// Returns the text for eager arguments.
    pub fn as_text(&self) -> Option<&str> {
        match &self.value {
            LogArgValue::Text(value) => Some(value.as_str()),
            LogArgValue::Lazy(_) => None,
        }
    }

    /// Returns true when this argument still holds a lazy closure.
    pub fn is_lazy(&self) -> bool {
        matches!(self.value, LogArgValue::Lazy(_))
    }

    fn evaluate(self) -> String {
        match self.value {
            LogArgValue::Text(value) => value,
            LogArgValue::Lazy(value) => value(),
        }
    }
}

impl Debug for LogArg {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match &self.value {
            LogArgValue::Text(value) => formatter.debug_tuple("LogArg::Text").field(value).finish(),
            LogArgValue::Lazy(_) => formatter.write_str("LogArg::Lazy(..)"),
        }
    }
}

impl From<&str> for LogArg {
    fn from(value: &str) -> Self {
        Self::text(value)
    }
}

impl From<String> for LogArg {
    fn from(value: String) -> Self {
        Self::text(value)
    }
}

/// Options passed to a preprocessor.
pub struct PreprocessorOptions {
    pub args: Vec<LogArg>,
    pub level: Level,
}

/// Options passed to a postprocessor.
pub struct PostprocessorOptions {
    pub message: String,
    pub level: Level,
}

/// Function used to transform log arguments before message compilation.
pub type Preprocessor = Arc<dyn Fn(PreprocessorOptions) -> Vec<LogArg> + Send + Sync + 'static>;

/// Function used to transform a compiled message before output.
pub type Postprocessor = Arc<dyn Fn(PostprocessorOptions) -> String + Send + Sync + 'static>;

/// Options for constructing a logger with the extensible API.
#[derive(Clone)]
pub struct LogLazyOptions {
    level: OwnedLevelSpec,
    presets: BTreeMap<String, LevelMask>,
    sink: Option<LogSink>,
    preprocessors: Vec<Preprocessor>,
    postprocessors: Vec<Postprocessor>,
}

impl Debug for LogLazyOptions {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("LogLazyOptions")
            .field("level", &self.level)
            .field("presets", &self.presets)
            .field("has_sink", &self.sink.is_some())
            .field("preprocessors", &self.preprocessors.len())
            .field("postprocessors", &self.postprocessors.len())
            .finish()
    }
}

impl Default for LogLazyOptions {
    fn default() -> Self {
        Self {
            level: OwnedLevelSpec::Mask(levels::INFO),
            presets: BTreeMap::new(),
            sink: None,
            preprocessors: Vec::new(),
            postprocessors: Vec::new(),
        }
    }
}

impl LogLazyOptions {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn level<L>(mut self, level: L) -> Self
    where
        L: Into<OwnedLevelSpec>,
    {
        self.level = level.into();
        self
    }

    pub fn preset(mut self, name: impl Into<String>, mask: LevelMask) -> Self {
        self.presets.insert(name.into(), mask);
        self
    }

    pub fn sink<F>(mut self, sink: F) -> Self
    where
        F: Fn(Level, String) + Send + Sync + 'static,
    {
        self.sink = Some(Arc::new(sink));
        self
    }

    pub fn preprocessor(mut self, preprocessor: Preprocessor) -> Self {
        self.preprocessors.push(preprocessor);
        self
    }

    pub fn preprocessor_fn<F>(mut self, preprocessor: F) -> Self
    where
        F: Fn(PreprocessorOptions) -> Vec<LogArg> + Send + Sync + 'static,
    {
        self.preprocessors.push(Arc::new(preprocessor));
        self
    }

    pub fn postprocessor(mut self, postprocessor: Postprocessor) -> Self {
        self.postprocessors.push(postprocessor);
        self
    }

    pub fn postprocessor_fn<F>(mut self, postprocessor: F) -> Self
    where
        F: Fn(PostprocessorOptions) -> String + Send + Sync + 'static,
    {
        self.postprocessors.push(Arc::new(postprocessor));
        self
    }
}

/// Built-in preprocessor helpers.
pub mod preprocessors {
    use super::{LogArg, Preprocessor, PreprocessorOptions};
    use std::sync::Arc;

    #[derive(Debug, Clone, Copy, Eq, PartialEq)]
    pub enum ContextPosition {
        Start,
        End,
    }

    #[derive(Debug, Clone, Eq, PartialEq)]
    pub struct AddContextOptions {
        pub context: String,
        pub position: ContextPosition,
    }

    impl AddContextOptions {
        pub fn new(context: impl Into<String>) -> Self {
            Self {
                context: context.into(),
                position: ContextPosition::End,
            }
        }

        pub fn position(mut self, position: ContextPosition) -> Self {
            self.position = position;
            self
        }
    }

    pub fn add_context(options: AddContextOptions) -> Preprocessor {
        Arc::new(move |mut preprocessor_options: PreprocessorOptions| {
            let context = LogArg::text(options.context.clone());
            match options.position {
                ContextPosition::Start => {
                    preprocessor_options.args.insert(0, context);
                    preprocessor_options.args
                }
                ContextPosition::End => {
                    preprocessor_options.args.push(context);
                    preprocessor_options.args
                }
            }
        })
    }

    pub struct FilterPredicateOptions<'a> {
        pub arg: &'a LogArg,
        pub index: usize,
        pub level: super::Level,
    }

    pub struct FilterOptions<F> {
        pub predicate: F,
    }

    pub fn filter<F>(options: FilterOptions<F>) -> Preprocessor
    where
        F: for<'a> Fn(FilterPredicateOptions<'a>) -> bool + Send + Sync + 'static,
    {
        let predicate = options.predicate;
        Arc::new(move |preprocessor_options: PreprocessorOptions| {
            let level = preprocessor_options.level;
            preprocessor_options
                .args
                .into_iter()
                .enumerate()
                .filter_map(|(index, arg)| {
                    if predicate(FilterPredicateOptions {
                        arg: &arg,
                        index,
                        level,
                    }) {
                        Some(arg)
                    } else {
                        None
                    }
                })
                .collect()
        })
    }

    pub struct MapTransformOptions {
        pub arg: LogArg,
        pub index: usize,
        pub level: super::Level,
    }

    pub struct MapOptions<F> {
        pub transform: F,
    }

    pub fn map<F>(options: MapOptions<F>) -> Preprocessor
    where
        F: Fn(MapTransformOptions) -> LogArg + Send + Sync + 'static,
    {
        let transform = options.transform;
        Arc::new(move |preprocessor_options: PreprocessorOptions| {
            let level = preprocessor_options.level;
            preprocessor_options
                .args
                .into_iter()
                .enumerate()
                .map(|(index, arg)| transform(MapTransformOptions { arg, index, level }))
                .collect()
        })
    }
}

/// Built-in postprocessor helpers.
pub mod postprocessors {
    use super::{format_timestamp, Postprocessor, PostprocessorOptions};
    use std::sync::Arc;

    #[derive(Debug, Clone, Copy, Eq, PartialEq)]
    pub enum TimestampFormat {
        Iso,
        Locale,
        Time,
        Millis,
    }

    #[derive(Debug, Clone, Copy, Eq, PartialEq)]
    pub struct TimestampOptions {
        pub format: TimestampFormat,
    }

    impl Default for TimestampOptions {
        fn default() -> Self {
            Self {
                format: TimestampFormat::Iso,
            }
        }
    }

    impl TimestampOptions {
        pub fn new() -> Self {
            Self::default()
        }

        pub fn format(mut self, format: TimestampFormat) -> Self {
            self.format = format;
            self
        }
    }

    pub fn timestamp(options: TimestampOptions) -> Postprocessor {
        Arc::new(move |postprocessor_options: PostprocessorOptions| {
            format!(
                "[{}] {}",
                format_timestamp(options.format),
                postprocessor_options.message
            )
        })
    }

    #[derive(Debug, Clone, Copy, Eq, PartialEq)]
    pub struct LevelOptions {
        pub uppercase: bool,
    }

    impl Default for LevelOptions {
        fn default() -> Self {
            Self { uppercase: true }
        }
    }

    impl LevelOptions {
        pub fn new() -> Self {
            Self::default()
        }

        pub fn uppercase(mut self, uppercase: bool) -> Self {
            self.uppercase = uppercase;
            self
        }
    }

    pub fn level(options: LevelOptions) -> Postprocessor {
        Arc::new(move |postprocessor_options: PostprocessorOptions| {
            let level_name = if options.uppercase {
                postprocessor_options.level.name().to_uppercase()
            } else {
                postprocessor_options.level.name().to_string()
            };
            format!("[{}] {}", level_name, postprocessor_options.message)
        })
    }

    #[derive(Debug, Clone, Eq, PartialEq)]
    pub struct PidOptions {
        pub label: String,
    }

    impl Default for PidOptions {
        fn default() -> Self {
            Self {
                label: "PID".to_string(),
            }
        }
    }

    impl PidOptions {
        pub fn new() -> Self {
            Self::default()
        }

        pub fn label(mut self, label: impl Into<String>) -> Self {
            self.label = label.into();
            self
        }
    }

    pub fn pid(options: PidOptions) -> Postprocessor {
        Arc::new(move |postprocessor_options: PostprocessorOptions| {
            format!(
                "[{}:{}] {}",
                options.label,
                std::process::id(),
                postprocessor_options.message
            )
        })
    }

    #[derive(Debug, Clone, Eq, PartialEq)]
    pub struct TextOptions {
        pub text: String,
    }

    impl TextOptions {
        pub fn new(text: impl Into<String>) -> Self {
            Self { text: text.into() }
        }
    }

    pub fn prefix(options: TextOptions) -> Postprocessor {
        Arc::new(move |postprocessor_options: PostprocessorOptions| {
            format!("{} {}", options.text, postprocessor_options.message)
        })
    }

    pub fn suffix(options: TextOptions) -> Postprocessor {
        Arc::new(move |postprocessor_options: PostprocessorOptions| {
            format!("{} {}", postprocessor_options.message, options.text)
        })
    }
}

/// Logger instance with a mutable bitmask and lazy message evaluation.
#[derive(Clone)]
pub struct LogLazy {
    current_level: LevelMask,
    presets: BTreeMap<String, LevelMask>,
    sink: LogSink,
    preprocessors: Vec<Preprocessor>,
    postprocessors: Vec<Postprocessor>,
}

impl Debug for LogLazy {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("LogLazy")
            .field("current_level", &self.current_level)
            .field("presets", &self.presets)
            .field("preprocessors", &self.preprocessors.len())
            .field("postprocessors", &self.postprocessors.len())
            .finish_non_exhaustive()
    }
}

impl Default for LogLazy {
    fn default() -> Self {
        Self {
            current_level: levels::INFO,
            presets: default_presets(),
            sink: Arc::new(default_sink),
            preprocessors: Vec::new(),
            postprocessors: Vec::new(),
        }
    }
}

impl LogLazy {
    /// Creates a logger with the default `info` level.
    pub fn new() -> Self {
        Self::default()
    }

    /// Creates a logger from the extensible options API.
    pub fn with_options(options: LogLazyOptions) -> Self {
        let mut presets = default_presets();
        for (name, mask) in options.presets {
            presets.insert(name, mask);
        }

        let current_level = level_from_owned_spec(options.level, &presets, levels::INFO);

        Self {
            current_level,
            presets,
            sink: options.sink.unwrap_or_else(|| Arc::new(default_sink)),
            preprocessors: options.preprocessors,
            postprocessors: options.postprocessors,
        }
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
            if self.preprocessors.is_empty() && self.postprocessors.is_empty() {
                (self.sink)(level, message().to_string());
            } else {
                self.emit_prepared_args(level, vec![LogArg::text(message().to_string())]);
            }
        }
    }

    /// Logs explicit lazy arguments at an explicit level.
    pub fn emit_args<'a, L, I>(&self, level: L, args: I)
    where
        L: Into<LevelSpec<'a>>,
        I: IntoIterator<Item = LogArg>,
    {
        let level_mask = self.level_or_default(level, levels::NONE);
        if !self.should_log(level_mask) {
            return;
        }

        if let Some(level) = Level::from_mask(level_mask) {
            self.emit_prepared_args(level, args.into_iter().collect());
        }
    }

    fn emit_prepared_args(&self, level: Level, args: Vec<LogArg>) {
        let mut processable_args = args;
        for preprocessor in &self.preprocessors {
            processable_args = preprocessor(PreprocessorOptions {
                args: processable_args,
                level,
            });
        }

        let mut message = processable_args
            .into_iter()
            .map(LogArg::evaluate)
            .collect::<Vec<_>>()
            .join(" ");

        for postprocessor in &self.postprocessors {
            message = postprocessor(PostprocessorOptions { message, level });
        }

        (self.sink)(level, message);
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

fn level_from_owned_spec(
    level: OwnedLevelSpec,
    presets: &BTreeMap<String, LevelMask>,
    default: LevelMask,
) -> LevelMask {
    match level {
        OwnedLevelSpec::Mask(mask) => mask,
        OwnedLevelSpec::Name(name) => presets
            .get(name.as_str())
            .copied()
            .or_else(|| builtin_level_mask(name.as_str()))
            .or_else(|| name.parse::<LevelMask>().ok())
            .unwrap_or(default),
    }
}

fn format_timestamp(format: postprocessors::TimestampFormat) -> String {
    match format {
        postprocessors::TimestampFormat::Iso => {
            Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
        }
        postprocessors::TimestampFormat::Locale => Local::now().format("%c").to_string(),
        postprocessors::TimestampFormat::Time => Local::now().format("%T").to_string(),
        postprocessors::TimestampFormat::Millis => Utc::now().timestamp_millis().to_string(),
    }
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
