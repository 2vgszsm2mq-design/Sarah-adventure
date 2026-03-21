const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const BASE_W = 1280;
const BASE_H = 720;
canvas.width = BASE_W * DPR;
canvas.height = BASE_H * DPR;
ctx.scale(DPR, DPR);

const ui = {
  menu: document.getElementById('menu'), pauseMenu: document.getElementById('pauseMenu'), endMenu: document.getElementById('endMenu'),
  endTitle: document.getElementById('endTitle'), endText: document.getElementById('endText'),
  shield: document.getElementById('shield'), ammo: document.getElementById('ammo'), coins: document.getElementById('coins'),
  letters: document.getElementById('letters'), levelName: document.getElementById('levelName'),
  bossWrap: document.getElementById('bossBarWrap'), bossFill: document.getElementById('bossBarFill'),
  progressFill: document.getElementById('progressFill'), comboFloat: document.getElementById('comboFloat'), bossIntro: document.getElementById('bossIntro')
};

const SAVE_KEY = 'sarah_adventure_v4_save';
const sarahImg = new Image();
sarahImg.src = 'assets/sarah.png';
let gameState = 'menu';
let last = 0;
let cameraX = 0;
let zoom = 1;
let screenFlash = 0;
let bossIntroTimer = 0;
let particles = [];
let projectiles = [];
let droppedCoins = [];
let comboEffects = [];
let keys = { left:false, right:false, jump:false, attack:false };
let attackPressed = false;

const world = {
  width: 5200,
  groundY: 600,
  title: 'Love Beach',
  secretNotice: 0,
  bossTriggered: false,
  bossActive: false,
  checkpoint: {x: 170, y: 460},
  platforms: [], coins: [], ammos: [], letters: [], powerUps: [], enemies: [], boss: null, pipe: null
};

const player = {
  x: 160, y: 420, w: 86, h: 104, vx: 0, vy: 0, speed: 360, jumpPower: 860,
  onGround: false, facing: 1, shield: 3, maxShield: 3, lives: 3, ammo: 3, coins: 0, letters: 0,
  invuln: 0, shootCooldown: 0, checkpointX: 160, checkpointY: 420, powerTimer: 0, pipeTimer: 0,
  runT: 0
};

let combo = 0;
let comboTimer = 0;

function makeWorld() {
  world.platforms = [
    {x:0,y:600,w:920,h:140}, {x:980,y:600,w:560,h:140}, {x:1620,y:600,w:650,h:140},
    {x:2340,y:600,w:620,h:140}, {x:3040,y:600,w:740,h:140}, {x:3880,y:600,w:1320,h:140},
    {x:520,y:490,w:150,h:24},{x:810,y:430,w:150,h:24},{x:1180,y:510,w:170,h:24},
    {x:1860,y:470,w:150,h:24},{x:2140,y:390,w:150,h:24},{x:2720,y:470,w:150,h:24},
    {x:3170,y:430,w:160,h:24},{x:3520,y:360,w:150,h:24},{x:4300,y:470,w:200,h:24}
  ];
  world.coins = [280,350,420,490,560,630, 850,920, 1190,1270, 1880,1950,2020, 2180,2250,
    2730,2810, 3200,3280, 3560,3640, 4050,4120,4200, 4450,4530, 4700,4780,4860].map((x,i)=>({
      x, y: (i%2===0? 360 : 540), r: 12, taken:false
  }));
  world.ammos = [
    {x: 1310, y: 470, w: 28, h: 28, taken:false},
    {x: 3230, y: 390, w: 28, h: 28, taken:false},
    {x: 4470, y: 430, w: 28, h: 28, taken:false}
  ];
  world.letters = [{x: 3660, y: 325, w: 34, h: 28, taken:false}];
  world.powerUps = [{x: 2810, y: 430, w: 28, h: 28, taken:false}];
  world.enemies = [
    {x: 1450, y: 560, w: 56, h: 40, min: 1100, max: 1500, vx: 90, alive:true},
    {x: 2440, y: 560, w: 56, h: 40, min: 2380, max: 2860, vx: 100, alive:true},
    {x: 3390, y: 560, w: 56, h: 40, min: 3080, max: 3730, vx: 105, alive:true}
  ];
  world.pipe = {x: 920, y: 500, w: 110, h: 100, toX: 2600, toY: 440};
  world.boss = {x: 4800, y: 470, w: 118, h: 110, maxHp: 10, hp: 10, alive:true, vx: 120, dir: 1, attackCd: 1.5};
  world.bossTriggered = false;
  world.bossActive = false;
  world.secretNotice = 0;
}

