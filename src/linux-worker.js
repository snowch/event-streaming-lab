import {WASI,File,Directory,OpenFile,PreopenDirectory,ConsoleStdout} from './engine/wasi/index.js';
import {gunzipSync} from './engine/fflate.mjs';
import {clockPoll} from './wasi-poll.mjs';
import {WarmSession,supportsWarmSession} from './warm-session.mjs';
import {readPreparedRuntime,writePreparedRuntime} from './runtime-cache.mjs';
let ready,busy=false,session,fastUnavailable=false,fastReason;
const decoder=new TextDecoder(),encoder=new TextEncoder();
const phase=(message,extra={})=>postMessage({type:'loading',message,...extra});

async function inflate(bytes){
 if(typeof DecompressionStream==='undefined')return gunzipSync(bytes);
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
 return new Uint8Array(await new Response(stream).arrayBuffer());
}
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
async function prepareAssets(manifest){
 const key=JSON.stringify(manifest.assets.map(({file,sha256,bytes})=>({file,sha256,bytes})));
 const cached=await readPreparedRuntime(key);
 if(cached){
  try{
   phase('Preparing the verified runtime saved in this browser…');
   return {module:await WebAssembly.compile(cached.engineBytes),entries:indexArchive(cached.archive),assetSource:'browser-cache'};
  }catch{phase('Preparing runtime assets again…')}
 }
 let downloaded=0,lastReport=0;
 const total=manifest.assets.reduce((n,item)=>n+item.bytes,0);
 const report=n=>{downloaded+=n;if(performance.now()-lastReport>250||downloaded===total){lastReport=performance.now();phase(`Loading Linux + Bytewax · ${Math.floor(downloaded/1048576)} / ${Math.ceil(total/1048576)} MiB`,{downloaded,total})}};
 const bytes=await Promise.all(manifest.assets.map(item=>asset(item,report)));
 phase('Compiling the Linux VM…');
 const pieces=await Promise.all(bytes.slice(0,3).map(inflate));
 const engineBytes=new Uint8Array(pieces.reduce((n,b)=>n+b.length,0));let offset=0;
 for(const piece of pieces){engineBytes.set(piece,offset);offset+=piece.length}
 const module=await WebAssembly.compile(engineBytes);
 phase('Preparing the native Python filesystem…');
 const archive=await inflate(bytes[3]);
 await writePreparedRuntime(key,engineBytes,archive);
 return {module,archive,assetSource:'download'};
}
async function setup(){
 phase('Preparing Linux and Bytewax…');
 const response=await fetch(new URL('./assets/linux/manifest.json',import.meta.url));
 if(!response.ok)throw Error('Runtime manifest unavailable. Reload and retry.');
 const prepared=await prepareAssets(await response.json());
 const names=['course.py','kafka_lab.py','recovery_drill.py','live_kafka.py','patterns.py','runner.py','session_runner.py'];
 const helpers=await Promise.all(names.map(async name=>{
  const r=await fetch(new URL('./python/'+name,import.meta.url));if(!r.ok)throw Error('Could not load '+name);
  return [name,new Uint8Array(await r.arrayBuffer())];
 }));
 return {module:prepared.module,entries:prepared.entries||indexArchive(prepared.archive),helpers,assetSource:prepared.assetSource};
}

// Index once and share read-only bytes. Every Run gets fresh inodes, file
// positions, a new Linux VM and its own writable overlay.
function indexArchive(archive){
 const entries=[];let pax={};
 for(let p=0;p+512<=archive.length;){
  const block=archive.subarray(p,p+512);if(!block.some(n=>n))break;
  const str=(a,b)=>decoder.decode(block.subarray(a,b)).replace(/\0.*$/s,'');
  let name=str(0,100),size=parseInt(str(124,136).trim()||'0',8),type=str(156,157);
  const data=archive.subarray(p+512,p+512+size);p+=512+Math.ceil(size/512)*512;
  if(type==='x'){pax={};for(const line of decoder.decode(data).split('\n')){const m=line.match(/^\d+ ([^=]+)=(.*)$/);if(m)pax[m[1]]=m[2]}continue}
  name=pax.path||name;pax={};
  const parts=name.replace(/\/$/,'').split('/');
  if(parts.some(part=>part==='..'||!part))throw Error('Invalid runtime archive path');
  if(type==='5'||type==='0'||type==='')entries.push({parts,data,directory:type==='5'});
 }
 if(!entries.length)throw Error('Runtime archive contains no files');
 return entries;
}
function readonlyFile(data){
 const file=new File(new Uint8Array(),{readonly:true});file.data=data;return file;
}
function filesystem(entries,helpers,source,config=null){
 const tree=new Directory(new Map());
 for(const {parts,data,directory} of entries){
  let dir=tree;
  for(const part of parts.slice(0,-1)){if(!dir.contents.has(part))dir.contents.set(part,new Directory(new Map()));dir=dir.contents.get(part)}
  if(directory){if(!dir.contents.has(parts.at(-1)))dir.contents.set(parts.at(-1),new Directory(new Map()))}
  else dir.contents.set(parts.at(-1),readonlyFile(data));
 }
 const programs=new Map(helpers.map(([name,data])=>[name,readonlyFile(data)]));
 programs.set('experiment.py',readonlyFile(encoder.encode(source)));
 if(config)programs.set('session-config.json',readonlyFile(encoder.encode(JSON.stringify(config))));
 tree.contents.set('python',new Directory(programs));
 const launch=`#!/bin/sh
BASE=/mnt/lab/bundle
export PYTHONHOME="$BASE/python" PYTHONPATH="/mnt/lab/python:$BASE/site-packages" PYTHONDONTWRITEBYTECODE=1 LAB_PYTHON=/tmp/run-python
exec /tmp/ld.so --library-path "$BASE/glibc" "$BASE/python/bin/python3.12" -S -u "$@"
`;
 tree.contents.set('run-python',readonlyFile(encoder.encode(launch)));
 tree.contents.set('session-python',readonlyFile(encoder.encode(launch.replaceAll('/tmp/ld.so','/opt/lab/ld.so').replaceAll('LAB_PYTHON=/tmp/run-python','LAB_PYTHON=/opt/lab/run-python'))));
 return tree.contents;
}

