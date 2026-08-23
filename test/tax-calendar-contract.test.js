import test from 'node:test';
import assert from 'node:assert/strict';

import '../src/domain.js';
import '../src/tax-remediation.js';
import '../src/tax-calendar-contract.js';

const domain = globalThis.MercaTaxDomain;

function certifiedCalendar(nonWorkingDates = [], overrides = {}) {
  return {
    status: domain.CALENDAR_STATUS.CERTIFIED,
    nonWorkingDates,
    jurisdiction: 'Puerto Rico',
    validFrom: '2026-01-01',
    validThrough: '2028-12-31',
    source: 'Certified calendar test fixture',
    reference: 'CALENDAR-R1-TEST',
    ...overrides,
  };
}

test('A: regular weekday + certified calendar returns certified effectiveDate', () => {
  const result = domain.calculateMonthlyReturnDueDate('2026-04', { calendar: certifiedCalendar() });
  assert.equal(result.regularDate, '2026-05-20');
  assert.equal(result.adjustedDate, '2026-05-20');
  assert.equal(result.effectiveDate, '2026-05-20');
  assert.equal(result.dueDate, '2026-05-20');
  assert.equal(result.status, domain.EFFECTIVE_DATE_STATUS.CERTIFIED);
  assert.equal(result.effectiveDateSource, 'REGULAR_DATE_CERTIFIED');
});

test('B: Saturday moves to next valid day under certified calendar', () => {
  const result = domain.calculateMonthlyReturnDueDate('2026-05', { calendar: certifiedCalendar() });
  assert.equal(result.regularDate, '2026-06-20');
  assert.equal(result.effectiveDate, '2026-06-22');
  assert.equal(result.effectiveDateSource, 'CALENDAR_ADJUSTED');
});

test('C: Sunday moves to next valid day under certified calendar', () => {
  const result = domain.calculateMonthlyReturnDueDate('2026-08', { calendar: certifiedCalendar() });
  assert.equal(result.regularDate, '2026-09-20');
  assert.equal(result.effectiveDate, '2026-09-21');
});

test('D: configured Monday non-working date moves to next day', () => {
  const result = domain.calculateMonthlyReturnDueDate('2026-06', {
    calendar: certifiedCalendar(['2026-07-20']),
  });
  assert.equal(result.regularDate, '2026-07-20');
  assert.equal(result.effectiveDate, '2026-07-21');
});

test('E: Saturday + Sunday + Monday non-working moves to Tuesday', () => {
  const result = domain.calculateMonthlyReturnDueDate('2026-05', {
    calendar: certifiedCalendar(['2026-06-22']),
  });
  assert.equal(result.regularDate, '2026-06-20');
  assert.equal(result.effectiveDate, '2026-06-23');
});

test('F: two consecutive configured non-working weekdays are both traversed', () => {
  const result = domain.calculateMonthlyReturnDueDate('2026-06', {
    calendar: certifiedCalendar(['2026-07-20', '2026-07-21']),
  });
  assert.equal(result.effectiveDate, '2026-07-22');
});

test('G: absent calendar fails closed with no effectiveDate', () => {
  const result = domain.calculateMonthlyReturnDueDate('2026-04');
  assert.equal(result.status, domain.EFFECTIVE_DATE_STATUS.CALENDAR_REQUIRED);
  assert.equal(result.regularDate, '2026-05-20');
  assert.equal(result.adjustedDate, null);
  assert.equal(result.effectiveDate, null);
  assert.equal(result.dueDate, null);
  assert.equal(result.calendarStatus, domain.CALENDAR_STATUS.REQUIRED);
});

test('H: empty legacy/non-certified list is not equivalent to a certified calendar', () => {
  const legacy = domain.calculateMonthlyReturnDueDate('2026-04', { nonWorkingDates: [] });
  assert.equal(legacy.status, domain.EFFECTIVE_DATE_STATUS.CALENDAR_REQUIRED);
  assert.equal(legacy.effectiveDate, null);

  const uncertified = domain.calculateMonthlyReturnDueDate('2026-04', {
    calendar: { status: 'UNKNOWN', nonWorkingDates: [] },
  });
  assert.equal(uncertified.status, domain.EFFECTIVE_DATE_STATUS.CALENDAR_REQUIRED);
  assert.equal(uncertified.effectiveDate, null);
});

test('I: certified calendar whose range does not cover evaluated date fails closed', () => {
  const result = domain.calculateMonthlyReturnDueDate('2026-04', {
    calendar: certifiedCalendar([], { validFrom: '2026-05-21' }),
  });
  assert.equal(result.status, domain.EFFECTIVE_DATE_STATUS.CALENDAR_REQUIRED);
  assert.equal(result.effectiveDate, null);
  assert.equal(result.calendarReason, 'CALENDAR_RANGE_DOES_NOT_COVER_DATE');
});

test('J: certified calendar with valid coverage is accepted even when nonWorkingDates is empty', () => {
  const result = domain.calculateMonthlyReturnDueDate('2026-04', {
    calendar: certifiedCalendar([]),
  });
  assert.equal(result.status, domain.EFFECTIVE_DATE_STATUS.CERTIFIED);
  assert.equal(result.calendar.status, domain.CALENDAR_STATUS.CERTIFIED);
  assert.equal(result.calendar.nonWorkingDates.length, 0);
  assert.equal(result.effectiveDate, '2026-05-20');
});

test('K: valid official override remains final and preserves metadata', () => {
  const result = domain.calculateMonthlyReturnDueDate('2026-04', {
    calendar: certifiedCalendar(),
    overrides: [{
      obligation: domain.CALENDAR_OBLIGATIONS.MONTHLY_RETURN,
      period: '2026-04',
      officialDate: '2026-05-27',
      reason: 'Official postponement example',
      reference: 'OFFICIAL-REF',
    }],
  });
  assert.equal(result.adjustedDate, '2026-05-20');
  assert.equal(result.effectiveDate, '2026-05-27');
  assert.equal(result.dueDate, '2026-05-27');
  assert.equal(result.effectiveDateSource, 'OFFICIAL_OVERRIDE');
  assert.equal(result.overrideApplied, true);
  assert.equal(result.override.reference, 'OFFICIAL-REF');
});

test('L: official override without reference is rejected', () => {
  assert.throws(() => domain.calculateMonthlyReturnDueDate('2026-04', {
    calendar: certifiedCalendar(),
    overrides: [{
      obligation: domain.CALENDAR_OBLIGATIONS.MONTHLY_RETURN,
      period: '2026-04',
      officialDate: '2026-05-27',
      reason: 'Official postponement example',
    }],
  }), (error) => error.code === 'INVALID_CALENDAR_OVERRIDE');
});

test('semimonthly calendar dates preserve existing calendar math and certification contract', () => {
  assert.deepEqual(domain.calculateDepositSchedule('2026-01'), []);
  const result = domain.calculateDepositSchedule('2026-01', {
    classification: domain.DEPOSIT_CLASSIFICATIONS.SEMIMONTHLY,
    calendar: certifiedCalendar(),
  });
  assert.equal(result[0].regularDate, '2026-01-15');
  assert.equal(result[0].effectiveDate, '2026-01-15');
  assert.equal(result[1].regularDate, '2026-01-31');
  assert.equal(result[1].effectiveDate, '2026-02-02');
  assert.equal(result[0].status, domain.EFFECTIVE_DATE_STATUS.CERTIFIED);
  assert.equal(result[1].status, domain.EFFECTIVE_DATE_STATUS.CERTIFIED);
});
