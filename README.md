# Event Streaming Lab

[Read the course](https://snowch.github.io/event-streaming-lab/)

Ten complete browser investigations about events, state, windows, event time, replay, enrichment, queues, recovery, partitions and consumer positions. Every lesson has a practical question, definitions, optional prediction, editable Python, generated worked evidence, a change-one-thing experiment, progressive hints, a transfer question and primary references.

Real RxPY 6.1.0 runs in Pyodide 0.27.7 inside a Web Worker. The watermark/window policy, queue, crash schedule and partitioned log are explicit teaching models, not implementations of Kafka/Flink guarantees. No broker or hosted Python backend is used.

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

Outside CI the test runner uses `/usr/bin/chromium`, or `CHROMIUM_PATH`. In CI it uses Playwright's pinned Chromium. All ten published examples run natively and in actual Chromium/Wasm; results must match. Tests also cover Python error/retry, infinite-loop Stop/restart, stale output, saved drafts, explicit reading progress, themes, mobile overflow and `/event-streaming-lab/` hosting. Screenshots go to `test-results/`.

The Pages workflow checks pushes and pull requests. Successful pushes to main deploy `dist/` through GitHub Actions. Set the repository's Pages source to GitHub Actions.

## Structure

- `src/lessons.mjs`: ordered curriculum, prose, Python examples, hints and transfer tasks.
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
