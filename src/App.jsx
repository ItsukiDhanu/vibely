import React, { useEffect, useState } from 'react';
import {
  Bell,
  Bookmark,
  Camera,
  Clapperboard,
  Compass,
  Heart,
  Home,
  ImagePlus,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Send,
  Settings,
  SquarePlus,
  UserCircle,
  Users,
} from 'lucide-react';

const brandLogo = '/Vibely_logo.png';
const LOCAL_AUTH_KEY = 'vibely_local_auth';
const LOCAL_USER_KEY = 'vibely_local_user';

const navItems = [
  { label: 'Home', icon: Home, active: true },
  { label: 'Search', icon: Search },
  { label: 'Explore', icon: Compass },
  { label: 'Reels', icon: Clapperboard },
  { label: 'Messages', icon: Send },
  { label: 'Notifications', icon: Heart },
  { label: 'Create', icon: SquarePlus },
  { label: 'Profile', icon: UserCircle },
];

const mobileItems = navItems.filter(({ label }) =>
  ['Home', 'Search', 'Explore', 'Reels', 'Profile'].includes(label),
);

const githubAuthUrl = buildGithubAuthUrl({
  baseUrl: import.meta.env.VITE_GITHUB_OAUTH_URL || '/auth/github',
  clientId: import.meta.env.VITE_GITHUB_CLIENT_ID,
  redirectUri: import.meta.env.VITE_GITHUB_REDIRECT_URI || getDefaultRedirectUri(),
  scope: import.meta.env.VITE_GITHUB_SCOPE,
});

function safeJsonParse(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function readLocalUser() {
  if (typeof window === 'undefined') {
    return null;
  }

  return safeJsonParse(window.localStorage.getItem(LOCAL_USER_KEY));
}

function readLocalAuth() {
  if (typeof window === 'undefined') {
    return null;
  }

  return safeJsonParse(window.localStorage.getItem(LOCAL_AUTH_KEY));
}

function writeLocalAuth({ username, password }) {
  if (typeof window === 'undefined') {
    return;
  }

  const user = { login: username, name: username };

  window.localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify({ username, password }));
  window.localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
}

function buildGithubAuthUrl({ baseUrl, clientId, redirectUri, scope }) {
  if (baseUrl) {
    const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

    try {
      const url = new URL(normalizedBaseUrl);
      const isGithubAuthorize = url.hostname === 'github.com' && url.pathname === '/login/oauth/authorize';

      if (!isGithubAuthorize) {
        return normalizedBaseUrl;
      }

      if (clientId && !url.searchParams.get('client_id')) {
        url.searchParams.set('client_id', clientId);
      }
      if (redirectUri && !url.searchParams.get('redirect_uri')) {
        url.searchParams.set('redirect_uri', redirectUri);
      }
      if (scope && !url.searchParams.get('scope')) {
        url.searchParams.set('scope', scope);
      }

      return url.toString();
    } catch (error) {
      return normalizedBaseUrl;
    }
  }

  if (!clientId) {
    return '';
  }

  const params = new URLSearchParams({ client_id: clientId });
  if (redirectUri) {
    params.set('redirect_uri', redirectUri);
  }
  if (scope) {
    params.set('scope', scope);
  }

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

function normalizeBaseUrl(baseUrl) {
  if (baseUrl.startsWith('/')) {
    if (typeof window === 'undefined') {
      return baseUrl;
    }

    return new URL(baseUrl, window.location.origin).toString();
  }

  return baseUrl;
}

function getDefaultRedirectUri() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.origin;
}

