import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {lessons} from '../src/lessons.mjs';
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
 assert.deepEqual(errors,[]);console.log('PASS: 10 real Wasm runs match native results; error/retry, Stop/restart, drafts, completion, themes, mobile and subpath hosting.');
}finally{await browser?.close();server.kill()}
