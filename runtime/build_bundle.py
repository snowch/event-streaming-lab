"""Build the relocatable Python runtime inside the pinned Debian image."""
import compileall
import hashlib
import json
from pathlib import Path
import py_compile
import re
import shutil
import subprocess
import sys
import tarfile

root=Path('/bundle')
(root/'python/bin').mkdir(parents=True)
shutil.copy2(sys.executable,root/'python/bin/python3.12')
def ignore(directory,names):
    return set(names)&{'__pycache__','test','tests','ensurepip','idlelib','tkinter','turtledemo','pip','pip-25.0.1.dist-info'}
shutil.copytree('/usr/local/lib/python3.12',root/'python/lib/python3.12',ignore=ignore)
shutil.move(root/'python/lib/python3.12/site-packages',root/'site-packages')
(root/'glibc').mkdir()
libraries=set()
for obj in [root/'python/bin/python3.12',*root.rglob('*.so'),*root.rglob('*.so.*')]:
    result=subprocess.run(['ldd',str(obj)],capture_output=True,text=True)
    # Keep the loader's requested SONAME (e.g. libz.so.1), not the resolved
    # versioned filename. Losing that alias can load Alpine's musl library.
    libraries.update(Path(p) for p in re.findall(r'(?:=>\s+)?(/[^\s]+)',result.stdout) if Path(p).is_file())
for path in sorted(libraries):shutil.copy2(path,root/'glibc'/path.name)
shutil.copy2('/lib64/ld-linux-x86-64.so.2',root/'glibc/ld-linux-x86-64.so.2')
# WASI's file timestamps need not equal build-time timestamps.
assert compileall.compile_dir(str(root),quiet=1,invalidation_mode=py_compile.PycInvalidationMode.UNCHECKED_HASH)
shutil.copytree('/usr/share/doc',root/'debian-notices',ignore=lambda directory,names:[n for n in names if n!='copyright' and not (Path(directory)/n).is_dir()],symlinks=True)
manifest={'python':sys.version,'libraries':[{'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(libraries)]}
(root/'manifest.json').write_text(json.dumps(manifest,indent=2))
with tarfile.open('/bytewax-runtime.tar.gz','w:gz') as archive:archive.add(root,arcname='bundle')
