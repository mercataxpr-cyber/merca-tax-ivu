import test from 'node:test';
import assert from 'node:assert/strict';
import { domain } from './helpers.js';

const missing28 = [
  'Adjuntas','Aguas Buenas','Aibonito','Arroyo','Barranquitas','Ceiba','Ciales','Comerío','Corozal','Culebra',
  'Florida','Guánica','Guayama','Guayanilla','Hormigueros','Jayuya','Las Marías','Loíza','Maricao','Maunabo',
  'Moca','Morovis','Naguabo','Orocovis','Patillas','Utuado','Vieques','Villalba',
];

test('GENERAL_11_5 explicit profile is 10.5 state + 1 municipal', () => {
  const profile = domain.TAX_PROFILES.GENERAL_11_5;
  assert.equal(profile.totalRate, 0.115);
  assert.equal(profile.estatalRate, 0.105);
  assert.equal(profile.municipalRate, 0.01);
});

test('11.5% added: 100 -> 100 + 10.50 + 1.00 = 111.50', () => {
  const result = domain.calculateTaxAdded(100, 'GENERAL_11_5');
  assert.equal(result.base, 100);
  assert.equal(result.estatal, 10.5);
  assert.equal(result.municipal, 1);
  assert.equal(result.total, 111.5);
});

test('11.5% included: 111.50 -> 100 + 10.50 + 1.00', () => {
  const result = domain.calculateTaxIncluded(111.50, 'GENERAL_11_5');
  assert.equal(result.base, 100);
  assert.equal(result.estatal, 10.5);
  assert.equal(result.municipal, 1);
  assert.equal(result.total, 111.5);
});

test('SPECIAL_7 is 6% state + 1% municipal', () => {
  const result = domain.calculateTaxAdded(100, 'SPECIAL_7');
  assert.equal(result.estatalRate, 0.06);
  assert.equal(result.municipalRate, 0.01);
  assert.equal(result.estatal, 6);
  assert.equal(result.municipal, 1);
  assert.equal(result.total, 107);
});

test('SPECIAL_4 is 4% state + 0% municipal and never 3% + 1%', () => {
  const profile = domain.TAX_PROFILES.SPECIAL_4;
  const result = domain.calculateTaxAdded(100, 0.04);
  assert.equal(profile.estatalRate, 0.04);
  assert.equal(profile.municipalRate, 0);
  assert.equal(result.estatal, 4);
  assert.equal(result.municipal, 0);
  assert.notEqual(result.estatalRate, 0.03);
  assert.notEqual(result.municipalRate, 0.01);
});

test('ZERO remains mathematically valid without legal exemption inference', () => {
  const result = domain.calculateTaxAdded(100, 'ZERO');
  assert.equal(result.base, 100);
  assert.equal(result.estatal, 0);
  assert.equal(result.municipal, 0);
  assert.equal(result.ivu, 0);
  assert.equal(result.total, 100);
});

test('legacy numeric API resolves only known profiles and preserves old result shape', () => {
  assert.equal(domain.calculateIvuBreakdown(104, 0.04).municipal, 0);
  assert.throws(() => domain.calculateIvuBreakdown(110, 0.10), (error) => error.code === 'TAX_PROFILE_REQUIRED');
  const keys = Object.keys(domain.calculateIvuBreakdown(111.5, 0.115)).sort();
  assert.deepEqual(keys, ['base','estatal','estatalRate','ivu','municipal','municipalRate','rate','total'].sort());
});

test('municipality catalog is exactly 78 unique names and includes all 28 reported missing names', () => {
  assert.equal(domain.MUNICIPALITIES.length, 78);
  assert.equal(new Set(domain.MUNICIPALITIES).size, 78);
  for (const name of missing28) assert.ok(domain.MUNICIPALITIES.includes(name), `${name} missing`);
});

test('five reported municipalities use own-mechanism metadata; remaining 73 are SURI-reported', () => {
  const own = domain.MUNICIPALITY_METADATA
    .filter((item) => item.administration === domain.MUNICIPAL_ADMINISTRATION.MUNICIPAL_OWN_MECHANISM)
    .map((item) => item.name)
    .sort();
  assert.deepEqual(own, ['Bayamón','Carolina','Guaynabo','Mayagüez','San Juan'].sort());
  assert.equal(domain.MUNICIPALITY_METADATA.filter((item) => item.administration === domain.MUNICIPAL_ADMINISTRATION.SURI_REPORTED).length, 73);
});

