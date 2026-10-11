import {handleAuthProxyRequest} from '@neondatabase/auth/server';

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
  try{
    const url=new URL(req.url,appOrigin);url.searchParams.delete('path');
    const headers=new Headers();
    for(const name of ['cookie','content-type','user-agent','authorization'])if(typeof req.headers[name]==='string')headers.set(name,req.headers[name]);
    headers.set('origin',appOrigin);
    const body=req.method==='POST'?JSON.stringify(req.body||{}):undefined;
    if(body&&Buffer.byteLength(body)>16384)return res.status(413).json({message:'Pedido muito grande.'});
    const request=new Request(url,{method:req.method,headers,body});
    const response=await handleAuthProxyRequest({request,path,baseUrl:process.env.NEON_AUTH_BASE_URL.replace(/\/$/,''),cookieSecret:process.env.NEON_AUTH_COOKIE_SECRET,sameSite:'lax',sessionDataTtl:60});
    for(const name of ['content-type','set-auth-jwt','set-auth-token'])if(response.headers.has(name))res.setHeader(name,response.headers.get(name));
    const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);
    return res.status(response.status).send(Buffer.from(await response.arrayBuffer()));
  }catch{return res.status(503).json({message:'Não foi possível conectar. Tente novamente.'});}
}
