/* ===== 定数 ===== */
const dirs8 = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
const dirs4 = [[0,1],[1,0],[-1,0],[0,-1]];

const DIFFICULTY = {
  easy:   { W:8,  H:8,  mines:8,  cmin:6,  cmax:10 },
  normal: { W:10, H:10, mines:12, cmin:10, cmax:18 },
  hard:   { W:14, H:14, mines:30, cmin:18, cmax:30 }
};

/* ===== 状態 ===== */
let W=10,H=10,MINES=12,CORRIDOR_MIN=10,CORRIDOR_MAX=18;
let board=[], gameOver=false, firstClick=true;
let rule="V";            // V / A / C
let touchMode="open";    // open / flag

/* ===== UI操作 ===== */
function setDifficulty(n){
  const d=DIFFICULTY[n];
  W=d.W; H=d.H; MINES=d.mines;
  CORRIDOR_MIN=d.cmin; CORRIDOR_MAX=d.cmax;
  resetGame();
}
function setRule(r){ rule=r; resetGame(); }

function toggleMode(){
  touchMode = touchMode==="open" ? "flag" : "open";
  document.getElementById("modeBtn").textContent =
    touchMode==="open" ? "🚩 旗" : "⛏ 掘る";
}

/* ===== 初期化 ===== */
function createBoard(){
  board = Array.from({length:H},()=>Array.from({length:W},()=>({
    isMine:false,isOpen:false,isFlagged:false,adjacent:0
  })));
  document.getElementById("board").style.gridTemplateColumns =
    `repeat(${W},32px)`;
}

/* ===== 補助 ===== */
const isAmplified=(x,y)=>(x+y)%2===0;

function revealAllMines(){
  board.flat().forEach(c=>{ if(c.isMine) c.isOpen=true; });
}

function updateMineCount(){
  const flags = board.flat().filter(c=>c.isFlagged).length;
  document.getElementById("mineCount").textContent = MINES - flags;
}

/* ===== 地雷配置 ===== */
function placeMinesSafe(sx,sy){
  if(rule==="C"){
    placeCorridorSafe(sx,sy);
    calcNumbersNormal();
    return;
  }
  let placed=0;
  const forbid=(x,y)=>Math.abs(x-sx)<=1&&Math.abs(y-sy)<=1;
  while(placed<MINES){
    const x=~~(Math.random()*W), y=~~(Math.random()*H);
    if(board[y][x].isMine||forbid(x,y))continue;
    board[y][x].isMine=true; placed++;
  }
  calcNumbersAmplified();
}

function placeCorridorSafe(sx,sy){
  const forbid=(x,y)=>Math.abs(x-sx)<=1&&Math.abs(y-sy)<=1;
  let cx,cy,dx,dy;
  while(true){
    cx=~~(Math.random()*W); cy=~~(Math.random()*H);
    [dx,dy]=dirs4[~~(Math.random()*4)];
    const h=[cx+dx,cy+dy], f=[cx-dx,cy-dy];
    if([cx,cy,...h,...f].some((v,i)=>i%2?v<0||v>=H:v<0||v>=W))continue;
    if(forbid(cx,cy)||forbid(...h)||forbid(...f))continue;
    break;
  }

  const visited=new Set(), key=(x,y)=>`${x},${y}`;
  const mark=(x,y)=>{board[y][x].isMine=true; visited.add(key(x,y));};

  mark(cx,cy); mark(cx+dx,cy+dy); mark(cx-dx,cy-dy);
  let x=cx+dx,y=cy+dy;

  const neigh=(nx,ny)=>dirs4.filter(([dx,dy])=>board[ny+dy]?.[nx+dx]?.isMine).length;

  while(visited.size<CORRIDOR_MAX){
    const moves=dirs4.filter(([mx,my])=>{
      const nx=x+mx, ny=y+my;
      return nx>=0&&ny>=0&&nx<W&&ny<H&&!visited.has(key(nx,ny))
        &&neigh(nx,ny)<=1&&neigh(x,y)<2&&!forbid(nx,ny);
    });
    if(!moves.length)break;
    const [mx,my]=moves[~~(Math.random()*moves.length)];
    x+=mx; y+=my; mark(x,y);
  }

  if(visited.size<CORRIDOR_MIN){
    createBoard(); placeCorridorSafe(sx,sy);
  }
}

/* ===== 数字計算 ===== */
function calcNumbersNormal(){
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)
    if(!board[y][x].isMine)
      board[y][x].adjacent =
        dirs8.reduce((s,[dx,dy])=>s+(board[y+dy]?.[x+dx]?.isMine?1:0),0);
}

function calcNumbersAmplified(){
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)
    if(!board[y][x].isMine)
      board[y][x].adjacent =
        dirs8.reduce((s,[dx,dy])=>{
          const n=board[y+dy]?.[x+dx];
          return s+(n?.isMine?(rule==="A"&&isAmplified(x+dx,y+dy)?2:1):0);
        },0);
}

/* ===== 開く処理 ===== */
function openCell(x,y){
  const c=board[y]?.[x];
  if(!c||c.isOpen||c.isFlagged)return;
  c.isOpen=true;
  if(c.adjacent===0&&!c.isMine)
    dirs8.forEach(([dx,dy])=>openCell(x+dx,y+dy));
}

function countFlags(x,y){
  return dirs8.reduce((s,[dx,dy])=>s+(board[y+dy]?.[x+dx]?.isFlagged?1:0),0);
}

function openAround(x,y){
  for(const[dx,dy]of dirs8){
    const c=board[y+dy]?.[x+dx];
    if(c&&!c.isOpen&&!c.isFlagged){
      if(c.isMine){
        c.isOpen=true; gameOver=true;
        revealAllMines(); alert("Game Over"); return;
      }
      openCell(x+dx,y+dy);
    }
  }
}

/* ===== 描画 ===== */
function render(){
  const el=document.getElementById("board");
  el.innerHTML="";
  board.forEach((row,y)=>row.forEach((c,x)=>{
    const d=document.createElement("div");
    d.className="cell";
    if(rule==="A"&&!c.isOpen&&isAmplified(x,y)) d.style.background="#bdbdbd";

    if(c.isOpen){
      d.classList.add("open");
      if(c.isMine){ d.textContent="●"; d.classList.add("mine"); }
      else if(c.adjacent>0){ d.textContent=c.adjacent; d.classList.add("n"+Math.min(c.adjacent,8)); }
    }else if(c.isFlagged){
      d.textContent="⚑"; d.classList.add("flag");
    }

    d.onclick=()=>{
      if(gameOver)return;

      if(touchMode==="flag"){
        if(!c.isOpen){ c.isFlagged=!c.isFlagged; render(); }
        return;
      }

      if(firstClick){ placeMinesSafe(x,y); firstClick=false; }

      if(c.isOpen&&c.adjacent>0){
        if(countFlags(x,y)===c.adjacent) openAround(x,y);
        render(); return;
      }

      if(!c.isOpen&&!c.isFlagged){
        if(c.isMine){
          c.isOpen=true; gameOver=true;
          revealAllMines(); alert("Game Over");
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
  updateMineCount();
}

/* ===== リセット ===== */
function resetGame(){
  gameOver=false; firstClick=true;
  createBoard(); render();
}

/* 初期起動 */
setDifficulty("normal");
