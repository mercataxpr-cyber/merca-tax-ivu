const LEGAL_SCRIPT_TAG = '<script src="legal-links.js" defer></script>';

export function injectLegalLinks(source) {
  let html = String(source || '');
  if (!html.includes('legal-links.js')) {
    html = /<\/body>/i.test(html)
      ? html.replace(/<\/body>/i, `${LEGAL_SCRIPT_TAG}</body>`)
      : `${html}\n${LEGAL_SCRIPT_TAG}\n`;
  }
  return html;
}

export function stripWebAnalyticsForNative(source) {
  let html = String(source || '');
  // Native packaging intentionally excludes Google Analytics. The public web
  // site may continue using its disclosed web analytics configuration.
  html = html.replace(/<script\s+async\s+src=["']https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"']+["']\s*><\/script>\s*/gi, '');
  html = html.replace(/<script>\s*window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\];[\s\S]*?gtag\(['"]config['"],[\s\S]*?<\/script>\s*/gi, '');
  return html;
}