function resetPlayer(full=true) {
  player.x = 160; player.y = 420; player.vx = 0; player.vy = 0; player.onGround = false;
  player.facing = 1; player.invuln = 0; player.shootCooldown = 0; player.powerTimer = 0;
  player.checkpointX = 160; player.checkpointY = 420; player.pipeTimer = 0;
  if (full) {
    player.shield = 3; player.lives = 3; player.ammo = 3; player.coins = 0; player.letters = 0;
    combo = 0; comboTimer = 0; projectiles = []; particles = []; droppedCoins = []; comboEffects = [];
  }
}

function newGame() {
  makeWorld();
  resetPlayer(true);
  ui.menu.classList.remove('visible');
  ui.pauseMenu.classList.remove('visible');
  ui.endMenu.classList.remove('visible');
  gameState = 'playing';
  saveGame();
}

function continueGame() {
  if (!loadGame()) newGame();
  ui.menu.classList.remove('visible');
  ui.endMenu.classList.remove('visible');
  ui.pauseMenu.classList.remove('visible');
  gameState = 'playing';
}

function saveGame() {
  const data = { player, world: {
    coins: world.coins, ammos: world.ammos, letters: world.letters, powerUps: world.powerUps,
    enemies: world.enemies, boss: world.boss, bossTriggered: world.bossTriggered, bossActive: world.bossActive
  }};
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    makeWorld();
    const data = JSON.parse(raw);
    Object.assign(player, data.player || {});
    if (data.world) {
      world.coins = data.world.coins || world.coins;
      world.ammos = data.world.ammos || world.ammos;
      world.letters = data.world.letters || world.letters;
      world.powerUps = data.world.powerUps || world.powerUps;
      world.enemies = data.world.enemies || world.enemies;
      world.boss = data.world.boss || world.boss;
      world.bossTriggered = !!data.world.bossTriggered;
      world.bossActive = !!data.world.bossActive;
    }
    return true;
  } catch(e) {
    console.error(e);
    return false;
  }
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rects(a, b) { return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }
function circleRect(c, r) {
  const cx = clamp(c.x, r.x, r.x+r.w);
  const cy = clamp(c.y, r.y, r.y+r.h);
  const dx = c.x-cx, dy = c.y-cy;
  return dx*dx + dy*dy <= c.r*c.r;
}
function spawnParticles(x,y,color,count=8,spread=130,size=4) {
  for (let i=0;i<count;i++) particles.push({x,y,vx:(Math.random()*2-1)*spread,vy:(Math.random()*2-1)*spread-40,life:.6+Math.random()*.45,color,size:size+Math.random()*3});
}
function addComboEffect(text, x, y, big=false) {
  const el = document.createElement('div');
  el.className = 'combo-label' + (big ? ' combo-big' : '');
  el.textContent = text;
  const sx = (x-cameraX)*zoom + 30;
  const sy = y*zoom - 30;
  el.style.left = `${sx}px`;
  el.style.top = `${sy}px`;
  el.style.fontSize = big ? '30px' : '22px';
  ui.comboFloat.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

function collectCoin(c) {
  c.taken = true;
  player.coins += 1;
  combo += 1;
  comboTimer = 1.9;
  if (combo >= 2) addComboEffect(`x${combo} COMBO!`, player.x, player.y, combo >= 5);
  if (combo >= 5) {
    player.powerTimer = Math.max(player.powerTimer, 5.5);
    spawnParticles(player.x + player.w/2, player.y + 20, '#ff72b0', 12, 180, 5);
    if (combo === 5) player.ammo += 2;
  } else {
    spawnParticles(c.x, c.y, '#ffd35c', 5, 100, 4);
  }
}

function shootHeart() {
  if (player.shootCooldown > 0 || player.ammo <= 0 || gameState !== 'playing') return;
  player.ammo -= 1;
  player.shootCooldown = player.powerTimer > 0 ? .18 : .34;
  const power = player.powerTimer > 0 ? 1.8 : 1;
  projectiles.push({x: player.x + player.w*0.65, y: player.y + player.h*0.42, vx: player.facing*(560 + (player.powerTimer>0?120:0)), r: 12*power, life: 1.5});
}

function hitPlayer(fromX, coinDrop=false) {
  if (player.invuln > 0) return;
  player.invuln = 1.25;
  screenFlash = .14;
  const dir = player.x + player.w/2 < fromX ? -1 : 1;
  player.vx = -dir * 300;
  player.vy = -320;
  if (player.shield > 0) player.shield -= 1; else {
    player.lives -= 1;
    player.shield = player.maxShield;
    if (player.lives < 0) { loseGame(); return; }
  }
  spawnParticles(player.x + player.w/2, player.y + 20, '#ff8dbd', 12, 180, 5);
  if (coinDrop && player.coins > 0) {
    const drop = Math.min(8, player.coins);
    player.coins -= drop;
    for (let i=0;i<drop;i++) droppedCoins.push({x: player.x+player.w/2, y: player.y+20, vx:(Math.random()*2-1)*170, vy:-220-Math.random()*90, life:3.0, r:11, taken:false});
  }
}

function loseGame() {
  gameState = 'ended';
  ui.endTitle.textContent = 'Prøv igen ❤️';
  ui.endText.textContent = 'King Crab var for stærk denne gang – men du er tæt på!';
  ui.endMenu.classList.add('visible');
}

function winGame() {
  gameState = 'ended';
  ui.endTitle.textContent = 'Du vandt! ❤️';
  ui.endText.textContent = `Sarah klarede Love Beach, fandt ${player.coins} coins og ${player.letters} Love Note.`;
  ui.endMenu.classList.add('visible');
}

function update(dt) {
  if (gameState !== 'playing' && gameState !== 'bossIntro') return;

  player.invuln = Math.max(0, player.invuln - dt);
  player.shootCooldown = Math.max(0, player.shootCooldown - dt);
  player.powerTimer = Math.max(0, player.powerTimer - dt);
  comboTimer = Math.max(0, comboTimer - dt);
  screenFlash = Math.max(0, screenFlash - dt);
  if (comboTimer <= 0) combo = 0;
  if (world.secretNotice > 0) world.secretNotice -= dt;

  if (gameState === 'bossIntro') {
    bossIntroTimer -= dt;
    zoom = Math.min(1.12, zoom + dt * 0.18);
    if (bossIntroTimer <= 0) {
      gameState = 'playing';
      world.bossActive = true;
      ui.bossIntro.classList.add('hidden');
    }
  } else {
    zoom += (1 - zoom) * Math.min(1, dt * 4);
  }

  let move = 0;
  if (keys.left) move -= 1;
  if (keys.right) move += 1;
  player.vx = move * player.speed;
  if (move !== 0) { player.facing = move; player.runT += dt * 10; } else { player.runT += dt * 4; }

  if (keys.jump && player.onGround && gameState === 'playing') {
    player.vy = -player.jumpPower;
    player.onGround = false;
    keys.jump = false;
    spawnParticles(player.x+player.w/2, player.y+player.h-6, '#ffffff', 6, 110, 3);
  }

  if (attackPressed) { shootHeart(); attackPressed = false; }

  player.vy += 1950 * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.onGround = false;

  // bounds
  player.x = clamp(player.x, 0, world.width - player.w);
  if (player.y > 900) {
    player.x = player.checkpointX; player.y = player.checkpointY; player.vx = 0; player.vy = 0;
    hitPlayer(player.x, false);
  }

  // collisions with platforms
  for (const p of world.platforms) {
    if (!rects(player, p)) continue;
    const prevBottom = (player.y - player.vy*dt) + player.h;
    const prevTop = (player.y - player.vy*dt);
    if (prevBottom <= p.y + 8 && player.vy >= 0) {
      player.y = p.y - player.h;
      player.vy = 0; player.onGround = true;
    } else if (prevTop >= p.y + p.h - 8 && player.vy < 0) {
      player.y = p.y + p.h; player.vy = 30;
    } else if (player.x + player.w/2 < p.x + p.w/2) {
      player.x = p.x - player.w;
    } else player.x = p.x + p.w;
  }

  // checkpoint and secret pipe
  if (player.x > 3090) { player.checkpointX = 3120; player.checkpointY = 510; }
  if (rects(player, world.pipe) && Math.abs((player.y + player.h) - world.pipe.y) < 10 && player.onGround) {
    player.pipeTimer += dt;
    if (player.pipeTimer > 0.7) {
      player.x = world.pipe.toX; player.y = world.pipe.toY; player.vx = 0; player.vy = 0; player.pipeTimer = 0;
      world.secretNotice = 2.2;
      spawnParticles(player.x+player.w/2, player.y+player.h/2, '#65ffb6', 16, 220, 5);
    }
  } else player.pipeTimer = 0;

  // pickups
  for (const c of world.coins) if (!c.taken && circleRect(c, player)) collectCoin(c);
  for (const a of world.ammos) if (!a.taken && rects(player, a)) { a.taken=true; player.ammo += 2; spawnParticles(a.x,a.y,'#ff6aa8',10,130,5); addComboEffect('+2 ❤️', player.x, player.y); }
  for (const l of world.letters) if (!l.taken && rects(player, l)) { l.taken=true; player.letters += 1; addComboEffect('LOVE NOTE!', player.x, player.y, true); spawnParticles(l.x,l.y,'#fff2a8',16,180,5); }
  for (const p of world.powerUps) if (!p.taken && rects(player, p)) { p.taken=true; player.powerTimer = 7; addComboEffect('LOVE POWER!', player.x, player.y, true); spawnParticles(p.x,p.y,'#ff72b0',18,220,6); }

  // projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const h = projectiles[i];
    h.x += h.vx * dt; h.life -= dt;
    if (h.life <= 0 || h.x < 0 || h.x > world.width) { projectiles.splice(i,1); continue; }
    const hitEnemy = world.enemies.find(e => e.alive && h.x+h.r > e.x && h.x-h.r < e.x+e.w && h.y+h.r > e.y && h.y-h.r < e.y+e.h);
    if (hitEnemy) {
      hitEnemy.alive = false; projectiles.splice(i,1); spawnParticles(hitEnemy.x, hitEnemy.y, '#ff926f', 14, 200, 5); continue;
    }
    const b = world.boss;
    if (world.bossActive && b.alive && h.x+h.r > b.x && h.x-h.r < b.x+b.w && h.y+h.r > b.y && h.y-h.r < b.y+b.h) {
      b.hp -= 1; projectiles.splice(i,1); spawnParticles(b.x+b.w/2, b.y+35, '#ff7d7d', 16, 200, 6);
      if (b.hp <= 0) { b.alive = false; world.bossActive = false; ui.bossWrap.classList.add('hidden'); winGame(); }
    }
  }

  // enemies
  for (const e of world.enemies) {
    if (!e.alive) continue;
    e.x += e.vx * dt;
    if (e.x < e.min || e.x > e.max) { e.vx *= -1; }
    if (rects(player, e)) {
      const stomp = player.vy > 60 && player.y + player.h - 14 < e.y + 20;
      if (stomp) {
        e.alive = false; player.vy = -520; spawnParticles(e.x,e.y,'#ff8d66',14,180,5); addComboEffect('BONK!', player.x, player.y);
      } else hitPlayer(e.x+e.w/2, false);
    }
  }

  // boss trigger and update
  if (!world.bossTriggered && player.x > 4550) {
    world.bossTriggered = true;
    gameState = 'bossIntro';
    bossIntroTimer = 1.35;
    zoom = 1.0;
    ui.bossIntro.classList.remove('hidden');
    ui.bossWrap.classList.remove('hidden');
  }
  if (world.bossActive && world.boss.alive) {
    const b = world.boss;
    b.x += b.dir * b.vx * dt;
    if (b.x < 4560 || b.x > 5000) b.dir *= -1;
    b.attackCd -= dt;
    if (b.attackCd <= 0) {
      b.attackCd = 1.0;
      const shell = {x: b.x + b.w/2, y: b.y + 25, vx: (player.x < b.x ? -260 : 260), r: 15, life: 3.0, hostile: true};
      projectiles.push(shell);
    }
    if (rects(player, b)) hitPlayer(b.x+b.w/2, true);
  }

  // hostile projectiles and dropped coins
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (!p.hostile) continue;
    p.x += p.vx * dt; p.life -= dt;
    if (p.life <= 0) { projectiles.splice(i,1); continue; }
    const pr = {x:p.x-p.r, y:p.y-p.r, w:p.r*2, h:p.r*2};
    if (rects(player, pr)) { projectiles.splice(i,1); hitPlayer(p.x, true); }
  }
  for (let i = droppedCoins.length-1; i>=0; i--) {
    const c = droppedCoins[i];
    c.life -= dt;
    c.vy += 1200*dt; c.x += c.vx*dt; c.y += c.vy*dt;
    if (c.y + c.r > world.groundY) { c.y = world.groundY - c.r; c.vy *= -0.35; c.vx *= 0.9; }
    if (c.life <= 0) { droppedCoins.splice(i,1); continue; }
    if (circleRect({x:c.x,y:c.y,r:c.r}, player)) { player.coins += 1; droppedCoins.splice(i,1); spawnParticles(c.x,c.y,'#ffd35c',5,90,3); }
  }

  // particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 280 * dt;
    if (p.life <= 0) particles.splice(i,1);
  }

  // camera and ui
  const camTarget = clamp(player.x - BASE_W*0.28, 0, world.width - BASE_W);
  cameraX += (camTarget - cameraX) * Math.min(1, dt * 4.4);
  ui.shield.textContent = player.shield;
  ui.ammo.textContent = player.ammo;
  ui.coins.textContent = player.coins;
  ui.letters.textContent = player.letters;
  ui.levelName.textContent = world.title;
  ui.progressFill.style.width = `${Math.round((player.x / (world.width - 200)) * 100)}%`;
  if (world.boss.alive) ui.bossFill.style.width = `${(world.boss.hp / world.boss.maxHp) * 100}%`;
}

