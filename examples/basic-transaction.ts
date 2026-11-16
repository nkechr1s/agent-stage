import { createAgentStage, createMemoryAdapter } from '../src/index.js';
const adapter = createMemoryAdapter({ budget: 5000, status: 'active', deadline: '2026-12-01' });
const stage = createAgentStage(adapter, { maxClosedTransactions: 50, maxOpenTransactions: 100 });
const transaction = stage.propose({ base: stage.capture(), operations: [
  { op: 'replace', path: '/budget', value: 12000 },
  { op: 'replace', path: '/status', value: 'archived' },
] });
const budget = transaction.changes.find(change => change.operationIndexes.includes(0))!;
const status = transaction.changes.find(change => change.operationIndexes.includes(1))!;
stage.acceptChange(transaction.id, budget.id);
stage.rejectChange(transaction.id, status.id);
console.log('Before:', adapter.getSnapshot());
console.log('Accepted preview:', stage.preview(transaction.id, 'accepted'));
console.log('Commit:', await stage.commit(transaction.id));
stage.dispose();
