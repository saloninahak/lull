import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import type { BingoView, RoomView, ServerMessage } from '@lull/game-logic';
import { startServer, type RunningServer } from '../src/server.ts';

/** a test phone: connects, keeps every message, waits for the one it needs */
function phone(port: number, origin?: string) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/api/ws`, origin ? { origin } : undefined);
  const inbox: ServerMessage[] = [];
  const waiters: Array<() => void> = [];
  ws.on('message', (data) => {
    inbox.push(JSON.parse(data.toString()) as ServerMessage);
    waiters.splice(0).forEach((w) => w());
  });
  const opened = new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });

  return {
    ws,
    opened,
    send: (msg: unknown) => ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg)),
    /** wait for the next message (after `after`) that matches */
    async next(match: (m: ServerMessage) => boolean, after = 0): Promise<ServerMessage> {
      for (let tries = 0; tries < 100; tries++) {
        const found = inbox.slice(after).find(match);
        if (found) return found;
        await new Promise<void>((resolve) => {
          waiters.push(resolve);
          setTimeout(resolve, 50);
        });
      }
      throw new Error('no matching message');
    },
    /** the latest room view received */
    room(): RoomView | undefined {
      const rooms = inbox.filter((m): m is Extract<ServerMessage, { t: 'room' }> => m.t === 'room');
      return rooms[rooms.length - 1]?.room;
    },
    count: () => inbox.length,
  };
}

const ANA = 'ana-00000001';
const BEN = 'ben-00000002';

let server: RunningServer;
let clock = 1_000_000;

beforeEach(async () => {
  clock = 1_000_000;
  server = await startServer({ port: 0, now: () => clock, sweepMs: 20 });
});
afterEach(async () => {
  await server.close();
});

async function createRoom(): Promise<string> {
  const res = await fetch(`http://127.0.0.1:${server.port}/api/rooms`, {
    method: 'POST',
    body: JSON.stringify({ game: 'bingo' }),
  });
  expect(res.status).toBe(201);
  return ((await res.json()) as { code: string }).code;
}

async function seat(code: string, id: string, name: string) {
  const p = phone(server.port);
  await p.opened;
  p.send({ t: 'hello', code, id, name });
  await p.next((m) => m.t === 'room' && m.room.seats.some((s) => s.id === id));
  return p;
}

const viewOf = (p: ReturnType<typeof phone>) => p.room()!.match!.view as BingoView;

describe('hosting the site too', () => {
  let site: RunningServer;
  let base: string;
  const get = (path: string) => fetch(`http://127.0.0.1:${site.port}${path}`);

  beforeEach(async () => {
    // the site lives in base/site; a secret sits next to it, where no path may reach
    base = await mkdtemp(join(tmpdir(), 'lull-site-'));
    const dir = join(base, 'site');
    await mkdir(join(dir, 'assets'), { recursive: true });
    await writeFile(join(dir, 'index.html'), '<!doctype html><title>lull</title>');
    await writeFile(join(dir, 'assets', 'app-abc123.js'), 'console.log(1)');
    await writeFile(join(base, 'secret.txt'), 'nope');
    site = await startServer({ port: 0, staticDir: dir });
  });
  afterEach(async () => {
    await site.close();
    await rm(base, { recursive: true, force: true });
  });

  it('serves the app, its files, and its pages from one port', async () => {
    const home = await get('/');
    expect(home.status).toBe(200);
    expect(home.headers.get('content-type')).toContain('text/html');
    expect(await home.text()).toContain('<title>lull</title>');
    const js = await get('/assets/app-abc123.js');
    expect(js.headers.get('content-type')).toContain('text/javascript');
    expect(js.headers.get('cache-control')).toContain('immutable');
    // a page of the app gets index.html, a missing file doesn't
    expect(await (await get('/r/QBXT')).text()).toContain('<title>lull</title>');
    expect((await get('/assets/missing.js')).status).toBe(404);
    // the rooms still work alongside
    expect((await get('/api/health')).status).toBe(200);
  });

  it('never serves anything outside the site folder', async () => {
    for (const path of [
      '/../secret.txt',
      '/%2e%2e/secret.txt',
      '/assets/%2e%2e/%2e%2e/secret.txt',
    ]) {
      const res = await get(path);
      expect(await res.text()).not.toContain('nope');
    }
    expect((await get('/%00')).status).toBe(404);
  });

  it('explains a port already in use instead of crashing', async () => {
    await expect(startServer({ port: site.port })).rejects.toMatchObject({ code: 'EADDRINUSE' });
  });
});

