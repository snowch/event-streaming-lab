const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const branch=(title,source,targets,note)=>({title,source,targets,note,type:'branch'});
const flow=(title,nodes,note)=>({title,nodes,note,type:'flow'});
const sequence=(title,rows,note)=>({title,rows,note,type:'sequence'});
const frames=(title,items,note)=>({title,items,note,type:'frames'});
export function renderDiagram(id){
 const diagram=diagrams[id];if(!diagram)return '';
 let body='';
 if(diagram.type==='flow')body=`<ol class="diagram-flow" style="--columns:${diagram.nodes.length}">${diagram.nodes.map(([role,title,detail])=>`<li><small>${esc(role)}</small><strong>${esc(title)}</strong><span>${esc(detail)}</span></li>`).join('')}</ol>`;
 if(diagram.type==='sequence')body=`<ol class="diagram-sequence">${diagram.rows.map(([left,label,right,direction])=>`<li><span>${esc(left)}</span><span class="diagram-message ${direction==='back'?'is-return':direction==='lost'?'is-lost':''}"><small>${esc(label.replace(/[←→]/g,'').trim())}</small><svg aria-hidden="true" viewBox="0 0 80 18" width="80" height="18"><path d="M2 9h70m-7-6 8 6-8 6"/></svg></span><span>${esc(right)}</span></li>`).join('')}</ol>`;
 if(diagram.type==='branch'){
  const node=([role,title,detail])=>`<small>${esc(role)}</small><strong>${esc(title)}</strong><span>${esc(detail)}</span>`;
  body=`<div class="diagram-tree"><div class="diagram-root">${node(diagram.source)}</div><ol class="diagram-branches" style="--columns:${diagram.targets.length}">${diagram.targets.map(target=>`<li>${node(target)}</li>`).join('')}</ol></div>`;
 }
 if(diagram.type==='frames')body=`<div class="diagram-frames"><span class="message-label">One multipart message</span><ol>${diagram.items.map(([label,value])=>`<li><small>${esc(label.replace(/[←→]/g,'').trim())}</small><code>${esc(value)}</code></li>`).join('')}</ol></div>`;
 return `<figure class="concept-diagram" data-concept="${esc(id)}"><figcaption>${esc(diagram.title)}</figcaption>${body}<p class="diagram-caption"><span>Conceptual diagram.</span> ${esc(diagram.note)}</p></figure>`;
}

