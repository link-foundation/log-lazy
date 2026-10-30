#!/usr/bin/env python3
"""Exercise release scripts with a fake registry; never publish a crate."""
import os
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import sys

ROOT = Path(__file__).resolve().parents[1]


class VersionCheckTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.directory = Path(cls.temp.name)
        cls.binary = cls.directory / 'check-version'
        subprocess.run(
            ['rustc', '--edition=2021', '-Dwarnings',
             str(ROOT / 'scripts/check-crate-version.rs'), '-o', str(cls.binary)],
            check=True,
        )
        curl = cls.directory / 'curl'
        curl.write_text(
            '#!/bin/sh\n'
            'printf "%s" "$MOCK_HTTP_STATUS"\n'
            'exit "${MOCK_CURL_EXIT:-0}"\n'
        )
        curl.chmod(0o755)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def check_version(self, status, event='push', ref='refs/heads/main', curl_exit=0):
        env = os.environ.copy()
        env.pop('GITHUB_OUTPUT', None)
        env.update(
            PATH=f'{self.directory}{os.pathsep}{env["PATH"]}',
            RUST_ROOT=str(ROOT / 'rust'),
            MOCK_HTTP_STATUS=status,
            MOCK_CURL_EXIT=str(curl_exit),
            GITHUB_EVENT_NAME=event,
            GITHUB_REF=ref,
        )
        return subprocess.run([str(self.binary)], env=env, text=True,
                              capture_output=True, check=False)

    def test_registry_errors_never_authorize_publication(self):
        for status in ['403', '429', '500', '000', 'garbled']:
            with self.subTest(status=status):
                result = self.check_version(status)
                self.assertNotEqual(result.returncode, 0, result.stdout)
                self.assertNotIn('should-publish=true', result.stdout)
                self.assertIn('::error::', result.stderr)

    def test_transport_failure_is_not_missing_version(self):
        result = self.check_version('404', curl_exit=7)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertNotIn('should-publish=true', result.stdout)

    def test_existing_version_skips_publish(self):
        result = self.check_version('200')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('should-publish=false', result.stdout)

    def test_existing_version_rejects_pull_request(self):
        result = self.check_version('200', event='pull_request')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('already published', result.stderr)

    def test_missing_version_publishes_only_on_main_push(self):
        for event, ref, expected in [
            ('push', 'refs/heads/main', 'true'),
            ('push', 'refs/heads/feature', 'false'),
            ('pull_request', 'refs/pull/11/merge', 'false'),
            ('workflow_dispatch', 'refs/heads/main', 'false'),
        ]:
            with self.subTest(event=event, ref=ref):
                result = self.check_version('404', event=event, ref=ref)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn(f'should-publish={expected}', result.stdout)


class PublishTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.directory = Path(cls.temp.name)
        cls.binary = cls.directory / 'publish-crate'
        subprocess.run(
            ['rustc', '--edition=2021', '-Dwarnings',
             str(ROOT / 'scripts/publish-crate.rs'), '-o', str(cls.binary)],
            check=True,
        )
        cargo = cls.directory / 'cargo'
        cargo.write_text(
            f'#!{sys.executable}\n'
            'import json, os, sys\n'
            'from pathlib import Path\n'
            'Path(os.environ["MOCK_ARGS"]).write_text(json.dumps(sys.argv[1:]))\n'
            'print(os.environ.get("MOCK_CARGO_ERROR", ""), file=sys.stderr)\n'
            'sys.exit(int(os.environ.get("MOCK_CARGO_EXIT", "0")))\n'
        )
        cargo.chmod(0o755)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def publish(self, token='', legacy_token='', dry_run=False, error=''):
        env = os.environ.copy()
        env.pop('GITHUB_OUTPUT', None)
        env.update(
            PATH=f'{self.directory}{os.pathsep}{env["PATH"]}',
            RUST_ROOT=str(ROOT / 'rust'),
            CARGO_REGISTRY_TOKEN=token,
            MOCK_ARGS=str(self.directory / 'args.json'),
            MOCK_CARGO_ERROR=error,
            MOCK_CARGO_EXIT='1' if error else '0',
        )
        if legacy_token:
            env.pop('CARGO_REGISTRY_TOKEN')
            env['CARGO_TOKEN'] = legacy_token
        else:
            env.pop('CARGO_TOKEN', None)
        result = subprocess.run(
            [str(self.binary)] + (['--dry-run'] if dry_run else []),
            env=env, text=True, capture_output=True, check=False,
        )
        args = json.loads((self.directory / 'args.json').read_text())
        return result, args

    def test_selected_oidc_or_fallback_token_reaches_cargo(self):
        for token in ['fake-oidc-token', 'fake-fallback-token']:
            with self.subTest(token=token):
                result, args = self.publish(token=token)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(args, ['publish', '--token', token])
                self.assertNotIn(token, result.stdout + result.stderr)
                self.assertIn('publish_result=success', result.stdout)

    def test_legacy_token_is_supported(self):
        result, args = self.publish(legacy_token='fake-legacy-token')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(args, ['publish', '--token', 'fake-legacy-token'])

    def test_dry_run_omits_token_and_never_reports_release_success(self):
        result, args = self.publish(token='fake-oidc-token', dry_run=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(args, ['publish', '--dry-run'])
        self.assertIn('publish_result=dry_run', result.stdout)
        self.assertNotIn('publish_result=success', result.stdout)

    def test_auth_failure_cannot_create_release(self):
        result, _ = self.publish(error='unauthorized')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('publish_result=auth_failed', result.stdout)
        self.assertNotIn('publish_result=success', result.stdout)


if __name__ == '__main__':
    unittest.main(verbosity=2)