self.onmessage=async({data})=>{
 if(busy)return;busy=true;
 const started=performance.now(),reused=Boolean(ready);let booted,running;
 try{
  ready ||= setup().catch(error=>{ready=null;throw error});
  const {module,entries,helpers,assetSource}=await ready;
  if(data.mode!=='fresh'&&!supportsWarmSession()){fastUnavailable=true;fastReason='Fast reruns are unavailable in this browser.'}
  if(data.mode==='fresh'&&session){await session.close();session=null}
  if(data.mode!=='fresh'&&supportsWarmSession()&&!fastUnavailable){
   session ||= new WarmSession({module,files:()=>filesystem(entries,helpers,'',{preload:[...new Set((Array.isArray(data.preload)?data.preload:['course']).filter(name=>['course','patterns','kafka_lab','live_kafka','recovery_drill'].includes(name)))],packages:{bytewax:'bytewax',confluent_kafka:'confluent-kafka'},description:{broker:'librdkafka in-memory Kafka simulator'}}),loading:phase,running:()=>postMessage({type:'running'})});
   const response=await session.run(data.source,{started,preparation:performance.now()-started,assetSource:reused?'page-memory':assetSource});
   if(!response.warm_unavailable){postMessage(response);return}
   fastUnavailable=true;fastReason=response.message;
   phase('Fast mode is unavailable. Preparing fresh Linux…');
   await session.close();session=null;
  }
  booted=performance.now();
  phase('Starting a fresh Linux guest…',{stage:'boot'});let terminal='',runningSent=false;
  const stdout=new ConsoleStdout(bytes=>{
   if(!bytes.length)return;terminal+=decoder.decode(bytes,{stream:true});
   if(terminal.includes('ESL_PHASE running')&&!runningSent){runningSent=true;running=performance.now();postMessage({type:'running'})}
   if(terminal.length>4000000)terminal=terminal.slice(-2000000);
  });
  const command='cp /mnt/lab/bundle/glibc/ld-linux-x86-64.so.2 /tmp/ld.so && chmod +x /tmp/ld.so && cp /mnt/lab/run-python /tmp/run-python && chmod +x /tmp/run-python && /tmp/run-python /mnt/lab/python/runner.py';
  const stdin=new OpenFile(new File(new Uint8Array()));
  stdin.fd_read=()=>({ret:6,data:null}); // no keyboard channel; not an EOF signal
  const wasi=new WASI(['engine','-entrypoint','/bin/sh','--','-c',command],[],[
   stdin,stdout,stdout,
   new PreopenDirectory('/mnt/lab',filesystem(entries,helpers,data.source)),
  ],{debug:false});
  wasi.wasiImport.poll_oneoff=(...args)=>clockPoll(wasi,...args);
  const instance=await WebAssembly.instantiate(module,{wasi_snapshot_preview1:wasi.wasiImport});
  wasi.start(instance);
  const frames=terminal.split(/\r?\n/).filter(line=>line.startsWith('ESL_RESULT '));
  if(!frames.length)throw Error('The Linux guest exited without a result. Stop and retry.\n'+terminal.slice(-5000));
  const result=JSON.parse(frames.at(-1).slice('ESL_RESULT '.length));
  if(result.type==='result'){result.runtime.mode='fresh';result.runtime.procfs=true;if(fastReason)result.runtime.warm_fallback=fastReason;result.runtime.timing={preparation_ms:Math.round(booted-started),guest_startup_ms:Math.round(running-booted),execution_ms:Math.round(performance.now()-running),total_ms:Math.round(performance.now()-started),asset_source:reused?'page-memory':assetSource};}
  postMessage(result);
 }catch(error){postMessage({type:'error',origin:'runtime',message:String(error.stack||error)})}
 finally{busy=false}
};
