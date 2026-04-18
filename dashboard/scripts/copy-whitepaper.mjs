import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const copies = [
  { src: join(root, '..', 'whitepaper.md'), dest: join(root, 'public', 'whitepaper.md') },
  { src: join(root, '..', 'specs', 'ndp_protocol.md'), dest: join(root, 'public', 'ndp-spec.md') },
];

for (const { src, dest } of copies) {
  if (!existsSync(src)) {
    console.warn(`[copy-whitepaper] skipping missing source: ${src}`);
    continue;
  }
  writeFileSync(dest, readFileSync(src));
  console.log(`[copy-whitepaper] copied ${src} -> ${dest}`);
}
