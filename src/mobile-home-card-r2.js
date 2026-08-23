/* MercaTax IVU PR — NOVA Home Summary Card R3.
 * Presentation-only compact home refinement loaded after mobile-vnext-ui.js.
 * Reuses the existing TAX due presentation and never hard-codes a filing date.
 */
(function installMercaTaxHomeCardR3(root) {
  'use strict';

  const doc = document;
  const STYLE_ID = 'mercataxHomeCardR3Styles';

  function installStyles() {
    if (doc.getElementById(STYLE_ID)) return;
    const style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #vx-home{gap:12px}

      #vx-home .vxBusiness{
        grid-template-columns:48px minmax(0,1fr) auto!important;
        gap:10px;
        padding:12px 14px;
        border-radius:22px;
      }
      #vx-home .vxBizIcon{width:46px;height:46px}
      #vx-home .vxBizIcon .vxIcon{width:25px;height:25px}
      #vx-home .vxBizCopy span{font-size:9px}
      #vx-home .vxBizCopy strong{font-size:19px;line-height:1.05}
      #vx-home .vxBizCopy small{font-size:12px;margin-top:2px}
      #vx-home .vxManage{
        grid-column:auto!important;
        min-height:42px;
        padding:0 12px;
        border-radius:14px;
        font-size:13px;
        white-space:nowrap;
      }

      #vx-home .vxDash{
        padding:17px 18px 15px;
        border-radius:27px;
        background:radial-gradient(circle at 90% 18%,rgba(211,164,0,.22),transparent 30%),linear-gradient(135deg,#11161d,#1e242c);
        border:1px solid rgba(211,164,0,.34);
        box-shadow:0 13px 26px rgba(16,20,27,.14);
      }
      #vx-home .vxDashTop{align-items:flex-end;gap:12px}
      #vx-home .vxEyebrow{font-size:9px;letter-spacing:1.8px}
      #vx-home .vxHero{font-size:36px;line-height:1;margin-top:8px}
      #vx-home .vxHero small{font-size:16px}
      #vx-home .vxSales strong{font-size:20px;line-height:1.05}
      #vx-home .vxSales small{display:block!important;font-size:11px;margin-top:3px}
      #vx-home .vxStats{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        gap:8px;
        border-top:1px solid rgba(255,255,255,.16);
        margin-top:14px;
        padding-top:13px;
      }
      #vx-home .vxStats>div{
        min-width:0;
        min-height:72px;
        padding:8px 5px;
        border:1px solid rgba(255,255,255,.18)!important;
        border-radius:16px;
        background:rgba(255,255,255,.075);
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:3px;
        text-align:center;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
      }
      #vx-home .vxStats .vxIcon{display:none}
      #vx-home .vxStats span{
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:4px;
        font-size:11px;
        line-height:1.1;
        color:#c8cbd0;
      }
      #vx-home .vxStats strong{
        max-width:100%;
        font-size:19px;
        line-height:1.05;
        color:#fff;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      #vx-home .vxReminder{
        grid-template-columns:38px minmax(0,1fr) auto!important;
        gap:10px;
        padding:10px 12px;
        border-radius:17px;
      }
      #vx-home .vxReminderIcon{width:36px;height:36px;border-radius:11px;font-size:18px}
      #vx-home .vxReminder strong{font-size:14px}
      #vx-home .vxReminder small{font-size:10px}
      #vx-home .vxReminder button{
        grid-column:auto!important;
        min-height:38px;
        padding:8px 10px;
        font-size:11px;
        white-space:nowrap;
      }

      #vx-home .vxPeriods{
        display:flex!important;
        flex-direction:row!important;
        align-items:center!important;
        gap:8px;
      }
      #vx-home .vxPeriods>span{font-size:11px;flex:0 0 auto}
      #vx-home .vxChips{
        width:auto!important;
        flex:1;
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        gap:7px;
      }
      #vx-home .vxChip{min-height:36px;font-size:11px;padding:0 7px}

      #vx-home .vxCard{padding:13px 14px;border-radius:20px}
      #vx-home .vxHead{flex-direction:row!important;align-items:center!important;margin-bottom:9px}
      #vx-home .vxHead h3{font-size:16px}
      #vx-home .vxHead button{font-size:11px;white-space:nowrap}
      #vx-home .vxQuick{
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        gap:7px;
      }
      #vx-home .vxQuick button{
        min-height:76px!important;
        padding:7px 5px;
        border-radius:16px;
        font-size:10px;
        line-height:1.15;
      }
      #vx-home .vxQuick .vxIcon{width:24px;height:24px}

      #vx-home .vxPromo{
        grid-template-columns:44px minmax(0,1fr) auto!important;
        gap:9px;
        padding:10px 12px;
        border-radius:18px;
      }
      #vx-home .vxPromoIcon{width:42px;height:42px;border-radius:13px}
      #vx-home .vxPromoCopy span{font-size:8px}
      #vx-home .vxPromoCopy strong{font-size:15px}
      #vx-home .vxPromoCopy small{font-size:10px}
      #vx-home .vxPromo button{
        grid-column:auto!important;
        min-height:40px;
        padding:0 10px;
        border-radius:13px;
        font-size:10px;
        white-space:nowrap;
      }

      @media(max-width:390px){
        #vx-home{gap:10px}
        #vx-home .vxBusiness{grid-template-columns:43px minmax(0,1fr) auto!important;padding:10px 11px;gap:8px}
        #vx-home .vxBizIcon{width:42px;height:42px}
        #vx-home .vxBizCopy strong{font-size:17px}
        #vx-home .vxBizCopy small{font-size:11px}
        #vx-home .vxManage{min-height:38px;padding:0 9px;font-size:11px}
        #vx-home .vxDash{padding:15px 14px 13px}
        #vx-home .vxHero{font-size:32px}
        #vx-home .vxSales strong{font-size:17px}
        #vx-home .vxSales small{font-size:10px}
        #vx-home .vxStats{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px;margin-top:12px;padding-top:11px}
        #vx-home .vxStats>div{min-height:66px;padding:7px 3px}
        #vx-home .vxStats span{font-size:10px}
        #vx-home .vxStats strong{font-size:16px}
        #vx-home .vxReminder{grid-template-columns:34px minmax(0,1fr) auto!important;padding:9px 10px;gap:8px}
        #vx-home .vxReminderIcon{width:32px;height:32px}
        #vx-home .vxReminder strong{font-size:12px}
        #vx-home .vxReminder small{font-size:9px}
        #vx-home .vxReminder button{min-height:34px;padding:6px 8px;font-size:9px}
        #vx-home .vxPeriods{flex-direction:row!important;gap:6px}
        #vx-home .vxChips{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:5px}
        #vx-home .vxChip{min-height:34px;font-size:10px;padding:0 4px}
        #vx-home .vxQuick{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px}
        #vx-home .vxQuick button{min-height:70px!important;font-size:9px;padding:6px 3px}
        #vx-home .vxPromo{grid-template-columns:40px minmax(0,1fr) auto!important;padding:9px 10px;gap:7px}
        #vx-home .vxPromoIcon{width:38px;height:38px}
        #vx-home .vxPromoCopy strong{font-size:14px}
        #vx-home .vxPromoCopy small{display:none}
        #vx-home .vxPromo button{min-height:36px;padding:0 8px;font-size:9px}
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
