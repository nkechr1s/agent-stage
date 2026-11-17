# Cross-framework verification

Historical evidence: the owner-approved [support policy](SUPPORT-POLICY.md) now supersedes earlier support ranges and executable matrices. Angular 17–19 and Vue 3.2 are unsupported; their lockfiles and runnable fixtures have been retired. The advisory history below is preserved, not relabeled as fixed.

Executed on Node 22.22.1 with TypeScript 5.9.3. Final development peers: Vue 3.5.45 and Angular Core 21.2.26.

## Results actually executed

- `npm run build`: passed; all five entry points emit ESM and declarations.
- `npm run typecheck`: passed with the existing strict settings.
- `npm test`: **100 passed across 14 files**, including all 89 previous core, React, Zustand and demo tests.
- `npm run test:unit`: **93 passed**.
- `npm run test:integration`: **seven passed**.
- `npm run demo:build`: existing React + Zustand demo builds successfully.
- `npm run example:vanilla`: passed. First proposal commits budget 7000 while rejecting archived status; the competing proposal conflicts; a fresh proposal adds Grace. Final project is `{budget: 7000, status: 'active', team: ['Ada', 'Grace']}`. Host and stage subscriptions are removed, then the stage is disposed.
- `npm run check:package`: passed for root, React, Zustand, Vue and Angular. Each uses a separate temporary packed consumer containing only its own optional peer(s). Each consumer strictly compiles against emitted declarations and executes a runtime smoke test. Static JavaScript/declaration import graphs reject unexpected external dependencies and circular relative imports.
- `git diff --check`: passed.

The package check is reproducible after `npm run build`. It packs locally without publication; its isolated directories are temporary verification artifacts, not separate projects replacing repository work. React's consumer uses React and its development type package, Zustand's uses Zustand, Vue's uses Vue and Angular's uses Angular Core. Frameworks resolve their normal dependencies from the installed peers; no unrelated direct frontend peer is placed in those consumers.

## Added tests

Five Vue tests cover transaction and host updates, selective decisions and commits, frozen detached values, exact capture identity, cached computed values, nullable refs/getters, structured unknown-ID errors, single subscriptions per scope, independent scopes, scope disposal, invalid out-of-scope calls, pending blocking, strict conflicts and rollback.

Five Angular tests cover the equivalent signal semantics plus real Injector/runInInjectionContext behavior, native injection-context errors, DestroyRef cleanup and no active listeners after destruction. No Angular compiler or browser is mocked into this test path.

One Vanilla integration test executes the complete framework-free lifecycle runner, checks independent IDs and conflict handling, verifies the final host state and host/stage notifications, and confirms listener cleanup.

## Compatibility checks

The initial four tests per framework passed on Angular Core 17.3.12 and Vue 3.5.45. The same eight tests then passed on Angular Core 21.2.26 and Vue 3.2.47. The full final 100-test suite uses Vue 3.5.45 and Angular Core 21.2.26. Historical compatibility installs reported upstream advisories; the final dependency installation reported zero vulnerabilities. Angular 17 is a compatibility floor, not a recommendation to deploy an unsupported upstream release.

Declared peers: Vue >=3.2 <4; Angular Core >=17 <22. Intermediate Angular majors and every minor version were not exhaustively tested. The source uses APIs available at the tested floors. Normal synchronous lifecycle initialization is required. No Angular CLI/AOT matrix, actual Vue/Angular component templates, SSR/hydration, browser matrix, or load benchmarks were run.

## Assessment

The phase is ready to enter production-readiness work with unchanged transactional semantics and executable isolation checks. This is not a production certification. Next verification should cover real host-app component lifecycles, Angular build-tool/version combinations, SSR contracts if required, and performance/memory bounds under sustained use. Existing custom-adapter atomicity and immutable Zustand-update constraints still apply.

No commit, push or publication was performed.
