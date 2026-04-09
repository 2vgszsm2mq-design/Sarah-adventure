const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let running = false;

const player = {
  x:100,
  y:400,
  w:60,
  h:90,
  vy:0,
  onGround:false
};

function startGame(){
  document.getElementById("menu").style.display="none";
  running = true;
  loop();
}

function drawPlayer(){
  // cartoon "Sarah"
  ctx.fillStyle = "#ff69b4";
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // "hair"
  ctx.fillStyle = "#ffcc66";
  ctx.fillRect(player.x, player.y-20, player.w, 20);
}

function loop(){
  if(!running) return;

  ctx.clearRect(0,0,canvas.width,canvas.height);

  // ground
  ctx.fillStyle="#c2a679";
  ctx.fillRect(0,500,canvas.width,200);

  // gravity
  player.vy += 0.5;
  player.y += player.vy;

  if(player.y > 410){
    player.y = 410;
    player.vy = 0;
    player.onGround = true;
  }

  drawPlayer();

  requestAnimationFrame(loop);
}

window.addEventListener("click",()=>{
  if(player.onGround){
    player.vy = -12;
    player.onGround=false;
  }
});
