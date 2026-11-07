import type { ReactNode } from 'react';
import { GAME_ACCENT, TAKEBACK_GAMES, type RoomView } from '@lull/game-logic';
import { PillButton } from '../../components/PillButton';
import { PlayerRow, type SeatView } from '../../components/PlayerRow';
import { copy } from '../../copy';
import { useGameSounds } from '../../lib/gameSounds';
import { useSecondsLeft, type Connection, type Refusal, type Send } from '../../lib/rooms';
import { BelowBoard, GameScreen } from '../game/GameScreen';
import { StatusLine } from '../game/StatusLine';
import { seatViews, subtitleFor } from './seats';

export type RoomGameProps = {
  room: RoomView;
  connection: Connection;
  send: Send;
  /** server time minus ours, for countdowns */
  offset: number;
  /** the server's last "no" to this pc, counted so the same one twice still shows */
  refusal: Refusal;
};

/**
 * one line with a quiet clock beside it: "your turn  12". the seconds are
 * mono and muted, and turn to ink for the last five.
 */
export function ClockLine({
  text,
  deadline,
  offset,
}: {
  text: string;
  deadline: number | null;
  offset: number;
}) {
  const left = useSecondsLeft(deadline, offset);
  return (
    <div className="flex h-[76px] w-full items-center justify-center gap-3 text-center">
      <p className="sr-only" aria-live="polite">
        {text}
      </p>
      <span aria-hidden="true" className="text-sm tracking-[-0.005em]">
        {text}
      </span>
      {left !== null ? (
        <span
          aria-label={copy.room.secondsLeft(left)}
          className={`font-mono text-[13px] tabular-nums transition-colors duration-200 ${
            left <= 5 ? 'text-ink' : 'text-muted'
          }`}
        >
          {left}
        </span>
      ) : null}
    </div>
  );
}

type FrameProps = RoomGameProps & {
  /** small mono line under each player's dot */
  caption?: (id: string) => ReactNode;
  captionLabel?: (id: string, name: string) => string;
  /** the line while playing. defaults to "your turn" / "ana is thinking" */
  line?: ReactNode;
  /** something quiet under the board while playing (recent calls, a clock) */
  below?: ReactNode;
  /**
   * the dock's undo for games where your moves are your own (a puzzle race).
   * turn games use it to ask for a take back instead.
   */
  undo?: { can: boolean; run: () => void };
  children: ReactNode;
};

/** a player's name as this pc shows it: "you" for yourself */
export function useNames(room: RoomView) {
  return (id: string | undefined) =>
    id === room.you ? copy.room.you : (room.seats.find((s) => s.id === id)?.name ?? '');
}

/**
 * the frame every room game shares: the players, one line about what's
 * happening, the board, and at the end "again?" for the host.
 */
export function OnlineFrame({
  room,
  connection,
  send,
  caption,
  captionLabel,
  line,
  below,
  undo,
  children,
}: FrameProps) {
  const match = room.match!;
  const { status } = match;
  useGameSounds(status, room.you);
  const nameOf = useNames(room);
  const isHost = room.host === room.you;
  const hostName = room.seats.find((s) => s.id === room.host)?.name ?? '';

  const seats: SeatView[] = seatViews(room, match.players).map((s) => ({
    ...s,
    caption: caption ? caption(s.id) : undefined,
    captionLabel: captionLabel ? captionLabel(s.id, s.name) : undefined,
  }));

  const winners = status.winner ?? [];
  const hasWinner = winners.length > 0;
  const result =
    hasWinner && winners.length === 1 && winners[0] === room.you
      ? copy.room.youWin
      : hasWinner
        ? copy.play.wins(winners.map(nameOf))
        : copy.play.draw;

  const playingLine =
    line ??
    (status.turn === room.you ? copy.room.yourTurn : copy.room.thinking(nameOf(status.turn)));

  // taking a move back: the mover asks from the dock, the others answer here
  const takebackGame = TAKEBACK_GAMES.includes(room.game);
  const ask = match.takeback;
  const iAsked = ask?.by === room.you;
  const toAnswer = ask !== null && !iAsked && match.players.includes(room.you);

  const slot = status.over
    ? 'again'
    : toAnswer
      ? 'answer'
      : iAsked
        ? 'asked'
        : below
          ? 'below'
          : null;

  // host away at game-over: non-hosts need to know they can't start
  const hostConnected = room.seats.find((s) => s.id === room.host)?.connected ?? false;
  const isReconnecting = connection === 'reconnecting';

  return (
    <GameScreen
      accent={GAME_ACCENT[room.game]}
      title={copy.games[room.game].title}
      subtitle={subtitleFor(room, connection)}
      rules={room.game}
      {...(undo
        ? { onUndo: undo.run, canUndo: undo.can }
        : takebackGame
          ? {
              onUndo: () => send({ t: 'takeback' }),
              canUndo: match.canTakeBack,
              undoLabel: copy.room.askTakeBack,
            }
          : {})}
    >
      {/* reconnecting overlay: subtle top banner so the board stays visible */}
      {isReconnecting ? (
        <div className="w-full max-w-md rounded-md bg-paper-soft px-4 py-2 text-center mb-2">
          <p className="meta">{copy.room.reconnecting}</p>
        </div>
      ) : null}

      <PlayerRow
        seats={seats}
        active={status.over ? undefined : status.turn}
        winners={status.winner}
        compact={seats.length > 4}
      />

      {status.over && hasWinner ? (
        <StatusLine big text={result} sub={copy.play.goodGame} />
      ) : status.over && status.draw ? (
        <StatusLine big text={copy.play.draw} sub={copy.play.fairEnough} />
      ) : status.over ? (
        <StatusLine big text={copy.play.gameOver} sub={copy.play.goodGame} />
      ) : typeof playingLine === 'string' ? (
        <StatusLine text={playingLine} />
      ) : (
        <div className="flex min-h-[76px] w-full items-center justify-center">{playingLine}</div>
      )}

      {children}

      <BelowBoard show={slot}>
        {slot === 'again' ? (
          isHost ? (
            <>
              <PillButton variant="quiet" onClick={() => send({ t: 'start' })}>
                {copy.play.again}
              </PillButton>
              <PillButton variant="ghost" onClick={() => send({ t: 'lobby' })}>
                {copy.room.backToLobby}
              </PillButton>
            </>
          ) : !hostConnected ? (
            <p className="meta text-center">{copy.room.hostAway(hostName)}</p>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <p className="meta text-center">{copy.room.hostNext(hostName)}</p>
            </div>
          )
        ) : slot === 'answer' ? (
          <>
            <p className="meta w-full text-center">{copy.room.wantsTakeBack(nameOf(ask!.by))}</p>
            <PillButton variant="quiet" onClick={() => send({ t: 'answer', accept: true })}>
              {copy.room.letThem}
            </PillButton>
            <PillButton variant="ghost" onClick={() => send({ t: 'answer', accept: false })}>
              {copy.room.keepIt}
            </PillButton>
          </>
        ) : slot === 'asked' ? (
          <p className="meta">{copy.room.asked}</p>
        ) : (
          below
        )}
      </BelowBoard>
    </GameScreen>
  );
}

/** for anyone in the room who isn't in this round */
export function Watching() {
  return <p className="meta max-w-[30ch] text-center">{copy.room.watchingRound}</p>;
}
