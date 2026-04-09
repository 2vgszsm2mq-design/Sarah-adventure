
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resizeCanvas(){ canvas.width = Math.max(1280, window.innerWidth); canvas.height = Math.max(720, window.innerHeight); }
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const SAVE_KEY = 'sarah_artpass_save';

const ui = {
  menu: document.getElementById('menu'),
  newGameBtn: document.getElementById('newGameBtn'),
  continueBtn: document.getElementById('continueBtn'),
  shield: document.getElementById('shield'),
  ammo: document.getElementById('ammo'),
  coins: document.getElementById('coins'),
  letters: document.getElementById('letters'),
  bossHud: document.getElementById('bossHud'),
  bossFill: document.getElementById('bossFill'),
  message: document.getElementById('message')
};

const spriteSheet = new Image();
spriteSheet.src = 'assets/sarah_sheet.png';

const keys = {left:false,right:false,jump:false,attack:false};

let gameState = 'menu';
let cameraX = 0;
let time = 0;
let projectiles = [];
let particles = [];
let screenShake = 0;
let showEndAt = 0;

const world = {
  width: 7800,
  gravity: 0.85,
  platforms: [],
  coins: [],
  ammoPickups: [],
  notes: [],
  enemies: [],
  pipes: [],
  checkpoints: [],
  goalX: 7480,
  boss: null
};

const player = {
  x: 160, y: 420, w: 88, h: 124,
  vx: 0, vy: 0, speed: 5.2, jumpPower: -15.5,
  facing: 1, onGround: false,
  lives: 3, shield: 3, ammo: 3, coins: 0, letters: 0,
  invuln: 0, attackCooldown: 0,
  checkpointX: 160, checkpointY: 420,
  animTick: 0
};

function resetWorld(){
  world.platforms = [
    {x:0,y:596,w:1100,h:124},{x:1200,y:596,w:760,h:124},{x:2060,y:596,w:820,h:124},{x:2980,y:596,w:680,h:124},
    {x:3780,y:596,w:760,h:124},{x:4640,y:596,w:810,h:124},{x:5570,y:596,w:830,h:124},{x:6500,y:596,w:1300,h:124},

    {x:260,y:505,w:180,h:22},{x:540,y:435,w:180,h:22},{x:840,y:365,w:180,h:22},
    {x:1410,y:505,w:160,h:22},{x:1700,y:435,w:160,h:22},{x:1990,y:365,w:160,h:22},
    {x:2320,y:470,w:180,h:22},{x:2640,y:400,w:180,h:22},
    {x:3160,y:505,w:190,h:22},{x:3470,y:430,w:190,h:22},
    {x:3980,y:470,w:180,h:22},{x:4300,y:400,w:180,h:22},
    {x:4870,y:505,w:190,h:22},{x:5200,y:435,w:190,h:22},{x:5520,y:365,w:190,h:22},
    {x:5890,y:470,w:180,h:22},{x:6210,y:400,w:180,h:22},
    {x:6700,y:505,w:200,h:22},{x:7060,y:430,w:200,h:22}
  ];

  world.coins = [];
  const coinXs = [160,240,320,420,520,620,720,860,980,1110,1380,1460,1540,1620,1700,1780,1920,2010,2140,
  2280,2360,2440,2520,2660,2740,2820,3140,3220,3300,3380,3560,3640,3720,3980,4060,4140,4220,4380,4460,4540,
  4820,4900,4980,5060,5140,5220,5400,5480,5560,5640,5720,5960,6040,6120,6200,6440,6520,6600,6680,6760,6840,
  7000,7080,7160,7240,7320];
  coinXs.forEach((x,i)=>world.coins.push({x,y:i%3===0?350:(i%2===0?520:445),r:11,collected:false}));

  world.ammoPickups = [
    {x:1720,y:392,w:30,h:30,collected:false},
    {x:4310,y:357,w:30,h:30,collected:false},
    {x:6215,y:357,w:30,h:30,collected:false},
  ];

  world.notes = [
    {x:2650,y:365,w:30,h:30,collected:false},
    {x:5960,y:365,w:30,h:30,collected:false}
  ];

  world.enemies = [
    {x:1360,y:553,w:58,h:44,min:1260,max:1880,vx:1.4,alive:true},
    {x:2310,y:553,w:58,h:44,min:2180,max:2790,vx:1.5,alive:true},
    {x:3950,y:553,w:58,h:44,min:3850,max:4480,vx:1.4,alive:true},
    {x:5880,y:553,w:58,h:44,min:5750,max:6330,vx:1.6,alive:true}
  ];

  world.pipes = [
    {x:1040,y:506,w:92,h:90,secretTo:{x:2280,y:305}},
    {x:5350,y:506,w:92,h:90,secretTo:{x:6120,y:305}},
    {x:7360,y:506,w:92,h:90,secretTo:null}
  ];

  world.checkpoints = [{x:1980,y:472},{x:4460,y:472},{x:6440,y:472}];

  world.boss = {x:6900,y:492,w:140,h:112,hp:12,maxHp:12,alive:true,cooldown:0,flash:0};
}

