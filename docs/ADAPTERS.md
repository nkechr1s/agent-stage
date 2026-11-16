# Developing a StateAdapter

Implement the exported `StateAdapter` with `getSnapshot`, `subscribe` and `commit`. Snapshots contain detached JSON data and an opaque string revision. The host store owns committed state; a stage is only a proposal/decision runtime.

1. Every selected host-state change must advance a revision that is never reused for a different state. Account for external writes and changes away from and back to a value. Equivalent no-op writes may keep a revision.
2. Return detached snapshots. Do not expose host mutable references. Subscribe must return an idempotent cleanup function and report relevant external writes.
3. In one atomic boundary, compare expectedRevision against currentRevision, apply all operations to a detached candidate, validate the candidate, then publish it. `applyPatch` implements validation/detached patch execution; it does not provide a lock or compare-and-swap.
4. A revision mismatch returns `conflict` with both revisions and changes nothing. An invalid patch/validation failure returns `failed` and changes nothing.
5. Return a `committed` snapshot representing the state/revision published by that operation. A later reentrant host write can make this snapshot older than the current host by return time; it must not be overwritten to make the return appear current.
6. Observer failures after publication must not be reported as a failed commit. Adapters must never throw after applying a write. Network timeouts after an unknown server outcome require an idempotency/reconciliation protocol beyond this API.
7. Keep the adapter alive while stages depend on it. Unmount consumers, dispose stages, and finally dispose an application-owned adapter. MemoryAdapter has no external resource to dispose; ZustandAdapter does.

Use the memory adapter as the local reference and the Zustand adapter as the synchronous host-store example. Run tests for stale revisions, concurrent requests, invalid later operations after valid earlier operations, external ABA edits, snapshot isolation, reentrancy, and cleanup. Never replace real atomic host enforcement with a core-side preflight check.

The selected JSON contract cannot express Date, Map, Set, undefined or class instances. Select a data slice and preserve unrelated host actions. TypeScript generics alone cannot ensure that an AI patch preserves your domain schema; validate candidates explicitly.

See [integration contracts](INTEGRATIONS.md) for Zustand middleware limits and [security model](SECURITY.md) for trusted-code assumptions.
