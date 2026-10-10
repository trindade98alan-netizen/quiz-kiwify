import { useEffect, useRef, useState } from 'react';

function track(event, data = {}) {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...data });
    if (typeof window.utmify?.track === 'function') window.utmify.track(event, data);
  } catch { /* O rastreamento não deve interromper o quiz. */ }
}

const questions = [
  { question: 'Quando o mês acaba, você sabe pra onde foi o seu dinheiro?', options: ['Tenho uma ideia, mas não sei direito', 'Sei sim. Anoto o que entra e o que sai', 'Não sei. Quando vejo, o dinheiro já acabou'], scores: [2, 3, 1] },
  { question: 'Hoje, como você acompanha seus gastos?', options: ['Vou olhando a fatura do cartão e o extrato', 'Anoto tudo numa planilha ou aplicativo', 'Vou de cabeça mesmo. Não anoto nada'], scores: [2, 3, 1] },
  { question: 'Qual dessas situações mais parece com o seu fim de mês?', options: ['O dinheiro acaba e ainda tem conta pra pagar', 'Dá pra pagar, mas fico no aperto', 'Consigo pagar as contas e ainda sobra'], scores: [1, 2, 3] },
  { question: 'O que mais te trava na hora de organizar o dinheiro?', options: ['Começo a anotar, mas logo paro', 'Acho planilha e números complicados', 'Esqueço de anotar os gastos', 'Dá até um medo de olhar as contas'], scores: [1, 1, 1, 1] },
  { question: 'Se você só precisasse preencher o que ganha e gasta, e a planilha fizesse as contas, você tentaria?', options: ['Sim! É de algo assim que eu preciso', 'Se for fácil de usar, eu tento', 'Nunca usei, mas quero entender como funciona'], scores: [3, 2, 2] },
  { question: 'Quer ver a planilha e o que vem junto pra te ajudar a começar?', options: ['Quero! Me mostra', 'Quero, mas preciso de ajuda pra usar', 'Vou dar uma olhada antes de decidir'], scores: [3, 2, 1] },
];
const faqs = [
  ['Sou ruim com números. Vou conseguir usar?', 'Você não precisa montar fórmulas. A planilha já vem pronta: você preenche o que ganha e o que gasta, e ela faz os cálculos. Tem videoaula ensinando a usar e suporte no WhatsApp pra tirar suas dúvidas.'],
  ['Onde essa planilha funciona?', 'No Google Planilhas. Você precisa de uma conta Google pra abrir a sua cópia. Esta é a versão para Google Planilhas; não é uma versão para Excel.'],
  ['Ela anota meus gastos pelo WhatsApp?', 'Nesta oferta, você preenche os gastos na planilha. Ela faz os cálculos automaticamente. O WhatsApp é pra você pedir ajuda e tirar dúvidas. O aplicativo Phoenix, que registra por mensagem, é vendido à parte.'],
  ['Já olho a fatura. Pra que usar a planilha?', 'A fatura mostra os gastos daquele cartão. Mas também tem Pix, dinheiro, contas e o que você recebe. Na planilha, você junta as informações que preencher e consegue olhar o mês como um todo.'],
  ['Eu ganho pouco. Isso serve pra mim?', 'Saber o que entra e o que sai também é útil quando o dinheiro está curto. A planilha ajuda a organizar os números. Ela não aumenta sua renda nem paga suas dívidas: as decisões continuam sendo suas.'],
  ['Tenho que pagar todo mês?', 'Não. São R$24,90, uma vez só, pela planilha, os três bônus, a videoaula e o suporte incluídos nesta oferta. Não tem mensalidade.'],
  ['Como vou receber?', 'Depois da confirmação do pagamento, você recebe as instruções de acesso pelos canais informados no checkout. É só seguir o passo a passo pra abrir sua cópia e acessar os bônus.'],
  ['E se eu precisar de ajuda ou não gostar?', 'Pode chamar no WhatsApp pra tirar dúvidas sobre acesso, uso da planilha e materiais. Consultoria individual é um serviço à parte. Você também tem 30 dias após a compra pra pedir seu dinheiro de volta pelo canal indicado no pedido.'],
];