function resetPlayer(full=true){
  player.x=160; player.y=420; player.vx=0; player.vy=0; player.facing=1; player.onGround=false;
  player.shield=3; player.ammo=3; player.coins=0; player.letters=0; player.invuln=0; player.attackCooldown=0;
  player.checkpointX=160; player.checkpointY=420; player.animTick=0;
  if(full) player.lives=3;
}

function saveGame(){
  const save = {player:{...player}, coins:world.coins.map(c=>c.collected), ammoPickups:world.ammoPickups.map(a=>a.collected), notes:world.notes.map(n=>n.collected), enemies:world.enemies.map(e=>e.alive), boss:{hp:world.boss.hp, alive:world.boss.alive}};
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}
function loadGame(){
  const raw = localStorage.getItem(SAVE_KEY); if(!raw) return false;
  try{
    resetWorld(); resetPlayer(false);
    const save = JSON.parse(raw);
    Object.assign(player, save.player);
    world.coins.forEach((c,i)=>c.collected = !!save.coins[i]);
    world.ammoPickups.forEach((a,i)=>a.collected = !!save.ammoPickups[i]);
    world.notes.forEach((n,i)=>n.collected = !!save.notes[i]);
    world.enemies.forEach((e,i)=>e.alive = !!save.enemies[i]);
    world.boss.hp = save.boss.hp; world.boss.alive = save.boss.alive;
    gameState='playing'; ui.menu.style.display='none';
    return true;
  }catch(e){ console.error(e); return false; }
}

function newGame(){ resetWorld(); resetPlayer(true); cameraX=0; particles=[]; projectiles=[]; gameState='playing'; ui.menu.style.display='none'; saveGame(); }
function rectsOverlap(a,b){ return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }

function drawHeart(x,y,s,color){
  ctx.fillStyle=color; ctx.beginPath();
  ctx.moveTo(x, y+s/2);
  ctx.bezierCurveTo(x, y, x-s, y, x-s, y+s/2);
  ctx.bezierCurveTo(x-s, y+s, x, y+s*1.25, x, y+s*1.55);
  ctx.bezierCurveTo(x, y+s*1.25, x+s, y+s, x+s, y+s/2);
  ctx.bezierCurveTo(x+s, y, x, y, x, y+s/2);
  ctx.fill();
}
function burst(x,y,color='#ff8fc0',count=12){
  for(let i=0;i<count;i++) particles.push({x,y,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.7)*7,life:24,color});
}
function showMessage(text, ms=1400){
  ui.message.textContent = text;
  ui.message.classList.remove('hidden');
  showEndAt = performance.now() + ms;
}
function shootHeart(){
  if(gameState!=='playing' || player.attackCooldown>0 || player.ammo<=0) return;
  player.attackCooldown=18; player.ammo-=1;
  projectiles.push({x:player.x+player.w/2,y:player.y+48,w:22,h:22,vx:player.facing*10,life:72});
}
function hurtPlayer(sourceX){
  if(player.invuln>0) return;
  if(player.shield>0) player.shield -= 1; else player.lives -= 1;
  player.invuln=90; player.vx = player.x < sourceX ? -8 : 8; player.vy = -8; screenShake=8;
  burst(player.x+player.w/2, player.y+player.h/2, '#ffd0e7', 10);
  if(player.lives<=0){ player.lives=3; player.x=player.checkpointX; player.y=player.checkpointY; player.shield=3; player.ammo=3; }
  saveGame();
}

