/* MercaTax IVU PR — TEKI report/menu presentation hardening R5. */
(function installTekiReportFixR5() {
  'use strict';

  const REPORT_FIX_ID = 'teki-report-screen-r4';
  const MENU_CLOSE_ATTR = 'data-teki-menu-close-r5';

  function modalIsOpen() {
    const modal = document.getElementById('modal');
    return !!modal && getComputedStyle(modal).display !== 'none';
  }

  function closeModal() {
    if (typeof window.closeDialog === 'function') window.closeDialog();
  }

  function getMenu() {
    return document.querySelector('#menu.vxMenu, .menu.vxMenu, #menu.menu, #menu');
  }

  function menuIsOpen() {
    const menu = getMenu();
    return !!menu && getComputedStyle(menu).display !== 'none';
  }

  function closeMenu() {
    const menu = getMenu();
    if (menu) menu.style.display = 'none';
  }

  function ensureMenuCloseControl() {
    const menu = getMenu();
    if (!menu || menu.querySelector('[' + MENU_CLOSE_ATTR + ']')) return;

    menu.style.position = 'absolute';
    menu.style.paddingTop = '62px';

    const control = document.createElement('div');
    control.setAttribute(MENU_CLOSE_ATTR, 'true');
    control.setAttribute('role', 'button');
    control.setAttribute('tabindex', '0');
    control.setAttribute('aria-label', 'Cerrar menú');
    control.setAttribute('title', 'Cerrar menú');
    control.textContent = '×';
    control.style.cssText = 'all:initial;position:absolute!important;top:10px!important;right:12px!important;width:44px!important;height:44px!important;display:grid!important;place-items:center!important;border-radius:50%!important;background:#f1f1ef!important;color:#11151b!important;font-family:Arial,sans-serif!important;font-size:32px!important;font-weight:400!important;line-height:44px!important;text-align:center!important;cursor:pointer!important;z-index:2147483647!important;box-shadow:0 2px 8px rgba(0,0,0,.12)!important;box-sizing:border-box!important;';
    control.addEventListener('click', closeMenu);
    control.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        closeMenu();
      }
    });
    menu.insertBefore(control, menu.firstChild);
  }

  function ensureModalCloseControl() {
    const dialog = document.querySelector('#modal .dialog');
    if (!dialog || dialog.querySelector('[data-teki-modal-close-r5]')) return;
    dialog.style.position = 'relative';
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('data-teki-modal-close-r5', 'true');
    button.setAttribute('aria-label', 'Cerrar');
    button.setAttribute('title', 'Cerrar');
    button.textContent = '×';
    Object.assign(button.style, {
      position: 'absolute', top: '10px', right: '10px', width: '44px', height: '44px',
      border: '0', borderRadius: '50%', background: 'rgba(17,20,24,.08)', color: '#111418',
      fontSize: '30px', lineHeight: '1', display: 'grid', placeItems: 'center', cursor: 'pointer',
      zIndex: '100', padding: '0'
    });
    button.addEventListener('click', closeModal);
    dialog.insertBefore(button, dialog.firstChild);
  }

  function getOfficialPageLogoSrc() {
    const candidates = ['.top .brand img', '.top .logoBox img', '.top img', 'header .brand img', 'header img'];
    for (const selector of candidates) {
      const image = document.querySelector(selector);
      const src = image && (image.currentSrc || image.src || image.getAttribute('src'));
      if (src) return src;
    }
    return '/icon-512.png';
  }

  function patchReportHtml() {
    const current = window.reportHtml;
    if (typeof current !== 'function' || current.__tekiR5Wrapped) return;

    function wrappedReportHtml() {
      let html = current.apply(this, arguments);
      const officialLogoUrl = getOfficialPageLogoSrc();
      html = html.replace(/<img\s+class="logo"[^>]*>/i, '<img class="logo" src="' + officialLogoUrl.replace(/"/g, '&quot;') + '" alt="MercaTax IVU PR">');

      if (!html.includes(REPORT_FIX_ID)) {
        const screenCss = '<style id="' + REPORT_FIX_ID + '">' +
          '@media screen and (max-width:700px){' +
          'html,body{width:100%;max-width:100%;overflow-x:hidden}body{background:#e5e7eb}' +
          '.page{width:calc(100% - 16px)!important;max-width:100%!important;min-height:auto!important;margin:8px auto!important;padding:14px!important;box-sizing:border-box!important;overflow:hidden!important}' +
          '.head{display:grid!important;grid-template-columns:minmax(0,.82fr) minmax(0,1.18fr)!important;gap:12px!important;align-items:center!important}' +
          '.brandBlock{display:block!important;min-width:0!important}.brandCopy{display:none!important}' +
          '.logo{display:block!important;width:min(150px,100%)!important;max-width:100%!important;height:auto!important;max-height:86px!important;object-fit:contain!important;object-position:left center!important}' +
          '.title{min-width:0!important;text-align:right!important}.title h1{font-size:20px!important;line-height:1.08!important;overflow-wrap:anywhere}.title p{font-size:11px!important;overflow-wrap:anywhere}' +
          '.summary{grid-template-columns:1fr!important;gap:12px!important;margin:16px 0!important}.box,.meta,.bizSection{min-width:0!important;max-width:100%!important}' +
          '.bizSection table,.bizSection thead,.bizSection tbody,.bizSection tfoot,.bizSection tr,.bizSection th,.bizSection td{display:block!important;width:100%!important;box-sizing:border-box!important}' +
          '.bizSection thead{display:none!important}.bizSection table{border:0!important;font-size:12px!important;margin-top:10px!important}' +
          '.bizSection tbody tr,.bizSection tfoot tr{border:1px solid #ddd!important;border-radius:10px!important;overflow:hidden!important;margin:0 0 10px!important;background:#fff!important}' +
          '.bizSection tbody td,.bizSection tfoot td{display:grid!important;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)!important;gap:10px!important;align-items:center!important;padding:8px 10px!important;border:0!important;border-bottom:1px solid #eee!important;text-align:right!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;font-size:12px!important}' +
          '.bizSection tbody td:last-child,.bizSection tfoot td:last-child{border-bottom:0!important}.bizSection tbody td:before,.bizSection tfoot td:before{font-weight:800!important;text-align:left!important;color:#555!important}' +
          '.bizSection tbody td:nth-child(1):before{content:"Fecha"}.bizSection tbody td:nth-child(2):before{content:"Municipio"}.bizSection tbody td:nth-child(3):before{content:"Monto vendido"}.bizSection tbody td:nth-child(4):before{content:"Venta sin IVU"}.bizSection tbody td:nth-child(5):before{content:"IVU estatal"}.bizSection tbody td:nth-child(6):before{content:"IVU municipal"}.bizSection tbody td:nth-child(7):before{content:"IVU total"}' +
          '.bizSection tfoot td:first-child{display:block!important;text-align:left!important;background:#fff7df!important;font-weight:900!important}.bizSection tfoot td:first-child:before{content:""!important}.bizSection tfoot td:nth-child(2):before{content:"Monto vendido"}.bizSection tfoot td:nth-child(3):before{content:"Venta sin IVU"}.bizSection tfoot td:nth-child(4):before{content:"IVU estatal"}.bizSection tfoot td:nth-child(5):before{content:"IVU municipal"}.bizSection tfoot td:nth-child(6):before{content:"IVU total"}' +
          '.foot{gap:12px!important;flex-wrap:wrap!important;align-items:flex-end!important}.sig{width:min(230px,100%)!important}.actions{width:100%!important;max-width:100%!important;margin:14px auto!important;padding:0 8px!important;box-sizing:border-box!important;flex-wrap:wrap!important}.actions button{max-width:100%!important}.page *{box-sizing:border-box}' +
          '}</style>';
        html = html.replace(/<\/head>/i, screenCss + '</head>');
      }
      return html;
    }

    wrappedReportHtml.__tekiR5Wrapped = true;
    window.reportHtml = wrappedReportHtml;
  }

  function installBackClose() {
    if (window.__tekiR5BackInstalled) return;
    const appPlugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (!appPlugin || typeof appPlugin.addListener !== 'function') return;
    window.__tekiR5BackInstalled = true;
    appPlugin.addListener('backButton', () => {
      if (menuIsOpen()) return closeMenu();
      if (modalIsOpen()) closeModal();
    });
  }

  const observer = new MutationObserver(() => {
    ensureMenuCloseControl();
    ensureModalCloseControl();
  });
  if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });

  setInterval(() => {
    patchReportHtml();
    ensureMenuCloseControl();
    ensureModalCloseControl();
    installBackClose();
  }, 100);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (menuIsOpen()) return closeMenu();
    if (modalIsOpen()) closeModal();
  });
})();
