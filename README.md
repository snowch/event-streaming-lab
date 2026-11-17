# Event Streaming Lab

[Read the course](https://snowch.github.io/event-streaming-lab/)

An eight-part, 46-chapter course with **30 executable investigations and 16 design/distributed-systems readings**. Follow bicycle-shop orders through contracts, live Kafka input, event-time progress, state, joins, failures, performance and an incident capstone. Make predictions, change policies, inspect evidence and complete independent transfer tasks across several study sessions.

Real **Bytewax 0.21.1** runs as a native Python engine inside browser-hosted Linux. Kafka lessons use real confluent-kafka clients, TCP loopback and Bytewax KafkaSource against **librdkafka's in-memory Kafka simulator**. The live chapter starts a separate engine process and produces four records only after earlier results arrive. Recovery sends SIGKILL to an actual engine process and restores checkpointed source/state inside the same guest.

The Linux/Wasm architecture was validated using JSLinux. The course ships an open, self-hosted **container2wasm/Bochs** VM with a pinned Debian Python runtime. The broker is a simulator; retention/compaction, correction policies, temporal/interval join references, queueing and capacity models stay explicitly labelled. No production Kafka/Flink/Spark cluster or distributed guarantees are claimed.

[Course map](https://snowch.github.io/event-streaming-lab/#curriculum) · [Runtime and provenance](runtime/README.md) · [Curriculum](docs/curriculum.md) · [Coverage review](docs/completeness-review.md) · [Learning/interface review](docs/review.md)

The pattern sequence adds routing/quarantine, fan-out, materialized views, state deletion, sequence detection, bounded retries, backfills and a real changing-stream join. Design readings cover stream/table duality, CDC/outbox/inbox, absence detection, production releases, governance and pattern composition.

Each investigation accounts for work, state, movement, progress and recovery. Exact editor examples generate the static worked results and are compared with real browser execution. Reading and worked examples need no VM or JavaScript. Every Run gets a fresh guest; files, simulator records and checkpoints are temporary. Drafts, explicit reading marks and themes retain their existing `esl:` keys. Previous drafts are preserved separately and offered as source downloads after migration.

## Develop

Linux x86-64, Docker, Node 24+ and Python 3.12:

```sh
uv venv --python 3.12 .venv
. .venv/bin/activate
uv pip install -r requirements.txt
npm ci
npm run dev
# http://localhost:5173/event-streaming-lab/
```

The first build verifies/downloads pinned VM chunks and package wheels, then builds the relocatable Python bundle using the exact official Python image digest in `runtime/Dockerfile`. Docker is a build-time dependency only. Generated assets are excluded from git and published as static Pages artifacts. The learner's runtime requests only this site's assets, never sends editor source to a backend, and enables only a private Linux loopback network. No relay, SharedArrayBuffer, special hosting headers or service worker is required.

```sh
npx playwright install --with-deps chromium
npm run check
```

The browser runner uses `/usr/bin/chromium` outside CI, or `CHROMIUM_PATH`. CI uses Playwright's pinned Chromium. Checks compare all published snippets with native answers and exercise errors/retry, infinite-loop Stop/restart, source/result export, legacy draft migration, stale output, reading marks, themes, mobile layouts and project-subpath hosting. External browser requests are blocked during the suite. Screenshots are saved to `test-results/`.

The Pages workflow checks pushes and pull requests. Successful main-branch checks publish `dist/`. Keep Pages configured to GitHub Actions.

## Runtime behavior

Opening a lesson downloads no VM. First Run downloads the compressed VM and Python assets and reports actual progress, compiles the emulator and starts Linux. Subsequent runs reuse loaded assets but start a new guest. A desktop browser with several hundred megabytes of available memory is recommended; physical low-memory mobile execution is not established by viewport tests.

Downloads have a five-minute timeout. A guest boot stalled for 60 seconds is retried once before Python starts; program execution is never automatically retried. Exports record initialization retries. Editor execution has a three-minute timeout after Python starts. Stop terminates the Worker and discards its guest. Reading marks never grade run success. There is no cross-device synchronization or complete offline-installation claim. See the [runtime build and reset contract](runtime/README.md).

The [native performance harness](harnesses/native-benchmark.py) checks answers before reporting Bytewax or direct-loop service work. Browser emulation timings and computed model milliseconds do not establish distributed capacity. The [ZeroMQ companion](https://snowch.github.io/event-streaming-lab/advanced/zeromq-companion.html) remains a separate proposal.

## Structure

- `src/catalog.mjs`, `src/lessons.mjs`: one complete course sequence, executable prose/examples and independent tasks.
- `src/depth.mjs`: per-operation cost and recovery accounts.
- `python/course.py`: inspectable Bytewax graphs and explicit reference policies.
- `python/kafka_lab.py`, `python/live_kafka.py`: real Kafka protocol investigations using the simulator.
- `python/recovery_drill.py`: observed checkpoint → SIGKILL → process restart.
- `python/runner.py`, `src/linux-worker.js`: native Python result framing and Linux/WASI execution.
- `runtime/`: reproducible Python bundle, pinned asset provenance and component notices.
- `src/app.js`: drafts, run lifecycle, downloads, trace inspection and reading marks.
- `src/advanced.mjs`, `scripts/advanced.mjs`: interleaved distributed-system readings.
- `harnesses/native-benchmark.py`: verified native measurements.
- `scripts/build.mjs`: static pages and execution-generated worked results.
- `tests/`: semantic, integration, accessibility/flow and subpath checks.

## License

Copyright © 2026 Christopher Snow. Original code: Apache-2.0. Original prose: CC BY-NC 4.0. Runtime software retains its individual licenses; see [third-party notices and source links](runtime/THIRD-PARTY-NOTICES.md). Official documentation is linked from the relevant lessons.
