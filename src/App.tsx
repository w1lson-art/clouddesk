import { useEffect, useMemo, useRef, useState } from 'react';
import { auth, api } from '@appdeploy/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Search,
  Plus,
  Music2,
  ImagePlus,
  Sparkles,
  UserRound,
  Compass,
  BadgeCheck,
  Play,
  Pause,
  X,
  ArrowLeft,
  Bookmark,
  Share2,
  Settings2,
  ShieldCheck,
  Check,
  LogOut,
  Camera,
  LayoutGrid,
} from 'lucide-react';

type User = { userId: string; email?: string; name?: string; picture?: string };
type Profile = {
  userId: string;
  name: string;
  username: string;
  bio: string;
  avatar?: string;
  avatarPath?: string;
  verified?: boolean;
  verifiedBy?: string;
  suspended?: boolean;
};
type Album = {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  verified?: boolean;
  verifiedBy?: string;
  cover?: string;
  theme?: string;
  specialTheme?: string;
  layout?: string;
  intro?: boolean;
  quote?: string;
  font?: string;
  musicPath?: string;
  musicTitle?: string;
  musicUrl?: string;
  createdAt: number;
  likes?: number;
  adminLikes?: number;
};
type Photo = {
  id: string;
  url: string;
  caption?: string;
  rotation?: number;
  layout?: string;
  frame?: string;
};
type Application = {
  id: string;
  type: string;
  status: string;
  theme?: string;
  albumId?: string;
  note?: string;
  createdAt: number;
  userId: string;
  username?: string;
};

const themes = [
  {
    id: 'rose',
    name: 'Rosewater',
    kind: 'free',
    swatch: 'linear-gradient(135deg,#f8c9d5,#f4e4df)',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    kind: 'free',
    swatch: 'linear-gradient(135deg,#24223d,#74618b)',
  },
  {
    id: 'film',
    name: 'Golden film',
    kind: 'free',
    swatch: 'linear-gradient(135deg,#c49b61,#f0d9a9)',
  },
  {
    id: 'cloud',
    name: 'Cloud nine',
    kind: 'free',
    swatch: 'linear-gradient(135deg,#dceaf5,#f8f4ef)',
  },
  {
    id: 'velvet',
    name: 'Velvet love',
    kind: 'special',
    swatch: 'linear-gradient(135deg,#4d123d,#c85a83)',
  },
  {
    id: 'starlight',
    name: 'Starlight',
    kind: 'special',
    swatch: 'linear-gradient(135deg,#111b3e,#6f79c8)',
  },
  {
    id: 'garden',
    name: 'Secret garden',
    kind: 'special',
    swatch: 'linear-gradient(135deg,#214d40,#a8bd8b)',
  },
  {
    id: 'royal',
    name: 'Royal gold',
    kind: 'special',
    swatch: 'linear-gradient(135deg,#372c1e,#d3ad65)',
  },
];
const fontOptions = [
  'Cormorant Garamond',
  'Playfair Display',
  'DM Sans',
  'Dancing Script',
  'Great Vibes',
];
const sampleAlbums: Album[] = [
  {
    id: 'demo-1',
    title: 'little things, forever',
    description:
      'A collection of tiny moments that became my favourite memories.',
    ownerId: 'demo',
    ownerName: 'Mila Rose',
    ownerAvatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160',
    cover: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=900',
    theme: 'rose',
    layout: 'scrapbook',
    quote: 'In a sea of people, my eyes will always search for you.',
    createdAt: 3,
    likes: 128,
  },
  {
    id: 'demo-2',
    title: 'somewhere in our summer',
    description: 'Sunsets, road trips and the kind of laughter you remember.',
    ownerId: 'demo2',
    ownerName: 'Noah James',
    ownerAvatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160',
    cover: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=900',
    theme: 'film',
    layout: 'editorial',
    quote: 'I found a little bit of forever in an ordinary day.',
    createdAt: 2,
    likes: 94,
  },
  {
    id: 'demo-3',
    title: 'you feel like home',
    description: 'For the person who makes every place feel right.',
    ownerId: 'demo3',
    ownerName: 'Ari Lane',
    ownerAvatar:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=160',
    cover: 'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=900',
    theme: 'midnight',
    layout: 'polaroid',
    quote: 'Wherever you are is where I want to be.',
    createdAt: 1,
    likes: 207,
  },
];

