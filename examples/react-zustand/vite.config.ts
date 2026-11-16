import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({ resolve: { alias: [
  { find: /^agent-stage\/vue$/, replacement: fileURLToPath(new URL('../../src/vue/index.ts', import.meta.url)) },
  { find: /^agent-stage\/angular$/, replacement: fileURLToPath(new URL('../../src/angular/index.ts', import.meta.url)) },
  { find: /^agent-stage\/react$/, replacement: fileURLToPath(new URL('../../src/react/index.ts', import.meta.url)) },
  { find: /^agent-stage\/zustand$/, replacement: fileURLToPath(new URL('../../src/adapters/zustand.ts', import.meta.url)) },
  { find: /^agent-stage$/, replacement: fileURLToPath(new URL('../../src/index.ts', import.meta.url)) },
] } });
