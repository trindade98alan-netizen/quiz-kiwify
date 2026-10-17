import {handleAuthProxyRequest,NEON_AUTH_SESSION_COOKIE_NAME,NEON_AUTH_SESSION_CHALLENGE_COOKIE_NAME} from '@neondatabase/auth/server';
import {withDeadline,ACCESS_SLOW_MESSAGE} from '../shared/request.mjs';

const endpoints=new Map([
  ['get-session','GET'],['token','GET'],['sign-in/email','POST'],['sign-up/email','POST'],
  ['sign-out','POST'],['request-password-reset','POST'],['reset-password','POST'],
  ['send-verification-email','POST'],['verify-email','GET'],
]);
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Content-Type-Options','nosniff');
  const path=req.query?.path;
  if(!endpoints.has(path))return res.status(404).json({message:'Página não encontrada.'});
  if(req.method!==endpoints.get(path)){res.setHeader('Allow',endpoints.get(path));return res.status(405).json({message:'Método não permitido.'});}
  const appOrigin=process.env.VERCEL_ENV==='production'?'https://pvsd.vercel.app':process.env.VERCEL_URL?`https://${process.env.VERCEL_URL}`:'https://pvsd.vercel.app';
  if(req.headers.origin&&req.headers.origin!==appOrigin)return res.status(403).json({message:'Origem inválida.'});
  if(!process.env.NEON_AUTH_BASE_URL||!process.env.NEON_AUTH_COOKIE_SECRET)return res.status(503).json({message:'Estamos preparando o acesso.'});
  // An anonymous visitor has no session to resolve at the external provider.
  const cookieNames=new Set((req.headers.cookie||'').split(';').map(value=>value.trim().split('=')[0]));
  const hasSession=[NEON_AUTH_SESSION_COOKIE_NAME,NEON_AUTH_SESSION_CHALLENGE_COOKIE_NAME,'__Secure-neon-auth.session_challange'].some(name=>cookieNames.has(name));
  if(req.method==='GET'&&!hasSession&&!req.headers.authorization){
    if(path==='get-session')return res.status(200).json(null);
    if(path==='token')return res.status(401).json({message:'Entre para continuar.',code:'UNAUTHORIZED'});
  }
  try{
    const url=new URL(req.url,appOrigin);url.searchParams.delete('path');
    const headers=new Headers();
    for(const name of ['cookie','content-type','user-agent','authorization'])if(typeof req.headers[name]==='string')headers.set(name,req.headers[name]);
    headers.set('origin',appOrigin);
    const body=req.method==='POST'?JSON.stringify(req.body||{}):undefined;
    if(body&&Buffer.byteLength(body)>16384)return res.status(413).json({message:'Pedido muito grande.'});
    const request=new Request(url,{method:req.method,headers,body});
    const payload=await withDeadline((async()=>{
      const response=await handleAuthProxyRequest({request,path,baseUrl:process.env.NEON_AUTH_BASE_URL.replace(/\/$/,''),cookieSecret:process.env.NEON_AUTH_COOKIE_SECRET,sameSite:'lax',sessionDataTtl:60});
      return {response,body:Buffer.from(await response.arrayBuffer())};
    })(),10000);
    const {response,body:responseBody}=payload;
    for(const name of ['content-type','set-auth-jwt','set-auth-token'])if(response.headers.has(name))res.setHeader(name,response.headers.get(name));
    const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);
    return res.status(response.status).send(responseBody);
  }catch{return res.status(503).json({message:ACCESS_SLOW_MESSAGE,code:'ACCESS_UNAVAILABLE'});}
}
