# Course completeness review — 17 November 2026

The initial 31-chapter migration covered the core mechanics of event streaming: event contracts, partitioned logs, independent positions, event-time windows, late data, keyed state, joins, checkpoint boundaries, capacity and operations. The review identified missing reusable processing patterns and production practice. The expanded implementation now has 46 chapters across eight parts: 30 executable investigations and 16 substantial readings.

The richer Linux runtime lets us teach actual Bytewax transformations, state, windows, Kafka protocol clients and process failure. Reference policies remain useful when their boundary is explicit. More runtime capability does not turn the simulator into a production broker or establish distributed guarantees.

| Area | Existing coverage | Required expansion |
| --- | --- | --- |
| Events and contracts | Schema versions, validation, normalization | Commands versus events; contracts and ownership; malformed/poison records |
| Basic operators | Filter, map, keyed state | Flat-map/fan-out, branching/routing, merge and output amplification |
| Time | Event/processing time, tumbling/sliding/session windows, late outputs, multi-input progress readings | Sequence/absence patterns; explicit clock and finality choices in pattern selection |
| State | Aggregates, identity state, retention reading | Actual state deletion; deduplication horizon tradeoffs; materialized views and tombstone versioning |
| Joins | Enrichment, interval multiplicity and temporal references | Real engine stream-stream join; latest-value versus history semantics |
| Reliability | Actual checkpoint/SIGKILL drill; external effects reading | Bounded retry budgets, permanent/transient classification, quarantine/dead-letter contracts |
| Replays and integration | Offsets and bounded fixtures | Bounded backfills, versioned replay namespaces, bootstrap/cutover, CDC/outbox/inbox |
| Architecture | Framework comparisons | Work queues, pub/sub, logs, stream/table duality, projections and CQRS, pattern selection |
| Performance | Operation costs, native measurement, queues and recovery headroom | Apply budgets to fan-out, cardinality, retry amplification and joins |
| Production practice | Monitoring and failure-design readings | Security/PII, governance, schema rollout, testing invariants, deployments, ownership and runbooks |
| Assessment | Per-chapter transfer tasks and incident capstone | Cross-pattern design decisions and explicit production-readiness evidence |

## Implemented expansion

Basic Python remains the entry prerequisite. Existing URLs, saved reading marks and the complete time/recovery/performance material are preserved. The new connected pattern sequence adds:

- Real-engine investigations: route/quarantine, flat-map and re-key, materialized views, state deletion, sequence detection, bounded retries, bounded backfills and a real changing-stream join.
- Substantial readings: selecting streaming architectures/patterns, stream/table projections, CDC/outbox/inbox, sequence/absence semantics, production testing/deployment, security/governance/operational practice.
- Tie each addition to work/state/movement/progress/recovery costs, observable output, one controlled change, progressive hints and an independent design question.
- Keep simulator, authored service-failure fixtures, reference clocks and production-only guarantees explicit.

## Runtime reliability gate

The full local suite passed the original 22 Linux investigations. A fresh GitHub Actions run passed 14 investigations and then timed out during the next guest. Publishing was correctly blocked. Before adding heavier workloads, tighten the WASI polling contract and failure diagnostics, then validate the entire expanded course. A larger curriculum must not hide runtime failures behind worked-output fallbacks or unbounded retries.

## Coverage and deliberate limits

The expanded course now covers the core processing patterns and the production decisions needed to reason about them. The time sequence includes event versus processing clocks, event-time progress, tumbling/sliding/session windows, late output, corrections and cleanup. Distributed readings explain active-input watermarks, idleness, ownership, alignment, rescaling, hot keys, snapshots and changing-result semantics. The performance sequence connects operator effort to fan-out, join multiplicity, state cardinality, queues, batching latency and recovery capacity.

The production sequence treats contracts, replay, identity, tombstones, bounded retries, quarantine ownership, outbox/CDC/inbox, deployment/state compatibility, observability, security and data lifecycle as explicit design obligations. The playbook asks learners to combine these into a topology, consistency boundaries, budgets, failure matrix and validation plan. The incident capstone tests a connected diagnosis rather than completion of isolated Run buttons.

Real deployment exercises remain a distinct next layer: Kafka replication/leader failure and consumer membership changes; distributed checkpoint/alignment/rescaling; transactional sinks; database snapshot/CDC cutover; real TLS/ACL configuration and external-service outcome reconciliation. Their concepts are taught here, but the local simulator cannot prove those mechanisms. The ZeroMQ companion remains a proposal. No duration, certification or production-readiness claim replaces demonstrated learner evidence.

## Validation and release evidence

All 30 exact published snippets and meaningful boundary/policy variations pass native execution. The 16 readings pass a JavaScript-free phone-width inspection, with at least 3,832 characters of main text per reading and no page overflow. The release workflow executes all 30 sources in actual Chromium/Linux, compares them with native results, exercises cancellation/recovery/exports/drafts, and checks all static readings before Pages can deploy. Its current result and retained browser evidence are available in the [check and publish workflow](https://github.com/snowch/event-streaming-lab/actions/workflows/pages.yml). No successful deployment is inferred from the native checks alone.
