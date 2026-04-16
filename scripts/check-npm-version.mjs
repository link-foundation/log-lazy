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

function npmView(args) {
  return spawnSync('npm', ['view', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function parseSemver(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) {
    return null;
  }
  return match.slice(1).map((part) => Number.parseInt(part, 10));
}

function compareSemver(a, b) {
  const parsedA = parseSemver(a);
  const parsedB = parseSemver(b);
  if (!parsedA || !parsedB) {
    return 0;
  }

  for (let index = 0; index < 3; index += 1) {
    if (parsedA[index] > parsedB[index]) {
      return 1;
    }
    if (parsedA[index] < parsedB[index]) {
      return -1;
    }
  }
  return 0;
}

function main() {
  const jsRoot = getJsRoot({ jsRoot: parseJsRootConfig(), verbose: true });
  const packageJsonPath = getPackageJsonPath({ jsRoot });
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const packageName = packageJson.name;
  const currentVersion = packageJson.version;

  const latestResult = npmView([packageName, 'version']);
  const latestVersion =
    latestResult.status === 0 ? latestResult.stdout.trim() : 'not-found';
  const exactResult = npmView([`${packageName}@${currentVersion}`, 'version']);
  const exactPublished = exactResult.status === 0;

  console.log(`Package: ${packageName}`);
  console.log(`Current version: ${currentVersion}`);
  console.log(`Latest npm version: ${latestVersion}`);
  console.log(`Exact version already published: ${exactPublished}`);

  setOutput('package-name', packageName);
  setOutput('version', currentVersion);
  setOutput('npm-version', latestVersion);

  const eventName = process.env.GITHUB_EVENT_NAME || '';
  const ref = process.env.GITHUB_REF || '';
  const latestExists = latestVersion !== 'not-found';

  if (
    latestExists &&
    compareSemver(currentVersion, latestVersion) <= 0
  ) {
    const message = `Version ${currentVersion} must be greater than the latest npm version ${latestVersion}`;
    if (eventName === 'pull_request') {
      console.error(`::error::${message}`);
      process.exit(1);
    }
    console.error(`::error::${message}`);
    setOutput('should-publish', 'false');
    process.exit(1);
  }

  if (eventName === 'pull_request' && exactPublished) {
    console.error(
      `::error::Version ${currentVersion} is already published to npm`
    );
    process.exit(1);
  }

  const shouldPublish =
    eventName === 'push' && ref === 'refs/heads/main' && !exactPublished;
  setOutput('should-publish', shouldPublish ? 'true' : 'false');
}

main();
