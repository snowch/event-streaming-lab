import {renderDiagram} from '../scripts/diagrams.mjs';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {lessons} from '../src/lessons.mjs';
import {chapters} from '../src/advanced.mjs';
const server=spawn('python3',['-m','http.server','5176','--bind','127.0.0.1','--directory','.preview'],{stdio:'ignore'});
let browser;
try{
 for(let i=0;i<40;i++){try{await fetch('http://127.0.0.1:5176/');break}catch{await new Promise(r=>setTimeout(r,100))}}
 browser=await chromium.launch({executablePath:process.env.CI?undefined:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const base='http://127.0.0.1:5176/event-streaming-lab/';
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 await context.addInitScript(()=>Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:true}}));
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto(base+'lessons/follow-an-event.html');await page.evaluate(()=>document.fonts.ready);
 assert.ok((await page.locator('h1').evaluate(e=>getComputedStyle(e).fontFamily)).includes('IBM Plex Sans'));
 const bounds=await page.locator('main').boundingBox();assert.ok(Math.abs(bounds.x-(1440-bounds.x-bounds.width))<2,'chapter is centered');
 const menu=page.locator('.course-switcher'),toggle=menu.locator(':scope>summary');
 assert.equal(await menu.evaluate(e=>e.open),false);
 await toggle.focus();await page.keyboard.press('Enter');
 assert.equal(await menu.evaluate(e=>e.open),true);
 assert.equal(await menu.locator('a[aria-current="page"]').count(),1);
 assert.equal(await menu.locator('.course-group li>a').count(),46);
 await page.keyboard.press('Escape');assert.equal(await menu.evaluate(e=>e.open),false);
 assert.equal(await toggle.evaluate(e=>e===document.activeElement),true);
 await toggle.click();await page.mouse.click(1350,200);assert.equal(await menu.evaluate(e=>e.open),false);
 await toggle.click();await menu.getByRole('link',{name:'3 Read a partitioned log',exact:true}).click();
 await page.waitForURL('**/read-a-partitioned-log.html');assert.equal(await page.locator('h1').textContent(),'Read a partitioned log');
 await page.locator('.exercise-hints>summary').click();
 assert.equal(await page.locator('.exercise-hints').evaluate(e=>e.open),true);
 assert.equal(await page.locator('.exercise-answer').evaluate(e=>e.open),false,'Hints do not reveal the answer');
 await page.locator('.hint-list details').first().locator('summary').click();
 assert.equal(await page.locator('.hint-list details').first().evaluate(e=>e.open),true);
 await page.locator('.exercise-hints>summary').click();
 await page.locator('.exercise-answer>summary').click();
 assert.equal(await page.locator('.exercise-answer').evaluate(e=>e.open),true);
 await page.locator('.exercise-answer>summary').click();
 await page.locator('#code').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'run');
 const outputPalette=()=>page.evaluate(()=>['#output','#error-trace'].map(selector=>{
  const style=getComputedStyle(document.querySelector(selector));
  return [style.color,style.backgroundColor];
 }));
 assert.match(await page.locator('.prepared-state').textContent(),/editor contains the published example.*Run/);
 assert.equal(await page.locator('.underhood').evaluate(e=>e.open),false);
 assert.equal(await page.locator('.runtime-contract').evaluate(e=>e.open),false);
 assert.equal(await page.locator('#run-mode').count(),0);
 assert.equal(await page.getByRole('button',{name:'Run',exact:true}).count(),1);
 assert.equal(await page.locator('#reset-runtime').isVisible(),false);
 await page.setViewportSize({width:320,height:760});
 await page.locator('#back-to-editor').focus();await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'code');
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'run');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'320 px lesson overflow');
 await page.setViewportSize({width:1440,height:1000});
 const lightOutput=await outputPalette();assert.deepEqual(lightOutput[0],lightOutput[1]);
 assert.equal(await page.locator('#console-title').textContent(),'Console output');
 assert.equal(requests.some(url=>/\/(engine|assets\/linux)\//.test(url)),false,'navigation must not load the VM');
 await fs.mkdir('test-results',{recursive:true});
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'test-results/gpu-style-desktop.png',fullPage:true});
 await page.locator('#theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 const darkOutput=await outputPalette();assert.deepEqual(darkOutput[0],darkOutput[1]);
 assert.equal(await page.locator('#theme').textContent(),'Light theme');
 await page.screenshot({path:'test-results/gpu-style-dark.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.locator('.course-switcher>summary').click();
 const panel=await page.locator('.course-panel').boundingBox();assert.ok(panel.x>=0&&panel.x+panel.width<=390,'menu fits phone');
 await page.screenshot({path:'test-results/gpu-style-menu-mobile.png'});
 await page.keyboard.press('Escape');await page.locator('#theme').click();
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'test-results/gpu-style-mobile.png',fullPage:true});
 const staticContext=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),reading=await staticContext.newPage();
 const staticRequests=[];reading.on('request',r=>staticRequests.push(r.url()));
 for(const path of [...lessons.map(l=>'lessons/'+l.slug+'.html'),...chapters.map(c=>'advanced/'+c.slug+'.html'),'index.html','advanced/index.html','about.html','performance.html','helpers.html','advanced/zeromq-companion.html']){
  assert.equal((await reading.goto(base+path)).status(),200);
  assert.ok(await reading.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path+' overflows');
  if(path.startsWith('lessons/')||path.startsWith('advanced/')&&!path.endsWith('index.html')&&!path.endsWith('zeromq-companion.html'))assert.ok((await reading.locator('h1').boundingBox()).y<650,'static chapter opens with its heading');
 }
 await reading.goto(base+'lessons/route-and-quarantine.html');
 assert.equal(await reading.locator('.experiment-input').isVisible(),true);
 await reading.locator('.worked>summary').focus();await reading.keyboard.press('Enter');
 assert.match(await reading.locator('.worked pre').innerText(),/quarantine/);
 await reading.locator('.operator-source>summary').click();
 assert.match(await reading.locator('.operator-source code').textContent(),/op\.branch/);
 assert.ok(await reading.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await reading.locator('.operator-source').scrollIntoViewIfNeeded();await reading.screenshot({path:'test-results/gpu-style-operator-mobile.png'});
 await reading.locator('.course-switcher>summary').click();assert.equal(await reading.locator('.course-switcher').evaluate(e=>e.open),true,'course navigation works without JS');
 assert.equal(staticRequests.some(url=>/\/(engine|assets\/linux)\//.test(url)),false);
 for(const lesson of lessons){
  if(!renderDiagram(lesson.slug))continue;
  await reading.goto(base+'lessons/'+lesson.slug+'.html');
  assert.equal(await reading.locator('.concept-diagram').count(),1,lesson.slug+' diagram missing');
  assert.ok(await reading.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),lesson.slug+' diagram overflows');
 }
 assert.deepEqual(errors,[]);
 // The compact course entry reaches an actual lesson in the first screen.
 await page.goto(base);await page.evaluate(()=>document.fonts.ready);
 for(const width of [390,834]){
  await page.setViewportSize({width,height:844});
  const first=await page.locator('.chapter-link').first().boundingBox();
  assert.ok(first.y+first.height<=844,'First lesson is visible in the opening viewport at '+width);
  assert.equal(await page.locator('.chapter-link').count(),46);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'test-results/home-'+width+'.png'});
 }
 // References work without JavaScript, preserve the experiment in a new tab,
 // and point directly to existing helper anchors and library API symbols.
 const refContext=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const refPage=await refContext.newPage();const referenceRequests=[];
 refPage.on('request',request=>referenceRequests.push(request.url()));
 await refPage.goto(base+'lessons/follow-an-event.html');
 const references=refPage.locator('[data-references]');
 assert.equal(await references.evaluate(element=>element.open),false);
 await references.locator(':scope>summary').focus();await refPage.keyboard.press('Enter');
 assert.equal(await references.evaluate(element=>element.open),true);
 assert.ok(await references.locator('a').count()>=4);
 assert.equal(await references.locator('.reference-question,.reference-answer').count(),0,'References contain no assessment');
 assert.ok(!(await references.textContent()).includes('Compare your answer'));
 assert.equal(await references.locator(':scope>summary [data-resource-icon="book"] svg').count(),1);
 assert.equal(await references.locator(':scope>summary .resource-toggle').count(),1);
 assert.equal(await references.locator(':scope>summary').evaluate(element=>getComputedStyle(element).listStyleType),'none');
 assert.equal(await references.locator(':scope>summary .resource-icon').getAttribute('aria-hidden'),'true');
 assert.equal(await refPage.locator('.underhood>summary [data-resource-icon="cost"]').count(),1);
 assert.equal(await refPage.locator('.practice').count(),1,'The lesson exercise stays separate');

 assert.equal(await references.locator('a:not([target="_blank"])').count(),0);
 assert.ok(await refPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await references.locator(':scope>summary').scrollIntoViewIfNeeded();await refPage.locator('[data-references]>summary').evaluate(element=>scrollTo(0,element.getBoundingClientRect().top+scrollY-100));await refPage.screenshot({path:'test-results/references-phone.png'});
 await refPage.goto(base+'helpers.html#course.collect');
 assert.equal(await refPage.locator('[id="course.collect"]').count(),1);
 assert.ok(await refPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.equal(referenceRequests.some(url=>/\/(engine|assets\/linux)\//.test(url)),false);
 await refContext.close();
 // Prepared runtime bytes persist across chapters, while a changed manifest
 // and denied storage both fall back to normal runtime preparation.
 const cachePage=await browser.newPage();await cachePage.addInitScript(()=>Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:true}}));await cachePage.goto(base);
 assert.equal(await cachePage.evaluate(async()=>{
  const cache=await import('./runtime-cache.mjs');
  return cache.writePreparedRuntime('interface-probe',new Uint8Array([0,97,115,109,1,0,0,0]),new Uint8Array([12,34,56]));
 }),true);
 await cachePage.goto(base+'lessons/'+lessons[0].slug+'.html');
 assert.deepEqual(await cachePage.evaluate(async()=>{
  const cache=await import('../runtime-cache.mjs'),saved=await cache.readPreparedRuntime('interface-probe');
  await WebAssembly.compile(saved.engineBytes);
  const changed=await cache.readPreparedRuntime('changed-manifest');
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'indexedDB');
  let denied,writeDenied;
  try{
   Object.defineProperty(globalThis,'indexedDB',{configurable:true,get(){throw new DOMException('Storage denied','SecurityError')}});
   denied=await cache.readPreparedRuntime('interface-probe');
   writeDenied=await cache.writePreparedRuntime('other',new Uint8Array(),new Uint8Array());
  }finally{if(descriptor)Object.defineProperty(globalThis,'indexedDB',descriptor);else delete globalThis.indexedDB}
  return {archive:[...saved.archive],changed,denied,writeDenied};
 }),{archive:[12,34,56],changed:null,denied:null,writeDenied:false});
 await cachePage.close();
 const deniedContext=await browser.newContext();
 await deniedContext.addInitScript(()=>{
  const store=Storage.prototype.setItem;
  store.call(localStorage,'esl:draft:follow-an-event','# Saved before storage became unavailable');
  store.call(localStorage,'esl:draft-runtime:follow-an-event','bytewax-v1');
  Storage.prototype.setItem=()=>{throw new DOMException('Storage denied','QuotaExceededError')};
 });
 const deniedPage=await deniedContext.newPage();
 await deniedPage.goto(base+'lessons/follow-an-event.html');
 assert.equal(await deniedPage.locator('#saved-draft-notice').isVisible(),true);
 assert.equal(await deniedPage.locator('.prepared-state').isVisible(),false);
 await deniedPage.locator('#code').fill('# Unsaved edit');
 assert.match(await deniedPage.locator('#draft-status').textContent(),/Could not save this change/);
 await deniedPage.locator('#restore').click();
 assert.equal(await deniedPage.locator('.prepared-state').isVisible(),true);
 assert.match(await deniedPage.locator('#draft-status').textContent(),/available in this tab/);
 await deniedPage.locator('#recover-draft').click();
 assert.equal(await deniedPage.locator('#code').inputValue(),'# Unsaved edit');
 await deniedPage.locator('#done').check();
 assert.match(await deniedPage.locator('#save-status').textContent(),/lasts for this visit/);
 await deniedPage.reload();
 assert.equal(await deniedPage.locator('#code').inputValue(),'# Saved before storage became unavailable');
 assert.equal(await deniedPage.locator('#done').isChecked(),false);
 await deniedContext.close();
 console.log('PASS GPU-style interface: centered chapters, self-hosted type, keyboard/outside/Escape navigation, themes, all 51 static phone layouts, inspectable source and static reading and Save Data defer runtime preparation.');
}finally{await browser?.close();server.kill()}
