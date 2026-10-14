"""Deterministic fail-closed tests; never substitute a mock verdict in the real service."""
import http.client
from contextlib import nullcontext
import os
import sys
import threading
import time
import unittest
from unittest.mock import patch
import server
from settings import configuration, work_directory, LEGACY_WORK
import inspect_file


class ServiceTests(unittest.TestCase):
    def request(self, status=None, result=None, error=None, token=True, actual=False):
        fixture = (configuration()['work'] / 'fixtures/safe.png').read_bytes()
        instance = server.HTTPServer(('127.0.0.1', 0), server.Handler)
        thread = threading.Thread(target=instance.handle_request)
        with (nullcontext() if actual else patch.object(server, 'bounded_inspection', side_effect=error,
                          return_value=(status, result or b'{}'))):
            thread.start()
            client = http.client.HTTPConnection('127.0.0.1', instance.server_port, timeout=5)
            client.request('POST', '/v1/content', body=fixture, headers={
                'Authorization': 'Bearer ' + (server.TOKEN if token else 'wrong'),
                'X-Scan-Contract': 'gnc-content-v1', 'Content-Type': 'image/png'})
            response = client.getresponse()
            observed = (response.status, response.read(), response.getheader('X-Malware-Result'))
            client.close()
            thread.join(timeout=5)
            instance.server_close()
            return observed

    def test_engine_failure_is_503_without_attestation(self):
        self.assertEqual(self.request(status=43), (503, b'', None))

    def test_missing_actual_engine_is_503(self):
        with patch.dict(server.CONFIG, {'clamscan': configuration()['work'] / 'nonexistent-engine'}):
            self.assertEqual(self.request(actual=True), (503, b'', None))

    def test_timeout_is_503_without_attestation(self):
        self.assertEqual(self.request(error=RuntimeError('inspection-timeout')), (503, b'', None))

    def test_malformed_result_is_503(self):
        self.assertEqual(self.request(status=0, result=b'invalid-json'), (503, b'', None))

    def test_incomplete_success_does_not_send_200(self):
        self.assertEqual(self.request(status=0, result=b'{}'), (503, b'', None))

    def test_block_is_422_without_attestation(self):
        self.assertEqual(self.request(status=42), (422, b'', None))

    def test_wrong_key_is_403(self):
        self.assertEqual(self.request(status=0, token=False), (403, b'', None))

    def test_actual_child_timeout_terminates_process(self):
        started = time.monotonic()
        with self.assertRaisesRegex(RuntimeError, 'inspection-timeout'):
            server.bounded_inspection([sys.executable, '-c', 'import time; time.sleep(10)'], timeout=.1)
        self.assertLess(time.monotonic() - started, 3)

    def test_missing_definitions_fail_before_engine(self):
        from tempfile import TemporaryDirectory
        from pathlib import Path
        with TemporaryDirectory(dir=configuration()['work']) as path:
            with self.assertRaisesRegex(RuntimeError, 'definitions-unavailable'):
                inspect_file.inspect(Path('unused'), Path('unused'), 'image/png',
                                     Path('unavailable'), Path(path), Path('unavailable'))

    def test_stale_definitions_fail_before_engine(self):
        from tempfile import TemporaryDirectory
        from pathlib import Path
        with TemporaryDirectory(dir=configuration()['work']) as path:
            database = Path(path)
            for name in ('main.cvd', 'daily.cvd', 'bytecode.cvd'):
                (database / name).write_bytes(b'Not used; freshness gate must reject before engine')
            os.utime(database / 'daily.cvd', (1, 1))
            with self.assertRaisesRegex(RuntimeError, 'definitions-unavailable'):
                inspect_file.inspect(Path('unused'), Path('unused'), 'image/png',
                                     Path('unavailable'), database, Path('unavailable'))

    def test_mac_legacy_paths_are_preserved(self):
        with patch.dict(os.environ, {}, clear=True), patch('settings.sys.platform', 'darwin'):
            self.assertEqual(work_directory(), LEGACY_WORK)
            self.assertEqual(configuration()['clamscan'], LEGACY_WORK / 'clamav-expanded/clamav-1.5.4.macos.universal-programs.pkg/Payload/usr/local/clamav/bin/clamscan')


if __name__ == '__main__':
    unittest.main()
