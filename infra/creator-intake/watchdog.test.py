import importlib.util, json, pathlib, sys, tempfile, time, unittest
from unittest.mock import patch, Mock

sys.path.insert(0,str(pathlib.Path(__file__).parent))
spec = importlib.util.spec_from_file_location('watchdog', pathlib.Path(__file__).with_name('watchdog.py'))
watchdog = importlib.util.module_from_spec(spec)
spec.loader.exec_module(watchdog)

class WatchdogTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        watchdog.ROOT = pathlib.Path(self.temp.name)
        watchdog.STATE = watchdog.ROOT / 'state.json'
        self.calls = []
        self.health = {'ok': True, 'failed': 0, 'unanswered': 0, 'uncertain': 0}
        self.session = 'WORKING'
        self.owner = 123
        self.env = ['CREATOR_INTAKE_WHATSAPP_PHONE=34999000001', 'WAHA_API_KEY=TEST',
            'CREATOR_INTAKE_TELEGRAM_TOKEN=TEST', 'CREATOR_INTAKE_TELEGRAM_OWNER=123',
            'CREATOR_INTAKE_TELEGRAM_ALERT_CHAT=123', 'CREATOR_INTAKE_TELEGRAM_CONNECTION=TEST-connection']
        self.container = patch.object(watchdog, 'container', return_value={'Image':'TEST-image','Config': {'Env': self.env}, 'State': {}, 'RestartCount': 0})
        self.request = patch.object(watchdog, 'request', side_effect=self.fake_request)
        self.run = patch.object(watchdog.subprocess, 'run', return_value=Mock(returncode=0, stdout=''))
        original_read = pathlib.Path.read_text
        self.read = patch.object(pathlib.Path, 'read_text', autospec=True,
          side_effect=lambda path, *args, **kwargs: 'MemAvailable: 2097152 kB\n' if str(path) == '/proc/meminfo' else original_read(path, *args, **kwargs))
        self.disk = patch.object(watchdog.os, 'statvfs', return_value=Mock(f_bavail=80, f_blocks=100))
        self.kernel = patch.object(watchdog, 'kernel_health', return_value={'available':True})
        self.home = patch.object(pathlib.Path, 'home', return_value=pathlib.Path(self.temp.name))
        self.read.start(); self.disk.start(); self.kernel.start(); self.home.start()
        self.container.start(); self.request.start(); self.runner = self.run.start()

    def tearDown(self):
        self.container.stop(); self.request.stop(); self.run.stop(); self.read.stop(); self.disk.stop()
        self.kernel.stop(); self.home.stop(); self.temp.cleanup()

    def fake_request(self, url, key=None, data=None):
        self.calls.append((url, data))
        if url.endswith('/health'):
            if self.health is None: raise TimeoutError()
            return self.health
        if url.endswith('/api/sessions/default'):
            return {'status': self.session, 'me': {'id': '34999000001@c.us'}}
        if url.endswith('/getBusinessConnection'):
            return {'ok': True, 'result': {'id': 'TEST-connection', 'is_enabled': True, 'user': {'id': self.owner}}}
        return {'ok': True, 'result': {'message_id': 1}}

    def sent(self):
        return [c for c in self.calls if c[0].endswith('/sendMessage')]

    def restarts(self):
        return [c for c in self.runner.call_args_list if c.args[0][0] == 'docker']

    def test_healthy_idle_is_silent(self):
        watchdog.main(); watchdog.main()
        self.assertEqual(self.sent(), []); self.assertEqual(self.restarts(), [])

    def test_unanswered_alert_ack_and_dedup(self):
        self.health['unanswered'] = 1
        watchdog.main(); watchdog.main()
        self.assertEqual(len(self.sent()), 1)
        self.assertIn('sin respuesta', self.sent()[0][1]['text'])
        self.assertTrue(json.loads(watchdog.STATE.read_text())['last_alert_accepted'])

    def test_wrong_owner_never_receives_alert(self):
        self.health['failed'] = 1; self.owner = 456
        watchdog.main(); self.assertEqual(self.sent(), [])

    def test_worker_failure_restarts_only_after_threshold(self):
        self.health = None
        watchdog.main(); self.assertEqual(self.restarts(), [])
        watchdog.main(); self.assertEqual(len(self.restarts()), 1)
        self.assertEqual(self.restarts()[0].args[0][-1], watchdog.WORKER)

    def test_pairing_required_is_not_reset(self):
        self.session = 'SCAN_QR_CODE'
        for _ in range(4): watchdog.main()
        self.assertEqual(self.restarts(), [])
        self.assertFalse(any(c[0].endswith('/restart') for c in self.calls))

    def test_recovery_limit_prevents_restart_loop(self):
        self.health = None
        watchdog.STATE.write_text(json.dumps({'worker_failures': 4, 'recovery_attempts': [time.time()] * 3}))
        watchdog.main(); self.assertEqual(self.restarts(), [])

    def test_failed_session_restart_and_recovery_notice(self):
        self.session = 'FAILED'
        for _ in range(3): watchdog.main()
        self.assertEqual(len([c for c in self.calls if c[0].endswith('/restart')]), 1)
        self.session = 'WORKING'; watchdog.main()
        self.assertIn('recuperado', self.sent()[-1][1]['text'])

if __name__ == '__main__':
    unittest.main()
