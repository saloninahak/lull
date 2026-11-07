import { useState } from 'react';
import {
  GAME_ACCENT,
  WHEEL_SIZES,
  wordwheel,
  type WheelSize,
  type WordWheelView,
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
import { WordWheelBoard } from './WordWheelBoard';

const LETTERS = copy.options.letters!;
const SIZES = WHEEL_SIZES.map((value) => ({
  value,
  label: LETTERS.values[value] ?? String(value),
}));

const fresh = (letters: WheelSize) => wordwheel.init([YOU], { letters, seed: randomSeed() });

/** word wheel on your own: a fresh wheel every time, and a hint that shows one letter */
export default function WordWheelScreen() {
  const [size, setSize] = useState<WheelSize>(6);
  const game = usePassAndPlay(wordwheel, () => fresh(6));
  const view = wordwheel.view!(game.state, YOU.id) as WordWheelView;
  const solved = game.status.over;
  const hints = view.hinted.length;
  const left = view.slots.filter((s) => !s.done).length;

  const again = (s: WheelSize = size) => game.restart(fresh(s));

  return (
    <GameScreen
      accent={GAME_ACCENT.wordwheel}
      rules="wordwheel"
      title={copy.games.wordwheel.title}
      subtitle={copy.solo.subtitle}
      options={
        <>
          <Segmented
            label={LETTERS.label}
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
          <PillButton variant="ghost" onClick={() => navigate('/new?game=wordwheel')}>
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
        <StatusLine text={copy.wordwheel.left(left)} />
      )}

      <WordWheelBoard
        key={game.round}
        view={view}
        editable={!solved}
        onWord={(word, el) => {
          if (game.play({ type: 'word', word }, YOU.id)) nudge(el);
        }}
      />

      <BelowBoard show={solved ? 'again' : 'hint'}>
        {solved ? (
          <PillButton variant="quiet" onClick={() => again()}>
            {copy.solo.another}
          </PillButton>
        ) : (
          <PillButton
            variant="ghost"
            onClick={(e) => {
              if (game.play({ type: 'hint' }, YOU.id)) nudge(e.currentTarget);
            }}
          >
            {copy.solo.hint}
          </PillButton>
        )}
      </BelowBoard>
    </GameScreen>
  );
}
