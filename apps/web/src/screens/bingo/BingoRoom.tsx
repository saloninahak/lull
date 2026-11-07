import { GAME_ACCENT, GOAL, type BingoView } from '@lull/game-logic';
import type { RoomGameProps } from '../rooms/OnlineFrame';
import { PillButton } from '../../components/PillButton';
import { PlayerRow } from '../../components/PlayerRow';
import { copy } from '../../copy';
import { nudge } from '../../lib/nudge';
import { BelowBoard, GameScreen } from '../game/GameScreen';
import { StatusLine } from '../game/StatusLine';
import { seatViews, subtitleFor } from '../rooms/seats';
import { BingoCard, CalledNumber, LetterCaption } from './BingoCard';

/**
 * online notebook bingo. the server sends this pc its own card and
 * nothing about anyone else's (readme 7.3), so there is nothing to hide.
 */
export default function BingoRoom({ room, connection, send }: RoomGameProps) {
  const match = room.match!;
  const view = match.view as BingoView;
  const { status } = match;
  const me = room.you;
  const isHost = room.host === me;

  const nameOf = (id: string) =>
    id === me ? copy.room.you : (room.seats.find((s) => s.id === id)?.name ?? '');
  const hostName = room.seats.find((s) => s.id === room.host)?.name ?? '';
  const myTurn = !status.over && status.turn === me;

  const seats = seatViews(room, match.players).map((s) => {
    const lines = Math.min(view.lineCounts[s.id] ?? 0, GOAL);
    return {
      ...s,
      caption: <LetterCaption lines={lines} />,
      captionLabel: copy.bingo.lines(s.name, lines),
    };
  });

  const turnLine = myTurn ? copy.room.yourTurn : copy.room.thinking(nameOf(status.turn ?? ''));

  const onNumber = (n: number, el: HTMLElement) => {
    if (!myTurn || view.called.includes(n)) {
      nudge(el);
      return;
    }
    send({ t: 'move', move: { type: 'call', number: n } });
  };

  const winners = status.winner ?? [];
  const result =
    winners.length === 1 && winners[0] === me
      ? copy.room.youWin
      : copy.play.wins(winners.map(nameOf));

  return (
    <GameScreen
      accent={GAME_ACCENT.bingo}
      rules="bingo"
      title={copy.games.bingo.title}
      subtitle={subtitleFor(room, connection)}
    >
      <PlayerRow
        seats={seats}
        active={status.turn}
        winners={status.winner}
        compact={seats.length > 4}
      />

      {status.winner ? (
        <StatusLine big text={result} sub={copy.play.goodGame} />
      ) : status.draw ? (
        <StatusLine big text={copy.play.draw} sub={copy.play.fairEnough} />
      ) : view.last ? (
        <CalledNumber
          number={view.last.number}
          sub={`${copy.bingo.calledBy(nameOf(view.last.by))} · ${turnLine}`}
        />
      ) : (
        <StatusLine text={myTurn ? copy.bingo.yourCall : turnLine} />
      )}

      {view.card ? (
        <BingoCard
          key={match.round}
          card={view.card}
          called={view.called}
          lines={view.myLines}
          newLines={view.last?.myNewLines ?? []}
          lastNumber={view.last?.number ?? null}
          interactive={myTurn}
          onNumber={onNumber}
        />
      ) : (
        <p className="meta max-w-[28ch] text-center">{copy.bingo.watching}</p>
      )}

      <BelowBoard show={status.over ? 'again' : view.called.length > 0 ? 'recent' : null}>
        {status.over ? (
          isHost ? (
            <>
              <PillButton variant="quiet" onClick={() => send({ t: 'start' })}>
                {copy.play.again}
              </PillButton>
              <PillButton variant="ghost" onClick={() => send({ t: 'lobby' })}>
                {copy.room.backToLobby}
              </PillButton>
            </>
          ) : (
            <p className="meta">{copy.room.hostNext(hostName)}</p>
          )
        ) : (
          <p className="meta flex items-center gap-3 font-mono tabular-nums">
            <span className="sr-only">{copy.bingo.recent}</span>
            {view.called
              .slice(-5)
              .reverse()
              .map((n, i) => (
                <span key={n} className={i === 0 ? 'text-ink' : undefined}>
                  {n}
                </span>
              ))}
          </p>
        )}
      </BelowBoard>
    </GameScreen>
  );
}
