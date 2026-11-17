# Comprehensive curriculum

46 chapters across 8 parts: 30 executable investigations and 16 substantial design/system readings. Basic Python is the entry prerequisite. Existing URLs, source-download behavior and reading marks remain valid. The expanded sequence teaches reusable patterns and production decisions alongside real engine mechanics.

## Events, logs and consumers

Preserve meaning and identity as records become a replayable history.

1. **Follow an event** — From a record to a useful stream. (Real Bytewax)
2. **Evolve an event schema** — A record can parse and still mean the wrong thing. (Real Bytewax)
3. **Read a partitioned log** — Ordering has a scope. (Kafka protocol simulator)
4. **Stream live through Kafka** — A producer, a socket, and an engine that keeps listening. (Live Kafka / real Bytewax)
5. **Retain or compact a log** — History and latest state answer different questions. (Explicit log model)
6. **Give consumers their own position** — Reading does not erase the log. (Real Kafka client / simulator)

## Transformation and routing patterns

Choose the delivery shape, preserve error evidence and account for fan-out.

7. **Choose a streaming architecture** — A work queue, a broadcast and a retained history solve different problems.
8. **Route and quarantine events** — Give invalid records a visible destination. (Real Bytewax)
9. **Expand and re-key a stream** — One cart becomes several independently identified lines. (Real Bytewax)

## Time, windows and late data

Choose when to emit, correct and forget a result.

10. **Choose the right clock** — The same order can belong to two different windows. (Explicit clock model)
11. **Close a window** — Give an endless calculation a boundary. (Bytewax event-time windows)
12. **Merge a session** — A late event can connect two groups. (Bytewax session windows)
13. **Wait for late events** — Trade a faster answer for a more complete one. (Bytewax EventClock)
14. **When can time move forward?** — Slow partitions, idle inputs and late returns.
15. **Correct a late result** — Closing a window and forgetting it are separate decisions. (Explicit correction model)

## Stateful patterns, joins and views

Choose ownership, changing-result semantics, retained history and match rules.

16. **Keep state by key** — Two shops. Two running totals. (Real Bytewax)
17. **Where does a key live?** — Partitions, exchanges and parallel state.
18. **Build a materialized view** — Updates replace facts; deletes must leave enough history. (Real Bytewax)
19. **From streams to tables and back** — An append, an upsert and a retraction carry different meaning.
20. **Enrich a stream** — A small lookup changes the meaning of a record. (Real Bytewax)
21. **Join changing streams** — Latest values and all combinations answer different questions. (Real Bytewax)
22. **Count the join output** — One event can create more than one answer. (Bounded join reference)
23. **Look up the past** — Latest context can rewrite yesterday. (Temporal lookup model)
24. **When is a streaming answer final?** — Join horizons, corrections and changelog contracts.
25. **Detect an event sequence** — Two failures followed by success is a stateful question. (Real Bytewax)
26. **Recognize sequences and absence** — A missing event needs a clock, not only a predicate.

## Failure, recovery and integration

Coordinate identity, state, retries and effects across explicit consistency boundaries.

27. **Replay without double counting** — One order can have two deliveries. (Bytewax + identity policy)
28. **Forget state deliberately** — A smaller state store changes the answers you can defend. (Real Bytewax)
29. **When is it safe to forget?** — State, timers, expiry and the meaning of a result.
30. **Recover after a failure** — The write succeeded. The offset did not. (Real process recovery)
31. **What makes a snapshot consistent?** — A moving system needs a coordinated cut.
32. **Exactly once—at which boundary?** — Replay is expected. Duplicate effects are a design choice.
33. **Retry with a budget** — Transient failure is a scheduling decision, not an infinite loop. (Bytewax + service-failure fixture)
34. **Connect transactions to streams** — Outbox, CDC and inbox patterns close different gaps.

## Performance and capacity

Count work, measure a stated boundary and budget for overload and recovery.

35. **Measure operation effort** — Count the work before timing it. (Instrumented reference algorithms)
36. **Measure latency and batching** — A higher throughput can hide a longer wait. (Deterministic queueing model)
37. **When the consumer falls behind** — A queue buys time. It cannot create capacity. (Discrete teaching model)
38. **Where does the waiting go?** — Slow sinks, blocked channels and checkpoint cost.
39. **Budget for recovery** — Normal capacity is not recovery capacity. (Fluid capacity model)

## Production delivery and governance

Rebuild, release, observe and govern a stream with operational evidence.

40. **Run a bounded backfill** — Replay a declared range into a versioned destination. (Kafka simulator + Bytewax)
41. **Why did more workers not help?** — State migration and the limit of a single hot key.
42. **What is the job waiting for?** — A diagnosis from source to visible result.
43. **Test and deploy a changing stream** — A passing example is the beginning of a release contract.
44. **Operate data with ownership and care** — Security, privacy and retention are part of the stream contract.

## Design review and capstone

Defend a complete pattern composition and diagnose its failure boundaries.

45. **Defend the complete design** — Compose patterns, budgets and evidence into a production decision.
46. **Resolve the streaming incident** — One pipeline. Several plausible explanations. (Bytewax + correction policy)

## Execution and guarantee boundaries

Real Bytewax graphs implement the transformation/state/window/session/join/pattern investigations. Real Kafka producer/consumer traffic and Bytewax KafkaSource connect to an in-memory librdkafka simulator. Process recovery uses an observed SQLite checkpoint and an actual child-process SIGKILL/restart inside one guest. None establishes broker disk durability, replication, distributed failover or external-sink transactions.

Authored mechanisms are named explicitly: retry service-failure schedules and planned jitter, expiry control records, ordered sequence fixtures, correction/watermark controls, temporal/interval references, retention/compaction and capacity calculations. They are useful learning contracts, not disguised framework features. Reusable operator patterns are demonstrated with actual Bytewax APIs wherever the claim concerns engine behavior.

## Production practice

The design path covers commands/events, queue/pub-sub/log choices, output amplification, stream/table updates and tombstones, sequence versus absence, state cleanup, retry budgets and quarantine ownership, snapshot/backfill/cutover, CDC/outbox/inbox, schema semantics and state migration, security/PII/retention/lineage, business SLOs, failure injection, release rehearsal and runbooks. Every reading includes a worked case, framework distinctions, progressive hints, independent reasoning and primary sources. Its diagrams/tables are authored design cases, not recorded deployments.

## Assessment and evidence

Every investigation has inspectable input, a prediction, execution-generated worked output, a controlled change, independent transfer, hints and five operation accounts: work, state, movement, progress and recovery. The final playbook and incident capstone require a topology, identity/clock/state contracts, failure/resource budgets and a validation plan. Run success does not grade that explanation.

Native assertions verify exact published sources and meaningful variants. Browser checks execute those sources inside actual Linux/Wasm, compare answers and verify source/result downloads, Stop/retry, draft migration, reading marks, themes, mobile layouts and subpath assets. Static reading requests no VM. The native performance harness verifies answers before reporting measurements; emulation and authored model clocks do not establish production capacity.
