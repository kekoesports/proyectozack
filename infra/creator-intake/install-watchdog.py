"""Install one managed deploy-user cron entry; preserve unrelated schedules."""
import json, os, pathlib, subprocess

os.umask(0o077)
root=pathlib.Path.home()/'.config/socialpro/whatsapp-reliability'
root.mkdir(parents=True,exist_ok=True)
before=subprocess.run(['crontab','-l'],capture_output=True,text=True)
if before.returncode not in (0,1): raise SystemExit('Cannot inspect current schedule')
text=before.stdout if before.returncode==0 else ''
backup=root/'crontab-before.txt'
if not backup.exists(): backup.write_text(text)
marker='# socialpro-whatsapp-watchdog-20260913'
lines=text.splitlines()
lines=[line for line in lines if marker not in line]
command='* * * * * /usr/bin/flock -n '+str(root/'watchdog.lock')+' /usr/bin/python3 /home/deploy/socialpro-whatsapp-reliability/infra/creator-intake/watchdog.py >> '+str(root/'watchdog.log')+' 2>&1 '+marker
lines.append(command)
subprocess.run(['crontab','-'],input='\n'.join(lines)+'\n',text=True,check=True)
assert subprocess.check_output(['crontab','-l'],text=True).count(marker)==1
print(json.dumps({'watchdog_schedule':'every minute','managed_entries':1,'other_entries_preserved':True}))
