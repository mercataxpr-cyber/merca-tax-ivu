/* MercaTax IVU PR — Store Release UI R2
 * Release presentation only. Removes unreleased/placeholder controls from the
 * production UI without changing tax calculations, reports, storage, or native APIs.
 */
(function installStoreReleaseUiR2(root) {
  'use strict';

  const doc = root.document;
  if (!doc || root.__MERCATAX_STORE_RELEASE_UI_R2__) return;
  root.__MERCATAX_STORE_RELEASE_UI_R2__ = true;

  function removeAll(selector, scope = doc) {
    if (!scope || typeof scope.querySelectorAll !== 'function') return;
    scope.querySelectorAll(selector).forEach((node) => node.remove());
  }

  function normalizeWhatsAppCopy(scope = doc) {
    if (!scope || typeof scope.querySelectorAll !== 'function') return;
    scope.querySelectorAll('.vxWhats').forEach((button) => {
      if (/compartir\s+por\s+whatsapp/i.test(button.textContent || '')) {
        button.textContent = '◉ Radicar por WhatsApp';
      }
    });
  }

  function clean(scope = doc) {
    // Do not ship controls that advertise functionality not available in v1.0.
    removeAll('.vxAi, .vxNote', scope);
    removeAll('.vxAdLabel, .vxAd', scope);
    normalizeWhatsAppCopy(scope);
  }

  function start() {
    clean();
    if (typeof root.MutationObserver !== 'function' || !doc.documentElement) return;
    const observer = new root.MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes || []) {
          if (!node || node.nodeType !== 1) continue;
          clean(node);
        }
      }
    });
    observer.observe(doc.documentElement, { childList: true, subtree: true });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}(typeof globalThis !== 'undefined' ? globalThis : this));
