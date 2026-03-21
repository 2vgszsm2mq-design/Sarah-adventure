const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const ui = {
  menu: document.getElementById('menu'),
  intro: document.getElementById('intro'),
  pauseMenu: document.getElementById('pauseMenu'),
  endMenu: document.getElementById('endMenu'),
  endTitle: document.getElementById('endTitle'),
  endText: document.getElementById('endText'),
  coins: document.getElementById('coins'),
  shield: document.getElementById('shield'),
  ammo: document.getElementById('ammo'),
  letters: document.getElementById('letters'),
  levelName: document.getElementById('levelName'),
  continueBtn: document.getElementById('continueBtn'),
  bossHud: document.getElementById('bossHud'),
  bossFill: document.getElementById('bossFill'),
  comboFloat: document.getElementById('comboFloat'),
};

const SAVE_KEY = 'sarah_adventure_save_v6';
let gameState = 'menu';
let keys = { left:false, right:false, jump:false, attack:false };
let cameraX = 0;
let time = 0;
let heartsShot = [];
let particles = [];
let combo = 0;
let comboUntil = 0;
let bossIntroUntil = 0;
let introArmed = false;

const images = {
  run: [0,1,2,3,4].map(i => { const img = new Image(); img.src = `assets/run${i}.png`; return img; }),
  attack: (() => { const img = new Image(); img.src = 'assets/attack.png'; return img; })()
};

const world = {
  width: 4200, height: 720, gravity: 0.85, title: 'Love Beach',
  platforms: [], pipes: [], coins: [], heartAmmo: [], letters: [], enemies: [], powerUps: [], boss: null
};


function checkOrientation() {
  const portrait = window.innerHeight > window.innerWidth;
  document.body.classList.toggle('portrait-lock', false);
  document.body.classList.toggle('landscape', true);
  const notice = document.getElementById('rotateNotice');
  if (notice) notice.classList.remove('visible');
  // Keep the game visible at all times on iPhone/local preview.
  // Rotation is only a recommendation, never a blocking state.
}

window.addEventListener('load', () => setTimeout(checkOrientation, 50));
window.addEventListener('resize', () => setTimeout(checkOrientation, 50));
window.addEventListener('orientationchange', () => setTimeout(checkOrientation, 150));

const player = {
  x: 140, y: 300, w: 70, h: 92, vx: 0, vy: 0, speed: 5.4, jumpPower: -15.5,
  onGround: false, facing: 1, lives: 3, coins: 0, letters: 0, ammo: 3,
  shield: 3, maxShield: 3, attackCooldown: 0, invuln: 0, checkpointX: 140, checkpointY: 300,
  powerTimer: 0
};

function resetWorld() {
  world.platforms = [
    {x:0,y:590,w:950,h:130},{x:1030,y:590,w:620,h:130},{x:1760,y:590,w:740,h:130},
    {x:2580,y:590,w:620,h:130},{x:3250,y:590,w:900,h:130},{x:450,y:470,w:120,h:20},
    {x:720,y:410,w:120,h:20},{x:1180,y:490,w:120,h:20},{x:1460,y:430,w:120,h:20},
    {x:1930,y:470,w:140,h:20},{x:2250,y:410,w:140,h:20},{x:2820,y:450,w:140,h:20},
    {x:3000,y:370,w:140,h:20},{x:3480,y:460,w:150,h:20}
  ];
  world.pipes = [
    {x:880,y:500,w:90,h:90,secretTo: {x:2050,y:300}},
    {x:3650,y:500,w:90,h:90,secretTo: null}
  ];
  world.coins = [300,360,420,480,540,760,820,1210,1270,1510,1950,2010,2070,2280,2340,2860,2920,3500,3560,3620]
    .map((x,i)=>({x,y:i%2===0?350:520,r:11,collected:false}));
  world.heartAmmo = [
    {x:1490,y:390,w:24,h:24,collected:false},{x:3040,y:330,w:24,h:24,collected:false},{x:2120,y:360,w:24,h:24,collected:false}
  ];
  world.powerUps = [
    {x:2390,y:375,r:16,collected:false}
  ];
  world.letters = [{x:3380,y:420,w:26,h:26,collected:false}];
  world.enemies = [
    {x:1120,y:550,w:48,h:38,min:1060,max:1540,vx:1.3,alive:true},
    {x:1870,y:550,w:48,h:38,min:1800,max:2440,vx:1.4,alive:true},
    {x:2780,y:550,w:48,h:38,min:2660,max:3140,vx:1.6,alive:true}
  ];
  world.boss = {x:3920,y:500,w:100,h:90,hp:8,maxHp:8,alive:true,cooldown:0};
}

