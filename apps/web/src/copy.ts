/**
 * every string in the app lives here so the voice stays the same everywhere.
 * rules (readme section 4): lowercase-leaning, short, calm, honest.
 * no exclamation marks, no emoji, no "oops".
 */

/** "a", "a and b", "a, b and c" */
function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export const copy = {
  name: 'Lull',
  tagline: 'A quiet place to kill time with friends.',
  subline: 'A few old games, a few good people.',

  links: {
    label: 'Links',
    howItWorks: 'How it works',
    changelog: 'Changelog',
    emailMe: 'Email me',
  },

  dock: {
    label: 'Actions',
    startRoom: 'Start a room',
    join: 'Join a room',
    sameScreen: 'Same screen',
  },

  controls: {
    label: 'Settings',
    darkTheme: 'Dark theme',
    sound: 'Sound',
  },

  footer: {
    signoff: 'Made for fun · adios',
    sound: 'Sound',
  },

  gamesLabel: 'Games',

  games: {
    tictactoe: { title: 'Tic tac toe', line: 'Two players, three in a row.' },
    dots: { title: 'Squares', line: 'Close a square, take another turn.' },
    morris: { title: "Nine men's morris", line: 'Two players, nine pieces, a few mills.' },
    bingo: { title: 'Bingo', line: '1 to 25, first to five lines.' },
    connect4: { title: 'Connect four', line: 'Drop a disc, line up four.' },
    skribbl: { title: 'Skribbl', line: 'One draws, the rest type guesses.' },
    pictionary: { title: 'Pictionary', line: 'One draws, the room shouts it out.' },
    wordchain: { title: 'Word chain', line: 'Start where the last word ended.' },
    hangman: { title: 'Hangman', line: 'Guess the word. Alone, or with friends.' },
    rps: { title: 'Rock paper scissors', line: 'Everyone throws at once.' },
    sudoku: { title: 'Sudoku', line: 'A quiet puzzle. Alone, or race friends.' },
    zip: { title: 'Zip', line: 'One line, every cell. Alone, or race friends.' },
    npat: { title: 'Name place animal thing', line: 'One letter, four words, against the clock.' },
    sim: { title: 'Sim', line: 'Six dots. Make a triangle and you lose.' },
    wordsearch: { title: 'Word search', line: 'Find every word. Alone, or race friends.' },
    futoshiki: { title: 'Futoshiki', line: 'Sudoku with signs. Alone, or race friends.' },
    consequences: { title: 'Consequences', line: 'Fold, write, pass it on. Read it all out.' },
    onestory: { title: 'One-word story', line: 'A story, one word each, in turns.' },
    wordwheel: {
      title: 'Word wheel',
      line: 'Swipe the letters into words. Alone, or race friends.',
    },
  },

  /** lobby choices per game. keys match GAME_OPTIONS in the rules package. */
  options: {
    variant: { label: 'board', values: { classic: '3×3', five: '5×5, four in a row' } },
    size: {
      label: 'board',
      values: {
        4: '4×4',
        5: '5×5',
        6: '6×6',
        7: '7×7',
        8: '8×8',
        10: '10×10',
        12: '12×12',
      } as Record<string, string>,
    },
    rounds: {
      label: 'rounds',
      values: { 1: '1 round', 2: '2 rounds', 3: '3 rounds', 5: '5 rounds', 8: '8 rounds' },
    },
    seconds: {
      label: 'time',
      values: {
        10: '10s',
        15: '15s',
        20: '20s',
        30: '30s',
        45: '45s',
        60: '60s',
        80: '80s',
        90: '90s',
        100: '100s',
        120: '120s',
      },
    },
    target: { label: 'first to', values: { 3: 'first to 3', 5: 'first to 5' } },
    lines: { label: 'lines', values: { 5: '5 lines', 7: '7 lines' } },
    words: { label: 'words', values: { 30: '30 words', 50: '50 words', 80: '80 words' } },
    letters: { label: 'letters', values: { 5: '5 letters', 6: '6 letters', 7: '7 letters' } },
    level: { label: 'level', values: { easy: 'easy', medium: 'medium', hard: 'hard' } },
  } as Record<string, { label: string; values: Record<string, string> }>,

  card: {
    open: (title: string) => `Open ${title}`,
  },

  /* small sheets: how to play, how it works, changelog ---------------------- */
  sheet: {
    done: 'Got it',
    close: 'Close',
    howToPlay: 'How to play',
  },

  about: [
    'Pick a game, start a room, and share the four-letter code or the link.',
    "Friends join with a name. The host starts when everyone's in.",
    'Sudoku, Zip, Hangman, Word search, Futoshiki and Word wheel also work on your own — no room needed.',
    'Tic tac toe, Squares, Morris, Sim and Connect four open straight away for two people on one screen.',
    'No accounts and no tracking. Your name stays on your device.',
    'Rooms live in memory and close soon after everyone leaves. Nothing is kept.',
  ],

  changelog: [
    'Word wheel: swipe letters into a small crossword. On your own with hints, or race friends.',
    'Consequences and One-word story, for telling stories together.',
    'A back button on every screen. Starting a room from a game asks only for your name.',
    'Word search and Futoshiki: on your own with hints, or race friends.',
    'Sim: six dots, fifteen lines. Make a triangle in your own color and you lose.',
    'Name place animal thing: one letter, four words, and the room decides what counts.',
    'How to play for every game. Notes and hints in the puzzles. Take back in turn games.',
    'Sudoku, Zip and Hangman on your own, with a fresh puzzle any time.',
    'All games in a room, each person on their own device.',
    'Bingo is notebook bingo now.',
    'The first four: Tic tac toe, Squares, Morris and Bingo.',
  ],
  changelogDate: '27 Oct 2026',

  /** the rules, a few short lines per game */
  rules: {
    tictactoe: [
      'take turns putting your mark in an empty square.',
      'three in a row wins: across, down or corner to corner.',
      'the 5×5 board needs four in a row.',
      'a full board with no line is a draw.',
    ],
    dots: [
      'take turns drawing one line between two dots next to each other.',
      "close the fourth side of a box and it's yours. then you go again.",
      'a box with three sides drawn gets a faint tint, so you can see the danger.',
      'when every box is taken, most boxes wins.',
    ],
    morris: [
      'each player has nine pieces. take turns placing them on empty points.',
      'three of yours along a line is a mill. a mill lets you remove one of theirs.',
      "pieces in a mill are safe, unless that's all they have left.",
      'once everything is placed, slide a piece along a line to a free point.',
      'down to three, you can fly: move a piece to any free point.',
      'fewer than three pieces, or no move left, and you lose.',
    ],
    bingo: [
      'everyone gets their own card with 1 to 25, shuffled.',
      "take turns calling a number from your card. it's crossed off on every card.",
      'a full row, column or diagonal is a line, and crosses off a letter of b-i-n-g-o.',
      'first to five lines wins.',
    ],
    connect4: [
      'take turns dropping a disc into a column. it falls to the lowest free spot.',
      'four of yours in a row wins: across, down or diagonal.',
      'a full frame with no four is a draw.',
    ],
    skribbl: [
      'each turn one person picks a word from three and draws it.',
      'everyone else types guesses. the sooner you get it, the more you score.',
      'the drawer scores for everyone who gets it.',
      'a letter shows at half time, and another near the end.',
      'everyone draws once a round.',
    ],
    pictionary: [
      'each turn one person picks a word from three and draws it.',
      'everyone else guesses out loud, in the room.',
      'the drawer taps whoever said it first, and you both score a point.',
      'a letter shows at half time, and another near the end.',
    ],
    wordchain: [
      'say a word that starts with the last letter of the one before.',
      'three letters or more, and no word twice.',
      "run out of time and you're out. the last one left wins.",
      "there's no dictionary. the room keeps itself honest.",
    ],
    hangman: [
      'guess the hidden word one letter at a time. six misses and it hangs.',
      'on your own, the app picks the word.',
      'with friends, each person sets a word once while the others take turns guessing.',
      'a right letter scores 1, finishing the word 2 more, and a hanging gives the setter 3.',
      'a hint shows a letter, but costs a miss.',
    ],
    rps: [
      'everyone picks rock, paper or scissors at once. throws stay hidden until all are in.',
      'rock beats scissors, scissors beat paper, paper beats rock.',
      'when exactly two shapes show, everyone with the winning one scores.',
      'all the same, or all three, is a wash.',
    ],
    sudoku: [
      'fill every row, column and 3×3 box with 1 to 9, each once.',
      'pick a cell, then a number. keys 1 to 9 work too, arrows move.',
      'notes jot small candidates in a cell. press n to switch them on.',
      'on your own, a hint fills one cell for you.',
      "with friends it's a race on the same puzzle. first correct grid wins.",
    ],
    consequences: [
      'everyone starts a sheet of paper with a name: who the story is about.',
      'each step, write the next line on the sheet in front of you, then pass it on.',
      'you only see the line just above yours. the rest is folded away.',
      'when every sheet is full, they all unfold. read them out, one by one.',
      'no score. if the clock runs out, a blank line goes in and the sheets move on.',
    ],
    onestory: [
      'take turns adding one word to the story.',
      'a word can end with one mark: a full stop, a comma, a question mark.',
      'on your turn, after twelve words, you can say the end instead.',
      'it also ends at the word limit. if your time runs out, the turn passes on.',
      'no score. just the story.',
    ],
    wordsearch: [
      'the words are hidden in the letters, in straight lines: across, down or diagonal.',
      'on the bigger boards they can run backwards too.',
      'drag from the first letter to the last, or click one and then the other.',
      'on your own, a hint rings the first letter of a word you still need.',
      "with friends it's a race on the same grid. first to find them all wins.",
    ],
    futoshiki: [
      'fill the grid so every row and column has each number once.',
      'a sign between two cells must hold. it opens toward the bigger number.',
      'pick a cell, then a number. keys work too, arrows move, n switches notes on.',
      'on your own, a hint fills one cell for you.',
      "with friends it's a race on the same puzzle. first correct grid wins.",
    ],
    wordwheel: [
      'a wheel of letters, and a small crossword with no clues.',
      "drag across the letters to spell a word. let go, and if it's in the grid, it drops in.",
      'each letter once a word. go back over the last letter to take it off.',
      'or click the letters one by one, or type them, then press enter.',
      "real words that aren't in the grid count as extra words.",
      'the middle button shuffles the wheel. on your own, a hint shows one letter.',
      "with friends it's a race on the same wheel. first to fill the grid wins.",
    ],
    sim: [
      'six dots, and fifteen lines between them. take turns drawing one line in your color.',
      'make a triangle in your own color, its corners on three of the dots, and you lose.',
      'click a line, or click one dot and then another. arrows and enter work too.',
      'hovering a line that would close your own triangle shows that triangle, faintly.',
      'there are no draws. by the last line, someone always makes one.',
    ],
    npat: [
      'each round a letter is drawn. write a name, a place, an animal and a thing that start with it.',
      'fill all four and you can say stop. everyone gets three more seconds.',
      "then all the answers show. tap anything that doesn't count. if most of the others agree, it's struck.",
      'an answer nobody else wrote scores 10. one someone else also wrote scores 5.',
      'blank, wrong letter or struck scores nothing. top score after the last round wins.',
    ],
    zip: [
      'draw one line that passes through every cell.',
      'start on 1 and pass the numbers in order. finish on the last one.',
      'drag, or click cells one by one. go back over your line to pull it back.',
      'backspace takes one step back. on your own, a hint shows the next cell.',
      "with friends it's a race on the same grid.",
    ],
  } as Record<string, readonly string[]>,

  /* shared across the game screens --------------------------------------- */
  play: {
    back: 'Back',
    sameScreen: 'On this screen',
    players: 'Players',
    board: 'Board',
    turn: (name: string) => `${name}'s turn`,
    goesAgain: (name: string) => `${name} goes again`,
    wins: (names: readonly string[]) =>
      names.length === 1 ? `${names[0]} wins` : `${listNames(names)} share it`,
    goodGame: 'Good game.',
    draw: 'A draw.',
    fairEnough: 'Fair enough.',
    gameOver: 'Game over.',
    again: 'Again?',
    dock: { label: 'Game', home: 'Home', undo: 'Undo', again: 'Start again' },
  },

  tictactoe: {
    size: 'board size',
    sizes: { classic: '3×3', five: '5×5' },
    cell: (row: number, col: number, mark: string | null) =>
      `row ${row + 1}, column ${col + 1}, ${mark ?? 'empty'}`,
  },

  dots: {
    size: 'dots',
    sizes: { 4: '4×4', 5: '5×5', 6: '6×6' },
    players: 'players',
    edge: (kind: 'h' | 'v', row: number, col: number, drawnBy: string | null) => {
      const where =
        kind === 'h'
          ? `row ${row + 1}, dots ${col + 1} to ${col + 2}`
          : `column ${col + 1}, dots ${row + 1} to ${row + 2}`;
      return `line, ${where}, ${drawnBy ? `drawn by ${drawnBy}` : 'open'}`;
    },
    score: (name: string, boxes: number) => `${name}, ${boxes} ${boxes === 1 ? 'box' : 'boxes'}`,
  },

  morris: {
    place: (name: string) => `${name}, place a piece`,
    move: (name: string) => `${name}, move a piece`,
    fly: (name: string) => `${name}, fly a piece anywhere`,
    remove: (name: string) => `${name}, remove one`,
    drawAsk: (name: string) => `${name}, call it a draw?`,
    offerDraw: 'offer a draw',
    accept: 'accept',
    decline: 'keep playing',
    counts: (inHand: number, onBoard: number, lost: number) =>
      [inHand > 0 ? `hand ${inHand}` : null, `board ${onBoard}`, lost > 0 ? `lost ${lost}` : null]
        .filter(Boolean)
        .join(' · '),
    countsLabel: (name: string, inHand: number, onBoard: number, lost: number) =>
      `${name}: ${inHand} in hand, ${onBoard} on the board, ${lost} lost`,
    point: (spot: string, owner: string | null, hint: string | null) =>
      [spot, owner ? `${owner}'s piece` : 'empty', hint].filter(Boolean).join(', '),
    hints: { selected: 'selected', target: 'can move here', removable: 'can be removed' },
  },

  bingo: {
    yourCall: 'your turn. call a number.',
    calledBy: (name: string) => `called by ${name}`,
    card: 'your card',
    cell: (n: number, crossed: boolean) => `${n}, ${crossed ? 'crossed off' : 'open'}`,
    lines: (name: string, n: number) => `${name}, ${n} of 5 lines`,
    letters: (n: number) => `${n} of 5 lines`,
    recent: 'last called',
    watching: "you're watching this one. you'll get a card next round.",
  },

  connect4: {
    column: (col: number, full: boolean) => `column ${col + 1}${full ? ', full' : ''}`,
  },

  rps: {
    throw: 'throw',
    rock: 'rock',
    paper: 'paper',
    scissors: 'scissors',
    pick: 'pick one.',
    thrown: 'thrown. waiting for the others...',
    ready: 'ready',
    // "you take it", "ana takes it", "you and ana take it"
    takes: (names: readonly string[]) =>
      names.length === 1 && names[0] !== 'you'
        ? `${names[0]} takes it`
        : `${listNames(names)} take it`,
    wash: 'a wash. go again.',
    round: (n: number) => `round ${n}`,
    firstTo: (n: number) => `first to ${n}`,
  },

  sudoku: {
    cell: (row: number, col: number, digit: number, given: boolean) =>
      `row ${row + 1}, column ${col + 1}, ${digit ? digit : 'empty'}${given ? ', given' : ''}`,
    clear: 'clear',
    progress: (name: string, n: number) => `${name}, ${n} of 81 filled`,
    hint: 'pick a cell, then a number. keys 1 to 9 work too.',
    race: 'same puzzle for everyone. first to finish wins.',
    left: (n: number) => `${n} left`,
    digits: 'digits',
    level: 'level',
    levels: { easy: 'easy', medium: 'medium', hard: 'hard' },
    notes: 'notes',
    erase: 'erase',
    undo: 'undo',
    tools: 'tools',
    digit: (d: number, left: number) => (left > 0 ? `${d}, ${left} left` : `${d}, all placed`),
    noteCell: (row: number, col: number, notes: readonly number[]) =>
      `row ${row + 1}, column ${col + 1}, empty${notes.length ? `, notes ${notes.join(' ')}` : ''}`,
  },

  zip: {
    cell: (row: number, col: number, n: number, on: boolean) =>
      `row ${row + 1}, column ${col + 1}${n ? `, number ${n}` : ''}${on ? ', on your line' : ''}`,
    hint: 'start on 1. drag through every cell, numbers in order.',
    reset: 'start over',
    progress: (name: string, n: number, total: number) => `${name}, ${n} of ${total} cells`,
    size: 'board',
    sizes: { 5: '5×5', 6: '6×6', 7: '7×7', 8: '8×8' } as Record<number, string>,
    undo: 'undo',
  },

  consequences: {
    prompt: {
      who: 'who is this about?',
      met: 'who did they meet?',
      where: 'where?',
      said: 'what did the first one say?',
      replied: 'what did the other one say?',
      then: 'what happened next?',
      everyone: 'and what did everyone say?',
    } as Record<string, string>,
    example: {
      who: 'a nervous giraffe',
      met: 'the queen',
      where: 'at the bus stop',
      said: 'is this seat taken?',
      replied: 'only on tuesdays',
      then: 'they opened a bakery',
      everyone: 'about time',
    } as Record<string, string>,
    /** the little words that join the lines when they're read out */
    lead: {
      who: '',
      met: 'met',
      where: '',
      said: 'the first said,',
      replied: 'the other said,',
      then: 'then',
      everyone: 'and everyone said,',
    } as Record<string, string>,
    lineOf: (n: number, of: number) => `line ${n} of ${of}`,
    first: 'a fresh sheet. you start this one.',
    above: 'the line above yours',
    pass: 'fold and pass it on',
    passed: 'passed',
    writing: 'writing',
    waiting: (n: number, of: number) => `folded and passed. ${n} of ${of} done.`,
    unfolded: 'every sheet, unfolded.',
    storyOf: (n: number, of: number) => `story ${n} of ${of}`,
    previous: 'previous',
    next: 'next story',
  },

  onestory: {
    yourWord: 'your word',
    placeholder: 'one word',
    wait: 'wait for your turn',
    add: 'add',
    end: 'the end',
    endAfter: (n: number) => `the end, after ${n} words`,
    badWord: 'one word, no spaces. a mark at the end is fine.',
    story: 'the story so far',
    empty: 'the story starts here.',
    theEnd: 'the end.',
    endedBy: (name: string) => `${name} said the end.`,
    full: 'that was the last word.',
    count: (n: number, of: number) => `${n} of ${of} words`,
    words: (n: number) => `${n} ${n === 1 ? 'word' : 'words'}`,
  },

  wordsearch: {
    cell: (row: number, col: number, letter: string, picked: boolean, hinted: boolean) =>
      `row ${row + 1}, column ${col + 1}, ${letter}${picked ? ', picked' : ''}${hinted ? ', a word starts here' : ''}`,
    list: 'words to find',
    word: (w: string, found: boolean) => `${w}, ${found ? 'found' : 'not found yet'}`,
    left: (n: number) => (n === 1 ? 'one word left.' : `${n} words left.`),
    race: 'same grid for everyone. first to find them all wins.',
    progress: (name: string, n: number, of: number) => `${name}, ${n} of ${of} words`,
  },

  wordwheel: {
    grid: (done: number, of: number) => `the crossword, ${done} of ${of} words filled`,
    slots: 'words in the grid',
    slot: (letters: Array<string | null>, across: boolean, done: boolean) =>
      done
        ? `${letters.join('')}, ${across ? 'across' : 'down'}, filled`
        : `${letters.length} letters ${across ? 'across' : 'down'}: ${letters.map((l) => l ?? 'blank').join(', ')}`,
    wheel: 'the letters',
    letter: (l: string, picked: boolean) => `letter ${l}${picked ? ', picked' : ''}`,
    shuffle: 'shuffle the letters',
    send: (w: string) => `send ${w}`,
    start: 'drag across the letters',
    extra: (w: string, n: number) =>
      `${w} is an extra word. ${n === 1 ? 'the first one.' : `${n} so far.`}`,
    extras: (n: number) => (n === 0 ? '' : n === 1 ? 'one extra word.' : `${n} extra words.`),
    left: (n: number) => (n === 1 ? 'one word left.' : `${n} words left.`),
    race: 'same wheel for everyone. first to fill the grid wins.',
    progress: (name: string, n: number, of: number) => `${name}, ${n} of ${of} words`,
  },

  futoshiki: {
    cell: (
      row: number,
      col: number,
      digit: number,
      given: boolean,
      notes: readonly number[],
      around: readonly string[],
    ) =>
      [
        `row ${row + 1}, column ${col + 1}`,
        digit ? String(digit) : 'empty',
        given ? 'given' : null,
        notes.length ? `notes ${notes.join(' ')}` : null,
        ...around,
      ]
        .filter(Boolean)
        .join(', '),
    relation: (smaller: boolean, where: string) =>
      `${smaller ? 'smaller' : 'bigger'} than ${where}`,
    where: { right: 'right', left: 'left', above: 'above', below: 'below' },
    line: (n: number) => `every row and column has 1 to ${n}. the signs must hold.`,
    race: 'same puzzle for everyone. first correct grid wins.',
    progress: (name: string, n: number, of: number) => `${name}, ${n} of ${of} filled`,
  },

  sim: {
    point: (n: number, picked: boolean) => `dot ${n}${picked ? ', picked' : ''}`,
    line: (a: number, b: number, owner: string | null) =>
      `line from ${a} to ${b}, ${owner ?? 'open'}`,
    owner: (seat: number) => (seat === 0 ? 'first player' : 'second player'),
    lines: (n: number) => `${n} ${n === 1 ? 'line' : 'lines'}`,
    closed: (name: string) => `${name} made a triangle.`,
  },

  npat: {
    category: { name: 'name', place: 'place', animal: 'animal', thing: 'thing' } as Record<
      string,
      string
    >,
    startsWith: 'starts with',
    roundOf: (n: number, of: number) => `round ${n} of ${of}`,
    answers: 'your answers',
    placeholder: (letter: string) => `${letter}...`,
    stop: 'stop',
    stopHint: 'fill all four to say stop',
    stopped: (name: string) => `${name} said stop.`,
    youStopped: 'you said stop.',
    reading: "all the answers. tap anything that doesn't count.",
    ready: 'done reading',
    waiting: (n: number, of: number) => `waiting for the others · ${n} of ${of} ready`,
    points: (n: number) => (n ? `+${n}` : '0'),
    cell: (
      who: string,
      category: string,
      text: string,
      points: number,
      flagged: boolean,
      out: boolean,
    ) =>
      [
        `${who}, ${category}, ${text.trim() || 'blank'}`,
        out ? 'struck' : `${points} points`,
        flagged ? 'flagged by you' : null,
      ]
        .filter(Boolean)
        .join(', '),
    flag: "tap to say it doesn't count",
    table: "this round's answers",
    lastRound: (letter: string, n: number) => `last round, ${letter}: you scored ${n}`,
    lastLetter: (letter: string) => `the last letter was ${letter}`,
    filled: (n: number) => `${n}/4`,
    filledLabel: (name: string, n: number) => `${name}, ${n} of 4 written`,
  },

  /* on your own: sudoku, zip and hangman ----------------------------------- */
  solo: {
    subtitle: 'On your own',
    raceFriends: 'Race friends',
    withFriends: 'Play with friends',
    solved: 'Solved.',
    solvedSub: 'Nicely done.',
    another: 'Another one?',
    anotherWord: 'Another word?',
    newPuzzle: 'New puzzle',
    newWord: 'New word',
    hint: 'Hint',
    hintCostsMiss: 'Hint, costs a miss',
    noHintsLeft: 'No hints on the last miss',
    withHints: (n: number) => `Solved with ${n} ${n === 1 ? 'hint' : 'hints'}.`,
    pulledBack: 'Your line went off track there. It was pulled back.',
    sudokuLine: 'Fill every row, column and box with 1 to 9.',
    hangmanLine: 'Guess the word. Tap or type a letter.',
    gotIt: 'You got it.',
    outOfGuesses: 'Out of guesses.',
  },

  wordchain: {
    startsWith: 'starts with',
    yourWord: 'your word',
    placeholder: (letter: string) => `a word starting with ${letter}`,
    wait: 'wait for your turn',
    send: 'say it',
    out: 'out',
    youreOut: "you're out. watch the rest.",
    chain: 'the chain so far',
    saidBy: (name: string, n: number) => `${name}, ${n} ${n === 1 ? 'word' : 'words'}`,
    wordCount: (n: number) => `${n} ${n === 1 ? 'word' : 'words'} so far`,
    bad: {
      'bad-word': 'three letters or more, letters only.',
      'wrong-letter': 'it has to start with that letter.',
      used: 'that one has been said.',
    } as Record<string, string>,
  },

  hangman: {
    choose: 'pick a secret word',
    choosing: (name: string) => `${name} is picking a word`,
    wordPlaceholder: '3 to 12 letters',
    set: 'set it',
    random: 'pick one for me',
    letters: 'letters',
    letter: (l: string, state: 'open' | 'hit' | 'miss') =>
      state === 'open' ? l : `${l}, ${state === 'hit' ? 'in the word' : 'not in the word'}`,
    misses: (n: number, of: number) => `${n} of ${of} misses`,
    yourWord: 'your word',
    wasWord: (w: string) => `the word was ${w}`,
    solvedBy: (name: string) => `${name} got it`,
    hanged: 'nobody got it.',
    guessing: (name: string) => `${name} is guessing`,
    youSet: "they're guessing your word",
    yourGuess: 'your turn. pick a letter.',
    waitingWord: 'a word is on its way...',
    setterLine: (name: string, n: number, of: number) => `word ${n} of ${of}, set by ${name}`,
  },

  draw: {
    canvas: 'drawing',
    pickWord: 'pick a word to draw',
    choosing: (name: string) => `${name} is picking a word`,
    drawing: (name: string) => `${name} is drawing`,
    yourWord: (w: string) => `draw: ${w}`,
    youGotIt: (w: string) => `you got it: ${w}`,
    guessPlaceholder: 'your guess',
    guess: 'guess',
    undo: 'undo line',
    clear: 'clear',
    pen: 'pen',
    pens: { 1: 'thin', 2: 'thick', 3: 'eraser' } as Record<number, string>,
    shown: (n: number, shown: ReadonlyArray<string | null>) => {
      const known = shown.filter(Boolean).length;
      return known ? `${n} letters: ${shown.map((ch) => ch ?? 'blank').join(' ')}` : `${n} letters`;
    },
    whoSaid: 'who said it first?',
    nobody: 'nobody',
    wasWord: (w: string) => `the word was ${w}`,
    gotIt: (names: readonly string[]) =>
      names.length ? `${listNames(names)} got it.` : 'nobody got it.',
    letters: (n: number) => `${n} letters`,
    sayIt: (name: string) => `${name} is drawing. say it out loud.`,
    roundOf: (n: number, of: number) => `round ${n} of ${of}`,
    drawer: 'drawing',
    got: 'got it',
    waitOthers: 'you got it. waiting for the others...',
    wrongGuesses: 'guesses so far',
  },

  /* rooms ------------------------------------------------------------------ */
  room: {
    pickGame: 'Pick a game',
    change: 'Change',
    done: 'Done',
    seconds: (n: number) => `${n}s`,
    secondsLeft: (n: number) => `${n} ${n === 1 ? 'second' : 'seconds'} left`,
    score: (name: string, n: number) => `${name}, ${n}`,
    newTitle: 'Start a room',
    joinTitle: 'Join with a code',
    online: 'Online',
    yourName: 'Your name',
    namePlaceholder: 'What friends call you',
    game: 'Game',
    code: 'Room code',
    codePlaceholder: 'Four letters',
    start: 'Start a room',
    join: 'Join',
    starting: 'Starting...',
    joining: 'Joining...',
    waking: 'Waking the rooms up. The first one can take a minute.',
    reconnecting: 'Reconnecting...',
    away: 'Away',
    you: 'You',
    host: 'Host',
    share: 'Share link',
    copied: 'Link copied',
    shareText: (code: string) => `Come play. Room ${code}`,
    waiting: 'Waiting for the others...',
    ready: 'Everyone here? Start when ready.',
    begin: 'Start',
    hostStarts: (name: string) => `${name} starts the game.`,
    hostNext: (name: string) => `Waiting for ${name} to start the next round.`,
    backToLobby: 'Back to lobby',
    yourTurn: 'Your turn',
    goAgain: 'You go again',
    askTakeBack: 'Ask to take back your move',
    wantsTakeBack: (name: string) => `${name} wants to take that move back.`,
    letThem: 'Let them',
    keepIt: 'Keep it',
    asked: 'Asked to take it back...',
    youWin: 'You win',
    thinking: (name: string) => `${name} is thinking`,
    leftMidGame: (name: string) => `${name} left, so that game ended.`,
    gone: (code: string) => `No room called ${code}. It may have closed.`,
    full: 'This room is full.',
    badCode: "That code doesn't look right.",
    home: 'Home',
    comingSoon: 'Coming soon.',
    sameScreenForNow: 'One screen for now. Rooms soon.',
    watchingRound: "You're watching this one. You'll be in the next.",
    takesTurns: (n: number) => `${n} play at a time. Everyone gets a go.`,
    roomLabel: (code: string) => `Room ${code}`,
    hostEndedGame: 'The host ended the game.',
    startNewGame: 'Start a new one when ready.',
    backInLobby: 'Back in the lobby.',
    youAreHost: "You're the host now.",
    hostLeft: 'The previous host left, so you can start the next game.',
    hostAway: (name: string) => `${name} is away. Waiting for them to come back.`,
    someAway: "Someone's connection dropped. Their seat is held for two minutes.",
    lost: 'Connection lost',
    lostConnection: "Couldn't reach the room. Check your connection and try again.",
    tryAgain: 'Try again',
    cancel: 'Cancel',
    tryCode: 'Try another code',
    fullHint: 'Wait for someone to leave, then try again.',
  },

  errors: {
    generic: 'That did not work. Try again.',
  },
} as const;
