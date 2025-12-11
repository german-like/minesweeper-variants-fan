const boardEl = document.getElementById('board');
const modeBtn = document.getElementById('modeBtn');
const statusEl = document.getElementById('status');

let rows = 10;
let cols = 10;
let mineCount = 15;
let grid;
let gameOver = false;
let firstClick = false;
let flagMode = false;

modeBtn.onclick = () => {
  flagMode = !flagMode;
  modeBtn.textContent = flagMode ? '旗' : 'シャベル';
};

function createGrid() {
  grid = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = { mine: false, num: 0, revealed: false, flagged: false };
    }
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

function computeAdjacencies() {
  const dirs = [-1,0,1];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].mine) continue;
      let count = 0;
      for (let dr of dirs) for (let dc of dirs) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr>=0 && nr<rows && nc>=0 && nc<cols && grid[nr][nc].mine)
          count++;
      }
      grid[r][c].num = count;
    }
  }
}

function revealCell(r, c) {
  const cell = grid[r][c];
  if (cell.revealed || cell.flagged) return;
  cell.revealed = true;

  if (cell.mine) {
    statusEl.textContent = 'ゲームオーバー';
    gameOver = true;
    revealAllMines();
    return;
  }

  if (cell.num === 0) {
    const dirs = [-1,0,1];
    for (let dr of dirs) for (let dc of dirs) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr>=0 && nr<rows && nc>=0 && nc<cols)
        revealCell(nr, nc);
    }
  }
}

function revealAllMines() {
  for (let r=0;r<rows;r++){
    for (let c=0;c<cols;c++){
      if (grid[r][c].mine) grid[r][c].revealed = true;
    }
  }
}

function checkWin() {
  for (let r=0;r<rows;r++){
    for (let c=0;c<cols;c++){
      const cell = grid[r][c];
      if (!cell.mine && !cell.revealed) return false;
    }
  }
  return true;
}

function renderBoard() {
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${cols}, 32px)`;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      const div = document.createElement('div');
      div.className = 'cell';
      div.dataset.r = r;
      div.dataset.c = c;

      if (cell.revealed) {
        div.classList.add('revealed');
        if (cell.mine) {
          div.classList.add('mine');
          div.textContent = '●';
        } else if (cell.num > 0) {
          div.textContent = cell.num;
        }
      }

      div.onclick = () => onCellClick(r, c);
      div.oncontextmenu = (e) => {
        e.preventDefault();
        if (!cell.revealed) {
          cell.flagged = !cell.flagged;
          div.textContent = cell.flagged ? '⚑' : '';
        }
      };

      boardEl.appendChild(div);
    }
  }
}

function onCellClick(r, c) {
  if (gameOver) return;

  // --- 最初のクリックは必ず安全にする ---
  if (!firstClick) {
    firstClick = true;

    if (grid[r][c].mine) {
      do {
        createGrid();
        placeMines();
        computeAdjacencies();
      } while (grid[r][c].mine);
    }
  }
  // --------------------------------------

  revealCell(r, c);

  if (!gameOver && checkWin()) {
    gameOver = true;
    statusEl.textContent = '勝利！';
    revealAllMines();
  }

  renderBoard();
}

// 初期生成
createGrid();
placeMines();
computeAdjacencies();
renderBoard();