function resetPlayer(full=true) {
  Object.assign(player, {
    x:140,y:498,vx:0,vy:0,onGround:false,facing:1,coins:0,letters:0,ammo:3,shield:3,
    attackCooldown:0,invuln:0,checkpointX:140,checkpointY:300,powerTimer:0
  });
  if (full) player.lives = 3;
}

function hideAllOverlays() {
  [ui.menu, ui.intro, ui.pauseMenu, ui.endMenu].forEach(el => el.classList.remove('visible'));
}

function closeMenuInstant() {
  ui.menu.classList.remove('visible', 'leaving');
  ui.menu.style.display = 'none';
  ui.menu.style.opacity = '0';
  ui.menu.style.pointerEvents = 'none';
}

function openMenu() {
  ui.menu.style.display = 'flex';
  ui.menu.style.opacity = '1';
  ui.menu.style.pointerEvents = 'auto';
  ui.menu.classList.remove('leaving');
  ui.menu.classList.add('visible');
}

function closeIntroInstant() {
  ui.intro.classList.remove('visible', 'leaving');
  ui.intro.style.display = 'none';
  ui.intro.style.opacity = '0';
  ui.intro.style.pointerEvents = 'none';
}

function saveGame() {
  const save = {
    player: {
      x: player.x, y: player.y, lives: player.lives, coins: player.coins, letters: player.letters,
      ammo: player.ammo, shield: player.shield, checkpointX: player.checkpointX, checkpointY: player.checkpointY, powerTimer: player.powerTimer
    },
    world: {
      coins: world.coins.map(c => c.collected),
      heartAmmo: world.heartAmmo.map(h => h.collected),
      letters: world.letters.map(l => l.collected),
      powerUps: world.powerUps.map(p => p.collected),
      enemies: world.enemies.map(e => e.alive),
      boss: world.boss ? { hp: world.boss.hp, alive: world.boss.alive } : null,
    }
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    const save = JSON.parse(raw);
    resetWorld(); resetPlayer(false);
    Object.assign(player, save.player);
    world.coins.forEach((c,i)=> c.collected = !!save.world.coins[i]);
    world.heartAmmo.forEach((h,i)=> h.collected = !!save.world.heartAmmo[i]);
    world.letters.forEach((l,i)=> l.collected = !!save.world.letters[i]);
    world.powerUps.forEach((p,i)=> p.collected = !!save.world.powerUps[i]);
    world.enemies.forEach((e,i)=> e.alive = !!save.world.enemies[i]);
    if (save.world.boss) { world.boss.hp = save.world.boss.hp; world.boss.alive = save.world.boss.alive; }
    heartsShot = []; particles = [];
    gameState = 'playing'; hideAllOverlays(); closeMenuInstant(); closeIntroInstant(); cameraX = Math.max(0, player.x - canvas.width * 0.22); ui.bossHud.classList.add('hidden');
    return true;
  } catch (e) { console.error(e); return false; }
}


