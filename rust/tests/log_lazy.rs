use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};

use log_lazy::{
    debug_lazy, levels, postprocessors, preprocessors, Level, LevelMask, LogArg, LogLazy,
    LogLazyOptions,
};

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

fn captured_logger_with_options(options: LogLazyOptions) -> (LogLazy, Captured) {
    let output = Arc::new(Mutex::new(Vec::new()));
    let output_for_sink = Arc::clone(&output);
    let logger = LogLazy::with_options(options.sink(move |level, message| {
        output_for_sink
            .lock()
            .expect("capture mutex poisoned")
            .push((level.mask(), message));
    }));

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

#[test]
fn custom_preprocessors_receive_options_and_run_before_lazy_args() {
    let calls = Arc::new(AtomicUsize::new(0));
    let calls_for_preprocessor = Arc::clone(&calls);
    let (logger, output) =
        captured_logger_with_options(LogLazyOptions::new().level(levels::INFO).preprocessor_fn(
            move |mut options| {
                calls_for_preprocessor.fetch_add(1, Ordering::SeqCst);
                assert_eq!(options.level, Level::INFO);
                assert!(options.args[0].is_lazy());
                options.args.insert(0, LogArg::from("prefix"));
                options.args
            },
        ));

    logger.emit_args(
        Level::INFO,
        [LogArg::lazy(|| "computed"), LogArg::from("suffix")],
    );

    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert_eq!(
        output.lock().expect("capture mutex poisoned").as_slice(),
        &[(levels::INFO, "prefix computed suffix".to_string())]
    );
}

#[test]
fn custom_postprocessors_receive_compiled_messages() {
    let (logger, output) =
        captured_logger_with_options(LogLazyOptions::new().level(levels::INFO).postprocessor_fn(
            |options| {
                assert_eq!(options.level, Level::INFO);
                format!("[{}] {}", options.level.name(), options.message)
            },
        ));

    logger.emit_args(Level::INFO, [LogArg::from("hello"), LogArg::from("world")]);

    assert_eq!(
        output.lock().expect("capture mutex poisoned").as_slice(),
        &[(levels::INFO, "[info] hello world".to_string())]
    );
}

#[test]
fn processors_do_not_run_when_level_is_disabled() {
    let preprocessor_calls = Arc::new(AtomicUsize::new(0));
    let postprocessor_calls = Arc::new(AtomicUsize::new(0));
    let lazy_calls = Arc::new(AtomicUsize::new(0));

    let preprocessor_calls_for_options = Arc::clone(&preprocessor_calls);
    let postprocessor_calls_for_options = Arc::clone(&postprocessor_calls);
    let lazy_calls_for_arg = Arc::clone(&lazy_calls);

    let (logger, output) = captured_logger_with_options(
        LogLazyOptions::new()
            .level(levels::ERROR)
            .preprocessor_fn(move |options| {
                preprocessor_calls_for_options.fetch_add(1, Ordering::SeqCst);
                options.args
            })
            .postprocessor_fn(move |options| {
                postprocessor_calls_for_options.fetch_add(1, Ordering::SeqCst);
                options.message
            }),
    );

    logger.emit_args(
        Level::DEBUG,
        [LogArg::lazy(move || {
            lazy_calls_for_arg.fetch_add(1, Ordering::SeqCst);
            "hidden"
        })],
    );

    assert_eq!(preprocessor_calls.load(Ordering::SeqCst), 0);
    assert_eq!(postprocessor_calls.load(Ordering::SeqCst), 0);
    assert_eq!(lazy_calls.load(Ordering::SeqCst), 0);
    assert!(output.lock().expect("capture mutex poisoned").is_empty());
}

#[test]
fn built_in_preprocessors_match_javascript_helpers() {
    let (logger, output) = captured_logger_with_options(
        LogLazyOptions::new()
            .level(levels::INFO)
            .preprocessor(preprocessors::add_context(
                preprocessors::AddContextOptions::new("context"),
            ))
            .preprocessor(preprocessors::filter(preprocessors::FilterOptions {
                predicate: |options: preprocessors::FilterPredicateOptions<'_>| {
                    options.arg.as_text() != Some("drop")
                },
            }))
            .preprocessor(preprocessors::map(preprocessors::MapOptions {
                transform: |options: preprocessors::MapTransformOptions| {
                    if options.arg.as_text() == Some("message") {
                        LogArg::from("MESSAGE")
                    } else {
                        options.arg
                    }
                },
            })),
    );

    logger.emit_args(Level::INFO, [LogArg::from("message"), LogArg::from("drop")]);

    assert_eq!(
        output.lock().expect("capture mutex poisoned").as_slice(),
        &[(levels::INFO, "MESSAGE context".to_string())]
    );
}

#[test]
fn built_in_postprocessors_match_javascript_helpers() {
    let (logger, output) = captured_logger_with_options(
        LogLazyOptions::new()
            .level(levels::INFO)
            .postprocessor(postprocessors::level(postprocessors::LevelOptions::new()))
            .postprocessor(postprocessors::prefix(postprocessors::TextOptions::new(
                "[app]",
            )))
            .postprocessor(postprocessors::suffix(postprocessors::TextOptions::new(
                "(done)",
            ))),
    );

    logger.info(|| "message");

    assert_eq!(
        output.lock().expect("capture mutex poisoned").as_slice(),
        &[(levels::INFO, "[app] [INFO] message (done)".to_string())]
    );
}

#[test]
fn timestamp_and_pid_postprocessors_are_available() {
    let (logger, output) = captured_logger_with_options(
        LogLazyOptions::new()
            .level(levels::INFO)
            .postprocessor(postprocessors::timestamp(
                postprocessors::TimestampOptions::new()
                    .format(postprocessors::TimestampFormat::Millis),
            ))
            .postprocessor(postprocessors::pid(postprocessors::PidOptions::new())),
    );

    logger.info(|| "message");

    let captured = output.lock().expect("capture mutex poisoned");
    assert_eq!(captured.len(), 1);
    assert_eq!(captured[0].0, levels::INFO);
    assert!(captured[0].1.contains("[PID:"));
    assert!(captured[0].1.ends_with("] message"));
}
