# Comprehensive curriculum

The course teaches reasoning and executable reference mechanisms, not certification on a production framework. Basic Python is required. One authoritative sequence in `src/catalog.mjs` orders 21 executable investigations and nine distributed readings. Each chapter links its next and previous neighbor across both types. Existing URLs and saved-work identifiers are preserved.

## Part 1 — Events, logs and consumers

1. Follow an event: selection, transformations and input/output counts.
2. Evolve an event schema: envelope versions, unit normalization, validation and rejection evidence.
3. Read a partitioned log: routing, scoped ordering and offsets.
4. Retain or compact a log: retention gaps, latest-value state, tombstones and reconstruction.
5. Give consumers their own position: independent groups, committed-next positions, replay and assignment changes.

## Part 2 — Time, windows and late data

6. Choose the right clock: event/processing/ingestion boundaries, disorder versus skew, timestamp validation.
7. Close a window: tumbling and sliding timed buffers, overlap, completion and scheduler time.
8. Merge a session: data-dependent groups, late bridges and mergeable aggregates.
9. Wait for late events: a single-input progress policy, rejection and delayed first output.
10. When can time move forward? Multiple-input minimums, idleness, returning inputs and alignment distinctions.
11. Correct a late result: first emission versus allowed lateness, retained state, cleanup and replacement totals.

The introductory rejection policy and correction policy deliberately differ and are labelled. Equality/cleanup conventions are explicit. The session reference remains open until EOF; it does not claim online cleanup. No source clock is described as measured browser performance.

## Part 3 — State, joins and changing answers

12. Keep state by key: per-key accumulators, cardinality and eviction needs.
13. Where does a key live? Source partitions, exchanges and operator ownership.
14. Enrich a stream: latest-reference lookup and missing keys.
15. Count the join output: interval matching, duplicate multiplicity, output-sensitive cost and retained unmatched history.
16. Look up the past: valid-time versus knowledge-time and reference-version retention.
17. When is a streaming answer final? Changelogs, outer results, upserts, retractions and sink compatibility.

## Part 4 — Failure and recovery

18. Replay without double counting: event identity, retained deduplication and the actual linear lookup in RxPY 6.1.0.
19. When is it safe to forget? Managed state, timers, expiry, cleanup and recoverable ownership.
20. Recover after a failure: additive versus idempotent effects under a specified receipt schedule.
21. What makes a snapshot consistent? Source/state cuts, aligned and unaligned checkpoints, completion and savepoints.
22. Exactly once—at which boundary? Replayable inputs, restored state, transactional/idempotent sinks and unrelated external effects.

## Part 5 — Performance and capacity

23. Measure operation effort: n events, k keys, overlap r and output z; counted work versus asymptotic and implementation claims.
24. Measure latency and batching: queue/service boundaries, completed populations, nearest-rank quantiles and a throughput/latency tradeoff.
25. When the consumer falls behind: admission, bounded capacity, overflow, drain and conservation.
26. Where does the waiting go? Distributed backpressure, broker lag and checkpoint phase diagnosis.
27. Budget for recovery: outage backlog, continuing offered load, spare capacity and omitted restore costs.

A downloadable native harness complements these chapters. Both genuine RxPY and direct reference backends are executed during checks and independently verified. Timings are observations, never fixed pass/fail thresholds or universal performance claims. A separate experimental design explains what a genuine Kafka/Flink comparison must include; no native cluster harness is claimed.

## Part 6 — Design and operations

28. Why did more workers not help? Rescaling, state migration, hot keys and merge constraints.
29. What is the job waiting for? End-to-end objectives, compatible metrics, hypothesis testing and failure evidence.
30. Resolve the streaming incident: validation, stable IDs, duplicate receipts, late corrections, cleanup and keyed sink revisions.

The capstone uses one window and predetermined progress actions. Its baseline accepts £15; disabling deduplication yields £25; zero allowed lateness yields £10. It intentionally does not count all real business events under every policy. Readers submit baseline, broken and repaired-policy run records plus a diagnosis of the first divergence, a resource-cost account, and independent tests. The rubric distinguishes correct execution from a sound explanation.

## Teaching and verification contracts

- New terms appear before they explain a result. Predictions are optional, not blocking forms.
- Every executable chapter has inspectable input, actual code, native-generated worked output, a change-one-thing investigation, independent reasoning, progressive hints, worked feedback and a primary source.
- Under-the-hood tables state work/state/movement/progress/recovery boundaries, including the extra copying/collection used for pedagogical traces.
- Expected dictionary/hash behavior is distinguished from linear implementations. The pinned installed RxPY `_distinct.py` and `_groupbyuntil.py` were inspected before writing those claims.
- Reading chapters use authored diagrams/tables and explicitly avoid claiming cluster execution.
- The semantic suite checks exact published snippets, independent expected outputs, variant policies, queue conservation, session bridging, join cardinality, causal clock observations, replacement totals and native benchmark correctness.
- The browser suite compares every published experiment against native results and checks subpath hosting, state preservation, errors, Stop, export/download and responsive layouts. Static reading checks require no Python or JavaScript.
