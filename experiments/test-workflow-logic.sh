#!/bin/bash

echo "Testing workflow logic for different file change scenarios"
echo "=========================================================="

# Function to test change detection logic
test_changes() {
    local CHANGED_FILES="$1"
    local SCENARIO="$2"

    echo ""
    echo "Scenario: $SCENARIO"
    echo "Changed files: $CHANGED_FILES"
    echo "---"

    # Check for JavaScript file changes
    if echo "$CHANGED_FILES" | grep -qE '\.(js|mjs|cjs)$'; then
        JS_CHANGED=true
    else
        JS_CHANGED=false
    fi

    # Check for Markdown file changes
    if echo "$CHANGED_FILES" | grep -q '\.md$'; then
        MD_CHANGED=true
    else
        MD_CHANGED=false
    fi

    # Check if ONLY documentation changed
    if echo "$CHANGED_FILES" | grep -v '\.md$' | grep -q '.'; then
        DOCS_ONLY=false
    else
        # All changed files are .md files
        if [ -n "$CHANGED_FILES" ] && echo "$CHANGED_FILES" | grep -q '\.md$'; then
            DOCS_ONLY=true
        else
            DOCS_ONLY=false
        fi
    fi

    # Check for any code changes
    if echo "$CHANGED_FILES" | grep -qE '\.(js|mjs|cjs|ts|json|yml|yaml)$|\.github/workflows/'; then
        CODE_CHANGED=true
    else
        CODE_CHANGED=false
    fi

    echo "Results:"
    echo "  - js-changed: $JS_CHANGED"
    echo "  - md-changed: $MD_CHANGED"
    echo "  - docs-only: $DOCS_ONLY"
    echo "  - any-code-changed: $CODE_CHANGED"

    # Determine which jobs would run
    echo "Jobs that would run:"

    # check-file-line-limits
    if [ "$JS_CHANGED" = "true" ] || [ "$MD_CHANGED" = "true" ]; then
        echo "  ✓ check-file-line-limits"
    fi

    # version-check
    if [ "$DOCS_ONLY" = "false" ]; then
        echo "  ✓ version-check"
    fi

    # test, benchmark, lint-and-typecheck
    if [ "$DOCS_ONLY" = "false" ]; then
        echo "  ✓ test (all OS and runtimes)"
        echo "  ✓ benchmark"
        echo "  ✓ lint-and-typecheck"
    else
        echo "  ⏭️  test (SKIPPED - docs only)"
        echo "  ⏭️  benchmark (SKIPPED - docs only)"
        echo "  ⏭️  lint-and-typecheck (SKIPPED - docs only)"
    fi

    # validate-docs
    if [ "$MD_CHANGED" = "true" ]; then
        echo "  ✓ validate-docs"
    fi
}

# Test scenarios
test_changes "README.md" "Only README.md changed"
test_changes "README.md
CONTRIBUTING.md
CHANGELOG.md" "Only markdown files changed"
test_changes "src/index.js" "Only JavaScript file changed"
test_changes "README.md
src/index.js" "Both markdown and JavaScript changed"
test_changes "package.json" "Only package.json changed"
test_changes ".github/workflows/main.yml" "Only workflow file changed"

echo ""
echo "=========================================================="
echo "✅ Test completed successfully!"