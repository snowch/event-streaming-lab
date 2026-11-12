import json,sys,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'python'))
from course import event_time,queue_run,recover
# Execute the exact code used by the pages, not a rewritten approximation.
lessons=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {lessons} from './src/lessons.mjs'; console.log(JSON.stringify(lessons))"],cwd=ROOT))
results=[]
for lesson in lessons:
    namespace={};exec(lesson['code'],namespace);results.append(namespace['result'])
assert [e['id'] for e in results[0]]==['a','e']
assert results[1][-1]=={'shop':'South','total':17}
assert results[2]==[{'at':10.0,'events':['a','b']},{'at':20.0,'events':['c','d']},{'at':25.0,'events':[]}]
assert results[3]['late']==['d']
assert event_time(30)['late']==[]
assert event_time(30)['windows'][0]['total']==24
assert results[4]==[41]
assert results[5][1]['region']=='unknown'
for capacity in (1,3,6):
    r=queue_run(capacity);assert sum(t['offered'] for t in r['trace'])==sum(t['completed'] for t in r['trace'])+r['dropped']+r['queued']
assert results[7]['stored_total']==30 and recover(False)['stored_total']==40
assert results[8]['0'][1]=={'offset':1,'id':'c'}
assert results[9]['sales']['1']==[{'offset':1,'id':'e'}]
print(json.dumps(results) if '--json' in sys.argv else 'Ten published Python examples and model invariants passed.')
