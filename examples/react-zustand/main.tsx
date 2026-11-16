import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { createDemo } from './model.js';
import './style.css';
const demo = createDemo();
const root = createRoot(document.getElementById('root')!);
root.render(<StrictMode><App demo={demo} /></StrictMode>);
window.addEventListener('pagehide', event => { if (!event.persisted) { root.unmount(); demo.dispose(); } });
