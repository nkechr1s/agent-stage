# Supported runtimes and initial release boundaries

The package is ESM-only. It requires native structuredClone, BigInt, WeakMap, Object.hasOwn and modern ES2022 support. Node 22.22.1 and 24.22.3 on macOS arm64 were exercised. The declared range is now >=22.22.1 <23 || >=24.22.3 <25, with those exact floors pinned in CI. This intentionally narrows the old unbounded >=22 declaration instead of implicitly promising future majors. The full core/unit/security suite, builds, declarations and package imports were run on both floors. Patch releases above those floors in the two named majors are compatibility intent; only the pinned matrix points are actual executed evidence. Other Node majors, operating systems, browsers and edge runtimes are not certified by that statement.

Framework peers remain optional and isolated: React >=18 <20; Zustand >=5 <6; Vue >=3.5 <4; Angular Core >=20 <22. Exact tested versions and compiler/browser evidence are in the release report. Angular 17–19 and Vue 3.2 are unsupported and their executable fixtures have been retired due to unresolved upstream advisories. See [support policy](SUPPORT-POLICY.md) for exact verified points.

## SSR and hydration decision

SSR/hydration is explicitly excluded from the first release's framework bindings. React hooks intentionally omit getServerSnapshot and server rendering throws. Vue and Angular computed views may happen to evaluate in server contexts, but there is no tested serialized snapshot/transaction transfer or hydration contract. Do not treat that incidental behavior as supported SSR.

Use client-only framework components for these bindings. The pure core can run in Node, with a fresh stage and adapter per request/workflow; never share user state in a module-level singleton across server requests. Stage capture tokens are identity-bound and cannot be serialized and recreated. Implementing SSR now would require a separate ownership and transfer design; no partial hydration layer is added.

## Runtime/lifecycle limits

A stage retains at most 50 closed records by default and admits at most 100 open/committing transactions. Closed records are pruned automatically in closure order. Both limits are configurable finite integers. Bound workflow duration and proposal count. Dispose consumers before their stage, and then external adapters. No automatic rebase, persistence, undo/redo, distributed transaction or cancellation of already-started adapter writes is provided.

The initial API is pre-1.0. Treat minor releases as potentially breaking and pin compatible versions. A stable 1.0 requires explicit release policy, CI peer/runtime matrix, lifecycle retention policy for sustained sessions, and validation of the explicit indeterminate-outcome contract in real host applications.

The maintained tooling/consumer matrix is documented in [CI](CI.md) and [development verification](DEVELOPER-TOOLING-VERIFICATION.md). Framework consumers use exact npm manifests and lockfiles. Older Angular compiler fixtures pin compatible Node type declarations to avoid transitive TypeScript-version skew.
