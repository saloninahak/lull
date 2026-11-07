import { describe, expect, it } from 'vitest';
import {
  bingo,
  bingoView,
  cleanName,
  createRoom,
  isError,
  makeCode,
  matchStatus,
  normalizeCode,
  parseClientMessage,
  parseCreateRequest,
  reduceRoom,
  roomView,
  SEAT_HOLD_MS,
  type BingoState,
  type BingoView,
  type Room,
  type RoomAction,
} from '../src';

/** apply actions in order, failing loudly on any error */
function run(room: Room, actions: RoomAction[]): Room {
  return actions.reduce((r, a) => {
    const next = reduceRoom(r, a);
    if (isError(next)) throw new Error(`${a.type}: ${next.error}`);
    return next;
  }, room);
}

const join = (id: string, name: string, now = 0): RoomAction => ({ type: 'join', id, name, now });
const ANA = 'ana-00000001';
const BEN = 'ben-00000002';
const CARO = 'caro-0000003';

const lobby = () => run(createRoom('QBXT', 'bingo'), [join(ANA, 'ana', 1), join(BEN, 'ben', 2)]);
const started = () => run(lobby(), [{ type: 'start', by: ANA, seed: 7, now: 0 }]);
const stateOf = (room: Room) => room.match!.state as BingoState;

describe('room: names and codes', () => {
  it('cleans names: trimmed, single spaces, at most 16, never empty', () => {
    expect(cleanName('  ana  ')).toBe('ana');
    expect(cleanName('ana   maria')).toBe('ana maria');
    expect(cleanName('a\u0000b\nc')).toBe('ab c');
    expect(cleanName('abcdefghijklmnopqrstuvwxyz')).toBe('abcdefghijklmnop');
    expect(cleanName('   ')).toBeNull();
  });

  it('makes 4-letter codes from clear letters and reads them back', () => {
    const code = makeCode(42);
    expect(code).toMatch(/^[A-HJKMNP-Z]{4}$/);
    expect(makeCode(42)).toBe(code);
    expect(normalizeCode(' qb xt ')).toBe('QBXT');
    expect(normalizeCode('QBX')).toBeNull();
    expect(normalizeCode('QBXO')).toBeNull(); // no o
  });
});

describe('room: seats', () => {
  it('seats people in arrival order and makes the first the host', () => {
    const r = lobby();
    expect(r.seats.map((s) => s.name)).toEqual(['ana', 'ben']);
    expect(r.host).toBe(ANA);
  });

  it('gives a returning player the same seat', () => {
    const r = run(lobby(), [{ type: 'disconnect', id: BEN, now: 5 }, join(BEN, 'benny', 6)]);
    expect(r.seats).toHaveLength(2);
    expect(r.seats[1]).toMatchObject({ id: BEN, name: 'benny', connected: true, awaySince: null });
  });

  it('refuses an empty name and a full room', () => {
    expect(reduceRoom(lobby(), join(CARO, '   '))).toEqual({ error: 'bad-name' });
    let r = lobby();
    for (let i = 3; i <= 8; i++) r = run(r, [join(`player-${i}0000`, `p${i}`, i)]);
    expect(r.seats).toHaveLength(8);
    expect(reduceRoom(r, join('player-90000', 'p9'))).toEqual({ error: 'full' });
  });

  it('holds a dropped seat for two minutes, then lets it go', () => {
    let r = run(lobby(), [{ type: 'disconnect', id: BEN, now: 1000 }]);
    r = run(r, [{ type: 'tick', now: 1000 + SEAT_HOLD_MS - 1 }]);
    expect(r.seats).toHaveLength(2);
    expect(r.seats[1]!.connected).toBe(false);
    r = run(r, [{ type: 'tick', now: 1000 + SEAT_HOLD_MS }]);
    expect(r.seats.map((s) => s.id)).toEqual([ANA]);
  });

  it('passes the host to the longest-present player when the host goes', () => {
    let r = run(lobby(), [join(CARO, 'caro', 3), { type: 'leave', id: ANA }]);
    expect(r.host).toBe(BEN);
    // someone connected is preferred over someone away
    r = run(lobby(), [
      join(CARO, 'caro', 3),
      { type: 'disconnect', id: BEN, now: 4 },
      { type: 'leave', id: ANA },
    ]);
    expect(r.host).toBe(CARO);
    expect(
      run(r, [
        { type: 'leave', id: CARO },
        { type: 'leave', id: BEN },
      ]).host,
    ).toBeNull();
  });

  it('keeps the host while they are only reconnecting', () => {
    const r = run(lobby(), [{ type: 'disconnect', id: ANA, now: 10 }]);
    expect(r.host).toBe(ANA);
  });
});

