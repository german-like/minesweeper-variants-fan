// --- 要素 ---
const boardEl = document.getElementById('board');
const modeBtn = document.getElementById('modeBtn');
const statusEl = document.getElementById('status');
const presetEl = document.getElementById('preset');
const ruleEl = document.getElementById('ruleSelect');
const newBtn = document.getElementById('newBtn');
const flagsLeftEl = document.getElementById('flagsLeft');

// --- 状態 ---
let rows = 5;
let cols = 5;
let mineCount = Math.floor(rows * cols * 0.2);
let rule = 'normal';

let grid = [];
let gameOver = false;
let firstClick = false;
let flagMode = false;
let flagsLeft = 0;

// --- イベント ---
modeBtn.addEventListener('click', () => {
  flagMode = !flagMode;
  modeBtn.textContent = flagMode ? '旗' : 'シャベル';
});

presetEl.addEventListener('change', applyPreset);
ruleEl.addEventListener('change', () => { rule = ruleEl.value; });
newBtn.addEventListener('click', newGame);

// --- プリセット適用 ---
function applyPreset(){
  const [r,c] = presetEl.value.split('x').map(v => parseInt(v,10));
  rows = r; cols = c;
  mineCount = Math.max(1, Math.floor(rows * cols * 0.2));
}

// --- 盤面初期化 / 地雷配置 / カウント ---
function createGrid(){
  grid = [];
  for(let r=0;r<rows;r++){
    grid[r] = [];
    for(let c=0;c<cols;c++){
      grid[r][c] = { mine:false, num:0, revealed:false, flagged:false, row:r, col:c };
    }
  }
}

function placeMines(){
  let placed = 0;
  const total = rows * cols;
  if (mineCount >= total) mineCount = total - 1;
  while(placed < mineCount){
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (!grid[r][c].mine){
      grid[r][c].mine = true;
      placed++;
    }
  }
}

function isDarkSquare(r,c){
  // チェッカーボードの暗いマスを (r+c)%2 === 0 とする
  return ((r + c) % 2 === 0);
}

function computeAdjacencies(){
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      if (grid[r][c].mine){ grid[r][c].num = 0; continue; }
      let sum = 0;
      for(let dr=-1; dr<=1; dr++){
        for(let dc=-1; dc<=1; dc++){
          if (dr===0 && dc===0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          if (grid[nr][nc].mine){
            if (rule === 'amplify' && isDarkSquare(nr,nc)) sum += 2;
            else sum += 1;
          }
        }
      }
      grid[r][c].num = sum;
    }
  }
}

// --- 表示 / 描画 ---
function renderBoard(){
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${cols}, 36px)`;
  boardEl.setAttribute('data-show-dark', rule === 'amplify' ? 'true' : 'false');

  flagsLeftEl.textContent = flagsLeft;

  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const cell = grid[r][c];
      const div = document.createElement('div');
      div.className = 'cell';
      div.dataset.r = r;
      div.dataset.c = c;
      if (rule === 'amplify' && isDarkSquare(r,c)) div.classList.add('dark');

      if (cell.revealed){
        div.classList.add('revealed');
        if (cell.mine){
          div.classList.add('mine');
          div.textContent = '●';
        } else if (cell.num > 0){
          div.textContent = cell.num;
        }
      } else {
        if (cell.flagged){
          div.classList.add('flagged');
          div.textContent = '⚑';
        } else {
          div.textContent = '';
        }
      }

      // クリック・右クリックイベント
      div.addEventListener('click', (e) => {
        onCellClick(r,c);
      });

      div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        toggleFlag(r,c);
      });

      // 長押し（モバイル）でフラグ
      let pressTimer = null;
      div.addEventListener('pointerdown', (e) => {
        pressTimer = setTimeout(() => {
          toggleFlag(r,c);
        }, 500);
      });
      div.addEventListener('pointerup', () => { if (pressTimer) clearTimeout(pressTimer); pressTimer = null; });
      div.addEventListener('pointerleave', () => { if (pressTimer) clearTimeout(pressTimer); pressTimer = null; });

      boardEl.appendChild(div);
    }
  }
}

// --- フラグ操作 ---
function toggleFlag(r,c){
  if (gameOver) return;
  const cell = grid[r][c];
  if (cell.revealed) return;
  // フラグ数管理
  if (!cell.flagged && flagsLeft <= 0) return;
  cell.flagged = !cell.flagged;
  flagsLeft += cell.flagged ? -1 : 1;
  renderBoard();
}

// --- 開く処理（再帰で 0 を展開）---
function revealCell(r,c){
  if (r < 0 || r >= rows || c < 0 || c >= cols) return;
  const cell = grid[r][c];
  if (cell.revealed || cell.flagged) return;
  cell.revealed = true;
  if (cell.mine){
    // 爆破
    gameOver = true;
    statusEl.textContent = '爆破！ゲームオーバー';
    revealAllMines();
    return;
  }
  if (cell.num === 0){
    for(let dr=-1; dr<=1; dr++){
      for(let dc=-1; dc<=1; dc++){
        if (dr === 0 && dc === 0) continue;
        revealCell(r+dr, c+dc);
      }
    }
  }
}

function revealAllMines(){
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) if (grid[r][c].mine) grid[r][c].revealed = true;
}

// --- 勝利判定 ---
function checkWin(){
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const cell = grid[r][c];
      // 非地雷がすべて開いているかどうか
      if (!cell.mine && !cell.revealed) return false;
    }
  }
  return true;
}

// --- クリック処理（旗モード対応、初回安全保証） ---
function onCellClick(r,c){
  if (gameOver) return;
  const cell = grid[r][c];

  // 旗モードならフラグ操作
  if (flagMode){
    if (!cell.revealed) toggleFlag(r,c);
    return;
  }

  // 最初のクリックは必ず安全（まるごと再生成）
  if (!firstClick){
    firstClick = true;
    if (cell.mine){
      // クリック位置が地雷でなくなるまで再生成
      do {
        createGrid();
        placeMines();
        computeAdjacencies();
      } while (grid[r][c].mine);
      // フラグ数を地雷数にリセット
      flagsLeft = mineCount;
      // (続行してそのマスを開く)
    }
  }

  revealCell(r,c);

  if (!gameOver && checkWin()){
    gameOver = true;
    statusEl.textContent = '勝利！おめでとう！';
    revealAllMines();
  }

  renderBoard();
}

// --- 新規ゲーム開始 ---
function newGame(){
  applyPreset();
  rule = ruleEl.value;
  firstClick = false;
  gameOver = false;
  flagMode = false;
  modeBtn.textContent = 'シャベル';
  createGrid();
  placeMines();
  computeAdjacencies();
  flagsLeft = mineCount;
  statusEl.textContent = '';
  renderBoard();
}

// 初期開始
applyPreset();
newGame();
