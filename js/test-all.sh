#!/bin/bash

echo "==========================="
echo "Running tests in all runtimes"
echo "==========================="
echo

# Bun tests
echo "--- BUN TESTS ---"
if command -v bun &> /dev/null; then
    bun run test:bun
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
    npm run test:node
    NODE_EXIT=$?
    echo
else
    echo "Node.js not installed, skipping..."
    NODE_EXIT=0
fi

# Deno tests (using Deno's test runner for compatible tests)
echo "--- DENO TESTS ---"
if command -v deno &> /dev/null; then
    echo "Testing with Deno $(deno --version | head -1)"
    npm run test:deno
    DENO_EXIT=$?
    echo
else
    echo "Deno not installed, skipping..."
    DENO_EXIT=0
fi

# TypeScript definitions test
echo "--- TYPESCRIPT DEFINITIONS ---"
if command -v bun &> /dev/null; then
    echo "Testing TypeScript definitions..."
    if bun run test:types &> /dev/null; then
        echo "✓ TypeScript definitions valid"
        TS_EXIT=0
    else
        echo "✗ TypeScript definitions failed"
        TS_EXIT=1
    fi
    echo
elif command -v npm &> /dev/null; then
    echo "Testing TypeScript definitions..."
    if npm run test:types &> /dev/null; then
        echo "✓ TypeScript definitions valid"
        TS_EXIT=0
    else
        echo "✗ TypeScript definitions failed"
        TS_EXIT=1
    fi
    echo
else
    echo "No package runner available, skipping..."
    TS_EXIT=0
fi

# Summary
echo "==========================="
echo "SUMMARY"
echo "==========================="
echo "Bun:        $([ $BUN_EXIT -eq 0 ] && echo "✓ PASSED" || echo "✗ FAILED")"
echo "Node:       $([ $NODE_EXIT -eq 0 ] && echo "✓ PASSED" || echo "✗ FAILED")"
echo "Deno:       $([ $DENO_EXIT -eq 0 ] && echo "✓ PASSED" || echo "✗ FAILED")"
echo "TypeScript: $([ $TS_EXIT -eq 0 ] && echo "✓ PASSED" || echo "✗ FAILED")"

# Exit with failure if any runtime failed
if [ $BUN_EXIT -ne 0 ] || [ $NODE_EXIT -ne 0 ] || [ $DENO_EXIT -ne 0 ] || [ $TS_EXIT -ne 0 ]; then
    exit 1
fi

exit 0
