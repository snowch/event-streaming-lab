import assert from 'node:assert/strict';
import {clockPoll} from '../src/wasi-poll.mjs';
const memory=new WebAssembly.Memory({initial:1});
const wasi={inst:{exports:{memory}}},v=new DataView(memory.buffer);
const input=0,output=1024,nEvents=2048;
function reset(){new Uint8Array(memory.buffer).fill(0)}
reset();v.setBigUint64(0,42n,true);v.setUint8(8,1);v.setUint32(16,0,true);
assert.equal(clockPoll(wasi,input,output,1,nEvents),6,'idle input must not be misreported as EOF');
reset();v.setBigUint64(0,7n,true);v.setUint32(16,1,true);v.setBigUint64(24,3000000n,true);
const before=performance.now();clockPoll(wasi,input,output,1,nEvents);
assert.ok(performance.now()-before>=3,'relative clocks must not fire before their deadline');
assert.equal(v.getUint8(output+10),0);assert.equal(v.getBigUint64(output,true),7n);
reset();v.setUint32(16,0,true);v.setBigUint64(24,1n,true);v.setUint16(40,1,true);
assert.equal(clockPoll(wasi,input,output,1,nEvents),0);assert.equal(v.getUint32(nEvents,true),1);
reset();v.setUint8(8,1);v.setUint32(16,99,true);
clockPoll(wasi,input,output,1,nEvents);assert.equal(v.getUint16(output+8,true),8);
assert.equal(clockPoll(wasi,input,output,0,nEvents),28);
console.log('WASI polling: idle input, deadline ordering, absolute clocks and descriptor errors passed.');
