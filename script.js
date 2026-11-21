
import { Chess } from 'chess.js';
import 'chessboard-element';

// =================================
// 1. CHESS SETUP
// =================================

const game = new Chess();

const board = document.querySelector('#board');
const status = document.querySelector('#status');
const setupScreen = document.querySelector('#setup-screen');
const startButton = document.querySelector('#start-game');
const whiteClock = document.querySelector('#white-clock');
const blackClock = document.querySelector('#black-clock');
const whiteTime = document.querySelector('#white-time');
const blackTime = document.querySelector('#black-time');

// =================================
// 2. RUCHIEKA'S PERSONALITY
// =================================

const playerComments = [
  "Interesting. I'll allow it. 🎀",
  "Bold move. Questionable judgement.",
  "Oh, we're getting competitive now?",
  "I've seen better moves in a traffic jam.",
  "I respect the confidence. Not the move.",
  "Are we playing chess or experimenting?",
  "I hope you have a plan. Truly.",
  "Well, that's one way to do it.",
  "Fascinating. Not necessarily brilliant.",
  "Your move. My entertainment.",
  "Somewhere, a chess coach just sighed."
];

const ruchiekaComments = [
  "I'll be taking that, thank you.",
  "A little lesson in chess, darling.",
  "Did you see that coming?",
  "Calculated. Obviously.",
  "I do enjoy a good surprise.",
  "Please, do try to keep up.",
  "That was rather satisfying.",
  "I'm afraid I saw that coming.",
  "You made that far too easy.",
  "And that's how it's done. 🎀"
];

function randomComment(list) {
  return list[Math.floor(Math.random() * list.length)];
}

const pieceValues = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100
};

// =================================
// 3. MOVE-AWARE COMMENTARY
// =================================

function getMoveComment(move, side) {
  const isPlayer = side === 'you';
  const opponent = isPlayer ? 'b' : 'w';
  const mover = isPlayer ? 'w' : 'b';

  if (game.isCheckmate()) {
    return isPlayer
      ? "CHECKMATE! I need a moment. 😭"
      : "Checkmate, darling. That was inevitable. 🎀";
  }

  if (game.isDraw()) {
    return "A draw! I suppose we're equally brilliant.";
  }

  if (game.isCheck()) {
    return isPlayer
      ? "Oh. That's rather inconvenient."
      : "A little situation has developed. Check. ♟️";
  }

  if (move.promotion) {
    return isPlayer
      ? "A promotion! Well, someone's ambitious."
      : "Promotion, darling. Things just got interesting.";
  }

  if (
    move.captured &&
    pieceValues[move.captured] > pieceValues[move.piece]
  ) {
    return isPlayer
      ? "Well. That was actually rather good. I'm impressed."
      : "A rather lovely exchange, wouldn't you say?";
  }

  if (
    game.isAttacked(move.to, opponent) &&
    !game.isAttacked(move.to, mover)
  ) {
    return isPlayer
      ? "Oh dear. You've left that piece hanging. 😬"
      : "I believe I've just left you a little present.";
  }

  if (move.captured) {
    return isPlayer
      ? "EXCUSE ME? That was mine! 😭"
      : "I'll be keeping that, thank you.";
  }

  return isPlayer
    ? randomComment(playerComments)
    : randomComment(ruchiekaComments);
}

// =================================
// 4. TIME SELECTION
// =================================

let selectedTime = 3;

document.querySelectorAll('.time-option').forEach(button => {
  button.addEventListener('click', () => {
    selectedTime = Number(button.dataset.time);

    document.querySelectorAll('.time-option').forEach(option => {
      option.style.background = 'white';
      option.style.borderColor = '#f2c6d8';
    });

    button.style.background = '#ffe0ec';
    button.style.borderColor = '#d98eae';
  });
});

// =================================
// 5. CLOCKS
// =================================

let whiteSeconds = 180;
let blackSeconds = 180;

let activeClock = 'w';
let timerInterval = null;
let gameStarted = false;
let timeExpired = false;
let engineThinking = false;
let engineRequestTime = 0;
let pendingMoveTimer = null;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return String(minutes).padStart(2, '0') + ':' +
    String(remaining).padStart(2, '0');
}

function updateClocks() {
  whiteTime.textContent = formatTime(whiteSeconds);
  blackTime.textContent = formatTime(blackSeconds);

  whiteClock.classList.toggle('active', activeClock === 'w');
  blackClock.classList.toggle('active', activeClock === 'b');
}

function updateStatus(message) {
  if (status) {
    status.textContent = message;
  }
}

function stopClock() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function startClock() {
  if (selectedTime === 0 || timerInterval || timeExpired) return;

  timerInterval = setInterval(() => {
    if (!gameStarted || timeExpired || game.isGameOver()) {
      stopClock();
      return;
    }

    if (activeClock === 'w') {
      whiteSeconds--;
    } else {
      blackSeconds--;
    }

    updateClocks();

    if (whiteSeconds <= 0 || blackSeconds <= 0) {
      timeExpired = true;
      stopClock();

      if (pendingMoveTimer) {
        clearTimeout(pendingMoveTimer);
        pendingMoveTimer = null;
      }

      engineThinking = false;

      updateStatus(
        activeClock === 'w'
          ? "Time's up! Ruchieka wins. 🎀"
          : "You win on time! How embarrassing for me."
      );
    }
  }, 1000);
}

