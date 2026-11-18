import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const groups=JSON.parse(await fs.readFile(new URL('../src/references.json',import.meta.url),'utf8'));
const apiLinks=new Map(Object.values(groups).flatMap(items=>items.flatMap(item=>item.links)));
let helpers;

function link([label,url]){
 return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"><code>${esc(label)}</code><span class="reference-new-tab"> (new tab)</span></a>`;
}

export function renderReferences(items,{note,subtitle='API contracts, course helper code and reading checks'}={}){
 return `<details class="chapter-references" data-references><summary><span><strong>References</strong><span class="reference-subtitle">${esc(subtitle)}</span></span></summary><div class="reference-body"><p class="note">${esc(note||'Open a reference alongside the lesson. Library contracts and authored course policies are identified separately.')}</p><ul class="chapter-reference-list">${items.map(item=>`<li><h3>${esc(item.title)}</h3><div class="reference-links">${item.links.map(link).join('')}</div>${item.note?`<p>${esc(item.note)}</p>`:''}${item.question?`<p class="reference-question">${esc(item.question)}</p><details class="reference-answer"><summary>Compare your answer</summary><p>${esc(item.answer)}</p></details>`:''}</li>`).join('')}</ul></div></details>`;
}

export function referencesForLesson(lesson){
 const selected=groups[lesson.slug];
 if(!selected?.length)throw Error('Missing API references: '+lesson.slug);
 const items=selected.map(item=>({...item,links:[...item.links]}));
 const covered=new Set(items.flatMap(item=>item.links.map(([name])=>name)));
 const direct=[...lesson.code.matchAll(/\bop\.(\w+)\s*\(/g)].map(match=>'op.'+match[1]);
 for(const match of lesson.code.matchAll(/^from bytewax\.(\w+) import ([^\n]+)/gm)){
  for(const name of match[2].split(','))direct.push(match[1]+'.'+name.trim().split(/\s+as\s+/)[0]);
 }
 const missing=[...new Set(direct)].filter(name=>!covered.has(name));
 if(missing.length)items.push({title:'Graph construction and input interfaces',links:missing.map(name=>{
  if(!apiLinks.has(name))throw Error('Missing API symbol: '+name);
  return [name,apiLinks.get(name)];
 }),note:'Read these signatures for the graph and finite test input constructed in the editor. The course collection helper attaches an output and starts execution.'});
 const names=[];
 for(const match of lesson.code.matchAll(/^from (course|patterns|live_kafka|messaging) import ([^\n]+)/gm)){
  for(const name of match[2].split(',')){
   const id=match[1]+'.'+name.trim().split(/\s+as\s+/)[0];
   if(helpers.has(id))names.push(id);
  }
 }
 const delegated={
  'read-a-partitioned-log':['kafka_lab.partition_log'],
  'give-consumers-their-own-position':['kafka_lab.consume_log'],
  'recover-after-a-failure':['recovery_drill.recover','recovery_drill.worker'],
  'stream-live-through-kafka':['live_kafka.consume'],
 };
 names.push(...(delegated[lesson.slug]||[]));
 if(!names.length)throw Error('Missing course-helper reference: '+lesson.slug);
 for(const name of names)if(!helpers.has(name))throw Error('Unknown helper: '+name);
 items.push({title:'Course helper implementation',links:[...new Set(names)].map(name=>[name,'../helpers.html#'+name]),note:'These are functions written for this course, not additional library APIs. Inspect their parameters, operator calls and authored policies. The source shown is generated from the same Python files packaged with Run and Download Python.'});
 return items;
}

export function renderLessonReferences(lesson){
 const items=referencesForLesson(lesson),urls=items.flatMap(item=>item.links.map(([,url])=>url));
 const notes=['References open in a new tab; course helpers are documented separately from library APIs.'];
 if(urls.some(url=>url.includes('/bytewax/bytewax/')))notes.push('Bytewax links target the official 0.21.1 definitions and API docstrings.');
 if(urls.some(url=>url.includes('pyzmq.readthedocs.io')))notes.push('PyZMQ API links use version 27.3.0.');
 if(urls.some(url=>url.includes('/libzmq/')))notes.push('ZeroMQ manuals are pinned to libzmq 4.3.5.');
 if(urls.some(url=>url.includes('docs.confluent.io')))notes.push('Confluent’s API guide is a moving reference; this lab uses confluent-kafka 2.6.1 with an in-memory broker simulator.');
 return renderReferences(items,{note:notes.join(' ')});
}

export function renderReadingReferences(chapter){
 return renderReferences(chapter.sources.map(([title,url])=>({title,links:[[title,url]]})),{subtitle:'Primary sources for this chapter’s design case',note:'Use these guides to check the framework or protocol contract discussed in this chapter. Moving “stable” or “current” guides can describe a different release; check the version used by your deployment. These readings do not execute the distributed frameworks they compare.'});
}

export async function writeHelperReference(shell,modules){
 const extraction=`import ast,json,pathlib,sys
result=[]
for module in sys.argv[1:]:
 p=pathlib.Path('python')/(module+'.py');source=p.read_text();lines=source.splitlines(keepends=True);functions=[]
 for node in ast.parse(source).body:
  if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef)) and not node.name.startswith('_'):
   first=min([node.lineno]+[d.lineno for d in node.decorator_list])
   functions.append(dict(id=module+'.'+node.name,name=node.name,signature=node.name+'('+ast.unparse(node.args)+')',doc=ast.get_docstring(node) or '',source=''.join(lines[first-1:node.end_lineno])))
 result.append(dict(module=module,source=source,functions=functions))
print(json.dumps(result))`;
 const data=JSON.parse(execFileSync('python3',['-c',extraction,...modules],{encoding:'utf8'}));
 helpers=new Set(data.flatMap(module=>module.functions.map(fn=>fn.id)));
 const body=`<main id="main" class="lesson helper-reference"><p><a href="index.html#curriculum">← Course contents</a></p><h1>Course helper reference</h1><p class="standfirst">Parameters and exact source for the functions used by the lessons.</p><p>These helpers connect library APIs and implement course-specific policies or models. They are not additional Bytewax, Kafka or ZeroMQ APIs. Imports and shared fixtures are in each complete module. The reference is generated from the same Python files used by the browser runner and source download; reading it does not load or run Python.</p><nav aria-label="Helper modules"><ul>${data.map(item=>`<li><a href="#${esc(item.module)}">${esc(item.module)}.py</a></li>`).join('')}</ul></nav>${data.map(item=>`<section id="${esc(item.module)}"><h2>${esc(item.module)}.py</h2><p><a href="python/${esc(item.module)}.py">Complete Python module</a></p>${item.functions.length?`<ul class="helper-index">${item.functions.map(fn=>`<li><a href="#${esc(fn.id)}"><code>${esc(fn.name)}</code></a></li>`).join('')}</ul>${item.functions.map(fn=>`<section class="helper-function" id="${esc(fn.id)}"><h3><code>${esc(fn.signature)}</code></h3>${fn.doc?`<p>${esc(fn.doc)}</p>`:''}<pre tabindex="0" aria-label="${esc(fn.id)} source"><code>${esc(fn.source)}</code></pre></section>`).join('')}`:`<p>This module runs the separate-process endpoint. It is a program rather than an imported lesson function.</p><pre tabindex="0"><code>${esc(item.source)}</code></pre>`}</section>`).join('')}</main>`;
 await fs.writeFile('dist/helpers.html',shell('Course helper reference',body));
}
