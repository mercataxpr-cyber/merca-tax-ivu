function countOccurrences(source, needle) {
  let count = 0;
  let index = 0;
  while ((index = source.indexOf(needle, index)) !== -1) {
    count += 1;
    index += needle.length;
  }
  return count;
}

function replaceExactly(source, before, after, label) {
  const count = countOccurrences(source, before);
  if (count !== 1) throw new Error(`Runtime tax transform expected exactly one ${label}; found ${count}`);
  return source.replace(before, after);
}

function replaceRegexExactly(source, pattern, after, label) {
  const matches = source.match(pattern) || [];
  if (matches.length !== 1) throw new Error(`Runtime tax transform expected exactly one ${label}; found ${matches.length}`);
  return source.replace(pattern, after);
}

export function transformIndexSource(source) {
  let output = String(source);

  output = replaceExactly(
    output,
    '<link rel="manifest" href="manifest.json">',
    '<link rel="manifest" href="manifest.json?v=pwa-rootfix-r1-official">',
    'PWA manifest link',
  );
  output = replaceExactly(
    output,
    '<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">',
    '<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png?v=pwa-rootfix-r1-official">',
    'Apple touch icon link',
  );
  output = replaceRegexExactly(
    output,
    /<link rel="icon" href="data:image\/png;base64,[^"]+">/g,
    '<link rel="icon" type="image/png" href="icon-192.png?v=pwa-rootfix-r1-official">',
    'legacy inline favicon',
  );

  const legacyMarker = "<script>\nconst WA='17873566336', PIN='1234';";
  const start = output.indexOf(legacyMarker);
  if (start === -1) throw new Error('Runtime tax transform could not find legacy inline application script');

  // The legacy application script contains a literal </script> inside an HTML
  // template used for report/PWA output. Using indexOf() truncated the script at
  // that embedded marker and leaked the remaining JavaScript into the page.
  // The application script is the final inline script in the source document,
  // so use its final closing tag as the true boundary.
  const end = output.lastIndexOf('</script>');
  if (end === -1 || end <= start) throw new Error('Runtime tax transform could not find end of legacy inline application script');
  output = `${output.slice(0, start)}<script src="/script.js"></script>${output.slice(end + '</script>'.length)}`;

  output = replaceExactly(
    output,
    '<label id="rateLabel">Tasa de IVU incluida</label><input id="rate" class="input" type="number" value="11.5" step="0.1">',
    '<label id="rateLabel">Perfil de IVU</label><select id="taxProfile" class="input"><option value="GENERAL_11_5">General 11.5%</option><option value="SPECIAL_4">Especial 4%</option><option value="SPECIAL_7">Especial 7%</option><option value="ZERO">0% matemático</option></select>',
    'numeric tax rate input',
  );
  output = replaceExactly(output, '<b class="mono">20</b>', '<b class="mono" id="effectiveDueDate">—</b>', 'hard-coded due-day display');
  output = replaceExactly(
    output,
    '<div id="daysLeft" class="small">Faltan días para rendir IVU</div>',
    '<div id="daysLeft" class="small">Fecha contributiva no disponible; calendario certificado requerido.</div>',
    'legacy due-date placeholder',
  );
  output = output.replaceAll('IVU Estatal (10.5%):', 'IVU Estatal:');
  output = output.replaceAll('IVU Municipal (1.0%):', 'IVU Municipal:');
  return output;
}