test('monthly return regular due date is day 20 of following month on a business day', () => {
  const result = domain.calculateMonthlyReturnDueDate('2026-04');
  assert.equal(result.regularDate, '2026-05-20');
  assert.equal(result.dueDate, '2026-05-20');
});

test('monthly return day 20 Saturday moves to next business day', () => {
  const result = domain.calculateMonthlyReturnDueDate('2026-05');
  assert.equal(result.regularDate, '2026-06-20');
  assert.equal(result.dueDate, '2026-06-22');
});

test('monthly return day 20 Sunday moves to next business day', () => {
  const result = domain.calculateMonthlyReturnDueDate('2026-08');
  assert.equal(result.regularDate, '2026-09-20');
  assert.equal(result.dueDate, '2026-09-21');
});

test('configured non-working date moves to next business day without hardcoded holiday calendar', () => {
  const result = domain.calculateMonthlyReturnDueDate('2026-04', { nonWorkingDates: ['2026-05-20'] });
  assert.equal(result.dueDate, '2026-05-21');
});

test('semimonthly schedule is opt-in and models day 15 + last day', () => {
  assert.deepEqual(domain.calculateDepositSchedule('2026-01'), []);
  const result = domain.calculateDepositSchedule('2026-01', { classification: domain.DEPOSIT_CLASSIFICATIONS.SEMIMONTHLY });
  assert.equal(result[0].regularDate, '2026-01-15');
  assert.equal(result[1].regularDate, '2026-01-31');
});

test('February and leap-year last-day rules are computed, not hardcoded', () => {
  const normal = domain.calculateDepositSchedule('2026-02', { classification: 'SEMIMONTHLY' });
  const leap = domain.calculateDepositSchedule('2028-02', { classification: 'SEMIMONTHLY' });
  assert.equal(normal[1].regularDate, '2026-02-28');
  assert.equal(leap[1].regularDate, '2028-02-29');
});

test('official override replaces regular/adjusted date and preserves reference metadata', () => {
  const result = domain.calculateMonthlyReturnDueDate('2026-04', {
    overrides: [{
      obligation: domain.CALENDAR_OBLIGATIONS.MONTHLY_RETURN,
      period: '2026-04',
      officialDate: '2026-05-27',
      reason: 'Official postponement example',
      reference: 'OFFICIAL-REF',
    }],
  });
  assert.equal(result.dueDate, '2026-05-27');
  assert.equal(result.overrideApplied, true);
  assert.equal(result.override.reference, 'OFFICIAL-REF');
});

test('rounding rule is certified to Puerto Rico Treasury half-cent policy', () => {
  assert.equal(domain.ROUNDING_POLICY.status, 'ROUNDING_RULE_CERTIFIED');
  assert.equal(domain.ROUNDING_POLICY.method, 'HALF_CENT_UP');
  assert.equal(domain.ROUNDING_POLICY.source, 'PR_TREASURY_IVU_REGULATION_ART_4020_01_1_B_1');
  assert.equal(domain.ROUNDING_POLICY.scope, 'CURRENCY_ROUNDING_ONLY');
  assert.equal(domain.ROUNDING_POLICY.included, 'HISTORICAL_COMPATIBILITY_SEQUENCE');
  assert.equal(domain.ROUNDING_POLICY.added, 'REGULATORY_HALF_CENT_RULE');
});

test('currency helper enforces the official half-cent edge', () => {
  assert.equal(domain.roundCurrency(0.0049), 0);
  assert.equal(domain.roundCurrency(0.005), 0.01);
  assert.equal(domain.roundCurrency(1.005), 1.01);
});

test('11.5% added IVU follows the official half-cent boundary', () => {
  assert.equal(domain.calculateTaxAdded(0.04, 'GENERAL_11_5').ivu, 0);
  assert.equal(domain.calculateTaxAdded(0.05, 'GENERAL_11_5').ivu, 0.01);
});

test('all explicit profiles reconcile base + state + municipal to total at cents precision', () => {
  const amounts = [0.01, 1, 9.99, 19.95, 100, 123.45, 9999.99];
  for (const profileId of Object.values(domain.PROFILE_IDS)) {
    for (const amount of amounts) {
      for (const result of [domain.calculateTaxIncluded(amount, profileId), domain.calculateTaxAdded(amount, profileId)]) {
        assert.equal(domain.roundCurrency(result.base + result.estatal + result.municipal), result.total);
      }
    }
  }
});