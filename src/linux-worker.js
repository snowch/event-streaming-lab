import {WASI,File,Directory,OpenFile,PreopenDirectory,ConsoleStdout} from './engine/wasi/index.js';
import {gunzipSync} from './engine/fflate.mjs';
import {clockPoll} from './wasi-poll.mjs';
let ready,busy=false;
const decoder=new TextDecoder(),encoder=new TextEncoder();
const phase=(message,extra={})=>postMessage({type:'loading',message,...extra});

async function asset(item,report){
 const response=await fetch(new URL('./assets/linux/'+item.file,import.meta.url));
 if(!response.ok)throw Error(`Could not download ${item.file} (${response.status}). Retry when connected.`);
 const reader=response.body.getReader(),chunks=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);length+=value.length;report(value.length)}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
 if(digest!==item.sha256)throw Error(`Download verification failed for ${item.file}. Reload to retry.`);
 return bytes;
}
async function setup(){
 phase('Preparing Linux and Bytewax…');
 const response=await fetch(new URL('./assets/linux/manifest.json',import.meta.url));
 if(!response.ok)throw Error('Runtime manifest unavailable. Reload and retry.');
 const manifest=await response.json();let downloaded=0,lastReport=0;
 const total=manifest.assets.reduce((n,item)=>n+item.bytes,0);
 const report=n=>{downloaded+=n;if(performance.now()-lastReport>250||downloaded===total){lastReport=performance.now();phase(`Loading Linux + Bytewax · ${Math.floor(downloaded/1048576)} / ${Math.ceil(total/1048576)} MiB`,{downloaded,total})}};
 const bytes=await Promise.all(manifest.assets.map(item=>asset(item,report)));
 phase('Compiling the Linux VM…');
 const pieces=bytes.slice(0,3).map(piece=>gunzipSync(piece));
 const engineBytes=new Uint8Array(pieces.reduce((n,b)=>n+b.length,0));let offset=0;
 for(const piece of pieces){engineBytes.set(piece,offset);offset+=piece.length}
 const module=await WebAssembly.compile(engineBytes);
 phase('Preparing the native Python filesystem…');
 const archive=gunzipSync(bytes[3]);
 const names=['course.py','kafka_lab.py','recovery_drill.py','live_kafka.py','patterns.py','runner.py'];
 const helpers=await Promise.all(names.map(async name=>{
  const r=await fetch(new URL('./python/'+name,import.meta.url));if(!r.ok)throw Error('Could not load '+name);
  return [name,new Uint8Array(await r.arrayBuffer())];
 }));
 return {module,archive,helpers};
}

// Build fresh inodes each time. Read-only bundle content is shared, while the
// Linux VM and its writable overlay are newly instantiated for every run.
function filesystem(archive,helpers,source){
 const tree=new Directory(new Map());let pax={};
 for(let p=0;p+512<=archive.length;){
  const block=archive.subarray(p,p+512);if(!block.some(n=>n))break;
  const str=(a,b)=>decoder.decode(block.subarray(a,b)).replace(/\0.*$/s,'');
  let name=str(0,100),size=parseInt(str(124,136).trim()||'0',8),type=str(156,157);
  const data=archive.subarray(p+512,p+512+size);p+=512+Math.ceil(size/512)*512;
  if(type==='x'){pax={};for(const line of decoder.decode(data).split('\n')){const m=line.match(/^\d+ ([^=]+)=(.*)$/);if(m)pax[m[1]]=m[2]}continue}
  name=pax.path||name;pax={};
  const parts=name.replace(/\/$/,'').split('/');
  if(parts.some(part=>part==='..'||!part))throw Error('Invalid runtime archive path');
  let dir=tree;
  for(const part of parts.slice(0,-1)){if(!dir.contents.has(part))dir.contents.set(part,new Directory(new Map()));dir=dir.contents.get(part)}
  if(type==='5'){if(!dir.contents.has(parts.at(-1)))dir.contents.set(parts.at(-1),new Directory(new Map()))}
  else if(type==='0'||type==='')dir.contents.set(parts.at(-1),new File(data,{readonly:true}));
 }
 const programs=new Map(helpers.map(([name,data])=>[name,new File(data,{readonly:true})]));
 programs.set('experiment.py',new File(encoder.encode(source),{readonly:true}));
 tree.contents.set('python',new Directory(programs));
 tree.contents.set('run-python',new File(encoder.encode(`#!/bin/sh
BASE=/mnt/lab/bundle
export PYTHONHOME="$BASE/python" PYTHONPATH="/mnt/lab/python:$BASE/site-packages" PYTHONDONTWRITEBYTECODE=1 LAB_PYTHON=/tmp/run-python
exec /tmp/ld.so --library-path "$BASE/glibc" "$BASE/python/bin/python3.12" -u "$@"
`)));
 return tree.contents;
}

self.onmessage=async({data})=>{
 if(busy)return;busy=true;
 try{
  ready ||= setup().catch(error=>{ready=null;throw error});
  const {module,archive,helpers}=await ready;
  phase('Starting a fresh Linux guest…',{stage:'boot'});let terminal='',runningSent=false;
  const stdout=new ConsoleStdout(bytes=>{
   if(!bytes.length)return;terminal+=decoder.decode(bytes,{stream:true});
   if(terminal.includes('ESL_PHASE running')&&!runningSent){runningSent=true;postMessage({type:'running'})}
   if(terminal.length>4000000)terminal=terminal.slice(-2000000);
  });
  const command='cp /mnt/lab/bundle/glibc/ld-linux-x86-64.so.2 /tmp/ld.so && chmod +x /tmp/ld.so && cp /mnt/lab/run-python /tmp/run-python && chmod +x /tmp/run-python && /tmp/run-python /mnt/lab/python/runner.py';
  const stdin=new OpenFile(new File(new Uint8Array()));
  stdin.fd_read=()=>({ret:6,data:null}); // no keyboard channel; not an EOF signal
  const wasi=new WASI(['engine','-entrypoint','/bin/sh','--','-c',command],[],[
   stdin,stdout,stdout,
   new PreopenDirectory('/mnt/lab',filesystem(archive,helpers,data.source)),
  ]);
  wasi.wasiImport.poll_oneoff=(...args)=>clockPoll(wasi,...args);
  const instance=await WebAssembly.instantiate(module,{wasi_snapshot_preview1:wasi.wasiImport});
  wasi.start(instance);
  const frames=terminal.split(/\r?\n/).filter(line=>line.startsWith('ESL_RESULT '));
  if(!frames.length)throw Error('The Linux guest exited without a result. Stop and retry.\n'+terminal.slice(-5000));
  postMessage(JSON.parse(frames.at(-1).slice('ESL_RESULT '.length)));
 }catch(error){postMessage({type:'error',origin:'runtime',message:String(error.stack||error)})}
 finally{busy=false}
};