function Arrow() { return <span aria-hidden="true">→</span>; }
function CheckoutButton({ placement, children = 'SIM, QUERO ORGANIZAR MEU DINHEIRO' }) {
  const [notice, setNotice] = useState(false);
  function checkout() {
    const checkoutUrl = import.meta.env.VITE_CHECKOUT_URL;
    if (!checkoutUrl) { track('checkout_unavailable', { placement }); setNotice(true); return; }
    let url;
    try { url = new URL(checkoutUrl); } catch { setNotice(true); return; }
    if (url.protocol !== 'https:') { setNotice(true); return; }
    const params = new URLSearchParams(window.location.search);
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','src','sck','fbclid','gclid','ttclid'].forEach(key => { if (params.has(key)) url.searchParams.set(key, params.get(key)); });
    track('offer_click', { offerId: 'planilha-2490', value: 24.9, currency: 'BRL', placement });
    window.location.assign(url.href);
  }
  return <div className="buy-control"><button className="big-button" onClick={checkout}>{children}<Arrow /></button>{notice && <p className="checkout-notice" role="status">As vendas da nova oferta ainda não abriram. Volte em breve pra acessar por R$24,90.</p>}</div>;
}
function SectionLabel({ number, children }) { return <p className="section-label"><span>{number}</span>{children}</p>; }

