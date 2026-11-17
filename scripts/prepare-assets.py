"""Compatibility entrypoint for the Linux/Bytewax asset preparation script."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).resolve().parents[1]/'runtime/prepare.py'),run_name='__main__')