describe('room server', () => {
  it('creates rooms for online games only', async () => {
    const code = await createRoom();
    expect(code).toMatch(/^[A-Z]{4}$/);
    const bad = await fetch(`http://127.0.0.1:${server.port}/api/rooms`, {
      method: 'POST',
      body: JSON.stringify({ game: 'chess' }),
    });
    expect(bad.status).toBe(400);
  });

  it('says a room is gone when the code is unknown', async () => {
    const p = phone(server.port);
    await p.opened;
    p.send({ t: 'hello', code: 'ZZZZ', id: ANA, name: 'ana' });
    expect(await p.next((m) => m.t === 'gone')).toEqual({ t: 'gone' });
    p.ws.close();
  });

  it('seats two phones, starts, and sends each only its own card', async () => {
    const code = await createRoom();
    const ana = await seat(code, ANA, 'ana');
    const ben = await seat(code, BEN, 'ben');
    await ana.next((m) => m.t === 'room' && m.room.seats.length === 2);
    expect(ana.room()!.host).toBe(ANA);

    // only the host can start
    ben.send({ t: 'start' });
    expect(await ben.next((m) => m.t === 'error')).toEqual({ t: 'error', error: 'not-host' });

    ana.send({ t: 'start' });
    await ana.next((m) => m.t === 'room' && m.room.match !== null);
    await ben.next((m) => m.t === 'room' && m.room.match !== null);
    const anaCard = viewOf(ana).card!;
    const benCard = viewOf(ben).card!;
    expect([...anaCard].sort((x, y) => x - y)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect(anaCard).not.toEqual(benCard);

    // a call is checked on the server and crosses off both cards
    const before = ben.count();
    ana.send({ t: 'move', move: { type: 'call', number: anaCard[0] } });
    await ben.next(
      (m) => m.t === 'room' && (m.room.match?.view as BingoView).called.length === 1,
      before,
    );
    expect(viewOf(ben).called).toEqual([anaCard[0]]);
    expect(viewOf(ben).card).toEqual(benCard);

    // out of turn and malformed moves are refused
    ana.send({ t: 'move', move: { type: 'call', number: anaCard[1] } });
    expect(await ana.next((m) => m.t === 'error')).toEqual({ t: 'error', error: 'not-your-turn' });
    const mark = ben.count();
    ben.send('{"t":"move","move":"nope"}');
    expect(await ben.next((m) => m.t === 'error', mark)).toEqual({
      t: 'error',
      error: 'bad-message',
    });

    ana.ws.close();
    ben.ws.close();
  });

  it('holds a seat while someone reconnects, and passes the host on when they go', async () => {
    const code = await createRoom();
    const ana = await seat(code, ANA, 'ana');
    const ben = await seat(code, BEN, 'ben');
    ana.ws.close();
    await ben.next((m) => m.t === 'room' && m.room.seats[0]?.connected === false);
    expect(ben.room()!.host).toBe(ANA);

    // back within two minutes: same seat, still the host
    const again = await seat(code, ANA, 'ana');
    expect(again.room()!.seats.map((s) => s.id)).toEqual([ANA, BEN]);
    expect(again.room()!.host).toBe(ANA);

    // gone for good: the seat is released and ben becomes the host
    const mark = ben.count();
    again.ws.close();
    await ben.next((m) => m.t === 'room' && m.room.seats[0]?.connected === false, mark);
    clock += 2 * 60_000;
    await ben.next((m) => m.t === 'room' && m.room.seats.length === 1, mark);
    expect(ben.room()!.host).toBe(BEN);
    ben.ws.close();
  });

  it('turns away browsers from other sites when origins are set', async () => {
    await server.close();
    server = await startServer({ port: 0, allowedOrigins: ['http://localhost:5173'] });
    const stranger = phone(server.port, 'https://example.com');
    await expect(stranger.opened).rejects.toThrow();
    const friend = phone(server.port, 'http://localhost:5173');
    await expect(friend.opened).resolves.toBeUndefined();
    friend.ws.close();
  });
});

describe('on the open internet', () => {
  it('matches preview addresses with one wildcard entry, and nothing else', async () => {
    const { originMatcher } = await import('../src/server.ts');
    const ok = originMatcher(['https://lull.example', 'https://lull-*.vercel.app']);
    expect(ok('https://lull.example')).toBe(true);
    expect(ok('https://lull-git-uat-ana.vercel.app')).toBe(true);
    // a wildcard never crosses a dot or a slash
    expect(ok('https://lull-x.evil.com/.vercel.app')).toBe(false);
    expect(ok('https://lull-.evil.vercel.app')).toBe(false);
    expect(ok('https://evil.example')).toBe(false);
  });

  it('lets the site on another address create a room (cors)', async () => {
    await server.close();
    server = await startServer({ port: 0, allowedOrigins: ['https://lull.example'] });
    const url = `http://127.0.0.1:${server.port}/api/rooms`;
    const pre = await fetch(url, {
      method: 'OPTIONS',
      headers: { origin: 'https://lull.example' },
    });
    expect(pre.status).toBe(204);
    expect(pre.headers.get('access-control-allow-origin')).toBe('https://lull.example');
    expect(pre.headers.get('access-control-allow-headers')).toContain('content-type');
    const made = await fetch(url, {
      method: 'POST',
      headers: { origin: 'https://lull.example', 'content-type': 'application/json' },
      body: JSON.stringify({ game: 'tictactoe' }),
    });
    expect(made.status).toBe(201);
    expect(made.headers.get('access-control-allow-origin')).toBe('https://lull.example');
    expect(made.headers.get('x-content-type-options')).toBe('nosniff');
    // a stranger gets neither
    const stranger = await fetch(url, {
      method: 'POST',
      headers: { origin: 'https://evil.example' },
    });
    expect(stranger.status).toBe(403);
    expect(stranger.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('refuses an oversized request body with a reply, not a hang', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/api/rooms`, {
      method: 'POST',
      body: JSON.stringify({ game: 'bingo', pad: 'x'.repeat(5000) }),
    }).catch(() => null);
    // either a clean 413, or the connection closed: never a room
    if (res) expect(res.status).toBe(413);
  });

  it('closes the door on someone guessing room codes', async () => {
    const p = phone(server.port);
    await p.opened;
    const closed = new Promise<number>((resolve) => p.ws.once('close', (c) => resolve(c)));
    for (let i = 0; i < 14; i++) p.send({ t: 'hello', code: 'ZZZZ', id: ANA, name: 'ana' });
    expect(await closed).toBe(1008);
  });

  it('caps how many sockets one address can open', async () => {
    await server.close();
    server = await startServer({ port: 0, maxSocketsPerIp: 2 });
    const a = phone(server.port);
    const b = phone(server.port);
    await Promise.all([a.opened, b.opened]);
    const c = phone(server.port);
    await expect(c.opened).rejects.toThrow();
    a.ws.close();
    b.ws.close();
  });

  it('reads the visitor address from the proxy only when told to', async () => {
    await server.close();
    server = await startServer({ port: 0, trustProxy: true });
    const url = `http://127.0.0.1:${server.port}/api/rooms`;
    const make = (ip: string) =>
      fetch(url, {
        method: 'POST',
        headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` },
        body: JSON.stringify({ game: 'bingo' }),
      });
    // twenty rooms a minute from one address, then a pause. another address is its own.
    for (let i = 0; i < 20; i++) expect((await make('203.0.113.1')).status).toBe(201);
    expect((await make('203.0.113.1')).status).toBe(429);
    expect((await make('203.0.113.2')).status).toBe(201);
  });

  it('keeps every room going when one message throws', async () => {
    const code = await createRoom();
    const ana = await seat(code, ANA, 'ana');
    const mark = ana.count();
    // not json at all, then a well-formed hello: the server is still there
    ana.send('{');
    expect(await ana.next((m) => m.t === 'error', mark)).toEqual({
      t: 'error',
      error: 'bad-message',
    });
    expect((await fetch(`http://127.0.0.1:${server.port}/api/health`)).status).toBe(200);
    ana.ws.close();
  });
});
