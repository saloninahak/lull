import { useState } from 'react';
import {
  GAME_ACCENT,
  sudoku,
  sudokuHint,
  SUDOKU_LEVELS,
  type SudokuLevel,
  type SudokuView,
} from '@lull/game-logic';
import { PillButton } from '../../components/PillButton';
import { Segmented } from '../../components/Segmented';
import { copy } from '../../copy';
import { navigate } from '../../lib/router';
import { randomSeed, YOU } from '../../lib/solo';
import { usePassAndPlay } from '../../lib/usePassAndPlay';
import { BelowBoard, GameScreen } from '../game/GameScreen';
import { StatusLine } from '../game/StatusLine';
import { SudokuBoard } from './SudokuBoard';

const LEVELS = SUDOKU_LEVELS.map((value) => ({ value, label: copy.sudoku.levels[value] }));

const fresh = (level: SudokuLevel) => sudoku.init([YOU], { level, seed: randomSeed() });

/** sudoku on your own: a new puzzle every time, notes, undo and hints, no clock */
export default function SudokuScreen() {
  const [level, setLevel] = useState<SudokuLevel>('easy');
  const [hints, setHints] = useState(0);
  const game = usePassAndPlay(sudoku, () => fresh('easy'));
  const view = sudoku.view!(game.state, YOU.id) as SudokuView;
  const solved = game.status.over;

  const again = (l = level) => {
    setHints(0);
    game.restart(fresh(l));
  };
  const changeLevel = (l: SudokuLevel) => {
    setLevel(l);
    again(l);
  };

  // the answer is on this pc anyway, so a hint simply fills one cell from it
  const hint = (chosen: number | null) => {
    const h = sudokuHint(game.state.puzzle, view.grid!, game.state.solution, chosen);
    if (!h || game.play({ type: 'set', cell: h.cell, digit: h.digit }, YOU.id)) return null;
    setHints((n) => n + 1);
    return h.cell;
  };

  return (
    <GameScreen
      accent={GAME_ACCENT.sudoku}
      rules="sudoku"
      title={copy.games.sudoku.title}
      subtitle={copy.solo.subtitle}
      options={
        <>
          <Segmented
            label={copy.sudoku.level}
            options={LEVELS}
            value={level}
            onChange={changeLevel}
          />
          <PillButton variant="ghost" onClick={() => again()}>
            {copy.solo.newPuzzle}
          </PillButton>
          <PillButton variant="ghost" onClick={() => navigate('/new?game=sudoku')}>
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
        <StatusLine text={copy.solo.sudokuLine} />
      )}

      <SudokuBoard
        key={game.round}
        puzzle={view.puzzle}
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
