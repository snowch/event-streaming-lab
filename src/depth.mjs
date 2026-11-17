const costs = {
  "follow-an-event": [
    "One predicate call per input and one mapping call per retained record. With constant-cost functions, total O(n).",
    "O(1) auxiliary operator state; this page collects output in O(n) memory.",
    "No network exchange in the local pipeline. Payload serialization is a separate boundary.",
    "Can emit as each retained record is handled.",
    "Replay repeats transformations; effects downstream need their own retry contract."
  ],
  "evolve-an-event-schema": [
    "O(n) normalizations for constant-sized records; validation of arbitrary nested payloads also depends on bytes and structure.",
    "No remembered IDs; O(n) output including rejection records.",
    "Executed locally, without network partitions. Separate payload bytes, external effects and transport from this reference.",
    "Inspect the helper’s arrival, progress and emission rules; source completion is not a general definition of finality.",
    "State and traces are not durable. A production restore must recover source progress, retained state and the sink’s effect contract together."
  ],
  "read-a-partitioned-log": [
    "Each produced record is serialized and sent through Kafka protocol, then decoded by KafkaSource. Work includes bytes, polling and metadata requests.",
    "The mock retains the log in memory; Bytewax and this page collect bounded results. This is not a disk/replica storage estimate.",
    "Actual Linux loopback TCP connects clients to an in-memory Kafka simulator. Explicit shop routing chooses partition 0 or 1.",
    "Offsets are ordered only within each partition. tail=False ends the finite read at partition EOF; output is sorted for display.",
    "Offsets enable seeking while the owning mock remains alive. Closing that process discards the log, so broker crash durability is not established."
  ],
  "retain-or-compact-a-log": [
    "O(n) filtering and expected hash updates; sorting surviving offsets adds O(k log k).",
    "O(n) reference log/output and O(k) latest-key index.",
    "Executed locally, without network partitions. Separate payload bytes, external effects and transport from this reference.",
    "Inspect the helper’s arrival, progress and emission rules; source completion is not a general definition of finality.",
    "State and traces are not durable. A production restore must recover source progress, retained state and the sink’s effect contract together."
  ],
  "give-consumers-their-own-position": [
    "Two groups send actual commit/fetch requests and read their selected records. Protocol round trips and fetched bytes add to record handling work.",
    "The simulator stores one next position per group/partition. Returned lists retain each group’s observed records for inspection.",
    "Real Kafka Consumer clients talk over loopback to a simulator. Explicit assignments avoid claiming a JoinGroup or rebalance experiment.",
    "A committed next position selects restart input. It does not prove corresponding business effects are committed safely.",
    "OffsetCommit storage is in-memory here. Bytewax KafkaSource instead uses its own recovery positions; neither is an external-sink transaction by itself."
  ],
  "choose-the-right-clock": [
    "O(n) assignments using constant-time integer arithmetic.",
    "O(n) trace records; no online retention logic.",
    "Executed locally, without network partitions. Separate payload bytes, external effects and transport from this reference.",
    "Inspect the helper’s arrival, progress and emission rules; source completion is not a general definition of finality.",
    "State and traces are not durable. A production restore must recover source progress, retained state and the sink’s effect contract together."
  ],
  "close-a-window": [
    "With r overlapping windows, each accepted event can contribute to r collectors. Emitting and sorting m collected events adds output-dependent work.",
    "collect_window retains event payloads, not only a scalar sum. Retained bytes depend on input rate, window width, overlap and event size.",
    "A real local Bytewax event-time window; no broker transport, replication or distributed exchange is measured here.",
    "EventClock and window close rules govern live progress; bounded-source EOF flushes unfinished windows in this fixture.",
    "A checkpointed live window needs consistent source position, window contents and progress state. This fixture intentionally does not configure recovery."
  ],
  "merge-a-session": [
    "The real SessionWindower groups by event-time gaps. Cost depends on open sessions, merging and collected event ordering; do not infer an indexed complexity bound from this fixture.",
    "collect_window retains each accepted event until its session emits. A long bridged session can retain unbounded history without a separate limit.",
    "Executed locally, without network partitions. Separate payload bytes, external effects and transport from this reference.",
    "Inspect the helper’s arrival, progress and emission rules; source completion is not a general definition of finality.",
    "State and traces are not durable. A production restore must recover source progress, retained state and the sink’s effect contract together."
  ],
  "wait-for-late-events": [
    "Each record is timestamped and considered by the real Bytewax window operator. Cost depends on open windows and collector size; the diagnostic trace is emitted output.",
    "Accepted open-window records, late outputs and collected results. A larger wait generally retains more event history; it is not free completeness.",
    "One local worker with a TestingSource. Multiple-input watermark coordination and network barriers are advanced reading topics.",
    "The actual late side output reports rejection. EOF flushes open windows. No internal watermark metric is invented for the trace.",
    "Replaying with a different wait can change accepted membership. Record the policy and source fixture with the output."
  ],
  "correct-a-late-result": [
    "O(t) actions plus copied trace/side-output history for this fixed single-window example.",
    "A scalar accumulator suffices for the sum; this teaching trace retains additional historical snapshots.",
    "Executed locally, without network partitions. Separate payload bytes, external effects and transport from this reference.",
    "Inspect the helper’s arrival, progress and emission rules; source completion is not a general definition of finality.",
    "State and traces are not durable. A production restore must recover source progress, retained state and the sink’s effect contract together."
  ],
  "keep-state-by-key": [
    "One keyed state callback per order. Per-event routing/storage costs depend on Bytewax’s implementation and key/hash behavior; the accumulator update itself is O(1).",
    "O(k) scalar totals for k shops, plus O(n) collected output and an O(n log n) presentation sort. No expiry is configured.",
    "One local worker; key routing is real engine work but no cross-machine network shuffle is measured.",
    "stateful_map emits after each update. The final sort is presentation only and does not establish cross-key delivery order.",
    "This lesson has no recovery config. The recovery chapter coordinates source positions and operator state in SQLite."
  ],
  "enrich-a-stream": [
    "One dictionary lookup and output construction per event; expected O(1) lookup under ordinary hashing assumptions.",
    "O(k) reference entries; the collector also retains n output records.",
    "A local dictionary avoids remote round trips. A remote lookup has separate latency, quotas and caching behavior.",
    "Can emit when the lookup completes; an asynchronous remote lookup may reorder or buffer records.",
    "A mutable latest lookup can change replayed answers even with identical source events."
  ],
  "count-the-join-output": [
    "The actual helper performs n×m comparisons, plus z output writes. A suitable hash algorithm has a different expected bound.",
    "O(n+m+z) input and output records here. An unbounded online join also needs an eviction policy.",
    "Executed locally, without network partitions. Separate payload bytes, external effects and transport from this reference.",
    "Inspect the helper’s arrival, progress and emission rules; source completion is not a general definition of finality.",
    "State and traces are not durable. A production restore must recover source progress, retained state and the sink’s effect contract together."
  ],
  "look-up-the-past": [
    "The helper scans v versions per event: O(nv). A sorted history with binary search could use O(n log v) lookups.",
    "O(v) history plus n output rows. Deleting needed versions changes the answer contract.",
    "Executed locally, without network partitions. Separate payload bytes, external effects and transport from this reference.",
    "Inspect the helper’s arrival, progress and emission rules; source completion is not a general definition of finality.",
    "State and traces are not durable. A production restore must recover source progress, retained state and the sink’s effect contract together."
  ],
  "replay-without-double-counting": [
    "One keyed state callback per delivery, with a constant-sized True state value. Routing/key lookup is engine work, distinct from an O(k) linear-list reference algorithm.",
    "One retained state entry per distinct logical ID, plus the scalar final total. Unbounded identity cardinality still means unbounded state.",
    "Bytewax routes identical IDs to the same logical state. This single-worker experiment does not measure a distributed shuffle.",
    "The authored remember callback rejects repeats. fold_final emits the total only at EOF, unlike an incremental running total.",
    "Identity state disappears with this uncheckpointed guest. Producer idempotency, recovered identity state and sink idempotency are different contracts."
  ],
  "recover-after-a-failure": [
    "The engine updates a scalar per input and writes recovery state. The controller polls SQLite, observes completion, kills and starts an actual engine process.",
    "Source position and keyed state are stored in a recovery DB. Input and output files persist across this process kill inside the same guest.",
    "Process creation, SQLite I/O and a local output file are real. There is no external transactional sink or replicated checkpoint store.",
    "The kill is delayed until a completed checkpoint exists. Restart restores position 3 and total 25 before processing the final two records.",
    "SIGKILL recovery is verified at the chosen checkpoint. Discarding the guest loses this volatile filesystem; ordinary output can duplicate at other failure boundaries."
  ],
  "measure-operation-effort": [
    "Counts n map/update calls and linear-list membership comparisons; n and k are named separately.",
    "O(k) reference entries. Python object/key sizes and hash collision behavior are not represented by entry counts.",
    "Executed locally, without network partitions. Separate payload bytes, external effects and transport from this reference.",
    "Inspect the helper’s arrival, progress and emission rules; source completion is not a general definition of finality.",
    "State and traces are not durable. A production restore must recover source progress, retained state and the sink’s effect contract together."
  ],
  "measure-latency-and-batching": [
    "O(n) scheduling records plus O(n log n) sorting for exact quantiles. Model service costs are authored parameters.",
    "O(n) per-event observations. Real online quantile sketches trade bounded space against approximation.",
    "Executed locally, without network partitions. Separate payload bytes, external effects and transport from this reference.",
    "Inspect the helper’s arrival, progress and emission rules; source completion is not a general definition of finality.",
    "State and traces are not durable. A production restore must recover source progress, retained state and the sink’s effect contract together."
  ],
  "when-the-consumer-falls-behind": [
    "Eight discrete ticks; each uses scalar arithmetic. General reference work is O(t) for t ticks.",
    "O(1) queue-depth state plus O(t) trace. It does not store actual queued payloads.",
    "No broker or network. In a real job backpressure can move waiting work into the retained log.",
    "The model services work after admitting arrivals each tick; the ordering is part of the contract.",
    "A real queue needs persistence/replay or a declared loss policy. Counters alone cannot recover payloads."
  ],
  "budget-for-recovery": [
    "O(1) arithmetic for the fluid formula. This is not the work performed by a recovery engine.",
    "O(1) model state. Actual retained backlog, snapshots and sink transactions can dominate storage.",
    "Executed locally, without network partitions. Separate payload bytes, external effects and transport from this reference.",
    "Inspect the helper’s arrival, progress and emission rules; source completion is not a general definition of finality.",
    "State and traces are not durable. A production restore must recover source progress, retained state and the sink’s effect contract together."
  ],
  "resolve-the-streaming-incident": [
    "Reference hash membership and keyed sink updates are expected O(1); copied trace lists add historical cost.",
    "Remembered accepted IDs, output revision and diagnostic history. The model does not implement retention expiry for dedup IDs.",
    "Executed locally, without network partitions. Separate payload bytes, external effects and transport from this reference.",
    "Inspect the helper’s arrival, progress and emission rules; source completion is not a general definition of finality.",
    "State and traces are not durable. A production restore must recover source progress, retained state and the sink’s effect contract together."
  ],
  "stream-live-through-kafka": [
    "Per record: serialize, produce, assign an offset, fetch/decode, update one key and observe output. This handshake includes protocol latency and is not a throughput test.",
    "The mock retains five records and the engine holds two keyed totals. Unbounded logs and key cardinality would require explicit limits.",
    "Real Kafka protocol crosses Linux loopback between controller-owned mock and a separate Bytewax engine process. No external network relay is used.",
    "Record n+1 is produced only after result n arrives. Four arrivals therefore occur after the consumer is demonstrably running.",
    "No checkpoint is configured. The controller stops the engine after five verified outputs; destroying either owner loses its volatile state."
  ]
};
export function depth(lesson){return costs[lesson.slug]}
export const mechanism = {
  "follow-an-event": [
    "Trace a discarded order",
    "Order b still costs a predicate evaluation even though no output row is emitted. Track offered, retained and rejected counts separately. With the original threshold, five inputs produce two outputs. Optimizing a downstream stage does not remove the work already spent reading and checking the other three."
  ],
  "keep-state-by-key": [
    "Change cardinality, not only volume",
    "Replay twice as many orders for the same two shops: update work doubles, but there are still two logical accumulators. Now keep the number of orders fixed and assign a unique shop to each: state entries grow. A fair performance investigation varies event count, key count and key frequency independently."
  ],
  "close-a-window": [
    "Make overlap visible",
    "For width ten and slide five, an ordinary interior event participates in two windows. Source completion flushes partial buffers, so end-of-input output differs from a never-ending live run. A sum can retain one accumulator per key/window; a collect operator retains the contributing values. Choose the aggregate before estimating memory."
  ],
  "wait-for-late-events": [
    "Separate the first emission from cleanup",
    "This introductory helper uses a strict timestamp-below-watermark rejection rule. The later correction chapter deliberately uses another policy: retain a previously emitted window and publish revisions until cleanup. Neither policy is universal. Always state the timestamp, progress, retention and output rules together."
  ],
  "replay-without-double-counting": [
    "Inspect the selected implementation",
    "The visible remember callback stores one boolean for each event ID through Bytewax keyed state. A linear list of remembered IDs would have a different lookup cost. The operation-effort chapter instruments that separate reference, rather than attributing its comparisons to the engine."
  ],
  "enrich-a-stream": [
    "A missing lookup is evidence",
    "An unknown region might mean absent reference data, a mismatched key or an out-of-order reference update. Repeatedly retrying a permanent key mismatch wastes work and can block progress. Preserve the original event and enough reference-version provenance to investigate rather than silently filtering it away."
  ],
  "when-the-consumer-falls-behind": [
    "Check conservation before speed",
    "For the complete run, offered equals completed plus dropped plus still queued. A larger queue that hides rejection for a short run has not fixed a sustained rate mismatch. Compare arrival bursts, drain behavior and what happens when the input continues instead of stopping after five ticks."
  ],
  "recover-after-a-failure": [
    "Locate the tested failure boundary",
    "The controller waits for a completed checkpoint before SIGKILL. That is strong evidence for source/state restoration at this boundary, but leaves the external-write/checkpoint race untested. Change checkpoint=False and inspect repeated output prefixes."
  ],
  "read-a-partitioned-log": [
    "Partition count and keyed order",
    "Two partitions permit at most two active partition assignments within a traditional consumer group, although downstream computation may use other parallelism. More partitions do not create a total order. A routing change can move a key’s future records while older records remain in another partition."
  ],
  "give-consumers-their-own-position": [
    "Assignments can move",
    "During a rebalance an assignment moves between group members. A consumer must not continue committing or applying uncontrolled effects as if it still owned the partition. Real client/framework contracts manage assignment epochs and in-flight work. This cursor model intentionally does not implement that protocol."
  ]
};
