"""SIGKILL then resume real Bytewax source position and running state.

One worker, one recovery DB, a seekable local input log. Output is an ordinary
append-only file, NOT a transactional or exactly-once sink.
"""
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import pickle
import signal
import sqlite3
import subprocess
import sys
import tempfile
import time

def worker(root, checkpoint=True):
    import bytewax.operators as op
    from bytewax.dataflow import Dataflow
    from bytewax.inputs import FixedPartitionedSource, StatefulSourcePartition
    from bytewax.recovery import RecoveryConfig
    from bytewax.testing import TestingSink, run_main

    class Partition(StatefulSourcePartition):
        def __init__(self, index):
            self.index = index
        def next_batch(self):
            values = json.loads((root / "input.json").read_text())
            if self.index < len(values):
                value = values[self.index]
                self.index += 1
                return [value]
            if (root / "done").exists():
                raise StopIteration
            return []
        def snapshot(self):
            return self.index
        def next_awake(self):
            return datetime.now(timezone.utc) + timedelta(milliseconds=50)

    class Source(FixedPartitionedSource):
        def list_parts(self):
            return ["log"]
        def build_part(self, step_id, for_part, resume_state):
            with (root / "starts.jsonl").open("a") as log:
                log.write(json.dumps({"resume_index": resume_state}) + "\n")
            return Partition(resume_state or 0)

    flow = Dataflow("kill_resume")
    values = op.input("source", flow, Source())
    keyed = op.key_on("key", values, lambda _: "ALL")
    def accumulate(state, value):
        total = (state or 0) + value
        return total, total
    sums = op.stateful_map("sum", keyed, accumulate)
    def emit(step_id, item):
        with (root / "output.jsonl").open("a") as log:
            log.write(json.dumps(item[1]) + "\n")
    op.inspect("record", sums, emit)
    op.output("discard", sums, TestingSink([]))
    run_main(flow, recovery_config=RecoveryConfig(root / "recovery") if checkpoint else None, epoch_interval=timedelta(milliseconds=200))

def recover(checkpoint=True):
    from bytewax.recovery import init_db_dir
    root = Path(tempfile.mkdtemp(prefix="bytewax-recovery-"))
    recovery = root / "recovery"
    recovery.mkdir()
    init_db_dir(recovery, 1)
    (root / "input.json").write_text(json.dumps([12, 8, 5]))
    launcher = os.environ.get('LAB_PYTHON', sys.executable)
    command = [launcher, str(Path(__file__).resolve()), '--worker', str(root)]
    child = subprocess.Popen(command)
    saved_checkpoint = None
    try:
        deadline = time.monotonic() + 120
        while time.monotonic() < deadline:
            assert child.poll() is None, f"Engine exited {child.returncode}"
            try:
                with sqlite3.connect(next(recovery.glob("*.sqlite3")), timeout=0.1) as conn:
                    snapshots = [(step, epoch, pickle.loads(blob)) for step, epoch, blob in conn.execute("SELECT step_id, snap_epoch, ser_change FROM snaps WHERE ser_change IS NOT NULL")]
                    frontier = conn.execute("SELECT max(worker_frontier) FROM fronts").fetchone()[0]
                source = [epoch for step, epoch, value in snapshots if step.endswith(".source") and value == 3]
                state = [epoch for step, epoch, value in snapshots if ".sum" in step and value == 25]
                if source and state and frontier is not None and frontier > max(source + state):
                    saved_checkpoint = {"source_index": 3, "sum": 25, "frontier": frontier, "snapshots": snapshots}
                    break
            except (sqlite3.Error, StopIteration):
                pass
            time.sleep(0.1)
        assert saved_checkpoint, "No completed checkpoint observed"
        child.kill()
        assert child.wait(timeout=15) == -signal.SIGKILL
        (root / "input.json").write_text(json.dumps([12, 8, 5, 7, 4]))
        (root / "done").touch()
        child = subprocess.Popen(command + ([] if checkpoint else ['--fresh']))
        assert child.wait(timeout=120) == 0
        starts = [json.loads(line) for line in (root / "starts.jsonl").read_text().splitlines()]
        outputs = [json.loads(line) for line in (root / "output.jsonl").read_text().splitlines()]
        assert starts == [{"resume_index": None}, {"resume_index": 3 if checkpoint else None}], starts
        assert outputs == ([12, 20, 25, 32, 36] if checkpoint else [12,20,25,12,20,25,32,36]), outputs
        return {'checkpoint':checkpoint, 'resumed_from':3 if checkpoint else 0,
                'restored_total':25 if checkpoint else 0, 'outputs':outputs,
                'replayed_records':0 if checkpoint else 3, 'final_total':outputs[-1],
                'boundary':'SIGKILL and process restart in one guest; volatile filesystem; ordinary non-transactional output.'}
    finally:
        if child.poll() is None:
            child.kill()
            child.wait()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--worker":
        worker(Path(sys.argv[2]), '--fresh' not in sys.argv)
    else:
        print(json.dumps(recover()))
