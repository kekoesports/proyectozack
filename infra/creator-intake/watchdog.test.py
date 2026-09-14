import importlib.util, json, pathlib, sys, tempfile, time, unittest
from unittest.mock import patch, Mock

sys.path.insert(0,str(pathlib.Path(__file__).parent))
spec = importlib.util.spec_from_file_location('watchdog', pathlib.Path(__file__).with_name('watchdog.py'))
watchdog = importlib.util.module_from_spec(spec)
spec.loader.exec_module(watchdog)

class WatchdogTests(unittest.TestCase):
    def test_telegram_disabled_preserves_monitoring_without_notifications(self):
        self.env.append('CREATOR_INTAKE_TELEGRAM_ENABLED=false')
        self.health['unanswered'] = 1
        watchdog.main()
        self.assertEqual(self.sent(), [])
        self.assertFalse(any('api.telegram.org' in call[0] for call in self.calls))
        self.assertFalse(json.loads(watchdog.STATE.read_text())['telegram_notifications_enabled'])
        self.assertTrue(json.loads(watchdog.STATE.read_text())['issues'])

    def test_operator_mute_file_prevents_notifications(self):
        (watchdog.ROOT / 'telegram-disabled').touch()
        self.health['failed'] = 1
        watchdog.main()
        self.assertEqual(self.sent(), [])

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
          side_effect=lambda path, *args, **kwargs: 'MemAvailable: 2097152 kB\n' if path.as_posix() == '/proc/meminfo' else original_read(path, *args, **kwargs))
        # The production watchdog is Linux-only; its isolated tests also run on Windows.
        self.disk = patch.object(watchdog.os, 'statvfs', create=True, return_value=Mock(f_bavail=80, f_blocks=100))
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

    def test_missing_budget_counter_alerts_without_reset(self):
        self.env.append('CREATOR_INTAKE_AI_PILOT_DIR=/missing-test-counter')
        watchdog.main(); watchdog.main()
        self.assertEqual(len(self.sent()),1)
        self.assertIn('contador persistente',self.sent()[0][1]['text'])
        self.assertEqual(self.restarts(),[])

    def test_stale_contact_readback_alerts(self):
        target=pathlib.Path(self.temp.name)/'.config/socialpro/contact-register-20260912/last-result.json'
        target.parent.mkdir(parents=True)
        target.write_text(json.dumps({'ok':True,'conflicts':0,'at':'2026-01-01T00:00:00Z'}))
        watchdog.main()
        self.assertIn('registro de contactos',self.sent()[0][1]['text'])

    def test_thirtieth_reservation_is_counted_and_preserved(self):
        self.env.append('CREATOR_INTAKE_AI_PILOT_DIR=/budget')
        for slot in range(1,31): (watchdog.ROOT/f'request-{slot}.reserved').touch()
        data={'Image':'TEST','Config':{'Env':self.env},'State':{},'RestartCount':0,
            'Mounts':[{'Destination':'/budget','Source':str(watchdog.ROOT)}]}
        with patch.object(watchdog,'container',return_value=data): watchdog.main()
        self.assertEqual(json.loads(watchdog.STATE.read_text())['ai_reserved_requests'],30)
        self.assertIn('límite de IA agotado',self.sent()[0][1]['text'])
        self.assertEqual(len(list(watchdog.ROOT.glob('*.reserved'))),30)

if __name__ == '__main__':
    unittest.main()
