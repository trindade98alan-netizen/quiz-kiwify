import {neon} from '@neondatabase/serverless';
import {createHash} from 'node:crypto';
import {validSecret,receiptShape} from '../server/smartpay-receipt.mjs';

export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false});}
  if(!validSecret(req.query?.token,process.env.SMARTPAY_RECEIPT_SECRET))return res.status(401).json({ok:false});
  if(!req.headers['content-type']?.toLowerCase().includes('application/json'))return res.status(415).json({ok:false});
  if(!req.body||typeof req.body!=='object'||Array.isArray(req.body))return res.status(400).json({ok:false});
  const serialized=JSON.stringify(req.body);
  if(Buffer.byteLength(serialized)>262144)return res.status(413).json({ok:false});
  if(!process.env.DATABASE_URL)return res.status(503).json({ok:false});
  try{
    const sql=neon(process.env.DATABASE_URL);
    const digest=createHash('sha256').update(serialized).digest('hex');
    const shape=JSON.stringify(receiptShape(req.body));
    const headerNames=Object.keys(req.headers).filter(name=>!['cookie','set-cookie'].includes(name)).slice(0,50);
    await sql`insert into vsd_webhook_receipts(digest,shape,header_names) values(${digest},${shape}::jsonb,${headerNames}::text[]) on conflict(digest) do nothing`;
    // This diagnostic endpoint intentionally never changes vsd_purchases.
    return res.status(202).json({ok:true,mode:'verification'});
  }catch{return res.status(503).json({ok:false});}
}