function fileData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function initials(name = 'A'): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(x => x[0])
    .join('')
    .toUpperCase();
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [feed, setFeed] = useState<Album[]>([]);
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [page, setPage] = useState<'feed' | 'profile' | 'saved' | 'admin'>(
    'feed'
  );
  const [query, setQuery] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [modal, setModal] = useState<
    'create' | 'profile' | 'apply' | 'intro' | null
  >(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [adminAlbums, setAdminAlbums] = useState<Album[]>([]);
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState<string[]>([]);
  const [liked, setLiked] = useState<string[]>([]);
  const [playing, setPlaying] = useState(false);
  const [musicUrl, setMusicUrl] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    quote: '',
    theme: 'rose',
    layout: 'scrapbook',
    font: 'Cormorant Garamond',
    intro: false,
  });
  const [uploading, setUploading] = useState(false);
  const [searchTab, setSearchTab] = useState<'albums' | 'creators'>('albums');
  useEffect(() => { const handler = (event: Event) => setNotice('Verified by ' + ((event as CustomEvent).detail || 'Rich')); window.addEventListener('amoria-verified-info', handler); return () => window.removeEventListener('amoria-verified-info', handler); }, []);

  const loadFeed = async () => {
    try {
      const r = await api.get('/api/feed');
      setFeed(r.data.albums || []);
      setProfiles(r.data.profiles || []);
    } catch {
      setFeed([]);
    }
  };
  useEffect(() => {
    (async () => {
      try {
        const current = await auth.getUser();
        setUser(current);
        if (current) {
          const p = await api.get('/api/me');
          setProfile(p.data.profile || null);
          try {
            await api.get('/api/admin/check');
            setIsAdmin(true);
          } catch {
            setIsAdmin(false);
          }
        }
        await loadFeed();
      } catch {
        await loadFeed();
      } finally {
        /* initial feed request has settled */
      }
    })();
  }, []);
  useEffect(() => {
    if (notice) {
      const t = window.setTimeout(() => setNotice(''), 3200);
      return () => window.clearTimeout(t);
    }
  }, [notice]);
  useEffect(() => {
    if (!activeAlbum || !activeAlbum.musicUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlaying(false);
      setMusicUrl('');
      return;
    }
    setMusicUrl(activeAlbum.musicUrl);
  }, [activeAlbum]);
  useEffect(() => {
    if (audioRef.current && musicUrl) {
      audioRef.current.src = musicUrl;
      audioRef.current
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  }, [musicUrl]);

  const visibleAlbums = useMemo(() => {
    const all = feed.length ? feed : sampleAlbums;
    return all.filter(a =>
      (a.title + ' ' + a.ownerName + ' ' + (a.description || ''))
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }, [feed, query]);
  const visibleProfiles = useMemo(
    () =>
      profiles.filter(p =>
        (p.name + ' ' + p.username).toLowerCase().includes(query.toLowerCase())
      ),
    [profiles, query]
  );

  const signIn = async () => {
    try {
      await auth.signInWithRedirect();
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : 'Could not start sign in. Please retry.'
      );
    }
  };
  const signOut = async () => {
    try {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
      await auth.signOut();
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      setActiveAlbum(null);
      setPhotos([]);
      setPage('feed');
      setModal(null);
      setNotice('You have signed out.');
    } catch (e) {
      setNotice('Sign out failed. ' + (e instanceof Error ? e.message : 'Please try again.'));
    }
  };
  const openAlbum = async (album: Album) => {
    setActiveAlbum(album);
    setPhotos([]);
    if (album.id.startsWith('demo-')) {
      setPhotos([
        { id: 'd1', url: album.cover || '', rotation: -4, layout: 'tilt' },
        {
          id: 'd2',
          url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=900',
          rotation: 3,
          layout: 'polaroid',
        },
        {
          id: 'd3',
          url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=900',
          rotation: -2,
          layout: 'tilt',
        },
      ]);
      return;
    }
    try {
      const r = await api.get('/api/albums/' + album.id);
      setActiveAlbum({ ...r.data.album, id: r.data.album?.id || album.id });
      setPhotos(r.data.photos || []);
    } catch {
      setNotice('Could not load this album.');
    }
  };
  const closeAlbum = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
    setMusicUrl('');
    setActiveAlbum(null);
    setPhotos([]);
  };
  const updateProfile = async (
    name: string,
    username: string,
    bio: string,
    avatarFile?: File
  ) => {
    if (!user) return;
    try {
      let avatarPath = profile?.avatarPath;
      if (!avatarFile && !avatarPath) {
        setNotice('Choose a profile picture before saving your profile.');
        return;
      }
      if (avatarFile)
        avatarPath = (
          await api.post('/api/me/avatar', {
            data: await fileData(avatarFile),
            contentType: avatarFile.type || 'image/jpeg',
          })
        ).data.path;
      const r = await api.put('/api/me', { name, username, bio, avatarPath });
      setProfile(r.data.profile);
      setModal(null);
      setNotice('Your profile is ready.');
      await loadFeed();
    } catch (e) {
      setNotice('Profile could not be saved. ' + (e instanceof Error ? e.message : 'Please try again.'));
    }
  };
  const createAlbum = async (files: FileList | null, music: File | null, caption = '', frame = 'white') => {
    if (!user) {
      await signIn();
      return;
    }
    if (!profile?.avatar) {
      setModal('profile');
      setNotice('Add a profile picture before creating your first album.');
      return;
    }
    if (!draft.title.trim()) {
      setNotice('Give your album a name first.');
      return;
    }
    if (!files?.length) {
      setNotice('Choose at least one photo for your album.');
      return;
    }
    setUploading(true);
    let createdAlbumId = '';
    try {
      const r = await api.post('/api/albums', {
        ...draft,
        ownerName: profile.name,
        ownerAvatar: profile.avatar,
      });
      const album = r.data.album as Album;
      createdAlbumId = album.id;
      for (const file of Array.from(files)) {
        const data = await fileData(file);
        await api.post('/api/albums/' + album.id + '/photos', {
          data,
          contentType: file.type || 'image/jpeg',
          caption,
          frame,
          rotation: Math.round(Math.random() * 14 - 7),
          layout: draft.layout,
        });
      }
      if (music)
        await api.post('/api/albums/' + album.id + '/music', {
          data: await fileData(music),
          contentType: music.type || 'audio/mpeg',
          title: music.name,
        });
      setModal(null);
      setDraft({
        title: '',
        description: '',
        quote: '',
        theme: 'rose',
        layout: 'scrapbook',
        font: 'Cormorant Garamond',
        intro: false,
      });
      await loadFeed();
      setNotice('Your album is now in the feed.');
    } catch (e) {
      if (createdAlbumId) {
        try { await api.delete('/api/albums/' + createdAlbumId); } catch { /* preserve the original upload error */ }
      }
      setNotice('Album creation failed. ' + (e instanceof Error ? e.message : 'Please check your connection and try again.'));
      await loadFeed();
    } finally {
      setUploading(false);
    }
  };
  const apply = async (
    type: string,
    theme?: string,
    albumId?: string,
    note?: string
  ) => {
    if (!user) {
      await signIn();
      return;
    }
    try {
      await api.post('/api/applications', { type, theme, albumId, note });
      setModal(null);
      setNotice('Application sent. You will see its status in your profile.');
    } catch (e) {
      setNotice('Could not submit your application. ' + (e instanceof Error ? e.message : 'Please try again.'));
    }
  };
  const toggleLike = async (album: Album) => {
    if (!user) {
      await signIn();
      return;
    }
    const wasLiked = liked.includes(album.id);
    const next = !wasLiked;
    setLiked(old => next ? [...old, album.id] : old.filter(x => x !== album.id));
    try {
      const response = await api.post('/api/albums/' + album.id + '/like', { liked: next });
      await loadFeed();
      if (typeof response.data.likes === 'number') {
        setActiveAlbum(current => current?.id === album.id ? { ...current, likes: response.data.likes } : current);
      }
    } catch (e) {
      setLiked(old => wasLiked ? [...old, album.id] : old.filter(x => x !== album.id));
      setNotice(e instanceof Error ? e.message : 'Like could not be saved. Please retry.');
    }
  };
  const toggleSave = (id: string) =>
    setSaved(old =>
      old.includes(id) ? old.filter(x => x !== id) : [...old, id]
    );
  const addAlbumPhotos = async (album: Album, files: FileList, caption = '', frame = 'white') => {
    if (!album.id) { setNotice('This album could not be identified. Close it and open it again.'); return; }
    try {
      for (const file of Array.from(files)) {
        await api.post('/api/albums/' + album.id + '/photos', {
          data: await fileData(file), contentType: file.type || 'image/jpeg', caption, frame,
          rotation: Math.round(Math.random() * 14 - 7), layout: album.layout || 'scrapbook',
        });
      }
      await openAlbum(album);
      setNotice('New photos added to your album.');
    } catch (e) {
      setNotice('Photos could not be added. ' + (e instanceof Error ? e.message : 'Please retry.'));
    }
  };
  const updateAlbumDetails = async (album: Album, updates: Record<string, unknown>) => {
    try {
      await api.put('/api/albums/' + album.id, updates);
      await loadFeed();
      await openAlbum({ ...album, ...updates } as Album);
      setNotice('Album updated.');
    } catch (e) {
      setNotice('Album changes could not be saved. ' + (e instanceof Error ? e.message : 'Please retry.'));
    }
  };
  const removeAlbumSong = async (album: Album) => {
    try {
      await api.delete('/api/albums/' + album.id + '/music');
      await openAlbum({ ...album, musicUrl: undefined, musicTitle: undefined });
      setNotice('Album song removed.');
    } catch (e) {
      setNotice('Song could not be removed. ' + (e instanceof Error ? e.message : 'Please retry.'));
    }
  };
  const updateAlbumPhoto = async (album: Album, photoId: string, updates: Record<string, unknown>) => {
    try {
      await api.put('/api/albums/' + album.id + '/photos/' + photoId, updates);
      await openAlbum(album);
      setNotice('Photo details saved.');
    } catch (e) {
      setNotice('Photo details could not be saved. ' + (e instanceof Error ? e.message : 'Please retry.'));
    }
  };
  const deleteAlbumPhoto = async (album: Album, photoId: string) => {
    if (!window.confirm('Remove this photo from your album?')) return;
    try {
      await api.delete('/api/albums/' + album.id + '/photos/' + photoId);
      await openAlbum(album);
      setNotice('Photo removed.');
    } catch (e) {
      setNotice('Photo could not be removed. ' + (e instanceof Error ? e.message : 'Please retry.'));
    }
  };
  const deleteAlbum = async (album: Album) => {
    if (!window.confirm('Permanently remove this album from your public collection? This cannot be undone.')) return;
    try {
      await api.delete('/api/albums/' + album.id);
      closeAlbum();
      await loadFeed();
      setPage('profile');
      setNotice('Album deleted. You can now create another album.');
    } catch (e) {
      setNotice('Album could not be deleted. ' + (e instanceof Error ? e.message : 'Please retry.'));
    }
  };
  const replaceAlbumSong = async (album: Album, file: File) => {
    try {
      await api.post('/api/albums/' + album.id + '/music', {
        data: await fileData(file), contentType: file.type || 'audio/mpeg', title: file.name,
      });
      await openAlbum(album);
      setNotice('Album song updated.');
    } catch (e) {
      setNotice('Song could not be updated. ' + (e instanceof Error ? e.message : 'Please retry.'));
    }
  };
  const adminAction = async (id: string, status: string) => {
    try {
      await api.post('/api/admin/applications/' + id, { status });
      setApplications(old =>
        old.map(a => (a.id === id ? { ...a, status } : a))
      );
      setNotice('Application ' + status + '.');
      await loadFeed();
    } catch {
      setNotice('Admin action failed.');
    }
  };
  const adjustAdminLikes = async (albumId: string, adjustment: number) => {
    try {
      const r = await api.post('/api/admin/albums/' + albumId + '/likes', { adjustment });
      setAdminAlbums(old => old.map(a => a.id === albumId ? { ...a, adminLikes: r.data.adminLikes, likes: r.data.likes } : a));
      await loadFeed();
      setNotice('Public album like total updated.');
    } catch (e) {
      setNotice('Could not update admin likes. ' + (e instanceof Error ? e.message : 'Please retry.'));
    }
  };
  const showAdmin = async () => {
    try {
      const [r, albumsResult] = await Promise.all([api.get('/api/admin/applications'), api.get('/api/admin/albums')]);
      setApplications(r.data.applications || []);
      setAdminAlbums(albumsResult.data.albums || []);
      setPage('admin');
    } catch {
      setNotice('Admin access is restricted.');
    }
  };
  const choosePage = (next: 'feed' | 'profile' | 'saved' | 'admin') => {
    if (activeAlbum) closeAlbum();
    setPage(next);
  };

  return (
    <div className="amoria-shell">
      <audio ref={audioRef} onEnded={() => setPlaying(false)} />
      <header className="topbar">
        <button className="brand" onClick={() => choosePage('feed')}>
          <span className="brand-mark">
            <Heart size={18} fill="currentColor" />
          </span>
          <span>amoria</span>
          <i>the art of remembering</i>
        </button>
        <div className="top-search">
          <Search size={17} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Find a memory, a person, a feeling..."
          />
          <kbd>⌘ K</kbd>
        </div>
        <div className="top-actions">
          <button
            className="icon-button"
            title="Explore"
            onClick={() => choosePage('feed')}
          >
            <Compass size={19} />
          </button>
          {user ? (
            <>
              {isAdmin && (
                <button className="button button-dark button-small" onClick={showAdmin} title="Open administrator dashboard">
                  <ShieldCheck size={14} /> Admin panel
                </button>
              )}
              <button className="avatar-button" title="My profile" onClick={() => choosePage('profile')}>
                {profile?.avatar ? <img src={profile.avatar} /> : <span>{initials(profile?.name || user.name)}</span>}
              </button>
              <button className="button button-outline button-small top-signout" onClick={signOut}>
                <LogOut size={14} /> Sign out
              </button>
            </>
          ) : (
            <button
              className="button button-dark button-small"
              onClick={signIn}
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      <div className="app-layout">
        <aside className="sidebar">
          <div className="side-label">YOUR SPACE</div>
          <button
            className={page === 'feed' ? 'side-link active' : 'side-link'}
            onClick={() => choosePage('feed')}
          >
            <Compass size={18} /> Discover
          </button>
          <button
            className={page === 'saved' ? 'side-link active' : 'side-link'}
            onClick={() => choosePage('saved')}
          >
            <Bookmark size={18} /> Saved albums
          </button>
          <button
            className={page === 'profile' ? 'side-link active' : 'side-link'}
            onClick={() => (user ? choosePage('profile') : signIn())}
          >
            <UserRound size={18} /> My profile
          </button>
          {isAdmin && (
            <>
              <div className="side-label side-label-gap">STUDIO</div>
              <button
                className={page === 'admin' ? 'side-link active' : 'side-link'}
                onClick={showAdmin}
              >
                <ShieldCheck size={18} /> Admin studio
              </button>
            </>
          )}
          <div className="sidebar-card">
            <div className="sparkle-orb">
              <Sparkles size={18} />
            </div>
            <strong>Make a little forever.</strong>
            <p>Turn your favourite moments into something worth keeping.</p>
            <button
              onClick={() =>
                user
                  ? profile?.avatar
                    ? setModal('create')
                    : setModal('profile')
                  : signIn()
              }
            >
              Create an album <Plus size={14} />
            </button>
          </div>
          <div className="sidebar-bottom">
            {user ? (
              <>
                <span className="tiny-avatar">
                  {initials(profile?.name || user.name)}
                </span>
                <span className="sidebar-user">
                  {profile?.name || user.name || 'Your account'}
                  <small>@{profile?.username || 'newhere'}</small>
                </span>
                <button
                  className="icon-button"
                  onClick={signOut}
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <span className="muted-note">
                A softer place for your memories.
              </span>
            )}
          </div>
        </aside>

        <main className="main-content">
          {activeAlbum ? (
            <AlbumView
              album={activeAlbum}
              photos={photos}
              onClose={closeAlbum}
              onApply={apply}
              playing={playing}
              setPlaying={setPlaying}
              audioRef={audioRef}
              saved={saved.includes(activeAlbum.id)}
              onSave={() => toggleSave(activeAlbum.id)}
              onLike={() => toggleLike(activeAlbum)}
              liked={liked.includes(activeAlbum.id)}
              isOwner={activeAlbum.ownerId === user?.userId}
              onAddPhotos={(files: FileList, caption: string, frame: string) => addAlbumPhotos(activeAlbum, files, caption, frame)}
              onReplaceSong={(file: File) => replaceAlbumSong(activeAlbum, file)}
              onRemoveSong={() => removeAlbumSong(activeAlbum)}
              onUpdateAlbum={(updates: Record<string, unknown>) => updateAlbumDetails(activeAlbum, updates)}
              onDeleteAlbum={() => deleteAlbum(activeAlbum)}
              onUpdatePhoto={(photoId: string, updates: Record<string, unknown>) => updateAlbumPhoto(activeAlbum, photoId, updates)}
              onDeletePhoto={(photoId: string) => deleteAlbumPhoto(activeAlbum, photoId)}
              onThemeChange={(theme: string) => { const special = themes.find(t => t.id === theme)?.kind === 'special'; updateAlbumDetails(activeAlbum, { theme, specialTheme: special ? theme : '' }); }}
            />
          ) : page === 'profile' ? (
            <ProfilePage
              user={user}
              profile={profile}
              albums={feed.filter(a => a.ownerId === user?.userId)}
              onEdit={() => setModal('profile')}
              onCreate={() => setModal('create')}
              onApply={() => setModal('apply')}
              onOpen={openAlbum}
              onSignIn={signIn}
              onLikeAlbum={toggleLike}
              likedIds={liked}
              onSaveAlbum={toggleSave}
              savedIds={saved}
              onVerifiedInfo={() => setNotice('Verified by ' + (profile?.verifiedBy || 'Rich'))}
            />
          ) : page === 'saved' ? (
            <section className="page-section">
              <div className="eyebrow">YOUR COLLECTION</div>
              <h1 className="page-title">
                Saved <em>memories.</em>
              </h1>
              <p className="page-subtitle">
                The albums you want to come back to.
              </p>
              <div className="album-grid">
                {feed
                  .filter(a => saved.includes(a.id))
                  .map(a => (
                    <AlbumCard
                      key={a.id}
                      album={a}
                      onOpen={openAlbum}
                      onLike={() => toggleLike(a)}
                      liked={liked.includes(a.id)}
                      onSave={() => toggleSave(a.id)}
                      saved={true}
                    />
                  ))}
              </div>
              {!saved.length && (
                <EmptyState
                  title="Keep the moments close"
                  body="Save an album from the feed and it will live here."
                />
              )}
            </section>
          ) : page === 'admin' ? (
            <AdminPage applications={applications} onAction={adminAction} albums={adminAlbums} onAdjustLikes={adjustAdminLikes} />
          ) : (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <div className="eyebrow">
                    <span className="eyebrow-dot" /> A HOME FOR YOUR LITTLE
                    FOREVERS
                  </div>
                  <h1>
                    Some moments
                    <br />
                    deserve <em>their own</em>
                    <br />
                    little world.
                  </h1>
                  <p>
                    Thoughtfully made albums, love notes and memories —
                    collected in one beautiful place.
                  </p>
                  <div className="hero-actions">
                    <button
                      className="button button-dark"
                      onClick={() =>
                        user
                          ? profile?.avatar
                            ? setModal('create')
                            : setModal('profile')
                          : signIn()
                      }
                    >
                      Create your album <span>↗</span>
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        document
                          .getElementById('the-feed')
                          ?.scrollIntoView({ behavior: 'smooth' })
                      }
                    >
                      Explore the collection <ArrowLeft size={15} />
                    </button>
                  </div>
                  <div className="hero-foot">
                    <div className="avatar-stack">
                      <span>✿</span>
                      <span>♡</span>
                      <span>✧</span>
                    </div>
                    <small>Made for memories that matter</small>
                  </div>
                </div>
                <div className="hero-art">
                  <div className="hero-photo hero-photo-back">
                    <img src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800" />
                  </div>
                  <div className="hero-photo hero-photo-front">
                    <img src="https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800" />
                    <div className="photo-caption">the days we keep ♡</div>
                  </div>
                  <div className="floating-note">
                    <span>✧</span>
                    <strong>made of moments</strong>
                    <small>and a little bit of magic</small>
                  </div>
                  <div className="hero-ring" />
                </div>
              </section>
              <section id="the-feed" className="feed-section">
                <div className="section-heading">
                  <div>
                    <div className="eyebrow">THE COMMUNITY</div>
                    <h2>
                      A world of <em>memories.</em>
                    </h2>
                  </div>
                  <div className="feed-filter">
                    <span>Explore</span>
                    <button className="filter-active">For you</button>
                    <button onClick={() => setSearchTab('creators')}>
                      Creators
                    </button>
                  </div>
                </div>
                {query && (
                  <div className="search-result-label">
                    Searching for “{query}”
                  </div>
                )}
                {searchTab === 'creators' && (
                  <div className="creator-results">
                    {visibleProfiles.map(p => (
                      <div className="creator-row" key={p.userId}>
                        <img src={p.avatar || ''} />
                        <div>
                          <strong>
                            {p.name}{' '}
                            {p.verified && <VerifiedBadge by={p.verifiedBy || 'Rich'} onClick={() => setNotice('Verified by ' + (p.verifiedBy || 'Rich'))} />}
                          </strong>
                          <small>@{p.username}</small>
                        </div>
                        <button className="button button-outline button-small" onClick={() => { setSearchTab('albums'); setQuery(p.name); setNotice('Showing albums by ' + p.name); }}>
                          View albums
                        </button>
                      </div>
                    ))}
                    {!visibleProfiles.length && (
                      <p className="muted-note">
                        No creators found yet. Try another name.
                      </p>
                    )}
                  </div>
                )}
                <div className="album-grid">
                  {visibleAlbums.map((a, i) => (
                    <AlbumCard
                      key={a.id}
                      album={a}
                      onOpen={openAlbum}
                      onLike={() => toggleLike(a)}
                      liked={liked.includes(a.id)}
                      onSave={() => toggleSave(a.id)}
                      saved={saved.includes(a.id)}
                      index={i}
                      onVerifiedInfo={() => setNotice('Verified by ' + (a.verifiedBy || 'Rich'))}
                    />
                  ))}
                </div>
                {!visibleAlbums.length && (
                  <EmptyState
                    title="Your next favourite memory is waiting"
                    body="Be the first to make an album, or try a different search."
                  />
                )}
              </section>
            </>
          )}
        </main>
      </div>

      <button
        className="mobile-create"
        onClick={() =>
          user
            ? profile?.avatar
              ? setModal('create')
              : setModal('profile')
            : signIn()
        }
      >
        <Plus size={20} />
      </button>
      <AnimatePresence>
        {modal && (
          <Modal onClose={() => setModal(null)}>
            <>
              {modal === 'create' && (
                <CreateAlbum
                  draft={draft}
                  setDraft={setDraft}
                  onCreate={createAlbum}
                  uploading={uploading}
                  onApply={() => setModal('apply')}
                />
              )}
              {modal === 'profile' && (
                <ProfileEditor
                  profile={profile}
                  user={user}
                  onSave={updateProfile}
                  onClose={() => setModal(null)}
                />
              )}
              {modal === 'apply' && (
                <ApplyPanel
                  albums={feed.filter(a => a.ownerId === user?.userId)}
                  onApply={apply}
                  onClose={() => setModal(null)}
                />
              )}
            </>
          </Modal>
        )}
      </AnimatePresence>
      {notice && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="toast"
        >
          <Check size={16} />
          {notice}
        </motion.div>
      )}
    </div>
  );
}

