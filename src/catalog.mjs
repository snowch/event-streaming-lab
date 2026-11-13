export const parts = [
{title:'Events, logs and consumers',outcome:'Preserve meaning and identity as records become a replayable history.',items:['follow-an-event','evolve-an-event-schema','read-a-partitioned-log','retain-or-compact-a-log','give-consumers-their-own-position']},
{title:'Time, windows and late data',outcome:'Choose when to emit, correct and forget a result.',items:['choose-the-right-clock','close-a-window','merge-a-session','wait-for-late-events','advanced/watermarks-across-inputs','correct-a-late-result']},
{title:'State, joins and changing answers',outcome:'Trace ownership, retained history and output multiplicity.',items:['keep-state-by-key','advanced/partitions-and-parallelism','enrich-a-stream','count-the-join-output','look-up-the-past','advanced/joins-and-changing-results']},
{title:'Failure and recovery',outcome:'Locate the consistency boundary from input identity to sink effect.',items:['replay-without-double-counting','advanced/state-timers-and-retention','recover-after-a-failure','advanced/consistent-checkpoints','advanced/recovery-and-external-effects']},
{title:'Performance and capacity',outcome:'Count work, measure a stated boundary and budget for overload and recovery.',items:['measure-operation-effort','measure-latency-and-batching','when-the-consumer-falls-behind','advanced/backpressure-and-alignment','budget-for-recovery']},
{title:'Design and operations',outcome:'Diagnose an incident, defend a policy and identify the next validation layer.',items:['advanced/rescaling-and-hot-keys','advanced/operating-a-streaming-job','resolve-the-streaming-incident']}
];
export const order=parts.flatMap((p,i)=>p.items.map(id=>({id,part:i+1,partTitle:p.title})));
export const href=id=>id.startsWith('advanced/')?id+'.html':'lessons/'+id+'.html';
