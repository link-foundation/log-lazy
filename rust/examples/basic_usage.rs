use log_lazy::{debug_lazy, error_lazy, levels, LogLazy};

fn main() {
    let log = LogLazy::with_level(levels::PRODUCTION);

    log.error(|| "database connection failed");

    debug_lazy!(log, "expensive debug payload: {}", build_debug_payload());
    error_lazy!(log, "request failed for user {}", 42);
}

fn build_debug_payload() -> String {
    "this function is not called while debug is disabled".to_string()
}
