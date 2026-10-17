import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {withDeadline,fetchWithDeadline,accessErrorMessage,ACCESS_SLOW_MESSAGE} from './request.mjs';

test('a stalled operation ends with a retryable timeout',async()=>{
  await assert.rejects(withDeadline(new Promise(()=>{}),10),{code:'REQUEST_TIMEOUT',status:503});
  assert.equal(await withDeadline(Promise.resolve('ok'),10),'ok');
});
test('fetch timeout aborts the network request',async()=>{
  const original=globalThis.fetch;let signal;
  globalThis.fetch=async(_,options)=>{signal=options.signal;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));};
  try{await assert.rejects(fetchWithDeadline('/test',{},10),{code:'REQUEST_TIMEOUT'});assert.equal(signal.aborted,true);}finally{globalThis.fetch=original;}
});
test('network errors are distinguished from denied purchases',()=>{
  assert.equal(accessErrorMessage(new TypeError('Failed to fetch')),ACCESS_SLOW_MESSAGE);
  assert.equal(accessErrorMessage({status:403,message:'Compra não encontrada'}),'Compra não encontrada');
});

const proxySource=readFileSync(new URL('../api/auth.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export default async function handler','async function handler');
async function proxy({path='get-session',cookie='',stall=false,method='GET',origin}={}){
  let calls=0;const result={headers:{}};
  const context={Headers,Request,URL,Buffer,Set,ACCESS_SLOW_MESSAGE,process:{env:{NEON_AUTH_BASE_URL:'https://auth.example.test',NEON_AUTH_COOKIE_SECRET:'test-only',VERCEL_ENV:'production'}},NEON_AUTH_SESSION_COOKIE_NAME:'__Secure-neon-auth.session_token',NEON_AUTH_SESSION_CHALLENGE_COOKIE_NAME:'__Secure-neon-auth.session_challenge',withDeadline:(operation)=>withDeadline(operation,10),handleAuthProxyRequest:async()=>{calls++;if(stall)return new Promise(()=>{});return new Response(JSON.stringify({forwarded:true}),{status:200,headers:{'Content-Type':'application/json'}});}};
  vm.createContext(context);vm.runInContext(proxySource+';globalThis.handler=handler;',context);
  const res={setHeader:(name,value)=>{result.headers[name]=value;},status(code){result.status=code;return this;},json(data){result.data=data;return this;},send(data){result.data=JSON.parse(data.toString());return this;}};
  await context.handler({method,query:{path},headers:{cookie,...(origin?{origin}:{})},url:'/neon-auth/'+path},res);
  return {...result,calls};
}
test('first anonymous visit avoids external session lookup and does not grant a token',async()=>{
  const session=await proxy();assert.equal(session.calls,0);assert.equal(session.status,200);assert.equal(session.data,null);
  const token=await proxy({path:'token'});assert.equal(token.calls,0);assert.equal(token.status,401);
});
test('existing sessions and verification challenges still use the auth provider',async()=>{
  for(const name of ['session_token','session_challenge','session_challange']){
    const r=await proxy({cookie:`__Secure-neon-auth.${name}=test-only`});assert.equal(r.calls,1);assert.equal(r.status,200);
  }
});
test('a stalled provider returns 503 without granting access',async()=>{
  const r=await proxy({cookie:'__Secure-neon-auth.session_token=test-only',stall:true});assert.equal(r.status,503);assert.equal(r.data.code,'ACCESS_UNAVAILABLE');
});
test('origin and method checks precede anonymous fast path',async()=>{
  assert.equal((await proxy({origin:'https://other.example.test'})).status,403);
  assert.equal((await proxy({method:'POST'})).status,405);
});

const source=readFileSync(new URL('../src/members/Members.jsx',import.meta.url),'utf8');
const submit=source.slice(source.indexOf('  async function submit(e) {'),source.indexOf('  const title=isNew'));
async function login({isNew=false,denied=false,network=false,stalled=false}={}){
  const calls=[],errors=[],busy=[],success=[];
  const context={withDeadline:operation=>withDeadline(operation,10),fetchWithDeadline:async()=>({ok:true,json:async()=>({ready:true,requireVerified:false})}),accessErrorMessage,ACCESS_SLOW_MESSAGE,isNew,isReset:false,isForgot:false,email:'buyer@example.test',password:'test-password',confirm:'test-password',resetToken:null,window:{location:{origin:'https://pvsd.vercel.app'}},authClient:{signUp:{email:async()=>{calls.push('signup');return {data:{}};}},signIn:{email:async()=>{calls.push('login');if(stalled)return new Promise(()=>{});return network?{error:{status:503}}:{data:{}};}}},api:async()=>{calls.push('purchase');if(denied)throw Object.assign(new Error('Compra não encontrada'),{status:403});return {email:'buyer@example.test'};},setError:x=>errors.push(x),setNotice:()=>{},setBusy:x=>busy.push(x),setPassword:()=>{},setConfirm:()=>{},setMode:()=>{},changeMode:()=>{},localStorage:{setItem:()=>{}},onSuccess:x=>success.push(x)};
  vm.createContext(context);await vm.runInContext(submit+';submit({preventDefault(){}})',context);return {calls,errors,busy,success};
}
test('first access signs in and enters only after purchase authorization',async()=>{
  const r=await login({isNew:true});assert.deepEqual(r.calls,['signup','login','purchase']);assert.equal(r.success.length,1);assert.equal(r.busy.at(-1),false);
});
test('unapproved purchases remain blocked',async()=>{
  const r=await login({denied:true});assert.equal(r.success.length,0);assert.equal(r.errors.at(-1),'Compra não encontrada');assert.equal(r.busy.at(-1),false);
});
test('provider failures and timeouts release the busy form with a useful message',async()=>{
  for(const options of [{network:true},{stalled:true}]){
    const r=await login(options);assert.equal(r.success.length,0);assert.equal(r.busy.at(-1),false);assert.equal(r.errors.at(-1),ACCESS_SLOW_MESSAGE);assert.ok(!r.calls.includes('purchase'));
  }
});
