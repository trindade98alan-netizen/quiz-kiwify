import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/auth.js';
const response=()=>({setHeader(){},status(code){this.code=code;return this},json(body){this.body=body;return this}});
test('Auth proxy cannot be used to access administrative or arbitrary upstream paths',async()=>{
  for(const path of ['admin/list-users','../../secret','organization/create','https://other.example','get-session/../../admin']){
    const res=response();await handler({method:'GET',query:{path},headers:{}},res);assert.equal(res.code,404);
  }
});
test('Auth proxy refuses cross-origin authentication mutations',async()=>{
  const res=response();await handler({method:'POST',query:{path:'sign-up/email'},headers:{origin:'https://other.example'}},res);assert.equal(res.code,403);
});
test('Auth proxy enforces endpoint HTTP methods',async()=>{
  const res=response();await handler({method:'GET',query:{path:'sign-up/email'},headers:{}},res);assert.equal(res.code,405);
});
