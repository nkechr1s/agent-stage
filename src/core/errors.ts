export class StageError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = 'StageError'; }
}
export function fail(message: string): never { throw new StageError('INVALID_INPUT', message); }
