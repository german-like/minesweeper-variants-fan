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
