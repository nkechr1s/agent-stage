# CI and maintenance automation

Local syntax/semantic validation uses actionlint. Baseline hosted CI/security evidence and the public repository's protection status are recorded in the [final audit](FINAL-RELEASE-AUDIT.md). Subsequent [security-hardening changes](SECURITY-REMEDIATION.md) have been verified locally but not pushed or executed on GitHub. No status badge implies that those uncommitted changes passed hosted CI.

## Pull requests and main branches

CI runs for pull_request and pushes to main, master (current branch) and develop, plus manual dispatch. It pins Node **22.22.1** and **24.22.3**, pins npm 11.13.0, installs with npm ci and runs build, strict typecheck, unit/security tests (complete core suite), NodeNext/Bundler type tests, and all five packed exports on both versions. Node 22 also runs lint, integration/GC/component tests, fresh consumer installs, demo build, Vanilla runner and package integrity. Root lockfiles must remain unchanged by these jobs.

A representative app job runs React 18 (with Zustand 5), Vue 3.5 and Angular 21 production consumers. Root tests already exercise real Zustand 5 vanilla stores, action preservation and synchronous middleware. This avoids repeating the entire expensive browser/compiler matrix on each PR.

## Scheduled compatibility

Weekly/manual jobs use locked react18/react19, vue and angular20/angular21 consumers. Angular fixtures use compatible TypeScript/compiler/Zone.js versions and strict AOT templates. CI installs Playwright Chromium and Linux system dependencies once per consumer job; local macOS runs use the available browser installation. Framework apps use this checkout's packed entry points, run approval/commit in Chromium, and assert subscription count returns to zero after unmount. Exact fixture manifests and transitive npm locks are in scripts/compatibility; CI runs npm ci and never floats framework versions. Fresh package-install checks independently verify the tarball can be installed with each optional peer. Versions between the checked points are not exhaustively certified.

## Security

Dependency security runs root npm audit on pushes/PRs and weekly/manual dispatch, failing on high/critical advisories. All dependencies, including development tooling, are included. A SHA-pinned dependency-review action also reviews changes on public-repository PRs; it requires GitHub dependency graph support. Private repositories skip that action unless GitHub Advanced Security is explicitly configured by the owner; root npm audit still runs.

Every security run audits all five supported compatibility locks, fails on any High/Critical finding or unavailable/malformed counts, and preserves full JSON reports including Moderate/Low findings. Angular 17–19 and Vue 3.2 fixtures and their specialized dependency probes have been removed. Their original findings remain documentary evidence in the [remediation report](SECURITY-REMEDIATION.md). The supported consumer builds retain approval/commit, real framework component and cleanup coverage. Negative peer-resolution checks reject legacy versions without installing them. See [support policy](SUPPORT-POLICY.md).

New root dependencies must pass review/audit; no automatic dependency upgrades run. Dependabot proposes root npm and GitHub Action PRs weekly; merges remain manual and gated by checks. Angular root packages are grouped. TypeScript and its ESLint tooling are grouped, TypeScript majors require deliberate migration, and npm version updates retain an explicit three-day cooldown. Fixture updates remain manual. The previously failed update's age-filter cause and earliest retry date are documented in the remediation report; hosted repair is not yet verified.

## Benchmarks and soak

Weekly/manual heavy jobs run both existing benchmark suites and a configurable soak. The workflow retains raw JSON artifacts, even on failure where available. No performance thresholds are imposed: latency and GC are noisy. The soak asserts retention pruning, workload rejection, transaction publication, notification cleanup and stage disposal. Default 100 cycles × 1,000 transactions; override SOAK_CYCLES/SOAK_TRANSACTIONS locally. It samples post-GC heap each cycle without claiming a constant-memory proof. Run the GC regression suite for focused private snapshot retention checks.

## Permissions and release safety

All current workflows use contents:read, disabled checkout credential persistence, HUSKY=0 and pinned action commits. No pull_request_target, publishing credentials, npm tokens, id-token permission, write permission, automatic tags or releases are configured. Schedules/manual jobs run repository-trusted code; PR code executes only with read-scoped permissions and no registry secrets.

Release validation is manual and validates only; see [release checklist and OIDC plan](RELEASING.md). Fork PRs need normal GitHub Actions approval according to repository settings. Required status checks/branch protection and dependency graph activation are owner configuration steps outside local filesystem automation.
