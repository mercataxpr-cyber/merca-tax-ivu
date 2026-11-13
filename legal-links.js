(function(){
  'use strict';
  if(window.__MERCATAX_LEGAL_LINKS_BOOTSTRAPPED__) return;
  window.__MERCATAX_LEGAL_LINKS_BOOTSTRAPPED__=true;
  function createLink(href,label){
    var a=document.createElement('a');
    a.href=href;
    a.textContent=label;
    a.style.cssText='color:#f8fafc;text-decoration:none;font-weight:800;font-size:13px;line-height:1.35';
    return a;
  }
  function installFooter(){
    if(document.getElementById('mtLegalLinks')) return;
    var footer=document.querySelector('.footer')||document.getElementById('footerText');
    if(!footer) return;
    var nav=document.createElement('nav');
    nav.id='mtLegalLinks';
    nav.setAttribute('aria-label','Legal');
    nav.style.cssText='display:flex;flex-wrap:wrap;justify-content:center;gap:10px 22px;margin:16px auto 4px;padding:14px 12px;border-top:1px solid rgba(255,255,255,.12);max-width:860px';
    nav.appendChild(createLink('terms.html','Términos y Condiciones'));
    nav.appendChild(createLink('privacy.html','Política de Privacidad'));
    if(footer.parentNode) footer.parentNode.insertBefore(nav,footer.nextSibling);
  }
  // The three-dot menu owns its Privacidad / Términos entries (src/mobile-vnext-ui.js);
  // this runtime only provides the footer legal navigation.
  function install(){installFooter()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
})();
