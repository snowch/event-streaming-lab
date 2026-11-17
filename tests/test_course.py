import json,sys,subprocess,importlib.util
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'python'))
from course import event_time,queue_run,recover,corrections,sessions,clock_windows,interval_join,capstone,operation_effort,latency_run,recovery_capacity
lessons=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {lessons} from './src/lessons.mjs'; console.log(JSON.stringify(lessons))"],cwd=ROOT))
def execute(source):
    namespace={}
    exec(source,namespace)
    return namespace['result']

sources={lesson['slug']:lesson['code'] for lesson in lessons}
results=[];by_slug={}
for lesson in lessons:
    result=execute(lesson['code']);results.append(result);by_slug[lesson['slug']]=result
assert by_slug['stream-live-through-kafka']['live_arrivals']==4
assert [r['total'] for r in by_slug['stream-live-through-kafka']['records']]==[12,8,17,24,17]
assert [e['id'] for e in by_slug['follow-an-event']]==['a','e']
assert by_slug['keep-state-by-key'][-1]=={'arrival':'e','shop':'South','total':17}
assert by_slug['close-a-window']==[{'start':0,'end':10,'events':['a','b']},{'start':10,'end':20,'events':['c','d']}]
assert by_slug['wait-for-late-events']['late']==['d']
assert event_time(30)['late']==[] and event_time(30)['windows'][0]['total']==24
assert by_slug['replay-without-double-counting']==[41]
assert by_slug['enrich-a-stream'][1]['region']=='unknown'
for capacity in (1,3,6):
 r=queue_run(capacity);assert sum(t['offered'] for t in r['trace'])==sum(t['completed'] for t in r['trace'])+r['dropped']+r['queued']
assert recover()['outputs']==[12,20,25,32,36] and recover(False)['replayed_records']==3
assert by_slug['read-a-partitioned-log']['0'][1]=={'offset':1,'id':'c'}
assert by_slug['give-consumers-their-own-position']['sales']['1']==[{'offset':1,'id':'e'}]
assert by_slug['evolve-an-event-schema']==[{'id':'a','pence':1200},{'id':'b','pence':850},{'id':'c','rejected':'unknown version'},{'id':'d','rejected':'invalid amount'}]
assert [r['offset'] for r in by_slug['retain-or-compact-a-log']['records']]==[3,4,5]
assert [r['event_window'] for r in by_slug['choose-the-right-clock']['trace']]==[0,1,0,0,2]
assert all(r['processing_time']>=r['event_time'] for r in by_slug['choose-the-right-clock']['trace'])
assert clock_windows()==by_slug['choose-the-right-clock']
clock_before=clock_windows()['trace']
clock_after=execute(sources['choose-the-right-clock'].replace('"c": 13','"c": 9'))['trace']
assert clock_before[2]=={'id':'c','event_time':8,'processing_time':13,'event_window':0,'processing_window':1}
assert clock_after[2]=={'id':'c','event_time':8,'processing_time':9,'event_window':0,'processing_window':0}
assert clock_before[:2]+clock_before[3:]==clock_after[:2]+clock_after[3:]
assert [s['events'] for s in sessions(5)['sessions']]==[[0,4,8],[20]]
assert [s['events'] for s in sessions(3)['sessions']]==[[0],[4],[8],[20]]
assert corrections(5)['updates']==[{'window':0,'revision':1,'total':10},{'window':0,'revision':2,'total':15}]
assert corrections(0)['late']==['b','c'] and corrections(10)['late']==[]
assert interval_join(10)['matches']==[{'order':'x','receipt':'p1'},{'order':'x','receipt':'p2'}]
assert len(interval_join(20)['matches'])==3
assert interval_join()==by_slug['count-the-join-output']
wider_source=sources['count-the-join-output'].replace('horizon=10','horizon=20')
wider=execute(wider_source)
assert wider['matches'][-1]=={'order':'y','receipt':'p3'} and wider['comparisons']==6
more=execute(wider_source.replace('\n]', '\n    {"id": "x", "time": 10, "receipt": "p4"},\n]'))
assert more['matches']==wider['matches'][:2]+[{'order':'x','receipt':'p4'},wider['matches'][-1]]
assert more['comparisons']==8
assert [r['region'] for r in by_slug['look-up-the-past']['trace']]==['West','East','West']
assert operation_effort(8,2)['linear_dedup_comparisons']==10
assert operation_effort(8,8)['linear_dedup_comparisons']==28
for n in (1,8,16,50): assert operation_effort(n,n)['linear_dedup_comparisons']==n*(n-1)//2
assert latency_run(1)['trace'][0]['completed_ms']==5
assert latency_run(4)['trace'][0]['completed_ms']==24
assert latency_run(4)['elapsed_ms']<latency_run(1)['elapsed_ms']
assert latency_run(4)['p99_ms']>latency_run(1)['p99_ms']
assert recovery_capacity()['catch_up_seconds']==20 and recovery_capacity(80,80)['catch_up_seconds'] is None
r=capstone();assert r['sink']=={0:{'revision':2,'total':15}} and r['late']==['c'] and r['invalid']==['bad'] and r['duplicates']==['a']
assert capstone(False)['sink'][0]['total']==25
assert capstone(True,0)['sink'][0]['total']==10
from patterns import route_events,expand_orders,materialized_view,forget_state,detect_sequence,retry_events,bounded_backfill,changing_join
assert by_slug['route-and-quarantine']['accounted_for']==4
assert [r['id'] for r in route_events()['accepted']]==['a','d']
assert len(route_events(extra='{"id":"z","amount":true}')['quarantine'])==3
assert len(route_events(extra='{"id":"z","amount":0}')['accepted'])==3
assert expand_orders(2)['totals']=={'bell':8,'light':6,'wheel':30}
assert materialized_view()['view']=={'B':8} and materialized_view(False)['view']=={'A':11,'B':8}
assert forget_state()['accepted']==2 and forget_state(False)['accepted']==1
assert len(detect_sequence()['alerts'])==2 and detect_sequence(2)['alerts']==[]
assert retry_events()['total_attempts']==8 and retry_events(2)['success']==['a']
assert bounded_backfill()['write_attempts']==6 and bounded_backfill(stop=3)['visible_rows']==2
assert changing_join()['pairs']==[{'order':'o2','region':'East'}]
assert len(changing_join('product')['pairs'])==4 and changing_join('first')['pairs']==[{'order':'o1','region':'West'}]
spec=importlib.util.spec_from_file_location('native_benchmark',ROOT/'harnesses/native-benchmark.py');bench=importlib.util.module_from_spec(spec);spec.loader.exec_module(bench)
for backend in ('bytewax','direct'):
 for n in (1,9,10,10000):
  measured=bench.run(n,1,backend);assert measured['trials'][0]['actual']==sum(i*2 for i in range(n) if i%2==0)
print(json.dumps(results) if '--json' in sys.argv else str(len(lessons))+' exact lesson examples, boundary/variant invariants and both measured native backends passed.')
