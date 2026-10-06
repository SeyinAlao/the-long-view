// Builds the frontend against an API that accepts connections and never
// answers - Render waking from sleep, at its worst - and fails unless the
// build succeeds by falling back on both cached pages (ADR 013). Without
// the build-time timeout in lib/cached-page-data.ts, each page would wait
// past Next's 60 s staticPageGenerationTimeout and fail the build.
//
//   npm run build:hanging-api --workspace=frontend
import { spawn } from 'node:child_process';
import http from 'node:http';

const sockets = new Set();
const server = http.createServer(() => {}); // never responds
server.on('connection', (socket) => sockets.add(socket));
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const { port } = server.address();
console.log(`Hanging API on 127.0.0.1:${port}`);

const started = Date.now();
const build = spawn('npx', ['next', 'build'], {
  env: { ...process.env, BACKEND_URL: `http://127.0.0.1:${port}`, NEXT_TELEMETRY_DISABLED: '1' },
  shell: true,
});
let output = '';
for (const stream of [build.stdout, build.stderr]) {
  stream.on('data', (chunk) => {
    output += chunk;
    process.stdout.write(chunk);
  });
}
const code = await new Promise((done) => build.on('close', done));
for (const socket of sockets) socket.destroy();
server.close();

const seconds = Math.round((Date.now() - started) / 1000);
const fallbacks = output.split('API unavailable during build').length - 1;
const failures = [];
if (code !== 0) failures.push(`next build exited ${code}`);
if (fallbacks !== 2) failures.push(`expected 2 build-time fallbacks (Ledger, Leaderboard), saw ${fallbacks}`);
if (/timed out|took more than/i.test(output)) failures.push('a page hit the static generation timeout');

if (failures.length) {
  console.error(`\nFAILED after ${seconds}s: ${failures.join('; ')}`);
  process.exit(1);
}
console.log(`\nOK: built in ${seconds}s against a hanging API; both cached pages fell back.`);