export default function App() {
  const offerHashes = ['#oferta','#pacote','#conteudo','#duvidas'];
  const [stage, setStage] = useState(offerHashes.includes(window.location.hash) ? 'offer' : 'hook');
  const [answers, setAnswers] = useState([]);
  const titleRef = useRef(null);
  const lock = useRef(false);
  const current = answers.length;
  useEffect(() => {
    document.title = 'Planilha Vida Sem Dívidas | Chega de perder as contas';
    track('landing_view', {version: 'popular-2490'});
    function hashChanged() { if (window.location.hash === '#oferta') setStage('offer'); }
    window.addEventListener('hashchange', hashChanged);
    return () => window.removeEventListener('hashchange', hashChanged);
  }, []);
  useEffect(() => {
    window.scrollTo({top:0,behavior:'instant'});
    titleRef.current?.focus({preventScroll:true});
    lock.current = false;
  }, [stage,current]);
  function answer(index) {
    if (lock.current) return;
    lock.current = true;
    const next = [...answers,index];
    track('quiz_answer',{question:current+1,option:index+1});
    setAnswers(next);
    if (next.length === questions.length) {
      track('quiz_complete',{totalScore:next.reduce((sum,value,i)=>sum+questions[i].scores[value],0),maxScore:18});
      window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}#oferta`);
      setStage('offer');
    }
  }
  if (stage === 'offer') return <OfferPage completedQuiz={answers.length === 6} />;
  return <div className="quiz-page"><main className="quiz-wrap">{stage === 'hook' ? <section className="hook"><p className="small-brand">VIDA SEM DÍVIDAS</p><img className="original-image" src="/mockup.png" alt="Homem correndo numa roda: trabalha, ganha dinheiro, paga contas e fica sem dinheiro. É assim que você se sente?" width="538" height="549" fetchPriority="high" /><h1 ref={titleRef} tabIndex={-1}>O dinheiro entra.<br /><em>E já sai pagando conta?</em></h1><p>Responda 6 perguntas rápidas.<br />Vamos entender como anda o seu dinheiro e te mostrar um jeito de começar a se organizar.</p><button className="big-button" onClick={()=>{track('quiz_start');setAnswers([]);setStage('quiz');}}>QUERO SAIR DESSE CICLO<Arrow /></button><p className="small-note">Sem pedir sua renda. Sem pedir dados do banco.</p></section> : <section className="question-box"><p className="small-brand">VAMOS FALAR DO SEU DINHEIRO</p><div className="question-count"><span>PERGUNTA {current+1} DE 6</span><span>Uma de cada vez.</span></div><div className="progress" role="progressbar" aria-label="Progresso do quiz" aria-valuemin={0} aria-valuemax={6} aria-valuenow={current}><span style={{width:`${current/6*100}%`}} /></div><h1 ref={titleRef} tabIndex={-1}>{questions[current].question}</h1><p className="question-help">Pode falar a verdade. Aqui não tem julgamento.</p><div className="options">{questions[current].options.map((text,index)=><button key={`${current}-${index}`} onClick={()=>answer(index)}><span className="option-letter">{String.fromCharCode(65+index)}</span><span>{text}</span><Arrow /></button>)}</div>{current>0&&<button className="back" onClick={()=>{track('quiz_back',{question:current+1});setAnswers(answers.slice(0,-1));}}>← Voltar pra pergunta anterior</button>}</section>}</main><footer className="quiz-footer">Planilha Vida Sem Dívidas · Um passo de cada vez.</footer></div>;
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
          <a href={item.src} target="_blank" rel="noopener noreferrer" tabIndex={index >= testimonialPrints.length ? -1 : undefined} aria-label="Abrir print do depoimento em tamanho completo">
            <img src={item.src} alt={index >= testimonialPrints.length ? '' : item.alt} width="720" height="1480" loading="lazy" />
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
  useEffect(()=>{track('offer_view',{offerId:'planilha-2490',completedQuiz});},[completedQuiz]);
  useEffect(()=>{if(zoom)dialogRef.current?.showModal();else dialogRef.current?.close();},[zoom]);
  return <div className="sales-page"><a className="skip-link" href="#conteudo">Ir para o conteúdo</a><main id="conteudo" className="sales-column" ref={salesRef}>
    <section className="sales-hero"><p className="small-brand">{completedQuiz?'VOCÊ CHEGOU ATÉ AQUI. AGORA OLHA ISSO.':'PLANILHA VIDA SEM DÍVIDAS'}</p><h1>TRABALHA.<br />RECEBE. PAGA CONTA.<br /><em>E O DINHEIRO SOME?</em></h1><p className="red-intro">Chega de terminar o mês sem saber<br />pra onde foi o seu dinheiro.</p><div className="punch-box"><p>Você não precisa fazer conta de cabeça.<br /><strong>Precisa enxergar o que entra<br className="desktop-break" /> e o que sai.</strong></p></div><div className="story-lines"><p>O salário cai. Você respira.</p><p>Aí vem a fatura. O mercado. A luz. O Pix.</p><p>Quando percebe, já está contando os dias<br />pro próximo pagamento.</p><p className="yellow">Se isso parece com a sua vida,<br /><strong>continua aqui.</strong></p></div><p className="hero-product">Uma planilha pronta pra você preencher,<br />entender seus gastos e começar a se organizar.</p></section>
    <section className="sales-section cycle"><SectionLabel number="01">O CICLO DO APERTO</SectionLabel><h2>VOCÊ NÃO QUER LUXO.<br /><em>QUER FECHAR O MÊS<br />SEM ESSE SUFOCO.</em></h2><div className="story-lines"><p>Quer pagar as contas.</p><p>Quer olhar o saldo sem levar um susto.</p><p>Quer entender se dá pra comprar<br />ou se vai se enrolar lá na frente.</p><p>Mas, se tudo fica na cabeça,<br /><strong>é fácil perder as contas.</strong></p></div><div className="red-box"><p>Fingir que não viu a fatura<br /><strong>não faz a conta desaparecer.</strong></p></div><p>Você pode começar com um passo simples:<br /><strong>colocar os números no mesmo lugar.</strong></p></section>
    <section className="sales-section"><SectionLabel number="02">SE RECONHECEU?</SectionLabel><h2>QUAL DESSAS CENAS<br /><em>ACONTECE AÍ?</em></h2><ul className="symptoms">{['O dinheiro acaba, mas o mês continua.','Você acompanha a fatura e acha que está tudo sob controle.','Compra parcelado e depois esquece o que já comprometeu.','Começa a anotar os gastos… e abandona.','Quer organizar a vida, mas só de pensar em números já desanima.'].map((text,i)=><li key={text}><span>{text}</span><b>{String(i+1).padStart(2,'0')}</b></li>)}</ul><p className="yellow section-close">Não precisa resolver tudo de uma vez.<br /><strong>Mas dá pra parar de tentar adivinhar.</strong></p></section>
    <section className="sales-section product"><SectionLabel number="03">O QUE VAI TE AJUDAR</SectionLabel><h2>ABRIU. PREENCHEU.<br /><em>COMEÇOU A ENXERGAR.</em></h2><p>Essa é a <strong>Planilha Vida Sem Dívidas.</strong><br />Ela funciona no Google Planilhas e já vem pronta.</p><button className="product-preview" onClick={()=>setZoom(true)} aria-label="Ampliar imagem da planilha"><img src="/planilha-em-casa.jpg" alt="Cena ilustrativa de uma mulher em casa usando a Planilha Vida Sem Dívidas no notebook, com a mesma planilha aberta no celular." width="1448" height="1086" loading="lazy" /><span>TOQUE PRA VER MAIOR ↗</span></button><div className="product-steps"><article><b>01</b><div><h3>Coloque o que você ganha.</h3><p>Salário, renda extra e outras entradas.</p></div></article><article><b>02</b><div><h3>Anote o que você gasta.</h3><p>Contas, compras e as despesas do dia a dia.</p></div></article><article><b>03</b><div><h3>Veja o seu mês nos painéis.</h3><p>A planilha faz os cálculos com o que você preencher.</p></div></article></div><div className="punch-box"><p>Você não precisa criar fórmula.<br />Não precisa montar nada do zero.<br /><strong>E, se travar, pode pedir ajuda.</strong></p></div><p className="small-note">Você preenche os dados. A planilha faz os cálculos.</p></section>
    <section className="sales-section"><SectionLabel number="04">E AINDA VEM JUNTO</SectionLabel><h2>NÃO É SÓ<br /><em>A PLANILHA.</em></h2><p>Junto com a planilha, você leva também:</p><div className="bonus-list"><article><span className="bonus-tag">BÔNUS 01 · INCLUÍDO</span><h3>PARCELADO NUNCA MAIS</h3><p>Pra acompanhar suas parcelas, quanto elas pesam no mês e quando acabam. Antes de parcelar de novo, veja o que já está comprometido.</p></article><article><span className="bonus-tag">BÔNUS 02 · INCLUÍDO</span><h3>ANTI-IMPULSO</h3><p>Bateu aquela vontade de comprar? Use esse apoio pelo ChatGPT pra pensar na compra e nas suas prioridades antes de gastar.</p></article><article><span className="bonus-tag">BÔNUS 03 · INCLUÍDO</span><h3>MÉTODO S.O.M.</h3><p>Um material de apoio pra te dar direção na hora de começar a organizar suas finanças.</p></article></div><div className="support-box"><span className="bonus-tag">VOCÊ NÃO VAI FICAR SEM RESPOSTA</span><h3>VIDEOAULA +<br /><em>SUPORTE NO WHATSAPP</em></h3><p>Tem aula mostrando como usar.<br />E tem suporte pra tirar dúvidas e te ajudar com a planilha e os materiais.</p><p className="small-note">Consultoria financeira individual é um serviço à parte.</p></div></section>
    <section className="sales-section testimonials"><SectionLabel number="05">QUEM PRECISOU DE AJUDA</SectionLabel><h2>OLHA O QUE CHEGOU<br /><em>NO NOSSO WHATSAPP.</em></h2><p>Mensagens reais de clientes sobre o atendimento.</p><TestimonialCarousel /></section>
    <section className="sales-section decision" id="pacote"><SectionLabel number="06">VAMOS COMEÇAR?</SectionLabel><h2>CHEGA DE FICAR<br /><em>PERDENDO AS CONTAS.</em></h2><p>Um lugar pra anotar.<br />Um jeito de enxergar.<br /><strong>Ajuda pra começar.</strong></p><div className="offer-box"><span className="offer-tag">TUDO ISSO, NUMA OFERTA SÓ</span><h3>PLANILHA<br />VIDA SEM DÍVIDAS</h3><ul>{['Planilha pronta no Google Planilhas','Videoaula ensinando a usar','Parcelado Nunca Mais','Anti-Impulso','Método S.O.M.','Suporte pelo WhatsApp'].map(text=><li key={text}><span aria-hidden="true">✓</span>{text}</li>)}</ul><p className="price-label">Você recebe tudo por</p><p className="offer-price"><small>R$</small>24<span>,90</span></p><p className="payment-note">UMA VEZ SÓ. SEM MENSALIDADE.</p><CheckoutButton placement="package" /><p className="small-note">Planilha + 3 bônus + videoaula + suporte.</p></div><div className="guarantee"><span className="guarantee-number">30</span><div><h3>DIAS PRA EXPERIMENTAR</h3><p>Não fez sentido pra você? Peça seu dinheiro de volta em até 30 dias após a compra, pelo canal indicado no pedido.</p></div></div></section>
    <section className="sales-section faq" id="duvidas"><SectionLabel number="07">FALTA TIRAR ALGUMA DÚVIDA?</SectionLabel><h2>ANTES DE<br /><em>COMEÇAR.</em></h2><div className="faq-list">{faqs.map(([q,a])=><details key={q} onToggle={event=>{if(event.currentTarget.open)track('faq_open',{question:q});}}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></section>
    <section className="last-call"><h2>O PRÓXIMO PASSO<br /><em>NÃO PRECISA SER GRANDE.</em><br />PRECISA COMEÇAR.</h2><p>Planilha completa, 3 bônus e suporte.<br /><strong>Um passo de cada vez.</strong></p><a className="big-button offer-link" href="#pacote">QUERO A MINHA PLANILHA AGORA<Arrow /></a></section></main><footer className="sales-footer"><p>PLANILHA VIDA SEM DÍVIDAS</p><span>Uma ferramenta pra organizar o dinheiro. Os resultados dependem do preenchimento e das suas decisões. A planilha não aumenta sua renda nem quita dívidas sozinha.</span></footer><dialog ref={dialogRef} className="preview-dialog" onClose={()=>setZoom(false)} onClick={event=>{if(event.target===event.currentTarget)setZoom(false);}}><button onClick={()=>setZoom(false)} aria-label="Fechar prévia">Fechar ×</button><img src="/planilha-em-casa.jpg" alt="Cena ilustrativa ampliada da planilha no computador e no celular." width="1448" height="1086" /><p>Google Planilhas · Prévia do produto</p></dialog></div>;
}
