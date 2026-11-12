# Learning and interface review

## Applied skills

The UX and learning-design skills in `.agents/skills/` adapt the corresponding skills reviewed from PostgreSQL Lab. Applied before implementation and again to the rendered pages and actual experiments. This review was performed in one agent session; it is not an independent learner study.

## Design

PostgreSQL Lab supplies incident → prediction → executable evidence → change → transfer. Video Lab supplies short, local experiments with adjacent output; GPU Lab supplies independent explanatory state; Query Engine Book supplies the Python-worker architecture. A warm paper/forest/terracotta palette, serif headings, quiet metadata, and dark Python cells distinguish reading, execution and explanation. No mandatory prediction form interrupts running code.

Ten investigations progress through local processing, time, reliability, then the broker concepts that RxPY itself does not implement. The fixture is a five-order bicycle-shop example. All lessons are complete; none advertises unimplemented exercises. Each has goals, definitions, actual code, generated worked output, progressive hints, an independent transfer question, limitations and a primary source.

## Validation

`npm run check` executes the exact lesson snippets natively, generates their static worked results, then runs every snippet in real Chromium/Pyodide under the GitHub Pages project path. Browser outputs are compared structurally with native outputs. Model invariants check queue conservation and recovery effects. The broker examples assert partition-local offsets and independent cursor outputs.

Browser journeys cover runtime errors and retry, Stop of a nonterminating Python loop and runtime restart, stale-output notices, persisted drafts, explicit reversible reading marks, light/dark themes, and phone-width overflow. External browser requests are blocked during the suite: the runtime uses self-hosted assets. Desktop and phone screenshots were inspected. Changes from review include collapsible mobile navigation, ASCII-compatible directional glyphs, and retryable initialization failures. Reading marks do not grade knowledge or run success.

## Boundaries

This is a concepts course, with real local RxPY pipelines and separately labelled authored models. RxPY is not represented as a Kafka framework. No live broker, distributed checkpoints, transactions across systems, or exactly-once external effects are established. Virtual scheduler ticks and queue ticks are not performance measurements. The failure example is a deterministic receipt schedule, not a durable restart test. Kafka partitioning is explicit routing in a list model, not the real client's hash algorithm. Log retention, rebalance coordination and multiple-partition event-time progress are outside these bounded exercises.

Chromium is tested; Firefox and Safari are not yet verified. Runtime loading on slow connections and very large learner programs can exceed device limits. There is no service worker or complete offline installation. The worker is for UI responsiveness and cancellation, not a security boundary for hostile code. Source and run-record downloads are not broker checkpoints. See `about.html` for learner-facing limits.
