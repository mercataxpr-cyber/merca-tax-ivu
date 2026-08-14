import '../src/domain.js';

export const domain = globalThis.MercaTaxDomain;

export function sampleState() {
  return {
    selectedMonth: '2026-08',
    currentBusinessId: 'biz_a',
    businesses: [
      { id: 'biz_a', name: 'Negocio A', muni: 'San Juan', gmail: 'owner@example.com', merchantNo: 'REG-1', ein: '00-0000000', phone: '7870000000', email: 'private@example.com', address: 'Calle 1' },
      { id: 'biz_b', name: 'Negocio B', muni: 'Ponce', gmail: '', merchantNo: '', ein: '', phone: '', email: '', address: '' },
    ],
    sales: [
      { id: 'sale_a', date: '2026-08-10', amount: 111.50, rate: 0.115, muni: 'San Juan', businessId: 'biz_a', businessName: 'Negocio A', businessMuni: 'San Juan' },
      { id: 'sale_b', date: '2026-08-11', amount: 223.00, rate: 0.115, muni: 'Ponce', businessId: 'biz_b', businessName: 'Negocio B', businessMuni: 'Ponce' },
      { id: 'sale_c', date: '2026-07-15', amount: 50.00, rate: 0, muni: 'San Juan', businessId: 'biz_a', businessName: 'Negocio A', businessMuni: 'San Juan' },
    ],
  };
}