function update(){
  if(gameState!=='playing') return;
  time++; player.animTick++;

  if(keys.left){ player.vx = -player.speed; player.facing = -1; }
  else if(keys.right){ player.vx = player.speed; player.facing = 1; }
  else player.vx *= 0.78;

  if(keys.jump && player.onGround){ player.vy = player.jumpPower; player.onGround=false; burst(player.x+player.w/2, player.y+player.h, '#fff1f8', 6); keys.jump=false; }
  if(keys.attack){ shootHeart(); keys.attack=false; }

  player.vy += world.gravity; if(player.vy>18) player.vy=18;
  player.x += player.vx; player.y += player.vy;
  player.onGround=false;

  for(const p of world.platforms){
    if(rectsOverlap(player,p)){
      const prevBottom = player.y + player.h - player.vy;
      if(prevBottom <= p.y + 16 && player.vy >= 0){
        player.y = p.y - player.h;
        if(Math.abs(player.vy) > 2) burst(player.x+player.w/2, p.y, '#fff0f8', 5);
        player.vy = 0; player.onGround = true;
      } else if(player.x + player.w/2 < p.x + 24) player.x = p.x - player.w;
      else if(player.x + player.w/2 > p.x + p.w - 24) player.x = p.x + p.w;
    }
  }

  if(player.x < 0) player.x = 0;
  if(player.x > world.width - player.w) player.x = world.width - player.w;
  if(player.y > 860){
    player.x = player.checkpointX; player.y = player.checkpointY; player.vx=0; player.vy=0; player.shield=3; player.lives=Math.max(1,player.lives-1);
  }

  world.checkpoints.forEach(cp=>{ if(player.x > cp.x){ player.checkpointX = cp.x+8; player.checkpointY = cp.y-player.h; } });

  world.coins.forEach(c=>{ if(!c.collected && Math.hypot(player.x+44-c.x, player.y+62-c.y)<40){ c.collected=true; player.coins += 1; burst(c.x,c.y,'#ffd968',8); } });
  world.ammoPickups.forEach(a=>{ if(!a.collected && rectsOverlap(player,a)){ a.collected=true; player.ammo += 2; burst(a.x+15,a.y+15,'#ff6ab8',10); } });
  world.notes.forEach(n=>{ if(!n.collected && rectsOverlap(player,n)){ n.collected=true; player.letters += 1; burst(n.x+15,n.y+15,'#fff0d4',10); } });

  projectiles = projectiles.filter(p=>p.life-- > 0);
  projectiles.forEach(p=>{
    p.x += p.vx;
    world.enemies.forEach(e=>{
      if(!e.alive) return;
      if(p.x<e.x+e.w && p.x+p.w>e.x && p.y<e.y+e.h && p.y+p.h>e.y){
        e.alive=false; p.life=0; burst(e.x+20,e.y+20,'#ff93c9',12); screenShake=6;
      }
    });
    const b=world.boss;
    if(b.alive && p.x<b.x+b.w && p.x+p.w>b.x && p.y<b.y+b.h && p.y+p.h>b.y){
      b.hp -= 1; b.flash=10; p.life=0; screenShake=7; burst(p.x,p.y,'#ff93c9',14);
      if(b.hp<=0){ b.alive=false; burst(b.x+60,b.y+44,'#ffd2eb',24); showMessage('SEJR ❤️', 1800); }
    }
  });

  world.enemies.forEach(e=>{
    if(!e.alive) return;
    e.x += e.vx; if(e.x<e.min || e.x>e.max) e.vx *= -1;
    if(rectsOverlap(player,e)){
      const stomp = player.vy>2 && player.y + player.h - e.y < 30;
      if(stomp){ e.alive=false; player.vy=-10; burst(e.x+20,e.y+20,'#ffe1ef',10); }
      else hurtPlayer(e.x + e.w/2);
    }
  });

  const boss = world.boss;
  if(boss.alive){
    if(Math.abs(player.x-boss.x)<540){ ui.bossHud.classList.remove('hidden'); }
    if(Math.abs(player.x-boss.x)<360){ boss.x += Math.sign(player.x-boss.x) * -0.7; }
    if(rectsOverlap(player,boss)) hurtPlayer(boss.x + boss.w/2);
    ui.bossFill.style.width = `${Math.max(0,(boss.hp/boss.maxHp)*100)}%`;
    if(boss.flash>0) boss.flash--;
  }else ui.bossHud.classList.add('hidden');

  world.pipes.forEach(pipe=>{
    if(rectsOverlap(player,pipe) && keys.downLike){
      if(pipe.secretTo){ player.x=pipe.secretTo.x; player.y=pipe.secretTo.y; }
      else if(!world.boss.alive && player.letters >= 2){ showMessage('Sudoku og casino kommer i næste build 🎰', 2600); }
    }
  });

  if(player.attackCooldown>0) player.attackCooldown--;
  if(player.invuln>0) player.invuln--;

  let targetCamera = player.x - canvas.width * 0.3;
  targetCamera = Math.max(0, Math.min(targetCamera, world.width - canvas.width));
  cameraX += (targetCamera - cameraX) * 0.12;

  ui.shield.textContent = player.shield;
  ui.ammo.textContent = player.ammo;
  ui.coins.textContent = player.coins;
  ui.letters.textContent = player.letters;

  if(showEndAt && performance.now() > showEndAt){ ui.message.classList.add('hidden'); showEndAt = 0; }
}

