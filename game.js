
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resizeCanvas(){
  canvas.width = Math.max(1280, window.innerWidth);
  canvas.height = Math.max(720, window.innerHeight);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const SAVE_KEY = 'sarah_adventure_v7_fixed_save';

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
};

const sprite = new Image();
sprite.src = 'assets/sarah.png';

const keys = {left:false,right:false,jump:false,attack:false};

let gameState = 'menu';
let cameraX = 0;
let time = 0;
let projectiles = [];
let particles = [];
let screenShake = 0;

const world = {
  width: 9000,
  gravity: 0.85,
  platforms: [],
  coins: [],
  ammoPickups: [],
  notes: [],
  enemies: [],
  pipes: [],
  checkpoints: [],
  goalX: 8700,
  boss: null
};

const player = {
  x: 140, y: 420, w: 64, h: 92,
  vx: 0, vy: 0, speed: 5.2, jumpPower: -15.5,
  facing: 1, onGround: false,
  lives: 3, shield: 3, ammo: 3, coins: 0, letters: 0,
  invuln: 0, attackCooldown: 0,
  checkpointX: 140, checkpointY: 420
};

function resetWorld(){
  world.platforms = [
    {x:0,y:590,w:1200,h:130},{x:1310,y:590,w:840,h:130},{x:2280,y:590,w:900,h:130},
    {x:3320,y:590,w:780,h:130},{x:4210,y:590,w:820,h:130},{x:5150,y:590,w:900,h:130},
    {x:6200,y:590,w:820,h:130},{x:7150,y:590,w:760,h:130},{x:8070,y:590,w:1000,h:130},
    {x:360,y:500,w:120,h:20},{x:620,y:430,w:120,h:20},{x:920,y:360,w:120,h:20},
    {x:1560,y:500,w:130,h:20},{x:1850,y:430,w:130,h:20},{x:2140,y:360,w:130,h:20},
    {x:2620,y:470,w:150,h:20},{x:2920,y:400,w:150,h:20},
    {x:3460,y:500,w:160,h:20},{x:3760,y:430,w:160,h:20},
    {x:4430,y:470,w:150,h:20},{x:4720,y:400,w:150,h:20},
    {x:5340,y:500,w:160,h:20},{x:5660,y:430,w:160,h:20},{x:5980,y:360,w:160,h:20},
    {x:6480,y:470,w:150,h:20},{x:6800,y:400,w:150,h:20},
    {x:7390,y:500,w:170,h:20},{x:7720,y:430,w:170,h:20},
    {x:8280,y:480,w:180,h:20}
  ];

  world.coins = [];
  const coinXs = [220,300,380,460,540,620,700,820,940,1080,1420,1500,1580,1660,1740,1820,
    2050,2140,2230,2400,2480,2560,2640,2860,2940,3020,3440,3520,3600,3680,3900,3980,4060,
    4350,4430,4510,4590,4750,4830,4910,5280,5360,5440,5520,5600,5880,5960,6040,6460,6540,
    6620,6700,7020,7100,7180,7480,7560,7640,7720,8020,8100,8180,8260,8340,8420,8500];
  coinXs.forEach((x,i)=>world.coins.push({x,y:i%3===0?350:(i%2===0?510:440),r:11,collected:false}));

  world.ammoPickups = [
    {x:1860,y:390,w:24,h:24,collected:false},
    {x:4720,y:360,w:24,h:24,collected:false},
    {x:7730,y:390,w:24,h:24,collected:false},
  ];

  world.notes = [
    {x:2990,y:365,w:26,h:26,collected:false},
    {x:6840,y:365,w:26,h:26,collected:false}
  ];

  world.enemies = [
    {x:1420,y:550,w:48,h:38,min:1320,max:2080,vx:1.3,alive:true},
    {x:2590,y:550,w:48,h:38,min:2360,max:3080,vx:1.4,alive:true},
    {x:4380,y:550,w:48,h:38,min:4260,max:4960,vx:1.5,alive:true},
    {x:6460,y:550,w:48,h:38,min:6320,max:7000,vx:1.4,alive:true},
    {x:7420,y:550,w:48,h:38,min:7280,max:7900,vx:1.6,alive:true},
  ];

  world.pipes = [
    {x:980,y:500,w:90,h:90,secretTo:{x:2430,y:300}},
    {x:5230,y:500,w:90,h:90,secretTo:{x:6920,y:300}},
    {x:8480,y:500,w:90,h:90,secretTo:null}
  ];

  world.checkpoints = [
    {x:2100,y:500},{x:5100,y:500},{x:7600,y:500}
  ];

  world.boss = {x:8200,y:500,w:120,h:100,hp:12,maxHp:12,alive:true,cooldown:0,flash:0};
}

