import { fail } from './errors.js';
import { unsafeKey } from './json.js';
export function parsePointer(pointer: string): string[] {
  if (typeof pointer !== 'string' || pointer.length > 16_384) fail('Invalid or oversized pointer');
  if (pointer === '') return [];
  if (!pointer.startsWith('/')) fail('Pointer must start with /');
  const parts = pointer.slice(1).split('/').map(part => {
    if (/~(?:[^01]|$)/.test(part)) fail('Invalid pointer escape');
    const decoded = part.replace(/~1/g, '/').replace(/~0/g, '~');
    if (unsafeKey(decoded)) fail('Unsafe pointer segment');
    return decoded;
  });
  if (parts.length > 100) fail('Pointer depth limit exceeded');
  return parts;
}
export function isAncestor(parent: readonly string[], child: readonly string[]): boolean {
  return parent.length <= child.length && parent.every((part, i) => part === child[i]);
}
export function overlaps(a: readonly string[], b: readonly string[]): boolean { return isAncestor(a, b) || isAncestor(b, a); }
