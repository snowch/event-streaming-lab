"""Verified native Bytewax service trials, excluding imports and any broker."""
import argparse,json,platform,statistics,time
from importlib.metadata import version
import bytewax.operators as op
from bytewax.dataflow import Dataflow
from bytewax.testing import TestingSource,TestingSink,run_main

def run(count=10000,trials=3,backend='bytewax'):
    if not 1<=count<=10000000 or not 1<=trials<=30: raise ValueError('count 1..10000000; trials 1..30')
    if backend not in ('bytewax','direct'): raise ValueError('Unknown backend')
    even=(count+1)//2;expected=2*even*(even-1);observations=[]
    for _ in range(trials):
        started=time.perf_counter()
        if backend=='bytewax':
            flow=Dataflow('native_benchmark')
            source=op.input('source',flow,TestingSource(range(count)))
            selected=op.filter('even',source,lambda n:n%2==0)
            mapped=op.map('double',selected,lambda n:('ALL',n*2))
            reduced=op.fold_final('sum',mapped,lambda:0,lambda total,n:total+n)
            out=[];op.output('collect',reduced,TestingSink(out));run_main(flow)
            actual=out[0][1]
        else:
            actual=0
            for n in range(count):
                if n%2==0: actual+=n*2
        elapsed=time.perf_counter()-started
        if actual!=expected: raise AssertionError((actual,expected))
        observations.append({'seconds':elapsed,'input_events_per_second':count/elapsed,'actual':actual})
    return {'python':platform.python_version(),'platform':platform.platform(),'bytewax':version('bytewax'),
            'backend':backend,'count':count,'trials':observations,'expected':expected,
            'median_seconds':statistics.median(row['seconds'] for row in observations),
            'boundary':'Graph construction, source iteration, filter/map/fold and collection of one scalar; imports excluded. Sequential native trials; no offered-load, broker or network latency claim.'}
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--count',type=int,default=10000);p.add_argument('--trials',type=int,default=3);p.add_argument('--backend',choices=['bytewax','direct'],default='bytewax');a=p.parse_args();print(json.dumps(run(a.count,a.trials,a.backend),indent=2))
