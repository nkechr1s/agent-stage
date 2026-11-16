# Supported runtimes and initial release boundaries

The package is ESM-only. It requires native structuredClone, BigInt, WeakMap, Object.hasOwn and modern ES2022 support. Node 22.22.1 on macOS arm64 and headless desktop Chrome were exercised. The package engine floor remains Node >=22; this is not a claim that every operating system, Node major, browser or edge runtime has been tested. Development tooling requires at least Node 22.12 within the Node 22 line.

Framework peers remain optional and isolated: React >=18 <20; Zustand >=5 <6; Vue >=3.2 <4; Angular Core >=17 <22. Exact tested versions and compiler/browser evidence are in the release report. Historical Angular 17 and Vue 3.2 compatibility does not endorse deploying upstream packages with known advisories. Prefer maintained patched peers.

## SSR and hydration decision

SSR/hydration is explicitly excluded from the first release's framework bindings. React hooks intentionally omit getServerSnapshot and server rendering throws. Vue and Angular computed views may happen to evaluate in server contexts, but there is no tested serialized snapshot/transaction transfer or hydration contract. Do not treat that incidental behavior as supported SSR.

Use client-only framework components for these bindings. The pure core can run in Node, with a fresh stage and adapter per request/workflow; never share user state in a module-level singleton across server requests. Stage capture tokens are identity-bound and cannot be serialized and recreated. Implementing SSR now would require a separate ownership and transfer design; no partial hydration layer is added.

## Runtime/lifecycle limits

A stage retains at most 50 closed records by default and admits at most 100 open/committing transactions. Closed records are pruned automatically in closure order. Both limits are configurable finite integers. Bound workflow duration and proposal count. Dispose consumers before their stage, and then external adapters. No automatic rebase, persistence, undo/redo, distributed transaction or cancellation of already-started adapter writes is provided.

The initial API is pre-1.0. Treat minor releases as potentially breaking and pin compatible versions. A stable 1.0 requires explicit release policy, CI peer/runtime matrix, lifecycle retention policy for sustained sessions, and resolution of the indeterminate-adapter-outcome API ergonomics.
