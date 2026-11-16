import { assertJson, cloneJson } from './json.js';
import { applyOperation, readPath } from './patch.js';
import { overlaps, parsePointer } from './pointer.js';
import type { Change, ReadonlyJsonValue, ReadonlyOperation } from './types.js';
export function groupChanges(base: ReadonlyJsonValue, operations: readonly ReadonlyOperation[]): Change[] {
  let state = cloneJson(base);
  const footprints: string[][][] = [];
  for (const operation of operations) {
    const paths = [parsePointer(operation.path)];
    if ('from' in operation) paths.push(parsePointer(operation.from));
    const footprint = [...paths];
    for (const path of paths) {
      for (let length = 0; length < path.length; length++) {
        const prefix = path.slice(0, length);
        if (Array.isArray(readPath(state, prefix))) { footprint.push(prefix); break; }
      }
    }
    footprints.push(footprint);
    state = applyOperation(state, operation);
    assertJson(state);
  }
  const groups: number[][] = [];
  const hasTest = operations.some(operation => operation.op === 'test');
  for (let i = 0; i < operations.length; i++) {
    const joined = [i];
    for (let g = groups.length - 1; g >= 0; g--) {
      const group = groups[g]!;
      if (hasTest || group.some(j => footprints[i]!.some(a => footprints[j]!.some(b => overlaps(a, b))))) {
        joined.push(...group); groups.splice(g, 1);
      }
    }
    groups.push(joined);
  }
  return groups.map(indexes => { indexes.sort((a, b) => a - b); return { id: `change-${indexes[0]}`, operationIndexes: indexes, decision: 'pending' }; });
}
