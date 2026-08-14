const replacements = [
  [
    "const id='biz_'+Date.now();",
    "const id=MercaTaxDomain.createUniqueId('biz',[]);",
    'default business ID',
  ],
  [
    "let state=JSON.parse(localStorage.getItem('mt_ai_state')||'null')||defaultState();",
    "let state=MercaTaxDomain.safeParseStoredState(localStorage.getItem('mt_ai_state'))||defaultState();",
    'safe local storage parse',
  ],
  [
`function saleBase(s){return Number(s.amount||0)/(1+Number(s.rate||.115))}
function saleIvu(s){return Number(s.amount||0)-saleBase(s)}
function municipalRate(s){return Number(s.rate||.115)>=.01?.01:0}
function estatalRate(s){return Math.max(Number(s.rate||.115)-municipalRate(s),0)}
function saleIvuMunicipal(s){return saleBase(s)*municipalRate(s)}
function saleIvuEstatal(s){return saleBase(s)*estatalRate(s)}
function sumTotal(arr){return arr.reduce((a,s)=>a+Number(s.amount||0),0)}
function sumBase(arr){return arr.reduce((a,s)=>a+saleBase(s),0)}
function sumIvu(arr){return arr.reduce((a,s)=>a+saleIvu(s),0)}
function sumIvuEstatal(arr){return arr.reduce((a,s)=>a+saleIvuEstatal(s),0)}
function sumIvuMunicipal(arr){return arr.reduce((a,s)=>a+saleIvuMunicipal(s),0)}
function selectedBusinessSales(){return state.sales.filter(s=>s.businessId===state.currentBusinessId && s.date.startsWith(state.selectedMonth))}
function allMonthSales(){return state.sales.filter(s=>s.date.startsWith(state.selectedMonth))}`,
`function saleBreakdown(s){return MercaTaxDomain.calculateIvuBreakdown(s.amount,s.rate??MercaTaxDomain.DEFAULT_RATE)}
function saleBase(s){return saleBreakdown(s).base}
function saleIvu(s){return saleBreakdown(s).ivu}
function municipalRate(s){return saleBreakdown(s).municipalRate}
function estatalRate(s){return saleBreakdown(s).estatalRate}
function saleIvuMunicipal(s){return saleBreakdown(s).municipal}
function saleIvuEstatal(s){return saleBreakdown(s).estatal}
function sumTotal(arr){return MercaTaxDomain.sumMoney(arr,s=>s.amount)}
function sumBase(arr){return MercaTaxDomain.sumMoney(arr,s=>saleBase(s))}
function sumIvu(arr){return MercaTaxDomain.sumMoney(arr,s=>saleIvu(s))}
function sumIvuEstatal(arr){return MercaTaxDomain.sumMoney(arr,s=>saleIvuEstatal(s))}
function sumIvuMunicipal(arr){return MercaTaxDomain.sumMoney(arr,s=>saleIvuMunicipal(s))}
function selectedBusinessSales(){return MercaTaxDomain.salesForBusinessMonth(state.sales,state.currentBusinessId,state.selectedMonth)}
function allMonthSales(){return MercaTaxDomain.salesForMonth(state.sales,state.selectedMonth)}`,
    'calculation and business-scope adapters',
  ],
  [
    "let id='biz_'+Date.now();",
    "let id=MercaTaxDomain.createUniqueId('biz',state.businesses.map(b=>b.id));",
    'new business ID',
  ],
  [
    "function addSale(){let amount=parseFloat(document.getElementById('amount').value),rate=parseFloat(document.getElementById('rate').value),date=document.getElementById('date').value,muni=document.getElementById('muni').value,b=currentBiz();if(!amount||amount<=0)return toast('Ingrese un monto válido mayor a 0');if(isNaN(rate)||rate<0||rate>100)return toast('Ingrese una tasa de IVU válida');state.selectedMonth=date.slice(0,7);state.sales.push({id:Date.now(),date,amount,rate:rate/100,muni,businessId:b.id,businessName:b.name,businessMuni:b.muni});document.getElementById('amount').value='';save();render();toast('Venta registrada')}",
    "function addSale(){let amount=parseFloat(document.getElementById('amount').value),rate=parseFloat(document.getElementById('rate').value),date=document.getElementById('date').value,muni=document.getElementById('muni').value,b=currentBiz();try{let sale=MercaTaxDomain.createSaleRecord({date,amount,rate:rate/100,muni,business:b},{id:MercaTaxDomain.createNumericId(state.sales.map(s=>s.id))});state.selectedMonth=date.slice(0,7);state.sales.push(sale);document.getElementById('amount').value='';save();render();toast('Venta registrada')}catch(err){toast(err&&err.code==='INVALID_RATE'?'Ingrese una tasa de IVU válida':'Ingrese datos de venta válidos')}}",
    'sale creation validation and ID',
  ],
  [
    "function confirmClear(){showDialog('clear');document.getElementById('modalTitle').textContent='¿Deseas borrar todo?';document.getElementById('modalBody').innerHTML='<p>Esta acción eliminará todas las ventas registradas.</p><p>Introduce PIN para confirmar: <b>1234</b></p><input id=\"pin\" class=\"input\" placeholder=\"PIN\" type=\"password\">';document.getElementById('modalActions').innerHTML='<button class=\"btn dark\" onclick=\"clearAll()\">Eliminar Todo</button><button class=\"linkBtn\" onclick=\"closeDialog()\">Cancelar</button>'}",
    "function confirmClear(){showDialog('clear');document.getElementById('modalTitle').textContent='¿Deseas borrar las ventas de este negocio?';document.getElementById('modalBody').innerHTML='<p>Esta acción eliminará solo las ventas del negocio activo.</p><p>Introduce PIN para confirmar: <b>1234</b></p><input id=\"pin\" class=\"input\" placeholder=\"PIN\" type=\"password\">';document.getElementById('modalActions').innerHTML='<button class=\"btn dark\" onclick=\"clearAll()\">Eliminar ventas</button><button class=\"linkBtn\" onclick=\"closeDialog()\">Cancelar</button>'}",
    'clear confirmation scope',
  ],
  [
    "function clearAll(){if(document.getElementById('pin').value!==PIN)return toast('PIN incorrecto');state.sales=[];save();render();closeDialog();toast('Historial eliminado')}",
    "function clearAll(){if(document.getElementById('pin').value!==PIN)return toast('PIN incorrecto');state.sales=MercaTaxDomain.clearSalesForBusiness(state.sales,state.currentBusinessId);save();render();closeDialog();toast('Ventas del negocio eliminadas')}",
    'business-scoped clear',
  ],
  [
    "function exportBackup(){let blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mercatax-ivu-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href);toast('Backup creado')}",
    "function exportBackup(){try{let payload=MercaTaxDomain.createBackupPayload(state);let blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mercatax-ivu-backup-v1-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href);toast('Backup v1 creado')}catch(err){toast('No se pudo crear el backup')}}",
    'versioned safe backup export',
  ],
  [
    "function importBackup(e){let file=e.target.files[0];if(!file)return;let reader=new FileReader();reader.onload=()=>{try{let data=JSON.parse(reader.result);if(!data.sales)throw new Error();state=data;migrate();save();render();toast('Backup restaurado')}catch(err){toast('Backup inválido')}};reader.readAsText(file);e.target.value=''}",
    "function importBackup(e){let file=e.target.files[0];if(!file)return;let reader=new FileReader();reader.onload=()=>{try{let restored=MercaTaxDomain.parseBackupJson(String(reader.result));state=restored;save();render();toast('Backup v1 restaurado')}catch(err){toast('Backup inválido o incompatible')}};reader.readAsText(file);e.target.value=''}",
    'validate backup before state mutation',
  ],
];

function countOccurrences(source, needle) {
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  while ((index = source.indexOf(needle, index)) !== -1) {
    count += 1;
    index += needle.length;
  }
  return count;
}

export function transformAppSource(source) {
  let output = source;
  for (const [before, after, label] of replacements) {
    const count = countOccurrences(output, before);
    if (count !== 1) throw new Error(`R1-A transform expected exactly one ${label}; found ${count}`);
    output = output.replace(before, after);
  }
  return output;
}

export const expectedReplacementCount = replacements.length;
export const basePatterns = Object.freeze(replacements.map(([before, , label]) => ({ before, label })));
