# Curriculum and execution coverage

31 chapters combine 22 executable investigations with nine distributed-system readings. Basic Python is the prerequisite. Existing chapter URLs and saved-work keys are preserved; the live Kafka chapter is new. Every chapter links its prerequisite, next step and course map. No fixed duration is promised.

## Events, logs and consumers

Preserve meaning and identity as records become a replayable history.

1. **Follow an event** — From a record to a useful stream. (Real Bytewax)
2. **Evolve an event schema** — A record can parse and still mean the wrong thing. (Real Bytewax)
3. **Read a partitioned log** — Ordering has a scope. (Kafka protocol simulator)
4. **Stream live through Kafka** — A producer, a socket, and an engine that keeps listening. (Live Kafka / real Bytewax)
5. **Retain or compact a log** — History and latest state answer different questions. (Explicit log model)
6. **Give consumers their own position** — Reading does not erase the log. (Real Kafka client / simulator)

## Time, windows and late data

Choose when to emit, correct and forget a result.

7. **Choose the right clock** — The same order can belong to two different windows. (Explicit clock model)
8. **Close a window** — Give an endless calculation a boundary. (Bytewax event-time windows)
9. **Merge a session** — A late event can connect two groups. (Bytewax session windows)
10. **Wait for late events** — Trade a faster answer for a more complete one. (Bytewax EventClock)
11. **When can time move forward?** — Slow partitions, idle inputs and late returns.
12. **Correct a late result** — Closing a window and forgetting it are separate decisions. (Explicit correction model)

## State, joins and changing answers

Trace ownership, retained history and output multiplicity.

13. **Keep state by key** — Two shops. Two running totals. (Real Bytewax)
14. **Where does a key live?** — Partitions, exchanges and parallel state.
15. **Enrich a stream** — A small lookup changes the meaning of a record. (Real Bytewax)
16. **Count the join output** — One event can create more than one answer. (Bounded join reference)
17. **Look up the past** — Latest context can rewrite yesterday. (Temporal lookup model)
18. **When is a streaming answer final?** — Join horizons, corrections and changelog contracts.

## Failure and recovery

Locate the consistency boundary from input identity to sink effect.

19. **Replay without double counting** — One order can have two deliveries. (Bytewax + identity policy)
20. **When is it safe to forget?** — State, timers, expiry and the meaning of a result.
21. **Recover after a failure** — The write succeeded. The offset did not. (Real process recovery)
22. **What makes a snapshot consistent?** — A moving system needs a coordinated cut.
23. **Exactly once—at which boundary?** — Replay is expected. Duplicate effects are a design choice.

## Performance and capacity

Count work, measure a stated boundary and budget for overload and recovery.

24. **Measure operation effort** — Count the work before timing it. (Instrumented reference algorithms)
25. **Measure latency and batching** — A higher throughput can hide a longer wait. (Deterministic queueing model)
26. **When the consumer falls behind** — A queue buys time. It cannot create capacity. (Discrete teaching model)
27. **Where does the waiting go?** — Slow sinks, blocked channels and checkpoint cost.
28. **Budget for recovery** — Normal capacity is not recovery capacity. (Fluid capacity model)

## Design and operations

Diagnose an incident, defend a policy and identify the next validation layer.

29. **Why did more workers not help?** — State migration and the limit of a single hot key.
30. **What is the job waiting for?** — A diagnosis from source to visible result.
31. **Resolve the streaming incident** — One pipeline. Several plausible explanations. (Bytewax + correction policy)

## What executes

Real Bytewax graphs implement filtering, mapping, keyed state, identity policy, tumbling/sliding windows, sessions, event-time late side outputs and the capstone state machine. Frozen clocks and bounded-source EOF make the time fixtures repeatable; these are not latency measurements. The capstone’s watermark control records and correction/upsert decisions are authored application policy.

Kafka partition reads use actual producers and Bytewax KafkaSource. Independent group positions use real OffsetCommit/OffsetFetch requests and explicit assignments. The new live experiment uses a separate consumer process and a produce-after-result handshake. Server storage and coordination are librdkafka’s in-memory Kafka simulator, without claims about disk durability, replication, retention or rebalance coverage.

The recovery drill observes a completed SQLite checkpoint, SIGKILLs a real engine process and resumes position 3/state 25. checkpoint=False deliberately restarts without saved state and repeats three inputs. Files survive this process kill inside the same guest; they disappear with the VM. The ordinary output file does not establish transactional or exactly-once effects.

Retention/compaction, correction policy, clock assignment, interval/temporal join references, operation counters, queueing and fluid capacity calculations remain explicit reference mechanisms. They run in native Python in Linux but are not presented as Bytewax or Kafka built-ins.

## Learning and assessment

Every investigation includes inspectable inputs, an optional prediction, executed evidence, a change-one-thing task, an independent question, progressive hints, worked reasoning, implementation limits and primary references. Five operation accounts distinguish work, retained state, movement, progress and recovery. The capstone asks for baseline/broken/repaired run records and an incident explanation rather than awarding a score for execution.

A native Bytewax/direct-loop harness verifies results before reporting measurements. Browser emulation and authored queue/model clocks are not production capacity evidence. Advanced readings remain usable without JavaScript or a runtime download. The ZeroMQ companion remains a proposal.

## Validation

Native tests execute exact published snippets and assert independent invariants. Chromium executes the same sources inside a real self-hosted Linux/Wasm VM and compares their results. Checks cover errors/retry, Stop/restart, legacy draft preservation, source/result downloads, reading marks, themes, phone-width layouts, static reading and project-subpath assets. They do not establish physical mobile resource suitability, broker replication, distributed recovery or external-sink transactions.