function drawBackground() {
  const g = ctx.createLinearGradient(0,0,0,BASE_H);
  g.addColorStop(0, '#4a1f7d');
  g.addColorStop(.55, '#7e49bf');
  g.addColorStop(1, '#ffcadf');
  ctx.fillStyle = g; ctx.fillRect(0,0,BASE_W,BASE_H);

  // clouds
  ctx.save();
  ctx.globalAlpha = .22;
  const clouds = [
    {x:130,y:120,s:1.1},{x:410,y:140,s:1.2},{x:720,y:110,s:1.05},{x:1010,y:95,s:1.15},{x:1200,y:130,s:1.1}
  ];
  for (const c of clouds) drawCloud(c.x - cameraX*0.12, c.y, c.s);
  ctx.restore();

  // mountains
  ctx.fillStyle = 'rgba(59,20,102,.45)';
  for (let i=0;i<8;i++) {
    const x = i*340 - (cameraX*0.35 % 340) - 90;
    ctx.beginPath(); ctx.moveTo(x,600); ctx.lineTo(x+160,360); ctx.lineTo(x+340,600); ctx.closePath(); ctx.fill();
  }

  // sea stripe and ground
  ctx.fillStyle = 'rgba(255,216,230,.5)'; ctx.fillRect(0, 520, BASE_W, 64);
  ctx.fillStyle = '#66ce67'; ctx.fillRect(0, 584, BASE_W, 22);
  ctx.fillStyle = '#d9b284'; ctx.fillRect(0, 606, BASE_W, BASE_H-606);
}
function drawCloud(x,y,s=1) {
  ctx.beginPath();
  ctx.arc(x, y, 32*s, 0, Math.PI*2);
  ctx.arc(x+28*s, y-12*s, 40*s, 0, Math.PI*2);
  ctx.arc(x+66*s, y, 28*s, 0, Math.PI*2);
  ctx.arc(x+26*s, y+12*s, 38*s, 0, Math.PI*2);
  ctx.fillStyle = 'white'; ctx.fill();
}

