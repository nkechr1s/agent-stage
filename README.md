# agent-stage

A framework-independent transactional runtime for staging AI-proposed JSON state changes. Your host store remains the source of truth. This is not a replacement for Redux, Zustand, Pinia, or any other store.

From a repository checkout (the first public release has not been published):

```sh
npm install
npm run build
npm run typecheck
npm test
npm run test:integration
npm run example
```

The initial implementation supports capture → propose → inspect/preview → accept/reject → commit, with independent transactions, strict revision checks, rollback, and subscriptions. See [API](docs/API.md), [architecture](docs/ARCHITECTURE.md), and [decisions](docs/DECISIONS/0001-transaction-boundary.md).

Every change must be explicitly accepted or rejected before commit; pending changes block commit without changing host state. Only JSON-compatible trees are supported. Optional React hooks, Vue composables, Angular signals and a Zustand slice adapter are available through separate entry points. Persistence, automatic rebase, undo/redo, and AI clients are not included. The package is ESM-only.

Development is verified with Node 22.22.1 and 24.22.3. The declared range is >=22.22.1 <23 || >=24.22.3 <25; CI pins the two tested floors. Runtime code has no dependencies.

- `src/core/`: public contracts, transaction lifecycle, JSON and patch validation, pointer utilities and approval grouping.
- `src/adapters/`: host adapter contract and atomic in-memory implementation.
- `tests/core/`, `tests/adapters/`, `tests/integration/`: validation, lifecycle and host-boundary tests.
- [Basic transaction example](examples/basic-transaction.ts).
- [Remaining work and limitations](docs/ROADMAP.md).

```ts
import { createAgentStage, createMemoryAdapter } from 'agent-stage';

const adapter = createMemoryAdapter({ budget: 5000, status: 'active' });
const stage = createAgentStage(adapter);
const tx = stage.propose({
  base: stage.capture(),
  operations: [{ op: 'replace', path: '/budget', value: 12000 }],
});
stage.acceptChange(tx.id, tx.changes[0]!.id);
const result = await stage.commit(tx.id);
// Inspect result.status; a conflict never overwrites newer host state.
stage.dispose();
```

## React + Zustand

See [integration API and lifecycle contracts](docs/INTEGRATIONS.md). Run `npm run demo` for the project dashboard and `npm run demo:build` to build it. Imports are `agent-stage`, `agent-stage/react`, and `agent-stage/zustand`; core consumers do not need React or Zustand installed.

See [cross-framework APIs](docs/CROSS-FRAMEWORK.md) for `agent-stage/vue` and `agent-stage/angular`. Run `npm run example:vanilla` for the complete framework-free lifecycle. Run `npm run build && npm run check:package` to verify packed entry points, declarations and dependency isolation.

## Installation and release status

MIT licensed. Before publication, build and install a local package with `npm pack` and `npm install /absolute/path/agent-stage-0.1.0.tgz` in a consumer. Once published, the package installation command is `npm install agent-stage`. Install only the integration peers you use (`react`, `zustand`, `vue`, or `@angular/core` and its application peers). No framework is required for core use.

This is a pre-1.0 candidate. See the [release assessment](PRODUCTION-READINESS.md), [security model](docs/SECURITY.md), [adapter development guide](docs/ADAPTERS.md), and [runtime/SSR limits](docs/RUNTIMES.md). React/Zustand guides are in [INTEGRATIONS](docs/INTEGRATIONS.md); Vue/Angular guides are in [CROSS-FRAMEWORK](docs/CROSS-FRAMEWORK.md). Framework bindings are client-only for the initial release.

Verification from a checkout: `npm test`, `npm run test:security`, `npm run build`, `npm run typecheck`, `npm run check:package`, `npm run benchmark`. `node scripts/check-package-isolation.mjs --install` performs fresh consumer installations. `node scripts/framework-builds.mjs` installs temporary framework apps and runs production builds and headless Chrome checks (network and a Chrome installation required).

## Bounded workflows

`createAgentStage(adapter, { maxClosedTransactions: 50, maxOpenTransactions: 100, workload: { maxOperations: 200, maxWorkUnits: 250_000 } })` shows the defaults. Set closed retention to zero to discard closed records immediately. Open/committing transactions are protected; capacity rejects new proposals. Pruned IDs return NOT_FOUND. These finite defaults are a deliberate beta behavior change.

See [history and workload contracts](docs/BOUNDED-WORKFLOWS.md) and [before/after measurements](docs/BETA-HARDENING-VERIFICATION.md). Run `npm run build && npm run benchmark:hardening` to reproduce current measurements. Large combined workloads are rejected by admission; the library does not promise universal latency guarantees.

## Public outcome and readonly contracts

Commit returns committed, conflict, failed, or indeterminate. Unexpected adapter exceptions are indeterminate and terminal, never assumed to mean no mutation. Inspect/reconcile the real host independently before creating a new proposal; do not automatically retry. Returned state, operation values, previews and commit snapshots are deeply readonly in TypeScript; mutable proposal construction remains supported. See [migration, error codes and API details](docs/PUBLIC-API-HARDENING.md). Run `npm run test:types` for NodeNext and Bundler type-contract checks.

## Development automation

Use `npm ci`, `npm run lint`, `npm run test:types` and `npm test`. Husky runs the same lint check before commits; `npm run check:hooks` verifies it without creating a commit. See [CONTRIBUTING](CONTRIBUTING.md), [CI and compatibility automation](docs/CI.md), and [future beta release checklist](docs/RELEASING.md). The manual release workflow validates packages only; it does not publish. Version remains unreleased 0.1.0 and a future approved release must use an explicit -beta.N version/channel. No readiness decision is implied by this tooling.

Tooling verification and exact framework/advisory results are recorded in [developer tooling verification](docs/DEVELOPER-TOOLING-VERIFICATION.md). The workflows have been checked locally; hosted status badges will only be added after actual GitHub runs exist.
