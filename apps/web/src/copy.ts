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
  name: 'Lulll',
  tagline: 'Old notebook games to play with friends. No sign-up.',
  subline: 'The games we used to play on the back of notebooks.',

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
    // toggle buttons keep one name and report on/off through aria-pressed
    darkTheme: 'Dark theme',
    music: 'Music',
    musicOn: 'Play music',
    musicOff: 'Turn music off',
    sfx: 'Sound effects',
    sfxOn: 'Turn sound effects on',
    sfxOff: 'Turn sound effects off',
  },

  footer: {
    signoff: 'Made for fun · adios',
    builtBy: 'Built by',
    withLove: '· with love, boredom and AI',
  },

  layout: {
    hint: 'Drag the cards around, or pin your favourites to the top.',
    reset: 'Reset the order',
  },

  gamesLabel: 'Games',

  games: {
    tictactoe: { title: 'Tic tac toe', line: 'The back-of-the-notebook classic.' },
    dots: { title: 'Squares', line: 'Dots, lines, and stealing boxes.' },
    morris: { title: "Nine men's morris", line: 'Line up three, take one of theirs.' },
    bingo: { title: 'Bingo', line: 'Your own card. First to five lines.' },
    connect4: { title: 'Connect four', line: 'Get four in a row before they do.' },
    skribbl: { title: 'Skribbl', line: 'Bad drawings, wild guesses.' },
    pictionary: { title: 'Pictionary', line: 'One person draws, everyone yells.' },
    wordchain: { title: 'Word chain', line: 'Start where the last word ended.' },
    hangman: { title: 'Hangman', line: 'Guess it before he’s drawn.' },
    rps: { title: 'Rock paper scissors', line: 'Settle it the old way.' },
    sudoku: { title: 'Sudoku', line: 'Nine boxes and a cup of chai.' },
    zip: { title: 'Zip', line: 'One line through every square.' },
    npat: { title: 'Name place animal thing', line: 'One letter, four answers, quick.' },
    sim: { title: 'Sim', line: 'Six dots. Don’t be the one who makes a triangle.' },
    wordsearch: { title: 'Word search', line: 'Hunt for the words hiding in there.' },
    futoshiki: { title: 'Futoshiki', line: 'Sudoku, but with a few arrows.' },
    consequences: { title: 'Consequences', line: 'Write a line, fold, pass. Read the chaos.' },
    onestory: { title: 'One-word story', line: 'A story built one word at a time.' },
    wordwheel: { title: 'Word wheel', line: 'Swipe letters into a tiny crossword.' },
  },

  /** lobby choices per game. keys match GAME_OPTIONS in the rules package. */
  options: {
    variant: { label: 'Board', values: { classic: '3×3', five: '5×5, four in a row' } },
    size: {
      label: 'Board',
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
      label: 'Rounds',
      values: { 1: '1 round', 2: '2 rounds', 3: '3 rounds', 5: '5 rounds', 8: '8 rounds' },
    },
    seconds: {
      label: 'Time',
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
    target: { label: 'First to', values: { 3: 'First to 3', 5: 'First to 5' } },
    lines: { label: 'Lines', values: { 5: '5 lines', 7: '7 lines' } },
    words: { label: 'Words', values: { 30: '30 words', 50: '50 words', 80: '80 words' } },
    letters: { label: 'Letters', values: { 5: '5 letters', 6: '6 letters', 7: '7 letters' } },
    level: { label: 'Level', values: { easy: 'Easy', medium: 'Medium', hard: 'Hard' } },
  } as Record<string, { label: string; values: Record<string, string> }>,

  card: {
    open: (title: string) => `Open ${title}`,
    pin: (title: string) => `Pin ${title} to the top`,
    unpin: (title: string) => `Unpin ${title}`,
    pinShort: 'Pin to the top',
    unpinShort: 'Unpin',
  },

  /* small sheets: how to play, how it works, changelog ---------------------- */
  sheet: {
    done: 'Got it',
    close: 'Close',
    howToPlay: 'How to play',
  },

  about: [
    'Pick a game, start a room, and send the four-letter code or the link to your friends.',
    "They join with just a name. The host starts when everyone's in.",
    'Sudoku, Zip, Hangman, Word search, Futoshiki and Word wheel also work on your own. No room needed.',
    'Tic tac toe, Squares, Morris, Sim and Connect four open straight away for two people on one screen.',
    'Drag the cards into any order you like, or pin your favourites. It stays that way on this device.',
    'Music and sound effects have their own switches, top right.',
    'No accounts and no tracking. Your name stays on your device.',
    'Rooms live in memory and close soon after everyone leaves. Nothing is kept.',
  ],

  changelog: [
    'Softer background music: a tanpura drone, a slow flute, and a little santoor.',
    'Music and sound effects can be switched on and off separately.',
    'Drag the cards into your own order, and pin your favourites to the top.',
    'Now called Lulll.',
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
  changelogDate: '7 Nov 2026',

  /** the rules, a few short lines per game */
  rules: {
    tictactoe: [
      'Take turns putting your mark in an empty square.',
      'Three in a row wins: across, down or corner to corner.',
      'The 5×5 board needs four in a row.',
      'A full board with no line is a draw.',
    ],
    dots: [
      'Take turns drawing one line between two dots next to each other.',
      "Close the fourth side of a box and it's yours. Then you go again.",
      'A box with three sides drawn gets a faint tint, so you can see the danger.',
      'When every box is taken, most boxes wins.',
    ],
    morris: [
      'Each player has nine pieces. Take turns placing them on empty points.',
      'Three of yours along a line is a mill. A mill lets you remove one of theirs.',
      "Pieces in a mill are safe, unless that's all they have left.",
      'Once everything is placed, slide a piece along a line to a free point.',
      'Down to three, you can fly: move a piece to any free point.',
      'Fewer than three pieces, or no move left, and you lose.',
    ],
    bingo: [
      'Everyone gets their own card with 1 to 25, shuffled.',
      "Take turns calling a number from your card. It's crossed off on every card.",
      'A full row, column or diagonal is a line, and crosses off a letter of b-i-n-g-o.',
      'First to five lines wins.',
    ],
    connect4: [
      'Take turns dropping a disc into a column. It falls to the lowest free spot.',
      'Four of yours in a row wins: across, down or diagonal.',
      'A full frame with no four is a draw.',
    ],
    skribbl: [
      'Each turn one person picks a word from three and draws it.',
      'Everyone else types guesses. The sooner you get it, the more you score.',
      'The drawer scores for everyone who gets it.',
      'A letter shows at half time, and another near the end.',
      'Everyone draws once a round.',
    ],
    pictionary: [
      'Each turn one person picks a word from three and draws it.',
      'Everyone else guesses out loud, in the room.',
      'The drawer taps whoever said it first, and you both score a point.',
      'A letter shows at half time, and another near the end.',
    ],
    wordchain: [
      'Say a word that starts with the last letter of the one before.',
      'Three letters or more, and no word twice.',
      "Run out of time and you're out. The last one left wins.",
      "There's no dictionary. The room keeps itself honest.",
    ],
    hangman: [
      'Guess the hidden word one letter at a time. Six misses and it hangs.',
      'On your own, the app picks the word.',
      'With friends, each person sets a word once while the others take turns guessing.',
      'A right letter scores 1, finishing the word 2 more, and a hanging gives the setter 3.',
      'A hint shows a letter, but costs a miss.',
    ],
    rps: [
      'Everyone picks rock, paper or scissors at once. Throws stay hidden until all are in.',
      'Rock beats scissors, scissors beat paper, paper beats rock.',
      'When exactly two shapes show, everyone with the winning one scores.',
      'All the same, or all three, is a wash.',
    ],
    sudoku: [
      'Fill every row, column and 3×3 box with 1 to 9, each once.',
      'Pick a cell, then a number. Keys 1 to 9 work too, arrows move.',
      'Notes jot small candidates in a cell. Press n to switch them on.',
      'On your own, a hint fills one cell for you.',
      "With friends it's a race on the same puzzle. First correct grid wins.",
    ],
    consequences: [
      'Everyone starts a sheet of paper with a name: who the story is about.',
      'Each step, write the next line on the sheet in front of you, then pass it on.',
      'You only see the line just above yours. The rest is folded away.',
      'When every sheet is full, they all unfold. Read them out, one by one.',
      'No score. If the clock runs out, a blank line goes in and the sheets move on.',
    ],
    onestory: [
      'Take turns adding one word to the story.',
      'A word can end with one mark: a full stop, a comma, a question mark.',
      'On your turn, after twelve words, you can say the end instead.',
      'It also ends at the word limit. If your time runs out, the turn passes on.',
      'No score. Just the story.',
    ],
    wordsearch: [
      'The words are hidden in the letters, in straight lines: across, down or diagonal.',
      'On the bigger boards they can run backwards too.',
      'Drag from the first letter to the last, or click one and then the other.',
      'On your own, a hint rings the first letter of a word you still need.',
      "With friends it's a race on the same grid. First to find them all wins.",
    ],
    futoshiki: [
      'Fill the grid so every row and column has each number once.',
      'A sign between two cells must hold. It opens toward the bigger number.',
      'Pick a cell, then a number. Keys work too, arrows move, n switches notes on.',
      'On your own, a hint fills one cell for you.',
      "With friends it's a race on the same puzzle. First correct grid wins.",
    ],
    wordwheel: [
      'A wheel of letters, and a small crossword with no clues.',
      "Drag across the letters to spell a word. Let go, and if it's in the grid, it drops in.",
      'Each letter once a word. Go back over the last letter to take it off.',
      'Or click the letters one by one, or type them, then press enter.',
      "Real words that aren't in the grid count as extra words.",
      'The middle button shuffles the wheel. On your own, a hint shows one letter.',
      "With friends it's a race on the same wheel. First to fill the grid wins.",
    ],
    sim: [
      'Six dots, and fifteen lines between them. Take turns drawing one line in your color.',
      'Make a triangle in your own color, its corners on three of the dots, and you lose.',
      'Click a line, or click one dot and then another. Arrows and enter work too.',
      'Hovering a line that would close your own triangle shows that triangle, faintly.',
      'There are no draws. By the last line, someone always makes one.',
    ],
    npat: [
      'Each round a letter is drawn. Write a name, a place, an animal and a thing that start with it.',
      'Fill all four and you can say stop. Everyone gets three more seconds.',
      "Then all the answers show. Tap anything that doesn't count. If most of the others agree, it's struck.",
      'An answer nobody else wrote scores 10. One someone else also wrote scores 5.',
      'Blank, wrong letter or struck scores nothing. Top score after the last round wins.',
    ],
    zip: [
      'Draw one line that passes through every cell.',
      'Start on 1 and pass the numbers in order. Finish on the last one.',
      'Drag, or click cells one by one. Go back over your line to pull it back.',
      'Backspace takes one step back. On your own, a hint shows the next cell.',
      "With friends it's a race on the same grid.",
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
    size: 'Board size',
    sizes: { classic: '3×3', five: '5×5' },
    cell: (row: number, col: number, mark: string | null) =>
      `Row ${row + 1}, column ${col + 1}, ${mark ?? 'empty'}`,
  },

  dots: {
    size: 'Dots',
    sizes: { 4: '4×4', 5: '5×5', 6: '6×6' },
    players: 'Players',
    edge: (kind: 'h' | 'v', row: number, col: number, drawnBy: string | null) => {
      const where =
        kind === 'h'
          ? `row ${row + 1}, dots ${col + 1} to ${col + 2}`
          : `column ${col + 1}, dots ${row + 1} to ${row + 2}`;
      return `Line, ${where}, ${drawnBy ? `drawn by ${drawnBy}` : 'open'}`;
    },
    score: (name: string, boxes: number) => `${name}, ${boxes} ${boxes === 1 ? 'box' : 'boxes'}`,
  },

  morris: {
    place: (name: string) => `${name}, place a piece`,
    move: (name: string) => `${name}, move a piece`,
    fly: (name: string) => `${name}, fly a piece anywhere`,
    remove: (name: string) => `${name}, remove one`,
    drawAsk: (name: string) => `${name}, call it a draw?`,
    offerDraw: 'Offer a draw',
    accept: 'Accept',
    decline: 'Keep playing',
    counts: (inHand: number, onBoard: number, lost: number) =>
      [inHand > 0 ? `In hand ${inHand}` : null, `On board ${onBoard}`, lost > 0 ? `Lost ${lost}` : null]
        .filter(Boolean)
        .join(' · '),
    countsLabel: (name: string, inHand: number, onBoard: number, lost: number) =>
      `${name}: ${inHand} in hand, ${onBoard} on the board, ${lost} lost`,
    point: (spot: string, owner: string | null, hint: string | null) =>
      [spot, owner ? `${owner}'s piece` : 'empty', hint].filter(Boolean).join(', '),
    hints: { selected: 'selected', target: 'can move here', removable: 'can be removed' },
  },

  bingo: {
    yourCall: 'Your turn. Call a number.',
    calledBy: (name: string) => `Called by ${name}`,
    card: 'Your card',
    cell: (n: number, crossed: boolean) => `${n}, ${crossed ? 'crossed off' : 'open'}`,
    lines: (name: string, n: number) => `${name}, ${n} of 5 lines`,
    letters: (n: number) => `${n} of 5 lines`,
    recent: 'Last called',
    watching: "You're watching this one. You'll get a card next round.",
  },

  connect4: {
    column: (col: number, full: boolean) => `Column ${col + 1}${full ? ', full' : ''}`,
  },

  rps: {
    throw: 'Throw',
    rock: 'Rock',
    paper: 'Paper',
    scissors: 'Scissors',
    pick: 'Pick one.',
    thrown: 'Thrown. Waiting for the others...',
    ready: 'Ready',
    // "you take it", "ana takes it", "you and ana take it"
    takes: (names: readonly string[]) =>
      names.length === 1 && names[0]?.toLowerCase() !== 'you'
        ? `${names[0]} takes it`
        : `${listNames(names)} take it`,
    wash: 'A wash. Go again.',
    round: (n: number) => `Round ${n}`,
    firstTo: (n: number) => `First to ${n}`,
  },

  sudoku: {
    cell: (row: number, col: number, digit: number, given: boolean) =>
      `Row ${row + 1}, column ${col + 1}, ${digit ? digit : 'empty'}${given ? ', given' : ''}`,
    clear: 'Clear',
    progress: (name: string, n: number) => `${name}, ${n} of 81 filled`,
    hint: 'Pick a cell, then a number. Keys 1 to 9 work too.',
    race: 'Same puzzle for everyone. First to finish wins.',
    left: (n: number) => `${n} left`,
    digits: 'Digits',
    level: 'Level',
    levels: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
    notes: 'Notes',
    erase: 'Erase',
    undo: 'Undo',
    tools: 'Tools',
    digit: (d: number, left: number) => (left > 0 ? `${d}, ${left} left` : `${d}, all placed`),
    noteCell: (row: number, col: number, notes: readonly number[]) =>
      `Row ${row + 1}, column ${col + 1}, empty${notes.length ? `, notes ${notes.join(' ')}` : ''}`,
  },

  zip: {
    cell: (row: number, col: number, n: number, on: boolean) =>
      `Row ${row + 1}, column ${col + 1}${n ? `, number ${n}` : ''}${on ? ', on your line' : ''}`,
    hint: 'Start on 1. Drag through every cell, numbers in order.',
    reset: 'Start over',
    progress: (name: string, n: number, total: number) => `${name}, ${n} of ${total} cells`,
    size: 'Board',
    sizes: { 5: '5×5', 6: '6×6', 7: '7×7', 8: '8×8' } as Record<number, string>,
    undo: 'Undo',
  },

  consequences: {
    prompt: {
      who: 'Who is this about?',
      met: 'Who did they meet?',
      where: 'where?',
      said: 'What did the first one say?',
      replied: 'What did the other one say?',
      then: 'What happened next?',
      everyone: 'And what did everyone say?',
    } as Record<string, string>,
    example: {
      who: 'A nervous giraffe',
      met: 'The queen',
      where: 'at the bus stop',
      said: 'Is this seat taken?',
      replied: 'Only on Tuesdays',
      then: 'They opened a bakery',
      everyone: 'About time',
    } as Record<string, string>,
    /** the little words that join the lines when they're read out */
    lead: {
      who: '',
      met: 'Met',
      where: '',
      said: 'The first said,',
      replied: 'The other said,',
      then: 'Then',
      everyone: 'And everyone said,',
    } as Record<string, string>,
    lineOf: (n: number, of: number) => `Line ${n} of ${of}`,
    first: 'A fresh sheet. You start this one.',
    above: 'The line above yours',
    pass: 'Fold and pass it on',
    passed: 'Passed',
    writing: 'Writing',
    waiting: (n: number, of: number) => `Folded and passed. ${n} of ${of} done.`,
    unfolded: 'Every sheet, unfolded.',
    storyOf: (n: number, of: number) => `Story ${n} of ${of}`,
    previous: 'Previous',
    next: 'Next story',
  },

  onestory: {
    yourWord: 'Your word',
    placeholder: 'One word',
    wait: 'Wait for your turn',
    add: 'Add',
    end: 'The end',
    endAfter: (n: number) => `The end, after ${n} words`,
    badWord: 'One word, no spaces. A mark at the end is fine.',
    story: 'The story so far',
    empty: 'The story starts here.',
    theEnd: 'The end.',
    endedBy: (name: string) => `${name} said the end.`,
    full: 'That was the last word.',
    count: (n: number, of: number) => `${n} of ${of} words`,
    words: (n: number) => `${n} ${n === 1 ? 'word' : 'words'}`,
  },

  wordsearch: {
    cell: (row: number, col: number, letter: string, picked: boolean, hinted: boolean) =>
      `Row ${row + 1}, column ${col + 1}, ${letter}${picked ? ', picked' : ''}${hinted ? ', a word starts here' : ''}`,
    list: 'Words to find',
    word: (w: string, found: boolean) => `${w}, ${found ? 'found' : 'not found yet'}`,
    left: (n: number) => (n === 1 ? 'One word left.' : `${n} words left.`),
    race: 'Same grid for everyone. First to find them all wins.',
    progress: (name: string, n: number, of: number) => `${name}, ${n} of ${of} words`,
  },

  wordwheel: {
    grid: (done: number, of: number) => `The crossword, ${done} of ${of} words filled`,
    slots: 'Words in the grid',
    slot: (letters: Array<string | null>, across: boolean, done: boolean) =>
      done
        ? `${letters.join('')}, ${across ? 'across' : 'down'}, filled`
        : `${letters.length} letters ${across ? 'across' : 'down'}: ${letters.map((l) => l ?? 'blank').join(', ')}`,
    wheel: 'The letters',
    letter: (l: string, picked: boolean) => `letter ${l}${picked ? ', picked' : ''}`,
    shuffle: 'Shuffle the letters',
    send: (w: string) => `Send ${w}`,
    start: 'Drag across the letters',
    extra: (w: string, n: number) =>
      `${w} is an extra word. ${n === 1 ? 'The first one.' : `${n} so far.`}`,
    extras: (n: number) => (n === 0 ? '' : n === 1 ? 'One extra word.' : `${n} extra words.`),
    left: (n: number) => (n === 1 ? 'One word left.' : `${n} words left.`),
    race: 'Same wheel for everyone. First to fill the grid wins.',
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
    line: (n: number) => `Every row and column has 1 to ${n}. The signs must hold.`,
    race: 'Same puzzle for everyone. First correct grid wins.',
    progress: (name: string, n: number, of: number) => `${name}, ${n} of ${of} filled`,
  },

  sim: {
    point: (n: number, picked: boolean) => `dot ${n}${picked ? ', picked' : ''}`,
    line: (a: number, b: number, owner: string | null) =>
      `Line from ${a} to ${b}, ${owner ?? 'open'}`,
    owner: (seat: number) => (seat === 0 ? 'first player' : 'second player'),
    lines: (n: number) => `${n} ${n === 1 ? 'line' : 'lines'}`,
    closed: (name: string) => `${name} made a triangle.`,
  },

  npat: {
    category: { name: 'Name', place: 'Place', animal: 'Animal', thing: 'Thing' } as Record<
      string,
      string
    >,
    startsWith: 'Starts with',
    roundOf: (n: number, of: number) => `Round ${n} of ${of}`,
    answers: 'Your answers',
    placeholder: (letter: string) => `${letter}...`,
    stop: 'Stop',
    stopHint: 'Fill all four to say stop',
    stopped: (name: string) => `${name} said stop.`,
    youStopped: 'You said stop.',
    reading: "All the answers. Tap anything that doesn't count.",
    ready: 'Done reading',
    waiting: (n: number, of: number) => `Waiting for the others · ${n} of ${of} ready`,
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
    flag: "Tap to say it doesn't count",
    table: "This round's answers",
    lastRound: (letter: string, n: number) => `Last round, ${letter}: you scored ${n}`,
    lastLetter: (letter: string) => `The last letter was ${letter}`,
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
    startsWith: 'Starts with',
    yourWord: 'Your word',
    placeholder: (letter: string) => `A word starting with ${letter}`,
    wait: 'Wait for your turn',
    send: 'Say it',
    out: 'Out',
    youreOut: "You're out. Watch the rest.",
    chain: 'The chain so far',
    saidBy: (name: string, n: number) => `${name}, ${n} ${n === 1 ? 'word' : 'words'}`,
    wordCount: (n: number) => `${n} ${n === 1 ? 'word' : 'words'} so far`,
    bad: {
      'bad-word': 'Three letters or more, letters only.',
      'wrong-letter': 'It has to start with that letter.',
      used: 'That one has been said.',
    } as Record<string, string>,
  },

  hangman: {
    choose: 'Pick a secret word',
    choosing: (name: string) => `${name} is picking a word`,
    wordPlaceholder: '3 to 12 letters',
    set: 'Set it',
    random: 'Pick one for me',
    letters: 'Letters',
    letter: (l: string, state: 'open' | 'hit' | 'miss') =>
      state === 'open' ? l : `${l}, ${state === 'hit' ? 'in the word' : 'not in the word'}`,
    misses: (n: number, of: number) => `${n} of ${of} misses`,
    yourWord: 'Your word',
    wasWord: (w: string) => `The word was ${w}`,
    solvedBy: (name: string) => `${name} got it`,
    hanged: 'Nobody got it.',
    guessing: (name: string) => `${name} is guessing`,
    youSet: "They're guessing your word",
    yourGuess: 'Your turn. Pick a letter.',
    waitingWord: 'A word is on its way...',
    setterLine: (name: string, n: number, of: number) => `Word ${n} of ${of}, set by ${name}`,
  },

  draw: {
    canvas: 'Drawing',
    pickWord: 'Pick a word to draw',
    choosing: (name: string) => `${name} is picking a word`,
    drawing: (name: string) => `${name} is drawing`,
    yourWord: (w: string) => `Draw: ${w}`,
    youGotIt: (w: string) => `You got it: ${w}`,
    guessPlaceholder: 'Your guess',
    guess: 'Guess',
    undo: 'Undo line',
    clear: 'Clear',
    pen: 'Pen',
    pens: { 1: 'Thin', 2: 'Thick', 3: 'Eraser' } as Record<number, string>,
    shown: (n: number, shown: ReadonlyArray<string | null>) => {
      const known = shown.filter(Boolean).length;
      return known ? `${n} letters: ${shown.map((ch) => ch ?? 'blank').join(' ')}` : `${n} letters`;
    },
    whoSaid: 'Who said it first?',
    nobody: 'Nobody',
    wasWord: (w: string) => `The word was ${w}`,
    gotIt: (names: readonly string[]) =>
      names.length ? `${listNames(names)} got it.` : 'Nobody got it.',
    letters: (n: number) => `${n} letters`,
    sayIt: (name: string) => `${name} is drawing. Say it out loud.`,
    roundOf: (n: number, of: number) => `Round ${n} of ${of}`,
    drawer: 'Drawing',
    got: 'Got it',
    waitOthers: 'You got it. Waiting for the others...',
    wrongGuesses: 'Guesses so far',
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
