fetch("./map/board.map").then(r=>r.text()).then(t=>{
   parseBoardText(t);
   render();
});

/* =========================
   Utilities
   ========================= */

function parseBoard(text) {
  const lines = text.trim().split("\n");
  const meta = lines.pop();
  const [, size, hex, rule] =
    meta.match(/\[(\d+x\d+)-([0-9A-Fa-f]+)-([A-Z])\]/);

  const [W, H] = size.split("x").map(Number);

  const grid = lines.map(row =>
    row.split("").map(c => ({
      raw: c,
      isMine: c === "1",
      safe: c === "-",
      isOpen: false,
      isFlagged: false,
      adjacent: 0
    }))
  );

  return { W, H, hex, rule, grid };
}

function pickRandomBoard() {
  const src = BOARDS[Math.floor(Math.random() * BOARDS.length)];
  return parseBoard(src);
}


/* =========================
   Game State
   ========================= */

const dirs8 = [
  [-1,-1],[0,-1],[1,-1],
  [-1, 0],      [1, 0],
  [-1, 1],[0, 1],[1, 1],
];

let game;
let board;
let W, H;
let gameOver = false;
let firstClick = true;


/* =========================
   Init
   ========================= */

function initGame() {
  game = pickRandomBoard();
  board = game.grid;
  W = game.W;
  H = game.H;
  gameOver = false;
  firstClick = true;

  calcNumbers();
  render();
}


/* =========================
   Number Calculation
   ========================= */

function isAmplified(x,y) {
  return (x + y) % 2 === 0;
}

function calcNumbers() {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = board[y][x];
      if (c.isMine) continue;

      c.adjacent = dirs8.reduce((s,[dx,dy])=>{
        const n = board[y+dy]?.[x+dx];
        if (!n || !n.isMine) return s;
        if (game.rule === "A" && isAmplified(x+dx,y+dy)) return s + 2;
        return s + 1;
      },0);
    }
  }
}


/* =========================
   Open Logic
   ========================= */

function openCell(x,y) {
  const c = board[y]?.[x];
  if (!c || c.isOpen || c.isFlagged) return;

  c.isOpen = true;

  if (c.isMine) {
    gameOver = true;
    revealAllMines();
    alert("Game Over");
    return;
  }

  if (c.adjacent === 0) {
    dirs8.forEach(([dx,dy]) => openCell(x+dx,y+dy));
  }
}

function revealAllMines() {
  board.flat().forEach(c => {
    if (c.isMine) c.isOpen = true;
  });
}

function countFlags(x,y) {
  return dirs8.reduce(
    (s,[dx,dy]) => s + (board[y+dy]?.[x+dx]?.isFlagged ? 1 : 0),
    0
  );
}

function openAround(x,y) {
  dirs8.forEach(([dx,dy]) => {
    const c = board[y+dy]?.[x+dx];
    if (c && !c.isOpen && !c.isFlagged) openCell(x+dx,y+dy);
  });
}


/* =========================
   Render
   ========================= */

function render() {
  const el = document.getElementById("board");
  el.innerHTML = "";
  el.style.gridTemplateColumns = `repeat(${W},32px)`;

  board.forEach((row,y)=>row.forEach((c,x)=>{
    const d = document.createElement("div");
    d.className = "cell";

    if (game.rule === "A" && !c.isOpen && isAmplified(x,y))
      d.style.background = "#bdbdbd";

    if (c.isOpen) {
      d.classList.add("open");
      if (c.isMine) d.textContent = "●";
      else if (c.adjacent > 0) d.textContent = c.adjacent;
    }
    else if (c.isFlagged) {
      d.textContent = "⚑";
    }

    d.onclick = () => {
      if (gameOver) return;

      if (firstClick && c.safe) {
        firstClick = false;
      }

      if (c.isOpen && c.adjacent > 0) {
        if (countFlags(x,y) === c.adjacent) openAround(x,y);
        render();
        return;
      }

      if (!c.isFlagged) {
        openCell(x,y);
        render();
      }
    };

    d.oncontextmenu = e => {
      e.preventDefault();
      if (!c.isOpen) {
        c.isFlagged = !c.isFlagged;
        render();
      }
    };

    el.appendChild(d);
  }));
}


/* =========================
   Start
   ========================= */

initGame();
