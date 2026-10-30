import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (!existsSync('icon-512.png')) throw new Error('Official icon-512.png is required');
const result = spawnSync('java', ['scripts/GenerateApprovedIcons.java'], { stdio: 'inherit' });
if (result.error || result.status !== 0) throw new Error('Native icon generation failed; refusing to build');
