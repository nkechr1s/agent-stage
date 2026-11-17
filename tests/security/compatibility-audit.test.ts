import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { expect, it } from 'vitest';

const script = resolve('scripts/audit-compatibility.mjs');
function runAudit(audit: object, verify: (status: number | null, stderr: string, root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'agent-stage-audit-test-'));
  try {
    mkdirSync(join(root, 'scripts/compatibility/angular17'), { recursive: true });
    mkdirSync(join(root, 'bin'));
    writeFileSync(join(root, 'bin/npm'), '#!/usr/bin/env node\nprocess.stdout.write(process.env.FIXTURE_AUDIT);process.exit(1);\n', { mode: 0o755 });
    const result = spawnSync(process.execPath, [script], {
      cwd: root, encoding: 'utf8',
      env: { ...process.env, PATH: join(root, 'bin') + delimiter + process.env.PATH, FIXTURE_AUDIT: JSON.stringify(audit) },
    });
    verify(result.status, result.stderr, root);
  } finally { rmSync(root, { recursive: true, force: true }); }
}
const report = (critical: number) => ({
  vulnerabilities: { historical: { severity: 'high', via: ['retained-for-review'] } },
  metadata: { vulnerabilities: { critical, high: 1 } },
});
it('fails the fixture gate on Critical findings and still preserves the full report', () => {
  const audit = report(1);
  runAudit(audit, (status, stderr, root) => {
    expect(status).toBe(1);
    expect(stderr).toContain('Critical compatibility dependencies in: angular17');
    expect(JSON.parse(readFileSync(join(root, 'artifacts/compatibility-audit.json'), 'utf8'))).toEqual([{ consumer: 'angular17', audit }]);
  });
});
it('retains historical High findings visibly without misreporting the audit as clean', () => {
  const audit = report(0);
  runAudit(audit, (status, _stderr, root) => {
    expect(status).toBe(0);
    expect(JSON.parse(readFileSync(join(root, 'artifacts/compatibility-audit.json'), 'utf8'))).toEqual([{ consumer: 'angular17', audit }]);
  });
});
it('fails closed when the dependency audit cannot obtain advisory data', () => {
  runAudit({ error: { code: 'ENOTFOUND' } }, (status, stderr) => {
    expect(status).toBe(1);
    expect(stderr).toContain('Audit could not run for angular17');
  });
});
it('does not interpret malformed audit counts as zero Critical vulnerabilities', () => {
  runAudit({ metadata: { vulnerabilities: {} } }, (status, stderr) => {
    expect(status).toBe(1);
    expect(stderr).toContain('Invalid audit counts for angular17');
  });
});
