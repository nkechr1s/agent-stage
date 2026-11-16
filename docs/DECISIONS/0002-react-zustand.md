# ADR 0002: Optional React hooks and a Zustand JSON slice adapter

Status: accepted for the first integration phase.

Keep the audited transaction engine and the StateAdapter contract. Add optional package subpath exports instead of importing frameworks from the root. React and Zustand are optional peers; the repository installs them as development dependencies to verify the integrations.

A Zustand selector defines the JSON boundary, allowing action functions to remain in the host store. The adapter compares immutable selected values using existing JSON equality. It never retains a cloned committed-state mirror. Updates must use Zustand's immutable, synchronous vanilla store contract. Atomic revision comparison and detached patch validation run inside the store's functional updater. Candidate merging preserves unrelated fields and actions; selecting the candidate must match the patch output. Optional schema validation handles domains narrower than arbitrary JSON.

React needs a stable getSnapshot result. Existing capture/getTransaction return fresh detached objects, so passing those directly to useSyncExternalStore would repeatedly change identity. Add only getVersion() to the core and increment it before host/transaction notifications. Hooks subscribe to this primitive version and memoize frozen detached views. Hook code does not implement decisions, transaction storage or commit logic. SSR and render-granularity optimization are deferred.

The host adapter has an explicit application-owned disposal method. React hook cleanup only removes its own stage subscription. The demo creates its runtime outside render to avoid Strict Mode construction leaks.
