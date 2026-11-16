import type { CommitResult, Operation, Snapshot } from '../core/types.js';
export interface CommitRequest { readonly expectedRevision: string; readonly operations: readonly Operation[] }
export interface StateAdapter {
  getSnapshot(): Snapshot;
  subscribe(listener: () => void): () => void;
  commit(request: CommitRequest): CommitResult | Promise<CommitResult>;
}
