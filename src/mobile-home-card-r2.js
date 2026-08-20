/* MercaTax IVU PR — NOVA Home Summary Card R2.
 * Presentation-only refinement loaded after mobile-vnext-ui.js.
 * Reuses the existing TAX due presentation and never hard-codes a filing date.
 */
(function installMercaTaxHomeCardR2(root) {
  'use strict';

  const doc = document;
  const STYLE_ID = 'mercataxHomeCardR2Styles';

  function installStyles() {
    if (doc.getElementById(STYLE_ID)) return;
    const style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #vx-home .vxDash{
        padding:20px 20px 18px;
        border-radius:28px;
        background:radial-gradient(circle at 90% 18%,rgba(211,164,0,.22),transparent 30%),linear-gradient(135deg,#11161d,#1e242c);
        border:1px solid rgba(211,164,0,.34);
        box-shadow:0 14px 28px rgba(16,20,27,.14);
      }
      #vx-home .vxDashTop{align-items:flex-end;gap:14px}
      #vx-home .vxHero{font-size:40px;line-height:1;margin-top:10px}
      #vx-home .vxSales strong{font-size:22px}
      #vx-home .vxStats{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:10px;
        border-top:1px solid rgba(255,255,255,.16);
        margin-top:18px;
        padding-top:16px;
      }
      #vx-home .vxStats>div{
        min-width:0;
        min-height:88px;
        padding:10px 7px;
        border:1px solid rgba(255,255,255,.18);
        border-radius:18px;
        background:rgba(255,255,255,.075);
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:4px;
        text-align:center;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
      }
      #vx-home .vxStats>div:last-child{border:1px solid rgba(255,255,255,.18)}
      #vx-home .vxStats .vxIcon{display:none}
      #vx-home .vxStats span{
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:5px;
        font-size:12px;
        line-height:1.15;
        color:#c8cbd0;
      }
      #vx-home .vxStats strong{
        max-width:100%;
        font-size:22px;
        line-height:1.05;
        color:#fff;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }
      @media(max-width:470px){
        #vx-home .vxDash{padding:18px 17px 17px}
        #vx-home .vxHero{font-size:36px}
        #vx-home .vxSales strong{font-size:19px}
        #vx-home .vxStats{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
        #vx-home .vxStats>div{min-height:82px;padding:9px 5px}
        #vx-home .vxStats strong{font-size:19px}
      }
      @media(max-width:360px){
        #vx-home .vxDashTop{flex-direction:row;align-items:flex-end}
        #vx-home .vxSales{text-align:right}
        #vx-home .vxStats{grid-template-columns:repeat(3,minmax(0,1fr))}
        #vx-home .vxStats>div{border:1px solid rgba(255,255,255,.18);padding:8px 4px}
        #vx-home .vxStats>div:last-child{border:1px solid rgba(255,255,255,.18)}
        #vx-home .vxStats span{font-size:11px}
        #vx-home .vxStats strong{font-size:17px}
      }
    `;
    doc.head.appendChild(style);
  }

  function resolveDuePresentation() {
    try {
      if (typeof MercaTaxTaxUi === 'undefined' || typeof state === 'undefined') return null;
      return MercaTaxTaxUi.duePresentation({
        reportingPeriod: state.selectedMonth,
        currentDate: new Date(),
      });
    } catch (_) {
      return null;
    }
  }

  function applyDueDay() {
    const dash = doc.querySelector('#vx-home .vxDash');
    if (!dash) return;
    const metrics = dash.querySelectorAll('.vxStats > div');
    if (metrics.length < 3) return;
    const value = metrics[2].querySelector('strong');
    if (!value) return;

    const presentation = resolveDuePresentation();
    const dueIso = presentation && (presentation.effectiveDate || presentation.regularDate);
    if (!dueIso || !/^\d{4}-\d{2}-\d{2}$/.test(dueIso)) return;

    const dueDay = String(Number(dueIso.slice(-2)));
    if (value.textContent !== dueDay) value.textContent = dueDay;
    value.dataset.dueSource = presentation.effectiveDate ? 'certified-effective-date' : 'regular-date';
    value.title = presentation.effectiveDate
      ? `Fecha efectiva certificada: ${presentation.effectiveDate}`
      : `Fecha regular: ${presentation.regularDate}. Puede ajustarse cuando exista calendario certificado.`;
  }

  function apply() {
    installStyles();
    applyDueDay();
  }

  function observeHome() {
    const home = doc.getElementById('vx-home');
    if (!home || typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(() => applyDueDay());
    observer.observe(home, { childList: true, subtree: true });
  }

  apply();
  observeHome();
  root.addEventListener('mercatax:native-ready', applyDueDay);
}(window));
