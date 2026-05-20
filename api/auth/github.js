const crypto = require('crypto');

const githubAuthorizeUrl = 'https://github.com/login/oauth/authorize';

function getForwardedProto(req) {
  const protoHeader = req.headers['x-forwarded-proto'];
  if (Array.isArray(protoHeader)) {
    return protoHeader[0];
  }

  return (protoHeader || 'http').split(',')[0];
}

function getRequestOrigin(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = getForwardedProto(req);

  if (!host) {
    return 'http://localhost:3000';
  }

  return `${proto}://${host}`;
}

function serializeCookie(name, value, options = {}) {
  const encodedValue = encodeURIComponent(value);
  const attributes = [`${name}=${encodedValue}`];

  if (options.maxAge !== undefined) {
    attributes.push(`Max-Age=${options.maxAge}`);
  }

  if (options.path) {
    attributes.push(`Path=${options.path}`);
  }

  if (options.httpOnly) {
    attributes.push('HttpOnly');
  }

  if (options.sameSite) {
    attributes.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    attributes.push('Secure');
  }

  return attributes.join('; ');
}

module.exports = (req, res) => {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end('Method Not Allowed');
    return;
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.statusCode = 500;
    res.end('GitHub OAuth is not configured.');
    return;
  }

  const state = crypto.randomBytes(16).toString('hex');
  const origin = getRequestOrigin(req);
  const redirectUri =
    process.env.GITHUB_REDIRECT_URI || new URL('/auth/github/callback', origin).toString();
  const scope = process.env.GITHUB_SCOPE || 'read:user user:email';

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
  });

  const cookie = serializeCookie('gh_oauth_state', state, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    secure: getForwardedProto(req) === 'https',
  });

  res.statusCode = 302;
  res.setHeader('Set-Cookie', cookie);
  res.setHeader('Location', `${githubAuthorizeUrl}?${params.toString()}`);
  res.end();
};
