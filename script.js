const boardEl = document.getElementById("board");
const presetSelect = document.getElementById("preset");
const ruleSelect = document.getElementById("ruleSelect");
const newBtn = document.getElementById("newBtn");
const modeBtn = document.getElementById("modeBtn");
const statusEl = document.getElementById("status");
const flagsLeftEl = document.getElementById("flagsLeft");

let rows = 5, cols = 5, mineCount = 5;
let grid = [];
let firstClick = false;
let gameOver = false;
let shovelMode = true;
let flagsLeft = 0;

/* -------------------------------------------------- */
/* UI 有効/無効 */
/* -------------------------------------------------- */
function setControlsEnabled(enabled) {
  presetSelect.disabled = !enabled;
  ruleSelect.disabled = !enabled;
}

/* -------------------------------------------------- */
/* 盤面生成 */
/* -------------------------------------------------- */
function createGrid() {
  grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        mine: false,
        revealed: false,
        flag: false,
        num: 0,
        dark: false,
      });
    }
    grid.push(row);
  }
}

function placeMines() {
  let placed = 0;
  while (placed < mineCount) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (!grid[r][c].mine) {
      grid[r][c].mine = true;
      placed++;
    }
  }
}

/* 増幅ルール：チェス盤濃淡 */
function applyChessPattern() {
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      grid[r][c].dark = ((r + c) % 2 === 0);
}

/* 数字計算 */
function computeAdjacencies() {
  const dirs = [
    [-1,-1],[-1,0],[-1,1],
    [0,-1],        [0,1],
    [1,-1],[1,0],[1,1]
  ];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let count = 0;
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (grid[nr][nc].mine) {
          // 通常 or 増幅
          if (ruleSelect.value === "amplify" && grid[nr][nc].dark)
            count += 2;
          else
            count++;
        }
      }
      grid[r][c].num = count;
    }
  }
}

/* -------------------------------------------------- */
/* 描画 */
/* -------------------------------------------------- */
function renderBoard() {
  boardEl.style.gridTemplateColumns = `repeat(${cols}, 32px)`;
  boardEl.innerHTML = "";

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      const div = document.createElement("div");
      div.className = "cell";

      if (cell.dark && ruleSelect.value === "amplify") div.classList.add("dark");
      if (cell.revealed) div.classList.add("revealed");
      if (cell.flag) div.classList.add("flag");

      if (cell.revealed) {
        div.classList.remove("dark"); // 開いたら白
        if (cell.mine) {
          div.classList.add("mine");
          div.textContent = "●";
        } else if (cell.num > 0) {
          div.textContent = cell.num;
          div.classList.add(`num${cell.num}`);
        }
      }

      div.addEventListener("click", () => onCellClick(r, c));
      div.addEventListener("contextmenu", e => {
        e.preventDefault();
        toggleFlag(r, c);
      });

      boardEl.appendChild(div);
    }
  }

  flagsLeftEl.textContent = flagsLeft;
}

/* -------------------------------------------------- */
/* ゲームロジック */
/* -------------------------------------------------- */
function toggleFlag(r, c) {
  if (gameOver) return;
  const cell = grid[r][c];
  if (cell.revealed) return;

  if (cell.flag) {
    cell.flag = false;
    flagsLeft++;
  } else {
    if (flagsLeft > 0) {
      cell.flag = true;
      flagsLeft--;
    }
  }
  renderBoard();
}

function onCellClick(r, c) {
  if (gameOver) return;

  // ゲーム中はルール変更不可
  if (!firstClick) {
    firstClick = true;
    setControlsEnabled(false);
  }

  const cell = grid[r][c];

  if (cell.flag) return;

  // 初回クリック → そのマスは安全にする
  if (firstClick && !cell.revealed && cell.mine) {
    cell.mine = false;
    recomputeMines();
  }

  reveal(r, c);
  checkWin();
  renderBoard();
}

function reveal(r, c) {
  const cell = grid[r][c];
  if (cell.revealed || cell.flag) return;

  cell.revealed = true;

  if (cell.mine) {
    gameOver = true;
    statusEl.textContent = "ゲームオーバー";
    revealAllMines();
    setControlsEnabled(true); // ← ここポイント
    return;
  }

  if (cell.num === 0) {
    const dirs = [
      [-1,-1],[-1,0],[-1,1],
      [0,-1],        [0,1],
      [1,-1],[1,0],[1,1]
    ];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      reveal(nr, nc);
    }
  }
}

function revealAllMines() {
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (grid[r][c].mine) grid[r][c].revealed = true;

  renderBoard();
}

/* 勝利判定 */
function checkWin() {
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (!grid[r][c].mine && !grid[r][c].revealed) return;

  gameOver = true;
  statusEl.textContent = "クリア！";
  setControlsEnabled(true); // ← 終了後はルール変更可
}

/* 初回クリック補正後の数値再計算 */
function recomputeMines() {
  computeAdjacencies();
}

/* -------------------------------------------------- */
/* 新規ゲーム */
/* -------------------------------------------------- */
function startNew() {
  gameOver = false;
  firstClick = false;
  statusEl.textContent = "準備完了";

  // プリセット反映
  const [w, h] = presetSelect.value.split("x").map(Number);
  rows = w;
  cols = h;
  mineCount = Math.floor(rows * cols * 0.2);

  flagsLeft = mineCount;
  setControlsEnabled(true);

  createGrid();
  placeMines();
  if (ruleSelect.value === "amplify") applyChessPattern();
  computeAdjacencies();
  renderBoard();
}

newBtn.addEventListener("click", startNew);

/* モード切替（シャベル ⇄ 旗） */
modeBtn.addEventListener("click", () => {
  shovelMode = !shovelMode;
  modeBtn.textContent = shovelMode ? "シャベル" : "旗";
});

/* 初期開始 */
startNew();