describe('room: playing', () => {
  it('lets only the host start, with at least two present', () => {
    expect(reduceRoom(lobby(), { type: 'start', by: BEN, seed: 1, now: 0 })).toEqual({
      error: 'not-host',
    });
    const alone = run(createRoom('QBXT', 'bingo'), [join(ANA, 'ana')]);
    expect(reduceRoom(alone, { type: 'start', by: ANA, seed: 1, now: 0 })).toEqual({
      error: 'not-enough',
    });
    const r = started();
    expect(r.match).toMatchObject({ players: [ANA, BEN], round: 1 });
    expect(reduceRoom(r, { type: 'start', by: ANA, seed: 2, now: 0 })).toEqual({
      error: 'already-playing',
    });
  });

  it('leaves out anyone who is away when the game starts', () => {
    const r = run(lobby(), [
      join(CARO, 'caro', 3),
      { type: 'disconnect', id: CARO, now: 4 },
      { type: 'start', by: ANA, seed: 1, now: 0 },
    ]);
    expect(r.match!.players).toEqual([ANA, BEN]);
  });

  it('checks every move with the rules, on the server', () => {
    const r = started();
    const number = stateOf(r).cards[ANA]![0]!;
    expect(
      reduceRoom(r, { type: 'move', by: BEN, now: 0, move: { type: 'call', number } }),
    ).toEqual({
      error: 'not-your-turn',
    });
    expect(
      reduceRoom(r, { type: 'move', by: CARO, now: 0, move: { type: 'call', number } }),
    ).toEqual({
      error: 'not-in-game',
    });
    expect(
      reduceRoom(r, { type: 'move', by: ANA, now: 0, move: { type: 'call', number: 99 } }),
    ).toEqual({
      error: 'out-of-range',
    });
    const next = run(r, [{ type: 'move', by: ANA, now: 0, move: { type: 'call', number } }]);
    expect(stateOf(next).called).toEqual([number]);
  });

  it('turns a badly shaped move into a quiet error', () => {
    expect(reduceRoom(started(), { type: 'move', by: ANA, now: 0, move: null })).toEqual({
      error: 'bad-move',
    });
    expect(reduceRoom(lobby(), { type: 'move', by: ANA, now: 0, move: {} })).toEqual({
      error: 'not-playing',
    });
  });

  it('ends the game quietly when a player leaves mid-game', () => {
    const r = run(started(), [{ type: 'leave', id: BEN }]);
    expect(r.match).toBeNull();
    expect(r.note).toEqual({ kind: 'left-mid-game', name: 'ben' });
  });

  it('starts the next round when the game is over, and goes back to the lobby', () => {
    let r = started();
    // play numbers 1 to 25 in turn until the game ends
    for (let n = 1; n <= 25 && !bingo.status(stateOf(r)).over; n++) {
      const by = stateOf(r).players[stateOf(r).turn]!;
      r = run(r, [{ type: 'move', by, now: 0, move: { type: 'call', number: n } }]);
    }
    expect(bingo.status(stateOf(r)).over).toBe(true);
    r = run(r, [{ type: 'start', by: ANA, seed: 9, now: 0 }]);
    expect(r.match!.round).toBe(2);
    expect(bingo.status(stateOf(r)).over).toBe(false);
    expect(reduceRoom(r, { type: 'lobby', by: BEN })).toEqual({ error: 'not-host' });
    expect(run(r, [{ type: 'lobby', by: ANA }]).match).toBeNull();
  });
});

