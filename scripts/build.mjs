import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
await build({ root });
const content = await fs.readFile(path.join(root, 'dist/content.json'));
await fs.writeFile(path.join(root, 'dist/version.json'), JSON.stringify({
  revision: process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  contentHash: createHash('sha256').update(content).digest('hex'),
}));
// Preserve attribution and third-party licenses alongside the deployed bundle.
for (const name of ['LICENSE', 'licenses']) {
  await fs.cp(path.join(root, name), path.join(root, 'dist', name), { recursive: true });
}
const notices = await fs.readFile(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8');
await fs.writeFile(path.join(root, 'dist/THIRD_PARTY_NOTICES.md'), notices.replaceAll('(public/assets/', '(assets/'));
await fs.writeFile(path.join(root, 'dist/.nojekyll'), '');
