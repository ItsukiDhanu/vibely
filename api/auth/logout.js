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

  const secure = getForwardedProto(req) === 'https';
  const clearToken = serializeCookie('gh_token', '', {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 0,
    secure,
  });

  res.statusCode = 302;
  res.setHeader('Set-Cookie', clearToken);
  res.setHeader('Location', process.env.FRONTEND_URL || getRequestOrigin(req));
  res.end();
};
