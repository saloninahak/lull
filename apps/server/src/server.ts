import { randomInt } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, resolve, sep } from 'node:path';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type RawData, type WebSocket } from 'ws';
import {
  createRoom,
  isError,
  makeCode,
  MAX_MESSAGE_BYTES,
  normalizeCode,
  ONLINE_GAMES,
  parseClientMessage,
  parseCreateRequest,
  reduceRoom,
  roomView,
  type Room,
  type RoomAction,
  type ServerMessage,
} from '@lull/game-logic';

/**
 * the room server. it holds every room in memory (readme 6: no storage),
 * runs each message through the shared, tested room and game rules, and
 * sends every phone its own view. nothing here decides a rule.
 */

export type ServerOptions = {
  port: number;
  host?: string;
  /** browser origins allowed to connect. empty means any (fine on your own machine). */
  allowedOrigins?: readonly string[];
  /** injectable clock, for tests */
  now?: () => number;
  /** how often held seats and empty rooms are checked */
  sweepMs?: number;
  /** an empty room waits this long for someone to come in */
  emptyRoomMs?: number;
  maxRooms?: number;
  /**
   * behind a host's proxy (render, a load balancer), the visitor's address
   * comes from the proxy's headers. off when the server faces people directly,
   * since then those headers could say anything.
   */
  trustProxy?: boolean;
  /** open sockets one address may hold. a house of friends shares one address. */
  maxSocketsPerIp?: number;
  /**
   * the built web app (apps/web/dist). when set, the site and the rooms share
   * one port, so friends only need one address (readme 13.1, `pnpm host`).
   */
  staticDir?: string;
};

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

export type RunningServer = { port: number; close: () => Promise<void> };

type Client = { code: string; id: string } | null;

// drawing sends a few pieces a second, so this leaves room for that and nothing silly
const MESSAGES_PER_WINDOW = 90;
const WINDOW_MS = 5_000;
const CREATES_PER_MINUTE = 20;
/**
 * room codes are four letters, so a stranger could try to guess them. a few
 * wrong codes a minute is a typo; more than this is someone knocking on doors.
 */
const MISSES_PER_MINUTE = 12;

/** the same few headers on everything the server sends */
const SAFE_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'cross-origin-resource-policy': 'cross-origin',
} as const;

/**
 * an allowed origin can end in a wildcard part, so one entry covers every
 * test (preview) address: `https://lull-*.vercel.app`. only `*` is special,
 * and it never crosses a dot or a slash.
 */
export function originMatcher(patterns: readonly string[]): (origin: string) => boolean {
  const res = patterns.map(
    (p) =>
      new RegExp(
        `^${p
          .split('*')
          .map((part) => part.replace(/[.+?^${}()|[\]\\/]/g, '\\$&'))
          .join('[a-z0-9-]*')}$`,
        'i',
      ),
  );
  return (origin) => res.some((re) => re.test(origin));
}

/** count things per address over the last minute */
function perMinute(limit: number, now: () => number) {
  const seen = new Map<string, number[]>();
  return {
    /** count one, and say whether it's still within the limit */
    take(key: string): boolean {
      const t = now();
      const recent = (seen.get(key) ?? []).filter((x) => t - x < 60_000);
      if (recent.length >= limit) {
        seen.set(key, recent);
        return false;
      }
      seen.set(key, [...recent, t]);
      return true;
    },
    /** forget addresses that have gone quiet */
    prune() {
      const t = now();
      for (const [key, times] of seen) {
        if (times.every((x) => t - x >= 60_000)) seen.delete(key);
      }
    },
  };
}