function drawBackground(){
  const sky = ctx.createLinearGradient(0,0,0,canvas.height);
  sky.addColorStop(0,'#2d1748'); sky.addColorStop(0.52,'#6f3ba6'); sky.addColorStop(1,'#f3a3b4');
  ctx.fillStyle=sky; ctx.fillRect(0,0,canvas.width,canvas.height);

  const sunX = canvas.width*0.78, sunY=150;
  const sun = ctx.createRadialGradient(sunX,sunY,10,sunX,sunY,105);
  sun.addColorStop(0,'rgba(255,244,184,.94)'); sun.addColorStop(.35,'rgba(255,219,140,.46)'); sun.addColorStop(1,'rgba(255,219,140,0)');
  ctx.fillStyle=sun; ctx.fillRect(sunX-110,sunY-110,220,220);

  for(let i=0;i<14;i++){
    const x = ((i*280 - cameraX*0.2) % (canvas.width+380)) - 120;
    const y = 115 + (i%4)*18;
    ctx.fillStyle='rgba(255,255,255,.18)';
    ctx.beginPath(); ctx.arc(x,y,36,0,Math.PI*2); ctx.arc(x+44,y+8,28,0,Math.PI*2); ctx.arc(x-40,y+10,26,0,Math.PI*2); ctx.fill();
  }

  ctx.save(); ctx.translate(-(cameraX*0.12),0);
  for(let i=0;i<10;i++){
    const bx = i*520 - 80;
    ctx.fillStyle = i%2 ? 'rgba(82,34,115,.46)' : 'rgba(62,24,92,.52)';
    ctx.beginPath(); ctx.moveTo(bx,590); ctx.quadraticCurveTo(bx+130,372,bx+280,590); ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle='rgba(255,209,224,.42)'; ctx.fillRect(0,520,canvas.width,200);

  const sand = ctx.createLinearGradient(0,560,0,canvas.height);
  sand.addColorStop(0,'#e8c89d'); sand.addColorStop(1,'#c79a63');
  ctx.fillStyle=sand; ctx.fillRect(0,560,canvas.width,200);

  ctx.save(); ctx.translate(-(cameraX*0.16),0);
  [120,1180,2180,3240,4420,5580,6700].forEach((x,i)=>drawPalm(x,560, i%2?170:190));
  ctx.restore();
}
function drawPalm(x,baseY,h){
  ctx.fillStyle='rgba(24,10,32,.9)';
  ctx.fillRect(x-5, baseY-h, 10, h);
  for(let i=0;i<6;i++){
    ctx.save(); ctx.translate(x, baseY-h); ctx.rotate(-1.05 + i*0.4);
    ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(74,-16,136,22); ctx.quadraticCurveTo(74,18,0,8); ctx.fill(); ctx.restore();
  }
}
function drawWorld(){
  ctx.save();
  if(screenShake>0){
    const sx=(Math.random()-0.5)*screenShake, sy=(Math.random()-0.5)*screenShake*0.6;
    ctx.translate(sx,sy); screenShake *= 0.85; if(screenShake<.25) screenShake=0;
  }
  ctx.translate(-cameraX,0);

  world.platforms.forEach(p=>{
    ctx.fillStyle = p.y > 560 ? '#d7af79' : '#efce98';
    ctx.fillRect(p.x,p.y,p.w,p.h);
    ctx.fillStyle = p.y > 560 ? '#75d767' : '#ffe0af';
    ctx.fillRect(p.x,p.y,p.w,18);
  });

  world.pipes.forEach(pipe=>{
    ctx.fillStyle='#26a65b'; ctx.fillRect(pipe.x,pipe.y,pipe.w,pipe.h); ctx.fillRect(pipe.x-8,pipe.y-18,pipe.w+16,22);
    ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fillRect(pipe.x+16,pipe.y+10,12,pipe.h-20);
  });

  ctx.fillStyle='#fff'; ctx.font='bold 20px Arial';
  ctx.fillText('Hemmeligt rør ↓', 860, 476);
  ctx.fillText('Warp ↓', 5170, 476);
  ctx.fillText('Udgang →', 7310, 476);

  world.checkpoints.forEach(cp=>{
    ctx.fillStyle='#fff'; ctx.fillRect(cp.x, 436, 10, 160);
    ctx.fillStyle='#ff9cd0'; ctx.fillRect(cp.x+10, 436, 60, 42);
  });

  world.coins.forEach(c=>{
    if(c.collected) return;
    ctx.fillStyle='rgba(255,231,150,.22)'; ctx.beginPath(); ctx.arc(c.x,c.y,c.r+9,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffd84d'; ctx.beginPath(); ctx.arc(c.x,c.y,c.r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff2c9'; ctx.fillRect(c.x-3,c.y-8,6,16);
  });

  world.ammoPickups.forEach(a=>{ if(!a.collected) drawHeart(a.x+15,a.y+15,12,'#ff4c93'); });
  world.notes.forEach(n=>{
    if(n.collected) return;
    ctx.fillStyle='#fff8f0'; ctx.fillRect(n.x,n.y,n.w,n.h);
    ctx.strokeStyle='#ff7bb7'; ctx.lineWidth=2; ctx.strokeRect(n.x,n.y,n.w,n.h);
    ctx.beginPath(); ctx.moveTo(n.x,n.y); ctx.lineTo(n.x+n.w/2,n.y+n.h/2); ctx.lineTo(n.x+n.w,n.y); ctx.stroke();
  });

  world.enemies.forEach(e=>{
    if(!e.alive) return;
    ctx.fillStyle='rgba(255,100,100,.18)'; ctx.beginPath(); ctx.arc(e.x+22,e.y+22,30,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#d33b3b'; ctx.beginPath(); ctx.arc(e.x+22,e.y+22,22,0,Math.PI*2); ctx.fill();
    ctx.fillRect(e.x-4,e.y+14,14,8); ctx.fillRect(e.x+34,e.y+14,14,8);
    ctx.fillStyle='#fff'; ctx.fillRect(e.x+10,e.y+8,8,8); ctx.fillRect(e.x+26,e.y+8,8,8);
  });

  const b=world.boss;
  if(b.alive){
    ctx.save(); if(b.flash>0) ctx.globalAlpha=0.65;
    ctx.fillStyle='rgba(255,95,95,.2)'; ctx.beginPath(); ctx.arc(b.x+54,b.y+52,62,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#c81f1f'; ctx.beginPath(); ctx.arc(b.x+54,b.y+52,50,0,Math.PI*2); ctx.fill();
    ctx.fillRect(b.x-8,b.y+26,22,12); ctx.fillRect(b.x+92,b.y+26,22,12);
    ctx.fillStyle='#fff'; ctx.fillRect(b.x+28,b.y+22,10,10); ctx.fillRect(b.x+66,b.y+22,10,10);
    ctx.restore();
  }

  projectiles.forEach(p=>drawHeart(p.x,p.y,10,'#ff63ab'));
  particles.forEach(p=>{ ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,4+p.life/12,0,Math.PI*2); ctx.fill(); });

  if(!(player.invuln>0 && Math.floor(player.invuln/6)%2===0)) drawPlayer();

  ctx.fillStyle='#fff'; ctx.fillRect(world.goalX,436,12,160);
  ctx.fillStyle='#ff9cd0'; ctx.fillRect(world.goalX+12,436,70,48);
  ctx.fillStyle='#4a1240'; ctx.font='bold 18px Arial'; ctx.fillText('MÅL', world.goalX+24, 466);

  ctx.restore();
}

function drawPlayer(){
  const x = player.x + player.w/2;
  const y = player.y + player.h/2 + 8;
  const frameW = 160;
  const frameH = 400;
  const runFrames = [0,1,2,3,4,5];
  let frame = 0;
  if (!player.onGround) frame = 7;
  else if (Math.abs(player.vx) > 0.9) frame = runFrames[Math.floor(player.animTick/6)%runFrames.length];
  else frame = 0;
  ctx.save();
  ctx.translate(x,y);
  if(player.facing === -1) ctx.scale(-1,1);
  if(spriteSheet.complete && spriteSheet.naturalWidth){
    ctx.drawImage(spriteSheet, frame*frameW, 0, frameW, frameH, -54, -78, 108, 192);
  }else{
    ctx.fillStyle='#f07fb4'; ctx.fillRect(-20,-40,40,80);
  }
  ctx.restore();
}

function render(){
  drawBackground();
  drawWorld();
  particles = particles.filter(p=>p.life-- > 0);
  particles.forEach(p=>{p.x += p.vx; p.y += p.vy;});
  requestAnimationFrame(loop);
}
function loop(){ update(); render(); }

function setAction(action, pressed){
  if(action === 'left') keys.left = pressed;
  if(action === 'right') keys.right = pressed;
  if(action === 'jump') keys.jump = pressed;
  if(action === 'attack') keys.attack = pressed;
}
document.querySelectorAll('.control').forEach(btn=>{
  const action = btn.dataset.action;
  const start = ev => {
    ev.preventDefault();
    if(action === 'pause'){ gameState = gameState === 'playing' ? 'menu' : 'playing'; ui.menu.style.display = gameState === 'menu' ? 'flex' : 'none'; }
    else setAction(action,true);
  };
  const end = ev => { ev.preventDefault(); if(action !== 'pause') setAction(action,false); };
  btn.addEventListener('touchstart', start, {passive:false});
  btn.addEventListener('touchend', end, {passive:false});
  btn.addEventListener('mousedown', start);
  btn.addEventListener('mouseup', end);
  btn.addEventListener('mouseleave', end);
});
window.addEventListener('keydown', e=>{
  if(['ArrowLeft','a','A'].includes(e.key)) setAction('left',true);
  if(['ArrowRight','d','D'].includes(e.key)) setAction('right',true);
  if(['ArrowUp','w','W',' '].includes(e.key)) setAction('jump',true);
  if(['x','X','Enter'].includes(e.key)) setAction('attack',true);
  if(['ArrowDown','s','S'].includes(e.key)) keys.downLike = true;
});
window.addEventListener('keyup', e=>{
  if(['ArrowLeft','a','A'].includes(e.key)) setAction('left',false);
  if(['ArrowRight','d','D'].includes(e.key)) setAction('right',false);
  if(['ArrowUp','w','W',' '].includes(e.key)) setAction('jump',false);
  if(['x','X','Enter'].includes(e.key)) setAction('attack',false);
  if(['ArrowDown','s','S'].includes(e.key)) keys.downLike = false;
});

ui.newGameBtn.onclick = newGame;
ui.continueBtn.onclick = () => { if(!loadGame()) newGame(); };
ui.continueBtn.style.display = localStorage.getItem(SAVE_KEY) ? 'inline-block' : 'none';

resetWorld();
loop();
