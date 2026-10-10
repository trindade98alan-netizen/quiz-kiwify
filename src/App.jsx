import { useEffect, useRef, useState } from 'react';

function track(event, data = {}) {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...data });
    if (typeof window.utmify?.track === 'function') window.utmify.track(event, data);
  } catch { /* Tracking must never interrupt the experience. */ }
}

const questions = [
  { question: 'Você sabe quanto dinheiro entrou e quanto saiu da sua conta no último mês?', options: ['Tenho uma noção, mas nada muito organizado', 'Sim, está tudo anotado e bem claro para mim', 'Não sei… costumo olhar o extrato depois'], scores: [2, 3, 1] },
  { question: 'Quando o mês acaba, você tem a sensação de que o dinheiro simplesmente “sumiu”?', options: ['Sim, quase nunca sei para onde o dinheiro foi', 'Não, acompanho os meus gastos', 'Às vezes, mas geralmente consigo fechar o mês'], scores: [1, 3, 2] },
  { question: 'Pensando nos próximos 6 meses, como você se sente sobre a sua organização financeira?', options: ['Preocupado(a), preciso começar a me organizar', 'Acho que vai continuar parecida com hoje', 'Confiante, já tenho uma rotina de controle'], scores: [1, 2, 3] },
  { question: 'O que mais dificulta controlar seu dinheiro hoje?', options: ['Começo a organizar, mas não consigo manter', 'Não tenho uma ferramenta simples', 'Esqueço de anotar os gastos no dia a dia', 'Acho complicado mexer com planilhas e números'], scores: [1, 2, 1, 1] },
  { question: 'Você usaria uma planilha em que registra receitas e despesas e os cálculos são feitos automaticamente?', options: ['Sim, é o que eu preciso agora', 'Talvez, se for simples de usar', 'Nunca tentei, mas tenho curiosidade'], scores: [3, 2, 2] },
  { question: 'Você gostaria de conhecer a planilha e ver como começar a organizar suas finanças?', options: ['Sim, quero conhecer', 'Sim, principalmente como usar no dia a dia', 'Quero entender melhor antes de decidir'], scores: [3, 2, 1] },
];

const bonuses = [
  { number: '01', title: 'Parcelado Nunca Mais', tag: 'MAIS CLAREZA NAS PARCELAS', text: 'Acompanhe valores, compromissos mensais e quando cada parcelamento termina. Veja o que já está comprometido antes de assumir uma nova parcela.', icon: 'card' },
  { number: '02', title: 'Anti-Impulso', tag: 'UMA PAUSA ANTES DE COMPRAR', text: 'Um apoio pelo ChatGPT para refletir antes de gastar. Coloque a compra em perspectiva e pense nas suas prioridades antes de decidir.', icon: 'spark' },
  { number: '03', title: 'Método S.O.M.', tag: 'DIREÇÃO PARA COMEÇAR', text: 'Um material de apoio para dar direção à sua organização financeira e ajudar você a transformar a intenção de começar em ação.', icon: 'steps' },
];
const faqs = [
  ['Preciso entender de números ou de planilhas?', 'Você registra suas receitas e despesas nos campos da planilha. As fórmulas e os painéis já estão preparados. A oferta inclui uma videoaula de uso e suporte pelo WhatsApp para tirar dúvidas.'],
  ['Funciona no Excel ou no Google Planilhas?', 'A versão entregue funciona no Google Planilhas. Você precisa de uma conta Google para acessar a sua cópia. Esta oferta não promete compatibilidade com o Excel.'],
  ['Ela registra meus gastos sozinha pelo WhatsApp?', 'Não. Nesta oferta, você preenche as receitas e despesas na planilha, e ela faz os cálculos e organiza a visualização. O suporte pelo WhatsApp é para dúvidas e ajuda no uso. O aplicativo Phoenix, com registro por mensagem, é um produto separado.'],
  ['Tenho pouco dinheiro. A planilha pode me ajudar?', 'Ela pode ajudar você a enxergar as receitas, despesas e compromissos que registrar. Não aumenta sua renda nem elimina dívidas sozinha: é uma ferramenta de organização para apoiar suas decisões.'],
  ['A fatura do cartão não é suficiente?', 'A fatura mostra os gastos daquele cartão. Na planilha, você pode reunir também as receitas e outras despesas que registrar, como Pix, dinheiro e contas do mês, para acompanhar o conjunto.'],
  ['O que está incluído nos R$24,90?', 'A Planilha Vida Sem Dívidas no Google Planilhas, a videoaula de uso, os bônus Parcelado Nunca Mais, Anti-Impulso e Método S.O.M., além do suporte pelo WhatsApp para dúvidas e ajuda com os materiais. Pagamento único, sem mensalidade nesta oferta.'],
  ['Como recebo o acesso?', 'Após a confirmação do pagamento, as instruções de acesso são enviadas pelos canais informados no checkout. Siga as orientações para abrir sua cópia no Google Planilhas e acessar os materiais.'],
  ['Como funciona o suporte e a garantia?', 'O suporte pelo WhatsApp ajuda com dúvidas sobre acesso, uso da planilha e materiais incluídos. Consultoria financeira individual é um serviço separado. Você tem 7 dias após a compra para solicitar o reembolso pelo canal indicado na confirmação do pedido.'],
];

