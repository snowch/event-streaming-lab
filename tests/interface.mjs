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
 await page.locator('#code').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'run');
 assert.equal(requests.some(url=>/\/(engine|assets\/linux)\//.test(url)),false,'navigation must not load the VM');
 await fs.mkdir('test-results',{recursive:true});
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'test-results/gpu-style-desktop.png',fullPage:true});
 await page.locator('#theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 assert.equal(await page.locator('#theme').textContent(),'Light theme');
 await page.screenshot({path:'test-results/gpu-style-dark.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.locator('.course-switcher>summary').click();
 const panel=await page.locator('.course-panel').boundingBox();assert.ok(panel.x>=0&&panel.x+panel.width<=390,'menu fits phone');
 await page.screenshot({path:'test-results/gpu-style-menu-mobile.png'});
 await page.keyboard.press('Escape');await page.locator('#theme').click();
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'test-results/gpu-style-mobile.png',fullPage:true});
 const staticContext=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),reading=await staticContext.newPage();
 const staticRequests=[];reading.on('request',r=>staticRequests.push(r.url()));
 for(const path of [...lessons.map(l=>'lessons/'+l.slug+'.html'),...chapters.map(c=>'advanced/'+c.slug+'.html'),'index.html','advanced/index.html','about.html','performance.html','advanced/zeromq-companion.html']){
  assert.equal((await reading.goto(base+path)).status(),200);
  assert.ok(await reading.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path+' overflows');
  if(path.startsWith('lessons/')||path.startsWith('advanced/')&&!path.endsWith('index.html')&&!path.endsWith('zeromq-companion.html'))assert.ok((await reading.locator('h1').boundingBox()).y<650,'static chapter opens with its heading');
 }
 await reading.goto(base+'lessons/route-and-quarantine.html');await reading.locator('.operator-source>summary').click();
 assert.match(await reading.locator('.operator-source code').textContent(),/op\.branch/);
 assert.ok(await reading.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await reading.locator('.operator-source').scrollIntoViewIfNeeded();await reading.screenshot({path:'test-results/gpu-style-operator-mobile.png'});
 await reading.locator('.course-switcher>summary').click();assert.equal(await reading.locator('.course-switcher').evaluate(e=>e.open),true,'course navigation works without JS');
 assert.equal(staticRequests.some(url=>/\/(engine|assets\/linux)\//.test(url)),false);
 assert.deepEqual(errors,[]);
 console.log('PASS GPU-style interface: centered chapters, self-hosted type, keyboard/outside/Escape navigation, themes, all 51 static phone layouts, inspectable source and no VM before activation.');
}finally{await browser?.close();server.kill()}
