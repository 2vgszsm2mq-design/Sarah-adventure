
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });

const menu = document.getElementById('menu');
const hud = document.getElementById('hud');
const touchControls = document.getElementById('touchControls');
const shieldEl = document.getElementById('shield');
const ammoEl = document.getElementById('ammo');
const coinsEl = document.getElementById('coins');
const newGameBtn = document.getElementById('newGameBtn');

let DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
let viewW = 1280;
let viewH = 720;

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

const sprite = new Image();
sprite.src = 'assets/sarah_sheet.png';

const state = {
  running: false,
  time: 0,
  cameraX: 0,
  particles: [],
  shots: [],
  keys: { left:false, right:false, jump:false, attack:false }
};

const world = {
  width: 5200,
  groundY: 590,
  platforms: [],
  coins: [],
  ammoPickups: [],
  enemies: []
};

const player = {
  x: 160, y: 430, w: 84, h: 116,
  vx: 0, vy: 0,
  speed: 5.2,
  jumpPower: -15,
  facing: 1,
  onGround: false,
  shield: 3,
  ammo: 3,
  coins: 0,
  animTick: 0,
  attackCooldown: 0
};

function buildWorld() {
  world.platforms = [
    {x:0,y:596,w:940,h:124},{x:1010,y:596,w:760,h:124},{x:1860,y:596,w:840,h:124},
    {x:2810,y:596,w:760,h:124},{x:3690,y:596,w:820,h:124},{x:4630,y:596,w:650,h:124},
    {x:300,y:500,w:180,h:20},{x:590,y:430,w:180,h:20},{x:920,y:360,w:180,h:20},
    {x:1490,y:500,w:180,h:20},{x:1810,y:430,w:180,h:20},
    {x:2360,y:470,w:180,h:20},{x:2690,y:400,w:180,h:20},
    {x:3290,y:500,w:190,h:20},{x:3610,y:430,w:190,h:20},
    {x:4260,y:470,w:180,h:20},{x:4590,y:400,w:180,h:20}
  ];
  world.coins = [];
  [220,320,420,520,620,760,890,1030,1380,1480,1580,1680,1780,2040,2140,2240,2340,2480,2580,2680,3220,3320,3420,3520,3660,3760,3860,4380,4480,4580,4680].forEach((x,i)=>{
    world.coins.push({x, y: i%3===0?350:(i%2===0?520:440), r:11, collected:false});
  });
  world.ammoPickups = [
    {x:1840,y:385,w:28,h:28,collected:false},
    {x:3620,y:385,w:28,h:28,collected:false}
  ];
  world.enemies = [
    {x:1300,y:553,w:56,h:42,min:1140,max:1700,vx:1.4,alive:true},
    {x:2290,y:553,w:56,h:42,min:2140,max:2750,vx:1.5,alive:true},
    {x:3340,y:553,w:56,h:42,min:3200,max:3870,vx:1.4,alive:true},
    {x:4300,y:553,w:56,h:42,min:4160,max:4750,vx:1.6,alive:true}
  ];
}

function resetPlayer() {
  player.x = 160; player.y = 430;
  player.vx = 0; player.vy = 0;
  player.facing = 1; player.onGround = false;
  player.shield = 3; player.ammo = 3; player.coins = 0;
  player.animTick = 0; player.attackCooldown = 0;
}

function newGame() {
  buildWorld();
  resetPlayer();
  state.running = true;
  state.time = 0;
  state.cameraX = 0;
  state.particles = [];
  state.shots = [];
  menu.classList.add('hidden');
  hud.classList.remove('hidden');
  touchControls.classList.remove('hidden');
}

function burst(x,y,color='#ffd96b',count=8){
  for(let i=0;i<count;i++){
    state.particles.push({
      x,y,
      vx:(Math.random()-0.5)*6,
      vy:(Math.random()-0.7)*6,
      life:24,
      color
    });
  }
}

function shoot(){
  if(player.attackCooldown>0 || player.ammo<=0) return;
  player.attackCooldown = 16;
  player.ammo -= 1;
  state.shots.push({
    x: player.x + player.w/2,
    y: player.y + 48,
    vx: player.facing * 9,
    life: 70
  });
}

function rectsOverlap(a,b){
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}