export function startServer(options: ServerOptions): Promise<RunningServer> {
  const now = options.now ?? Date.now;
  const allowed = options.allowedOrigins ?? [];
  const allowedOrigin = originMatcher(allowed);
  const emptyRoomMs = options.emptyRoomMs ?? 10 * 60_000;
  const maxRooms = options.maxRooms ?? 500;
  const maxSocketsPerIp = options.maxSocketsPerIp ?? 40;

  const rooms = new Map<string, Room>();
  const emptySince = new Map<string, number>();
  const sockets = new Map<string, Map<WebSocket, string>>();
  const clients = new Map<WebSocket, Client>();
  const creates = perMinute(CREATES_PER_MINUTE, now);
  const misses = perMinute(MISSES_PER_MINUTE, now);
  const socketsByIp = new Map<string, number>();

  /* helpers --------------------------------------------------------------- */

  const originOk = (req: IncomingMessage) => {
    const origin = req.headers.origin;
    return allowed.length === 0 || origin === undefined || allowedOrigin(origin);
  };

  /** who's asking. behind a proxy, the proxy says; otherwise the socket does. */
  const ipOf = (req: IncomingMessage): string => {
    if (options.trustProxy) {
      const edge = req.headers['cf-connecting-ip'] ?? req.headers['true-client-ip'];
      if (typeof edge === 'string' && edge) return edge.trim();
      const forwarded = req.headers['x-forwarded-for'];
      const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
      if (first) return first;
    }
    return req.socket.remoteAddress ?? '?';
  };

  /** cross-origin reads, for the site when it lives on another address */
  const cors = (req: IncomingMessage): Record<string, string> => {
    const origin = req.headers.origin;
    if (!origin || !originOk(req)) return {};
    return {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '600',
      vary: 'origin',
    };
  };

  const send = (ws: WebSocket, msg: ServerMessage) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  };

  const broadcast = (code: string) => {
    const room = rooms.get(code);
    const members = sockets.get(code);
    if (!room || !members) return;
    const t = now();
    for (const [ws, id] of members) send(ws, { t: 'room', room: roomView(room, id, t) });
  };

  const save = (code: string, room: Room) => {
    rooms.set(code, room);
    if (room.seats.length === 0) {
      if (!emptySince.has(code)) emptySince.set(code, now());
    } else {
      emptySince.delete(code);
    }
  };

  /** apply an action to a room. returns the error code, or null. */
  const act = (code: string, action: RoomAction): string | null => {
    const room = rooms.get(code);
    if (!room) return 'gone';
    const next = reduceRoom(room, action);
    if (isError(next)) return next.error;
    if (next !== room) {
      save(code, next);
      broadcast(code);
    }
    return null;
  };

  const unbind = (ws: WebSocket): Client => {
    const client = clients.get(ws) ?? null;
    clients.set(ws, null);
    if (client) sockets.get(client.code)?.delete(ws);
    return client;
  };

  const stillConnected = (code: string, id: string) =>
    [...(sockets.get(code)?.values() ?? [])].includes(id);

  /* http: health and creating rooms -------------------------------------- */

  const json = (req: IncomingMessage, res: ServerResponse, status: number, body: unknown) => {
    if (res.headersSent) return;
    res.writeHead(status, {
      ...SAFE_HEADERS,
      ...cors(req),
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    });
    res.end(JSON.stringify(body));
  };

  /* the site, when hosting it too ----------------------------------------- */

  const root = options.staticDir ? resolve(options.staticDir) : null;

  /** where a path points inside the site folder, or null when it's malformed or leads out */
  const inside = (urlPath: string): string | null => {
    if (!root) return null;
    let decoded: string;
    try {
      decoded = decodeURIComponent(urlPath);
    } catch {
      return null;
    }
    if (decoded.includes('\0')) return null;
    const file = resolve(root, `.${decoded}`);
    return file === root || file.startsWith(root + sep) ? file : null;
  };

  /** a file inside the site folder, or null. never anything outside it. */
  const fileFor = async (urlPath: string): Promise<string | null> => {
    const file = inside(urlPath);
    if (!file) return null;
    try {
      return (await stat(file)).isFile() ? file : null;
    } catch {
      return null;
    }
  };

  const serveFile = (req: IncomingMessage, res: ServerResponse, file: string) => {
    // built files have a hash in their name, so they can be kept forever. the page itself can't.
    const hashed = file.includes(`${sep}assets${sep}`);
    res.writeHead(200, {
      ...SAFE_HEADERS,
      'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    if (req.method === 'HEAD') return res.end();
    const stream = createReadStream(file);
    // a file that vanishes mid-read ends this response, not the server
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  };

  const serveSite = async (req: IncomingMessage, res: ServerResponse, urlPath: string) => {
    const file = await fileFor(urlPath === '/' ? '/index.html' : urlPath);
    if (file) return serveFile(req, res, file);
    // a page of the app (/r/QBXT, /play/zip): the app finds its own way from index.html.
    // a missing file with an extension, or a malformed path, is a real 404.
    if (extname(urlPath) === '' && inside(urlPath)) {
      const index = await fileFor('/index.html');
      if (index) return serveFile(req, res, index);
    }
    res.writeHead(404, { ...SAFE_HEADERS, 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
  };

  const handle = (req: IncomingMessage, res: ServerResponse) => {
    if (!originOk(req)) return json(req, res, 403, { error: 'origin' });
    const path = (req.url ?? '').split('?')[0] ?? '/';

    // the browser asks first before a cross-origin post
    if (req.method === 'OPTIONS' && path.startsWith('/api/')) {
      res.writeHead(204, { ...SAFE_HEADERS, ...cors(req) });
      return res.end();
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && path === '/api/health') {
      return json(req, res, 200, { ok: true });
    }

    if (req.method === 'POST' && path === '/api/rooms') {
      let body = '';
      let tooBig = false;
      req.setEncoding('utf8');
      req.on('data', (chunk: string) => {
        if (tooBig) return;
        body += chunk;
        if (Buffer.byteLength(body) > MAX_MESSAGE_BYTES) {
          tooBig = true;
          json(req, res, 413, { error: 'too-big' });
          req.destroy();
        }
      });
      req.on('end', () => {
        if (tooBig) return;
        const request = parseCreateRequest(body, ONLINE_GAMES);
        if (!request) return json(req, res, 400, { error: 'bad-request' });
        if (!creates.take(ipOf(req))) return json(req, res, 429, { error: 'slow-down' });
        if (rooms.size >= maxRooms) return json(req, res, 503, { error: 'busy' });
        let code = '';
        for (let tries = 0; tries < 50 && (code === '' || rooms.has(code)); tries++) {
          code = makeCode(randomInt(2 ** 31));
        }
        if (rooms.has(code)) return json(req, res, 503, { error: 'busy' });
        save(code, createRoom(code, request.game, request.options));
        return json(req, res, 201, { code });
      });
      return;
    }

    if (root && (req.method === 'GET' || req.method === 'HEAD') && !path.startsWith('/api/')) {
      serveSite(req, res, path).catch(() => res.destroy());
      return;
    }

    return json(req, res, 404, { error: 'not-found' });
  };

  const http = createServer((req, res) => {
    // a request that goes wrong ends that request, never every room
    try {
      handle(req, res);
    } catch (e) {
      console.error('request failed', e);
      json(req, res, 500, { error: 'server' });
    }
  });
  // a slow trickle of headers or body shouldn't hold a connection forever
  http.requestTimeout = 15_000;
  http.headersTimeout = 10_000;

  /* websockets: being in a room ------------------------------------------ */

  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });
  const alive = new WeakSet<WebSocket>();

  const refuse = (socket: Duplex, status: string) => {
    socket.end(`HTTP/1.1 ${status}\r\nconnection: close\r\ncontent-length: 0\r\n\r\n`);
  };

  http.on('upgrade', (req, socket, head) => {
    socket.on('error', () => socket.destroy());
    const path = (req.url ?? '').split('?')[0];
    if (path !== '/api/ws') return refuse(socket, '404 Not Found');
    if (!originOk(req)) return refuse(socket, '403 Forbidden');
    const ip = ipOf(req);
    if ((socketsByIp.get(ip) ?? 0) >= maxSocketsPerIp)
      return refuse(socket, '429 Too Many Requests');
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req, ip));
  });

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage, ip: string) => {
    clients.set(ws, null);
    alive.add(ws);
    socketsByIp.set(ip, (socketsByIp.get(ip) ?? 0) + 1);
    let window = { start: now(), count: 0 };

    ws.on('pong', () => alive.add(ws));
    ws.on('error', () => ws.terminate());

    ws.on('message', (data, isBinary) => {
      try {
        onMessage(data, isBinary);
      } catch (e) {
        // one bad message ends nothing but itself
        console.error('message failed', e);
        send(ws, { t: 'error', error: 'server' });
      }
    });

    const onMessage = (data: RawData, isBinary: boolean) => {
      // a little patience, then the door. friends never send this much.
      const t = now();
      if (t - window.start > WINDOW_MS) window = { start: t, count: 0 };
      if (++window.count > MESSAGES_PER_WINDOW) return ws.close(1008, 'slow down');

      const msg = isBinary ? null : parseClientMessage(data.toString());
      if (!msg) return send(ws, { t: 'error', error: 'bad-message' });
      if (msg.t === 'ping') return send(ws, { t: 'pong' });

      if (msg.t === 'hello') {
        const code = normalizeCode(msg.code);
        if (!code || !rooms.has(code)) {
          // guessing codes, one after another, gets the door
          if (!misses.take(ip)) return ws.close(1008, 'slow down');
          return send(ws, { t: 'gone' });
        }
        const current = clients.get(ws);
        if (current && (current.code !== code || current.id !== msg.id)) {
          return send(ws, { t: 'error', error: 'already-in-a-room' });
        }
        const error = act(code, { type: 'join', id: msg.id, name: msg.name, now: t });
        if (error) return send(ws, { t: 'error', error });
        clients.set(ws, { code, id: msg.id });
        if (!sockets.has(code)) sockets.set(code, new Map());
        sockets.get(code)!.set(ws, msg.id);
        return broadcast(code);
      }

      const client = clients.get(ws);
      if (!client) return send(ws, { t: 'error', error: 'say-hello' });
      const { code, id } = client;

      let action: RoomAction;
      switch (msg.t) {
        case 'setup':
          action = { type: 'setup', by: id, game: msg.game, options: msg.options };
          break;
        case 'start':
          action = { type: 'start', by: id, seed: randomInt(2 ** 31), now: t };
          break;
        case 'move':
          action = { type: 'move', by: id, move: msg.move, now: t };
          break;
        case 'lobby':
          action = { type: 'lobby', by: id };
          break;
        case 'takeback':
          action = { type: 'takeback', by: id };
          break;
        case 'answer':
          action = { type: 'answer', by: id, accept: msg.accept };
          break;
        case 'leave':
          unbind(ws);
          action = { type: 'leave', id };
          break;
      }
      const error = act(code, action);
      if (error) send(ws, { t: 'error', error });
    };

    ws.on('close', () => {
      const left = (socketsByIp.get(ip) ?? 1) - 1;
      if (left > 0) socketsByIp.set(ip, left);
      else socketsByIp.delete(ip);
      const client = unbind(ws);
      clients.delete(ws);
      // the seat is held while they find their way back (readme 5.3)
      if (client && rooms.get(client.code)?.seats.some((s) => s.id === client.id)) {
        if (!stillConnected(client.code, client.id)) {
          act(client.code, { type: 'disconnect', id: client.id, now: now() });
        }
      }
    });
  });

  /* sweeping: held seats, empty rooms, silent sockets --------------------- */

  const sweep = setInterval(() => {
    const t = now();
    for (const code of [...rooms.keys()]) {
      act(code, { type: 'tick', now: t });
      const since = emptySince.get(code);
      if (since !== undefined && t - since >= emptyRoomMs && !sockets.get(code)?.size) {
        rooms.delete(code);
        emptySince.delete(code);
        sockets.delete(code);
      }
    }
    // quick enough that turn clocks run out on the second
  }, options.sweepMs ?? 250);

  const tidy = setInterval(() => {
    creates.prune();
    misses.prune();
  }, 60_000);

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!alive.has(ws)) {
        ws.terminate();
        continue;
      }
      alive.delete(ws);
      ws.ping();
    }
  }, 30_000);

  return new Promise((resolve, reject) => {
    // a port already in use comes back as an error the caller can explain
    http.once('error', (e) => {
      clearInterval(sweep);
      clearInterval(heartbeat);
      clearInterval(tidy);
      reject(e);
    });
    http.listen(options.port, options.host ?? '127.0.0.1', () => {
      const { port } = http.address() as AddressInfo;
      resolve({
        port,
        close: () =>
          new Promise<void>((done) => {
            clearInterval(sweep);
            clearInterval(heartbeat);
            clearInterval(tidy);
            // "going away": the app reconnects quietly when the server is back
            for (const ws of wss.clients) ws.close(1001, 'restarting');
            wss.close();
            http.close(() => done());
            http.closeAllConnections();
            // anyone who didn't say goodbye in time is let go
            setTimeout(() => {
              for (const ws of wss.clients) ws.terminate();
            }, 1_000).unref();
          }),
      });
    });
  });
}
