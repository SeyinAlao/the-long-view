// A tiny pass-through proxy between the frontend and the API, so tests
// can imitate Render's cold start: when a delay is set, every request
// waits that long before reaching the API. Plain Node, no dependencies.
//
//   GET  /__relay              -> { "delayMs": n }   (also the health check)
//   POST /__relay?delayMs=12000                       (0 turns it off)
import http from 'node:http';

const port = Number(process.env.RELAY_PORT ?? 4100);
const backendPort = Number(process.env.BACKEND_PORT ?? 4000);
let delayMs = 0;

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);

  if (url.pathname === '/__relay') {
    if (req.method === 'POST') delayMs = Math.max(0, Number(url.searchParams.get('delayMs')) || 0);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ delayMs }));
    return;
  }

  setTimeout(() => {
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
  }, delayMs);
});

server.listen(port, () => console.log(`relay on :${port} -> :${backendPort}`));
