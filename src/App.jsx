import {recordMeasurement,flushMeasurement,discardMeasurement} from './measurement.mjs';
import { checkoutAttribution } from './attribution.mjs';
import { useEffect, useRef, useState } from 'react';


const GA_ID = 'G-TEJFFGGVNM';
const CLARITY_ID = 'yw5b5hu1hy';
const consentKey = 'vsd-analytics-consent-v2';
const seenEvents = new Set();
const pendingEvents = [];
let analyticsReady = false;
let clarityStopped = false;
let analyticsAllowed = false;
const isReview = new URLSearchParams(window.location.search).get('analytics_test') === '1';
const publicPage = !window.location.pathname.startsWith('/membros');
if (publicPage) checkoutAttribution(window.location.search);
function readConsent() {
  try { return localStorage.getItem(consentKey); } catch { return null; }
}
function safePageLocation() {
  const url = new URL(window.location.href);
  const keep = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id'];
  [...url.searchParams.keys()].forEach(key => { if (!keep.includes(key)) url.searchParams.delete(key); });
  return url.href;
}
function sendAnalytics(event, data, onSent) {
  if (!analyticsAllowed || !analyticsReady || !publicPage) return;
  recordMeasurement(event,data);
  const safe = { funnel_version:'vsd-2026-10', traffic_type:isReview ? 'internal' : 'external' };
  // Only behavioral metadata: never send answers, financial scores or contact details.
  ['question','section','placement','elapsed_ms','completedQuiz','entry_stage','scroll_percent'].forEach(key => {
    if (typeof data[key] === 'number' || typeof data[key] === 'boolean' || typeof data[key] === 'string') safe[key] = data[key];
  });
  if (isReview) console.debug('[VSD analytics]',event,safe);
  window.gtag('event', event, {...safe, page_location:safePageLocation(), transport_type:'beacon', ...(onSent ? {event_callback:onSent,event_timeout:400} : {}), ...(isReview ? {debug_mode:true} : {})});
  window.clarity?.('event', event);
  if (data.question) window.clarity?.('set','quiz_step',String(data.question));
}
function enableAnalytics() {
  if (!publicPage) return;
  if (clarityStopped) { window.location.reload(); return; }
  analyticsAllowed = true;
  if (!analyticsReady) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    window.gtag('js',new Date());
    window.gtag('config',GA_ID,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:safePageLocation()});
    const google = document.createElement('script');
    google.async = true;
    google.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(google);
    if (CLARITY_ID) {
    window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
    window.clarity('consentv2',{analytics_Storage:'granted',ad_Storage:'denied'});
    window.clarity('set','traffic_type',isReview ? 'internal' : 'external');
    const clarity = document.createElement('script');
    clarity.async = true;
    clarity.src = 'https://www.clarity.ms/tag/' + CLARITY_ID;
    document.head.appendChild(clarity);
    }
    analyticsReady = true;
    window.gtag('event','page_view',{page_location:safePageLocation(),traffic_type:isReview ? 'internal' : 'external',...(isReview ? {debug_mode:true} : {})});
  } else {
    window['ga-disable-' + GA_ID] = false;
    window.gtag('consent','update',{analytics_storage:'granted'});
    window.clarity?.('consentv2',{analytics_Storage:'granted',ad_Storage:'denied'});
  }
  pendingEvents.splice(0).forEach(item => sendAnalytics(item.event,item.data));
}
function track(event, data = {}, once = false, onSent) {
  if (!publicPage) return;
  const key = event + ':' + (data.question || data.section || data.scroll_percent || '');
  if (once && seenEvents.has(key)) return;
  if (once) seenEvents.add(key);
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({event,...data});
    if (analyticsAllowed) sendAnalytics(event,data,onSent);
    else if (readConsent() !== 'denied' && pendingEvents.length < 100) pendingEvents.push({event,data});
  } catch { /* Tracking must never block the quiz or checkout. */ }
}
if (readConsent() === 'granted') enableAnalytics();

