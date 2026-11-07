import { useRef, useState, type FormEvent } from 'react';
import { HANGMAN_WORD_MAX, HANGMAN_WORD_MIN, type HangmanView } from '@lull/game-logic';
import { PillButton } from '../../components/PillButton';
import { TextField } from '../../components/TextField';
import { copy } from '../../copy';
import { nudge } from '../../lib/nudge';
import { OnlineFrame, useNames, type RoomGameProps } from '../rooms/OnlineFrame';
import { HangmanBoard } from './HangmanBoard';

/**
 * hangman. each round one person sets a word and everyone else takes turns
 * on a letter. a right letter scores one, finishing the word two more,
 * and six misses give the setter three.
 */
export default function HangmanRoom(props: RoomGameProps) {
  const { room, send } = props;
  const view = room.match!.view as HangmanView;
  const nameOf = useNames(room);
  const [secret, setSecret] = useState('');
  const field = useRef<HTMLInputElement>(null);

  const setterId = view.players[view.setter]!;
  const isSetter = setterId === room.you;
  const isGuesser = view.phase === 'guess' && view.guesser === room.you;
  const scoreOf = (id: string) => view.scores[view.players.indexOf(id)] ?? 0;

  const guess = (letter: string, el: Element | null) => {
    if (!isGuesser || view.guessed.includes(letter)) return nudge(el);
    send({ t: 'move', move: { type: 'guess', letter } });
  };

  const submitWord = (e: FormEvent) => {
    e.preventDefault();
    const word = secret.trim().toLowerCase();
    if (
      word.length < HANGMAN_WORD_MIN ||
      word.length > HANGMAN_WORD_MAX ||
      !/^[a-z]+$/.test(word)
    ) {
      nudge(field.current);
      field.current?.focus();
      return;
    }
    send({ t: 'move', move: { type: 'set', word } });
    setSecret('');
  };

  const line =
    view.phase === 'pick'
      ? isSetter
        ? copy.hangman.choose
        : copy.hangman.choosing(nameOf(setterId))
      : view.phase === 'reveal' && view.last
        ? view.last.solved && view.last.by
          ? `${copy.hangman.solvedBy(nameOf(view.last.by))}. ${copy.hangman.wasWord(view.last.word)}`
          : `${copy.hangman.hanged} ${copy.hangman.wasWord(view.last.word)}`
        : isGuesser
          ? copy.hangman.yourGuess
          : isSetter
            ? copy.hangman.youSet
            : copy.hangman.guessing(nameOf(view.guesser ?? undefined));

  const showBoard = view.phase === 'guess' || view.phase === 'reveal' || view.phase === 'done';

  return (
    <OnlineFrame
      {...props}
      line={line}
      below={
        view.phase !== 'done' ? (
          <p className="meta">
            {copy.hangman.setterLine(nameOf(setterId), view.setter + 1, view.players.length)}
          </p>
        ) : undefined
      }
      caption={(id) => String(scoreOf(id))}
      captionLabel={(id, name) => copy.room.score(name, scoreOf(id))}
    >
      <div className="flex w-full max-w-[620px] flex-col items-center">
        {view.phase === 'pick' ? (
          isSetter ? (
            <form
              onSubmit={submitWord}
              className="flex w-full max-w-[320px] flex-col items-stretch gap-4"
            >
              <TextField
                ref={field}
                label={copy.hangman.yourWord}
                placeholder={copy.hangman.wordPlaceholder}
                value={secret}
                onChange={(e) => setSecret(e.target.value.replace(/[^a-z]/gi, ''))}
                maxLength={HANGMAN_WORD_MAX}
                type="password"
                autoComplete="off"
                autoFocus
                enterKeyHint="done"
              />
              <PillButton type="submit">{copy.hangman.set}</PillButton>
              <PillButton
                variant="ghost"
                onClick={() => send({ t: 'move', move: { type: 'random' } })}
              >
                {copy.hangman.random}
              </PillButton>
            </form>
          ) : (
            <div className="flex h-[200px] items-center">
              <span className="meta">{copy.hangman.waitingWord}</span>
            </div>
          )
        ) : null}

        {showBoard ? (
          <HangmanBoard
            misses={view.misses}
            mask={view.mask}
            guessed={view.guessed}
            canGuess={isGuesser}
            onGuess={guess}
          />
        ) : null}
      </div>
    </OnlineFrame>
  );
}