// =================================
// 6. CHESSBOARD
// =================================

board.draggablePieces = true;
board.setPosition(game.fen());

board.style.display = 'none';
whiteClock.style.display = 'none';
blackClock.style.display = 'none';

// =================================
// 7. STOCKFISH
// =================================

// FIXED FOR GITHUB PAGES
const engine = new Worker(
  import.meta.env.BASE_URL + 'engine/stockfish-19-lite-single.js'
);

let engineReady = false;

function askRuchieka() {
  if (
    !gameStarted ||
    !engineReady ||
    game.isGameOver() ||
    timeExpired
  ) return;

  if (game.turn() !== 'b' || engineThinking) return;

  engineThinking = true;
  activeClock = 'b';
  engineRequestTime = Date.now();

  updateClocks();
  updateStatus('Ruchieka is thinking... 🤔');

  engine.postMessage('position fen ' + game.fen());
  engine.postMessage('go depth 12');
}

// =================================
// 8. RUCHIEKA MAKES HER MOVE
// =================================

function makeRuchiekaMove(moveText) {
  pendingMoveTimer = null;

  if (!gameStarted || timeExpired || game.isGameOver()) {
    engineThinking = false;
    return;
  }

  if (!moveText || moveText === '(none)') {
    engineThinking = false;
    return;
  }

  try {
    const move = game.move({
      from: moveText.substring(0, 2),
      to: moveText.substring(2, 4),
      promotion: moveText[4] || 'q'
    });

    board.setPosition(game.fen());

    engineThinking = false;

    const comment = getMoveComment(move, 'ruchieka');
    updateStatus(comment);

    if (game.isGameOver()) {
      stopClock();
    } else {
      activeClock = 'w';
      updateClocks();
    }
  } catch (error) {
    engineThinking = false;
    console.error('Ruchieka move error:', error);
    updateStatus('Oops! Ruchieka made a mistake. Refresh the page.');
  }
}

// =================================
// 9. ENGINE MESSAGES
// =================================

engine.onmessage = (event) => {
  const message = String(event.data);

  if (message === 'uciok') {
    engine.postMessage('isready');
  }

  if (message === 'readyok') {
    engineReady = true;

    if (gameStarted && game.turn() === 'b') {
      askRuchieka();
    }
  }

  if (message.startsWith('bestmove')) {
    if (!engineThinking || pendingMoveTimer !== null) return;

    const move = message.split(' ')[1];

    const elapsed = Date.now() - engineRequestTime;
    const remainingDelay = Math.max(0, 2000 - elapsed);

    pendingMoveTimer = setTimeout(() => {
      makeRuchiekaMove(move);
    }, remainingDelay);
  }
};

// Start Stockfish
engine.postMessage('uci');

// =================================
// 10. START GAME
// =================================

startButton.addEventListener('click', () => {
  whiteSeconds = selectedTime * 60;
  blackSeconds = selectedTime * 60;

  activeClock = 'w';
  gameStarted = true;
  timeExpired = false;
  engineThinking = false;

  stopClock();

  setupScreen.style.display = 'none';
  board.style.display = 'block';

  if (selectedTime === 0) {
    whiteClock.style.display = 'none';
    blackClock.style.display = 'none';
  } else {
    whiteClock.style.display = 'block';
    blackClock.style.display = 'block';

    updateClocks();
    startClock();
  }

  updateStatus('Ruchieka is ready to play! 🎀');
});

// =================================
// 11. PLAYER MOVES
// =================================

board.addEventListener('drag-start', (event) => {
  if (
    !gameStarted ||
    timeExpired ||
    game.isGameOver() ||
    game.turn() !== 'w'
  ) {
    event.preventDefault();
  }
});

board.addEventListener('drop', (event) => {
  const { source, target, setAction } = event.detail;

  if (
    !gameStarted ||
    timeExpired ||
    game.turn() !== 'w' ||
    game.isGameOver()
  ) {
    setAction('snapback');
    return;
  }

  let move;

  try {
    move = game.move({
      from: source,
      to: target,
      promotion: 'q'
    });
  } catch {
    move = null;
  }

  if (!move) {
    setAction('snapback');
    return;
  }

  updateStatus(getMoveComment(move, 'you'));

  if (game.isGameOver()) {
    stopClock();
    return;
  }

  activeClock = 'b';
  updateClocks();

  askRuchieka();
});

// =================================
// 12. BOARD ANIMATION
// =================================

board.addEventListener('snap-end', () => {
  board.setPosition(game.fen());
});

// Initial message
updateStatus('Choose your game time! 🎀');

// Show game after clicking Let's Play
document.getElementById('start-game').addEventListener('click', () => {
  document.getElementById('setup-screen').style.display = 'none';
  document.querySelector('.game-area').style.display = 'block';
});

