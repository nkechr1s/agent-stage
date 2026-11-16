# Project dashboard demo

From the repository root:

```sh
npm install
npm run demo
```

Open the localhost URL Vite prints. `npm run demo:build` writes a static build to this example's `dist/` directory.

Generate a simulated proposal, then accept or reject each group. The team edits form one group. Commit remains disabled while any decision is pending. The committed project stays unchanged until a successful commit.

To exercise conflicts, expand **Edit the committed project**, change the budget and save while a proposal is open. Resolve its decisions and try committing: the host edit remains intact and the UI reports a conflict. Roll back, generate a fresh proposal, resolve it and commit. Multiple proposals remain independently inspectable through their tabs.

`model.ts` owns a vanilla Zustand store with actions, its slice adapter, and the stage. `App.tsx` uses the real exported hooks. The model is created outside React render and its lifecycle is explicitly disposed. No AI service is called. See `tests/integration/react-zustand-demo.test.tsx` for the executable full workflow.
