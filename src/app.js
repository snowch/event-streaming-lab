import {lessons} from './lessons.mjs';
const appUrl=new URL(import.meta.url);
const lessonSource=path=>new URL(path+appUrl.search,appUrl);
const $=s=>document.querySelector(s);
const read=k=>{try{return localStorage.getItem('esl:'+k)}catch{return null}};
const save=(k,v)=>{try{localStorage.setItem('esl:'+k,v);return true}catch{return false}};
function progress(){document.querySelectorAll('[data-progress]').forEach(el=>{el.textContent=read('done:'+el.dataset.progress)==='true'?'Read ✓':el.dataset.kind==='reading'?'Reading':el.closest('.lesson-card')?'Lab':''})}
progress();addEventListener('storage',progress);
function themeLabel(){const dark=document.documentElement.dataset.theme==='dark';$('#theme').textContent=dark?'Light theme':'Dark theme';$('#theme').setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme')}
$('#theme').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;save('theme',theme);themeLabel()};themeLabel();
const courseMenu=document.querySelector('.course-switcher');
if(courseMenu){
 courseMenu.dataset.enhanced='true';
 document.addEventListener('pointerdown',event=>{if(!courseMenu.contains(event.target))courseMenu.open=false});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&courseMenu.open){courseMenu.open=false;courseMenu.querySelector('summary').focus()}});
}
const main=$('[data-lesson]');
if(main){
 const lesson=lessons[Number(main.dataset.lesson)];
 const editor=$('#code'), runButton=$('#run'), stopButton=$('#stop');
 const modeControl=$('#run-mode'),resetRuntime=$('#reset-runtime');
 const fastSupported=typeof globalThis.WebAssembly?.Suspending==='function'&&typeof globalThis.WebAssembly?.promising==='function';
 const savedMode=read('run-mode');
 modeControl.value=fastSupported&&savedMode!=='fresh'?'warm':'fresh';
 modeControl.querySelector('[value="warm"]').disabled=!fastSupported;
 const preload=[...new Set([...lesson.code.matchAll(/^(?:from|import) (course|patterns|kafka_lab|live_kafka|recovery_drill)\b/gm)].map(match=>match[1]))];
 function describeMode(){
  $('#run-mode-note').textContent=modeControl.value==='warm'?'Fresh Python, files and sockets on each run. Linux stays ready; Reset Linux restarts it.':fastSupported?'A new Linux guest on every run. Use this for system inspection or a fully fresh environment.':'Fast reruns are unavailable in this browser. Each Run starts fresh Linux.';
 }
 describeMode();
 modeControl.onchange=()=>{
  if(busy)return;
  save('run-mode',modeControl.value);discardWorker();describeMode();
  finish('Run mode changed. Run when ready.');
 };
 resetRuntime.onclick=()=>{
  if(busy)return;
  discardWorker();finish('Linux reset. The next Run starts Linux again.');
 };
 const publishedCode=editor.defaultValue;
 const progressBar=$('#runtime-progress');
 const draftKey='draft:'+lesson.slug, runtimeKey='draft-runtime:'+lesson.slug;
 const legacyKey='legacy-draft:'+lesson.slug, backupKey='restore-backup:'+lesson.slug;
 let worker,timer,lastSuccessfulRun,busy=false,runGeneration=0,attemptSerial=0,runStarted=0;

 function draftStatus(message=''){
  $('#draft-status').textContent=message;
  $('#draft-status').hidden=!message;
 }
 const cached=read(draftKey);
 const needsMigration=cached!==null&&cached!==publishedCode&&read(runtimeKey)!=='bytewax-v1';
 const readyForCurrentRuntime=!needsMigration||(save(legacyKey,cached)&&save(draftKey,publishedCode));
 if(readyForCurrentRuntime)save(runtimeKey,'bytewax-v1');
 else draftStatus('Your previous draft is still open. Storage could not save a separate copy. Download it to keep it.');
 if(cached!==null&&(!needsMigration||!readyForCurrentRuntime))editor.value=cached;
 const previous=read(legacyKey);
 if(previous!==null){
  const button=document.createElement('button');
  button.textContent='Download previous draft';
  button.onclick=()=>download('# Saved before the Bytewax migration; source only.\n'+previous,lesson.slug+'-previous.py','text/x-python');
  $('#draft-note').append(' Your previous runtime draft is available. ',button);
 }
 let recoverableDraft=read(backupKey);
 function updateRecovery(){
  $('#recover-draft').hidden=recoverableDraft===null||recoverableDraft===editor.value;
 }
 function persistDraft(){
  const saved=save(draftKey,editor.value)&&save(runtimeKey,'bytewax-v1');
  draftStatus(saved?'':'Could not save this change. Download the code you want to keep.');
 }
 function replaceDraft(source){
  const outgoing=editor.value;
  let savedBackup=true;
  if(outgoing!==publishedCode&&outgoing!==source){
   recoverableDraft=outgoing;
   savedBackup=save(backupKey,outgoing);
  }
  editor.value=source;
  if(savedBackup)persistDraft();
  else draftStatus('The replaced draft is available in this tab. Use Recover draft and download it to keep a copy.');
  $('#saved-draft-notice').hidden=true;
  updateRecovery();
  describeResult();
  editor.focus();
  editor.setSelectionRange(0,0);
  editor.scrollTop=0;
  editor.scrollLeft=0;
 }
 $('#saved-draft-notice').hidden=editor.value===publishedCode;
 updateRecovery();
 $('#done').checked=read('done:'+lesson.slug)==='true';
 $('#done').onchange=()=>{const ok=save('done:'+lesson.slug,String($('#done').checked));$('#save-status').textContent=ok?'Reading mark saved in this browser.':'Could not save. Reading mark lasts for this visit.';progress()};
 function describeResult(){
  if(!lastSuccessfulRun)return;
  $('#execution-note').textContent=busy?'A new run is in progress. This result is from the last successful run.':
   editor.value!==lastSuccessfulRun.source?'Code changed. This result and its export use the last successful run.':
   'This result and its export use the last successful run.';
 }
 editor.oninput=()=>{persistDraft();updateRecovery();describeResult()};
 $('#restore').onclick=()=>{
  replaceDraft(publishedCode);
  $('#status').textContent=$('#recover-draft').hidden?'Published code is ready.':'Published code is ready. Select Recover draft to get your code back.';
 };
 $('#recover-draft').onclick=()=>{
  if(recoverableDraft===null)return;
  replaceDraft(recoverableDraft);
  $('#status').textContent='Draft recovered. Select Run in Linux to run it.';
 };

 function state(active,message){
  const focused=document.activeElement;
  busy=active;
  modeControl.disabled=active;resetRuntime.disabled=active;resetRuntime.hidden=!worker||modeControl.value==='fresh';
  runButton.disabled=active;
  stopButton.hidden=!active;
  stopButton.disabled=!active;
  $('#restore').disabled=active;
  $('#recover-draft').disabled=active;
  $('#status').textContent=message;
  if(active&&focused===runButton)stopButton.focus({preventScroll:true});
  if(!active&&focused===stopButton)runButton.focus({preventScroll:true});
  describeResult();
 }
 function hideProgress(){
  progressBar.hidden=true;
  progressBar.removeAttribute('value');
 }
 function finish(message){
  clearTimeout(timer);
  hideProgress();
  state(false,message);
 }
 function discardWorker(){
  runGeneration++;
  attemptSerial++;
  worker?.terminate();
  worker=null;
 }
 function fail(origin,message,stdout=''){
  const pythonError=origin==='python';
  if(!pythonError)discardWorker();
  finish(pythonError?'Python reported an error. Check the message, then edit and rerun.':
   'The runtime failed. Check the message, then run again.');
  const error=message.trim();
  const summary=pythonError?error.split('\n').at(-1):error.split('\n')[0];
  const details=[stdout.trimEnd(),error].filter(Boolean).join('\n\n');
  $('#attempt-error-title').textContent=pythonError?'Execution error':'Runtime error';
  $('#error-summary').textContent=summary||'The attempt could not finish.';
  $('#error-trace').textContent=details;
  $('#error-details').hidden=details===summary;
  $('#attempt-error').hidden=false;
 }
 stopButton.onclick=()=>{
  discardWorker();
  finish('Stopped. The next run starts a fresh Linux guest.');
 };
 function startAttempt(source,generation,retries){
  const attempt=++attemptSerial;
  let begun=false;
  clearTimeout(timer);
  timer=setTimeout(()=>fail('runtime','Loading timed out. Check your connection and run again.'),300000);
  try{worker ||= new Worker(lessonSource('./worker.js'),{type:'module'})}
  catch(error){fail('runtime',error.message);return}
  const current=()=>busy&&generation===runGeneration&&attempt===attemptSerial;
  worker.onerror=event=>{if(current())fail('runtime',event.message||'The Python worker could not load.')};
  worker.onmessage=({data})=>{
   if(!current())return;
   if(data.type==='loading'){
    $('#status').textContent=data.message;
    if(data.total>0){
     progressBar.max=data.total;
     progressBar.value=data.downloaded;
     progressBar.hidden=false;
    }else hideProgress();
    if(data.stage==='boot'){
     clearTimeout(timer);
     timer=setTimeout(()=>{
      if(!current()||begun)return;
      if(retries===0){
       worker.terminate();
       worker=null;
       $('#status').textContent='Guest startup stalled. Retrying once before Python starts…';
       startAttempt(source,generation,1);
      }else fail('runtime','Guest startup stalled twice. Run again to restart the VM.');
     },60000);
    }
    return;
   }
   if(data.type==='running'){
    begun=true;
    clearTimeout(timer);
    hideProgress();
    timer=setTimeout(()=>fail('runtime','Execution stopped after 180 seconds. Shorten the experiment and try again.'),180000);
    $('#status').textContent='Running your Python…';
    return;
   }
   if(data.type==='error'){
    fail(data.origin,data.message,data.stdout);
    return;
   }
   if(data.type!=='result')return;
   const elapsed=Math.round(performance.now()-runStarted);
   if(data.runtime?.warm_fallback){modeControl.value='fresh';describeMode();resetRuntime.hidden=true}
   lastSuccessfulRun={lesson:lesson.slug,source,result:data.value.result,stdout:data.value.stdout,runtime:{...data.runtime,initialization_retries:retries,elapsed_ms:elapsed}};
   $('#output').textContent=(data.value.stdout?data.value.stdout+'\n':'')+JSON.stringify(data.value.result,null,2);
   visualize(data.value.result);
   $('#run-result').hidden=false;
   $('#export').disabled=false;
   finish(Number.isFinite(elapsed)?`Completed in ${(elapsed/1000).toFixed(1)} s. Inspect your result.`:'Completed. Inspect your result.');
  };
  try{worker.postMessage({source,mode:modeControl.value,preload})}
  catch(error){fail('runtime',error.message)}
 }
 runButton.onclick=()=>{
  if(busy)return;
  $('#attempt-error').hidden=true;
  $('#error-details').open=false;
  runStarted=performance.now();
  state(true,'Preparing Python…');
  startAttempt(editor.value,++runGeneration,0);
 };
 editor.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();runButton.click()}});
 state(false,'');
 function download(contents,name,type){const url=URL.createObjectURL(new Blob([contents],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 $('#download').onclick=async()=>{try{
 const names=['course.py','kafka_lab.py','recovery_drill.py','live_kafka.py','patterns.py'];
 const modules=Object.fromEntries(await Promise.all(names.map(async name=>{const r=await fetch(lessonSource('./python/'+name));if(!r.ok)throw Error('Helper download failed');return [name,await r.text()]})));
 const setup='# Install: python -m pip install bytewax==0.21.1 confluent-kafka==2.6.1\nimport tempfile, pathlib, sys, json\n_lab = tempfile.TemporaryDirectory(prefix="streaming-lab-")\n_modules = '+JSON.stringify(modules)+'\nfor _name, _text in _modules.items():\n    pathlib.Path(_lab.name, _name).write_text(_text)\nsys.path.insert(0, _lab.name)\n\n# Your experiment\n';
 download(setup+editor.value+'\nprint(json.dumps(result, indent=2))\n',lesson.slug+'.py','text/x-python');
 }catch(e){draftStatus(e.message)}};
 $('#export').onclick=()=>{if(lastSuccessfulRun)download(JSON.stringify(lastSuccessfulRun,null,2),lesson.slug+'-run.json','application/json')};
 function visualize(result){
 const panel=$('#visual');panel.replaceChildren();if(!result?.trace?.length)return;
 let position=0;const head=document.createElement('div');head.className='trace-head';const title=document.createElement('h3');title.textContent='Follow the evidence';const controls=document.createElement('div');const prev=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');prev.textContent='←';prev.setAttribute('aria-label','Previous trace step');next.textContent='→';next.setAttribute('aria-label','Next trace step');controls.append(prev,label,next);head.append(title,controls);panel.append(head);const view=document.createElement('div');view.className='trace-view';panel.append(view);
 const draw=()=>{const row=result.trace[position];label.textContent=`${position+1} / ${result.trace.length}`;prev.disabled=!position;next.disabled=position===result.trace.length-1;view.replaceChildren();const oldLine=panel.querySelector('.watermark-line');oldLine?.remove();if(Number.isFinite(row.watermark)){const line=document.createElement('div');line.className='watermark-line';const marker=document.createElement('span');marker.className='watermark-marker';const upper=Math.max(30,row.maximum||0),lower=Math.min(-10,row.watermark);marker.style.left=((row.watermark-lower)/(upper-lower)*100)+'%';const symbol=document.createElement('b');symbol.textContent='|';marker.append(symbol,document.createTextNode('watermark '+row.watermark+'s'));line.append(marker);line.setAttribute('aria-label','Watermark at '+row.watermark+' seconds on a '+lower+' to '+upper+' second scale');panel.insertBefore(line,view)}for(const [key,value]of Object.entries(row)){const block=document.createElement('div'),caption=document.createElement('span'),text=document.createElement('strong');caption.textContent=key;text.textContent=typeof value==='object'?JSON.stringify(value):String(value);block.append(caption,text);view.append(block)}};
 prev.onclick=()=>{position--;draw()};next.onclick=()=>{position++;draw()};draw();
 }
 addEventListener('pagehide',()=>{
  discardWorker();
  if(busy)finish('The run was interrupted when you left this page. Run again to start a fresh guest.');
 });
}

const reading=document.querySelector('[data-reading]');
if(reading){
 const key='done:'+reading.dataset.reading,box=document.querySelector('#reading-done');box.checked=read(key)==='true';
 box.onchange=()=>{const ok=save(key,String(box.checked));document.querySelector('#reading-save').textContent=ok?'Reading mark saved in this browser.':'Storage unavailable. This mark lasts for this visit.';progress()};
 addEventListener('storage',()=>{box.checked=read(key)==='true'});
}
