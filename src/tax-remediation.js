/* MercaTax IVU R1 tax remediation - explicit tax profiles, municipalities and calendar model. */
(function attachMercaTaxTaxRemediation(root) {
  'use strict';

  const base = root.MercaTaxDomain;
  if (!base) throw new Error('MercaTaxDomain must load before tax-remediation.js');

  const PROFILE_IDS = Object.freeze({
    GENERAL_11_5: 'GENERAL_11_5',
    SPECIAL_7: 'SPECIAL_7',
    SPECIAL_4: 'SPECIAL_4',
    ZERO: 'ZERO',
  });

  const TAX_PROFILES = Object.freeze({
    [PROFILE_IDS.GENERAL_11_5]: Object.freeze({
      id: PROFILE_IDS.GENERAL_11_5,
      totalRate: 0.115,
      estatalRate: 0.105,
      municipalRate: 0.01,
      description: 'Perfil técnico IVU combinado 11.5%: 10.5% estatal y 1% municipal.',
    }),
    [PROFILE_IDS.SPECIAL_7]: Object.freeze({
      id: PROFILE_IDS.SPECIAL_7,
      totalRate: 0.07,
      estatalRate: 0.06,
      municipalRate: 0.01,
      description: 'Perfil técnico IVU combinado 7%: 6% estatal y 1% municipal.',
    }),
    [PROFILE_IDS.SPECIAL_4]: Object.freeze({
      id: PROFILE_IDS.SPECIAL_4,
      totalRate: 0.04,
      estatalRate: 0.04,
      municipalRate: 0,
      description: 'Perfil técnico IVU especial 4%: 4% estatal y 0% municipal.',
    }),
    [PROFILE_IDS.ZERO]: Object.freeze({
      id: PROFILE_IDS.ZERO,
      totalRate: 0,
      estatalRate: 0,
      municipalRate: 0,
      description: 'Perfil matemático 0%; no determina exención ni elegibilidad legal.',
    }),
  });

  const ROUNDING_POLICY = Object.freeze({
    status: 'POLICY/TAX SME REQUIRED',
    included: 'HISTORICAL_COMPATIBILITY_SEQUENCE',
    added: 'TECHNICAL_RECONCILIATION_PENDING_TAX_SME',
  });

  const RATE_TO_PROFILE = new Map(
    Object.values(TAX_PROFILES).map((profile) => [base.roundRate(profile.totalRate), profile]),
  );

  function taxError(message, code) {
    return new base.DomainValidationError(message, code);
  }

  function validateProfile(profile) {
    if (!profile || typeof profile !== 'object') {
      throw taxError('Perfil tributario inválido', 'INVALID_TAX_PROFILE');
    }
    const totalRate = base.normalizeRate(profile.totalRate);
    const estatalRate = base.normalizeRate(profile.estatalRate);
    const municipalRate = base.normalizeRate(profile.municipalRate);
    if (base.roundRate(estatalRate + municipalRate) !== base.roundRate(totalRate)) {
      throw taxError('Los componentes del perfil no reconcilian con la tasa total', 'INVALID_TAX_PROFILE');
    }
    return Object.freeze({
      id: String(profile.id || 'EXPLICIT_PROFILE'),
      totalRate,
      estatalRate,
      municipalRate,
      description: String(profile.description || 'Perfil tributario explícito provisto externamente.'),
    });
  }

  function resolveTaxProfile(profileOrRate = PROFILE_IDS.GENERAL_11_5) {
    if (typeof profileOrRate === 'string') {
      const profile = TAX_PROFILES[profileOrRate];
      if (!profile) throw taxError('Perfil tributario desconocido', 'UNKNOWN_TAX_PROFILE');
      return profile;
    }
    if (typeof profileOrRate === 'number') {
      const rate = base.normalizeRate(profileOrRate);
      const profile = RATE_TO_PROFILE.get(base.roundRate(rate));
      if (!profile) {
        throw taxError('La tasa numérica requiere un perfil tributario explícito', 'TAX_PROFILE_REQUIRED');
      }
      return profile;
    }
    return validateProfile(profileOrRate);
  }

  function taxResult(baseAmount, estatal, municipal, total, profile) {
    const baseValue = base.roundCurrency(baseAmount);
    const estatalValue = base.roundCurrency(estatal);
    const municipalValue = base.roundCurrency(municipal);
    const ivu = base.roundCurrency(estatalValue + municipalValue);
    const totalValue = base.roundCurrency(total);
    if (base.roundCurrency(baseValue + ivu) !== totalValue) {
      throw taxError('El desglose tributario no reconcilia a centavos', 'TAX_RECONCILIATION_ERROR');
    }
    return {
      total: totalValue,
      base: baseValue,
      ivu,
      estatal: estatalValue,
      municipal: municipalValue,
      rate: profile.totalRate,
      estatalRate: profile.estatalRate,
      municipalRate: profile.municipalRate,
      profileId: profile.id,
    };
  }

  /*
   * Historical inverse rounding policy preserved for R1:
   * 1) round input total to cents;
   * 2) derive raw base from total / (1 + combined rate);
   * 3) round base to cents;
   * 4) IVU is the rounded remainder total - base;
   * 5) municipal component is rounded from raw base * explicit municipal rate;
   * 6) state component is the IVU remainder so all amounts reconcile to cents.
   * This is a mathematical compatibility policy only; TAX SME must certify any legal rounding requirement.
   */
  function calculateTaxIncluded(amount, profileOrRate = PROFILE_IDS.GENERAL_11_5) {
    const profile = resolveTaxProfile(profileOrRate);
    const total = base.roundCurrency(Number(amount));
    if (!Number.isFinite(total)) throw taxError('monto debe ser un número finito', 'INVALID_NUMBER');
    if (total < 0) throw taxError('El monto no puede ser negativo', 'INVALID_AMOUNT');
    if (profile.totalRate === 0) return taxResult(total, 0, 0, total, profile);

    const rawBase = total / (1 + profile.totalRate);
    const baseAmount = base.roundCurrency(rawBase);
    const ivu = base.roundCurrency(total - baseAmount);
    const municipal = base.roundCurrency(rawBase * profile.municipalRate);
    const estatal = base.roundCurrency(ivu - municipal);
    return taxResult(baseAmount, estatal, municipal, total, profile);
  }

  /*
   * Added-IVU technical reconciliation policy:
   * total tax is rounded from base * combined rate; municipal is rounded independently;
   * state receives the tax remainder so base + state + municipal always equals total.
   * This newly exposed operation requires independent TAX SME review before legal certification.
   */
  function calculateTaxAdded(amount, profileOrRate = PROFILE_IDS.GENERAL_11_5) {
    const profile = resolveTaxProfile(profileOrRate);
    const baseAmount = base.roundCurrency(Number(amount));
    if (!Number.isFinite(baseAmount)) throw taxError('monto debe ser un número finito', 'INVALID_NUMBER');
    if (baseAmount < 0) throw taxError('El monto no puede ser negativo', 'INVALID_AMOUNT');

    const ivu = base.roundCurrency(baseAmount * profile.totalRate);
    const municipal = base.roundCurrency(baseAmount * profile.municipalRate);
    const estatal = base.roundCurrency(ivu - municipal);
    const total = base.roundCurrency(baseAmount + ivu);
    return taxResult(baseAmount, estatal, municipal, total, profile);
  }

  function calculateIvuBreakdown(amount, profileOrRate = PROFILE_IDS.GENERAL_11_5) {
    const { profileId, ...legacyResult } = calculateTaxIncluded(amount, profileOrRate);
    return legacyResult;
  }

  function municipalRate(profileOrRate = PROFILE_IDS.GENERAL_11_5) {
    return resolveTaxProfile(profileOrRate).municipalRate;
  }

  function estatalRate(profileOrRate = PROFILE_IDS.GENERAL_11_5) {
    return resolveTaxProfile(profileOrRate).estatalRate;
  }

  const MUNICIPALITIES = Object.freeze([
    'Adjuntas', 'Aguada', 'Aguadilla', 'Aguas Buenas', 'Aibonito', 'Añasco', 'Arecibo', 'Arroyo',
    'Barceloneta', 'Barranquitas', 'Bayamón', 'Cabo Rojo', 'Caguas', 'Camuy', 'Canóvanas', 'Carolina',
    'Cataño', 'Cayey', 'Ceiba', 'Ciales', 'Cidra', 'Coamo', 'Comerío', 'Corozal', 'Culebra', 'Dorado',
    'Fajardo', 'Florida', 'Guánica', 'Guayama', 'Guayanilla', 'Guaynabo', 'Gurabo', 'Hatillo', 'Hormigueros',
    'Humacao', 'Isabela', 'Jayuya', 'Juana Díaz', 'Juncos', 'Lajas', 'Lares', 'Las Marías', 'Las Piedras',
    'Loíza', 'Luquillo', 'Manatí', 'Maricao', 'Maunabo', 'Mayagüez', 'Moca', 'Morovis', 'Naguabo',
    'Naranjito', 'Orocovis', 'Patillas', 'Peñuelas', 'Ponce', 'Quebradillas', 'Rincón', 'Río Grande',
    'Sabana Grande', 'Salinas', 'San Germán', 'San Juan', 'San Lorenzo', 'San Sebastián', 'Santa Isabel',
    'Toa Alta', 'Toa Baja', 'Trujillo Alto', 'Utuado', 'Vega Alta', 'Vega Baja', 'Vieques', 'Villalba',
    'Yabucoa', 'Yauco',
  ]);

  const MUNICIPAL_ADMINISTRATION = Object.freeze({
    MUNICIPAL_OWN_MECHANISM: 'MUNICIPAL_OWN_MECHANISM',
    SURI_REPORTED: 'SURI_REPORTED',
  });

  const OWN_MECHANISM_MUNICIPALITIES = new Set(['Bayamón', 'Carolina', 'Guaynabo', 'Mayagüez', 'San Juan']);
  const MUNICIPALITY_METADATA = Object.freeze(MUNICIPALITIES.map((name) => Object.freeze({
    name,
    administration: OWN_MECHANISM_MUNICIPALITIES.has(name)
      ? MUNICIPAL_ADMINISTRATION.MUNICIPAL_OWN_MECHANISM
      : MUNICIPAL_ADMINISTRATION.SURI_REPORTED,
    classificationBasis: 'TAX_SME_REPORTED_2026',
  })));

  const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
  const ISO_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

  function assertMonth(period) {
    if (typeof period !== 'string' || !MONTH_RE.test(period)) {
      throw taxError('Periodo mensual inválido', 'INVALID_MONTH');
    }
    return period;
  }

  function parseIsoDate(date) {
    if (typeof date !== 'string' || !ISO_DATE_RE.test(date)) {
      throw taxError('Fecha inválida', 'INVALID_DATE');
    }
    const parsed = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      throw taxError('Fecha inválida', 'INVALID_DATE');
    }
    return parsed;
  }

  function toIsoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function normalizeNonWorkingDates(dates = []) {
    if (!Array.isArray(dates)) throw taxError('Lista de días no laborables inválida', 'INVALID_NON_WORKING_DATES');
    return new Set(dates.map((date) => toIsoDate(parseIsoDate(date))));
  }

  function isNonWorkingDate(date, nonWorkingDates = []) {
    const parsed = typeof date === 'string' ? parseIsoDate(date) : date;
    const day = parsed.getUTCDay();
    const configured = nonWorkingDates instanceof Set ? nonWorkingDates : normalizeNonWorkingDates(nonWorkingDates);
    return day === 0 || day === 6 || configured.has(toIsoDate(parsed));
  }

  function moveToNextBusinessDay(date, nonWorkingDates = []) {
    const configured = nonWorkingDates instanceof Set ? nonWorkingDates : normalizeNonWorkingDates(nonWorkingDates);
    const cursor = typeof date === 'string' ? parseIsoDate(date) : new Date(date.getTime());
    while (isNonWorkingDate(cursor, configured)) cursor.setUTCDate(cursor.getUTCDate() + 1);
    return toIsoDate(cursor);
  }

  function monthlyReturnRegularDate(period) {
    assertMonth(period);
    const [yearText, monthText] = period.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    return toIsoDate(new Date(Date.UTC(year, month, 20)));
  }

  function semimonthlyRegularDates(period) {
    assertMonth(period);
    const [yearText, monthText] = period.split('-');
    const year = Number(yearText);
    const monthIndex = Number(monthText) - 1;
    return {
      FIRST: toIsoDate(new Date(Date.UTC(year, monthIndex, 15))),
      SECOND: toIsoDate(new Date(Date.UTC(year, monthIndex + 1, 0))),
    };
  }

  const CALENDAR_OBLIGATIONS = Object.freeze({
    MONTHLY_RETURN: 'MONTHLY_RETURN',
    SEMIMONTHLY_DEPOSIT: 'SEMIMONTHLY_DEPOSIT',
  });

  const DEPOSIT_CLASSIFICATIONS = Object.freeze({
    NOT_CONFIGURED: 'NOT_CONFIGURED',
    SEMIMONTHLY: 'SEMIMONTHLY',
  });

  function findOverride(overrides, obligation, period, installment = null) {
    if (overrides === undefined) return null;
    if (!Array.isArray(overrides)) throw taxError('Overrides de calendario inválidos', 'INVALID_CALENDAR_OVERRIDES');
    const match = overrides.find((item) => item
      && item.obligation === obligation
      && item.period === period
      && (item.installment || null) === installment);
    if (!match) return null;
    const officialDate = toIsoDate(parseIsoDate(match.officialDate));
    return Object.freeze({
      obligation,
      period,
      installment,
      officialDate,
      reason: typeof match.reason === 'string' ? match.reason : '',
      reference: typeof match.reference === 'string' ? match.reference : '',
    });
  }

  function dueDateRecord({ obligation, period, installment = null, regularDate, nonWorkingDates, overrides }) {
    const adjustedDate = moveToNextBusinessDay(regularDate, nonWorkingDates);
    const override = findOverride(overrides, obligation, period, installment);
    return Object.freeze({
      obligation,
      period,
      installment,
      regularDate,
      adjustedDate,
      dueDate: override ? override.officialDate : adjustedDate,
      overrideApplied: Boolean(override),
      override,
    });
  }

  function calculateMonthlyReturnDueDate(period, options = {}) {
    assertMonth(period);
    const nonWorkingDates = normalizeNonWorkingDates(options.nonWorkingDates || []);
    return dueDateRecord({
      obligation: CALENDAR_OBLIGATIONS.MONTHLY_RETURN,
      period,
      regularDate: monthlyReturnRegularDate(period),
      nonWorkingDates,
      overrides: options.overrides || [],
    });
  }

  function calculateDepositSchedule(period, options = {}) {
    assertMonth(period);
    const classification = options.classification || DEPOSIT_CLASSIFICATIONS.NOT_CONFIGURED;
    if (classification === DEPOSIT_CLASSIFICATIONS.NOT_CONFIGURED) return Object.freeze([]);
    if (classification !== DEPOSIT_CLASSIFICATIONS.SEMIMONTHLY) {
      throw taxError('Clasificación de depósitos inválida', 'INVALID_DEPOSIT_CLASSIFICATION');
    }
    const nonWorkingDates = normalizeNonWorkingDates(options.nonWorkingDates || []);
    const regular = semimonthlyRegularDates(period);
    return Object.freeze(['FIRST', 'SECOND'].map((installment) => dueDateRecord({
      obligation: CALENDAR_OBLIGATIONS.SEMIMONTHLY_DEPOSIT,
      period,
      installment,
      regularDate: regular[installment],
      nonWorkingDates,
      overrides: options.overrides || [],
    })));
  }

  root.MercaTaxDomain = Object.freeze({
    ...base,
    DEFAULT_RATE: TAX_PROFILES[PROFILE_IDS.GENERAL_11_5].totalRate,
    MUNICIPAL_COMPONENT_RATE: TAX_PROFILES[PROFILE_IDS.GENERAL_11_5].municipalRate,
    PROFILE_IDS,
    TAX_PROFILES,
    ROUNDING_POLICY,
    resolveTaxProfile,
    calculateTaxIncluded,
    calculateTaxAdded,
    calculateIvuBreakdown,
    municipalRate,
    estatalRate,
    MUNICIPALITIES,
    MUNICIPALITY_METADATA,
    MUNICIPAL_ADMINISTRATION,
    CALENDAR_OBLIGATIONS,
    DEPOSIT_CLASSIFICATIONS,
    isNonWorkingDate,
    moveToNextBusinessDay,
    monthlyReturnRegularDate,
    semimonthlyRegularDates,
    calculateMonthlyReturnDueDate,
    calculateDepositSchedule,
  });
}(globalThis));
