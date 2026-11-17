// Manual maintenance: preserve reviewed exact manifests; refresh locks only.
import { execFileSync } from 'node:child_process';
for (const name of ['react18', 'react19', 'vue', 'angular20', 'angular21']) {
  execFileSync('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit'], { cwd: new URL(`./${name}/`, import.meta.url), stdio: 'inherit' });
}
