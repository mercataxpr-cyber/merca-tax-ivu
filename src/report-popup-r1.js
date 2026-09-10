/* MercaTax IVU PR — standalone responsive report popup R1. */
(function installStandaloneReportPopup() {
  'use strict';

  function normalizeReportHtml(html) {
    let out = String(html || '');
    const viewport = '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">';
    if (/<meta[^>]+name=["']viewport["']/i.test(out)) {
      out = out.replace(/<meta[^>]+name=["']viewport["'][^>]*>/i, viewport);
    } else {
      out = out.replace(/<head>/i, '<head>' + viewport);
    }

    const screenCss = '<style id="report-popup-mobile-r1">@media screen and (max-width:700px){html,body{width:100%!important;min-width:0!important;max-width:none!important;margin:0!important;padding:0!important;overflow-x:hidden!important;background:#e5e7eb!important}.page{width:100vw!important;min-width:0!important;max-width:100vw!important;min-height:auto!important;margin:0!important;padding:16px!important;box-sizing:border-box!important;transform:none!important;zoom:1!important}.actions{width:100vw!important;max-width:100vw!important;margin:12px 0!important;padding:0 16px!important;box-sizing:border-box!important}.head{width:100%!important}.summary,.meta,.box,.bizSection,.foot{max-width:100%!important}.page *{box-sizing:border-box!important}}</style>';
    if (!out.includes('report-popup-mobile-r1')) out = out.replace(/<\/head>/i, screenCss + '</head>');
    return out;
  }

  function openReportDocument(html) {
    const blob = new Blob([normalizeReportHtml(html)], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const popup = window.open(url, '_blank');
    if (!popup) {
      URL.revokeObjectURL(url);
      return false;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return true;
  }

  function install() {
    if (typeof window.reportHtml !== 'function' || typeof window.allMonthSales !== 'function') return false;
    window.exportPdfDemo = function exportPdfDemoResponsive() {
      const sales = window.allMonthSales();
      if (!sales.length) return window.toast && window.toast('Registre ventas para generar reporte');
      if (!openReportDocument(window.reportHtml(sales))) {
        if (typeof window.downloadReportHtml === 'function') window.downloadReportHtml();
        if (window.toast) window.toast('El navegador bloqueó la vista. Se descargó el reporte.');
      }
    };
    return true;
  }

  if (!install()) {
    const timer = setInterval(() => {
      if (install()) clearInterval(timer);
    }, 50);
    setTimeout(() => clearInterval(timer), 5000);
  }
})();
