import { fail } from './errors.js';
import { assertJson, cloneJson, equal } from './json.js';
import { isAncestor, parsePointer } from './pointer.js';
import type { JsonValue, Operation } from './types.js';
export function validateOperations(input: unknown): Operation[] {
  if (!Array.isArray(input) || input.length > 1000) fail('Expected at most 1000 operations');
  assertJson(input);
  for (const item of input) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) fail('Invalid operation');
    const op = item as Record<string, unknown>;
    if (typeof op.op !== 'string' || !['add', 'remove', 'replace', 'move', 'copy', 'test'].includes(op.op)) fail('Unsupported operation');
    parsePointer(op.path as string);
    if (['add', 'replace', 'test'].includes(op.op) && !Object.hasOwn(op, 'value')) fail('Missing value');
    if (op.op === 'copy' || op.op === 'move') parsePointer(op.from as string);
    const allowed = ['op', 'path', ...(['copy', 'move'].includes(op.op) ? ['from'] : ['remove'].includes(op.op) ? [] : ['value'])];
    if (Object.keys(op).some(key => !allowed.includes(key))) fail('Unexpected operation member');
  }
  return cloneJson(input) as unknown as Operation[];
}
function index(key: string, length: number, adding = false): number {
  if (adding && key === '-') return length;
  if (!/^(0|[1-9]\d*)$/.test(key)) fail('Invalid array index');
  const n = Number(key);
  if (!Number.isSafeInteger(n) || n < 0 || n > length || (!adding && n === length)) fail('Array index out of bounds');
  return n;
}
export function readPath(root: JsonValue, parts: readonly string[]): JsonValue {
  let current = root;
  for (const key of parts) {
    if (current === null || typeof current !== 'object') fail('Path traverses a scalar');
    if (Array.isArray(current)) current = current[index(key, current.length)]!;
    else { if (!Object.hasOwn(current, key)) fail('Path does not exist'); current = current[key]!; }
  }
  return current;
}
function write(root: JsonValue, parts: string[], op: 'add' | 'remove' | 'replace', value: JsonValue = null): JsonValue {
  if (!parts.length) { if (op === 'remove') fail('Root removal is unsupported'); return cloneJson(value); }
  const parent = readPath(root, parts.slice(0, -1));
  const key = parts.at(-1)!;
  if (parent === null || typeof parent !== 'object') fail('Parent is not a container');
  if (Array.isArray(parent)) {
    const n = index(key, parent.length, op === 'add');
    if (op === 'add') parent.splice(n, 0, cloneJson(value));
    else if (op === 'remove') parent.splice(n, 1);
    else parent[n] = cloneJson(value);
  } else {
    if (op !== 'add' && !Object.hasOwn(parent, key)) fail('Path does not exist');
    if (op === 'remove') delete parent[key]; else parent[key] = cloneJson(value);
  }
  return root;
}
export function applyOperation(root: JsonValue, operation: Operation): JsonValue {
  const path = parsePointer(operation.path);
  switch (operation.op) {
    case 'test': if (!equal(readPath(root, path), operation.value)) fail('Test operation failed'); return root;
    case 'remove': return write(root, path, 'remove');
    case 'add': case 'replace': return write(root, path, operation.op, operation.value);
    case 'copy': case 'move': {
      const from = parsePointer(operation.from);
      const value = cloneJson(readPath(root, from));
      if (operation.op === 'move') {
        if (isAncestor(from, path) && from.length < path.length) fail('Cannot move into a descendant');
        if (operation.from === operation.path) return root;
        root = write(root, from, 'remove');
      }
      return write(root, path, 'add', value);
    }
  }
}
export function applyPatch(state: JsonValue, input: readonly Operation[]): JsonValue {
  assertJson(state);
  const operations = validateOperations(input);
  let result = cloneJson(state);
  for (const operation of operations) { result = applyOperation(result, operation); assertJson(result); }
  return result;
}
