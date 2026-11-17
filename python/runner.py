"""Execute one editor program in a fresh Linux VM and emit a JSON frame."""
import io
import json
from contextlib import redirect_stdout,redirect_stderr
import os
import sys

def version(distribution):
    # Read the installed distribution's metadata without importing the much
    # larger importlib.metadata dependency tree in every emulated process.
    base='/mnt/lab/bundle/site-packages'
    name=distribution.lower().replace('-', '_')
    for entry in os.listdir(base):
        if entry.endswith('.dist-info') and entry.split('-')[0].lower()==name:
            with open(base+'/'+entry+'/METADATA') as metadata:
                for line in metadata:
                    if line.startswith('Version: '):
                        return line[len('Version: '):].strip()
    raise RuntimeError('Installed package metadata missing: '+distribution)

buffer=io.StringIO()
namespace={'__name__':'__main__'}
try:
    # The base container drops NET_ADMIN and leaves lo down. Create a private
    # user/network namespace, map the existing guest identity, and enable only
    # loopback. This grants no capabilities outside the emulated guest.
    uid,gid=os.getuid(),os.getgid()
    os.unshare(os.CLONE_NEWUSER|os.CLONE_NEWNET)
    for path,value in [('setgroups','deny'),('uid_map',f'0 {uid} 1'),('gid_map',f'0 {gid} 1')]:
        with open('/proc/self/'+path,'w') as mapping:
            mapping.write(value)
    child=os.posix_spawnp('ip',['ip','link','set','lo','up'],os.environ)
    _,status=os.waitpid(child,0)
    if os.waitstatus_to_exitcode(status)!=0:
        raise RuntimeError('Could not enable guest-local loopback')
    print('ESL_PHASE running',flush=True)
    with redirect_stdout(buffer),redirect_stderr(buffer):
        with open('/mnt/lab/python/experiment.py') as program:
            source=program.read()
        exec(compile(source,'experiment.py','exec'),namespace)
    response={'type':'result','value':{'result':namespace.get('result'),'stdout':buffer.getvalue()},
              'runtime':{'python':sys.version.split()[0],'kernel':os.uname().release,'bytewax':version('bytewax'),'confluent_kafka':version('confluent-kafka'),'engine':'Linux / Bochs / container2wasm','broker':'librdkafka in-memory Kafka simulator'}}
    # Serialize inside try: unsupported values are a visible retryable error.
    encoded=json.dumps(response,allow_nan=False)
except BaseException:
    import traceback
    encoded=json.dumps({'type':'error','origin':'python','message':traceback.format_exc(),'stdout':buffer.getvalue()})
print('ESL_RESULT '+encoded,flush=True)