function beginIntro() {
  hideAllOverlays();
  closeMenuInstant();
  closeIntroInstant();
  ui.intro.style.display = 'flex';
  ui.intro.style.opacity = '1';
  ui.intro.style.pointerEvents = 'auto';
  ui.intro.classList.remove('leaving');
  ui.intro.classList.add('visible');
  gameState = 'intro';
  setTimeout(() => { if (gameState === 'intro') startGameplay(); }, 2200);
}
function startGameplay() {
  ui.intro.classList.add('leaving');
  setTimeout(() => {
    hideAllOverlays();
    closeMenuInstant();
    closeIntroInstant();
    gameState = 'playing';
    canvas.classList.add('fade-in');
    cameraX = Math.max(0, player.x - canvas.width * 0.22);
    requestAnimationFrame(() => canvas.classList.remove('fade-in'));
    saveGame();
  }, 220);
}
function newGame() {
  resetWorld(); resetPlayer(true); heartsShot=[]; particles=[]; combo=0; comboUntil=0; bossIntroUntil=0; introArmed=false;
  cameraX = 0;
  ui.bossHud.classList.add('hidden');
  beginIntro();
}
function togglePause() {
  if (gameState === 'playing') { gameState = 'paused'; ui.pauseMenu.classList.add('visible'); }
  else if (gameState === 'paused') { gameState = 'playing'; ui.pauseMenu.classList.remove('visible'); }
}
function rectsOverlap(a,b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function hurtPlayer(sourceX=player.x) {
  if (player.invuln > 0) return;
  if (player.shield > 0) player.shield -= 1;
  else player.lives -= 1;
  player.invuln = 90;
  const knock = player.x < sourceX ? -8 : 8;
  player.vx = knock;
  player.vy = -9;
  const lostCoins = Math.min(6, player.coins);
  player.coins -= lostCoins;
  for (let i = 0; i < lostCoins; i++) particles.push({x: player.x + 20 + i*4, y: player.y + 18, t: 18, kind:'coin'});
  if (player.lives <= 0) { showEnd(false, 'King Crab vandt denne gang. Prøv igen ❤️'); return; }
  saveGame();
}

function shootHeart() {
  if (player.attackCooldown > 0 || player.ammo <= 0 || gameState !== 'playing') return;
  player.attackCooldown = 22;
  player.ammo -= 1;
  const size = player.powerTimer > 0 ? 28 : 20;
  heartsShot.push({ x: player.x + player.w/2, y: player.y + 34, w:size, h:size, vx: player.facing * (player.powerTimer > 0 ? 10 : 8), life: 70, power: player.powerTimer > 0 ? 2 : 1 });
  saveGame();
}

function setComboPopup() {
  if (combo < 2) { ui.comboFloat.classList.remove('visible'); return; }
  ui.comboFloat.textContent = `x${combo} COMBO!`;
  ui.comboFloat.classList.add('visible');
}
function showEnd(win, text) {
  gameState = 'end';
  ui.pauseMenu.classList.remove('visible');
  ui.endTitle.textContent = win ? 'Du vandt! 🎉' : 'Game Over';
  ui.endText.textContent = text;
  ui.endMenu.classList.add('visible');
}

function update() {
  if (gameState !== 'playing') return;
  time++;

  if (keys.left) { player.vx = -player.speed; player.facing = -1; }
  else if (keys.right) { player.vx = player.speed; player.facing = 1; }
  else player.vx *= 0.75;

  if (keys.jump && player.onGround) { player.vy = player.jumpPower; player.onGround = false; }
  if (keys.attack) shootHeart();

  player.vy += world.gravity;
  if (player.vy > 18) player.vy = 18;
  player.x += player.vx;
  player.y += player.vy;

  player.onGround = false;
  for (const p of world.platforms) {
    if (rectsOverlap(player,p)) {
      const prevBottom = player.y + player.h - player.vy;
      if (prevBottom <= p.y + 14 && player.vy >= 0) {
        player.y = p.y - player.h; player.vy = 0; player.onGround = true;
      } else if (player.x + player.w/2 < p.x + 20) player.x = p.x - player.w;
      else if (player.x + player.w/2 > p.x + p.w - 20) player.x = p.x + p.w;
    }
  }

  if (player.y > 760) {
    player.lives -= 1;
    player.x = player.checkpointX; player.y = player.checkpointY; player.vx = 0; player.vy = 0; player.shield = player.maxShield;
    if (player.lives <= 0) showEnd(false, 'Sarah faldt i vandet.');
    saveGame();
  }
  if (player.x < 0) player.x = 0;
  if (player.x > world.width - player.w) player.x = world.width - player.w;

  if (player.x > 1760) { player.checkpointX = 1820; player.checkpointY = 498; }
  if (player.x > 3250) { player.checkpointX = 3300; player.checkpointY = 498; }

  world.coins.forEach(c => {
    if (!c.collected && Math.hypot((player.x+35)-c.x, (player.y+46)-c.y) < 34) { c.collected = true; player.coins += 1; combo = Math.min(combo + 1, 9); comboUntil = time + 120; setComboPopup(); particles.push({x:c.x,y:c.y,t:18,kind:'spark'}); if (combo >= 5) player.powerTimer = Math.max(player.powerTimer, 180); }
  });
  world.heartAmmo.forEach(h => {
    if (!h.collected && rectsOverlap(player,h)) { h.collected = true; player.ammo += 1; }
  });
  world.powerUps.forEach(p => {
    if (!p.collected && Math.hypot((player.x+35)-p.x, (player.y+45)-p.y) < 42) { p.collected = true; player.powerTimer = 480; }
  });
  world.letters.forEach(l => {
    if (!l.collected && rectsOverlap(player,l)) { l.collected = true; player.letters += 1; }
  });

  for (const pipe of world.pipes) {
    if (rectsOverlap(player, pipe) && keys.downLike) {
      if (pipe.secretTo) { player.x = pipe.secretTo.x; player.y = pipe.secretTo.y; }
      else if (player.x > 3600 && !world.boss.alive && player.letters >= 1) {
        showEnd(true, `Sarah klarede Love Beach med ${player.coins} mønter, ${player.lives} liv tilbage og fandt Love Note 💌`);
      }
    }
  }

  heartsShot = heartsShot.filter(h => h.life-- > 0);
  heartsShot.forEach(h => {
    h.x += h.vx;
    world.enemies.forEach(e => {
      if (!e.alive) return;
      if (h.x < e.x+e.w && h.x+h.w > e.x && h.y < e.y+e.h && h.y+h.h > e.y) {
        e.alive = false; h.life = 0; particles.push({x:e.x+20,y:e.y+20,t:22});
      }
    });
    const b = world.boss;
    if (b && b.alive && h.x < b.x+b.w && h.x+h.w > b.x && h.y < b.y+b.h && h.y+h.h > b.y) {
      b.hp -= h.power; h.life = 0; b.x += h.vx > 0 ? 18 : -18;
      if (b.hp <= 0) { b.alive = false; particles.push({x:b.x+40,y:b.y+40,t:60,kind:'burst'}); setTimeout(()=>showEnd(true, `SEJR ❤️ Sarah klarede Love Beach med ${player.coins} mønter og ${player.letters} Love Note(s).`), 700); };
    }
  });

  world.enemies.forEach(e => {
    if (!e.alive) return;
    e.x += e.vx;
    if (e.x < e.min || e.x > e.max) e.vx *= -1;
    if (rectsOverlap(player,e)) {
      const stomp = player.vy > 2 && player.y + player.h - e.y < 28;
      if (stomp) { e.alive = false; player.vy = -10; }
      else hurtPlayer(e.x + e.w/2);
    }
  });

  const boss = world.boss;
  if (boss && boss.alive) {
    if (player.x > 3520 && !introArmed) { introArmed = true; bossIntroUntil = time + 90; }
    if (Math.abs(player.x - boss.x) < 420) boss.x += (player.x < boss.x ? -1 : 1) * -0.9;
    boss.cooldown--;
    if (rectsOverlap(player,boss)) {
      hurtPlayer(boss.x + boss.w/2);
    }
    ui.bossHud.classList.remove('hidden');
    ui.bossFill.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
  } else {
    ui.bossHud.classList.add('hidden');
  }

  particles = particles.filter(p => p.t-- > 0);
  if (player.attackCooldown > 0) player.attackCooldown--;
  if (player.invuln > 0) player.invuln--;
  if (player.powerTimer > 0) player.powerTimer--;
  if (combo && time > comboUntil) { combo = 0; ui.comboFloat.classList.remove('visible'); }

  let targetCamera = player.x - canvas.width * 0.22;
  if (bossIntroUntil > time) {
    const focus = (player.x + (world.boss ? world.boss.x : player.x)) / 2 - canvas.width * 0.35;
    targetCamera = focus;
  }
  targetCamera = Math.max(0, Math.min(targetCamera, world.width - canvas.width));
  cameraX += (targetCamera - cameraX) * 0.12;
  ui.coins.textContent = player.coins;
  ui.shield.textContent = player.shield;
  ui.ammo.textContent = player.ammo;
  ui.letters.textContent = player.letters;
  if (time % 30 === 0) saveGame();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0,0,0,canvas.height);
  sky.addColorStop(0,'#3a1d55'); sky.addColorStop(0.55,'#6f3aa8'); sky.addColorStop(1,'#f7a1b9');
  ctx.fillStyle = sky; ctx.fillRect(0,0,canvas.width,canvas.height);
  for (let i=0;i<20;i++) {
    const x = ((i*260 - cameraX*0.35) % (canvas.width+300)) - 60;
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.arc(x,120+(i%5)*16,30+(i%3)*10,0,Math.PI*2); ctx.arc(x+34,126+(i%4)*12,24,0,Math.PI*2); ctx.arc(x-28,128,22,0,Math.PI*2); ctx.fill();
  }
  ctx.fillStyle = '#f6b7ce'; ctx.fillRect(0, 520, canvas.width, 220);
  if (bossIntroUntil > time) { ctx.fillStyle='rgba(0,0,0,0.12)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
  for (let i=0;i<canvas.width;i+=50) {
    ctx.fillStyle = i%100===0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)';
    ctx.fillRect(i, 540, 26, 160);
  }
}

