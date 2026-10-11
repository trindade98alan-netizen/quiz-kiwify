import React from "react";
import ReactDOM from "react-dom/client";
const isMembers = /^\/membros(?:\/|$)/.test(window.location.pathname);
const root = ReactDOM.createRoot(document.getElementById('root'));
if (isMembers) root.render(<main role="status" style={{minHeight:'100vh',display:'grid',placeContent:'center',padding:24,boxSizing:'border-box',background:'#0b0e11',color:'#ffcf33',fontFamily:'Arial, sans-serif',textAlign:'center'}}><strong>VIDA SEM DÍVIDAS</strong><p style={{color:'#fff'}}>Preparando seu espaço…</p></main>);
const component = isMembers
  ? import('./members/Members.jsx')
  : Promise.all([import('./App.jsx'), import('./index.css')]).then(([app]) => app);
component.then(({default:Page}) => {
  root.render(<React.StrictMode><Page /></React.StrictMode>);
}).catch(() => {
  root.render(<main role="alert" style={{minHeight:'100vh',display:'grid',placeContent:'center',padding:24,boxSizing:'border-box',background:'#0b0e11',color:'#fff',fontFamily:'Arial, sans-serif',textAlign:'center'}}><h1>Vamos tentar de novo?</h1><p>A conexão não carregou a página inteira.</p><button onClick={()=>window.location.reload()} style={{padding:16,fontSize:16,background:'#ffcf33',color:'#111',border:0,borderRadius:8,cursor:'pointer'}}>Carregar novamente</button></main>);
});
