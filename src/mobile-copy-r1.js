/* MercaTax IVU PR — approved product copy normalization.
 * Presentation-only. Keeps WhatsApp filing CTAs aligned with the actual action.
 */
(function installMercaTaxCopyR1(root) {
  'use strict';

  const doc = root.document;
  if (!doc) return;

  const WRONG = 'Compartir por WhatsApp';
  const CORRECT = 'Radicar por WhatsApp';

  function normalizeElement(element) {
    if (!element || typeof element.innerHTML !== 'string') return;
    if (!element.textContent || !element.textContent.includes(WRONG)) return;
    element.innerHTML = element.innerHTML.replaceAll(WRONG, CORRECT);
  }

  function apply(scope = doc) {
    if (scope.nodeType === 1) normalizeElement(scope);
    if (typeof scope.querySelectorAll !== 'function') return;
    scope.querySelectorAll('button, a').forEach(normalizeElement);
  }

  apply();

  if (typeof root.MutationObserver === 'function' && doc.body) {
    const observer = new root.MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node && (node.nodeType === 1 || node.nodeType === 9)) apply(node);
        });
      }
    });
    observer.observe(doc.body, { childList: true, subtree: true });
  }
}(typeof globalThis !== 'undefined' ? globalThis : this));
