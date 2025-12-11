// solver_inference/base.js

export function applyBasicLogic(board, rows, cols, openCell, flagCell) {
    let changed = false;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {

            const cell = board[r][c];
            if (!cell.opened || cell.number === 0) continue;

            const neighbors = getNeighbors(board, r, c, rows, cols);
            const closed = neighbors.filter(n => !n.opened && !n.flagged);
            const flags  = neighbors.filter(n => n.flagged);

            // SAFE 判定
            if (cell.number === flags.length) {
                closed.forEach(n => {
                    openCell(n.r, n.c);
                    changed = true;
                });
            }

            // MINE 判定
            if (cell.number - flags.length === closed.length) {
                closed.forEach(n => {
                    flagCell(n.r, n.c);
                    changed = true;
                });
            }
        }
    }

    return changed;
}

function getNeighbors(board, r, c, rows, cols) {
    const res = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                const target = board[nr][nc];
                res.push({
                    ...target,
                    r: nr,
                    c: nc,
                    flagged: target.element.textContent === "🚩"
                });
            }
        }
    }
    return res;
}

// solver_inference/set.js

export function applySetLogic(board, rows, cols, openCell, flagCell) {
    const constraints = [];

    // 1. 制約生成
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = board[r][c];
            if (!cell.opened || cell.number === 0) continue;

            const info = getInfo(board, r, c, rows, cols);
            constraints.push({
                pos: { r, c },
                closed: info.closed.map(x => ({ r: x.r, c: x.c })),
                flags: info.flags.length,
                mines: cell.number - info.flags.length
            });
        }
    }

    let changed = false;

    // 2. ペア比較
    for (let i = 0; i < constraints.length; i++) {
        for (let j = i + 1; j < constraints.length; j++) {

            const A = constraints[i];
            const B = constraints[j];

            // 完全包含 A ⊂ B
            changed |= applySubset(A, B, openCell, flagCell);
            changed |= applySubset(B, A, openCell, flagCell);

            // 部分包含解析
            changed |= applyPartial(A, B, openCell, flagCell);
            changed |= applyPartial(B, A, openCell, flagCell);
        }
    }

    return changed;
}


//━━━━━━━━━━━━━━━━━━━━
//  完全包含 A ⊂ B
//━━━━━━━━━━━━━━━━━━━━
function applySubset(A, B, openCell, flagCell) {
    if (!isSubset(A.closed, B.closed)) return false;

    const diffCount = B.mines - A.mines;
    const extra = B.closed.filter(x => !inList(x, A.closed));

    if (diffCount === extra.length && diffCount > 0) {
        extra.forEach(x => flagCell(x.r, x.c));
        return true;
    }
    if (diffCount === 0 && extra.length > 0) {
        extra.forEach(x => openCell(x.r, x.c));
        return true;
    }
    return false;
}


//━━━━━━━━━━━━━━━━━━━━
//  部分的重なり A∩B
//━━━━━━━━━━━━━━━━━━━━
function applyPartial(A, B, openCell, flagCell) {
    const X  = A.closed.filter(x => inList(x, B.closed));
    if (X.length === 0) return false;

    const A_only = A.closed.filter(x => !inList(x, X));
    const B_only = B.closed.filter(x => !inList(x, X));

    // 地雷差とピース差の関係
    const diff = A.mines - B.mines;

    let changed = false;

    if (diff === A_only.length - B_only.length) {
        if (A_only.length > 0 && diff === A_only.length) {
            A_only.forEach(x => flagCell(x.r, x.c));
            changed = true;
        }
        if (B_only.length > 0 && diff === -B_only.length) {
            B_only.forEach(x => flagCell(x.r, x.c));
            changed = true;
        }
    }

    // 地雷が0確定
    if (A.mines <= X.length - A_only.length) {
        B_only.forEach(x => openCell(x.r, x.c));
        changed = true;
    }

    return changed;
}


//━━━━━━━━━━━━━━━━━━━━
//  ユーティリティ
//━━━━━━━━━━━━━━━━━━━━
function isSubset(A, B) {
    return A.every(a => inList(a, B));
}

function inList(x, list) {
    return list.some(y => x.r === y.r && x.c === y.c);
}

function getInfo(board, r, c, rows, cols) {
    const neighbors = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                const t = board[nr][nc];
                neighbors.push({
                    ...t,
                    r: nr,
                    c: nc,
                    flagged: t.element.textContent === "🚩"
                });
            }
        }
    }
    return {
        closed: neighbors.filter(n => !n.opened && !n.flagged),
        flags: neighbors.filter(n => n.flagged)
    };
}

// understood.js
// 論理だけで確定できる地雷マス・安全マスを返す
// board は {revealed, flagged, mine, number} を持つセルの2D配列

export function analyzeLocalInferences(board) {
    const height = board.length;
    const width = board[0].length;

    const mustBeMine = new Set();
    const mustBeSafe = new Set();

    // 隣接 8 セル取得
    function neighbors(r, c) {
        const res = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
                    res.push([nr, nc]);
                }
            }
        }
        return res;
    }

    // ユーティリティ
    const key = (r, c) => `${r},${c}`;

    // 数字マスごとに周囲セットを作る
    const constraints = [];  
    // { cells:Set, mines:int }

    for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
            const cell = board[r][c];
            if (!cell.revealed || typeof cell.number !== "number") continue;

            const adj = neighbors(r, c);

            const flagged = adj.filter(([ar, ac]) => board[ar][ac].flagged);
            const hidden  = adj.filter(([ar, ac]) => 
                !board[ar][ac].revealed && !board[ar][ac].flagged
            );

            const remaining = cell.number - flagged.length;

            if (hidden.length === 0) continue;

            constraints.push({
                cells: new Set(hidden.map(([a,b]) => key(a,b))),
                mines: remaining
            });

            // 基本推論 1
            if (remaining === hidden.length) {
                hidden.forEach(([a,b]) => mustBeMine.add(key(a,b)));
            }

            // 基本推論 2
            if (remaining === 0) {
                hidden.forEach(([a,b]) => mustBeSafe.add(key(a,b)));
            }
        }
    }

    // === 部分集合推論 / 差分推論 ===
    for (let i = 0; i < constraints.length; i++) {
        for (let j = 0; j < constraints.length; j++) {
            if (i === j) continue;

            const A = constraints[i];
            const B = constraints[j];

            // A ⊆ B ?
            if ([...A.cells].every(c => B.cells.has(c))) {

                const diff = [...B.cells].filter(c => !A.cells.has(c));

                // B−A が残り全部地雷？
                if (B.mines - A.mines === diff.length) {
                    diff.forEach(k => mustBeMine.add(k));
                }

                // A が全部地雷なら、B−A は安全
                if (A.mines === A.cells.size) {
                    diff.forEach(k => mustBeSafe.add(k));
                }
            }
        }
    }

    // === 1–2 パターン（単純版） ===
    // 代表的な「1 と 2 が隣接している場合」のパターンだけ対応
    constraints.forEach(A => {
        constraints.forEach(B => {
            if (A === B) return;
            if (A.mines === 1 && B.mines === 2) {
                const common = [...A.cells].filter(c => B.cells.has(c));
                const diffB  = [...B.cells].filter(c => !A.cells.has(c));

                if (common.length === 1 && diffB.length === 1) {
                    // 1–2 パターンで、common は地雷 / diffB は安全
                    mustBeMine.add(common[0]);
                    mustBeSafe.add(diffB[0]);
                }
            }
        });
    });

    return { mustBeMine, mustBeSafe };
}
