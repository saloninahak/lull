import { useEffect, useRef, useState, type FormEvent } from 'react';
import { GAME_ACCENT, type GameId } from '@lull/game-logic';
import { READY_ONLINE } from '../../lib/ready';
import { PillButton } from '../../components/PillButton';
import { TextField } from '../../components/TextField';
import { copy } from '../../copy';
import { savedName, saveName } from '../../lib/identity';
import { nudge } from '../../lib/nudge';
import { navigate } from '../../lib/router';
import { createRoom, wakeRooms } from '../../lib/rooms';
import { GameScreen } from '../game/GameScreen';

/** the game a card asked for, if any (`/new?game=tictactoe`) */
function gameFromUrl(): GameId | null {
  const wanted = new URLSearchParams(window.location.search).get('game');
  return READY_ONLINE.find((g) => g === wanted) ?? null;
}

/**
 * start a room (readme 5.1). from a game's card it's only your name and
 * one pill: the game is already chosen. from the dock's `start a room`,
 * with no game in mind yet, it asks which game first.
 */
export default function NewRoomScreen() {
  const [chosen] = useState(gameFromUrl);
  const [game, setGame] = useState<GameId>(chosen ?? READY_ONLINE[0]!);
  const [name, setName] = useState(savedName);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [waking, setWaking] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(wakeRooms, []);
  // leaving the screen stops any room still being made
  useEffect(() => () => abort.current?.abort(), []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = saveName(name);
    if (!clean) {
      nudge(nameRef.current);
      nameRef.current?.focus();
      return;
    }
    setBusy(true);
    setFailed(false);
    // a slow start is the server waking up. say so, once it's been a moment.
    const slow = window.setTimeout(() => setWaking(true), 3_000);
    const controller = new AbortController();
    abort.current = controller;
    const code = await createRoom(game, {}, controller.signal);
    window.clearTimeout(slow);
    setWaking(false);
    abort.current = null;
    if (controller.signal.aborted) {
      setBusy(false);
      return;
    }
    if (!code) {
      setBusy(false);
      setFailed(true);
      return;
    }
    // the form is done with. back from the room goes to wherever you were before it.
    navigate(`/r/${code}`, { replace: true });
  };

  return (
    <GameScreen
      accent={GAME_ACCENT[game]}
      title={chosen ? copy.games[chosen].title : copy.room.newTitle}
      subtitle={chosen ? copy.room.newTitle : copy.room.online}
      rules={chosen ?? undefined}
    >
      <form onSubmit={submit} className="flex w-full max-w-[320px] flex-col items-stretch gap-7">
        <TextField
          ref={nameRef}
          label={copy.room.yourName}
          placeholder={copy.room.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={16}
          autoComplete="nickname"
          enterKeyHint="go"
          autoFocus
          required
        />
        {chosen ? null : (
          <div className="flex flex-col gap-2">
            <p className="meta pl-4">{copy.room.game}</p>
            <div role="group" aria-label={copy.room.game} className="flex flex-wrap gap-2">
              {READY_ONLINE.map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={g === game}
                  onClick={() => setGame(g)}
                  className={
                    g === game
                      ? 'inline-flex h-11 items-center gap-2 rounded-pill border border-hairline bg-ink/[0.07] px-4 text-[14px] text-ink'
                      : 'inline-flex h-11 items-center gap-2 rounded-pill border border-hairline bg-surface px-4 text-[14px] text-muted transition-colors duration-200 hover:text-ink'
                  }
                >
                  {g === game ? (
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
                  ) : null}
                  {copy.games[g].title}
                </button>
              ))}
            </div>
          </div>
        )}
        <PillButton type="submit" disabled={busy} className="mt-1">
          {busy ? copy.room.starting : copy.room.start}
        </PillButton>
        <p role="alert" className="meta min-h-5 text-center">
          {failed ? copy.errors.generic : waking ? copy.room.waking : ''}
        </p>
        {busy && waking ? (
          <PillButton variant="ghost" onClick={() => abort.current?.abort()}>
            {copy.room.cancel}
          </PillButton>
        ) : null}
      </form>
    </GameScreen>
  );
}
