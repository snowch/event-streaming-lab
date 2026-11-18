import {patternLessons} from './patterns.mjs';
import {order} from './catalog.mjs';
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
  "concept": "An event records something that happened. Each order has an ID, shop, amount in pounds and the time of the sale in seconds. A Bytewax dataflow connects steps. <code>filter</code> keeps orders that meet a condition, then <code>map</code> selects the fields to return. The <code>collect</code> helper runs these steps and returns their output as a list.",
  "fixture": "Five orders arrive in the order a (£12), b (£8), c (£5), d (£7), e (£9). The editor imports them as <code>ORDERS</code>.",
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
  "observe": "The console lists <code>id</code> and <code>pounds</code> for each retained order. Find a and e in that order, then compare with the five input orders above. The filter keeps matching orders in this run and the map changes their fields.",
  "change": "Replace <code>order['amount'] &gt;= 9</code> with <code>order['amount'] &gt;= 7</code> in the editor. Select Run again. Compare the output IDs and their order. Which amounts qualify at £7 that did not qualify at £9?",
  "question": "If the downstream dashboard shows only two orders, can you conclude that only two orders arrived?",
  "hints": [
    "Separate arrival from selection.",
    "Count the input records, then the output records.",
    "The filter rejects b, c and d at the original threshold."
  ],
  "answer": "Five arrived, and two met the filter condition. The output count alone cannot tell you the input count. Capture both the total input and the rejected records when investigating a real pipeline.",
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
  "intro": "A checkout upgrade switches the amount in each order from pounds to pence. The old reader still accepts the JSON, but interpreting pence as pounds makes the reported value 100 times too large.",
  "concept": "A schema describes what fields are required and what they mean. The <code>version</code> field tells the reader which rules to apply. In this example, version 1 uses whole pounds and version 2 uses whole pence. The editor’s normalization code converts known versions to pence and reports why it rejects others.",
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
  "observe": "Find <code>pence</code> for a and b and <code>rejected</code> for c and d. The normalizer returns rejection rows so the remaining records can still be processed.",
  "change": "Replace <code>{'id':'b', 'version':2, 'amount':850}</code> with <code>{'id':'b', 'version':1, 'amount':850}</code> in the editor. Select Run again. Compare b’s <code>pence</code>. How can the same integer still pass validation but represent a different amount?",
  "question": "Can a dead-letter topic alone make a schema change safe?",
  "hints": [
    "Consider who notices and repairs the rejected events.",
    "Think about identity and ordering when repaired records are replayed.",
    "A separate destination does not define a repair procedure."
  ],
  "answer": "No. Specify alert ownership, original payload and error provenance, replay identity, permissions and retention. Validate backward/forward compatibility for the actual schema format, and distinguish structural changes from changes to units or business definitions. Reprocessing must not silently duplicate earlier effects.",
  "limit": "The editor validates four records with rules specific to this exercise. It has no shared schema catalog or separate service for storing rejected data.",
  "source": "https://kafka.apache.org/44/design/design/",
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
  "fixture": "The editor defines four records: a has 12 pounds, b has 850 pence, c uses unknown version 3 and d has a negative amount."
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
  "concept": "A Kafka topic is a named log split into partitions. Each partition orders its own records, and an offset is a record’s position in that partition. The editor starts librdkafka’s in-memory Kafka simulator, writes orders with a Kafka producer and reads them with Bytewax. The example explicitly sends North orders to partition 0 and South orders to partition 1.",
  "predict": "Will order b and order c have the same offset even though they are different events?",
  "code": `from course import partition_log

result = partition_log()`,
  "observe": "Compare the <code>id</code> and <code>offset</code> rows in partitions <code>0</code> and <code>1</code>. Partition 0 contains a, c and d. Partition 1 starts its own offsets at 0 and contains b and e.",
  "change": "Replace <code>result = partition_log()</code> with <code>result = partition_log()[\"0\"]</code> in the editor. Select Run again. Read the IDs in increasing <code>offset</code> order. Their event times are a=0, c=8 and d=3 seconds. Where do append order and event-time order differ?",
  "question": "Can you merge two partitions by offset and claim that this reproduces a single global arrival order?",
  "hints": [
    "Two records can share an offset.",
    "Each partition assigns its own positions.",
    "You need another ordering rule to compare different partitions."
  ],
  "answer": "No. Offset order is local to a partition. Merging equal offsets invents an order the logs did not establish. If related events require ordered processing, choose a key and partitioning contract that keeps them together; changing partition counts and producer behavior can affect that contract.",
  "limit": "The producer, Kafka protocol traffic and Bytewax connector are real. The broker is an in-memory librdkafka simulator. Reading this fixture does not establish disk durability, replication, retention or cross-partition ordering.",
  "source": "https://kafka.apache.org/intro",
  "fixture": "A Kafka producer explicitly routes North orders to partition 0 and South orders to partition 1. Their respective event times are a=0, c=8, d=3 and b=12, e=25 seconds."
},
{
  "slug": "stream-live-through-kafka",
  "title": "Stream live through Kafka",
  "short": "A producer, a socket, and an engine that keeps listening.",
  "tag": "Bytewax and simulated broker",
  "minutes": 40,
  "goal": "Observe how a running Bytewax engine updates each shop total as orders arrive. Explain what an offset tells you about a record.",
  "intro": "The dashboard must update while orders are still arriving. A finite list can teach transformations, but it cannot show a producer sending more work to an already-running consumer. This experiment starts separate producer/controller and Bytewax engine processes inside your browser’s Linux guest.",
  "concept": "The controller starts an in-memory Kafka simulator and a Kafka producer. A separate Bytewax process reads new records from partition 0 and keeps a running total for each shop. The controller waits for each result before sending the next order, so you can identify which orders arrived after the engine was already processing.",
  "predict": "Which output totals change when the fourth amount changes from 7 to 70? Will the Kafka offsets change?",
  "code": `from live_kafka import live_stream

# A new event is produced only after the previous result arrives.
# All five records use partition 0; keys still own separate totals.
result = live_stream(amounts=[12, 8, 5, 7, 9])`,
  "fixture": "Orders arrive in this order: North £12, South £8, North £5, North £7 and South £9. All five go to partition 0, at offsets 0 through 4.",
  "observe": "Inspect <code>records</code> for each order’s <code>offset</code>, <code>key</code>, and <code>total</code>. The updates interleave the two shop totals, whereas the offsets count every record in partition 0. <code>live_arrivals</code> counts records sent after an earlier result arrived.",
  "change": "Replace <code>[12, 8, 5, 7, 9]</code> with <code>[12, 8, 5, 70, 9]</code> in the editor. Select Run again. Compare North’s last <code>total</code> with the <code>offset</code> sequence in <code>records</code>. Which evidence tracks business state, and which tracks source position?",
  "question": "After the controller stops, does the existence of offsets 0..4 prove those records will survive closing this page?",
  "hints": [
    "Identify which component owns the log storage.",
    "The simulator stores records in the controller’s memory.",
    "Offsets identify positions; storage durability is another contract."
  ],
  "answer": "The simulator stores its log in the controller’s memory. That log disappears when the process ends, even when Fast reruns keep Linux ready. Offsets identify positions, and this exercise has no persistent broker storage.",
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
  "observe": "Read <code>offset</code>, <code>key</code>, and <code>value</code> in <code>records</code>. Compaction keeps the latest row for each key in the retained range. A <code>null</code> value marks a delete. Compare the requested start at 2 with the first surviving record at offset 3.",
  "change": "Replace <code>compact=True</code> with <code>compact=False</code> in the editor. Select Run again. Compare the versions of key a in <code>records</code>. Then replace <code>start=2</code> with <code>start=0</code> and select Run again. Which earlier history becomes visible when both policies change?",
  "question": "Can a new consumer rebuild a complete state snapshot if required tombstones have expired before it finishes reading?",
  "hints": [
    "Consider a previously materialized value for a deleted key.",
    "Absence of a value and an explicit deletion are different evidence.",
    "A bootstrap procedure needs a history/retention contract."
  ],
  "answer": "Not necessarily. It needs an authoritative snapshot plus a consistent log boundary, or enough retained updates and deletions to reconstruct the intended state. Kafka compaction and tombstone retention have timing and configuration details; an idealized latest-per-key pass is not a proof that every slow bootstrap is safe.",
  "limit": "This is one list-backed partition. Kafka segment deletion, asynchronous compaction, transaction visibility and timestamp-based retention are not executed.",
  "source": "https://kafka.apache.org/44/design/design/#log-compaction",
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
  "fixture": "Offsets 0..5: a=10, b=8, a=12, c=5, b=tombstone, a=15."
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
  "fixture": "Both groups read the same five orders. The edited setting changes the sales group’s next offset in both partitions. Audit always starts at 0.",
  "predict": "Sales has committed position 1 in both partitions. Audit starts at 0. Will audit still see the records sales has already processed?",
  "code": `from course import consume_log

# The committed position is the NEXT offset to read.
# This example applies the same position to both partitions.
result = consume_log(committed=1)`,
  "observe": "Compare the IDs in <code>sales</code> and <code>audit</code> by partition. Sales reads from its committed next offset, while audit reads from offset 0. Reading changes a consumer’s position, and retention determines what remains in the log.",
  "change": "Replace <code>committed=1</code> with <code>committed=0</code> in the editor. Select Run again. Compare the two groups in <code>sales</code> and <code>audit</code>. Then replace <code>committed=0</code> with <code>committed=2</code> and select Run again. Which IDs can sales still read, and does audit change?",
  "question": "If a consumer commits position 2 before its sink has written the record at offset 1, what happens when it crashes?",
  "hints": [
    "Restart begins at the committed next position.",
    "The log may still hold the skipped record.",
    "Retention and progress are different contracts."
  ],
  "answer": "It resumes at 2 and skips unfinished work at 1 unless another mechanism detects it. Commit-after-write can instead repeat an effect after a crash. The process-recovery drill deliberately waits for a completed checkpoint and does not test that external-write race. Coordinating source progress with sink effects needs an explicit contract; changing a position alone does not solve it.",
  "limit": "Real Kafka consumer commit/fetch requests run against an in-memory simulator. The test uses explicit assignments, without JoinGroup rebalancing or broker persistence. Bytewax KafkaSource separately manages positions through Bytewax recovery, not Kafka group commits.",
  "source": "https://kafka.apache.org/44/getting-started/introduction/"
},
{
  "slug": "choose-the-right-clock",
  "title": "Choose the right clock",
  "short": "The same order can belong to two different windows.",
  "tag": "Explicit clock model",
  "minutes": 25,
  "goal": "Use one order to explain why its event time and processing time can place it in different windows.",
  "intro": "An offline checkout sends its morning orders at lunchtime. A processing-time dashboard reports a lunchtime spike. An event-time dashboard reports morning sales—once it can decide how long to wait for missing data.",
  "concept": "Event time describes when the order happened. Processing time describes when an operator handles it. The editor supplies invented processing times measured in seconds from the same starting point as the order times. Window 0 includes 0 and excludes 10. Window 1 starts at 10 and excludes 20.",
  "code": `from course import clock_windows

processing_times = {"a": 0, "b": 12, "c": 13, "d": 14, "e": 25}
result = clock_windows(processing_times)`,
  "predict": "Order c happened at event time 8 but is observed at processing time 13. Which ten-second window does each clock assign it to?",
  "observe": "In the trace, use Next trace step until <code>id</code> is c, or find c in the console’s <code>trace</code>. Compare <code>event_time</code> and <code>processing_time</code> and read which windows these values select in <code>event_window</code> and <code>processing_window</code>.",
  "change": "Replace <code>\"c\": 13</code> with <code>\"c\": 9</code> in the editor. Select Run again. Find c again. Compare <code>event_window</code> and <code>processing_window</code> with the first run. Which window changes when event time and the ten-second window rule stay fixed? The trace lists orders a through e in fixture order.",
  "question": "Suppose a watermark uses the greatest event timestamp seen so far minus a fixed wait. This marker tells the system how far event time has progressed. What can happen if a producer sends a timestamp a year in the future?",
  "hints": [
    "The maximum timestamp influences every subsequent watermark.",
    "Monotonic progress generally cannot be rewound to rescue older windows.",
    "Validation belongs before advancing time from untrusted timestamps."
  ],
  "answer": "It can advance progress far beyond legitimate records, closing windows and classifying later normal arrivals as late. Validate plausible timestamp ranges, units and clock origins; quarantine suspicious records before they drive progress. A large out-of-order allowance is not a general cure for a bad clock.",
  "limit": "This authored model assigns a fixed set of orders to windows. Processing times are inputs to the model. No latency is measured and no broker assigns the timestamps.",
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
  "fixture": "The model supplies event times of 0, 12, 8, 3 and 25 seconds for orders a, b, c, d and e. The editor supplies their processing times. Each window is ten seconds wide."
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
  "observe": "Read <code>start</code>, <code>end</code>, and <code>events</code> in each emitted window. The first window includes event times from 0 up to 10 and holds a and b. The second starts at 10 and holds c and d. The result records membership at the end of the source.",
  "change": "Replace <code>slide=10</code> with <code>slide=5</code> in the editor. Select Run again. Keep <code>width=10</code>. Check how often each ID appears in <code>events</code> and find the row whose <code>start</code> is below zero. Why does a window start before the first event?",
  "question": "If a record carries an old timestamp, will this built-in operator automatically move it into an earlier buffer?",
  "hints": [
    "Find the clock supplied to the window operator.",
    "EventClock explicitly extracts each record’s timestamp.",
    "An earlier event-time window can still accept a record while it remains open."
  ],
  "answer": "The clock configuration determines which time is read. Here EventClock explicitly extracts the timestamp, so an accepted out-of-order event can enter its earlier event-time window while that window remains open. A processing-time clock would answer a different question.",
  "limit": "This run uses a real Bytewax time window with a fixed wall clock, a 30-second wait and four inputs. The source ends after the fourth record, so Bytewax emits any windows still open. Use the course’s native performance guide to measure throughput.",
  "source": "https://github.com/bytewax/bytewax/blob/v0.21.1/pysrc/bytewax/operators/windowing.py",
  "fixture": "Four records: a at time 1, b at 7, c at 12 and d at 18 seconds. Frozen wall time and a 30-second wait keep them eligible. The source ends after d."
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
  "observe": "Read the <code>events</code> list of each row in <code>sessions</code>. The first session holds 0, 4 and 8 even though 8 arrived before 4. This result shows final sessions emitted by Bytewax.",
  "change": "Replace <code>gap=5</code> with <code>gap=3</code> in the editor. Select Run again. Then replace <code>gap=3</code> with <code>gap=8</code> and select Run again. Compare session membership across your three runs. Use the arrival order 0, 8, 4, 20 to explain how the delayed event at 4 changes the final grouping.",
  "question": "If the first session was already emitted and its state discarded, can the late bridging event be handled by simply adding one to a session counter?",
  "hints": [
    "The bridge may change the number of sessions as well as their aggregate.",
    "State is needed to know which sessions merge.",
    "Previously emitted results may need retraction or replacement."
  ],
  "answer": "No. An exact correction may require the earlier session state and a way to revise its output. Choose a lateness/retention policy and a changelog contract, or route the bridge to a separate correction process once state is gone. A fixed-size counter cannot reconstruct forgotten membership.",
  "limit": "This run uses a real Bytewax SessionWindower with one key, a fixed wall clock and a 30-second wait. Bytewax emits any open sessions when the source ends. Processing-time triggers and progress across multiple inputs require separate examples.",
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
  "fixture": "Four event times arrive as 0, 8, 4 and 20 seconds, all with the same key. The clock uses a 30-second wait to keep this fixture eligible."
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
  "concept": "A watermark estimates how far event time has progressed. Bytewax uses that marker to decide when windows can close and whether an arriving record is late. The <code>wait</code> setting gives out-of-order records time to arrive. In this run, a fixed wall clock lets you see how input timestamps affect progress. The result includes both the records accepted into windows and those sent to the late output.",
  "fixture": "The five event times arrive as 0, 12, 8, 3 and 25 seconds. The editor selects the clock’s five-second wait. Wall time is frozen.",
  "predict": "Arrival timestamps are 0, 12, 8, 3 and 25. With a five-second wait, will order d at time 3 still be accepted?",
  "code": `from course import event_time

# Real EventClock + TumblingWindower + collect_window.
# Inspect course.py for the clock and late side output.
result = event_time(wait=5)`,
  "observe": "Find order d in <code>late</code>. In <code>windows</code>, find the first row’s <code>ids</code> and <code>total</code>. Bytewax reports accepted records in event-time order for each emitted window. The source ends and the engine emits any open windows.",
  "change": "Replace <code>wait=5</code> with <code>wait=30</code> in the editor. Select Run again. Compare <code>late</code> and the first window’s <code>ids</code> and <code>total</code>. Which additional order contributes to the first window?",
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
  "concept": "In the previous lab, Bytewax routed records below its watermark to the late output. This Python model illustrates another policy. When the watermark reaches the window end at 10, the model emits its first total. It can still replace that total when an eligible record arrives before cleanup. Cleanup deletes this window’s state when the watermark reaches 10 plus the allowed lateness.",
  "code": `from course import corrections

result = corrections(lateness=5)`,
  "predict": "The watermark reaches 10, then b arrives, then the watermark reaches 15, then c arrives. Which late event can still correct the window?",
  "observe": "Compare the <code>revision</code> and <code>total</code> of the first and last rows in <code>updates</code>. Each revision replaces the prior total for that window. <code>late</code> lists orders this policy rejects after cleanup.",
  "change": "Replace <code>lateness=5</code> with <code>lateness=0</code> in the editor. Select Run again. Then replace <code>lateness=0</code> with <code>lateness=10</code> and select Run again. Compare <code>updates</code> and <code>late</code> in all three runs. Which arrivals can still revise the first total?",
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
  "fixture": "All three orders belong to the window from 0 up to 10 seconds. The model receives a (£10), advances the watermark to 10, receives b (£5), advances the watermark to 15, then receives c (£7)."
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
  "concept": "A key tells Bytewax which records share a running total. <code>key_on</code> uses the shop name as the key. <code>stateful_map</code> passes the previous total for that shop to <code>add</code>, or <code>None</code> if this is the first record. The function returns the new total to keep and the record to emit.",
  "fixture": "The editor imports the five bicycle-shop orders. Each order supplies an amount and a shop. The key function selects which running total to update.",
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
  "observe": "Read <code>shop</code> and <code>total</code> for each arrival. North reaches £24 while South reaches £17. The callback keeps separate accumulators for the two shop keys.",
  "change": "Replace <code>lambda order: order['shop']</code> with <code>lambda order: 'all'</code> in the editor. Select Run again. Read the <code>total</code> values after each arrival. Why does the last total combine both shops even though the output still prints each order’s <code>shop</code>?",
  "question": "What happens to memory if a never-ending stream introduces a new key on every event?",
  "hints": [
    "Think about how many groups remain reachable.",
    "A group needs somewhere to keep its accumulator.",
    "This example does not expire idle keys."
  ],
  "answer": "State can grow with the number of distinct keys. A real long-running design needs key expiry, bounded cardinality, or a state backend with an explicit retention policy. A window is one way to bound the time span of an aggregate.",
  "limit": "One Bytewax worker holds the totals in memory. Each run starts a new Python process with empty totals. The recovery chapter shows how to restore state from a checkpoint within a run.",
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
  "fixture": "The editor prepares a one-entry dictionary for North and imports all five orders, including two from South.",
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
  "observe": "Find the output rows whose <code>shop</code> is South and read their <code>region</code>. The code’s fallback puts <code>unknown</code> on those rows. Compare that result with a missing key in the dictionary.",
  "change": "Replace <code>regions = {'North': 'Yorkshire'}</code> with <code>regions = {'North': 'Yorkshire', 'South': 'London'}</code> in the editor. Select Run again. Check the <code>region</code> in the South rows. Next select Restore code, then replace <code>regions.get(order['shop'], 'unknown')</code> with <code>regions[order['shop']]</code>. Select Run. Read Execution error, then confirm the console still shows the prior successful result.",
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
  "goal": "Explain how widening the time bound or adding a receipt changes the number of matches for the same orders.",
  "intro": "Order x has two payment receipts with matching IDs. A join produces two rows. If the dashboard treats both as one paid order each, its count doubles even though the join followed its specified rule.",
  "concept": "A stream-stream join matches records from two histories. Here, each payment’s order ID must match the order’s ID. The payment timestamp must be at or after the order time and no more than <code>horizon</code> seconds later. This authored model checks every order–receipt pair in two fixed lists. An online join also needs rules for tracking progress and removing old records.",
  "code": `from course import interval_join

payments = [
    {"id": "x", "time": 7, "receipt": "p1"},
    {"id": "x", "time": 9, "receipt": "p2"},
    {"id": "y", "time": 20, "receipt": "p3"},
]
result = interval_join(horizon=10, payments=payments)`,
  "predict": "How many output rows should order x produce? Does y’s receipt at 20 match an order at 4 with horizon 10?",
  "observe": "In the console, inspect <code>matches</code> to see which receipts match each order. <code>comparisons</code> counts every pair the model checks, including pairs it rejects.",
  "change": "Replace <code>horizon=10</code> with <code>horizon=20</code> in the editor. Select Run again. Compare <code>matches</code> and <code>comparisons</code>. Which receipt is new? Keep <code>horizon=20</code> and add <code>{\"id\": \"x\", \"time\": 10, \"receipt\": \"p4\"},</code> on its own line before the closing bracket of <code>payments</code>. Select Run again. How many receipts now match order x, and how many pairs are checked?",
  "question": "Can a hash join always make a many-to-many join O(n+m) total work?",
  "hints": [
    "Hashing helps locate matching groups.",
    "Every matching pair may still need to be emitted.",
    "Include output cardinality z in the cost expression."
  ],
  "answer": "No. A useful expected bound is O(n+m+z) for suitable hash-based matching, with additional qualifications for collisions, time indexing and state maintenance. If every left row matches every right row, z is n×m. No lookup structure makes emitting that result linear in input size.",
  "limit": "This is an executed nested-loop reference, not a distributed hash join. It does not evict unmatched state or emit outer-join revisions.",
  "source": "https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/sql/reference/queries/joins/",
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
  "fixture": "The model supplies order x at 0 seconds and order y at 4 seconds. The editable payments list supplies the receipt ID, associated order ID and timestamp of each payment."
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
  "observe": "In <code>trace</code>, compare <code>event_time</code> and <code>region</code> for times 5, 12 and 8. The as-of policy picks the last version whose start is at or before the event time. The version for East begins at 10.",
  "change": "Replace <code>history=True</code> with <code>history=False</code> in the editor. Select Run again. Compare <code>policy</code> and <code>trace</code>. Which earlier events receive today’s East value? With the original as-of policy, which version would an event at time 10 receive?",
  "question": "What extra information is needed to reproduce the report as it was known yesterday, rather than the report corrected with today’s historical knowledge?",
  "hints": [
    "A version can be valid in the past but arrive in your system later.",
    "An effective timestamp alone does not record when the system learned it.",
    "You need a second timeline or an immutable audit of published decisions."
  ],
  "answer": "Preserve knowledge/transaction time or the exact input/version snapshot used for the earlier report. Valid-time history alone reconstructs what the latest knowledge says was true then. It cannot reproduce an earlier decision if historical reference data has since been corrected.",
  "limit": "This is a finite as-of lookup over two versions. It does not implement a Flink temporal join, a bitemporal database or distributed version retention.",
  "source": "https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/sql/reference/queries/joins/#temporal-joins",
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
  "fixture": "Versions are West from 0 and East from 10. The three event times arrive in the order 5, 12 and 8."
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
  "fixture": "The source sends the full order list followed by a second delivery of a and b. The initial key is the order ID.",
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
  "observe": "Read the final total in the console. The source delivers seven records and the identity key lets five distinct orders contribute to the sum. Bytewax emits the final sum when its input ends.",
  "change": "Replace <code>lambda order: order['id']</code> with <code>lambda order: order['shop']</code> in the editor. Select Run again. Compare the new total with £41. The first North and South orders contribute £12 and £8. Which distinct orders now share a key and are incorrectly suppressed?",
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
  "concept": "A checkpoint saves the running totals and the next source position together. A controller waits for Bytewax to record a completed checkpoint in SQLite, stops the engine immediately with SIGKILL, adds two more amounts and starts another engine. Both engines run inside one experiment and can see its checkpoint files.",
  "predict": "The first process reads 12, 8 and 5, reaching 25. After restart it sees 7 and 4. What source position and total must be restored to finish at 36?",
  "code": `from course import recover

# Wait for a completed Bytewax checkpoint, SIGKILL the engine,
# then restart it with the same source and recovery database.
result = recover(checkpoint=True)`,
  "observe": "Read <code>resumed_from</code>, <code>restored_total</code>, and <code>outputs</code> and check whether the restarted process repeats any input. The controller killed the original process after confirming a completed checkpoint.",
  "change": "Replace <code>checkpoint=True</code> with <code>checkpoint=False</code> in the editor. Select Run again. Compare <code>resumed_from</code>, <code>restored_total</code>, <code>replayed_records</code>, and <code>outputs</code>. Both runs finish at the same sum. Which evidence reveals that the second process started over?",
  "question": "If the process is killed after a visible sink write but before that write is represented by a completed checkpoint, can this ordinary output file prevent a duplicate effect?",
  "hints": [
    "The output file is separate from Bytewax recovery metadata.",
    "Our controlled crash waits for a completed checkpoint.",
    "A stronger claim needs a transactional or idempotent sink contract."
  ],
  "answer": "No. A process checkpoint alone does not atomically commit an arbitrary external effect. This drill verifies source and state restoration at a controlled completed checkpoint. An uncontrolled write/checkpoint race needs sink-specific coordination or idempotency and another failure experiment.",
  "limit": "This experiment stops and restarts a real Bytewax process with a file source and a SQLite checkpoint. The checkpoint files are private to the run and disappear before another run. The output uses ordinary file appends. Exactly-once external effects require a separate experiment with the actual destination.",
  "source": "https://kafka.apache.org/44/design/design/#message-delivery-semantics",
  "fixture": "Five amounts arrive as £12, £8, £5, £7 and £4. The controller gives the original process its first three inputs, waits for a completed checkpoint and kills it. The restart either restores that checkpoint or reads from the beginning."
},
{
  "slug": "measure-operation-effort",
  "title": "Measure operation effort",
  "short": "Count the work before timing it.",
  "tag": "Instrumented reference algorithms",
  "minutes": 35,
  "goal": "Use per-event work, cardinality and output size to qualify Big-O claims.",
  "intro": "Two inputs can have the same number of records yet require different amounts of work. This experiment counts comparisons and retained keys for two implementations of duplicate detection.",
  "concept": "Big-O describes asymptotic growth under a stated algorithm and input model. Let n be events and k be retained distinct keys. A constant-cost map does O(n) total work. A hash-backed keyed sum has expected O(1) lookup/update per event and O(k) entries, excluding key/value sizes. A linear-list deduplicator may perform O(nk) comparisons. These are different algorithms, not different labels for the same operator.",
  "code": `from course import operation_effort

result = operation_effort(n=8, keys=2)`,
  "predict": "If you increase distinct keys from 2 to 8 while keeping n=8, which counts should change and which must stay fixed?",
  "observe": "Compare <code>events</code>, <code>map_calls</code>, <code>hash_aggregate_updates</code>, <code>retained_keys</code>, and <code>linear_dedup_comparisons</code>. The first three have the same count here. The retained keys and linear search comparisons depend on which keys repeat.",
  "change": "Replace <code>n=8, keys=2</code> with <code>n=16, keys=2</code> in the editor. Select Run again. Then replace <code>n=16, keys=2</code> with <code>n=16, keys=16</code> and select Run again. Compare <code>retained_keys</code> and <code>linear_dedup_comparisons</code> across the runs. Explain why the all-distinct case checks every earlier key before retaining the next one.",
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
  "fixture": "Keys cycle as i modulo keys for integers i from 0 to n−1."
},
{
  "slug": "measure-latency-and-batching",
  "title": "Measure latency and batching",
  "short": "A higher throughput can hide a longer wait.",
  "tag": "Deterministic queueing model",
  "minutes": 35,
  "goal": "Compute completed-event latency quantiles and explain batching, waiting and omitted populations.",
  "intro": "Batching reduces repeated setup work. It also makes early events wait for a batch to fill. A faster total run can make one customer’s order appear later.",
  "concept": "The model has eight fixed arrival times. A single first-in, first-out server spends two milliseconds setting up each batch and three milliseconds processing each record. A batch is ready when its last record arrives. All its records finish together. A latency percentile summarizes completion times relative to arrivals. For example, the nearest-rank 99th percentile (p99) is the largest of these eight latencies.",
  "code": `from course import latency_run

result = latency_run(batch=1)`,
  "predict": "If batch grows from 1 to 4, will the first event finish earlier because setup work is shared?",
  "observe": "Read <code>arrived_ms</code>, <code>start_ms</code>, <code>completed_ms</code>, and <code>latency_ms</code> for the first record in <code>trace</code>. <code>elapsed_ms</code> is the time until the entire fixture finishes. <code>p50_ms</code> and <code>p99_ms</code> summarize per-record waits and processing, with p99 equal to the maximum for these eight records.",
  "change": "Replace <code>batch=1</code> with <code>batch=2</code> in the editor. Select Run again. Then replace <code>batch=2</code> with <code>batch=4</code> and select Run again. Across all three runs, compare <code>elapsed_ms</code>, <code>p50_ms</code> and <code>p99_ms</code>. Compare the first record’s <code>latency_ms</code> as well. Can the fixture finish sooner while that record takes longer?",
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
  "fixture": "Records arrive at 0, 1, 2, 10, 11, 12, 20 and 21 ms. The server spends 2 ms setting up each batch and 3 ms processing each record."
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
  "concept": "Backlog is work waiting to be processed. This model puts arrivals in a fixed-size queue and drops any new record that does not fit. Real backpressure sends a signal upstream so that the producer can slow down. Here the arrival rate stays fixed.",
  "fixture": "The model runs eight ticks. Two records arrive on each of the first five ticks and none arrive on the last three. Each tick adds arrivals up to the queue limit, counts drops, then processes up to the service rate.",
  "predict": "With capacity 3, two arrivals and one completion per tick, will a larger queue prevent loss indefinitely?",
  "code": `from course import queue_run

# Each tick: admit arrivals, reject overflow, then serve.
# Five input ticks, followed by three drain ticks.
result = queue_run(capacity=3, offered=2, service=1)`,
  "observe": "Compare <code>offered</code>, <code>completed</code>, <code>queued</code>, and <code>dropped</code> in the first five <code>trace</code> rows. The last three ticks have no arrivals, so any waiting work can drain. The top-level <code>dropped</code> adds losses across ticks.",
  "change": "Replace <code>capacity=3</code> with <code>capacity=6</code> in the editor. Select Run again. Keep <code>offered=2</code> and <code>service=1</code>. Then replace <code>service=1</code> with <code>service=2</code> and select Run again. Compare <code>dropped</code> and the <code>queued</code> values while arrivals continue. Which change increases storage, and which makes service keep up with offered work?",
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
  "observe": "Read <code>backlog_at_restart</code>, <code>spare_per_second</code>, and <code>catch_up_seconds</code>. The outage leaves 400 events waiting. Arrivals continue at 80 events per second after restart, leaving only 20 per second to clear that backlog.",
  "change": "Replace <code>service=100</code> with <code>service=80</code> in the editor. Select Run again. Then replace <code>service=80</code> with <code>service=120</code> and select Run again. Compare <code>spare_per_second</code>, <code>can_catch_up</code>, and <code>catch_up_seconds</code>. Why does the result report <code>null</code> instead of a duration at equal rates?",
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
  "fixture": "The model uses a five-second outage, 80 arrivals per second and processing capacity of 100 events per second after restart. It assumes every record is kept during the outage."
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
  "observe": "Read <code>sink</code>, <code>duplicates</code>, <code>invalid</code>, and <code>late</code>. The final sink row contains revision 2 and total 15. Compare it with the revisions shown in <code>trace</code>. Each revision replaces that window’s previous row.",
  "change": "Select Export run after the first successful run. Replace <code>deduplicate=True</code> with <code>deduplicate=False</code> in the editor. Select Run again. Export that run, then replace <code>deduplicate=False, allowed_lateness=5</code> with <code>deduplicate=True, allowed_lateness=0</code> and select Run again. Export the last run. Compare <code>sink</code>, <code>duplicates</code>, and <code>late</code> and identify the first differing <code>trace</code> row for each change.",
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
  "fixture": "Every order belongs to the window from 0 up to 10 seconds. The model receives a (£10) twice, advances the watermark to 10, receives b (£5) and bad (−£3), advances the watermark to 15, then receives c (£7)."
}
];

lessons.push(...patternLessons);
lessons.sort((a,b)=>order.findIndex(x=>x.id===a.slug)-order.findIndex(x=>x.id===b.slug));
