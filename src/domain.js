/* MercaTax IVU core domain - browser-classic and Node-test compatible. */
(function attachMercaTaxDomain(root) {
  'use strict';

  const BACKUP_SCHEMA = 'mercatax-ivu-backup/v1';
  const DEFAULT_RATE = 0.115;
  const MUNICIPAL_COMPONENT_RATE = 0.01;
  const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
  const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

  class DomainValidationError extends Error {
    constructor(message, code = 'DOMAIN_VALIDATION_ERROR') {
      super(message);
      this.name = 'DomainValidationError';
      this.code = code;
    }
  }

  function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function finiteNumber(value, field) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new DomainValidationError(`${field} debe ser un número finito`, 'INVALID_NUMBER');
    }
    return number;
  }

  function roundCurrency(value) {
    const number = finiteNumber(value, 'monto');
    return Math.round((number + Number.EPSILON) * 100) / 100;
  }

  function normalizeRate(rate = DEFAULT_RATE) {
    const normalized = finiteNumber(rate, 'tasa');
    if (normalized < 0 || normalized > 1) {
      throw new DomainValidationError('La tasa debe estar entre 0 y 1', 'INVALID_RATE');
    }
    return normalized;
  }

  function roundRate(value) {
    const number = finiteNumber(value, 'tasa');
    return Number(number.toFixed(6));
  }

  function municipalRate(rate = DEFAULT_RATE) {
    const normalized = normalizeRate(rate);
    return normalized >= MUNICIPAL_COMPONENT_RATE ? MUNICIPAL_COMPONENT_RATE : 0;
  }

  function estatalRate(rate = DEFAULT_RATE) {
    const normalized = normalizeRate(rate);
    return roundRate(Math.max(normalized - municipalRate(normalized), 0));
  }

  function calculateIvuBreakdown(amount, rate = DEFAULT_RATE) {
    const total = roundCurrency(finiteNumber(amount, 'monto'));
    if (total < 0) {
      throw new DomainValidationError('El monto no puede ser negativo', 'INVALID_AMOUNT');
    }
    const normalizedRate = normalizeRate(rate);
    const municipalComponent = municipalRate(normalizedRate);
    const estatalComponent = estatalRate(normalizedRate);

    if (normalizedRate === 0) {
      return {
        total,
        base: total,
        ivu: 0,
        estatal: 0,
        municipal: 0,
        rate: 0,
        estatalRate: 0,
        municipalRate: 0,
      };
    }

    const rawBase = total / (1 + normalizedRate);
    const base = roundCurrency(rawBase);
    const ivu = roundCurrency(total - base);
    const municipal = roundCurrency(rawBase * municipalComponent);
    const estatal = roundCurrency(ivu - municipal);

    return {
      total,
      base,
      ivu,
      estatal,
      municipal,
      rate: normalizedRate,
      estatalRate: estatalComponent,
      municipalRate: municipalComponent,
    };
  }

  function sumMoney(items, selector) {
    return roundCurrency(items.reduce((total, item) => total + finiteNumber(selector(item), 'monto'), 0));
  }

  function createId(prefix, options = {}) {
    if (!/^[a-z][a-z0-9_-]*$/i.test(prefix || '')) {
      throw new DomainValidationError('Prefijo de ID inválido', 'INVALID_ID_PREFIX');
    }
    const explicitUuid = options.uuid;
    const uuid = explicitUuid || (root.crypto && typeof root.crypto.randomUUID === 'function' ? root.crypto.randomUUID() : null);
    if (uuid) return `${prefix}_${String(uuid).replace(/[^a-zA-Z0-9-]/g, '')}`;

    const now = options.now === undefined ? Date.now() : finiteNumber(options.now, 'timestamp');
    const random = options.random === undefined ? Math.random() : finiteNumber(options.random, 'random');
    const entropy = Math.floor(Math.abs(random % 1) * 0x100000000).toString(36).padStart(7, '0');
    return `${prefix}_${Math.trunc(now).toString(36)}_${entropy}`;
  }

  function createUniqueId(prefix, existingIds = [], options = {}) {
    const used = new Set(existingIds.map(String));
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const attemptOptions = { ...options };
      if (options.uuid) attemptOptions.uuid = attempt === 0 ? options.uuid : `${options.uuid}-${attempt}`;
      if (options.random !== undefined) attemptOptions.random = Number(options.random) + (attempt / 1000000);
      const id = createId(prefix, attemptOptions);
      if (!used.has(String(id))) return id;
    }
    throw new DomainValidationError('No se pudo generar un ID único', 'ID_COLLISION');
  }

  function createNumericId(existingIds = [], options = {}) {
    const now = options.now === undefined ? Date.now() : Math.trunc(finiteNumber(options.now, 'timestamp'));
    if (now < 0 || !Number.isSafeInteger(now * 1000)) {
      throw new DomainValidationError('Timestamp fuera de rango', 'INVALID_TIMESTAMP');
    }
    const used = new Set(existingIds.map((id) => String(id)));
    const base = now * 1000;
    for (let sequence = 0; sequence < 1000; sequence += 1) {
      const candidate = base + sequence;
      if (!used.has(String(candidate))) return candidate;
    }
    throw new DomainValidationError('Espacio de IDs agotado para el milisegundo actual', 'ID_COLLISION');
  }

  function assertIsoDate(value) {
    if (typeof value !== 'string' || !DATE_RE.test(value)) {
      throw new DomainValidationError('Fecha inválida', 'INVALID_DATE');
    }
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new DomainValidationError('Fecha inválida', 'INVALID_DATE');
    }
    return value;
  }

  function assertMonth(value) {
    if (typeof value !== 'string' || !MONTH_RE.test(value)) {
      throw new DomainValidationError('Mes inválido', 'INVALID_MONTH');
    }
    return value;
  }

  function assertBusiness(business) {
    if (!isPlainObject(business) || typeof business.id !== 'string' || !business.id.trim()) {
      throw new DomainValidationError('Negocio inválido', 'INVALID_BUSINESS');
    }
    if (typeof business.name !== 'string' || !business.name.trim()) {
      throw new DomainValidationError('Nombre de negocio inválido', 'INVALID_BUSINESS');
    }
    return business;
  }

  function createSaleRecord(input, options = {}) {
    if (!isPlainObject(input)) throw new DomainValidationError('Venta inválida', 'INVALID_SALE');
    const business = assertBusiness(input.business);
    const amount = roundCurrency(finiteNumber(input.amount, 'monto'));
    if (amount <= 0) throw new DomainValidationError('El monto debe ser mayor a 0', 'INVALID_AMOUNT');
    const rate = normalizeRate(input.rate);
    const date = assertIsoDate(input.date);
    const id = options.id || createId('sale', options.idOptions || {});

    return {
      id,
      date,
      amount,
      rate,
      muni: typeof input.muni === 'string' ? input.muni.trim() : '',
      businessId: business.id,
      businessName: business.name,
      businessMuni: typeof business.muni === 'string' ? business.muni : '',
    };
  }

  function salesForBusinessMonth(sales, businessId, month) {
    if (!Array.isArray(sales)) throw new DomainValidationError('Ventas inválidas', 'INVALID_SALES');
    if (typeof businessId !== 'string' || !businessId) throw new DomainValidationError('Negocio inválido', 'INVALID_BUSINESS');
    assertMonth(month);
    return sales.filter((sale) => sale && sale.businessId === businessId && typeof sale.date === 'string' && sale.date.startsWith(month));
  }

  function salesForMonth(sales, month) {
    if (!Array.isArray(sales)) throw new DomainValidationError('Ventas inválidas', 'INVALID_SALES');
    assertMonth(month);
    return sales.filter((sale) => sale && typeof sale.date === 'string' && sale.date.startsWith(month));
  }

  function clearSalesForBusiness(sales, businessId) {
    if (!Array.isArray(sales)) throw new DomainValidationError('Ventas inválidas', 'INVALID_SALES');
    if (typeof businessId !== 'string' || !businessId) throw new DomainValidationError('Negocio inválido', 'INVALID_BUSINESS');
    return sales.filter((sale) => sale && sale.businessId !== businessId);
  }

  function assertUniqueIds(items, label) {
    const ids = new Set();
    for (const item of items) {
      const id = item && item.id;
      if ((typeof id !== 'string' && typeof id !== 'number') || String(id).trim() === '') {
        throw new DomainValidationError(`${label}: ID inválido`, 'INVALID_ID');
      }
      const key = String(id);
      if (ids.has(key)) throw new DomainValidationError(`${label}: ID duplicado`, 'DUPLICATE_ID');
      ids.add(key);
    }
  }

  function validateStateShape(state) {
    if (!isPlainObject(state)) throw new DomainValidationError('Estado inválido', 'INVALID_STATE');
    if (!Array.isArray(state.businesses) || state.businesses.length === 0) {
      throw new DomainValidationError('Debe existir al menos un negocio', 'INVALID_BUSINESSES');
    }
    if (!Array.isArray(state.sales)) throw new DomainValidationError('Ventas inválidas', 'INVALID_SALES');
    assertMonth(state.selectedMonth);
    state.businesses.forEach(assertBusiness);
    assertUniqueIds(state.businesses, 'Negocios');
    assertUniqueIds(state.sales, 'Ventas');

    const businessIds = new Set(state.businesses.map((business) => business.id));
    if (!businessIds.has(state.currentBusinessId)) {
      throw new DomainValidationError('Negocio activo inexistente', 'INVALID_CURRENT_BUSINESS');
    }

    for (const sale of state.sales) {
      if (!isPlainObject(sale)) throw new DomainValidationError('Venta inválida', 'INVALID_SALE');
      assertIsoDate(sale.date);
      const amount = finiteNumber(sale.amount, 'monto');
      if (amount <= 0) throw new DomainValidationError('Monto de venta inválido', 'INVALID_AMOUNT');
      normalizeRate(sale.rate);
      if (!businessIds.has(sale.businessId)) {
        throw new DomainValidationError('Venta apunta a negocio inexistente', 'ORPHAN_SALE');
      }
    }
    return true;
  }

  function safeBusinessForBackup(business) {
    return {
      id: business.id,
      name: business.name,
      muni: typeof business.muni === 'string' ? business.muni : '',
    };
  }

  function safeSaleForBackup(sale) {
    return {
      id: sale.id,
      date: sale.date,
      amount: roundCurrency(sale.amount),
      rate: normalizeRate(sale.rate),
      muni: typeof sale.muni === 'string' ? sale.muni : '',
      businessId: sale.businessId,
    };
  }

  function createBackupPayload(state, options = {}) {
    validateStateShape(state);
    const exportedAt = options.exportedAt || new Date().toISOString();
    if (Number.isNaN(new Date(exportedAt).getTime())) {
      throw new DomainValidationError('Fecha de exportación inválida', 'INVALID_EXPORTED_AT');
    }
    return {
      schema: BACKUP_SCHEMA,
      exportedAt,
      data: {
        selectedMonth: state.selectedMonth,
        currentBusinessId: state.currentBusinessId,
        businesses: state.businesses.map(safeBusinessForBackup),
        sales: state.sales.map(safeSaleForBackup),
      },
    };
  }

  function backupPayloadToState(payload) {
    if (!isPlainObject(payload) || payload.schema !== BACKUP_SCHEMA || !isPlainObject(payload.data)) {
      throw new DomainValidationError('Backup incompatible', 'INCOMPATIBLE_BACKUP');
    }
    const data = payload.data;
    if (!Array.isArray(data.businesses) || !Array.isArray(data.sales)) {
      throw new DomainValidationError('Backup incompleto', 'INVALID_BACKUP');
    }

    const businesses = data.businesses.map((business) => {
      assertBusiness(business);
      return {
        id: business.id,
        name: business.name,
        muni: typeof business.muni === 'string' ? business.muni : '',
        gmail: '',
        merchantNo: '',
        ein: '',
        phone: '',
        email: '',
        address: '',
      };
    });
    const businessMap = new Map(businesses.map((business) => [business.id, business]));
    const sales = data.sales.map((sale) => {
      if (!isPlainObject(sale)) throw new DomainValidationError('Venta de backup inválida', 'INVALID_SALE');
      const business = businessMap.get(sale.businessId);
      if (!business) throw new DomainValidationError('Venta huérfana en backup', 'ORPHAN_SALE');
      const normalized = createSaleRecord({
        date: sale.date,
        amount: sale.amount,
        rate: sale.rate,
        muni: sale.muni,
        business,
      }, { id: sale.id });
      return normalized;
    });

    const state = {
      selectedMonth: data.selectedMonth,
      currentBusinessId: data.currentBusinessId,
      businesses,
      sales,
    };
    validateStateShape(state);
    return state;
  }

  function parseBackupJson(text) {
    if (typeof text !== 'string') throw new DomainValidationError('Backup inválido', 'INVALID_BACKUP');
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new DomainValidationError('JSON corrupto', 'MALFORMED_JSON');
    }
    return backupPayloadToState(payload);
  }

  function safeParseStoredState(raw) {
    if (raw === null || raw === undefined || raw === '') return null;
    try {
      const parsed = JSON.parse(raw);
      return isPlainObject(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  root.MercaTaxDomain = Object.freeze({
    BACKUP_SCHEMA,
    DEFAULT_RATE,
    MUNICIPAL_COMPONENT_RATE,
    DomainValidationError,
    roundCurrency,
    normalizeRate,
    roundRate,
    municipalRate,
    estatalRate,
    calculateIvuBreakdown,
    sumMoney,
    createId,
    createUniqueId,
    createNumericId,
    createSaleRecord,
    salesForBusinessMonth,
    salesForMonth,
    clearSalesForBusiness,
    validateStateShape,
    createBackupPayload,
    backupPayloadToState,
    parseBackupJson,
    safeParseStoredState,
  });
}(globalThis));
