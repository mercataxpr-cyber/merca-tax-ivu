import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const indexPath = 'public/index.html';
const homeRefinementPath = 'src/mobile-home-card-r2.js';
const vnextBuiltPath = 'public/src/mobile-vnext-ui.js';

if (!existsSync(indexPath)) throw new Error('public/index.html missing');
if (!existsSync(homeRefinementPath)) throw new Error('approved home refinement source missing');
if (!existsSync(vnextBuiltPath)) throw new Error('built vNext UI missing');

const homeSource = readFileSync(homeRefinementPath, 'utf8');
const cssMatch = homeSource.match(/style\.textContent = `([\s\S]*?)`;\n\s*doc\.head\.appendChild\(style\);/);
if (!cssMatch) throw new Error('approved home CSS block not found');

let index = readFileSync(indexPath, 'utf8');
const styleTag = `<style id="mercatax-approved-home-static">${cssMatch[1]}</style>`;
if (!index.includes('mercatax-approved-home-static')) {
  index = index.replace('</head>', `${styleTag}</head>`);
}
writeFileSync(indexPath, index);

let vnext = readFileSync(vnextBuiltPath, 'utf8');
vnext = vnext.replaceAll('Compartir por WhatsApp', 'Radicar por WhatsApp');

const monthChipNeedle = "  const monthChip = (key) => { const [y,m] = key.split('-').map(Number); return new Date(y,m-1,1).toLocaleDateString('es-PR',{month:'short',year:'numeric'}).replace('.',''); };";
const periodHelpers = `${monthChipNeedle}\n  function selectedYear(){ return String(state.selectedYear || String(state.selectedMonth || '').slice(0,4) || new Date().getFullYear()); }\n  function isAllPeriod(){ return state.selectedPeriodMode === 'all'; }\n  function selectedBusinessPeriodSales(){\n    if (!isAllPeriod()) return selectedBusinessSales();\n    const prefix = selectedYear() + '-';\n    return (state.sales || []).filter(s => s.businessId === state.currentBusinessId && String(s.date || '').startsWith(prefix));\n  }\n  function allSelectedPeriodSales(){\n    if (!isAllPeriod()) return allMonthSales();\n    const prefix = selectedYear() + '-';\n    return (state.sales || []).filter(s => String(s.date || '').startsWith(prefix));\n  }\n  function periodLabel(){ return isAllPeriod() ? 'Todos ' + selectedYear() : month(state.selectedMonth); }`;
if (!vnext.includes('function selectedBusinessPeriodSales()')) {
  if (!vnext.includes(monthChipNeedle)) throw new Error('vNext month helper not found');
  vnext = vnext.replace(monthChipNeedle, periodHelpers);
}

const oldPeriodCss = ".vxPeriods{display:flex;gap:10px;align-items:center}.vxPeriods>span{font-size:13px;font-weight:800;color:#68717e}.vxChips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;flex:1}.vxChip{min-height:42px;border:1px solid var(--vx-line);border-radius:999px;background:#fff;color:#6d7480;font-weight:800;text-transform:capitalize}.vxChip.active{border-color:var(--vx-gold);color:#a97900;background:#fffdf5}";
const newPeriodCss = ".vxPeriods{display:flex;gap:10px;align-items:flex-end}.vxPeriods>span{font-size:13px;font-weight:800;color:#68717e;padding-bottom:13px}.vxPeriodSelects{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(105px,.75fr);gap:8px;flex:1;min-width:0}.vxPeriodField{display:flex;flex-direction:column;gap:5px;min-width:0;font-size:10px;font-weight:900;color:#9b7100}.vxPeriodSelect{width:100%;height:42px;border:1px solid var(--vx-line);border-radius:14px;background:#fff;color:#20242a;padding:0 11px;font:inherit;font-size:14px;font-weight:800;outline:none}.vxPeriodSelect:focus{border-color:var(--vx-gold);box-shadow:0 0 0 2px rgba(211,164,0,.12)}";
if (vnext.includes(oldPeriodCss)) vnext = vnext.replace(oldPeriodCss, newPeriodCss);
else if (!vnext.includes('.vxPeriodSelects{')) throw new Error('vNext period CSS block not found');

vnext = vnext.replace(
  "@media(max-width:470px){.vxBusiness",
  "@media(max-width:470px){.vxPeriods{align-items:stretch;flex-direction:column}.vxPeriods>span{padding-bottom:0}.vxPeriodSelects{width:100%;grid-template-columns:minmax(0,1.25fr) minmax(96px,.75fr)}.vxBusiness"
);

