import {cleanEvent,insertEvents,measurementReport} from '../server/measurement.mjs';
import {neon} from '@neondatabase/serverless';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {addonIds,addonCatalog,canUseAddon,validAddonState,validateProduct} from '../server/addons.mjs';
import {buildAddonHtml} from '../server/addon-content.mjs';

const productId='a2368978-f486-4a7c-989a-958c08670f06';
const ids=['aula','sistema','parcelado','anti','som'];
const fail=(status,message)=>Object.assign(new Error(message),{status});
let keys;
export function validProgress(value){return Array.isArray(value)&&value.length<=5&&new Set(value).size===value.length&&value.every(id=>ids.includes(id));}
export function allowedUser(user,requireVerified=true){return Boolean(user?.email&&!user?.banned&&(!requireVerified||user.emailVerified===true));}
export function reviewAccess(email,configuredEmail){return typeof email==='string'&&typeof configuredEmail==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configuredEmail.trim())&&email.trim().toLowerCase()===configuredEmail.trim().toLowerCase();}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  try {
    const action=req.query?.action;
    if(!['configuracao','sessao','progresso','arquivo','adicional','estado','produto','evento','metricas'].includes(action))throw fail(404,'Página não encontrada.');
    const method=['progresso','estado','produto','evento'].includes(action)?'POST':'GET';
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
    const review=reviewAccess(email,process.env.MEMBERS_REVIEW_EMAIL);
    let base=review;
    if(!review){
      const purchases=await sql`select order_id from vsd_purchases where email=${email} and product_id=${productId} and active=true limit 1`;
      base=purchases.length>0;
    }
    let addons=[];let addonsUnavailable=false;
    try{addons=await addonCatalog(sql,email,review);}catch{
      if(!base||['adicional','estado','produto'].includes(action)||addonIds.includes(req.query.id))throw fail(503,'Não foi possível carregar os adicionais agora. Tente novamente ou fale com o suporte.');
      addonsUnavailable=true;
    }
    if(!base&&!addons.some(x=>x.owned))throw fail(403,'Não encontramos uma compra liberada para este e-mail. Confira o e-mail da compra ou fale com o suporte.');
    if(!review&&process.env.MEMBERS_LIVE!=='true')throw fail(503,'Estamos preparando a liberação dos materiais. Fale com o suporte pelo WhatsApp.');
    if(action==='metricas'){
      if(!review)throw fail(403,'Este painel é exclusivo do administrador.');
      const days=[1,3,7,30].includes(Number(req.query.days))?Number(req.query.days):7;
      return res.status(200).json(await measurementReport(sql,days,req.query.internal==='1'));
    }
    if(action==='evento'){
      if(!Array.isArray(req.body?.events)||req.body.events.length>20||JSON.stringify(req.body).length>24000)throw fail(400,'Evento inválido.');
      const events=req.body.events.map(e=>cleanEvent(e,true)).filter(Boolean);
      if(!events.length)throw fail(400,'Evento inválido.');
      await insertEvents(sql,events,user.id,review);
      return res.status(202).json({ok:true});
    }
    if(action==='produto'){
      if(!review)throw fail(403,'A configuração de produtos é exclusiva do administrador.');
      if(!validateProduct(req.body)||req.body.productId===productId)throw fail(400,'Informe o ID do adicional e o link de checkout correspondente da SmartPay. Não use o produto principal.');
      const existing=addons.find(x=>x.productId===req.body.productId&&x.id!==req.body.id);
      if(existing)throw fail(409,'Este produto já está vinculado a outro adicional.');
      await sql`update vsd_addon_products set product_id=${req.body.productId},checkout_url=${req.body.checkoutUrl},updated_at=now() where id=${req.body.id}`;
      return res.status(200).json({ok:true,addons:await addonCatalog(sql,email,review)});
    }
    if(action==='adicional'||action==='estado'){
      const id=action==='estado'?req.body?.id:req.query.id;
      if(!addonIds.includes(id))throw fail(404,'Adicional não encontrado.');
      if(!canUseAddon(addons,id))throw fail(403,'Este adicional não está incluído nas suas compras.');
      if(action==='estado'){
        if(req.body?.email!==email)throw fail(403,'Sua conta mudou. Entre novamente antes de salvar.');
        if(!validAddonState(req.body?.state))throw fail(400,'Não foi possível salvar esses dados. Confira os campos e tente novamente.');
        await sql`insert into vsd_addon_state(user_id,addon_id,state) values(${user.id}::uuid,${id},${JSON.stringify(req.body.state)}::jsonb) on conflict(user_id,addon_id) do update set state=excluded.state,updated_at=now()`;
        return res.status(200).json({ok:true});
      }
      const [saved]=await sql`select state from vsd_addon_state where user_id=${user.id}::uuid and addon_id=${id}`;
      const parentOrigin=process.env.VERCEL_ENV==='production'?'https://pvsd.vercel.app':process.env.VERCEL_URL?`https://${process.env.VERCEL_URL}`:'http://localhost:5173';
      const [material]=await sql`select book from vsd_addon_materials where id=${id}`;
      if(!material?.book)throw fail(503,'Este material está sendo preparado. Fale com o suporte.');
      return res.status(200).json({html:buildAddonHtml(id,validAddonState(saved?.state)?saved.state:{},parentOrigin,material.book)});
    }
    if(action==='sessao') {
      if(base&&(!process.env.MEMBERS_VIDEO_ID||!process.env.MEMBERS_SHEET_COPY_URL))throw fail(503,'Estamos preparando os materiais. Fale com o suporte.');
      const [progress]=await sql`select completed from vsd_progress where user_id=${user.id}::uuid`;
      return res.status(200).json({email,review,base,addons,addonsUnavailable,completed:base&&validProgress(progress?.completed)?progress.completed:[],content:base?{videoId:process.env.MEMBERS_VIDEO_ID,sheetUrl:process.env.MEMBERS_SHEET_COPY_URL,parcelado:true,anti:true,som:true}:{}});
    }
    if(action==='progresso') {
      if(!base)throw fail(403,'O sistema e os bônus não estão incluídos neste acesso.');
      const completed=req.body?.completed;
      if(!validProgress(completed))throw fail(400,'Progresso inválido.');
      await sql`insert into vsd_progress(user_id,completed) values(${user.id}::uuid,${completed}::text[]) on conflict(user_id) do update set completed=excluded.completed,updated_at=now()`;
      return res.status(200).json({ok:true});
    }
    if(addonIds.includes(req.query.id)){
      if(!canUseAddon(addons,req.query.id))throw fail(403,'Este adicional não está incluído nas suas compras.');
      const [guide]=await sql`select filename,encode(pdf,'base64') as data from vsd_addon_materials where id=${req.query.id}`;
      if(!guide)throw fail(503,'Este material está sendo preparado. Fale com o suporte.');
      res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="${guide.filename.replace(/[^a-z0-9.-]/gi,'')}"`);
      return res.status(200).send(Buffer.from(guide.data,'base64'));
    }
    if(!base)throw fail(403,'Este material não está incluído nas suas compras.');
    if(!['parcelado','anti','som'].includes(req.query.id))throw fail(404,'Material não encontrado.');
    const [file]=await sql`select filename,encode(pdf,'base64') as data from vsd_materials where id=${req.query.id}`;
    if(!file)throw fail(503,'Este material ainda está sendo preparado. Fale com o suporte.');
    res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="${file.filename.replace(/[^a-z0-9.-]/gi,'')}"`);
    return res.status(200).send(Buffer.from(file.data,'base64'));
  }catch(error){return res.status(error.status||503).json({message:error.status?error.message:'Não foi possível concluir agora. Tente novamente ou fale com o suporte.'});}
}
