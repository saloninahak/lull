import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import React from 'react';
import {
  cleanName,
  GAME_ACCENT,
  GAME_OPTIONS,
  gameOf,
  normalizeCode,
  type RoomView,
} from '@lull/game-logic';
import { Card } from '../../components/Card';
import { PillButton } from '../../components/PillButton';
import { PlayerRow } from '../../components/PlayerRow';
import { Segmented } from '../../components/Segmented';
import { TextField } from '../../components/TextField';
import { copy } from '../../copy';
import { savedName, saveName } from '../../lib/identity';
import { nudge } from '../../lib/nudge';
import { ROOM_SCREENS } from '../../lib/ready';
import { navigate } from '../../lib/router';
import { useRoom, type Connection, type Send } from '../../lib/rooms';
import { GameScreen } from '../game/GameScreen';
import { seatViews, subtitleFor } from './seats';

/**
 * one room at /r/CODE: ask for a name if we don't have one, then the lobby
 * or the game. a shared link lands here directly (readme 5.1).
 */
export default function RoomScreen({ code: raw }: { code: string }) {
  const code = normalizeCode(raw);
  const [name, setName] = useState<string | null>(() => cleanName(savedName()));
  const { room, connection, refusal, offset, send } = useRoom(code ?? '', code ? name : null);

  if (!code) return <Quiet title={copy.room.joinTitle} line={copy.room.badCode} action={{ label: copy.room.tryCode, onClick: () => navigate('/join') }} />;
  if (!name) return <NameStep code={code} onName={setName} />;
  if (connection === 'lost') {
    return <Quiet title={copy.room.roomLabel(code)} line={copy.room.lostConnection} action={{ label: copy.room.tryAgain, onClick: () => window.location.reload() }} />;
  }
  if (connection === 'gone') {
    return <Quiet title={copy.room.roomLabel(code)} line={copy.room.gone(code)} action={{ label: copy.room.tryCode, onClick: () => navigate('/join') }} />;
  }
  if (!room) {
    return <Joining code={code} full={refusal?.error === 'full'} />;
  }
  const Screen = ROOM_SCREENS[room.game];
  if (!Screen) return <Quiet title={copy.games[room.game].title} line={copy.room.comingSoon} />;
  if (room.match) {
    return (
      <Suspense fallback={null}>
        <Screen
          key={room.match.round}
          room={room}
          connection={connection}
          send={send}
          offset={offset}
          refusal={refusal}
        />
      </Suspense>
    );
  }
  return <Lobby room={room} connection={connection} send={send} />;
}

/* the lobby (readme 3.2): one centered surface, the code, the dots, one pill */

function Lobby({ room, connection, send }: { room: RoomView; connection: Connection; send: Send }) {
  const isHost = room.host === room.you;
  const game = gameOf(room.game);
  const present = room.seats.filter((s) => s.connected).length;
  const enough = present >= Math.max(game.minPlayers, 1);
  const hostName = room.seats.find((s) => s.id === room.host)?.name ?? '';
  const hostConnected = room.seats.find((s) => s.id === room.host)?.connected ?? false;
  const anyAway = room.seats.some((s) => !s.connected);

  // state (not refs) so the lobby can notice what changed since it opened:
  // a game that ended, and host duties that just came to you
  const [hadMatch, setHadMatch] = useState(false);
  if (room.match && !hadMatch) setHadMatch(true);
  const returnedFromGame = hadMatch && !room.match && !room.note;

  const [prevHost, setPrevHost] = useState(room.host);
  const [becameHost, setBecameHost] = useState(false);
  if (prevHost !== room.host) {
    setPrevHost(room.host);
    if (room.host === room.you) setBecameHost(true);
  }

  const seats = seatViews(room).map((s) => ({
    ...s,
    caption: s.id === room.you ? copy.room.you : s.away ? copy.room.away : s.name,
  }));

  const line =
    connection === 'reconnecting' || connection === 'lost'
      ? connection === 'lost' ? copy.room.lost : copy.room.reconnecting
      : !enough
        ? copy.room.waiting
        : present > game.maxPlayers
          ? copy.room.takesTurns(game.maxPlayers)
          : isHost
            ? copy.room.ready
            : !hostConnected
              ? copy.room.hostAway(hostName)
              : copy.room.hostStarts(hostName);

  const specs = GAME_OPTIONS[room.game];

  return (
    <GameScreen
      accent={GAME_ACCENT[room.game]}
      title={copy.games[room.game].title}
      subtitle={subtitleFor(room, connection)}
      rules={room.game}
    >
      <Card className="flex w-full max-w-[380px] flex-col items-center px-8 pt-9 pb-10 text-center">

        {/* banners: one at a time, in priority order */}
        {room.note ? (
          <Notice kind="info">
            <p className="text-sm font-medium text-ink">{copy.room.leftMidGame(room.note.name)}</p>
            <p className="meta mt-0.5">{copy.room.startNewGame}</p>
          </Notice>
        ) : becameHost ? (
          <Notice kind="info">
            <p className="text-sm font-medium text-ink">{copy.room.youAreHost}</p>
            <p className="meta mt-0.5">{copy.room.hostLeft}</p>
          </Notice>
        ) : returnedFromGame && !isHost ? (
          <Notice kind="info">
            <p className="text-sm font-medium text-ink">{copy.room.hostEndedGame}</p>
            <p className="meta mt-0.5">{hostConnected ? copy.room.hostStarts(hostName) : copy.room.hostAway(hostName)}</p>
          </Notice>
        ) : returnedFromGame && isHost ? (
          <Notice kind="info">
            <p className="text-sm font-medium text-ink">{copy.room.backInLobby}</p>
            <p className="meta mt-0.5">{enough ? copy.room.ready : copy.room.waiting}</p>
          </Notice>
        ) : anyAway ? (
          <Notice kind="muted">
            <p className="meta">{copy.room.someAway}</p>
          </Notice>
        ) : null}

        <p className="meta">{copy.room.code}</p>
        <p
          className="display mt-3 text-[56px] tracking-[0.08em] select-all"
          aria-label={[...room.code].join(' ')}
        >
          {room.code}
        </p>
        <ShareButton code={room.code} />
        <div className="mt-9">
          <PlayerRow seats={seats} compact={seats.length > 4} />
        </div>

        {specs.length > 0 ? (
          <div className="mt-8 flex flex-col items-center gap-2">
            {specs.map((spec) => {
              const words = copy.options[spec.key];
              const value = room.options[spec.key] ?? spec.initial;
              const label = (v: string | number) => words?.values[String(v)] ?? String(v);
              return isHost ? (
                <Segmented
                  key={spec.key}
                  label={words?.label ?? spec.key}
                  options={spec.values.map((v) => ({ value: v, label: label(v) }))}
                  value={value}
                  onChange={(v) =>
                    send({
                      t: 'setup',
                      game: room.game,
                      options: { ...room.options, [spec.key]: v },
                    })
                  }
                />
              ) : (
                <p key={spec.key} className="meta">
                  {label(value)}
                </p>
              );
            })}
          </div>
        ) : null}

        <p className="meta mt-7" aria-live="polite">
          {line}
        </p>
        {isHost ? (
          <PillButton
            className="mt-5 min-w-32"
            disabled={!enough}
            onClick={() => send({ t: 'start' })}
          >
            {copy.room.begin}
          </PillButton>
        ) : null}
      </Card>
    </GameScreen>
  );
}

