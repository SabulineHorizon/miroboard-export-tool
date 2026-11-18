// Offline integration test: the shipped app is unchanged. Only the test process
// redirects SDK HTTPS requests to an in-memory local API fixture.
import { _electron as electron } from '@playwright/test';
import { createServer } from 'node:http';
import { resolve, join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';

const executablePath = process.argv[2] ? resolve(process.argv[2]) : undefined;
const outputDir = resolve('test-output', `desktop-${Date.now()}`);
await mkdir(outputDir, { recursive: true });
let fail = false;
let requests = 0;
const fixture = createServer((req, res) => {
  requests++;
  assert.equal(req.headers.authorization, 'Bearer TEST_TOKEN_ONLY');
  res.setHeader('content-type', 'application/json');
  if (fail) { res.writeHead(401); res.end(JSON.stringify({ message: 'TEST_TOKEN_ONLY must never reach the UI' })); return; }
  const path = new URL(req.url, 'http://localhost').pathname;
  if (/\/items$/.test(path)) res.end(JSON.stringify({ data: [{ id: '1', type: 'text', data: { content: '<p>Fixture export</p>' }, position: { x: 0, y: 0 }, geometry: { width: 200, height: 50 } }], total: 1 }));
  else if (/\/connectors$/.test(path)) res.end(JSON.stringify({ data: [], total: 0 }));
  else if (/\/texts\/1$/.test(path)) res.end(JSON.stringify({ id: '1', style: { fontSize: '16', fillColor: '#ffffff' } }));
  else res.end(JSON.stringify({ id: 'fixture=', name: 'Desktop Fixture' }));
});
await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
const port = fixture.address().port;
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
let app;
try {
  app = await electron.launch({ ...(executablePath ? { executablePath, args: [] } : { args: ['.'] }), env, timeout: 60000 });
  await app.evaluate(async ({ dialog }, { outputDir, port }) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [outputDir] });
    const https = process.mainModule.require('node:https');
    const http = process.mainModule.require('node:http');
    https.request = (options, callback) => {
      if (options.hostname !== 'api.miro.com') throw new Error('Unexpected outbound test request');
      return http.request({ ...options, protocol: 'http:', hostname: '127.0.0.1', host: '127.0.0.1', port, agent: undefined }, callback);
    };
  }, { outputDir, port });
  const page = await app.firstWindow();
  const uiErrors = [];
  page.on('pageerror', error => uiErrors.push(error.message));
  await page.locator('#board').fill('https://miro.com/app/board/fixture=/?share_link_id=123');
  await page.locator('#token').fill('TEST_TOKEN_ONLY');
  await page.locator('#browse').click();
  assert.equal(await page.locator('#output').inputValue(), outputDir);
  await app.evaluate(({ shell }) => { shell.openPath = async path => { globalThis.__openedFolder = path; return ''; }; });
  await page.locator('#open-folder').click();
  assert.equal(await app.evaluate(() => globalThis.__openedFolder), outputDir);
  await page.locator('#export').click();
  await page.locator('#status').filter({ hasText: 'Export complete.' }).waitFor({ timeout: 30000 });
  const tldr = JSON.parse(await readFile(join(outputDir, 'Desktop-Fixture.tldr'), 'utf8'));
  assert.equal(tldr.records.find(r => r.id === 'document:document').gridSize, 10);
  assert.ok(tldr.records.some(r => r.typeName === 'shape'));
  assert.equal(await page.locator('#token').inputValue(), '');
  await page.locator('#board').fill('fixture=');
  await page.locator('#format').selectOption('all');
  await page.locator('#tldraw-format').selectOption('both');
  await page.locator('#token').fill('TEST_TOKEN_ONLY');
  await page.locator('#export').click();
  await page.locator('#status').filter({ hasText: 'Export complete.' }).waitFor();
  for (const file of ['Desktop-Fixture.canvas', 'Desktop-Fixture.drawio', 'Desktop-Fixture.tldraw.md', 'miro-notes/Desktop-Fixture-index.md']) await readFile(join(outputDir, file));
  const security = await app.evaluate(({ BrowserWindow }) => {
    const prefs = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
    return { nodeIntegration: prefs.nodeIntegration, contextIsolation: prefs.contextIsolation, sandbox: prefs.sandbox };
  });
  assert.deepEqual(security, { nodeIntegration: false, contextIsolation: true, sandbox: true });
  assert.equal(await page.evaluate(() => typeof window.require), 'undefined');
  await page.screenshot({ path: join(outputDir, 'success-state.png') });
  // Exercise the original compiled CLI with the same local API fixture. The
  // dummy token is supplied in memory via env, never in process arguments.
  const hook = join(outputDir, 'cli-fixture.cjs');
  await writeFile(hook, `const https = require('node:https'); const http = require('node:http');
    https.request = (options, callback) => {
      if (options.hostname !== 'api.miro.com') throw new Error('Unexpected test request');
      return http.request({ ...options, protocol: 'http:', hostname: '127.0.0.1', host: '127.0.0.1', port: ${port}, agent: undefined }, callback);
    };`);
  const cliDir = join(outputDir, 'cli');
  const cli = await promisify(execFile)(process.execPath, ['--require', hook, 'dist/index.js', 'https://miro.com/app/board/fixture=/', '--format', 'canvas,markdown,tldraw,drawio', '--tldraw-format', 'both', '--output', cliDir, '--no-images'], { env: { ...env, MIRO_ACCESS_TOKEN: 'TEST_TOKEN_ONLY' }, timeout: 30000 });
  assert.ok(cli.stdout.includes('Done!'));
  assert.ok(!cli.stdout.includes('TEST_TOKEN_ONLY') && !cli.stderr.includes('TEST_TOKEN_ONLY'));
  const cliTldr = JSON.parse(await readFile(join(cliDir, 'Desktop-Fixture.tldr'), 'utf8'));
  assert.equal(cliTldr.records.find(r => r.id === 'document:document').gridSize, 10);
  fail = true;
  await page.locator('#token').fill('TEST_TOKEN_ONLY');
  await page.locator('#export').click();
  await page.locator('#status').filter({ hasText: 'Miro rejected the token.' }).waitFor();
  assert.ok(!(await page.locator('body').innerText()).includes('TEST_TOKEN_ONLY'));
  assert.equal(uiErrors.length, 0, uiErrors.join('\n'));
  await page.screenshot({ path: join(outputDir, 'error-state.png') });
  console.log(JSON.stringify({ executable: executablePath || 'development', requests, outputDir, security, result: 'PASS: URL/ID, all formats, gridSize, token clearing and sanitized API errors' }, null, 2));
} finally {
  if (app) await app.close();
  await new Promise(resolve => fixture.close(resolve));
}