function App() {
  const [viewer, setViewer] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadViewer = async () => {
      try {
        const response = await fetch('/api/me', { credentials: 'include' });

        if (!response.ok) {
          throw new Error('Not authenticated');
        }

        const data = await response.json();

        if (isMounted) {
          setViewer(data);
        }
      } catch (error) {
        if (isMounted) {
          const localUser = readLocalUser();
          setViewer(localUser);
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    loadViewer();

    return () => {
      isMounted = false;
    };
  }, []);

  const isConnected = Boolean(viewer);

  const handleModeChange = (nextMode) => {
    setAuthMode(nextMode);
    setAuthError('');
  };

  const handleAuthSubmit = ({ mode, username, password, confirmPassword }) => {
    const normalizedUsername = String(username || '').trim();

    if (!normalizedUsername) {
      setAuthError('Enter a username to continue.');
      return;
    }

    if (!password) {
      setAuthError('Enter a password to continue.');
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setAuthError('Passwords do not match.');
        return;
      }

      writeLocalAuth({ username: normalizedUsername, password });
      setViewer({ login: normalizedUsername, name: normalizedUsername });
      setAuthError('');
      return;
    }

    const storedAuth = readLocalAuth();
    if (!storedAuth || storedAuth.username !== normalizedUsername || storedAuth.password !== password) {
      setAuthError('Invalid username or password.');
      return;
    }

    setViewer({ login: normalizedUsername, name: normalizedUsername });
    setAuthError('');
  };

  if (!isConnected) {
    return (
      <AuthPage
        mode={authMode}
        onModeChange={handleModeChange}
        isAuthLoading={isAuthLoading}
        authError={authError}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  return (
    <div className="app-shell">
      <MobileHeader />
      <Sidebar />
      <main className="content">
        <section className="feed-column" aria-label="Vibely feed">
          <StoriesEmptyState />
          <FeedEmptyState isConnected={isConnected} />
        </section>
        <aside className="account-panel" aria-label="Account">
          <AccountPanel viewer={viewer} isAuthLoading={isAuthLoading} />
        </aside>
      </main>
      <MobileBar />
    </div>
  );
}

function AuthPage({ mode, onModeChange, isAuthLoading, authError, onSubmit }) {
  const isRegistering = mode === 'register';
  const title = isRegistering ? 'Create your account' : 'Log in to Vibely';
  const subtitle = isRegistering
    ? 'Join the community and start sharing your moments.'
    : 'Welcome back. Sign in to continue.';
  const submitLabel = isRegistering ? 'Create account' : 'Log in';

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <div className="auth-brand">
          <img className="brand-logo" src={brandLogo} alt="" />
          <span>Vibely</span>
        </div>
        <div className="auth-heading">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            onSubmit({
              mode,
              username: formData.get('username'),
              password: formData.get('password'),
              confirmPassword: formData.get('confirmPassword'),
            });
          }}
        >
          <label className="auth-field">
            <span>Username</span>
            <input
              type="text"
              name="username"
              placeholder="yourname"
              autoComplete="username"
              required
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              required
            />
          </label>
          {isRegistering && (
            <label className="auth-field">
              <span>Confirm password</span>
              <input
                type="password"
                name="confirmPassword"
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </label>
          )}
          <button className="primary-action auth-submit" type="submit" disabled={isAuthLoading}>
            {isAuthLoading ? 'Checking session...' : submitLabel}
          </button>
        </form>

        {authError && (
          <p className="auth-error" role="alert">
            {authError}
          </p>
        )}

        <div className="auth-divider">
          <span>or</span>
        </div>
        <GithubAuthButton className="secondary-action github-action auth-action" label="Continue with GitHub" />

        <button
          className="auth-toggle"
          type="button"
          onClick={() => onModeChange(isRegistering ? 'login' : 'register')}
        >
          <span>{isRegistering ? 'Already have an account?' : 'New here?'}</span>
          <span className="auth-toggle-action">{isRegistering ? 'Log in' : 'Register now'}</span>
        </button>
      </div>
    </div>
  );
}