function VerifiedBadge({ by = 'Rich', onClick, size = 14 }: { by?: string; onClick?: () => void; size?: number }) {
  return <button type="button" className="verified-badge" aria-label={'Verified by ' + by} title={'Verified by ' + by} onClick={onClick}><BadgeCheck size={size} className="verified" strokeWidth={2.8} /></button>;
}

function AlbumCard({
  album,
  onOpen,
  onLike,
  liked,
  onSave,
  saved,
  index = 0,
  onVerifiedInfo,
}: {
  album: Album;
  onOpen: (a: Album) => void;
  onLike: () => void;
  liked: boolean;
  onSave: () => void;
  saved: boolean;
  index?: number;
  onVerifiedInfo?: () => void;
}) {
  return (
    <motion.article
      className={
        'album-card theme-' + (album.specialTheme || album.theme || 'rose')
      }
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.06, 0.3) }}
      whileHover={{ y: -6 }}
    >
      <button className="card-cover" onClick={() => onOpen(album)}>
        <img
          src={
            album.cover ||
            'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=900'
          }
        />
        <span className="cover-shade" />
        <span className="cover-open">
          OPEN ALBUM <span>↗</span>
        </span>
        <span className="cover-count">
          <ImagePlus size={13} />{' '}
          {album.id.startsWith('demo-') ? '12' : 'MEMORIES'}
        </span>
      </button>
      <div className="card-info">
        <div className="creator-line">
          <span className="creator-avatar">
            {album.ownerAvatar ? (
              <img src={album.ownerAvatar} />
            ) : (
              initials(album.ownerName)
            )}
          </span>
          <span>{album.ownerName}</span>
          {album.verified && <VerifiedBadge by={album.verifiedBy || 'Rich'} onClick={onVerifiedInfo} />}
          <span className="card-date">
            •{' '}
            {album.createdAt < 10
              ? 'recently'
              : new Date(album.createdAt).toLocaleDateString()}
          </span>
        </div>
        <button className="card-title" onClick={() => onOpen(album)}>
          {album.title}
        </button>
        <p className="card-description">
          {album.description || 'A little collection of moments worth keeping.'}
        </p>
        <div className="card-bottom">
          <button
            className={liked ? 'reaction liked' : 'reaction'}
            onClick={onLike}
          >
            <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
            {album.likes || 0}
          </button>
          <button
            className={saved ? 'icon-button saved' : 'icon-button'}
            onClick={onSave}
          >
            <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
          </button>
          <button
            className="icon-button"
            onClick={() =>
              navigator.clipboard?.writeText(
                window.location.href + '#album-' + album.id
              )
            }
          >
            <Share2 size={15} />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function AlbumView({
  album,
  photos,
  onClose,
  onApply,
  playing,
  setPlaying,
  audioRef,
  saved,
  onSave,
  onLike,
  liked,
  isOwner,
  onAddPhotos,
  onReplaceSong,
  onRemoveSong,
  onUpdateAlbum,
  onDeleteAlbum,
  onUpdatePhoto,
  onDeletePhoto,
  onThemeChange,
}: any) {
  const [introSeen, setIntroSeen] = useState(
    !!sessionStorage.getItem('amoria-intro-' + album.id)
  );
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoFrame, setPhotoFrame] = useState('white');
  const [albumDraft, setAlbumDraft] = useState({ title: album.title || '', description: album.description || '', quote: album.quote || '' });
  const [photoDrafts, setPhotoDrafts] = useState<Record<string, { caption: string; rotation: number }>>({});
  useEffect(() => {
    setAlbumDraft({ title: album.title || '', description: album.description || '', quote: album.quote || '' });
    setPhotoDrafts({});
  }, [album.id]);
  const theme = album.specialTheme || album.theme || 'rose';
  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else
      audioRef.current
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
  };
  if (album.intro && !introSeen)
    return (
      <motion.div
        className="album-intro"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="intro-stars">✦　✧　✦</div>
        <p>A little world by</p>
        <h1>{album.ownerName}</h1>
        <span>{album.title}</span>
        <button
          className="button button-light"
          onClick={() => {
            sessionStorage.setItem('amoria-intro-' + album.id, '1');
            setIntroSeen(true);
          }}
        >
          Step inside <span>↗</span>
        </button>
      </motion.div>
    );
  return (
    <div className={'album-view theme-' + theme}>
      <div className="album-toolbar">
        <button className="back-link" onClick={onClose}>
          <ArrowLeft size={17} /> Back to discover
        </button>
        <div className="album-tools">
          {isOwner && <>
            <select aria-label="Change album theme" className="field album-theme-select" value={album.specialTheme || album.theme || 'rose'} onChange={e => onThemeChange(e.target.value)}>
              {themes.filter(t => t.kind === 'free' || t.id === album.specialTheme).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </>}
          <button
            className={saved ? 'icon-button saved' : 'icon-button'}
            onClick={onSave}
          >
            <Bookmark size={17} />
          </button>
          <button
            className="icon-button"
            onClick={() => navigator.clipboard?.writeText(window.location.href)}
          >
            <Share2 size={17} />
          </button>
          <button
            className="icon-button"
            onClick={() => onApply('special_theme', undefined, album.id)}
          >
            <Sparkles size={17} />
          </button>
        </div>
      </div>
      <div className="album-cover-large">
        <img src={album.cover || photos[0]?.url || ''} />
        <div className="album-cover-gradient" />
        <div className="album-cover-copy">
          <div className="eyebrow">
            A COLLECTION BY {album.ownerName?.toUpperCase()}
          </div>
          <h1>{album.title}</h1>
          <p>{album.description}</p>
          <div className="album-quote">
            “{album.quote || 'The best things are the moments we keep.'}”
          </div>
        </div>
      </div>
      {isOwner && <div className="owner-album-tools">
        <label className="field-label">Album title<input className="field" maxLength={100} value={albumDraft.title} onChange={e => setAlbumDraft(old => ({ ...old, title: e.target.value }))} /></label>
        <label className="field-label">Description<input className="field" maxLength={500} value={albumDraft.description} onChange={e => setAlbumDraft(old => ({ ...old, description: e.target.value }))} /></label>
        <label className="field-label">Album quote<input className="field" maxLength={300} value={albumDraft.quote} onChange={e => setAlbumDraft(old => ({ ...old, quote: e.target.value }))} /></label>
        <button className="button button-dark button-small" disabled={!albumDraft.title.trim()} onClick={() => onUpdateAlbum(albumDraft)}>Save album details</button>
        <button className="button button-outline button-small" onClick={onDeleteAlbum}>Delete album</button>
        <label className="field-label">Add a note under the new photos<input className="field" value={photoCaption} onChange={e => setPhotoCaption(e.target.value)} placeholder="Write a memory, date or little note..." /></label>
        <label className="field-label">Photo frame<select className="field" value={photoFrame} onChange={e => setPhotoFrame(e.target.value)}><option value="white">White frame</option><option value="cream">Cream frame</option><option value="none">No frame</option></select></label>
        <label className="button button-outline add-photo-action"><ImagePlus size={15} /> Add photos<input type="file" accept="image/*" multiple onChange={e => { if (e.target.files?.length) onAddPhotos(e.target.files, photoCaption, photoFrame); e.currentTarget.value = ''; }} /></label>
        <label className="button button-outline add-photo-action"><Music2 size={15} /> Change song<input type="file" accept="audio/*" onChange={e => { if (e.target.files?.[0]) onReplaceSong(e.target.files[0]); e.currentTarget.value = ''; }} /></label>
        {album.musicUrl && <button className="button button-outline button-small" onClick={onRemoveSong}>Remove song</button>}
      </div>}
      <div className="album-meta-row">
        <div className="album-author">
          <span className="creator-avatar">
            {album.ownerAvatar ? (
              <img src={album.ownerAvatar} />
            ) : (
              initials(album.ownerName)
            )}
          </span>
          <span>
            <b>{album.ownerName} {album.verified && <VerifiedBadge by={album.verifiedBy || 'Rich'} onClick={() => window.dispatchEvent(new CustomEvent('amoria-verified-info', { detail: album.verifiedBy || 'Rich' }))} />}</b>
            <small>the keeper of these memories</small>
          </span>
        </div>
        <div className="album-actions">
          <button
            className={liked ? 'reaction liked' : 'reaction'}
            onClick={onLike}
          >
            <Heart size={16} fill={liked ? 'currentColor' : 'none'} />{' '}
            Appreciate
          </button>
          {album.musicUrl && (
            <button className="music-pill" onClick={toggleMusic}>
              {playing ? <Pause size={15} /> : <Play size={15} />}{' '}
              {playing ? 'Pause song' : 'Play album song'}
            </button>
          )}
        </div>
      </div>
      {album.musicTitle && (
        <div className="now-playing">
          <div className="music-art">
            <Music2 size={18} />
          </div>
          <div>
            <small>THE SOUNDTRACK</small>
            <strong>{album.musicTitle}</strong>
          </div>
          <div className={playing ? 'equalizer on' : 'equalizer'}>
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
      )}
      <div className={'memory-wall layout-' + (album.layout || 'scrapbook')}>
        {photos.map((p: Photo, i: number) => (
          <motion.figure
            key={p.id}
            className={
              'memory-photo memory-' + (p.layout || album.layout || 'scrapbook')
            }
            style={
              { '--tilt': (p.rotation ?? (i % 2 ? 3 : -3)) + 'deg' } as any
            }
            whileHover={{ scale: 1.035, rotate: 0, zIndex: 3 }}
          >
            <img src={p.url} />
            {p.caption && <figcaption className={'photo-caption-frame frame-' + (p.frame || 'white')}>{p.caption}</figcaption>}
            {isOwner && <div className="photo-owner-tools">
              <input className="field" value={photoDrafts[p.id]?.caption ?? p.caption ?? ''} onChange={e => setPhotoDrafts(old => ({ ...old, [p.id]: { caption: e.target.value, rotation: old[p.id]?.rotation ?? p.rotation ?? 0 } }))} placeholder="Edit photo caption" />
              <label>Rotation <input type="range" min={-180} max={180} value={photoDrafts[p.id]?.rotation ?? p.rotation ?? 0} onChange={e => setPhotoDrafts(old => ({ ...old, [p.id]: { caption: old[p.id]?.caption ?? p.caption ?? '', rotation: Number(e.target.value) } }))} /> <span>{photoDrafts[p.id]?.rotation ?? p.rotation ?? 0}°</span></label>
              <button className="button button-outline button-small" onClick={() => onUpdatePhoto(p.id, photoDrafts[p.id] || { caption: p.caption || '', rotation: p.rotation || 0 })}>Save photo</button>
              <button className="text-button" onClick={() => onDeletePhoto(p.id)}>Remove photo</button>
            </div>}
          </motion.figure>
        ))}
      </div>
      {photos.length === 0 && (
        <div className="empty-photos">
          This album is waiting for its first memories.
        </div>
      )}
      <div className="album-endnote">
        <span>✧</span>
        <p>Some things are too lovely to be forgotten.</p>
        <small>COLLECTED WITH LOVE · AMORIA</small>
      </div>
    </div>
  );
}

