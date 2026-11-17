"""Prepare checksum-verified Linux/Wasm assets and the pinned Python bundle."""
import hashlib
import gzip
import json
import os
from pathlib import Path
import subprocess
import tempfile
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'assets/linux'
ASSETS.mkdir(parents=True,exist_ok=True)
BASE='https://ktock.github.io/container2wasm-demo/containers/amd64-python-wasi-container'
DIGESTS=['8dcb79e96711a173aeb8b8b599ee3a83bc1dbb9ee3671706a6141ffed569e84c','5c54419a800ca54c44acb80fbd822e11e45cc2d88837fca6cc1ad4f61b55c424','4683ba18f70bef0c1da22bd33b947a911899c08051f8a60b3b619d5cd20b0590']
manifest=[]
def download(url,target,digest):
    if not target.exists():
        temporary=target.with_suffix('.download')
        urllib.request.urlretrieve(url,temporary)
        assert hashlib.sha256(temporary.read_bytes()).hexdigest()==digest,f'Checksum mismatch: {target.name}'
        temporary.replace(target)
    assert hashlib.sha256(target.read_bytes()).hexdigest()==digest,f'Checksum mismatch: {target.name}'
    return {'file':target.name,'sha256':digest,'bytes':target.stat().st_size,'source':url}
for i,digest in enumerate(DIGESTS):
    raw=ASSETS/f'engine{i:02}.wasm'
    download(BASE+f'{i:02}.wasm',raw,digest)
    compressed=raw.with_suffix('.wasm.gz')
    if not compressed.exists():compressed.write_bytes(gzip.compress(raw.read_bytes(),compresslevel=6,mtime=0))
    content=compressed.read_bytes()
    assert hashlib.sha256(gzip.decompress(content)).hexdigest()==digest,'Compressed engine integrity failure'
    manifest.append({'file':compressed.name,'sha256':hashlib.sha256(content).hexdigest(),
                     'bytes':len(content),'source':BASE+f'{i:02}.wasm','uncompressed_sha256':digest})
wheels=ROOT/'runtime/wheels'
wheels.mkdir(exist_ok=True)
for item in json.loads((ROOT/'runtime/wheels.lock.json').read_text()):
    download(item['source'],wheels/item['file'],item['sha256'])
builder_hash=hashlib.sha256(b''.join((ROOT/'runtime'/name).read_bytes() for name in ['Dockerfile','build_bundle.py','wheels.lock.json'])).hexdigest()
cached=json.loads((ASSETS/'manifest.json').read_text()) if (ASSETS/'manifest.json').exists() else {}
bundle=ASSETS/'bytewax-runtime.tar.gz'
if not bundle.exists() or cached.get('builder_sha256')!=builder_hash:
    environment=dict(os.environ)
    for name in ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']:environment.pop(name,None)
    docker=['docker','--host=unix:///var/run/docker.sock']
    subprocess.run([*docker,'build','-t','event-streaming-lab-runtime',str(ROOT/'runtime')],env=environment,check=True)
    container=subprocess.check_output([*docker,'create','event-streaming-lab-runtime'],env=environment,text=True).strip()
    try:
        subprocess.run([*docker,'cp',container+':/bytewax-runtime.tar.gz',str(bundle)],env=environment,check=True)
        subprocess.run([*docker,'cp',container+':/bundle/manifest.json',str(ASSETS/'python-manifest.json')],env=environment,check=True)
    finally:subprocess.run([*docker,'rm',container],env=environment,check=True,stdout=subprocess.DEVNULL)
digest=hashlib.sha256(bundle.read_bytes()).hexdigest()
if cached.get('builder_sha256')==builder_hash and cached.get('bundle_sha256'):
    assert digest==cached['bundle_sha256'],'Runtime bundle checksum mismatch'
manifest.append({'file':bundle.name,'sha256':digest,'bytes':bundle.stat().st_size,'source':'runtime/Dockerfile'})
(ASSETS/'manifest.json').write_text(json.dumps({'engine':'container2wasm / Bochs','engine_source':'container2wasm v0.6.3; demo commit 8228aaa4a7c9d179cbe266a119e69f58746f1742','builder_sha256':builder_hash,'bundle_sha256':digest,'assets':manifest},indent=2)+'\n')
print('Prepared verified Linux/Wasm + native Bytewax/Kafka runtime.')
