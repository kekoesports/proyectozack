"""Operator deployment for the measured 2026-09-13 host. Secrets stay on the VPS.
Commands are explicit phases; no DB restoration, history replay or session logout.
"""
import datetime, http.client, json, os, pathlib, socket, subprocess, sys, time, urllib.request, urllib.parse

ROOT = pathlib.Path('/home/deploy/.config/socialpro/whatsapp-audit-20260913')
SOURCE = pathlib.Path('/home/deploy/socialpro-whatsapp-reliability')
OLD_WORKER = 'socialpro-waha-worker'
WORKER = 'socialpro-waha-reliability'
OLD_WEB = 'socialpro-crm-keydrop-curly-zack-20260911'
WEB = 'socialpro-crm-whatsapp-reliability'
IMAGE = 'socialpro:whatsapp-reliability-20260913'
WEB_IMAGE = 'socialpro:whatsapp-crm-reliability-20260913'

def run(args, **kwargs):
    result = subprocess.run(args, capture_output=True, **kwargs)
    if result.returncode:
        raise RuntimeError('operation-failed')
    return result.stdout

def inspect(name):
    return json.loads(run(['docker', 'inspect', name]))[0]

def environment(container):
    return dict(item.split('=', 1) for item in container['Config']['Env'])

def save(name, data):
    target = ROOT / name
    target.write_text(json.dumps(data))
    target.chmod(0o600)

def envfile(name, values):
    target = ROOT / name
    assert all('\n' not in k and '\n' not in v for k, v in values.items())
    target.write_text('\n'.join(k+'='+v for k, v in values.items())+'\n')
    target.chmod(0o600)
    return str(target)

def request(path, method='GET', data=None):
    key = environment(inspect('socialpro-waha-pilot'))['WAHA_API_KEY']
    req = urllib.request.Request('http://127.0.0.1:3031'+path, method=method,
        headers={'X-Api-Key': key, 'Content-Type': 'application/json'},
        data=json.dumps(data).encode() if data is not None else None)
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)

def migrate(fixture=False):
    worker = environment(inspect(OLD_WORKER))
    web = environment(inspect(OLD_WEB))
    if fixture:
        fixture_ip = inspect('socialpro-whatsapp-qa-20260913')['NetworkSettings']['Networks']['bridge']['IPAddress']
        values = {'DATABASE_URL': 'postgresql://fixture:fixture@'+fixture_ip+':5432/restore_check'}
        network = 'bridge'
    else:
        values = {k: web[k] for k in ('DATABASE_URL', 'MIGRATION_DATABASE_URL')}
        assert urllib.parse.urlparse(values['DATABASE_URL']).path == urllib.parse.urlparse(worker['DATABASE_URL']).path
        assert urllib.parse.urlparse(values['MIGRATION_DATABASE_URL']).path == urllib.parse.urlparse(worker['DATABASE_URL']).path
        network = 'socialpro-crm_crm_backend'
        d = inspect('socialpro-crm-postgres-1'); e = environment(d)
        backup = run(['docker','exec','socialpro-crm-postgres-1','pg_dump','-U',e['POSTGRES_USER'],'-d',e['POSTGRES_DB'],'-Fc'])
        (ROOT/'database-pre-activation.dump').write_bytes(backup)
    values['DEPLOY_ENV'] = 'production'
    f = envfile('migration-fixture.env' if fixture else 'migration.env', values)
    result = subprocess.run(['docker','run','--rm','--network',network,'--env-file',f,
        '--memory','512m','--cpus','1',IMAGE,'npm','run','migrate'], capture_output=True)
    (ROOT/('migration-fixture.log' if fixture else 'migration.log')).write_bytes(result.stdout+result.stderr)
    if result.returncode: raise RuntimeError('migration-failed')
    print(json.dumps({'migration': 'fixture' if fixture else 'production', 'ok': True}))

