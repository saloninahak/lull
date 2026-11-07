# Lull

A quiet little place to kill time with friends.

No accounts, no ads, no leaderboards, no tracking. Pick a game, start a room, send the four-letter code to whoever you like, and play. A few old paper-and-pencil games, a few good people.

## What's in it

Nineteen small games. Some you can open and play straight away, some need other people in a room.

| Play right away | Needs a room |
| --- | --- |
| Tic tac toe, Squares, Nine men's morris, Connect four, Sim (two people on one screen) | Bingo |
| Sudoku, Zip, Hangman, Word search, Futoshiki, Word wheel (on your own) | Skribbl, Pictionary |
| | Word chain, Rock paper scissors |
| | Name place animal thing |
| | Consequences, One-word story |

Every game can also be played in a room, each person on their own device. Up to eight people per room, and anyone past a game's player limit takes turns watching.

Puzzles are generated fresh each time, and each one has exactly one solution.

## How a room works

- Start a room from any game and share the code or the link.
- Friends join with just a name. It's saved on their device, nothing more.
- The host starts the game. If the host leaves, the next person in takes over.
- If your connection drops, your seat is held for two minutes.
- Rooms live in memory on the server and close soon after everyone leaves. Nothing is stored.
- The server checks every move, so nobody can peek at a private card or a hidden word. It simply never gets sent to them.

## Running it locally

You need Node 22.18 or newer (24 is what the hosts use) and pnpm.

```bash
corepack enable pnpm
pnpm install
pnpm dev
```

That starts the site on http://localhost:5173 and the room server on port 1999. Vite passes `/api` through to the server, so rooms just work.

To play with friends on the same wifi, run `pnpm host`. It builds the site and serves it together with the rooms on one port (14087 by default), and prints the address to share. Keep the window open while you play.

### Other commands

```bash
pnpm test          # rules and server tests
pnpm check         # typecheck, lint, tests, build
pnpm play:rooms    # two browsers play every room game end to end
pnpm play:solo     # the solo puzzles, solved to the end
```

The browser scripts use Playwright. If it asks, run `npx playwright install chromium` once.

## How it's put together

```
apps/
  web/               React + TypeScript + Vite, Tailwind, Motion
  server/            a small Node server: HTTP for creating rooms, websockets for playing
packages/
  game-logic/        every game's rules as plain, tested TypeScript
```

The rules live in one package that both the browser and the server use. The server is the only place a move is judged; the browser just draws what it's told. That's also why the solo and same-screen modes work with no server at all.

Boards are inline SVG. Sound and the background music are made with the Web Audio API, so there are no audio files. There's a toggle in the corner if you'd rather have quiet.

## Putting it online

The site is static, and the rooms need one always-running Node process, so they live in two places.

**The site** goes on any static host. There's a `vercel.json` ready for Vercel. Set one build-time variable:

| Variable | What it is |
| --- | --- |
| `VITE_ROOM_URL` | Where your room server lives, e.g. `https://your-rooms.example.com` |
| `VITE_CONTACT_EMAIL` | Optional. Shows an "email me" link on the home page |

**The rooms** go on anything that runs Node and keeps websockets open (Railway, Render and Fly all work; `render.yaml` and `railway.json` are included). Start it with `node apps/server/src/main.ts` and set:

| Variable | What it does |
| --- | --- |
| `HOST` | Use `0.0.0.0` on a host |
| `PORT` | Usually set for you |
| `ALLOWED_ORIGINS` | Comma-separated sites allowed to connect, e.g. `https://lull.vercel.app`. A `*` matches one part of an address, so `https://lull-*.vercel.app` covers every preview |
| `TRUST_PROXY` | Set to `1` behind a host's proxy, so rate limits see the real visitor |

`/api/health` answers `{"ok":true}` when the server is up.

Free hosts put idle servers to sleep, so the first room after a quiet while can take a minute to wake. The site nudges the server awake as soon as someone opens the home page.

A redeploy or restart closes any open rooms, so it's best to do it when nobody's mid-game.

## Good to know

- Everything is keyboard-playable, with visible focus, labelled cells, and no meaning carried by color alone.
- Light and dark themes, and reduced-motion is respected.
- No cookies, no analytics, no third-party scripts.
- The only things kept on your device are your name, theme, sound setting and a random player id, so a refresh puts you back in your seat.

## Credits

Made for fun by [@saloninahak](https://saloninahak.framer.website).
