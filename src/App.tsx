import { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabase';
import {
  Activity,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Cloud,
  Copy,
  ExternalLink,
  Globe2,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Server,
  Settings2,
  ShieldCheck,
  Trash2,
  X,
  Pencil,
  Menu,
} from 'lucide-react';

type Project = {
  id: string;
  name: string;
  domain: string;
  url: string;
  provider: string;
  status: 'Live' | 'Building' | 'Paused';
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type ProjectDraft = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;

const emptyDraft: ProjectDraft = {
  name: '',
  domain: '',
  url: '',
  provider: '',
  status: 'Building',
  notes: '',
};

function App() {
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [draft, setDraft] = useState<ProjectDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) setErrorMessage(error.message);
      const sessionUser = data.session?.user ?? null;
      const ownerId = import.meta.env.VITE_OWNER_USER_ID;
      if (sessionUser && ownerId && sessionUser.id !== ownerId) {
        await supabase.auth.signOut();
        setUser(null);
        setErrorMessage('This CloudDesk is private. This account is not authorized.');
      } else {
        setUser(sessionUser);
      }
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const ownerId = import.meta.env.VITE_OWNER_USER_ID;
      if (session?.user && ownerId && session.user.id !== ownerId) {
        setUser(null);
        setErrorMessage('This CloudDesk is private. This account is not authorized.');
        void supabase.auth.signOut();
        return;
      }
      setUser(session?.user ?? null);
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function loadProjects() {
    setLoading(true);
    setErrorMessage('');
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProjects((data || []).map(row => ({
        id: row.id,
        name: row.name,
        domain: row.domain || '',
        url: row.url || '',
        provider: row.provider || '',
        status: row.status,
        notes: row.notes || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load your websites.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) void loadProjects();
  }, [user]);

  async function signInWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setErrorMessage('');
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setErrorMessage('Account created. Check your email to confirm it, then sign in.');
        setAuthMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function signInWithGoogle() {
    setAuthBusy(true);
    setErrorMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setErrorMessage(error.message);
      setAuthBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProjects([]);
  }

  function openNew() {
    setEditing(null);
    setDraft(emptyDraft);
    setModalOpen(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setDraft({
      name: project.name,
      domain: project.domain,
      url: project.url,
      provider: project.provider,
      status: project.status,
      notes: project.notes,
    });
    setModalOpen(true);
  }

  async function saveProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    setSaving(true);
    setErrorMessage('');
    try {
      const payload = {
        name: draft.name.trim(),
        domain: draft.domain.trim(),
        url: draft.url.trim(),
        provider: draft.provider.trim(),
        status: draft.status,
        notes: draft.notes.trim(),
        updated_at: new Date().toISOString(),
      };
      const result = editing
        ? await supabase.from('projects').update(payload).eq('id', editing.id)
        : await supabase.from('projects').insert({ ...payload, user_id: user.id });
      if (result.error) throw result.error;
      setModalOpen(false);
      setDraft(emptyDraft);
      setEditing(null);
      await loadProjects();
    } catch {
      setErrorMessage('Your website could not be saved. Check your database setup and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject() {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('projects').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      await loadProjects();
    } catch {
      setErrorMessage('Could not delete this website. Please try again.');
      setDeleteTarget(null);
    }
  }

  const filteredProjects = useMemo(
    () =>
      projects.filter(project => {
        const matchesQuery = [project.name, project.domain, project.provider]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase());
        return matchesQuery && (filter === 'All' || project.status === filter);
      }),
    [projects, query, filter]
  );

  const liveCount = projects.filter(
    project => project.status === 'Live'
  ).length;
  const buildingCount = projects.filter(
    project => project.status === 'Building'
  ).length;

  if (!authReady) {
    return (
      <div className="loading-screen">
        <div className="loader" />
        <span>Preparing your workspace…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="brand-mark">
            <Cloud size={25} />
          </div>
          <p className="eyebrow">YOUR PERSONAL CONTROL ROOM</p>
          <h1>
            Hosting, <span>in one place.</span>
          </h1>
          <p className="auth-copy">
            Keep your websites, domains, hosting providers and project notes
            organized in one simple dashboard.
          </p>
          <form className="personal-auth-form" onSubmit={signInWithEmail}>
            <label>Email address
              <input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" />
            </label>
            <label>Password
              <input type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 6 characters" />
            </label>
            <button className="primary-btn sign-in-btn" type="submit" disabled={authBusy}>
              {authBusy ? 'Please wait…' : authMode === 'signup' ? 'Create my account' : 'Sign in with email'} <ArrowUpRight size={18} />
            </button>
          </form>
          <div className="auth-divider"><span>OR</span></div>
          <button className="secondary-btn google-auth-btn" onClick={signInWithGoogle} disabled={authBusy}>
            Continue with Google
          </button>
          <button className="auth-mode-btn" onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setErrorMessage(''); }}>
            {authMode === 'signin' ? 'First time? Create your private account' : 'Already have an account? Sign in'}
          </button>
          {errorMessage && <p className="error-text">{errorMessage}</p>}
          <div className="auth-foot">
            <ShieldCheck size={15} /> Your project list is private to your
            account.
          </div>
        </div>
        <p className="auth-note">
          PERSONAL HOSTING DASHBOARD <span>·</span> BUILT FOR YOUR WORKSPACE
        </p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className={mobileMenu ? 'sidebar sidebar-open' : 'sidebar'}>
        <div className="side-brand">
          <div className="brand-mark small">
            <Cloud size={20} />
          </div>
          <span>
            cloud<span className="brand-light">desk</span>
          </span>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <div className="side-link active">
          <LayoutDashboard size={18} /> Overview
        </div>
        <div className="side-link">
          <Globe2 size={18} /> My websites{' '}
          <span className="side-count">{projects.length}</span>
        </div>
        <div className="side-link">
          <Server size={18} /> Hosting notes
        </div>
        <div className="side-bottom">
          <div className="help-card">
            <CircleHelp size={18} />
            <div>
              <strong>Need a hand?</strong>
              <span>Keep your setup organized.</span>
            </div>
          </div>
          <button className="profile-row" onClick={signOut}>
            <div className="avatar">
              {(user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'U').slice(0, 1).toUpperCase()}
            </div>
            <div className="profile-copy">
              <strong>{user.user_metadata?.full_name || user.user_metadata?.name || 'My account'}</strong>
              <span>{user.email || 'Signed in'}</span>
            </div>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label="Toggle menu"
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>Overview</strong>
          </div>
          <div className="topbar-right">
            <span className="secure-label">
              <span className="green-dot" /> Private workspace
            </span>
            <div className="avatar">
              {(user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'U').slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        <section className="content">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">YOUR WORKSPACE</p>
              <h1>
                Good to see you<span className="heading-period">.</span>
              </h1>
              <p className="subheading">
                A clear view of the websites and hosting projects you're
                tracking.
              </p>
            </div>
            <button className="primary-btn" onClick={openNew}>
              <Plus size={18} /> Add website
            </button>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon purple">
                <Globe2 size={19} />
              </div>
              <div className="stat-label">Total websites</div>
              <div className="stat-number">{projects.length}</div>
              <div className="stat-foot">In your workspace</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">
                <Activity size={19} />
              </div>
              <div className="stat-label">Marked live</div>
              <div className="stat-number">{liveCount}</div>
              <div className="stat-foot">Ready to visit</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon amber">
                <Cloud size={19} />
              </div>
              <div className="stat-label">In progress</div>
              <div className="stat-number">{buildingCount}</div>
              <div className="stat-foot">Still being set up</div>
            </div>
          </div>

          <div className="section-heading">
            <div>
              <h2>Your websites</h2>
              <p>Manage the details for each project.</p>
            </div>
            <span className="project-total">
              {projects.length} {projects.length === 1 ? 'PROJECT' : 'PROJECTS'}
            </span>
          </div>

          <div className="toolbar">
            <div className="search-box">
              <Search size={17} />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search websites, domains or providers…"
              />
            </div>
            <div className="filter-wrap">
              <Settings2 size={16} />
              <select
                value={filter}
                onChange={event => setFilter(event.target.value)}
              >
                <option>All</option>
                <option>Live</option>
                <option>Building</option>
                <option>Paused</option>
              </select>
              <ChevronDown size={14} />
            </div>
          </div>

          {errorMessage && (
            <div className="notice-error">
              {errorMessage}
              <button onClick={() => setErrorMessage('')} aria-label="Dismiss">
                <X size={16} />
              </button>
            </div>
          )}

          {loading ? (
            <div className="empty-state">
              <div className="loader" />
              <p>Loading your websites…</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Globe2 size={25} />
              </div>
              <h3>
                {projects.length === 0
                  ? 'Your first website starts here'
                  : 'No matching websites'}
              </h3>
              <p>
                {projects.length === 0
                  ? 'Add a website to keep its domain, hosting provider and live link together.'
                  : 'Try another search or change the status filter.'}
              </p>
              {projects.length === 0 && (
                <button className="primary-btn" onClick={openNew}>
                  <Plus size={17} /> Add your first website
                </button>
              )}
            </div>
          ) : (
            <div className="project-grid">
              {filteredProjects.map(project => (
                <article className="project-card" key={project.id}>
                  <div className="project-card-top">
                    <div className="project-icon">
                      <Globe2 size={19} />
                    </div>
                    <span
                      className={'status-pill ' + project.status.toLowerCase()}
                    >
                      <span />
                      {project.status}
                    </span>
                    <button
                      className="more-btn"
                      onClick={() => openEdit(project)}
                      aria-label="Edit project"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                  <h3>{project.name}</h3>
                  <p className="domain-line">
                    {project.domain || 'No domain added yet'}
                  </p>
                  <div className="project-meta">
                    <span>HOSTING PROVIDER</span>
                    <strong>{project.provider || 'Not specified'}</strong>
                  </div>
                  {project.notes && (
                    <p className="project-notes">{project.notes}</p>
                  )}
                  <div className="card-actions">
                    {project.url ? (
                      <a
                        className="visit-link"
                        href={project.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Visit website <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span className="no-link">No live URL yet</span>
                    )}
                    <div className="action-icons">
                      <button
                        onClick={() => {
                          if (project.url)
                            void navigator.clipboard?.writeText(project.url);
                        }}
                        title="Copy website link"
                        disabled={!project.url}
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(project)}
                        title="Delete project"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="hosting-note">
            <ShieldCheck size={18} />
            <div>
              <strong>Private control panel.</strong>
              <span>
                CloudDesk keeps your website details private. Website hosting
                and public network access are configured separately on your device.
              </span>
            </div>
          </div>
          <footer>
            CloudDesk <span>·</span> Your personal hosting workspace
          </footer>
        </section>
      </main>

      {modalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <form className="project-modal" onSubmit={saveProject}>
            <div className="modal-heading">
              <div>
                <p className="eyebrow">
                  {editing ? 'UPDATE DETAILS' : 'NEW PROJECT'}
                </p>
                <h2>{editing ? 'Edit website' : 'Add a website'}</h2>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <label>
              Website / project name <span>*</span>
              <input
                autoFocus
                required
                value={draft.name}
                onChange={event =>
                  setDraft({ ...draft, name: event.target.value })
                }
                placeholder="e.g. My portfolio"
              />
            </label>
            <label>
              Domain
              <input
                value={draft.domain}
                onChange={event =>
                  setDraft({ ...draft, domain: event.target.value })
                }
                placeholder="example.com"
              />
            </label>
            <label>
              Live website URL
              <input
                type="url"
                value={draft.url}
                onChange={event =>
                  setDraft({ ...draft, url: event.target.value })
                }
                placeholder="https://example.com"
              />
            </label>
            <label>
              Hosting provider
              <input
                value={draft.provider}
                onChange={event =>
                  setDraft({ ...draft, provider: event.target.value })
                }
                placeholder="e.g. Cloudflare Pages, GitHub Pages"
              />
            </label>
            <label>
              Project status
              <select
                value={draft.status}
                onChange={event =>
                  setDraft({
                    ...draft,
                    status: event.target.value as ProjectDraft['status'],
                  })
                }
              >
                <option>Building</option>
                <option>Live</option>
                <option>Paused</option>
              </select>
            </label>
            <label>
              Notes
              <textarea
                rows={3}
                value={draft.notes}
                onChange={event =>
                  setDraft({ ...draft, notes: event.target.value })
                }
                placeholder="Anything you want to remember about this project…"
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button className="primary-btn" type="submit" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add website'}{' '}
                <Check size={17} />
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop">
          <div className="confirm-modal">
            <div className="delete-icon">
              <Trash2 size={21} />
            </div>
            <h2>Delete this website?</h2>
            <p>
              <strong>{deleteTarget.name}</strong> will be removed from your
              dashboard. This won't delete the actual website or hosting
              account.
            </p>
            <div className="modal-actions">
              <button
                className="secondary-btn"
                onClick={() => setDeleteTarget(null)}
              >
                Keep it
              </button>
              <button className="danger-btn" onClick={deleteProject}>
                Delete project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
