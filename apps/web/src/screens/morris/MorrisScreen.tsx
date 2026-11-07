import { useState } from 'react';
import {
  counts,
  destinations,
  drawAvailable,
  morris,
  playerLook,
  removable as removableOf,
  stageOf,
  type Player,
  type Seat,
} from '@lull/game-logic';
import { PillButton } from '../../components/PillButton';
import { PlayerRow, type SeatView } from '../../components/PlayerRow';
import { copy } from '../../copy';
import { useGameSounds } from '../../lib/gameSounds';
import { nudge } from '../../lib/nudge';
import { navigate } from '../../lib/router';
import { play } from '../../lib/sound';
import { usePassAndPlay } from '../../lib/usePassAndPlay';
import { BelowBoard, GameScreen } from '../game/GameScreen';
import { StatusLine } from '../game/StatusLine';
import { MorrisBoard } from './MorrisBoard';

/** on one screen the players are a and b. a goes first. */
const PLAYERS: Player[] = [
  { id: 'a', name: 'a' },
  { id: 'b', name: 'b' },
];

const SEATS = [
  { name: 'a', ...playerLook('morris', 0) },
  { name: 'b', ...playerLook('morris', 1) },
] as const;

const fresh = () => morris.init(PLAYERS);

export default function MorrisScreen() {
  const game = usePassAndPlay(morris, fresh);
  const { state, status } = game;
  useGameSounds(status);
  const [picked, setPicked] = useState<number | null>(null);

  const turn = state.turn;
  const stage = stageOf(state, turn);
  const deciding = state.drawOffer !== null;
  const playing = !status.over && !deciding;

  // a pick only counts while it is still the mover's own piece and they are moving
  const selected =
    playing &&
    !state.removing &&
    stage !== 'placing' &&
    picked !== null &&
    state.board[picked] === turn
      ? picked
      : null;
  const targets = new Set(selected !== null ? destinations(state, selected) : []);
  const removable = new Set(playing ? removableOf(state) : []);

  const seatViews: SeatView[] = SEATS.map((s, i) => {
    const c = counts(state, i as Seat);
    return {
      id: s.name,
      ...s,
      caption: copy.morris.counts(c.inHand, c.onBoard, c.lost),
      captionLabel: copy.morris.countsLabel(s.name, c.inHand, c.onBoard, c.lost),
    };
  });

  const onPoint = (p: number, el: Element) => {
    if (!playing) return;
    if (state.removing) {
      if (game.play({ type: 'remove', at: p })) nudge(el);
      else play('chime'); // a piece taken after a mill
      return;
    }
    if (stage === 'placing') {
      if (game.play({ type: 'place', to: p })) nudge(el);
      // a move that makes a mill leaves you to remove a piece next
      else play(game.state.removing ? 'chime' : 'tick');
      return;
    }
    if (state.board[p] === turn) {
      setPicked(selected === p ? null : p);
      return;
    }
    if (selected !== null && state.board[p] === null) {
      const from = selected;
      if (game.play({ type: 'move', from, to: p })) nudge(el);
      else {
        setPicked(null);
        play(game.state.removing ? 'chime' : 'tick');
      }
      return;
    }
    nudge(el);
  };

  const again = () => {
    setPicked(null);
    game.restart(fresh());
  };
  const undo = () => {
    setPicked(null);
    game.undo();
  };

  const name = SEATS[turn].name;
  const line = state.removing
    ? copy.morris.remove(name)
    : stage === 'placing'
      ? copy.morris.place(name)
      : stage === 'flying'
        ? copy.morris.fly(name)
        : copy.morris.move(name);

  const below = status.over ? 'again' : deciding ? 'decide' : drawAvailable(state) ? 'offer' : null;

  return (
    <GameScreen
      accent="red"
      rules="morris"
      title={copy.games.morris.title}
      options={
        <PillButton variant="ghost" onClick={() => navigate('/new?game=morris')}>
          {copy.solo.withFriends}
        </PillButton>
      }
      canUndo={game.canUndo}
      onUndo={undo}
      onAgain={again}
    >
      <PlayerRow seats={seatViews} active={status.turn} winners={status.winner} />

      {status.winner ? (
        <StatusLine big text={copy.play.wins(status.winner)} sub={copy.play.goodGame} />
      ) : status.draw ? (
        <StatusLine big text={copy.play.draw} sub={copy.play.fairEnough} />
      ) : deciding ? (
        <StatusLine text={copy.morris.drawAsk(status.turn ?? '')} />
      ) : (
        <StatusLine text={line} />
      )}

      <MorrisBoard
        state={state}
        seats={SEATS}
        round={game.round}
        selected={selected}
        targets={targets}
        removable={removable}
        inert={!playing}
        onPoint={onPoint}
        onCancel={() => setPicked(null)}
      />

      <BelowBoard show={below}>
        {below === 'again' ? (
          <PillButton variant="quiet" onClick={again}>
            {copy.play.again}
          </PillButton>
        ) : below === 'decide' ? (
          <>
            <PillButton variant="quiet" onClick={() => game.play({ type: 'acceptDraw' })}>
              {copy.morris.accept}
            </PillButton>
            <PillButton variant="ghost" onClick={() => game.play({ type: 'declineDraw' })}>
              {copy.morris.decline}
            </PillButton>
          </>
        ) : below === 'offer' ? (
          <PillButton variant="ghost" onClick={() => game.play({ type: 'offerDraw' })}>
            {copy.morris.offerDraw}
          </PillButton>
        ) : null}
      </BelowBoard>
    </GameScreen>
  );
}
