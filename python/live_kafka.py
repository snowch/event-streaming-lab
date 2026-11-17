"""Real Kafka protocol over loopback; librdkafka's in-memory mock broker.

The mock is NOT Apache Kafka, a durable log, or a replication test.
"""
import json
import os
from pathlib import Path
import select
import subprocess
import sys
import time

EVENTS = [("North", 12), ("South", 8), ("North", 5), ("North", 7), ("South", 9)]

def consume(brokers):
    import bytewax.operators as op
    from bytewax.connectors.kafka import KafkaSource
    from bytewax.dataflow import Dataflow
    from bytewax.testing import TestingSink, run_main

    flow = Dataflow("guest_kafka_live")
    raw = op.input("kafka", flow, KafkaSource([brokers], ["purchases"], batch_size=1, add_config={"log_level":"0"}))
    keyed = op.map("decode", raw, lambda msg: (msg.key.decode(), (int(msg.value), msg.offset)))
    def accumulate(total, event):
        amount, offset = event
        total = (total or 0) + amount
        return total, {"total": total, "offset": offset}
    sums = op.stateful_map("running_sum", keyed, accumulate)
    def emit(step_id, row):
        print("EVENT " + json.dumps({"key": row[0], **row[1]}), flush=True)
    op.inspect("stdout", sums, emit)
    op.output("discard", sums, TestingSink([]))
    run_main(flow)

def live_stream(amounts=(12,8,5,7,9)):
    from confluent_kafka import Producer, libversion
    producer = Producer({"test.mock.num.brokers": 1, "log_level": 0})
    metadata = producer.list_topics(timeout=15)
    brokers = ",".join(f"{b.host}:{b.port}" for b in metadata.brokers.values())
    if len(amounts) != 5: raise ValueError("Use exactly five amounts")
    events = [(key,amount) for (key,_),amount in zip(EVENTS,amounts)]
    deliveries = []
    def sent(err, msg):
        if err:
            raise RuntimeError(str(err))
        deliveries.append(msg.offset())
    def send(event):
        key, amount = event
        producer.produce("purchases", key=key, value=str(amount), partition=0, on_delivery=sent)
        assert producer.flush(15) == 0
    # Seed the topic, then wait for its result before producing each later event.
    # Every later event therefore arrives while the engine is already consuming.
    send(events[0])
    command = [os.environ.get('LAB_PYTHON',sys.executable), str(Path(__file__).resolve()), '--consume', brokers]
    child = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=None, text=False)
    rows, buffer = [], b""
    try:
        deadline = time.monotonic() + 120
        while len(rows) < len(events):
            assert time.monotonic() < deadline, f"Timeout; received {rows}"
            if not select.select([child.stdout], [], [], 0.5)[0]:
                assert child.poll() is None, f"Engine exited {child.returncode}"
                continue
            chunk = os.read(child.stdout.fileno(), 4096)
            assert chunk, f"Engine output closed: {child.poll()}"
            buffer += chunk
            while b"\n" in buffer:
                line, buffer = buffer.split(b"\n", 1)
                if line.startswith(b"EVENT "):
                    row = json.loads(line[6:])
                    rows.append(row)
                    if len(rows) < len(events):
                        send(events[len(rows)])
        totals={};expected=[]
        for offset,(key,amount) in enumerate(events):
            totals[key]=totals.get(key,0)+amount
            expected.append({'key':key,'total':totals[key],'offset':offset})
        assert rows==expected, rows
        assert deliveries == list(range(5)), deliveries
        return {'broker':'librdkafka in-memory Kafka simulator', 'transport':'TCP loopback',
                'records':rows, 'live_arrivals':4, 'checkpoint':'not configured',
                'trace':[{'stage':'KafkaSource → keyed state',**row} for row in rows]}
    finally:
        child.terminate()
        try:
            child.wait(timeout=10)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--consume":
        consume(sys.argv[2])
    else:
        print(json.dumps(live_stream()))
