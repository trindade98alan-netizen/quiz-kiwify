import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import * as addons from './addons.mjs';
import {compareAgreement,unitPrice,offerPrice} from './addon-calculations.mjs';
import {buildAddonHtml} from './addon-content.mjs';
const fixtureBook=id=>({id,title:'Guia de teste',subtitle:'Conferência',promise:'Aplicar uma ação',accent:'#ffbc46',pages:[{title:'Exemplo de teste',lead:'Comece',text:['Conteúdo de conferência.'],tasks:['Primeiro passo.']}],sources:[]});
const fixturePDF=Buffer.from('%PDF-1.4\nfixture-only').toString('base64');
test('acordos: compara total, entrada, parcela e diferença sem confundir desconto',()=>{
 const a=compareAgreement({balance:1800,entry:100,installments:10,monthly:100,fees:0,capacity:100});
 assert.equal(a.total,1100);assert.equal(a.firstPeriod,200);assert.equal(a.monthlyFits,true);assert.equal(a.difference,700);
 assert.equal(compareAgreement({balance:1800,entry:0,installments:18,monthly:75,fees:0,capacity:60}).monthlyFits,false);
 assert.equal(compareAgreement({balance:0,entry:0,installments:1,monthly:10,fees:0,capacity:50}),null);
 assert.equal(compareAgreement({balance:1800,entry:0,installments:1.5,monthly:10,fees:0,capacity:50}),null);
});
test('compras: normaliza medidas e distingue categorias',()=>{assert.equal(unitPrice({price:8,quantity:500,unit:'g'}).value,16);assert.equal(unitPrice({price:15,quantity:1,unit:'kg'}).value,15);assert.equal(unitPrice({price:5,quantity:1000,unit:'ml'}).value,5);assert.notEqual(unitPrice({price:5,quantity:1,unit:'kg'}).category,unitPrice({price:5,quantity:1,unit:'l'}).category);assert.equal(unitPrice({price:5,quantity:0,unit:'g'}),null);});
test('renda: calcula margem sobre preço, preservando remuneração e taxas',()=>{const r=offerPrice({materials:20,transport:10,fixed:5,hours:2,hourly:20,fees:5,margin:10});assert.ok(Math.abs(r.price-88.235294)<.000001);assert.equal(r.cost,35);assert.equal(r.labor,40);assert.ok(Math.abs(r.price-r.cost-r.labor-r.feesValue-r.marginValue)<1e-9);assert.equal(offerPrice({materials:0,transport:0,fixed:0,hours:1,hourly:20,fees:60,margin:40}),null);});
test('acesso exige a compra do SKU exato; outro adicional não libera',()=>{const catalog=[{id:'dividas-30-dias',owned:true},{id:'carrinho-mais-barato',owned:false}];assert.equal(addons.canUseAddon(catalog,'dividas-30-dias'),true);assert.equal(addons.canUseAddon(catalog,'carrinho-mais-barato'),false);assert.equal(addons.canUseAddon(catalog,'inventado'),false);});
test('estado: limita tamanho, campos, linhas e chaves perigosas',()=>{assert.equal(addons.validAddonState({fields:{day1:true,income:'1000'},items:[{name:'arroz',quantity:1,price:10,bought:false}]}),true);assert.equal(addons.validAddonState({fields:{note:'a'.repeat(33000)}}),false);assert.equal(addons.validAddonState({items:[{name:'arroz',quantity:-1,price:10,bought:false}]}),false);assert.equal(addons.validAddonState(JSON.parse('{"fields":{"__proto__":"x"}}')),false);assert.equal(addons.validAddonState({anything:'x'}),false);});
test('produto: checkout aceita somente o domínio da SmartPay',()=>{const id='11111111-1111-1111-1111-111111111111';assert.equal(addons.validateProduct({id:'dividas-30-dias',productId:id,checkoutUrl:'https://seusmartpay.com/pay/'+id}),true);assert.equal(addons.validateProduct({id:'dividas-30-dias',productId:id,checkoutUrl:'https://seusmartpay.com.evil.test/pay/'+id}),false);});
function runTool(id,state={}){
 const html=buildAddonHtml(id,state,'https://pvsd.vercel.app',fixtureBook(id));const script=html.match(/<script>([\s\S]*)<\/script>/)[1];
 const nodes=new Map(),named=[];const node=id=>{if(!nodes.has(id))nodes.set(id,{id,innerHTML:'',value:'',textContent:'',listeners:{},addEventListener(k,fn){this.listeners[k]=fn;}});return nodes.get(id);};
 for(const m of html.matchAll(/<(input|textarea|select)\b([^>]*\bname="([^"]+)"[^>]*)>/g)){const attrs=m[2];const n={name:m[3],type:attrs.match(/type="([^"]+)"/)?.[1]||'text',value:attrs.match(/value="([^"]*)"/)?.[1]||'',checked:false};if(m[1]==='select')n.value=html.slice(m.index).match(/<option value="([^"]+)"/)?.[1]||'';named.push(n);}
 const listeners={},posts=[];const context={console,document:{getElementById:node,querySelectorAll:selector=>selector==='[name]'?named:[],addEventListener:(k,fn)=>listeners[k]=fn},parent:{postMessage:(data)=>posts.push(data)},window:{addEventListener(){},print(){}},setTimeout,clearTimeout};
 vm.runInNewContext(script,context,{timeout:1000});return {html,nodes,posts,listeners,named};
}
test('as três ferramentas executam o script gerado e retomam os dados',()=>{
 const d=runTool('dividas-30-dias',{fields:{income:'2400',essential:'1850',other:'300',buffer:'150',balance:'1800',entry:'100',installments:'10',monthly:'100',fees:'0'}});assert.match(d.nodes.get('budget-result').innerHTML,/100,00/);assert.match(d.nodes.get('agreement-result').innerHTML,/1\.100,00/);
 const s=runTool('carrinho-mais-barato',{fields:{priceA:'8',quantityA:'500',unitA:'g',priceB:'15',quantityB:'1',unitB:'kg'},items:[{name:'arroz',quantity:2,price:15,bought:true}]});assert.match(s.nodes.get('unit-result').innerHTML,/B tem menor/);assert.match(s.nodes.get('list-result').innerHTML,/30,00/);
 const r=runTool('missao-renda-extra',{fields:{materials:'20',transport:'10',fixed:'5',hours:'2',hourly:'20',sellingFees:'5',margin:'10',service:'Organização de arquivos'}});assert.match(r.nodes.get('price-result').innerHTML,/88,24/);assert.match(r.nodes.get('offer-message').value,/Organização de arquivos/);
});
test('estado inserido no HTML não quebra o script e texto de usuário é escapado',()=>{const t=runTool('carrinho-mais-barato',{fields:{stock:'</script><script>alert(1)</script>'},items:[{name:'<img src=x onerror=alert(1)>',quantity:1,price:1,bought:false}]});assert.equal((t.html.match(/<script>/g)||[]).length,1);assert.match(t.nodes.get('items').innerHTML,/&lt;img/);assert.doesNotMatch(t.nodes.get('items').innerHTML,/<img/);});
test('a ferramenta exige material carregado pelo servidor',()=>{assert.equal(buildAddonHtml('dividas-30-dias'),null);assert.equal(buildAddonHtml('dividas-30-dias',{},'https://pvsd.vercel.app',fixtureBook('carrinho-mais-barato')),null);});

// Handler integration: real policy/rendering modules with an isolated auth and DB fixture.
const require=createRequire(new URL('../package.json',import.meta.url));
const {transformSync}=require('esbuild');
const source=await readFile(new URL('../api/membros.js',import.meta.url),'utf8');
async function invoke({action='sessao',id,base=true,owned=[],review=false,method='GET',body,anonymous=false,saved={},email='buyer@example.com'}={}){
 const sql=(parts,...values)=>{const query=typeof parts==='string'?parts:parts.join('?');
  if(query.includes('from neon_auth.'))return Promise.resolve([{id:'11111111-1111-1111-1111-111111111111',email,emailVerified:true,banned:false}]);
  if(query.includes('select order_id from vsd_purchases'))return Promise.resolve(base?[{order_id:'real-test-order'}]:[]);
  if(query.includes('from public.vsd_addon_products c'))return Promise.resolve(addons.addonIds.map(x=>({id:x,owned:owned.includes(x),product_id:null,checkout_url:null})));
  if(query.includes('select state from vsd_addon_state'))return Promise.resolve([{state:saved}]);
  if(query.includes('select book from vsd_addon_materials'))return Promise.resolve([{book:fixtureBook(values[0])}]);
  if(query.includes("encode(pdf,'base64')")&&query.includes('from vsd_addon_materials'))return Promise.resolve([{filename:values[0]+'.pdf',data:fixturePDF}]);
  if(query.includes('select completed'))return Promise.resolve([{completed:[]}]);
  return Promise.resolve([]);
 };sql.transaction=async values=>Promise.all(values);sql.query=sql;
 const module={exports:{}};const ctx={module,exports:module.exports,Buffer,URL,process:{env:{DATABASE_URL:'fixture',NEON_AUTH_BASE_URL:'https://auth.example.com',MEMBERS_REQUIRE_VERIFIED_EMAIL:'false',MEMBERS_LIVE:'true',MEMBERS_VIDEO_ID:'video',MEMBERS_SHEET_COPY_URL:'https://docs.google.com/test',MEMBERS_REVIEW_EMAIL:review?email:'owner@example.com',VERCEL_ENV:'production'}},require:p=>p==='@neondatabase/serverless'?{neon:()=>sql}:p==='jose'?{createRemoteJWKSet:()=>({}),jwtVerify:async()=>({payload:{sub:'11111111-1111-1111-1111-111111111111'}})}:p.endsWith('addons.mjs')?addons:p.endsWith('addon-content.mjs')?{buildAddonHtml}:require(p)};
 vm.runInNewContext(transformSync(source,{format:'cjs',platform:'node'}).code,ctx);
 const req={method,query:{action,id},body,headers:anonymous?{}:{authorization:'Bearer fixture'}};
 const res={code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.data=data;return this;},send(data){this.data=data;return this;}};
 await module.exports.default(req,res);return res;
}
test('API: anônimo não recebe ferramenta nem PDF',async()=>{assert.equal((await invoke({action:'adicional',id:'dividas-30-dias',anonymous:true})).code,401);assert.equal((await invoke({action:'arquivo',id:'dividas-30-dias',anonymous:true})).code,401);});
test('API: compra principal não libera adicional; outro SKU também não',async()=>{assert.equal((await invoke({action:'adicional',id:'dividas-30-dias'})).code,403);assert.equal((await invoke({action:'arquivo',id:'dividas-30-dias',owned:['carrinho-mais-barato']})).code,403);});
test('API: compra exata libera HTML e PDF, sem exigir compra principal',async()=>{const r=await invoke({action:'adicional',id:'dividas-30-dias',base:false,owned:['dividas-30-dias']});assert.equal(r.code,200);assert.match(r.data.html,/Compare uma proposta/);const pdf=await invoke({action:'arquivo',id:'dividas-30-dias',base:false,owned:['dividas-30-dias']});assert.equal(pdf.code,200);assert.equal(pdf.data.subarray(0,5).toString(),'%PDF-');});
test('API: comprador só do adicional não recebe planilha e bônus principais',async()=>{const r=await invoke({base:false,owned:['dividas-30-dias']});assert.equal(r.code,200);assert.equal(r.data.base,false);assert.equal(Object.keys(r.data.content).length,0);assert.equal((await invoke({action:'arquivo',id:'som',base:false,owned:['dividas-30-dias']})).code,403);});
test('API: salvamento verifica produto, estado e identidade da conta',async()=>{const body={id:'dividas-30-dias',email:'buyer@example.com',state:{fields:{day1:true}}};assert.equal((await invoke({action:'estado',method:'POST',body})).code,403);assert.equal((await invoke({action:'estado',method:'POST',body,owned:['dividas-30-dias']})).code,200);assert.equal((await invoke({action:'estado',method:'POST',body:{...body,email:'other@example.com'},owned:['dividas-30-dias']})).code,403);});
test('API: cliente comum não altera a associação de produtos',async()=>{assert.equal((await invoke({action:'produto',method:'POST',body:{}})).code,403);});
test('API: área principal continua disponível e adicionais ficam bloqueados',async()=>{const r=await invoke();assert.equal(r.code,200);assert.equal(r.data.base,true);assert.equal(r.data.content.som,true);assert.equal(r.data.addons.filter(x=>x.owned).length,0);});
