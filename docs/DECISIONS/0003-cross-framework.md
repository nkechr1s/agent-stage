# ADR 0003: Vue scopes and Angular injection lifetimes

Status: accepted.

Keep the transactional core, adapter contract, revisions and approval semantics unchanged. Vue and Angular are optional ESM subpath exports with optional peer dependencies. Vanilla uses the root API directly.

Use a shallow Vue ref or Angular signal containing only the existing stage notification version. Derive detached frozen views in computed values and retain the exact capture object. Share the notification subscription per stage within a Vue EffectScope or Angular DestroyRef, allowing all three bindings to coexist without redundant listeners. Scope/context destruction unsubscribes and removes the per-lifetime cache entry. Stages stay owned by the application.

Reactive nullable ID inputs let selection change without reconstructing lifecycle subscriptions. Unknown IDs retain core structured errors. Invalid lifecycle use fails before subscribing (Vue scope check or Angular inject). Frozen JSON view behavior is shared with React via a small internal helper without introducing framework dependencies into the core.

This phase verifies actual effect scopes, injection contexts and packed consumer entry points. Full component/browser, SSR and Angular compiler matrix coverage is left for production-readiness work.

The release audit corrected Angular subscription sharing: one physical subscription per stage fans out to consumers individually registered with DestroyRef; destroying one consumer does not keep it reactive through another context.
