// WASI preview1 poll_oneoff for this VM's idle nonblocking stdin and clocks.
// Descriptor readiness and clock deadlines follow the WASI event contract.
const now=id=>id===0?BigInt(Date.now())*1000000n:BigInt(Math.round(performance.now()*1e6));
export function clockPoll(wasi,input,output,count,nEvents){
 if(!count)return 28; // ERRNO_INVAL
 const memory=new DataView(wasi.inst.exports.memory.buffer),ready=[],clocks=[];
 for(let i=0;i<count;i++){
  const p=input+i*48,userdata=memory.getBigUint64(p,true),type=memory.getUint8(p+8);
  if(type===0){
   const id=memory.getUint32(p+16,true),timeout=memory.getBigUint64(p+24,true);
   if(id>1){ready.push({userdata,type,error:28});continue}
   const absolute=memory.getUint16(p+40,true)&1;
   clocks.push({userdata,type,id,deadline:absolute?timeout:now(id)+timeout});
  }else{
   const fd=memory.getUint32(p+16,true);
   if(type===1&&fd===0)continue; // interactive device is open, with no input
   else if(type===2&&(fd===1||fd===2))ready.push({userdata,type});
   else ready.push({userdata,type,error:8}); // ERRNO_BADF
  }
 }
 if(!ready.length&&!clocks.length)return 6; // nonblocking input: ERRNO_AGAIN
 if(!ready.length&&clocks.length){
  // The execution worker already runs the VM synchronously. Waiting here needs
  // no SharedArrayBuffer; terminating the worker still interrupts the guest.
  while(!clocks.some(c=>now(c.id)>=c.deadline)){}
 }
 for(const clock of clocks)if(now(clock.id)>=clock.deadline)ready.push(clock);
 ready.forEach((event,i)=>{
  const p=output+i*32;new Uint8Array(memory.buffer,p,32).fill(0);
  memory.setBigUint64(p,event.userdata,true);memory.setUint16(p+8,event.error||0,true);
  memory.setUint8(p+10,event.type);memory.setUint16(p+24,event.hangup?1:0,true);
 });
 memory.setUint32(nEvents,ready.length,true);return 0;
}
