import {createHash,timingSafeEqual} from 'node:crypto';

// Until a genuine provider event is verified, receipts cannot grant access.
const safeFields=new Set(['email','customeremail','buyeremail','orderid','productid','transactionid','event','eventtype','type','status','createdat','updatedat','timestamp']);
export function validSecret(value,expected){
  if(typeof value!=='string'||typeof expected!=='string'||expected.length<32||value.length>256)return false;
  return timingSafeEqual(createHash('sha256').update(value).digest(),createHash('sha256').update(expected).digest());
}
export function receiptShape(value,key='',depth=0){
  if(depth>7)return '[depth limit]';
  if(value===null)return null;
  if(Array.isArray(value))return value.slice(0,3).map(item=>receiptShape(item,key,depth+1));
  if(typeof value==='object')return Object.fromEntries(Object.entries(value).slice(0,60).map(([name,item])=>[name.slice(0,80),receiptShape(item,name,depth+1)]));
  if(typeof value==='string'){
    const normalized=key.replace(/[^a-z]/gi,'').toLowerCase();
    if(safeFields.has(normalized))return value.slice(0,254);
    if(normalized==='id'&&/^[a-z0-9_-]{1,64}$/i.test(value))return value;
    return '[string]';
  }
  return `[${typeof value}]`;
}
