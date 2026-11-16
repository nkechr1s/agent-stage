import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
it('releases pruned private snapshots while stage and original capture remain live, and repeatedly disposes bounded histories',()=>{
 expect(()=>execFileSync(process.execPath,['--expose-gc','--import','tsx',fileURLToPath(new URL('../fixtures/pruned-memory.ts',import.meta.url))],{timeout:15000,stdio:'pipe'})).not.toThrow();
});
