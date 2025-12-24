/* =========================
   Load board file
   ========================= */

let SOURCE_TEXT = "";
let currentRule = "V";
let difficulty = "normal";

fetch("./map/board.map")
  .then(r => r.text())
  .then(t => {
    SOURCE_TEXT = t;
    initGame();
  });

/* =========================
   Utilities
   ========================= */

const dirs8 = [
  [-1,-1],[0,-1],[1,-1],
  [-1, 0],      [1, 0],
  [-1, 1],[0, 1],[1, 1],
];

function isAmplified(x, y) {
  return (x + y) % 2 === 0;
}

/* =========================
   Game State
   ========================= */

let game;
let board, W, H;
let gameOver = false;
let firstClick = true;
let totalMines = 0;

/* =========================
   Parse Board
   ========================= */

function parseBoard(text) {
  const blocks = text.trim().split(/\n\s*\n/);

  const candidates = blocks.map(b => {
    const lines = b.trim().split("\n");
    const meta = lines[lines.length - 1];
    const m = meta.match(/\[(\d+x\d+)-([0-9A-Fa-f]+)-([A-Z])\]/);
    if (!m) return null;
    return { block: b, rule: m[3] };
  }).filter(x => x && x.rule === currentRule);

  if (candidates.length === 0) {
    alert(`Rule ${currentRule} に対応する盤面がありません`);
    throw new Error("No matching board");
  }

  const src = candidates[Math.floor(Math.random() * candidates.length)].block;

  const lines = src.trim().split("\n");
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

  return { W, H, rule, grid };
}

/* =========================
   Init / Reset
   ========================= */

function initGame() {
  game = parseBoard(SOURCE_TEXT);

  board = game.grid;
  W = game.W;
  H = game.H;

  gameOver = false;
  firstClick = true;

  // ★ safe マスを最初から開く
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (board[y][x].safe) {
        board[y][x].isOpen = true;
      }
    }
  }

  totalMines = board.flat().filter(c => c.isMine).length;

  calcNumbers(currentRule);

  // safe 起点の 0 展開
  expandInitialOpens();

  updateMineCount();
  render();
}

function resetGame() {
  initGame();
}

/* =========================
   Rule / Difficulty UI
   ========================= */

function setRule(r) {
  currentRule = r;
  resetGame();
}

function setDifficulty(d) {
  difficulty = d;
  resetGame();
}

/* =========================
   Number Calculation
   ========================= */

function calcNumbers(rule) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = board[y][x];
      if (c.isMine) continue;

      c.adjacent = 0;

      for (const [dx, dy] of dirs8) {
        const n = board[y + dy]?.[x + dx];
        if (!n || !n.isMine) continue;

        if (rule === "A" && isAmplified(x + dx, y + dy)) {
          c.adjacent += 2;
        } else {
          c.adjacent += 1;
        }
      }
    }
  }
}

/* =========================
   Open Logic
   ========================= */

function openCell(x, y) {
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
    for (const [dx, dy] of dirs8) {
      openCell(x + dx, y + dy);
    }
  }
}

function revealAllMines() {
  board.flat().forEach(c => {
    if (c.isMine) c.isOpen = true;
  });
}

function countFlags(x, y, rule) {
  let count = 0;

  for (const [dx, dy] of dirs8) {
    const c = board[y + dy]?.[x + dx];
    if (!c || !c.isFlagged) continue;

    if (rule === "A" && isAmplified(x + dx, y + dy)) {
      count += 2;
    } else {
      count += 1;
    }
  }
  return count;
}

function openAround(x, y) {
  for (const [dx, dy] of dirs8) {
    openCell(x + dx, y + dy);
  }
}

/* =========================
   UI Helpers
   ========================= */

function updateMineCount() {
  const flags = board.flat().filter(c => c.isFlagged).length;
  document.getElementById("mineCount").textContent =
    Math.max(totalMines - flags, 0);
}

/* =========================
   Render
   ========================= */

function render() {
  const el = document.getElementById("board");
  el.innerHTML = "";
  el.style.gridTemplateColumns = `repeat(${W},32px)`;

  board.forEach((row, y) =>
    row.forEach((c, x) => {
      const d = document.createElement("div");
      d.className = "cell";

      if (c.isOpen) {
        d.classList.add("open");

        if (c.isMine) {
          d.classList.add("mine");
          d.textContent = "●";
        } else if (c.adjacent > 0) {
          d.textContent = c.adjacent;
          d.classList.add("n" + Math.min(c.adjacent, 8));
        }
      } else if (c.isFlagged) {
        d.classList.add("flag");
        d.textContent = "⚑";
      }

      d.onclick = () => {
        if (gameOver) return;

        if (c.isOpen && c.adjacent > 0) {
          if (countFlags(x, y, currentRule) === c.adjacent) {
            openAround(x, y);
          }
        } else {
          openCell(x, y);
        }

        updateMineCount();
        render();
      };

      d.oncontextmenu = e => {
        e.preventDefault();
        if (!c.isOpen) {
          c.isFlagged = !c.isFlagged;
          updateMineCount();
          render();
        }
      };

      el.appendChild(d);
    })
  );
}