function resetPlayer(full=true){
  player.x = 140;
  player.y = 420;
  player.vx = 0;
  player.vy = 0;
  player.facing = 1;
  player.onGround = false;
  player.shield = 3;
  player.ammo = 3;
  player.coins = 0;
  player.letters = 0;
  player.invuln = 0;
  player.attackCooldown = 0;
  player.checkpointX = 140;
  player.checkpointY = 420;
  if (full) player.lives = 3;
}

function saveGame(){
  const save = {
    player: {...player},
    coins: world.coins.map(c=>c.collected),
    ammoPickups: world.ammoPickups.map(a=>a.collected),
    notes: world.notes.map(n=>n.collected),
    enemies: world.enemies.map(e=>e.alive),
    boss: {hp:world.boss.hp, alive:world.boss.alive}
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

function loadGame(){
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try{
    resetWorld();
    resetPlayer(false);
    const save = JSON.parse(raw);
    Object.assign(player, save.player);
    world.coins.forEach((c,i)=> c.collected = !!save.coins[i]);
    world.ammoPickups.forEach((a,i)=> a.collected = !!save.ammoPickups[i]);
    world.notes.forEach((n,i)=> n.collected = !!save.notes[i]);
    world.enemies.forEach((e,i)=> e.alive = !!save.enemies[i]);
    if (save.boss){ world.boss.hp = save.boss.hp; world.boss.alive = save.boss.alive; }
    gameState = 'playing';
    ui.menu.style.display = 'none';
    return true;
  }catch(e){
    console.error(e);
    return false;
  }
}

function newGame(){
  resetWorld();
  resetPlayer(true);
  projectiles = [];
  particles = [];
  cameraX = 0;
  gameState = 'playing';
  ui.menu.style.display = 'none';
  saveGame();
}

function rectsOverlap(a,b){
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}

function drawHeart(x,y,s,color){
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y+s/2);
  ctx.bezierCurveTo(x, y, x-s, y, x-s, y+s/2);
  ctx.bezierCurveTo(x-s, y+s, x, y+s*1.25, x, y+s*1.55);
  ctx.bezierCurveTo(x, y+s*1.25, x+s, y+s, x+s, y+s/2);
  ctx.bezierCurveTo(x+s, y, x, y, x, y+s/2);
  ctx.fill();
}

function burst(x,y,color='#ff8fc0',count=12){
  for(let i=0;i<count;i++){
    particles.push({
      x,y,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.7)*7,life:24,color
    });
  }
}

function shootHeart(){
  if (gameState !== 'playing' || player.attackCooldown > 0 || player.ammo <= 0) return;
  player.attackCooldown = 18;
  player.ammo -= 1;
  projectiles.push({
    x: player.x + player.w/2,
    y: player.y + 34,
    w: 20, h: 20,
    vx: player.facing * 9,
    life: 70
  });
}

function hurtPlayer(sourceX){
  if (player.invuln > 0) return;
  if (player.shield > 0) player.shield -= 1;
  else player.lives -= 1;
  player.invuln = 90;
  player.vx = player.x < sourceX ? -8 : 8;
  player.vy = -8;
  screenShake = 8;
  burst(player.x+player.w/2, player.y+player.h/2, '#ffd0e7', 10);

  if (player.lives <= 0){
    resetPlayer(false);
  }
  saveGame();
}

