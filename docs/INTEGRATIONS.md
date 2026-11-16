# React and Zustand

React and Zustand entry points (see [Vue, Angular and Vanilla](CROSS-FRAMEWORK.md) for the full export matrix):

| Import | API | Optional peer |
| --- | --- | --- |
| `agent-stage` | Existing transactional core | None |
| `agent-stage/zustand` | `createZustandAdapter`, adapter/options types | Zustand 5 |
| `agent-stage/react` | `useAgentStage`, `useTransaction`, `useStageChange` | React 18 or 19 |

The core never imports either integration. React DOM is used only by the demo and tests. Type declarations follow the same entry-point boundaries.

## Connect an existing store

```ts
import { createAgentStage } from 'agent-stage';
import { createZustandAdapter } from 'agent-stage/zustand';

const adapter = createZustandAdapter(store, {
  select: state => state.project,
  update: (state, nextProject) => ({ ...state, project: nextProject }),
});
const stage = createAgentStage(adapter);
```

`store` is an object-valued Zustand vanilla `StoreApi<State>`. `select` defines the JSON data boundary; actions, dates and other unrelated store values are never passed to JSON validation. `update` may return a full state or partial top-level update. The adapter merges it with the current state to preserve unrelated properties and action functions, then verifies that selecting the candidate produces the exact patched JSON value.

All callbacks must be pure and synchronous. Use immutable Zustand updates: replace every changed object/array along the slice path through `setState`. Direct mutation through `getState()` is not supported, even if followed by an unrelated `setState`. Standard synchronous vanilla `setState` publication semantics are required; middleware that defers publication or changes its atomic boundary is not supported.

The adapter tracks a reference to the host's immutable slice, not a second authoritative store. Deep JSON equality suppresses revisions for unrelated changes and equivalent replacement values. A selected-value change advances an adapter-scoped monotonic revision, including changes away from and back to an earlier value. No customizable equality is exposed: ignoring selected fields would weaken conflict detection. Revision IDs are local runtime identifiers, not persistence or distributed concurrency tokens.

Expected revision checking, detached patch application, candidate validation and publication run within synchronous `setState`. A rejected patch or candidate leaves the store unchanged under the pure-callback contract; an unexpected callback exception is indeterminate. An observer exception is still committed when publication of the exact prepared state can be confirmed; otherwise the adapter reports indeterminate. External Zustand subscribers should not throw: vanilla Zustand can stop delivery before later observers see an external change, particularly an intermediate state in an ABA sequence. The adapter resynchronizes with the current host on reads/commits but cannot reconstruct missed historical notifications.

JSON validity is not domain-schema validity. Generic slice types do not validate an AI patch at runtime. Supply `validate: (next: JsonValue) => boolean` when a patch must preserve a narrower schema (required fields, allowed values, etc.). This check runs before `update` and before publication; the demo includes a project validator. Selectors and validators must not mutate their arguments.

Use proposals and decisions through `stage`; direct `adapter.commit` is the same low-level trusted host boundary as the memory adapter, not an AI proposal API.

## React hooks

```tsx
import { useAgentStage, useTransaction, useStageChange } from 'agent-stage/react';
import type { AgentStage } from 'agent-stage';

function Review({ stage, transactionId, changeId }: {
  stage: AgentStage; transactionId: string | null; changeId: string | null;
}) {
  const host = useAgentStage(stage); // { state, revision }
  const transaction = useTransaction(stage, transactionId);
  const change = useStageChange(stage, transactionId, changeId);
  // Decisions use stage.acceptChange / rejectChange; commit uses stage.commit.
  return <pre>{JSON.stringify({ host, transaction, change }, null, 2)}</pre>;
}
```

`useTransaction` accepts a nullable ID and returns `Transaction | null`. `useStageChange` accepts nullable transaction/change IDs and returns `Change | null`. Unknown non-null IDs throw the same structured NOT_FOUND error as the core.

Hooks subscribe using `useSyncExternalStore(stage.subscribe, stage.getVersion)`. `getVersion()` is the only new core API: it returns a stable number until a transaction or host notification, incremented before listeners run. It never stores host state or changes commit rules. Hook views are detached, deeply frozen and cached between notifications. They may rerender for notifications from other transactions; this first integration deliberately avoids a separate selector/subscription engine.

`useAgentStage` returns a stage-issued capture, so its exact snapshot object can be passed to `propose`. It also rerenders on transaction changes. Hook views are for reading; call stage methods to change decisions. All pending changes must be resolved before commit.

These hooks are client-rendering integrations. SSR/hydration snapshot transfer is not implemented; no server snapshot is supplied. Browser applications using React 18+ are the intended target, with React 18 and 19 currently declared and tested.

Create stores, adapters and stages outside React render, and pass them into components. Constructors subscribe immediately: creating one during render or a Strict Mode initializer can leak a discarded instance. Hooks themselves create no stages or host subscriptions; each hook balances its stage subscription in Strict Mode.

After unmounting consumers, call `stage.dispose()` and then `adapter.dispose()` when their application-owned lifetime ends. Disposing a stage does not dispose an externally owned adapter. Keep the adapter's host subscription alive while it might be reused, so it can observe changes even with no React components mounted.

## Demo

From a repository checkout:

```sh
npm install
npm run demo
# open the localhost URL printed by Vite
npm run demo:build
```

The demo lives in `examples/react-zustand`. It uses actual public integration entry points mapped to source during development. Generate multiple proposals, review budget/status/deadline/team groups, and accept or reject each. Expand the committed-project editor and save a manual edit to make older proposals stale. A stale commit reports a conflict without overwriting the edit. Roll back and generate a fresh proposal to continue. Team operations share one approval group. No real AI provider is involved.

The executable DOM integration test drives this complete workflow through the actual React UI and Zustand actions.

The React subscription contract follows the official [useSyncExternalStore reference](https://react.dev/reference/react/useSyncExternalStore). Zustand publication ordering was checked against the installed `zustand/vanilla` implementation.

Snapshot and hook return types are now recursively readonly. See [public API migration](PUBLIC-API-HARDENING.md) for the indeterminate outcome, terminal lifecycle and validator input changes.