function MobileHeader() {
  return (
    <header className="mobile-header">
      <a className="mobile-brand" href="/" aria-label="Vibely home">
        <img className="brand-logo" src={brandLogo} alt="" />
        <span>Vibely</span>
      </a>
      <div className="mobile-actions">
        <IconButton label="Create" icon={SquarePlus} />
        <IconButton label="Notifications" icon={Heart} />
        <IconButton label="Messages" icon={Send} />
      </div>
    </header>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <a className="brand" href="/" aria-label="Vibely home">
        <img className="brand-logo" src={brandLogo} alt="" />
        <span>Vibely</span>
      </a>

      <nav className="nav-list">
        {navItems.map(({ label, icon: Icon, active }) => (
          <button className={active ? 'nav-item active' : 'nav-item'} type="button" title={label} key={label}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <button className="nav-item more-link" type="button" title="More">
        <Menu aria-hidden="true" />
        <span>More</span>
      </button>
    </aside>
  );
}

function StoriesEmptyState() {
  return (
    <section className="stories-shell" aria-label="Stories">
      <button className="story-slot story-create" type="button">
        <span className="story-ring">
          <Plus aria-hidden="true" />
        </span>
        <span>Your story</span>
      </button>

      {Array.from({ length: 6 }).map((_, index) => (
        <span className="story-slot story-ghost" aria-hidden="true" key={index}>
          <span className="story-ring" />
          <span className="story-line" />
        </span>
      ))}
    </section>
  );
}

function FeedEmptyState({ isConnected }) {
  return (
    <section className="feed-stage" aria-label="Feed is empty">
      <div className="composer-strip">
        <div className="avatar-empty" aria-hidden="true">
          <UserCircle />
        </div>
        <button className="composer-prompt" type="button">
          Create a new post
        </button>
        <IconButton label="Add media" icon={ImagePlus} />
      </div>

      <div className="empty-layout">
        <PostPreview />
        <div className="empty-copy">
          <div className="empty-icon" aria-hidden="true">
            <Camera />
          </div>
          <h1>Start sharing on Vibely</h1>
          <p>Your feed is empty until real posts are added.</p>
          <div className="empty-actions">
            <button className="primary-action" type="button">
              <SquarePlus aria-hidden="true" />
              <span>Create post</span>
            </button>
            <button className="secondary-action" type="button">
              <ImagePlus aria-hidden="true" />
              <span>Add media</span>
            </button>
            {!isConnected && <GithubAuthButton className="secondary-action github-action" label="Continue with GitHub" />}
          </div>
        </div>
      </div>
    </section>
  );
}

function PostPreview() {
  return (
    <div className="post-preview" aria-hidden="true">
      <div className="post-preview-head">
        <span className="mini-avatar" />
        <span className="skeleton-line short" />
        <span className="preview-dot" />
      </div>
      <div className="media-empty">
        <ImagePlus />
      </div>
      <div className="post-preview-actions">
        <Heart />
        <MessageCircle />
        <Send />
        <Bookmark className="push-icon" />
      </div>
      <span className="skeleton-line wide" />
      <span className="skeleton-line mid" />
    </div>
  );
}

function AccountPanel({ viewer, isAuthLoading }) {
  const displayName = viewer?.name || viewer?.login || 'Vibely';
  const statusLabel = isAuthLoading
    ? 'Checking connection...'
    : viewer
      ? `Connected as ${viewer.login}`
      : 'Profile not connected';

  return (
    <div className="account-rail">
      <div className="identity-row">
        <div className="identity-avatar" aria-hidden="true">
          {viewer?.avatar_url ? <img src={viewer.avatar_url} alt="" /> : <UserCircle />}
        </div>
        <div className="identity-copy">
          <strong>{displayName}</strong>
          <span>{statusLabel}</span>
        </div>
        <IconButton label="Profile settings" icon={Settings} />
      </div>

      {!viewer && (
        <section className="auth-card" aria-label="Connect GitHub">
          <GithubAuthButton className="primary-action github-action auth-action" label="Continue with GitHub" />
          <p>Connect GitHub to personalize your feed.</p>
        </section>
      )}

      <section className="rail-section" aria-label="Suggestions">
        <div className="rail-heading">
          <span>Suggestions for you</span>
          <button type="button">See all</button>
        </div>
        <div className="rail-empty">
          <Users aria-hidden="true" />
          <p>No suggestions available.</p>
        </div>
      </section>

      <section className="rail-section compact" aria-label="Activity">
        <div className="rail-heading">
          <span>Activity</span>
          <Bell aria-hidden="true" />
        </div>
        <div className="rail-empty slim">
          <p>No activity yet.</p>
        </div>
      </section>
    </div>
  );
}

function MobileBar() {
  return (
    <nav className="mobile-bar" aria-label="Mobile navigation">
      {mobileItems.map(({ label, icon: Icon, active }) => (
        <button className={active ? 'mobile-item active' : 'mobile-item'} type="button" title={label} key={label}>
          <Icon aria-hidden="true" />
        </button>
      ))}
    </nav>
  );
}

function GithubAuthButton({ className, label = 'Continue with GitHub' }) {
  const isConfigured = Boolean(githubAuthUrl);
  const buttonClassName = [className, !isConfigured && 'is-disabled'].filter(Boolean).join(' ');

  return (
    <a
      className={buttonClassName}
      href={githubAuthUrl || '#'}
      aria-disabled={!isConfigured}
      onClick={(event) => {
        if (!isConfigured) {
          event.preventDefault();
        }
      }}
    >
      <svg className="github-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M12 .296c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.304-5.466-1.332-5.466-5.93 0-1.31.469-2.382 1.236-3.222-.123-.304-.535-1.527.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.649.241 2.872.118 3.176.77.84 1.235 1.912 1.235 3.222 0 4.61-2.804 5.623-5.476 5.921.43.372.823 1.102.823 2.222 0 1.604-.015 2.897-.015 3.293 0 .319.192.694.801.576 4.765-1.589 8.199-6.085 8.199-11.386 0-6.627-5.373-12-12-12z"
          fill="currentColor"
        />
      </svg>
      <span>{label}</span>
    </a>
  );
}

function IconButton({ label, icon: Icon }) {
  return (
    <button className="icon-button" type="button" aria-label={label} title={label}>
      <Icon aria-hidden="true" />
    </button>
  );
}

export default App;
