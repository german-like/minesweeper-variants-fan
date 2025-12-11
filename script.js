import { generateSolvableBoard } from "./logic_solver.js";
import { applyBasicLogic } from "./solver_inference/index.js";

const rows = 9;
const cols = 9;
const minesCount = 10;

let board = [];       // UI用ボード
let logicBoard = [];  // ソルバー用ボード
let firstClick = true;
let mode = 'dig'; // 'dig' or 'flag'

export function solverStep() {
    return applyBasicLogic(logicBoard, openCell);
}

// UIボードを作り直す
export function createBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';

    firstClick = true;

    // ★ 論理的に解ける盤面を生成
    logicBoard = generateSolvableBoard(rows, cols, minesCount);

    // ★ UI用ボードを logicBoard から構築
    board = [];

    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {

            const cellData = logicBoard[r][c]; // ← 内部盤面を参照

            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            boardElement.appendChild(cell);

            cell.addEventListener('click', () => handleClick(r, c));
            cell.addEventListener('contextmenu', e => e.preventDefault());

            row.push({
                element: cell,
                mine: cellData.mine,
                number: cellData.number,
                opened: false,
                row: r,
                col: c
            });
        }
        board.push(row);
    }
}

// UI用クリック処理
function handleClick(r, c) {
    const cell = board[r][c];

    // フラグモード
    if (mode === 'flag') {
        if (!cell.opened) {
            cell.element.textContent =
                cell.element.textContent === '🚩' ? '' : '🚩';
        }
        return;
    }

    openCell(r, c);
}

// セルを開く
export function openCell(r, c) {
    const cell = board[r][c];
    if (cell.opened || cell.element.textContent === '🚩') return;

    cell.opened = true;
    cell.element.classList.add('open');

    if (cell.mine) {
        cell.element.classList.add('mine');
        cell.element.textContent = '💣';
        alert('ゲームオーバー！');
        revealMines();
        return;
    }

    if (cell.number > 0) {
        cell.element.textContent = cell.number;
        cell.element.dataset.number = cell.number;
    } else {
        // 周囲を自動開放
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    openCell(nr, nc);
                }
            }
        }
    }
}

// 全地雷を表示
function revealMines() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (board[r][c].mine) {
                board[r][c].element.classList.add('mine');
                board[r][c].element.textContent = '💣';
            }
        }
    }
}

// モード切替
document.getElementById('modeBtn').addEventListener('click', () => {
    mode = mode === 'dig' ? 'flag' : 'dig';
    document.getElementById('modeBtn').textContent =
        'モード: ' + (mode === 'dig' ? '掘る' : '旗');
});

// リセット
document.getElementById('reset').addEventListener('click', createBoard);

// 初期化
createBoard();