function AnalyticsPrivacy() {
  const [choice,setChoice] = useState(readConsent);
  const [open,setOpen] = useState(false);
  function choose(value) {
    try { localStorage.setItem(consentKey,value); } catch { /* Session preference still works. */ }
    setChoice(value);
    setOpen(false);
    if (value === 'granted') enableAnalytics();
    else {
      analyticsAllowed = false;
      discardMeasurement();
      pendingEvents.length = 0;
      window['ga-disable-' + GA_ID] = true;
      window.gtag?.('consent','update',{analytics_storage:'denied'});
      window.clarity?.('consentv2',{analytics_Storage:'denied',ad_Storage:'denied'});
      window.clarity?.('stop');
      clarityStopped = analyticsReady;
    }
  }
  const buttonStyle = {background:'transparent',color:'#ccc',border:'1px solid #555',padding:'7px 11px',borderRadius:5,font:'inherit',cursor:'pointer'};
  return <aside aria-label="Preferências de privacidade" style={{fontFamily:'Arial,sans-serif',fontSize:12,lineHeight:1.5,color:'#aaa',maxWidth:760,margin:'0 auto',padding:'12px 20px 20px',textAlign:'center'}}>
    {(!choice || open) && <div role="region" aria-label="Medição de navegação">
      <p style={{margin:'0 0 8px'}}>Podemos usar cookies de análise e gravar a navegação para melhorar esta página?</p>
      {open && <p style={{margin:'8px 0'}}>Com sua permissão, usamos Google Analytics e Microsoft Clarity para medir etapas, cliques e rolagens e gravar a navegação, com conteúdo sensível oculto. Não enviamos suas respostas financeiras, e-mail ou senha como dados dos eventos. A área de membros fica fora dessa medição. Você pode recusar e continuar normalmente, ou mudar sua escolha aqui.</p>}
      <div style={{display:'flex',justifyContent:'center',gap:8,flexWrap:'wrap'}}>
        <button style={buttonStyle} onClick={()=>choose('denied')}>Não aceitar</button>
        <button style={buttonStyle} onClick={()=>choose('granted')}>Aceitar análise</button>
      </div>
    </div>}
    <button aria-expanded={open} onClick={()=>setOpen(!open)} style={{...buttonStyle,border:0,padding:'6px 8px',fontSize:11,textDecoration:'underline',marginTop:4}}>{open ? 'Fechar detalhes' : 'Privacidade e cookies'}</button>
  </aside>;
}


