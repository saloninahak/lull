import { useEffect, useState, type ReactNode } from 'react';
import { GAME_ACCENT, type GameId } from '@lull/game-logic';
import { Controls } from '../../components/Controls';
import { Dock, DockButton } from '../../components/Dock';
import { Footer } from '../../components/Footer';
import { Lines, Sheet } from '../../components/Sheet';
import { contactEmail } from '../../config';
import { copy } from '../../copy';
import { isReady } from '../../lib/ready';
import { wakeRooms } from '../../lib/rooms';
import { navigate } from '../../lib/router';
import { GameCard } from './GameCard';
import {
  BingoPreview,
  Connect4Preview,
  ConsequencesPreview,
  DotsPreview,
  FutoshikiPreview,
  HangmanPreview,
  MorrisPreview,
  NpatPreview,
  OneStoryPreview,
  PictionaryPreview,
  RpsPreview,
  SimPreview,
  SkribblPreview,
  SudokuPreview,
  TicTacToePreview,
  WordChainPreview,
  WordSearchPreview,
  WordWheelPreview,
  ZipPreview,
} from './previews';

/**
 * how a card opens. default: a new room, a pc each. `sameScreen`: opens
 * straight into a game for two on this device. `solo`: opens straight into
 * a game on your own. both have a "play with friends" way into a room.
 */
type Tile = { id: GameId; preview: ReactNode; sameScreen?: boolean; solo?: boolean };

const games: readonly Tile[] = [
  { id: 'tictactoe', preview: <TicTacToePreview />, sameScreen: true },
  { id: 'dots', preview: <DotsPreview />, sameScreen: true },
  { id: 'morris', preview: <MorrisPreview />, sameScreen: true },
  // bingo cards are private, so it's played in a room, a pc each
  { id: 'bingo', preview: <BingoPreview /> },
  { id: 'connect4', preview: <Connect4Preview />, sameScreen: true },
  { id: 'skribbl', preview: <SkribblPreview /> },
  { id: 'pictionary', preview: <PictionaryPreview /> },
  { id: 'wordchain', preview: <WordChainPreview /> },
  { id: 'hangman', preview: <HangmanPreview />, solo: true },
  { id: 'rps', preview: <RpsPreview /> },
  { id: 'sudoku', preview: <SudokuPreview />, solo: true },
  { id: 'zip', preview: <ZipPreview />, solo: true },
  { id: 'npat', preview: <NpatPreview /> },
  { id: 'sim', preview: <SimPreview />, sameScreen: true },
  { id: 'wordsearch', preview: <WordSearchPreview />, solo: true },
  { id: 'futoshiki', preview: <FutoshikiPreview />, solo: true },
  { id: 'consequences', preview: <ConsequencesPreview /> },
  { id: 'onestory', preview: <OneStoryPreview /> },
  { id: 'wordwheel', preview: <WordWheelPreview />, solo: true },
];

type SheetName = 'about' | 'changelog';

/** the small links by the title. two open a sheet, one is plain email. */
const links: ReadonlyArray<{ label: string; dot: string; sheet?: SheetName; href?: string }> = [
  { label: copy.links.howItWorks, sheet: 'about', dot: 'bg-blue' },
  { label: copy.links.changelog, sheet: 'changelog', dot: 'bg-amber' },
  ...(contactEmail
    ? [{ label: copy.links.emailMe, href: `mailto:${contactEmail}`, dot: 'bg-green' }]
    : []),
];

const linkClass =
  'meta inline-flex min-h-11 items-center gap-2 rounded-sm transition-colors duration-200 ease-soft hover:text-ink md:min-h-9';

/**
 * home. a card opens its game: puzzles and two-player games straight away
 * on this device, the rest in a new room. bingo is always a room (readme 7.3).
 */
export function Home() {
  const [sheet, setSheet] = useState<SheetName | null>(null);
  // the room server may be napping. nudge it awake while people look around.
  useEffect(wakeRooms, []);

  const cardFor = (game: Tile) => {
    const line = copy.games[game.id].line;
    // solo puzzles open straight away, no room needed
    if (game.solo) return { line, onOpen: () => navigate(`/play/${game.id}`) };
    // same-screen games always open locally — no dock toggle needed.
    // if they also have a room screen, the play screen has a "play with friends" pill.
    if (game.sameScreen) {
      return { line, onOpen: () => navigate(`/play/${game.id}`) };
    }
    if (isReady(game.id)) return { line, onOpen: () => navigate(`/new?game=${game.id}`) };
    return { line: copy.room.comingSoon };
  };

  return (
    <div className="dot-grid relative min-h-dvh">
      <div className="absolute top-3 right-3 z-10 sm:top-6 sm:right-6">
        <Controls />
      </div>

      <div className="mx-auto w-full max-w-[1240px] px-6 pt-7 pb-28 sm:px-10 sm:pt-12">
        <div className="md:grid md:grid-cols-[208px_1fr] md:gap-14">
          <header className="md:sticky md:top-12 md:self-start">
            <h1 className="display text-[30px]">
              {copy.name}
              <span className="text-blue">.</span>
            </h1>
            <p className="meta mt-2 text-balance">{copy.subline}</p>

            <nav aria-label={copy.links.label} className="mt-5 md:mt-8">
              <ul className="-ml-0.5 flex flex-wrap gap-x-5 md:flex-col md:gap-0">
                {links.map((link) => {
                  const dot = (
                    <span aria-hidden="true" className={`size-1.5 rounded-full ${link.dot}`} />
                  );
                  return (
                    <li key={link.label}>
                      {link.sheet ? (
                        <button
                          type="button"
                          className={linkClass}
                          onClick={() => setSheet(link.sheet!)}
                        >
                          {dot}
                          {link.label}
                        </button>
                      ) : (
                        <a href={link.href} className={linkClass}>
                          {dot}
                          {link.label}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </header>

          <main className="mt-8 md:mt-0">
            <h2 className="sr-only">{copy.gamesLabel}</h2>
            <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 [&>li]:flex">
              {games.map((game) => {
                const card = cardFor(game);
                return (
                  <li key={game.id} className="flex w-full">
                    <GameCard
                      title={copy.games[game.id].title}
                      line={card.line}
                      accent={GAME_ACCENT[game.id]}
                      preview={game.preview}
                      onOpen={card.onOpen}
                    />
                  </li>
                );
              })}
            </ul>
          </main>
        </div>

        <Footer className="mt-16 md:ml-[264px]" />
      </div>

      <Sheet open={sheet === 'about'} onClose={() => setSheet(null)} title={copy.links.howItWorks}>
        <Lines lines={copy.about} />
      </Sheet>
      <Sheet
        open={sheet === 'changelog'}
        onClose={() => setSheet(null)}
        title={copy.links.changelog}
      >
        <p className="meta mb-4">{copy.changelogDate}</p>
        <Lines lines={copy.changelog} />
      </Sheet>

      <Dock label={copy.dock.label}>
        <DockButton emphasis onClick={() => navigate('/new')}>
          {copy.dock.startRoom}
        </DockButton>
        <DockButton onClick={() => navigate('/join')}>{copy.dock.join}</DockButton>
      </Dock>
    </div>
  );
}
