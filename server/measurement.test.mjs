import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cleanEvent,insertEvents} from './measurement.mjs';
const base={id:'10000000-0000-4000-8000-000000000001',visit:'10000000-0000-4000-8000-000000000002',event:'quiz_answer'};
test('event metadata never retains answers, income, email, password or token',()=>{
 const event=cleanEvent({...base,data:{question:2,answer:3,email:'private@example.invalid',income:5000,password:'secret',token:'secret'},attribution:{utm_source:'FB',utm_campaign:'campaign',email:'private@example.invalid',fbclid:'click',utm_content:'private@example.invalid'}});
 assert.deepEqual(event.data,{question:2});assert.deepEqual(event.attribution,{utm_source:'FB',utm_campaign:'campaign'});
});
test('public callers cannot manufacture sales or authenticated member actions',()=>{
 for(const event of ['Purchase','purchase','order.approved','member_whatsapp_click'])assert.equal(cleanEvent({...base,event}),null);
 assert.equal(cleanEvent({...base,id:'bad'}),null);
});
test('member event only accepts known material and placement identifiers',()=>{
 const event=cleanEvent({...base,event:'member_whatsapp_click',data:{placement:'after_lesson',lesson:'sistema',addon:'unrecognized',email:'private@example.invalid'}},true);
 assert.deepEqual(event.data,{lesson:'sistema',placement:'after_lesson'});
});
test('oversized and invalid values are discarded',()=>{
 const e=cleanEvent({...base,data:{question:7,elapsed_ms:Infinity,section:'<script>'},attribution:{utm_campaign:'a'.repeat(301)}});
 assert.deepEqual(e.data,{});assert.deepEqual(e.attribution,{});
});
test('server identity and administrator test status override client input',async()=>{
 let captured;
 const sql=async(strings,...values)=>{captured={strings,values};return [];};
 await insertEvents(sql,[cleanEvent(base)],'10000000-0000-4000-8000-000000000003',true);
 assert.equal(captured.values[0],'10000000-0000-4000-8000-000000000003');
 assert.equal(JSON.parse(captured.values[1])[0].internal,true);
 assert.match(captured.strings.join(''),/on conflict\(id\) do nothing/);
});
