// ===== グローバル =====

let ROWS = 0;
let COLS = 0;
let totalMines = 0;

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

  const match = metaLine.match(
    /^\[(\d+)x(\d+)-([0-9A-Fa-f]+)-([A-Za-z])\]$/
  );
  if (!match) throw new Error("メタデータ形式エラー");

  const [, r, c, hexCode, rule] = match;

  const meta = {
    rows: Number(r),
    cols: Number(c),
    hexCode,
    rule,
  };

  const boardLines = lines.filter(l => l !== metaLine);
  if (boardLines.length !== meta.rows)
    throw new Error("行数不一致");

  const mines = [];
  const initialOpen = [];

  for (let y = 0; y < meta.rows; y++) {
    const line = boardLines[y];
    if (line.length !== meta.cols)
      throw new Error(`列数不一致 行 ${y}`);

    mines[y] = [];
    initialOpen[y] = [];

    for (let x = 0; x < meta.cols; x++) {
      const ch = line[x];
      if (ch === "1") {
        mines[y][x] = true;
        initialOpen[y][x] = false;
      } else if (ch === "0") {
        mines[y][x] = false;
        initialOpen[y][x] = false;
      } else if (ch === "-") {
        mines[y][x] = false;
        initialOpen[y][x] = true;
      } else {
        throw new Error(`不正文字 '${ch}'`);
      }
    }
  }

  return { meta, mines, initialOpen };
}

// ===== fetch 読込 =====

async function loadAllBoards() {
  const res = await fetch(BOARD_URL);
  if (!res.ok) throw new Error("盤面取得失敗");

  const text = await res.text();
  const blocks = splitBoards(text);

  parsedBoards = blocks.map(parseBoardText);
  currentIndex = 0;
  loadFromParsed(parsedBoards[0]);
}

// ===== 盤面生成 =====

function loadFromParsed(parsed) {
  ROWS = parsed.meta.rows;
  COLS = parsed.meta.cols;

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
      };
    }
  }

  calculateCounts();
  render();
}

// ===== 周囲地雷数 =====

function calculateCounts() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x].mine) continue;

      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (
            ny >= 0 && ny < ROWS &&
            nx >= 0 && nx < COLS &&
            board[ny][nx].mine
          ) {
            count++;
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

  if (!cell.mine && cell.count === 0) {
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
}

// ===== 情報表示 =====

function updateInfo() {
  let flags = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x].flag) flags++;
    }
  }
  infoEl.textContent =
    `地雷: ${totalMines}　旗: ${flags}　残り: ${totalMines - flags}`;
}

// ===== 描画 =====

function render() {
  boardEl.innerHTML = "";

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = board[y][x];
      const div = document.createElement("div");
      div.className = "cell";

      if (cell.open) {
        div.classList.add("open");
        if (cell.mine) {
          div.classList.add("mine");
          div.textContent = "●";
        } else if (cell.count > 0) {
          div.textContent = String(cell.count);
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
  currentIndex = (currentIndex + 1) % parsedBoards.length;
  loadFromParsed(parsedBoards[currentIndex]);
};

// ===== 初期化 =====

loadAllBoards();
