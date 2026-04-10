
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu');
const hud = document.getElementById('hud');
const controls = document.getElementById('controls');
const livesEl = document.getElementById('lives');
const coinsEl = document.getElementById('coins');

const keys = {left:false,right:false,jump:false};
const state = {running:false,cameraX:0};
const playerImg = new Image();
playerImg.src = 'assets/sarah.png';

const world = {width:3600,groundY:0,platforms:[],coins:[]};
const player = {x:160,y:0,w:116,h:152,vx:0,vy:0,speed:5.5,jump:-15,onGround:false,lives:3,coins:0};

function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  world.groundY = canvas.height - 120;
  if(!state.running){
    player.y = world.groundY - player.h;
  }
}
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', ()=>setTimeout(resizeCanvas,50));
resizeCanvas();

function buildWorld(){
  world.groundY = canvas.height - 120;
  world.platforms = [
    {x:0,y:world.groundY,w:860,h:140},
    {x:980,y:world.groundY,w:740,h:140},
    {x:1840,y:world.groundY,w:800,h:140},
    {x:2750,y:world.groundY,w:920,h:140},
    {x:420,y:world.groundY-120,w:180,h:18},
    {x:760,y:world.groundY-210,w:180,h:18},
    {x:1340,y:world.groundY-120,w:180,h:18},
    {x:2140,y:world.groundY-120,w:180,h:18},
    {x:2480,y:world.groundY-210,w:180,h:18},
  ];
  world.coins = [];
  [220,320,420,520,620,780,900,1060,1160,1260,1400,1500,1600,1760,1880,2000,2160,2280,2400,2520,2660,2820,2940,3060,3200].forEach((x,i)=>{
    world.coins.push({x,y:i%3===0?world.groundY-240:(i%2===0?world.groundY-70:world.groundY-150),r:11,collected:false});
  });
  player.x = 160;
  player.y = world.groundY - player.h;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.coins = 0;
  player.lives = 3;
  state.cameraX = 0;
}

function startGame(){
  buildWorld();
  state.running = true;
  menu.classList.add('hidden');
  hud.classList.remove('hidden');
  controls.classList.remove('hidden');
}
document.getElementById('startBtn').addEventListener('click', startGame);

function overlap(a,b){
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}

document.querySelectorAll('.control').forEach(btn=>{
  const act = btn.dataset.act;
  const on = e => { e.preventDefault(); keys[act] = true; };
  const off = e => { e.preventDefault(); keys[act] = false; };
  btn.addEventListener('touchstart', on, {passive:false});
  btn.addEventListener('touchend', off, {passive:false});
  btn.addEventListener('mousedown', on);
  btn.addEventListener('mouseup', off);
  btn.addEventListener('mouseleave', off);
});
window.addEventListener('keydown', e=>{
  if(['ArrowLeft','a','A'].includes(e.key)) keys.left = true;
  if(['ArrowRight','d','D'].includes(e.key)) keys.right = true;
  if(['ArrowUp','w','W',' '].includes(e.key)) keys.jump = true;
});
window.addEventListener('keyup', e=>{
  if(['ArrowLeft','a','A'].includes(e.key)) keys.left = false;
  if(['ArrowRight','d','D'].includes(e.key)) keys.right = false;
  if(['ArrowUp','w','W',' '].includes(e.key)) keys.jump = false;
});

function update(){
  if(!state.running) return;
  world.groundY = canvas.height - 120;

  if(keys.left) player.vx = -5.5;
  else if(keys.right) player.vx = 5.5;
  else player.vx *= 0.75;

  if(keys.jump && player.onGround){
    player.vy = player.jump;
    player.onGround = false;
    keys.jump = false;
  }

  player.vy += 0.85;
  if(player.vy > 18) player.vy = 18;
  player.x += player.vx;
  player.y += player.vy;
  player.onGround = false;

  for(const p of world.platforms){
    if(overlap(player,p)){
      const prevBottom = player.y + player.h - player.vy;
      if(prevBottom <= p.y + 18 && player.vy >= 0){
        player.y = p.y - player.h;
        player.vy = 0;
        player.onGround = true;
      }
    }
  }

  if(player.x < 0) player.x = 0;
  if(player.x > world.width - player.w) player.x = world.width - player.w;
  if(player.y > canvas.height + 200){
    player.x = 160;
    player.y = world.groundY - player.h;
    player.vx = 0;
    player.vy = 0;
  }

  for(const c of world.coins){
    if(!c.collected && Math.hypot(player.x + player.w/2 - c.x, player.y + player.h/2 - c.y) < 40){
      c.collected = true;
      player.coins += 1;
    }
  }

  let target = player.x - canvas.width * 0.35;
  target = Math.max(0, Math.min(target, world.width - canvas.width));
  state.cameraX += (target - state.cameraX) * 0.12;

  livesEl.textContent = player.lives;
  coinsEl.textContent = player.coins;
}

function drawBackground(){
  const sky = ctx.createLinearGradient(0,0,0,canvas.height);
  sky.addColorStop(0,'#2d1748');
  sky.addColorStop(0.55,'#6c39a5');
  sky.addColorStop(1,'#f2a3b4');
  ctx.fillStyle = sky;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const sunX = canvas.width * 0.78;
  const sunY = 150;
  const sun = ctx.createRadialGradient(sunX,sunY,10,sunX,sunY,100);
  sun.addColorStop(0,'rgba(255,244,184,.94)');
  sun.addColorStop(.35,'rgba(255,219,140,.44)');
  sun.addColorStop(1,'rgba(255,219,140,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(sunX - 110, sunY - 110, 220, 220);

  ctx.fillStyle = 'rgba(255,209,224,.42)';
  ctx.fillRect(0, canvas.height - 190, canvas.width, 200);

  const sand = ctx.createLinearGradient(0, canvas.height - 160, 0, canvas.height);
  sand.addColorStop(0, '#e8c89d');
  sand.addColorStop(1, '#c79a63');
  ctx.fillStyle = sand;
  ctx.fillRect(0, canvas.height - 160, canvas.width, 200);
}

function drawWorld(){
  ctx.save();
  ctx.translate(-state.cameraX, 0);

  for(const p of world.platforms){
    ctx.fillStyle = p.y >= world.groundY ? '#d7af79' : '#efce98';
    ctx.fillRect(p.x,p.y,p.w,p.h);
    ctx.fillStyle = p.y >= world.groundY ? '#75d767' : '#ffe0af';
    ctx.fillRect(p.x,p.y,p.w,18);
  }

  for(const c of world.coins){
    if(c.collected) continue;
    ctx.fillStyle = 'rgba(255,231,150,.22)';
    ctx.beginPath(); ctx.arc(c.x,c.y,c.r+9,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffd84d';
    ctx.beginPath(); ctx.arc(c.x,c.y,c.r,0,Math.PI*2); ctx.fill();
  }

  drawSarah();
  ctx.restore();
}

function drawSarah(){
  const x = player.x + player.w/2;
  const y = player.y + player.h/2;
  ctx.save();
  ctx.translate(x,y);
  if(playerImg.complete && playerImg.naturalWidth > 0){
    ctx.drawImage(playerImg, -58, -76, 116, 152);
  } else {
    ctx.fillStyle = '#ff69b4';
    ctx.fillRect(-28,-44,56,88);
  }
  ctx.restore();
}

function loop(){
  update();
  drawBackground();
  if(state.running) drawWorld();
  requestAnimationFrame(loop);
}
loop();
