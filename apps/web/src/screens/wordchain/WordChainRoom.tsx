import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CHAIN_WORD_MAX, CHAIN_WORD_MIN, cleanWord, type WordChainState } from '@lull/game-logic';
import { PillButton } from '../../components/PillButton';
import { TextField } from '../../components/TextField';
import { copy } from '../../copy';
import { reveal, settle } from '../../lib/motion';
import { nudge } from '../../lib/nudge';
import { ClockLine, OnlineFrame, useNames, type RoomGameProps } from '../rooms/OnlineFrame';

/** what's wrong with a word before it goes anywhere, or null */
function check(state: WordChainState, word: string): string | null {
  if (word.length < CHAIN_WORD_MIN || word.length > CHAIN_WORD_MAX || !/^[a-z]+$/.test(word)) {
    return 'bad-word';
  }
  if (word[0] !== state.letter) return 'wrong-letter';
  if (state.words.some((w) => w.word === word)) return 'used';
  return null;
}

/**
 * word chain. one big letter to start from, a quiet clock, and the chain
 * so far underneath. there's no dictionary: the room keeps itself honest.
 */
export default function WordChainRoom(props: RoomGameProps) {
  const { room, send, offset, refusal } = props;
  const match = room.match!;
  const state = match.view as WordChainState;
  const nameOf = useNames(room);
  const [word, setWord] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  // refusals from before this screen, or already read, stay quiet
  const [seen, setSeen] = useState(refusal?.n ?? 0);
  const input = useRef<HTMLInputElement>(null);
  const fromServer =
    refusal && refusal.n !== seen && refusal.error in copy.wordchain.bad ? refusal.error : null;
  const shown = problem ?? fromServer;

  const playing = state.alive.includes(room.you);
  const myTurn = !match.status.over && state.turn === room.you;

  // the field is ready the moment it's your go
  useEffect(() => {
    if (myTurn) input.current?.focus();
  }, [myTurn]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!myTurn) return nudge(input.current);
    const clean = cleanWord(word);
    const wrong = check(state, clean);
    if (wrong) {
      setProblem(wrong);
      nudge(input.current);
      return;
    }
    send({ t: 'move', move: { type: 'word', word: clean } });
    setWord('');
    setProblem(null);
    setSeen(refusal?.n ?? 0);
  };

  const lineText = myTurn
    ? copy.room.yourTurn
    : !room.match!.players.includes(room.you)
      ? copy.room.watchingRound
      : !playing
        ? copy.wordchain.youreOut
        : copy.room.thinking(nameOf(state.turn));

  const recent = state.words.slice(-6);
  const outOf = (id: string) => state.out.some((o) => o.id === id);

  return (
    <OnlineFrame
      {...props}
      line={<ClockLine text={lineText} deadline={state.deadline} offset={offset} />}
      below={<p className="meta">{copy.wordchain.wordCount(state.words.length)}</p>}
      caption={(id) =>
        outOf(id) ? copy.wordchain.out : String(state.words.filter((w) => w.by === id).length)
      }
      captionLabel={(id, name) =>
        outOf(id)
          ? `${name}, ${copy.wordchain.out}`
          : copy.wordchain.saidBy(name, state.words.filter((w) => w.by === id).length)
      }
    >
      <div className="flex w-full max-w-[360px] flex-col items-center">
        <p className="meta">{copy.wordchain.startsWith}</p>
        <div className="relative mt-2 flex h-[88px] items-center justify-center" aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={`${state.words.length}-${state.letter}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.14 } }}
              transition={settle}
              className="display block text-[80px] text-accent"
            >
              {state.letter}
            </motion.span>
          </AnimatePresence>
        </div>

        <ol
          aria-label={copy.wordchain.chain}
          className="mt-5 flex min-h-6 max-w-full flex-wrap items-baseline justify-center gap-x-3 gap-y-1 font-mono text-[13px]"
        >
          {recent.map((w, i) => {
            const newest = i === recent.length - 1;
            return (
              <motion.li
                key={`${state.words.length - recent.length + i}-${w.word}`}
                initial={newest ? { opacity: 0, y: 4 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={reveal}
                className={newest ? 'text-ink' : 'text-muted'}
                title={nameOf(w.by)}
              >
                {w.word.slice(0, -1)}
                <span className={newest ? 'text-accent' : undefined}>{w.word.slice(-1)}</span>
              </motion.li>
            );
          })}
        </ol>

        {playing ? (
          <form onSubmit={submit} className="mt-8 flex w-full flex-col items-stretch gap-3">
            <TextField
              ref={input}
              label={copy.wordchain.yourWord}
              placeholder={myTurn ? copy.wordchain.placeholder(state.letter) : copy.wordchain.wait}
              value={word}
              onChange={(e) => {
                setWord(e.target.value);
                setProblem(null);
                setSeen(refusal?.n ?? 0);
              }}
              maxLength={CHAIN_WORD_MAX}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="send"
              disabled={!myTurn}
              hint={shown ? copy.wordchain.bad[shown] : undefined}
            />
            <PillButton type="submit" disabled={!myTurn || !word.trim()}>
              {copy.wordchain.send}
            </PillButton>
          </form>
        ) : null}
      </div>
    </OnlineFrame>
  );
}
