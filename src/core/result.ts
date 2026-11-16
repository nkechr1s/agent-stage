import { assertJson } from './json.js';
import type { CommitResult } from './types.js';
function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null) && Reflect.ownKeys(value).every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return typeof key === 'string' && descriptor !== undefined && 'value' in descriptor;
  });
}
export function assertCommitResult(value: unknown): asserts value is CommitResult {
  if (!isRecord(value)) throw new Error('Expected adapter result');
  if (value.status === 'committed') {
    const snapshot = value.snapshot;
    if (isRecord(snapshot) && typeof snapshot.revision === 'string' && Object.hasOwn(snapshot, 'state')) {
      assertJson(snapshot.state);
      return;
    }
  } else if (value.status === 'conflict') {
    if (typeof value.expectedRevision === 'string' && typeof value.actualRevision === 'string') return;
  } else if (value.status === 'failed') {
    if (typeof value.code === 'string' && typeof value.message === 'string') return;
  }
  throw new Error('Malformed adapter commit result');
}
