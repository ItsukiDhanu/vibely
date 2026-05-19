import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = Number(process.env.PORT) || 3000;

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
const redirectUri = process.env.GITHUB_REDIRECT_URI || `${frontendUrl}/auth/github/callback`;
const clientId = process.env.GITHUB_CLIENT_ID;
const clientSecret = process.env.GITHUB_CLIENT_SECRET;
const scope = process.env.GITHUB_SCOPE || 'read:user user:email';

const githubAuthorizeUrl = 'https://github.com/login/oauth/authorize';
const githubTokenUrl = 'https://github.com/login/oauth/access_token';
const githubUserUrl = 'https://api.github.com/user';

app.use(cookieParser());

function requireGithubConfig(response) {
  if (!clientId || !clientSecret) {
    response.status(500).send('GitHub OAuth is not configured.');
    return false;
  }

  return true;
}

app.get('/auth/github', (request, response) => {
  if (!requireGithubConfig(response)) {
    return;
  }

  const state = crypto.randomBytes(16).toString('hex');

  response.cookie('gh_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
  });

  response.redirect(`${githubAuthorizeUrl}?${params.toString()}`);
});

app.get('/auth/github/callback', async (request, response) => {
  if (!requireGithubConfig(response)) {
    return;
  }

  const { code, state } = request.query;
  const storedState = request.cookies.gh_oauth_state;

  if (!code || typeof code !== 'string') {
    response.status(400).send('Missing authorization code.');
    return;
  }

  if (!state || state !== storedState) {
    response.status(400).send('Invalid OAuth state.');
    return;
  }

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
      response.status(400).send('Unable to retrieve access token.');
      return;
    }

    response.clearCookie('gh_oauth_state');
    response.cookie('gh_token', tokenData.access_token, {
      httpOnly: true,
      sameSite: 'lax',
    });

    response.redirect(frontendUrl);
  } catch (error) {
    response.status(500).send('GitHub OAuth failed.');
  }
});

app.get('/api/me', async (request, response) => {
  const token = request.cookies.gh_token;

  if (!token) {
    response.status(401).json({ error: 'not_authenticated' });
    return;
  }

  try {
    const userResponse = await fetch(githubUserUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'vibely-dev',
      },
    });

    if (!userResponse.ok) {
      response.status(401).json({ error: 'invalid_token' });
      return;
    }

    const user = await userResponse.json();

    response.json({
      login: user.login,
      name: user.name,
      avatar_url: user.avatar_url,
      html_url: user.html_url,
    });
  } catch (error) {
    response.status(500).json({ error: 'fetch_failed' });
  }
});

app.get('/auth/logout', (request, response) => {
  response.clearCookie('gh_token');
  response.redirect(frontendUrl);
});

app.listen(port, () => {
  console.log(`GitHub auth server running on http://localhost:${port}`);
});
