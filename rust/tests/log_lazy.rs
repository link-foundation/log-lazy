use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};

use log_lazy::{debug_lazy, levels, Level, LevelMask, LogLazy};

type Captured = Arc<Mutex<Vec<(LevelMask, String)>>>;

fn captured_logger(level: impl Into<log_lazy::LevelSpec<'static>>) -> (LogLazy, Captured) {
    let output = Arc::new(Mutex::new(Vec::new()));
    let output_for_sink = Arc::clone(&output);
    let logger = LogLazy::with_sink(level, move |level, message| {
        output_for_sink
            .lock()
            .expect("capture mutex poisoned")
            .push((level.mask(), message));
    });

    (logger, output)
}

#[test]
fn level_constants_match_javascript_package() {
    assert_eq!(levels::NONE, 0);
    assert_eq!(levels::FATAL, 1);
    assert_eq!(levels::ERROR, 2);
    assert_eq!(levels::WARN, 4);
    assert_eq!(levels::INFO, 8);
    assert_eq!(levels::DEBUG, 16);
    assert_eq!(levels::VERBOSE, 32);
    assert_eq!(levels::TRACE, 64);
    assert_eq!(levels::SILLY, 128);
    assert_eq!(levels::ALL, 255);
    assert_eq!(levels::PRODUCTION, 7);
    assert_eq!(levels::DEVELOPMENT, 31);
}

#[test]
fn defaults_to_info_and_resolves_string_levels() {
    let default_logger = LogLazy::new();
    assert_eq!(default_logger.level(), levels::INFO);
    assert!(default_logger.should_log("info"));
    assert!(!default_logger.should_log("debug"));

    let debug_logger = LogLazy::with_level("debug");
    assert_eq!(debug_logger.level(), levels::DEBUG);
    assert!(debug_logger.should_log(Level::DEBUG));
    assert!(!debug_logger.should_log(Level::INFO));

    let numeric_logger = LogLazy::with_level("16");
    assert_eq!(numeric_logger.level(), levels::DEBUG);
}

#[test]
fn lazy_message_is_not_evaluated_when_level_is_disabled() {
    let (logger, output) = captured_logger(levels::ERROR);
    let calls = AtomicUsize::new(0);

    logger.debug(|| {
        calls.fetch_add(1, Ordering::SeqCst);
        "debug details"
    });

    assert_eq!(calls.load(Ordering::SeqCst), 0);
    assert!(output.lock().expect("capture mutex poisoned").is_empty());
}

#[test]
fn lazy_message_is_evaluated_when_level_is_enabled() {
    let (logger, output) = captured_logger(levels::ERROR | levels::INFO);
    let calls = AtomicUsize::new(0);

    logger.info(|| {
        calls.fetch_add(1, Ordering::SeqCst);
        "server started"
    });

    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert_eq!(
        output.lock().expect("capture mutex poisoned").as_slice(),
        &[(levels::INFO, "server started".to_string())]
    );
}

#[test]
fn enable_disable_and_enabled_names_use_bitmasks() {
    let mut logger = LogLazy::with_level(levels::NONE);

    logger.enable_level("error");
    logger.enable_level("warn");
    logger.enable_level(levels::INFO);

    assert_eq!(logger.level(), levels::ERROR | levels::WARN | levels::INFO);
    assert_eq!(logger.get_enabled_levels(), vec!["error", "warn", "info"]);

    logger.disable_level("warn");

    assert_eq!(logger.level(), levels::ERROR | levels::INFO);
    assert!(logger.should_log("error"));
    assert!(!logger.should_log("warn"));
}

#[test]
fn custom_presets_match_javascript_options() {
    let logger =
        LogLazy::with_level_and_presets("custom", [("custom", levels::ERROR | levels::DEBUG)]);

    assert_eq!(logger.level(), levels::ERROR | levels::DEBUG);
    assert!(logger.should_log("error"));
    assert!(logger.should_log("debug"));
    assert!(!logger.should_log("info"));
}

#[test]
fn lazy_format_macro_does_not_evaluate_arguments_when_disabled() {
    let (logger, output) = captured_logger(levels::ERROR);
    let calls = AtomicUsize::new(0);

    debug_lazy!(logger, "debug value {}", {
        calls.fetch_add(1, Ordering::SeqCst);
        42
    });

    assert_eq!(calls.load(Ordering::SeqCst), 0);
    assert!(output.lock().expect("capture mutex poisoned").is_empty());
}

#[test]
fn lazy_format_macro_emits_when_enabled() {
    let (logger, output) = captured_logger(levels::DEBUG);

    debug_lazy!(logger, "debug value {}", 42);

    assert_eq!(
        output.lock().expect("capture mutex poisoned").as_slice(),
        &[(levels::DEBUG, "debug value 42".to_string())]
    );
}
