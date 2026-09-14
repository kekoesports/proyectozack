"""Measured host only: extend the pilot to one explicitly approved contact.
No image/code change, no budget change. Old containers and private backups retained.
Usage: enable-approved-contact.py APPROVAL_JSON apply|rollback
"""
import datetime, http.client, json, os, pathlib, socket, subprocess, sys, time, urllib.request
os.umask(0o077)
root = pathlib.Path('/home/deploy/.config/socialpro/whatsapp-followup-20260914')
root.mkdir(mode=0o700, exist_ok=True)
targets = [('socialpro-crm-whatsapp-5fe20fe7',3035,'/api/health/ready'),('socialpro-waha-reliability',3033,'/health')]

def run(args):
    p = subprocess.run(args, capture_output=True)
    if p.returncode: raise RuntimeError('operation-failed')
    return p.stdout

def inspect(name): return json.loads(run(['docker','inspect',name]))[0]

def api(path, config):
    c = http.client.HTTPConnection('localhost')
    c.sock = socket.socket(socket.AF_UNIX,socket.SOCK_STREAM)
    c.sock.connect('/var/run/docker.sock')
    c.request('POST',path,json.dumps(config),{'Content-Type':'application/json'})
    r=c.getresponse(); r.read(); status=r.status; c.close()
    assert status==201, 'create-failed'

def rollback(name):
    old=name+'-before-contact-20260914'
    try: run(['docker','stop','--time','30',name]); run(['docker','rename',name,name+'-contact-rejected-'+str(int(time.time()))])
    except RuntimeError: pass
    run(['docker','rename',old,name]); run(['docker','start',name])

def main():
    if sys.argv[2]=='rollback':
        for name,_,_ in reversed(targets): rollback(name)
        print('{"configuration_rolled_back":true}'); return
    assert sys.argv[2]=='apply'
    approval=json.loads(pathlib.Path(sys.argv[1]).read_text())
    assert approval['authorized'] is True
    assert datetime.datetime.fromisoformat(approval['expiresAt'].replace('Z','+00:00')) > datetime.datetime.now(datetime.timezone.utc)
    assert approval['phone'].isdigit() and 8<=len(approval['phone'])<=15
    snapshots={name:inspect(name) for name,_,_ in targets}
    for name,config in snapshots.items():
        assert not (root/(name+'.before.json')).exists(), 'already-prepared-review-first'
        (root/(name+'.before.json')).write_text(json.dumps(config))
    d=inspect('socialpro-crm-postgres-1'); e=dict(x.split('=',1) for x in d['Config']['Env'])
    backup=run(['docker','exec','socialpro-crm-postgres-1','pg_dump','-U',e['POSTGRES_USER'],'-d',e['POSTGRES_DB'],'-Fc','-t','public.intake_*'])
    assert len(backup)>1000
    (root/'intake-before.dump').write_bytes(backup)
    done=[]
    try:
        for name,port,path in targets:
            before=snapshots[name]
            config=before['Config'].copy()
            values=dict(x.split('=',1) for x in config['Env'])
            chats=values['CREATOR_INTAKE_WHATSAPP_CHATS'].split(',')
            assert len(chats)==1 and approval['phone'] not in chats, 'scope-changed'
            values['CREATOR_INTAKE_WHATSAPP_CHATS']=','.join(chats+[approval['phone']])
            config['Env']=[k+'='+v for k,v in values.items()]
            config['Image']=before['Image']
            config['Hostname']=name
            config['HostConfig']=before['HostConfig']
            networks=list(before['NetworkSettings']['Networks'])
            config['NetworkingConfig']={'EndpointsConfig':{net:{'Aliases':[name]} for net in networks}}
            run(['docker','stop','--time','30',name])
            run(['docker','rename',name,name+'-before-contact-20260914']); done.append(name)
            api('/containers/create?name='+name,config)
            run(['docker','start',name])
            for attempt in range(25):
                try:
                    with urllib.request.urlopen(f'http://127.0.0.1:{port}'+path,timeout=3) as r:
                        if r.status==200: break
                except Exception: time.sleep(1)
            else: raise RuntimeError('readiness-failed')
            active=inspect(name)
            assert active['Image']==before['Image']
            actual=dict(x.split('=',1) for x in active['Config']['Env'])
            assert {k:v for k,v in actual.items() if k!='CREATOR_INTAKE_WHATSAPP_CHATS'}=={k:v for k,v in dict(x.split('=',1) for x in before['Config']['Env']).items() if k!='CREATOR_INTAKE_WHATSAPP_CHATS'}
            print(json.dumps({'service':name,'ready':True,'only_allowlist_changed':True,'pilot_contacts':2}),flush=True)
    except Exception:
        for name in reversed(done): rollback(name)
        raise

if __name__=='__main__':
    try: main()
    except Exception: print('{"ok":false,"error":"configuration-change-failed-review-private-backup"}'); sys.exit(1)
