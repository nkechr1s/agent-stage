export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
// The explicit recursive JSON form avoids infinite conditional-type expansion.
export type ReadonlyJsonValue = null | boolean | number | string | readonly ReadonlyJsonValue[] | { readonly [key: string]: ReadonlyJsonValue };
export type DeepReadonly<T> = unknown extends T ? T
  : JsonValue extends T ? ReadonlyJsonValue
  : T extends (...args: never[]) => unknown ? T
  : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
/** Mutable nested values remain convenient for constructing proposal inputs. */
export type Operation =
  | { readonly op: 'add' | 'replace' | 'test'; readonly path: string; readonly value: JsonValue }
  | { readonly op: 'remove'; readonly path: string }
  | { readonly op: 'move' | 'copy'; readonly path: string; readonly from: string };
export type ReadonlyOperation = DeepReadonly<Operation>;
export interface Snapshot { readonly state: DeepReadonly<JsonValue>; readonly revision: string }
export type Decision = 'pending' | 'accepted' | 'rejected';
export interface Change { readonly id: string; readonly operationIndexes: readonly number[]; readonly decision: Decision }
export interface Transaction {
  readonly id: string;
  readonly base: Snapshot;
  readonly operations: readonly ReadonlyOperation[];
  readonly changes: readonly Change[];
  readonly status: 'open' | 'committing' | 'committed' | 'rolled-back' | 'indeterminate';
  /** Retained terminal uncertainty diagnostic; detached from the commit return value. */
  readonly commitResult?: IndeterminateCommitResult;
}
export interface IndeterminateCommitResult {
  readonly status: 'indeterminate';
  readonly code: string;
  readonly message: string;
}
export type CommitResult =
  | { readonly status: 'committed'; readonly snapshot: Snapshot }
  | { readonly status: 'conflict'; readonly expectedRevision: string; readonly actualRevision: string }
  | { readonly status: 'failed'; readonly code: string; readonly message: string }
  | IndeterminateCommitResult;
