import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const indexPath = 'public/index.html';
const homeRefinementPath = 'src/mobile-home-card-r2.js';
const vnextBuiltPath = 'public/src/mobile-vnext-ui.js';

if (!existsSync(indexPath)) throw new Error('public/index.html missing');
if (!existsSync(homeRefinementPath)) throw new Error('approved home refinement source missing');
if (!existsSync(vnextBuiltPath)) throw new Error('built vNext UI missing');

const homeSource = readFileSync(homeRefinementPath, 'utf8');
const cssMatch = homeSource.match(/style\.textContent = `([\s\S]*?)`;\n\s*doc\.head\.appendChild\(style\);/);
if (!cssMatch) throw new Error('approved home CSS block not found');

let index = readFileSync(indexPath, 'utf8');
const styleTag = `<style id="mercatax-approved-home-static">${cssMatch[1]}</style>`;
if (!index.includes('mercatax-approved-home-static')) {
  index = index.replace('</head>', `${styleTag}</head>`);
}
writeFileSync(indexPath, index);

let vnext = readFileSync(vnextBuiltPath, 'utf8');
vnext = vnext.replaceAll('Compartir por WhatsApp', 'Radicar por WhatsApp');
writeFileSync(vnextBuiltPath, vnext);

console.log('Approved home presentation baked into initial HTML; no post-render home/copy patch required.');
