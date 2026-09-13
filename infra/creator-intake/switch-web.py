"""Switch only the measured SocialPro upstream; validate before reloading Caddy."""
import hashlib, json, os, pathlib, subprocess, sys, urllib.request
os.umask(0o077)
root=pathlib.Path('/home/deploy/.config/socialpro/whatsapp-audit-20260913')
config=pathlib.Path('/opt/socialpro/n8n/Caddyfile')
final=len(sys.argv)>2 and sys.argv[2]=='final'
assert len(sys.argv)<=2 or final, 'Unknown release selector'
backup=root/('Caddyfile.before-final-whatsapp' if final else 'Caddyfile.before-whatsapp')
old='socialpro-crm-whatsapp-reliability:3000' if final else 'socialpro-crm-keydrop-curly-zack-20260911:3000'
new='socialpro-crm-whatsapp-5fe20fe7:3000' if final else 'socialpro-crm-whatsapp-reliability:3000'
port=3035 if final else 3034
mode=sys.argv[1]
assert mode in ('activate','rollback')
before=config.read_bytes()
if not backup.exists():
    assert before.count(old.encode())==1 and new.encode() not in before
    backup.write_bytes(before)
original=backup.read_bytes()
expected=original.replace(old.encode(),new.encode())
assert before in (original,expected), 'Unrelated Caddy change requires reconciliation'
if mode=='activate':
    with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health/ready',timeout=5) as r: assert r.status==200
    candidate=expected
else: candidate=original
temp=root/'Caddyfile.candidate'
temp.write_bytes(candidate)
subprocess.run(['docker','cp',str(temp),'socialpro-automation-caddy-1:/tmp/whatsapp-candidate.Caddyfile'],check=True,capture_output=True)
validation=subprocess.run(['docker','exec','socialpro-automation-caddy-1','caddy','validate','--config','/tmp/whatsapp-candidate.Caddyfile','--adapter','caddyfile'],capture_output=True)
(root/'caddy-validate.log').write_bytes(validation.stdout+validation.stderr)
assert validation.returncode==0
# The daemon mounts its configuration read-only. A networkless helper can write
# this one operator-authorized host file; the daemon's mount remains read-only.
def write_config(value):
    image=json.loads(subprocess.check_output(['docker','inspect','socialpro-automation-caddy-1']))[0]['Image']
    subprocess.run(['docker','run','--rm','-i','--network','none','--read-only','--cap-drop','ALL','--user','0',
      '--mount','type=bind,src='+str(config)+',dst=/target','--entrypoint','sh',image,'-c','cat > /target'],
      input=value,check=True,capture_output=True)
write_config(candidate)
reload=subprocess.run(['docker','exec','socialpro-automation-caddy-1','caddy','reload','--config','/etc/caddy/Caddyfile','--adapter','caddyfile'],capture_output=True)
if reload.returncode:
    write_config(before)
    subprocess.run(['docker','exec','socialpro-automation-caddy-1','caddy','reload','--config','/etc/caddy/Caddyfile','--adapter','caddyfile'],capture_output=True)
    raise SystemExit('Reload failed; previous configuration restored')
receipt={'mode':mode,'at':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
 'original_sha256':hashlib.sha256(original).hexdigest(),'current_sha256':hashlib.sha256(candidate).hexdigest(),'other_routes_unchanged':True}
(root/(('web-final-' if final else 'web-')+mode+'.json')).write_text(json.dumps(receipt))
print(json.dumps({'web_switch':mode,'other_routes_unchanged':True,'validated':True}))
