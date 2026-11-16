import { createStore } from 'zustand/vanilla';
import { createAgentStage } from 'agent-stage';
import type { JsonValue } from 'agent-stage';
import { createZustandAdapter } from 'agent-stage/zustand';

export type Project = { name: string; budget: number; status: string; deadline: string; team: string[] };
type ProjectStore = { project: Project; editProject: (project: Project) => void; theme: string };
export function isProject(value: JsonValue): value is Project {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && typeof value.name === 'string' && typeof value.budget === 'number' && value.budget >= 0
    && typeof value.status === 'string' && typeof value.deadline === 'string'
    && Array.isArray(value.team) && value.team.every(member => typeof member === 'string');
}
export function createDemo() {
  const store = createStore<ProjectStore>(set => ({
    project: { name: 'Atlas workspace', budget: 12000, status: 'active', deadline: '2026-12-01', team: ['Ada', 'Leo'] },
    theme: 'light',
    editProject: project => set({ project }),
  }));
  const adapter = createZustandAdapter(store, { select: state => state.project, update: (_state, project) => ({ project }), validate: isProject });
  const stage = createAgentStage(adapter);
  return {
    store, adapter, stage,
    propose() {
      const base = stage.capture();
      if (!isProject(base.state)) throw new Error('Invalid project');
      return stage.propose({ base, operations: [
        { op: 'replace', path: '/budget', value: base.state.budget + 3000 },
        { op: 'replace', path: '/status', value: 'review' },
        { op: 'replace', path: '/deadline', value: '2026-12-15' },
        { op: 'add', path: '/team/-', value: 'Noor' },
        { op: 'replace', path: '/team/0', value: 'Ada (lead)' },
      ] });
    },
    dispose() { stage.dispose(); adapter.dispose(); },
  };
}
export type Demo = ReturnType<typeof createDemo>;
