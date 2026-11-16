import { expect, it } from 'vitest';
import { runVanillaExample } from '../../examples/vanilla.js';
it('runs independent proposals, selective decisions, strict conflicts, fresh commit and cleanup without frameworks', async () => {
  const result = await runVanillaExample(() => {});
  expect(result.firstId).not.toBe(result.secondId);
  expect(result.committed.status).toBe('committed');
  expect(result.conflict.status).toBe('conflict');
  expect(result.freshResult.status).toBe('committed');
  expect(result.final.state).toEqual({ budget: 7000, status: 'active', team: ['Ada', 'Grace'] });
  expect(result.notifications.host).toBe(2);
  expect(result.notifications.stage).toBeGreaterThan(2);
  expect(result.cleaned).toBe(true);
});
