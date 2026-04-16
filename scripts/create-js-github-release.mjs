#!/usr/bin/env node

import { spawnSync } from 'child_process';

function getArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasArg(name) {
  return process.argv.includes(`--${name}`);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
  });
}

function main() {
  if (hasArg('help')) {
    console.log(
      'Usage: node scripts/create-js-github-release.mjs --release-version <version> [--package-name <name>] [--repository <owner/repo>] [--dry-run]'
    );
    return;
  }

  const version = getArg('release-version');
  const packageName = getArg('package-name') || 'log-lazy';
  const repository = getArg('repository') || process.env.GITHUB_REPOSITORY;
  const dryRun = hasArg('dry-run');

  if (!version || !repository) {
    console.error('Usage: node scripts/create-js-github-release.mjs --release-version <version> --repository <owner/repo>');
    process.exit(1);
  }

  const tag = `js-v${version}`;
  if (dryRun) {
    console.log(`Would create GitHub release ${tag} in ${repository}`);
    console.log(`Target: ${process.env.GITHUB_SHA || 'main'}`);
    console.log(`Title: JavaScript v${version}`);
    console.log(`Notes: npm: https://www.npmjs.com/package/${packageName}/v/${version}`);
    return;
  }

  const existing = run('gh', ['release', 'view', tag, '--repo', repository], {
    capture: true,
  });
  if (existing.status === 0) {
    console.log(`GitHub release ${tag} already exists; skipping.`);
    return;
  }

  const notes = `npm: https://www.npmjs.com/package/${packageName}/v/${version}`;
  const create = run('gh', [
    'release',
    'create',
    tag,
    '--repo',
    repository,
    '--target',
    process.env.GITHUB_SHA || 'main',
    '--title',
    `JavaScript v${version}`,
    '--notes',
    notes,
  ]);

  if (create.status !== 0) {
    process.exit(create.status || 1);
  }
}

main();
