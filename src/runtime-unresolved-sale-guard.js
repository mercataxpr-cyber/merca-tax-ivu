/* MercaTax IVU PR — web aggregate guard for unresolved legacy sales.
 * Presentation safety only: it does not assign/guess a tax profile or mutate sales.
 * Legacy sales without a certified profile remain visible for review, while aggregate
 * cards skip only the tax-dependent portions so the vNext UI can finish booting.
 */
(function installUnresolvedSaleAggregateGuard(root) {
  'use strict';

  const taxUi = root.MercaTaxTaxUi;
  const domain = root.MercaTaxDomain;
  if (!taxUi || !domain || typeof taxUi.breakdownForSale !== 'function' || typeof domain.roundCurrency !== 'function') return;

  function safeBreakdown(sale) {
    try {
      return taxUi.breakdownForSale(sale);
    } catch (_) {
      return null;
    }
  }

  function sumBreakdown(items, field) {
    const sales = Array.isArray(items) ? items : [];
    let total = 0;
    for (const sale of sales) {
      const breakdown = safeBreakdown(sale);
      if (!breakdown) continue;
      const value = Number(breakdown[field] || 0);
      if (Number.isFinite(value)) total += value;
    }
    return domain.roundCurrency(total);
  }

  function unresolvedCount(items) {
    const sales = Array.isArray(items) ? items : [];
    let count = 0;
    for (const sale of sales) if (!safeBreakdown(sale)) count += 1;
    return count;
  }

  // Keep the certified sale-level contract strict. Only aggregate presentation
  // helpers become tolerant so one legacy sale cannot blank the whole application.
  root.sumBase = (items) => sumBreakdown(items, 'base');
  root.sumIvu = (items) => sumBreakdown(items, 'ivu');
  root.sumIvuEstatal = (items) => sumBreakdown(items, 'estatal');
  root.sumIvuMunicipal = (items) => sumBreakdown(items, 'municipal');
  root.MercaTaxUnresolvedSaleCount = unresolvedCount;
}(typeof globalThis !== 'undefined' ? globalThis : this));
