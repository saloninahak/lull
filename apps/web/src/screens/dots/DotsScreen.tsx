import { useState } from 'react';
import { dots, playerLook, type DotsSize, type Player } from '@lull/game-logic';
import { PillButton } from '../../components/PillButton';
import { PlayerRow, type SeatView } from '../../components/PlayerRow';
import { Segmented } from '../../components/Segmented';
import { copy } from '../../copy';
import { useGameSounds } from '../../lib/gameSounds';
import { nudge } from '../../lib/nudge';
import { navigate } from '../../lib/router';
import { play } from '../../lib/sound';
import { usePassAndPlay } from '../../lib/usePassAndPlay';
import { BelowBoard, GameScreen } from '../game/GameScreen';
import { StatusLine } from '../game/StatusLine';
import { DotsBoard } from './DotsBoard';

/** on one screen the players are a, b, c and d, in turn order */
const NAMES = ['a', 'b', 'c', 'd'] as const;
type Count = 2 | 3 | 4;

const playersFor = (count: Count): Player[] =>
  NAMES.slice(0, count).map((name) => ({ id: name, name }));

const SIZES: ReadonlyArray<{ value: DotsSize; label: string }> = [
  { value: 4, label: copy.dots.sizes[4] },
  { value: 5, label: copy.dots.sizes[5] },
  { value: 6, label: copy.dots.sizes[6] },
];

const COUNTS: ReadonlyArray<{ value: Count; label: string }> = [
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
];

const fresh = (size: DotsSize, count: Count) => dots.init(playersFor(count), { size });

export default function DotsScreen() {
  const [size, setSize] = useState<DotsSize>(5);
  const [count, setCount] = useState<Count>(2);
  const game = usePassAndPlay(dots, () => fresh(5, 2));
  const { state, status } = game;
  useGameSounds(status);

  const seats = state.players.map((id, i) => ({ name: id, ...playerLook('dots', i) }));
  const seatViews: SeatView[] = seats.map((s, i) => ({
    id: s.name,
    ...s,
    caption: String(state.scores[i] ?? 0),
    captionLabel: copy.dots.score(s.name, state.scores[i] ?? 0),
  }));

  const again = () => game.restart(fresh(size, count));
  const changeSize = (v: DotsSize) => {
    setSize(v);
    game.restart(fresh(v, count));
  };
  const changeCount = (v: Count) => {
    setCount(v);
    game.restart(fresh(size, v));
  };

  const onEdge = (edge: number, el: Element | null) => {
    if (status.over) return;
    if (game.play({ edge })) return nudge(el);
    // a closed box chimes; a plain line gets the soft brush
    play((game.state.last?.claimed.length ?? 0) > 0 ? 'chime' : 'line');
  };

  // closing a box earns another go. say so, quietly.
  const lastBy = state.last ? state.edges[state.last.edge] : null;
  const goesAgain = !status.over && (state.last?.claimed.length ?? 0) > 0 && lastBy === state.turn;

  return (
    <GameScreen
      accent="amber"
      rules="dots"
      title={copy.games.dots.title}
      options={
        <>
          <Segmented label={copy.dots.size} options={SIZES} value={size} onChange={changeSize} />
          <Segmented
            label={copy.dots.players}
            options={COUNTS}
            value={count}
            onChange={changeCount}
          />
          <PillButton variant="ghost" onClick={() => navigate('/new?game=dots')}>
            {copy.solo.withFriends}
          </PillButton>
        </>
      }
      canUndo={game.canUndo}
      onUndo={game.undo}
      onAgain={again}
    >
      <PlayerRow seats={seatViews} active={status.turn} winners={status.winner} />

      {status.winner ? (
        <StatusLine big text={copy.play.wins(status.winner)} sub={copy.play.goodGame} />
      ) : status.draw ? (
        <StatusLine big text={copy.play.draw} sub={copy.play.fairEnough} />
      ) : goesAgain ? (
        <StatusLine text={copy.play.goesAgain(status.turn ?? '')} />
      ) : (
        <StatusLine text={copy.play.turn(status.turn ?? '')} />
      )}

      <DotsBoard
        key={`${state.size}-${state.players.length}`}
        state={state}
        seats={seats}
        round={game.round}
        onEdge={onEdge}
      />

      <BelowBoard show={status.over ? 'again' : null}>
        <PillButton variant="quiet" onClick={again}>
          {copy.play.again}
        </PillButton>
      </BelowBoard>
    </GameScreen>
  );
}
