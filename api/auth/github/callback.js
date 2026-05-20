const githubTokenUrl = 'https://github.com/login/oauth/access_token';

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

function parseCookies(header = '') {
  return header.split(';').reduce((accumulator, part) => {
    const trimmed = part.trim();
    if (!trimmed) {
      return accumulator;
    }

    const [name, ...rest] = trimmed.split('=');
    if (!name) {
      return accumulator;
    }

    accumulator[name] = decodeURIComponent(rest.join('='));
    return accumulator;
  }, {});
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

module.exports = async (req, res) => {
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

  const origin = getRequestOrigin(req);
  const url = new URL(req.url || '/', origin);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookies = parseCookies(req.headers.cookie);
  const storedState = cookies.gh_oauth_state;

  if (!code) {
    res.statusCode = 400;
    res.end('Missing authorization code.');
    return;
  }

  if (!state || state !== storedState) {
    res.statusCode = 400;
    res.end('Invalid OAuth state.');
    return;
  }

  const redirectUri =
    process.env.GITHUB_REDIRECT_URI || new URL('/auth/github/callback', origin).toString();

  try {
    const tokenResponse = await fetch(githubTokenUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        state,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      res.statusCode = 400;
      res.end('Unable to retrieve access token.');
      return;
    }

    const secure = getForwardedProto(req) === 'https';
    const tokenCookie = serializeCookie('gh_token', tokenData.access_token, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      secure,
    });

    const stateCookie = serializeCookie('gh_oauth_state', '', {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 0,
      secure,
    });

    res.statusCode = 302;
    res.setHeader('Set-Cookie', [tokenCookie, stateCookie]);
    res.setHeader('Location', process.env.FRONTEND_URL || origin);
    res.end();
  } catch (error) {
    res.statusCode = 500;
    res.end('GitHub OAuth failed.');
  }
};
