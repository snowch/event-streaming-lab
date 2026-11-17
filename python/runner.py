"""Execute one editor program in a fresh Linux VM and emit a JSON frame."""
import io
import json
from contextlib import redirect_stdout,redirect_stderr
from importlib.metadata import version
from pathlib import Path
import traceback
import os
import subprocess
import platform

buffer=io.StringIO()
namespace={'__name__':'__main__'}
try:
    # The base container drops NET_ADMIN and leaves lo down. Create a private
    # user/network namespace, map the existing guest identity, and enable only
    # loopback. This grants no capabilities outside the emulated guest.
    uid,gid=os.getuid(),os.getgid()
    os.unshare(os.CLONE_NEWUSER|os.CLONE_NEWNET)
    Path('/proc/self/setgroups').write_text('deny')
    Path('/proc/self/uid_map').write_text(f'0 {uid} 1')
    Path('/proc/self/gid_map').write_text(f'0 {gid} 1')
    subprocess.run(['ip','link','set','lo','up'],check=True,capture_output=True)
    print('ESL_PHASE running',flush=True)
    with redirect_stdout(buffer),redirect_stderr(buffer):
        source=Path('/mnt/lab/python/experiment.py').read_text()
        exec(compile(source,'experiment.py','exec'),namespace)
    response={'type':'result','value':{'result':namespace.get('result'),'stdout':buffer.getvalue()},
              'runtime':{'python':platform.python_version(),'kernel':platform.release(),'bytewax':version('bytewax'),'confluent_kafka':version('confluent-kafka'),'engine':'Linux / Bochs / container2wasm','broker':'librdkafka in-memory Kafka simulator'}}
    # Serialize inside try: unsupported values are a visible retryable error.
    encoded=json.dumps(response,allow_nan=False)
except BaseException:
    encoded=json.dumps({'type':'error','origin':'python','message':traceback.format_exc(),'stdout':buffer.getvalue()})
print('ESL_RESULT '+encoded,flush=True)
