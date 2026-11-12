importScripts('./engine/pyodide.js');
let ready;
async function setup(){
 const py=await loadPyodide({indexURL:'./engine/'});
 await py.loadPackage(['assets/packaging-24.2-py3-none-any.whl','assets/micropip-0.9.0-py3-none-any.whl']);
 py.globals.set('base_url',new URL('assets/',self.location.href).href);
 await py.runPythonAsync(`import micropip
await micropip.install(base_url+'typing_extensions-4.16.0-py3-none-any.whl')
await micropip.install(base_url+'reactivex-6.1.0-py3-none-any.whl')`);
 const response=await fetch('./course.py');if(!response.ok)throw new Error('Unable to load teaching helpers');
 py.FS.writeFile('/home/pyodide/course.py',await response.text());return py;
}
self.onmessage=async({data})=>{
 try{
 ready ||= setup().catch(error=>{ready=null;throw error});const py=await ready;
 postMessage({type:'running'});
 py.globals.set('source',data.source);
 const result=await py.runPythonAsync(`import io, json, traceback, importlib, course
from contextlib import redirect_stdout, redirect_stderr
importlib.reload(course)
_buffer=io.StringIO()
_namespace={'__name__':'__main__'}
with redirect_stdout(_buffer), redirect_stderr(_buffer):
    exec(compile(source,'experiment.py','exec'),_namespace)
json.dumps({'result':_namespace.get('result'), 'stdout':_buffer.getvalue()},allow_nan=False)`);
 postMessage({type:'result',value:JSON.parse(result)});
 }catch(error){postMessage({type:'error',message:String(error.message||error)})}
};
