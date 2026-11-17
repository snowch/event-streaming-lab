import {lessons} from './lessons.mjs';
const $=s=>document.querySelector(s);
const read=k=>{try{return localStorage.getItem('esl:'+k)}catch{return null}};
const save=(k,v)=>{try{localStorage.setItem('esl:'+k,v);return true}catch{return false}};
function progress(){document.querySelectorAll('[data-progress]').forEach(el=>{el.textContent=read('done:'+el.dataset.progress)==='true'?'READ ✓':el.closest('.lesson-card')?'INVESTIGATE':''})}
progress();addEventListener('storage',progress);
$('#theme').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;save('theme',theme)};
const narrow=matchMedia('(max-width: 900px)');const collapse=()=>{if(narrow.matches)document.querySelector('.contents')?.removeAttribute('open')};collapse();narrow.addEventListener('change',collapse);
const currentLink=document.querySelector('.contents [aria-current]');const rail=document.querySelector('.sidebar');if(currentLink&&rail&&!narrow.matches)rail.scrollTop=Math.max(0,currentLink.offsetTop-rail.clientHeight/2);
const main=$('[data-lesson]');
if(main){
 const lesson=lessons[Number(main.dataset.lesson)], editor=$('#code');let worker,timer,runRecord,busy=false,runGeneration=0,attemptSerial=0;
 const cached=read('draft:'+lesson.slug);
 if(cached!==null&&read('draft-runtime:'+lesson.slug)!=='bytewax-v1'){
  save('legacy-draft:'+lesson.slug,cached);save('draft:'+lesson.slug,lesson.code);
 }else if(cached!==null)editor.value=cached;
 save('draft-runtime:'+lesson.slug,'bytewax-v1');
 const previous=read('legacy-draft:'+lesson.slug);
 if(previous!==null){const button=document.createElement('button');button.textContent='Download previous draft';button.onclick=()=>download('# Saved before the Bytewax migration; source only.\n'+previous,lesson.slug+'-previous.py','text/x-python');$('#draft-note').append(' Your previous draft has been preserved. ',button)}
 $('#done').checked=read('done:'+lesson.slug)==='true';
 $('#done').onchange=()=>{const ok=save('done:'+lesson.slug,String($('#done').checked));$('#save-status').textContent=ok?'Reading mark saved in this browser.':'Could not save. Reading mark lasts for this visit.';progress()};
 function stale(){if(runRecord)$('#execution-note').textContent=editor.value!==runRecord.source?'Code changed · output is from the previous run.':'Output matches the last executed source.'}
 editor.oninput=()=>{if(!save('draft:'+lesson.slug,editor.value))$('#draft-note').textContent='Storage unavailable. Download your code to keep it.';stale()};
 $('#restore').onclick=()=>{editor.value=lesson.code;editor.dispatchEvent(new Event('input'))};
 function state(active,text){busy=active;$('#run').disabled=active;$('#stop').disabled=!active;$('#status').textContent=text}
 function finish(){clearTimeout(timer);$('#runtime-progress')?.setAttribute('hidden','');state(false,'Ready for another run')}
 function stop(message){runGeneration++;attemptSerial++;worker?.terminate();worker=null;finish();$('#status').textContent=message;$('#execution-note').textContent='Execution interrupted. Existing output belongs to the last completed run.'}
 $('#stop').onclick=()=>stop('Stopped · next run starts a fresh runtime');
 function startAttempt(source,generation,retries){
  const attempt=++attemptSerial;let begun=false;
  clearTimeout(timer);
  timer=setTimeout(()=>stop('Loading timed out. Check your connection and run again.'),300000);
  worker ||= new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
  const current=()=>busy&&generation===runGeneration&&attempt===attemptSerial;
  worker.onerror=e=>{if(!current())return;stop('Runtime failed. Run again to restart.');$('#output').textContent=e.message};
  worker.onmessage=({data})=>{
   if(!current())return;
   if(data.type==='loading'){
    $('#status').textContent=data.message;const bar=$('#runtime-progress');
    if(bar){bar.hidden=!data.total;if(data.total){bar.max=data.total;bar.value=data.downloaded}}
    if(data.stage==='boot'){
     clearTimeout(timer);timer=setTimeout(()=>{
      if(!current()||begun)return;
      if(retries===0){worker.terminate();worker=null;$('#status').textContent='Guest startup stalled · retrying once before Python starts…';startAttempt(source,generation,1)}
      else stop('Guest startup stalled twice. Run again to restart the VM.');
     },60000);
    }
    return;
   }
   if(data.type==='running'){
    begun=true;clearTimeout(timer);$('#runtime-progress')?.setAttribute('hidden','');
    timer=setTimeout(()=>stop('Stopped after 180 seconds. Shorten the experiment and try again.'),180000);
    $('#status').textContent='Running your Python…';return;
   }
   finish();
   if(data.type==='error'){
    $('#status').textContent=data.origin==='runtime'?'Runtime reported an error · retry initialization':'Python reported an error · edit and retry';
    $('#output').textContent=data.message;$('#visual').replaceChildren();
    $('#execution-note').textContent='This attempt failed; no successful result was produced.';
    runRecord=null;$('#export').disabled=true;return;
   }
   runRecord={lesson:lesson.slug,source,result:data.value.result,stdout:data.value.stdout,runtime:{...data.runtime,initialization_retries:retries}};
   $('#output').textContent=(data.value.stdout?data.value.stdout+'\n':'')+JSON.stringify(data.value.result,null,2);
   $('#status').textContent='Completed · Linux / Bytewax';$('#export').disabled=false;stale();visualize(data.value.result);
  };
  worker.postMessage({source});
 }
 $('#run').onclick=()=>{
  if(busy)return;state(true,'Preparing Linux + Bytewax…');
  startAttempt(editor.value,++runGeneration,0);
 };
 editor.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();$('#run').click()}});
 function download(contents,name,type){const url=URL.createObjectURL(new Blob([contents],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 $('#download').onclick=async()=>{try{
 const names=['course.py','kafka_lab.py','recovery_drill.py','live_kafka.py','patterns.py'];
 const modules=Object.fromEntries(await Promise.all(names.map(async name=>{const r=await fetch(new URL('./python/'+name,import.meta.url));if(!r.ok)throw Error('Helper download failed');return [name,await r.text()]})));
 const setup='# Install: python -m pip install bytewax==0.21.1 confluent-kafka==2.6.1\nimport tempfile, pathlib, sys, json\n_lab = tempfile.TemporaryDirectory(prefix="streaming-lab-")\n_modules = '+JSON.stringify(modules)+'\nfor _name, _text in _modules.items():\n    pathlib.Path(_lab.name, _name).write_text(_text)\nsys.path.insert(0, _lab.name)\n\n# Your experiment\n';
 download(setup+editor.value+'\nprint(json.dumps(result, indent=2))\n',lesson.slug+'.py','text/x-python');
 }catch(e){$('#status').textContent=e.message}};
 $('#export').onclick=()=>{if(runRecord)download(JSON.stringify(runRecord,null,2),lesson.slug+'-run.json','application/json')};
 function visualize(result){
 const panel=$('#visual');panel.replaceChildren();if(!result?.trace?.length)return;
 let position=0;const head=document.createElement('div');head.className='trace-head';const title=document.createElement('h3');title.textContent='Follow the evidence';const controls=document.createElement('div');const prev=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');prev.textContent='←';prev.setAttribute('aria-label','Previous trace step');next.textContent='→';next.setAttribute('aria-label','Next trace step');controls.append(prev,label,next);head.append(title,controls);panel.append(head);const view=document.createElement('div');view.className='trace-view';panel.append(view);
 const draw=()=>{const row=result.trace[position];label.textContent=`${position+1} / ${result.trace.length}`;prev.disabled=!position;next.disabled=position===result.trace.length-1;view.replaceChildren();const oldLine=panel.querySelector('.watermark-line');oldLine?.remove();if(Number.isFinite(row.watermark)){const line=document.createElement('div');line.className='watermark-line';const marker=document.createElement('span');marker.className='watermark-marker';const upper=Math.max(30,row.maximum||0),lower=Math.min(-10,row.watermark);marker.style.left=((row.watermark-lower)/(upper-lower)*100)+'%';const symbol=document.createElement('b');symbol.textContent='|';marker.append(symbol,document.createTextNode('watermark '+row.watermark+'s'));line.append(marker);line.setAttribute('aria-label','Watermark at '+row.watermark+' seconds on a '+lower+' to '+upper+' second scale');panel.insertBefore(line,view)}for(const [key,value]of Object.entries(row)){const block=document.createElement('div'),caption=document.createElement('span'),text=document.createElement('strong');caption.textContent=key;text.textContent=typeof value==='object'?JSON.stringify(value):String(value);block.append(caption,text);view.append(block)}};
 prev.onclick=()=>{position--;draw()};next.onclick=()=>{position++;draw()};draw();
 }
 addEventListener('pagehide',()=>{runGeneration++;attemptSerial++;clearTimeout(timer);worker?.terminate();worker=null;busy=false});
}

const reading=document.querySelector('[data-reading]');
if(reading){
 const key='done:'+reading.dataset.reading,box=document.querySelector('#reading-done');box.checked=read(key)==='true';
 box.onchange=()=>{const ok=save(key,String(box.checked));document.querySelector('#reading-save').textContent=ok?'Reading mark saved in this browser.':'Storage unavailable. This mark lasts for this visit.';progress()};
 addEventListener('storage',()=>{box.checked=read(key)==='true'});
}
