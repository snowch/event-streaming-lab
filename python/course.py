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
