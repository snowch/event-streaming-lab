"""Reusable streaming patterns: real Bytewax graphs, with named fixture boundaries."""
import base64
from datetime import timedelta
import json
import random
import time
import bytewax.operators as op
from bytewax.dataflow import Dataflow
from bytewax.testing import TestingSource, TestingSink, run_main
from course import collect, ORDERS


def route_events(extra=None):
    raw=[b'{"id":"a","amount":12}',b'not-json',b'{"id":"c","amount":-1}',b'{"id":"d","amount":5}']
    if extra is not None: raw.append(extra.encode('utf-8'))
    flow=Dataflow('route_and_quarantine')
    source=op.input('bytes',flow,TestingSource(list(enumerate(raw)),batch_size=1))
    def decode(row):
        arrival,payload=row
        try:
            event=json.loads(payload)
            if not isinstance(event,dict) or not isinstance(event.get('id'),str): raise ValueError('invalid envelope')
            if type(event.get('amount')) is not int or event['amount']<0: raise ValueError('invalid amount')
            return {'arrival':arrival,'ok':True,'event':event}
        except (ValueError,UnicodeDecodeError) as error:
            return {'arrival':arrival,'ok':False,'reason':'invalid JSON' if isinstance(error,json.JSONDecodeError) else str(error),
                    'original_b64':base64.b64encode(payload).decode()}
    decoded=op.map('decode',source,decode)
    routed=op.branch('valid',decoded,lambda row:row['ok'])
    good,bad=[],[]
    op.output('accepted',routed.trues,TestingSink(good));op.output('quarantine',routed.falses,TestingSink(bad))
    run_main(flow,epoch_interval=timedelta(0))
    good.sort(key=lambda r:r['arrival']);bad.sort(key=lambda r:r['arrival'])
    return {'input_records':len(raw),'accepted':[r['event'] for r in good],
            'quarantine':bad,'accounted_for':len(good)+len(bad)}


def expand_orders(copies=1):
    if not 1<=copies<=10: raise ValueError('copies must be 1..10')
    carts=[('a',[('wheel',2,5),('light',1,3)]),('b',[('wheel',1,5),('bell',1,4)])]
    source_rows=[(f'{c}/{order}',items) for c in range(copies) for order,items in carts]
    flow=Dataflow('expand_carts')
    source=op.input('carts',flow,TestingSource(source_rows))
    def lines(cart):
        order,items=cart
        return [{'line_id':f'{order}/{i}','sku':sku,'units':units,'pounds':units*price}
                for i,(sku,units,price) in enumerate(items)]
    expanded=op.flat_map('lines',source,lines)
    rows=[];op.output('line_evidence',expanded,TestingSink(rows))
    keyed=op.key_on('sku',expanded,lambda row:row['sku'])
    totals=op.fold_final('sum',keyed,lambda:0,lambda total,row:total+row['pounds'])
    result=collect(flow,totals)
    return {'input_carts':len(source_rows),'output_lines':len(rows),
            'lines':sorted(rows,key=lambda r:r['line_id']),'totals':dict(sorted(result))}


def materialized_view(reject_stale=True):
    changes=[('A',1,10),('B',1,8),('A',2,12),('A',1,9),('A',3,None),('A',2,11)]
    flow=Dataflow('materialized_view')
    source=op.input('changes',flow,TestingSource(list(enumerate(changes)),batch_size=1))
    keyed=op.key_on('entity',source,lambda row:row[1][0])
    def apply(previous,row):
        arrival,(key,version,value)=row
        if reject_stale and previous and version<=previous['version']:
            return previous,{'arrival':arrival,'key':key,'action':'ignored','version':version}
        state={'version':version,'value':value}
        return state,{'arrival':arrival,'key':key,'version':version,'value':value,
                      'action':'delete' if value is None else 'upsert'}
    updated=op.stateful_map('version_guard',keyed,apply)
    rows=sorted([row for _,row in collect(flow,updated)],key=lambda r:r['arrival'])
    view={};deleted=set()
    for row in rows:
        if row['action']=='delete':view.pop(row['key'],None);deleted.add(row['key'])
        elif row['action']=='upsert':view[row['key']]=row['value'];deleted.discard(row['key'])
    return {'view':dict(sorted(view.items())),'ignored':sum(r['action']=='ignored' for r in rows),
            'tombstones':sorted(deleted),'trace':rows}


def forget_state(expire=True):
    actions=[('event','a'),('event','a'),('expire','a'),('event','a')]
    flow=Dataflow('forget_identity')
    source=op.input('controls',flow,TestingSource(actions,batch_size=1))
    keyed=op.key_on('identity',source,lambda row:row[1])
    def remember(state,row):
        kind,identity=row
        if kind=='expire':
            return (None if expire else state),{'id':identity,'action':'expired' if expire else 'expiry ignored'}
        action='accepted' if state is None else 'duplicate'
        return True,{'id':identity,'action':action,'had_state':state is not None}
    rows=[row for _,row in collect(flow,op.stateful_map('remember',keyed,remember))]
    return {'accepted':sum(r['action']=='accepted' for r in rows),
            'duplicates':sum(r['action']=='duplicate' for r in rows),'trace':rows,
            'boundary':'Expiry is an authored control record; returning None really deletes Bytewax keyed state. No automatic clock timer is implemented.'}


