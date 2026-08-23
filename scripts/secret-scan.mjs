import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ignoredDirs = new Set(['.git', 'node_modules', 'assets']);
const ignoredFiles = new Set(['scripts/secret-scan.mjs']);
const patterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['GitHub token', /gh[pousr]_[A-Za-z0-9_]{20,}/],
  ['Slack token', /xox[baprs]-[A-Za-z0-9-]{10,}/],
];
const findings = [];
function walk(path) {
  const stat = statSync(path);
  if (stat.isDirectory()) {
    if (ignoredDirs.has(path.split('/').pop())) return;
    for (const entry of readdirSync(path)) walk(join(path, entry));
    return;
  }
  const relative = path.replace(/^\.\//, '');
  if (ignoredFiles.has(relative) || !/\.(?:js|mjs|json|html|css|md|yml|yaml|txt)$/.test(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const [label, pattern] of patterns) if (pattern.test(text)) findings.push(`${relative}: ${label}`);
}
walk('.');
if (findings.length) {
  console.error('Secret scan FAIL');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}
console.log('Secret scan PASS');
