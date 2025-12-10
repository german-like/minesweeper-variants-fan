// script.js
let boards = [], currentBoard = null;
const boardEl = document.getElementById('board');
const resetBtn = document.getElementById('reset');
const statusText = document.getElementById('statusText');
const flagToggle = document.getElementById('flagToggle');
let gameOver = false, flagMode = false;

// ======================
// fetch で自動読み込み
// ======================
loadBRDFileViaFetch('board.brd', parsedBoards => {
  boards = parsedBoards;
  if (boards.length > 0) startRandomBoard();
  else console.warn('board.brd が空です');
});

// ======================
// ランダム盤面選択
// ======================
function selectRandomBoard() {
  if (boards.length === 0) return null;
  return JSON.parse(JSON.stringify(boards[Math.floor(Math.random() * boards.length)]));
}

function startRandomBoard() {
  currentBoard = selectRandomBoard();
  if (!currentBoard) return;

  gameOver = false;
  flagMode = false;
  flagToggle.classList.remove("active");
  flagToggle.textContent = "🚩 フラグモード OFF";

  calcAdjFromBoard(currentBoard);
  renderBoard(currentBoard);
  setStatus("");
}

// ======================
// 地雷周囲数計算
// ======================
function calcAdjFromBoard(board) {
  const { rows, cols, cells } = board;

  function eachN(r, c, fn) {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) fn(nr, nc);
      }
  }

  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (cells[r][c].mine) {
        cells[r][c].adjacent = -1;
        continue;
      }
      let cnt = 0;
      eachN(r, c, (nr, nc) => { if (cells[nr][nc].mine) cnt++; });
      cells[r][c].adjacent = cnt;
    }
}

// ======================
// 描画（updateCell を必ず呼ぶ）
// ======================
function renderBoard(board) {
  const { rows, cols, cells } = board;
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;

  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const cell = cells[r][c];
      const el = document.createElement('div');
      el.className = 'cell';
      el.dataset.r = r;
      el.dataset.c = c;

      // ★表示は全部 updateCell に任せる
      updateCell(el, cell);

      // クリック
      el.addEventListener('click', () => {
        if (gameOver) return;

        // フラグモード
        if (flagMode) {
          if (!cell.open) {
            cell.flagged = !cell.flagged;
            updateCell(el, cell);
          }
          return;
        }

        // 旗のあるセルは開けない
        if (cell.flagged || cell.open) return;

        openCell(cells, r, c);
        renderBoard(board);
        checkWin();
      });

      boardEl.appendChild(el);
    }
}

// ======================
// ★ 旗消失バグ修正版 updateCell
// ======================
function updateCell(el, cell) {
  // open クラス（重要）
  if (cell.open) el.classList.add('open');
  else el.classList.remove('open');

  // flag
  if (cell.flagged) {
    el.classList.add('flag');
    el.textContent = '🚩';
    return;
  } else {
    el.classList.remove('flag');
  }

  // open & 内容
  if (cell.open) {
    if (cell.mine) {
      el.textContent = '💣';
    } else if (cell.adjacent > 0) {
      el.textContent = cell.adjacent;
    } else {
      el.textContent = '';
    }
  } else {
    // 未オープン
    el.textContent = '';
  }
}

// ======================
// 空マスオープン再帰
// ======================
function openCell(cells, r, c) {
  const rows = cells.length, cols = cells[0].length;

  function eachN(r, c, fn) {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) fn(nr, nc);
      }
  }

  const cell = cells[r][c];
  if (cell.open || cell.flagged) return;
  cell.open = true;

  if (cell.mine) {
    gameOver = true;
    setStatus("爆発！ゲームオーバー", true);
    return;
  }

  // 周囲0なら広がる
  if (cell.adjacent === 0) {
    eachN(r, c, (nr, nc) => openCell(cells, nr, nc));
  }
}

// ======================
// フラグ・ステータス
// ======================
flagToggle.addEventListener('click', () => {
  flagMode = !flagMode;
  if (flagMode) {
    flagToggle.classList.add("active");
    flagToggle.textContent = "🚩 フラグモード ON";
  } else {
    flagToggle.classList.remove("active");
    flagToggle.textContent = "🚩 フラグモード OFF";
  }
});

function setStatus(msg, lost = false) {
  statusText.textContent = msg;
  statusText.classList.toggle('lost', lost);
}

// ======================
// クリア判定
// ======================
function checkWin() {
  if (gameOver) return;
  const { cells } = currentBoard;

  for (let r = 0; r < cells.length; r++)
    for (let c = 0; c < cells[0].length; c++) {
      const cell = cells[r][c];
      if (!cell.mine && !cell.open) return;
    }

  gameOver = true;
  setStatus("クリア！おめでとう！");
}

// ======================
// リセット
// ======================
resetBtn.addEventListener('click', startRandomBoard);
