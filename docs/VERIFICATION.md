# Verification

Current CI/developer tooling command and compatibility evidence: [Developer tooling verification](DEVELOPER-TOOLING-VERIFICATION.md). This does not assign a release-readiness status.

Latest public API contract checks and 155-test result: [Public API hardening verification](PUBLIC-API-HARDENING-VERIFICATION.md).

Latest bounded-history/workload results: [Beta hardening verification](BETA-HARDENING-VERIFICATION.md). Earlier reports below are historical baselines.

Current release decision and evidence: [Production readiness audit](../PRODUCTION-READINESS.md).

The current 100-test result and package isolation checks are recorded in [Cross-framework verification](CROSS-FRAMEWORK-VERIFICATION.md).

For the latest React/Zustand phase and 89-test result, see [Integration verification](INTEGRATION-VERIFICATION.md).

For the subsequent correctness audit and current 72-test result, see [Core audit](CORE-AUDIT.md). The results below record the initial foundation verification.

Executed locally on Node 22.22.1 with TypeScript 5.9 and Vitest 5.1:

- `npm run build`: passed; emitted ESM JavaScript and public declarations.
- `npm run typecheck`: passed with strict mode, unchecked index checking and exact optional properties.
- `npm run test:unit`: 52 tests passed across four files.
- `npm run test:integration`: three tests passed, including all eight approval subsets of a three-group proposal.
- `npm run example`: passed; budget changed from 5000 to 12000, rejected status stayed active, deadline remained unchanged, revision advanced from 0 to 1.
- Built package self-import through its public export: passed a capture/propose/accept/commit lifecycle.
- `npm pack --dry-run`: verified package contents and exports; did not publish.
- Dependency installation audit after tooling updates: zero reported vulnerabilities.

Initial dependency downloads required network permission. The example's tsx runner required permission for its local IPC socket. The checks above actually ran after those permissions were granted.

The test suite covers pointer escaping/root/empty keys, invalid input, JSON restrictions and bounds, prototype pollution attempts, six patch operations, detached application, grouping, independent decisions and transactions, revision conflicts, concurrent commit locking, atomic adapter failures, subscriptions, disposal, rollback and a separate host adapter integration. It is not an exhaustive RFC conformance suite, a performance benchmark, or a validation of future third-party adapters.