def clone(name, old, image, port, mounts=None, overrides=None, command=None, restart='unless-stopped'):
    prior = inspect(old); values = environment(prior)
    values.update(overrides or {})
    save(name+'.previous-config.json', prior)
    binds=[]
    for mount in mounts if mounts is not None else prior['Mounts']:
        if mount['Destination'].startswith('/app/'): continue
        binds.append(mount['Source']+':'+mount['Destination']+(':rw' if mount['RW'] else ':ro'))
    network=list(prior['NetworkSettings']['Networks'])[0]
    config={'Image':image,'Env':[k+'='+v for k,v in values.items()],
      'HostConfig':{'RestartPolicy':{'Name':restart},'Init':True,
        'Memory':prior['HostConfig']['Memory'] or 1073741824,'MemoryReservation':268435456,
        'NanoCpus':1000000000 if name==WORKER else 2000000000,'Binds':binds,'NetworkMode':network,
        'LogConfig':{'Type':'json-file','Config':{'max-size':'10m','max-file':'3'}},
        'PortBindings':{'3000/tcp':[{'HostIp':'127.0.0.1','HostPort':str(port)}]} if port else {}},
      'ExposedPorts':{'3000/tcp':{}}}
    if command:
        config['Cmd']=command
        if 'infra/contact-register/worker.mjs' in command:
            # This scheduled worker has no HTTP server. Check persisted readback instead.
            config['Healthcheck']={'Test':['CMD','node','-e',
              "const s=JSON.parse(require('fs').readFileSync('/evidence/last-result.json','utf8'));process.exit(s.ok&&Date.now()-Date.parse(s.at)<600000?0:1)"],
              'Interval':60000000000,'Timeout':5000000000,'StartPeriod':60000000000,'Retries':3}
    # Unix socket preserves multiline credentials without argv or env-file escaping.
    connection=http.client.HTTPConnection('localhost')
    connection.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM)
    connection.sock.connect('/var/run/docker.sock')
    connection.request('POST','/containers/create?name='+urllib.parse.quote(name),
      body=json.dumps(config),headers={'Content-Type':'application/json'})
    response=connection.getresponse(); response.read()
    assert response.status==201, 'Container creation failed'
    connection.close()
    for network in list(prior['NetworkSettings']['Networks'])[1:]:
        run(['docker','network','connect',network,name])
    run(['docker','start',name])

def ready(name, port, path):
    for attempt in range(30):
        try:
            with urllib.request.urlopen('http://127.0.0.1:'+str(port)+path, timeout=3) as r:
                if r.status == 200: return
        except Exception: pass
        time.sleep(2)
    raise RuntimeError('candidate-not-ready')

def reconcile(fixture=False):
    values = environment(inspect(OLD_WORKER))
    network = 'socialpro-crm_crm_backend'
    if fixture:
        ip = inspect('socialpro-whatsapp-qa-20260913')['NetworkSettings']['Networks']['bridge']['IPAddress']
        values['DATABASE_URL'] = 'postgresql://fixture:fixture@'+ip+':5432/restore_check'
        network = 'bridge'
    f=envfile('identity-fixture.env' if fixture else 'identity.env',values)
    args=['docker','run','--rm','--user',str(os.getuid())+':'+str(os.getgid()),'--network',network,
        '--memory','512m','--cpus','1','--env-file',f,'--mount','type=bind,src='+str(ROOT)+',dst=/evidence',IMAGE,
        'node','--import','tsx','--require','./scripts/worker-preload.cjs','scripts/reconcile-whatsapp-identities.mjs']
    result = subprocess.run(args,capture_output=True)
    (ROOT/('identity-fixture.log' if fixture else 'identity.log')).write_bytes(result.stdout+result.stderr)
    if result.returncode: raise RuntimeError('identity-repair-failed')
    print(json.dumps({'identity_reconciliation': 'fixture' if fixture else 'production', 'ok': True}))

def activate():
    ready(WORKER,3033,'/health')
    current = request('/api/sessions/default')
    assert current['status'] == 'WORKING'
    save('session-before-activation.json',current)
    config = current['config']
    hooks = config['webhooks']
    assert len(hooks) == 1 and hooks[0]['events'] == ['message.any']
    hooks[0]['url'] = 'http://'+WORKER+':3000/api/webhooks/creator-intake/waha'
    hooks[0]['retries'] = {'policy':'constant','delaySeconds':5,'attempts':120}
    request('/api/sessions/default','PUT',{'name':'default','config':config})
    observed = request('/api/sessions/default')
    assert observed['config']['webhooks'][0]['url'] == hooks[0]['url']
    run(['docker','stop','--time','30',OLD_WORKER])
    print(json.dumps({'webhook_updated':True,'old_worker_stopped':True,'session':observed['status']}))

