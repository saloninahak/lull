import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { RPS_REVEAL_MS, THROWS, type RpsView, type Throw } from '@lull/game-logic';
// hand and object art: noto emoji 3d by google, apache 2.0 (see assets/rps/LICENSE)
import paperHand from '../../assets/rps/paper-hand.png';
import paperThing from '../../assets/rps/paper.png';
import rockHand from '../../assets/rps/rock-hand.png';
import rockThing from '../../assets/rps/rock.png';
import scissorsHand from '../../assets/rps/scissors-hand.png';
import scissorsThing from '../../assets/rps/scissors.png';
import { copy } from '../../copy';
import { cx } from '../../lib/cx';
import { settle, softSettle } from '../../lib/motion';
import { nudge } from '../../lib/nudge';
import { useRoving } from '../../lib/roving';
import { play } from '../../lib/sound';
import { OnlineFrame, useNames, type RoomGameProps } from '../rooms/OnlineFrame';

const HAND: Record<Throw, string> = { rock: rockHand, paper: paperHand, scissors: scissorsHand };
const THING: Record<Throw, string> = {
  rock: rockThing,
  paper: paperThing,
  scissors: scissorsThing,
};

const POINTS = THROWS.map((_, i) => [i, 0] as const);

/**
 * the reveal, in beats of server time from the moment the last hand went in:
 * three shakes ("rock", "paper", "scissors"), then the hands open ("shoot!"),
 * then a moment later the result is read out. every screen counts from the
 * same server moment, so the room shakes together.
 */
const BEAT_MS = 320;
const PUMPS = 3;
const SHOOT = PUMPS;
const SETTLED = PUMPS + 1;
const SETTLE_MS = 650;
const REVEAL_DONE_MS = PUMPS * BEAT_MS + SETTLE_MS;

/** -1 while throwing, 0..2 while shaking, SHOOT when the hands open, SETTLED after */
function useBeat(revealing: boolean, start: number, offset: number, still: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!revealing || still) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t + offset - start >= REVEAL_DONE_MS) window.clearInterval(id);
    }, 40);
    return () => window.clearInterval(id);
  }, [revealing, still, start, offset]);

  if (!revealing) return -1;
  if (still) return SETTLED;
  // `now` can be left over from before this reveal began; that reads as "not yet"
  const elapsed = now + offset - start;
  if (elapsed >= REVEAL_DONE_MS) return SETTLED;
  return Math.max(0, Math.min(SHOOT, Math.floor(elapsed / BEAT_MS)));
}

type Mode = 'thinking' | 'ready' | 'pump' | 'shown';
type Result = 'won' | 'lost' | 'wash' | null;
type Size = 'lg' | 'md' | 'sm';

const SIZE: Record<Size, string> = {
  lg: 'size-32 sm:size-40',
  md: 'size-24 sm:size-28',
  sm: 'size-16 sm:size-20',
};

/**
 * rock paper scissors for the whole room. pick a hand; nobody sees it until
 * the last one is in. then every hand shakes three times together and opens.
 */
