import fs from 'node:fs/promises';
import path from 'node:path';
const html=[];
async function walk(dir){for(const f of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isDirectory()&&!['engine','assets'].includes(f.name))await walk(p);else if(f.isFile()&&p.endsWith('.html'))html.push(p)}}
await walk('dist');
for(const file of html){const text=await fs.readFile(file,'utf8');for(const m of text.matchAll(/(?:href|src)="([^"]+)"/g)){const link=m[1];if(/^(https?:|data:|#)/.test(link))continue;const target=path.resolve(path.dirname(file),link.split('#')[0]);await fs.access(target).catch(()=>{throw Error(file+' has missing target '+link)})}}
console.log('Local links checked across '+html.length+' static course pages.');
