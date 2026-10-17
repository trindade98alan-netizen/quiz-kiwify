import {checkoutAttribution} from './attribution.mjs';
const consentKey='vsd-analytics-consent-v2';
const queue=[];let timer;let volatileVisit;
const internal=()=>new URLSearchParams(location.search).get('analytics_test')==='1';
export function visitId(){
 try{let value=sessionStorage.getItem('vsd-measurement-visit-v1');if(!value){value=crypto.randomUUID();sessionStorage.setItem('vsd-measurement-visit-v1',value);}return value;}catch{return volatileVisit||=(crypto.randomUUID());}
}
export function eventPayload(event,data={}){
 return {id:crypto.randomUUID(),visit:visitId(),event,data,attribution:Object.fromEntries(checkoutAttribution(location.search)),internal:internal()};
}
function granted(){try{return localStorage.getItem(consentKey)==='granted';}catch{return false;}}
export function flushMeasurement(){
 clearTimeout(timer);timer=null;if(!granted()){queue.length=0;return;}
 const events=queue.splice(0,20);if(!events.length)return;
 const url=location.hostname==='finix-page.vercel.app'?'https://pvsd.vercel.app/api/medicao':'/api/medicao';
 fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events}),keepalive:true,credentials:'omit',referrerPolicy:'no-referrer'}).catch(()=>{});
 if(queue.length)timer=setTimeout(flushMeasurement,500);
}
export function recordMeasurement(event,data={}){
 if(!granted()||location.pathname.startsWith('/membros'))return false;
 try{if(queue.length<100)queue.push(eventPayload(event,data));if(!timer)timer=setTimeout(()=>{timer=null;flushMeasurement();},500);return true;}catch{return false;}
}
export function discardMeasurement(){queue.length=0;clearTimeout(timer);timer=null;}
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushMeasurement();});