function update(){
  if (gameState !== 'playing') return;
  time++;

  if (keys.left){ player.vx = -player.speed; player.facing = -1; }
  else if (keys.right){ player.vx = player.speed; player.facing = 1; }
  else player.vx *= 0.78;

  if (keys.jump && player.onGround){
    player.vy = player.jumpPower;
    player.onGround = false;
    burst(player.x+player.w/2, player.y+player.h, '#ffe9f5', 6);
  }
  if (keys.attack) shootHeart();

  player.vy += world.gravity;
  if (player.vy > 18) player.vy = 18;
  player.x += player.vx;
  player.y += player.vy;

  player.onGround = false;
  for (const p of world.platforms){
    if (rectsOverlap(player,p)){
      const prevBottom = player.y + player.h - player.vy;
      if (prevBottom <= p.y + 14 && player.vy >= 0){
        player.y = p.y - player.h;
        if (!player.onGround && Math.abs(player.vy) > 2) burst(player.x+player.w/2, p.y, '#fff0f7', 5);
        player.vy = 0;
        player.onGround = true;
      } else if (player.x + player.w/2 < p.x + 20) player.x = p.x - player.w;
      else if (player.x + player.w/2 > p.x + p.w - 20) player.x = p.x + p.w;
    }
  }

  if (player.x < 0) player.x = 0;
  if (player.x > world.width - player.w) player.x = world.width - player.w;
  if (player.y > 820){
    player.x = player.checkpointX;
    player.y = player.checkpointY;
    player.vx = 0; player.vy = 0;
    player.shield = 3;
    player.lives = Math.max(1, player.lives - 1);
  }

  world.checkpoints.forEach(cp => {
    if (player.x > cp.x){ player.checkpointX = cp.x + 10; player.checkpointY = cp.y - player.h; }
  });

  world.coins.forEach(c=>{
    if (!c.collected && Math.hypot(player.x+35-c.x, player.y+46-c.y) < 34){
      c.collected = true;
      player.coins += 1;
      burst(c.x, c.y, '#ffd968', 8);
    }
  });

  world.ammoPickups.forEach(a=>{
    if (!a.collected && rectsOverlap(player,a)){
      a.collected = true;
      player.ammo += 2;
      burst(a.x+12, a.y+12, '#ff6ab8', 10);
    }
  });

  world.notes.forEach(n=>{
    if (!n.collected && rectsOverlap(player,n)){
      n.collected = true;
      player.letters += 1;
      burst(n.x+13, n.y+13, '#fff0d4', 10);
    }
  });

  projectiles = projectiles.filter(p=>p.life-- > 0);
  projectiles.forEach(p=>{
    p.x += p.vx;
    world.enemies.forEach(e=>{
      if (!e.alive) return;
      if (p.x < e.x+e.w && p.x+p.w > e.x && p.y < e.y+e.h && p.y+p.h > e.y){
        e.alive = false;
        p.life = 0;
        burst(e.x+20,e.y+18,'#ff93c9',12);
        screenShake = 6;
      }
    });
    const b = world.boss;
    if (b.alive && p.x < b.x+b.w && p.x+p.w > b.x && p.y < b.y+b.h && p.y+p.h > b.y){
      b.hp -= 1;
      b.flash = 10;
      p.life = 0;
      screenShake = 7;
      burst(p.x,p.y,'#ff93c9',14);
      if (b.hp <= 0){
        b.alive = false;
        burst(b.x+50,b.y+40,'#ffd2eb',24);
      }
    }
  });

  world.enemies.forEach(e=>{
    if (!e.alive) return;
    e.x += e.vx;
    if (e.x < e.min || e.x > e.max) e.vx *= -1;
    if (rectsOverlap(player,e)){
      const stomp = player.vy > 2 && player.y + player.h - e.y < 28;
      if (stomp){
        e.alive = false;
        player.vy = -10;
        burst(e.x+20,e.y+20,'#ffe1ef',10);
      } else hurtPlayer(e.x + e.w/2);
    }
  });

  const boss = world.boss;
  if (boss.alive){
    if (Math.abs(player.x - boss.x) < 460){
      boss.x += (player.x < boss.x ? -1 : 1) * -0.7;
      ui.bossHud.classList.remove('hidden');
    }
    if (rectsOverlap(player,boss)) hurtPlayer(boss.x + boss.w/2);
    ui.bossFill.style.width = `${Math.max(0,(boss.hp/boss.maxHp)*100)}%`;
    if (boss.flash > 0) boss.flash--;
  } else {
    ui.bossHud.classList.add('hidden');
  }

  world.pipes.forEach(pipe=>{
    if (rectsOverlap(player, pipe) && keys.downLike){
      if (pipe.secretTo){
        player.x = pipe.secretTo.x;
        player.y = pipe.secretTo.y;
      } else if (!world.boss.alive && player.letters >= 2){
        alert('Love Beach klaret ❤️ Sudoku og casino kommer i næste build.');
        gameState = 'menu';
        ui.menu.style.display = 'flex';
      }
    }
  });

  if (player.attackCooldown > 0) player.attackCooldown--;
  if (player.invuln > 0) player.invuln--;

  let targetCamera = player.x - canvas.width * 0.28;
  targetCamera = Math.max(0, Math.min(targetCamera, world.width - canvas.width));
  cameraX += (targetCamera - cameraX) * 0.12;

  ui.shield.textContent = player.shield;
  ui.ammo.textContent = player.ammo;
  ui.coins.textContent = player.coins;
  ui.letters.textContent = player.letters;
}