function drawPlatform(p) {
  ctx.fillStyle = '#f2d3a4';
  ctx.fillRect(p.x-cameraX, p.y, p.w, p.h);
  if (p.h < 50) { ctx.fillStyle = '#eabf7f'; ctx.fillRect(p.x-cameraX, p.y, p.w, 6); }
}

function drawWorld() {
  drawBackground();
  ctx.save();
  ctx.translate(BASE_W/2, BASE_H/2);
  ctx.scale(zoom, zoom);
  ctx.translate(-BASE_W/2, -BASE_H/2);

  // platforms and pipe
  for (const p of world.platforms) drawPlatform(p);
  drawPipe(world.pipe.x-cameraX, world.pipe.y, world.pipe.w, world.pipe.h);

  // items
  for (const c of world.coins) if (!c.taken) drawCoin(c.x-cameraX, c.y, c.r);
  for (const c of droppedCoins) drawCoin(c.x-cameraX, c.y, c.r);
  for (const a of world.ammos) if (!a.taken) drawHeartPickup(a.x-cameraX, a.y, a.w, a.h);
  for (const l of world.letters) if (!l.taken) drawLetter(l.x-cameraX, l.y, l.w, l.h);
  for (const p of world.powerUps) if (!p.taken) drawPower(p.x-cameraX, p.y, p.w, p.h);

  // enemies
  for (const e of world.enemies) if (e.alive) drawCrab(e.x-cameraX, e.y, e.w, e.h, false);
  if (world.boss.alive) drawCrab(world.boss.x-cameraX, world.boss.y, world.boss.w, world.boss.h, true);

  // projectiles
  for (const p of projectiles) {
    if (p.hostile) { ctx.fillStyle = '#ff9154'; ctx.beginPath(); ctx.arc(p.x-cameraX, p.y, p.r, 0, Math.PI*2); ctx.fill(); }
    else drawFlyingHeart(p.x-cameraX, p.y, p.r);
  }

  // player
  drawPlayer();

  // particles
  for (const p of particles) {
    ctx.globalAlpha = Math.max(.08, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x-cameraX, p.y, p.size, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (world.secretNotice > 0) drawHint('Hemmelig passage! ❤️', BASE_W/2, 86);
  if (player.powerTimer > 0) drawHint('LOVE POWER!', BASE_W/2, 126, '#fff2a8');
  if (rects(player, world.pipe) || Math.abs(player.x-world.pipe.x)<120) drawHint('Stå på røret for at rejse', world.pipe.x-cameraX+world.pipe.w/2, world.pipe.y-22, '#e8fff2');
  ctx.restore();

  if (screenFlash > 0) {
    ctx.fillStyle = `rgba(255,160,190,${screenFlash})`;
    ctx.fillRect(0,0,BASE_W,BASE_H);
  }
}

function drawHint(text, x, y, color='#ffffff') {
  ctx.fillStyle = 'rgba(20,10,30,.46)';
  ctx.fillRect(x-130, y-24, 260, 34);
  ctx.fillStyle = color;
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}

function drawPlayer() {
  const bob = player.onGround ? Math.sin(player.runT) * 1.5 : 0;
  const x = player.x - cameraX;
  const y = player.y + bob;
  if (player.invuln > 0 && Math.floor(performance.now()/90)%2 === 0) return;
  ctx.save();
  if (player.facing < 0) { ctx.translate(x + player.w/2, 0); ctx.scale(-1,1); ctx.translate(-(x + player.w/2), 0); }
  if (player.powerTimer > 0) {
    ctx.globalAlpha = 0.22;
    ctx.drawImage(sarahImg, x-8, y-6, player.w+16, player.h+16);
    ctx.globalAlpha = 1;
  }
  ctx.drawImage(sarahImg, x, y, player.w, player.h);
  ctx.restore();
}

function drawCoin(x,y,r) {
  ctx.fillStyle = '#ffd35c';
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#ffe798';
  ctx.fillRect(x-2, y-r+4, 4, r*2-8);
}
function drawHeartPickup(x,y,w,h) {
  drawFlyingHeart(x+w/2, y+h/2, 13);
}
function drawFlyingHeart(x,y,r) {
  ctx.fillStyle = '#ff5fa2';
  ctx.beginPath();
  ctx.moveTo(x, y+r*.9);
  ctx.bezierCurveTo(x-r*1.2, y-r*.2, x-r*.8, y-r*1.3, x, y-r*.1);
  ctx.bezierCurveTo(x+r*.8, y-r*1.3, x+r*1.2, y-r*.2, x, y+r*.9);
  ctx.fill();
}
function drawLetter(x,y,w,h) {
  ctx.fillStyle = '#fff7df'; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle = '#d67ca8'; ctx.strokeRect(x,y,w,h);
  ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+w/2,y+h/2); ctx.lineTo(x+w,y); ctx.stroke();
  drawFlyingHeart(x+w/2, y+h/2+2, 6);
}
function drawPower(x,y,w,h) {
  drawFlyingHeart(x+w/2, y+h/2, 15);
  ctx.strokeStyle = '#fff2a8'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x+w/2,y+h/2,19,0,Math.PI*2); ctx.stroke();
  ctx.lineWidth = 1;
}
function drawPipe(x,y,w,h) {
  ctx.fillStyle = '#2fb15d'; ctx.fillRect(x+14,y+20,w-28,h-20);
  ctx.fillStyle = '#32c769'; ctx.fillRect(x,y,w,30);
  ctx.fillStyle = '#58d98a'; ctx.fillRect(x+18,y+26,w*0.18,h-26);
  ctx.fillStyle = '#dfffe8'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center';
  ctx.fillText('Hemmeligt rør ↓', x+w/2, y-12);
}
function drawCrab(x,y,w,h,boss=false) {
  ctx.fillStyle = boss ? '#cf182f' : '#ee4a52';
  ctx.beginPath(); ctx.ellipse(x+w/2, y+h/2, w*0.42, h*0.36, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x+w*.34, y+h*.38, boss?11:8, 0, Math.PI*2); ctx.arc(x+w*.66, y+h*.38, boss?11:8, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x+w*.35, y+h*.39, boss?4:3, 0, Math.PI*2); ctx.arc(x+w*.65, y+h*.39, boss?4:3, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#c51424'; ctx.lineWidth = boss ? 8 : 5;
  for (let i=0;i<3;i++) {
    const yy = y+h*(.56 + i*.08);
    ctx.beginPath(); ctx.moveTo(x+w*.1, yy); ctx.lineTo(x-w*.12, yy+12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+w*.9, yy); ctx.lineTo(x+w*1.12, yy+12); ctx.stroke();
  }
  ctx.fillStyle = '#f53f4f';
  ctx.beginPath(); ctx.arc(x+w*.08, y+h*.23, boss?20:13, 0, Math.PI*2); ctx.arc(x+w*.92, y+h*.23, boss?20:13, 0, Math.PI*2); ctx.fill();
  if (boss) {
    ctx.fillStyle = '#ffd35c';
    ctx.beginPath();
    ctx.moveTo(x+w*.5, y-18); ctx.lineTo(x+w*.62, y+2); ctx.lineTo(x+w*.78, y-12); ctx.lineTo(x+w*.88, y+4); ctx.lineTo(x+w*.12, y+4); ctx.lineTo(x+w*.22, y-12); ctx.lineTo(x+w*.38, y+2); ctx.closePath();
    ctx.fill();
  }
  ctx.lineWidth = 1;
}

function render() {
  ctx.clearRect(0,0,BASE_W,BASE_H);
  drawWorld();
}

function loop(ts) {
  const dt = Math.min(.033, (ts - last) / 1000 || .016);
  last = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function setAction(action, down) {
  if (action === 'left') keys.left = down;
  if (action === 'right') keys.right = down;
  if (action === 'jump' && down) keys.jump = true;
  if (action === 'attack' && down) attackPressed = true;
  if (action === 'pause' && down) togglePause();
}

function togglePause() {
  if (gameState === 'playing' || gameState === 'bossIntro') {
    gameState = 'paused';
    ui.pauseMenu.classList.add('visible');
  } else if (gameState === 'paused') {
    ui.pauseMenu.classList.remove('visible');
    gameState = 'playing';
  }
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = true;
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = true;
  if (e.key === 'ArrowUp' || e.key === ' ' || e.key.toLowerCase() === 'w') keys.jump = true;
  if (e.key.toLowerCase() === 'j' || e.key.toLowerCase() === 'k') attackPressed = true;
  if (e.key === 'Escape') togglePause();
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = false;
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = false;
});

document.querySelectorAll('.control').forEach(btn => {
  const action = btn.dataset.action;
  ['touchstart','mousedown'].forEach(ev => btn.addEventListener(ev, e => { e.preventDefault(); setAction(action, true); }));
  ['touchend','touchcancel','mouseup','mouseleave'].forEach(ev => btn.addEventListener(ev, e => { e.preventDefault(); if (action==='left' || action==='right') setAction(action, false); }));
});

document.getElementById('newGameBtn').onclick = newGame;
document.getElementById('continueBtn').onclick = continueGame;
document.getElementById('resumeBtn').onclick = () => { ui.pauseMenu.classList.remove('visible'); gameState = 'playing'; };
document.getElementById('saveBtn').onclick = saveGame;
document.getElementById('quitBtn').onclick = () => { saveGame(); gameState = 'menu'; ui.pauseMenu.classList.remove('visible'); ui.menu.classList.add('visible'); };
document.getElementById('restartBtn').onclick = newGame;
document.getElementById('endMenuBtn').onclick = () => { gameState = 'menu'; ui.endMenu.classList.remove('visible'); ui.menu.classList.add('visible'); };

makeWorld();
loadGame();
requestAnimationFrame(loop);