function Modal({ children, onClose }: any) {
  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={onClose}
    >
      <motion.div
        className="modal-panel"
        initial={{ y: 24, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 18, scale: 0.98 }}
        onMouseDown={e => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>
          <X size={19} />
        </button>
        {children}
      </motion.div>
    </motion.div>
  );
}

function CreateAlbum({ draft, setDraft, onCreate, uploading, onApply }: any) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [music, setMusic] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [frame, setFrame] = useState('white');
  const [preview, setPreview] = useState<string[]>([]);
  const photoRef = useRef<HTMLInputElement>(null);
  const set = (key: string, value: any) =>
    setDraft((d: any) => ({ ...d, [key]: value }));
  const pick = (f: FileList | null) => {
    setFiles(f);
    setPreview(
      f
        ? Array.from(f)
            .slice(0, 5)
            .map(x => URL.createObjectURL(x))
        : []
    );
  };
  return (
    <div className="create-form">
      <div className="eyebrow">YOUR LITTLE WORLD</div>
      <h2>
        Create an <em>album.</em>
      </h2>
      <p className="form-intro">
        Give your memories a home. Make it yours, down to the tiniest detail.
      </p>
      <label className="field-label">
        Album name <span>required</span>
        <input
          className="field"
          value={draft.title}
          onChange={e => set('title', e.target.value)}
          placeholder="e.g. all the days with you"
        />
      </label>
      <label className="field-label">
        A little description
        <textarea
          className="field"
          value={draft.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Tell the story behind these memories..."
          rows={2}
        />
      </label>
      <label className="field-label">
        A quote to keep
        <textarea
          className="field"
          value={draft.quote}
          onChange={e => set('quote', e.target.value)}
          placeholder="Somewhere between hello and forever..."
          rows={2}
        />
      </label>
      <div className="field-label">Choose your theme</div>
      <div className="theme-picker">
        {themes.map(t => (
          <button
            type="button"
            key={t.id}
            className={
              'theme-choice ' + (draft.theme === t.id ? 'selected' : '')
            }
            onClick={() => (t.kind === 'free' ? set('theme', t.id) : onApply())}
          >
            <span style={{ background: t.swatch }} />
            <b>{t.name}</b>
            {t.kind === 'special' && (
              <small>
                <Sparkles size={11} /> Apply
              </small>
            )}
          </button>
        ))}
      </div>
      <div className="field-label">Album arrangement</div>
      <div className="layout-picker">
        {[
          ['scrapbook', 'Scrapbook'],
          ['polaroid', 'Polaroid'],
          ['editorial', 'Editorial'],
          ['chaos', 'Disordered'],
        ].map(([id, name]) => (
          <button
            type="button"
            className={
              draft.layout === id ? 'layout-choice selected' : 'layout-choice'
            }
            onClick={() => set('layout', id)}
            key={id}
          >
            <LayoutGrid size={17} />
            {name}
          </button>
        ))}
      </div>
      <label className="field-label">
        Typography
        <select
          className="field"
          value={draft.font}
          onChange={e => set('font', e.target.value)}
        >
          {fontOptions.map(f => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </label>
      <label className="check-line">
        <input
          type="checkbox"
          checked={draft.intro}
          onChange={e => set('intro', e.target.checked)}
        />{' '}
        Add an animated welcome intro
      </label>
      <div className="field-label">
        Your photos <span>no fixed photo count</span>
      </div>
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={e => pick(e.target.files)}
      />
      <button className="upload-zone" onClick={() => photoRef.current?.click()}>
        <ImagePlus size={24} />
        <b>Add photos from your gallery</b>
        <small>
          Select as many as you like. You can add more memories later.
        </small>
      </button>
      {preview.length > 0 && (
        <div className="preview-strip">
          {preview.map((p, i) => (
            <img key={i} src={p} />
          ))}
          <span>{files?.length} selected</span>
        </div>
      )}
      <label className="field-label">
        What should appear beneath each photo?
        <input className="field" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write a memory, date or little note..." />
      </label>
      <div className="field-label">Photo frame</div>
      <div className="layout-picker">
        {['white', 'cream', 'none'].map(option => (
          <button type="button" key={option} className={frame === option ? 'layout-choice selected' : 'layout-choice'} onClick={() => setFrame(option)}>
            {option === 'none' ? 'No frame' : option[0].toUpperCase() + option.slice(1) + ' frame'}
          </button>
        ))}
      </div>
      <div className="field-label">
        Album soundtrack <span>optional</span>
      </div>
      <label className="music-upload">
        <Music2 size={18} />
        <span>
          {music ? music.name : 'Choose an audio file from your device'}
        </span>
        <input
          type="file"
          accept="audio/*"
          onChange={e => setMusic(e.target.files?.[0] || null)}
        />
      </label>
      <p className="helper-text">
        Only add music you have the rights to use. The soundtrack plays while
        visitors explore your album.
      </p>
      <button
        className="button button-dark button-wide"
        disabled={uploading}
        onClick={() => onCreate(files, music, caption, frame)}
      >
        {uploading ? 'Creating your album…' : 'Create my album'} <span>↗</span>
      </button>
    </div>
  );
}

function ProfileEditor({ profile, user, onSave, onClose }: any) {
  const [name, setName] = useState(profile?.name || user?.name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [file, setFile] = useState<File | undefined>();
  const [preview, setPreview] = useState(
    profile?.avatar || user?.picture || ''
  );
  return (
    <div className="create-form">
      <div className="eyebrow">YOUR LITTLE CORNER</div>
      <h2>
        Make it <em>yours.</em>
      </h2>
      <p className="form-intro">
        Add a profile photo before creating your first album.
      </p>
      <label className="profile-upload">
        <input
          type="file"
          accept="image/*"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) {
              setFile(f);
              setPreview(URL.createObjectURL(f));
            }
          }}
        />
        {preview ? <img src={preview} /> : <Camera size={24} />}
        <span>
          <b>Choose profile picture</b>
          <small>Tap to upload from gallery</small>
        </span>
      </label>
      <label className="field-label">
        Display name
        <input
          className="field"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
        />
      </label>
      <label className="field-label">
        Username
        <input
          className="field"
          value={username}
          onChange={e =>
            setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, ''))
          }
          placeholder="yourname"
        />
      </label>
      <label className="field-label">
        Bio
        <textarea
          className="field"
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="A little about you..."
          rows={2}
        />
      </label>
      <button
        className="button button-dark button-wide"
        disabled={!name.trim() || !username.trim()}
        onClick={() => onSave(name, username, bio, file)}
      >
        Save profile <span>↗</span>
      </button>
      <button className="text-button centered" onClick={onClose}>
        Maybe later
      </button>
    </div>
  );
}

