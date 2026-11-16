import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
// Only generated library output is removed; stale declarations must never ship.
rmSync(new URL('../dist/',import.meta.url),{recursive:true,force:true});
execFileSync(process.execPath,[fileURLToPath(new URL('../node_modules/typescript/bin/tsc',import.meta.url)),'-p','tsconfig.build.json'],{stdio:'inherit'});