function update(){
  if(!state.running) return;
  state.time++;
  player.animTick++;

  if(state.keys.left){ player.vx = -player.speed; player.facing = -1; }
  else if(state.keys.right){ player.vx = player.speed; player.facing = 1; }
  else player.vx *= 0.78;

  if(state.keys.jump && player.onGround){
    player.vy = player.jumpPower;
    player.onGround = false;
    burst(player.x + player.w/2, player.y + player.h, '#fff0f8', 6);
    state.keys.jump = false;
  }

  if(state.keys.attack){
    shoot();
    state.keys.attack = false;
  }

  player.vy += 0.85;
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
      }
    }
  }

  if(player.x < 0) player.x = 0;
  if(player.x > world.width - player.w) player.x = world.width - player.w;
  if(player.y > 900){
    resetPlayer();
  }

  world.coins.forEach(c=>{
    if(!c.collected && Math.hypot(player.x + 42 - c.x, player.y + 58 - c.y) < 38){
      c.collected = true;
      player.coins += 1;
      burst(c.x,c.y,'#ffd968',8);
    }
  });

  world.ammoPickups.forEach(a=>{
    if(!a.collected && rectsOverlap(player,a)){
      a.collected = true;
      player.ammo += 2;
      burst(a.x+14,a.y+14,'#ff69b8',10);
    }
  });

  world.enemies.forEach(e=>{
    if(!e.alive) return;
    e.x += e.vx;
    if(e.x < e.min || e.x > e.max) e.vx *= -1;
    if(rectsOverlap(player,e)){
      const stomp = player.vy > 2 && player.y + player.h - e.y < 28;
      if(stomp){
        e.alive = false;
        player.vy = -10;
        burst(e.x+22,e.y+20,'#ffe6f2',10);
      } else {
        player.shield = Math.max(0, player.shield - 1);
        resetPlayer();
      }
    }
  });

  state.shots = state.shots.filter(s=>s.life-- > 0);
  state.shots.forEach(s=>{
    s.x += s.vx;
    world.enemies.forEach(e=>{
      if(!e.alive) return;
      if(s.x > e.x && s.x < e.x + e.w && s.y > e.y && s.y < e.y + e.h){
        e.alive = false;
        s.life = 0;
        burst(e.x+22,e.y+20,'#ff93c9',12);
      }
    });
  });

  if(player.attackCooldown>0) player.attackCooldown--;

  let targetCamera = player.x - viewW * 0.32;
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
  ctx.fillRect(sunX-110,sunY-110,220,220);

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
  for(let i=0;i<11;i++){
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
  [120,1180,2180,3240,4420].forEach((x,i)=>drawPalm(x,560, i%2?170:190));
  ctx.restore();
}

function drawPalm(x, baseY, h){
  ctx.fillStyle='rgba(24,10,32,.9)';
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
  const y = player.y + player.h/2 + 8;
  const frameW = 160;
  const frameH = 400;
  const runFrames = [0,1,2,3,4,5];
  let frame = 0;
  if(!player.onGround) frame = 7;
  else if(Math.abs(player.vx) > 0.9) frame = runFrames[Math.floor(player.animTick/6) % runFrames.length];
  else frame = 0;

  ctx.save();
  ctx.translate(x,y);
  if(player.facing === -1) ctx.scale(-1,1);
  if(sprite.complete && sprite.naturalWidth){
    ctx.drawImage(sprite, frame*frameW, 0, frameW, frameH, -54, -78, 108, 192);
  } else {
    ctx.fillStyle = '#ff69b4';
    ctx.fillRect(-24,-40,48,80);
  }
  ctx.restore();
}

function drawWorld(){
  ctx.save();
  ctx.translate(-state.cameraX, 0);

  world.platforms.forEach(p=>{
    ctx.fillStyle = p.y > 560 ? '#d7af79' : '#efce98';
    ctx.fillRect(p.x,p.y,p.w,p.h);
    ctx.fillStyle = p.y > 560 ? '#75d767' : '#ffe0af';
    ctx.fillRect(p.x,p.y,p.w,18);
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
    if(!a.collected) drawHeart(a.x+14,a.y+14,12,'#ff4c93');
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

  state.shots.forEach(s=>drawHeart(s.x,s.y,10,'#ff63ab'));
  state.particles.forEach(p=>{
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x,p.y,4+p.life/12,0,Math.PI*2);
    ctx.fill();
  });

  drawPlayer();
  ctx.restore();
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

function render(){
  drawBackground();
  drawWorld();

  state.particles = state.particles.filter(p=>p.life-- > 0);
  state.particles.forEach(p=>{ p.x += p.vx; p.y += p.vy; });

  shieldEl.textContent = player.shield;
  ammoEl.textContent = player.ammo;
  coinsEl.textContent = player.coins;

  requestAnimationFrame(loop);
}

function loop(){
  update();
  render();
}

function setAction(action, pressed){
  if(action==='left') state.keys.left = pressed;
  if(action==='right') state.keys.right = pressed;
  if(action==='jump') state.keys.jump = pressed;
  if(action==='attack') state.keys.attack = pressed;
}

document.querySelectorAll('.control').forEach(btn=>{
  const action = btn.dataset.action;
  const start = ev => { ev.preventDefault(); setAction(action,true); };
  const end = ev => { ev.preventDefault(); setAction(action,false); };
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
});
window.addEventListener('keyup', e=>{
  if(['ArrowLeft','a','A'].includes(e.key)) setAction('left',false);
  if(['ArrowRight','d','D'].includes(e.key)) setAction('right',false);
  if(['ArrowUp','w','W',' '].includes(e.key)) setAction('jump',false);
  if(['x','X','Enter'].includes(e.key)) setAction('attack',false);
});

newGameBtn.addEventListener('click', newGame);

buildWorld();
loop();
