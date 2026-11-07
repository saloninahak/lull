import {
  GAME_ACCENT,
  hangman,
  isError,
  MISSES,
  type HangmanState,
  type HangmanView,
  type Player,
} from '@lull/game-logic';
import { PillButton } from '../../components/PillButton';
import { copy } from '../../copy';
import { nudge } from '../../lib/nudge';
import { navigate } from '../../lib/router';
import { randomSeed, YOU } from '../../lib/solo';
import { usePassAndPlay } from '../../lib/usePassAndPlay';
import { BelowBoard, GameScreen } from '../game/GameScreen';
import { StatusLine } from '../game/StatusLine';
import { HangmanBoard } from './HangmanBoard';

/** on your own, the app sets the word. it's the setter seat, and never plays. */
const APP: Player = { id: 'lull', name: 'lull' };

function freshWord(): HangmanState {
  const start = hangman.init([APP, YOU], { seed: randomSeed() });
  const picked = hangman.apply(start, { type: 'random' }, APP.id);
  return isError(picked) ? start : picked;
}

/** hangman on your own: the app picks a word from the list, you guess it */
export default function HangmanScreen() {
  const game = usePassAndPlay(hangman, freshWord);
  const view = hangman.view!(game.state, YOU.id) as HangmanView;
  const over = view.phase !== 'guess';
  const again = () => game.restart(freshWord());

  const guess = (letter: string, el: Element | null) => {
    if (over || view.guessed.includes(letter)) return nudge(el);
    if (game.play({ type: 'guess', letter })) nudge(el);
  };

  // a hint shows a letter for a miss. never on the last one, so it can't hang you.
  const canHint = !over && view.misses < MISSES - 1;
  const hint = (el: Element) => {
    if (!canHint || game.play({ type: 'hint' })) nudge(el);
  };

  return (
    <GameScreen
      accent={GAME_ACCENT.hangman}
      rules="hangman"
      title={copy.games.hangman.title}
      subtitle={copy.solo.subtitle}
      options={
        <>
          <PillButton variant="ghost" onClick={again}>
            {copy.solo.newWord}
          </PillButton>
          <PillButton variant="ghost" onClick={() => navigate('/new?game=hangman')}>
            {copy.solo.withFriends}
          </PillButton>
        </>
      }
      onAgain={again}
    >
      {over && view.last ? (
        <StatusLine
          big
          text={view.last.solved ? copy.solo.gotIt : copy.solo.outOfGuesses}
          sub={copy.hangman.wasWord(view.last.word)}
        />
      ) : (
        <StatusLine text={copy.solo.hangmanLine} />
      )}

      <HangmanBoard
        key={game.round}
        misses={view.misses}
        mask={view.mask}
        guessed={view.guessed}
        canGuess={!over}
        onGuess={guess}
      />

      <BelowBoard show={over ? 'again' : 'hint'}>
        {over ? (
          <PillButton variant="quiet" onClick={again}>
            {copy.solo.anotherWord}
          </PillButton>
        ) : (
          <PillButton
            variant="ghost"
            aria-disabled={!canHint}
            className={canHint ? undefined : 'opacity-40'}
            onClick={(e) => hint(e.currentTarget)}
          >
            {canHint ? copy.solo.hintCostsMiss : copy.solo.noHintsLeft}
          </PillButton>
        )}
      </BelowBoard>
    </GameScreen>
  );
}
