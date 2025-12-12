// =============================================
// 設定
// =============================================
const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const flagsLeftEl = document.getElementById("flagsLeft");
const newBtn = document.getElementById("newBtn");
const modeBtn = document.getElementById("modeBtn");
const ruleSelect = document.getElementById("ruleSelect");
const presetSelect = document.getElementById("preset");

let grid = [];
let rows = 0;
let cols = 0;
let mineCount = 0;
let flagsLeft = 0;
let gameOver = false;
let firstClick = false;

let shovelMode = true;   // true: 掘る, false: 旗モード


// =============================================
// .brd ファイルの読み込み（0/1/- 対応版）
// =============================================
async function loadBoards() {
    const response = await fetch("boards.brd");
    const text = await response.text();

    const boards = [];

    // --- 1. ボードごとのブロックに分割 ---
    const rawBlocks = text
        .trim()
        .split(/\n(?=\[)/)  // メタ行 "[" の前で区切る
        .map(b => b.trim());

    for (const block of rawBlocks) {

        // --- 2. 行に分割 ---
        const lines = block.split(/\r?\n/).map(l => l.trim());
        if (lines.length < 2) continue;

        // --- 3. メタ行を取得 ---
        const metaLine = lines[lines.length - 1];
        const meta = metaLine.match(/\[(\d+)\/(\d+)\/([0-9A-Fa-f]{3})\/([A-Za-z])\]/);

        if (!meta) {
            console.error("メタ行エラー:", metaLine);
            continue;
        }

        const size = parseInt(meta[1]);
        const mineCount = parseInt(meta[2]);
        const ruleChar = meta[4];

        // --- 4. 盤面行を取り出す ---
        const boardLines = lines.slice(0, -1);  // 最後がメタなので除外

        if (boardLines.length !== size) {
            console.error("行数が一致しない:", boardLines.length, size);
            continue;
        }

        const grid = [];

        for (let r = 0; r < size; r++) {
            const row = boardLines[r];
            if (row.length !== size) {
                console.error("列数が一致しない:", row.length, size);
                continue;
            }

            const rowArr = [];
            for (let c = 0; c < size; c++) {
                const ch = row[c];

                rowArr.push({
                    mine: ch === "1",
                    revealed: ch === "-",   // "-" は開封済み
                    flagged: false,
                    num: 0,
                    row: r,
                    col: c
                });
            }

            grid.push(rowArr);
        }

        boards.push({
            grid,
            meta: [size, mineCount, meta[3], ruleChar]
        });
    }

    return boards;
}

// =============================================
// 新規ゲーム開始
// =============================================
async function startNew() {
    statusEl.textContent = "盤面読込中…";
    boardEl.innerHTML = "";

    const boards = await loadBoards();
    const picked = boards[Math.floor(Math.random() * boards.length)];

    const rawGrid = picked.grid;
    const meta = picked.meta;

    rows = parseInt(meta[0]);
    cols = parseInt(meta[0]);
    mineCount = parseInt(meta[1]);
    const ruleCode = meta[4];   // "V" or "A"

    ruleSelect.value = ruleCode === "V" ? "normal" : "amplify";

    flagsLeft = mineCount;
    flagsLeftEl.textContent = flagsLeft;

    gameOver = false;
    firstClick = false;

    ruleSelect.disabled = false;
    presetSelect.disabled = false;

    grid = rawGrid.map((row, r) =>
        row.map((cell, c) => ({
            mine: cell === "1",
            revealed: cell === "-",
            flagged: false,
            num: 0,
            row: r,
            col: c
        }))
    );

    computeAdjacencies();
    renderBoard();

    statusEl.textContent = "準備完了";
}


// =============================================
// 隣接地雷計算（増幅モード対応）
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

            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {

                    if (dr === 0 && dc === 0) continue;

                    const nr = r + dr;
                    const nc = c + dc;

                    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

                    if (grid[nr][nc].mine) {
                        if (amplify) {
                            const isDark = ((nr + nc) % 2 === 0);
                            count += isDark ? 2 : 1;
                        } else {
                            count += 1;
                        }
                    }
                }
            }

            grid[r][c].num = count;
        }
    }
}


