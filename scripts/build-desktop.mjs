import { build } from 'tsup';
import { cp, mkdir } from 'node:fs/promises';
import './generate-notices.mjs';
await build({ config: false, entry: ['src/desktop/main.ts'], outDir: 'desktop-dist', format: ['cjs'], target: 'node22', platform: 'node', external: ['electron'], noExternal: [/^(?!electron$).*/], clean: true, splitting: false, outExtension: () => ({ js: '.cjs' }) });
await mkdir('desktop-dist', { recursive: true });
await cp('desktop/preload.cjs', 'desktop-dist/preload.cjs');
await cp('desktop/renderer', 'desktop-dist/renderer', { recursive: true });
