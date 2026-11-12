import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {lessons} from '../src/lessons.mjs';
import {chapters} from '../src/advanced.mjs';
const samples=JSON.parse(execFileSync('python3',['tests/test_course.py','--json'],{encoding:'utf8'}));
await fs.mkdir('test-results',{recursive:true});
const server=spawn('python3',['-m','http.server','5174','--bind','127.0.0.1','--directory','.preview'],{stdio:'ignore'});
let browser;
try{
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5174/event-streaming-lab/')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({executablePath:process.env.CI ? undefined : process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const base='http://127.0.0.1:5174/event-streaming-lab/';
 await page.goto(base);await page.screenshot({path:'test-results/overview-desktop.png',fullPage:true});
 assert.equal(await page.locator('.lesson-card').count(),lessons.length);
 for(let i=0;i<lessons.length;i++){
  await page.goto(base+'lessons/'+lessons[i].slug+'.html');
  await page.locator('#run').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Completed')||document.querySelector('#status').textContent.includes('error'),undefined,{timeout:90000});
  assert.match(await page.locator('#status').textContent(),/Completed/);
  assert.deepEqual(JSON.parse(await page.locator('#output').textContent()),samples[i],lessons[i].slug);
  if(i===3){await page.locator('#visual').scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/watermark-desktop.png'});await page.getByRole('button',{name:'Next trace step',exact:true}).click();}
  await page.locator('#done').check();
 }
 await page.goto(base+'lessons/'+lessons[0].slug+'.html');
 await page.locator('#code').fill("raise ValueError('test failure')");await page.locator('#run').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('reported an error'),undefined,{timeout:90000});
 assert.match(await page.locator('#output').textContent(),/test failure/);
 await page.locator('#restore').click();await page.locator('#run').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Completed'));
 await page.locator('#code').fill('while True: pass');await page.locator('#run').click();await page.waitForFunction(()=>document.querySelector('#status').textContent==='Running your Python…');await page.locator('#stop').click();
 assert.match(await page.locator('#status').textContent(),/Stopped/);
 await page.locator('#restore').click();await page.locator('#run').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Completed'),undefined,{timeout:90000});
 const downloaded=page.waitForEvent('download');await page.locator('#download').click();const file=await downloaded;await file.saveAs('test-results/downloaded.py');assert.deepEqual(JSON.parse(execFileSync('python3',['test-results/downloaded.py'],{encoding:'utf8'})),samples[0]);
 const exported=page.waitForEvent('download');await page.locator('#export').click();const record=await exported;await record.saveAs('test-results/run.json');assert.deepEqual(JSON.parse(await fs.readFile('test-results/run.json','utf8')).result,samples[0]);
 await page.locator('#code').fill(lessons[0].code+'\n# saved edit');assert.match(await page.locator('#execution-note').textContent(),/Code changed/);await page.reload();assert.match(await page.locator('#code').inputValue(),/saved edit/);assert.equal(await page.locator('#done').isChecked(),true);
 await page.locator('#theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.screenshot({path:'test-results/lesson-dark.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/lesson-mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile lesson overflow');
 await page.goto(base);await page.screenshot({path:'test-results/overview-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overview overflow');
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
 assert.equal(requested.some(url=>/\/(engine|assets)\//.test(url)),false);
 await reading.close();await readingContext.close();
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(base+'advanced/consistent-checkpoints.html');
 await page.screenshot({path:'test-results/advanced-desktop.png',fullPage:true});
 await page.locator('#reading-done').check();await page.reload();assert.equal(await page.locator('#reading-done').isChecked(),true);
 await page.getByText('Compare your reasoning',{exact:true}).click();assert.ok(await page.locator('.practice details').last().getAttribute('open')!==null);
 await page.setViewportSize({width:390,height:844});
 for(const c of chapters){await page.goto(base+'advanced/'+c.slug+'.html');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),c.slug+' overflows');}
 await page.goto(base+'advanced/consistent-checkpoints.html');await page.screenshot({path:'test-results/advanced-mobile.png',fullPage:true});
 await page.goto(base+'advanced/zeromq-companion.html');assert.match(await page.locator('main').innerText(),/PROPOSAL/);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'companion overflow');
 await page.goto(base+'advanced/index.html');assert.equal(await page.locator('.reading-card').count(),9);
 assert.deepEqual(errors,[]);console.log('PASS: 10 real Wasm runs match native results; error/retry, Stop/restart, drafts, completion, themes, mobile and subpath hosting; 9 static advanced readings, saved marks and ZeroMQ proposal.');
}finally{await browser?.close();server.kill()}
