"""Warm Linux controller; each source runs in a new isolated child process."""
import ctypes
import importlib
import io
import json
import os
import sys
import tempfile
import traceback
import tty
from contextlib import redirect_stdout,redirect_stderr

PREFIX='LAB_SESSION '
def emit(kind,**fields):
    print(PREFIX+json.dumps({'kind':kind,**fields},allow_nan=False),flush=True)

def version(distribution):
    base='/mnt/lab/bundle/site-packages'
    name=distribution.lower().replace('-','_')
    for entry in os.listdir(base):
        if entry.endswith('.dist-info') and entry.split('-')[0].lower()==name:
            with open(base+'/'+entry+'/METADATA') as metadata:
                for line in metadata:
                    if line.startswith('Version: '):return line[9:].strip()
    raise RuntimeError('Installed package metadata missing: '+distribution)

libc=ctypes.CDLL(None,use_errno=True)
libc.mount.argtypes=[ctypes.c_char_p,ctypes.c_char_p,ctypes.c_char_p,ctypes.c_ulong,ctypes.c_char_p]
libc.mount.restype=ctypes.c_int
def mount(source,target,kind=None,flags=0,options=None):
    encode=lambda value:None if value is None else value.encode()
    if libc.mount(encode(source),encode(target),encode(kind),flags,encode(options)):
        error=ctypes.get_errno()
        raise OSError(error,os.strerror(error),target)

def private_root(root):
    mount(None,'/',flags=(1<<18)|16384) # recursively private mount propagation
    mount('tmpfs',root,'tmpfs',2,'size=32m,mode=755')
    for path in ['bin','sbin','lib','usr','opt','etc','dev/shm','sys','proc','mnt/lab','tmp','var/tmp','run','root','home']:
        os.makedirs(root+'/'+path,exist_ok=True)
    for path in ['/bin','/sbin','/lib','/usr','/opt','/etc','/mnt/lab']:
        mount(path,root+path,flags=4096)
        flags=os.statvfs(root+path).f_flag
        preserved=(flags&(15|1024|2048))|((1<<21) if flags&4096 else 0)
        mount(None,root+path,flags=4096|32|1|preserved)
    for path in ['/dev/null','/dev/zero','/dev/full','/dev/urandom','/dev/random']:
        open(root+path,'w').close()
        mount(path,root+path,flags=4096)
    mount('/sys',root+'/sys',flags=4096|16384)
    mount('tmpfs',root+'/dev/shm','tmpfs',2|4|8,'size=8m,mode=1777')
    # The base container locks nested procfs mounts. Fast mode leaves /proc
    # unavailable; Fresh Linux mode provides the ordinary guest filesystem.
    os.chroot(root)
    os.chdir('/')

def execute(request,root,write,runtime,session_run):
    capture=io.StringIO()
    started=False
    try:
        uid,gid=os.getuid(),os.getgid()
        os.unshare(os.CLONE_NEWUSER|os.CLONE_NEWNET|os.CLONE_NEWNS|os.CLONE_NEWPID|os.CLONE_NEWIPC|os.CLONE_NEWUTS)
        for path,value in [('setgroups','deny'),('uid_map',f'0 {uid} 1'),('gid_map',f'0 {gid} 1')]:
            with open('/proc/self/'+path,'w') as mapping:mapping.write(value)
        nested=os.fork()
        if nested:
            os.close(write)
            os.waitpid(nested,0)
            os._exit(0)
        process=os.posix_spawnp('ip',['ip','link','set','lo','up'],os.environ)
        if os.waitstatus_to_exitcode(os.waitpid(process,0)[1])!=0:
            raise RuntimeError('Could not enable guest-local loopback')
        private_root(root)
        tempfile.tempdir=None
        with open('/experiment.py','w') as source_file:source_file.write(request['source'])
        started=True
        emit('running',id=request['id'])
        namespace={'__name__':'__main__','__file__':'/experiment.py'}
        with redirect_stdout(capture),redirect_stderr(capture):
            exec(compile(request['source'],'/experiment.py','exec'),namespace)
        response={'type':'result','value':{'result':namespace.get('result'),'stdout':capture.getvalue()},
                  'runtime':{**runtime,'mode':'warm','session_run':session_run,'process_pid':os.getpid(),
                             'isolation':'Fresh process, user/PID/network/mount/IPC/UTS namespaces and private scratch files; shared kernel',
                             'procfs':False,'scratch_limit_mib':32}}
        encoded=json.dumps(response,allow_nan=False).encode()
    except BaseException as error:
        response={'type':'error','origin':'python' if started else 'runtime','message':traceback.format_exc(),'stdout':capture.getvalue()}
        if not started and isinstance(error,OSError):response['warm_unavailable']=True
        encoded=json.dumps(response).encode()
    while encoded:
        sent=os.write(write,encoded)
        encoded=encoded[sent:]
    os.close(write)
    os._exit(0)

def main():
    with open('/mnt/lab/python/session-config.json') as config_file:config=json.load(config_file)
    allowed={'course','patterns','kafka_lab','live_kafka','recovery_drill','messaging'}
    for name in config['preload']:
        if name not in allowed:raise ValueError('Unknown runtime helper')
        importlib.import_module(name)
    runtime={'python':sys.version.split()[0],'kernel':os.uname().release,'engine':'Linux / Bochs / container2wasm'}
    for key,distribution in config['packages'].items():runtime[key]=version(distribution)
    runtime.update(config['description'])
    if 'pyzmq' in config['packages']:runtime['libzmq']=importlib.import_module('zmq').zmq_version()
    # Fork only from a single-threaded controller. No sockets or dataflows
    # have been started here; native work belongs to the disposable child.
    if len(os.listdir('/proc/self/task'))!=1:
        emit('unavailable',message='The native runtime started background threads during initialization.')
        return
    session_run=0
    while True:
        if os.isatty(0):tty.setraw(0)
        os.set_blocking(0,True)
        emit('ready')
        line=sys.stdin.readline()
        if not line:return
        request=json.loads(line)
        if request.get('kind')=='exit':return
        session_run+=1
        root=tempfile.mkdtemp(prefix='lab-run-',dir='/tmp')
        read,write=os.pipe()
        child=os.fork()
        if child==0:
            os.close(read)
            execute(request,root,write,runtime,session_run)
        os.close(write)
        with os.fdopen(read) as output:encoded=output.read()
        _,status=os.waitpid(child,0)
        os.rmdir(root)
        if encoded:
            response=json.loads(encoded)
        else:
            response={'type':'error','origin':'python','message':'The Python process exited without a result (status '+str(os.waitstatus_to_exitcode(status))+').','stdout':''}
        emit('response',id=request['id'],response=response)
        # Retain runtime configuration, never the previous source/result.
        response=None
        encoded=None
        request=None

try:
    main()
except BaseException:
    emit('fatal',message=traceback.format_exc())
