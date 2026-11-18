const costs = {
  "follow-an-event": [
    "The filter tests its condition once for each input. The map runs once for each accepted record. With constant-cost functions, total O(n).",
    "O(1) auxiliary operator state; this page collects output in O(n) memory.",
    "No network exchange in the local pipeline. Payload serialization is a separate boundary.",
    "Can emit as each retained record is handled.",
    "Replay repeats transformations; effects downstream need their own retry contract."
  ],
  "evolve-an-event-schema": [
    "O(n) normalizations for constant-sized records; validation of arbitrary nested payloads also depends on bytes and structure.",
    "No remembered IDs; O(n) output including rejection records.",
    "The example reads Python dictionaries prepared in the editor. A wire-format decoder would add work that depends on the encoded bytes.",
    "Each dictionary can be validated as it arrives. The finished list displays accepted data and rejections in input order.",
    "Keep the original record and its schema version if a rejected event may be replayed later."
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
    "The helper scans an in-memory list that stands in for one log partition.",
    "The helper removes offsets below the requested floor, then selects the latest record per key when compaction is on.",
    "Reconstructing current values requires enough retained records and deletions, or a snapshot and the positions from which to continue."
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
    "The input contains the timestamps for both clocks. The helper uses local arithmetic to assign windows.",
    "The trace gives two membership assignments per order. A live window would need a separate rule for when to emit.",
    "Keep the timestamp origin and rule with the fixture so later runs can reproduce the assignments."
  ],
  "close-a-window": [
    "With r overlapping windows, each accepted event can contribute to r collectors. Emitting and sorting the collected events adds work that depends on their count.",
    "collect_window retains event payloads, not only a scalar sum. Retained bytes depend on input rate, window width, overlap and event size.",
    "A real local Bytewax event-time window; no broker transport, replication or distributed exchange is measured here.",
    "EventClock and window close rules govern live progress; bounded-source EOF flushes unfinished windows in this fixture.",
    "A checkpointed live window needs consistent source position, window contents and progress state. This fixture intentionally does not configure recovery."
  ],
  "merge-a-session": [
    "The real SessionWindower groups by event-time gaps. Cost depends on open sessions, merging and collected event ordering; do not infer an indexed complexity bound from this fixture.",
    "collect_window retains each accepted event until its session emits. A long bridged session can retain unbounded history without a separate limit.",
    "One Bytewax worker groups events for one key. A distributed version must route events for a given key to the same owner.",
    "The clock leaves these sessions eligible for merging. Bytewax emits the remaining sessions when input ends.",
    "Restoring open sessions would require the source position, retained events and clock progress together."
  ],
  "wait-for-late-events": [
    "Each record is timestamped and considered by the real Bytewax window operator. Cost depends on open windows and collector size; the diagnostic trace is emitted output.",
    "Accepted open-window records, late outputs and collected results. A larger wait generally retains more event history; it is not free completeness.",
    "One local worker with a TestingSource. Multiple-input watermark coordination and network barriers are advanced reading topics.",
    "The actual late side output reports rejection. EOF flushes open windows. No internal watermark metric is invented for the trace.",
    "Replaying with a different wait can change accepted membership. Record the policy and source fixture with the output."
  ],
  "correct-a-late-result": [
    "O(t) work for t actions, plus the cost of copying trace entries and late output history.",
    "A scalar accumulator suffices for the sum; this teaching trace retains additional historical snapshots.",
    "The Python model reads the watermark actions and events from one fixed sequence.",
    "The watermark triggers the initial output and later cleanup. An eligible record between those actions can revise the total.",
    "A restart would need the accepted total, current revision, progress and the destination’s rule for applying a revision."
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
    "For n orders and m receipts, the helper makes n×m comparisons and writes z matches. A suitable hash algorithm has a different expected bound.",
    "O(n+m+z) input and output records here. An unbounded online join also needs an eviction policy.",
    "Both lists are in local memory. A keyed distributed join would additionally move records to shared key owners.",
    "The nested loops compare every order with every payment in the input lists.",
    "Keep both input histories and the matching rule to reproduce a bounded result. An ongoing join needs a way to restore both source positions and unmatched state."
  ],
  "look-up-the-past": [
    "The helper scans v table versions per event for O(nv) work. A sorted history with binary search could use O(n log v) lookups.",
    "O(v) history plus n output rows. Deleting needed versions changes the answer contract.",
    "The version list is local. A reference table delivered over the network can have its own arrival order.",
    "The helper returns a match for each input using the provided history. An ongoing join would need a rule for when enough history is available.",
    "Reproducing an old answer requires the same reference versions and time lookup rule."
  ],
  "replay-without-double-counting": [
    "One keyed state callback per delivery, with a constant-sized True state value. Routing/key lookup is engine work, distinct from an O(k) linear-list reference algorithm.",
    "One retained state entry per distinct logical ID, plus the scalar final total. Unbounded identity cardinality still means unbounded state.",
    "Bytewax routes identical IDs to the same logical state. This single-worker experiment does not measure a distributed shuffle.",
    "The authored remember callback rejects repeats. fold_final emits the total only at EOF, unlike an incremental running total.",
    "Each run starts without remembered IDs. In a deployed pipeline, replay protection depends on which identities the producer, operator and destination can recover."
  ],
  "recover-after-a-failure": [
    "The engine updates a scalar per input and writes recovery state. The controller polls SQLite, observes completion, kills and starts an actual engine process.",
    "Source position and keyed state are stored in a recovery DB. The second engine can see the input and output files because it starts inside the same run.",
    "Process creation, SQLite I/O and a local output file are real. There is no external transactional sink or replicated checkpoint store.",
    "The kill is delayed until a completed checkpoint exists. Restart restores position 3 and total 25 before processing the final two records.",
    "SIGKILL recovery is verified at the chosen checkpoint. These files are private to the run. A crash between an output write and its checkpoint can duplicate ordinary output on replay."
  ],
  "measure-operation-effort": [
    "Counts n map/update calls and linear-list membership comparisons; n and k are named separately.",
    "O(k) reference entries. Python object/key sizes and hash collision behavior are not represented by entry counts.",
    "The function counts calls and comparisons in memory.",
    "The fixture reports counts after processing all n records.",
    "Record n and k with the result so another run can reproduce the counts."
  ],
  "measure-latency-and-batching": [
    "O(n) scheduling records plus O(n log n) sorting for exact quantiles. Model service costs are authored parameters.",
    "O(n) per-event observations. Real online quantile sketches trade bounded space against approximation.",
    "The single server and its queue are modeled in Python using fixed arrival times.",
    "Every member of a batch becomes visible at its modeled completion time.",
    "The model tracks one uninterrupted schedule. Use a separate failure model to estimate unfinished work or replay."
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
    "The calculation represents backlog with an event count and uses constant input and service rates.",
    "Only service capacity above continuing arrivals reduces the modeled backlog.",
    "The estimate starts when service returns. Measure the time to restore state and restart processing separately."
  ],
  "resolve-the-streaming-incident": [
    "Reference hash membership and keyed sink updates are expected O(1); copied trace lists add historical cost.",
    "Remembered accepted IDs, output revision and diagnostic history. The model does not implement retention expiry for dedup IDs.",
    "One Bytewax worker applies the incident policy and writes replacement totals to an in-memory view.",
    "The supplied watermark actions trigger the first revision and cleanup. Check the trace to see which inputs fall between those points.",
    "This replay starts with empty state. A real restore would need source position, accepted IDs, window progress and a way to apply sink revisions safely."
  ],
  "stream-live-through-kafka": [
    "Per record: serialize, produce, assign an offset, fetch/decode, update one key and observe output. This handshake includes protocol latency and is not a throughput test.",
    "The mock retains five records and the engine holds two keyed totals. Unbounded logs and key cardinality would require explicit limits.",
    "Real Kafka protocol crosses Linux loopback between controller-owned mock and a separate Bytewax engine process. No external network relay is used.",
    "Record n+1 is produced only after result n arrives. Four arrivals therefore occur after the consumer is demonstrably running.",
    "No checkpoint is configured. The controller stops the engine after five verified outputs; destroying either owner loses its volatile state."
  ]
};
export function depth(lesson){return costs[lesson.slug]||lesson.costs}
export const mechanism = {
  "follow-an-event": [
    "Trace a discarded order",
    "Order b still costs a predicate evaluation even though no output row is emitted. Track offered, retained and rejected counts separately. With the original threshold, five inputs produce two outputs. Optimizing a downstream stage does not remove the work already spent reading and checking the other three."
  ],
  "keep-state-by-key": [
    "Change cardinality, not only volume",
    "If twice as many orders still go to two shops, the operator does twice as many updates and keeps two totals. If each order uses a different shop, the operator needs one total per order. A fair performance investigation varies event count, key count and key frequency independently."
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
    "For the complete run, offered equals completed plus dropped plus still queued. A larger queue that hides rejection for a short run has not fixed a sustained rate mismatch. If the two arrivals per tick continue after tick five, a queue served at one record per tick eventually fills and starts dropping records."
  ],
  "recover-after-a-failure": [
    "Locate the tested failure boundary",
    "The controller stops the process after a completed checkpoint. The result shows how that restart recovers source position and state. Testing a crash between a write and the next completed checkpoint would require controlling a different failure point."
  ],
  "read-a-partitioned-log": [
    "Partition count and keyed order",
    "Two partitions permit at most two active partition assignments within a traditional consumer group, although downstream computation may use other parallelism. More partitions do not create a total order. A routing change can move a key’s future records while older records remain in another partition."
  ],
  "give-consumers-their-own-position": [
    "Assignments can move",
    "During a rebalance an assignment moves between group members. A consumer must not continue committing or applying uncontrolled effects as if it still owned the partition. Real client/framework contracts manage assignment epochs and in-flight work. The exercise assigns partitions explicitly and does not trigger a rebalance."
  ]
};
