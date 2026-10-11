import {neon} from '@neondatabase/serverless';
import {createRemoteJWKSet,jwtVerify} from 'jose';

const productId='a2368978-f486-4a7c-989a-958c08670f06';
const ids=['aula','sistema','parcelado','anti','som'];
const fail=(status,message)=>Object.assign(new Error(message),{status});
let keys;
export function validProgress(value){return Array.isArray(value)&&value.length<=5&&new Set(value).size===value.length&&value.every(id=>ids.includes(id));}
export function allowedUser(user,requireVerified=true){return Boolean(user?.email&&!user?.banned&&(!requireVerified||user.emailVerified===true));}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  try {
    const action=req.query?.action;
    if(!['configuracao','sessao','progresso','arquivo'].includes(action))throw fail(404,'Página não encontrada.');
    const method=action==='progresso'?'POST':'GET';
    if(req.method!==method){res.setHeader('Allow',method);throw fail(405,'Método não permitido.');}
    const requireVerified=process.env.MEMBERS_REQUIRE_VERIFIED_EMAIL!=='false';
    if(action==='configuracao')return res.status(200).json({ready:process.env.MEMBERS_AUTH_READY==='true',requireVerified});
    const bearer=req.headers.authorization;
    if(!bearer?.startsWith('Bearer ')||bearer.length>12000)throw fail(401,'Entre com seu e-mail e senha para acessar seus materiais.');
    if(!process.env.DATABASE_URL||!process.env.NEON_AUTH_BASE_URL)throw fail(503,'Estamos preparando a liberação do acesso. Fale com o suporte pelo WhatsApp.');
    const authBase=process.env.NEON_AUTH_BASE_URL.replace(/\/$/,'');
    keys??=createRemoteJWKSet(new URL(`${authBase}/.well-known/jwks.json`));
    let payload;
    try {({payload}=await jwtVerify(bearer.slice(7),keys,{algorithms:['EdDSA'],issuer:new URL(authBase).origin,audience:new URL(authBase).origin,requiredClaims:['sub','exp','iat']}));}
    catch {throw fail(401,'Seu acesso expirou. Entre novamente.');}
    if(typeof payload.sub!=='string'||!/^[-0-9a-f]{36}$/i.test(payload.sub))throw fail(401,'Acesso inválido.');
    const sql=neon(process.env.DATABASE_URL);
    const [user]=await sql`select id,email,"emailVerified",banned from neon_auth."user" where id=${payload.sub}::uuid`;
    if(!allowedUser(user,requireVerified))throw fail(403,requireVerified?'Confirme seu e-mail pelo link recebido para liberar seu acesso. Se precisar, fale com o suporte.':'Este acesso não está disponível. Fale com o suporte.');
    const email=user.email.trim().toLowerCase();
    const purchases=await sql`select order_id from vsd_purchases where email=${email} and product_id=${productId} and active=true limit 1`;
    if(!purchases.length)throw fail(403,'Não encontramos uma compra liberada para este e-mail. Confira o e-mail da compra ou fale com o suporte.');
    if(process.env.MEMBERS_LIVE!=='true')throw fail(503,'Estamos preparando a liberação dos materiais. Fale com o suporte pelo WhatsApp.');
    if(action==='sessao') {
      if(!process.env.MEMBERS_VIDEO_ID||!process.env.MEMBERS_SHEET_COPY_URL)throw fail(503,'Estamos preparando os materiais. Fale com o suporte.');
      const [progress]=await sql`select completed from vsd_progress where user_id=${user.id}::uuid`;
      return res.status(200).json({email,completed:validProgress(progress?.completed)?progress.completed:[],content:{videoId:process.env.MEMBERS_VIDEO_ID,sheetUrl:process.env.MEMBERS_SHEET_COPY_URL,parcelado:true,anti:true,som:true}});
    }
    if(action==='progresso') {
      const completed=req.body?.completed;
      if(!validProgress(completed))throw fail(400,'Progresso inválido.');
      await sql`insert into vsd_progress(user_id,completed) values(${user.id}::uuid,${completed}::text[]) on conflict(user_id) do update set completed=excluded.completed,updated_at=now()`;
      return res.status(200).json({ok:true});
    }
    if(!['parcelado','anti','som'].includes(req.query.id))throw fail(404,'Material não encontrado.');
    const [file]=await sql`select filename,encode(pdf,'base64') as data from vsd_materials where id=${req.query.id}`;
    if(!file)throw fail(503,'Este material ainda está sendo preparado. Fale com o suporte.');
    res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="${file.filename.replace(/[^a-z0-9.-]/gi,'')}"`);
    return res.status(200).send(Buffer.from(file.data,'base64'));
  }catch(error){return res.status(error.status||503).json({message:error.status?error.message:'Não foi possível concluir agora. Tente novamente ou fale com o suporte.'});}
}
