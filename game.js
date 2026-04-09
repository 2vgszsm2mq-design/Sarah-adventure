
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });

const DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
let viewW = 1280, viewH = 720;

function fitCanvas() {
  const vw = window.innerWidth || 1280;
  const vh = window.innerHeight || 720;
  canvas.style.width = vw + 'px';
  canvas.style.height = vh + 'px';
  canvas.width = Math.floor(vw * DPR);
  canvas.height = Math.floor(vh * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  viewW = vw;
  viewH = vh;
}
fitCanvas();
window.addEventListener('resize', fitCanvas);
window.addEventListener('orientationchange', () => setTimeout(fitCanvas, 100));

const ui = {
  menu: document.getElementById('menu'),
  newGameBtn: document.getElementById('newGameBtn'),
  continueBtn: document.getElementById('continueBtn'),
  hud: document.getElementById('hud'),
  shield: document.getElementById('shield'),
  ammo: document.getElementById('ammo'),
  coins: document.getElementById('coins'),
  letters: document.getElementById('letters'),
  bossHud: document.getElementById('bossHud'),
  bossFill: document.getElementById('bossFill'),
  message: document.getElementById('message'),
  touchControls: document.getElementById('touchControls')
};

const sprite = new Image();
sprite.src = 'assets/sarah_sheet.png';

const SAVE_KEY = 'sarah_vertical_slice_save';
const keys = {left:false,right:false,jump:false,attack:false,down:false};

const state = {
  running:false,
  cameraX:0,
  time:0,
  particles:[],
  shots:[],
  screenShake:0,
  messageUntil:0
};

const world = {
  width: 6200,
  gravity: 0.88,
  groundY: 596,
  platforms: [],
  coins: [],
  ammoPickups: [],
  notes: [],
  enemies: [],
  pipes: [],
  checkpoints: [],
  boss: null,
};

const player = {
  x:180, y:430, w:92, h:122,
  vx:0, vy:0,
  speed:5.2, jumpPower:-15.5,
  facing:1, onGround:false,
  shield:3, ammo:3, coins:0, letters:0,
  invuln:0, attackCooldown:0, lives:3,
  checkpointX:180, checkpointY:430,
  animTick:0
};

function showMessage(text, ms=1600){
  ui.message.textContent = text;
  ui.message.classList.remove('hidden');
  state.messageUntil = performance.now() + ms;
}
function hideMessageIfNeeded(){
  if (state.messageUntil && performance.now() > state.messageUntil){
    ui.message.classList.add('hidden');
    state.messageUntil = 0;
  }
}

function buildWorld(){
  world.platforms = [
    {x:0,y:596,w:980,h:124},{x:1060,y:596,w:760,h:124},{x:1910,y:596,w:840,h:124},
    {x:2860,y:596,w:760,h:124},{x:3740,y:596,w:820,h:124},{x:4700,y:596,w:900,h:124},
    {x:620,y:500,w:180,h:20},{x:920,y:430,w:180,h:20},
    {x:1500,y:500,w:180,h:20},{x:1810,y:430,w:180,h:20},{x:2120,y:360,w:180,h:20},
    {x:2430,y:500,w:180,h:20},{x:2750,y:430,w:180,h:20},
    {x:3390,y:500,w:180,h:20},{x:3710,y:430,w:180,h:20},
    {x:4360,y:500,w:180,h:20},{x:4680,y:430,w:180,h:20},{x:5000,y:360,w:180,h:20}
  ];

  world.coins = [];
  [220,320,420,520,620,760,900,1040,1360,1460,1560,1660,1760,1860,2020,2120,2220,2320,2480,2580,2680,2780,3320,3420,3520,3620,3780,3880,3980,4360,4460,4560,4660,4820,4920,5020,5120,5280].forEach((x,i)=>{
    world.coins.push({x, y: i%3===0?350:(i%2===0?520:440), r:11, collected:false});
  });

  world.ammoPickups = [
    {x:1815,y:385,w:30,h:30,collected:false},
    {x:4690,y:385,w:30,h:30,collected:false},
  ];

  world.notes = [
    {x:2140,y:328,w:28,h:28,collected:false},
    {x:5005,y:328,w:28,h:28,collected:false},
  ];

  world.enemies = [
    {x:1350,y:553,w:58,h:42,min:1180,max:1780,vx:1.5,alive:true},
    {x:2390,y:553,w:58,h:42,min:2230,max:2810,vx:1.4,alive:true},
    {x:4320,y:553,w:58,h:42,min:4180,max:4750,vx:1.6,alive:true}
  ];

  world.pipes = [
    {x:820,y:506,w:92,h:90,secretTo:{x:2360,y:300}},
    {x:5180,y:506,w:92,h:90,secretTo:null}
  ];

  world.checkpoints = [
    {x:1950,y:474},
    {x:3820,y:474}
  ];

  world.boss = {x:5400,y:490,w:150,h:112,hp:12,maxHp:12,alive:true,flash:0};
}

function resetPlayer(full=true){
  player.x=180; player.y=430; player.vx=0; player.vy=0;
  player.facing=1; player.onGround=false;
  player.shield=3; player.ammo=3; player.coins=0; player.letters=0;
  player.invuln=0; player.attackCooldown=0; player.animTick=0;
  player.checkpointX=180; player.checkpointY=430;
  if(full) player.lives=3;
}

function saveGame(){
  const save = {
    player:{...player},
    coins: world.coins.map(c=>c.collected),
    ammo: world.ammoPickups.map(a=>a.collected),
    notes: world.notes.map(n=>n.collected),
    enemies: world.enemies.map(e=>e.alive),
    boss:{hp:world.boss.hp, alive:world.boss.alive}
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  ui.continueBtn.classList.remove('hidden');
}

function loadGame(){
  const raw = localStorage.getItem(SAVE_KEY);
  if(!raw) return false;
  try{
    buildWorld(); resetPlayer(false);
    const save = JSON.parse(raw);
    Object.assign(player, save.player);
    world.coins.forEach((c,i)=>c.collected = !!save.coins[i]);
    world.ammoPickups.forEach((a,i)=>a.collected = !!save.ammo[i]);
    world.notes.forEach((n,i)=>n.collected = !!save.notes[i]);
    world.enemies.forEach((e,i)=>e.alive = !!save.enemies[i]);
    world.boss.hp = save.boss.hp; world.boss.alive = save.boss.alive;
    startRuntime();
    return true;
  } catch(e){
    console.error(e);
    return false;
  }
}

function startRuntime(){
  state.running = true;
  ui.menu.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  ui.touchControls.classList.remove('hidden');
}

function newGame(){
  buildWorld();
  resetPlayer(true);
  state.cameraX=0;
  state.time=0;
  state.particles=[];
  state.shots=[];
  state.screenShake=0;
  startRuntime();
  saveGame();
}

function rectsOverlap(a,b){
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}
function burst(x,y,color='#ff8fc0',count=12){
  for(let i=0;i<count;i++){
    state.particles.push({x,y,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.7)*7,life:24,color});
  }
}
function drawHeart(x,y,s,color){
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.moveTo(x, y+s/2);
  ctx.bezierCurveTo(x, y, x-s, y, x-s, y+s/2);
  ctx.bezierCurveTo(x-s, y+s, x, y+s*1.25, x, y+s*1.55);
  ctx.bezierCurveTo(x, y+s*1.25, x+s, y+s, x+s, y+s/2);
  ctx.bezierCurveTo(x+s, y, x, y, x, y+s/2);
  ctx.fill();
}

function shoot(){
  if(player.attackCooldown>0 || player.ammo<=0) return;
  player.attackCooldown = 16;
  player.ammo -= 1;
  state.shots.push({x:player.x + player.w/2, y:player.y + 46, vx:player.facing * 9, life:70});
}

function hurtPlayer(sourceX){
  if(player.invuln>0) return;
  if(player.shield>0) player.shield -= 1;
  else player.lives -= 1;
  player.invuln=90;
  player.vx = player.x < sourceX ? -8 : 8;
  player.vy = -8;
  burst(player.x + player.w/2, player.y + player.h/2, '#ffd7ea', 10);
  state.screenShake = 8;
  if(player.lives <= 0){
    player.lives = 3;
    player.x = player.checkpointX;
    player.y = player.checkpointY;
    player.shield = 3;
    player.ammo = 3;
  }
  saveGame();
}

function update(){
  hideMessageIfNeeded();
  if(!state.running) return;
  state.time++;
  player.animTick++;

  if(keys.left){ player.vx = -player.speed; player.facing = -1; }
  else if(keys.right){ player.vx = player.speed; player.facing = 1; }
  else player.vx *= 0.78;

  if(keys.jump && player.onGround){
    player.vy = player.jumpPower;
    player.onGround = false;
    burst(player.x + player.w/2, player.y + player.h, '#fff0f8', 6);
    keys.jump = false;
  }
  if(keys.attack){
    shoot();
    keys.attack = false;
  }

  player.vy += world.gravity;
  if(player.vy > 18) player.vy = 18;
  player.x += player.vx;
  player.y += player.vy;
  player.onGround = false;

  for(const p of world.platforms){
    if(rectsOverlap(player,p)){
      const prevBottom = player.y + player.h - player.vy;
      if(prevBottom <= p.y + 16 && player.vy >= 0){
        player.y = p.y - player.h;
        player.vy = 0;
        player.onGround = true;
      } else if(player.x + player.w/2 < p.x + 24) player.x = p.x - player.w;
      else if(player.x + player.w/2 > p.x + p.w - 24) player.x = p.x + p.w;
    }
  }

  if(player.x < 0) player.x = 0;
  if(player.x > world.width - player.w) player.x = world.width - player.w;
  if(player.y > 900){
    player.x = player.checkpointX;
    player.y = player.checkpointY;
    player.vx = 0;
    player.vy = 0;
    player.shield = 3;
  }

  world.checkpoints.forEach(cp=>{
    if(player.x > cp.x){
      player.checkpointX = cp.x + 8;
      player.checkpointY = cp.y - player.h;
    }
  });

  world.coins.forEach(c=>{
    if(!c.collected && Math.hypot(player.x + 46 - c.x, player.y + 60 - c.y) < 40){
      c.collected = true;
      player.coins += 1;
      burst(c.x, c.y, '#ffd968', 8);
    }
  });
  world.ammoPickups.forEach(a=>{
    if(!a.collected && rectsOverlap(player,a)){
      a.collected = true;
      player.ammo += 2;
      burst(a.x+14, a.y+14, '#ff69b8', 10);
    }
  });
  world.notes.forEach(n=>{
    if(!n.collected && rectsOverlap(player,n)){
      n.collected = true;
      player.letters += 1;
      burst(n.x+14, n.y+14, '#fff0d4', 10);
    }
  });

  world.enemies.forEach(e=>{
    if(!e.alive) return;
    e.x += e.vx;
    if(e.x < e.min || e.x > e.max) e.vx *= -1;
    if(rectsOverlap(player,e)){
      const stomp = player.vy > 2 && player.y + player.h - e.y < 30;
      if(stomp){
        e.alive = false;
        player.vy = -10;
        burst(e.x+22, e.y+20, '#ffe6f2', 10);
      } else {
        hurtPlayer(e.x + e.w/2);
      }
    }
  });

  state.shots = state.shots.filter(s=>s.life-- > 0);
  state.shots.forEach(s=>{
    s.x += s.vx;
    world.enemies.forEach(e=>{
      if(!e.alive) return;
      if(s.x > e.x && s.x < e.x+e.w && s.y > e.y && s.y < e.y+e.h){
        e.alive = false;
        s.life = 0;
        burst(e.x+22, e.y+20, '#ff93c9', 12);
      }
    });

    const b = world.boss;
    if(b.alive && s.x > b.x && s.x < b.x+b.w && s.y > b.y && s.y < b.y+b.h){
      b.hp -= 1;
      b.flash = 10;
      s.life = 0;
      burst(s.x, s.y, '#ff93c9', 12);
      state.screenShake = 6;
      if(b.hp <= 0){
        b.alive = false;
        burst(b.x+60, b.y+50, '#ffd7ea', 26);
        showMessage('SEJR ❤️', 1800);
      }
    }
  });

  const boss = world.boss;
  if(boss.alive){
    if(Math.abs(player.x - boss.x) < 520){
      ui.bossHud.classList.remove('hidden');
    }
    if(Math.abs(player.x - boss.x) < 320){
      boss.x += Math.sign(player.x - boss.x) * -0.7;
    }
    if(rectsOverlap(player,boss)) hurtPlayer(boss.x + boss.w/2);
    ui.bossFill.style.width = `${Math.max(0,(boss.hp / boss.maxHp) * 100)}%`;
    if(boss.flash > 0) boss.flash--;
  } else {
    ui.bossHud.classList.add('hidden');
  }

  world.pipes.forEach(pipe=>{
    if(rectsOverlap(player, pipe) && keys.down){
      if(pipe.secretTo){
        player.x = pipe.secretTo.x;
        player.y = pipe.secretTo.y;
        showMessage('Hemmeligt område ❤️', 1200);
      } else if(!world.boss.alive){
        showMessage('Vertical slice klaret. Sudoku og casino kommer bagefter.', 2200);
      }
      keys.down = false;
    }
  });

  if(player.attackCooldown > 0) player.attackCooldown--;
  if(player.invuln > 0) player.invuln--;

  let targetCamera = player.x - viewW * 0.3;
  targetCamera = Math.max(0, Math.min(targetCamera, world.width - viewW));
  state.cameraX += (targetCamera - state.cameraX) * 0.12;
}

function drawBackground(){
  const sky = ctx.createLinearGradient(0,0,0,viewH);
  sky.addColorStop(0,'#2d1748');
  sky.addColorStop(.54,'#6c39a5');
  sky.addColorStop(1,'#f2a3b4');
  ctx.fillStyle = sky;
  ctx.fillRect(0,0,viewW,viewH);

  const sunX = viewW * 0.78;
  const sunY = 150;
  const sun = ctx.createRadialGradient(sunX,sunY,10,sunX,sunY,100);
  sun.addColorStop(0,'rgba(255,244,184,.94)');
  sun.addColorStop(.35,'rgba(255,219,140,.44)');
  sun.addColorStop(1,'rgba(255,219,140,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(sunX-110, sunY-110, 220, 220);

  for(let i=0;i<12;i++){
    const x = ((i*300 - state.cameraX*0.18) % (viewW+420)) - 140;
    const y = 120 + (i%4)*20;
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath();
    ctx.arc(x,y,36,0,Math.PI*2);
    ctx.arc(x+44,y+8,28,0,Math.PI*2);
    ctx.arc(x-38,y+10,24,0,Math.PI*2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(-(state.cameraX*0.12),0);
  for(let i=0;i<12;i++){
    const bx = i*520 - 80;
    ctx.fillStyle = i%2 ? 'rgba(80,34,112,.46)' : 'rgba(60,24,92,.52)';
    ctx.beginPath();
    ctx.moveTo(bx,590);
    ctx.quadraticCurveTo(bx+130,372,bx+280,590);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = 'rgba(255,209,224,.42)';
  ctx.fillRect(0,520,viewW,200);

  const sand = ctx.createLinearGradient(0,560,0,viewH);
  sand.addColorStop(0,'#e8c89d');
  sand.addColorStop(1,'#c79a63');
  ctx.fillStyle = sand;
  ctx.fillRect(0,560,viewW,200);

  ctx.save();
  ctx.translate(-(state.cameraX*0.16),0);
  [120,1180,2180,3240,4420,5600].forEach((x,i)=>drawPalm(x,560, i%2?170:190));
  ctx.restore();
}

function drawPalm(x, baseY, h){
  ctx.fillStyle = 'rgba(24,10,32,.9)';
  ctx.fillRect(x-5, baseY-h, 10, h);
  for(let i=0;i<6;i++){
    ctx.save();
    ctx.translate(x, baseY-h);
    ctx.rotate(-1.05 + i*0.4);
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.quadraticCurveTo(74,-16,136,22);
    ctx.quadraticCurveTo(74,18,0,8);
    ctx.fill();
    ctx.restore();
  }
}

function drawPlayer(){
  const x = player.x + player.w/2;
  const y = player.y + player.h/2 + 10;
  const frameW = 160;
  const frameH = 400;
  const runFrames = [0,1,2,3,4,5];
  let frame = 0;
  if(!player.onGround) frame = 7;
  else if(Math.abs(player.vx) > 0.9) frame = runFrames[Math.floor(player.animTick/6) % runFrames.length];
  else frame = 0;

  ctx.save();
  ctx.translate(x, y);
  if(player.facing === -1) ctx.scale(-1, 1);

  if(sprite.complete && sprite.naturalWidth){
    ctx.drawImage(sprite, frame*frameW, 0, frameW, frameH, -60, -88, 120, 210);
  } else {
    ctx.fillStyle = '#ff69b4';
    ctx.fillRect(-24,-40,48,80);
  }
  ctx.restore();
}

function drawWorld(){
  ctx.save();

  if(state.screenShake > 0){
    const sx = (Math.random() - 0.5) * state.screenShake;
    const sy = (Math.random() - 0.5) * state.screenShake * 0.6;
    ctx.translate(sx, sy);
    state.screenShake *= 0.85;
    if(state.screenShake < 0.25) state.screenShake = 0;
  }

  ctx.translate(-state.cameraX, 0);

  world.platforms.forEach(p=>{
    ctx.fillStyle = p.y > 560 ? '#d7af79' : '#efce98';
    ctx.fillRect(p.x,p.y,p.w,p.h);
    ctx.fillStyle = p.y > 560 ? '#75d767' : '#ffe0af';
    ctx.fillRect(p.x,p.y,p.w,18);
  });

  world.pipes.forEach(pipe=>{
    ctx.fillStyle = '#26a65b';
    ctx.fillRect(pipe.x, pipe.y, pipe.w, pipe.h);
    ctx.fillRect(pipe.x-8, pipe.y-18, pipe.w+16, 22);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(pipe.x+16, pipe.y+10, 12, pipe.h-20);
  });

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px Arial';
  ctx.fillText('Hemmeligt rør ↓', 760, 474);
  ctx.fillText('Udgang →', 5160, 474);

  world.checkpoints.forEach(cp=>{
    ctx.fillStyle='#fff';
    ctx.fillRect(cp.x, 436, 10, 160);
    ctx.fillStyle='#ff9cd0';
    ctx.fillRect(cp.x+10, 436, 60, 42);
  });

  world.coins.forEach(c=>{
    if(c.collected) return;
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
    if(!a.collected) drawHeart(a.x+14, a.y+14, 12, '#ff4c93');
  });

  world.notes.forEach(n=>{
    if(n.collected) return;
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
    if(!e.alive) return;
    ctx.fillStyle='rgba(255,100,100,.18)';
    ctx.beginPath();
    ctx.arc(e.x+22,e.y+22,30,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle='#d33b3b';
    ctx.beginPath();
    ctx.arc(e.x+22,e.y+22,22,0,Math.PI*2);
    ctx.fill();
    ctx.fillRect(e.x-4,e.y+14,14,8);
    ctx.fillRect(e.x+34,e.y+14,14,8);
    ctx.fillStyle='#fff';
    ctx.fillRect(e.x+10,e.y+8,8,8);
    ctx.fillRect(e.x+26,e.y+8,8,8);
  });

  const boss = world.boss;
  if(boss.alive){
    ctx.save();
    if(boss.flash > 0) ctx.globalAlpha = 0.65;
    ctx.fillStyle='rgba(255,95,95,.2)';
    ctx.beginPath();
    ctx.arc(boss.x+54,boss.y+52,62,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle='#c81f1f';
    ctx.beginPath();
    ctx.arc(boss.x+54,boss.y+52,50,0,Math.PI*2);
    ctx.fill();
    ctx.fillRect(boss.x-8,boss.y+26,22,12);
    ctx.fillRect(boss.x+92,boss.y+26,22,12);
    ctx.fillStyle='#fff';
    ctx.fillRect(boss.x+28,boss.y+22,10,10);
    ctx.fillRect(boss.x+66,boss.y+22,10,10);
    ctx.restore();
  }

  state.shots.forEach(s=>drawHeart(s.x,s.y,10,'#ff63ab'));

  state.particles.forEach(p=>{
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x,p.y,4+p.life/12,0,Math.PI*2);
    ctx.fill();
  });

  if(!(player.invuln > 0 && Math.floor(player.invuln/6)%2===0)){
    drawPlayer();
  }

  ctx.restore();
}

function render(){
  drawBackground();
  drawWorld();

  state.particles = state.particles.filter(p=>p.life-- > 0);
  state.particles.forEach(p=>{ p.x += p.vx; p.y += p.vy; });

  ui.shield.textContent = player.shield;
  ui.ammo.textContent = player.ammo;
  ui.coins.textContent = player.coins;
  ui.letters.textContent = player.letters || 0;

  requestAnimationFrame(loop);
}
function loop(){
  update();
  render();
}

function setAction(action, pressed){
  if(action==='left') keys.left = pressed;
  if(action==='right') keys.right = pressed;
  if(action==='jump') keys.jump = pressed;
  if(action==='attack') keys.attack = pressed;
  if(action==='down') keys.down = pressed;
}

document.querySelectorAll('.control').forEach(btn=>{
  const action = btn.dataset.action;
  const start = ev => { ev.preventDefault(); setAction(action, true); };
  const end = ev => { ev.preventDefault(); setAction(action, false); };
  btn.addEventListener('touchstart', start, {passive:false});
  btn.addEventListener('touchend', end, {passive:false});
  btn.addEventListener('mousedown', start);
  btn.addEventListener('mouseup', end);
  btn.addEventListener('mouseleave', end);
});

window.addEventListener('keydown', e=>{
  if(['ArrowLeft','a','A'].includes(e.key)) setAction('left', true);
  if(['ArrowRight','d','D'].includes(e.key)) setAction('right', true);
  if(['ArrowUp','w','W',' '].includes(e.key)) setAction('jump', true);
  if(['x','X','Enter'].includes(e.key)) setAction('attack', true);
  if(['ArrowDown','s','S'].includes(e.key)) setAction('down', true);
});
window.addEventListener('keyup', e=>{
  if(['ArrowLeft','a','A'].includes(e.key)) setAction('left', false);
  if(['ArrowRight','d','D'].includes(e.key)) setAction('right', false);
  if(['ArrowUp','w','W',' '].includes(e.key)) setAction('jump', false);
  if(['x','X','Enter'].includes(e.key)) setAction('attack', false);
  if(['ArrowDown','s','S'].includes(e.key)) setAction('down', false);
});

ui.newGameBtn.addEventListener('click', newGame);
ui.continueBtn.addEventListener('click', loadGame);

if(localStorage.getItem(SAVE_KEY)){
  ui.continueBtn.classList.remove('hidden');
}

buildWorld();
loop();
