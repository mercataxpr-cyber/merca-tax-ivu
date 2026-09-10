/* MercaTax IVU PR — month/year period selectors R1. */
(function installPeriodSelectors() {
  'use strict';

  const MONTHS = [
    ['01','Enero'],['02','Febrero'],['03','Marzo'],['04','Abril'],['05','Mayo'],['06','Junio'],
    ['07','Julio'],['08','Agosto'],['09','Septiembre'],['10','Octubre'],['11','Noviembre'],['12','Diciembre']
  ];

  let installed = false;
  let originalSelectedBusinessSales = null;
  let originalAllMonthSales = null;
  let originalMonthName = null;
  let applying = false;

  function currentYear() {
    return String(new Date().getFullYear());
  }

  function ensurePeriodState() {
    if (!window.state) return;
    const selected = String(state.selectedMonth || '');
    const selectedYear = /^\d{4}-\d{2}$/.test(selected) ? selected.slice(0,4) : currentYear();
    if (!/^\d{4}$/.test(String(state.selectedYear || ''))) state.selectedYear = selectedYear;
    if (state.selectedPeriodMode !== 'all') state.selectedPeriodMode = 'month';
  }

  function periodYear() {
    ensurePeriodState();
    return String(state.selectedYear || String(state.selectedMonth || '').slice(0,4) || currentYear());
  }

  function isAll() {
    ensurePeriodState();
    return state.selectedPeriodMode === 'all';
  }

  function periodLabel() {
    if (isAll()) return 'Todos ' + periodYear();
    try { return originalMonthName ? originalMonthName(state.selectedMonth) : state.selectedMonth; }
    catch (_) { return state.selectedMonth; }
  }

  function yearOptions() {
    const years = new Set([periodYear(), currentYear()]);
    const now = Number(currentYear());
    for (let y = now - 5; y <= now + 1; y += 1) years.add(String(y));
    (state.sales || []).forEach((sale) => {
      const y = String(sale && sale.date || '').slice(0,4);
      if (/^\d{4}$/.test(y)) years.add(y);
    });
    return [...years].sort((a,b) => Number(b) - Number(a));
  }

  function salesForSelectedBusiness() {
    if (!isAll()) return originalSelectedBusinessSales();
    const prefix = periodYear() + '-';
    return (state.sales || []).filter((sale) => sale.businessId === state.currentBusinessId && String(sale.date || '').startsWith(prefix));
  }

  function salesForSelectedPeriod() {
    if (!isAll()) return originalAllMonthSales();
    const prefix = periodYear() + '-';
    return (state.sales || []).filter((sale) => String(sale.date || '').startsWith(prefix));
  }

  function installFunctionOverrides() {
    if (installed) return true;
    if (!window.state || typeof window.selectedBusinessSales !== 'function' || typeof window.allMonthSales !== 'function' || typeof window.monthName !== 'function') return false;
    originalSelectedBusinessSales = window.selectedBusinessSales;
    originalAllMonthSales = window.allMonthSales;
    originalMonthName = window.monthName;
    ensurePeriodState();

    window.selectedBusinessSales = salesForSelectedBusiness;
    window.allMonthSales = salesForSelectedPeriod;
    window.monthName = function monthNamePeriodAware(key) {
      if (isAll()) return 'Todos ' + periodYear();
      return originalMonthName(key);
    };

    window.vxSetPeriodMonth = function vxSetPeriodMonth(value) {
      ensurePeriodState();
      if (value === 'all') {
        state.selectedPeriodMode = 'all';
      } else if (/^(0[1-9]|1[0-2])$/.test(String(value))) {
        state.selectedPeriodMode = 'month';
        state.selectedMonth = periodYear() + '-' + value;
      }
      if (typeof window.save === 'function') window.save();
      if (typeof window.render === 'function') window.render();
      setTimeout(applySelectors, 0);
    };

    window.vxSetPeriodYear = function vxSetPeriodYear(value) {
      if (!/^\d{4}$/.test(String(value))) return;
      ensurePeriodState();
      state.selectedYear = String(value);
      if (!isAll()) {
        const month = /^\d{4}-\d{2}$/.test(String(state.selectedMonth || '')) ? state.selectedMonth.slice(5,7) : String(new Date().getMonth() + 1).padStart(2,'0');
        state.selectedMonth = state.selectedYear + '-' + month;
      }
      if (typeof window.save === 'function') window.save();
      if (typeof window.render === 'function') window.render();
      setTimeout(applySelectors, 0);
    };

    installed = true;
    return true;
  }

  function selectorMarkup() {
    ensurePeriodState();
    const monthValue = isAll() ? 'all' : String(state.selectedMonth || '').slice(5,7);
    const monthOptions = [['all','Todos'], ...MONTHS]
      .map(([value,label]) => '<option value="' + value + '"' + (value === monthValue ? ' selected' : '') + '>' + label + '</option>')
      .join('');
    const years = yearOptions().map((year) => '<option value="' + year + '"' + (year === periodYear() ? ' selected' : '') + '>' + year + '</option>').join('');
    return '<span>Periodo:</span><div class="vxPeriodSelects"><label>Mes<select class="vxPeriodSelect" aria-label="Seleccionar mes" onchange="vxSetPeriodMonth(this.value)">' + monthOptions + '</select></label><label>Año<select class="vxPeriodSelect" aria-label="Seleccionar año" onchange="vxSetPeriodYear(this.value)">' + years + '</select></label></div>';
  }

  function installStyles() {
    if (document.getElementById('vx-period-select-r1-style')) return;
    const style = document.createElement('style');
    style.id = 'vx-period-select-r1-style';
    style.textContent = '.vxPeriods{display:flex!important;align-items:end!important;gap:12px!important}.vxPeriods>span{padding-bottom:13px}.vxPeriodSelects{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(110px,.75fr);gap:10px;flex:1;min-width:0}.vxPeriodSelects label{display:flex;flex-direction:column;gap:5px;font-size:10px;font-weight:900;color:#9b7100;letter-spacing:.4px}.vxPeriodSelect{width:100%;height:46px;border:1px solid #e3e5e8;border-radius:14px;background:#fff;color:#20242a;padding:0 12px;font:inherit;font-size:14px;font-weight:800;outline:none}.vxPeriodSelect:focus{border-color:#d3a400;box-shadow:0 0 0 2px rgba(211,164,0,.12)}@media(max-width:470px){.vxPeriods{align-items:stretch!important;flex-direction:column!important}.vxPeriods>span{padding-bottom:0}.vxPeriodSelects{width:100%;grid-template-columns:minmax(0,1.25fr) minmax(100px,.75fr)}}';
    document.head.appendChild(style);
  }

  function applyAllModePresentation() {
    if (!isAll()) return;
    document.querySelectorAll('.vxReminder small').forEach((node) => { node.textContent = 'Selecciona un mes específico para ver la fecha de vencimiento de Hacienda.'; });
    document.querySelectorAll('.vxStats div').forEach((node) => {
      const label = node.querySelector('span');
      if (label && /Vence/i.test(label.textContent || '')) {
        const strong = label.querySelector('strong');
        if (strong) strong.textContent = '—';
      }
    });
    document.querySelectorAll('.vxDeleteAll').forEach((node) => { node.style.display = 'none'; });
    document.querySelectorAll('.vxReportPeriod strong').forEach((node) => { node.textContent = periodLabel(); });
  }

  function applySelectors() {
    if (applying) return;
    applying = true;
    try {
      if (!installFunctionOverrides()) return;
      installStyles();
      document.querySelectorAll('.vxPeriods').forEach((period) => {
        if (!period.querySelector('.vxPeriodSelects')) period.innerHTML = selectorMarkup();
        else {
          const monthSelect = period.querySelector('[aria-label="Seleccionar mes"]');
          const yearSelect = period.querySelector('[aria-label="Seleccionar año"]');
          if (monthSelect) monthSelect.value = isAll() ? 'all' : String(state.selectedMonth || '').slice(5,7);
          if (yearSelect) yearSelect.value = periodYear();
        }
      });
      applyAllModePresentation();
    } finally {
      applying = false;
    }
  }

  const observer = new MutationObserver(applySelectors);
  observer.observe(document.documentElement, { childList:true, subtree:true });
  const timer = setInterval(() => {
    applySelectors();
    if (installed && document.querySelector('.vxPeriods')) clearInterval(timer);
  }, 100);
  setTimeout(() => clearInterval(timer), 10000);
  applySelectors();
})();
