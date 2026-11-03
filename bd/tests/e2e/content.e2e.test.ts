import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import { youTubeThumbUrl } from '../../src/utils/youtube.js';
import { createTestUser } from '../setup/factories.js';
import { API, app, login } from './helpers.js';

let adminBearer = '';
let userBearer = '';

beforeAll(async () => {
  const admin = await createTestUser({ role: 'ADMIN' });
  adminBearer = `Bearer ${(await login(admin.email, admin.password)).accessToken}`;
  const user = await createTestUser();
  userBearer = `Bearer ${(await login(user.email, user.password)).accessToken}`;
});

const newsBody = (slug: string, isPublished: boolean) => ({
  content: 'Body',
  excerpt: 'Excerpt',
  isPublished,
  slug,
  title: `Title ${slug}`,
});

const createAs = (bearer: string, path: string, body: object) =>
  request(app).post(`${API}/content${path}`).set('Authorization', bearer).send(body);

const slugsOf = (res: request.Response) =>
  (res.body.data.items as Array<{ slug: string }>).map((row) => row.slug);

describe('content write guards', () => {
  it('rejects anonymous writes with 401 and USER writes with 403', async () => {
    const body = newsBody(`guard-${randomUUID()}`, true);
    expect((await request(app).post(`${API}/content/news`).send(body)).status).toBe(401);
    expect((await createAs(userBearer, '/news', body)).status).toBe(403);
  });
});

describe('news CRUD', () => {
  const published = `pub-${randomUUID()}`;
  const hidden = `hid-${randomUUID()}`;
  let hiddenId = '';

  it('creates rows under the `post` envelope key', async () => {
    const res = await createAs(adminBearer, '/news', newsBody(published, true));
    expect(res.status).toBe(201);
    expect(res.body.data.post).toMatchObject({ slug: published, title: `Title ${published}` });

    const second = await createAs(adminBearer, '/news', newsBody(hidden, false));
    hiddenId = second.body.data.post.id as string;
  });

  it('lists published rows only to the public, even when includeHidden is asked', async () => {
    const res = await request(app).get(`${API}/content/news?includeHidden=true`);
    expect(res.status).toBe(200);
    expect(slugsOf(res)).toContain(published);
    expect(slugsOf(res)).not.toContain(hidden);
  });

  it('lists hidden rows to an ADMIN that asks for them', async () => {
    const res = await request(app)
      .get(`${API}/content/news?includeHidden=true`)
      .set('Authorization', adminBearer);
    expect(slugsOf(res)).toEqual(expect.arrayContaining([published, hidden]));
  });

  it('serves published rows by slug and 404s hidden ones', async () => {
    const found = await request(app).get(`${API}/content/news/slug/${published}`);
    expect(found.status).toBe(200);
    expect(found.body.data.post.slug).toBe(published);
    expect((await request(app).get(`${API}/content/news/slug/${hidden}`)).status).toBe(404);
  });

  it('PATCH touches only the sent fields', async () => {
    const res = await request(app)
      .patch(`${API}/content/news/${hiddenId}`)
      .set('Authorization', adminBearer)
      .send({ isPublished: true });
    expect(res.status).toBe(200);
    expect(res.body.data.post).toMatchObject({ isPublished: true, title: `Title ${hidden}` });
  });

  it('DELETE removes the row', async () => {
    const res = await request(app)
      .delete(`${API}/content/news/${hiddenId}`)
      .set('Authorization', adminBearer);
    expect(res.body.data).toEqual({ deleted: true });
    expect((await request(app).get(`${API}/content/news/slug/${hidden}`)).status).toBe(404);
  });
});

describe('albums', () => {
  it('lists unpublished albums to an ADMIN asking includeHidden', async () => {
    const slug = `album-${randomUUID()}`;
    const created = await createAs(adminBearer, '/media', {
      isPublished: false,
      slug,
      title: 'Hidden album',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.album.slug).toBe(slug);

    const pub = await request(app).get(`${API}/content/media`);
    expect(slugsOf(pub)).not.toContain(slug);
    const admin = await request(app)
      .get(`${API}/content/media?includeHidden=true`)
      .set('Authorization', adminBearer);
    expect(slugsOf(admin)).toContain(slug);
  });
});

describe('games', () => {
  it('filters by month (UTC calendar month) and sorts scheduled games soonest-first', async () => {
    for (const tipsAt of ['2091-03-20T11:00:00Z', '2091-03-05T11:00:00Z', '2091-04-01T00:00:00Z']) {
      expect((await createAs(adminBearer, '/games', { opponent: 'Rival', tipsAt })).status).toBe(
        201,
      );
    }
    const res = await request(app).get(`${API}/content/games?month=2091-03`);
    const tips = (res.body.data.items as Array<{ tipsAt: string }>).map((game) => game.tipsAt);
    expect(tips).toEqual(['2091-03-05T11:00:00.000Z', '2091-03-20T11:00:00.000Z']);
  });
});

describe('game opponent colour', () => {
  it('stores a hex colour, keeps it across unrelated PATCHes and clears on empty', async () => {
    const created = await createAs(adminBearer, '/games', {
      opponent: 'Colour Rival',
      opponentColor: '#A01C2B',
      tipsAt: '2093-05-01T11:00:00Z',
    });
    expect(created.status).toBe(201);
    const id = created.body.data.game.id as string;
    expect(created.body.data.game.opponentColor).toBe('#A01C2B');

    const patch = (body: object) =>
      request(app).patch(`${API}/content/games/${id}`).set('Authorization', adminBearer).send(body);
    expect((await patch({ venue: 'Arena 2' })).body.data.game.opponentColor).toBe('#A01C2B');
    expect((await patch({ opponentColor: 'red' })).status).toBe(400);
    expect((await patch({ opponentColor: '' })).body.data.game.opponentColor).toBeNull();
  });
});

describe('videos', () => {
  it('stores a pasted YouTube URL as the bare id and derives the thumbnail', async () => {
    const res = await createAs(adminBearer, '/videos', {
      slug: `video-${randomUUID()}`,
      title: 'Highlights',
      youtubeId: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.video).toMatchObject({
      thumbnail: youTubeThumbUrl('dQw4w9WgXcQ'),
      youtubeId: 'dQw4w9WgXcQ',
    });
  });
});
