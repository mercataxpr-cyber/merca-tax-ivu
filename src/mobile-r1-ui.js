/* MercaTax IVU PR — TEKI integration bridge: NOVA R1-A UI over BAKI R1-A domain. */
(function installMobileR1UiBridge() {
  'use strict';

  function el(id) { return document.getElementById(id); }

  window.toast = function toast(message) {
    const node = el('toast');
    if (!node) return;
    node.textContent = message;
    node.style.display = 'block';
    setTimeout(() => { node.style.display = 'none'; }, 2300);
  };

  window.askDeleteBusiness = function askDeleteBusiness() {
    if (state.businesses.length <= 1) return toast('Debe quedar al menos un negocio');
    showDialog('delBiz');
    el('modalTitle').textContent = 'Borrar negocio activo';
    el('modalBody').innerHTML = '<p>Esto borrará permanentemente el negocio <b>' + currentBiz().name + '</b> y todas sus ventas.</p><p>Para confirmar, escribe exactamente el nombre del negocio:</p><input id="deleteBizConfirm" class="input" autocomplete="off" placeholder="' + currentBiz().name.replace(/"/g, '&quot;') + '">';
    el('modalActions').innerHTML = '<button class="btn dangerAction" onclick="deleteBusiness()">Sí, borrar negocio y ventas</button><button class="linkBtn" onclick="closeDialog()">Cancelar</button>';
  };

  window.deleteBusiness = function deleteBusiness() {
    const expected = currentBiz().name.trim();
    const actual = (el('deleteBizConfirm')?.value || '').trim();
    if (actual !== expected) return toast('Escribe el nombre exacto del negocio para confirmar');
    const id = state.currentBusinessId;
    state.businesses = state.businesses.filter((business) => business.id !== id);
    state.sales = state.sales.filter((sale) => sale.businessId !== id);
    state.currentBusinessId = state.businesses[0].id;
    save(); render(); closeDialog(); toast('Negocio borrado');
  };

  window.askDeleteSale = function askDeleteSale(id) {
    const sale = state.sales.find((item) => item.id === id);
    if (!sale) return toast('Venta no encontrada');
    showDialog('delete');
    el('modalTitle').textContent = 'Confirmar borrado';
    el('modalBody').innerHTML = '<p>Vas a borrar permanentemente la venta de <b>' + money(sale.amount) + '</b>.</p><p>Esta acción no se puede deshacer.</p>';
    el('modalActions').innerHTML = '<button class="btn dangerAction" onclick="deleteSale(' + id + ')">Sí, borrar venta</button><button class="linkBtn" onclick="closeDialog()">Cancelar</button>';
  };

  window.deleteSale = function deleteSale(id) {
    state.sales = state.sales.filter((sale) => sale.id !== id);
    save(); render(); closeDialog(); toast('Venta borrada');
  };

  window.confirmClear = function confirmClear() {
    showDialog('clear');
    el('modalTitle').textContent = 'Borrar ventas del negocio activo';
    el('modalBody').innerHTML = '<p>Esta acción eliminará <b>solo las ventas de ' + currentBiz().name + '</b> guardadas en este dispositivo.</p><p>Para confirmar, escribe <b>BORRAR VENTAS</b>.</p><input id="clearConfirm" class="input" autocomplete="off" placeholder="BORRAR VENTAS">';
    el('modalActions').innerHTML = '<button class="btn dangerAction" onclick="clearAll()">Eliminar ventas</button><button class="linkBtn" onclick="closeDialog()">Cancelar</button>';
  };

  window.clearAll = function clearAll() {
    const actual = (el('clearConfirm')?.value || '').trim().toUpperCase();
    if (actual !== 'BORRAR VENTAS') return toast('Escribe BORRAR VENTAS para confirmar');
    state.sales = MercaTaxDomain.clearSalesForBusiness(state.sales, state.currentBusinessId);
    save(); render(); closeDialog(); toast('Ventas del negocio eliminadas');
  };

  window.saleHtml = function saleHtml(sale) {
    return '<div class="sale"><div><strong>' + new Date(sale.date + 'T00:00:00').toLocaleDateString('es-PR', { day: 'numeric', month: 'short', year: 'numeric' }) + '</strong><span class="small">Negocio: ' + (sale.businessName || currentBiz().name) + ' | Total: ' + money(sale.amount) + ' | Sin IVU: ' + money(saleBase(sale)) + ' | Est: ' + money(saleIvuEstatal(sale)) + ' | Mun: ' + money(saleIvuMunicipal(sale)) + ' | Municipio: ' + (sale.muni || '') + '</span></div><div class="left"><div><div class="ivuAmt">+' + money(saleIvu(sale)) + '</div><div class="small gold" style="text-align:right;font-weight:900">IVU</div></div><button class="trash" onclick="askDeleteSale(' + sale.id + ')" aria-label="Borrar venta">🗑</button></div></div>';
  };

  const baseReportHtml = window.reportHtml;
  window.reportHtml = function reportHtmlMobile(sales) {
    let html = baseReportHtml(sales);
    html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">');
    html = html.replace('.page{width:8.5in;min-height', '.page{width:8.5in;max-width:100%;min-height');
    html = html.replace('.logo{width:220px;max-height', '.logo{width:220px;max-width:42%;max-height');
    html = html.replace('src="assets/logo.png"', 'src="logo.png" alt="MercaTax IVU PR"');
    html = html.replace('.actions{display:flex;gap:10px;justify-content:center;margin:20px auto;width:8.5in}', '.actions{display:flex;gap:10px;justify-content:center;margin:20px auto;max-width:8.5in}');
    html = html.replace('@media print{', '@media(max-width:700px){.page{width:auto;min-height:auto;margin:0;padding:20px}.head,.foot{gap:16px}.summary{grid-template-columns:1fr}.actions{padding:0 14px}}@media print{');
    return html;
  };

  window.reportFileName = function reportFileName(ext = 'html') {
    const business = (currentBiz().name || 'negocio').toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-').replace(/^-|-$/g, '');
    return 'mercatax-ivu-' + (business || 'negocio') + '-' + state.selectedMonth + '.' + ext;
  };

  window.downloadReportHtml = function downloadReportHtml() {
    const sales = allMonthSales();
    if (!sales.length) return toast('Registre ventas para generar reporte');
    const blob = new Blob([window.reportHtml(sales)], { type: 'text/html;charset=utf-8' });
    const anchor = document.createElement('a');
    const url = URL.createObjectURL(blob);
    anchor.href = url;
    anchor.download = reportFileName('html');
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Reporte descargado');
  };

  window.exportPdfDemo = function exportPdfDemo() {
    const sales = allMonthSales();
    if (!sales.length) return toast('Registre ventas para generar reporte');
    const popup = window.open('', '_blank');
    if (!popup) {
      downloadReportHtml();
      return toast('El navegador bloqueó la vista. Se descargó el reporte.');
    }
    popup.document.open();
    popup.document.write(window.reportHtml(sales));
    popup.document.close();
  };

  window.shareReport = async function shareReport() {
    const sales = allMonthSales();
    if (!sales.length) return toast('Registre ventas para generar reporte');
    const text = reportText(sales);
    try {
      if (navigator.share) { await navigator.share({ title: 'Reporte MercaTax IVU PR', text }); return; }
      if (navigator.clipboard) { await navigator.clipboard.writeText(text); return toast('Resumen copiado para compartir'); }
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
    toast('No se pudo compartir automáticamente. Usa Descargar reporte.');
  };

  window.generateReport = function generateReport() {
    const sales = allMonthSales();
    if (!sales.length) return toast('Registre ventas para generar reporte');
    showDialog('report');
    el('modalTitle').textContent = 'Reporte mensual';
    el('modalBody').innerHTML = '<p>' + reportText(sales).replace(/\n/g, '<br>') + '</p>';
    el('modalActions').innerHTML = '<button class="btn goldBg" onclick="downloadReportHtml()">⬇️ Descargar reporte</button><button class="btn outline" onclick="exportPdfDemo()">🖨️ Vista para imprimir / PDF</button><button class="btn outline" onclick="shareReport()">↗ Compartir resumen</button><button class="linkBtn" onclick="closeDialog()">Cerrar</button>';
  };

  window.showNotificationHelp = function showNotificationHelp() {
    const status = notificationState();
    const title = status === 'denied' ? 'Notificaciones bloqueadas' : 'Notificaciones no disponibles';
    const message = status === 'denied'
      ? '<p>El navegador o Android bloqueó las notificaciones locales para esta app. Por seguridad, la app no puede quitar ese bloqueo sola.</p><p><b>Solución:</b> abre la configuración del sitio/app en Chrome, permite notificaciones y vuelve a tocar Activar.</p>'
      : '<p>Este navegador o la forma en que abriste la app no permite notificaciones locales. Esta función es opcional y la app continúa funcionando sin ella.</p>';
    el('modalTitle').textContent = title;
    el('modalBody').innerHTML = message;
    el('modalActions').innerHTML = '<button class="btn warn" onclick="closeDialog()">Entendido</button>';
    el('modal').style.display = 'flex';
  };

  window.sendLocalReminder = function sendLocalReminder(days) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const key = 'mt_notice_' + new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(key)) return;
    new Notification('MercaTax IVU PR', { body: 'Recordatorio: faltan ' + days + ' días para rendir/pagar IVU.', icon: 'icon-192.png' });
    localStorage.setItem(key, '1');
  };

  window.openExternal = function openExternal(url) {
    let opened = null;
    try { opened = window.open(url, '_blank', 'noopener,noreferrer'); } catch (error) {}
    if (!opened) {
      try { window.location.assign(url); return true; } catch (error) { return false; }
    }
    return true;
  };

  window.openWhatsAppMessage = function openWhatsAppMessage(message) {
    const url = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(message);
    if (openExternal(url)) return;
    try { navigator.clipboard?.writeText(message); toast('No se pudo abrir WhatsApp. El mensaje quedó copiado.'); }
    catch (error) { toast('No se pudo abrir WhatsApp en este dispositivo.'); }
  };

  window.radicarPlanillaWhatsApp = function radicarPlanillaWhatsApp() {
    openWhatsAppMessage('Hola MercaTax, quiero radicar mi planilla de IVU. Tengo el reporte generado para enviar.\n\n' + reportText());
  };

  window.serviciosWhatsApp = function serviciosWhatsApp() {
    openWhatsAppMessage('Hola MercaTax, quiero información sobre otros servicios.');
  };

  const baseShowDialog = window.showDialog;
  window.showDialog = function showDialogMobile(type) {
    baseShowDialog(type);
    if (type === 'instrucciones') {
      el('modalBody').innerHTML = '<p>1. Registre el monto vendido <b>con IVU incluido</b>.</p><p>2. La app desglosa automáticamente: venta sin IVU, IVU estatal 10.5%, IVU municipal 1% y total vendido.</p><p>3. Use el reporte mensual para separar el IVU y radicar antes del día 20.</p><p>Las acciones destructivas siempre solicitan una confirmación explícita antes de borrar datos.</p>';
    }
    if (type === 'acerca') {
      el('modalBody').innerHTML = el('modalBody').innerHTML
        .replace('Reportes mensuales PDF', 'Reportes mensuales')
        .replace('Alertas de vencimiento', 'Alertas locales de vencimiento')
        .replace('<p><b>MercaTax IVU PR</b><br>Versión Profesional', '<p><a href="privacy.html">Política de Privacidad</a></p><p><b>MercaTax IVU PR</b><br>Versión Profesional');
    }
    if (type === 'gmail') {
      const business = currentBiz();
      el('modalTitle').textContent = 'Identificador de respaldo';
      el('modalBody').innerHTML = '<p>Asocia un Gmail como referencia local para identificar respaldos de este negocio. R1-A no sincroniza datos automáticamente con Google Drive.</p><input id="gmailInput" class="input" placeholder="correo@gmail.com" value="' + (business.gmail || '') + '">';
    }
  };

  window.installMobileHardening = function installMobileHardening() {
    if (!document.querySelector('link[data-mobile-r1]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = 'mobile-r1.css'; link.dataset.mobileR1 = 'true';
      document.head.appendChild(link);
    }
    const menu = el('menu');
    if (menu && !el('privacyMenuBtn')) {
      const button = document.createElement('button');
      button.id = 'privacyMenuBtn'; button.type = 'button';
      button.innerHTML = '<span>🔒</span><span>Privacidad</span>';
      button.onclick = () => { menu.style.display = 'none'; window.location.href = 'privacy.html'; };
      menu.appendChild(button);
    }
    const footer = document.querySelector('.footer');
    if (footer && !el('privacyLink')) {
      const entry = document.createElement('div');
      entry.className = 'privacyEntry';
      entry.innerHTML = '<a id="privacyLink" href="privacy.html">Política de Privacidad</a>';
      footer.appendChild(entry);
    }
  };

  installMobileHardening();
}());
