import { useState } from 'react';
import { playerLook, tictactoe, type Player, type TicTacToeVariant } from '@lull/game-logic';
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
import { TicTacToeBoard } from './TicTacToeBoard';

/** on one screen the players are simply x and o. x goes first. */
const PLAYERS: Player[] = [
  { id: 'x', name: 'x' },
  { id: 'o', name: 'o' },
];

const SEATS: SeatView[] = PLAYERS.map((p, i) => ({ ...p, ...playerLook('tictactoe', i) }));

const VARIANTS: ReadonlyArray<{ value: TicTacToeVariant; label: string }> = [
  { value: 'classic', label: copy.tictactoe.sizes.classic },
  { value: 'five', label: copy.tictactoe.sizes.five },
];

const fresh = (variant: TicTacToeVariant) => tictactoe.init(PLAYERS, { variant });

export default function TicTacToeScreen() {
  const [variant, setVariant] = useState<TicTacToeVariant>('classic');
  const game = usePassAndPlay(tictactoe, () => fresh('classic'));
  const { state, status } = game;
  useGameSounds(status);

  const again = () => game.restart(fresh(variant));
  const changeVariant = (v: TicTacToeVariant) => {
    setVariant(v);
    game.restart(fresh(v));
  };

  const onCell = (cell: number, el: HTMLElement) => {
    if (status.over) return;
    if (game.play({ cell })) nudge(el);
    else play('tick');
  };

  const name = (id: string | undefined) => PLAYERS.find((p) => p.id === id)?.name ?? '';

  return (
    <GameScreen
      accent="blue"
      rules="tictactoe"
      title={copy.games.tictactoe.title}
      options={
        <>
          <Segmented
            label={copy.tictactoe.size}
            options={VARIANTS}
            value={variant}
            onChange={changeVariant}
          />
          <PillButton variant="ghost" onClick={() => navigate('/new?game=tictactoe')}>
            {copy.solo.withFriends}
          </PillButton>
        </>
      }
      canUndo={game.canUndo}
      onUndo={game.undo}
      onAgain={again}
    >
      <PlayerRow seats={SEATS} active={status.turn} winners={status.winner} />

      {status.winner ? (
        <StatusLine big text={copy.play.wins(status.winner.map(name))} sub={copy.play.goodGame} />
      ) : status.draw ? (
        <StatusLine big text={copy.play.draw} sub={copy.play.fairEnough} />
      ) : (
        <StatusLine text={copy.play.turn(name(status.turn))} />
      )}

      <TicTacToeBoard key={state.size} state={state} round={game.round} onCell={onCell} />

      <BelowBoard show={status.over ? 'again' : null}>
        <PillButton variant="quiet" onClick={again}>
          {copy.play.again}
        </PillButton>
      </BelowBoard>
    </GameScreen>
  );
}
