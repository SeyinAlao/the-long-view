// A tiny pass-through proxy between the frontend and the API, so tests
// can imitate Render's cold start and outages. When a delay is set,
// every request waits that long; when a failure is set, every request
// fails that way instead of reaching the API. Plain Node, no dependencies.
//
//   GET  /__relay              -> { "delayMs": n, "fail": null }   (also the health check)
//   POST /__relay?delayMs=12000                (0 turns it off)
//   POST /__relay?fail=503                     (answer every request with that status)
//   POST /__relay?fail=drop                    (close every connection with no answer)
//
// Each POST sets the whole state: a parameter left out is turned off. A
// value outside what the tests use is refused with 400, and the relay
// listens on 127.0.0.1 only, so nothing else on the network can reach it.
import http from 'node:http';

const port = Number(process.env.RELAY_PORT ?? 4100);
const backendPort = Number(process.env.BACKEND_PORT ?? 4000);
// Just above the longest delay any test sets: the timeout test in
// error-pages.spec.ts asks for API_TIMEOUT_MS + 15s = 35s.
const MAX_DELAY_MS = 40_000;
let delayMs = 0;
let fail = null;

// Each returns undefined for a value that isn't allowed.
function readDelay(value) {
  if (value === null) return 0;
  const ms = Number(value);
  return Number.isInteger(ms) && ms >= 0 && ms <= MAX_DELAY_MS ? ms : undefined;
}

function readFail(value) {
  if (value === null) return null;
  if (value === 'drop') return 'drop';
  const status = Number(value);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : undefined;
}

function forward(req, res) {
  if (fail === 'drop') return req.socket.destroy();
  if (fail) {
    res.writeHead(fail, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ statusCode: fail, message: 'Relay: simulated failure' }));
  }
  const upstream = http.request(
    { host: 'localhost', port: backendPort, method: req.method, path: req.url, headers: req.headers },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502);
    res.end();
  });
  req.pipe(upstream);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);

  if (url.pathname === '/__relay') {
    if (req.method === 'POST') {
      const nextDelay = readDelay(url.searchParams.get('delayMs'));
      const nextFail = readFail(url.searchParams.get('fail'));
      if (nextDelay === undefined || nextFail === undefined) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: `delayMs must be an integer from 0 to ${MAX_DELAY_MS}; fail must be 400-599 or drop` }));
        return;
      }
      delayMs = nextDelay;
      fail = nextFail;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ delayMs, fail }));
    return;
  }

  setTimeout(() => forward(req, res), delayMs);
});

server.listen(port, '127.0.0.1', () => console.log(`relay on 127.0.0.1:${port} -> :${backendPort}`));
