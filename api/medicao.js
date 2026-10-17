import {neon} from '@neondatabase/serverless';
import {cleanEvent,insertEvents} from '../server/measurement.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const origins=['https://pvsd.vercel.app','https://quiz-kiwify.vercel.app','https://finix-page.vercel.app'];
 if(!origins.includes(req.headers.origin))return res.status(403).json({ok:false});
 res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin');
 if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','POST');res.setHeader('Access-Control-Allow-Headers','Content-Type');return res.status(204).end();}
 if(req.method!=='POST')return res.status(405).json({ok:false});
 if(!req.headers['content-type']?.includes('application/json'))return res.status(415).json({ok:false});
 if(JSON.stringify(req.body||{}).length>24000||!Array.isArray(req.body?.events)||req.body.events.length>20)return res.status(400).json({ok:false});
 const events=req.body.events.map(e=>cleanEvent(e)).filter(Boolean);
 if(!events.length)return res.status(400).json({ok:false});
 if(!process.env.DATABASE_URL)return res.status(503).json({ok:false});
 try{
  const sql=neon(process.env.DATABASE_URL);
  const [recent]=await sql`select count(*)::int as count from vsd_measurement_events where visit=${events[0].visit}::uuid and created_at>now()-interval '1 hour'`;
  if(recent.count>400)return res.status(429).json({ok:false});
  await insertEvents(sql,events.filter(e=>e.visit===events[0].visit));return res.status(202).json({ok:true});
 }catch{return res.status(503).json({ok:false});}
}
