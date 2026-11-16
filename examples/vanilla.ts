import { createAgentStage, createMemoryAdapter } from 'agent-stage';

/** Runnable without importing any frontend framework. */
export async function runVanillaExample(log: (message: string, value?: unknown) => void = console.log) {
  const adapter = createMemoryAdapter({ budget: 5000, status: 'active', team: ['Ada'] });
  let hostNotifications = 0;
  let stageNotifications = 0;
  const offHost = adapter.subscribe(() => { hostNotifications++; log('Host updated', adapter.getSnapshot()); });
  const stage = createAgentStage(adapter);
  const offStage = stage.subscribe(() => { stageNotifications++; log('Stage version', stage.getVersion()); });
  try {
    const base = stage.capture();
    const first = stage.propose({ base, operations: [
      { op: 'replace', path: '/budget', value: 7000 },
      { op: 'replace', path: '/status', value: 'archived' },
    ] });
    const second = stage.propose({ base, operations: [{ op: 'add', path: '/team/-', value: 'Grace' }] });
    log('First proposal', stage.getTransaction(first.id));
    log('Second preview', stage.preview(second.id));
    const budget = first.changes.find(change => change.operationIndexes.includes(0))!;
    const status = first.changes.find(change => change.operationIndexes.includes(1))!;
    stage.acceptChange(first.id, budget.id);
    stage.rejectChange(first.id, status.id);
    stage.acceptChange(second.id, second.changes[0]!.id);
    const committed = await stage.commit(first.id);
    log('First commit', committed);
    const conflict = await stage.commit(second.id);
    log('Competing proposal result', conflict);
    if (conflict.status === 'conflict') {
      // Explicitly abandon the stale proposal; capture fresh state and propose again.
      stage.rollback(second.id);
    }
    const fresh = stage.propose({ base: stage.capture(), operations: [{ op: 'add', path: '/team/-', value: 'Grace' }] });
    stage.acceptChange(fresh.id, fresh.changes[0]!.id);
    const freshResult = await stage.commit(fresh.id);
    const final = adapter.getSnapshot();
    log('Final host', final);
    offHost(); offStage();
    const notifications = { host: hostNotifications, stage: stageNotifications };
    // Prove listeners are removed, and explicitly close this extra transaction.
    const abandoned = stage.propose({ base: stage.capture(), operations: [] });
    stage.rollback(abandoned.id);
    const cleaned = hostNotifications === notifications.host && stageNotifications === notifications.stage;
    return { firstId: first.id, secondId: second.id, committed, conflict, freshResult, final, notifications, cleaned };
  } finally {
    offHost(); offStage(); stage.dispose();
  }
}
