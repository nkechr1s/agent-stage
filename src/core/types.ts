export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type Operation =
  | { readonly op: 'add' | 'replace' | 'test'; readonly path: string; readonly value: JsonValue }
  | { readonly op: 'remove'; readonly path: string }
  | { readonly op: 'move' | 'copy'; readonly path: string; readonly from: string };
export interface Snapshot { readonly state: JsonValue; readonly revision: string }
export type Decision = 'pending' | 'accepted' | 'rejected';
export interface Change { readonly id: string; readonly operationIndexes: readonly number[]; readonly decision: Decision }
export interface Transaction {
  readonly id: string;
  readonly base: Snapshot;
  readonly operations: readonly Operation[];
  readonly changes: readonly Change[];
  readonly status: 'open' | 'committing' | 'committed' | 'rolled-back';
}
export type CommitResult =
  | { readonly status: 'committed'; readonly snapshot: Snapshot }
  | { readonly status: 'conflict'; readonly expectedRevision: string; readonly actualRevision: string }
  | { readonly status: 'failed'; readonly code: string; readonly message: string };
