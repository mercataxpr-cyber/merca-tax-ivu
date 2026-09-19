import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const indexPath = 'public/index.html';
const homeUiPath = 'src/home-ui.js';
const uiBuiltPath = 'public/src/ui.js';

if (!existsSync(indexPath)) throw new Error('public/index.html missing');
if (!existsSync(homeUiPath)) throw new Error('approved home refinement source missing');
if (!existsSync(uiBuiltPath)) throw new Error('built canonical UI UI missing');

const homeSource = readFileSync(homeUiPath, 'utf8');
const cssMatch = homeSource.match(/style\.textContent = `([\s\S]*?)`;\n\s*doc\.head\.appendChild\(style\);/);
if (!cssMatch) throw new Error('approved home CSS block not found');

let index = readFileSync(indexPath, 'utf8');
const styleTag = `<style id="mercatax-approved-home-static">${cssMatch[1]}</style>`;
if (!index.includes('mercatax-approved-home-static')) index = index.replace('</head>', `${styleTag}</head>`);
writeFileSync(indexPath, index);

let uiSource = readFileSync(uiBuiltPath, 'utf8');
uiSource = uiSource.replaceAll('Compartir por WhatsApp', 'Radicar por WhatsApp');

const monthChipNeedle = "  const monthChip = (key) => { const [y,m] = key.split('-').map(Number); return new Date(y,m-1,1).toLocaleDateString('es-PR',{month:'short',year:'numeric'}).replace('.',''); };";
if (!uiSource.includes('function selectedBusinessPeriodSales()')) {
  if (!uiSource.includes(monthChipNeedle)) throw new Error('canonical UI month helper not found');
  uiSource = uiSource.replace(monthChipNeedle, `${monthChipNeedle}
  function selectedYear(){ return String(state.selectedYear || String(state.selectedMonth || '').slice(0,4) || new Date().getFullYear()); }
  function isAllPeriod(){ return state.selectedPeriodMode === 'all'; }
  function selectedBusinessPeriodSales(){
    if (!isAllPeriod()) return selectedBusinessSales();
    const prefix = selectedYear() + '-';
    return (state.sales || []).filter(s => s.businessId === state.currentBusinessId && String(s.date || '').startsWith(prefix));
  }
  function allSelectedPeriodSales(){
    if (!isAllPeriod()) return allMonthSales();
    const prefix = selectedYear() + '-';
    return (state.sales || []).filter(s => String(s.date || '').startsWith(prefix));
  }
  function periodLabel(){ return isAllPeriod() ? 'Todos ' + selectedYear() : month(state.selectedMonth); }`);
}

const oldPeriodCss = ".vxPeriods{display:flex;gap:10px;align-items:center}.vxPeriods>span{font-size:13px;font-weight:800;color:#68717e}.vxChips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;flex:1}.vxChip{min-height:42px;border:1px solid var(--vx-line);border-radius:999px;background:#fff;color:#6d7480;font-weight:800;text-transform:capitalize}.vxChip.active{border-color:var(--vx-gold);color:#a97900;background:#fffdf5}";
const newPeriodCss = ".vxPeriods{display:flex;gap:10px;align-items:flex-end}.vxPeriods>span{font-size:13px;font-weight:800;color:#68717e;padding-bottom:13px}.vxPeriodSelects{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(105px,.75fr);gap:8px;flex:1;min-width:0}.vxPeriodField{display:flex;flex-direction:column;gap:5px;min-width:0;font-size:10px;font-weight:900;color:#9b7100}.vxPeriodSelect{width:100%;height:42px;border:1px solid var(--vx-line);border-radius:14px;background:#fff;color:#20242a;padding:0 11px;font:inherit;font-size:14px;font-weight:800;outline:none}.vxPeriodSelect:focus{border-color:var(--vx-gold);box-shadow:0 0 0 2px rgba(211,164,0,.12)}";
if (uiSource.includes(oldPeriodCss)) uiSource = uiSource.replace(oldPeriodCss, newPeriodCss);
else if (!uiSource.includes('.vxPeriodSelects{')) throw new Error('canonical UI period CSS block not found');

if (!uiSource.includes('.vxPeriodSelects{width:100%')) {
  const mediaNeedle = '@media(max-width:470px){.vxBusiness';
  if (!uiSource.includes(mediaNeedle)) throw new Error('canonical UI mobile media block not found');
  uiSource = uiSource.replace(mediaNeedle, '@media(max-width:470px){.vxPeriods{align-items:stretch;flex-direction:column}.vxPeriods>span{padding-bottom:0}.vxPeriodSelects{width:100%;grid-template-columns:minmax(0,1.25fr) minmax(96px,.75fr)}.vxBusiness');
}

