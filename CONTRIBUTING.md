# Contributing

Use Node 22.22.1 (`nvm use`) or Node 24.22.3. Use npm 11.13.0 (pinned in CI). Run `npm ci`, then `npm run lint`, `npm run typecheck`, `npm run test:types` and `npm test`. The repository lockfile is authoritative; dependency updates must include the matching lockfile and executed compatibility checks. Do not run automatic audit fixes across framework majors.

`npm run lint:fix` applies available safe lint fixes; review the diff and rerun lint. ESLint checks source, TSX examples, tests, scripts and benchmarks. Generated dist/coverage/artifacts/consumers are excluded. Type-only imports may stay separate. React Hooks rules apply to actual React code, not Vue composables with similar names. No formatter is imposed.

After local install, Husky's pre-commit hook runs the same `npm run lint`. A lint failure rejects the hook. CI repeats lint independently. `npm run check:hooks` verifies setup and exit behavior without creating a commit. Hook installation skips CI, HUSKY=0, production-only installs non-Git directories and npm pack. Package consumers receive no hooks or Husky dependency.

Useful checks:

- `npm run build`: library ESM and declaration output.
- `npm run test:unit`: unit, security and integration-binding tests, including core.
- `npm run test:integration`: actual component, lifecycle, concurrent rendering and GC cleanup tests.
- `npm run test:types`: NodeNext and Bundler negative type-contract fixtures.
- `npm run check:package`: five packed entry points, declarations and import graphs.
- `npm run check:package:install`: actual isolated npm installs with only relevant optional peers.
- `npm run check:integrity`: two byte-identical pack builds, content/metadata/lock/export checks.
- `npm run demo:build`, `npm run example:vanilla`: executable examples.
- `npm run check:frameworks -- react18 vue angular21`: locked real apps, production builds, browser lifecycle and unmount cleanup. Network and Playwright Chromium installation required.
- `npm run benchmark`, `npm run benchmark:hardening`, `npm run soak`: raw measurements and correctness assertions; timings/heap numbers are not mandatory latency gates.

Framework fixtures live in scripts/compatibility with exact manifests and lockfiles. Update them deliberately with `node scripts/compatibility/prepare-locks.mjs`, inspect versions/advisories and rerun the matrix. This command resolves registry versions for maintenance; CI never runs it. Each temporary consumer uses npm ci, then tests this checkout's packed library. The package is installed from a tarball separately by check:package:install.

See [CI](docs/CI.md), [release procedure](docs/RELEASING.md), and [runtime/version contract](docs/RUNTIMES.md). Keep transaction semantics unchanged unless the change has a focused regression test. Retain existing user work. Publishing requires a separate final audit and explicit owner approval.
