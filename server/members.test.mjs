import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler,{allowedUser,validProgress} from '../api/membros.js';

test('Email ownership is mandatory and banned accounts are rejected',()=>{
  assert.equal(allowedUser({email:'buyer@example.com',emailVerified:true}),true);
  for(const user of [null,{}, {email:'buyer@example.com',emailVerified:false},{email:'buyer@example.com',emailVerified:'true'},{email:'buyer@example.com',emailVerified:true,banned:true}])assert.equal(allowedUser(user),false);
});
test('Direct registration requires explicit configuration and still rejects banned or missing users',()=>{
  assert.equal(allowedUser({email:'buyer@example.com',emailVerified:false}),false);
  assert.equal(allowedUser({email:'buyer@example.com',emailVerified:false},false),true);
  for(const user of [null,{}, {email:'buyer@example.com',banned:true}])assert.equal(allowedUser(user,false),false);
});
test('Progress cannot contain arbitrary or duplicate material identifiers',()=>{
  assert.equal(validProgress(['aula','sistema','parcelado','anti','som']),true);
  for(const value of [null,'aula',['aula','aula'],['../../secret'],['aula','sistema','parcelado','anti','som','other']])assert.equal(validProgress(value),false);
});
async function call(action,method='GET',headers={}){
  const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await handler({query:{action,id:'parcelado'},method,headers},res);return res;
}
test('Paid routes never expose materials without authentication',async()=>{
  for(const action of ['sessao','arquivo','progresso']){
    const res=await call(action,action==='progresso'?'POST':'GET');
    assert.equal(res.code,401);assert.equal(res.headers['Cache-Control'],'private, no-store');
    assert.equal(res.body.content,undefined);assert.equal(res.body.data,undefined);
  }
});
test('Unsupported methods and unknown endpoints fail closed',async()=>{
  assert.equal((await call('arquivo','POST')).code,405);
  assert.equal((await call('unknown')).code,404);
});
