import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { createAgentStage, createMemoryAdapter } from '../../src/index.js';

// Observe private clones without adding a test-only public API to the stage.
const originalClone = globalThis.structuredClone;
const copies: WeakRef<object>[] = [];
globalThis.structuredClone = <T>(value: T, options?: StructuredSerializeOptions): T => {
  const copy = originalClone(value, options);
  if (copy !== null && typeof copy === 'object') copies.push(new WeakRef(copy));
  return copy;
};
const stage = createAgentStage(createMemoryAdapter({ payload: 'retained capture' }));
const capture = stage.capture();
stage.propose({ base: capture, operations: [] });
globalThis.structuredClone = originalClone;
stage.dispose();
assert.ok(copies.length > 0);
for (let attempt = 0; attempt < 30; attempt++) {
  await setImmediate();
  globalThis.gc!();
  if (copies.every(copy => copy.deref() === undefined)) break;
}
assert.ok(copies.every(copy => copy.deref() === undefined), 'Disposed stage retained private snapshots or transactions');
// Keep both the capture token and disposed stage alive throughout collection.
assert.equal(capture.revision, '0');
assert.throws(() => stage.capture());
