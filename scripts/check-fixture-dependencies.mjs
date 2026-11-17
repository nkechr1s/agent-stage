import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

// Exercise the old CLI's actual callers, not just the replacement packages' imports.
const require = createRequire(join(resolve(process.argv[2]), 'package.json'));
const cliRequire = createRequire(require.resolve('@angular/cli/package.json'));
const pacoteRequire = createRequire(cliRequire.resolve('pacote'));
const builderRequire = createRequire(require.resolve('@angular-devkit/build-angular/package.json'));
const semver = cliRequire('semver');
const versions = {};
function version(from, name, range) {
  let directory = dirname(from.resolve(name));
  let metadata;
  while (true) {
    const file = join(directory, 'package.json');
    if (existsSync(file)) {
      const candidate = JSON.parse(readFileSync(file, 'utf8'));
      if (candidate.name === name) { metadata = candidate; break; }
    }
    assert.notEqual(dirname(directory), directory, `Missing metadata for ${name}`);
    directory = dirname(directory);
  }
  assert(semver.satisfies(metadata.version, range), `${name}@${metadata.version} outside tested security range ${range}`);
  if (metadata.engines?.node) assert(semver.satisfies(process.version, metadata.engines.node), `${name} Node engine mismatch`);
  versions[name] = metadata.version;
}
version(builderRequire, 'piscina', '>=4.9.4 <5');
version(cliRequire, 'pacote', '>=21.5.1 <22');
version(pacoteRequire, 'tar', '>=7.5.23 <8');
version(pacoteRequire, 'sigstore', '>=4.1.1 <5');
const copyRequire = createRequire(builderRequire.resolve('copy-webpack-plugin'));
version(copyRequire, 'serialize-javascript', '>=7.0.3 <8');
version(builderRequire, 'webpack-dev-middleware', '>=7.4.6 <8');
assert.equal(copyRequire('serialize-javascript')({ patterns: ['assets/*'], options: { concurrency: 2 } }, { unsafe: true }),
  '{"patterns":["assets/*"],"options":{"concurrency":2}}');

const root = mkdtempSync(join(tmpdir(), 'agent-stage-dependency-probes-'));
let server;
try {
  const Piscina = builderRequire('piscina');
  const worker = join(root, 'worker.cjs');
  writeFileSync(worker, 'module.exports = value => ({ value: value + 1, args: process.execArgv });');
  let pool;
  // Benign inherited argv detects the worker-options gadget without executing a payload.
  assert(!Object.hasOwn(Object.prototype, 'execArgv'));
  Object.defineProperty(Object.prototype, 'execArgv', { configurable: true, value: ['--no-warnings'] });
  try {
    pool = new Piscina({ filename: worker, minThreads: 1, maxThreads: 1 });
  } finally {
    delete Object.prototype.execArgv;
  }
  try {
    const result = await pool.run(41);
    assert.equal(result.value, 42);
    assert(!result.args.includes('--no-warnings'), 'Worker must not inherit polluted execArgv');
  } finally { await pool.destroy(); }
  Object.defineProperty(Object.prototype, 'filename', { configurable: true, value: worker });
  let unconfigured;
  try { unconfigured = new Piscina({ minThreads: 0, maxThreads: 1 }); }
  finally { delete Object.prototype.filename; }
  try { await assert.rejects(unconfigured.run(1), /filename/i); }
  finally { await unconfigured.destroy(); }

  const source = join(root, 'source');
  mkdirSync(join(source, 'package'), { recursive: true });
  const manifest = { name: 'agent-stage-fixture-probe', version: '1.0.0', scripts: { install: 'exit 99', prepare: 'exit 99' } };
  writeFileSync(join(source, 'package/package.json'), JSON.stringify(manifest));
  writeFileSync(join(source, 'package/probe.txt'), 'trusted local archive');
  const archive = join(root, 'probe.tgz');
  const tar = pacoteRequire('tar');
  await tar.c({ cwd: source, file: archive, gzip: true }, ['package']);
  const pacote = cliRequire('pacote');
  const options = { cache: join(root, 'cache'), ignoreScripts: true };
  const destination = join(root, 'extracted');
  await pacote.extract(archive, destination, options);
  assert.equal(readFileSync(join(destination, 'probe.txt'), 'utf8'), 'trusted local archive');
  assert.equal((await pacote.manifest(archive, options)).version, manifest.version);

  server = createServer((_request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ name: manifest.name, 'dist-tags': { latest: manifest.version }, versions: { [manifest.version]: manifest } }));
  });
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  const registry = `http://127.0.0.1:${server.address().port}`;
  const metadata = cliRequire('./src/utilities/package-metadata.js');
  const logger = { warn: message => { throw Error(message); } };
  assert.equal((await metadata.fetchPackageManifest(manifest.name, logger, { registry })).version, manifest.version);
  assert.equal((await metadata.fetchPackageMetadata(manifest.name, logger, { registry })).tags.latest.version, manifest.version);

  const webpack = builderRequire('webpack');
  const CopyPlugin = builderRequire('copy-webpack-plugin');
  const entry = join(root, 'webpack-entry.cjs');
  writeFileSync(entry, 'console.log("dependency probe");');
  const output = join(root, 'webpack');
  const compiler = webpack({ mode: 'development', entry, output: { path: output, filename: 'bundle.js' }, infrastructureLogging: { level: 'none' },
    plugins: [new CopyPlugin({ patterns: [{ from: join(source, 'package/probe.txt'), to: 'copied.txt', transform: { transformer: content => content, cache: true } }] })] });
  // Angular 17's webpack-dev-server 4 must still drive middleware 7 correctly.
  if (require('./package.json').overrides['webpack-dev-middleware']) {
    const DevServer = builderRequire('webpack-dev-server');
    const development = new DevServer({ host: '127.0.0.1', port: 0, hot: false, liveReload: false, static: false, client: false, webSocketServer: false, devMiddleware: { stats: false } }, compiler);
    try {
      await development.start();
      const response = await fetch(`http://127.0.0.1:${development.server.address().port}/bundle.js`);
      assert.equal(response.status, 200);
      assert((await response.text()).includes('dependency probe'));
      assert.equal(await (await fetch(`http://127.0.0.1:${development.server.address().port}/copied.txt`)).text(), 'trusted local archive');
    } finally { await development.stop(); }
  } else {
    try {
      await new Promise((done, reject) => compiler.run((error, stats) => {
        if (error || stats.hasErrors()) reject(error || Error(stats.toString())); else done();
      }));
      assert.equal(readFileSync(join(output, 'copied.txt'), 'utf8'), 'trusted local archive');
    } finally { await new Promise((done, reject) => compiler.close(error => error ? reject(error) : done())); }
  }

  const fixture = require('./package.json');
  if (fixture.overrides['external-editor']) {
    const editorRequire = createRequire(require.resolve('external-editor'));
    version(editorRequire, 'tmp', '>=0.2.6 <0.3');
    assert.throws(() => editorRequire('tmp').tmpNameSync({ prefix: '../escape' }));
    const { ExternalEditor } = require('external-editor');
    const editor = new ExternalEditor('probe', { dir: root, prefix: 'editor-', postfix: '.txt' });
    try { assert.equal(readFileSync(editor.tempFile, 'utf8'), 'probe'); }
    finally { editor.cleanup(); }
    assert(!existsSync(editor.tempFile));
  }
  console.log('Fixture dependency API/security probes passed:', JSON.stringify(versions));
} finally {
  if (server?.listening) await new Promise(done => server.close(done));
  rmSync(root, { recursive: true, force: true });
}
