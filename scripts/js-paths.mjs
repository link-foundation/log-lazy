#!/usr/bin/env node

import { existsSync } from 'fs';
import { join } from 'path';

let cachedJsRoot = null;

export function getJsRoot(options = {}) {
  const { jsRoot: explicitRoot, verbose = false } = options;

  if (explicitRoot !== undefined && explicitRoot !== '') {
    if (verbose) {
      console.log(`Using configured JavaScript root: ${explicitRoot}`);
    }
    return explicitRoot;
  }

  if (cachedJsRoot !== null) {
    return cachedJsRoot;
  }

  if (existsSync('./js/package.json')) {
    cachedJsRoot = 'js';
    if (verbose) {
      console.log('Detected multi-language repository JavaScript root: js');
    }
    return cachedJsRoot;
  }

  if (existsSync('./package.json')) {
    cachedJsRoot = '.';
    if (verbose) {
      console.log('Detected root JavaScript package');
    }
    return cachedJsRoot;
  }

  throw new Error(
    'Could not find package.json in ./js or repository root. Run from the repository root or set JS_ROOT.'
  );
}

export function getPackageJsonPath(options = {}) {
  const jsRoot =
    options.jsRoot !== undefined ? options.jsRoot : getJsRoot(options);
  return jsRoot === '.' ? './package.json' : join(jsRoot, 'package.json');
}

export function getPackageLockPath(options = {}) {
  const jsRoot =
    options.jsRoot !== undefined ? options.jsRoot : getJsRoot(options);
  return jsRoot === '.'
    ? './package-lock.json'
    : join(jsRoot, 'package-lock.json');
}

export function needsCd(options = {}) {
  const jsRoot =
    options.jsRoot !== undefined ? options.jsRoot : getJsRoot(options);
  return jsRoot !== '.';
}

export function parseJsRootConfig() {
  const args = process.argv.slice(2);
  const jsRootIndex = args.indexOf('--js-root');
  if (jsRootIndex >= 0 && args[jsRootIndex + 1]) {
    return args[jsRootIndex + 1];
  }

  return process.env.JS_ROOT || undefined;
}

export function resetJsRootCache() {
  cachedJsRoot = null;
}