// =============================================
// 描画
// =============================================
function renderBoard() {
    boardEl.style.gridTemplateColumns = `repeat(${cols}, 30px)`;
    boardEl.style.gridTemplateRows = `repeat(${rows}, 30px)`;
    boardEl.innerHTML = "";

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {

            const cell = grid[r][c];
            const div = document.createElement("div");

            div.className = "cell";

            if (ruleSelect.value === "amplify" && (r + c) % 2 === 0) {
                div.classList.add("dark");
            }

            if (cell.revealed) {
                div.classList.add("revealed");
                div.classList.remove("dark");

                if (cell.mine) {
                    div.classList.add("mine");
                    div.textContent = "●";
                } else if (cell.num > 0) {
                    div.textContent = cell.num;
                }
            } else if (cell.flagged) {
                div.classList.add("flag");
                div.textContent = "⚑";
            }

            // 左クリック
            div.addEventListener("click", () => {

                if (shovelMode) {
                    onCellClick(r, c);   // 掘る
                } else {
                    toggleFlag(r, c);   // 旗
                }
            });

            // 右クリック
            div.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                toggleFlag(r, c);
            });

            boardEl.appendChild(div);
        }
    }
}


// =============================================
// セルを開く
// =============================================
function onCellClick(r, c) {
    if (gameOver) return;

    if (!firstClick) {
        firstClick = true;
        ruleSelect.disabled = true;
        presetSelect.disabled = true;
    }

    const cell = grid[r][c];

    if (cell.revealed || cell.flagged) return;

    cell.revealed = true;

    if (cell.mine) {
        gameOver = true;
        revealAllMines();
        statusEl.textContent = "ゲームオーバー…";
        return;
    }

    if (cell.num === 0) {
        openZeroArea(r, c);
    }

    checkWin();
    renderBoard();
}


// =============================================
// 0 のマスを広げる
// =============================================
function openZeroArea(r, c) {
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {

            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

            const cell = grid[nr][nc];

            if (!cell.revealed && !cell.flagged) {
                cell.revealed = true;
                if (cell.num === 0) openZeroArea(nr, nc);
            }
        }
    }
}


// =============================================
// 旗
// =============================================
function toggleFlag(r, c) {
    if (gameOver) return;

    if (!firstClick) {
        firstClick = true;
        ruleSelect.disabled = true;
        presetSelect.disabled = true;
    }

    const cell = grid[r][c];

    if (cell.revealed) return;

    if (cell.flagged) {
        cell.flagged = false;
        flagsLeft++;
    } else {
        if (flagsLeft <= 0) return;
        cell.flagged = true;
        flagsLeft--;
    }

    flagsLeftEl.textContent = flagsLeft;
    renderBoard();
}


// =============================================
// 全地雷を表示
// =============================================
function revealAllMines() {
    grid.forEach(row =>
        row.forEach(cell => {
            if (cell.mine) cell.revealed = true;
        })
    );

    ruleSelect.disabled = false;
    presetSelect.disabled = false;

    renderBoard();
}


// =============================================
// 勝利チェック
// =============================================
function checkWin() {
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (!grid[r][c].mine && !grid[r][c].revealed)
                return;

    gameOver = true;
    statusEl.textContent = "勝利！";
    ruleSelect.disabled = false;
    presetSelect.disabled = false;
}


// =============================================
// モード切替
// =============================================
modeBtn.addEventListener("click", () => {
    shovelMode = !shovelMode;
    modeBtn.textContent = shovelMode ? "シャベル" : "旗";
});


// =============================================
// 新規作成
// =============================================
newBtn.addEventListener("click", startNew);


// 初期起動
startNew();
