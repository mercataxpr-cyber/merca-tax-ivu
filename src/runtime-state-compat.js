/* MercaTax IVU PR — persisted-state compatibility guard.
 * Runs before src/app.js so legacy browser state cannot prevent the UI from booting.
 */
(function normalizeMercaTaxPersistedState(root) {
  'use strict';

  const STORAGE_KEY = 'mt_ai_state';
  const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

  function currentMonth() {
    return new Date().toISOString().slice(0, 7);
  }

  let raw;
  try {
    raw = root.localStorage && root.localStorage.getItem(STORAGE_KEY);
  } catch (_) {
    return;
  }
  if (!raw) return;

  let state;
  try {
    state = JSON.parse(raw);
  } catch (_) {
    // src/app.js already has a safe parser for malformed JSON. Do not overwrite it here.
    return;
  }

  if (!state || typeof state !== 'object' || Array.isArray(state)) return;

  let changed = false;

  // Older web builds allowed annual/non-month tokens such as "all". The certified
  // runtime now requires YYYY-MM and otherwise throws before the vNext screen is activated.
  if (!MONTH_RE.test(String(state.selectedMonth || ''))) {
    state.selectedMonth = currentMonth();
    changed = true;
  }

  // Keep old partial states bootable without deleting valid user records.
  if (state.sales !== undefined && !Array.isArray(state.sales)) {
    state.sales = [];
    changed = true;
  }

  if (!changed) return;

  try {
    root.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {
    // Storage can be unavailable in private/restricted contexts; app.js will use its normal fallback.
  }
}(globalThis));
