import type { CommitResult, ReadonlyOperation, Snapshot } from '../core/types.js';
export interface CommitRequest { readonly expectedRevision: string; readonly operations: readonly ReadonlyOperation[] }
export interface StateAdapter {
  getSnapshot(): Snapshot;
  subscribe(listener: () => void): () => void;
  commit(request: CommitRequest): CommitResult | Promise<CommitResult>;
}
