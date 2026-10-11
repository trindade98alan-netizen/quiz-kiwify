import {neon} from '@neondatabase/serverless';
import {readFile,writeFile} from 'node:fs/promises';
const sql=neon(process.env.DATABASE_URL);
const source=await readFile(new URL('./members-schema.sql',import.meta.url),'utf8');
for(const query of source.split(';').map(x=>x.trim()).filter(Boolean))await sql.query(query);
for(const [id,filename] of [['parcelado','bonus-01-parcelado-nunca-mais.pdf'],['anti','bonus-02-anti-impulso.pdf'],['som','bonus-03-metodo-som.pdf']]) {
  const base64=(await readFile(new URL(`../../../outputs/${filename}`,import.meta.url))).toString('base64');
  await sql`insert into vsd_materials(id,filename,pdf) values(${id},${filename},decode(${base64},'base64')) on conflict(id) do update set filename=excluded.filename,pdf=excluded.pdf`;
}
const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
config.rewrites=config.rewrites.filter(x=>x.source!=='/neon-auth/:path*');
config.rewrites.unshift({source:'/neon-auth/:path*',destination:'/api/auth?path=:path*'});
await writeFile(new URL('../vercel.json',import.meta.url),JSON.stringify(config,null,2)+'\n');
console.log('Banco, três PDFs privados e proxy de autenticação preparados.');
console.log(await sql`select id,filename,octet_length(pdf) as bytes from vsd_materials order by id`);
