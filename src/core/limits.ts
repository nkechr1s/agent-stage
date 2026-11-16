import { StageError } from './errors.js';
import { measureJson } from './json.js';
import { parsePointer } from './pointer.js';
import type { Operation } from './types.js';
export interface AgentStageOptions {
  /** Retain the most recently closed transactions; 0 disables closed history. Default 50. */
  readonly maxClosedTransactions?: number;
  /** Includes committing and indeterminate transactions. Default 100. */
  readonly maxOpenTransactions?: number;
  /** Additional admission limits; fixed JSON safety limits always apply. */
  readonly workload?: {
    readonly maxOperations?: number;
    readonly maxWorkUnits?: number;
  };
}
export interface StageLimits {
  readonly maxClosedTransactions: number;
  readonly maxOpenTransactions: number;
  readonly maxOperations: number;
  readonly maxWorkUnits: number;
}
export function stageLimits(options: AgentStageOptions): StageLimits {
  const limits = {
    maxClosedTransactions: options.maxClosedTransactions ?? 50,
    maxOpenTransactions: options.maxOpenTransactions ?? 100,
    maxOperations: options.workload?.maxOperations ?? 200,
    maxWorkUnits: options.workload?.maxWorkUnits ?? 250_000,
  };
  for (const [key, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value < (key === 'maxClosedTransactions' ? 0 : 1)) {
      throw new StageError('INVALID_INPUT', `${key} must be a finite safe integer within its allowed range`);
    }
  }
  if (limits.maxOperations > 1000) throw new StageError('INVALID_INPUT', 'maxOperations cannot exceed the JSON Patch safety limit of 1000');
  return limits;
}
export function workloadExceeded(): never {
  throw new StageError('WORKLOAD_LIMIT_EXCEEDED', 'Proposal exceeds the configured synchronous workload budget');
}
/** Conservative bound, not a timing prediction. No state mutation or cloning here. */
export function checkWorkload(baseUnits: number, operations: readonly Operation[], maxUnits: number): void {
  let documentUnits = baseUnits;
  let work = baseUnits;
  let pathUnits = 0;
  for (const operation of operations) {
    const paths = [parsePointer(operation.path)];
    if ('from' in operation) paths.push(parsePointer(operation.from));
    for (const path of paths) pathUnits += 1 + path.length + Math.ceil(path.join('/').length / 64);
    if ('value' in operation) documentUnits += measureJson(operation.value).units;
    // copy can duplicate any subtree; do not assume it will stay small.
    if (operation.op === 'copy') documentUnits *= 2;
    work += documentUnits * 2;
    if (work + pathUnits * operations.length > maxUnits) workloadExceeded();
  }
  if (work + pathUnits * operations.length > maxUnits) workloadExceeded();
}
