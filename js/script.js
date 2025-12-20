/* ===============================
   Extended Minesweeper script.js
================================ */

const dirs8 = [
  [-1,-1],[0,-1],[1,-1],
  [-1, 0],       [1, 0],
  [-1, 1],[0, 1],[1, 1],
];

let W = 0, H = 0;
let board = [];
let rule = "V";
let gameOver = false;
let firstClick = true;
let flagMode = false; // mobile toggle
let totalMines = 0;

/* ===============================
   Text Board Parser
================================ */

function parseBoardText(text) {
  const lines = text.trim().split("\n");
  const meta = lines.pop().match(/\[(.+?)\]/)[1];
  const [size, hex, r] = meta.split("-");
  rule = r;

  const [w, h] = size.split("x").map(Number);
  W = w; H = h;

  createBoard();

  lines.forEach((line, y) => {
    [...line].forEach((ch, x) => {
      if (ch === "1") {
        board[y][x].isMine = true;
        totalMines++;
      }
      if (ch === "-") {
        board[y][x].isOpen = true;
      }
    });
  });

  calculateNumbers();
}

/* ===============================
   Board
================================ */

function createBoard() {
  board = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => ({
      isMine:false,
      isOpen:false,
      isFlagged:false,
      adjacent:0
    }))
  );
  document.getElementById("board")
    .style.gridTemplateColumns = `repeat(${W},32px)`;
}

function isAmplified(x,y){
  return (x + y) % 2 === 0;
}

/* ===============================
   Numbers
================================ */

function calculateNumbers() {
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    if (board[y][x].isMine) continue;
    board[y][x].adjacent = dirs8.reduce((s,[dx,dy])=>{
      const n = board[y+dy]?.[x+dx];
      if (!n || !n.isMine) return s;
      if (rule === "A" && isAmplified(x+dx,y+dy)) return s+2;
      return s+1;
    },0);
  }
}

/* ===============================
   Open Logic
================================ */

function openCell(x,y){
  const c = board[y]?.[x];
  if (!c || c.isOpen || c.isFlagged) return;
  c.isOpen = true;
  if (c.adjacent === 0 && !c.isMine)
    dirs8.forEach(([dx,dy])=>openCell(x+dx,y+dy));
}

function countFlags(x,y){
  return dirs8.reduce(
    (s,[dx,dy])=>s+(board[y+dy]?.[x+dx]?.isFlagged?1:0),0
  );
}

function openAround(x,y){
  for(const [dx,dy] of dirs8){
    const c = board[y+dy]?.[x+dx];
    if(c && !c.isOpen && !c.isFlagged){
      if(c.isMine){
        gameOver = true;
        revealAllMines();
        alert("Game Over");
        return;
      }
      openCell(x+dx,y+dy);
    }
  }
}

/* ===============================
   Render
================================ */

function remainingMines(){
  const flags = board.flat().filter(c=>c.isFlagged).length;
  return totalMines - flags;
}

function revealAllMines(){
  board.flat().forEach(c=>{
    if(c.isMine) c.isOpen = true;
  });
}

function render(){
  document.getElementById("mineCount").textContent =
    `💣 残り: ${remainingMines()}`;

  const el = document.getElementById("board");
  el.innerHTML = "";

  board.forEach((row,y)=>row.forEach((c,x)=>{
    const d = document.createElement("div");
    d.className = "cell";

    if (rule==="A" && !c.isOpen && isAmplified(x,y))
      d.style.background="#bdbdbd";

    if(c.isOpen){
      d.classList.add("open");
      if(c.isMine){ d.textContent="●"; d.classList.add("mine"); }
      else if(c.adjacent>0){
        d.textContent=c.adjacent;
        d.classList.add("n"+Math.min(c.adjacent,8));
      }
    }else if(c.isFlagged){
      d.textContent="⚑";
      d.classList.add("flag");
    }

    d.onclick=()=>{
      if(gameOver) return;

      if(flagMode){
        if(!c.isOpen){
          c.isFlagged=!c.isFlagged;
          render();
        }
        return;
      }

      if(c.isOpen && c.adjacent>0){
        if(countFlags(x,y)===c.adjacent) openAround(x,y);
        render();
        return;
      }

      if(!c.isOpen && !c.isFlagged){
        if(c.isMine){
          gameOver=true;
          revealAllMines();
          alert("Game Over");
        }else openCell(x,y);
        render();
      }
    };

    d.oncontextmenu=e=>{
      e.preventDefault();
      if(!c.isOpen){ c.isFlagged=!c.isFlagged; render(); }
    };

    el.appendChild(d);
  }));
}

/* ===============================
   Mobile Toggle
================================ */

function toggleFlagMode(){
  flagMode=!flagMode;
  document.getElementById("mode").textContent =
    flagMode ? "⚑ 旗" : "⛏ 掘る";
}

/* ===============================
   Init (example)
================================ */

fetch("./map/board.map").then(r=>r.text()).then(t=>{
   parseBoardText(t);
   render();
});
