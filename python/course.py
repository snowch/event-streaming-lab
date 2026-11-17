"""Real Bytewax/Kafka experiments and explicitly labelled reference policies."""
from datetime import datetime, timedelta, timezone
import json
import bytewax.operators as op
import bytewax.operators.windowing as win
from bytewax.dataflow import Dataflow
from bytewax.testing import TestingSink, TestingSource, run_main

EPOCH = datetime(2022, 1, 1, tzinfo=timezone.utc)

ORDERS = [
    {'id':'a','shop':'North','amount':12,'time':0},
    {'id':'b','shop':'South','amount':8,'time':12},
    {'id':'c','shop':'North','amount':5,'time':8},
    {'id':'d','shop':'North','amount':7,'time':3},
    {'id':'e','shop':'South','amount':9,'time':25},
]

def collect(flow, stream):
    """Execute a real one-worker dataflow and collect its finite output."""
    out = []
    op.output('collect', stream, TestingSink(out))
    run_main(flow, epoch_interval=timedelta(0))
    return out

def event_time(wait=5):
    """Bytewax EventClock and collect_window; frozen wall time, EOF flush."""
    if wait < 0: raise ValueError('wait must be nonnegative')
    flow = Dataflow('event_time')
    source = op.input('orders', flow, TestingSource(ORDERS, batch_size=1))
    keyed = op.key_on('key', source, lambda _: 'ALL')
    clock = win.EventClock(lambda e: EPOCH + timedelta(seconds=e['time']),
        wait_for_system_duration=timedelta(seconds=wait), now_getter=lambda: EPOCH,
        to_system_utc=lambda _: None)
    windowed = win.collect_window('windows', keyed, clock,
        win.TumblingWindower(length=timedelta(seconds=10), align_to=EPOCH))
    closed, late = [], []
    op.output('closed', windowed.down, TestingSink(closed))
    op.output('late', windowed.late, TestingSink(late))
    run_main(flow)
    windows = [{'window':f'[{wid*10}, {(wid+1)*10})',
                'ids':[e['id'] for e in events], 'total':sum(e['amount'] for e in events)}
               for _, (wid, events) in sorted(closed, key=lambda row:row[1][0])]
    late_ids = [e['id'] for _, (_, e) in late]
    return {'windows':windows, 'late':late_ids,
            'trace':[{'emission':'closed window', **row} for row in windows] +
                    [{'emission':'late side output', 'id':i} for i in late_ids],
            'boundary':'Real Bytewax EventClock; frozen wall clock; EOF flushes open windows.'}

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

def failure_schedule(idempotent=True):
    """Crash after writing b, before committing its offset. Restart replays b."""
    deliveries=['a','b','b','c']; sink={}; receipts=[]
    def write(event):
        receipts.append(event)
        if idempotent: sink[event]=10
        else: sink[event]=sink.get(event,0)+10
        return {'delivery':event,'total':sum(sink.values())}
    trace=[write(event) for event in deliveries]
    return {'receipts':receipts,'stored_total':sum(sink.values()),'trace':trace,
            'boundary':'A deterministic crash schedule, not durable checkpoint recovery.'}

def partition_log():
    """Bytewax KafkaSource reads real protocol records from a mock broker."""
    from kafka_lab import partition_log as experiment
    return experiment(ORDERS)

def consume_log(committed=1):
    """Real client commits and reads two independent simulated Kafka groups."""
    from kafka_lab import consume_log as experiment
    return experiment(ORDERS, committed)

def recover(checkpoint=True):
    """Run the process-kill/restart experiment; state survives this process kill."""
    from recovery_drill import recover as experiment
    return experiment(checkpoint)

