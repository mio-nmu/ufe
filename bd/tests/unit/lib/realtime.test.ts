import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({ SUPABASE_SECRET_KEY: '', SUPABASE_URL: '' }));
vi.mock('../../../src/config/env.js', () => ({ env }));
vi.mock('../../../src/lib/logger.js', () => ({ logger: { warn: vi.fn() } }));

const { publishLiveGameState } = await import('../../../src/lib/realtime.js');

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ status: 202 });
});

afterEach(() => {
  vi.unstubAllGlobals();
  env.SUPABASE_SECRET_KEY = '';
  env.SUPABASE_URL = '';
});

function configure(key: string): void {
  env.SUPABASE_URL = 'https://abc.supabase.co';
  env.SUPABASE_SECRET_KEY = key;
}

describe('publishLiveGameState', () => {
  it('does nothing until Supabase is configured', async () => {
    env.SUPABASE_URL = 'https://abc.supabase.co';
    await publishLiveGameState('g1', { teamScore: 1 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('broadcasts the state on the private game channel', async () => {
    configure('sb_secret_abc');

    await publishLiveGameState('g1', { teamScore: 7 });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://abc.supabase.co/realtime/v1/api/broadcast/live-game%3Ag1/events/state_changed?private=true',
    );
    expect(JSON.parse(String(init.body))).toEqual({ gameId: 'g1', state: { teamScore: 7 } });
  });

  it('sends a new-style secret key as apikey only', async () => {
    configure('sb_secret_abc');
    await publishLiveGameState('g1', {});
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.headers).toEqual({ apikey: 'sb_secret_abc', 'Content-Type': 'application/json' });
  });

  it('also sends a legacy service-role JWT as the bearer token', async () => {
    configure('eyJhbGciOi.legacy.jwt');
    await publishLiveGameState('g1', {});
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.headers).toMatchObject({ Authorization: 'Bearer eyJhbGciOi.legacy.jwt' });
  });

  it('never throws when Supabase is down — the scorer must not see an error', async () => {
    configure('sb_secret_abc');
    fetchMock.mockRejectedValue(new Error('network down'));
    await expect(publishLiveGameState('g1', {})).resolves.toBeUndefined();
  });
});
