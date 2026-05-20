const githubUserUrl = 'https://api.github.com/user';

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

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end('Method Not Allowed');
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.gh_token;

  if (!token) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'not_authenticated' }));
    return;
  }

  try {
    const userResponse = await fetch(githubUserUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'vibely-vercel',
      },
    });

    if (!userResponse.ok) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'invalid_token' }));
      return;
    }

    const user = await userResponse.json();

    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
        html_url: user.html_url,
      }),
    );
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'fetch_failed' }));
  }
};
