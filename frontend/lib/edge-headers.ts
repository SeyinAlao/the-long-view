// The headers that tell the API a request came through this app, and
// from which client IP (ADR 010). Server-only: EDGE_PROXY_KEY is a
// secret and never a NEXT_PUBLIC_ variable, so in the browser it is
// undefined and nothing here adds anything.
const EDGE_KEY = 'x-tlv-edge-key';
const CLIENT_IP = 'x-tlv-client-ip';
const SOURCE = 'x-tlv-source';

// For this app's own server-side calls (Server Components, proxy.ts's
// session check). They carry no client IP, so the API doesn't limit them
// per IP.
export function serverEdgeHeaders(): Record<string, string> {
  const key = process.env.EDGE_PROXY_KEY;
  return key ? { [EDGE_KEY]: key } : {};
}

// For a browser's /api request on its way to the API. Whatever x-tlv-*
// headers the browser sent are dropped first, so a client can never
// choose its own key or IP. The client IP is read from x-real-ip only on
// Vercel, which sets that header itself and overwrites any value a
// client sends (vercel.com/docs/headers/request-headers); anywhere else
// (local runs, the browser tests) no IP is sent.
export function forwardedApiHeaders(incoming: Headers): Headers {
  const headers = new Headers(incoming);
  for (const name of [...headers.keys()]) {
    if (name.toLowerCase().startsWith('x-tlv-')) headers.delete(name);
  }
  for (const [name, value] of Object.entries(serverEdgeHeaders())) headers.set(name, value);
  const clientIp = process.env.VERCEL === '1' ? incoming.get('x-real-ip') : null;
  if (process.env.VERCEL === '1') headers.set(SOURCE, 'browser');
  if (clientIp) headers.set(CLIENT_IP, clientIp);
  return headers;
}