const oldPeriods = `  function periods() {\n    const keys = [shiftMonth(state.selectedMonth,-1),state.selectedMonth,shiftMonth(state.selectedMonth,1)];\n    return \`<div class=\\"vxPeriods\\"><span>Periodo:</span><div class=\\"vxChips\\">\${keys.map(k=>\`<button class=\\"vxChip \${k===state.selectedMonth?'active':''}\\" onclick=\\"vxSetMonth('\${k}')\\">\${esc(monthChip(k))}</button>\`).join('')}</div></div>\`;\n  }`;
const newPeriods = `  function periods() {\n    const currentYear = String(new Date().getFullYear());\n    const years = new Set([currentYear, selectedYear()]);\n    (state.sales || []).forEach(s => { const y=String(s.date||'').slice(0,4); if(/^\\d{4}$/.test(y)) years.add(y); });\n    const monthValue = isAllPeriod() ? 'all' : String(state.selectedMonth || '').slice(5,7);\n    const monthOptions = [['all','Todos'],['01','Enero'],['02','Febrero'],['03','Marzo'],['04','Abril'],['05','Mayo'],['06','Junio'],['07','Julio'],['08','Agosto'],['09','Septiembre'],['10','Octubre'],['11','Noviembre'],['12','Diciembre']].map(([v,l])=>\`<option value=\\"\${v}\\" \${v===monthValue?'selected':''}>\${l}</option>\`).join('');\n    const yearOptions = [...years].sort((a,b)=>Number(b)-Number(a)).map(y=>\`<option value=\\"\${y}\\" \${y===selectedYear()?'selected':''}>\${y}</option>\`).join('');\n    return \`<div class=\\"vxPeriods\\"><span>Periodo:</span><div class=\\"vxPeriodSelects\\"><label class=\\"vxPeriodField\\">Mes<select class=\\"vxPeriodSelect\\" aria-label=\\"Seleccionar mes\\" onchange=\\"vxSetPeriodMonth(this.value)\\">\${monthOptions}</select></label><label class=\\"vxPeriodField\\">Año<select class=\\"vxPeriodSelect\\" aria-label=\\"Seleccionar año\\" onchange=\\"vxSetPeriodYear(this.value)\\">\${yearOptions}</select></label></div></div>\`;\n  }`;
if (!vnext.includes('aria-label=\\"Seleccionar mes\\"')) {
  if (!vnext.includes(oldPeriods)) throw new Error('vNext periods() block not found');
  vnext = vnext.replace(oldPeriods, newPeriods);
}

vnext = vnext.replaceAll('selectedBusinessSales()', 'selectedBusinessPeriodSales()');
vnext = vnext.replaceAll('allMonthSales()', 'allSelectedPeriodSales()');
// Restore helper internals after the global substitutions above.
vnext = vnext.replace('if (!isAllPeriod()) return selectedBusinessPeriodSales();', 'if (!isAllPeriod()) return selectedBusinessSales();');
vnext = vnext.replace('if (!isAllPeriod()) return allSelectedPeriodSales();', 'if (!isAllPeriod()) return allMonthSales();');

vnext = vnext.replaceAll('month(state.selectedMonth)', 'periodLabel()');
// Restore periodLabel itself if replacement touched it.
vnext = vnext.replace("function periodLabel(){ return isAllPeriod() ? 'Todos ' + selectedYear() : periodLabel(); }", "function periodLabel(){ return isAllPeriod() ? 'Todos ' + selectedYear() : month(state.selectedMonth); }");

vnext = vnext.replace(
  "function due(){try{return MercaTaxTaxUi.duePresentation({reportingPeriod:state.selectedMonth,currentDate:new Date()});catch(_){return{ready:false,effectiveDate:null,text:'Fecha contributiva no disponible; calendario certificado requerido.'};}}",
  "function due(){if(isAllPeriod())return{ready:false,effectiveDate:null,text:'Selecciona un mes específico para ver la fecha de vencimiento de Hacienda.'};try{return MercaTaxTaxUi.duePresentation({reportingPeriod:state.selectedMonth,currentDate:new Date()});}catch(_){return{ready:false,effectiveDate:null,text:'Fecha contributiva no disponible; calendario certificado requerido.'};}}"
);

vnext = vnext.replace("${sales.length?'<button class=\\\"vxDeleteAll\\\" onclick=\\\"confirmClear()\\\">Borrar todo</button>':''}", "${sales.length&&!isAllPeriod()?'<button class=\\\"vxDeleteAll\\\" onclick=\\\"confirmClear()\\\">Borrar todo</button>':''}");

const setMonthNeedle = "  root.vxSetMonth=(key)=>{state.selectedMonth=key;save();render();};";
const setPeriodHandlers = `${setMonthNeedle}\n  root.vxSetPeriodMonth=(value)=>{\n    const year=selectedYear();\n    if(value==='all'){state.selectedPeriodMode='all';state.selectedYear=year;}\n    else if(/^(0[1-9]|1[0-2])$/.test(String(value))){state.selectedPeriodMode='month';state.selectedYear=year;state.selectedMonth=year+'-'+value;}\n    save();renderAll();active();\n  };\n  root.vxSetPeriodYear=(value)=>{\n    if(!/^\\d{4}$/.test(String(value)))return;\n    state.selectedYear=String(value);\n    if(!isAllPeriod()){const m=String(state.selectedMonth||'').slice(5,7)||String(new Date().getMonth()+1).padStart(2,'0');state.selectedMonth=state.selectedYear+'-'+m;}\n    save();renderAll();active();\n  };`;
if (!vnext.includes('root.vxSetPeriodMonth=')) {
  if (!vnext.includes(setMonthNeedle)) throw new Error('vNext month action not found');
  vnext = vnext.replace(setMonthNeedle, setPeriodHandlers);
}

writeFileSync(vnextBuiltPath, vnext);

console.log('Approved interface and native month/year period selectors baked into vNext before first render; no post-render UI patch or MutationObserver.');
