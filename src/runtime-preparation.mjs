// Prepare only executable lessons, after rendering and without running editor code.
export function schedulePreparation(start){
 const connection=navigator.connection;
 if(connection?.saveData||/^(slow-)?2g$/.test(connection?.effectiveType||'')||navigator.deviceMemory<=2)return ()=>{};
 let cancelled=false,scheduled=false,id,frame,idle=false;
 const cancel=()=>{
  cancelled=true;
  document.removeEventListener('visibilitychange',schedule);
  cancelAnimationFrame(frame);
  if(idle)cancelIdleCallback(id);else clearTimeout(id);
 };
 function schedule(){
  if(cancelled||scheduled||document.visibilityState!=='visible')return;
  scheduled=true;
  frame=requestAnimationFrame(()=>{
   frame=requestAnimationFrame(()=>{
    const ready=()=>{
     scheduled=false;
     if(cancelled||document.visibilityState!=='visible')return;
     cancel();start();
    };
    idle=typeof requestIdleCallback==='function';
    id=idle?requestIdleCallback(ready,{timeout:2500}):setTimeout(ready,500);
   });
  });
 }
 document.addEventListener('visibilitychange',schedule);
 schedule();
 return cancel;
}
