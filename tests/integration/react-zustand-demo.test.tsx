// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { App } from '../../examples/react-zustand/App.js';
import { createDemo } from '../../examples/react-zustand/model.js';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;
let demo: ReturnType<typeof createDemo> | undefined;
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; demo?.dispose(); document.body.replaceChildren(); });
function button(text: string): HTMLButtonElement {
  const found = [...document.querySelectorAll('button')].find(element => element.textContent?.includes(text));
  if (!found) throw new Error(`Missing button: ${text}`);
  return found;
}
function click(text: string): void { act(() => button(text).click()); }
function mount() {
  demo = createDemo(); const element = document.createElement('div'); document.body.append(element);
  root = createRoot(element); act(() => root!.render(<StrictMode><App demo={demo!} /></StrictMode>));
  return demo;
}
it('runs proposal, grouped decisions, real human edit, conflict, rollback and fresh commit in the demo UI', async () => {
  const runtime = mount(); const editAction = runtime.store.getState().editProject;
  click('Generate simulated proposal');
  expect(runtime.store.getState().project.budget).toBe(12000);
  expect(document.body.textContent).toContain('2 related team edits');
  expect(button('Commit approved').disabled).toBe(true);
  click('Accept budget'); click('Reject status'); click('Accept deadline'); click('Reject team');
  expect(button('Commit approved').disabled).toBe(false);
  const input = document.querySelector<HTMLInputElement>('input[aria-label="Budget"]')!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '17000');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  act(() => document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(runtime.store.getState().project.budget).toBe(17000);
  expect(document.body.textContent).toContain('stale');
  await act(async () => button('Commit approved').click());
  expect(document.querySelector('[role="status"]')!.textContent).toContain('Conflict:');
  expect(runtime.store.getState().project.budget).toBe(17000);
  click('Roll back'); expect(document.body.textContent).toContain('rolled-back');
  click('Generate simulated proposal');
  click('Accept budget'); click('Reject status'); click('Reject deadline'); click('Accept team');
  await act(async () => button('Commit approved').click());
  expect(runtime.store.getState().project).toEqual({ name: 'Atlas workspace', budget: 20000, status: 'active', deadline: '2026-12-01', team: ['Ada (lead)', 'Leo', 'Noor'] });
  expect(document.querySelector('[data-testid="committed-budget"]')!.textContent).toBe('$20,000');
  expect(runtime.store.getState().editProject).toBe(editAction);
  expect(button('Commit approved').disabled).toBe(true);
});
it('keeps simultaneous proposals separately inspectable and commits neither automatically', () => {
  const runtime = mount();
  click('Generate simulated proposal'); click('Accept budget'); click('Generate simulated proposal');
  expect(document.querySelectorAll('nav button')).toHaveLength(2);
  expect(button('Accept budget').getAttribute('aria-pressed')).toBe('false');
  click('Proposal 1'); expect(button('Accept budget').getAttribute('aria-pressed')).toBe('true');
  expect(runtime.store.getState().project.budget).toBe(12000);
});
