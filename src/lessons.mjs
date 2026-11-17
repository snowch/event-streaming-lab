// The complete executable curriculum. Every code block is executed in tests.
export const lessons = [
{
  "slug": "follow-an-event",
  "part": "01 / THE BASICS",
  "title": "Follow an event",
  "short": "From a record to a useful stream.",
  "minutes": 8,
  "tag": "Real Bytewax",
  "goal": "Read an event record and explain which records a filter keeps.",
  "intro": "The bicycle shop wants a live view of larger orders. Before adding a broker or a dashboard, follow five small records through one pipeline.",
  "concept": "An event records something that happened. Our fixture has an ID, a shop, an amount in pounds, and an event timestamp in seconds. A Bytewax Dataflow describes a graph; it does not run until collect attaches a TestingSink and calls run_main. filter keeps matching records; map transforms each retained record. Stable step IDs identify operators in that graph.",
  "predict": "Which order IDs will survive a minimum amount of £9? Does filtering change their arrival order?",
  "code": `import bytewax.operators as op
from bytewax.dataflow import Dataflow
from bytewax.testing import TestingSource
from course import ORDERS, collect

flow = Dataflow('larger_orders')
source = op.input('orders', flow, TestingSource(ORDERS))
selected = op.filter('minimum', source, lambda order: order['amount'] >= 9)
shaped = op.map('shape', selected,
    lambda order: {'id': order['id'], 'pounds': order['amount']})
result = collect(flow, shaped)`,
  "observe": "Find a, b, c, d and e in the input below. The output should contain a and e, in that order. A map transforms the records; it does not sort them.",
  "change": "Change the threshold from 9 to 7. Predict the new IDs before running again.",
  "question": "If the downstream dashboard shows only two orders, can you conclude that only two orders arrived?",
  "hints": [
    "Separate arrival from selection.",
    "Count the input records, then the output records.",
    "The filter rejects b, c and d at the original threshold."
  ],
  "answer": "No. Five arrived, but only two met the predicate. A small output can hide a large input. Capture input and rejection counts when diagnosing a real pipeline.",
  "limit": "This is a finite Bytewax TestingSource in one worker. The Kafka chapters add real protocol clients connected to an in-memory simulator. This source has no broker or durable log.",
  "source": "https://github.com/bytewax/bytewax/blob/v0.21.1/pysrc/bytewax/operators/__init__.py"
},
{
  "slug": "evolve-an-event-schema",
  "title": "Evolve an event schema",
  "short": "A record can parse and still mean the wrong thing.",
  "tag": "Real Bytewax",
  "minutes": 25,
  "goal": "Validate event meaning, preserve rejected evidence, and distinguish compatible shape from compatible semantics.",
  "intro": "A checkout upgrade changes amount from pounds to pence. Every message is valid JSON and the pipeline still runs, yet sales jump by a factor of one hundred. Syntactic compatibility has hidden a business-contract change.",
  "concept": "An envelope carries stable identity, event type, schema version and timestamps around a payload. Validation should check required fields, types, units and constraints. A schema version identifies a contract, not permission to guess. Here version 1 means integer pounds and version 2 means integer pence. Reject an unknown version rather than interpreting it using whichever code happens to run.",
  "code": `import bytewax.operators as op
from bytewax.dataflow import Dataflow
from bytewax.testing import TestingSource
from course import collect

records = [
    {'id':'a', 'version':1, 'amount':12},
    {'id':'b', 'version':2, 'amount':850},
    {'id':'c', 'version':3, 'amount':7},
    {'id':'d', 'version':1, 'amount':-2},
]
def normalize(event):
    if event['version'] not in (1, 2):
        return {'id':event['id'], 'rejected':'unknown version'}
    if type(event['amount']) is not int or event['amount'] < 0:
        return {'id':event['id'], 'rejected':'invalid amount'}
    pence = event['amount'] * 100 if event['version'] == 1 else event['amount']
    return {'id':event['id'], 'pence':pence}
flow = Dataflow('contracts')
source = op.input('records', flow, TestingSource(records))
normalized = op.map('normalize', source, normalize)
result = collect(flow, normalized)`,
  "predict": "Should a and b both be multiplied by 100? What should happen to c when no version-3 contract exists?",
  "observe": "a becomes 1200 pence and b stays 850 pence. c and d produce explicit rejection records. Returning rejection data keeps the stream alive in this example; raising an exception instead fails the dataflow unless an error policy catches it.",
  "change": "Give b version 1 without changing its payload. The result remains type-correct but changes meaning. Explain why a schema checker cannot infer the intended unit.",
  "question": "Can a dead-letter topic alone make a schema change safe?",
  "hints": [
    "Consider who notices and repairs the rejected events.",
    "Think about identity and ordering when repaired records are replayed.",
    "A separate destination does not define a repair procedure."
  ],
  "answer": "No. Specify alert ownership, original payload and error provenance, replay identity, permissions and retention. Validate backward/forward compatibility for the actual schema format, and distinguish structural changes from changes to units or business definitions. Reprocessing must not silently duplicate earlier effects.",
  "limit": "The fixture validates four explicit envelopes. It does not implement a schema registry, a general JSON validator or a dead-letter service.",
  "source": "https://kafka.apache.org/documentation/#design",
  "extra": [
    [
      "Compatibility is directional",
      "An old consumer reading a new producer’s event differs from a new consumer reading retained old events. Test both when a topic outlives deployments. Defaults can bridge an added optional field; they cannot determine an unknown unit or restore a removed identifier. Keep stable event IDs through transformations if downstream deduplication relies on them."
    ],
    [
      "Trace a rejected record",
      "Capture the source partition/offset, schema identifier, error reason and original bytes when available. Separate rejection from temporary processing failure: a timeout might merit retry, while an unsupported version usually needs a deployment or data repair. These distinctions prevent infinite retry loops that block an entire partition."
    ]
  ],
  "fixture": "The complete bounded input is defined in the editable snippet or its named function in course.py. Inspect the helper source before changing a policy. Four records: a (v1, 12 pounds), b (v2, 850 pence), c (unknown v3), d (negative amount)."
},
{
  "slug": "read-a-partitioned-log",
  "part": "05 / FROM PIPELINE TO BROKER",
  "title": "Read a partitioned log",
  "short": "Ordering has a scope.",
  "minutes": 10,
  "tag": "Kafka protocol simulator",
  "goal": "Distinguish a topic, a partition and an offset, and explain ordering within a partition.",
  "intro": "The Python pipeline explains how to process records. Kafka answers a different question: how can producers append events that independent consumers can read later? Start by making that log visible.",
  "concept": "A partition is an ordered sequence with its own offsets. The helper starts librdkafka’s in-memory Kafka simulator, produces JSON records over real client sockets, and reads them with Bytewax KafkaSource. North is explicitly routed to partition 0 and South to partition 1; this is our routing choice, not the default Kafka key hash. Output is sorted per partition for inspection.",
  "predict": "Will order b and order c have the same offset even though they are different events?",
  "code": `from course import partition_log

result = partition_log()`,
  "observe": "Partition 0 contains a, c and d at offsets 0, 1 and 2. Partition 1 contains b and e at offsets 0 and 1. Offset 1 is meaningful only with its partition. Event timestamps may decrease even when offsets increase.",
  "change": "Change the result expression to partition_log()[\"0\"]. Compare the append order with event-time order. Which order would be lost if you sorted the records?",
  "question": "Can you merge two partitions by offset and claim that this reproduces a single global arrival order?",
  "hints": [
    "Two records can share an offset.",
    "Each partition assigns its own positions.",
    "You need another ordering rule to compare different partitions."
  ],
  "answer": "No. Offset order is local to a partition. Merging equal offsets invents an order the logs did not establish. If related events require ordered processing, choose a key and partitioning contract that keeps them together; changing partition counts and producer behavior can affect that contract.",
  "limit": "The producer, Kafka protocol traffic and Bytewax connector are real. The broker is an in-memory librdkafka simulator. Reading this fixture does not establish disk durability, replication, retention or cross-partition ordering.",
  "source": "https://kafka.apache.org/intro",
  "fixture": "Five JSON orders are produced through a real Kafka client. Explicit routing uses partition 0 for North and partition 1 for South. Other automatically created simulator partitions are empty."
},
{
  "slug": "stream-live-through-kafka",
  "title": "Stream live through Kafka",
  "short": "A producer, a socket, and an engine that keeps listening.",
  "tag": "Live Kafka / real Bytewax",
  "minutes": 40,
  "goal": "Observe live Kafka records update real Bytewax keyed state and distinguish broker offsets from state and checkpoint progress.",
  "intro": "The dashboard must update while orders are still arriving. A finite list can teach transformations, but it cannot show a producer sending more work to an already-running consumer. This experiment starts separate producer/controller and Bytewax engine processes inside your browser’s Linux guest.",
  "concept": "The controller owns an in-memory librdkafka Kafka simulator and a real Kafka producer. The child process builds a Bytewax KafkaSource that tails partition 0 and a stateful_map keyed by shop. After the first result arrives, the controller produces the next record. That handshake repeats, proving four events arrive after the engine is already processing. Offsets label records within this partition; the running total belongs to a shop key.",
  "predict": "Which output totals change when the fourth amount changes from 7 to 70? Will the Kafka offsets change?",
  "code": `from live_kafka import live_stream

# A new event is produced only after the previous result arrives.
# All five records use partition 0; keys still own separate totals.
result = live_stream(amounts=[12, 8, 5, 7, 9])`,
  "fixture": "Five live JSON/byte records use keys North,South,North,North,South and amounts 12,8,5,7,9. Explicit partition 0 gives offsets 0..4. The controller produces event n+1 after observing result n, then stops the engine after all five verified results.",
  "observe": "North totals 12 → 17 → 24 and South totals 8 → 17. Offsets advance 0..4 across both keys, because all records share one source partition. live_arrivals=4 records the handshake condition. The final trace contains actual observed results, not a rendered forecast.",
  "change": "Change the fourth amount to 70. Predict North’s final total (87), keep the keys and offsets unchanged, then run. Explain why this alters business state without changing the transport position.",
  "question": "After the controller stops, does the existence of offsets 0..4 prove those records will survive closing this page?",
  "hints": [
    "Identify which component owns the log storage.",
    "The simulator stores records in the controller’s memory.",
    "Offsets identify positions; storage durability is another contract."
  ],
  "answer": "No. The simulator’s log vanishes with its owning process and the guest is discarded after the run. The protocol traffic and Bytewax state updates are real, but broker disk durability and replication have not been tested. Keeping a Kafka-looking offset is not a persistence guarantee.",
  "limit": "Real Kafka producer/consumer sockets and a real Bytewax engine run in separate Linux processes. The server is a one-broker, in-memory librdkafka simulator. The source tails until the controller stops it; no checkpoint, retention or broker failover is configured.",
  "source": "https://github.com/confluentinc/librdkafka/blob/v2.6.1/src/rdkafka_mock.h",
  "extra": [
    [
      "Follow one operation across the boundary",
      "Serialization turns an amount into bytes. The producer sends a Kafka request; the simulator assigns a partition-local offset. KafkaSource polls and decodes a message. key_on/stateful_map route and update one shop’s state, then the observed output returns to the controller. None of these steps makes the sink transactional."
    ],
    [
      "Separate positions from time",
      "An offset is a log position, a watermark expresses event-time progress, and a checkpoint coordinates recoverable state. This experiment has offsets and keyed state but no event-time window or configured checkpoint. The time and recovery chapters add those mechanisms separately."
    ]
  ]
},
{
  "slug": "retain-or-compact-a-log",
  "title": "Retain or compact a log",
  "short": "History and latest state answer different questions.",
  "tag": "Explicit log model",
  "minutes": 25,
  "goal": "Explain retention gaps, compaction, tombstones and bootstrap requirements.",
  "intro": "A new audit consumer starts a week late. The dashboard can reconstruct current customer values, but the original sequence of changes is gone. A latest-value view and a retained event history are different products.",
  "concept": "Retention bounds what history a broker keeps. Compaction preserves a latest value per key over time, subject to broker policies; it does not preserve every intermediate update. A tombstone represents a key deletion. Our bounded helper first drops offsets below a configured floor, then optionally computes an idealized latest-per-key view. Surviving records keep their original offsets.",
  "code": `from course import retained_log

result = retained_log(start=2, compact=True)`,
  "predict": "After offsets 0 and 1 are unavailable, does compaction renumber the remaining offsets from zero?",
  "observe": "The surviving compacted records have offsets 3, 4 and 5. b’s tombstone remains visible. There is no surviving record at position 2, but 2 still has meaning as a seek position. A consumer must distinguish its requested position from the next available record.",
  "change": "Set compact=False and compare a’s updates. Then set start=0. Explain which historical questions each view can answer.",
  "question": "Can a new consumer rebuild a complete state snapshot if required tombstones have expired before it finishes reading?",
  "hints": [
    "Consider a previously materialized value for a deleted key.",
    "Absence of a value and an explicit deletion are different evidence.",
    "A bootstrap procedure needs a history/retention contract."
  ],
  "answer": "Not necessarily. It needs an authoritative snapshot plus a consistent log boundary, or enough retained updates and deletions to reconstruct the intended state. Kafka compaction and tombstone retention have timing and configuration details; an idealized latest-per-key pass is not a proof that every slow bootstrap is safe.",
  "limit": "This is one list-backed partition. Kafka segment deletion, asynchronous compaction, transaction visibility and timestamp-based retention are not executed.",
  "source": "https://kafka.apache.org/documentation/#compaction",
  "extra": [
    [
      "A committed position does not preserve data",
      "A group can remember an offset whose record is no longer retained. A reset policy chooses what to do when a valid starting point is unavailable; choosing earliest cannot resurrect expired history. Treat replay horizon as a recovery requirement before selecting retention."
    ],
    [
      "A log is not automatically an event-sourced system",
      "An event-sourced application also defines event meaning, stable identity, version evolution and reconstruction rules. A topic configured for current-state distribution may be unsuitable for an audit trail. Choose the required questions first: rebuild the present, reproduce a past decision, or retain every accepted business event."
    ]
  ],
  "fixture": "The complete bounded input is defined in the editable snippet or its named function in course.py. Inspect the helper source before changing a policy. Offsets 0..5: a=10, b=8, a=12, c=5, b=tombstone, a=15."
},
{
  "slug": "give-consumers-their-own-position",
  "part": "05 / FROM PIPELINE TO BROKER",
  "title": "Give consumers their own position",
  "short": "Reading does not erase the log.",
  "minutes": 12,
  "tag": "Real Kafka client / simulator",
  "goal": "Explain independent consumer-group positions and identify what an offset commit records.",
  "intro": "Sales needs current totals. Audit needs every retained event. Both should read the same topic without consuming records away from each other.",
  "concept": "A consumer group stores its own next position per partition. This helper sends actual OffsetCommit requests to the simulator, closes that client, then opens a new client and fetches the stored positions. Sales starts at the editable next position and audit starts at zero. Both assign partitions explicitly; this tests offset storage and independent reads, not a membership rebalance.",
  "predict": "Sales has committed position 1 in both partitions. Audit starts at 0. Will audit still see the records sales has already processed?",
  "code": `from course import consume_log

# The committed position is the NEXT offset to read.
# This example applies the same position to both partitions.
result = consume_log(committed=1)`,
  "observe": "Sales skips a and b but still sees c, d and e. Audit sees all five. Reading changes a consumer’s position; it does not delete an event. Retention is a separate broker policy.",
  "change": "Change committed=1 to committed=0. Explain why this replays events for sales. Then try 2: which records will sales skip?",
  "question": "If a consumer commits position 2 before its sink has written the record at offset 1, what happens when it crashes?",
  "hints": [
    "Restart begins at the committed next position.",
    "The log may still hold the skipped record.",
    "Retention and progress are different contracts."
  ],
  "answer": "It resumes at 2 and skips unfinished work at 1 unless another mechanism detects it. Commit-after-write can instead repeat an effect after a crash. The process-recovery drill deliberately waits for a completed checkpoint and does not test that external-write race. Coordinating source progress with sink effects needs an explicit contract; changing a position alone does not solve it.",
  "limit": "Real Kafka consumer commit/fetch requests run against an in-memory simulator. The test uses explicit assignments, without JoinGroup rebalancing or broker persistence. Bytewax KafkaSource separately manages positions through Bytewax recovery, not Kafka group commits.",
  "source": "https://kafka.apache.org/documentation/#intro_consumers"
},
{
  "slug": "choose-the-right-clock",
  "title": "Choose the right clock",
  "short": "The same order can belong to two different windows.",
  "tag": "Explicit clock model",
  "minutes": 25,
  "goal": "Assign the same events using event and processing clocks and explain timestamp-quality failures.",
  "intro": "An offline checkout sends its morning orders at lunchtime. A processing-time dashboard reports a lunchtime spike. An event-time dashboard reports morning sales—once it can decide how long to wait for missing data.",
  "concept": "Event time describes when a business event happened. Processing time describes when a particular operator handles it. Ingestion time is when a selected system accepts it. A timestamp must include units, origin and timezone. The helper uses explicit authored processing timestamps; none is a browser performance measurement.",
  "code": `from course import clock_windows

result = clock_windows()`,
  "predict": "Order c happened at event time 8 but is observed at processing time 13. Which ten-second window does each clock assign it to?",
  "observe": "c belongs to event window 0 and processing window 1. d happened at 3 but is observed at 14, giving another delayed contribution to the earlier event-time window. Increasing the wait cannot repair a timestamp that describes the wrong event in the first place.",
  "change": "Download the source and change the authored observation times. Which event-window assignments should remain invariant? Keep the experiment’s timestamp definitions visible in your report.",
  "question": "A producer accidentally emits a timestamp a year in the future. What can happen to a maximum-seen-minus-delay watermark?",
  "hints": [
    "The maximum timestamp influences every subsequent watermark.",
    "Monotonic progress generally cannot be rewound to rescue older windows.",
    "Validation belongs before advancing time from untrusted timestamps."
  ],
  "answer": "It can advance progress far beyond legitimate records, closing windows and classifying later normal arrivals as late. Validate plausible timestamp ranges, units and clock origins; quarantine suspicious records before they drive progress. A large out-of-order allowance is not a general cure for a bad clock.",
  "limit": "This assigns bounded records to windows. It does not synchronize clocks or implement ingestion timestamp assignment in a broker.",
  "source": "https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/",
  "extra": [
    [
      "Delay is a difference between named boundaries",
      "Event age at queryability includes producer offline time, network transit, queueing and processing. Operator execution latency may include only a small part of it. Store multiple timestamps when diagnosing a delayed result and explain what uncertainty each clock introduces."
    ],
    [
      "Separate disorder from skew",
      "Out-of-order arrival can happen even with correct producer clocks because paths take different amounts of time. Clock skew can make the event timestamp wrong before transport starts. Watermarks encode an application progress policy; they do not establish clock accuracy or causal ordering between producers."
    ]
  ],
  "fixture": "The complete bounded input is defined in the editable snippet or its named function in course.py. Inspect the helper source before changing a policy. Orders a..e have event timestamps 0,12,8,3,25 and authored processing timestamps 0,12,13,14,25."
},
{
  "slug": "close-a-window",
  "part": "02 / TIME & ORDER",
  "title": "Close a window",
  "short": "Give an endless calculation a boundary.",
  "minutes": 12,
  "tag": "Bytewax event-time windows",
  "goal": "Assign records to event-time windows and distinguish tumbling from sliding membership.",
  "intro": "A running total never finishes. The operations team instead asks for ten-second groups of event timestamps. A window gives that calculation a boundary; when its answer becomes visible depends on progress and emission policy.",
  "concept": "A tumbling window has a fixed width and no overlap. A sliding window starts more often than its width, so a record can enter several windows. This helper uses real Bytewax SlidingWindower with an EventClock reading each record’s timestamp. A fixed 30-second wait and frozen wall clock keep this finite fixture deterministic. Source completion flushes open windows; these results do not measure how long a live job waits.",
  "predict": "Events have times 1, 7, 12 and 18. Which values belong in [0,10)? What changes if ten-second windows start every five seconds?",
  "code": `from course import timed_windows

# Four records at event times 1, 7, 12 and 18.
# Real EventClock + SlidingWindower; EOF flushes open windows.
result = timed_windows(width=10, slide=10)`,
  "observe": "The [0,10) window contains a and b; [10,20) contains c and d. The result shows membership, not observed wall-clock emission times. A slide of five creates overlapping memberships, including windows starting before zero.",
  "change": "Set slide=5 while keeping width=10. Count each event’s memberships and identify the windows that start before the alignment origin.",
  "question": "If a record carries an old timestamp, will this built-in operator automatically move it into an earlier buffer?",
  "hints": [
    "Find the clock supplied to the window operator.",
    "EventClock explicitly extracts each record’s timestamp.",
    "An earlier event-time window can still accept a record while it remains open."
  ],
  "answer": "The clock configuration determines which time is read. Here EventClock explicitly extracts the timestamp, so an accepted out-of-order event can enter its earlier event-time window while that window remains open. A processing-time clock would answer a different question.",
  "limit": "This is a real Bytewax event-time operator with a deterministic clock. EOF flush, a generous wait and a four-event bounded source differ from a live infinite stream. No virtual scheduler throughput is measured.",
  "source": "https://github.com/bytewax/bytewax/blob/v0.21.1/pysrc/bytewax/operators/windowing.py",
  "fixture": "Four records: a at event time 1, b at 7, c at 12, d at 18. The wall clock is frozen; EventClock waits 30 seconds. EOF flushes unfinished windows."
},
{
  "slug": "merge-a-session",
  "title": "Merge a session",
  "short": "A late event can connect two groups.",
  "tag": "Bytewax session windows",
  "minutes": 30,
  "goal": "Explain why session boundaries depend on data and why late bridging can require merging state.",
  "intro": "A shopper clicks at times 0 and 8. With a five-second inactivity gap, these initially look like two sessions. A delayed click at 4 arrives and connects them. Counting sessions without revising earlier assumptions gives the wrong answer.",
  "concept": "A session groups nearby events for a key according to an inactivity gap, rather than fixed boundaries. This helper uses real Bytewax SessionWindower with gap=5 and collect_window to retain members. Its EventClock waits 30 seconds with frozen wall time, keeping this fixture open long enough for the out-of-order bridge at time 4. The trace lists final emitted sessions; intermediate engine state is not exposed.",
  "code": `from course import sessions

result = sessions(gap=5)`,
  "predict": "After arrivals 0 and 8 there are two groups. After 4 arrives, how many groups should those three events occupy?",
  "observe": "Real Bytewax SessionWindower merges times 0, 4 and 8 into one session at gap=5, despite the arrival order 0, 8, 4, 20. The returned trace lists final emitted sessions; it does not show intermediate internal engine state.",
  "change": "Try gap=3, then gap=8. Compare final membership. Use arrival order 0,8,4,20 to explain how a bridge can combine groups. The trace shows final emissions, so distinguish your reasoning about intermediate work from observed internal engine state.",
  "question": "If the first session was already emitted and its state discarded, can the late bridging event be handled by simply adding one to a session counter?",
  "hints": [
    "The bridge may change the number of sessions as well as their aggregate.",
    "State is needed to know which sessions merge.",
    "Previously emitted results may need retraction or replacement."
  ],
  "answer": "No. An exact correction may require the earlier session state and a way to revise its output. Choose a lateness/retention policy and a changelog contract, or route the bridge to a separate correction process once state is gone. A fixed-size counter cannot reconstruct forgotten membership.",
  "limit": "A real one-key Bytewax SessionWindower with a frozen clock and a 30-second wait. EOF flushes sessions. Processing-time triggers, multi-input idleness and distributed ownership are separate investigations.",
  "source": "https://github.com/bytewax/bytewax/blob/v0.21.1/pysrc/bytewax/operators/windowing.py",
  "extra": [
    [
      "The merge function is part of correctness",
      "A session aggregate needs a way to combine state when groups merge. Sum and count have simple associative combinations. A median or ordered event history may require more information. Here Bytewax collect_window retains full members; a compact accumulator would have a different memory contract."
    ],
    [
      "A session is a policy, not a psychological fact",
      "A five-second gap is an analytical definition. It does not prove whether two visits belong to one person or one intent. State what key identifies a visitor, how identity changes are treated, and how late events affect already published session counts."
    ]
  ],
  "fixture": "The complete bounded input is defined in the editable snippet or its named function in course.py. Inspect the helper source before changing a policy. One key; arrival timestamps 0,8,4,20. Gap equality is merged. Sessions remain open until EOF."
},
{
  "slug": "wait-for-late-events",
  "part": "02 / TIME & ORDER",
  "title": "Wait for late events",
  "short": "Trade a faster answer for a more complete one.",
  "minutes": 14,
  "tag": "Bytewax EventClock",
  "goal": "Explain a watermark, route late events, and identify the latency/state tradeoff.",
  "intro": "A mobile checkout uploads an order late. A window has already closed without it. The sales dashboard is consistent with arrival order, but disagrees with when the sale happened.",
  "concept": "Event time is when something happened; processing time is when an operator handles it. Bytewax EventClock extracts timestamps and tracks event-time progress with a configured wait. Here wall time is frozen, so input timestamps drive this experiment. collect_window exposes accepted window results and a separate late stream. The output trace contains actual emissions; it does not expose an internal watermark metric. The trace presents collected windows followed by late records; it is not a captured temporal schedule.",
  "predict": "Arrival timestamps are 0, 12, 8, 3 and 25. With a five-second wait, will order d at time 3 still be accepted?",
  "code": `from course import event_time

# Real EventClock + TumblingWindower + collect_window.
# Inspect course.py for the clock and late side output.
result = event_time(wait=5)`,
  "observe": "Order d at time 3 appears on the real late side output. The first window contains a and c, totaling £17. At wait=30, d joins that window and the total becomes £24. Accepted records are ordered by event time inside each collected window. EOF flushes open windows.",
  "change": "Change wait=5 to wait=30. Compare window membership and the late list. Explain which records the engine must retain longer.",
  "question": "Does increasing the wait guarantee that every real-world event will be accepted?",
  "hints": [
    "Our fixture is finite. A production delay might not be.",
    "A bound on observed delay is an assumption.",
    "Consider an offline device returning tomorrow."
  ],
  "answer": "No finite wait guarantees all possible arrivals. A larger wait delays final results and retains more state. Choose an explicit policy for very late data: discard, side output, or corrections. This lab uses a late list rather than silent loss.",
  "limit": "These are actual Bytewax windows and late outputs in one worker. The frozen clock makes a bounded replay repeatable; it does not simulate multiple-input watermarks or prove that a particular wait bounds all real-world delays.",
  "source": "https://github.com/bytewax/bytewax/blob/v0.21.1/pysrc/bytewax/operators/windowing.py"
},
{
  "slug": "correct-a-late-result",
  "title": "Correct a late result",
  "short": "Closing a window and forgetting it are separate decisions.",
  "tag": "Explicit correction model",
  "minutes": 35,
  "goal": "Distinguish watermark delay, allowed lateness, initial emission and state cleanup.",
  "intro": "The first sales result for [0,10) is £10. A delayed £5 order for that window arrives after its first emission. You can reject it, revise the result, or store a correction elsewhere. The choice must reach the sink as well as the window operator.",
  "concept": "Our earlier lab rejected every event below its watermark. This alternative policy emits when watermark reaches window end 10, retains state until watermark reaches 10 plus allowed lateness, and emits a replacement after an accepted late update. It rejects subsequent contributions once cleanup happens. This makes two controls distinct: delaying progress before first emission and retaining state after that emission.",
  "code": `from course import corrections

result = corrections(lateness=5)`,
  "predict": "The watermark reaches 10, then b arrives, then the watermark reaches 15, then c arrives. Which late event can still correct the window?",
  "observe": "The output contains revision 1 with total 10 and revision 2 with total 15. b is accepted during retention; c goes to the late list after cleanup. Revisions are replacement totals, not additional sales.",
  "change": "Set lateness=0. Explain why b now joins c in the late output even though the window’s first result is still emitted. Then use lateness=10 and explain c’s changed treatment.",
  "question": "If a downstream system sums the two replacement totals 10 and 15, what result will it compute, and why is that wrong?",
  "hints": [
    "The same window key appears twice.",
    "A replacement describes a new state, not a new contribution.",
    "The sink must understand revisions or consume deltas."
  ],
  "answer": "It computes 25, although accepted sales total 15. Use a keyed upsert with a version rule, a retraction followed by an insertion, or correct deltas. Delayed output alone is not a universal solution: choose whether the product requires provisional results, corrections or a final bounded answer.",
  "limit": "This helper uses explicit watermark actions and a single window. It does not demonstrate actual Flink triggers, distributed progress or exactly-once sink commits.",
  "source": "https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/windows/",
  "extra": [
    [
      "Cleanup and policy boundaries",
      "At watermark 15 this model discards the state required to revise [0,10) when allowed lateness is five. Equality at the cleanup boundary is rejected by this convention. Boundary tests belong in the contract; do not infer them from a diagram. A framework may use a last representable timestamp inside a half-open window."
    ],
    [
      "What a side output preserves",
      "A late side output should retain event identity, the original timestamp and the policy/position that caused rejection. It enables auditing or a later batch correction. It does not automatically repair the already published aggregate. Define who consumes it and how an eventual correction avoids duplicate effects."
    ]
  ],
  "fixture": "The complete bounded input is defined in the editable snippet or its named function in course.py. Inspect the helper source before changing a policy. One [0,10) window: a=10; watermark 10; b=5; watermark 15; c=7. All events belong to that window."
},
{
  "slug": "keep-state-by-key",
  "part": "01 / THE BASICS",
  "title": "Keep state by key",
  "short": "Two shops. Two running totals.",
  "minutes": 10,
  "tag": "Real Bytewax",
  "goal": "Explain how keyed state differs from a single running total.",
  "intro": "North and South need separate sales totals. Adding every order into one number gives the company total, but answers neither shop’s question.",
  "concept": "A key identifies records sharing state. key_on attaches a shop key. stateful_map calls add with the previous state for that key, or None initially. The callback returns a pair: next state and one output value. Bytewax owns these accumulators; a Python closure is not the state backend. The final sort presents rows by fixture arrival ID, without establishing ordering across keys.",
  "predict": "What will North’s total be after its third order? Will South’s orders change it?",
  "code": `import bytewax.operators as op
from bytewax.dataflow import Dataflow
from bytewax.testing import TestingSource
from course import ORDERS, collect

flow = Dataflow('shop_totals')
source = op.input('orders', flow, TestingSource(ORDERS, batch_size=1))
keyed = op.key_on('shop', source, lambda order: order['shop'])
def add(total, order):
    total = (total or 0) + order['amount']
    return total, {'arrival':order['id'], 'shop':order['shop'], 'total':total}
updated = op.stateful_map('sum', keyed, add)
rows = collect(flow, updated)
# Present updates in original arrival order; no cross-key ordering guarantee.
result = sorted([row for key, row in rows], key=lambda row: row['arrival'])`,
  "observe": "North advances through 12, 17 and 24. South advances through 8 and 17. Each update belongs to one key; event time does not reorder this computation.",
  "change": "Replace the shop key with the constant \"all\". Explain why only one accumulator remains.",
  "question": "What happens to memory if a never-ending stream introduces a new key on every event?",
  "hints": [
    "Think about how many groups remain reachable.",
    "A group needs somewhere to keep its accumulator.",
    "This example does not expire idle keys."
  ],
  "answer": "State can grow with the number of distinct keys. A real long-running design needs key expiry, bounded cardinality, or a state backend with an explicit retention policy. A window is one way to bound the time span of an aggregate.",
  "limit": "One real Bytewax worker, with no recovery configuration in this lesson. Stop destroys this VM and its in-memory accumulators. The recovery chapter adds a checkpoint database.",
  "source": "https://github.com/bytewax/bytewax/blob/v0.21.1/pysrc/bytewax/operators/__init__.py"
},
{
  "slug": "enrich-a-stream",
  "part": "03 / RELIABLE RESULTS",
  "title": "Enrich a stream",
  "short": "A small lookup changes the meaning of a record.",
  "minutes": 10,
  "tag": "Real Bytewax",
  "goal": "Explain stream-table enrichment and choose a policy for missing keys.",
  "intro": "A regional dashboard needs the region of each shop. Order records carry a shop name, so each order must look up a second piece of information.",
  "concept": "Enrichment adds context to an event. A stream-table lookup uses a current table to enrich each arriving record. This differs from a stream-stream join, which must decide how long to wait for a matching event and how long to retain unmatched state.",
  "predict": "The lookup contains only North. Should South disappear, fail the pipeline, or keep an explicit unknown region?",
  "code": `import bytewax.operators as op
from bytewax.dataflow import Dataflow
from bytewax.testing import TestingSource
from course import ORDERS, collect

regions = {'North': 'Yorkshire'}
flow = Dataflow('enrichment')
source = op.input('orders', flow, TestingSource(ORDERS))
enriched = op.map('lookup', source, lambda order: {
    'id': order['id'], 'shop': order['shop'],
    'region': regions.get(order['shop'], 'unknown')
})
result = collect(flow, enriched)`,
  "observe": "Every order survives. South is labelled unknown because the lookup is missing; that is not the same as a known region named unknown. This example chooses to preserve the record for investigation.",
  "change": "Add South to the lookup. Then replace get with direct indexing and remove South again. Inspect the actual Python error.",
  "question": "If a shop changes region tomorrow, should replaying yesterday’s orders use the old region or the new one?",
  "hints": [
    "Ask what question the report answers.",
    "A current lookup and a historical lookup answer different questions.",
    "A temporal lookup needs version history and a time rule."
  ],
  "answer": "It depends on the report’s contract. Current-organisation reporting may use the latest mapping. Historical reporting needs the mapping valid at the event’s time. A plain dictionary has no version history, so it cannot make that decision for you.",
  "limit": "This is an in-memory stream-table lookup, not a distributed or temporal join.",
  "source": "https://github.com/bytewax/bytewax/blob/v0.21.1/pysrc/bytewax/operators/__init__.py"
},
{
  "slug": "count-the-join-output",
  "title": "Count the join output",
  "short": "One event can create more than one answer.",
  "tag": "Bounded join reference",
  "minutes": 30,
  "goal": "Calculate join multiplicity, explain interval bounds and distinguish match state from output volume.",
  "intro": "Order x has two payment receipts with matching IDs. A join produces two rows. If the dashboard treats both as one paid order each, its count doubles even though the join followed its specified rule.",
  "concept": "A stream-stream join matches records from two histories. Our nested-loop reference accepts a payment when its ID matches and its timestamp is between zero and horizon seconds after the order, inclusive. The code retains both finite inputs so you can inspect every candidate. A real online join needs progress and retention rules in addition to this predicate.",
  "code": `from course import interval_join

result = interval_join(horizon=10)`,
  "predict": "How many output rows should order x produce? Does y’s receipt at 20 match an order at 4 with horizon 10?",
  "observe": "x matches p1 and p2; y has no match. There are six candidate comparisons for two orders and three receipts. An index can reduce candidate search but cannot eliminate the cost of emitting two legitimate matches.",
  "change": "Increase horizon to 20. Then inspect the helper and add another x receipt. Explain why output size can grow even when the number of logical order IDs does not.",
  "question": "Can a hash join always make a many-to-many join O(n+m) total work?",
  "hints": [
    "Hashing helps locate matching groups.",
    "Every matching pair may still need to be emitted.",
    "Include output cardinality z in the cost expression."
  ],
  "answer": "No. A useful expected bound is O(n+m+z) for suitable hash-based matching, with additional qualifications for collisions, time indexing and state maintenance. If every left row matches every right row, z is n×m. No lookup structure makes emitting that result linear in input size.",
  "limit": "This is an executed nested-loop reference, not a distributed hash join. It does not evict unmatched state or emit outer-join revisions.",
  "source": "https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/table/sql/queries/joins/",
  "extra": [
    [
      "Bound the search and the retained history",
      "An interval bound constrains which event-time pairs can match. To safely discard an old order online, progress on the payment input must establish that no further accepted match can occur under the late-data policy. Processing-time age alone answers a different question."
    ],
    [
      "Choose the business cardinality",
      "If each order should have one final payment, decide whether repeated receipts are duplicates, installments or conflicting updates. Deduplication by receipt ID differs from choosing one payment per order. Validate that rule before aggregating the join’s output."
    ]
  ],
  "fixture": "The complete bounded input is defined in the editable snippet or its named function in course.py. Inspect the helper source before changing a policy. Orders x@0,y@4. Receipts x@7=p1,x@9=p2,y@20=p3. Interval bounds are inclusive."
},
{
  "slug": "look-up-the-past",
  "title": "Look up the past",
  "short": "Latest context can rewrite yesterday.",
  "tag": "Temporal lookup model",
  "minutes": 30,
  "goal": "Select reference-data versions by valid time and explain the history needed for late events.",
  "intro": "North moves from West to East at time 10. An order from time 8 arrives after the move. Enriching it with the latest mapping assigns historical sales to East; a valid-time report assigns them to West.",
  "concept": "A temporal lookup selects the reference version valid at an event’s chosen timestamp. Our fixture has versions effective at 0 and 10, and uses the greatest effective time less than or equal to the order time. This is a valid-time convention. The time when your system learned about the move is a separate transaction/knowledge-time dimension.",
  "code": `from course import temporal_lookup

result = temporal_lookup(history=True)`,
  "predict": "Events arrive with timestamps 5, 12 and 8. Should the final event receive the same region as the second event?",
  "observe": "The as-of sequence is West, East, West. Arrival order does not change which version was valid. With history=False, all three use East because the helper chooses the latest available mapping.",
  "change": "Switch to history=False and explain what business question that report now answers. Then inspect how equality at event time 10 selects the new version.",
  "question": "What extra information is needed to reproduce the report as it was known yesterday, rather than the report corrected with today’s historical knowledge?",
  "hints": [
    "A version can be valid in the past but arrive in your system later.",
    "An effective timestamp alone does not record when the system learned it.",
    "You need a second timeline or an immutable audit of published decisions."
  ],
  "answer": "Preserve knowledge/transaction time or the exact input/version snapshot used for the earlier report. Valid-time history alone reconstructs what the latest knowledge says was true then. It cannot reproduce an earlier decision if historical reference data has since been corrected.",
  "limit": "This is a finite as-of lookup over two versions. It does not implement a Flink temporal join, a bitemporal database or distributed version retention.",
  "source": "https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/table/sql/queries/joins/#temporal-joins",
  "extra": [
    [
      "Late data creates a history requirement",
      "If orders may arrive a day late, deleting all old reference versions after an hour makes some correct enrichments impossible. Define a retained-history horizon, missing-version policy and recovery source. Retention is not just a storage optimization; it changes which answers can be reproduced."
    ],
    [
      "Replaying a report needs a version contract",
      "Record the transformation version and reference snapshot or temporal selection policy beside output provenance. A replay using a mutable latest lookup may produce different results even when the source order log is unchanged. That can be intentional, but it should be a named rebuild rather than a mysterious disagreement."
    ]
  ],
  "fixture": "The complete bounded input is defined in the editable snippet or its named function in course.py. Inspect the helper source before changing a policy. Reference versions West effective at 0 and East effective at 10. Arrivals carry event times 5,12,8."
},
{
  "slug": "replay-without-double-counting",
  "part": "03 / RELIABLE RESULTS",
  "title": "Replay without double counting",
  "short": "One order can have two deliveries.",
  "minutes": 10,
  "tag": "Bytewax + identity policy",
  "goal": "Separate event identity from delivery and explain the scope of deduplication.",
  "intro": "A consumer restarts and reads an order again. Replaying is useful for rebuilding state, but naïvely adding every delivery inflates revenue.",
  "concept": "Replaying a log can deliver the same logical event again. key_on uses the event ID; our remember callback stores True after the first delivery and emits None on duplicates. A filter removes those duplicate markers. fold_final sums the retained orders and emits only at end of input. The first-delivery rule is authored policy implemented through real Bytewax keyed state.",
  "predict": "We replay a and b after the five original events. What are the totals before and after deduplication?",
  "code": `import bytewax.operators as op
from bytewax.dataflow import Dataflow
from bytewax.testing import TestingSource
from course import ORDERS, collect

flow = Dataflow('deduplicate')
source = op.input('deliveries', flow, TestingSource(ORDERS + ORDERS[:2]))
keyed = op.key_on('identity', source, lambda order: order['id'])
def remember(seen, order):
    return True, None if seen else order
marked = op.stateful_map('first_delivery', keyed, remember)
first = op.filter('keep_first', marked, lambda row: row[1] is not None)
all_orders = op.map('one_total', first, lambda row: ('ALL', row[1]))
summed = op.fold_final('sum', all_orders, lambda: 0,
    lambda total, order: total + order['amount'])
result = [total for key, total in collect(flow, summed)]`,
  "observe": "Seven deliveries produce five distinct logical orders and a total of £41. The final accumulator emits at EOF. Remembering an ID is different from coordinating a checkpoint with an external sink.",
  "change": "Change the identity key from order ID to shop. Predict which real orders are now incorrectly discarded, then run again.",
  "question": "Would remembering every ID forever be a safe design for an unbounded event stream?",
  "hints": [
    "Consider both memory and identity lifetime.",
    "A bounded retention period changes the guarantee.",
    "A duplicate might arrive after an ID has expired."
  ],
  "answer": "Not without a bounded identity space or managed storage. Time-limited deduplication bounds memory but accepts duplicates arriving after expiry. Define ID uniqueness and retention together, and make those limits part of the contract.",
  "limit": "The identity policy retains one state entry per distinct ID with no expiry. This is neither a Kafka idempotent-producer guarantee nor end-to-end exactly-once output.",
  "source": "https://github.com/bytewax/bytewax/blob/v0.21.1/pysrc/bytewax/operators/__init__.py"
},
{
  "slug": "recover-after-a-failure",
  "part": "04 / FLOW & RECOVERY",
  "title": "Recover after a failure",
  "short": "The write succeeded. The offset did not.",
  "minutes": 14,
  "tag": "Real process recovery",
  "goal": "Verify that a killed Bytewax process restores a source position and keyed state, and identify what this does not guarantee.",
  "intro": "A process vanishes after processing three values. Restarting at the beginning would repeat those values. Restarting only the source while losing its running total would produce the wrong answer. The recovery configuration must restore them together.",
  "concept": "A Bytewax checkpoint records operator state and a resumable source position. This experiment uses a real child engine process and a seekable authored source. The controller observes completed recovery state in SQLite, kills the process with SIGKILL, extends the input, and starts a new engine. Checkpoint files live on the guest’s volatile filesystem and survive this process kill only.",
  "predict": "The first process reads 12, 8 and 5, reaching 25. After restart it sees 7 and 4. What source position and total must be restored to finish at 36?",
  "code": `from course import recover

# Wait for a completed Bytewax checkpoint, SIGKILL the engine,
# then restart it with the same source and recovery database.
result = recover(checkpoint=True)`,
  "observe": "resumed_from is 3 and restored_total is 25. Outputs are 12,20,25,32,36. These are verified after an actual process kill. The controller waits for a completed checkpoint before killing, so it deliberately chooses a safe recovery boundary.",
  "change": "Set checkpoint=False. The second process deliberately ignores the saved recovery configuration. Three inputs repeat and output history contains repeated prefixes, although the restarted sum still finishes at 36.",
  "question": "If the process is killed after a visible sink write but before that write is represented by a completed checkpoint, can this ordinary output file prevent a duplicate effect?",
  "hints": [
    "The output file is separate from Bytewax recovery metadata.",
    "Our controlled crash waits for a completed checkpoint.",
    "A stronger claim needs a transactional or idempotent sink contract."
  ],
  "answer": "No. A process checkpoint alone does not atomically commit an arbitrary external effect. This drill verifies source and state restoration at a controlled completed checkpoint. An uncontrolled write/checkpoint race needs sink-specific coordination or idempotency and another failure experiment.",
  "limit": "A real SIGKILL/restart inside one Linux guest, with a seekable file source and SQLite recovery. The volatile filesystem disappears with the VM. The ordinary append-only output is not transactional and this is not an end-to-end exactly-once proof.",
  "source": "https://kafka.apache.org/documentation/#semantics",
  "fixture": "Initial input: 12,8,5. The controller waits for source position 3 and state 25 in a completed checkpoint, then SIGKILLs the engine. Input becomes 12,8,5,7,4 before restart."
},
{
  "slug": "measure-operation-effort",
  "title": "Measure operation effort",
  "short": "Count the work before timing it.",
  "tag": "Instrumented reference algorithms",
  "minutes": 35,
  "goal": "Use per-event work, cardinality and output size to qualify Big-O claims.",
  "intro": "A pipeline with eight events feels instantaneous. Increase distinct keys and a deduplication step slows down. Counting comparisons can expose the cause before noisy timings obscure it.",
  "concept": "Big-O describes asymptotic growth under a stated algorithm and input model. Let n be events and k be retained distinct keys. A constant-cost map does O(n) total work. A hash-backed keyed sum has expected O(1) lookup/update per event and O(k) entries, excluding key/value sizes. A linear-list deduplicator may perform O(nk) comparisons. These are different algorithms, not different labels for the same operator.",
  "code": `from course import operation_effort

result = operation_effort(n=8, keys=2)`,
  "predict": "If you increase distinct keys from 2 to 8 while keeping n=8, which counts should change and which must stay fixed?",
  "observe": "Map calls and aggregate updates stay at eight. Retained key entries grow from two to eight; linear deduplication comparisons grow from ten to twenty-eight. This fixture counts reference operations, not CPU instructions or Bytewax’s private implementation steps.",
  "change": "Try n=16 with keys=2, then n=16 with keys=16. Explain why the all-distinct linear deduplicator performs n(n−1)/2 comparisons before discussing its Big-O bound.",
  "question": "Does an O(n) map guarantee bounded memory for the entire stream-processing job?",
  "hints": [
    "The operator and the complete pipeline have different boundaries.",
    "Output buffering, retained state and downstream speed matter.",
    "Record size is another variable."
  ],
  "answer": "No. The function can use constant auxiliary state while downstream queues grow or a sink retains all results. State a boundary and variables: per-event function cost, operator state, queued bytes and retained output. For an unbounded stream, per-event and retained-state costs are often more useful than one total O(n) label.",
  "limit": "Counters describe the explicit reference implementations. They are not a benchmark or a claim about Bytewax’s internal identity lookup.",
  "source": "https://github.com/bytewax/bytewax/blob/v0.21.1/pysrc/bytewax/operators/__init__.py",
  "extra": [
    [
      "Count bytes and output amplification",
      "A shuffle of n records costs network work proportional to serialized bytes and protocol behavior, not merely n. A sliding window can update several accumulators per event. A many-to-many join can emit z pairs. Name event size, overlap factor, distinct keys and output cardinality before comparing designs."
    ],
    [
      "An implementation can change the bound",
      "A hash lookup’s expected constant time is conditional on its key/hash behavior. A sorted index, linear list and tree have different maintenance and lookup costs. Inspect the selected version’s source or instrument a reference before attributing a complexity claim to a library. The downloadable native harness measures actual Bytewax execution separately."
    ]
  ],
  "fixture": "The complete bounded input is defined in the editable snippet or its named function in course.py. Inspect the helper source before changing a policy. Keys cycle as i modulo keys for integers i from 0 to n−1."
},
{
  "slug": "measure-latency-and-batching",
  "title": "Measure latency and batching",
  "short": "A higher throughput can hide a longer wait.",
  "tag": "Deterministic queueing model",
  "minutes": 35,
  "goal": "Compute completed-event latency quantiles and explain batching, waiting and omitted populations.",
  "intro": "Batching reduces repeated setup work. It also makes early events wait for a batch to fill. A faster total run can make one customer’s order appear later.",
  "concept": "The model has eight authored arrival times in milliseconds. A single FIFO server pays two milliseconds of setup per batch and three per record. A batch becomes available when its last member arrives; every member completes at the batch’s end. The nearest-rank p99 of eight completed observations is simply the maximum—it is not a well-estimated production tail percentile.",
  "code": `from course import latency_run

result = latency_run(batch=1)`,
  "predict": "If batch grows from 1 to 4, will the first event finish earlier because setup work is shared?",
  "observe": "Inspect arrival, service start and completion together. With batch 1 the first event finishes at 5 ms. With batch 4 it waits for the fourth arrival at 10, then finishes at 24. Fewer setup costs do not guarantee lower per-event latency.",
  "change": "Compare batch=1, 2 and 4. Keep input times and service costs unchanged. Report total completion time, p50, maximum/p99, and which record got worse.",
  "question": "Can p99 among completed events look healthy while the system is overloaded?",
  "hints": [
    "Look for records missing from the observed population.",
    "A finite observation can omit all the records still queued.",
    "Failure and timeout counts belong beside quantiles."
  ],
  "answer": "Yes. A completed-only population can omit the slowest unfinished or dropped events. Report offered, admitted, completed, rejected and still-pending counts alongside duration and quantiles. In a real load generator, distinguish an externally scheduled arrival process from a closed-loop client that waits before sending more work.",
  "limit": "These are computed model milliseconds, not measured browser latency or a benchmark of Flink/Kafka.",
  "source": "https://sre.google/sre-book/monitoring-distributed-systems/",
  "extra": [
    [
      "Choose a measurement boundary",
      "Event-to-visible-result latency includes every wait in the chosen path. Operator service time excludes upstream queues and downstream visibility. Polling a database adds detection delay. Record IDs connect observations; timestamp definitions and clock uncertainty determine whether subtraction is meaningful."
    ],
    [
      "Run a real local measurement too",
      "The Field notes link a native Bytewax harness that verifies answers before reporting service throughput. Run independent trials and save raw observations. It does not generate an open-loop distributed load or establish Kafka/Flink capacity; that needs a real topology, controlled offered load and source-to-sink verification."
    ]
  ],
  "fixture": "The complete bounded input is defined in the editable snippet or its named function in course.py. Inspect the helper source before changing a policy. Authored arrivals in ms: 0,1,2,10,11,12,20,21; setup 2ms per batch and service 3ms per record."
},
{
  "slug": "when-the-consumer-falls-behind",
  "part": "04 / FLOW & RECOVERY",
  "title": "When the consumer falls behind",
  "short": "A queue buys time. It cannot create capacity.",
  "minutes": 12,
  "tag": "Discrete teaching model",
  "goal": "Account for arrivals, service, queue growth and overflow.",
  "intro": "Checkouts produce two records per tick. The sink processes one. The queue looks healthy at first, then fills and starts rejecting new records.",
  "concept": "Backlog is work waiting to be processed. A bounded queue limits memory, but needs an overflow rule. This model drops the newest arrival when full. Backpressure instead feeds a signal upstream to slow production. A queue alone is not backpressure, the overflow arithmetic here is an authored reference policy.",
  "predict": "With capacity 3, two arrivals and one completion per tick, will a larger queue prevent loss indefinitely?",
  "code": `from course import queue_run

# Each tick: admit arrivals, reject overflow, then serve.
# Five input ticks, followed by three drain ticks.
result = queue_run(capacity=3, offered=2, service=1)`,
  "observe": "Read offered, completed, queued and dropped together. Arrivals stop after tick five, so the queue can drain. Rejected records are counted; they have not vanished from the accounting.",
  "change": "Increase capacity to 6, then increase service to 2. Which change fixes the sustained rate mismatch, and which only absorbs a burst?",
  "question": "The queue is empty at the end. Does that prove every offered record was processed?",
  "hints": [
    "Queue depth is a current state, not a delivery history.",
    "Check the dropped counter.",
    "Balance input against completion, drops and remaining work."
  ],
  "answer": "No. The queue may have drained after rejecting work. Across the run, offered must equal completed plus dropped plus still queued. Always inspect completeness alongside latency and queue size.",
  "limit": "These are deterministic model ticks, not broker measurements. The helper is explicit Python queue arithmetic, not a Bytewax backpressure measurement.",
  "source": "https://www.reactive-streams.org/"
},
{
  "slug": "budget-for-recovery",
  "title": "Budget for recovery",
  "short": "Normal capacity is not recovery capacity.",
  "tag": "Fluid capacity model",
  "minutes": 30,
  "goal": "Compute catch-up headroom and identify costs excluded from a recovery estimate.",
  "intro": "The service normally accepts 80 events per second and processes 100. A five-second outage builds a backlog. Restoring the process is not the same as restoring timely service.",
  "concept": "Under constant rates, an outage creates offered rate × outage duration unfinished events. After restart, only service minus continuing offered load is available to drain that backlog. This assumes the source retains all work, service immediately returns to the stated rate, and no records are dropped. State restore time, checkpoint replay and sink retries are extra costs.",
  "code": `from course import recovery_capacity

result = recovery_capacity(offered=80, service=100, outage=5)`,
  "predict": "A 400-event backlog and a 100-event/s service: does the system catch up in four seconds while new events continue arriving?",
  "observe": "It has only 20 events/s of spare capacity, so catching up takes 20 seconds after immediate restoration. Four seconds would apply only if no new work arrived and all 100/s could serve backlog.",
  "change": "Try service=80 and then service=120. Explain why a nonpositive spare rate yields no finite catch-up time rather than a negative or infinite JSON number.",
  "question": "Would increasing checkpoint frequency necessarily reduce the total recovery disruption?",
  "hints": [
    "More recent checkpoints can reduce replay, but checkpoints also consume resources.",
    "Restore time and the spare service rate still matter.",
    "Measure the transition, not just the last completed checkpoint age."
  ],
  "answer": "Not necessarily. It may reduce replay distance while increasing steady-state pressure and lowering recovery headroom. Include checkpoint cost, snapshot size, restore/warm-up time, replay volume, sink limits and the continuing arrival rate. Validate the objective using a real failure drill for the actual framework.",
  "limit": "Constant-rate arithmetic is a planning reference, not an observed restart or an availability guarantee.",
  "source": "https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/state/large_state_tuning/",
  "extra": [
    [
      "Plan a workload envelope",
      "An average arrival rate hides bursts and key skew. A sink’s quota can constrain recovery even when CPU is free. Retention must exceed the time needed to discover, restore and catch up from the failure; otherwise replayable source data may disappear before the job reaches it."
    ],
    [
      "A recovery report needs correctness evidence",
      "After a drill, inspect duplicates, missing IDs and the final state alongside time to restart and time to catch up. A fast recovery that silently resets offsets or drops old work does not meet the same objective as a complete recovery. Declare any intentional loss policy before comparing systems."
    ]
  ],
  "fixture": "The complete bounded input is defined in the editable snippet or its named function in course.py. Inspect the helper source before changing a policy. Continuing input, service and outage are constant authored parameters; retained input is assumed complete."
},
{
  "slug": "resolve-the-streaming-incident",
  "title": "Resolve the streaming incident",
  "short": "One pipeline. Several plausible explanations.",
  "tag": "Bytewax + correction policy",
  "minutes": 60,
  "goal": "Diagnose a wrong total using identity, validation, event-time progress, corrections and sink semantics.",
  "intro": "The bicycle shop reports that its [0,10) sales total is wrong after a replay. A duplicate, a delayed order and an invalid amount all arrive during the same sequence. Changing one knob without tracing the evidence can fix one symptom and introduce another.",
  "concept": "The capstone runs one real Bytewax keyed state machine. Its callback validates amounts, remembers accepted IDs, applies an authored single-window cleanup/correction policy and publishes replacement totals into a local sink view. Watermark control records are predetermined inputs to our policy; they are not Bytewax EventClock measurements. No recovery configuration or external transactional sink is attached. Inspect the callback to identify which work belongs to the engine and which decisions belong to the application.",
  "code": `from course import capstone

result = capstone(deduplicate=True, allowed_lateness=5)`,
  "predict": "The deliveries contain a twice (£10), b late (£5), an invalid negative amount and c after cleanup (£7). What should the stored result contain under this policy?",
  "observe": "The final sink holds total 15 at revision 2. a’s repeat is recorded as a duplicate, bad as invalid, and c as too late. The final state is one replacement row; adding revisions 10 and 15 would recreate the sink mistake from the correction lesson.",
  "change": "First disable deduplication while keeping lateness fixed. Then restore it and set allowed_lateness=0. For each run, export the source/result record and identify the first trace step that diverges from your baseline.",
  "question": "Write an incident report that distinguishes a policy-correct result from a complete account of all business sales. What would you change if c must eventually count?",
  "hints": [
    "A total can be correct under a discard policy while omitting a real sale.",
    "A late-data path needs a consumer and a reconciliation procedure.",
    "List which guarantees would require a real broker and checkpointed processing engine."
  ],
  "answer": "Report the accepted total, rejected/duplicate identities, watermark/cleanup conventions, revision semantics and source boundaries. If c must count, extend retention or provide an audited correction/rebuild path with stable IDs and idempotent effects. Test boundary equality, a duplicate after retention expiry, an unknown schema, an idle partition and a sink failure. The bounded helper cannot establish distributed recovery; validate those cases in the real deployment.",
  "limit": "This is a deterministic incident fixture, not a production architecture or a real checkpoint/restart test.",
  "source": "https://nightlies.apache.org/flink/flink-docs-stable/docs/learn-flink/fault_tolerance/",
  "extra": [
    [
      "Submission: make a defensible decision",
      "Keep three artifacts: the baseline run record, a deliberately broken run, and a repaired-policy proposal. Include the exact accepted IDs, side-output reasons and expected sink state. State whether the repair changes the business contract. A successful Run button only establishes execution, not the quality of the diagnosis."
    ],
    [
      "Acceptance rubric",
      "A strong explanation balances receipts against accepted, duplicate, invalid and late paths; identifies why the first divergent step matters; distinguishes upserts from contributions; names state-growth and recovery costs; and proposes independent edge cases. The worked reasoning is a reference, not a score or secure assessment. Finish by relating the local mechanisms to the distributed readings and the operational evidence you would collect."
    ]
  ],
  "fixture": "The complete bounded input is defined in the editable snippet or its named function in course.py. Inspect the helper source before changing a policy. a=10 twice; watermark 10; b=5; bad=−3; watermark 15; c=7. Every data event belongs to [0,10)."
}
];
