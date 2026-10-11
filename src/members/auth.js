import { createAuthClient } from '@neondatabase/auth';

// Same-origin reverse proxy avoids third-party session cookies on mobile browsers.
export const authClient = createAuthClient(`${window.location.origin}/neon-auth`);

export async function memberFetch(action, body) {
  const {data,error} = await authClient.token();
  if(error || !data?.token)throw Object.assign(new Error('Entre com seu e-mail e senha para continuar.'),{status:401});
  return fetch(`/api/membros?action=${action}`,{
    method:body?'POST':'GET',credentials:'same-origin',
    headers:{Authorization:`Bearer ${data.token}`,...(body?{'Content-Type':'application/json'}:{})},
    body:body?JSON.stringify(body):undefined,
  });
}