function drawHeart(x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y+s/2);
  ctx.bezierCurveTo(x, y, x-s, y, x-s, y+s/2);
  ctx.bezierCurveTo(x-s, y+s, x, y+s*1.25, x, y+s*1.55);
  ctx.bezierCurveTo(x, y+s*1.25, x+s, y+s, x+s, y+s/2);
  ctx.bezierCurveTo(x+s, y, x, y, x, y+s/2);
  ctx.fill();
}

function drawWorld() {
  ctx.save(); ctx.translate(-cameraX, 0);
  for (let i=0;i<8;i++) {
    const bx = i*600; ctx.fillStyle = i%2 ? 'rgba(80,36,116,0.45)' : 'rgba(52,20,83,0.55)';
    ctx.beginPath(); ctx.moveTo(bx,590); ctx.lineTo(bx+180,340); ctx.lineTo(bx+380,590); ctx.closePath(); ctx.fill();
  }
  world.platforms.forEach(p => {
    ctx.fillStyle = p.y > 560 ? '#d8b37c' : '#e8c998';
    ctx.fillRect(p.x,p.y,p.w,p.h);
    ctx.fillStyle = p.y > 560 ? '#7ed061' : '#ffd9a1';
    ctx.fillRect(p.x,p.y,p.w,18);
  });
  world.pipes.forEach(pipe => {
    ctx.fillStyle = '#26a65b'; ctx.fillRect(pipe.x, pipe.y, pipe.w, pipe.h); ctx.fillRect(pipe.x-8, pipe.y-18, pipe.w+16, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(pipe.x+16, pipe.y+10, 12, pipe.h-20);
  });
  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Arial'; ctx.fillText('Hemmeligt rør ↓', 795, 470); ctx.fillText('Udgang →', 3600, 470);

  world.coins.forEach(c => { if (!c.collected) { ctx.fillStyle = '#ffd84d'; ctx.beginPath(); ctx.arc(c.x,c.y,c.r,0,Math.PI*2); ctx.fill(); ctx.fillStyle = '#ffefad'; ctx.fillRect(c.x-3,c.y-8,6,16); } });
  world.heartAmmo.forEach(h => { if (!h.collected) drawHeart(h.x+12,h.y+12,12,'#ff4d88'); });
  world.powerUps.forEach(p => { if (!p.collected) { drawHeart(p.x,p.y,18,'#ff7ec1'); ctx.strokeStyle='#fff7'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(p.x,p.y,24+Math.sin(time/10)*3,0,Math.PI*2); ctx.stroke(); } });
  world.letters.forEach(l => {
    if (!l.collected) { ctx.fillStyle='#fff8f0'; ctx.fillRect(l.x,l.y,l.w,l.h); ctx.strokeStyle='#ff7bb7'; ctx.lineWidth=2; ctx.strokeRect(l.x,l.y,l.w,l.h); ctx.beginPath(); ctx.moveTo(l.x,l.y); ctx.lineTo(l.x+l.w/2,l.y+l.h/2); ctx.lineTo(l.x+l.w,l.y); ctx.stroke(); }
  });
  world.enemies.forEach(e => {
    if (!e.alive) return;
    ctx.fillStyle='#d33b3b'; ctx.beginPath(); ctx.arc(e.x+20,e.y+20,22,0,Math.PI*2); ctx.fill();
    ctx.fillRect(e.x-4,e.y+14,14,8); ctx.fillRect(e.x+30,e.y+14,14,8);
    ctx.fillStyle='#fff'; ctx.fillRect(e.x+8,e.y+8,8,8); ctx.fillRect(e.x+24,e.y+8,8,8);
  });
  if (world.boss && world.boss.alive) {
    const b=world.boss; ctx.fillStyle='#c81f1f'; ctx.beginPath(); ctx.arc(b.x+46,b.y+46,46,0,Math.PI*2); ctx.fill();
    ctx.fillRect(b.x-8,b.y+22,20,12); ctx.fillRect(b.x+80,b.y+22,20,12);
    ctx.fillStyle='#fff'; ctx.fillRect(b.x+24,b.y+20,10,10); ctx.fillRect(b.x+58,b.y+20,10,10);
    ctx.fillStyle='#ff3d3d'; ctx.fillRect(b.x+2,b.y-20,110,12); ctx.fillStyle='#8cff8c'; ctx.fillRect(b.x+2,b.y-20,(b.hp/b.maxHp)*110,12);
    ctx.fillStyle='#fff'; ctx.font='bold 18px Arial'; ctx.fillText('King Crab', b.x, b.y-28);
  }
  heartsShot.forEach(h => drawHeart(h.x, h.y, Math.max(10, h.w/2), h.power > 1 ? '#ff85d1' : '#ff5ca7'));
  particles.forEach(p => {
    if (p.kind === 'coin') {
      ctx.fillStyle = `rgba(255,220,90,${p.t/18})`;
      ctx.beginPath(); ctx.arc(p.x + (18-p.t)*1.8, p.y - Math.sin((18-p.t)/2)*12, 7, 0, Math.PI*2); ctx.fill();
    } else if (p.kind === 'burst') {
      ctx.fillStyle = `rgba(255,130,200,${p.t/60})`;
      for (let i=0;i<10;i++) { const a=i*Math.PI/5 + (60-p.t)*0.08; ctx.beginPath(); ctx.arc(p.x+Math.cos(a)*(60-p.t)*2, p.y+Math.sin(a)*(60-p.t)*2, 6, 0, Math.PI*2); ctx.fill(); }
    } else {
      ctx.fillStyle = `rgba(255,255,255,${p.t/22})`; ctx.beginPath(); ctx.arc(p.x,p.y,30-p.t,0,Math.PI*2); ctx.fill();
    }
  });

  ctx.fillStyle='#fff'; ctx.fillRect(4120,430,12,160); ctx.fillStyle='#ff9cd0'; ctx.fillRect(4132,430,70,48); ctx.fillStyle='#4a1240'; ctx.font='bold 18px Arial'; ctx.fillText('MÅL',4144,460);
  if (!(player.invuln > 0 && Math.floor(player.invuln/5)%2===0)) drawPlayer();
  ctx.restore();

  if (combo >= 2) {
    const sx = player.x - cameraX + player.w/2 + 40;
    const sy = player.y + 10;
    ui.comboFloat.style.left = `${Math.max(80, Math.min(canvas.width - 80, sx))}px`;
    ui.comboFloat.style.top = `${Math.max(60, sy)}px`;
  }
}

function drawPlayer() {
  ctx.save();
  if (player.powerTimer > 0) { ctx.shadowColor = '#ff8ed8'; ctx.shadowBlur = 18; }
  const moving = Math.abs(player.vx) > 1.2 && player.onGround;
  const frame = moving ? Math.floor(time / 7) % images.run.length : 0;
  const img = (player.attackCooldown > 16) ? images.attack : images.run[frame];
  const drawW = 86, drawH = 118;
  const x = player.x + player.w/2, y = player.y + player.h/2 + 8;
  ctx.translate(x, y);
  if (player.facing === -1) ctx.scale(-1,1);
  if (img.complete && img.naturalWidth) ctx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
  else {
    ctx.fillStyle = '#f07fb4'; ctx.fillRect(-20,-40,40,80);
  }
  ctx.restore();
}

function drawHints() {
  if (gameState !== 'playing' || time > 420) return;
  ctx.fillStyle='rgba(0,0,0,0.26)'; ctx.fillRect(20, canvas.height-160, 420, 84);
  ctx.fillStyle='#fff'; ctx.font='24px Arial'; ctx.fillText('Hop: ⤒   Skyd: ❤️   Pause: ❚❚', 36, canvas.height-116);
  ctx.font='20px Arial'; ctx.fillText('Love Power gør dine hjerter større i kort tid.', 36, canvas.height-84);
}

function render() { drawBackground(); drawWorld(); drawHints(); requestAnimationFrame(loop); }
function loop() { update(); render(); }

function setAction(action, pressed) {
  if (action === 'left') keys.left = pressed;
  if (action === 'right') keys.right = pressed;
  if (action === 'jump') keys.jump = pressed;
  if (action === 'attack') keys.attack = pressed;
  keys.downLike = keys.left && keys.right;
}
window.addEventListener('keydown', e => {
  if (['ArrowLeft','a','A'].includes(e.key)) setAction('left', true);
  if (['ArrowRight','d','D'].includes(e.key)) setAction('right', true);
  if (['ArrowUp','w','W',' '].includes(e.key)) setAction('jump', true);
  if (['x','X','Enter'].includes(e.key)) setAction('attack', true);
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') togglePause();
});
window.addEventListener('keyup', e => {
  if (['ArrowLeft','a','A'].includes(e.key)) setAction('left', false);
  if (['ArrowRight','d','D'].includes(e.key)) setAction('right', false);
  if (['ArrowUp','w','W',' '].includes(e.key)) setAction('jump', false);
  if (['x','X','Enter'].includes(e.key)) setAction('attack', false);
});
document.querySelectorAll('.control').forEach(btn => {
  const action = btn.dataset.action;
  const start = ev => { ev.preventDefault(); if (action === 'pause') togglePause(); else setAction(action, true); };
  const end = ev => { ev.preventDefault(); if (action !== 'pause') setAction(action, false); };
  btn.addEventListener('touchstart', start, {passive:false}); btn.addEventListener('touchend', end, {passive:false}); btn.addEventListener('mousedown', start); btn.addEventListener('mouseup', end); btn.addEventListener('mouseleave', end);
});
document.getElementById('newGameBtn').onclick = () => {
  ui.menu.classList.add('leaving');
  setTimeout(() => {
    closeMenuInstant();
    newGame();
  }, 320);
};
document.getElementById('continueBtn').onclick = () => { closeMenuInstant(); if (!loadGame()) newGame(); };
document.getElementById('settingsBtn').onclick = () => alert('Indstillinger kommer i næste version.');
document.getElementById('skipIntroBtn').onclick = startGameplay;
document.getElementById('resumeBtn').onclick = togglePause;
document.getElementById('saveBtn').onclick = saveGame;
document.getElementById('quitBtn').onclick = () => { saveGame(); gameState = 'menu'; hideAllOverlays(); openMenu(); };
document.getElementById('restartBtn').onclick = newGame;
document.getElementById('endMenuBtn').onclick = () => { gameState = 'menu'; hideAllOverlays(); openMenu(); };
ui.continueBtn.style.display = localStorage.getItem(SAVE_KEY) ? 'inline-block' : 'none';
resetWorld(); openMenu(); checkOrientation(); loop();
