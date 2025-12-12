// ==== 外部 .brd ファイル対応マインスイーパー JS ==== 

const brdFiles = './brd'; // 用意した .brd ファイルのリスト

const boardEl = document.getElementById('board');
const newBtn = document.getElementById('newBtn');
const modeBtn = document.getElementById('modeBtn');
const statusEl = document.getElementById('status');
const flagsLeftEl = document.getElementById('flagsLeft');
const ruleSelect = document.getElementById('ruleSelect');

let grid;
let rows, cols, mineCount;
let gameOver = false;
let firstClick = false;
let flagMode = false;
let flagsLeft = 0;

modeBtn.onclick = () => {
    flagMode = !flagMode;
    modeBtn.textContent = flagMode ? '旗' : 'シャベル';
};

// --- .brd ファイル読み込み ---
async function loadBrdFile(filename) {
    const response = await fetch(filename);
    const text = await response.text();
    const lines = text.trim().split('\n');

    // メタ情報
    const metaLine = lines.pop().match(/\[(\d+)\/(\d+)\/(\w+):(\w)\]/);
    const size = parseInt(metaLine[1]);
    const mineCount = parseInt(metaLine[2]);
    const code = metaLine[3];
    const rule = metaLine[4];

    // 盤面データ
    const board = lines.map(line => line.split(''));

    return { size, mineCount, code, rule, board };
}

// --- ランダムに .brd ファイルを選択して盤面生成 ---
async function startNewFromBrdList(fileList) {
    const index = Math.floor(Math.random() * fileList.length);
    const data = await loadBrdFile(fileList[index]);

    rows = data.size;
    cols = data.size;
    mineCount = data.mineCount;
    flagsLeft = mineCount;

    grid = data.board.map((row,r) => row.map((cell,c) => ({
        mine: cell === '1',
        revealed: cell === '-',
        flagged: false,
        num: 0,
        row: r,
        col: c
    })));

    ruleSelect.value = data.rule === 'V' ? 'normal' : 'amplify';
    computeAdjacencies();
    gameOver = false;
    firstClick = false;
    statusEl.textContent = '準備完了';
    setControlsEnabled(true);
    renderBoard();
}

// --- コントロール有効化/無効化 ---
function setControlsEnabled(enabled) {
    ruleSelect.disabled = !enabled;
}

// --- 隣接地雷計算 ---
function computeAdjacencies(){
    const amplify = ruleSelect.value === 'amplify';
    for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
            let count = 0;
            for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
                if(dr===0 && dc===0) continue;
                const nr=r+dr, nc=c+dc;
                if(nr>=0 && nr<rows && nc>=0 && nc<cols){
                    if(grid[nr][nc].mine){
                        if(amplify && (nr+nc)%2===0) count+=2; else count++;
                    }
                }
            }
            grid[r][c].num = count;
        }
    }
}

// --- 盤面描画 ---
function renderBoard(){
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${cols}, 36px)`;
    flagsLeftEl.textContent = flagsLeft;

    for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
            const cell = grid[r][c];
            const div = document.createElement('div');
            div.className = 'cell';
            div.dataset.r = r;
            div.dataset.c = c;

            // チェス盤濃淡
            if(ruleSelect.value === 'amplify' && (r+c)%2===0){
                div.classList.add('dark');
            }

            if(cell.revealed){
                div.classList.add('revealed');
                div.classList.remove('dark');
                if(cell.mine){ div.classList.add('mine'); div.textContent='●'; }
                else if(cell.num>0) div.textContent = cell.num;
            } else if(cell.flagged){
                div.classList.add('flag');
                div.textContent='⚑';
            }

            div.onclick = () => onCellClick(r,c);
            div.oncontextmenu = (e)=>{
                e.preventDefault();
                if(!cell.revealed){
                    cell.flagged = !cell.flagged;
                    flagsLeft += cell.flagged ? -1 : 1;
                    renderBoard();
                }
            };

            boardEl.appendChild(div);
        }
    }
}

// --- セルクリック ---
function revealCell(r,c){
    const cell = grid[r][c];
    if(cell.revealed || cell.flagged) return;
    cell.revealed = true;
    if(cell.mine){ gameOver=true; statusEl.textContent='ゲームオーバー'; revealAllMines(); return; }
    if(cell.num===0){
        for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
            if(dr===0 && dc===0) continue;
            const nr=r+dr,nc=c+dc;
            if(nr>=0 && nr<rows && nc>=0 && nc<cols) revealCell(nr,nc);
        }
    }
}

function revealAllMines(){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) if(grid[r][c].mine) grid[r][c].revealed=true;
    setControlsEnabled(true);
    renderBoard();
}

function checkWin(){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
        const cell = grid[r][c];
        if(!cell.mine && !cell.revealed) return false;
    }
    return true;
}

function onCellClick(r,c){
    if(gameOver) return;
    const cell = grid[r][c];
    if(flagMode){
        if(!cell.revealed){
            cell.flagged = !cell.flagged;
            flagsLeft += cell.flagged ? -1 : 1;
            renderBoard();
        }
        return;
    }
    if(!firstClick) firstClick=true;
    setControlsEnabled(false);

    revealCell(r,c);
    if(!gameOver && checkWin()){ gameOver=true; statusEl.textContent='勝利！'; revealAllMines(); }
    renderBoard();
}

// --- ゲーム開始 ---
newBtn.onclick = () => startNewFromBrdList(brdFiles);
startNewFromBrdList(brdFiles);
