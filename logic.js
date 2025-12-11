// minesweeper_logic_generator.js
// 論理のみで解けるか判定するソルバー + 盤面生成

export { generateSolvableBoard, isLogicSolvable };

// ----------------------
// ユーティリティ
// ----------------------
function createEmptyBoard(rows, cols) {
  const b = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        mine: false,
        opened: false,
        flagged: false,
        number: 0,
        r, c
      });
    }
    b.push(row);
  }
  return b;
}

function cloneBoard(board) {
  return board.map(row => row.map(cell => ({ ...cell })));
}

function getNeighbors(board, r, c) {
  const rows = board.length, cols = board[0].length;
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(board[nr][nc]);
    }
  }
  return out;
}

function computeNumbers(board) {
  const rows = board.length, cols = board[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      if (cell.mine) {
        cell.number = -1;
        continue;
      }
      const n = getNeighbors(board, r, c).filter(x => x.mine).length;
      cell.number = n;
    }
  }
}

// ----------------------
// ゲーム的な開く処理（ゼロの洪水開放）
// ----------------------
function revealFrom(board, r, c) {
  // BFS flood for zeros; returns nothing but mutates 'opened'
  const rows = board.length, cols = board[0].length;
  const start = board[r][c];
  if (start.opened || start.flagged) return;
  // If it's a mine, we don't open here in solver (we always call on safe)
  const stack = [[r, c]];
  while (stack.length) {
    const [cr, cc] = stack.pop();
    const cell = board[cr][cc];
    if (cell.opened || cell.flagged) continue;
    cell.opened = true;
    // don't expand neighbors if number > 0
    if (cell.number === 0) {
      for (const nb of getNeighbors(board, cr, cc)) {
        if (!nb.opened && !nb.flagged && !nb.mine) stack.push([nb.r, nb.c]);
      }
    }
  }
}

// ----------------------
// 基本ロジック（number==flags => open safe; number - flags == closed => flag them）
// ----------------------
function applyBasicLogic(board) {
  const rows = board.length, cols = board[0].length;
  let changed = false;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      if (!cell.opened) continue;
      if (cell.number <= 0) {
        // number 0 gives no direct info other than flood-open handled by reveal
        continue;
      }
      const neighbors = getNeighbors(board, r, c);
      const closed = neighbors.filter(x => !x.opened && !x.flagged);
      const flags = neighbors.filter(x => x.flagged);
      const m = cell.number - flags.length;

      if (m === 0 && closed.length > 0) {
        // all closed are safe
        for (const p of closed) {
          // open them (but don't open mines)
          if (!p.mine) {
            revealFrom(board, p.r, p.c);
            changed = true;
          }
        }
      } else if (m > 0 && m === closed.length) {
        // all closed are mines
        for (const p of closed) {
          if (!p.flagged) {
            p.flagged = true;
            changed = true;
          }
        }
      }
    }
  }
  return changed;
}

