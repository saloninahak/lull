import { useState } from 'react';
import {
  futoshiki,
  futoshikiHint,
  FUTOSHIKI_SIZES,
  GAME_ACCENT,
  type FutoshikiSize,
  type FutoshikiView,
} from '@lull/game-logic';
import { PillButton } from '../../components/PillButton';
import { Segmented } from '../../components/Segmented';
import { copy } from '../../copy';
import { navigate } from '../../lib/router';
import { randomSeed, YOU } from '../../lib/solo';
import { usePassAndPlay } from '../../lib/usePassAndPlay';
import { BelowBoard, GameScreen } from '../game/GameScreen';
import { StatusLine } from '../game/StatusLine';
import { FutoshikiBoard } from './FutoshikiBoard';

const SIZES = FUTOSHIKI_SIZES.map((value) => ({
  value,
  label: copy.options.size?.values[value] ?? `${value}×${value}`,
}));

const fresh = (size: FutoshikiSize) => futoshiki.init([YOU], { size, seed: randomSeed() });

/** futoshiki on your own: a new puzzle every time, notes, undo and hints */
export default function FutoshikiScreen() {
  const [size, setSize] = useState<FutoshikiSize>(5);
  const [hints, setHints] = useState(0);
  const game = usePassAndPlay(futoshiki, () => fresh(5));
  const view = futoshiki.view!(game.state, YOU.id) as FutoshikiView;
  const solved = game.status.over;

  const again = (s = size) => {
    setHints(0);
    game.restart(fresh(s));
  };

  const hint = (chosen: number | null) => {
    const h = futoshikiHint(game.state, view.grid!, chosen);
    if (!h || game.play({ type: 'set', cell: h.cell, digit: h.digit }, YOU.id)) return null;
    setHints((n) => n + 1);
    return h.cell;
  };

  return (
    <GameScreen
      accent={GAME_ACCENT.futoshiki}
      rules="futoshiki"
      title={copy.games.futoshiki.title}
      subtitle={copy.solo.subtitle}
      options={
        <>
          <Segmented
            label={copy.zip.size}
            options={SIZES}
            value={size}
            onChange={(s) => {
              setSize(s);
              again(s);
            }}
          />
          <PillButton variant="ghost" onClick={() => again()}>
            {copy.solo.newPuzzle}
          </PillButton>
          <PillButton variant="ghost" onClick={() => navigate('/new?game=futoshiki')}>
            {copy.solo.raceFriends}
          </PillButton>
        </>
      }
      canUndo={game.canUndo}
      onUndo={game.undo}
      onAgain={() => again()}
    >
      {solved ? (
        <StatusLine
          big
          text={copy.solo.solved}
          sub={hints ? copy.solo.withHints(hints) : copy.solo.solvedSub}
        />
      ) : (
        <StatusLine text={copy.futoshiki.line(view.size)} />
      )}

      <FutoshikiBoard
        key={game.round}
        size={view.size}
        puzzle={view.puzzle}
        right={view.right}
        below={view.below}
        grid={view.grid}
        solution={view.solution}
        onSet={(cell, digit) => game.play({ type: 'set', cell, digit }, YOU.id)}
        onHint={hint}
      />

      <BelowBoard show={solved ? 'again' : null}>
        <PillButton variant="quiet" onClick={() => again()}>
          {copy.solo.another}
        </PillButton>
      </BelowBoard>
    </GameScreen>
  );
}
