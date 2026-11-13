"""Bounded teaching models. RxPY operators execute; distributed systems are not emulated."""
import reactivex as rx
from reactivex import operators as ops

ORDERS = [
    {'id':'a','shop':'North','amount':12,'time':0},
    {'id':'b','shop':'South','amount':8,'time':12},
    {'id':'c','shop':'North','amount':5,'time':8},
    {'id':'d','shop':'North','amount':7,'time':3},
    {'id':'e','shop':'South','amount':9,'time':25},
]

def values(stream):
    out, errors = [], []
    stream.subscribe(out.append, errors.append)
    if errors: raise errors[0]
    return out

def event_time(wait=5):
    """One partition. Late iff timestamp < watermark; EOF flush is explicit."""
    def step(previous, item):
        state = {'maximum':previous['maximum'], 'watermark':previous['watermark'],
                 'open':{k:list(v) for k,v in previous['open'].items()},
                 'closed':list(previous['closed']), 'late':list(previous['late']),
                 'arrival':item['id'] if item else 'EOF'}
        if item:
            state['maximum'] = max(state['maximum'], item['time'])
            state['watermark'] = state['maximum'] - wait
            if item['time'] < state['watermark']: state['late'].append(item['id'])
            else: state['open'].setdefault(item['time']//10, []).append(item)
        for window in sorted(list(state['open'])):
            if item is None or (window+1)*10 <= state['watermark']:
                events=state['open'].pop(window)
                state['closed'].append({'window':f'[{window*10}, {(window+1)*10})',
                    'ids':[e['id'] for e in events], 'total':sum(e['amount'] for e in events)})
        return state
    seed={'maximum':-1,'watermark':None,'open':{},'closed':[],'late':[]}
    trace=values(rx.from_iterable([*ORDERS,None]).pipe(ops.scan(step,seed=seed)))
    return {'windows':trace[-1]['closed'],'late':trace[-1]['late'],'trace':trace}

def queue_run(capacity=3, offered=2, service=1):
    """Discrete ticks: arrivals, drop newest if full, then service. Not Rx backpressure."""
    if capacity<1 or offered<0 or service<0: raise ValueError('Use positive capacity and nonnegative rates')
    backlog=0; dropped=0; trace=[]
    for tick in range(1,9):
        incoming=offered if tick<=5 else 0
        rejected=max(0,backlog+incoming-capacity)
        dropped+=rejected
        backlog=min(capacity,backlog+incoming)
        completed=min(service,backlog);backlog-=completed
        trace.append({'tick':tick,'offered':incoming,'completed':completed,'queued':backlog,'dropped':rejected})
    return {'trace':trace,'dropped':dropped,'queued':backlog}

def recover(idempotent=True):
    """Crash after writing b, before committing its offset. Restart replays b."""
    deliveries=['a','b','b','c']; sink={}; receipts=[]
    def write(event):
        receipts.append(event)
        if idempotent: sink[event]=10
        else: sink[event]=sink.get(event,0)+10
        return {'delivery':event,'total':sum(sink.values())}
    trace=values(rx.from_iterable(deliveries).pipe(ops.map(write)))
    return {'receipts':receipts,'stored_total':sum(sink.values()),'trace':trace,
            'boundary':'A deterministic crash schedule, not durable checkpoint recovery.'}

def partition_log():
    """Explicit routing, offsets per partition. A list model, not a Kafka broker."""
    partitions={'0':[],'1':[]}
    for order in ORDERS:
        partition='0' if order['shop']=='North' else '1'
        partitions[partition].append({'offset':len(partitions[partition]),'id':order['id']})
    return partitions

def consume_log(committed=1):
    """Committed position means next offset to read. Groups have independent cursors."""
    log=partition_log()
    return {'sales':{p:[row for row in rows if row['offset']>=committed] for p,rows in log.items()},
            'audit':log,
            'note':'Both groups can read the same retained log; committed is the next offset.'}


def retained_log(start=2, compact=False):
    """One fixed partition. Cut offsets first; optional latest-value view second."""
    log=[{'offset':0,'key':'a','value':10},{'offset':1,'key':'b','value':8},
         {'offset':2,'key':'a','value':12},{'offset':3,'key':'c','value':5},
         {'offset':4,'key':'b','value':None},{'offset':5,'key':'a','value':15}]
    retained=[row for row in log if row['offset']>=start]
    if compact:
        latest={row['key']:row for row in retained}
        retained=sorted(latest.values(),key=lambda row:row['offset'])
    return {'records':retained,'earliest_available':start,'next_position':6,
            'note':'Compaction is an idealized latest-per-key pass. Tombstones remain visible.'}


def clock_windows():
    observed=[0,12,13,14,25]
    rows=[{'id':e['id'],'event_time':e['time'],'processing_time':p,
           'event_window':e['time']//10,'processing_window':p//10}
          for e,p in zip(ORDERS,observed)]
    return {'trace':rows,'note':'Authored arrival clock; neither clock measures execution speed.'}


def sessions(gap=5):
    if gap<0: raise ValueError('gap must be nonnegative')
    active=[];trace=[]
    for event in [0,8,4,20]:
        touching=[s for s in active if event<=s['last']+gap and event+gap>=s['first']]
        untouched=[s for s in active if s not in touching]
        times=sorted([event]+[t for s in touching for t in s['events']])
        active=sorted(untouched+[{'first':times[0],'last':times[-1],'events':times}],key=lambda s:s['first'])
        trace.append({'arrival':event,'sessions':[dict(s) for s in active]})
    return {'trace':trace,'sessions':active,'gap':gap}


def corrections(lateness=5):
    """Explicit window end=10; cleanup at watermark >= 10+lateness."""
    if lateness<0: raise ValueError('lateness must be nonnegative')
    watermark=-1;total=0;revision=0;emitted=False;expired=False;updates=[];late=[];trace=[]
    actions=[('event','a',10),('watermark',10,0),('event','b',5),
             ('watermark',15,0),('event','c',7)]
    for kind,item,amount in actions:
        if kind=='watermark':
            watermark=item
            if watermark>=10 and not emitted:
                emitted=True;revision+=1;updates.append({'window':0,'revision':revision,'total':total})
            if watermark>=10+lateness: expired=True
        elif expired: late.append(item)
        else:
            total+=amount
            if emitted:
                revision+=1;updates.append({'window':0,'revision':revision,'total':total})
        trace.append({'action':f'{kind} {item}','watermark':watermark,'retained':not expired,
                      'accepted_total':total,'revision':revision,'late':list(late)})
    return {'updates':updates,'late':late,'trace':trace}


def interval_join(horizon=10):
    if horizon<0: raise ValueError('horizon must be nonnegative')
    orders=[{'id':'x','time':0},{'id':'y','time':4}]
    payments=[{'id':'x','time':7,'receipt':'p1'},{'id':'x','time':9,'receipt':'p2'},
              {'id':'y','time':20,'receipt':'p3'}]
    comparisons=0;out=[]
    for order in orders:
        for payment in payments:
            comparisons+=1
            if order['id']==payment['id'] and 0<=payment['time']-order['time']<=horizon:
                out.append({'order':order['id'],'receipt':payment['receipt']})
    return {'matches':out,'comparisons':comparisons,'retained_records':len(orders)+len(payments),
            'note':'Bounded nested-loop reference; no online eviction or watermark is implemented.'}


def temporal_lookup(history=True):
    versions=[(0,'West'),(10,'East')]
    result=[]
    for event_time in [5,12,8]:
        region=max((v for v in versions if v[0]<=event_time),key=lambda v:v[0])[1] if history else versions[-1][1]
        result.append({'event_time':event_time,'region':region})
    return {'trace':result,'policy':'as-of event time' if history else 'latest version'}


def operation_effort(n=8, keys=2):
    """Count reference algorithms, not CPU cycles or RxPY internal operations."""
    if not 1<=n<=10000 or not 1<=keys<=n: raise ValueError('Use 1 <= keys <= n <= 10000')
    seen=[];comparisons=0;counts={};calls=0
    for i in range(n):
        key=i%keys;calls+=1;counts[key]=counts.get(key,0)+1
        found=False
        for existing in seen:
            comparisons+=1
            if existing==key: found=True;break
        if not found: seen.append(key)
    return {'events':n,'map_calls':calls,'hash_aggregate_updates':n,'retained_keys':len(counts),
            'linear_dedup_comparisons':comparisons,'linear_dedup_retained':len(seen)}


def latency_run(batch=1):
    """Deterministic FIFO server, time units milliseconds, per-record service cost 3."""
    if not 1<=batch<=4: raise ValueError('Use batch between 1 and 4')
    arrivals=[0,1,2,10,11,12,20,21];available=0;trace=[]
    for first in range(0,len(arrivals),batch):
        group=arrivals[first:first+batch];start=max(available,group[-1])
        # Model a 2ms setup plus 3ms per record, once per batch.
        completed=start+2+3*len(group);available=completed
        for i,arrived in enumerate(group):
            trace.append({'id':first+i,'arrived_ms':arrived,'start_ms':start,
                          'completed_ms':completed,'latency_ms':completed-arrived})
    ordered=sorted(row['latency_ms'] for row in trace)
    import math
    return {'trace':trace,'p50_ms':ordered[math.ceil(.5*len(ordered))-1],
            'p99_ms':ordered[math.ceil(.99*len(ordered))-1],
            'completed':len(trace),'elapsed_ms':available,'note':'Modeled costs; nearest-rank quantiles of completed records.'}


def recovery_capacity(offered=80, service=100, outage=5):
    if min(offered,service,outage)<0: raise ValueError('Rates and outage must be nonnegative')
    backlog=offered*outage;spare=service-offered
    return {'backlog_at_restart':backlog,'spare_per_second':spare,
            'catch_up_seconds':backlog/spare if spare>0 else None,
            'can_catch_up':spare>0,
            'note':'Constant-rate fluid model. No state restore time, retries or further outage included.'}


def capstone(deduplicate=True, allowed_lateness=5):
    """Replay, validation, event-time corrections and a keyed upsert sink in one bounded run."""
    actions=[{'id':'a','time':2,'amount':10}, {'id':'a','time':2,'amount':10},
             {'watermark':10}, {'id':'b','time':4,'amount':5},
             {'id':'bad','time':6,'amount':-3}, {'watermark':15},
             {'id':'c','time':6,'amount':7}]
    seen=set();wm=-1;total=0;late=[];invalid=[];duplicates=[];sink={};revision=0;trace=[]
    for item in actions:
        if 'watermark' in item:
            wm=item['watermark']
        elif item['amount']<0:
            invalid.append(item['id'])
        elif deduplicate and item['id'] in seen:
            duplicates.append(item['id'])
        elif wm>=10+allowed_lateness:
            late.append(item['id'])
        else:
            seen.add(item['id']);total+=item['amount']
        if wm>=10 and (not sink or sink[0]['total']!=total):
            revision+=1;sink[0]={'revision':revision,'total':total}
        trace.append({'input':item,'watermark':wm,'total':total,'revision':revision,
                      'late':list(late),'invalid':list(invalid),'duplicates':list(duplicates)})
    return {'sink':sink,'late':late,'invalid':invalid,'duplicates':duplicates,'trace':trace,
            'note':'One key/window, predetermined watermark actions; no durable checkpoint or actual crash.'}
