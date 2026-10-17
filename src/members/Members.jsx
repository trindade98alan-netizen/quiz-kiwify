import { useEffect, useRef, useState } from 'react';
import './members.css';
import { authClient, memberFetch } from './auth';
import { withDeadline, fetchWithDeadline, accessErrorMessage, ACCESS_SLOW_MESSAGE } from '../../shared/request.mjs';

const preview = window.location.pathname.startsWith('/membros/previa');
const lessons = [
  {id:'aula',tag:'COMECE POR AQUI',title:'Seu primeiro passo',subtitle:'Do primeiro acesso ao controle do seu mês.',type:'VIDEOAULA',image:'/planilha-em-casa.webp'},
  {id:'sistema',tag:'SUA FERRAMENTA',title:'Seu sistema financeiro',subtitle:'Abra sua cópia e deixe as contas com ele.',type:'GOOGLE PLANILHAS',image:'/membros/sistema.webp'},
  {id:'parcelado',tag:'BÔNUS 01',title:'Parcelado Nunca Mais',subtitle:'Veja quanto do seu próximo mês já tem dono.',type:'PDF · 14 PÁGINAS',image:'/membros/parcelado.jpg'},
  {id:'anti',tag:'BÔNUS 02',title:'Anti-Impulso',subtitle:'A vontade passa. A conta fica. Decida melhor.',type:'PDF · 15 PÁGINAS',image:'/membros/anti.jpg'},
  {id:'som',tag:'BÔNUS 03',title:'Método S.O.M.',subtitle:'Sonho, objetivo e meta. Um caminho possível.',type:'PDF · 14 PÁGINAS',image:'/membros/som.jpg'},
];
const supportUrl = 'https://wa.me/557799789074';
const steps = [
  ['Entre na sua conta Google','Use a conta em que você quer guardar seu controle financeiro. O e-mail do Google pode ser diferente do e-mail da compra.'],
  ['Crie a sua cópia','Clique em “Abrir meu sistema” e, na tela do Google, em “Fazer uma cópia”. Essa etapa cria um arquivo só seu, que você pode preencher.'],
  ['Abra o mês em que vai começar','As abas vão de janeiro de 2026 a dezembro de 2027. Comece pelo mês atual. Você não precisa preencher o passado para começar.'],
  ['Anote o que entra e o que sai','Siga a videoaula, preencha os campos indicados e preserve as fórmulas. Use seus números, mesmo que no começo falte alguma informação.'],
];
async function api(action, body) {
  return withDeadline((async()=>{
  const response = await memberFetch(action, body);
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.message || 'Não foi possível concluir agora. Tente novamente.'), {status:response.status});
  return data;
  })());
}
function Icon({name,size=20}) {
  const paths = {play:<path d="m9 5 10 7-10 7V5Z"/>,arrow:<><path d="M5 12h14m-6-6 6 6-6 6"/></>,check:<path d="m5 12 4 4L19 6"/>,lock:<><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,download:<><path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/></>,close:<path d="m6 6 12 12M6 18 18 6"/>,mail:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></>,help:<><path d="M21 11.5a9 9 0 0 1-9 9H4l-2 2V12a10 10 0 0 1 19-.5Z"/><path d="M8 9a3 3 0 1 1 5 2c-1 1-1 1-1 3m0 2v1"/></>,logout:<><path d="M9 4H4v16h5m6-13 5 5-5 5m-7-5h12"/></>};
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={name==='play'?'currentColor':'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function Brand() { return <a href="/membros" className="m-brand" aria-label="Sistema Vida Sem Dívidas, início"><span className="m-brand-mark">V<span>✓</span></span><span>VIDA SEM DÍVIDAS<small>SEU ESPAÇO. SEU RECOMEÇO.</small></span></a>; }
function Support({children='Preciso de ajuda',className=''}) {return <a className={`m-support ${className}`} href={supportUrl} target="_blank" rel="noopener noreferrer"><Icon name="help"/>{children}</a>;}

function Login({onSuccess,initialError}) {
  const resetToken = new URLSearchParams(window.location.search).get('token');
  const [mode,setMode]=useState(()=>{if(resetToken)return 'reset';try{return localStorage.getItem('vsd-member-returning')==='true'?'login':'signup';}catch{return 'signup';}});
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [confirm,setConfirm]=useState('');
  const [busy,setBusy]=useState(false); const [error,setError]=useState(initialError||''); const [notice,setNotice]=useState('');
  const isNew=mode==='signup'; const isReset=mode==='reset'; const isForgot=mode==='forgot';
  const changeMode=value=>{setMode(value);setError('');setNotice('');setPassword('');setConfirm('');};
  async function submit(e) {
    e.preventDefault();setError('');setNotice('');setBusy(true);
    try {
      const config=await withDeadline((async()=>{
        const response=await fetchWithDeadline('/api/membros?action=configuracao');
        const data=await response.json();
        if(!response.ok)throw Object.assign(new Error(data.message||ACCESS_SLOW_MESSAGE),{status:response.status});
        return data;
      })());
      if(!config.ready)throw new Error('Estamos preparando a liberação do acesso. Se já comprou, fale com o suporte pelo WhatsApp.');
      if((isNew||isReset)&&password!==confirm)throw new Error('As senhas não estão iguais. Confira e tente novamente.');
      const address=email.trim().toLowerCase();
      let result;
      if(isForgot) {
        result=await withDeadline(authClient.requestPasswordReset({email:address,redirectTo:window.location.origin+'/membros?recuperar=1'}),16000);
      } else if(isReset) {
        result=await withDeadline(authClient.resetPassword({newPassword:password,token:resetToken}),16000);
      } else if(isNew) {
        result=await withDeadline(authClient.signUp.email({email:address,password,name:address.split('@')[0],...(config.requireVerified!==false?{callbackURL:window.location.origin+'/membros'}:{})}),16000);
      } else {
        result=await withDeadline(authClient.signIn.email({email:address,password}),16000);
      }
      if(result.error) {
        if(result.error.status>=500||result.error.status===0||['REQUEST_TIMEOUT','NETWORK_ERROR','ERR_NETWORK'].includes(result.error.code))throw Object.assign(new Error(ACCESS_SLOW_MESSAGE),{status:503});
        if(result.error.code==='EMAIL_NOT_VERIFIED')throw new Error('Abra o link de confirmação enviado para seu e-mail antes de entrar. Confira também o spam.');
        if(isNew&&['USER_ALREADY_EXISTS','USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL','EMAIL_ALREADY_EXISTS'].includes(result.error.code)){changeMode('login');throw new Error('Você já tem uma senha. Entre com o e-mail da compra e a senha que criou. Se não lembrar, use “Esqueci minha senha”.');}
        throw new Error(isForgot||isReset?'Não foi possível concluir. Tente novamente ou fale com o suporte.':'Confira seu e-mail e sua senha. Se este é seu primeiro acesso, clique em “Criar minha senha”.');
      }
      setPassword('');setConfirm('');
      if(isForgot){setNotice('Se houver uma conta para este e-mail, você receberá um link para criar uma nova senha. Confira também o spam.');return;}
      if(isReset){window.history.replaceState(null,'','/membros');setMode('login');setNotice('Senha atualizada. Agora entre com seu e-mail e a nova senha.');return;}
      if(isNew&&config.requireVerified!==false){setMode('login');setNotice('Confira seu e-mail e abra o link de confirmação. Depois, entre com a senha que você acabou de criar.');return;}
      if(isNew){
        const login=await withDeadline(authClient.signIn.email({email:address,password}),16000);
        if(login.error){if(login.error.status>=500||login.error.status===0)throw Object.assign(new Error(ACCESS_SLOW_MESSAGE),{status:503});setMode('login');throw new Error('Sua conta foi criada. Entre com o e-mail da compra e a senha que você escolheu.');}
      }
      const session=await api('sessao');
      try{localStorage.setItem('vsd-member-returning','true');}catch{/* Device preference is optional. */}
      onSuccess(session);
    } catch(err){setError(accessErrorMessage(err));} finally {setBusy(false);}
  }
  const title=isNew?'Crie sua senha.':isReset?'Sua nova senha.':isForgot?'Vamos recuperar?':'Vamos começar?';
  const description=isNew?'Use o mesmo e-mail da compra e escolha uma senha para acessar seus materiais.':isReset?'Escolha uma nova senha para voltar à sua área.':isForgot?'Informe o e-mail da compra para receber o link de recuperação.':'Entre com o e-mail da compra e a sua senha. Seus materiais estão esperando por você.';
  return <div className="m-login"><div className="m-login-photo" role="img" aria-label="Controle financeiro no computador em casa"/><header className="m-login-header"><Brand/><Support/></header><main className="m-login-layout"><section className="m-login-story"><span className="m-eyebrow"><i/>BEM-VINDO AO SEU NOVO COMEÇO</span><h1>O CONTROLE<br/>COMEÇA<br/><em>COM VOCÊ.</em></h1><p>Seu sistema, sua videoaula e seus bônus.<br/>Tudo junto. Do seu jeito. Um passo de cada vez.</p><div className="m-login-included"><span><Icon name="check"/>Sistema pronto</span><span><Icon name="check"/>3 bônus incluídos</span><span><Icon name="check"/>Ajuda no WhatsApp</span></div></section><section className="m-login-card"><div className="m-login-lock"><Icon name={isForgot?'mail':'lock'} size={26}/></div><span className="m-eyebrow">{isNew?'PRIMEIRO ACESSO':'SEU ACESSO'}</span><h2>{title}</h2><p>{description}</p><form onSubmit={submit}>{!isReset&&<><label htmlFor="member-email">E-mail da compra</label><input id="member-email" type="email" autoComplete="email" placeholder="seunome@email.com" value={email} onChange={e=>setEmail(e.target.value)} required disabled={busy} maxLength={254}/></>}{!isForgot&&<><label htmlFor="member-password">{isNew||isReset?'Crie sua senha':'Sua senha'}</label><input id="member-password" type="password" autoComplete={isNew||isReset?'new-password':'current-password'} placeholder={isNew||isReset?'Pelo menos 8 caracteres':'Digite sua senha'} value={password} onChange={e=>setPassword(e.target.value)} minLength={8} maxLength={128} required disabled={busy}/>{(isNew||isReset)&&<><label htmlFor="member-confirm">Repita sua senha</label><input id="member-confirm" type="password" autoComplete="new-password" placeholder="Digite a mesma senha" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={8} maxLength={128} required disabled={busy}/></>}</>}{error&&<p className="m-form-error" role="alert">{error}</p>}{notice&&<p className="m-action-notice" role="status">{notice}</p>}<button className="m-button m-button-wide" disabled={busy}>{busy?'Só um instante…':isNew?'Criar minha senha':isReset?'Salvar nova senha':isForgot?'Receber link de recuperação':'Entrar na minha área'}<Icon name="arrow"/></button></form><div className="m-login-actions">{mode==='login'?<><button onClick={()=>changeMode('signup')} disabled={busy}>Primeiro acesso? Criar minha senha</button><button onClick={()=>changeMode('forgot')} disabled={busy}>Esqueci minha senha</button></>:<button onClick={()=>changeMode('login')} disabled={busy}>Já tenho senha. Quero entrar</button>}</div><p className="m-private-note"><Icon name="lock" size={14}/>Acesso exclusivo para quem tem a compra aprovada.</p><div className="m-login-help"><p>Comprou e não conseguiu entrar?</p><Support>Fale com o suporte</Support></div></section></main><footer className="m-login-footer">SISTEMA VIDA SEM DÍVIDAS <span>Um passo de cada vez. Uma escolha melhor por dia.</span></footer></div>;
}
function LessonDialog({lesson,content,completed,onClose,onComplete,previewMode}) {
  const dialogRef=useRef(null); const lastFocus=useRef(document.activeElement); const [notice,setNotice]=useState('');
  useEffect(()=>{const dialog=dialogRef.current;dialog.showModal();return()=>{dialog.close();lastFocus.current?.focus();};},[]);
  const protectedAction=async(key)=>{
    if(previewMode){setNotice('Esta é uma prévia do visual. Os materiais ficam disponíveis na área com acesso confirmado.');return;}
    const url=content[key];
    if(!url){setNotice('Este material ainda está sendo preparado. Fale com o suporte.');return;}
    if(key==='sheetUrl'){window.open(url,'_blank','noopener,noreferrer');return;}
    setNotice('Preparando seu PDF…');
    try {
      const response=await memberFetch(`arquivo&id=${key}`);
      if(!response.ok){const data=await response.json();throw new Error(data.message||'Não foi possível baixar agora.');}
      const fileUrl=URL.createObjectURL(await response.blob());const link=document.createElement('a');
      link.href=fileUrl;link.download=`${lesson.title}.pdf`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(fileUrl),30000);setNotice('Seu PDF foi baixado.');
    } catch(err){setNotice(err.message);}
  };
  return <dialog className="m-dialog" ref={dialogRef} onCancel={onClose} onClick={e=>{if(e.target===dialogRef.current)onClose();}} aria-labelledby="lesson-title"><button className="m-close" onClick={onClose} aria-label="Fechar material"><Icon name="close"/></button><div className="m-dialog-art" style={{backgroundImage:`linear-gradient(0deg,#141719,transparent), url(${lesson.image})`}}/><div className="m-dialog-body"><span className="m-eyebrow">{lesson.tag}</span><h2 id="lesson-title">{lesson.title}</h2><p>{lesson.subtitle}</p>{lesson.id==='aula'?<><div className="m-video">{!previewMode&&content.videoId?<iframe src={`https://www.youtube-nocookie.com/embed/${content.videoId}?rel=0`} title="Videoaula: como usar o Sistema Vida Sem Dívidas" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<div className="m-video-placeholder"><Icon name="play" size={36}/><p>{previewMode?'Sua videoaula aparece aqui.':'A videoaula está sendo preparada.'}</p><small>{previewMode?'Visualização da área de membros':'Se precisar, fale com o suporte.'}</small></div>}</div><h3>Assista com sua cópia aberta.</h3><p>Pause o vídeo quando precisar e acompanhe os passos com calma. Você não precisa dominar tudo hoje: comece pelo mês atual e pelos seus primeiros lançamentos.</p><button className="m-button" onClick={()=>protectedAction('sheetUrl')}>Abrir meu sistema<Icon name="arrow"/></button></>:lesson.id==='sistema'?<><p>Você vai criar uma cópia só sua no Google Planilhas. O arquivo original continua protegido, e a sua cópia fica disponível para preencher.</p><button className="m-button" onClick={()=>protectedAction('sheetUrl')}>Abrir meu sistema<Icon name="arrow"/></button><ol className="m-dialog-steps">{steps.map(([title,text])=><li key={title}><strong>{title}</strong><p>{text}</p></li>)}</ol><div className="m-note">No celular, prefira o aplicativo Google Planilhas. Se a cópia não abrir como esperado, tente o navegador e confirme a conta Google em uso.</div></>:<><p>{lesson.id==='parcelado'?'Um guia para entender as parcelas que já existem, comparar o custo das próximas compras e montar seu mapa de compromissos.':lesson.id==='anti'?'Crie uma pausa entre sentir vontade e pagar. Inclui exemplos, diário de decisões e um roteiro completo para copiar e usar no ChatGPT.':'Transforme seu sonho em objetivos e cada objetivo em metas. Veja exemplos de famílias, faça as contas e monte seu próprio caminho.'}</p><button className="m-button" onClick={()=>protectedAction(lesson.id)}>Baixar meu bônus<Icon name="download"/></button><div className="m-note">Leia no seu ritmo. Use as fichas do PDF para aplicar o conteúdo no seu mês, em um caderno ou com apoio da sua planilha.</div></>}{notice&&<p className="m-action-notice" role="status">{notice}</p>}<div className="m-dialog-bottom"><button className={`m-complete ${completed?'is-done':''}`} onClick={()=>onComplete(lesson.id,!completed)}><Icon name="check"/>{completed?'Concluído · marcar para rever':'Marcar como concluído'}</button><Support/></div></div></dialog>;
}
function Library({session,onLogout}) {
  const [active,setActive]=useState(null); const [done,setDone]=useState(session.completed||[]); const [notice,setNotice]=useState(''); const [saving,setSaving]=useState(false);
  const content=session.content||{}; const count=done.length;const next=lessons.find(l=>!done.includes(l.id))||lessons[0];
  async function complete(id,value){if(saving)return;const updated=value?[...new Set([...done,id])]:done.filter(x=>x!==id);if(preview){setDone(updated);return;}setSaving(true);try{await api('progresso',{completed:updated});setDone(updated);}catch(err){setNotice(err.message);}finally{setSaving(false);}}
  return <div className="m-library">{preview&&<div className="m-preview-banner"><Icon name="lock" size={14}/><span>PRÉVIA DO VISUAL · Os materiais e o acesso de clientes continuam protegidos.</span><a href="/membros">Ver tela de login<Icon name="arrow" size={14}/></a></div>}<header className="m-header"><Brand/><nav aria-label="Navegação da área de membros"><a href="#inicio" className="is-active">Início</a><a href="#materiais">Meus materiais</a><a href="#primeiros-passos">Como começar</a></nav><div className="m-user"><span className="m-avatar">{preview?'A':(session.email?.[0]||'V').toUpperCase()}</span><button onClick={onLogout} aria-label="Sair da área de membros"><Icon name="logout"/></button></div></header><main><section className="m-hero" id="inicio"><img src="/planilha-em-casa.webp" alt="Organização das finanças de casa com o computador e o celular" width="1536" height="1024" fetchPriority="high"/><div className="m-hero-overlay"/><div className="m-hero-copy"><span className="m-eyebrow"><i/>SEU RECOMEÇO JÁ COMEÇOU</span><h1>O DINHEIRO É SEU.<br/><em>O CONTROLE TAMBÉM.</em></h1><p>Que bom ter você aqui. Vamos tirar as contas da cabeça e começar a organizar seu mês, um passo de cada vez.</p><div className="m-hero-actions"><button className="m-button" onClick={()=>setActive(lessons[0])}><Icon name="play"/>Assistir à primeira aula</button><button className="m-button m-button-glass" onClick={()=>setActive(lessons[1])}>Abrir meu sistema<Icon name="arrow"/></button></div><p className="m-hero-facts"><span>Google Planilhas</span><span>Celular e computador</span><span>Sem fórmulas para montar</span></p></div><div className="m-hero-index"><span>01</span><small>PRIMEIRO PASSO<br/>COMECE PELO SIMPLES.</small></div></section><div className="m-content"><section className="m-continue" aria-label="Seu progresso"><div className="m-continue-icon"><Icon name={count===5?'check':'play'} size={23}/></div><div className="m-continue-copy"><span className="m-eyebrow">{count===5?'VOCÊ DEU OS PRIMEIROS PASSOS':'NO SEU RITMO'}</span><h2>{count===0?'Seu primeiro passo está aqui.':count===5?'Agora é colocar em prática.':'Continue de onde parou.'}</h2><p>{count===0?'Assista à aula e crie sua própria cópia.':`${count} de 5 materiais marcados como concluídos.`}</p></div><div className="m-progress"><div><span>SEU CAMINHO</span><strong>{count}/5</strong></div><div className="m-progress-track"><span style={{width:`${count/5*100}%`}}/></div></div><button className="m-continue-button" onClick={()=>setActive(next)} aria-label={`Continuar: ${next.title}`}><Icon name="arrow" size={25}/></button></section>{notice&&<p className="m-action-notice" role="status">{notice}</p>}<section id="materiais" className="m-materials"><div className="m-section-heading"><div><span className="m-eyebrow">TUDO O QUE É SEU, AQUI</span><h2>Sua próxima escolha pode ser melhor.</h2></div><span className="m-count">05 MATERIAIS</span></div><div className="m-material-grid">{lessons.map((l,i)=><button className={`m-material m-material-${l.id}`} key={l.id} onClick={()=>setActive(l)}><div className="m-poster"><img src={l.image} alt="" loading="lazy" decoding="async"/><span className="m-card-index">{String(i+1).padStart(2,'0')}</span><span className="m-card-type">{l.type}</span>{l.id==='aula'&&<span className="m-card-play"><Icon name="play" size={27}/></span>}<span className="m-card-open"><Icon name={l.id==='aula'?'play':'arrow'}/></span>{done.includes(l.id)&&<span className="m-card-done"><Icon name="check" size={14}/>Concluído</span>}</div><span className="m-card-label">{l.tag}</span><h3>{l.title}</h3><p>{l.subtitle}</p></button>)}</div></section><section className="m-start" id="primeiros-passos"><div className="m-start-intro"><span className="m-eyebrow">SEM COMPLICAÇÃO</span><h2>NÃO PRECISA<br/>SABER TUDO.<br/><em>SÓ COMEÇAR.</em></h2><p>Abra sua cópia, acompanhe a aula e preencha o que você já sabe. O resto a gente vai ajustando.</p><button className="m-text-button" onClick={()=>setActive(lessons[1])}>Ver o passo a passo<Icon name="arrow"/></button></div><ol className="m-step-list">{steps.map(([title,text],i)=><li key={title}><span>{String(i+1).padStart(2,'0')}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol></section><section className="m-help-card"><div className="m-help-icon"><Icon name="help" size={34}/></div><div><span className="m-eyebrow">TRAVOU EM ALGUMA PARTE?</span><h2>Você não precisa se virar sozinho.</h2><p>Chame no WhatsApp para tirar dúvidas sobre o acesso, a planilha e os materiais.</p></div><Support>Chamar no WhatsApp<Icon name="arrow"/></Support></section></div></main><footer className="m-footer"><Brand/><p>Uma escolha melhor por dia.<br/>Seu dinheiro merece atenção. Você também.</p><span>© {new Date().getFullYear()} Sistema Vida Sem Dívidas</span></footer>{active&&<LessonDialog key={active.id} lesson={active} content={content} completed={done.includes(active.id)} onClose={()=>setActive(null)} onComplete={complete} previewMode={preview}/>}</div>;
}
export default function Members() {
  const [state,setState]=useState(preview?{status:'ready',session:{email:'alan@exemplo.com',completed:[]}}:{status:'loading'});
  useEffect(()=>{document.title='Sua área de membros | Sistema Vida Sem Dívidas';if(preview)return;let alive=true;api('sessao').then(data=>{if(alive)setState({status:'ready',session:data});}).catch(error=>{if(alive)setState({status:'login',error:error.status===401?null:accessErrorMessage(error)});});return()=>{alive=false;};},[]);
  async function logout(){if(preview){window.location.assign('/membros');return;}try{const result=await withDeadline(authClient.signOut(),16000);if(result.error)throw result.error;setState({status:'login'});}catch{setState(s=>({...s,error:'Não foi possível sair agora. Tente novamente.'}));}}
  if(state.status==='loading')return <div className="m-loading"><Brand/><div className="m-spinner"/><p>Preparando seu espaço…</p></div>;
  if(state.status==='ready')return <><Library session={state.session} onLogout={logout}/>{state.error&&<p className="m-global-error" role="alert">{state.error}</p>}</>;
  return <Login initialError={state.error} onSuccess={session=>setState({status:'ready',session})}/>;
}
