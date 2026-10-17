export const addonIds=['dividas-30-dias','carrinho-mais-barato','missao-renda-extra'];
export const addonMeta=[
 {id:addonIds[0],title:'Vire o Jogo das Dívidas',subtitle:'Plano de 30 dias',description:'Mapa de pendências, comparação de acordos, mensagens prontas e um plano de ação.',accent:'#ffbc46'},
 {id:addonIds[1],title:'Carrinho Mais Barato',subtitle:'Desafio de 7 dias',description:'Compare embalagens, prepare sua lista e acompanhe o total antes do caixa.',accent:'#8fe0b5'},
 {id:addonIds[2],title:'Missão Renda Extra',subtitle:'Sua primeira oferta em 7 dias',description:'Calcule custos, prepare sua oferta e organize um primeiro teste de procura.',accent:'#bba2ff'},
];
let schema;
export async function ensureAddonSchema(sql){
 if(!schema)schema=sql.transaction([
  sql`create table if not exists public.vsd_addon_products(id text primary key,product_id text unique,checkout_url text,updated_at timestamptz not null default now(),check(id in ('dividas-30-dias','carrinho-mais-barato','missao-renda-extra')))`,
  sql`create table if not exists public.vsd_addon_materials(id text primary key references public.vsd_addon_products(id),book jsonb not null,pdf bytea not null,filename text not null)`,
  sql`alter table public.vsd_addon_materials enable row level security`,
  sql`revoke all on public.vsd_addon_materials from public`,
  sql`create table if not exists public.vsd_addon_purchases(order_id text not null,addon_id text not null references public.vsd_addon_products(id),email text not null check(email=lower(trim(email))),active boolean not null default false,source_event_at timestamptz not null,updated_at timestamptz not null default now(),primary key(order_id,addon_id))`,
  sql`create index if not exists vsd_addon_access on public.vsd_addon_purchases(email,addon_id) where active`,
  sql`create table if not exists public.vsd_addon_state(user_id uuid not null,addon_id text not null references public.vsd_addon_products(id),state jsonb not null default '{}'::jsonb,updated_at timestamptz not null default now(),primary key(user_id,addon_id),check(octet_length(state::text)<=65536))`,
  sql`alter table public.vsd_addon_products enable row level security`,
  sql`alter table public.vsd_addon_purchases enable row level security`,
  sql`alter table public.vsd_addon_state enable row level security`,
  sql`revoke all on public.vsd_addon_products,public.vsd_addon_purchases,public.vsd_addon_state from public`,
  sql`insert into public.vsd_addon_products(id) values('dividas-30-dias'),('carrinho-mais-barato'),('missao-renda-extra') on conflict(id) do nothing`,
 ]).catch(error=>{schema=undefined;throw error;});
 return schema;
}
export async function addonCatalog(sql,email,review=false){
 await ensureAddonSchema(sql);
 const products=await sql`select c.id,c.product_id,c.checkout_url,exists(select 1 from public.vsd_addon_purchases p where p.email=${email} and p.addon_id=c.id and p.active=true) or exists(select 1 from public.vsd_purchases p where p.email=${email} and p.product_id=c.product_id and p.active=true) as owned from public.vsd_addon_products c`;
 return addonMeta.map(meta=>{const row=products.find(p=>p.id===meta.id);return {...meta,owned:review||row?.owned===true,checkoutUrl:row?.checkout_url||null,configured:Boolean(row?.product_id),...(review?{productId:row?.product_id||''}:{})};});
}
export function validateProduct(value){
 if(!value||!addonIds.includes(value.id)||typeof value.productId!=='string'||!/^[-0-9a-f]{36}$/i.test(value.productId))return false;
 if(typeof value.checkoutUrl!=='string'||value.checkoutUrl.length>500)return false;
 try{const u=new URL(value.checkoutUrl);return u.origin==='https://seusmartpay.com'&&/^\/pay\/[-0-9a-f]{36}$/i.test(u.pathname)&&!u.username&&!u.password&&!u.hash;}catch{return false;}
}
export function validAddonState(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 if(Object.keys(value).some(k=>!['fields','debts','agreements','items','contacts'].includes(k)))return false;
 if(value.fields&&(typeof value.fields!=='object'||Array.isArray(value.fields)||Object.values(value.fields).some(x=>!['string','boolean','number'].includes(typeof x))))return false;
 const name=v=>typeof v==='string'&&v.length<=300;
 const amount=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e9;
 const validators={
  debts:r=>r&&name(r.name)&&amount(r.balance)&&name(r.note),
  agreements:r=>r&&name(r.name)&&['balance','entry','monthly','fees','capacity'].every(k=>amount(r[k]))&&Number.isInteger(r.installments)&&r.installments>=0&&r.installments<=600,
  items:r=>r&&name(r.name)&&amount(r.quantity)&&r.quantity>0&&amount(r.price)&&typeof r.bought==='boolean',
  contacts:r=>r&&name(r.name)&&['apresentado','interesse','orcamento','confirmado','sem-interesse'].includes(r.status)&&name(r.note),
 };
 if(Object.entries(validators).some(([k,validate])=>value[k]!==undefined&&(!Array.isArray(value[k])||value[k].length>50||!value[k].every(validate))))return false;
 if(Buffer.byteLength(JSON.stringify(value))>32768)return false;
 function safe(v,depth=0){
  if(depth>6)return false;
  if(v===null||typeof v==='boolean')return true;
  if(typeof v==='number')return Number.isFinite(v)&&Math.abs(v)<=1e12;
  if(typeof v==='string')return v.length<=3000;
  if(Array.isArray(v))return v.length<=100&&v.every(x=>safe(x,depth+1));
  return typeof v==='object'&&Object.keys(v).length<=80&&Object.entries(v).every(([k,x])=>!/^(?:__proto__|prototype|constructor)$/.test(k)&&k.length<=80&&safe(x,depth+1));
 }
 return safe(value);
}
export function canUseAddon(catalog,id){return addonIds.includes(id)&&catalog.some(x=>x.id===id&&x.owned===true);}