// ----------------------
// 集合推論（subset & partial overlap）
// ペアごとに解析して推論を出す（確率は使わない）
// ----------------------
function applySetLogic(board) {
  const rows = board.length, cols = board[0].length;
  // collect constraints
  const constraints = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      if (!cell.opened) continue;
      if (cell.number <= 0) continue;
      const neighbors = getNeighbors(board, r, c);
      const closed = neighbors.filter(x => !x.opened && !x.flagged).map(x => ({ r: x.r, c: x.c }));
      const flags = neighbors.filter(x => x.flagged).length;
      const minesNeeded = cell.number - flags;
      // ignore trivial constraints
      if (closed.length === 0 || minesNeeded < 0) continue;
      constraints.push({ r, c, closed, minesNeeded });
    }
  }

  let changed = false;

  // pairwise comparison
  for (let i = 0; i < constraints.length; i++) {
    for (let j = i + 1; j < constraints.length; j++) {
      const A = constraints[i], B = constraints[j];

      // helper sets
      const Aset = A.closed;
      const Bset = B.closed;

      // compute intersection and only-sets
      const intersection = Aset.filter(a => Bset.some(b => a.r === b.r && a.c === b.c));
      const Aonly = Aset.filter(a => !intersection.some(x => x.r === a.r && x.c === a.c));
      const Bonly = Bset.filter(b => !intersection.some(x => x.r === b.r && x.c === b.c));

      // mines counts
      const mA = A.minesNeeded;
      const mB = B.minesNeeded;

      // CASE 1: A ⊂ B  (A's closed all in B)
      const isAinB = Aset.every(a => Bset.some(b => a.r === b.r && a.c === b.c));
      const isBinA = Bset.every(b => Aset.some(a => a.r === b.r && a.c === b.c));
      if (isAinB && !isBinA) {
        // diff = mines in B_only
        const diff = mB - mA;
        if (diff === Bonly.length && diff > 0) {
          // Bonly are mines
          for (const p of Bonly) {
            const cell = board[p.r][p.c];
            if (!cell.flagged) { cell.flagged = true; changed = true; }
          }
        } else if (diff === 0 && Bonly.length > 0) {
          for (const p of Bonly) {
            const cell = board[p.r][p.c];
            if (!cell.opened && !cell.flagged && !cell.mine) { revealFrom(board, p.r, p.c); changed = true; }
          }
        }
      }
      if (isBinA && !isAinB) {
        const diff = mA - mB;
        if (diff === Aonly.length && diff > 0) {
          for (const p of Aonly) {
            const cell = board[p.r][p.c];
            if (!cell.flagged) { cell.flagged = true; changed = true; }
          }
        } else if (diff === 0 && Aonly.length > 0) {
          for (const p of Aonly) {
            const cell = board[p.r][p.c];
            if (!cell.opened && !cell.flagged && !cell.mine) { revealFrom(board, p.r, p.c); changed = true; }
          }
        }
      }

      // CASE 2: Partial overlap reasoning
      if (intersection.length > 0) {
        // We can reason about possible mines in intersection by ranges:
        // mineInIntersection ∈ [max(0, mA - Aonly.length), min(intersection.length, mA)]
        // same for B, compare to deduce
        const minIA = Math.max(0, mA - Aonly.length);
        const maxIA = Math.min(intersection.length, mA);
        const minIB = Math.max(0, mB - Bonly.length);
        const maxIB = Math.min(intersection.length, mB);

        // If minIA == maxIA == minIB == maxIB -> intersection has exact K mines -> then Aonly/Bonly counts are known
        if (minIA === maxIA && minIB === maxIB && minIA === minIB) {
          const k = minIA;
          // then Aonly must have mA - k mines
          const mAonly = mA - k;
          if (mAonly === Aonly.length && Aonly.length > 0) {
            for (const p of Aonly) {
              const cell = board[p.r][p.c];
              if (!cell.flagged) { cell.flagged = true; changed = true; }
            }
          }
          if (mAonly === 0 && Aonly.length > 0) {
            for (const p of Aonly) {
              const cell = board[p.r][p.c];
              if (!cell.opened && !cell.flagged && !cell.mine) { revealFrom(board, p.r, p.c); changed = true; }
            }
          }
          // same for Bonly
          const mBonly = mB - k;
          if (mBonly === Bonly.length && Bonly.length > 0) {
            for (const p of Bonly) {
              const cell = board[p.r][p.c];
              if (!cell.flagged) { cell.flagged = true; changed = true; }
            }
          }
          if (mBonly === 0 && Bonly.length > 0) {
            for (const p of Bonly) {
              const cell = board[p.r][p.c];
              if (!cell.opened && !cell.flagged && !cell.mine) { revealFrom(board, p.r, p.c); changed = true; }
            }
          }
        }

        // Additional simple check: if A requires all mines >= intersection.length and B requires 0 in intersection, then intersection flagged/opened accordingly
        if (mA - Aonly.length >= intersection.length && mB <= 0) {
          // all intersection are mines
          for (const p of intersection) {
            const cell = board[p.r][p.c];
            if (!cell.flagged) { cell.flagged = true; changed = true; }
          }
        }
        if (mB - Bonly.length >= intersection.length && mA <= 0) {
          for (const p of intersection) {
            const cell = board[p.r][p.c];
            if (!cell.flagged) { cell.flagged = true; changed = true; }
          }
        }
      }
    }
  }

  return changed;
}

