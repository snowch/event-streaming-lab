import {WASI,WASIProcExit,File,OpenFile,PreopenDirectory,ConsoleStdout} from './engine/wasi/index.js';
import {clockPoll} from './wasi-poll.mjs';

export const supportsWarmSession=()=>typeof WebAssembly.Suspending==='function'&&typeof WebAssembly.promising==='function';

export class WarmSession{
 constructor({module,files,loading,running}){
  Object.assign(this,{module,files,loading,running});
  this.encoder=new TextEncoder();this.decoder=new TextDecoder();this.queue=new Uint8Array();this.serial=0;
 }
 enqueue(message){
  this.queue=this.encoder.encode(JSON.stringify(message)+'\n');this.idle=false;
  this.wake?.();this.wake=null;
 }
 prepare(){
  if(this.dead)return Promise.reject(Error('The Python environment ended. Restart it and run again.'));
  if(!this.prepared){
   this.prepared=new Promise((resolve,reject)=>{this.resolvePrepared=resolve;this.rejectPrepared=reject});
   this.loading('Preparing Python…',{stage:'boot'});
   this.task=this.boot().catch(error=>this.fail(error));
  }
  return this.prepared;
 }
 run(source,{started,preparation,assetSource}){
  if(this.active)throw Error('An experiment is already running');
  if(this.dead)throw Error('The Python environment ended. Restart it and run again.');
  return new Promise((resolve,reject)=>{
   this.active={id:++this.serial,started,preparation,assetSource,resolve,reject,first:!this.readyAt,sent:performance.now()};
   this.loading('Preparing Python…',{stage:'boot'});
   this.enqueue({kind:'run',id:this.active.id,source});
   this.prepare().then(state=>{if(!state.available)this.active?.resolve({type:'error',origin:'runtime',warm_unavailable:true,message:state.message})}).catch(error=>this.fail(error));
  });
 }
 frame(frame){
  if(frame.kind==='ready'){
   this.inputEnabled=true;this.idle=true;
   this.readyAt??=performance.now();this.resolvePrepared?.({available:true});return;
  }
  if(frame.kind==='unavailable'){
   this.resolvePrepared?.({available:false,message:frame.message});
   this.active?.resolve({type:'error',origin:'runtime',warm_unavailable:true,message:frame.message});
   this.active=null;return;
  }
  if(frame.kind==='fatal'){
   this.fail(Error(frame.message));return;
  }
  const request=this.active;
  if(!request||frame.id!==request.id)return;
  if(frame.kind==='running'){
   request.running=performance.now();this.running();return;
  }
  if(frame.kind!=='response')return;
  const response=frame.response;
  if(response.type==='result')response.runtime.timing={
   preparation_ms:Math.round(request.preparation),
   guest_startup_ms:request.first?Math.round(this.readyAt-this.booted):0,
   process_startup_ms:Math.round(request.running-Math.max(request.sent,this.readyAt)),
   execution_ms:Math.round(performance.now()-request.running),
   total_ms:Math.round(performance.now()-request.started),asset_source:request.assetSource,
  };
  this.active=null;request.resolve(response);
 }
 fail(error){
  this.dead=true;this.rejectPrepared?.(error);this.active?.reject(error);this.active=null;
 }
 async close(){
  this.expectedExit=true;
  if(!this.dead)this.enqueue({kind:'exit'});
  await this.task;
 }
 async boot(){
  this.booted=performance.now();let terminal='';
  const output=new ConsoleStdout(bytes=>{
   terminal+=this.decoder.decode(bytes,{stream:true});
   let newline;
   while((newline=terminal.indexOf('\n'))>=0){
    const line=terminal.slice(0,newline).replace(/\r$/,'');terminal=terminal.slice(newline+1);
    if(line.startsWith('LAB_SESSION ')){
     try{this.frame(JSON.parse(line.slice(12)))}catch(error){this.fail(error)}
    }
   }
   if(terminal.length>4000000)this.fail(Error('Experiment output exceeded 4 MiB. Reduce the output and run again.'));
  });
  const input=new OpenFile(new File(new Uint8Array()));
  input.fd_read=size=>{
   if(!this.inputEnabled||!this.queue.length)return {ret:6,data:null};
   this.idle=false;const data=this.queue.slice(0,size);this.queue=this.queue.slice(data.length);return {ret:0,data};
  };
  const command='mkdir -p /opt/lab && cp /mnt/lab/bundle/glibc/ld-linux-x86-64.so.2 /opt/lab/ld.so && chmod +x /opt/lab/ld.so && cp /mnt/lab/session-python /opt/lab/run-python && chmod +x /opt/lab/run-python && /opt/lab/run-python /mnt/lab/python/session_runner.py';
  const wasi=new WASI(['engine','-entrypoint','/bin/sh','--','-c',command],[],[input,output,output,new PreopenDirectory('/mnt/lab',this.files())],{debug:false});
  const read=wasi.wasiImport.fd_read;
  const waitForInput=()=>new Promise(resolve=>{this.wake=resolve});
  wasi.wasiImport.fd_read=new WebAssembly.Suspending((...args)=>{
   if(args[0]===0&&this.idle&&!this.queue.length)return waitForInput().then(()=>read(...args));
   return read(...args);
  });
  wasi.wasiImport.poll_oneoff=new WebAssembly.Suspending((...args)=>{
   const poll=()=>clockPoll(wasi,...args,this.inputEnabled?this.queue.length:0);
   return this.idle&&!this.queue.length?waitForInput().then(poll):poll();
  });
  try{
   const instance=await WebAssembly.instantiate(this.module,{wasi_snapshot_preview1:wasi.wasiImport});wasi.inst=instance;
   await WebAssembly.promising(instance.exports._start)();
  }catch(error){
   if(!(error instanceof WASIProcExit&&error.code===0)){this.fail(error);return}
  }
  if(!this.expectedExit&&(this.active||!this.readyAt))this.fail(Error('The Linux session ended before returning a result.'));
  this.dead=true;
 }
}
