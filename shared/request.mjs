export const ACCESS_SLOW_MESSAGE='A conexão com o serviço de acesso demorou. Tente novamente. Se continuar, teste outra rede ou fale com o suporte.';
export function timeoutError(message=ACCESS_SLOW_MESSAGE){return Object.assign(new Error(message),{status:503,code:'REQUEST_TIMEOUT'});}
export async function withDeadline(operation,ms=12000,message=ACCESS_SLOW_MESSAGE){
 let timer;
 try{return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(timeoutError(message)),ms);})]);}
 finally{clearTimeout(timer);}
}
export async function fetchWithDeadline(input,options={},ms=10000){
 const controller=new AbortController();
 const abort=()=>controller.abort(options.signal?.reason);
 if(options.signal?.aborted)abort();else options.signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>controller.abort(timeoutError()),ms);
 try{return await fetch(input,{...options,signal:controller.signal});}
 catch(error){if(controller.signal.aborted&&controller.signal.reason?.code==='REQUEST_TIMEOUT')throw controller.signal.reason;throw error;}
 finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
}
export function accessErrorMessage(error){
 if(error?.status>=500||error?.status===0||['REQUEST_TIMEOUT','NETWORK_ERROR','ERR_NETWORK'].includes(error?.code)||['AbortError','TimeoutError','TypeError'].includes(error?.name))return ACCESS_SLOW_MESSAGE;
 return error?.message||'Não foi possível concluir agora. Tente novamente.';
}
