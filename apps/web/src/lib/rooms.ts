import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, GameId, RoomView, ServerMessage } from '@lull/game-logic';
import { playerId } from './identity';

/**
 * talking to the room server. in development vite passes /api through to
 * it, so one address works from every pc on the network. when the server
 * lives elsewhere, VITE_ROOM_URL points at it.
 */

const base = import.meta.env.VITE_ROOM_URL?.trim().replace(/\/$/, '') ?? '';

function wsUrl(): string {
  const root = base || window.location.origin;
  return `${root.replace(/^http/, 'ws')}/api/ws`;
}

const pause = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

/**
 * the room server on a free host naps when nobody has played for a while,
 * and takes about a minute to wake. home calls this on arrival, so by the
 * time someone has picked a game and typed a name, it's mostly awake.
 * one quiet request, once per visit. nothing happens with the answer.
 */
let woken = false;
export function wakeRooms(): void {
  if (woken || !base) return;
  woken = true;
  // read the (tiny) answer, so the request is finished rather than left hanging
  fetch(`${base}/api/health`, { cache: 'no-store' })
    .then((res) => res.text())
    .catch(() => {});
}

export async function createRoom(
  game: GameId,
  options: Record<string, string | number> = {},
  signal?: AbortSignal,
): Promise<string | null> {
  // while the server wakes, its host can answer with a gateway error or not
  // at all. keep trying quietly for a while, then give up (or stop when cancelled).
  const until = Date.now() + 90_000;
  for (;;) {
    if (signal?.aborted) return null;
    try {
      const res = await fetch(`${base}/api/rooms`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ game, options }),
        signal,
      });
      if (res.ok) {
        const body = (await res.json()) as { code?: unknown };
        return typeof body.code === 'string' ? body.code : null;
      }
      // our own refusals are answers. the host's gateway errors mean "not yet".
      if (![502, 504].includes(res.status)) return null;
    } catch {
      // not up yet
    }
    if (Date.now() > until) return null;
    await pause(3_000);
  }
}

export type Connection = 'connecting' | 'open' | 'reconnecting' | 'lost' | 'gone';
export type Send = (msg: ClientMessage) => void;
export type Refusal = { error: string; n: number } | null;

/**
 * be in a room: connect, say hello, keep the latest view, and quietly
 * reconnect if the line drops. the server holds the seat meanwhile.
 */
export function useRoom(code: string, name: string | null) {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [connection, setConnection] = useState<Connection>('connecting');
  const [refusal, setRefusal] = useState<Refusal>(null);
  /** server time minus ours, so countdowns agree on every pc */
  const [offset, setOffset] = useState(0);
  const socket = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!name) return;
    let stopped = false;
    let attempt = 0;
    let retry: number | undefined;

    const open = () => {
      const ws = new WebSocket(wsUrl());
      socket.current = ws;
      ws.onopen = () => {
        attempt = 0;
        setConnection('open');
        const hello: ClientMessage = { t: 'hello', code, id: playerId(), name };
        ws.send(JSON.stringify(hello));
      };
      ws.onmessage = (event) => {
        let msg: ServerMessage;
        try {
          msg = JSON.parse(String(event.data)) as ServerMessage;
        } catch {
          return;
        }
        if (msg.t === 'room') {
          setRoom(msg.room);
          if (msg.room.now) setOffset(msg.room.now - Date.now());
        } else if (msg.t === 'gone') {
          stopped = true;
          setConnection('gone');
          ws.close();
        } else if (msg.t === 'error') {
          setRefusal((prev) => ({ error: msg.error, n: (prev?.n ?? 0) + 1 }));
        }
      };
      ws.onclose = () => {
        if (stopped) return;
        setConnection('reconnecting');
        // after 3 minutes of failed reconnects, stop trying and tell the user
        if (attempt >= 10) {
          stopped = true;
          setConnection('lost');
          return;
        }
        // exponential backoff, but never wait more than 8s
        retry = window.setTimeout(open, Math.min(8000, 400 * 2 ** attempt++));
      };
    };

    open();
    return () => {
      stopped = true;
      window.clearTimeout(retry);
      socket.current?.close();
      socket.current = null;
    };
  }, [code, name]);

  const send = useCallback<Send>((msg) => {
    const ws = socket.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  return { room, connection, refusal, offset, send };
}

/** seconds left until a deadline in server time, ticking softly */
export function useSecondsLeft(deadline: number | null, offset: number): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (deadline === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [deadline]);
  if (deadline === null) return null;
  // the offset comes from a message that took a moment to arrive, so it runs a
  // little behind. allowing 200ms for that keeps a 30s turn starting at 30, not 31.
  return Math.max(0, Math.ceil((deadline - (now + offset) - 200) / 1000));
}
