import fs from 'node:fs/promises';
import path from 'node:path';
const html=[];
async function walk(dir){for(const f of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isDirectory()&&!['engine','assets'].includes(f.name))await walk(p);else if(f.isFile()&&p.endsWith('.html'))html.push(p)}}
await walk('dist');
for(const file of html){
 const source=await fs.readFile(file,'utf8');
 for(const match of source.matchAll(/(?:href|src)="([^"]+)"/g)){
  const link=match[1];if(/^(https?:|data:)/.test(link))continue;
  const [location,fragment]=link.split('#');
  const target=location?path.resolve(path.dirname(file),location.split('?')[0]):path.resolve(file);
  await fs.access(target).catch(()=>{throw Error(file+' has missing target '+link)});
  if(fragment&&target.endsWith('.html')){
   const body=await fs.readFile(target,'utf8'),id=decodeURIComponent(fragment);
   if(![...body.matchAll(/\bid="([^"]+)"/g)].some(value=>value[1]===id))throw Error(file+' has missing fragment '+link);
  }
 }
}
console.log('Local links and fragments checked across '+html.length+' static course pages.');
