#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { appendFileSync } from 'fs';

function git(args, options = {}) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch (error) {
    if (options.allowFailure) {
      return '';
    }
    console.error(`git ${args.join(' ')} failed`);
    console.error(error.message);
    process.exit(1);
  }
}

function setOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `${name}=${value}\n`);
  }
  console.log(`${name}=${value}`);
}

function isMergeCommit() {
  const head = git(['cat-file', '-p', 'HEAD'], { allowFailure: true });
  return head
    .split('\n')
    .filter((line) => line.startsWith('parent ')).length > 1;
}

function splitFiles(output) {
  return output.split('\n').map((line) => line.trim()).filter(Boolean);
}

function getChangedFiles() {
  const eventName = process.env.GITHUB_EVENT_NAME || '';

  if (
    eventName === 'pull_request' &&
    process.env.GITHUB_BASE_SHA &&
    process.env.GITHUB_HEAD_SHA
  ) {
    const baseSha = process.env.GITHUB_BASE_SHA;
    const headSha = process.env.GITHUB_HEAD_SHA;
    console.log(`Comparing PR base/head: ${baseSha}...${headSha}`);
    git(['fetch', 'origin', baseSha, '--depth=1'], { allowFailure: true });
    return splitFiles(
      git(['diff', '--name-only', baseSha, headSha], { allowFailure: true })
    );
  }

  if (isMergeCommit()) {
    console.log('Merge commit detected; comparing HEAD^2^ to HEAD^2');
    const perCommitDiff = git(['diff', '--name-only', 'HEAD^2^', 'HEAD^2'], {
      allowFailure: true,
    });
    if (perCommitDiff) {
      return splitFiles(perCommitDiff);
    }

    console.log('Falling back to HEAD^..HEAD^2 for the first PR commit');
    return splitFiles(
      git(['diff', '--name-only', 'HEAD^', 'HEAD^2'], { allowFailure: true })
    );
  }

  console.log('Comparing HEAD^ to HEAD');
  const diff = git(['diff', '--name-only', 'HEAD^', 'HEAD'], {
    allowFailure: true,
  });
  if (diff) {
    return splitFiles(diff);
  }

  console.log('HEAD^ not available; listing all files in HEAD');
  return splitFiles(git(['ls-tree', '--name-only', '-r', 'HEAD']));
}

function isDocsOnlyPath(file) {
  return (
    file.endsWith('.md') ||
    file.startsWith('docs/') ||
    file.startsWith('js/docs/')
  );
}

function isJavaScriptSourcePath(file) {
  if (file.startsWith('scripts/') && file.endsWith('.mjs')) {
    return true;
  }

  if (!file.startsWith('js/')) {
    return false;
  }

  return /\.(cjs|d\.ts|js|mjs|ts|tsx)$/.test(file);
}

function isPackagePath(file) {
  return [
    'js/package.json',
    'js/package-lock.json',
    'js/bun.lock',
    'js/bunfig.toml',
    'js/eslint.config.js',
    'js/tsconfig.json',
  ].includes(file);
}

function detectChanges() {
  console.log('Detecting JavaScript workflow changes\n');

  const changedFiles = getChangedFiles();
  console.log('Changed files:');
  if (changedFiles.length === 0) {
    console.log('  (none)');
  } else {
    changedFiles.forEach((file) => console.log(`  ${file}`));
  }
  console.log('');

  const mjsChanged = changedFiles.some((file) => file.endsWith('.mjs'));
  const jsChanged = changedFiles.some(isJavaScriptSourcePath);
  const packageChanged = changedFiles.some(isPackagePath);
  const docsChanged = changedFiles.some(
    (file) => file.endsWith('.md') || file.startsWith('docs/')
  );
  const workflowChanged = changedFiles.some(
    (file) => file === '.github/workflows/js.yml'
  );

  const codeChangedFiles = changedFiles.filter((file) => !isDocsOnlyPath(file));
  const anyCodeChanged = codeChangedFiles.some(
    (file) =>
      isJavaScriptSourcePath(file) ||
      isPackagePath(file) ||
      file.startsWith('scripts/') ||
      file === '.github/workflows/js.yml'
  );

  console.log('Files considered code changes:');
  if (codeChangedFiles.length === 0) {
    console.log('  (none)');
  } else {
    codeChangedFiles.forEach((file) => console.log(`  ${file}`));
  }
  console.log('');

  setOutput('mjs-changed', mjsChanged ? 'true' : 'false');
  setOutput('js-changed', jsChanged ? 'true' : 'false');
  setOutput('package-changed', packageChanged ? 'true' : 'false');
  setOutput('docs-changed', docsChanged ? 'true' : 'false');
  setOutput('workflow-changed', workflowChanged ? 'true' : 'false');
  setOutput('any-code-changed', anyCodeChanged ? 'true' : 'false');
}

detectChanges();
