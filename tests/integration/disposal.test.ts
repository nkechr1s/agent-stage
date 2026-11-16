import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

it('releases private snapshots and transaction records while a disposed stage and capture stay reachable', () => {
  expect(() => execFileSync(process.execPath, [
    '--expose-gc', '--import', 'tsx', fileURLToPath(new URL('../fixtures/disposal-memory.ts', import.meta.url)),
  ], { timeout: 10_000, stdio: 'pipe' })).not.toThrow();
});
