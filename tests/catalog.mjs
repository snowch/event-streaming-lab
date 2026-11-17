import assert from 'node:assert/strict';
import {parts,order} from '../src/catalog.mjs';
import {lessons} from '../src/lessons.mjs';
import {chapters} from '../src/advanced.mjs';
import {depth} from '../src/depth.mjs';
assert.equal(parts.length,8);assert.equal(order.length,46);assert.equal(new Set(order.map(x=>x.id)).size,46);
assert.equal(lessons.length,30);assert.equal(chapters.length,16);
assert.deepEqual(new Set(order.map(x=>x.id)),new Set([...lessons.map(l=>l.slug),...chapters.map(c=>'advanced/'+c.slug)]));
for(const l of lessons){assert.equal(depth(l).length,5);for(const v of depth(l))assert.ok(typeof v==='string'&&v.length>35);for(const field of ['goal','intro','concept','predict','observe','change','question','answer','limit','source'])assert.ok(l[field]?.length>20,l.slug+field)}
console.log('46 unique chapters in 8 parts; every executable investigation has five operation-cost boundaries.');
