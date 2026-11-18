# Clear wording and interface review

## Opening check

The review started from `cadd44a488aba80c31394c58b926bce5863d52f8`, including the warm Linux runtime. The scope was all 51 learner-facing pages, including the 30 runnable lessons, 16 readings and five navigation or companion pages. I read the course’s UX and learning-design guides and checked its stated starting point of basic Python lists, dictionaries, functions and lambdas, followed by the named chapter prerequisites.

For each page, I checked headings, prose, controls, examples, predictions, hints, answers and feedback for their purpose, what the course prepares, what the learner can change, when to run, which output supports the conclusion, and which terms or claims need a definition or boundary. I followed the visible order from question through result and interpretation to the next experiment, checking that disclosures contain supporting material and that execution, interpretation and reading marks are distinct.

## Runnable lessons

Each lesson now shows its own input summary. The published editor state and download condition are visible before Run in Linux. The result guide names the fields to inspect and successive edits name the precise change and comparison. The table records baseline evidence and the outcomes checked for those editor changes. Multiple changes are run separately as the lesson directs.

| Lesson | Published example | Editor-change evidence |
| --- | --- | --- |
| Follow an event | Filter returns a and e at £9 | £7 adds b and d while keeping input order |
| Evolve an event schema | a is 1200 pence, b is 850, c and d have different rejections | Treating b as version 1 converts it to 85000 pence |
| Read a partitioned log | b and c share an offset number in different partitions | Selecting only partition 0 returns a, c and d at offsets 0, 1 and 2. Their event times are 0, 8 and 3 seconds |
| Stream live through Kafka | Five outputs, four later arrivals and separate shop totals in one partition | £70 for the fourth order brings North to £87 while offsets remain 0 through 4 |
| Retain or compact a log | Retained offsets 3, 4 and 5 include b’s deletion | Disabling compaction brings back offset 2. Lowering the retention floor adds 0 and 1 |
| Give consumers their own position | Three sales records and five audit records | Start 0 gives sales five records. Start 2 gives sales only d. Audit still sees five |
| Route and quarantine | a and d accepted, two different rejection reasons and four records accounted for | Boolean amount adds a quarantine record. Zero sends z to accepted and leaves five records accounted for |
| Expand and re-key | Two carts yield four lines and three product totals | Two copies yield four carts, eight lines and the same three product codes |
| Choose the right clock | c has event window 0 and processing window 1 | Processing time 9 changes the processing window to 0 and preserves event time 8 and event window 0 |
| Close a window | Two ten-second windows with a/b and c/d | Five-second steps create overlaps. a belongs to windows starting at −5 and 0 |
| Merge a session | 0, 4 and 8 share a session, with 20 separate | A three-second gap gives four sessions. An eight-second gap still keeps 20 separate |
| Wait for late events | d is late and the first window totals £17 | A 30-second wait accepts d and changes the first total to £24 |
| Correct a late result | Initial total £10, revision £15 and c late | Zero allowed lateness routes b and c to late output. Ten accepts both and reaches £22 |
| Keep state by key | North ends at £24 and South at £17 | A constant key creates one sequence ending at £41 even though each row still identifies its original shop |
| Build a materialized view | Only B remains, two older writes are ignored and A’s deletion is remembered | Disabling the version check brings A back at 11 |
| Enrich a stream | Both South orders have unknown region | Adding South gives London. Separately, direct lookup with South missing raises KeyError and keeps the previous successful result available |
| Join changing streams | Latest mode pairs o2 with East | Product mode emits four pairs. First mode emits o1 with West |
| Count the join output | Two matches and six comparisons | A larger time bound adds y/p3 with six comparisons. One more receipt gives four matches and eight comparisons |
| Look up the past | The three orders use West, East and West in arrival order | Selecting the latest reference value uses East for all three |
| Detect event sequences | Two d1 alerts include the failure timestamps used | A two-second matching limit yields zero alerts for the same input |
| Replay without double counting | Deduplicating by order ID yields £41 | Using shop identity yields £20 because legitimate later orders share those keys |
| Forget state deliberately | Two accepted deliveries and one duplicate | Keeping state makes the last a a duplicate, giving one accepted and two duplicates |
| Recover after a failure | Restores source position 3 and state 25, finishes at £36 | Restart without a checkpoint repeats three inputs and their receipts, with the same final total |
| Retry with a budget | Eight attempts, a and b succeed, c and d go to quarantine | Two attempts per order give six total attempts and only a succeeds |
| Measure operation effort | Eight events and two keys give ten linear comparisons | At 16 events and two keys there are 22 comparisons. With 16 keys there are 120 |
| Measure latency and batching | First completion 5 ms for batch 1 | Batch 2 finishes the fixture sooner and delays its first record. Batch 4 moves first completion to 24 ms and raises p99 |
| When the consumer falls behind | Three drops can coincide with an empty final queue | A larger queue avoids drops in this fixture and leaves two records queued. Matching service to arrivals removes both backlog and drops |
| Budget for recovery | 400 events of backlog, 20 events/s of spare capacity and 20 seconds to catch up | Service of 80 gives zero spare capacity and a null catch-up time. Service of 120 gives 40 spare and ten seconds |
| Run a bounded backfill | Reads offsets 1, 2 and 3 twice for six writes and three visible rows | Stop at offset 3 gives only offsets 1 and 2, four writes and two visible rows |
| Resolve the streaming incident | Revision 2 totals £15. The result accounts for duplicate a, invalid bad and late c | Disabling duplicate detection reaches £25. Zero allowed lateness makes b late too and leaves £10 |

