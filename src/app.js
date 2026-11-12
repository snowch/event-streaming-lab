import {lessons} from './lessons.mjs';
const $=s=>document.querySelector(s);
const read=k=>{try{return localStorage.getItem('esl:'+k)}catch{return null}};
const save=(k,v)=>{try{localStorage.setItem('esl:'+k,v);return true}catch{return false}};
function progress(){document.querySelectorAll('[data-progress]').forEach(el=>{el.textContent=read('done:'+el.dataset.progress)==='true'?'READ ✓':el.closest('.lesson-card')?'INVESTIGATE':''})}
progress();addEventListener('storage',progress);
$('#theme').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;save('theme',theme)};
const narrow=matchMedia('(max-width: 900px)');const collapse=()=>{if(narrow.matches)document.querySelector('.contents')?.removeAttribute('open')};collapse();narrow.addEventListener('change',collapse);
const main=$('[data-lesson]');
if(main){
 const lesson=lessons[Number(main.dataset.lesson)], editor=$('#code');let worker,timer,runRecord,busy=false;
 const cached=read('draft:'+lesson.slug);if(cached!==null)editor.value=cached;
 $('#done').checked=read('done:'+lesson.slug)==='true';
 $('#done').onchange=()=>{const ok=save('done:'+lesson.slug,String($('#done').checked));$('#save-status').textContent=ok?'Reading mark saved in this browser.':'Could not save. Reading mark lasts for this visit.';progress()};
 function stale(){if(runRecord)$('#execution-note').textContent=editor.value!==runRecord.source?'Code changed · output is from the previous run.':'Output matches the last executed source.'}
 editor.oninput=()=>{if(!save('draft:'+lesson.slug,editor.value))$('#draft-note').textContent='Storage unavailable. Download your code to keep it.';stale()};
 $('#restore').onclick=()=>{editor.value=lesson.code;editor.dispatchEvent(new Event('input'))};
 function state(active,text){busy=active;$('#run').disabled=active;$('#stop').disabled=!active;$('#status').textContent=text}
 function finish(){clearTimeout(timer);state(false,'Ready for another run')}
 function stop(message){worker?.terminate();worker=null;finish();$('#status').textContent=message;$('#execution-note').textContent='Execution interrupted. Existing output belongs to the last completed run.'}
 $('#stop').onclick=()=>stop('Stopped · next run starts a fresh runtime');
 $('#run').onclick=()=>{
  if(busy)return;state(true,'Loading Python locally…');const source=editor.value;
  timer=setTimeout(()=>stop('Loading timed out. Check your connection and run again.'),120000);
  worker ||= new Worker(new URL('./worker.js',import.meta.url));
  worker.onerror=e=>{stop('Runtime failed. Run again to restart.');$('#output').textContent=e.message};
  worker.onmessage=({data})=>{
   if(data.type==='running'){clearTimeout(timer);timer=setTimeout(()=>stop('Stopped after 45 seconds. Shorten the experiment and try again.'),45000);$('#status').textContent='Running your Python…';return}
   finish();
   if(data.type==='error'){$('#status').textContent='Python reported an error · edit and retry';$('#output').textContent=data.message;$('#visual').replaceChildren();$('#execution-note').textContent='This attempt failed; no successful result was produced.';runRecord=null;$('#export').disabled=true;return}
   runRecord={lesson:lesson.slug,source,result:data.value.result,stdout:data.value.stdout,reactivex:'6.1.0',pyodide:'0.27.7'};
   $('#output').textContent=(data.value.stdout?data.value.stdout+'\n':'')+JSON.stringify(data.value.result,null,2);
   $('#status').textContent='Completed · real Python output';$('#export').disabled=false;stale();visualize(data.value.result);
  };
  worker.postMessage({source});
 };
 editor.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();$('#run').click()}});
 function download(contents,name,type){const url=URL.createObjectURL(new Blob([contents],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 $('#download').onclick=async()=>{try{const r=await fetch(new URL('./course.py',import.meta.url));if(!r.ok)throw Error('Helper download failed');download('# Install: python -m pip install reactivex==6.1.0\n'+await r.text()+'\n# Your experiment\n'+editor.value.replace(/^from course import .*$/gm,'')+'\nimport json\nprint(json.dumps(result, indent=2))\n',lesson.slug+'.py','text/x-python')}catch(e){$('#status').textContent=e.message}};
 $('#export').onclick=()=>{if(runRecord)download(JSON.stringify(runRecord,null,2),lesson.slug+'-run.json','application/json')};
 function visualize(result){
 const panel=$('#visual');panel.replaceChildren();if(!result?.trace?.length)return;
 let position=0;const head=document.createElement('div');head.className='trace-head';const title=document.createElement('h3');title.textContent='Follow the evidence';const controls=document.createElement('div');const prev=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');prev.textContent='←';prev.setAttribute('aria-label','Previous trace step');next.textContent='→';next.setAttribute('aria-label','Next trace step');controls.append(prev,label,next);head.append(title,controls);panel.append(head);const view=document.createElement('div');view.className='trace-view';panel.append(view);
 const draw=()=>{const row=result.trace[position];label.textContent=`${position+1} / ${result.trace.length}`;prev.disabled=!position;next.disabled=position===result.trace.length-1;view.replaceChildren();const oldLine=panel.querySelector('.watermark-line');oldLine?.remove();if(Number.isFinite(row.watermark)){const line=document.createElement('div');line.className='watermark-line';const marker=document.createElement('span');marker.className='watermark-marker';const upper=Math.max(30,row.maximum||0),lower=Math.min(-10,row.watermark);marker.style.left=((row.watermark-lower)/(upper-lower)*100)+'%';const symbol=document.createElement('b');symbol.textContent='|';marker.append(symbol,document.createTextNode('watermark '+row.watermark+'s'));line.append(marker);line.setAttribute('aria-label','Watermark at '+row.watermark+' seconds on a '+lower+' to '+upper+' second scale');panel.insertBefore(line,view)}for(const [key,value]of Object.entries(row)){const block=document.createElement('div'),caption=document.createElement('span'),text=document.createElement('strong');caption.textContent=key;text.textContent=typeof value==='object'?JSON.stringify(value):String(value);block.append(caption,text);view.append(block)}};
 prev.onclick=()=>{position--;draw()};next.onclick=()=>{position++;draw()};draw();
 }
 addEventListener('pagehide',()=>worker?.terminate());
}
