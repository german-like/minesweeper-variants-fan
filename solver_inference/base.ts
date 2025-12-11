// solver_inference/base.ts

export function getNeighbors(board: any[][], r: number, c: number) {
    const rows = board.length;
    const cols = board[0].length;
    const list: any[] = [];

    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                list.push(board[nr][nc]);
            }
        }
    }
    return list;
}


// =============================
// 基本推論ロジック（最重要）
// =============================
export function applyBasicLogic(board: any[][], openCell: Function) {
    let changed = false;
    const rows = board.length;
    const cols = board[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {

            const cell = board[r][c];
            if (!cell.opened || cell.number === 0) continue;

            const neighbors = getNeighbors(board, r, c);

            const closed = neighbors.filter(n =>
                !n.opened && n.element.textContent !== "🚩"
            );
            const flags = neighbors.filter(n =>
                n.element.textContent === "🚩"
            );

            // SAFE 推論：数字 = 旗 の場合、残りはすべて安全
            if (cell.number === flags.length && closed.length > 0) {
                closed.forEach(n => {
                    openCell(n.row, n.col);
                });
                changed = true;
            }

            // MINE 推論：数字 − 旗 = 未開封 の場合、未開封はすべて地雷
            if (cell.number - flags.length === closed.length && closed.length > 0) {
                closed.forEach(n => {
                    n.element.textContent = "🚩";
                });
                changed = true;
            }
        }
    }
    return changed;
}
