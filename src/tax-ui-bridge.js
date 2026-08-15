/* MercaTax IVU R1 tax UI bridge - certified profiles and certified effective-date only. */
(function installTaxUiBridge(root) {
  'use strict';

  const tax = root.MercaTaxDomain;
  if (!tax || typeof tax.calculateTaxIncluded !== 'function' || typeof tax.calculateMonthlyReturnDueDate !== 'function') {
    throw new Error('Certified tax domain and calendar contract must load before tax-ui-bridge.js');
  }

  let calendarContext = Object.freeze({ calendar: null, overrides: Object.freeze([]) });

  function taxError(message, code) {
    return new tax.DomainValidationError(message, code);
  }

  function profileForLegacyRate(rate) {
    if (rate === null || rate === undefined || rate === '') return null;
    const value = Number(rate);
    if (!Number.isFinite(value)) return null;
    const rounded = tax.roundRate(value);
    for (const profile of Object.values(tax.TAX_PROFILES)) {
      if (tax.roundRate(profile.totalRate) === rounded) return profile.id;
    }
    return null;
  }

  function migrateSale(sale) {
    if (!sale || typeof sale !== 'object') return sale;
    if (typeof sale.taxProfile === 'string' && tax.TAX_PROFILES[sale.taxProfile]) return sale;
    const profileId = profileForLegacyRate(sale.rate);
    if (profileId) sale.taxProfile = profileId;
    return sale;
  }

  function requireSaleProfile(sale) {
    if (!sale || typeof sale !== 'object') throw taxError('Venta inválida', 'INVALID_SALE');
    if (typeof sale.taxProfile !== 'string' || !tax.TAX_PROFILES[sale.taxProfile]) {
      throw taxError('La venta requiere un perfil tributario certificado', 'TAX_PROFILE_REQUIRED');
    }
    return sale.taxProfile;
  }

  function breakdownForSale(sale) {
    return tax.calculateTaxIncluded(sale.amount, requireSaleProfile(sale));
  }

  function createSaleRecord(input, options = {}) {
    if (!input || typeof input !== 'object') throw taxError('Venta inválida', 'INVALID_SALE');
    const profile = tax.resolveTaxProfile(input.taxProfile);
    const result = tax.calculateTaxIncluded(input.amount, profile.id);
    const record = tax.createSaleRecord({
      date: input.date,
      amount: input.amount,
      rate: result.rate,
      muni: input.muni,
      business: input.business,
    }, options);
    return Object.freeze({ ...record, taxProfile: profile.id });
  }

  function configureCalendar(input = {}) {
    calendarContext = Object.freeze({
      calendar: input.calendar || null,
      overrides: Object.freeze(Array.isArray(input.overrides) ? input.overrides.map((item) => Object.freeze({ ...item })) : []),
    });
    return calendarContext;
  }

  function resetCalendar() {
    return configureCalendar();
  }

  function isoFromCurrentDate(value) {
    if (typeof value === 'string') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw taxError('Fecha actual inválida', 'INVALID_CURRENT_DATE');
      return value;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw taxError('Fecha actual inválida', 'INVALID_CURRENT_DATE');
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function daysBetween(currentIso, effectiveIso) {
    const current = Date.parse(`${currentIso}T00:00:00Z`);
    const effective = Date.parse(`${effectiveIso}T00:00:00Z`);
    return Math.round((effective - current) / 86400000);
  }

  function neutralPresentation(reason = 'CALENDAR_REQUIRED') {
    return Object.freeze({
      ready: false,
      status: 'CERTIFIED_DUE_DATE_REQUIRED',
      reason,
      regularDate: null,
      effectiveDate: null,
      effectiveDateSource: null,
      daysRemaining: null,
      text: 'Fecha contributiva no disponible; calendario certificado requerido.',
    });
  }

  function duePresentation({ reportingPeriod, currentDate = new Date() } = {}) {
    let result;
    try {
      result = tax.calculateMonthlyReturnDueDate(reportingPeriod, {
        calendar: calendarContext.calendar,
        overrides: calendarContext.overrides,
      });
    } catch (error) {
      return neutralPresentation(error && error.code ? error.code : 'DUE_DATE_RESOLUTION_FAILED');
    }

    if (result.status !== tax.EFFECTIVE_DATE_STATUS.CERTIFIED || !result.effectiveDate) {
      return Object.freeze({
        ...neutralPresentation(result.calendarReason || 'CALENDAR_REQUIRED'),
        regularDate: result.regularDate || null,
      });
    }

    let currentIso;
    try {
      currentIso = isoFromCurrentDate(currentDate);
    } catch (error) {
      return neutralPresentation(error.code || 'INVALID_CURRENT_DATE');
    }
    const daysRemaining = daysBetween(currentIso, result.effectiveDate);
    let text;
    if (daysRemaining === 0) text = `Hoy vence el IVU según la fecha efectiva certificada (${result.effectiveDate}).`;
    else if (daysRemaining > 0) text = `Faltan ${daysRemaining} días para la fecha efectiva certificada del IVU (${result.effectiveDate}).`;
    else text = `La fecha efectiva certificada del IVU fue ${result.effectiveDate}.`;

    return Object.freeze({
      ready: true,
      status: result.status,
      reason: null,
      regularDate: result.regularDate,
      effectiveDate: result.effectiveDate,
      effectiveDateSource: result.effectiveDateSource,
      overrideApplied: result.overrideApplied,
      override: result.override,
      daysRemaining,
      text,
    });
  }

  function renderDueStatus(input) {
    const presentation = duePresentation(input);
    if (typeof document !== 'undefined') {
      const dateNode = document.getElementById('effectiveDueDate');
      const statusNode = document.getElementById('daysLeft');
      if (dateNode) dateNode.textContent = presentation.ready ? presentation.effectiveDate : '—';
      if (statusNode) statusNode.textContent = presentation.text;
    }
    return presentation;
  }

  function reminderForPeriod(input) {
    const presentation = duePresentation(input);
    if (!presentation.ready || presentation.daysRemaining < 0 || presentation.daysRemaining > 5) return null;
    const body = presentation.daysRemaining === 0
      ? `Recordatorio: hoy es la fecha efectiva certificada del IVU (${presentation.effectiveDate}).`
      : `Recordatorio: faltan ${presentation.daysRemaining} días para la fecha efectiva certificada del IVU (${presentation.effectiveDate}).`;
    return Object.freeze({
      ready: true,
      title: 'MercaTax IVU PR',
      body,
      effectiveDate: presentation.effectiveDate,
      daysRemaining: presentation.daysRemaining,
    });
  }

  root.MercaTaxTaxUi = Object.freeze({
    breakdownForSale,
    createSaleRecord,
    profileForLegacyRate,
    migrateSale,
    configureCalendar,
    resetCalendar,
    duePresentation,
    renderDueStatus,
    reminderForPeriod,
  });
}(typeof globalThis !== 'undefined' ? globalThis : this));