## Readings and supporting pages

All readings keep their scenario, worked case, question and framework boundary visible. The table and its introduction provide the evidence path. The previous numbered relationship boxes repeated concepts and used arrows that could imply execution order. Primary sources, hints and explanations remain available through descriptive disclosures.

| Page | Closing check |
| --- | --- |
| Choose a streaming architecture | Names the log and consumer prerequisites. The case distinguishes stock commands, audit readers, sales projections and email effects |
| When can time move forward? | Defines the watermark and explains the half-open boundary. Compare A/B progress with idle and returning B |
| Where does a key live? | The same key routes to the same logical owner in the example. Compare partition, task and accumulated amount |
| From streams to tables and back | Explains new contributions, replacements, deletion and per-partition offsets for snapshot startup |
| When is a streaming answer final? | Names the early-results assumption before following order-7’s provisional and updated values |
| Recognize sequences and absence | Defines completion, timeout and late arrival without requiring prior knowledge of a particular pattern engine |
| When is it safe to forget? | States the 24-hour rule and expands state time-to-live at the practice question. The trace includes the repeated delivery after expiry |
| What makes a snapshot consistent? | Directs attention to whether a, b and c are in checkpoint C and separates arrival from checkpoint completion |
| Exactly once—at which boundary? | Defines recovery despite replay. Compare what becomes visible at each stage of the hypothetical sink protocol |
| Connect transactions to streams | Expands change data capture and connects the database snapshot, log position and local inbox transaction |
| Where does the waiting go? | The case names its constant arrival and service assumptions. Compare unfinished work and where it accumulates |
| Why did more workers not help? | Defines key salting with partial sums and points out that the merge rule must preserve the result |
| What is the job waiting for? | Explains the running status and CPU value. The last table column names evidence for testing each possible cause |
| Test and deploy a changing stream | Names the backfill, checkpoint and native performance prerequisites. Separates successful startup, catch-up and a safe switch |
| Operate data with ownership and care | Defines data lineage and makes a current row, copied records and future replay part of the deletion case |
| Defend the complete design | Asks for evidence at explicit failure points and links the design reasoning to the final executable incident |
| Course home | Separates labs from readings and keeps Start lesson 1 prominent above the complete course contents |
| Reading index | Explains the static reading path and gives the companion its current name and link |
| Runtime and course boundaries | Explains private run state, reused guest state, downloads, Reset, storage, source provenance and simulator limits |
| Native performance guide | Names the terminal and script, gives shell-specific commands, verifies `trials[].actual` against `expected` and asks why raw rate varies |
| Messaging Patterns Lab companion | Links to the published companion and explains its separate messaging focus and guest-local transports |

## Closing check

The executed examples still distinguish real Bytewax operators, real Kafka protocol traffic against an in-memory simulator, authored Python policies and hypothetical distributed-system cases. A successful edited program is described as the learner’s result. Python and runtime errors have their own feedback and retain the last successful output and source export. Understanding questions have optional explanations, independent of run success and of explicit reading marks.

The input, prediction, editor, result interpretation and edit instructions remain available with the technical disclosures closed. The published result can be opened without JavaScript or Linux. Existing `esl:` keys, archived RxPY drafts, recovery backups, independent reading marks and source-bearing run exports are used as before. Restore and Recover return to the editor; keyboard focus proceeds to Run in Linux. The run mode disclosure names the selected mode and explains its isolation when opened. Reset Linux appears beside Run while there is a warm guest. It discards Linux for the next run and returns focus to Run in Linux.

Functional verification covers the exact starter sources, documented editor edits, meaningful errors, keyboard transitions, widths and themes, and legacy and denied-storage behavior. It shows that learners can perform the specified actions and retrieve the named evidence. Learning effectiveness would require observing learners’ explanations or work.

The native guide’s Bash commands ran both backends at 100,000 and 200,000 records. All five trials in each invocation matched the expected answer. The Windows PowerShell alternative remains a platform-specific set of instructions. Browser verification used Chromium and viewport checks.
