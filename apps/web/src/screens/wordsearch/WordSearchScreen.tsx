import { useState } from 'react';
import {
  GAME_ACCENT,
  wordsearch,
  wordSearchHint,
  WORDSEARCH_SIZES,
  type WordSearchSize,
  type WordSearchView,
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
import { WordSearchBoard } from './WordSearchBoard';

const SIZES = WORDSEARCH_SIZES.map((value) => ({
  value,
  label: copy.options.size?.values[value] ?? `${value}×${value}`,
}));

const fresh = (size: WordSearchSize) => wordsearch.init([YOU], { size, seed: randomSeed() });

/** word search on your own: a new grid every time, and a hint that points at a word */
export default function WordSearchScreen() {
  const [size, setSize] = useState<WordSearchSize>(10);
  const [hintCell, setHintCell] = useState<number | null>(null);
  const [hints, setHints] = useState(0);
  const game = usePassAndPlay(wordsearch, () => fresh(10));
  const view = wordsearch.view!(game.state, YOU.id) as WordSearchView;
  const found = view.found ?? [];
  const solved = game.status.over;

  const again = (s = size) => {
    setHintCell(null);
    setHints(0);
    game.restart(fresh(s));
  };

  const hint = (el: Element) => {
    const h = wordSearchHint(game.state, found);
    if (!h) return nudge(el);
    if (h.cell !== hintCell) setHints((n) => n + 1);
    setHintCell(h.cell);
  };

  return (
    <GameScreen
      accent={GAME_ACCENT.wordsearch}
      rules="wordsearch"
      title={copy.games.wordsearch.title}
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
          <PillButton variant="ghost" onClick={() => navigate('/new?game=wordsearch')}>
            {copy.solo.raceFriends}
          </PillButton>
        </>
      }
      onAgain={() => again()}
    >
      {solved ? (
        <StatusLine
          big
          text={copy.solo.solved}
          sub={hints ? copy.solo.withHints(hints) : copy.solo.solvedSub}
        />
      ) : (
        <StatusLine text={copy.wordsearch.left(view.words.length - found.length)} />
      )}

      <WordSearchBoard
        key={game.round}
        size={view.size}
        grid={view.grid}
        words={view.words}
        found={found}
        editable={!solved}
        hintCell={hintCell}
        onFind={(from, to, el) => {
          if (game.play({ type: 'find', from, to }, YOU.id)) nudge(el);
        }}
      />

      <BelowBoard show={solved ? 'again' : 'hint'}>
        {solved ? (
          <PillButton variant="quiet" onClick={() => again()}>
            {copy.solo.another}
          </PillButton>
        ) : (
          <PillButton variant="ghost" onClick={(e) => hint(e.currentTarget)}>
            {copy.solo.hint}
          </PillButton>
        )}
      </BelowBoard>
    </GameScreen>
  );
}