const questions = [
  { question: 'Sem chutar: você sabe pra onde foi o seu dinheiro este mês?', options: ['Acho que sei. Mas, se me perguntar, não sei explicar', 'Sei sim. Anoto o que entra e o que sai', 'Não sei. Só vejo que o dinheiro acabou'], scores: [2, 3, 1] },
  { question: 'E como você confere se o dinheiro está dando conta?', options: ['Olho a fatura e o extrato. É por ali que me viro', 'Anoto tudo numa planilha ou aplicativo', 'Vou de cabeça. Quando dá aperto, eu percebo'], scores: [2, 3, 1] },
  { question: 'O mês está acabando. Qual é a sua realidade?', options: ['O dinheiro acaba e ainda tem conta pra pagar', 'Pago as contas, mas qualquer imprevisto me aperta', 'Consigo pagar as contas e ainda sobra'], scores: [1, 2, 3] },
  { question: 'Você sabe que precisa se organizar. O que te faz deixar pra depois?', options: ['Começo animado. Depois largo tudo de novo', 'Vejo números e já penso: não vou dar conta', 'Esqueço de anotar os gastos', 'Dá medo de olhar e descobrir o tamanho do aperto'], scores: [1, 1, 1, 1] },
  { question: 'E se você anotasse o que entra e sai, e o sistema fizesse as contas?', options: ['É disso que eu preciso. Cansei de adivinhar', 'Se eu não tiver que montar fórmulas, eu tento', 'Nunca usei, mas quero entender como funciona'], scores: [3, 2, 2] },
  { question: 'Quer ver um jeito de começar, em vez de deixar pra outro mês?', options: ['Quero. Me mostra como funciona', 'Quero, mas preciso de ajuda pra usar', 'Quero ver primeiro e decidir com calma'], scores: [3, 2, 1] },
];
const faqs = [
  ['“Sou ruim com números.” Isso vai ser complicado?', 'Você não precisa montar fórmulas. A planilha já vem pronta: você preenche o que ganha e o que gasta, e ela faz os cálculos. Tem videoaula ensinando a usar e suporte no WhatsApp pra tirar suas dúvidas.'],
  ['Onde eu uso o sistema?', 'A ferramenta do sistema é uma planilha pronta no Google Planilhas, pra usar no computador ou no celular. Você precisa de uma conta Google pra abrir a sua cópia. Esta versão funciona no Google Planilhas, não no Excel.'],
  ['Preciso anotar os gastos ou o sistema faz isso sozinho?', 'Você anota o que ganha e o que gasta na planilha. Ela faz os cálculos automaticamente com os dados que você preencher. O suporte no WhatsApp é pra pedir ajuda e tirar dúvidas sobre a planilha e os materiais.'],
  ['“Eu já olho a fatura.” Preciso disso?', 'A fatura mostra os gastos daquele cartão. Mas também tem Pix, dinheiro, contas e o que você recebe. Na planilha, você junta as informações que preencher e consegue olhar o mês como um todo.'],
  ['“Eu ganho pouco.” Ainda faz sentido organizar?', 'Saber o que entra e o que sai também é útil quando o dinheiro está curto. A planilha ajuda a organizar os números. Ela não aumenta sua renda nem paga suas dívidas: as decisões continuam sendo suas.'],
  ['Tenho que pagar todo mês?', 'Não. São R$24,90, uma vez só, pelo Sistema Vida Sem Dívidas: planilha pronta, três bônus, videoaula e suporte incluídos nesta oferta. Não tem mensalidade.'],
  ['Como vou receber?', 'Depois da confirmação do pagamento, você recebe as instruções de acesso pelos canais informados no checkout. É só seguir o passo a passo pra abrir sua cópia e acessar os bônus.'],
  ['E se eu precisar de ajuda ou não gostar?', 'Pode chamar no WhatsApp pra tirar dúvidas sobre acesso, uso da planilha e materiais. Consultoria individual é um serviço à parte. Você também tem 30 dias após a compra pra pedir seu dinheiro de volta pelo canal indicado no pedido.'],
];

function Arrow() { return <span aria-hidden="true">→</span>; }
function CheckoutButton({ placement, children = 'QUERO MEU SISTEMA AGORA' }) {
  const [notice, setNotice] = useState(false);
  function checkout() {
    const checkoutUrl = import.meta.env.VITE_CHECKOUT_URL;
    if (!checkoutUrl) { track('checkout_unavailable', { placement }); setNotice(true); return; }
    let url;
    try { url = new URL(checkoutUrl); } catch { setNotice(true); return; }
    if (url.protocol !== 'https:') { setNotice(true); return; }
    const params = checkoutAttribution(window.location.search);
    params.forEach((value, key) => url.searchParams.set(key, value));
    track('offer_click', {placement});
    if (analyticsAllowed && analyticsReady) {
      let navigating = false;
      const go = () => { if (!navigating) { navigating = true; flushMeasurement();window.location.assign(url.href); } };
      // Let GA dispatch the final event, with a hard fallback so analytics never blocks checkout.
      track('checkout_click', {placement}, false, go);
      window.setTimeout(go,500);
    } else {
      track('checkout_click', {placement});
      window.location.assign(url.href);
    }
  }
  return <div className="buy-control"><button className="big-button vsd-checkout" onClick={checkout}>{children}<Arrow /></button>{notice && <p className="checkout-notice" role="status">As vendas da nova oferta ainda não abriram. Volte em breve pra acessar por R$24,90.</p>}</div>;
}
function SectionLabel({ number, children }) { return <p className="section-label"><span>{number}</span>{children}</p>; }

