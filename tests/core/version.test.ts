import { expect, it } from 'vitest';
import { createAgentStage, createMemoryAdapter } from '../../src/index.js';
it('exposes stable versions between notifications and increments before observers run', async () => {
  const adapter = createMemoryAdapter({ n: 1 }); const stage = createAgentStage(adapter);
  expect(stage.getVersion()).toBe(0);
  const versions: number[] = []; stage.subscribe(() => versions.push(stage.getVersion()));
  const base = stage.capture(); expect(stage.getVersion()).toBe(0);
  const tx = stage.propose({ base, operations: [{ op: 'replace', path: '/n', value: 2 }] });
  stage.acceptChange(tx.id, tx.changes[0]!.id);
  expect(versions).toEqual([1, 2]);
  const version = stage.getVersion(); stage.getTransaction(tx.id); stage.preview(tx.id);
  expect(stage.getVersion()).toBe(version);
  await stage.commit(tx.id);
  expect(versions.every((value, index) => index === 0 || value > versions[index - 1]!)).toBe(true);
  expect(stage.getVersion()).toBe(versions.at(-1));
  stage.dispose(); expect(() => stage.getVersion()).toThrow();
});
