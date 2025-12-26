// ===== グローバル =====
let ROWS = 0;
let COLS = 0;
let totalMines = 0;
let currentRule = 'V'; // 現在のルールを保持

const board = [];
const boardEl = document.getElementById("board");
const infoEl = document.getElementById("info");
const reloadBtn = document.getElementById("reload");

const BOARD_URL = "./board.txt";

let parsedBoards = [];
let currentIndex = 0;

// ===== 盤面分割 =====
function splitBoards(text) {
  return text
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(b => b.length > 0);
}

// ===== テキスト解析 =====
function parseBoardText(text) {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const metaLine = lines.find(l => l.startsWith("[") && l.endsWith("]"));
  if (!metaLine) throw new Error("メタデータ行がありません");

  // メタデータ: [行x列-ID-ルール] 
  const match = metaLine.match(/^\[(\d+)x(\d+)-([0-9A-Fa-f]+)-([A-Za-z])\]$/);
  if (!match) throw new Error("メタデータ形式エラー");

  const [, r, c, hexCode, rule] = match;

  const meta = {
    rows: Number(r),
    cols: Number(c),
    hexCode,
    rule: rule.toUpperCase(), // V, A, B
  };

  const boardLines = lines.filter(l => l !== metaLine);
  const mines = [];
  const initialOpen = [];

  for (let y = 0; y < meta.rows; y++) {
    const line = boardLines[y];
    mines[y] = [];
    initialOpen[y] = [];
    for (let x = 0; x < meta.cols; x++) {
      const ch = line[x];
      if (ch === "1") { mines[y][x] = true; initialOpen[y][x] = false; }
      else if (ch === "0") { mines[y][x] = false; initialOpen[y][x] = false; }
      else if (ch === "-") { mines[y][x] = false; initialOpen[y][x] = true; }
    }
  }
  return { meta, mines, initialOpen };
}

// ===== fetch 読込 =====
async function loadAllBoards() {
  try {
    const res = await fetch(BOARD_URL);
    if (!res.ok) throw new Error("盤面取得失敗");
    const text = await res.text();
    const blocks = splitBoards(text);
    parsedBoards = blocks.map(parseBoardText);
    loadFromParsed(parsedBoards[0]);
  } catch (e) {
    console.error(e);
    infoEl.textContent = "エラー: board.txt が見つからないか形式が正しくありません。";
  }
}

// ===== 盤面生成 =====
function loadFromParsed(parsed) {
  ROWS = parsed.meta.rows;
  COLS = parsed.meta.cols;
  currentRule = parsed.meta.rule; // ルールをセット

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
        isDark: (y + x) % 2 !== 0 // チェス盤の濃い色の判定
      };
    }
  }

  calculateCounts();
  render();
}

// ===== 周囲地雷数 (独自ルール適用) =====
function calculateCounts() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x].mine) continue;

      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS && board[ny][nx].mine) {
            
            // --- ルールA: 増幅 (濃いマスの地雷は2個分) ---
            if (currentRule === 'A' && board[ny][nx].isDark) {
              count += 2;
            } else {
              count += 1;
            }
          }
        }
      }
      board[y][x].count = count;
    }
  }
}

// ===== マス操作 =====
function openCell(y, x) {
  const cell = board[y][x];
  if (cell.open || cell.flag) return;

  cell.open = true;

  if (cell.mine) {
    alert("ゲームオーバー！");
    revealAllMines();
    return;
  }

  if (cell.count === 0) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ny = y + dy;
        const nx = x + dx;
        if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
          openCell(ny, nx);
        }
      }
    }
  }
  checkWin();
}

function revealAllMines() {
  board.forEach(row => row.forEach(c => { if (c.mine) c.open = true; }));
}

function checkWin() {
  const isWin = board.every(row => row.every(c => c.mine || c.open));
  if (isWin) alert("クリア！");
}

// ===== 情報表示 =====
function updateInfo() {
  let flags = 0;
  board.forEach(row => row.forEach(c => { if (c.flag) flags++; }));
  
  const ruleName = { 'V': 'バニラ', 'A': '増幅', 'B': '分岐' }[currentRule] || '不明';
  infoEl.innerHTML = `
    <div><strong>ルール: ${ruleName}</strong></div>
    地雷: ${totalMines}　旗: ${flags}　残り: ${totalMines - flags}
  `;
}

// ===== 描画 =====
function render() {
  boardEl.innerHTML = "";

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = board[y][x];
      const div = document.createElement("div");
      div.className = "cell";

      // ★ここでチェス盤の「濃いマス」クラスを付与
      if (cell.isDark) {
        div.classList.add("dark");
      }

      if (cell.open) {
        div.classList.add("open");
        if (cell.mine) {
          div.classList.add("mine");
          div.textContent = "●";
        } else if (cell.count > 0) {
          div.textContent = String(cell.count);
          // ルールAで大きな数字（10以上など）が出た時のために色を変えてもOK
          if (cell.count >= 8) div.style.color = "purple";
        }
      } else if (cell.flag) {
        div.textContent = "⚑";
      }

      div.onclick = () => {
        openCell(y, x);
        render();
      };

      div.oncontextmenu = e => {
        e.preventDefault();
        if (!cell.open) {
          cell.flag = !cell.flag;
          render();
        }
      };

      boardEl.appendChild(div);
    }
  }
  updateInfo();
}

// ===== 盤面切替 =====
reloadBtn.onclick = () => {
  if (parsedBoards.length === 0) return;
  currentIndex = (currentIndex + 1) % parsedBoards.length;
  loadFromParsed(parsedBoards[currentIndex]);
};

// ===== 初期化 =====
loadAllBoards();