export default function App() {
  const offerHashes = ['#oferta','#pacote','#conteudo','#duvidas'];
  const [stage, setStage] = useState(offerHashes.includes(window.location.hash) ? 'offer' : 'hook');
  const [answers, setAnswers] = useState([]);
  const titleRef = useRef(null);
  const lock = useRef(false);
  const current = answers.length;
  const questionStarted = useRef(0);
  useEffect(() => {
    document.title = 'Sistema Vida Sem Dívidas | Chega de perder as contas';
    const entryStage = offerHashes.includes(window.location.hash) ? 'offer' : 'hook';
    track(entryStage === 'hook' ? 'landing_view' : 'direct_offer_entry', {entry_stage:entryStage}, true);
    function hashChanged() { if (window.location.hash === '#oferta') setStage('offer'); }
    window.addEventListener('hashchange', hashChanged);
    return () => window.removeEventListener('hashchange', hashChanged);
  }, []);
  useEffect(() => {
    window.scrollTo({top:0,behavior:'instant'});
    titleRef.current?.focus({preventScroll:true});
    lock.current = false;
  }, [stage,current]);
  useEffect(() => {
    if (stage !== 'quiz') return;
    questionStarted.current = performance.now();
    track('quiz_question_view',{question:current+1},true);
    track('quiz_question_' + (current+1) + '_view',{question:current+1},true);
  },[stage,current]);
  function answer(index) {
    if (lock.current) return;
    lock.current = true;
    const next = [...answers,index];
    track('quiz_answer',{question:current+1,elapsed_ms:Math.round(performance.now()-questionStarted.current)});
    track('quiz_question_' + (current+1) + '_answer',{question:current+1},true);
    setAnswers(next);
    if (next.length === questions.length) {
      track('quiz_complete',{},true);
      window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}#oferta`);
      setStage('offer');
    }
  }
  if (stage === 'offer') return <><OfferPage completedQuiz={answers.length === 6} /><AnalyticsPrivacy /></>;
  return <div className="quiz-page"><main className="quiz-wrap">{stage === 'hook' ? <section className="hook"><p className="small-brand">VIDA SEM DÍVIDAS</p><img className="original-image" src="/mockup.webp" decoding="async" alt="Homem correndo numa roda: trabalha, ganha dinheiro, paga contas e fica sem dinheiro. É assim que você se sente?" width="538" height="549" fetchPriority="high" /><h1 ref={titleRef} tabIndex={-1}>Você trabalha o mês todo.<br /><em>E o dinheiro não fica?</em></h1><p>O salário cai. As contas levam. E você fica esperando o próximo.<br />Responda 6 perguntas e veja um jeito de começar a sair desse ciclo.</p><button className="big-button" onClick={()=>{track('quiz_start',{},true);setAnswers([]);setStage('quiz');}}>QUERO SAIR DESSE CICLO<Arrow /></button><p className="small-note">Sem pedir sua renda. Sem pedir dados do banco.</p></section> : <section className="question-box" data-clarity-mask="true"><p className="small-brand">VAMOS FALAR A VERDADE SOBRE O DINHEIRO</p><div className="question-count"><span>PERGUNTA {current+1} DE 6</span><span>Sem enrolação.</span></div><div className="progress" role="progressbar" aria-label="Progresso do quiz" aria-valuemin={0} aria-valuemax={6} aria-valuenow={current}><span style={{width:`${current/6*100}%`}} /></div><h1 ref={titleRef} tabIndex={-1}>{questions[current].question}</h1><p className="question-help">Responda como acontece de verdade. Não como você gostaria que fosse.</p><div className="options">{questions[current].options.map((text,index)=><button key={`${current}-${index}`} onClick={()=>answer(index)}><span className="option-letter">{String.fromCharCode(65+index)}</span><span>{text}</span><Arrow /></button>)}</div>{current>0&&<button className="back" onClick={()=>{track('quiz_back',{question:current+1});setAnswers(answers.slice(0,-1));}}>← Voltar pra pergunta anterior</button>}</section>}</main><footer className="quiz-footer">Sistema Vida Sem Dívidas · Chega de ir no escuro.</footer><AnalyticsPrivacy /></div>;
}

