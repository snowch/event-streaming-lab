"""Verified local service-throughput trials; not a broker or end-to-end benchmark."""
import argparse,json,platform,statistics,time
from importlib.metadata import version
import reactivex as rx
from reactivex import operators as ops

def run(count=10000,trials=3,backend='rx'):
    if not 1<=count<=10000000 or not 1<=trials<=30: raise ValueError('count 1..10000000; trials 1..30')
    if backend not in ('rx','direct'): raise ValueError('Unknown backend')
    even=(count+1)//2;expected=2*even*(even-1);observations=[]
    for _ in range(trials):
        started=time.perf_counter()
        if backend=='rx':
            out=[]
            rx.from_iterable(range(count)).pipe(ops.filter(lambda n:n%2==0),ops.map(lambda n:n*2),ops.reduce(lambda a,n:a+n,seed=0)).subscribe(out.append)
            actual=out[0]
        else:
            actual=0
            for n in range(count):
                if n%2==0: actual+=n*2
        elapsed=time.perf_counter()-started
        if actual!=expected: raise AssertionError((actual,expected))
        observations.append({'seconds':elapsed,'input_events_per_second':count/elapsed,'actual':actual})
    return {'python':platform.python_version(),'platform':platform.platform(),'reactivex':version('reactivex'),
            'backend':backend,'count':count,'trials':observations,'expected':expected,
            'median_seconds':statistics.median(row['seconds'] for row in observations),
            'boundary':'Source iteration, filter/map/reduce and collection of one scalar; imports excluded. Sequential trials in one process; no independent-load or network latency claim.'}
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--count',type=int,default=10000);p.add_argument('--trials',type=int,default=3);p.add_argument('--backend',choices=['rx','direct'],default='rx');a=p.parse_args();print(json.dumps(run(a.count,a.trials,a.backend),indent=2))
