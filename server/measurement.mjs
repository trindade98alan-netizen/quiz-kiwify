export const publicEvents = new Set(['landing_view','direct_offer_entry','quiz_start','quiz_question_view','quiz_answer','quiz_back','quiz_complete','offer_view','offer_section_view','offer_scroll','offer_click','checkout_click','checkout_unavailable','testimonial_open','product_image_open','faq_open','upsell_view','upsell_offer_view','upsell_accept_click','upsell_decline_click','upsell_checkout_click']);
export const memberEvents = new Set(['member_library_view','member_lesson_open','member_sheet_open','member_pdf_download','member_lesson_complete','member_whatsapp_click','member_addon_open','member_addon_checkout_click','member_addon_pdf_download']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tokens=new Set(['aula','sistema','parcelado','anti','som','dividas-30-dias','carrinho-mais-barato','missao-renda-extra','library','lesson','sheet','after_lesson','help','footer','header','bonus','package','final','hook','offer','mensal','trimestral','mensalDesconto','trimestralDesconto']);
export function cleanEvent(value,member=false){
 if(!value||typeof value!=='object'||!uuid.test(value.id)||!uuid.test(value.visit)||!(member?memberEvents:publicEvents).has(value.event))return null;
 const data={};
 for(const key of ['lesson','addon','placement','plan','entry_stage'])if(tokens.has(value.data?.[key]))data[key]=value.data[key];
 if(Number.isInteger(value.data?.question)&&value.data.question>=1&&value.data.question<=6)data.question=value.data.question;
 if(Number.isInteger(value.data?.scroll_percent)&&value.data.scroll_percent>=0&&value.data.scroll_percent<=100)data.scroll_percent=value.data.scroll_percent;
 if(Number.isFinite(value.data?.elapsed_ms)&&value.data.elapsed_ms>=0&&value.data.elapsed_ms<=3600000)data.elapsed_ms=Math.round(value.data.elapsed_ms);
 if(typeof value.data?.completedQuiz==='boolean')data.completedQuiz=value.data.completedQuiz;
 if(typeof value.data?.section==='string'&&/^[a-z0-9_-]{1,50}$/i.test(value.data.section))data.section=value.data.section;
 const attribution={};
 for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id']){
  const item=value.attribution?.[key];
  if(typeof item==='string'&&item.length<=300&&!/@|https?:|token=|password=/i.test(item))attribution[key]=item;
 }
 return {id:value.id,visit:value.visit,event:value.event,data,attribution,internal:value.internal===true};
}
export async function insertEvents(sql,events,userId=null,internal=false){
 if(!events.length)return;
 const payload=events.map(e=>({...e,internal:internal||e.internal}));
 await sql`insert into vsd_measurement_events(id,visit,event,data,attribution,user_id,internal)
 select x.id::uuid,x.visit::uuid,x.event,x.data,x.attribution,${userId}::uuid,x.internal
 from jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) as x(id text,visit text,event text,data jsonb,attribution jsonb,internal boolean)
 on conflict(id) do nothing`;
}
export async function measurementReport(sql,days=7,internal=false){
 const summary=await sql`select event,count(*)::int as events,count(distinct visit)::int as visits,count(distinct user_id)::int as buyers from vsd_measurement_events where created_at>=now()-${days}*interval '1 day' and internal=${internal} group by event order by event`;
 const questions=await sql`select (data->>'question')::int as question,count(distinct visit) filter(where event='quiz_question_view')::int as viewed,count(distinct visit) filter(where event='quiz_answer')::int as answered from vsd_measurement_events where created_at>=now()-${days}*interval '1 day' and internal=${internal} and event in ('quiz_question_view','quiz_answer') group by data->>'question' order by question`;
 const sources=await sql`select attribution->>'utm_source' as source,attribution->>'utm_campaign' as campaign,attribution->>'utm_medium' as medium,attribution->>'utm_content' as creative,count(distinct visit) filter(where event='landing_view')::int as entrances,count(distinct visit) filter(where event='quiz_complete')::int as completed,count(distinct visit) filter(where event='checkout_click')::int as checkout_clicks from vsd_measurement_events where created_at>=now()-${days}*interval '1 day' and internal=${internal} and event in ('landing_view','quiz_complete','checkout_click') group by 1,2,3,4 order by entrances desc limit 100`;
 const members=await sql`select e.event,e.data->>'placement' as placement,e.data->>'lesson' as lesson,e.data->>'addon' as addon,count(*)::int as events,count(distinct e.user_id)::int as buyers from vsd_measurement_events e where created_at>=now()-${days}*interval '1 day' and e.internal=${internal} and e.user_id is not null group by 1,2,3,4 order by events desc limit 100`;
 const contacts=await sql`select u.email,e.data->>'placement' as placement,e.created_at from vsd_measurement_events e join neon_auth."user" u on u.id=e.user_id where e.created_at>=now()-${days}*interval '1 day' and e.internal=${internal} and e.event='member_whatsapp_click' order by e.created_at desc limit 100`;
 return {days,internal,summary,questions,sources,members,contacts};
}