const testimonialPrints = [
  { src: '/depoimentos/atendimento-01.jpg', alt: 'Print de conversa no WhatsApp: cliente elogia o suporte e se oferece para enviar uma avaliação.' },
  { src: '/depoimentos/atendimento-02.jpg', alt: 'Print de conversa no WhatsApp: cliente agradece o atendimento e escreve Excelente.' },
  { src: '/depoimentos/atendimento-03.jpg', alt: 'Print de conversa no WhatsApp: após receber ajuda, cliente diz que deu certo e agradece.' },
];

function TestimonialCarousel() {
  const [paused, setPaused] = useState(false);
  return <div className={`testimonial-carousel${paused ? ' is-paused' : ''}`}>
    <div className="testimonial-window" role="region" aria-label="Prints de depoimentos de clientes">
      <div className="testimonial-track">{[...testimonialPrints, ...testimonialPrints].map((item, index) =>
        <figure className="testimonial-slide" key={`${item.src}-${index}`} aria-hidden={index >= testimonialPrints.length ? true : undefined}>
          <a href={item.src} target="_blank" rel="noopener noreferrer" tabIndex={index >= testimonialPrints.length ? -1 : undefined} aria-label="Abrir print do depoimento em tamanho completo" onClick={()=>track('testimonial_open')}>
            <img src={item.src.replace('.jpg', '.webp')} decoding="async" alt={index >= testimonialPrints.length ? '' : item.alt} width="720" height="1480" loading="lazy" />
          </a>
        </figure>
      )}</div>
    </div>
    <button className="carousel-toggle" onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? 'Continuar depoimentos ▶' : 'Pausar depoimentos Ⅱ'}</button>
    <p className="small-note">Toque num print pra ler em tamanho maior.</p>
  </div>;
}

