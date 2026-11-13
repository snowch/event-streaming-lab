import json,sys,subprocess,importlib.util
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'python'))
from course import event_time,queue_run,recover,corrections,sessions,interval_join,capstone,operation_effort,latency_run,recovery_capacity
lessons=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {lessons} from './src/lessons.mjs'; console.log(JSON.stringify(lessons))"],cwd=ROOT))
results=[];by_slug={}
for lesson in lessons:
    namespace={};exec(lesson['code'],namespace);results.append(namespace['result']);by_slug[lesson['slug']]=namespace['result']
assert [e['id'] for e in by_slug['follow-an-event']]==['a','e']
assert by_slug['keep-state-by-key'][-1]=={'shop':'South','total':17}
assert by_slug['close-a-window']==[{'at':10.0,'events':['a','b']},{'at':20.0,'events':['c','d']},{'at':25.0,'events':[]}]
assert by_slug['wait-for-late-events']['late']==['d']
assert event_time(30)['late']==[] and event_time(30)['windows'][0]['total']==24
assert by_slug['replay-without-double-counting']==[41]
assert by_slug['enrich-a-stream'][1]['region']=='unknown'
for capacity in (1,3,6):
 r=queue_run(capacity);assert sum(t['offered'] for t in r['trace'])==sum(t['completed'] for t in r['trace'])+r['dropped']+r['queued']
assert recover()['stored_total']==30 and recover(False)['stored_total']==40
assert by_slug['read-a-partitioned-log']['0'][1]=={'offset':1,'id':'c'}
assert by_slug['give-consumers-their-own-position']['sales']['1']==[{'offset':1,'id':'e'}]
assert by_slug['evolve-an-event-schema']==[{'id':'a','pence':1200},{'id':'b','pence':850},{'id':'c','rejected':'unknown version'},{'id':'d','rejected':'invalid amount'}]
assert [r['offset'] for r in by_slug['retain-or-compact-a-log']['records']]==[3,4,5]
assert [r['event_window'] for r in by_slug['choose-the-right-clock']['trace']]==[0,1,0,0,2]
assert all(r['processing_time']>=r['event_time'] for r in by_slug['choose-the-right-clock']['trace'])
assert [s['events'] for s in sessions(5)['sessions']]==[[0,4,8],[20]]
assert [s['events'] for s in sessions(3)['sessions']]==[[0],[4],[8],[20]]
assert corrections(5)['updates']==[{'window':0,'revision':1,'total':10},{'window':0,'revision':2,'total':15}]
assert corrections(0)['late']==['b','c'] and corrections(10)['late']==[]
assert interval_join(10)['matches']==[{'order':'x','receipt':'p1'},{'order':'x','receipt':'p2'}]
assert len(interval_join(20)['matches'])==3
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
spec=importlib.util.spec_from_file_location('native_benchmark',ROOT/'harnesses/native-benchmark.py');bench=importlib.util.module_from_spec(spec);spec.loader.exec_module(bench)
for backend in ('rx','direct'):
 for n in (1,9,10,10000):
  measured=bench.run(n,1,backend);assert measured['trials'][0]['actual']==sum(i*2 for i in range(n) if i%2==0)
print(json.dumps(results) if '--json' in sys.argv else '21 exact lesson examples, boundary/variant invariants and both measured native backends passed.')