function drawBackground(){
  const sky = ctx.createLinearGradient(0,0,0,canvas.height);
  sky.addColorStop(0,'#2c1747');
  sky.addColorStop(.55,'#6b38a3');
  sky.addColorStop(1,'#f2a3b4');
  ctx.fillStyle = sky;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const sunX = canvas.width * 0.78;
  const sunY = 150;
  const sun = ctx.createRadialGradient(sunX,sunY,8,sunX,sunY,100);
  sun.addColorStop(0,'rgba(255,245,184,.92)');
  sun.addColorStop(.35,'rgba(255,219,140,.45)');
  sun.addColorStop(1,'rgba(255,219,140,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(sunX-110, sunY-110, 220, 220);

  for(let i=0;i<14;i++){
    const x = ((i*260 - cameraX*0.22) % (canvas.width+320)) - 80;
    const y = 110 + (i%4)*18;
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath();
    ctx.arc(x,y,34,0,Math.PI*2);
    ctx.arc(x+40,y+6,26,0,Math.PI*2);
    ctx.arc(x-36,y+8,24,0,Math.PI*2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(-(cameraX*0.12),0);
  for(let i=0;i<9;i++){
    const bx = i*480 - 60;
    ctx.fillStyle = i%2 ? 'rgba(78,32,112,.46)' : 'rgba(59,24,89,.52)';
    ctx.beginPath();
    ctx.moveTo(bx,590);
    ctx.quadraticCurveTo(bx+120,370,bx+260,590);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = 'rgba(255,210,223,.46)';
  ctx.fillRect(0,520,canvas.width,200);

  const sand = ctx.createLinearGradient(0,560,0,canvas.height);
  sand.addColorStop(0,'#e8c89d');
  sand.addColorStop(1,'#c89a63');
  ctx.fillStyle = sand;
  ctx.fillRect(0,560,canvas.width,200);

  ctx.save();
  ctx.translate(-(cameraX*0.15),0);
  drawPalm(180,560,170);
  drawPalm(1180,560,150);
  drawPalm(2120,560,190);
  drawPalm(3440,560,165);
  drawPalm(4680,560,180);
  drawPalm(6260,560,170);
  drawPalm(7540,560,155);
  ctx.restore();
}

function drawPalm(x,baseY,h){
  ctx.fillStyle='rgba(24,10,32,.9)';
  ctx.fillRect(x-5, baseY-h, 10, h);
  for(let i=0;i<6;i++){
    ctx.save();
    ctx.translate(x, baseY-h);
    ctx.rotate(-1.1 + i*0.4);
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.quadraticCurveTo(70,-14,130,20);
    ctx.quadraticCurveTo(74,18,0,8);
    ctx.fill();
    ctx.restore();
  }
}

function drawWorld(){
  ctx.save();
  if (screenShake > 0){
    const sx = (Math.random()-0.5)*screenShake;
    const sy = (Math.random()-0.5)*screenShake*0.6;
    ctx.translate(sx,sy);
    screenShake *= 0.85;
    if (screenShake < .25) screenShake = 0;
  }

  ctx.translate(-cameraX,0);

  world.platforms.forEach(p=>{
    ctx.fillStyle = p.y > 560 ? '#d7af79' : '#efce98';
    ctx.fillRect(p.x,p.y,p.w,p.h);
    ctx.fillStyle = p.y > 560 ? '#75d767' : '#ffe0af';
    ctx.fillRect(p.x,p.y,p.w,18);
  });

  world.pipes.forEach(pipe=>{
    ctx.fillStyle='#26a65b';
    ctx.fillRect(pipe.x,pipe.y,pipe.w,pipe.h);
    ctx.fillRect(pipe.x-8,pipe.y-18,pipe.w+16,22);
    ctx.fillStyle='rgba(255,255,255,.18)';
    ctx.fillRect(pipe.x+16,pipe.y+10,12,pipe.h-20);
  });

  ctx.fillStyle='#fff';
  ctx.font='bold 20px Arial';
  ctx.fillText('Hemmeligt rør ↓', 860, 470);
  ctx.fillText('Warp ↓', 5130, 470);
  ctx.fillText('Udgang →', 8420, 470);

  world.checkpoints.forEach(cp=>{
    ctx.fillStyle='#fff';
    ctx.fillRect(cp.x, 430, 10, 160);
    ctx.fillStyle='#ff9cd0';
    ctx.fillRect(cp.x+10, 430, 60, 42);
  });

  world.coins.forEach(c=>{
    if (c.collected) return;
    ctx.fillStyle='rgba(255,231,150,.22)';
    ctx.beginPath();
    ctx.arc(c.x,c.y,c.r+9,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle='#ffd84d';
    ctx.beginPath();
    ctx.arc(c.x,c.y,c.r,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle='#fff2c9';
    ctx.fillRect(c.x-3,c.y-8,6,16);
  });

  world.ammoPickups.forEach(a=>{
    if (!a.collected) drawHeart(a.x+12,a.y+12,12,'#ff4c93');
  });

  world.notes.forEach(n=>{
    if (n.collected) return;
    ctx.fillStyle='#fff8f0';
    ctx.fillRect(n.x,n.y,n.w,n.h);
    ctx.strokeStyle='#ff7bb7';
    ctx.lineWidth=2;
    ctx.strokeRect(n.x,n.y,n.w,n.h);
    ctx.beginPath();
    ctx.moveTo(n.x,n.y);
    ctx.lineTo(n.x+n.w/2,n.y+n.h/2);
    ctx.lineTo(n.x+n.w,n.y);
    ctx.stroke();
  });

  world.enemies.forEach(e=>{
    if (!e.alive) return;
    ctx.fillStyle='rgba(255,100,100,.18)';
    ctx.beginPath();
    ctx.arc(e.x+20,e.y+20,30,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle='#d33b3b';
    ctx.beginPath();
    ctx.arc(e.x+20,e.y+20,22,0,Math.PI*2);
    ctx.fill();
    ctx.fillRect(e.x-4,e.y+14,14,8);
    ctx.fillRect(e.x+30,e.y+14,14,8);
    ctx.fillStyle='#fff';
    ctx.fillRect(e.x+8,e.y+8,8,8);
    ctx.fillRect(e.x+24,e.y+8,8,8);
  });

  const b = world.boss;
  if (b.alive){
    ctx.save();
    if (b.flash > 0) ctx.globalAlpha = 0.65;
    ctx.fillStyle='rgba(255,95,95,.2)';
    ctx.beginPath();
    ctx.arc(b.x+46,b.y+46,58,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle='#c81f1f';
    ctx.beginPath();
    ctx.arc(b.x+46,b.y+46,46,0,Math.PI*2);
    ctx.fill();
    ctx.fillRect(b.x-8,b.y+22,20,12);
    ctx.fillRect(b.x+80,b.y+22,20,12);
    ctx.fillStyle='#fff';
    ctx.fillRect(b.x+24,b.y+20,10,10);
    ctx.fillRect(b.x+58,b.y+20,10,10);
    ctx.restore();
  }

  projectiles.forEach(p=> drawHeart(p.x,p.y,10,'#ff63ab'));

  particles.forEach(p=>{
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x,p.y,4 + p.life/12,0,Math.PI*2);
    ctx.fill();
  });

  if (!(player.invuln > 0 && Math.floor(player.invuln/6)%2===0)) drawPlayer();

  ctx.fillStyle='#fff';
  ctx.fillRect(world.goalX,430,12,160);
  ctx.fillStyle='#ff9cd0';
  ctx.fillRect(world.goalX+12,430,70,48);
  ctx.fillStyle='#4a1240';
  ctx.font='bold 18px Arial';
  ctx.fillText('MÅL', world.goalX+24, 460);

  ctx.restore();
}

function drawPlayer(){
  const x = player.x + player.w/2;
  const y = player.y + player.h/2 + 6;
  ctx.save();
  ctx.translate(x,y);
  if (player.facing === -1) ctx.scale(-1,1);
  if (sprite.complete && sprite.naturalWidth){
    ctx.drawImage(sprite, -44, -66, 88, 132);
  }else{
    ctx.fillStyle='#f07fb4';
    ctx.fillRect(-20,-40,40,80);
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

function loop(){
  update();
  render();
}

function setAction(action, pressed){
  if (action === 'left') keys.left = pressed;
  if (action === 'right') keys.right = pressed;
  if (action === 'jump') keys.jump = pressed;
  if (action === 'attack') keys.attack = pressed;
  keys.downLike = keys.left && keys.right;
}

document.querySelectorAll('.control').forEach(btn=>{
  const action = btn.dataset.action;
  const start = ev => { ev.preventDefault(); if (action === 'pause'){ gameState = gameState === 'playing' ? 'menu' : 'playing'; ui.menu.style.display = gameState === 'menu' ? 'flex' : 'none'; } else setAction(action,true); };
  const end = ev => { ev.preventDefault(); if (action !== 'pause') setAction(action,false); };
  btn.addEventListener('touchstart', start, {passive:false});
  btn.addEventListener('touchend', end, {passive:false});
  btn.addEventListener('mousedown', start);
  btn.addEventListener('mouseup', end);
  btn.addEventListener('mouseleave', end);
});

window.addEventListener('keydown', e=>{
  if (['ArrowLeft','a','A'].includes(e.key)) setAction('left',true);
  if (['ArrowRight','d','D'].includes(e.key)) setAction('right',true);
  if (['ArrowUp','w','W',' '].includes(e.key)) setAction('jump',true);
  if (['x','X','Enter'].includes(e.key)) setAction('attack',true);
});
window.addEventListener('keyup', e=>{
  if (['ArrowLeft','a','A'].includes(e.key)) setAction('left',false);
  if (['ArrowRight','d','D'].includes(e.key)) setAction('right',false);
  if (['ArrowUp','w','W',' '].includes(e.key)) setAction('jump',false);
  if (['x','X','Enter'].includes(e.key)) setAction('attack',false);
});

ui.newGameBtn.onclick = newGame;
ui.continueBtn.onclick = () => { if (!loadGame()) newGame(); };
ui.continueBtn.style.display = localStorage.getItem(SAVE_KEY) ? 'inline-block' : 'none';

resetWorld();
loop();
