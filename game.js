const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let gameRunning = false;

let player = {x:100,y:300,w:50,h:50,vy:0};
let gravity = 0.5;

let particles = [];

function startGame(){
  const menu = document.getElementById("menu");
  menu.style.display = "none";
  gameRunning = true;
}

function spawnParticles(x,y){
  for(let i=0;i<10;i++){
    particles.push({
      x:x,
      y:y,
      vx:(Math.random()-0.5)*4,
      vy:(Math.random()-0.5)*4,
      life:30
    });
  }
}

function update(){
  if(!gameRunning) return;

  player.vy += gravity;
  player.y += player.vy;

  if(player.y > canvas.height-100){
    player.y = canvas.height-100;
    player.vy = -10;
    spawnParticles(player.x, player.y);
  }

  particles.forEach(p=>{
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
  });

  particles = particles.filter(p=>p.life>0);
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // player
  ctx.fillStyle="pink";
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // particles
  particles.forEach(p=>{
    ctx.fillStyle="red";
    ctx.fillRect(p.x,p.y,5,5);
  });
}

function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
