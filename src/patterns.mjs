const source='https://github.com/bytewax/bytewax/blob/v0.21.1/pysrc/bytewax/operators/__init__.py';
const make=(slug,data)=>({slug,minutes:40,tag:'Real Bytewax',source,...data});
export const patternLessons=[
make('route-and-quarantine',{
 title:'Route and quarantine events',short:'Give invalid records a visible destination.',
 goal:'Decode records, branch a real dataflow and account for every accepted or quarantined input.',
 intro:'One malformed payload should not silently disappear or keep crashing an otherwise useful stream. The shop needs normal orders to proceed and failed records to remain inspectable without treating every failure as retryable.',
 concept:'A decoder turns bytes into a record or an explicit error envelope. Bytewax map executes that decoder; branch splits its outputs into true and false streams. Both branches have sinks. Our authored validation rejects malformed JSON, non-integer amounts and negative amounts. Quarantine preserves the original bytes as base64, which is an encoding, not encryption.',
 code:`from patterns import route_events

result = route_events()`,
 fixture:'Four byte payloads: a valid £12 order, invalid JSON, a negative amount, and a valid £5 order. The decoder retains arrival position and original failed bytes. An optional extra string adds one more payload.',
 predict:'How many inputs reach each branch? Should an invalid amount be retried unchanged until it succeeds?',
 observe:'a and d reach the accepted branch. Two error envelopes retain the failed payloads. input_records equals accounted_for. Branch output order is presented by fixture arrival position; it is not a cross-stream synchronization guarantee.',
 change:'Run route_events(extra=\'{"id":"z","amount":true}\'). JSON true becomes a Python boolean; this contract requires an integer amount. Then try amount 0. Explain the different branch decisions.',
 question:'Does calling a destination a dead-letter queue guarantee that someone can safely replay its contents later?',
 hints:['Retaining bytes is only one part of a replay contract.','You also need schema/version context, original identity and an approved repair.','A replay can reproduce a bad side effect unless its sink is idempotent.'],
 answer:'No. Define ownership, access, retention, error classification, repair/version metadata and a replay procedure. Preserve source identity and distinguish original from repaired data. An unattended error stream is another backlog. Here the quarantine sink is a bounded local list, not a durable production queue.',
 limit:'Real Bytewax map/branch operators and two sinks; authored decoding/validation policy. The quarantine is local and volatile. No durable DLQ, schema registry or automatic retry service is implemented.',
 extra:[['Separate rejection from irrelevance','Malformed data, a permanent business rejection and a valid record that a filter does not need are different outcomes. Do not send all three through an unbounded retry loop. Count each population separately so a small success count does not hide a large rejected input stream.'],['Operate the quarantine','Set an owner, a size/age budget and an alert on growth. A repair should record what changed and why, then replay into a controlled destination with stable identities. Quarantine payloads can contain personal data; base64 does not make them safe to expose in logs.']],
 costs:['One decode/validation per input, then one branch predicate. Parsing work grows with payload bytes and nested structure, not merely record count.','This fixture collects both branches in O(n) output memory. Production buffers and quarantine retention need independent limits.','The branches are real local engine paths. Shipping a DLQ to another system adds serialization, transport and acknowledgement work.','A permanent decoding failure can be routed immediately. Retrying the identical invalid payload does not advance it toward success.','Quarantine and replay need source identity and sink contracts. This local list does not establish durable retention or exactly-once repair.']
}),
make('expand-and-rekey',{
 title:'Expand and re-key a stream',short:'One cart becomes several independently identified lines.',
 goal:'Use flat_map and a new key to explain fan-out, output amplification and aggregate ownership.',
 intro:'The shop sells carts containing several products. Sales wants totals per SKU, so grouping by the original cart ID will not answer the question. The stream first needs a new record shape and a new ownership key.',
 concept:'map returns one output per input; flat_map returns an iterable containing zero, one or many outputs. Each line gets a composite line ID derived from copy, cart and line position. key_on then assigns SKU ownership, and fold_final sums line values at EOF. A line identity and an aggregation key serve different purposes.',
 code:`from patterns import expand_orders

result = expand_orders(copies=1)`,
 fixture:'Two carts contain four lines: two wheels at £5 and one light at £3; one wheel at £5 and one bell at £4. copies repeats the fixture with distinct composite IDs.',
 predict:'How many output lines and SKU totals will two carts produce? If copies doubles, which quantities double and which stay fixed?',
 observe:'Two carts expand to four lines and three SKU totals: wheel 15, light 3, bell 4. The sum is £22. Line IDs remain distinct even when two carts buy the same SKU. Final aggregation emits only when this bounded source completes.',
 change:'Set copies=2. Predict input count, line count, distinct SKU count and each total before executing. Explain why output volume and retained key cardinality are different variables.',
 question:'If an order is replayed, is deduplicating only by SKU a correct way to prevent repeated line contributions?',
 hints:['Different legitimate lines can share one SKU.','An aggregation key decides shared state, not event identity.','A replay needs the same stable line identity as the original delivery.'],
 answer:'No. Deduplicating by SKU discards legitimate purchases. Use a stable line identity for first-delivery policy, then aggregate the accepted lines by SKU. In production, line-position identities also require stable ordering or a source-assigned line ID when carts can be edited.',
 limit:'Real flat_map, key_on and fold_final over finite carts. The result collects line evidence and final totals; no live emission trigger, broker delivery or external sink is configured.',
 extra:[['Budget for output, not only input','With n carts and z lines, downstream work and network volume depend on z. A single pathological cart can create a burst even at a low cart arrival rate. Bound list size, output bytes and per-record work before claiming that a map-like stage is cheap.'],['Know when a total exists','fold_final emits at EOF. A never-ending stream needs incremental state or an explicit window/emission policy. A correct bounded answer cannot be used to infer when a live dashboard would become visible.']],
 costs:['Expansion is O(n+z) for n carts and z constant-sized lines; aggregate work also depends on z and the selected key implementation.','Three scalar SKU accumulators here, plus all collected line/output evidence. More copies increase volume without increasing the SKU set.','Fan-out increases records and bytes sent downstream. Re-keying in a distributed engine can also introduce a network exchange.','Each expanded line can flow immediately; fold_final waits for EOF. Infinite input does not provide a final aggregate automatically.','Stable composite IDs are necessary for replay policy. Changing line ordering or key construction can change identity and ownership across runs.']
}),
make('build-a-materialized-view',{
 title:'Build a materialized view',short:'Updates replace facts; deletes must leave enough history.',
 goal:'Maintain a versioned projection and explain why a tombstone may still need metadata after its visible value is removed.',
 intro:'The catalog emits corrections as well as new products. Adding every observed price into a total is meaningless. The query view should contain the newest accepted value for each product, including deletion.',
 concept:'A materialized view is a stored answer maintained from changes. Our real Bytewax stateful_map holds a version and optional value per product. The authored version guard ignores older or equal versions. A delete removes the visible price but retains its version as a tombstone, preventing a late older update from resurrecting the product.',
 code:`from patterns import materialized_view

result = materialized_view(reject_stale=True)`,
 fixture:'A v1=10; B v1=8; A v2=12; stale A v1=9; A delete v3; stale A v2=11. Versions are assumed to increase within one entity’s history.',
 predict:'Should A remain absent after the final version-2 update? What information is needed to reject that update after deleting A’s visible value?',
 observe:'The final visible view contains only B=8. Two stale updates are ignored and A’s versioned tombstone remains. The trace is sorted by fixture arrival position for display; the state guard belongs to each key.',
 change:'Set reject_stale=False. A is resurrected at 11 after its deletion. Explain why an accurate delete operation alone is insufficient when older messages can still arrive.',
 question:'Can the tombstone metadata be forgotten immediately after the query view removes a product?',
 hints:['A delayed message can arrive after the deletion.','You need a boundary beyond which older versions cannot be replayed.','Retention, source identity and rebuild strategy interact.'],
 answer:'Only with a justified replay/lateness boundary or another authority that rejects stale versions. Otherwise an older event can recreate a deleted value. Define tombstone retention alongside log retention, entity-version authority and rebuild rules. A local version guard does not solve concurrent writers issuing conflicting versions.',
 limit:'Real Bytewax keyed state with an authored version policy and a local upsert view. No external database, source transaction order, global version allocator or atomic projection cutover is established.',
 extra:[['Separate event history from current state','An append-only history can contain several legitimate versions for one product. A current view intentionally compresses that history into the latest accepted fact. Audit and current-query consumers need different outputs; compaction does not preserve the same questions as a complete event log.'],['Version authority is part of the contract','A counter is useful only if its ordering scope is defined. Two writers cannot independently issue version 7 and expect the consumer to invent the correct winner. Include entity identity, version authority, delete semantics and conflict policy in the event contract.']],
 costs:['One version comparison and state update per change, plus key routing. The callback is constant-sized; engine lookup and serialization have separate costs.','O(k) value/version entries for k entities, including retained tombstones. Deleting a visible row does not necessarily delete all consistency metadata.','Projection updates are local here. Writing an external view adds acknowledgement, retries and atomicity concerns.','A new accepted version can replace the current view immediately. Arrival order alone is not used as the version authority.','A rebuild must preserve delete/version semantics. Replaying into a new namespace is safer than overwriting a live view without a cutover plan.']
}),
make('forget-state-deliberately',{
 title:'Forget state deliberately',short:'A smaller state store changes the answers you can defend.',
 goal:'Observe actual Bytewax state deletion and explain why forgetting an identity reopens its duplicate window.',
 intro:'Remembering every event ID forever eventually becomes a storage problem. Forgetting IDs solves that resource problem by weakening which future duplicates can still be recognized. Both consequences belong in the design.',
 concept:'Bytewax stateful_map receives None when a key has no saved state. Returning None as the next state deletes that key’s operator state. This fixture sends an explicit expire control record, then delivers the identity again. The control is authored input, not an automatic processing-time or event-time timer.',
 code:`from patterns import forget_state

result = forget_state(expire=True)`,
 fixture:'Event a, duplicate a, expire a, event a again. The trace records whether the engine supplied previous state to the callback.',
 predict:'After expiry, will the final a be recognized as a duplicate? What change in accepted count should disabling expiry cause?',
 observe:'With expiry, two deliveries are accepted and one is suppressed. The last event has had_state=false, demonstrating that the real stateful operator no longer holds the prior boolean. Without expiry, only the first event is accepted.',
 change:'Set expire=False. Compare accepted/duplicate counts and state presence. Decide which replay delays your chosen policy would need to tolerate.',
 question:'Is a one-hour deduplication horizon sufficient if an operator can restore a checkpoint and replay two hours of input?',
 hints:['A forgotten ID cannot distinguish a replay from a new event with the same ID.','Recovery and backfill may extend beyond ordinary delivery delay.','Sink idempotency can provide a different protection boundary.'],
 answer:'Not by itself. Match identity retention to possible redelivery, recovery and backfill horizons, or rely on an independently idempotent sink/authority. State deletion is a business-contract decision. A production TTL also needs an actual clock, cleanup scheduler and late-return policy, none of which this control-record fixture silently supplies.',
 limit:'Actual keyed-state deletion, driven by explicit fixture controls. No wall-clock TTL scheduler, retained-byte measurement or production state-backend compaction is implemented.',
 extra:[['Logical expiry and physical reclamation','An application can decide that state is no longer usable before a backend has reclaimed every physical byte. Conversely, retaining a small tombstone can be necessary even after a visible value is gone. Ask separately about query semantics, checkpoint contents and storage reclamation.'],['Choose the expiry clock','Processing-time TTL bounds inactivity as observed by a running system. Event-time cleanup follows input progress and can stall behind idle data. Restart, late arrivals and clock skew change the cases each policy must handle. The timer/retention reading develops those distinctions.']],
 costs:['A real keyed callback processes every control and delivery. Deletion removes the logical state entry; backend reclamation cost is implementation-specific.','One boolean for the active identity in this fixture. Bounded retention needs cleanup of all eligible keys, not only an age check when a key happens to return.','No network/state-backend I/O is measured. A distributed backend or checkpoint store can retain additional physical history.','The expire control is explicit input. It is not evidence that a wall-clock or watermark timer fired automatically.','Forgetting identity metadata changes recovery behavior: a sufficiently old replay may be accepted again unless another boundary prevents duplicates.']
}),
make('detect-event-sequences',{
 title:'Detect an event sequence',short:'Two failures followed by success is a stateful question.',
 goal:'Implement a bounded per-key sequence recognizer and name its ordering, horizon and reset policy.',
 intro:'The operations team wants to investigate devices that fail repeatedly before succeeding. A filter can find individual failures, but it cannot explain whether two failures belong to the same recent sequence.',
 concept:'A sequence recognizer remembers partial matches per key. Our real Bytewax stateful_map retains at most two recent failure timestamps per device. A success emits a match only when two failures remain within an inclusive horizon, then clears the sequence state. The fixture is ordered within each device; absence and arbitrary late-event reordering are separate problems.',
 code:`from patterns import detect_sequence

result = detect_sequence(horizon=10)`,
 fixture:'d1 fails at 0 and 3, succeeds at 4, fails at 8 and 9, then succeeds at 11. d2 fails at 1 and succeeds at 20. Source arrival order preserves each device’s event order.',
 predict:'How many d1 matches should a ten-second horizon produce? Does a success without enough recent failures count?',
 observe:'d1 matches at times 4 and 11; d2 never matches. The state resets after each success, so one failure sequence is not reused indefinitely. A smaller horizon can remove an earlier failure from an otherwise similar sequence.',
 change:'Set horizon=2. Explain which failure is missing from each candidate match. State whether equality at the horizon boundary is accepted.',
 question:'If the final success never arrives, can this event-driven callback alone declare that a device failed to recover within ten seconds?',
 hints:['Silence does not call a per-event callback.','A timeout needs a clock and a notification/progress mechanism.','Late success and timeout correction require another explicit policy.'],
 answer:'No. An absence pattern needs scheduled notification and a declared time/progress boundary. Define whether it uses processing time or event time, what counts as idle input, and how a late success revises an alert. Counting duplicate deliveries as separate failures is another risk unless identities are deduplicated first.',
 limit:'A real Bytewax state machine over a bounded per-key ordered fixture. It is not Flink CEP, an absence-timer implementation or a general out-of-order pattern engine.',
 extra:[['Define what is consumed by a match','Overlapping matches can reuse one event or consume it. A restart can replay part of a match. Decide whether a success resets all failures, how duplicate event IDs behave, and which match identity makes an external alert idempotent.'],['A horizon is more than a comparison','This callback only prunes a device’s remembered failures when another event arrives. A production resource bound may also need cleanup for devices that never return. The state-expiry lesson and sequence/absence reading distinguish answer semantics from actual retention.']],
 costs:['At most two remembered failures are checked per event, so this callback has constant-sized per-key work; key routing is separate engine work.','At most two timestamps per observed device, without automatic cleanup of devices that never return. Total state still depends on key cardinality.','All evidence is local. Delivering alerts to an external system adds rate limits, retries and duplicate-effect handling.','Only incoming events trigger this recognizer. Silence does not prove an absence condition without a separate timer/progress contract.','A replay can reconstruct or repeat a match. Stable event and match identities are needed before claiming idempotent alert delivery.']
}),
make('retry-with-a-budget',{
 title:'Retry with a budget',short:'Transient failure is a scheduling decision, not an infinite loop.',tag:'Bytewax + service-failure fixture',
 goal:'Classify failures, enforce an attempt budget and account for retry amplification without confusing planned delays with measured latency.',
 intro:'A dependency sometimes fails temporarily. Another request is permanently invalid. Sending both back immediately and forever turns a small error population into a new source of overload.',
 concept:'The real Bytewax map applies an authored retry policy to a deterministic service-failure fixture. Request a succeeds immediately, b needs three attempts, c is permanently rejected and d never succeeds within the budget. Exponential delays with seeded jitter are recorded as planned values; the operator does not sleep and no external service is called.',
 code:`from patterns import retry_events

result = retry_events(max_attempts=3)`,
 fixture:'a has zero transient failures, b has two, c is permanent, d has more transient failures than any allowed budget. The seed makes delay plans repeatable, not cryptographically random.',
 predict:'How many total service attempts do four records generate? Should c receive three attempts merely because the budget allows them?',
 observe:'a and b succeed; c and d are quarantined. Eight attempts serve four source records. Permanent c stops after one attempt. Planned delays are neither elapsed time nor proof of a nonblocking production retry scheduler.',
 change:'Set max_attempts=2. b now exhausts its budget. Compare success count and attempted work, then explain why raising the budget can reduce sustainable capacity.',
 question:'Can a side-effecting request be retried safely after its response times out?',
 hints:['A timeout does not tell you whether the remote effect happened.','A request identity may need to survive every attempt.','Read-only retries and payment retries have different consequences.'],
 answer:'Only with an appropriate remote idempotency or reconciliation contract. A timeout is an unknown outcome, not proof that no effect occurred. Preserve the same idempotency key across attempts, cap attempts and age, honor retryability/rate limits, and route exhausted or permanent failures with enough context for an owner to resolve them.',
 limit:'Actual Bytewax execution of a bounded policy fixture; no external dependency, real sleeping, asynchronous scheduler, circuit breaker or exactly-once RPC guarantee.',
 extra:[['Do not block the worker with backoff','Sleeping inside a synchronous map blocks that worker’s other records. A production design needs a bounded asynchronous facility, scheduled retry stream or separate worker queue, with preserved per-key ordering where required. A delay plan in this lab is not an implementation of those facilities.'],['Use one retry budget across layers','If a client, operator and downstream service each independently retry three times, one logical request can create many more attempts. Budget total attempts, elapsed age and queued bytes. Add jitter to reduce synchronized retry bursts, and keep permanent failures out of that loop.']],
 costs:['Attempt work is proportional to the sum of attempts, not just input count. Retry amplification consumes CPU and downstream quotas even when final output is unchanged.','The fixture collects attempt evidence. A real delayed-retry system also retains payloads, identities, deadlines and scheduling state.','No RPC occurs here. Production retries repeat serialization, network traffic and potentially external side effects.','Recorded backoff values are plans only. Actual readiness, cancellation and rate limits belong to a real scheduler.','A timeout may follow a completed external effect. Retrying safely requires stable identity and a sink/service contract beyond the engine checkpoint.']
}),
make('run-a-bounded-backfill',{
 title:'Run a bounded backfill',short:'Replay a declared range into a versioned destination.',tag:'Kafka simulator + Bytewax',
 goal:'Read a real partition range twice, apply a versioned transform and explain idempotent rebuild versus production cutover.',
 intro:'A pricing conversion was wrong last week. Replaying everything directly into the live destination risks mixing old and repaired answers. The team needs a declared source range, transformation version and promotion plan.',
 concept:'The helper produces five records into one simulator partition and captures its next log position. A real Kafka Consumer reads the explicit half-open range [start,stop). Bytewax maps pounds to pence. Two identical replays upsert into a local projection-v2 namespace keyed by original event ID. This isolates rebuilt answers and makes repeated writes visible without duplicating the final rows.',
 code:`from patterns import bounded_backfill

result = bounded_backfill(start=1, stop=4)`,
 fixture:'All five original orders are explicitly placed in partition 0, giving offsets 0..4 and next position 5. The default replay reads offsets 1,2,3 twice and uses stable original IDs.',
 predict:'Why should two replays make six write attempts but only three visible rows? Which record is excluded by stop=4?',
 observe:'The versioned view contains b=800, c=500 and d=700 pence. There are six attempted writes and three final rows. Kafka’s low/high offset API describes log positions here, not an event-time watermark.',
 change:'Set stop=3. Predict the offsets, final IDs, write attempts and visible-row count. Keep the namespace and transformation version fixed.',
 question:'Does successfully rebuilding this local view prove it is safe to replace a live production projection?',
 hints:['The live writer may have advanced during the replay.','Offsets, transformation version and destination identity must define the cut.','Validation and atomic/fenced promotion are separate operations.'],
 answer:'No. Establish the source cut and retention coverage, isolate the new view, validate counts/values/deletes, catch up changes after the cut, then promote with an appropriate atomic pointer switch or fencing protocol. Prevent old and new writers from corrupting one namespace. This fixture does not provide production snapshot isolation or a cutover transaction.',
 limit:'Real Kafka simulator reads and real Bytewax mapping; one frozen partition and a local upsert view. No live concurrent writer, broker retention gap, CDC snapshot transaction or atomic promotion is verified.',
 extra:[['Capture a reproducible replay manifest','Record topic/partition identity, starting and exclusive ending positions, schema and transform versions, configuration, code revision and destination namespace. An event-time date range alone may omit late arrivals or require scanning a broader retained log.'],['Distinguish attempts from visible effects','Six write attempts can leave three correct rows under an idempotent upsert contract. That does not mean only three requests happened or that every sink supports the same contract. Capture duplicate receipts, missing IDs and reconciliation evidence beside the final aggregate.']],
 costs:['Read/transform work scales with replayed records and bytes on every pass. Idempotent final state does not remove repeated processing or writes.','The simulator retains the source and the local view retains one row per namespaced identity. Production retention coverage must be checked before replay.','Actual Kafka protocol reads occur over loopback; external snapshot export, network quotas and sink commits are outside this fixture.','A declared exclusive end offset bounds this reader. A date filter or tailing consumer alone does not necessarily establish a finite replay cut.','Versioned namespaces and stable keys support rebuilding. Promotion and coordination with live writers still need an independent production protocol.']
}),
make('join-changing-streams',{
 title:'Join changing streams',short:'Latest values and all combinations answer different questions.',
 goal:'Use a real Bytewax join to compare first, latest and product insertion policies, and account for EOF and output multiplicity.',
 intro:'Two orders and two customer-region updates share a customer key. Should an order be paired with the latest region, the first region, every observed region or the region valid at its event time? Those are different queries.',
 concept:'Bytewax join gathers keyed values from two actual streams. This bounded fixture uses emit_mode=final, so output waits for EOF. insert_mode=last retains the latest value from each side, while product retains the values needed to emit every combination. Neither policy is automatically an event-time interval or as-of join.',
 code:`from patterns import changing_join

result = changing_join(insert_mode='last')`,
 fixture:'For u1: region West, order o1, region East, order o2. A single source branches into keyed order and customer streams. Each side preserves its fixture order; the final result is sorted for presentation.',
 predict:'Will last emit both orders enriched with East, or only the latest order/customer pair? What should product emit?',
 observe:'last emits only o2/East. product emits four pairs: two orders times two region values. first emits o1/West. Output multiplicity follows the chosen state/query contract, not the fact that both inputs share one key.',
 change:'Run product and first, comparing pair count and retained-history requirements. Explain why final mode is unsuitable for an infinite input that never reaches EOF.',
 question:'If o1 happened before the region changed, does product or last establish that its correct historical region is West?',
 hints:['Neither insertion policy compares an order timestamp with a version-validity interval.','All combinations and latest values are not an as-of query.','A temporal contract needs versioned history and an explicit timestamp rule.'],
 answer:'No. A historical lookup needs event timestamps, valid-time version history and a rule for corrections and late records. Product enumerates combinations; last chooses current values under its arrival/insertion contract. Use the temporal reference to specify the desired answer before choosing a real time-aware join and retention policy.',
 limit:'Real Bytewax join over one key and finite branched inputs with EOF emission. No event-time join horizon, history expiry, distributed shuffle or arbitrary cross-input ordering is established.',
 extra:[['The output term belongs in the budget','With n retained values on one side and m on the other, a product can create n×m pairs for one key. A hot key can dominate memory and output even when total input rate looks modest. The interval-join reference counts comparisons separately from this real operator’s observed output.'],['Choose emission independently of storage','Storage mode decides which values are remembered. Emission mode decides when outputs become visible. A live query needs an incremental/windowed policy, not merely a different insertion setting on an EOF-only experiment.']],
 costs:['Product output can require n×m emitted pairs for one key. Latest/first modes retain a different amount of history and answer different questions.','Last mode retains one value per side/key; product retains multiple values. The bounded collector also stores every emitted pair.','Real local keyed join logic runs here. A multi-worker/machine join additionally routes bytes and coordinates state ownership.','emit_mode=final waits for source completion. A never-ending stream cannot depend on this fixture’s EOF trigger.','Consistent recovery needs both input positions and join state. Replaying with another insertion or history policy can change the answer.']
})
];
