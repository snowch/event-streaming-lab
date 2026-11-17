// Persist prepared assets only: no editor code, guest memory or results.
const databaseName='native-lab-runtime:'+new URL('./',import.meta.url).pathname;
async function database(){
 if(!globalThis.indexedDB)return null;
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(databaseName,1);
  request.onupgradeneeded=()=>request.result.createObjectStore('prepared');
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
  request.onblocked=()=>reject(Error('Runtime cache is blocked'));
 });
}
async function access(mode,action){
 let db,timer,expired=false;
 try{
  return await Promise.race([
   (async()=>{
    db=await database();if(!db)return null;
    if(expired){db.close();return null}
    return new Promise((resolve,reject)=>{
     const transaction=db.transaction('prepared',mode);
     const request=action(transaction.objectStore('prepared'));
     transaction.oncomplete=()=>resolve(request.result??true);
     transaction.onerror=()=>reject(transaction.error);
     transaction.onabort=()=>reject(transaction.error);
    });
   })(),
   new Promise(resolve=>{timer=setTimeout(()=>{expired=true;resolve(null)},2000)}),
  ]);
 }catch{return null}
 finally{clearTimeout(timer);db?.close()}
}
export async function readPreparedRuntime(key){
 const cached=await access('readonly',store=>store.get('current'));
 return cached?.key===key&&cached.engineBytes instanceof Uint8Array&&cached.archive instanceof Uint8Array?cached:null;
}
export async function writePreparedRuntime(key,engineBytes,archive){
 return Boolean(await access('readwrite',store=>store.put({key,engineBytes,archive},'current')));
}