if (!uiSource.includes('aria-label="Seleccionar mes"')) {
  const periodsRegex = /  function periods\(\) \{\n[\s\S]*?\n  \}\n\n  const navItems/;
  const match = uiSource.match(periodsRegex);
  if (!match) throw new Error('canonical UI periods() block not found');
  const newPeriods = `  function periods() {
    const currentYear = String(new Date().getFullYear());
    const years = new Set([currentYear, selectedYear()]);
    (state.sales || []).forEach(s => { const y=String(s.date||'').slice(0,4); if(/^\\d{4}$/.test(y)) years.add(y); });
    const monthValue = isAllPeriod() ? 'all' : String(state.selectedMonth || '').slice(5,7);
    const monthOptions = [['all','Todos'],['01','Enero'],['02','Febrero'],['03','Marzo'],['04','Abril'],['05','Mayo'],['06','Junio'],['07','Julio'],['08','Agosto'],['09','Septiembre'],['10','Octubre'],['11','Noviembre'],['12','Diciembre']].map(([v,l])=>\`<option value="\${v}" \${v===monthValue?'selected':''}>\${l}</option>\`).join('');
    const yearOptions = [...years].sort((a,b)=>Number(b)-Number(a)).map(y=>\`<option value="\${y}" \${y===selectedYear()?'selected':''}>\${y}</option>\`).join('');
    return \`<div class="vxPeriods"><span>Periodo:</span><div class="vxPeriodSelects"><label class="vxPeriodField">Mes<select class="vxPeriodSelect" aria-label="Seleccionar mes" onchange="vxSetPeriodMonth(this.value)">\${monthOptions}</select></label><label class="vxPeriodField">Año<select class="vxPeriodSelect" aria-label="Seleccionar año" onchange="vxSetPeriodYear(this.value)">\${yearOptions}</select></label></div></div>\`;
  }

  const navItems`;
  uiSource = uiSource.replace(periodsRegex, newPeriods);
}

uiSource = uiSource.replaceAll('selectedBusinessSales()', 'selectedBusinessPeriodSales()');
uiSource = uiSource.replaceAll('allMonthSales()', 'allSelectedPeriodSales()');
uiSource = uiSource.replace('if (!isAllPeriod()) return selectedBusinessPeriodSales();', 'if (!isAllPeriod()) return selectedBusinessSales();');
uiSource = uiSource.replace('if (!isAllPeriod()) return allSelectedPeriodSales();', 'if (!isAllPeriod()) return allMonthSales();');

uiSource = uiSource.replaceAll('month(state.selectedMonth)', 'periodLabel()');
uiSource = uiSource.replace("function periodLabel(){ return isAllPeriod() ? 'Todos ' + selectedYear() : periodLabel(); }", "function periodLabel(){ return isAllPeriod() ? 'Todos ' + selectedYear() : month(state.selectedMonth); }");

const dueNeedle = "function due(){try{return MercaTaxTaxUi.duePresentation({reportingPeriod:state.selectedMonth,currentDate:new Date()});}catch(_){return{ready:false,effectiveDate:null,text:'Fecha contributiva no disponible; calendario certificado requerido.'};}}";
if (uiSource.includes(dueNeedle)) uiSource = uiSource.replace(dueNeedle, "function due(){if(isAllPeriod())return{ready:false,effectiveDate:null,text:'Selecciona un mes específico para ver la fecha de vencimiento de Hacienda.'};try{return MercaTaxTaxUi.duePresentation({reportingPeriod:state.selectedMonth,currentDate:new Date()});}catch(_){return{ready:false,effectiveDate:null,text:'Fecha contributiva no disponible; calendario certificado requerido.'};}}");

uiSource = uiSource.replace("${sales.length?'<button class=\"vxDeleteAll\" onclick=\"confirmClear()\">Borrar todo</button>':''}", "${sales.length&&!isAllPeriod()?'<button class=\"vxDeleteAll\" onclick=\"confirmClear()\">Borrar todo</button>':''}");

const setMonthNeedle = "  root.vxSetMonth=(key)=>{state.selectedMonth=key;save();render();};";
if (!uiSource.includes('root.vxSetPeriodMonth=')) {
  if (!uiSource.includes(setMonthNeedle)) throw new Error('canonical UI month action not found');
  uiSource = uiSource.replace(setMonthNeedle, `${setMonthNeedle}
  root.vxSetPeriodMonth=(value)=>{
    const year=selectedYear();
    if(value==='all'){state.selectedPeriodMode='all';state.selectedYear=year;}
    else if(/^(0[1-9]|1[0-2])$/.test(String(value))){state.selectedPeriodMode='month';state.selectedYear=year;state.selectedMonth=year+'-'+value;}
    save();renderAll();active();
  };
  root.vxSetPeriodYear=(value)=>{
    if(!/^\\d{4}$/.test(String(value)))return;
    state.selectedYear=String(value);
    if(!isAllPeriod()){const m=String(state.selectedMonth||'').slice(5,7)||String(new Date().getMonth()+1).padStart(2,'0');state.selectedMonth=state.selectedYear+'-'+m;}
    save();renderAll();active();
  };`);
}

writeFileSync(uiBuiltPath, uiSource);
console.log('Approved interface and month/year period selectors baked into canonical UI before first render.');
