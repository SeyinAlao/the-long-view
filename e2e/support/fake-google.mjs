// A stand-in for Google's three OAuth endpoints, so the browser tests can
// run a real Google sign-in round trip on this machine: the API is
// pointed here by GOOGLE_AUTHORIZATION_URL, GOOGLE_TOKEN_URL and
// GOOGLE_USERINFO_URL (test-only; the API refuses them unless they point
// at 127.0.0.1). Plain Node, no dependencies, listening on 127.0.0.1 only.
//
//   GET  /o/oauth2/v2/auth  -> 302 straight back to redirect_uri with a code and the same state
//   POST /token             -> an access token
//   GET  /userinfo          -> the current profile, shaped like Google's
//   GET  /__fake-google     -> { profile, lastAuthorize } (also the health check)
//   POST /__fake-google?sub=g-1&email=a@example.com&verified=true   (sets the profile)
import http from 'node:http';

const port = Number(process.env.FAKE_GOOGLE_PORT ?? 4200);
let profile = { sub: 'fake-google-user', email: 'google.user@example.com', email_verified: true };
let lastAuthorize = null;

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

// Short, plain values only: these come from test code, but nothing
// unbounded goes into a response or a redirect.
const plain = (value, max) => (typeof value === 'string' && value.length > 0 && value.length <= max && !/[\s<>"]/.test(value) ? value : null);

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);

  if (url.pathname === '/__fake-google') {
    if (req.method === 'POST') {
      const sub = plain(url.searchParams.get('sub'), 64);
      const email = plain(url.searchParams.get('email'), 254);
      const verified = url.searchParams.get('verified');
      if (!sub || !email || !['true', 'false', null].includes(verified)) {
        return json(res, 400, { error: 'sub and email are required; verified must be true, false or absent' });
      }
      profile = { sub, email, ...(verified === null ? {} : { email_verified: verified === 'true' }) };
    }
    return json(res, 200, { profile, lastAuthorize });
  }

  if (url.pathname === '/o/oauth2/v2/auth' && req.method === 'GET') {
    lastAuthorize = Object.fromEntries(url.searchParams);
    const redirectUri = url.searchParams.get('redirect_uri');
    const state = url.searchParams.get('state');
    let back;
    try {
      back = new URL(redirectUri ?? '');
    } catch {
      return json(res, 400, { error: 'redirect_uri is required' });
    }
    // Only ever back to the local frontend the tests run.
    if (back.hostname !== 'localhost' || back.pathname !== '/api/auth/google/callback') {
      return json(res, 400, { error: 'unexpected redirect_uri' });
    }
    back.searchParams.set('code', 'fake-authorization-code');
    if (state !== null) back.searchParams.set('state', state);
    res.writeHead(302, { location: back.toString() });
    return res.end();
  }

  if (url.pathname === '/token' && req.method === 'POST') {
    req.resume(); // the form body isn't needed
    return req.on('end', () => json(res, 200, { access_token: 'fake-access-token', token_type: 'Bearer', expires_in: 3600 }));
  }

  if (url.pathname === '/userinfo' && req.method === 'GET') {
    return json(res, 200, { ...profile, name: 'Google Person' });
  }

  json(res, 404, { error: 'not found' });
});

server.listen(port, '127.0.0.1', () => console.log(`fake Google on 127.0.0.1:${port}`));
