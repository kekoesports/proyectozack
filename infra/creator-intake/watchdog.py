"""Host-side watchdog. Run as deploy; private state, fixed containers, no raw errors."""
import json, os, pathlib, subprocess, sys, time, urllib.request
from kernel_health import kernel_health

ROOT = pathlib.Path.home() / '.config/socialpro/whatsapp-reliability'
STATE = ROOT / 'watchdog.json'
WORKER = 'socialpro-waha-reliability'
PROVIDER = 'socialpro-waha-pilot'

def container(name):
    return json.loads(subprocess.check_output(['docker', 'inspect', name], stderr=subprocess.DEVNULL))[0]

def request(url, key=None, data=None):
    headers = {'Content-Type': 'application/json'}
    if key:
        headers['X-Api-Key'] = key
    req = urllib.request.Request(url, headers=headers, data=json.dumps(data).encode() if data is not None else None)
    with urllib.request.urlopen(req, timeout=10) as response:
        return json.load(response)

def main(self_test=False):
    os.umask(0o077)
    ROOT.mkdir(parents=True, exist_ok=True)
    log = ROOT / 'watchdog.log'
    if log.exists() and log.stat().st_size > 1024 * 1024:
        log.replace(ROOT / 'watchdog.previous.log')
    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    now = time.time()
    issues = []
    worker = container(WORKER)
    provider = container(PROVIDER)
    env = dict(item.split('=', 1) for item in worker['Config']['Env'])
    penv = dict(item.split('=', 1) for item in provider['Config']['Env'])
    try:
        health = request('http://127.0.0.1:3033/health')
        worker_ok = bool(health.get('ok'))
    except Exception:
        health = {}
        worker_ok = False
    if self_test:
        health = {'ok': True, 'unanswered': 1}
        worker_ok = True
    state['worker_failures'] = 0 if worker_ok else state.get('worker_failures', 0) + 1
    try:
        session = request('http://127.0.0.1:3031/api/sessions/default', penv['WAHA_API_KEY'])
        session_state = session.get('status', 'UNAVAILABLE')
        if session_state == 'WORKING' and (session.get('me') or {}).get('id') != env.get('CREATOR_INTAKE_WHATSAPP_PHONE', '') + '@c.us':
            session_state = 'IDENTITY_MISMATCH'
    except Exception:
        session_state = 'UNAVAILABLE'
    state['provider_failures'] = 0 if session_state == 'WORKING' else state.get('provider_failures', 0) + 1
    if not worker_ok:
        issues.append('servicio de mensajes sin respuesta')
    if health.get('paused'):
        issues.append('procesamiento pausado por el operador; recepción conservada')
    if session_state != 'WORKING':
        issues.append('sesión de WhatsApp: ' + session_state)
    if health.get('queueOldestSeconds', 0) > 120 or health.get('queue', 0) > 20:
        issues.append('cola de mensajes acumulada')
    for name, data in [(WORKER, worker), (PROVIDER, provider)]:
        prior_restarts = state.get(name + '_restarts', data['RestartCount'])
        if data['RestartCount'] > prior_restarts or data['State'].get('OOMKilled'):
            issues.append('reinicio inesperado o memoria agotada en ' + ('WhatsApp' if name == PROVIDER else 'el trabajador'))
        state[name + '_restarts'] = data['RestartCount']
    for field, label in [('failed', 'mensajes en bandeja de errores'), ('unanswered', 'conversaciones sin respuesta confirmada'), ('uncertain', 'envíos sin confirmar'), ('duplicateIdentities', 'identidades duplicadas'), ('aiFailuresLastHour', 'fallo de IA pendiente de revisión')]:
        if health.get(field, 0):
            issues.append(label)
    mem = {line.split(':')[0]: int(line.split()[1]) for line in pathlib.Path('/proc/meminfo').read_text().splitlines()}
    if mem['MemAvailable'] < 1024 * 1024:
        issues.append('memoria disponible inferior a 1 GB')
    disk = os.statvfs('/')
    if disk.f_bavail / disk.f_blocks < .15:
        issues.append('disco disponible inferior al 15%')
    # Count active build commands, not worker threads. No command lines enter alerts.
    processes=subprocess.run(['ps','-eo','args='],capture_output=True,text=True,check=True).stdout
    builds=sum(1 for line in processes.splitlines() if line.strip().startswith('node ') and '/next build' in line)
    if builds > 1:
        issues.append('compilaciones simultáneas fuera del bloqueo de despliegue')
    kernel={'available':True} if self_test else kernel_health(worker['Image'],state.get('kernel_checked_at',now-300))
    if kernel.get('available'):
        state['kernel_checked_at']=now
        if kernel.get('latest_oom'): state['latest_kernel_oom']=kernel['latest_oom']
    else:
        issues.append('comprobación del kernel no disponible')
    if now-state.get('latest_kernel_oom',0)<1800:
        issues.append('el kernel ha cerrado un proceso por falta de memoria')
    register=pathlib.Path.home()/'.config/socialpro/contact-register-20260912/last-result.json'
    if register.exists() and not self_test:
        try:
            contact_state=json.loads(register.read_text())
            if not contact_state.get('ok') or contact_state.get('conflicts',0):
                issues.append('registro de contactos en Drive requiere revisión')
        except (ValueError,OSError): issues.append('estado del registro de Drive no disponible')
    restarts = [stamp for stamp in state.get('recovery_attempts', []) if now - stamp < 3600]
    # At most three recovery attempts per hour, no logout/reset or QR replacement.
    if len(restarts) < 3 and not self_test:
        if state['worker_failures'] >= 2:
            subprocess.run(['docker', 'restart', '--time', '30', WORKER], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            restarts.append(now)
        elif state['provider_failures'] >= 3 and session_state in ('FAILED', 'STOPPED', 'UNAVAILABLE'):
            if session_state == 'UNAVAILABLE':
                subprocess.run(['docker', 'restart', '--time', '30', PROVIDER], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            else:
                request('http://127.0.0.1:3031/api/sessions/default/restart', penv['WAHA_API_KEY'], {})
            restarts.append(now)
    state['recovery_attempts'] = restarts
    if len(restarts) >= 3:
        issues.append('recuperación automática detenida tras tres intentos')
    fingerprint = '|'.join(sorted(issues))
    should_alert = fingerprint and (fingerprint != state.get('alert_fingerprint') or now - state.get('last_alert', 0) > 21600)
    recovered = not fingerprint and state.get('alert_fingerprint')
    if should_alert or recovered:
        token = env.get('CREATOR_INTAKE_TELEGRAM_TOKEN')
        owner = env.get('CREATOR_INTAKE_TELEGRAM_OWNER')
        if token and owner and owner == env.get('CREATOR_INTAKE_TELEGRAM_ALERT_CHAT'):
            api = 'https://api.telegram.org/bot' + token
            connection = request(api + '/getBusinessConnection', data={'business_connection_id': env.get('CREATOR_INTAKE_TELEGRAM_CONNECTION')})
            result = connection.get('result') or {}
            if connection.get('ok') and result.get('is_enabled') and result.get('id') == env.get('CREATOR_INTAKE_TELEGRAM_CONNECTION') and str((result.get('user') or {}).get('id')) == owner:
                message = 'SocialPro · WhatsApp: ' + ('servicio recuperado.' if recovered else '; '.join(issues) + '.')
                if self_test: message = 'TEST de monitorización · aviso simulado, sin mensajes de clientes afectados.\n' + message
                message += '\nRevisión: https://socialpro.es/admin/captacion'
                ack = request(api + '/sendMessage', data={'chat_id': owner, 'text': message, 'protect_content': True,
                    'link_preview_options': {'is_disabled': True}})
                if ack.get('ok'):
                    state['alert_fingerprint'] = fingerprint
                    state['last_alert'] = now
                    state['last_alert_accepted'] = True
                    state['last_alert_receipt'] = (ack.get('result') or {}).get('message_id')
    state.update({'checked_at': now, 'session': session_state, 'worker_ok': worker_ok,
        'issues': issues, 'memory_available_mb': mem['MemAvailable'] // 1024,
        'active_builds': builds, 'kernel_oom_visibility': 'available' if kernel.get('available') else 'unavailable'})
    temporary = STATE.with_suffix('.tmp')
    temporary.write_text(json.dumps(state))
    temporary.replace(STATE)
    print(json.dumps({'ok': not issues, 'issue_count': len(issues), 'session': session_state}))

if __name__ == '__main__':
    try:
        self_test = '--self-test' in sys.argv
        if self_test: STATE = ROOT / 'watchdog-self-test.json'
        main(self_test)
    except Exception:
        print('{"ok":false,"error":"watchdog-check-failed"}')
        raise SystemExit(1)
