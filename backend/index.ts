import {
  router,
  json,
  error,
  requireAuth,
  requireAdminEmailAllowlist,
  db,
  storage,
} from '@appdeploy/sdk';

const ADMIN_EMAILS = ['richestwllx@gmail.com'];
const admin = [requireAuth(), requireAdminEmailAllowlist(ADMIN_EMAILS)];
const safe = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';
const userTable = 'profiles';
const albumTable = 'albums';

async function getProfile(userId: string) {
  const [profile] = await db.get<any>(userTable, [userId]);
  return profile;
}
async function saveProfile(userId: string, record: Record<string, unknown>) {
  const existing = await getProfile(userId);
  if (existing) {
    const [ok] = await db.tx.update(
      userTable,
      [{ id: userId, record, if: { userId } }],
      { patch: true }
    );
    if (!ok) throw new Error('Profile update did not complete');
  } else {
    const [id] = await db.tx.add(userTable, [
      { id: userId, ...record, userId },
    ]);
    if (!id) throw new Error('Profile could not be created');
  }
  return getProfile(userId);
}
async function signed(path?: string) {
  if (!path) return undefined;
  const [result] = await storage.url([path]);
  return result?.url;
}

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],
  'GET /api/feed': [
    async () => {
      const [albumsPage, profilesPage] = await Promise.all([
        db.list<any>(albumTable, { limit: 60 }),
        db.list<any>(userTable, { limit: 100 }),
      ]);
      const profiles = profilesPage.items.filter(p => !p.suspended);
      const profileById = new Map(profiles.map(p => [p.userId, p]));
      const albums: any[] = await Promise.all(
        albumsPage.items
          .filter(a => !a.hidden && !a.deleted)
          .map(async a => {
            const owner = profileById.get(a.ownerId);
            return {
              ...a,
              likes: (Number(a.likes) || 0) + (Number(a.adminLikes) || 0),
              ownerAvatar: (await signed(a.ownerAvatarPath || owner?.avatarPath)) || a.ownerAvatar || owner?.avatarUrl,
              verified: Boolean(owner?.verified),
              verifiedBy: owner?.verifiedBy,
              cover: (await signed(a.coverPath)) || a.cover,
            };
          })
      );
      const publicProfiles = await Promise.all(
        profiles.map(async p => ({ ...p, avatar: (await signed(p.avatarPath)) || p.avatarUrl }))
      );
      return json({
        albums: albums.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
        profiles: publicProfiles,
      });
    },
  ],
  'GET /api/me': [
    requireAuth(),
    async ({ user }) => {
      const profile = await getProfile(user!.userId);
      return json({
        profile: profile
          ? { ...profile, avatar: (await signed(profile.avatarPath)) || profile.avatarUrl }
          : null,
      });
    },
  ],
  'PUT /api/me': [
    requireAuth(),
    async ({ user, body }) => {
      const input = body as {
        name?: string;
        username?: string;
        bio?: string;
        avatarPath?: string;
      };
      if (!safe(input.name) || !safe(input.username))
        return error('Name and username are required', 400);
      const existing = await getProfile(user!.userId);
      const avatarPath = safe(input.avatarPath) || existing?.avatarPath;
      if (!avatarPath)
        return error('Upload a profile picture to complete your profile.', 400);
      const profile = await saveProfile(user!.userId, {
        name: safe(input.name),
        username: safe(input.username).toLowerCase(),
        bio: safe(input.bio),
        avatarPath,
        updatedAt: Date.now(),
      });
      return json({
        profile: { ...profile, avatar: (await signed(profile.avatarPath)) || profile.avatarUrl },
      });
    },
  ],
  'POST /api/me/avatar': [
    requireAuth(),
    async ({ user, body }) => {
      const input = body as { data?: string; contentType?: string };
      if (!input.data || input.data.length > 12000000)
        return error('Choose a smaller image', 400);
      const contentType = safe(input.contentType) || 'image/jpeg';
      if (!contentType.startsWith('image/'))
        return error('Only image files are accepted', 400);
      const path = 'avatars/' + user!.userId + '/' + Date.now();
      const [ok] = await storage.write([
        { path, content: input.data, contentType },
      ]);
      if (!ok) return error('Avatar upload failed', 500);
      return json({ url: await signed(path), path });
    },
  ],
  'POST /api/albums': [
    requireAuth(),
    async ({ user, body }) => {
      const input = body as Record<string, unknown>;
      const profile = await getProfile(user!.userId);
      if (!profile?.avatarPath && !profile?.avatarUrl) return error('Add a profile picture first', 403);
      const owned = await db.list<any>(albumTable, { limit: 100 });
      if (owned.items.some(a => a.ownerId === user!.userId && !a.deleted))
        return error('You can only have one album. Delete your current album before creating another.', 409);
      if (!safe(input.title)) return error('Album name is required', 400);
      const record = {
        title: safe(input.title).slice(0, 100),
        description: safe(input.description).slice(0, 500),
        quote: safe(input.quote).slice(0, 300),
        theme: safe(input.theme) || 'rose',
        layout: safe(input.layout) || 'scrapbook',
        font: safe(input.font) || 'Cormorant Garamond',
        intro: Boolean(input.intro),
        ownerId: user!.userId,
        ownerName: profile.name,
        ownerAvatarPath: profile.avatarPath,
        ownerAvatar: await signed(profile.avatarPath),
        createdAt: Date.now(),
        likes: 0,
        hidden: false,
      };
      const [id] = await db.add(albumTable, [record]);
      if (!id) return error('Album could not be created', 500);
      return json({ album: { ...record, id } }, 201);
    },
  ],
  'POST /api/albums/:id/photos': [
    requireAuth(),
    async ({ user, params, body }) => {
      const input = body as {
        data?: string;
        contentType?: string;
        caption?: string;
        rotation?: number;
        layout?: string;
        frame?: string;
      };
      const [album] = await db.get<any>(albumTable, [params.id]);
      if (!album || album.deleted || album.ownerId !== user!.userId)
        return error('Album not found or access denied', 404);
      if (!input.data || input.data.length > 14000000)
        return error('Image is too large. Try a smaller file.', 413);
      if (!safe(input.contentType).startsWith('image/'))
        return error('Only image files are accepted', 400);
      const photoId =
        Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const path = 'albums/' + params.id + '/photos/' + photoId;
      const [ok] = await storage.write([
        { path, content: input.data, contentType: safe(input.contentType) },
      ]);
      if (!ok) return error('Photo upload failed', 500);
      const [id] = await db.add('photos_' + params.id, [
        {
          path,
          caption: safe(input.caption),
          rotation: Number(input.rotation) || 0,
          layout: safe(input.layout),
          frame: safe(input.frame) || 'white',
          createdAt: Date.now(),
        },
      ]);
      if (!id) return error('Photo metadata could not be saved', 500);
      if (!album.coverPath)
        await db.tx.update(
          albumTable,
          [{ id: params.id, record: { coverPath: path } }],
          { patch: true }
        );
      return json(
        {
          photo: {
            id,
            url: await signed(path),
            caption: safe(input.caption),
            rotation: Number(input.rotation) || 0,
            layout: safe(input.layout),
          },
        },
        201
      );
    },
  ],
  'POST /api/albums/:id/music': [
    requireAuth(),
    async ({ user, params, body }) => {
      const input = body as {
        data?: string;
        contentType?: string;
        title?: string;
      };
      const [album] = await db.get<any>(albumTable, [params.id]);
      if (!album || album.deleted || album.ownerId !== user!.userId)
        return error('Album not found or access denied', 404);
      if (!input.data || input.data.length > 18000000)
        return error('Audio file is too large', 413);
      if (!safe(input.contentType).startsWith('audio/'))
        return error('Choose an audio file', 400);
      const path = 'albums/' + params.id + '/soundtrack/' + Date.now();
      const [ok] = await storage.write([
        { path, content: input.data, contentType: safe(input.contentType) },
      ]);
      if (!ok) return error('Audio upload failed', 500);
      const [updated] = await db.tx.update(
        albumTable,
        [
          {
            id: params.id,
            record: {
              musicPath: path,
              musicTitle: safe(input.title) || 'Album soundtrack',
            },
          },
        ],
        { patch: true }
      );
      if (!updated) return error('Could not attach the soundtrack', 500);
      return json({ ok: true });
    },
  ],
  'PUT /api/albums/:id': [
    requireAuth(),
    async ({ user, params, body }) => {
      const input = body as Record<string, unknown>;
      const [album] = await db.get<any>(albumTable, [params.id]);
      if (!album || album.ownerId !== user!.userId) return error('Album not found or access denied', 404);
      const record: Record<string, unknown> = {};
      for (const key of ['title', 'description', 'quote', 'theme', 'layout', 'font', 'specialTheme'] ) {
        if (typeof input[key] === 'string') record[key] = safe(input[key]);
      }
      if (typeof input.intro === 'boolean') record.intro = input.intro;
      const [ok] = await db.tx.update(albumTable, [{ id: params.id, record }], { patch: true });
      if (!ok) return error('Album changes could not be saved', 500);
      return json({ ok: true, album: { ...album, ...record } });
    },
  ],
  'DELETE /api/albums/:id': [
    requireAuth(),
    async ({ user, params }) => {
      const [album] = await db.get<any>(albumTable, [params.id]);
      if (!album || album.ownerId !== user!.userId || album.deleted) return error('Album not found or access denied', 404);
      const [ok] = await db.tx.update(albumTable, [{ id: params.id, record: { deleted: true, hidden: true, deletedAt: Date.now() }, if: { ownerId: user!.userId } }], { patch: true });
      if (!ok) return error('Album could not be deleted', 500);
      return json({ ok: true, deleted: true });
    },
  ],
  'DELETE /api/albums/:id/music': [
    requireAuth(),
    async ({ user, params }) => {
      const [album] = await db.get<any>(albumTable, [params.id]);
      if (!album || album.ownerId !== user!.userId || album.deleted) return error('Album not found or access denied', 404);
      const [ok] = await db.tx.update(albumTable, [{ id: params.id, record: { musicPath: null, musicTitle: null } }], { patch: true });
      if (!ok) return error('Song could not be removed', 500);
      if (album.musicPath) await storage.delete([album.musicPath]);
      return json({ ok: true });
    },
  ],
  'PUT /api/albums/:id/photos/:photoId': [
    requireAuth(),
    async ({ user, params, body }) => {
      const [album] = await db.get<any>(albumTable, [params.id]);
      if (!album || album.ownerId !== user!.userId || album.deleted) return error('Album not found or access denied', 404);
      const [photo] = await db.get<any>('photos_' + params.id, [params.photoId]);
      if (!photo || photo.deleted) return error('Photo not found', 404);
      const input = body as { caption?: string; rotation?: number; frame?: string };
      const rotation = Number(input.rotation ?? photo.rotation ?? 0);
      if (!Number.isFinite(rotation) || rotation < -360 || rotation > 360) return error('Rotation must be between -360 and 360 degrees', 400);
      const [ok] = await db.tx.update('photos_' + params.id, [{ id: params.photoId, record: { caption: safe(input.caption ?? photo.caption), rotation, frame: safe(input.frame ?? photo.frame) || 'white' } }], { patch: true });
      if (!ok) return error('Photo changes could not be saved', 500);
      return json({ ok: true });
    },
  ],
  'DELETE /api/albums/:id/photos/:photoId': [
    requireAuth(),
    async ({ user, params }) => {
      const [album] = await db.get<any>(albumTable, [params.id]);
      if (!album || album.ownerId !== user!.userId || album.deleted) return error('Album not found or access denied', 404);
      const [photo] = await db.get<any>('photos_' + params.id, [params.photoId]);
      if (!photo || photo.deleted) return error('Photo not found', 404);
      const [ok] = await db.tx.update('photos_' + params.id, [{ id: params.photoId, record: { deleted: true, deletedAt: Date.now() } }], { patch: true });
      if (!ok) return error('Photo could not be removed', 500);
      if (photo.path) await storage.delete([photo.path]);
      return json({ ok: true, deleted: true });
    },
  ],
  'GET /api/albums/:id': [
    async ({ params }) => {
      const [album] = await db.get<any>(albumTable, [params.id]);
      if (!album || album.hidden || album.deleted) return error('Album not found', 404);
      if (!album || album.hidden || album.deleted) return error('Album not found', 404);
      const page = await db.list<any>('photos_' + params.id, { limit: 100 });
      const photos = await Promise.all(
        page.items.filter(p => !p.deleted).map(async p => ({ ...p, url: await signed(p.path) }))
      );
      return json({
        album: {
          ...album,
          id: params.id,
          likes: (Number(album.likes) || 0) + (Number(album.adminLikes) || 0),
          cover: await signed(album.coverPath),
          musicUrl: await signed(album.musicPath),
        },
        photos: photos.map((photo: any) => ({ ...photo, id: photo.id || photo._id || photo.path })),
      });
    },
  ],
  'POST /api/albums/:id/like': [
    requireAuth(),
    async ({ user, params, body }) => {
      const input = body as { liked?: boolean };
      const [album] = await db.get<any>(albumTable, [params.id]);
      if (!album || album.hidden || album.deleted) return error('Album not found', 404);
      const table = 'likes_' + params.id;
      const [existing] = await db.get<any>(table, [user!.userId]);
      if (input.liked) {
        if (existing) return json({ ok: true, alreadyLiked: true, likes: (Number(album.likes) || 0) + (Number(album.adminLikes) || 0) });
        const [id] = await db.tx.add(table, [
          { id: user!.userId, userId: user!.userId, createdAt: Date.now() },
        ]);
        if (!id) return json({ ok: true, alreadyLiked: true });
        await db.tx.update(albumTable, [{ id: params.id, record: { likes: (Number(album.likes) || 0) + 1 } }], { patch: true });
      } else {
        if (!existing) return json({ ok: true, alreadyUnliked: true, likes: (Number(album.likes) || 0) + (Number(album.adminLikes) || 0) });
        await db.delete(table, [user!.userId]);
        await db.tx.update(albumTable, [{ id: params.id, record: { likes: Math.max(0, (Number(album.likes) || 0) - 1) } }], { patch: true });
      }
      const [updated] = await db.get<any>(albumTable, [params.id]);
      return json({ ok: true, likes: (Number(updated?.likes) || 0) + (Number(updated?.adminLikes) || 0) });
    },
  ],
  'POST /api/applications': [
    requireAuth(),
    async ({ user, body }) => {
      const input = body as {
        type?: string;
        theme?: string;
        albumId?: string;
        note?: string;
      };
      if (!['special_theme', 'verification'].includes(safe(input.type)))
        return error('Invalid application type', 400);
      const profile = await getProfile(user!.userId);
      if (!profile) return error('Create your profile first', 403);
      if (input.type === 'special_theme') {
        const [album] = await db.get<any>(albumTable, [safe(input.albumId)]);
        if (!album || album.ownerId !== user!.userId)
          return error('Choose one of your own albums', 400);
      }
      const [id] = await db.add('applications', [
        {
          userId: user!.userId,
          username: profile.username,
          type: safe(input.type),
          theme: safe(input.theme),
          albumId: safe(input.albumId),
          note: safe(input.note).slice(0, 500),
          status: 'pending',
          createdAt: Date.now(),
        },
      ]);
      if (!id) return error('Application could not be submitted', 500);
      return json({ id, status: 'pending' }, 201);
    },
  ],
  'GET /api/admin/albums': [
    ...admin,
    async () => {
      const page = await db.list<any>(albumTable, { limit: 100 });
      const albums = await Promise.all(page.items.filter(a => !a.deleted).map(async a => ({
        ...a,
        id: a.id || a._id,
        likes: (Number(a.likes) || 0) + (Number(a.adminLikes) || 0),
        cover: (await signed(a.coverPath)) || a.cover,
      })));
      return json({ albums });
    },
  ],
  'POST /api/admin/albums/:id/likes': [
    ...admin,
    async ({ params, body, user }) => {
      const input = body as { adjustment?: number };
      const adjustment = Number(input.adjustment);
      if (!Number.isSafeInteger(adjustment) || adjustment === 0 || Math.abs(adjustment) > 1000000)
        return error('Enter a whole-number adjustment between 1 and 1,000,000.', 400);
      const [album] = await db.get<any>(albumTable, [params.id]);
      if (!album || album.deleted) return error('Album not found', 404);
      const current = Number(album.adminLikes) || 0;
      const next = current + adjustment;
      if (next < 0) return error('You cannot remove more administrator-added likes than currently exist.', 400);
      const [ok] = await db.tx.update(albumTable, [{ id: params.id, record: { adminLikes: next } }], { patch: true });
      if (!ok) return error('Administrator likes could not be updated', 500);
      await db.add('admin_activity', [{
        adminId: user!.userId,
        action: adjustment > 0 ? 'add_album_likes' : 'remove_album_likes',
        albumId: params.id,
        adjustment,
        createdAt: Date.now(),
      }]);
      return json({ ok: true, adminLikes: next, likes: (Number(album.likes) || 0) + next });
    },
  ],
  'GET /api/admin/check': [...admin, async () => json({ admin: true })],
  'GET /api/admin/applications': [
    ...admin,
    async () => {
      const page = await db.list<any>('applications', { limit: 100 });
      return json({
        applications: page.items.sort((a, b) => b.createdAt - a.createdAt),
      });
    },
  ],
  'POST /api/admin/applications/:id': [
    ...admin,
    async ({ params, body }) => {
      const input = body as { status?: string };
      if (!['approved', 'rejected'].includes(safe(input.status)))
        return error('Invalid decision', 400);
      const [application] = await db.get<any>('applications', [params.id]);
      if (!application) return error('Application not found', 404);
      const [ok] = await db.tx.update(
        'applications',
        [
          {
            id: params.id,
            record: { status: input.status, reviewedAt: Date.now() },
          },
        ],
        { patch: true }
      );
      if (!ok) return error('Could not update application', 500);
      if (input.status === 'approved' && application.type === 'verification') {
        await db.tx.update(
          userTable,
          [{ id: application.userId, record: { verified: true, verifiedBy: 'Rich', verifiedAt: Date.now() } }],
          { patch: true }
        );
      }
      if (
        input.status === 'approved' &&
        application.type === 'special_theme' &&
        application.albumId
      ) {
        await db.tx.update(
          albumTable,
          [
            {
              id: application.albumId,
              record: { specialTheme: application.theme },
            },
          ],
          { patch: true }
        );
      }
      return json({ ok: true });
    },
  ],
});
