import React, { useEffect, useState } from 'react';
import {
  Bell,
  Bookmark,
  Camera,
  Clapperboard,
  Compass,
  GitGraph,
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
import vibelyLogo from '../Vibely_logo.png';

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
          setViewer(null);
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
  const showLoginGate = !isAuthLoading && !isConnected;

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    if (!showLoginGate) {
      document.body.style.overflow = '';
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showLoginGate]);

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
      {showLoginGate && <LoginGate />}
    </div>
  );
}

function MobileHeader() {
  return (
    <header className="mobile-header">
      <a className="mobile-brand" href="/" aria-label="Vibely home">
        <img className="brand-logo" src={vibelyLogo} alt="" />
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
        <img className="brand-logo" src={vibelyLogo} alt="" />
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

function LoginGate() {
  return (
    <div className="auth-gate" role="dialog" aria-modal="true" aria-label="Login required">
      <div className="auth-dialog">
        <div className="auth-brand">
          <img className="brand-logo" src={vibelyLogo} alt="" />
          <span>Vibely</span>
        </div>
        <h2>Log in to continue</h2>
        <p>Connect with GitHub to unlock your personalized feed.</p>
        <GithubAuthButton className="primary-action github-action auth-action" label="Continue with GitHub" />
        <p className="auth-footnote">By continuing, you agree to connect your GitHub profile.</p>
      </div>
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
      <GitGraph aria-hidden="true" />
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