def timed_windows(width=10, slide=10):
    """Real Bytewax event-time windows; fixed wait keeps all four events."""
    if width <= 0 or slide <= 0: raise ValueError('width and slide must be positive')
    flow = Dataflow('timed_windows')
    source = op.input('events', flow, TestingSource([(1,'a'),(7,'b'),(12,'c'),(18,'d')], batch_size=1))
    keyed = op.key_on('key', source, lambda _: 'ALL')
    clock = win.EventClock(lambda e:EPOCH+timedelta(seconds=e[0]),
        wait_for_system_duration=timedelta(seconds=30), now_getter=lambda:EPOCH,
        to_system_utc=lambda _:None)
    windowed = win.collect_window('windows', keyed, clock,
        win.SlidingWindower(length=timedelta(seconds=width), offset=timedelta(seconds=slide), align_to=EPOCH))
    rows = collect(flow, windowed.down)
    return [{'start':wid*slide, 'end':wid*slide+width, 'events':[e[1] for e in events]}
            for _, (wid,events) in sorted(rows,key=lambda row:row[1][0])]


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


def clock_windows(processing_times=None):
    if processing_times is None:
        processing_times={'a':0,'b':12,'c':13,'d':14,'e':25}
    rows=[]
    for order in ORDERS:
        event_time=order['time']
        processing_time=processing_times[order['id']]
        rows.append({'id':order['id'],'event_time':event_time,'processing_time':processing_time,
                     'event_window':event_time//10,'processing_window':processing_time//10})
    return {'trace':rows,'note':'Authored arrival clock; neither clock measures execution speed.'}


def sessions(gap=5):
    if gap<=0: raise ValueError('gap must be positive')
    flow=Dataflow('sessions')
    source=op.input('events',flow,TestingSource([0,8,4,20],batch_size=1))
    keyed=op.key_on('key',source,lambda _:'ALL')
    clock=win.EventClock(lambda t:EPOCH+timedelta(seconds=t),
        wait_for_system_duration=timedelta(seconds=30),now_getter=lambda:EPOCH,
        to_system_utc=lambda _:None)
    windowed=win.collect_window('sessions',keyed,clock,win.SessionWindower(gap=timedelta(seconds=gap)))
    rows=collect(flow,windowed.down)
    final=sorted([{'first':min(events),'last':max(events),'events':sorted(events)}
                  for _,(_,events) in rows],key=lambda row:row['first'])
    return {'sessions':final,'gap':gap,'trace':[{'emission':'closed session',**row} for row in final]}


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


def interval_join(horizon=10, payments=None):
    if horizon<0: raise ValueError('horizon must be nonnegative')
    orders=[{'id':'x','time':0},{'id':'y','time':4}]
    if payments is None:
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
    """Count reference algorithms, not CPU cycles or Bytewax internal operations."""
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
    flow=Dataflow('incident')
    source=op.input('actions',flow,TestingSource(actions,batch_size=1))
    keyed=op.key_on('window',source,lambda _:'window-0')
    def apply(state,item):
        old=state or {'seen':set(),'watermark':-1,'total':0,'late':[],
                     'invalid':[],'duplicates':[],'sink':{},'revision':0,'trace':[]}
        state={**old,'seen':set(old['seen']),'late':list(old['late']),
               'invalid':list(old['invalid']),'duplicates':list(old['duplicates']),
               'sink':dict(old['sink']),'trace':list(old['trace'])}
        if 'watermark' in item: state['watermark']=item['watermark']
        elif item['amount']<0: state['invalid'].append(item['id'])
        elif deduplicate and item['id'] in state['seen']: state['duplicates'].append(item['id'])
        elif state['watermark']>=10+allowed_lateness: state['late'].append(item['id'])
        else:
            state['seen'].add(item['id']);state['total']+=item['amount']
        if state['watermark']>=10 and (not state['sink'] or state['sink'][0]['total']!=state['total']):
            state['revision']+=1
            state['sink'][0]={'revision':state['revision'],'total':state['total']}
        state['trace'].append({'input':item,'watermark':state['watermark'],
             'total':state['total'],'revision':state['revision'],
             'late':list(state['late']),'invalid':list(state['invalid']),
             'duplicates':list(state['duplicates'])})
        output={key:state[key] for key in ['sink','late','invalid','duplicates','trace']}
        output['note']='Real Bytewax keyed state; authored watermark controls/correction policy; no external transactional sink or configured checkpoint.'
        return state,output
    updated=op.stateful_map('policy',keyed,apply)
    return collect(flow,updated)[-1][1]
