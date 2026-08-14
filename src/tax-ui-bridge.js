/* Minimal UI bridge for R1 tax-domain metadata. No visual redesign. */
(function attachMercaTaxTaxUiBridge(root) {
  'use strict';

  const domain = root.MercaTaxDomain;
  if (!domain || !Array.isArray(domain.MUNICIPALITIES)) return;

  function populateMunicipalitySelect(id) {
    const select = root.document && root.document.getElementById(id);
    if (!select) return;
    const previousValue = select.value;
    select.innerHTML = domain.MUNICIPALITIES
      .map((name) => `<option>${name}</option>`)
      .join('');
    if (domain.MUNICIPALITIES.includes(previousValue)) select.value = previousValue;
  }

  populateMunicipalitySelect('muni');

  if (typeof root.showDialog === 'function') {
    const originalShowDialog = root.showDialog;
    root.showDialog = function showDialogWithTaxMetadata(type) {
      const result = originalShowDialog.apply(this, arguments);
      if (type === 'negocio') populateMunicipalitySelect('bizMuniInput');
      return result;
    };
  }
}(globalThis));
