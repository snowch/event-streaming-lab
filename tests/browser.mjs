import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {lessons} from '../src/lessons.mjs';
import {chapters} from '../src/advanced.mjs';
import {order} from '../src/catalog.mjs';
const samples=JSON.parse(execFileSync('python3',['tests/test_course.py','--json'],{encoding:'utf8'}));
const shardCount=Number(process.env.ESL_BROWSER_SHARDS||1),shardIndex=Number(process.env.ESL_BROWSER_SHARD||0);
assert.ok(Number.isInteger(shardCount)&&shardCount>=1&&shardCount<=lessons.length);
assert.ok(Number.isInteger(shardIndex)&&shardIndex>=0&&shardIndex<shardCount);
const port=5174+shardIndex*10;
const resultDir=shardCount===1?'test-results':`test-results/shard-${shardIndex}`;
const artifact=name=>resultDir+'/'+name;
const waitForSuccess=page=>page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Completed'),undefined,{timeout:240000});
const runResult=async page=>{
 await page.locator('#run').click();await waitForSuccess(page);
 return JSON.parse(await page.locator('#output').textContent());
};
async function exportResult(page,name){
 const requested=page.waitForEvent('download');
 await page.locator('#export').click();
 await (await requested).saveAs(artifact(name));
 return JSON.parse(await fs.readFile(artifact(name),'utf8'));
}
await fs.mkdir(resultDir,{recursive:true});
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory','.preview'],{stdio:'ignore'});
let browser;
try{
 for(let i=0;i<60;i++){try{if((await fetch(`http://127.0.0.1:${port}/event-streaming-lab/`)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({executablePath:process.env.CI ? undefined : process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();
 page.setDefaultTimeout(240000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const base=`http://127.0.0.1:${port}/event-streaming-lab/`;
 await page.goto(base);await page.screenshot({path:artifact('overview-desktop.png'),fullPage:true});
 assert.equal(await page.locator('.lesson-card').count(),order.length);
 for(let i=0;i<lessons.length;i++){
  if(i%shardCount!==shardIndex)continue;
  await page.goto(base+'lessons/'+lessons[i].slug+'.html');
  assert.equal(await page.locator('.underhood tbody tr').count(),5);
  if(lessons[i].slug==='resolve-the-streaming-incident'){await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  let workerRequests=0;
  if(i===0){
   // Stall initialization only. The successful retry still runs real Linux/Bytewax.
   await page.route('**/worker.js',route=>{
    workerRequests++;
    return workerRequests<=3?route.fulfill({contentType:'text/javascript',body:`onmessage=()=>{
      postMessage({type:'loading',message:'Test runtime download…',downloaded:25,total:100});
      setTimeout(()=>postMessage({type:'loading',stage:'boot',message:'Test guest startup pending…'}),500);
    }`}):route.continue();
   });
   await page.evaluate(()=>{
    const original=window.setTimeout;let bootTimers=0;
    window.setTimeout=(fn,delay,...args)=>original(fn,delay===60000&&++bootTimers<=3?800:delay,...args);
   });
   await page.locator('#code').focus();await page.keyboard.press('Tab');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'run');
   await page.keyboard.press('Enter');
   await page.locator('#runtime-progress').waitFor({state:'visible'});
   assert.equal(await page.locator('#runtime-progress').getAttribute('value'),'25');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'stop');
   await page.waitForFunction(()=>document.querySelector('#status').textContent==='Test guest startup pending…');
   assert.equal(await page.locator('#runtime-progress').isVisible(),false);
   await page.keyboard.press('Enter');await page.waitForTimeout(1100);
   assert.equal(workerRequests,1,'Stop must cancel the startup watchdog');
   assert.match(await page.locator('#status').textContent(),/Stopped/);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'run');
   // Isolate the host watchdog from real guest boot variability. No result is fabricated.
   await page.locator('#run').click();
   await page.waitForFunction(()=>document.querySelector('#error-summary').textContent.includes('stalled twice'));
   assert.equal(workerRequests,3,'Initialization is bounded to one retry');
   assert.equal(await page.locator('#export').isDisabled(),true);
   assert.equal(await page.locator('#run-result').isVisible(),false);
   assert.equal(await page.locator('#stop').isVisible(),false);
   await page.unroute('**/worker.js');
  }
  await page.locator('#run').click();
  try{await page.waitForFunction(()=>!document.querySelector('#run').disabled,undefined,{timeout:240000})}
  catch(error){await page.screenshot({path:artifact('failure-')+lessons[i].slug+'.png',fullPage:true});await fs.writeFile(artifact('failure-')+lessons[i].slug+'.json',JSON.stringify({status:await page.locator('#status').textContent(),output:await page.locator('#output').textContent(),source:await page.locator('#code').inputValue()},null,2));throw error}
  const status=await page.locator('#status').textContent();
  if(!status.includes('Completed')){await page.screenshot({path:artifact('failure-')+lessons[i].slug+'.png',fullPage:true});await fs.writeFile(artifact('failure-')+lessons[i].slug+'.json',JSON.stringify({status,output:await page.locator('#output').textContent()},null,2))}
  assert.match(status,/Completed/);
  assert.deepEqual(JSON.parse(await page.locator('#output').textContent()),samples[i],lessons[i].slug);
  if(i===shardIndex+shardCount){
   const cachedDownload=page.waitForEvent('download');await page.locator('#export').click();
   await (await cachedDownload).saveAs(artifact('cached-runtime.json'));
   const cached=JSON.parse(await fs.readFile(artifact('cached-runtime.json'),'utf8'));
   assert.equal(cached.runtime.timing.asset_source,'browser-cache','Chapter navigation reuses prepared assets');
   assert.ok(cached.runtime.timing.guest_startup_ms>0,'A cached runtime still starts a new guest');
   assert.ok(cached.runtime.timing.total_ms>=cached.runtime.timing.guest_startup_ms);
  }
  if(i===0){
   assert.equal(workerRequests,3,'A stalled guest gets exactly one initialization retry');
   const retryExport=page.waitForEvent('download');await page.locator('#export').click();
   await (await retryExport).saveAs(artifact('initialization-retry.json'));
   const retried=JSON.parse(await fs.readFile(artifact('initialization-retry.json'),'utf8'));
   assert.ok([0,1].includes(retried.runtime.initialization_retries));
   assert.deepEqual(retried.result,samples[0]);
   await page.unroute('**/worker.js');
   assert.equal(await page.locator('#attempt-error').isVisible(),false);
   console.log('PASS startup watchdog: Stop cancels; boot retries are bounded; fresh actual Linux execution matches native.');
  }
  if(lessons[i].slug==='choose-the-right-clock'){
   assert.match(await page.locator('.change').textContent(),/from 13 to 9/);
   const source=await page.locator('#code').inputValue();
   const edited=source.replace('"c": 13','"c": 9');
   await page.locator('#code').fill(edited);
   const changed=await runResult(page);
   assert.deepEqual(samples[i].trace[2],{id:'c',event_time:8,processing_time:13,event_window:0,processing_window:1});
   assert.deepEqual(changed.trace[2],{id:'c',event_time:8,processing_time:9,event_window:0,processing_window:0});
   assert.deepEqual(changed.trace.map(row=>row.id),samples[i].trace.map(row=>row.id));
   const next=page.getByRole('button',{name:'Next trace step',exact:true});
   await next.click();await next.click();
   const traceView=await page.locator('#visual').textContent();
   const consoleOutput=await page.locator('#output').textContent();
   const exported=await exportResult(page,'clock-edited.json');
   assert.equal(exported.source,edited);
   await page.locator('#code').fill(edited+"\nprint('partial output')\nraise ValueError('clock test failure')");
   await page.locator('#code').press('Control+Enter');
   await page.locator('#attempt-error').waitFor();
   assert.match(await page.locator('#error-summary').textContent(),/clock test failure/);
   await page.locator('#error-details summary').click();
   assert.match(await page.locator('#error-trace').textContent(),/partial output/);
   assert.equal(await page.locator('#visual').textContent(),traceView);
   assert.equal(await page.locator('#output').textContent(),consoleOutput);
   assert.deepEqual(await exportResult(page,'clock-after-error.json'),exported);
   console.log('PASS clock edit and preservation of successful console, selected trace step and export after a Python error.');
  }
  if(lessons[i].slug==='count-the-join-output'){
   assert.match(await page.locator('.change').textContent(),/horizon=20/);
   const source=await page.locator('#code').inputValue();
   const wider=source.replace('horizon=10','horizon=20');
   await page.locator('#code').fill(wider);
   const changed=await runResult(page);
   assert.deepEqual(changed.matches,[...samples[i].matches,{order:'y',receipt:'p3'}]);
   assert.equal(changed.comparisons,samples[i].comparisons);
   const extra=wider.replace('\n]','\n    {"id": "x", "time": 10, "receipt": "p4"},\n]');
   await page.locator('#code').fill(extra);
   const added=await runResult(page);
   assert.deepEqual(added.matches.filter(pair=>pair.order==='x').map(pair=>pair.receipt),['p1','p2','p4']);
   assert.equal(added.matches.length,4);
   assert.equal(added.comparisons,8);
   console.log('PASS widening the interval join and adding a receipt in the browser editor.');
  }
  console.log('PASS Linux lesson:',lessons[i].slug);
  if(lessons[i].slug==='wait-for-late-events'){await page.locator('#visual').scrollIntoViewIfNeeded();await page.screenshot({path:artifact('bytewax-windows-desktop.png')});await page.getByRole('button',{name:'Next trace step',exact:true}).click();}
  await page.locator('#done').check();
 }
 if(shardIndex===0){
 await page.goto(base+'lessons/'+lessons[0].slug+'.html');
 await page.locator('#code').fill("raise ValueError('test failure')");await page.locator('#run').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('reported an error'),undefined,{timeout:240000});
 assert.match(await page.locator('#error-summary').textContent(),/test failure/);
 assert.equal(await page.locator('#run-result').isVisible(),false);
 await page.locator('#restore').click();await page.locator('#run').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Completed'));
 const resultBeforeStop=await page.locator('#output').textContent();
 await page.locator('#code').fill('while True: pass');await page.locator('#run').click();await page.waitForFunction(()=>document.querySelector('#status').textContent==='Running your Python…');await page.waitForTimeout(500);await page.locator('#stop').click();
 assert.match(await page.locator('#status').textContent(),/Stopped/);
 assert.equal(await page.locator('#output').textContent(),resultBeforeStop);
 assert.equal(await page.locator('#export').isEnabled(),true);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'run');
 await page.locator('#restore').click();await page.locator('#run').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Completed'),undefined,{timeout:240000});
 const downloaded=page.waitForEvent('download');await page.locator('#download').click();const file=await downloaded;await file.saveAs(artifact('downloaded.py'));assert.deepEqual(JSON.parse(execFileSync('python3',[artifact('downloaded.py')],{encoding:'utf8'})),samples[0]);
 const exported=page.waitForEvent('download');await page.locator('#export').click();const record=await exported;await record.saveAs(artifact('run.json'));const savedRun=JSON.parse(await fs.readFile(artifact('run.json'),'utf8'));assert.deepEqual(savedRun.result,samples[0]);assert.equal(savedRun.runtime.bytewax,'0.21.1');assert.match(savedRun.runtime.broker,/simulator/);
 await page.locator('#code').fill(lessons[0].code+'\n# saved edit');assert.match(await page.locator('#execution-note').textContent(),/Code changed/);await page.reload();assert.match(await page.locator('#code').inputValue(),/saved edit/);assert.equal(await page.locator('#done').isChecked(),true);
 assert.equal(await page.locator('#saved-draft-notice').isVisible(),true);
 await page.locator('#restore').click();
 assert.equal(await page.locator('#code').inputValue(),lessons[0].code);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'code');
 await page.reload();await page.locator('#recover-draft').click();
 assert.equal(await page.locator('#code').inputValue(),lessons[0].code+'\n# saved edit');
 assert.deepEqual(await page.locator('#code').evaluate(e=>[e.selectionStart,e.scrollTop,e.scrollLeft]),[0,0,0]);
 assert.equal(await page.locator('#done').isChecked(),true);
 // Existing drafts are preserved and download separately; reading marks survive.
 await page.evaluate(()=>{localStorage.setItem('esl:draft:follow-an-event','import reactivex as rx\n# previous draft');localStorage.removeItem('esl:draft-runtime:follow-an-event')});
 await page.reload();assert.equal(await page.locator('#code').inputValue(),lessons[0].code);
 assert.match(await page.getByRole('button',{name:'Download previous draft'}).textContent(),/previous/);
 assert.equal(await page.locator('#done').isChecked(),true);
 assert.match(await page.evaluate(()=>localStorage.getItem('esl:legacy-draft:follow-an-event')),/reactivex/);
 await page.locator('#recover-draft').click();
 assert.match(await page.locator('#code').inputValue(),/saved edit/);
 const legacyDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download previous draft'}).click();
 await (await legacyDownload).saveAs(artifact('legacy-draft.py'));
 assert.match(await fs.readFile(artifact('legacy-draft.py'),'utf8'),/import reactivex/);
 await page.locator('#theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.screenshot({path:artifact('lesson-dark.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:artifact('lesson-mobile.png'),fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile lesson overflow');
 await page.goto(base);await page.screenshot({path:artifact('overview-mobile.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overview overflow');
 // Advanced reading remains readable without JavaScript or any Python downloads.
 const readingContext=await browser.newContext({javaScriptEnabled:false,viewport:{width:1440,height:1000}});
 const reading=await readingContext.newPage();const requested=[];reading.on('request',r=>requested.push(r.url()));
 for(const c of chapters){
  const r=await reading.goto(base+'advanced/'+c.slug+'.html');assert.equal(r.status(),200);
  assert.equal(await reading.locator('h1').textContent(),c.title);
  assert.equal(await reading.locator('.topology-nodes>div').count(),4);
  assert.ok(await reading.locator('tbody tr').count()>=3);
  assert.ok((await reading.locator('main').innerText()).length>3000);
 }
 assert.equal(requested.some(url=>/\/(engine|assets\/linux)\//.test(url)),false);
 await reading.close();await readingContext.close();
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(base+'advanced/consistent-checkpoints.html');
 await page.screenshot({path:artifact('advanced-desktop.png'),fullPage:true});
 await page.locator('#reading-done').check();await page.reload();assert.equal(await page.locator('#reading-done').isChecked(),true);
 await page.getByText('Show explanation',{exact:true}).click();assert.ok(await page.locator('.practice details').last().getAttribute('open')!==null);
 await page.setViewportSize({width:390,height:844});
 for(const c of chapters){await page.goto(base+'advanced/'+c.slug+'.html');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),c.slug+' overflows');}
 await page.goto(base+'advanced/consistent-checkpoints.html');await page.screenshot({path:artifact('advanced-mobile.png'),fullPage:true});
 await page.goto(base+'advanced/zeromq-companion.html');assert.match(await page.locator('main').innerText(),/Messaging Patterns Lab/);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'companion overflow');
 await page.goto(base+'advanced/index.html');assert.equal(await page.locator('.reading-card').count(),chapters.length);
 await page.goto(base+'performance.html');assert.match(await page.locator('main').innerText(),/native-benchmark.py/);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 // Fast mode reuses Linux, but resets Python, files, environment and native sockets.
 await page.goto(base+'lessons/'+lessons[0].slug+'.html');
 assert.equal(await page.locator('#run-mode').inputValue(),'warm');
 const isolation=`import os, socket, time
from pathlib import Path
import course as lesson_module
assert os.getpid()==1
assert 'previous_run_value' not in globals()
assert 'LESSON_ENV_PROOF' not in os.environ
assert not hasattr(lesson_module,'learner_proof')
for name in ['/isolation-proof','/tmp/isolation-proof','/var/tmp/isolation-proof']:
    assert not Path(name).exists()
    Path(name).write_text('temporary')
previous_run_value=1
os.environ['LESSON_ENV_PROOF']='temporary'
lesson_module.learner_proof=True
background=os.fork()
if background==0:
    time.sleep(600)
    os._exit(0)
probe_socket=socket.socket()
probe_socket.bind(('127.0.0.1',50555))
try:
    Path('/etc/isolation-proof').write_text('must fail')
    raise AssertionError('Shared runtime must be read-only')
except OSError as error:
    assert error.errno==30
`+lessons[0].code;
 async function completedRun(){
  await page.locator('#run').click();
  await page.waitForFunction(()=>!document.querySelector('#run').disabled,undefined,{timeout:240000});
  assert.match(await page.locator('#status').textContent(),/Completed in/);
  assert.deepEqual(JSON.parse(await page.locator('#output').textContent()),samples[0]);
 }
 async function runtimeExport(name){
  const pending=page.waitForEvent('download');await page.locator('#export').click();
  await(await pending).saveAs(artifact(name));
  return JSON.parse(await fs.readFile(artifact(name),'utf8'));
 }
 await page.locator('#code').fill(isolation);
 for(let repeat=0;repeat<2;repeat++){
  await completedRun();
  const saved=await runtimeExport('warm-isolation-'+repeat+'.json');
  assert.equal(saved.runtime.mode,'warm');assert.equal(saved.runtime.session_run,repeat+1);
  assert.equal(saved.runtime.process_pid,1);assert.equal(saved.runtime.procfs,false);
  assert.ok(saved.runtime.elapsed_ms>0);
  if(repeat===1)assert.equal(saved.runtime.timing.guest_startup_ms,0,'Reruns must not boot another guest');
 }
 const beforeReset=await page.locator('#output').textContent();
 await page.locator('#reset-runtime').click();
 assert.match(await page.locator('#status').textContent(),/Linux reset/);
 assert.equal(await page.locator('#output').textContent(),beforeReset);
 assert.equal(await page.locator('#code').inputValue(),isolation);
 await completedRun();
 assert.equal((await runtimeExport('after-linux-reset.json')).runtime.session_run,1);
 await page.locator('#restore').click();
 await page.locator('#code').fill(lessons[0].code+'\nimport os\nassert os.path.isdir("/proc/self")\n');
 await page.locator('#run-mode').selectOption('fresh');
 await completedRun();
 const fresh=await runtimeExport('explicit-fresh-linux.json');
 assert.equal(fresh.runtime.mode,'fresh');assert.equal(fresh.runtime.procfs,true);
 await page.locator('#run-mode').selectOption('warm');
 // Disable JSPI in the worker only, then execute the real fresh-guest fallback.
 await page.route('**/worker.js',async route=>{
  const response=await route.fetch();
  await route.fulfill({response,body:'WebAssembly.Suspending=undefined;\n'+await response.text()});
 });
 await completedRun();
 const fallback=await runtimeExport('unsupported-fast-fallback.json');
 assert.equal(fallback.runtime.mode,'fresh');assert.match(fallback.runtime.warm_fallback,/unavailable/);
 assert.equal(await page.locator('#run-mode').inputValue(),'fresh');
 await page.unroute('**/worker.js');await page.locator('#restore').click();
 console.log('PASS warm session isolation, no reboot on rerun, reset, explicit fresh Linux and real JSPI fallback.');
 assert.deepEqual(errors,[]);console.log('PASS: all published Linux/Bytewax sources match native results; error/retry, Stop/restart, drafts, completion, themes, mobile and subpath hosting; all static design readings, saved marks and ZeroMQ proposal.');
 }else console.log(`PASS Linux shard ${shardIndex+1}/${shardCount}: all assigned published sources match native results.`);
}finally{await browser?.close();server.kill()}
