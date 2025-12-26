// ===== グローバル変数 =====
let ROWS = 0;
let COLS = 0;
let totalMines = 0;
let currentRule = 'V';
let selectedRuleMode = 'V'; 

const board = [];
const boardEl = document.getElementById("board");
const infoEl = document.getElementById("info");
const reloadBtn = document.getElementById("reload");

const BOARD_URL = "./board.txt";
let parsedBoards = [];

// ===== 盤面データの取得と解析 =====

async function loadAllBoards() {
    try {
        const res = await fetch(BOARD_URL);
        if (!res.ok) throw new Error("board.txtが見つかりません");
        const text = await res.text();
        const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(b => b.length > 0);
        parsedBoards = blocks.map(parseBoardText);
    } catch (e) {
        console.error(e);
        alert("board.txtを読み込めませんでした。ローカルサーバー(Live Server等)で実行してください。");
    }
}

function parseBoardText(text) {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const metaLine = lines.find(l => l.startsWith("[") && l.endsWith("]"));
    if (!metaLine) throw new Error("メタデータ行がありません");

    const match = metaLine.match(/^\[(\d+)x(\d+)-([0-9A-Fa-f]+)-([A-Za-z])\]$/);
    if (!match) throw new Error("メタデータ形式エラー");

    const [, r, c, hexCode, rule] = match;
    const meta = { rows: Number(r), cols: Number(c), hexCode, rule: rule.toUpperCase() };

    const boardLines = lines.filter(l => l !== metaLine);
    const mines = [];
    const initialOpen = [];

    for (let y = 0; y < meta.rows; y++) {
        mines[y] = [];
        initialOpen[y] = [];
        for (let x = 0; x < meta.cols; x++) {
            const ch = boardLines[y][x];
            mines[y][x] = (ch === "1");
            initialOpen[y][x] = (ch === "-");
        }
    }
    return { meta, mines, initialOpen };
}

// ===== ゲームの進行管理 =====

function startRandomGameByRule(targetRule) {
    const candidates = parsedBoards.filter(b => b.meta.rule === targetRule);
    if (candidates.length === 0) {
        alert(`ルール ${targetRule} の盤面が board.txt 内に存在しません。`);
        return;
    }
    selectedRuleMode = targetRule;
    const selectedBoard = candidates[Math.floor(Math.random() * candidates.length)];
    
    document.getElementById("start-menu").style.display = "none";
    document.getElementById("game-area").style.display = "block";
    loadFromParsed(selectedBoard);
}

function loadFromParsed(parsed) {
    ROWS = parsed.meta.rows;
    COLS = parsed.meta.cols;
    currentRule = parsed.meta.rule;
    board.length = 0;
    totalMines = 0;

    boardEl.style.gridTemplateColumns = `repeat(${COLS}, 30px)`;

    for (let y = 0; y < ROWS; y++) {
        board[y] = [];
        for (let x = 0; x < COLS; x++) {
            if (parsed.mines[y][x]) totalMines++;
            board[y][x] = {
                mine: parsed.mines[y][x],
                open: parsed.initialOpen[y][x],
                flag: false,
                count: 0,
                isDark: (y + x) % 2 !== 0
            };
        }
    }
    calculateCounts();
    render();
}

function calculateCounts() {
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x].mine) continue;
            let count = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const ny = y + dy, nx = x + dx;
                    if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS && board[ny][nx].mine) {
                        // ルールA: 濃いマスの地雷を2倍としてカウント
                        if (currentRule === 'A' && board[ny][nx].isDark) count += 2;
                        else count += 1;
                    }
                }
            }
            board[y][x].count = count;
        }
    }
}

// ===== インタラクション =====

function openCell(y, x) {
    const cell = board[y][x];
    if (cell.open || cell.flag) return;
    cell.open = true;
    if (cell.mine) {
        alert("Game Over!");
        revealAll();
    } else if (cell.count === 0) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const ny = y + dy, nx = x + dx;
                if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) openCell(ny, nx);
            }
        }
    }
    checkWin();
    render();
}

function toggleFlag(y, x) {
    const cell = board[y][x];
    if (!cell.open) {
        cell.flag = !cell.flag;
        render();
    }
}

function render() {
    boardEl.innerHTML = "";
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const cell = board[y][x];
            const div = document.createElement("div");
            div.className = "cell";
            if (cell.isDark) div.classList.add("dark");
            
            if (cell.open) {
                div.classList.add("open");
                if (cell.mine) {
                    div.classList.add("mine");
                    div.textContent = "●";
                } else if (cell.count > 0) {
                    div.textContent = cell.count;
                    div.dataset.count = cell.count;
                }
            } else if (cell.flag) {
                div.textContent = "⚑";
                div.classList.add("flag");
            }

            div.onclick = () => openCell(y, x);
            div.oncontextmenu = (e) => { e.preventDefault(); toggleFlag(y, x); };
            boardEl.appendChild(div);
        }
    }
    updateInfo();
}

function updateInfo() {
    let flags = 0;
    board.forEach(row => row.forEach(c => { if (c.flag) flags++; }));
    const rNames = {'V':'バニラ', 'A':'増幅', 'B':'分岐'};
    infoEl.innerHTML = `<div><strong>ルール: ${rNames[currentRule] || currentRule}</strong></div>地雷: ${totalMines}　旗: ${flags}`;
}

function revealAll() {
    board.forEach(row => row.forEach(c => { if (c.mine) c.open = true; }));
}

function checkWin() {
    const win = board.every(row => row.every(c => c.mine || c.open));
    if (win) alert("Clear!");
}

function backToMenu() {
    document.getElementById("start-menu").style.display = "flex";
    document.getElementById("game-area").style.display = "none";
}

reloadBtn.onclick = () => startRandomGameByRule(selectedRuleMode);

// 初期ロード
loadAllBoards();
