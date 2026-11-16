import { describe, expect, it } from 'vitest';
import { isAncestor, parsePointer } from '../../src/index.js';
describe('JSON Pointer', () => {
  it('distinguishes root, empty keys, escaped keys and nested indexes', () => {
    expect(parsePointer('')).toEqual([]);
    expect(parsePointer('/')).toEqual(['']);
    expect(parsePointer('/a~1b/~0/~01/0')).toEqual(['a/b', '~', '~1', '0']);
    expect(isAncestor(['a'], ['a', '0'])).toBe(true);
    expect(isAncestor([], ['a'])).toBe(true);
    expect(isAncestor(['a'], ['ab'])).toBe(false);
    expect(isAncestor(['a', 'b'], ['a'])).toBe(false);
  });
  it.each(['a', '/~', '/~2', '/__proto__/x', '/constructor/prototype/x', '/prototype'])('rejects %s', path => expect(() => parsePointer(path)).toThrow());
});
