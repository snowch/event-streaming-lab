# Event Streaming Lab

[Read the course](https://snowch.github.io/event-streaming-lab/)

A six-part, 30-chapter course with 21 executable investigations and nine distributed-systems readings. The path follows bicycle-shop orders through contracts, logs, event-time progress, state, joins, failures, performance and an incident capstone. There is no fixed duration promise: readers make predictions, change policies, inspect evidence and complete independent transfer tasks.

[Course map](https://snowch.github.io/event-streaming-lab/#curriculum) · [Native performance guide](https://snowch.github.io/event-streaming-lab/performance.html) · [Curriculum and coverage](docs/curriculum.md)

Every executable chapter includes an operation account for work, state, movement, progress and recovery. Exact examples generate the static worked results and execute in real Chromium/Pyodide. The nine reading chapters are interleaved at their prerequisite points; all earlier URLs and `esl:` draft/reading keys remain valid. The capstone requires baseline/broken/repaired run records and an incident explanation.

Real RxPY 6.1.0 runs in Pyodide 0.27.7 inside a Web Worker. Watermark/correction policies, session merging, queueing, log/cursor and crash schedules are explicit teaching models, not Kafka/Flink implementations. No hosted Python service or live broker is used. The performance download runs genuine local RxPY and direct-loop trials with independent answer checks; its service-throughput boundary is distinct from modeled latency and distributed system capacity.

The [ZeroMQ companion proposal](https://snowch.github.io/event-streaming-lab/advanced/zeromq-companion.html) remains a proposal, not part of this implementation.

## Develop

Node 24+, Python 3.12 and uv (or venv/pip):

```sh
uv venv .venv
. .venv/bin/activate
uv pip install -r requirements.txt
npm ci
npm run dev
# http://localhost:5173/event-streaming-lab/
```

The first build downloads SHA-256-verified package wheels from PyPI/jsDelivr. Pyodide comes from the pinned npm package. All runtime assets are self-hosted in the generated site; opening a lesson does not fetch Python. Rebuild after editing sources.

```sh
npx playwright install --with-deps chromium
npm run check
```

Outside CI the test runner uses `/usr/bin/chromium`, or `CHROMIUM_PATH`. In CI it uses Playwright's pinned Chromium. All 21 published examples run natively and in actual Chromium/Wasm; results must match. Tests also cover Python error/retry, infinite-loop Stop/restart, stale output, saved drafts, explicit reading progress, themes, mobile overflow and `/event-streaming-lab/` hosting. Screenshots go to `test-results/`.

The Pages workflow checks pushes and pull requests. Successful pushes to main deploy `dist/` through GitHub Actions. Set the repository's Pages source to GitHub Actions.

## Structure

- `src/catalog.mjs`: one authoritative six-part sequence across all 30 chapters.
- `src/lessons.mjs`, `src/expanded.mjs`: executable prose, examples, hints and independent tasks.
- `src/depth.mjs`: algorithm and implementation cost accounts.
- `harnesses/native-benchmark.py`: verified local service-throughput trials.
- `src/advanced.mjs`, `scripts/advanced.mjs`: advanced chapter content and static renderer.
- `python/course.py`: inspectable, bounded teaching helpers.
- `src/worker.js`: real Python loading and execution.
- `src/app.js`: drafts, run lifecycle, trace inspection and reading marks.
- `scripts/build.mjs`: static pages, native-generated worked results, self-hosted runtime.
- `scripts/prepare-assets.py`: pinned wheels with SHA-256 verification.
- `tests/`: semantic and real-browser checks.
- `docs/review.md`: design choices, validation and limitations.

Drafts/reading marks/theme use localStorage under `esl:`. Downloads are portable; no account, cross-device sync, offline installation or durable streaming state is provided. Python runs have a 45-second limit after initialization and a separate two-minute load timeout. Stop replaces the worker. See the site's Field notes for detailed runtime boundaries.

## License

Copyright © 2026 Christopher Snow. Code: Apache-2.0. Prose: CC BY-NC 4.0. Third-party runtime and wheel licenses remain with their packages and are included in generated assets. This is original teaching material; official documentation is linked in every lesson.
