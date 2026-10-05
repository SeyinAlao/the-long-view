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
// Each POST sets the whole state: a parameter left out is turned off.
import http from 'node:http';

const port = Number(process.env.RELAY_PORT ?? 4100);
const backendPort = Number(process.env.BACKEND_PORT ?? 4000);
let delayMs = 0;
let fail = null;

function readFail(value) {
  if (value === 'drop') return 'drop';
  const status = Number(value);
  return status >= 400 && status <= 599 ? status : null;
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
      delayMs = Math.max(0, Number(url.searchParams.get('delayMs')) || 0);
      fail = readFail(url.searchParams.get('fail'));
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ delayMs, fail }));
    return;
  }

  setTimeout(() => forward(req, res), delayMs);
});

server.listen(port, () => console.log(`relay on :${port} -> :${backendPort}`));
