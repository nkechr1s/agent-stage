# ADR 0001: Host-owned state and explicit isolated proposals

Status: accepted.

1. The host store is authoritative to avoid divergence from existing stores and external writes. No permanent committed-state mirror lives in the stage.
2. Explicit stage-issued base snapshots make proposal context unambiguous and retain the original revision even after host updates.
3. Each proposal has its own ID, base, operations and decisions. There is no shared staging buffer.
4. Approval is separate from execution. Only accepted logical groups reach adapter.commit in original order.
5. Revision comparison and application belong in one adapter atomic boundary. Stale transactions fail without overwriting newer data; no automatic rebase is attempted.
6. Logical groups are connected components of operation dependencies. Ancestor/descendant and source-path dependencies cannot be approved separately.
7. All accesses inside a common array are grouped conservatively because index shifts and bounds can invalidate independent approval. This trades approval granularity for safety.
8. Conflicts carry expected and actual revisions. Validation errors use typed error codes; adapter failures are structured commit results.
9. JSON trees provide precise portable patch semantics. Dates, Maps, Sets, functions, undefined, cycles, symbols, accessors and arbitrary instances are rejected rather than serialized lossily.
10. Framework adapters, persistence, UI, AI providers, distributed commits, undo/redo and conflict resolution are excluded.

A small internal patch interpreter avoids runtime dependencies and exposes its security and atomicity behavior to direct tests. All application happens on validated detached trees before publishing a replacement host snapshot. Dangerous path segments are forbidden even when they could represent ordinary JSON keys.
