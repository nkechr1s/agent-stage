# Cross-framework reactive integrations

| Import | Responsibility | Optional peer range |
| --- | --- | --- |
| `agent-stage` | Transactional core | None |
| `agent-stage/react` | React hooks | React >=18 <20 |
| `agent-stage/zustand` | JSON slice adapter | Zustand >=5 <6 |
| `agent-stage/vue` | Vue composables | Vue >=3.5 <4 |
| `agent-stage/angular` | Angular signal helpers | @angular/core >=20 <22 |

All exports have ESM JavaScript and matching public declarations. Each frontend integration depends only on its own peer and internal framework-free utilities/types. The core has no framework imports. No Vanilla entry point is needed.

## Vue

Call synchronously in `setup()` or an active `effectScope`:

```ts
import { shallowRef } from 'vue';
import { useAgentStage, useTransaction, useStageChange } from 'agent-stage/vue';
import type { AgentStage } from 'agent-stage';

export function useReview(stage: AgentStage) {
  const transactionId = shallowRef<string | null>(null);
  const changeId = shallowRef<string | null>(null);
  const host = useAgentStage(stage);
  const transaction = useTransaction(stage, transactionId);
  const change = useStageChange(stage, transactionId, changeId);

  function propose() {
    const created = stage.propose({
      base: host.value, // exact stage-issued capture; do not clone or spread it
      operations: [{ op: 'replace', path: '/budget', value: 7000 }],
    });
    transactionId.value = created.id;
    changeId.value = created.changes[0]?.id ?? null;
  }
  return { host, transaction, change, propose };
}
```

The three functions return `ComputedRef<Snapshot>`, `ComputedRef<Transaction | null>`, and `ComputedRef<Change | null>`. IDs accept a plain string/null, a readonly ref, or a getter returning string/null. Values are detached and deeply frozen. A computed view retains its identity between dependency changes. `shallowRef` tracks the stage version without proxying or replacing the capture object; `computed` derives views lazily. Unknown non-null IDs throw the core's `StageError / NOT_FOUND` when the computed value is read. Calls outside an active scope throw `INVALID_SCOPE` before subscribing.

All composables using the same stage in the same scope share one subscription. `onScopeDispose` unsubscribes once and removes the cache entry. Different scopes own independent subscriptions. Plain nonreactive variables do not make IDs reactive; pass a ref/getter for changing selection. Treat disposed scope views as no longer live.

## Angular

Call synchronously in a constructor, field initializer, provider factory or `runInInjectionContext`:

```ts
import { signal } from '@angular/core';
import { injectAgentStage, injectTransaction, injectStageChange } from 'agent-stage/angular';
import type { AgentStage } from 'agent-stage';

// Call this function inside a live Angular injection context.
export function createReview(stage: AgentStage) {
  const transactionId = signal<string | null>(null);
  const changeId = signal<string | null>(null);
  const host = injectAgentStage(stage);
  const transaction = injectTransaction(stage, transactionId);
  const change = injectStageChange(stage, transactionId, changeId);

  function propose() {
    const created = stage.propose({
      base: host(), // exact capture identity is retained
      operations: [{ op: 'replace', path: '/budget', value: 7000 }],
    });
    transactionId.set(created.id);
    changeId.set(created.changes[0]?.id ?? null);
  }
  return { host, transaction, change, propose };
}
```

The helpers return readonly `Signal<Snapshot>`, `Signal<Transaction | null>`, and `Signal<Change | null>`. IDs accept plain strings/null or getters, including Angular signals. `inject(DestroyRef)` enforces the injection-context requirement; calling from an arbitrary event handler or after `await` is invalid. Create the signal bindings during initialization, then read them and invoke normal stage methods in event handlers.

One physical subscription is shared per stage, with separate reactive consumers released by their own DestroyRef. Component DestroyRef identity is not assumed stable. A private `signal` stores only `getVersion()`; `computed` reads produce frozen detached views. DestroyRef cleanup removes subscriptions and cache entries. No decorators, Angular compiler, Zone.js runtime, RxJS operators, or duplicate transaction engine are required by the integration code. Angular itself may require additional peers in the host application.

Unknown IDs throw `StageError / NOT_FOUND` on signal reads. Calls outside an injection context use Angular's native injection error. Read bindings after initialization and before destroying their context; destroyed bindings stop receiving updates. On Angular versions restricting writes within effects, follow that version's signal-write rules when invoking stage mutations from an effect; normal user event handlers are the demonstrated pattern.

## Identical transaction semantics

Both bindings call the existing capture/getTransaction methods. Decisions and commits use `stage.acceptChange`, `stage.rejectChange`, `stage.commit`, and `stage.rollback`. Pending changes block commits; external host edits produce strict revision conflicts. Neither binding auto-accepts, rebases, mutates host state or clones a capture token. Changes refer to atomic logical groups, potentially containing multiple operations.

Only the reactive invalidation/lifecycle layer differs. Core source/contracts are unchanged in this phase. The existing React freeze helper was moved to a framework-free internal module so all view bindings share the same freezing behavior.

A stage notification invalidates all views in its scope/context, including notifications from other transactions. Repeated notifications with the same version do not invalidate the private ref/signal. Per-transaction render optimization, server hydration transfer and real component-template/browser testing remain future verification work. These tests use real Vue effect scopes and real Angular injection contexts and signals.

Stages and adapters remain application-owned. Destroy framework scopes/contexts first, then call `stage.dispose()` and any adapter-specific disposal when their owner ends. Reactive cleanup never disposes a shared stage.

## Vanilla TypeScript

```sh
npm install
npm run example:vanilla
```

`examples/vanilla.ts` exposes a complete reusable runner; `examples/run-vanilla.ts` executes it. It imports only the public core. It creates a memory host adapter and two independent proposals from one capture, subscribes to host and stage changes, inspects/previews proposals, accepts/rejects groups, commits the first, handles the second's conflict, rolls it back and explicitly proposes afresh. Both subscriptions are removed and the stage disposed. The final state is budget 7000, status active, team Ada and Grace. No frontend framework is loaded by the example.

## Version verification and limits

Verified points are Vue 3.5.45 and Angular 20.3.35/21.2.26. Angular 17–19 and Vue 3.2 are unsupported following legacy fixture retirement. Exact tested versions do not certify every future minor release; see [support policy](SUPPORT-POLICY.md).

Angular CLI/AOT compilation across historical versions and SSR/hydration have not been tested. The integration ships ordinary ESM functions rather than Angular-decorated classes; use normal NodeNext/Bundler package resolution in the host build. Future Angular major versions require new verification before widening the range.

Lifecycle behavior follows the official [Vue scope disposal API](https://vuejs.org/api/reactivity-advanced.html#onscopedispose) and [Angular DestroyRef API](https://angular.dev/api/core/DestroyRef).

The release audit corrected Angular subscription sharing: one physical subscription per stage fans out to consumers individually registered with DestroyRef; destroying one consumer does not keep it reactive through another context.

All returned state/operation/preview types are recursively readonly. An indeterminate transaction is terminal, inspectable while retained, and cannot be retried or rolled back. See [public API contracts](PUBLIC-API-HARDENING.md).
