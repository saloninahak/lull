import { playerLook, sim, type Player } from '@lull/game-logic';
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
import { SimBoard } from './SimBoard';

/** on one screen the players are a and b. a goes first. */
const PLAYERS: Player[] = [
  { id: 'a', name: 'a' },
  { id: 'b', name: 'b' },
];
const LOOKS = [playerLook('sim', 0), playerLook('sim', 1)] as const;
const COLORS = [LOOKS[0].color, LOOKS[1].color] as const;

const fresh = () => sim.init(PLAYERS);

export default function SimScreen() {
  const game = usePassAndPlay(sim, fresh);
  const { state, status } = game;
  useGameSounds(status);
  const again = () => game.restart(fresh());

  const seats: SeatView[] = PLAYERS.map((p, i) => {
    const n = state.edges.filter((e) => e === i).length;
    return {
      ...p,
      ...LOOKS[i]!,
      caption: copy.sim.lines(n),
      captionLabel: `${p.name}, ${copy.sim.lines(n)}`,
    };
  });

  return (
    <GameScreen
      accent="amber"
      rules="sim"
      title={copy.games.sim.title}
      options={
        <PillButton variant="ghost" onClick={() => navigate('/new?game=sim')}>
          {copy.solo.withFriends}
        </PillButton>
      }
      canUndo={game.canUndo}
      onUndo={game.undo}
      onAgain={again}
    >
      <PlayerRow seats={seats} active={status.turn} winners={status.winner} />

      {status.winner ? (
        <StatusLine
          big
          text={copy.play.wins(status.winner)}
          sub={copy.sim.closed(PLAYERS[state.loser!]!.name)}
        />
      ) : (
        <StatusLine text={copy.play.turn(status.turn ?? '')} />
      )}

      <SimBoard
        key={game.round}
        state={state}
        colors={COLORS}
        round={game.round}
        mover={status.over ? null : state.turn}
        onEdge={(edge, el) => {
          if (edge < 0 || game.play({ edge })) nudge(el);
          else play('line');
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