export function transformAppSource(source) {
  let output = String(source);

  output = replaceRegexExactly(
    output,
    /const municipalities=\[[^\n]*\]\.sort\(\);/g,
    'const municipalities=[...MercaTaxDomain.MUNICIPALITIES];',
    'legacy municipality list',
  );
  output = replaceExactly(
    output,
    "if(typeof s.rate==='undefined') s.rate=.115;",
    'MercaTaxTaxUi.migrateSale(s);',
    'legacy sale-rate default',
  );
  output = replaceExactly(
    output,
    'function saleBreakdown(s){return MercaTaxDomain.calculateIvuBreakdown(s.amount,s.rate??MercaTaxDomain.DEFAULT_RATE)}',
    'function saleBreakdown(s){return MercaTaxTaxUi.breakdownForSale(s)}',
    'legacy sale breakdown',
  );
  output = replaceExactly(
    output,
    "function addSale(){let amount=parseFloat(document.getElementById('amount').value),rate=parseFloat(document.getElementById('rate').value),date=document.getElementById('date').value,muni=document.getElementById('muni').value,b=currentBiz();try{let sale=MercaTaxDomain.createSaleRecord({date,amount,rate:rate/100,muni,business:b},{id:MercaTaxDomain.createNumericId(state.sales.map(s=>s.id))});state.selectedMonth=date.slice(0,7);state.sales.push(sale);document.getElementById('amount').value='';save();render();toast('Venta registrada')}catch(err){toast(err&&err.code==='INVALID_RATE'?'Ingrese una tasa de IVU válida':'Ingrese datos de venta válidos')}}",
    "function addSale(){let amount=parseFloat(document.getElementById('amount').value),taxProfile=document.getElementById('taxProfile').value,date=document.getElementById('date').value,muni=document.getElementById('muni').value,b=currentBiz();try{let sale=MercaTaxTaxUi.createSaleRecord({date,amount,taxProfile,muni,business:b},{id:MercaTaxDomain.createNumericId(state.sales.map(s=>s.id))});state.selectedMonth=date.slice(0,7);state.sales.push(sale);document.getElementById('amount').value='';save();render();toast('Venta registrada')}catch(err){toast(err&&['UNKNOWN_TAX_PROFILE','TAX_PROFILE_REQUIRED','INVALID_TAX_PROFILE'].includes(err.code)?'Seleccione un perfil de IVU válido':'Ingrese datos de venta válidos')}}",
    'numeric-rate sale creation',
  );
  output = replaceExactly(
    output,
    "let today=new Date(),days=20-today.getDate();if(days<0)days=20;let status=days===0?'Hoy vence el IVU':(today.getDate()>20?'IVU vencido / próximo ciclo':(days<=2?'Urgente: faltan '+days+' días':(days<=5?'Próximo a vencer: faltan '+days+' días':'Faltan '+days+' días para rendir IVU')));document.getElementById('daysLeft').textContent=status;",
    'MercaTaxTaxUi.renderDueStatus({reportingPeriod:state.selectedMonth,currentDate:new Date()});',
    'legacy day-20 countdown',
  );
  output = replaceExactly(
    output,
    "function sendLocalReminder(days){if(!('Notification' in window)||Notification.permission!=='granted')return; const key='mt_notice_'+new Date().toISOString().slice(0,10); if(localStorage.getItem(key))return; new Notification('MercaTax IVU PR',{body:'Recordatorio: faltan '+days+' días para rendir/pagar IVU.', icon:'assets/icon-192.png'}); localStorage.setItem(key,'1')}\nfunction checkIvuReminder(){updateNotificationButton();let d=new Date().getDate();let days=20-d;if(days<0)days=20;if((d>=15||d===1)&&notificationState()==='granted'){setTimeout(()=>sendLocalReminder(days),800)}}",
    "function sendLocalReminder(reminder){if(!reminder||!reminder.ready||!('Notification' in window)||Notification.permission!=='granted')return;const key='mt_notice_'+reminder.effectiveDate+'_'+new Date().toISOString().slice(0,10);if(localStorage.getItem(key))return;new Notification(reminder.title,{body:reminder.body,icon:'icon-192.png?v=pwa-rootfix-r1-official'});localStorage.setItem(key,'1')}\nfunction checkIvuReminder(){updateNotificationButton();const reminder=MercaTaxTaxUi.reminderForPeriod({reportingPeriod:state.selectedMonth,currentDate:new Date()});if(reminder&&reminder.ready&&notificationState()==='granted'){setTimeout(()=>sendLocalReminder(reminder),800)}}",
    'legacy day-20 reminder',
  );
  output = replaceExactly(
    output,
    'La app desglosa automáticamente: venta sin IVU, IVU estatal 10.5%, IVU municipal 1% y total vendido.',
    'La app desglosa automáticamente la venta sin IVU y los componentes estatal y municipal según el perfil tributario certificado.',
    'legacy fixed-rate instructions wording',
  );
  output = replaceExactly(
    output,
    'Use el reporte mensual para separar el IVU y radicar antes del día 20.',
    'Use el reporte mensual para separar el IVU y consulte la fecha efectiva certificada del calendario contributivo.',
    'legacy fixed-day instructions wording',
  );

  output = output.replaceAll('IVU estatal 10.5%', 'IVU estatal');
  output = output.replaceAll('IVU municipal 1%', 'IVU municipal');
  return output;
}