const diagrams={
'follow-an-event':flow('Follow what survives each operation',[
 ['Input','Five orders','The source contains more records than the final output.'],['Predicate','Filter','Only eligible orders continue.'],['Transformation','Map','Choose the output record shape.'],['Observed output','a and e','Output count is different from input count.']
],'The starter source is bounded. Run executes the actual Bytewax operators; the diagram is an explanatory view.'),
'read-a-partitioned-log':branch('An offset belongs to one partition',
 ['Topic','Explicit key routing','North and South are placed into separate partitions.'],
 [['Partition 0','0:a · 1:c · 2:d','An ordered North history.'],['Partition 1','0:b · 1:e','An ordered South history.']],
 'The partitions are parallel histories; no single offset orders both. Real clients read the Kafka simulator.'),
'give-consumers-their-own-position':branch('Readers do not have to share progress',
 ['Retained log','Partitioned records','One history can serve independent readers.'],
 [['Sales reader','Own next position','Advance under the sales processing contract.'],['Audit reader','Own next position','Advance independently under the audit contract.']],
 'A committed position does not preserve source data beyond retention. Inspect the actual per-partition positions in the result.'),
'keep-state-by-key':branch('The key selects a separate retained history',
 ['Incoming orders','Key by shop','Route an event to its own accumulator.'],
 [['North','North running total','A South record does not update this state.'],['South','South running total','A North record does not update this state.']],
 'These are parallel keyed histories in one worker. Distributed ownership and rescaling require additional mechanisms.'),
'close-a-window':branch('Event time determines window membership',
 ['Timestamped events','0, 4, 10, 14','Assign each event under the declared interval convention.'],
 [['Window [0,10)','a and b','The upper boundary is excluded.'],['Window [10,20)','c and d','Timestamp 10 belongs here.']],
 'The real window operator uses the stated clock. Bounded source completion also participates in emission.'),
'merge-a-session':flow('A bridging event can connect earlier observations',[
 ['Event-time observations','0, 8, then 4; later 20','Arrival order differs from timestamp order.'],['Session gap 5','4 bridges 0 and 8','Both neighboring gaps are within the session rule.'],['Resulting groups','[0, 4, 8] and [20]','The distant observation stays in its own session.']
 ],'This shows the starter event-time relationships. Sessions are not fixed-width buckets.'),
'wait-for-late-events':branch('Arrival order and event time answer different questions',
 ['EventClock + window','Out-of-order arrivals','Compare event timestamps with watermark progress under the declared lateness policy.'],
 [['Window output','Accepted members','The real window operator emits the bounded result.'],['Late side output','Too-late records','Inspect these separately from accepted window members.']],
 'A later arrival can describe an earlier event. Run provides the execution trace below. The frozen wall clock makes this fixture repeatable, not a latency benchmark.'),
'correct-a-late-result':flow('Emission, correction and cleanup are separate boundaries',[
 ['First emission','Total 10','A provisional answer is visible.'],['Eligible late record','Revision: total 15','The authored policy corrects that answer.'],['Cleanup boundary','Forget retained state','A later arrival cannot use that state.'],['After cleanup','Late-data decision','Route or reconcile under a new contract.']
],'This is the labelled correction reference policy. It is not presented as a built-in Bytewax retraction operator.'),
'route-and-quarantine':branch('Account for both validation outcomes',
 ['Raw payload','Decode and validate','Preserve identity and failure provenance.'],
 [['Valid branch','Accepted event','Continue normal processing.'],['Invalid branch','Quarantine envelope','Retain original failed bytes and a reason.']],
 'The branches are mutually exclusive. A bounded local quarantine list does not establish durable retention or repair.'),
'expand-and-rekey':flow('One cart becomes several independently identified lines',[
 ['Cart input','One order','Contains multiple product lines.'],['flat_map','Zero, one or many lines','Output cardinality can exceed input cardinality.'],['key_on','SKU ownership','Line identity and aggregation key differ.'],['fold_final','Totals at EOF','A live stream needs an emission policy.']
],'The actual Bytewax graph implements these transformations. Fan-out and retained key count are separate budgets.'),
'build-a-materialized-view':flow('Deleting the visible value can leave consistency metadata',[
 ['Entity updates','Versions 1, 2, 3','The source defines version authority.'],['Version guard','Reject stale updates','Arrival order is not the authority.'],['Current view','A is deleted','Remove the visible value.'],['Retained tombstone','Remember version 3','Reject a later stale version 2.']
],'The local stateful map and upsert policy are executed. Tombstone retention still needs a replay/deletion contract.'),
'enrich-a-stream':flow('Enrichment looks up a second source of meaning',[
 ['Order','Join key','Select which reference entity is needed.'],['Reference data','Region lookup','The fixture has a bounded reference map.'],['Enriched record','Order + region','A missing lookup follows an explicit policy.']
],'A current lookup is different from historical as-of semantics. Inspect the fixture before interpreting a result as historical truth.'),
'count-the-join-output':branch('One event can produce several join matches',
 ['Order x','Apply the interval predicate','More than one receipt can match the same order.'],
 [['Matching receipt p1','Joined row x / p1','One output match.'],['Matching receipt p2','Joined row x / p2','Another output for the same input.']],
 'This is the labelled interval-join reference. Retained history and matching rules determine output multiplicity.'),
'look-up-the-past':flow('An as-of lookup needs versioned history',[
 ['Fact','Order event time','The question is what was valid then.'],['Dimension history','Versions and validity','Retain the relevant earlier changes.'],['As-of policy','Latest valid prior version','Current state can answer a different question.']
],'The temporal reference is authored and inspectable. Late dimension updates and retention need explicit policies.'),
'replay-without-double-counting':flow('Stable identity separates a logical event from its deliveries',[
 ['Deliveries','A repeated identity','The source can replay an already seen event.'],['Identity state','Seen or new?','The retention horizon matters.'],['Accepted events','Update the aggregate','Suppress the duplicate under this policy.']
],'This executes keyed identity state locally. It does not coordinate an arbitrary external effect atomically.'),
'recover-after-a-failure':flow('Restore state and source position from one completed checkpoint',[
 ['Completed checkpoint','Sum 25 · next position 3','The drill observes completion before the crash.'],['Failure','SIGKILL','The engine process actually stops.'],['New process','Restore the checkpoint','Source position and state resume together.'],['New input','7 and 4 → total 36','Ordinary output is not a transactional sink.']
],'The whole drill stays inside one guest. Closing the browser loses this temporary recovery database.'),
'forget-state-deliberately':flow('Expiry changes what a future duplicate means',[
 ['First identity a','Accept and remember','Retain keyed identity state.'],['Repeat a','Duplicate','The identity is still retained.'],['Expiry control','Delete state','The authored control returns None.'],['Later a','Accepted again','The previous history is no longer present.']
],'The control record is authored; returning None really deletes Bytewax state. No automatic TTL timer is implied.'),
'measure-latency-and-batching':flow('Batching changes the waiting boundary',[
 ['Arrival','Work becomes eligible','Start the end-to-end clock at a declared point.'],['Batch assembly','Wait for more work','Larger batches can add queueing delay.'],['Service','Amortize fixed overhead','Throughput can improve.'],['Completion','Observe latency too','Faster throughput need not mean faster first results.']
],'This is the labelled deterministic latency model. Its computed milliseconds are not measured CPU or network performance.'),
'when-the-consumer-falls-behind':flow('A queue buys time, not service capacity',[
 ['Offered load','Arrival rate λ','Decide what is admitted or rejected.'],['Bounded queue','Unfinished work','Backlog grows if admitted work exceeds completion.'],['Consumer','Service rate μ','Only completed work leaves this population.']
],'This is the discrete teaching model. Count queued, completed and dropped work under its stated definitions.'),
'budget-for-recovery':flow('Recovery needs headroom above new arrivals',[
 ['Outage','Backlog accumulates','Retained work must still be available.'],['Restart','New arrivals continue','Normal workload has not paused automatically.'],['Headroom','Completion minus arrivals','Positive headroom drains the backlog.'],['Caught up','Freshness restored','Equal rates cannot drain a positive backlog.']
],'This is a labelled fluid capacity model. The actual deployment needs measured rates and retention evidence.'),
'run-a-bounded-backfill':flow('A replay needs a range, identity and destination contract',[
 ['Source cut','Declared start/stop offsets','Freeze the bounded range.'],['Reprocess','Versioned transformation','Keep stable logical record identities.'],['Shadow view','projection-v2','Use an isolated destination namespace.'],['Validation','Replayed writes, stable rows','An upsert view can hide repeated attempts.']
],'The Kafka simulator reads and Bytewax map really execute. Atomic production snapshot/cutover guarantees remain separate.'),
'resolve-the-streaming-incident':flow('Follow the first divergence through the whole pipeline',[
 ['Contract','Reject invalid records','Account for every rejected input.'],['Identity','Suppress duplicate a','Retain the chosen duplicate horizon.'],['Time policy','Revise total 10 → 15','Apply the authored late-data rule.'],['Finality','Route later c separately','A final visible total does not count every arrival.']
],'The capstone combines real Bytewax state with a labelled correction policy. Export runs to compare observed evidence.')
};