function Icon({ name = 'check', className = '' }) {
  const paths = {
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    sheet: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h4" /></>,
    spark: <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />,
    steps: <><path d="M4 18h5v-5h5V8h6M16 4h4v4" /></>,
    chat: <><path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.4L3 21l2-5.5A8.5 8.5 0 1 1 21 11.5Z" /><path d="M8 10h8M8 14h5" /></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" /><path d="m8 12 3 3 5-6" /></>,
  };
  return <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.check}</svg>;
}

function Brand() {
  return <a className="brand" href="/" aria-label="Vida Sem Dívidas, início"><span className="brand-icon"><Icon name="sheet" /></span><span>vida sem dívidas<span className="brand-sub">ORGANIZAÇÃO FINANCEIRA</span></span></a>;
}

function CheckoutButton({ children = 'Quero começar a organizar meu dinheiro', placement, className = '' }) {
  const [notice, setNotice] = useState(false);
  const checkoutUrl = import.meta.env.VITE_CHECKOUT_URL;
  function checkout() {
    if (!checkoutUrl) {
      track('checkout_unavailable', { placement });
      setNotice(true);
      return;
    }
    let url;
    try { url = new URL(checkoutUrl); } catch { setNotice(true); return; }
    if (url.protocol !== 'https:') { setNotice(true); return; }
    const allowed = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'src', 'sck', 'fbclid', 'gclid', 'ttclid'];
    const params = new URLSearchParams(window.location.search);
    allowed.forEach(key => { if (params.has(key)) url.searchParams.set(key, params.get(key)); });
    track('offer_click', { offerId: 'planilha-2490', value: 24.9, currency: 'BRL', placement });
    window.location.assign(url.href);
  }
  return <div className={`checkout-control ${className}`}><button className="cta" onClick={checkout}>{children}<Icon name="arrow" /></button>{notice && <p className="checkout-notice" role="status">As vendas desta nova oferta ainda não foram abertas. Volte em breve para acessar a planilha por R$24,90.</p>}</div>;
}