def detect_sequence(horizon=10):
    if horizon<=0: raise ValueError('horizon must be positive')
    events=[('d1','fail',0),('d2','fail',1),('d1','fail',3),('d1','ok',4),
            ('d1','fail',8),('d1','fail',9),('d1','ok',11),('d2','ok',20)]
    flow=Dataflow('failure_then_success')
    source=op.input('events',flow,TestingSource(events,batch_size=1))
    keyed=op.key_on('device',source,lambda e:e[0])
    def step(state,event):
        device,kind,at=event
        failures=[t for t in (state or []) if t>=at-horizon]
        if kind=='fail':return (failures+[at])[-2:],None
        alert={'device':device,'at':at,'failures':failures} if len(failures)>=2 else None
        return None,alert
    detected=op.stateful_map('sequence',keyed,step)
    alerts=op.filter('matches',detected,lambda row:row[1] is not None)
    rows=sorted([row for _,row in collect(flow,alerts)],key=lambda r:(r['at'],r['device']))
    return {'alerts':rows,'horizon':horizon,
            'boundary':'Two failures then success, per-key ordered fixture and inclusive horizon. No absence timer or arbitrary late-event reordering.'}


def retry_events(max_attempts=3):
    if not 1<=max_attempts<=5: raise ValueError('max_attempts must be 1..5')
    events=[{'id':'a','failures':0},{'id':'b','failures':2},
            {'id':'c','permanent':True},{'id':'d','failures':99}]
    flow=Dataflow('retry_budget')
    source=op.input('requests',flow,TestingSource(events))
    def request(event):
        delays=[];rng=random.Random(sum(map(ord,event['id'])))
        for attempt in range(1,max_attempts+1):
            if event.get('permanent'):
                return {'id':event['id'],'status':'quarantine','attempts':attempt,'reason':'permanent','planned_delays_ms':delays}
            if attempt>event.get('failures',0):
                return {'id':event['id'],'status':'success','attempts':attempt,'planned_delays_ms':delays}
            if attempt<max_attempts:delays.append(100*2**(attempt-1)+rng.randrange(10))
        return {'id':event['id'],'status':'quarantine','attempts':max_attempts,'reason':'budget exhausted','planned_delays_ms':delays}
    handled=op.map('bounded_policy',source,request)
    rows=sorted(collect(flow,handled),key=lambda r:r['id'])
    return {'success':[r['id'] for r in rows if r['status']=='success'],
            'quarantine':[r['id'] for r in rows if r['status']=='quarantine'],
            'total_attempts':sum(r['attempts'] for r in rows),'trace':rows,
            'boundary':'Real Bytewax map; authored service-failure fixture. Delays are planned values, not sleeps or observed latency; no external service is called.'}


def bounded_backfill(start=1,stop=4):
    from confluent_kafka import Producer,Consumer,TopicPartition
    producer=Producer({'test.mock.num.brokers':1,'log_level':0})
    brokers=','.join(f'{b.host}:{b.port}' for b in producer.list_topics(timeout=15).brokers.values())
    for order in ORDERS:producer.produce('backfill',value=json.dumps(order),partition=0)
    if producer.flush(15):raise RuntimeError('Backfill fixture delivery timed out')
    def read_range():
        client=Consumer({'bootstrap.servers':brokers,'group.id':'backfill','enable.auto.commit':False,'auto.offset.reset':'error'})
        try:
            low,high=client.get_watermark_offsets(TopicPartition('backfill',0),timeout=15)
            if not low<=start<=stop<=high:raise ValueError('Choose low <= start <= stop <= snapshot next position')
            client.assign([TopicPartition('backfill',0,start)])
            rows=[];deadline=time.monotonic()+30
            while len(rows)<stop-start:
                if time.monotonic()>deadline:raise TimeoutError('Bounded read timed out')
                message=client.poll(0.1)
                if message is None:continue
                if message.error():raise RuntimeError(str(message.error()))
                if message.offset()>=stop:break
                rows.append((message.offset(),json.loads(message.value())))
            return high,rows
        finally:client.close()
    sink={};attempts=0;offsets=[]
    for replay in range(2):
        high,rows=read_range()
        flow=Dataflow(f'projection_v2_{replay}')
        source=op.input('snapshot_range',flow,TestingSource(rows))
        mapped=op.map('pence_v2',source,lambda row:{'offset':row[0],'id':row[1]['id'],'pence':row[1]['amount']*100})
        processed=collect(flow,mapped)
        offsets=[r['offset'] for r in processed]
        for row in processed:attempts+=1;sink['projection-v2/'+row['id']]=row['pence']
    return {'snapshot_next_position':high,'range':[start,stop],'offsets':offsets,
            'write_attempts':attempts,'visible_rows':len(sink),'sink':dict(sorted(sink.items())),
            'boundary':'Actual Kafka simulator reads and Bytewax map; one frozen partition range, versioned local upsert view. No production snapshot isolation or atomic promotion.'}


def changing_join(insert_mode='last'):
    if insert_mode not in ('first','last','product'):raise ValueError('Choose first, last or product')
    events=[('customer',{'key':'u1','region':'West'}),('order',{'key':'u1','id':'o1'}),
            ('customer',{'key':'u1','region':'East'}),('order',{'key':'u1','id':'o2'})]
    flow=Dataflow('changing_join')
    source=op.input('updates',flow,TestingSource(events,batch_size=1))
    sides=op.branch('side',source,lambda e:e[0]=='order')
    orders=op.map('orders',sides.trues,lambda e:(e[1]['key'],e[1]))
    customers=op.map('customers',sides.falses,lambda e:(e[1]['key'],e[1]))
    joined=op.join('join',orders,customers,insert_mode=insert_mode,emit_mode='final')
    rows=collect(flow,joined)
    pairs=sorted([{'order':order['id'],'region':customer['region']} for _,(order,customer) in rows],key=lambda r:(r['order'],r['region']))
    return {'pairs':pairs,'insert_mode':insert_mode,'emit_mode':'final',
            'boundary':'Real Bytewax join; one key, finite inputs, EOF emission. Product history can grow; this is not an event-time interval or temporal as-of join.'}
