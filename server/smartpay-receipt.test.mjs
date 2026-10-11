import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validSecret,receiptShape} from './smartpay-receipt.mjs';
import handler from '../api/smartpay.js';
test('Receipt secret rejects missing, short, invalid and oversized credentials',()=>{
  const secret='a'.repeat(64);
  assert.equal(validSecret(secret,secret),true);
  for(const input of [undefined,[],secret+'b','b'.repeat(64),'a'.repeat(257)])assert.equal(validSecret(input,secret),false);
  assert.equal(validSecret('short','short'),false);
});
test('Receipt preserves integration fields while redacting financial and unrelated personal data',()=>{
  assert.deepEqual(receiptShape({event:'order.approved',order:{id:'test-1',product_id:'product-1',customer:{email:'buyer@example.com',name:'Private name',cpf:'123'},card:{number:'123',cvv:'123'},amount:24.9}}),{event:'order.approved',order:{id:'test-1',product_id:'product-1',customer:{email:'buyer@example.com',name:'[string]',cpf:'[string]'},card:{number:'[string]',cvv:'[string]'},amount:'[number]'}});
});
test('Receipt never accepts unauthenticated requests or grants access',async()=>{
  const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await handler({method:'POST',query:{},headers:{},body:{event:'order.approved'}},res);
  assert.equal(res.code,401);assert.deepEqual(res.body,{ok:false});
});
