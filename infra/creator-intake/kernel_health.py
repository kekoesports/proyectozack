"""Read kernel OOM journal records through a networkless, read-only helper.
No privileged container, host PID namespace, host root mount, or host writes.
"""
import json, subprocess

def kernel_health(image, since):
    args=['docker','run','--rm','--network','none','--read-only','--cap-drop','ALL','--user','0',
      '--memory','128m','--cpus','.25']
    for source,target in [('/usr/bin/journalctl','/host-journalctl'),
      ('/usr/lib/x86_64-linux-gnu','/usr/lib/x86_64-linux-gnu'),('/var/log/journal','/host-journal')]:
        args+=['--mount','type=bind,src='+source+',dst='+target+',readonly']
    args+=['--entrypoint','/host-journalctl',image,'--directory=/host-journal','-k',
      '--since=@'+str(int(since)),'--no-pager','-o','json','--grep=Out of memory|Killed process|oom-kill']
    try:
        result=subprocess.run(args,capture_output=True,timeout=20)
        if result.returncode not in (0,1): return {'available':False}
        if b'Permission denied' in result.stderr or b'Failed' in result.stderr: return {'available':False}
        latest=None
        for line in result.stdout.splitlines():
            try:
                item=json.loads(line)
                if 'Killed process' not in item.get('MESSAGE',''): continue
                stamp=int(item['__REALTIME_TIMESTAMP'])/1e6
                latest=max(latest or 0,stamp)
            except (ValueError,KeyError,TypeError): continue
        return {'available':True,'latest_oom':latest}
    except (OSError,subprocess.TimeoutExpired): return {'available':False}
