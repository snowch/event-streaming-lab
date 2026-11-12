"""Download exact, checksum-verified wheels; no RxPY patches or source rewrites."""

import hashlib
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
ASSETS.mkdir(parents=True, exist_ok=True)
lock = json.loads((ROOT / "node_modules/pyodide/pyodide-lock.json").read_text())
manifest = []


def download(url, filename, digest, package, version):
    target = ASSETS / filename
    if not target.exists():
        urllib.request.urlretrieve(url, target)
    assert hashlib.sha256(target.read_bytes()).hexdigest() == digest, filename
    manifest.append({"package": package, "version": version, "file": filename,
                     "sha256": digest, "bytes": target.stat().st_size, "source": url})


for name in ("micropip", "packaging"):
    item = lock["packages"][name]
    download("https://cdn.jsdelivr.net/pyodide/v0.27.7/full/" + item["file_name"],
             item["file_name"], item["sha256"], name, item["version"])

for package, version in [("reactivex", "6.1.0"), ("typing-extensions", "4.16.0")]:
    with urllib.request.urlopen(f"https://pypi.org/pypi/{package}/{version}/json") as response:
        metadata = json.load(response)
    wheel = next(item for item in metadata["urls"] if item["filename"].endswith("-py3-none-any.whl"))
    download(wheel["url"], wheel["filename"], wheel["digests"]["sha256"], package, version)

(ASSETS / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print("Prepared checksum-verified wheels. Browser execution needs no external requests.")