/** a soft inline notice — info (slightly tinted) or muted (barely there) */
function Notice({ kind, children }: { kind: 'info' | 'muted'; children: React.ReactNode }) {
  return (
    <div className={`mb-6 w-full rounded-md px-4 py-3 ${kind === 'info' ? 'bg-paper-soft' : 'bg-paper-soft/60'}`}>
      {children}
    </div>
  );
}

/**
 * copy to the clipboard. the clipboard api only exists on https or
 * localhost, so on the office network's plain http address it falls back
 * to the old way: select a hidden field and copy.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the old way
  }
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  let ok: boolean;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  field.remove();
  return ok;
}

function ShareButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = `${window.location.origin}/r/${code}`;
    if (await copyText(url)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };
  return (
    <PillButton variant="ghost" className="mt-2" onClick={share}>
      {copied ? copy.room.copied : copy.room.share}
    </PillButton>
  );
}

/* small states ---------------------------------------------------------------- */

function NameStep({ code, onName }: { code: string; onName: (name: string) => void }) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = saveName(value);
    if (!clean) {
      nudge(ref.current);
      ref.current?.focus();
      return;
    }
    onName(clean);
  };
  return (
    <GameScreen title={copy.room.joinTitle} subtitle={copy.room.roomLabel(code)}>
      <form onSubmit={submit} className="flex w-full max-w-[320px] flex-col items-stretch gap-7">
        <TextField
          ref={ref}
          label={copy.room.yourName}
          placeholder={copy.room.namePlaceholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={16}
          autoComplete="nickname"
          enterKeyHint="go"
          autoFocus
          required
        />
        <PillButton type="submit">{copy.room.join}</PillButton>
      </form>
    </GameScreen>
  );
}

/** on the way in. a long wait is the room server waking up, so it says so. */
function Joining({ code, full }: { code: string; full: boolean }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), 4_000);
    return () => window.clearTimeout(t);
  }, []);

  if (full) {
    return (
      <GameScreen title={copy.room.roomLabel(code)} subtitle={copy.room.online}>
        <p className="meta text-center" aria-live="polite">{copy.room.full}</p>
        <p className="meta mt-1 text-center">{copy.room.fullHint}</p>
        <div className="mt-4 flex gap-2">
          <PillButton variant="quiet" onClick={() => window.location.reload()}>
            {copy.room.tryAgain}
          </PillButton>
          <PillButton variant="ghost" onClick={() => navigate('/')}>
            {copy.room.home}
          </PillButton>
        </div>
      </GameScreen>
    );
  }

  const line = slow ? copy.room.waking : copy.room.joining;
  return <Quiet title={copy.room.roomLabel(code)} line={line} />;
}

function Quiet({ title, line, action }: { title: string; line: string; action?: { label: string; onClick: () => void } }) {
  return (
    <GameScreen title={title} subtitle={copy.room.online}>
      <p className="meta text-center" aria-live="polite">
        {line}
      </p>
      <div className="mt-4 flex gap-2">
        {action ? (
          <PillButton variant="quiet" onClick={action.onClick}>
            {action.label}
          </PillButton>
        ) : null}
        <PillButton variant="ghost" onClick={() => navigate('/')}>
          {copy.room.home}
        </PillButton>
      </div>
    </GameScreen>
  );
}
