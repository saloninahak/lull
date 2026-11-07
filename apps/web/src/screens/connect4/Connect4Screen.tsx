import { connect4, landingRow, playerLook, type Player } from '@lull/game-logic';
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
import { Connect4Board } from './Connect4Board';

/** on one screen the players are 1 and 2. 1 goes first. */
const PLAYERS: Player[] = [
  { id: '1', name: '1' },
  { id: '2', name: '2' },
];

const LOOKS = [playerLook('connect4', 0), playerLook('connect4', 1)] as const;
const COLORS = [LOOKS[0].color, LOOKS[1].color] as const;

const fresh = () => connect4.init(PLAYERS);

export default function Connect4Screen() {
  const game = usePassAndPlay(connect4, fresh);
  const { state, status } = game;
  useGameSounds(status);

  const again = () => game.restart(fresh());

  const seats: SeatView[] = PLAYERS.map((p, i) => ({ ...p, ...LOOKS[i]! }));

  // whose seat index is it? 0 = player 1, 1 = player 2
  const activeSeat = status.over
    ? null
    : (PLAYERS.findIndex((p) => p.id === status.turn) as 0 | 1);

  const name = (id: string | undefined) => PLAYERS.find((p) => p.id === id)?.name ?? '';

  return (
    <GameScreen
      accent="red"
      rules="connect4"
      title={copy.games.connect4.title}
      options={
        <PillButton variant="ghost" onClick={() => navigate('/new?game=connect4')}>
          {copy.solo.withFriends}
        </PillButton>
      }
      canUndo={game.canUndo}
      onUndo={game.undo}
      onAgain={again}
    >
      <PlayerRow seats={seats} active={status.turn} winners={status.winner} />

      {status.winner ? (
        <StatusLine big text={copy.play.wins(status.winner.map(name))} sub={copy.play.goodGame} />
      ) : status.draw ? (
        <StatusLine big text={copy.play.draw} sub={copy.play.fairEnough} />
      ) : (
        <StatusLine text={copy.play.turn(name(status.turn))} />
      )}

      <Connect4Board
        key={game.round}
        state={state}
        colors={COLORS}
        ghost={activeSeat}
        onColumn={(col, el) => {
          if (status.over || landingRow(state.board, col) < 0) return nudge(el);
          if (game.play({ col })) nudge(el);
          else play('tick');
        }}
      />

      <BelowBoard show={status.over ? 'again' : null}>
        <PillButton variant="quiet" onClick={again}>
          {copy.play.again}
        </PillButton>
      </BelowBoard>
    </GameScreen>
  );
}