describe('room: choosing the game', () => {
  it('lets the host switch game and options in the lobby, checked against the lists', () => {
    const r = run(lobby(), [
      { type: 'setup', by: ANA, game: 'dots', options: { size: 6, nonsense: 1 } },
    ]);
    expect(r.game).toBe('dots');
    expect(r.options).toEqual({ size: 6 });
    const odd = run(lobby(), [{ type: 'setup', by: ANA, game: 'dots', options: { size: 99 } }]);
    expect(odd.options).toEqual({ size: 5 });
    expect(reduceRoom(lobby(), { type: 'setup', by: BEN, game: 'dots', options: {} })).toEqual({
      error: 'not-host',
    });
    expect(reduceRoom(lobby(), { type: 'setup', by: ANA, game: 'chess', options: {} })).toEqual({
      error: 'bad-game',
    });
    expect(reduceRoom(started(), { type: 'setup', by: ANA, game: 'dots', options: {} })).toEqual({
      error: 'already-playing',
    });
  });

  it('turns the line-up each round, so two-player games share the seats', () => {
    let r = run(createRoom('QBXT', 'connect4'), [
      join(ANA, 'ana', 1),
      join(BEN, 'ben', 2),
      join(CARO, 'caro', 3),
      { type: 'start', by: ANA, seed: 1, now: 0 },
    ]);
    expect(r.match!.players).toEqual([ANA, BEN]);
    r = run(r, [
      { type: 'lobby', by: ANA },
      { type: 'start', by: ANA, seed: 1, now: 0 },
    ]);
    expect(r.match!.players).toEqual([BEN, CARO]);
  });

  it('runs a timed game forward on tick', () => {
    let r = run(createRoom('QBXT', 'wordchain'), [
      join(ANA, 'ana', 1),
      join(BEN, 'ben', 2),
      { type: 'start', by: ANA, seed: 1, now: 1000 },
    ]);
    expect(run(r, [{ type: 'tick', now: 2000 }])).toBe(r);
    r = run(r, [{ type: 'tick', now: 1000 + 15_000 }]);
    expect(matchStatus(r)).toEqual({ winner: [BEN], over: true });
  });
});

describe('room: taking a move back', () => {
  const ttt = () =>
    run(createRoom('QBXT', 'tictactoe'), [
      join(ANA, 'ana', 1),
      join(BEN, 'ben', 2),
      { type: 'start', by: ANA, seed: 1, now: 0 },
      { type: 'move', by: ANA, now: 0, move: { cell: 4 } },
    ]);
  const board = (r: Room) => (r.match!.state as { board: unknown[] }).board;

  it('lets the mover ask, and a yes puts the board back', () => {
    const r = ttt();
    expect(roomView(r, ANA).match!.canTakeBack).toBe(true);
    expect(roomView(r, BEN).match!.canTakeBack).toBe(false);
    expect(reduceRoom(r, { type: 'takeback', by: BEN })).toEqual({ error: 'no-takeback' });
    const asked = run(r, [{ type: 'takeback', by: ANA }]);
    expect(roomView(asked, BEN).match!.takeback).toEqual({ by: ANA });
    expect(roomView(asked, ANA).match!.canTakeBack).toBe(false);
    // you can't answer your own ask
    expect(reduceRoom(asked, { type: 'answer', by: ANA, accept: true })).toEqual({
      error: 'nothing-to-answer',
    });
    const back = run(asked, [{ type: 'answer', by: BEN, accept: true }]);
    expect(board(back).every((c) => c === null)).toBe(true);
    expect(matchStatus(back)!.turn).toBe(ANA);
    // only once per move
    expect(reduceRoom(back, { type: 'takeback', by: ANA })).toEqual({ error: 'no-takeback' });
  });

  it('keeps the move on a no, and a new move closes the ask', () => {
    const declined = run(ttt(), [
      { type: 'takeback', by: ANA },
      { type: 'answer', by: BEN, accept: false },
    ]);
    expect(board(declined)[4]).toBe('x');
    expect(declined.match!.takeback).toBeNull();
    const movedOn = run(ttt(), [
      { type: 'takeback', by: ANA },
      { type: 'move', by: BEN, now: 0, move: { cell: 0 } },
    ]);
    expect(movedOn.match!.takeback).toBeNull();
    expect(roomView(movedOn, BEN).match!.canTakeBack).toBe(true);
  });

  it("isn't offered in games without turns, or once a game is over", () => {
    expect(reduceRoom(started(), { type: 'takeback', by: ANA })).toEqual({ error: 'no-takeback' });
    const won = run(ttt(), [
      { type: 'move', by: BEN, now: 0, move: { cell: 0 } },
      { type: 'move', by: ANA, now: 0, move: { cell: 3 } },
      { type: 'move', by: BEN, now: 0, move: { cell: 1 } },
      { type: 'move', by: ANA, now: 0, move: { cell: 5 } },
    ]);
    expect(matchStatus(won)!.over).toBe(true);
    expect(reduceRoom(won, { type: 'takeback', by: ANA })).toEqual({ error: 'no-takeback' });
  });
});

