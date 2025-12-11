import { applyBasicLogic } from "./solver_inference/base.js";

function solverStep() {
    const changed = applyBasicLogic(board, openCell);
    return changed;
}

const rows = 5;
const cols = 5;
const minesCount = 10;

let board = [];
let firstClick = true;
let mode = 'dig'; // 'dig' or 'flag'

// ボード作成
function createBoard() {
  const boardElement = document.getElementById('board');
  boardElement.innerHTML = '';
  board = [];
  firstClick = true;

  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = r;
      cell.dataset.col = c;
      boardElement.appendChild(cell);

      cell.addEventListener('click', () => handleClick(r, c));
      cell.addEventListener('contextmenu', e => e.preventDefault()); // 右クリック無効化（モードで制御）
      
      row.push({ element: cell, mine: false, opened: false, number: 0 });
    }
    board.push(row);
  }
}

// 地雷設置（最初のクリック後）
function placeMines(safeRow, safeCol) {
  let placed = 0;
  while (placed < minesCount) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if ((r === safeRow && c === safeCol) || board[r][c].mine) continue;
    board[r][c].mine = true;
    placed++;
  }

  // 数字計算
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            if (board[nr][nc].mine) count++;
          }
        }
      }
      board[r][c].number = count;
    }
  }
}

// クリック処理
function handleClick(r, c) {
  const cell = board[r][c];

  if (mode === 'flag') {
    if (!cell.opened) {
      cell.element.textContent = cell.element.textContent === '🚩' ? '' : '🚩';
    }
    return;
  }

  if (firstClick) {
    placeMines(r, c);
    firstClick = false;
  }

  openCell(r, c);
}

// セルを開く
function openCell(r, c) {
  const cell = board[r][c];
  if (cell.opened || cell.element.textContent === '🚩') return;

  if (cell.number > 0) {
    cell.element.textContent = cell.number;
    cell.element.dataset.number = cell.number;
  }

  cell.opened = true;
  cell.element.classList.add('open');

  if (cell.mine) {
    cell.element.classList.add('mine');
    cell.element.textContent = '💣';
    alert('ゲームオーバー！');
    revealMines();
    return;
  }

  if (cell.number > 0) {
    cell.element.textContent = cell.number;
  } else {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          openCell(nr, nc);
        }
      }
    }
  }
}

// 全地雷を表示
function revealMines() {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) {
        board[r][c].element.classList.add('mine');
        board[r][c].element.textContent = '💣';
      }
    }
  }
}

// モード切替
document.getElementById('modeBtn').addEventListener('click', () => {
  mode = mode === 'dig' ? 'flag' : 'dig';
  document.getElementById('modeBtn').textContent = 'モード: ' + (mode === 'dig' ? '掘る' : '旗');
});

// リセット
document.getElementById('reset').addEventListener('click', createBoard);

createBoard();