export default function App() {
  const [stage, setStage] = useState(window.location.hash === '#oferta' ? 'offer' : 'hook');
  const [answers, setAnswers] = useState([]);
  const titleRef = useRef(null);
  const answerLock = useRef(false);
  const current = answers.length;
  useEffect(() => {
    document.title = 'Planilha Vida Sem Dívidas | Organize suas finanças';
    track('landing_view', { version: 'oferta-unica-2490' });
    function hashChanged() { if (window.location.hash === '#oferta') setStage('offer'); }
    window.addEventListener('hashchange', hashChanged);
    return () => window.removeEventListener('hashchange', hashChanged);
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    titleRef.current?.focus({ preventScroll: true });
    answerLock.current = false;
  }, [stage, current]);
  function start() { track('quiz_start'); setAnswers([]); setStage('quiz'); }
  function answer(index) {
    if (answerLock.current) return;
    answerLock.current = true;
    const next = [...answers, index];
    track('quiz_answer', { question: current + 1, option: index + 1 });
    setAnswers(next);
    if (next.length === questions.length) {
      track('quiz_complete', { totalScore: next.reduce((sum, value, i) => sum + questions[i].scores[value], 0), maxScore: 18 });
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#oferta`);
      setStage('offer');
    }
  }
  if (stage === 'offer') return <OfferPage answers={answers} />;
  return <div className="quiz-page"><header className="shell quiz-header"><Brand /><span className="quiet">Um passo de cada vez.</span></header><main className="quiz-main">
    {stage === 'hook' ? <section className="quiz-card hook-card"><div className="eyebrow"><span className="status-dot" /> UM COMEÇO MAIS SIMPLES</div><h1 ref={titleRef} tabIndex={-1}>Seu dinheiro merece<br /><em>um pouco mais de clareza.</em></h1><p>Responda 6 perguntas rápidas sobre a sua rotina financeira e conheça uma forma de começar a se organizar.</p><div className="hook-preview"><img src="/planilha.png" alt="Prévia da Planilha Vida Sem Dívidas com painel de receitas, despesas e orçamento" width="1000" height="750" fetchPriority="high" /></div><button className="cta" onClick={start}>Iniciar diagnóstico financeiro<Icon name="arrow" /></button><span className="quiz-note">6 perguntas · Sem informar renda ou dados bancários</span></section>
    : <section className="quiz-card question-card"><div className="question-top"><span className="eyebrow">SUA ROTINA FINANCEIRA</span><span>{current + 1} <span className="muted">/ {questions.length}</span></span></div><div className="progress" role="progressbar" aria-label="Progresso do questionário" aria-valuemin={0} aria-valuemax={6} aria-valuenow={current}><span style={{width: `${current / questions.length * 100}%`}} /></div><h1 ref={titleRef} tabIndex={-1}>{questions[current].question}</h1><p className="question-description">Escolha o que mais se parece com você. Sem julgamento.</p><div className="options">{questions[current].options.map((option, index) => <button key={`${current}-${index}`} onClick={() => answer(index)}><span className="option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span><Icon name="arrow" /></button>)}</div><div className="question-bottom">{current > 0 ? <button className="back-button" onClick={() => { track('quiz_back', {question: current + 1}); setAnswers(answers.slice(0, -1)); }}>← Voltar</button> : <span />}<span>Não existe resposta certa ou errada.</span></div></section>}
    </main><footer className="quiz-footer">Vida Sem Dívidas · Organização começa com o primeiro passo.</footer></div>;
}

function OfferPage({ answers }) {
  const [zoom, setZoom] = useState(false);
  const dialogRef = useRef(null);
  useEffect(() => { track('offer_view', { offerId: 'planilha-2490', completedQuiz: answers.length === 6 }); }, [answers.length]);
  useEffect(() => { if (zoom) dialogRef.current?.showModal(); else dialogRef.current?.close(); }, [zoom]);
  const summary = answers.length === 6 ? (answers[0] === 1 && answers[1] === 1 ? 'Você já acompanha seus gastos. Uma visão organizada pode ajudar a manter essa rotina.' : 'Pelas suas respostas, ter uma visão mais organizada pode ser um bom próximo passo.') : 'Conheça uma ferramenta para começar a organizar suas receitas e despesas.';
  return <div className="offer-page"><a className="skip-link" href="#conteudo">Ir para o conteúdo</a><header className="site-header"><div className="shell nav-row"><Brand /><a className="nav-cta" href="#pacote">Conhecer a oferta<Icon name="arrow" /></a></div></header><main id="conteudo">
    <section className="hero shell"><div className="hero-copy"><div className="eyebrow"><span className="status-dot" /> SEU PRÓXIMO PASSO COMEÇA AQUI</div><h1>Seu dinheiro<br />mais claro.<br /><em>Sua vida mais leve.</em></h1><p className="hero-description">Entenda para onde seu dinheiro está indo e dê o primeiro passo para organizar suas finanças. Sem precisar montar uma planilha do zero.</p><div className="hero-price"><span>Planilha + 3 bônus + suporte</span><strong>R$24,90 <small>/ pagamento único</small></strong></div><CheckoutButton placement="hero" /><div className="trust-line"><span><Icon name="check" /> Google Planilhas</span><span><Icon name="shield" /> Garantia de 7 dias</span></div></div><div className="hero-visual"><div className="visual-glow" /><div className="visual-orbit" /><span className="visual-label">PLANILHA VIDA SEM DÍVIDAS</span><div className="product-frame"><div className="window-bar"><span /><span /><span /><small>Uma visão mais clara das suas finanças</small></div><img src="/planilha.png" alt="Imagem da planilha mostrando entradas, gastos, contas e painel de orçamento; valores ilustrativos" width="1000" height="750" fetchPriority="high" /></div><div className="visual-foot"><span className="tiny-cross">+</span><p>Receitas, despesas e orçamento.<br /><strong>Um lugar para enxergar o conjunto.</strong></p><span className="visual-index">01 / CLAREZA</span></div></div></section>
    <div className="feature-strip"><div className="shell"><span><Icon name="sheet" /> Google Planilhas</span><span><Icon name="check" /> Pagamento único</span><span><Icon name="chat" /> Suporte no WhatsApp</span><span><Icon name="shield" /> 7 dias de garantia</span></div></div>
    <section className="section shell intro"><div><span className="eyebrow">MAIS CLAREZA. MENOS ACHISMO.</span><h2>Olhar para suas finanças<br />pode começar <em>sem complicar.</em></h2></div><div className="intro-copy"><p className="personal-summary">{summary}</p><p>Se hoje você se orienta pela fatura, pelo extrato ou pela memória, pode ser difícil enxergar tudo junto. A planilha reúne as informações que você registra para ajudar a acompanhar o mês.</p><p className="subtle">Você não precisa resolver tudo hoje. Pode começar entendendo o que entra e o que sai.</p></div></section>
    <section className="section shell demo-section" id="como-funciona"><div className="section-top"><div><span className="eyebrow">DO REGISTRO À VISÃO DO MÊS</span><h2>Você preenche.<br /><em>A planilha faz os cálculos.</em></h2></div><p>Uma ferramenta pronta no Google Planilhas.<br />Você registra as informações; os painéis ajudam a visualizar.</p></div><div className="demo-grid"><button className="demo-image" onClick={() => setZoom(true)} aria-label="Ampliar imagem da planilha"><img src="/planilha.png" alt="Prévia do painel da planilha, com receitas, gastos, contas e gráficos de orçamento" width="1000" height="750" loading="lazy" /><span>Ampliar prévia <span aria-hidden="true">↗</span></span></button><div className="steps"><article><span>01</span><div><h3>Registre o que entra e sai</h3><p>Preencha suas receitas e despesas nos campos da planilha.</p></div></article><article><span>02</span><div><h3>Enxergue o seu mês</h3><p>Acompanhe as informações organizadas nos cálculos e painéis.</p></div></article><article><span>03</span><div><h3>Decida com mais informação</h3><p>Use essa visão para pensar nas suas prioridades e compromissos.</p></div></article><div className="help-mini"><Icon name="chat" /><p>Dúvida para começar?<br /><strong>Você tem videoaula e suporte no WhatsApp.</strong></p></div></div></div><p className="image-caption">Prévia do produto com valores ilustrativos. O preenchimento desta oferta é manual, com cálculos automáticos.</p></section>
    <section className="bonuses-section"><div className="shell section"><span className="eyebrow">JUNTOS COM A SUA PLANILHA</span><h2>Três apoios para<br /><em>o seu próximo passo.</em></h2><p className="section-lead">Os três bônus estão incluídos nos R$24,90.</p><div className="bonus-grid">{bonuses.map(b => <article className="bonus-card" key={b.number}><div className="bonus-top"><Icon name={b.icon} /><span>BÔNUS {b.number}</span></div><span className="bonus-tag">{b.tag}</span><h3>{b.title}</h3><p>{b.text}</p><div className="included"><Icon name="check" /> Incluído na oferta</div></article>)}</div><div className="support-card"><span className="support-icon"><Icon name="chat" /></span><div><span className="eyebrow">E VOCÊ TEM COM QUEM CONTAR</span><h3>Suporte de verdade, pelo WhatsApp.</h3><p>Ajuda com acesso, uso da planilha e dúvidas sobre os materiais. Para você dar o primeiro passo com orientação.</p></div><span className="support-label">INCLUÍDO</span></div></div></section>
    <section className="section shell testimonials"><div className="section-top"><div><span className="eyebrow">MENSAGENS REAIS DE CLIENTES</span><h2>Quando surge uma dúvida,<br /><em>o atendimento faz diferença.</em></h2></div><p>Trechos de conversas de atendimento<br />enviadas pelos próprios clientes.</p></div><div className="quote-grid"><figure><span className="quote-mark">“</span><blockquote>Suporte muito bom de vcs</blockquote><figcaption>Mensagem recebida no WhatsApp<span>Sobre o atendimento</span></figcaption></figure><figure><span className="quote-mark">“</span><blockquote>Obrigada pelo atendimento<br />Excelente!</blockquote><figcaption>Mensagem recebida no WhatsApp<span>Sobre o atendimento</span></figcaption></figure><figure><span className="quote-mark">“</span><blockquote>Maravilha..deu certo, muito obrigada 🤝</blockquote><figcaption>Mensagem recebida no WhatsApp<span>Após ajuda no uso</span></figcaption></figure></div><p className="image-caption">Relatos sobre suporte e uso. Não representam promessa de economia ou de quitação de dívidas.</p></section>
    <section className="section shell package-section" id="pacote"><div className="package-story"><span className="eyebrow">UM PASSO POSSÍVEL, HOJE</span><h2>Comece pelo que<br />você pode enxergar.<br /><em>O seu dinheiro.</em></h2><p>Não precisa ser perfeito. Ter um lugar para registrar e acompanhar já é uma forma de começar.</p><div className="guarantee"><span><Icon name="shield" /></span><div><h3>7 dias para experimentar</h3><p>Se a ferramenta não fizer sentido para você, solicite o reembolso dentro de 7 dias após a compra.</p></div></div></div><div className="package-card"><span className="eyebrow">SUA OFERTA COMPLETA</span><h3>Planilha Vida Sem Dívidas</h3><p>Organização financeira no Google Planilhas.</p><ul>{['Planilha financeira pronta para preencher', 'Videoaula ensinando a usar', 'Bônus Parcelado Nunca Mais', 'Bônus Anti-Impulso', 'Bônus Método S.O.M.', 'Suporte pelo WhatsApp para dúvidas'].map(item => <li key={item}><Icon name="check" />{item}</li>)}</ul><div className="package-price"><span>Tudo incluído por</span><strong><small>R$</small>24<span>,90</span></strong><p>Pagamento único · Sem mensalidade</p></div><CheckoutButton placement="package" /><span className="package-footnote"><Icon name="shield" /> Garantia de 7 dias após a compra</span></div></section>
    <section className="section shell faq-section"><div><span className="eyebrow">ANTES DE COMEÇAR</span><h2>Suas dúvidas.<br /><em>Respostas claras.</em></h2></div><div className="faq-list">{faqs.map(([q,a]) => <details key={q} onToggle={event => {if (event.currentTarget.open) track('faq_open', {question: q});}}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></section>
    <section className="final-cta shell"><span className="eyebrow">CLAREZA PARA DAR O PRIMEIRO PASSO</span><h2>Seu próximo mês pode começar<br /><em>com mais organização.</em></h2><p>Planilha + 3 bônus + suporte. R$24,90, pagamento único.</p><CheckoutButton placement="final" /></section>
    </main><footer className="site-footer shell"><Brand /><p>Ferramenta de organização financeira. Os resultados dependem do preenchimento e das decisões de cada pessoa.</p><span>© {new Date().getFullYear()} Vida Sem Dívidas</span></footer><div className="mobile-purchase"><div><span>Oferta completa</span><strong>R$24,90 <small>único</small></strong></div><a href="#pacote">Ver oferta<Icon name="arrow" /></a></div><dialog className="preview-dialog" ref={dialogRef} onClose={() => setZoom(false)} onClick={event => { if (event.target === event.currentTarget) setZoom(false); }}><button className="dialog-close" onClick={() => setZoom(false)} aria-label="Fechar prévia">Fechar ×</button><img src="/planilha.png" alt="Imagem ampliada da planilha financeira. Valores ilustrativos." width="1000" height="750" /><p>Prévia do produto · Google Planilhas</p></dialog></div>;
}
