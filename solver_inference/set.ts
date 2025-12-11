// set.ts

export interface NeighborInfo {
    coord: [number, number];
    isOpened: boolean;
    isFlagged: boolean;
}

export interface ClueGroup {
    clue: number;                          // 数字
    closed: [number, number][];            // 未開封セルの配列
    flaggedCount: number;                  // 旗の数（clue から引く用）
}

/**
 * 盤面スキャンのための関数を外から渡せるようにしている。
 * ゲームロジックに依存させないため。
 */
export type ClueGroupCollector = () => ClueGroup[];

/**
 * Subset inference の結果
 */
export interface InferenceResult {
    safe: Set<string>;   // セルキー "r,c"
    mine: Set<string>;
}

const key = (c: [number, number]) => `${c[0]},${c[1]}`;

/**
 * Set Inference（包含推論）
 * A.closed が B.closed の subset になっている場合：
 * 
 * - mines(A) = clueA - flagsA
 * - mines(B) = clueB - flagsB
 * 
 * A ⊂ B のとき、B だけに含まれるセルは
 *   mines(B) - mines(A)
 * が地雷数になる。
 * 
 * mines(B) = mines(A) なら差分は SAFE。
 */
export function runSetInference(collect: ClueGroupCollector): InferenceResult {
    const groups = collect();
    const result: InferenceResult = {
        safe: new Set(),
        mine: new Set(),
    };

    // 小さすぎるグループは意味がない
    const valid = groups.filter(g => g.closed.length > 0);

    for (let i = 0; i < valid.length; i++) {
        for (let j = 0; j < valid.length; j++) {
            if (i === j) continue;

            const A = valid[i];
            const B = valid[j];

            // A ⊂ B を確認する
            if (!isSubset(A.closed, B.closed)) continue;

            const diff = difference(B.closed, A.closed);
            if (diff.length === 0) continue;

            const minesA = A.clue - A.flaggedCount;
            const minesB = B.clue - B.flaggedCount;

            const extraMines = minesB - minesA;

            if (extraMines < 0) continue; // 矛盾（ただし無視）

            if (extraMines === 0) {
                // 差集合は全部 SAFE
                diff.forEach(c => result.safe.add(key(c)));
            } else if (extraMines === diff.length) {
                // 差集合は全部 MINE
                diff.forEach(c => result.mine.add(key(c)));
            }
        }
    }

    return result;
}

/** A が B の完全 subset か */
function isSubset(A: [number, number][], B: [number, number][]): boolean {
    return A.every(a => contains(B, a));
}

/** 配列 B に coord が入ってるか */
function contains(B: [number, number][], c: [number, number]): boolean {
    return B.some(b => b[0] === c[0] && b[1] === c[1]);
}

/** difference(B, A) = B - A */
function difference(B: [number, number][], A: [number, number][]): [number, number][] {
    return B.filter(b => !contains(A, b));
}
