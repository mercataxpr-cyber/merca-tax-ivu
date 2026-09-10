/* MercaTax IVU PR — TEKI report/modal presentation hardening R2. */
(function installTekiReportFixR2() {
  'use strict';

  const REPORT_FIX_ID = 'teki-report-screen-r2';
  const CLOSE_ATTR = 'data-teki-modal-close-r2';
  const OFFICIAL_REPORT_LOGO_PATH = '/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png';

  function modalIsOpen() {
    const modal = document.getElementById('modal');
    return !!modal && getComputedStyle(modal).display !== 'none';
  }

  function closeModal() {
    if (typeof window.closeDialog === 'function') window.closeDialog();
  }

  function ensureCloseControl() {
    const dialog = document.querySelector('#modal .dialog');
    if (!dialog || dialog.querySelector('[' + CLOSE_ATTR + ']')) return;

    dialog.style.position = 'relative';
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute(CLOSE_ATTR, 'true');
    button.setAttribute('aria-label', 'Cerrar');
    button.setAttribute('title', 'Cerrar');
    button.textContent = '×';
    Object.assign(button.style, {
      position: 'absolute',
      top: '10px',
      right: '10px',
      width: '44px',
      height: '44px',
      minWidth: '44px',
      minHeight: '44px',
      border: '0',
      borderRadius: '50%',
      background: 'rgba(17,20,24,.08)',
      color: '#111418',
      fontSize: '30px',
      lineHeight: '1',
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer',
      zIndex: '10'
    });
    button.addEventListener('click', closeModal);
    dialog.insertBefore(button, dialog.firstChild);

    const title = dialog.querySelector('h2, #modalTitle');
    if (title) title.style.paddingRight = '52px';
  }

  function patchShowDialog() {
    const current = window.showDialog;
    if (typeof current !== 'function' || current.__tekiR2Wrapped) return;

    function wrappedShowDialog(type) {
      const result = current.apply(this, arguments);
      ensureCloseControl();
      return result;
    }
    wrappedShowDialog.__tekiR2Wrapped = true;
    window.showDialog = wrappedShowDialog;
  }

  function patchReportHtml() {
    const current = window.reportHtml;
    if (typeof current !== 'function' || current.__tekiR2Wrapped) return;

    function wrappedReportHtml(sales) {
      let html = current.apply(this, arguments);
      let officialLogoUrl = OFFICIAL_REPORT_LOGO_PATH;
      try { officialLogoUrl = new URL(OFFICIAL_REPORT_LOGO_PATH, window.location.origin).href; } catch (_) {}

      html = html.replace(
        /<img\s+class="logo"[^>]*>/i,
        '<img class="logo" src="' + officialLogoUrl + '" alt="MercaTax IVU PR">'
      );

      if (!html.includes(REPORT_FIX_ID)) {
        const screenCss = '<style id="' + REPORT_FIX_ID + '">' +
          '@media screen and (max-width:700px){' +
          'html,body{width:100%;max-width:100%;overflow-x:hidden}' +
          'body{background:#e5e7eb}' +
          '.page{width:calc(100% - 16px)!important;max-width:100%!important;min-height:auto!important;margin:8px auto!important;padding:14px!important;box-sizing:border-box!important;overflow:hidden!important}' +
          '.head{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr)!important;gap:10px!important;align-items:start!important}' +
          '.logo{display:block!important;width:min(150px,100%)!important;max-width:100%!important;height:auto!important;max-height:82px!important;object-fit:contain!important}' +
          '.title{min-width:0!important;text-align:right!important}' +
          '.title h1{font-size:20px!important;line-height:1.08!important;overflow-wrap:anywhere}' +
          '.title p{font-size:11px!important;overflow-wrap:anywhere}' +
          '.summary{grid-template-columns:1fr!important;gap:12px!important;margin:16px 0!important}' +
          '.box,.meta,.bizSection{min-width:0!important;max-width:100%!important}' +
          'table{width:100%!important;max-width:100%!important;table-layout:fixed!important;border-collapse:collapse!important;font-size:9px!important}' +
          'th,td{padding:5px 3px!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important}' +
          '.foot{gap:12px!important;flex-wrap:wrap!important;align-items:flex-end!important}' +
          '.sig{width:min(230px,100%)!important}' +
          '.actions{width:100%!important;max-width:100%!important;margin:14px auto!important;padding:0 8px!important;box-sizing:border-box!important;flex-wrap:wrap!important}' +
          '.actions button{max-width:100%!important}' +
          '.page *{box-sizing:border-box}' +
          '}' +
          '</style>';
        html = html.replace(/<\/head>/i, screenCss + '</head>');
      }
      return html;
    }

    wrappedReportHtml.__tekiR2Wrapped = true;
    window.reportHtml = wrappedReportHtml;
  }

  function installNativeBackClose() {
    if (window.__tekiR2BackInstalled) return;
    const appPlugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (!appPlugin || typeof appPlugin.addListener !== 'function') return;
    window.__tekiR2BackInstalled = true;
    appPlugin.addListener('backButton', () => {
      if (modalIsOpen()) closeModal();
    });
  }

  const observer = new MutationObserver(() => ensureCloseControl());
  if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    patchReportHtml();
    patchShowDialog();
    ensureCloseControl();
    installNativeBackClose();
    if (attempts >= 200) clearInterval(timer);
  }, 50);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modalIsOpen()) closeModal();
  });
})();
