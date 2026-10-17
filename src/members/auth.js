import { createAuthClient } from '@neondatabase/auth';
import { withDeadline, fetchWithDeadline, ACCESS_SLOW_MESSAGE } from '../../shared/request.mjs';

// Same-origin reverse proxy avoids third-party session cookies on mobile browsers.
export const authClient = createAuthClient(`${window.location.origin}/neon-auth`, {fetchOptions:{timeout:15000,retry:0}});

export async function memberFetch(action, body) {
  const {data,error} = await withDeadline(authClient.token());
  if(error&&(error.status>=500||error.status===0||['REQUEST_TIMEOUT','NETWORK_ERROR','ERR_NETWORK'].includes(error.code)))throw Object.assign(new Error(ACCESS_SLOW_MESSAGE),{status:503});
  if(error || !data?.token)throw Object.assign(new Error('Entre com seu e-mail e senha para continuar.'),{status:401});
  return fetchWithDeadline(`/api/membros?action=${action}`,{
    method:body?'POST':'GET',credentials:'same-origin',...(action==='evento'?{keepalive:true}:{}),
    headers:{Authorization:`Bearer ${data.token}`,...(body?{'Content-Type':'application/json'}:{})},
    body:body?JSON.stringify(body):undefined,
  });
}