export default function RpsRoom(props: RoomGameProps) {
  const { room, send, offset } = props;
  const match = room.match!;
  const view = match.view as RpsView;
  const nameOf = useNames(room);
  const still = useReducedMotion() ?? false;
  const { onKeyDown, itemProps } = useRoving(POINTS);

  const playing = view.players.includes(room.you);
  const last = view.last;
  const revealing = view.phase === 'reveal' && last !== null;

  // a tap locks in on this screen straight away, so on a slow line it never
  // feels ignored and can't be sent twice. it's only for this round, and it
  // lets go if the server says no or the connection drops.
  type Pending = { round: number; choice: Throw; refusal: number; connection: string };
  const [pending, setPending] = useState<Pending | null>(null);
  const refusals = props.refusal?.n ?? 0;
  const stillPending =
    pending !== null &&
    playing &&
    !revealing &&
    pending.round === view.round &&
    pending.refusal === refusals &&
    pending.connection === props.connection;

  // your own throw always comes through; only the others' are hidden
  const confirmed = playing ? ((view.throws[room.you] ?? null) as Throw | null) : null;
  const mine = confirmed ?? (stillPending ? pending.choice : null);
  const beat = useBeat(revealing, view.revealUntil - RPS_REVEAL_MS, offset, still);
  const opened = beat >= SHOOT;
  const settled = beat >= SETTLED;
  const picking = playing && !revealing && !mine;
  const final = view.winners !== null;

  const winners = last?.winners ?? [];
  const wonRound = playing && settled && winners.includes(room.you);
  // the point lands when the hands open, not before: no spoilers during the shake
  const scoreOf = (id: string) => {
    const score = view.scores[view.players.indexOf(id)] ?? 0;
    return revealing && !settled && winners.includes(id) ? score - 1 : score;
  };

  // the swap to an open hand shouldn't wait on the network
  useEffect(() => {
    for (const src of [...Object.values(HAND), ...Object.values(THING)]) {
      const img = new Image();
      img.src = src;
    }
  }, []);

  // a tick for each shake, a pop on the throw, a chime when a round is yours.
  // the last round's win or loss is left to the frame's own sounds.
  useEffect(() => {
    if (beat < 0) return;
    if (beat < SHOOT) play('tick');
    else if (beat === SHOOT) play('pop');
    else if (wonRound && !final) play('chime');
  }, [beat, wonRound, final]);

  const round = view.round;
  const connection = props.connection;
  const onThrow = (t: Throw, el?: HTMLElement) => {
    if (!picking) {
      if (el) nudge(el);
      return;
    }
    setPending({ round, choice: t, refusal: refusals, connection });
    play('pop');
    send({ t: 'move', move: { type: 'throw', choice: t } });
  };

  // 1, 2, 3 throw from the keyboard
  useEffect(() => {
    if (!picking) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      const choice = THROWS[['1', '2', '3'].indexOf(e.key)];
      if (!choice) return;
      e.preventDefault();
      setPending({ round, choice, refusal: refusals, connection });
      play('pop');
      send({ t: 'move', move: { type: 'throw', choice } });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picking, send, round, refusals, connection]);

  const line = revealing
    ? !settled
      ? copy.rps.chant
      : winners.length > 0
        ? copy.rps.takes(winners.map(nameOf))
        : copy.rps.wash
    : !playing
      ? copy.room.watchingRound
      : mine
        ? copy.rps.thrown
        : copy.rps.pick;

  // the word under the hands: the chant, then "shoot!", then why
  const shapes = last ? new Set(Object.values(last.throws)) : new Set<Throw>();
  const topShape = last && winners[0] ? last.throws[winners[0]] : undefined;
  const word = !revealing
    ? null
    : beat < SHOOT
      ? copy.rps.shout[beat]
      : beat === SHOOT
        ? copy.rps.shoot
        : topShape
          ? copy.rps.beats[topShape]
          : shapes.size === 1
            ? copy.rps.same
            : copy.rps.allThree;

  // you first, facing everyone else
  const order = playing
    ? [room.you, ...view.players.filter((id) => id !== room.you)]
    : view.players;
  const size: Size = order.length <= 2 ? 'lg' : order.length <= 4 ? 'md' : 'sm';

  return (
    <OnlineFrame
      {...props}
      line={line}
      hold={revealing && !settled}
      below={
        <p className="meta">{`${copy.rps.round(view.round)} · ${copy.rps.firstTo(view.target)}`}</p>
      }
      caption={(id) => {
        const ready = !revealing && (id === room.you ? mine !== null : view.throws[id] != null);
        return ready ? `${scoreOf(id)} · ${copy.rps.ready}` : String(scoreOf(id));
      }}
      captionLabel={(id, name) => copy.room.score(name, scoreOf(id))}
    >
      <div className="flex min-h-[300px] w-full max-w-[600px] flex-col items-center justify-center">
        {picking ? (
          <div
            role="group"
            aria-label={copy.rps.throw}
            onKeyDown={onKeyDown}
            className="grid w-full max-w-[480px] grid-cols-3 gap-3 sm:gap-4"
          >
            {THROWS.map((t, i) => (
              <motion.button
                key={t}
                type="button"
                {...itemProps(i)}
                aria-label={copy.rps.pickLabel(copy.rps[t], copy.rps.beatsShort[t])}
                onClick={(e) => onThrow(t, e.currentTarget)}
                initial={still ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...settle, delay: still ? 0 : i * 0.06 }}
                whileHover={still ? undefined : { y: -5 }}
                whileTap={{ scale: 0.95 }}
                className={cx(
                  'group relative flex cursor-pointer flex-col items-center rounded-lg border border-hairline bg-surface',
                  'px-2 pt-5 pb-4 shadow-calm select-none',
                  'transition-[border-color,box-shadow] duration-200 ease-soft hover:border-accent hover:shadow-lift',
                )}
              >
                <span
                  aria-hidden="true"
                  className="absolute top-2.5 left-3 hidden font-mono text-[11px] text-faint sm:block"
                >
                  {i + 1}
                </span>
                <span className="relative size-20 sm:size-24">
                  <img
                    src={HAND[t]}
                    alt=""
                    draggable={false}
                    className={cx(
                      'size-full object-contain',
                      !still &&
                        'transition-transform duration-300 ease-soft group-hover:scale-110 group-hover:-rotate-8',
                    )}
                  />
                  <img
                    src={THING[t]}
                    alt=""
                    draggable={false}
                    className="absolute -right-2 -bottom-1 size-9 rounded-full bg-paper p-1.5 shadow-calm ring-1 ring-hairline sm:size-10"
                  />
                </span>
                <span className="mt-3 text-[15px] text-ink">{copy.rps[t]}</span>
                <span className="meta mt-0.5">{copy.rps.beatsShort[t]}</span>
              </motion.button>
            ))}
          </div>
        ) : (
          <>
            <ul className="flex flex-wrap items-end justify-center gap-x-6 gap-y-5 sm:gap-x-10">
              {order.map((id, i) => {
                const shown = revealing && opened && last ? last.throws[id] : undefined;
                const ready = id === room.you ? mine !== null : view.throws[id] != null;
                const mode: Mode = revealing
                  ? opened
                    ? 'shown'
                    : 'pump'
                  : ready
                    ? 'ready'
                    : 'thinking';
                const result: Result = !settled
                  ? null
                  : winners.length === 0
                    ? 'wash'
                    : winners.includes(id)
                      ? 'won'
                      : 'lost';
                const hand = (
                  <Hand
                    key={id}
                    name={nameOf(id)}
                    shape={shown ?? 'rock'}
                    mode={mode}
                    result={result}
                    mirror={i > 0}
                    size={size}
                    badge={id === room.you && !revealing ? mine : null}
                    still={still}
                  />
                );
                // two players face off across a quiet "vs"
                return order.length === 2 && i === 1
                  ? [
                      <li
                        key="vs"
                        aria-hidden="true"
                        className="self-center pb-8 font-serif text-[22px] text-faint italic"
                      >
                        vs
                      </li>,
                      hand,
                    ]
                  : hand;
              })}
            </ul>
            <div className="mt-5 grid h-12 place-items-center" aria-live="polite">
              <AnimatePresence mode="popLayout" initial={false}>
                {word ? (
                  <motion.span
                    key={word}
                    initial={still ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0 } }}
                    transition={beat >= SETTLED ? softSettle : { duration: 0.14 }}
                    className={cx(
                      'display leading-none',
                      beat >= SETTLED ? 'text-[26px]' : 'text-[38px]',
                      beat === SHOOT && 'text-accent',
                    )}
                  >
                    {word}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </OnlineFrame>
  );
}

type HandProps = {
  name: string;
  /** what the hand shows. a closed fist is rock. */
  shape: Throw;
  mode: Mode;
  result: Result;
  /** the others face you */
  mirror: boolean;
  size: Size;
  /** a small reminder of your own pick while you wait */
  badge: Throw | null;
  still: boolean;
};

function Hand({ name, shape, mode, result, mirror, size, badge, still }: HandProps) {
  const label =
    mode === 'shown'
      ? `${name}: ${copy.rps[shape]}`
      : mode === 'thinking'
        ? `${name}: ${copy.rps.thinking}`
        : `${name}: ${copy.rps.ready}`;

  // the shake: up and back, down and forward, three times on the beat
  const motionFor =
    still || mode === 'shown' || mode === 'thinking'
      ? { animate: { y: 0, rotate: 0 }, transition: settle }
      : mode === 'pump'
        ? {
            animate: { y: [0, -26, 0], rotate: [0, -14, 4] },
            transition: {
              duration: BEAT_MS / 1000,
              repeat: PUMPS - 1,
              ease: 'easeInOut' as const,
            },
          }
        : {
            // ready: a fist held, breathing
            animate: { y: [0, -4, 0], rotate: 0 },
            transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' as const },
          };

  return (
    <motion.li
      aria-label={label}
      className="flex flex-col items-center gap-2"
      animate={{
        opacity: result === 'lost' ? 0.42 : mode === 'thinking' ? 0.5 : 1,
        filter: result === 'lost' || mode === 'thinking' ? 'grayscale(0.75)' : 'grayscale(0)',
      }}
      transition={{ duration: 0.3 }}
    >
      <div className={cx('relative', SIZE[size])}>
        {result === 'won' ? (
          <motion.span
            aria-hidden="true"
            className="absolute -inset-[14%] rounded-full"
            style={{
              background:
                'radial-gradient(closest-side, color-mix(in srgb, var(--accent) 30%, transparent), transparent)',
            }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={softSettle}
          />
        ) : null}

        {/* mirrored outside the motion, so the shake mirrors too */}
        <div className="size-full" style={mirror ? { transform: 'scaleX(-1)' } : undefined}>
          <motion.div
            className="size-full"
            style={{ transformOrigin: '50% 95%' }}
            animate={motionFor.animate}
            transition={motionFor.transition}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.img
                key={`${shape}:${mode === 'shown'}`}
                src={HAND[shape]}
                alt=""
                draggable={false}
                className="size-full object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.14)] select-none"
                initial={still ? { opacity: 0 } : { opacity: 0, scale: 0.55, rotate: -18 }}
                animate={{
                  opacity: 1,
                  rotate: 0,
                  scale: result === 'won' ? 1.08 : result === 'lost' ? 0.9 : 1,
                }}
                exit={{ opacity: 0, transition: { duration: 0.06 } }}
                transition={softSettle}
              />
            </AnimatePresence>
          </motion.div>
        </div>

        {badge ? (
          <motion.img
            src={THING[badge]}
            alt=""
            draggable={false}
            initial={still ? false : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={softSettle}
            className="absolute -right-1 -bottom-1 size-[34%] rounded-full bg-paper p-[6%] shadow-calm ring-1 ring-hairline"
          />
        ) : null}

        {result === 'won' ? (
          <motion.span
            aria-hidden="true"
            className="absolute -top-2 right-0 font-mono text-[15px] text-accent"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: -4 }}
            transition={softSettle}
          >
            +1
          </motion.span>
        ) : null}
      </div>

      <span className="meta">{name}</span>
      <span className="h-4 text-[12px] text-muted" aria-hidden="true">
        {mode === 'thinking' ? (
          <ThinkingDots still={still} />
        ) : mode === 'ready' && badge ? (
          copy.rps.yourPick(copy.rps[badge].toLowerCase())
        ) : mode === 'ready' ? (
          copy.rps.ready
        ) : null}
      </span>
    </motion.li>
  );
}

function ThinkingDots({ still }: { still: boolean }) {
  if (still) return <>{copy.rps.thinking}…</>;
  return (
    <span className="inline-flex items-center gap-1">
      {copy.rps.thinking}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block size-1 rounded-full bg-muted"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </span>
  );
}
