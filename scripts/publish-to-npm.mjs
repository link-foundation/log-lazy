#!/usr/bin/env node

import { readFileSync, appendFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { getPackageJsonPath, getJsRoot, parseJsRootConfig } from './js-paths.mjs';

function setOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `${name}=${value}\n`);
  }
  console.log(`${name}=${value}`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
    cwd: options.cwd,
    env: process.env,
  });
  return result;
}

function hasArg(name) {
  return process.argv.includes(`--${name}`);
}

function versionExists(packageName, version) {
  const result = run('npm', ['view', `${packageName}@${version}`, 'version'], {
    capture: true,
  });
  return result.status === 0 && result.stdout.trim() === version;
}

function main() {
  if (hasArg('help')) {
    console.log('Usage: node scripts/publish-to-npm.mjs [--dry-run]');
    return;
  }

  const dryRun = hasArg('dry-run');
  const jsRoot = getJsRoot({ jsRoot: parseJsRootConfig(), verbose: true });
  const packageJsonPath = getPackageJsonPath({ jsRoot });
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const packageName = packageJson.name;
  const version = packageJson.version;

  console.log(`Publishing ${packageName}@${version} from ${jsRoot}`);

  if (versionExists(packageName, version)) {
    console.log(`${packageName}@${version} is already published; skipping.`);
    setOutput('published', 'true');
    setOutput('published_version', version);
    setOutput('already_published', 'true');
    return;
  }

  const publishArgs = ['publish', '--access', 'public'];
  if (dryRun) {
    publishArgs.push('--dry-run');
  }

  const publish = run('npm', publishArgs, {
    cwd: jsRoot === '.' ? undefined : jsRoot,
  });

  if (publish.status !== 0) {
    process.exit(publish.status || 1);
  }

  if (dryRun) {
    setOutput('published', 'false');
    setOutput('published_version', version);
    setOutput('dry_run', 'true');
    return;
  }

  if (!versionExists(packageName, version)) {
    console.error(`::error::npm publish completed but ${packageName}@${version} is not visible`);
    process.exit(1);
  }

  setOutput('published', 'true');
  setOutput('published_version', version);
  setOutput('already_published', 'false');
}

main();