describe('room: privacy', () => {
  it('sends each player their own card and nothing about anyone else', () => {
    let r = started();
    const s = stateOf(r);
    // make some progress so lines exist
    for (let n = 1; n <= 12; n++) {
      const by = stateOf(r).players[stateOf(r).turn]!;
      r = run(r, [{ type: 'move', by, now: 0, move: { type: 'call', number: n } }]);
    }
    const anaView = roomView(r, ANA).match!.view as BingoView;
    const benView = roomView(r, BEN).match!.view as BingoView;
    expect(anaView.card).toEqual(s.cards[ANA]);
    expect(benView.card).toEqual(s.cards[BEN]);
    const anaJson = JSON.stringify(roomView(r, ANA));
    // ben's card layout never appears in what ana receives
    expect(anaJson).not.toContain(JSON.stringify(s.cards[BEN]));
    expect(anaJson).not.toContain('"cards"');
    expect(anaJson).not.toContain('"lines"');
    expect(Object.keys(anaView.lineCounts)).toEqual([ANA, BEN]);
  });

  it('gives someone watching no card at all', () => {
    const r = run(started(), [join(CARO, 'caro', 5)]);
    const view = roomView(r, CARO);
    expect((view.match!.view as BingoView).card).toBeNull();
    expect(view.seats.find((s) => s.id === CARO)!.inGame).toBe(false);
  });

  it('only tells you about your own new lines', () => {
    const s = bingo.init(
      [
        { id: ANA, name: 'ana' },
        { id: BEN, name: 'ben' },
      ],
      { seed: 3 },
    );
    const v = bingoView(
      { ...s, last: { by: ANA, number: 1, newLines: { [ANA]: [0], [BEN]: [4] } } },
      ANA,
    );
    expect(v.last).toEqual({ by: ANA, number: 1, myNewLines: [0] });
  });
});

describe('protocol', () => {
  it('accepts only well-formed messages', () => {
    expect(
      parseClientMessage('{"t":"hello","code":"QBXT","id":"abcdefgh12","name":"ana"}'),
    ).toEqual({ t: 'hello', code: 'QBXT', id: 'abcdefgh12', name: 'ana' });
    expect(parseClientMessage('{"t":"move","move":{"type":"call","number":3}}')).toEqual({
      t: 'move',
      move: { type: 'call', number: 3 },
    });
    expect(parseClientMessage('{"t":"start"}')).toEqual({ t: 'start' });
    expect(parseClientMessage('{"t":"takeback"}')).toEqual({ t: 'takeback' });
    expect(parseClientMessage('{"t":"answer","accept":false}')).toEqual({
      t: 'answer',
      accept: false,
    });
    expect(parseClientMessage('{"t":"answer","accept":"yes"}')).toBeNull();
  });

  it('rejects anything else', () => {
    expect(parseClientMessage('not json')).toBeNull();
    expect(parseClientMessage('[]')).toBeNull();
    expect(parseClientMessage('{"t":"nope"}')).toBeNull();
    expect(parseClientMessage('{"t":"hello","code":"QBXT","id":"short","name":"ana"}')).toBeNull();
    expect(parseClientMessage('{"t":"hello","code":"QBXT","id":"abcdefgh12","name":5}')).toBeNull();
    expect(parseClientMessage('{"t":"move","move":[1]}')).toBeNull();
    expect(parseClientMessage(`{"t":"ping","pad":"${'x'.repeat(3000)}"}`)).toBeNull();
  });

  it('reads a create request for an online game only', () => {
    expect(parseCreateRequest('{"game":"bingo"}', ['bingo'])).toEqual({
      game: 'bingo',
      options: {},
    });
    expect(parseCreateRequest('{"game":"dots"}', ['bingo'])).toBeNull();
    expect(parseCreateRequest('{}', ['bingo'])).toBeNull();
  });
});
