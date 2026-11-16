import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAgentStage, useStageChange, useTransaction } from 'agent-stage/react';
import type { Transaction } from 'agent-stage';
import type { Demo, Project } from './model.js';
import { isProject } from './model.js';

function Editor({ project, demo }: { project: Project; demo: Demo }) {
  const [draft, setDraft] = useState(project);
  function submit(event: FormEvent) { event.preventDefault(); demo.store.getState().editProject(draft); }
  return <form onSubmit={submit} aria-label="Edit committed project">
    <label>Project name<input value={draft.name} required onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
    <div className="form-row">
      <label>Budget ($)<input aria-label="Budget" type="number" min="0" required value={draft.budget} onChange={event => setDraft({ ...draft, budget: Number(event.target.value) })} /></label>
      <label>Status<select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value })}><option value="active">Active</option><option value="review">In review</option><option value="paused">Paused</option><option value="archived">Archived</option></select></label>
    </div>
    <label>Deadline<input type="date" required value={draft.deadline} onChange={event => setDraft({ ...draft, deadline: event.target.value })} /></label>
    <label>Team assignments<input value={draft.team.join(', ')} onChange={event => setDraft({ ...draft, team: event.target.value.split(',').map(member => member.trim()).filter(Boolean) })} /></label>
    <button className="secondary" type="submit">Save manual edit</button>
    <p className="hint">Manual edits go straight to the real store. Existing proposals keep their original base.</p>
  </form>;
}
function ChangeCard({ demo, transaction, changeId, preview }: { demo: Demo; transaction: Transaction; changeId: string; preview: Project }) {
  const change = useStageChange(demo.stage, transaction.id, changeId)!;
  const operation = transaction.operations[change.operationIndexes[0]!]!;
  const field = operation.path.split('/')[1] as keyof Project;
  const base = transaction.base.state as Project;
  const disabled = transaction.status !== 'open';
  const display = (value: Project[keyof Project]): string => Array.isArray(value) ? value.join(', ') : String(value);
  return <article className="change" aria-label={`${field} change`}>
    <div className="change-top"><h3>{field === 'team' ? 'Team assignments' : field}</h3><span className={`badge ${change.decision}`}>{change.decision}</span></div>
    <div className="comparison"><div><small>BASE VALUE</small><p>{display(base[field])}</p></div><span aria-hidden="true">→</span><div><small>PROPOSED VALUE</small><p>{display(preview[field])}</p></div></div>
    {change.operationIndexes.length > 1 && <p className="hint">{change.operationIndexes.length} related team edits stay together in one approval group.</p>}
    <div className="actions"><button disabled={disabled} aria-pressed={change.decision === 'accepted'} onClick={() => demo.stage.acceptChange(transaction.id, change.id)}>Accept {field}</button><button className="secondary" disabled={disabled} aria-pressed={change.decision === 'rejected'} onClick={() => demo.stage.rejectChange(transaction.id, change.id)}>Reject {field}</button></div>
  </article>;
}
function Proposal({ demo, id, revision }: { demo: Demo; id: string; revision: string }) {
  const transaction = useTransaction(demo.stage, id)!;
  const [message, setMessage] = useState('');
  const pending = transaction.changes.filter(change => change.decision === 'pending').length;
  const accepted = transaction.changes.filter(change => change.decision === 'accepted').length;
  const preview = demo.stage.preview(id) as Project;
  const stale = transaction.base.revision !== revision && transaction.status === 'open';
  async function commit() {
    const result = await demo.stage.commit(id);
    setMessage(result.status === 'committed' ? 'Committed. The project now includes your accepted changes.' : result.status === 'conflict' ? 'Conflict: the project changed after this proposal. Your edits are safe. Roll back this proposal and generate a new one from the current project.' : result.status === 'indeterminate' ? `Outcome unknown: ${result.message}. Inspect and reconcile the committed project before generating a fresh proposal.` : result.message);
  }
  return <>
    <div className="proposal-meta"><span>{id}</span><span className="badge">{transaction.status}</span></div>
    {stale && <p className="notice">The committed project has changed. This proposal is stale and cannot overwrite it.</p>}
    <div className="changes">{transaction.changes.map(change => <ChangeCard key={change.id} demo={demo} transaction={transaction} changeId={change.id} preview={preview} />)}</div>
    <div className="commit-bar"><p>{accepted} accepted · {pending} pending</p><div className="actions">
      <button disabled={pending > 0 || transaction.status !== 'open'} onClick={() => { void commit(); }}>Commit approved changes</button>
      <button className="secondary" disabled={transaction.status !== 'open'} onClick={() => { demo.stage.rollback(id); setMessage('Proposal rolled back. Committed project unchanged.'); }}>Roll back</button>
    </div>{pending > 0 && transaction.status === 'open' && <p className="hint">Accept or reject every group to enable commit.</p>}</div>
    {message && <p role="status" className="notice">{message}</p>}
  </>;
}
export function App({ demo }: { demo: Demo }) {
  const snapshot = useAgentStage(demo.stage);
  const [ids, setIds] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  if (!isProject(snapshot.state)) throw new Error('Invalid project');
  const project = snapshot.state;
  function propose() { const tx = demo.propose(); setIds(previous => [...previous, tx.id]); setActive(tx.id); }
  return <main>
    <header><div className="brand"><span className="mark">a·s</span><span>agent-stage <small>INTEGRATION LAB</small></span></div><span className="live">React + Zustand</span></header>
    <section className="intro"><p className="eyebrow">YOU MAKE THE FINAL CALL</p><h1>Ideas staged.<br /><span>Changes approved.</span></h1><p>A simulated agent proposes a project update. Review it, keep what works, and commit only when you’re ready.</p><button onClick={propose}>Generate simulated proposal <span aria-hidden="true">↗</span></button><small className="simulation">Local simulation · no AI service or network calls</small></section>
    <div className="workspace">
      <section className="panel"><div className="panel-heading"><span className="step">01</span><div><h2>Committed project</h2><p>The real Zustand state</p></div><span className="dot" /></div>
        <div className="summary"><h3>{project.name}</h3><strong data-testid="committed-budget">${project.budget.toLocaleString('en-US')}</strong><p>{project.status} · Due {project.deadline}</p><p>{project.team.join(' · ')}</p></div>
        <details><summary>Edit the committed project</summary><Editor key={snapshot.revision} project={project} demo={demo} /></details>
      </section>
      <section className="panel"><div className="panel-heading"><span className="step">02</span><div><h2>Proposal review</h2><p>Separate from committed values</p></div></div>
        {ids.length > 0 && <nav aria-label="Proposals">{ids.map((id, index) => <button className={id === active ? 'tab selected' : 'tab'} key={id} onClick={() => setActive(id)}>Proposal {index + 1}</button>)}</nav>}
        {active ? <Proposal key={active} demo={demo} id={active} revision={snapshot.revision} /> : <div className="empty"><span aria-hidden="true">↗</span><h3>Nothing changes without you.</h3><p>Generate a proposal to see suggested changes here. Your committed project stays untouched.</p></div>}
      </section>
    </div><footer>Host-owned state. Explicit decisions. Revision-safe commits.</footer>
  </main>;
}
