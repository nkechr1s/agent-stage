import { fail } from './errors.js';
import type { JsonValue, ReadonlyJsonValue } from './types.js';
export const unsafeKey = (key: string): boolean => ['__proto__', 'prototype', 'constructor'].includes(key);
export function measureJson(value: unknown): { nodes: number; characters: number; units: number } {
  const ancestors = new Set<object>();
  let nodes = 0;
  let characters = 0;
  function visit(item: unknown, depth: number): void {
    if (++nodes > 100_000 || depth > 100) fail('JSON size or depth limit exceeded');
    if (typeof item === 'string') { characters += item.length; if (characters > 1_000_000) fail('JSON string limit exceeded'); return; }
    if (item === null || typeof item === 'boolean') return;
    if (typeof item === 'number' && Number.isFinite(item)) return;
    if (typeof item !== 'object' || item === null) fail('Expected JSON value');
    if (ancestors.has(item)) fail('Cyclic JSON');
    const array = Array.isArray(item);
    if (Object.getPrototypeOf(item) !== (array ? Array.prototype : Object.prototype) && !(Object.getPrototypeOf(item) === null && !array)) fail('Unsupported prototype');
    ancestors.add(item);
    const keys = Reflect.ownKeys(item);
    if (array && (item.length > 100_000 || keys.length !== item.length + 1)) fail('Sparse or decorated array');
    for (const key of keys) {
      if (array && key === 'length') continue;
      if (typeof key !== 'string' || unsafeKey(key)) fail('Unsafe JSON key');
      if (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= item.length)) fail('Invalid array key');
      characters += key.length;
      if (characters > 1_000_000) fail('JSON string limit exceeded');
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) fail('JSON accessors or hidden properties are unsupported');
      visit(descriptor.value, depth + 1);
    }
    ancestors.delete(item);
  }
  visit(value, 0);
  return { nodes, characters, units: nodes + Math.ceil(characters / 64) };
}
export function assertJson(value: unknown): asserts value is JsonValue { measureJson(value); }
// JSON paths are independent even when JavaScript inputs share object references.
// Call only after assertJson has bounded and validated the input.
export function cloneJson(value: ReadonlyJsonValue): JsonValue {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(cloneJson);
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cloneJson(child)]));
}
export function clone<T>(value: T): T { return structuredClone(value); }
export function equal(a: ReadonlyJsonValue, b: ReadonlyJsonValue): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && equal((a as Record<string, JsonValue>)[key]!, (b as Record<string, JsonValue>)[key]!));
}