function ApplyPanel({ albums, onApply, onClose }: any) {
  const [type, setType] = useState('special_theme');
  const [theme, setTheme] = useState('velvet');
  const [albumId, setAlbumId] = useState(albums[0]?.id || '');
  const [note, setNote] = useState('');
  return (
    <div className="create-form">
      <div className="eyebrow">A LITTLE EXTRA MAGIC</div>
      <h2>
        Apply for <em>something special.</em>
      </h2>
      <p className="form-intro">Our team reviews every request with care.</p>
      <div className="application-tabs">
        <button
          className={type === 'special_theme' ? 'selected' : ''}
          onClick={() => setType('special_theme')}
        >
          <Sparkles size={16} /> Special theme
        </button>
        <button
          className={type === 'verification' ? 'selected' : ''}
          onClick={() => setType('verification')}
        >
          <BadgeCheck size={16} /> Verification
        </button>
      </div>
      {type === 'special_theme' && (
        <>
          <div className="field-label">Choose a special theme</div>
          <div className="theme-picker">
            {themes
              .filter(t => t.kind === 'special')
              .map(t => (
                <button
                  className={
                    'theme-choice ' + (theme === t.id ? 'selected' : '')
                  }
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                >
                  <span style={{ background: t.swatch }} />
                  <b>{t.name}</b>
                </button>
              ))}
          </div>
          <label className="field-label">
            Which album?
            <select
              className="field"
              value={albumId}
              onChange={e => setAlbumId(e.target.value)}
            >
              {albums.map((a: Album) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      <label className="field-label">
        Tell us a little more
        <textarea
          className="field"
          rows={3}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Why would this be meaningful to you?"
        />
      </label>
      <button
        className="button button-dark button-wide"
        onClick={() => onApply(type, theme, albumId, note)}
      >
        Send application <span>↗</span>
      </button>
      <button className="text-button centered" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}

function ProfilePage({
  user,
  profile,
  albums,
  onEdit,
  onCreate,
  onApply,
  onOpen,
  onSignIn,
  onLikeAlbum,
  likedIds = [],
  onSaveAlbum,
  savedIds = [],
  onVerifiedInfo,
}: any) {
  if (!user)
    return (
      <section className="page-section">
        <div className="eyebrow">YOUR SPACE</div>
        <h1 className="page-title">
          Your story starts <em>here.</em>
        </h1>
        <p className="page-subtitle">
          Sign in, make a profile and begin collecting your memories.
        </p>
        <button className="button button-dark" onClick={onSignIn}>
          Sign in to continue
        </button>
      </section>
    );
  return (
    <section className="page-section">
      <div className="profile-hero">
        <div className="profile-avatar-large">
          {profile?.avatar ? (
            <img src={profile.avatar} />
          ) : (
            initials(profile?.name || user.name)
          )}
        </div>
        <div className="profile-details">
          <div className="eyebrow">YOUR LITTLE CORNER</div>
          <h1>
            {profile?.name || user.name || 'Your name'}{' '}
            {profile?.verified && <VerifiedBadge by={profile.verifiedBy || 'Rich'} onClick={onVerifiedInfo} size={15} />}
          </h1>
          <p>@{profile?.username || 'choose-a-username'}</p>
          <span>
            {profile?.bio || 'Collecting little moments, one memory at a time.'}
          </span>
          <div className="profile-buttons">
            <button
              className="button button-outline button-small"
              onClick={onEdit}
            >
              <Settings2 size={14} /> Edit profile
            </button>
            <button
              className="button button-dark button-small"
              onClick={onCreate}
            >
              <Plus size={14} /> New album
            </button>
            <button
              className="button button-outline button-small"
              onClick={onApply}
            >
              <BadgeCheck size={14} /> Apply
            </button>
          </div>
        </div>
      </div>
      <div className="section-heading profile-albums-heading">
        <div>
          <div className="eyebrow">YOUR COLLECTION</div>
          <h2>
            Albums <em>you made.</em>
          </h2>
        </div>
        <span className="muted-note">{albums.length} albums</span>
      </div>
      <div className="album-grid">
        {albums.map((a: Album) => (
          <AlbumCard
            key={a.id}
            album={a}
            onOpen={onOpen}
            onLike={() => onLikeAlbum(a)}
            liked={likedIds.includes(a.id)}
            onSave={() => onSaveAlbum(a.id)}
            saved={savedIds.includes(a.id)}
            onVerifiedInfo={() => onVerifiedInfo?.()}
          />
        ))}
      </div>
      {!albums.length && (
        <EmptyState
          title="Your first album is waiting"
          body="Start with a photo, a song and a little feeling."
        />
      )}
    </section>
  );
}

function AdminPage({ applications, onAction, albums = [], onAdjustLikes }: any) {
  const pending = applications.filter((a: Application) => a.status === 'pending');
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  return (
    <section className="page-section">
      <div className="eyebrow">AMORIA STUDIO</div>
      <h1 className="page-title">A little <em>oversight.</em></h1>
      <p className="page-subtitle">Review creator applications and manage public album engagement.</p>
      <div className="admin-stats">
        <div><span>{applications.length}</span><small>Applications</small></div>
        <div><span>{pending.length}</span><small>Awaiting review</small></div>
        <div><span>{applications.filter((a: Application) => a.status === 'approved').length}</span><small>Approved</small></div>
      </div>
      <div className="section-heading"><div><div className="eyebrow">PUBLIC ENGAGEMENT</div><h2>Album like <em>management.</em></h2></div></div>
      <p className="form-intro">Administrator-added likes are stored separately from genuine member likes, but are included in the same public total.</p>
      <div className="admin-list">
        {albums.map((album: Album) => (
          <div className="application-row" key={album.id}>
            {album.cover && <img className="admin-album-thumb" src={album.cover} alt="" />}
            <div className="application-info">
              <b>{album.title}</b>
              <small>{album.ownerName} · {album.likes || 0} public likes · {album.adminLikes || 0} admin-added</small>
              <label className="admin-like-adjust">
                <span>Add likes</span>
                <input className="field" type="number" min="1" max="1000000" step="1" value={amounts[album.id] || ''} onChange={e => setAmounts(old => ({ ...old, [album.id]: e.target.value }))} placeholder="Number to add" />
                <button className="button button-dark button-small" disabled={!Number.isSafeInteger(Number(amounts[album.id])) || Number(amounts[album.id]) < 1} onClick={() => { onAdjustLikes(album.id, Number(amounts[album.id])); setAmounts(old => ({ ...old, [album.id]: '' })); }}>Add</button>
              </label>
              <button className="text-button" disabled={!album.adminLikes} onClick={() => onAdjustLikes(album.id, -Number(album.adminLikes || 0))}>Remove all admin-added likes</button>
            </div>
          </div>
        ))}
        {!albums.length && <EmptyState title="No public albums yet" body="Published albums will appear here for engagement management." />}
      </div>
      <div className="section-heading"><div><div className="eyebrow">CREATOR REQUESTS</div><h2>Applications <em>to review.</em></h2></div></div>
      <div className="admin-list">
        {applications.map((a: Application) => (
          <div className="application-row" key={a.id}>
            <div className="application-icon">{a.type === 'verification' ? <BadgeCheck /> : <Sparkles />}</div>
            <div className="application-info">
              <b>{a.type === 'verification' ? 'Verification request' : 'Special theme request'}</b>
              <small>{a.username || a.userId} · {a.theme || 'Creator verification'} · {new Date(a.createdAt).toLocaleDateString()}</small>
              {a.note && <p>{a.note}</p>}
              <span className={'status status-' + a.status}>{a.status}</span>
            </div>
            {a.status === 'pending' && <div className="application-actions">
              <button className="approve" onClick={() => onAction(a.id, 'approved')}><Check size={15} /></button>
              <button className="reject" onClick={() => onAction(a.id, 'rejected')}><X size={15} /></button>
            </div>}
          </div>
        ))}
        {!applications.length && <EmptyState title="All caught up" body="New special-theme and verification applications will appear here." />}
      </div>
    </section>
  );
}
function EmptyState({ title, body }: any) {
  return (
    <div className="empty-state">
      <span>✧</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
