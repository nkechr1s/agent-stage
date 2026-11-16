import { describe, expect, it } from 'vitest';
import { applyPatch, createMemoryAdapter } from '../../src/index.js';
import type { JsonValue, Operation } from '../../src/index.js';
describe('JSON Patch', () => {
  it('applies escaped, empty, nested and root paths without shallow merging', () => {
    expect(applyPatch({ '': 0, 'a/b': { '~': 1 }, keep: true }, [
      { op: 'replace', path: '/', value: 2 }, { op: 'replace', path: '/a~1b/~0', value: 3 },
    ])).toEqual({ '': 2, 'a/b': { '~': 3 }, keep: true });
    expect(applyPatch({ nested: { a: 1, b: 2 } }, [{ op: 'replace', path: '/nested', value: { a: 3 } }])).toEqual({ nested: { a: 3 } });
    expect(applyPatch({}, [{ op: 'replace', path: '', value: [1] }])).toEqual([1]);
  });
  it('supports ordered array add/remove/replace/move/copy/test', () => {
    const state = { list: ['a', 'b', 'c'] };
    const patch: Operation[] = [
      { op: 'move', from: '/list/0', path: '/list/2' },
      { op: 'copy', from: '/list/0', path: '/list/-' },
      { op: 'remove', path: '/list/1' },
      { op: 'replace', path: '/list/0', value: 'x' },
      { op: 'test', path: '/list', value: ['x', 'a', 'b'] },
    ];
    const original = structuredClone(patch);
    expect(applyPatch(state, patch)).toEqual({ list: ['x', 'a', 'b'] });
    expect(state).toEqual({ list: ['a', 'b', 'c'] });
    expect(patch).toEqual(original);
  });
  it('compares objects without depending on key order', () => expect(applyPatch({ a: 1, b: 2 }, [{ op: 'test', path: '', value: { b: 2, a: 1 } }])).toEqual({ a: 1, b: 2 }));
  it.each([
    [{ op: 'replace', path: '/missing', value: 1 }],
    [{ op: 'add', path: '/missing/child', value: 1 }],
    [{ op: 'remove', path: '' }],
    [{ op: 'test', path: '/a', value: 99 }],
    [{ op: 'move', from: '/a', path: '/a/b' }],
    [{ op: 'add', path: '/list/01', value: 1 }],
    [{ op: 'replace', path: '/list/-', value: 1 }],
    [{ op: 'add', path: '/list/2', value: 1 }],
    [{ op: 'wat', path: '' }],
    [{ op: 'add', path: '/x' }],
    [{ op: 'copy', path: '/x' }],
    [{ op: 'remove', path: '/a', extra: 1 }],
    [{ op: 'add', path: '/__proto__/polluted', value: true }],
  ])('rejects invalid patches %#', patch => expect(() => applyPatch({ a: 1, list: [] }, [patch] as unknown as Operation[])).toThrow());
  it('does not execute string proposals or poison prototypes', () => {
    expect(applyPatch({}, [{ op: 'add', path: '/code', value: 'process.exit()' }])).toEqual({ code: 'process.exit()' });
    expect(() => createMemoryAdapter(JSON.parse('{"__proto__":{"polluted":true}}') as JsonValue)).toThrow();
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
  });
  it.each([new Date(), new Map(), new Set(), () => 1, undefined, NaN, Infinity, [undefined], new Array(2), { x: Symbol() }, Object.assign(Object.create({ a: 1 }) as object, { b: 2 })])('rejects non-JSON input %#', value => expect(() => createMemoryAdapter(value as JsonValue)).toThrow());
  it('rejects cycles, accessors, oversized proposals and deep trees', () => {
    const cycle: Record<string, unknown> = {}; cycle.self = cycle;
    expect(() => createMemoryAdapter(cycle as JsonValue)).toThrow();
    let called = false;
    expect(() => createMemoryAdapter({ get x() { called = true; return 1; } })).toThrow();
    expect(called).toBe(false);
    expect(() => applyPatch({}, Array.from({ length: 1001 }, () => ({ op: 'add' as const, path: '/x', value: 1 })))).toThrow();
    expect(() => createMemoryAdapter('x'.repeat(1_000_001))).toThrow();
    let deep: JsonValue = null; for (let i = 0; i < 102; i++) deep = { deep };
    expect(() => createMemoryAdapter(deep)).toThrow();
  });
});
it('rejects sparse arrays disguised with numeric properties outside array bounds', () => {
  const value = new Array<JsonValue>(1);
  Object.defineProperty(value, '4294967295', { value: 1, enumerable: true });
  expect(() => createMemoryAdapter(value)).toThrow();
});
it('handles identity moves, insertion, root copies and independent copies', () => {
  expect(applyPatch({ a: [1, 2] }, [{ op: 'move', from: '', path: '' }])).toEqual({ a: [1, 2] });
  expect(applyPatch([1, 2], [{ op: 'add', path: '/1', value: 3 }])).toEqual([1, 3, 2]);
  expect(applyPatch({ a: [1] }, [{ op: 'copy', from: '/a', path: '' }])).toEqual([1]);
  expect(applyPatch({ a: { n: 1 } }, [{ op: 'copy', from: '/a', path: '/b' }, { op: 'replace', path: '/a/n', value: 2 }])).toEqual({ a: { n: 2 }, b: { n: 1 } });
});