// ----------------------
// Solverループ（基本+集合を繰り返す）
// ----------------------
function solverLogicLoop(simBoard) {
  // simBoard is mutated; loop until no change
  let changed;
  do {
    changed = false;
    // apply basic rules
    if (applyBasicLogic(simBoard)) changed = true;
    // apply set logic
    if (applySetLogic(simBoard)) changed = true;
  } while (changed);
}

// ----------------------
// 完全論理解可能か判定
// 「ある初手」で論理だけによってすべての安全マスが開けるか
// ----------------------
function isLogicSolvable(originalBoard) {
  const rows = originalBoard.length, cols = originalBoard[0].length;

  // enumerate every safe cell as potential first click (must not be mine)
  for (let r0 = 0; r0 < rows; r0++) {
    for (let c0 = 0; c0 < cols; c0++) {
      if (originalBoard[r0][c0].mine) continue;

      // clone and prepare
      const sim = cloneBoard(originalBoard);
      // open initial (and flood zero)
      revealFrom(sim, r0, c0);

      // run solver loop
      solverLogicLoop(sim);

      // check if solved: all non-mine cells opened
      let allOpened = true;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = sim[r][c];
          if (!cell.mine && !cell.opened) {
            allOpened = false;
            break;
          }
        }
        if (!allOpened) break;
      }

      if (allOpened) return true;
    }
  }

  return false;
}

// ----------------------
// ランダム生成＋検査で論理可解な盤面を探す
// generateSolvableBoard(rows,cols,mines,{maxAttempts})
// ----------------------
function generateRandomBoard(rows, cols, mines) {
  const b = createEmptyBoard(rows, cols);
  const total = rows * cols;
  if (mines >= total) throw new Error("mines too many");
  const indices = Array.from({ length: total }, (_, i) => i);
  // shuffle and take first 'mines'
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  for (let i = 0; i < mines; i++) {
    const idx = indices[i];
    const r = Math.floor(idx / cols), c = idx % cols;
    b[r][c].mine = true;
  }
  computeNumbers(b);
  return b;
}

function generateSolvableBoard(rows, cols, mines, opts = {}) {
  const maxAttempts = opts.maxAttempts || 2000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const b = generateRandomBoard(rows, cols, mines);
    if (isLogicSolvable(b)) {
      return { board: b, attempts: attempt + 1 };
    }
  }
  return null; // 見つからなかった
}

// ----------------------
// 使い方サンプル（Node/ブラウザ両対応）
// ----------------------
if (typeof module !== "undefined" && require) {
  // Node: エントリ用の簡単な実行例
  if (require.main === module) {
    const rows = 9, cols = 9, mines = 10;
    console.log("searching solvable board...");
    const res = generateSolvableBoard(rows, cols, mines, { maxAttempts: 5000 });
    if (res) {
      console.log("found in attempts:", res.attempts);
      // 出力：board の mine 配置を表示
      for (let r = 0; r < rows; r++) {
        let line = "";
        for (let c = 0; c < cols; c++) {
          line += res.board[r][c].mine ? "X " : (res.board[r][c].number + " ");
        }
        console.log(line);
      }
    } else {
      console.log("no solvable board found within attempts");
    }
  }
}

// ブラウザで使うなら、generateSolvableBoard を呼び出して結果を受け取ってね。
// 例:
// const res = generateSolvableBoard(9,9,10,{maxAttempts:2000});
// if (res) console.log(res.attempts, res.board);
