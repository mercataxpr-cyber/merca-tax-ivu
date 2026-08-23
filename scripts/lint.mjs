import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['server.js', 'script.js', 'src', 'test', 'scripts'];
const files = [];
function collect(path) {
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path)) collect(join(path, entry));
  } else if (/\.(?:js|mjs)$/.test(path)) files.push(path);
}
for (const root of roots) collect(root);
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax lint PASS (${files.length} files)`);
