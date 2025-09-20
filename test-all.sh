#!/bin/bash

echo "==========================="
echo "Running tests in all runtimes"
echo "==========================="
echo

# Bun tests
echo "--- BUN TESTS ---"
if command -v bun &> /dev/null; then
    bun test
    BUN_EXIT=$?
    echo
else
    echo "Bun not installed, skipping..."
    BUN_EXIT=0
fi

# Node tests
echo "--- NODE TESTS ---"
if command -v node &> /dev/null; then
    echo "Testing with Node $(node --version)"
    NODE_PASSED=0
    NODE_FAILED=0
    
    for file in tests/{bunyan,debug,log4js,pino,winston,simple-ci,fix-attempt,reorder-import}.test.js; do
        if [ -f "$file" ]; then
            name=$(basename "$file")
            result=$(timeout 2 node "$file" 2>&1 | grep -E "passed.*failed" | tail -1)
            if [[ "$result" == *"0 failed"* ]] && [[ "$result" == *"passed"* ]]; then
                echo "✓ $name: $result"
                ((NODE_PASSED++))
            elif [[ -n "$result" ]]; then
                echo "✗ $name: $result"
                ((NODE_FAILED++))
            else
                echo "? $name: no result"
                ((NODE_FAILED++))
            fi
        fi
    done
    
    echo "Node.js: $NODE_PASSED passed, $NODE_FAILED failed"
    NODE_EXIT=$NODE_FAILED
    echo
else
    echo "Node.js not installed, skipping..."
    NODE_EXIT=0
fi

# Deno tests (using Deno's test runner for compatible tests)
echo "--- DENO TESTS ---"
if command -v deno &> /dev/null; then
    echo "Testing with Deno $(deno --version | head -1)"
    DENO_PASSED=0
    DENO_FAILED=0
    
    # Tests that work with Deno's test runner
    for file in tests/{debug,log4js,simple-ci,fix-attempt,reorder-import}.test.js; do
        if [ -f "$file" ]; then
            name=$(basename "$file")
            if deno test --allow-read "$file" &> /dev/null; then
                echo "✓ $name"
                ((DENO_PASSED++))
            else
                echo "✗ $name"
                ((DENO_FAILED++))
            fi
        fi
    done
    
    echo "Deno: $DENO_PASSED passed, $DENO_FAILED failed"
    DENO_EXIT=$DENO_FAILED
    echo
else
    echo "Deno not installed, skipping..."
    DENO_EXIT=0
fi

# Summary
echo "==========================="
echo "SUMMARY"
echo "==========================="
echo "Bun:    $([ $BUN_EXIT -eq 0 ] && echo "✓ PASSED" || echo "✗ FAILED")"
echo "Node:   $([ $NODE_EXIT -eq 0 ] && echo "✓ PASSED" || echo "✗ FAILED")"
echo "Deno:   $([ $DENO_EXIT -eq 0 ] && echo "✓ PASSED" || echo "✗ FAILED")"

# Exit with failure if any runtime failed
if [ $BUN_EXIT -ne 0 ] || [ $NODE_EXIT -ne 0 ] || [ $DENO_EXIT -ne 0 ]; then
    exit 1
fi

exit 0