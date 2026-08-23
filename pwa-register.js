if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js?v=icon-preview-r3', { scope: '/' })
      .catch(err => console.error('MercaTax PWA service worker registration failed', err));
  });
}
