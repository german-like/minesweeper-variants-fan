const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const flagsLeftEl = document.getElementById("flagsLeft");
const newBtn = document.getElementById("newBtn");
const modeBtn = document.getElementById("modeBtn");
const ruleSelect = document.getElementById("ruleSelect");
const presetSelect = document.getElementById("preset");

let grid = [];
let rows = 5;
let cols = 5;
let mineCount = 0;
let flagsLeft = 0;
let gameOver = false;
let firstClick = false;
let shovelMode = true;

// =============================================
// ランダム盤面生成（ノーゲス風）
// =============================================
function generateBoard(rows, cols, mineRatio=0.2) {
  mineCount = Math.floor(rows * cols * mineRatio);
  flagsLeft = mineCount;
  flagsLeftEl.textContent = flagsLeft;

  // 0: 空, 1: 地雷, '-': 開始マス
  grid = Array.from({length: rows}, () => Array.from({length: cols}, () => ({
    mine: false, revealed: false, flagged: false, num: 0
  })));

  // 地雷をランダム配置
  let placed = 0;
  while (placed < mineCount) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (!grid[r][c].mine) {
      grid[r][c].mine = true;
      placed++;
    }
  }

  // 最初に開くマスを 2 個以上
  let opened = 0;
  while (opened < 2) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (!grid[r][c].mine && !grid[r][c].revealed) {
      grid[r][c].revealed = true;
      opened++;
    }
  }

  computeAdjacencies();
  renderBoard();
  statusEl.textContent = "準備完了";
}

// =============================================
// 隣接地雷数計算
// =============================================
function computeAdjacencies() {
  const amplify = ruleSelect.value === "amplify";

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].mine) {
        grid[r][c].num = -1;
        continue;
      }
      let count = 0;
      for (let dr=-1; dr<=1; dr++) {
        for (let dc=-1; dc<=1; dc++) {
          if(dr===0 && dc===0) continue;
          const nr=r+dr, nc=c+dc;
          if(nr<0||nr>=rows||nc<0||nc>=cols) continue;
          if(grid[nr][nc].mine) {
            if(amplify && ((nr+nc)%2===0)) count += 2;
            else count++;
          }
        }
      }
      grid[r][c].num = count;
    }
  }
}

// =============================================
// 盤面描画
// =============================================
function renderBoard() {
  boardEl.style.gridTemplateColumns = `repeat(${cols}, 30px)`;
  boardEl.style.gridTemplateRows = `repeat(${rows}, 30px)`;
  boardEl.innerHTML = "";

  for (let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const cell = grid[r][c];
      const div = document.createElement("div");
      div.className = "cell";
      if(ruleSelect.value==="amplify" && (r+c)%2===0) div.classList.add("dark");

      if(cell.revealed){
        div.classList.add("revealed");
        div.classList.remove("dark");
        if(cell.mine){ div.classList.add("mine"); div.textContent="●"; }
        else if(cell.num>0) div.textContent=cell.num;
      } else if(cell.flagged){
        div.classList.add("flag");
        div.textContent="⚑";
      }

      div.addEventListener("click",()=>onCellClick(r,c));
      div.addEventListener("contextmenu",(e)=>{e.preventDefault(); toggleFlag(r,c);});

      boardEl.appendChild(div);
    }
  }
}

// =============================================
// セルクリック
// =============================================
function onCellClick(r,c){
  if(gameOver) return;
  if(!firstClick){ firstClick=true; ruleSelect.disabled=true; presetSelect.disabled=true; }

  const cell=grid[r][c];
  if(cell.revealed || cell.flagged) return;

  cell.revealed=true;
  if(cell.mine){
    gameOver=true; revealAllMines(); statusEl.textContent="ゲームオーバー…"; return;
  }
  if(cell.num===0) openZeroArea(r,c);
  checkWin();
  renderBoard();
}

// =============================================
// 0 の自動開放
// =============================================
function openZeroArea(r,c){
  for(let dr=-1;dr<=1;dr++){
    for(let dc=-1;dc<=1;dc++){
      const nr=r+dr, nc=c+dc;
      if(nr<0||nr>=rows||nc<0||nc>=cols) continue;
      const cell=grid[nr][nc];
      if(!cell.revealed && !cell.flagged){
        cell.revealed=true;
        if(cell.num===0) openZeroArea(nr,nc);
      }
    }
  }
}

// =============================================
// 旗切り替え
// =============================================
function toggleFlag(r,c){
  if(gameOver) return;
  if(!firstClick){ firstClick=true; ruleSelect.disabled=true; presetSelect.disabled=true; }

  const cell=grid[r][c];
  if(cell.revealed) return;

  if(cell.flagged){ cell.flagged=false; flagsLeft++; }
  else { if(flagsLeft<=0) return; cell.flagged=true; flagsLeft--; }

  flagsLeftEl.textContent=flagsLeft;
  renderBoard();
}

// =============================================
// 全地雷表示
// =============================================
function revealAllMines(){
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) if(grid[r][c].mine) grid[r][c].revealed=true;
  ruleSelect.disabled=false; presetSelect.disabled=false;
  renderBoard();
}

// =============================================
// 勝利チェック
// =============================================
function checkWin(){
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) if(!grid[r][c].mine && !grid[r][c].revealed) return;
  gameOver=true; statusEl.textContent="勝利！"; ruleSelect.disabled=false; presetSelect.disabled=false;
}

// =============================================
// モード切り替え
// =============================================
modeBtn.addEventListener("click",()=>{
  shovelMode=!shovelMode;
  modeBtn.textContent=shovelMode?"シャベル":"旗";
});

// =============================================
// 新規作成
// =============================================
newBtn.addEventListener("click",()=>{
  rows=cols=parseInt(presetSelect.value);
  firstClick=false; gameOver=false;
  generateBoard(rows,cols);
});

// 初期起動
rows=cols=parseInt(presetSelect.value);
generateBoard(rows,cols);
