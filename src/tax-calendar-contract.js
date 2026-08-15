/* MercaTax IVU R1 final calendar certification contract. */
(function attachMercaTaxCertifiedCalendarContract(root) {
  'use strict';

  const base = root.MercaTaxDomain;
  if (!base) throw new Error('MercaTaxDomain must load before tax-calendar-contract.js');

  const CALENDAR_STATUS = Object.freeze({
    CERTIFIED: 'CERTIFIED',
    REQUIRED: 'CALENDAR_REQUIRED',
  });

  const EFFECTIVE_DATE_STATUS = Object.freeze({
    CERTIFIED: 'EFFECTIVE_DATE_CERTIFIED',
    CALENDAR_REQUIRED: 'CALENDAR_REQUIRED',
  });

  const ISO_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

  function taxError(message, code) {
    return new base.DomainValidationError(message, code);
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

  function nonEmptyText(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  function normalizeNonWorkingDates(dates) {
    if (!Array.isArray(dates)) {
      throw taxError('Lista de días no laborables inválida', 'INVALID_NON_WORKING_DATES');
    }
    return Object.freeze([...new Set(dates.map((date) => toIsoDate(parseIsoDate(date))))].sort());
  }

  function calendarRequired(reason, supplied = null) {
    return Object.freeze({
      status: CALENDAR_STATUS.REQUIRED,
      reason,
      jurisdiction: supplied && nonEmptyText(supplied.jurisdiction),
      validFrom: supplied && typeof supplied.validFrom === 'string' ? supplied.validFrom : null,
      validThrough: supplied && typeof supplied.validThrough === 'string' ? supplied.validThrough : null,
      source: supplied && nonEmptyText(supplied.source),
      reference: supplied && nonEmptyText(supplied.reference),
      nonWorkingDates: null,
    });
  }

  function normalizeCertifiedCalendar(calendar) {
    if (!calendar || typeof calendar !== 'object' || Array.isArray(calendar)) {
      return calendarRequired('CALENDAR_NOT_SUPPLIED');
    }
    if (calendar.status !== CALENDAR_STATUS.CERTIFIED) {
      return calendarRequired('CALENDAR_NOT_CERTIFIED', calendar);
    }

    const jurisdiction = nonEmptyText(calendar.jurisdiction);
    const source = nonEmptyText(calendar.source);
    const reference = nonEmptyText(calendar.reference);
    if (!jurisdiction || !source || !reference || !calendar.validFrom || !calendar.validThrough) {
      return calendarRequired('CALENDAR_CERTIFICATION_METADATA_REQUIRED', calendar);
    }

    let validFrom;
    let validThrough;
    let nonWorkingDates;
    try {
      validFrom = toIsoDate(parseIsoDate(calendar.validFrom));
      validThrough = toIsoDate(parseIsoDate(calendar.validThrough));
      nonWorkingDates = normalizeNonWorkingDates(calendar.nonWorkingDates);
    } catch (error) {
      if (error instanceof base.DomainValidationError) {
        return calendarRequired('CALENDAR_CERTIFICATION_INVALID', calendar);
      }
      throw error;
    }

    if (validFrom > validThrough) {
      return calendarRequired('CALENDAR_CERTIFICATION_INVALID_RANGE', calendar);
    }

    return Object.freeze({
      status: CALENDAR_STATUS.CERTIFIED,
      jurisdiction,
      validFrom,
      validThrough,
      source,
      reference,
      nonWorkingDates,
    });
  }

  function calendarCovers(calendar, date) {
    return calendar.status === CALENDAR_STATUS.CERTIFIED
      && date >= calendar.validFrom
      && date <= calendar.validThrough;
  }

  function moveToNextCertifiedBusinessDay(date, calendar) {
    const normalized = normalizeCertifiedCalendar(calendar);
    if (normalized.status !== CALENDAR_STATUS.CERTIFIED) {
      return Object.freeze({ status: CALENDAR_STATUS.REQUIRED, reason: normalized.reason, date: null, calendar: normalized });
    }

    const configured = new Set(normalized.nonWorkingDates);
    const cursor = parseIsoDate(date);
    while (true) {
      const iso = toIsoDate(cursor);
      if (!calendarCovers(normalized, iso)) {
        return Object.freeze({
          status: CALENDAR_STATUS.REQUIRED,
          reason: 'CALENDAR_RANGE_DOES_NOT_COVER_DATE',
          date: null,
          calendar: normalized,
        });
      }
      const day = cursor.getUTCDay();
      if (day !== 0 && day !== 6 && !configured.has(iso)) {
        return Object.freeze({ status: CALENDAR_STATUS.CERTIFIED, reason: null, date: iso, calendar: normalized });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  function findOverride(overrides, obligation, period, installment = null) {
    if (overrides === undefined || overrides === null) return null;
    if (!Array.isArray(overrides)) {
      throw taxError('Overrides de calendario inválidos', 'INVALID_CALENDAR_OVERRIDES');
    }
    const match = overrides.find((item) => item
      && item.obligation === obligation
      && item.period === period
      && (item.installment || null) === installment);
    if (!match) return null;

    const reason = nonEmptyText(match.reason);
    const reference = nonEmptyText(match.reference);
    if (!reason || !reference) {
      throw taxError('Override oficial requiere reason y reference', 'INVALID_CALENDAR_OVERRIDE');
    }

    return Object.freeze({
      obligation,
      period,
      installment,
      officialDate: toIsoDate(parseIsoDate(match.officialDate)),
      reason,
      reference,
    });
  }

  function unresolvedRecord({ obligation, period, installment, regularDate, override, calendar, reason }) {
    return Object.freeze({
      status: EFFECTIVE_DATE_STATUS.CALENDAR_REQUIRED,
      obligation,
      period,
      installment,
      regularDate,
      adjustedDate: null,
      effectiveDate: null,
      dueDate: null,
      effectiveDateSource: null,
      overrideApplied: Boolean(override),
      override,
      calendarStatus: CALENDAR_STATUS.REQUIRED,
      calendar,
      calendarReason: reason,
    });
  }

  function dueDateRecord({ obligation, period, installment = null, regularDate, calendar, overrides }) {
    const override = findOverride(overrides, obligation, period, installment);
    const movement = moveToNextCertifiedBusinessDay(regularDate, calendar);
    if (movement.status !== CALENDAR_STATUS.CERTIFIED) {
      return unresolvedRecord({
        obligation,
        period,
        installment,
        regularDate,
        override,
        calendar: movement.calendar,
        reason: movement.reason,
      });
    }

    const adjustedDate = movement.date;
    const effectiveDate = override ? override.officialDate : adjustedDate;
    const effectiveDateSource = override
      ? 'OFFICIAL_OVERRIDE'
      : adjustedDate === regularDate
        ? 'REGULAR_DATE_CERTIFIED'
        : 'CALENDAR_ADJUSTED';

    return Object.freeze({
      status: EFFECTIVE_DATE_STATUS.CERTIFIED,
      obligation,
      period,
      installment,
      regularDate,
      adjustedDate,
      effectiveDate,
      dueDate: effectiveDate,
      effectiveDateSource,
      overrideApplied: Boolean(override),
      override,
      calendarStatus: CALENDAR_STATUS.CERTIFIED,
      calendar: movement.calendar,
      calendarReason: null,
    });
  }

  function calculateMonthlyReturnDueDate(period, options = {}) {
    const regularDate = base.monthlyReturnRegularDate(period);
    const calendar = options.calendar || null;
    const legacyDatesPresent = Object.prototype.hasOwnProperty.call(options, 'nonWorkingDates');
    const effectiveCalendar = calendar || (legacyDatesPresent
      ? { status: 'LEGACY_UNCERTIFIED', nonWorkingDates: options.nonWorkingDates }
      : null);

    return dueDateRecord({
      obligation: base.CALENDAR_OBLIGATIONS.MONTHLY_RETURN,
      period,
      regularDate,
      calendar: effectiveCalendar,
      overrides: options.overrides || [],
    });
  }

  function calculateDepositSchedule(period, options = {}) {
    const classification = options.classification || base.DEPOSIT_CLASSIFICATIONS.NOT_CONFIGURED;
    if (classification === base.DEPOSIT_CLASSIFICATIONS.NOT_CONFIGURED) return Object.freeze([]);
    if (classification !== base.DEPOSIT_CLASSIFICATIONS.SEMIMONTHLY) {
      throw taxError('Clasificación de depósitos inválida', 'INVALID_DEPOSIT_CLASSIFICATION');
    }

    const regular = base.semimonthlyRegularDates(period);
    const calendar = options.calendar || null;
    const legacyDatesPresent = Object.prototype.hasOwnProperty.call(options, 'nonWorkingDates');
    const effectiveCalendar = calendar || (legacyDatesPresent
      ? { status: 'LEGACY_UNCERTIFIED', nonWorkingDates: options.nonWorkingDates }
      : null);

    return Object.freeze(['FIRST', 'SECOND'].map((installment) => dueDateRecord({
      obligation: base.CALENDAR_OBLIGATIONS.SEMIMONTHLY_DEPOSIT,
      period,
      installment,
      regularDate: regular[installment],
      calendar: effectiveCalendar,
      overrides: options.overrides || [],
    })));
  }

  root.MercaTaxDomain = Object.freeze({
    ...base,
    CALENDAR_STATUS,
    EFFECTIVE_DATE_STATUS,
    normalizeCertifiedCalendar,
    moveToNextCertifiedBusinessDay,
    calculateMonthlyReturnDueDate,
    calculateDepositSchedule,
  });
}(globalThis));
