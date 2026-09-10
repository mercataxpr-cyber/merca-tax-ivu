/* MercaTax IVU PR — month/year period selectors R2. */
(function installPeriodSelectorsR2() {
  'use strict';

  const MONTHS = [
    ['01','Enero'],['02','Febrero'],['03','Marzo'],['04','Abril'],['05','Mayo'],['06','Junio'],
    ['07','Julio'],['08','Agosto'],['09','Septiembre'],['10','Octubre'],['11','Noviembre'],['12','Diciembre']
  ];
  let installed = false;
  let applying = false;
  let baseSelectedBusinessSales;
  let baseAllMonthSales;
  let baseMonthName;

  function hasState() { return typeof state !== 'undefined' && state && typeof state === 'object'; }
  function currentYear() { return String(new Date().getFullYear()); }
  function ensureState() {
    if (!hasState()) return false;
    const selected = String(state.selectedMonth || '');
    if (!/^\d{4}-\d{2}$/.test(selected)) state.selectedMonth = currentYear() + '-' + String(new Date().getMonth() + 1).padStart(2,'0');
    if (!/^\d{4}$/.test(String(state.selectedYear || ''))) state.selectedYear = state.selectedMonth.slice(0,4);
    if (state.selectedPeriodMode !== 'all') state.selectedPeriodMode = 'month';
    return true;
  }
  function year() { ensureState(); return String(state.selectedYear); }
  function allMode() { ensureState(); return state.selectedPeriodMode === 'all'; }
  function label() { return allMode() ? 'Todo el año ' + year() : baseMonthName(state.selectedMonth); }

  function availableYears() {
    const years = new Set([currentYear(), year()]);
    const now = Number(currentYear());
    for (let y = now - 6; y <= now + 1; y += 1) years.add(String(y));
    (state.sales || []).forEach((sale) => {
      const y = String(sale && sale.date || '').slice(0,4);
      if (/^\d{4}$/.test(y)) years.add(y);
    });
    return [...years].sort((a,b) => Number(b) - Number(a));
  }

  function installOverrides() {
    if (installed) return true;
    if (!ensureState()) return false;
    if (typeof selectedBusinessSales !== 'function' || typeof allMonthSales !== 'function' || typeof monthName !== 'function') return false;
    baseSelectedBusinessSales = selectedBusinessSales;
    baseAllMonthSales = allMonthSales;
    baseMonthName = monthName;

    window.selectedBusinessSales = function selectedBusinessSalesPeriodAware() {
      if (!allMode()) return baseSelectedBusinessSales();
      const prefix = year() + '-';
      return (state.sales || []).filter((sale) => sale.businessId === state.currentBusinessId && String(sale.date || '').startsWith(prefix));
    };
    window.allMonthSales = function allMonthSalesPeriodAware() {
      if (!allMode()) return baseAllMonthSales();
      const prefix = year() + '-';
      return (state.sales || []).filter((sale) => String(sale.date || '').startsWith(prefix));
    };
    window.monthName = function monthNamePeriodAware(key) {
      return allMode() ? 'Todo el año ' + year() : baseMonthName(key);
    };
    window.vxSetPeriodMonth = function vxSetPeriodMonth(value) {
      if (!ensureState()) return;
      if (value === 'all') state.selectedPeriodMode = 'all';
      else if (/^(0[1-9]|1[0-2])$/.test(String(value))) {
        state.selectedPeriodMode = 'month';
        state.selectedMonth = year() + '-' + value;
      }
      if (typeof save === 'function') save();
      if (typeof render === 'function') render();
      setTimeout(apply, 0);
    };
    window.vxSetPeriodYear = function vxSetPeriodYear(value) {
      if (!/^\d{4}$/.test(String(value)) || !ensureState()) return;
      state.selectedYear = String(value);
      if (!allMode()) state.selectedMonth = state.selectedYear + '-' + state.selectedMonth.slice(5,7);
      if (typeof save === 'function') save();
      if (typeof render === 'function') render();
      setTimeout(apply, 0);
    };
    installed = true;
    return true;
  }

  function markup() {
    ensureState();
    const monthValue = allMode() ? 'all' : state.selectedMonth.slice(5,7);
    const months = [['all','Todos'], ...MONTHS].map(([v,n]) => '<option value="'+v+'"'+(v===monthValue?' selected':'')+'>'+n+'</option>').join('');
    const years = availableYears().map((y) => '<option value="'+y+'"'+(y===year()?' selected':'')+'>'+y+'</option>').join('');
    return '<span>Periodo:</span><div class="vxPeriodSelects"><label>Mes<select class="vxPeriodSelect" aria-label="Seleccionar mes" onchange="vxSetPeriodMonth(this.value)">'+months+'</select></label><label>Año<select class="vxPeriodSelect" aria-label="Seleccionar año" onchange="vxSetPeriodYear(this.value)">'+years+'</select></label></div>';
  }

  function styles() {
    if (document.getElementById('vx-period-select-r2-style')) return;
    const s = document.createElement('style');
    s.id = 'vx-period-select-r2-style';
    s.textContent = '.vxPeriods{display:flex!important;align-items:end!important;gap:12px!important}.vxPeriods>span{padding-bottom:13px}.vxPeriodSelects{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(110px,.75fr);gap:10px;flex:1;min-width:0}.vxPeriodSelects label{display:flex;flex-direction:column;gap:5px;font-size:10px;font-weight:900;color:#9b7100}.vxPeriodSelect{width:100%;height:46px;border:1px solid #e3e5e8;border-radius:14px;background:#fff;color:#20242a;padding:0 12px;font-size:14px;font-weight:800}@media(max-width:470px){.vxPeriods{align-items:stretch!important;flex-direction:column!important}.vxPeriods>span{padding-bottom:0}.vxPeriodSelects{width:100%;grid-template-columns:minmax(0,1.25fr) minmax(100px,.75fr)}}';
    document.head.appendChild(s);
  }

  function apply() {
    if (applying) return;
    applying = true;
    try {
      if (!installOverrides()) return;
      styles();
      document.querySelectorAll('.vxPeriods').forEach((node) => { node.innerHTML = markup(); });
      if (allMode()) {
        document.querySelectorAll('.vxReportPeriod strong').forEach((node) => { node.textContent = label(); });
        document.querySelectorAll('.vxDeleteAll').forEach((node) => { node.style.display = 'none'; });
        document.querySelectorAll('.vxReminder small').forEach((node) => { node.textContent = 'Selecciona un mes para ver el vencimiento contributivo.'; });
        document.querySelectorAll('.vxStats span').forEach((node) => { if (/Vence/i.test(node.textContent || '')) { const strong=node.querySelector('strong'); if (strong) strong.textContent='—'; } });
      }
    } finally { applying = false; }
  }

  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, { childList:true, subtree:true });
  const timer = setInterval(apply, 100);
  setTimeout(() => clearInterval(timer), 10000);
  apply();
})();