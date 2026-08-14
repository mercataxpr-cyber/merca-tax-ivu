import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { transformAppSource } from './r1a-transform.mjs';

const EXPECTED_BASE_SCRIPT_BLOB = '1a041149f50e73ea1858b49bc0e627da00d1660d';

function gitBlobSha(text) {
  const bytes = Buffer.from(text, 'utf8');
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

const source = readFileSync('script.js', 'utf8');
const actualBlob = gitBlobSha(source);
if (actualBlob !== EXPECTED_BASE_SCRIPT_BLOB) {
  throw new Error(`Refusing R1-A transform: script.js blob ${actualBlob} != frozen base ${EXPECTED_BASE_SCRIPT_BLOB}`);
}

mkdirSync('src', { recursive: true });
const app = transformAppSource(source);
writeFileSync('src/app.js', app.endsWith('\n') ? app : `${app}\n`);

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
pkg.scripts = {
  ...pkg.scripts,
  dev: 'npm run build && node server.js',
  build: 'node scripts/build.mjs',
  start: 'npm run build && node server.js',
  lint: 'node scripts/lint.mjs',
  test: 'node --test test/*.test.js',
  'test:ivu': 'node --test test/ivu.test.js',
  'test:rounding': 'node --test test/rounding.test.js',
  'test:multi-business': 'node --test test/multi-business.test.js',
  'test:backup': 'node --test test/backup.test.js',
  'test:malformed': 'node --test test/malformed-input.test.js',
  'secret-scan': 'node scripts/secret-scan.mjs',
  gate: 'npm run build && npm run lint && npm test && npm run secret-scan',
};
writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\n`);

await import('./build.mjs');
console.log('R1-A source extraction applied to frozen script.js');
