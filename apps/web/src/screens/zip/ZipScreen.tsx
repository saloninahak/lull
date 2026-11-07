import { useMemo, useState } from 'react';
import {
  GAME_ACCENT,
  isError,
  randomFullPath,
  zip,
  zipHint,
  ZIP_SIZES,
  type ZipMove,
  type ZipSize,
  type ZipState,
  type ZipView,
} from '@lull/game-logic';
import { PillButton } from '../../components/PillButton';
import { Segmented } from '../../components/Segmented';
import { copy } from '../../copy';
import { nudge } from '../../lib/nudge';
import { navigate } from '../../lib/router';
import { randomSeed, YOU } from '../../lib/solo';
import { usePassAndPlay } from '../../lib/usePassAndPlay';
import { BelowBoard, GameScreen } from '../game/GameScreen';
import { StatusLine } from '../game/StatusLine';
import { ZipBoard } from './ZipBoard';

const SIZES = ZIP_SIZES.map((value) => ({ value, label: copy.zip.sizes[value] ?? `${value}` }));

/** on your own the seed stays here too, so a hint can follow the grid's own solution */
type Solo = { z: ZipState; seed: number };

const soloZip = {
  apply(s: Solo, move: ZipMove, by: string) {
    const r = zip.apply(s.z, move, by);
    return isError(r) ? r : { ...s, z: r };
  },
  status: (s: Solo) => zip.status(s.z),
};

const fresh = (size: ZipSize): Solo => {
  const seed = randomSeed();
  return { z: zip.init([YOU], { size, seed }), seed };
};

/** zip on your own: a new grid every time, undo a step, and hints */
export default function ZipScreen() {
  const [size, setSize] = useState<ZipSize>(6);
  const game = usePassAndPlay(soloZip, () => fresh(6));
  const view = zip.view!(game.state.z, YOU.id) as ZipView;
  const [draft, setDraft] = useState<number[]>([]);
  const [hints, setHints] = useState(0);
  const [pulledBack, setPulledBack] = useState(false);
  const solved = game.status.over;
  const solution = useMemo(
    () => randomFullPath(game.state.z.size, game.state.seed),
    [game.state.z.size, game.state.seed],
  );

  const restart = (s: ZipSize) => {
    setDraft([]);
    setHints(0);
    setPulledBack(false);
    game.restart(fresh(s));
  };
  const changeSize = (s: ZipSize) => {
    setSize(s);
    restart(s);
  };

  const commit = (cells: number[]) => {
    setDraft(cells);
    setPulledBack(false);
    // the board only builds fair lines, but if the rules say no, go back to the last good one
    if (game.play({ type: 'path', cells }, YOU.id)) setDraft(view.path ?? []);
  };

  const undo = (el?: Element | null) => {
    if (draft.length === 0) return nudge(el);
    commit(draft.slice(0, -1));
  };

  const hint = () => {
    const h = zipHint(solution, draft);
    commit(h.cells);
    setPulledBack(h.back);
    setHints((n) => n + 1);
  };

  return (
    <GameScreen
      accent={GAME_ACCENT.zip}
      rules="zip"
      title={copy.games.zip.title}
      subtitle={copy.solo.subtitle}
      options={
        <>
          <Segmented label={copy.zip.size} options={SIZES} value={size} onChange={changeSize} />
          <PillButton variant="ghost" onClick={() => restart(size)}>
            {copy.solo.newPuzzle}
          </PillButton>
          <PillButton variant="ghost" onClick={() => navigate('/new?game=zip')}>
            {copy.solo.raceFriends}
          </PillButton>
        </>
      }
      canUndo={draft.length > 0 && !solved}
      onUndo={() => undo()}
      onAgain={() => restart(size)}
    >
      {solved ? (
        <StatusLine
          big
          text={copy.solo.solved}
          sub={hints ? copy.solo.withHints(hints) : copy.solo.solvedSub}
        />
      ) : (
        <StatusLine text={pulledBack ? copy.solo.pulledBack : copy.zip.hint} />
      )}

      <ZipBoard
        key={game.round}
        size={view.size}
        numbers={view.numbers}
        path={draft}
        editable={!solved}
        onDraft={setDraft}
        onCommit={commit}
      />

      <BelowBoard show={solved ? 'again' : 'tools'}>
        {solved ? (
          <PillButton variant="quiet" onClick={() => restart(size)}>
            {copy.solo.another}
          </PillButton>
        ) : (
          <>
            <PillButton
              variant="ghost"
              disabled={draft.length === 0}
              onClick={(e) => undo(e.currentTarget)}
            >
              {copy.zip.undo}
            </PillButton>
            <PillButton variant="ghost" onClick={hint}>
              {copy.solo.hint}
            </PillButton>
            <PillButton variant="ghost" disabled={draft.length === 0} onClick={() => commit([])}>
              {copy.zip.reset}
            </PillButton>
          </>
        )}
      </BelowBoard>
    </GameScreen>
  );
}
