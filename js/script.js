/**********************
 * Board Text Parser
 **********************/

/*
  盤面ファイル仕様（例）:

  ------
  010010
  001000
  000100
  ------
  [(6x6)-1A2F-C]

  ・0 = 安全マス
  ・1 = 地雷
  ・- = 初期安全（最初に必ず開く候補）
*/

export function parseBoardText(text) {
  const lines = text.trim().split(/\r?\n/);

  // メタデータ行
  const metaLine = lines.pop();
  const metaMatch = metaLine.match(/\[\((\d+)x(\d+)\)-([0-9A-Fa-f]+)-([A-Z])\]/);
  if (!metaMatch) throw new Error("Invalid metadata");

  const [, W, H, hexId, rule] = metaMatch;
  const width = Number(W);
  const height = Number(H);

  // 盤面データ
  const grid = [];
  let safeCells = [];

  for (let y = 0; y < height; y++) {
    const row = lines[y];
    if (!row || row.length !== width) {
      throw new Error("Invalid board size");
    }

    grid[y] = [];
    for (let x = 0; x < width; x++) {
      const ch = row[x];
      if (ch === "1") {
        grid[y][x] = 1;
      } else if (ch === "0") {
        grid[y][x] = 0;
      } else if (ch === "-") {
        grid[y][x] = 0;
        safeCells.push({ x, y });
      } else {
        throw new Error("Invalid cell character");
      }
    }
  }

  return {
    width,
    height,
    mines: grid,
    safeCells,
    rule,
    hexId
  };
}

/**********************
 * Game Core
 **********************/

const dirs8 = [
  [-1,-1],[0,-1],[1,-1],
  [-1, 0],      [1, 0],
  [-1, 1],[0, 1],[1, 1]
];

export class MinesweeperGame {
  constructor(parsed) {
    this.W = parsed.width;
    this.H = parsed.height;
    this.rule = parsed.rule;

    this.board = Array.from({ length: this.H }, (_, y) =>
      Array.from({ length: this.W }, (_, x) => ({
        isMine: parsed.mines[y][x] === 1,
        isOpen: false,
        isFlagged: false,
        adjacent: 0
      }))
    );

    this.gameOver = false;

    this.calculateNumbers();
  }

  isAmplified(x, y) {
    return (x + y) % 2 === 0;
  }

  calculateNumbers() {
    for (let y = 0; y < this.H; y++) {
      for (let x = 0; x < this.W; x++) {
        const c = this.board[y][x];
        if (c.isMine) continue;

        c.adjacent = dirs8.reduce((sum, [dx, dy]) => {
          const n = this.board[y + dy]?.[x + dx];
          if (!n || !n.isMine) return sum;
          if (this.rule === "A" && this.isAmplified(x + dx, y + dy)) {
            return sum + 2;
          }
          return sum + 1;
        }, 0);
      }
    }
  }

  openCell(x, y) {
    const c = this.board[y]?.[x];
    if (!c || c.isOpen || c.isFlagged || this.gameOver) return;

    c.isOpen = true;

    if (c.isMine) {
      this.gameOver = true;
      this.revealAllMines();
      return;
    }

    if (c.adjacent === 0) {
      dirs8.forEach(([dx, dy]) => this.openCell(x + dx, y + dy));
    }
  }

  toggleFlag(x, y) {
    const c = this.board[y]?.[x];
    if (!c || c.isOpen || this.gameOver) return;
    c.isFlagged = !c.isFlagged;
  }

  revealAllMines() {
    for (const row of this.board) {
      for (const c of row) {
        if (c.isMine) c.isOpen = true;
      }
    }
  }

  remainingMines() {
    let flags = 0;
    for (const row of this.board) {
      for (const c of row) {
        if (c.isFlagged) flags++;
      }
    }
    return Math.max(0, this.countTotalMines() - flags);
  }

  countTotalMines() {
    let n = 0;
    for (const row of this.board) {
      for (const c of row) {
        if (c.isMine) n++;
      }
    }
    return n;
  }
}