function OfferPage({completedQuiz}) {
  const [zoom,setZoom] = useState(false);
  const dialogRef = useRef(null);
  const salesRef = useRef(null);
  useEffect(() => {
    if (!salesRef.current || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const blocks = [...salesRef.current.querySelectorAll('.sales-section > *, .last-call > *')];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -32px 0px' });
    blocks.forEach(block => {
      if (block.getBoundingClientRect().top >= window.innerHeight - 20) {
        block.classList.add('scroll-reveal');
        observer.observe(block);
      }
    });
    const root = salesRef.current;
    const revealFocused = event => {
      const block = event.target.closest('.scroll-reveal');
      if (block) { block.classList.add('is-revealed'); observer.unobserve(block); }
    };
    root.addEventListener('focusin', revealFocused);
    return () => {
      observer.disconnect();
      root.removeEventListener('focusin', revealFocused);
      blocks.forEach(block => block.classList.remove('scroll-reveal', 'is-revealed'));
    };
  }, []);
  useEffect(()=>{track('offer_view',{completedQuiz},true);},[completedQuiz]);
  useEffect(() => {
    if (!salesRef.current || !('IntersectionObserver' in window)) return;
    const sections = [...salesRef.current.querySelectorAll('section'),salesRef.current.querySelector('.guarantee')].filter(Boolean);
    const names = ['hero','cycle','identification','product','bonuses','testimonials','price','faq','final','guarantee'];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const section = names[sections.indexOf(entry.target)];
          track('offer_section_view',{section},true);
          track('section_' + section + '_view',{section},true);
          observer.unobserve(entry.target);
        }
      });
    },{threshold:0,rootMargin:'0px 0px -15% 0px'});
    sections.forEach(section => observer.observe(section));
    const milestones = new Set();
    const onScroll = () => {
      const available = document.documentElement.scrollHeight-window.innerHeight;
      const percent = available > 0 ? Math.min(100,Math.round(window.scrollY/available*100)) : 100;
      [25,50,75,90].forEach(mark => {
        if (percent >= mark && !milestones.has(mark)) {
          milestones.add(mark);
          track('offer_scroll',{scroll_percent:mark},true);
        }
      });
    };
    window.addEventListener('scroll',onScroll,{passive:true});
    onScroll();
    return () => { observer.disconnect(); window.removeEventListener('scroll',onScroll); };
  },[]);
  useEffect(()=>{if(zoom)dialogRef.current?.showModal();else dialogRef.current?.close();},[zoom]);
  return <div className="sales-page"><a className="skip-link" href="#conteudo">Ir para o conteúdo</a><main id="conteudo" className="sales-column" ref={salesRef}>
    <section className="sales-hero"><p className="small-brand">{completedQuiz?'VOCÊ ENCAROU AS PERGUNTAS. AGORA OLHA ISSO.':'SISTEMA VIDA SEM DÍVIDAS'}</p><h1>O SALÁRIO CAI.<br />AS CONTAS LEVAM.<br /><em>E VOCÊ FICA NO APERTO?</em></h1><p className="red-intro">Até quando você vai trabalhar o mês inteiro<br />e terminar sem saber pra onde foi o dinheiro?</p><div className="punch-box"><p>Você se esforça pra ganhar dinheiro.<br /><strong>Está na hora de enxergar<br className="desktop-break" /> pra onde ele está indo.</strong></p></div><div className="story-lines"><p>Você recebe e pensa: agora vai dar.</p><p>Aí vem a fatura. O mercado. A luz. Um Pix aqui. Outro ali.</p><p>Quando vê, o dinheiro acabou.<br />Mas o mês ainda não.</p><p className="yellow">Se você conhece esse aperto,<br /><strong>chega de tentar controlar tudo de cabeça.</strong></p></div><p className="hero-product">O Sistema Vida Sem Dívidas já vem pronto.<br />Você preenche. Ele faz as contas.<br /><strong>E você começa a ver o que antes ficava no chute.</strong></p></section>
    <section className="sales-section cycle"><SectionLabel number="01">O CICLO DO APERTO</SectionLabel><h2>IGNORAR A CONTA<br /><em>NÃO FAZ A CONTA<br />SUMIR.</em></h2><div className="story-lines"><p>Você adia olhar o saldo pra não passar raiva.</p><p>Evita somar as parcelas pra não levar um susto.</p><p>Pensa: no mês que vem eu resolvo.<br />Só que o mês que vem também chega cheio de conta.</p><p>Não olhar pode aliviar por um momento.<br /><strong>Mas deixa você decidindo sem saber quanto pode gastar.</strong></p></div><div className="red-box"><p>Fechar os olhos<br /><strong>não fecha as contas.</strong></p></div><p>Você não precisa resolver a vida inteira hoje.<br /><strong>Mas precisa parar de adivinhar o que acontece com seu dinheiro.</strong></p></section>
    <section className="sales-section"><SectionLabel number="02">SE RECONHECEU?</SectionLabel><h2>DÓI LER?<br /><em>OU DÓI PORQUE<br />ACONTECE AÍ?</em></h2><ul className="symptoms">{['O dinheiro acaba e você já começa a contar os dias pro salário.','Você olha a fatura e acha que viu tudo. Mas o Pix e as outras contas ficaram de fora.','A parcela parece pequena. Juntam várias e o próximo salário já tem dono.','Você promete que vai anotar. Para no meio e volta a ir no chute.','Só de pensar em planilha, você diz: sou ruim com números. E deixa pra depois.'].map((text,i)=><li key={text}><span>{text}</span><b>{String(i+1).padStart(2,'0')}</b></li>)}</ul><p className="yellow section-close">Você não precisa gostar de números.<br /><strong>Precisa entender o que está acontecendo com o seu dinheiro.</strong></p></section>
    <section className="sales-section product"><SectionLabel number="03">É AQUI QUE VOCÊ COMEÇA</SectionLabel><h2>CHEGA DE CHUTAR.<br /><em>COLOQUE AS CONTAS<br />NA SUA FRENTE.</em></h2><p>Esse é o <strong>Sistema Vida Sem Dívidas.</strong><br />Você recebe uma planilha pronta no Google Planilhas, pra usar no computador ou no celular, junto com os bônus, a videoaula e o suporte.<br /><strong>Você não começa do zero. Começa preenchendo.</strong></p><button className="product-preview" onClick={()=>{track('product_image_open');setZoom(true);}} aria-label="Ampliar imagem da planilha"><img src="/planilha-em-casa.webp" srcSet="/planilha-em-casa-mobile.webp 600w, /planilha-em-casa.webp 1200w" sizes="(max-width: 700px) calc(100vw - 40px), 720px" decoding="async" alt="Cena ilustrativa de uma mulher em casa usando o Sistema Vida Sem Dívidas no notebook, com a mesma planilha aberta no celular." width="1448" height="1086" loading="lazy" /><span>TOQUE PRA VER MAIOR ↗</span></button><div className="product-steps"><article><b>01</b><div><h3>Primeiro: quanto entra?</h3><p>Salário, renda extra e outras entradas.</p></div></article><article><b>02</b><div><h3>Depois: pra onde vai?</h3><p>Contas, compras e as despesas do dia a dia.</p></div></article><article><b>03</b><div><h3>Agora, olhe o mês inteiro.</h3><p>Com os dados que você preencher, a planilha calcula e mostra os números nos painéis.</p></div></article></div><div className="punch-box"><p>“Mas eu não sei mexer com fórmula.”<br />Você não precisa montar as fórmulas.<br /><strong>A planilha vem pronta. E, se travar, tem ajuda.</strong></p></div><p className="small-note">Você preenche os dados. A planilha faz os cálculos.</p></section>
    <section className="sales-section"><SectionLabel number="04">E AINDA VEM JUNTO</SectionLabel><h2>E AS ARMADILHAS<br /><em>QUE FAZEM VOCÊ<br />SE ENROLAR?</em></h2><p>Pra te ajudar a olhar pras parcelas, pras compras por impulso e pra organização, estes 3 bônus vão junto:</p><div className="bonus-list"><article><img className="bonus-cover" src="/bonus-parcelado.webp" alt="" width="320" height="480" loading="lazy" decoding="async" /><div className="bonus-copy"><span className="bonus-tag">BÔNUS 01 · INCLUÍDO</span><h3>PARCELADO NUNCA MAIS</h3><p>“É só mais uma parcelinha.” Até juntar todas. Acompanhe quanto suas parcelas pesam no mês e quando acabam. Antes de assumir outra, veja o que já tem pra pagar.</p></div></article><article><img className="bonus-cover" src="/bonus-anti-impulso.webp" alt="" width="320" height="480" loading="lazy" decoding="async" /><div className="bonus-copy"><span className="bonus-tag">BÔNUS 02 · INCLUÍDO</span><h3>ANTI-IMPULSO</h3><p>A vontade vem agora. A conta vem depois. Use esse apoio pelo ChatGPT pra parar, pensar na compra e nas suas prioridades antes de gastar.</p></div></article><article><img className="bonus-cover" src="/bonus-som.webp" alt="" width="320" height="480" loading="lazy" decoding="async" /><div className="bonus-copy"><span className="bonus-tag">BÔNUS 03 · INCLUÍDO</span><h3>MÉTODO S.O.M.</h3><p>“Tá, mas por onde eu começo?” Esse material de apoio te dá direção pra dar os primeiros passos na organização das suas finanças.</p></div></article></div><div className="support-box"><span className="bonus-tag">TRAVOU? NÃO PRECISA LARGAR TUDO.</span><h3>VIDEOAULA +<br /><em>SUPORTE NO WHATSAPP</em></h3><p>Nada de comprar e ficar olhando sem saber o que fazer.<br />Tem videoaula mostrando como usar. E, se pintar dúvida, chama no WhatsApp: a gente te ajuda com a planilha e os materiais.</p><p className="small-note">Consultoria financeira individual é um serviço à parte.</p></div></section>
    <section className="sales-section testimonials"><SectionLabel number="05">QUEM CHAMOU O SUPORTE CONTA</SectionLabel><h2>“SERÁ QUE VÃO<br /><em>ME AJUDAR MESMO?”</em></h2><p>Olha as mensagens reais de clientes que receberam atendimento pelo WhatsApp.</p><TestimonialCarousel /></section>
    <section className="sales-section decision" id="pacote"><SectionLabel number="06">CHEGA DE DEIXAR PRA DEPOIS</SectionLabel><h2>MAIS UM MÊS<br /><em>NO CHUTE?<br />OU VAMOS COMEÇAR?</em></h2><p>Você já sabe como é chegar ao fim do mês sem entender o que aconteceu.<br /><strong>Agora tem uma ferramenta pronta pra começar a fazer diferente.</strong></p><div className="offer-box"><span className="offer-tag">TUDO ISSO, NUMA OFERTA SÓ</span><h3>SISTEMA<br />VIDA SEM DÍVIDAS</h3><ul>{['Planilha pronta no Google Planilhas','Videoaula ensinando a usar','Parcelado Nunca Mais','Anti-Impulso','Método S.O.M.','Suporte pelo WhatsApp'].map(text=><li key={text}><span aria-hidden="true">✓</span>{text}</li>)}</ul><p className="price-label">O sistema completo por</p><p className="offer-price"><small>R$</small>24<span>,90</span></p><p className="payment-note">UMA VEZ SÓ. SEM MENSALIDADE.</p><CheckoutButton placement="package" /><p className="small-note">Planilha + 3 bônus + videoaula + suporte.</p></div><div className="guarantee"><span className="guarantee-number">30</span><div><h3>DIAS PRA EXPERIMENTAR</h3><p>Não fez sentido pra você? Peça seu dinheiro de volta em até 30 dias após a compra, pelo canal indicado no pedido.</p></div></div></section>
    <section className="sales-section faq" id="duvidas"><SectionLabel number="07">FALTA TIRAR ALGUMA DÚVIDA?</SectionLabel><h2>“MAS E SE...?”<br /><em>VAMOS TIRAR<br />ESSAS DÚVIDAS.</em></h2><div className="faq-list">{faqs.map(([q,a])=><details key={q} onToggle={event=>{if(event.currentTarget.open)track('faq_open',{question:q});}}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></section>
    <section className="last-call"><h2>O MÊS VAI PASSAR.<br /><em>VOCÊ VAI CONTINUAR<br />SEM OLHAR?</em></h2><p>Não precisa organizar a vida toda de uma vez.<br />Comece colocando o que entra e o que sai no mesmo lugar.<br /><strong>Seu sistema já vem pronto pra começar: planilha, 3 bônus, videoaula e suporte.</strong></p><CheckoutButton placement="final" /></section></main><footer className="sales-footer"><p>SISTEMA VIDA SEM DÍVIDAS</p><span>Uma ferramenta pra organizar o dinheiro. Os resultados dependem do preenchimento e das suas decisões. O sistema não aumenta sua renda nem quita dívidas sozinho.</span></footer><dialog ref={dialogRef} className="preview-dialog" onClose={()=>setZoom(false)} onClick={event=>{if(event.target===event.currentTarget)setZoom(false);}}><button onClick={()=>setZoom(false)} aria-label="Fechar prévia">Fechar ×</button>{zoom && <img src="/planilha-em-casa.webp" srcSet="/planilha-em-casa-mobile.webp 600w, /planilha-em-casa.webp 1200w" sizes="(max-width: 700px) calc(100vw - 40px), 720px" decoding="async" alt="Cena ilustrativa ampliada da planilha no computador e no celular." width="1448" height="1086" />}<p>Google Planilhas · Prévia do produto</p></dialog></div>;
}
