import {memberFetch} from './auth';
import {eventPayload} from '../measurement.mjs';
export function recordMemberEvent(event,data={}){
 if(location.pathname.startsWith('/membros/previa'))return;
 try{memberFetch('evento',{events:[eventPayload(event,data)]}).then(r=>{if(!r.ok)console.warn('Registro de uso indisponível.');}).catch(()=>{});}catch{}
}