def pause(paused=True):
    # Keep durable reception. The old worker uses run-specific identities and must
    # not be restarted over canonical data without a separate reviewed reversal.
    prior=inspect(WORKER); values=environment(prior)
    path=pathlib.PurePosixPath(values['CREATOR_INTAKE_AI_PILOT_DIR'])
    mount=next(m for m in prior['Mounts'] if str(path)==m['Destination'])
    marker=pathlib.Path(mount['Source'])/'whatsapp-processing-paused'
    if paused: marker.write_text('operator maintenance\n')
    elif marker.exists(): marker.unlink()
    print(json.dumps({'processing_paused':paused,'durable_reception_preserved':True}))

def refresh_worker():
    previous=WORKER+'-previous-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S')
    cutoff=datetime.datetime.fromtimestamp((ROOT/'session-before-activation.json').stat().st_mtime,datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
    run(['docker','stop','--time','30',WORKER])
    run(['docker','rename',WORKER,previous])
    try:
        clone(WORKER,previous,IMAGE,3033,overrides={'CREATOR_INTAKE_WAHA_START_AT':cutoff})
        ready(WORKER,3033,'/health')
    except Exception:
        # This previous worker already understands canonical identities and durable inbox.
        failed=subprocess.run(['docker','logs',WORKER],capture_output=True)
        (ROOT/'worker-failed-upgrade.log').write_bytes(failed.stdout+failed.stderr)
        subprocess.run(['docker','stop',WORKER],capture_output=True)
        subprocess.run(['docker','rm',WORKER],capture_output=True)
        run(['docker','rename',previous,WORKER]); run(['docker','start',WORKER]); raise
    save('worker-release.json',{'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
      'image':inspect(WORKER)['Image'],'previous':previous,'cutoff':cutoff})
    print('Worker refreshed; compatible previous image preserved')

def main():
    os.umask(0o077); ROOT.mkdir(parents=True,exist_ok=True)
    phase=sys.argv[1]
    if phase=='migrate-fixture': migrate(True)
    elif phase=='migrate': migrate()
    elif phase=='reconcile-fixture': reconcile(True)
    elif phase=='reconcile': reconcile()
    elif phase=='stage-worker':
        clone(WORKER,OLD_WORKER,IMAGE,3033); ready(WORKER,3033,'/health'); print('Worker candidate ready')
    elif phase=='stage-web':
        scope=environment(inspect(WORKER))['CREATOR_INTAKE_WHATSAPP_CHATS']
        clone(WEB,OLD_WEB,WEB_IMAGE,3034,overrides={'CREATOR_INTAKE_WHATSAPP_CHATS':scope})
        ready(WEB,3034,'/api/health/live'); print('Web candidate ready')
    elif phase=='contact-preview':
        name='socialpro-contact-register-preview'
        scope=environment(inspect(WORKER))['CREATOR_INTAKE_WHATSAPP_CHATS']
        clone(name,'socialpro-contact-register',IMAGE,None,overrides={'CREATOR_INTAKE_WHATSAPP_CHATS':scope},
          command=['node','--conditions=react-server','--import','tsx','infra/contact-register/preview.mjs'],restart='no')
        exitcode=run(['docker','wait',name]).decode().strip()
        result=run(['docker','logs',name]).decode()
        (ROOT/'contact-preview.log').write_text(result)
        assert exitcode=='0'
        print(result.strip())
    elif phase=='activate-contacts':
        scope=environment(inspect(WORKER))['CREATOR_INTAKE_WHATSAPP_CHATS']
        run(['docker','stop','--time','30','socialpro-contact-register'])
        try:
            clone('socialpro-contact-register-reliability','socialpro-contact-register',IMAGE,None,
              overrides={'CREATOR_INTAKE_WHATSAPP_CHATS':scope},
              command=['node','--conditions=react-server','--import','tsx','infra/contact-register/worker.mjs'])
        except Exception:
            # The previous writer was already failing readback. Preserve it stopped;
            # restarting it would resume ambiguous writes, not restore a healthy service.
            raise
        print('Contact register replacement started; inspect persisted readback evidence')
    elif phase=='activate': activate()
    elif phase=='pause': pause()
    elif phase=='resume': pause(False)
    elif phase=='refresh-worker': refresh_worker()
    else: raise RuntimeError('unknown-phase')

if __name__=='__main__':
    try: main()
    except Exception:
        print('{"ok":false,"error":"deployment-phase-failed"}')
        raise SystemExit(1)
