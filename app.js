const SAVE_KEY='sarah_adventure_v21_next';
const splash=document.getElementById('splash');
const intro=document.getElementById('intro');
const menu=document.getElementById('menu');
const map=document.getElementById('map');
const casino=document.getElementById('casino');
const game=document.getElementById('game');
const rotate=document.getElementById('rotate');
const letterModal=document.getElementById('letterModal');
const completeModal=document.getElementById('completeModal');
const sudokuModal=document.getElementById('sudokuModal');
const hud=document.getElementById('hud');
const mapStats=document.getElementById('mapStats');
const bossBar=document.getElementById('bossBar');
const canvas=document.getElementById('canvas');
const ctx=canvas.getContext('2d');
const spriteSheet=new Image();
spriteSheet.src='assets/sarah_sprites.png';

let running=false, paused=false, t=0, cameraX=0, coins=0, lives=3, unlockedLevel=1, currentLevel=1, totalLetters=0;
let levelComplete=false, heartShot=null, particles=[], sudokuProgress=[], bossMode=false;
let introStep=0;
const introLines=[
  'Dette spil er lavet til min elskede Sarah ❤️',
  'Et sted mellem havet, solen og drømmene begynder et nyt eventyr.',
  'Følg sporene. Saml brevene. Find kærligheden.',
  'Men pas på... vejen er fuld af farer, gåder og boss-kampe.',
  'Sarah’s Adventure. Et eventyr lavet med kærlighed.'
];
const player={x:160,y:0,w:50,h:78,vx:0,vy:0,onGround:false};
const groundY=415;
function coinLine(startX,count,yCycle=[360,326,292,258]){ const a=[]; for(let i=0;i<count;i++) a.push({x:startX+i*145,y:yCycle[i%yCycle.length],r:16,taken:false,rot:0}); return a; }
const levels = {
  1:{title:'Bane 1 – Kærlighedsstranden', worldWidth:6200, sea:'#4db7d9', sand:'#f1d08b', platforms:[{x:260,y:348,w:190,h:24},{x:540,y:300,w:180,h:24},{x:800,y:246,w:170,h:24},{x:1280,y:334,w:210,h:24},{x:1600,y:282,w:180,h:24},{x:1970,y:230,w:160,h:24},{x:2680,y:350,w:220,h:24},{x:3040,y:302,w:190,h:24},{x:3400,y:248,w:180,h:24},{x:4260,y:340,w:220,h:24},{x:4680,y:286,w:190,h:24},{x:5120,y:232,w:170,h:24},{x:5800,y:330,w:250,h:24}], coins:[...coinLine(180,32)], crabs:[{x:1040,y:390,w:58,h:34,dir:1,min:960,max:1150},{x:2270,y:390,w:58,h:34,dir:-1,min:2180,max:2380},{x:3720,y:390,w:58,h:34,dir:1,min:3600,max:3840},{x:5450,y:390,w:58,h:34,dir:-1,min:5360,max:5560}], letter:{x:3560,y:195,w:36,h:46,text:'Du er mit livs største eventyr ❤️',found:false}, checkpoint:{x:4530,y:250,w:18,h:165,hit:false}, finish:{x:5960,y:172,w:20,h:245}},
  2:{title:'Bane 2 – Palmeøen', worldWidth:6400, sea:'#40b6ca', sand:'#ebcb7f', platforms:[{x:240,y:342,w:200,h:24},{x:540,y:286,w:160,h:24},{x:760,y:238,w:160,h:24},{x:1100,y:332,w:220,h:24},{x:1440,y:278,w:180,h:24},{x:1740,y:226,w:160,h:24},{x:2460,y:346,w:220,h:24},{x:2820,y:292,w:190,h:24},{x:3200,y:240,w:180,h:24},{x:4180,y:336,w:220,h:24},{x:4620,y:286,w:180,h:24},{x:5000,y:236,w:180,h:24},{x:6000,y:318,w:280,h:24}], coins:[...coinLine(220,34)], crabs:[{x:980,y:390,w:58,h:34,dir:1,min:900,max:1100},{x:2060,y:390,w:58,h:34,dir:-1,min:1960,max:2180},{x:3900,y:390,w:58,h:34,dir:1,min:3800,max:4020},{x:5600,y:390,w:58,h:34,dir:-1,min:5480,max:5700}], letter:{x:3260,y:185,w:36,h:46,text:'Jeg ville vælge dig igen hver eneste dag ❤️',found:false}, checkpoint:{x:4680,y:248,w:18,h:165,hit:false}, finish:{x:6200,y:172,w:20,h:245}},
  3:{title:'Bane 3 – Solbugten', worldWidth:6500, sea:'#36a8c0', sand:'#efc57a', platforms:[{x:260,y:340,w:180,h:24},{x:480,y:290,w:180,h:24},{x:760,y:240,w:160,h:24},{x:1210,y:320,w:220,h:24},{x:1500,y:272,w:180,h:24},{x:1820,y:222,w:160,h:24},{x:2560,y:346,w:220,h:24},{x:2980,y:296,w:190,h:24},{x:3400,y:244,w:180,h:24},{x:4300,y:332,w:220,h:24},{x:4720,y:282,w:180,h:24},{x:5140,y:232,w:170,h:24},{x:6080,y:310,w:250,h:24}], coins:[...coinLine(200,36)], crabs:[{x:920,y:390,w:58,h:34,dir:1,min:860,max:1020},{x:2400,y:390,w:58,h:34,dir:-1,min:2320,max:2520},{x:4020,y:390,w:58,h:34,dir:1,min:3940,max:4140},{x:5660,y:390,w:58,h:34,dir:-1,min:5560,max:5780}], letter:{x:3500,y:188,w:36,h:46,text:'Mit hjerte finder altid vej tilbage til dig ❤️',found:false}, checkpoint:{x:4580,y:248,w:18,h:165,hit:false}, finish:{x:6280,y:172,w:20,h:245}},
  4:{title:'Bane 4 – Skatkysten', worldWidth:6600, sea:'#2fa2bf', sand:'#e8bf73', platforms:[{x:240,y:334,w:200,h:24},{x:560,y:280,w:170,h:24},{x:820,y:230,w:160,h:24},{x:1260,y:324,w:220,h:24},{x:1580,y:272,w:180,h:24},{x:1880,y:222,w:160,h:24},{x:2640,y:340,w:220,h:24},{x:3060,y:290,w:190,h:24},{x:3460,y:236,w:180,h:24},{x:4380,y:328,w:220,h:24},{x:4840,y:278,w:180,h:24},{x:5300,y:228,w:170,h:24},{x:6200,y:306,w:250,h:24}], coins:[...coinLine(220,38)], crabs:[{x:1080,y:390,w:58,h:34,dir:1,min:1000,max:1180},{x:2280,y:390,w:58,h:34,dir:-1,min:2200,max:2380},{x:4180,y:390,w:58,h:34,dir:1,min:4100,max:4300},{x:5840,y:390,w:58,h:34,dir:-1,min:5740,max:5940}], letter:{x:3640,y:180,w:36,h:46,text:'Du gør verden smukkere bare ved at være i den ❤️',found:false}, checkpoint:{x:4820,y:246,w:18,h:165,hit:false}, finish:{x:6380,y:172,w:20,h:245}},
  5:{title:'Bane 5 – Boss-bane', worldWidth:4200, sea:'#267ea5', sand:'#dcb068', platforms:[{x:300,y:320,w:180,h:24},{x:640,y:260,w:180,h:24},{x:980,y:220,w:180,h:24},{x:1460,y:330,w:200,h:24},{x:1880,y:276,w:180,h:24},{x:2320,y:230,w:180,h:24}], coins:[...coinLine(260,18)], crabs:[{x:1240,y:390,w:58,h:34,dir:1,min:1160,max:1340},{x:2140,y:390,w:58,h:34,dir:-1,min:2060,max:2260}], letter:{x:0,y:0,w:0,h:0,text:'',found:true}, checkpoint:{x:0,y:0,w:0,h:0,hit:false}, finish:{x:3900,y:172,w:20,h:245}, boss:{x:3300,y:330,w:170,h:100,hp:12,maxHp:12}}
};
let current = null;

function resize(){ canvas.width=window.innerWidth*devicePixelRatio; canvas.height=window.innerHeight*devicePixelRatio; ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); rotate.classList.toggle('hidden', window.innerWidth>=window.innerHeight); }
window.addEventListener('resize', resize); resize();

function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
function loadLevel(n){ current=clone(levels[n]); currentLevel=n; player.x=160; player.y=groundY-player.h; player.vx=0; player.vy=0; player.onGround=true; cameraX=0; heartShot=null; particles=[]; levelComplete=false; bossMode=!!current.boss; document.getElementById('levelTitle').textContent=current.title; bossBar.classList.toggle('hidden', !bossMode); updateBossBar(); }
function saveState(){ localStorage.setItem(SAVE_KEY, JSON.stringify({coins,lives,unlockedLevel,currentLevel,totalLetters})); }
function loadState(){ const raw=localStorage.getItem(SAVE_KEY); if(!raw) return false; try{ const s=JSON.parse(raw); coins=s.coins??0; lives=s.lives??3; unlockedLevel=s.unlockedLevel??1; currentLevel=s.currentLevel??1; totalLetters=s.totalLetters??0; loadLevel(currentLevel); return true; }catch{return false;} }
function updateHud(){ hud.innerHTML='❤️'.repeat(lives)+' &nbsp; 🪙 '+coins+' &nbsp; 💌 '+totalLetters+'/5'; mapStats.innerHTML='🪙 '+coins+' &nbsp; ❤️ '+lives+' &nbsp; 💌 '+totalLetters+'/5'; updateBossBar(); }
function updateBossBar(){ if(!bossMode||!current||!current.boss){ bossBar.classList.add('hidden'); return; } bossBar.classList.remove('hidden'); bossBar.textContent='Boss ❤️ ' + Math.max(0, Math.round((current.boss.hp/current.boss.maxHp)*100)) + '%'; }
function show(target){ [splash,intro,menu,map,casino,game,letterModal,completeModal,sudokuModal].forEach(el=>el.classList.add('hidden')); target.classList.remove('hidden'); }
function renderMap(){ document.querySelectorAll('.map-node').forEach((el,idx)=>{ const level=idx+1; el.classList.toggle('locked', level>unlockedLevel); el.disabled=level>unlockedLevel; el.classList.toggle('current', level===currentLevel); el.onclick=()=>{ if(level<=unlockedLevel && levels[level]){ loadLevel(level); updateHud(); show(game); running=true; paused=false; } }; }); updateHud(); }
function newGame(){ coins=0; lives=3; unlockedLevel=1; currentLevel=1; totalLetters=0; loadLevel(1); updateHud(); show(intro); introStep=0; document.getElementById('introText').textContent=introLines[introStep]; running=false; paused=true; saveState(); }
function continueGame(){ if(!loadState()){ newGame(); return; } updateHud(); show(game); running=true; paused=false; }
function openMap(){ renderMap(); show(map); running=false; paused=false; saveState(); }
function openCasino(){ show(casino); running=false; paused=true; updateHud(); }

document.getElementById('nextIntroBtn').onclick=()=>{ introStep++; if(introStep>=introLines.length){ show(game); running=true; paused=false; } else { document.getElementById('introText').textContent=introLines[introStep]; } };
splash.onclick=()=>show(menu);

function overlap(a,b){ return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; }
function spawnParticles(x,y,color='#ffd84f'){ for(let i=0;i<12;i++) particles.push({x,y,vx:(Math.random()-0.5)*3.6,vy:-Math.random()*3.6-1,life:30,color}); }
function hurt(){ const respawnX = current.checkpoint && current.checkpoint.hit ? current.checkpoint.x-130 : 160; lives=Math.max(1,lives-1); player.x=respawnX; player.y=groundY-player.h; player.vx=0; player.vy=0; updateHud(); saveState(); }
function jump(){ if(player.onGround && !paused){ player.vy=-13.2; player.onGround=false; } }
function fireHeart(){ if(paused||heartShot) return; heartShot={x:player.x+58,y:player.y+34,vx:10}; }

document.getElementById('closeLetterBtn').onclick=()=>{ show(game); paused=false; saveState(); };
document.getElementById('toSudokuBtn').onclick=()=>{ paused=true; sudokuProgress=[]; document.getElementById('sudokuStatus').textContent='Tryk tallene i rækkefølgen 1 → 2 → 3'; show(sudokuModal); };
document.getElementById('toMapBtn').onclick=openMap;
document.getElementById('skipSudokuBtn').onclick=()=>{ coins+=10; unlockedLevel=Math.max(unlockedLevel, currentLevel+1); updateHud(); saveState(); openMap(); };
document.getElementById('closeSudokuBtn').onclick=openMap;
document.querySelectorAll('.sudoku-cell').forEach(el=>el.onclick=()=>{ sudokuProgress.push(Number(el.dataset.n)); if(JSON.stringify(sudokuProgress)===JSON.stringify([1,2,3])){ coins+=50; unlockedLevel=Math.max(unlockedLevel, currentLevel+1); updateHud(); saveState(); document.getElementById('sudokuStatus').textContent='Flot! +50 mønter og næste bane låst op'; } else if(sudokuProgress.length>=3){ sudokuProgress=[]; document.getElementById('sudokuStatus').textContent='Forkert rækkefølge – prøv igen'; } });

document.getElementById('spinBtn').onclick=()=>{ const cost=10; if(coins<cost){ document.getElementById('slotResult').textContent='Du mangler mønter'; return; } coins-=cost; const icons=['💋','❤️','🪙','👑']; const r=[icons[Math.floor(Math.random()*icons.length)],icons[Math.floor(Math.random()*icons.length)],icons[Math.floor(Math.random()*icons.length)]]; document.getElementById('slotReels').textContent=r.join(' '); let msg='Prøv igen'; if(r[0]===r[1]&&r[1]===r[2]){ if(r[0]==='🪙'){ coins+=100; msg='Gevinst! +100 mønter'; } else if(r[0]==='❤️'){ lives=Math.min(5,lives+1); msg='Ekstra liv'; } else if(r[0]==='💋'){ coins+=25; msg='Super kys bonus +25 mønter'; } else if(r[0]==='👑'){ coins+=50; msg='Boss bonus +50 mønter'; } } document.getElementById('slotResult').textContent=msg; updateHud(); saveState(); };
document.getElementById('closeCasinoBtn').onclick=()=>show(menu);

function update(){
  if(!running || paused || !current) return;
  player.vy+=0.62; player.x+=player.vx; player.y+=player.vy; player.onGround=false;
  if(player.y+player.h>=groundY){ player.y=groundY-player.h; player.vy=0; player.onGround=true; }
  for(const p of current.platforms){ if(player.vy>=0 && player.x+player.w>p.x && player.x<p.x+p.w && player.y+player.h>=p.y && player.y+player.h<=p.y+24){ player.y=p.y-player.h; player.vy=0; player.onGround=true; } }
  if(player.x<0) player.x=0;
  if(player.x>current.worldWidth-player.w) player.x=current.worldWidth-player.w;
  cameraX=player.x-window.innerWidth*0.22; if(cameraX<0) cameraX=0;

  for(const c of current.coins){ if(c.taken) continue; const dx=(player.x+player.w/2)-c.x, dy=(player.y+player.h/2)-c.y; if(Math.sqrt(dx*dx+dy*dy)<34){ c.taken=true; coins++; spawnParticles(c.x,c.y); updateHud(); } }
  if(current.letter && !current.letter.found && current.letter.w>0 && overlap(player,current.letter)){ current.letter.found=true; totalLetters=Math.min(5,totalLetters+1); document.getElementById('letterText').textContent=current.letter.text; spawnParticles(current.letter.x,current.letter.y,'#ff7abf'); updateHud(); paused=true; show(letterModal); }
  if(current.checkpoint && !current.checkpoint.hit && current.checkpoint.x>0 && player.x+player.w>current.checkpoint.x){ current.checkpoint.hit=true; spawnParticles(current.checkpoint.x,current.checkpoint.y,'#8ee2ff'); saveState(); }

  for(const c of current.crabs){ c.x+=c.dir*1.7; if(c.x<c.min||c.x>c.max) c.dir*=-1; if(overlap(player,c)) hurt(); if(heartShot && heartShot.x>c.x && heartShot.x<c.x+c.w && heartShot.y>c.y && heartShot.y<c.y+c.h){ heartShot=null; spawnParticles(c.x,c.y,'#ff7a7a'); c.x=c.min; } }

  if(bossMode && current.boss){
    if(heartShot && heartShot.x>current.boss.x && heartShot.x<current.boss.x+current.boss.w && heartShot.y>current.boss.y && heartShot.y<current.boss.y+current.boss.h){
      current.boss.hp--; heartShot=null; spawnParticles(current.boss.x,current.boss.y,'#ff7a7a'); updateBossBar();
      if(current.boss.hp<=0){ levelComplete=true; document.getElementById('completeTitle').textContent='Boss besejret!'; document.getElementById('completeText').textContent='Du besejrede den første boss-bane. Flere baner kommer i næste version.'; paused=true; show(completeModal); saveState(); }
    }
    if(player.x+player.w>current.boss.x && player.x<current.boss.x+current.boss.w && player.y+player.h>current.boss.y){ hurt(); }
  }

  if(heartShot){ heartShot.x+=heartShot.vx; if(heartShot.x>cameraX+window.innerWidth+320) heartShot=null; }
  particles.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.life--; p.vy+=0.08; });
  particles = particles.filter(p=>p.life>0);

  if(!bossMode && !levelComplete && player.x+player.w>current.finish.x){ levelComplete=true; document.getElementById('completeTitle').textContent='Bane gennemført!'; document.getElementById('completeText').textContent='Du klarede ' + current.title + '. Næste bane er nu låst op.'; paused=true; show(completeModal); saveState(); }
  saveState();
}

function drawCloud(x,y,s,a){ ctx.fillStyle='rgba(255,255,255,'+a+')'; ctx.beginPath(); ctx.arc(x,y,24*s,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(x+28*s,y-12*s,20*s,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(x+56*s,y,24*s,0,Math.PI*2); ctx.fill(); ctx.fillRect(x-6*s,y,62*s,22*s); }
function drawPalm(x,near=false){ const sx=x-cameraX*(near?1:0.68); ctx.fillStyle=near?'#8b5a2b':'#7d8b5a'; ctx.fillRect(sx,near?278:300,near?16:12,near?136:110); ctx.fillStyle=near?'#31c46f':'#5fcf88'; for(let i=0;i<5;i++){ ctx.beginPath(); ctx.ellipse(sx+8, near?288:306, (near?38:30)-i*2, near?11:9, (-0.9+i*0.45),0,Math.PI*2); ctx.fill(); } }
function drawPlayer(){ const dx=player.x-cameraX, dy=player.y-18; if(spriteSheet.complete && spriteSheet.naturalWidth>0){ const cols=4, rows=6; const fw=spriteSheet.naturalWidth/cols, fh=spriteSheet.naturalHeight/rows; const frame = player.onGround ? Math.floor(t/8)%4 : 4; const sx=(frame%cols)*fw, sy=Math.floor(frame/cols)*fh; ctx.drawImage(spriteSheet,sx,sy,fw,fh,dx-12,dy,102,122); } else { ctx.fillStyle='#ffb6d8'; ctx.fillRect(dx+10,dy+26,28,42); ctx.fillStyle='#f2c8a0'; ctx.beginPath(); ctx.arc(dx+24,dy+14,14,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#f0d269'; ctx.beginPath(); ctx.arc(dx+24,dy+10,14,0,Math.PI); ctx.fill(); ctx.fillStyle='#fff'; ctx.fillRect(dx+14,dy+68,8,16); ctx.fillRect(dx+29,dy+68,8,16); } }

function draw(){
  if(game.classList.contains('hidden') || !current) return;
  const grad=ctx.createLinearGradient(0,0,0,window.innerHeight);
  grad.addColorStop(0,'#88d9ff'); grad.addColorStop(.44,'#d1f4ff'); grad.addColorStop(.44,current.sea); grad.addColorStop(.58,current.sea); grad.addColorStop(.58,current.sand); grad.addColorStop(1,current.sand);
  ctx.fillStyle=grad; ctx.fillRect(0,0,window.innerWidth,window.innerHeight);

  ctx.fillStyle='rgba(56,128,110,.35)';
  ctx.beginPath(); ctx.moveTo(180-cameraX*0.18,340); ctx.lineTo(400-cameraX*0.18,256); ctx.lineTo(640-cameraX*0.18,340); ctx.fill();
  ctx.beginPath(); ctx.moveTo(930-cameraX*0.22,340); ctx.lineTo(1140-cameraX*0.22,254); ctx.lineTo(1400-cameraX*0.22,340); ctx.fill();

  drawCloud(160-cameraX*0.08,94,1,0.70); drawCloud(580-cameraX*0.10,74,1.15,0.72); drawCloud(1120-cameraX*0.12,112,0.95,0.68);
  ctx.fillStyle=current.sea; ctx.fillRect(0,275,window.innerWidth,125);
  ctx.fillStyle='rgba(255,255,255,.24)';
  for(let i=0;i<30;i++){ const wx=((i*120-cameraX*0.7)%1500+1500)%1500; const y=297+(i%4)*17+Math.sin((t+i*6)*0.04)*2; ctx.fillRect(wx,y,84,5); }

  ctx.fillStyle=current.sand; ctx.fillRect(-cameraX,groundY,current.worldWidth,240);
  ctx.fillStyle='rgba(176,124,58,.28)'; ctx.fillRect(-cameraX,groundY,current.worldWidth,8);
  [540,1380,2280,3260,4340,5520].forEach(x=>drawPalm(x,false));
  for(const p of current.platforms){ ctx.fillStyle='#e8c37c'; ctx.fillRect(p.x-cameraX,p.y,p.w,p.h); ctx.fillStyle='#c38d4b'; ctx.fillRect(p.x-cameraX,p.y,p.w,5); }

  if(current.checkpoint && current.checkpoint.x>0){
    ctx.fillStyle='#7a5630'; ctx.fillRect(current.checkpoint.x-cameraX,current.checkpoint.y,current.checkpoint.w,current.checkpoint.h);
    ctx.fillStyle=current.checkpoint.hit?'#6ef3ff':'#f9f1b5'; ctx.beginPath(); ctx.moveTo(current.checkpoint.x-cameraX+current.checkpoint.w,current.checkpoint.y); ctx.lineTo(current.checkpoint.x-cameraX+74,current.checkpoint.y+24); ctx.lineTo(current.checkpoint.x-cameraX+current.checkpoint.w,current.checkpoint.y+48); ctx.closePath(); ctx.fill();
  }

  if(current.letter && !current.letter.found && current.letter.w>0){ const x=current.letter.x-cameraX, y=current.letter.y; ctx.fillStyle='#fffaf0'; ctx.fillRect(x,y,current.letter.w,current.letter.h); ctx.strokeStyle='#d94f91'; ctx.lineWidth=2; ctx.strokeRect(x,y,current.letter.w,current.letter.h); ctx.fillStyle='#ff6aa7'; ctx.font='24px Arial'; ctx.fillText('❤',x+7,y+28); }
  ctx.fillStyle='#7c5a32'; ctx.fillRect(current.finish.x-cameraX, current.finish.y, current.finish.w, current.finish.h);
  ctx.fillStyle='#f45cab'; ctx.beginPath(); ctx.moveTo(current.finish.x-cameraX+current.finish.w,current.finish.y); ctx.lineTo(current.finish.x-cameraX+84,current.finish.y+30); ctx.lineTo(current.finish.x-cameraX+current.finish.w,current.finish.y+60); ctx.closePath(); ctx.fill();

  for(const c of current.coins){ if(c.taken) continue; c.rot += 0.14; ctx.save(); ctx.translate(c.x-cameraX,c.y); ctx.scale(Math.abs(Math.cos(c.rot))*0.7+0.3,1); ctx.fillStyle='gold'; ctx.beginPath(); ctx.arc(0,0,c.r,0,Math.PI*2); ctx.fill(); ctx.fillStyle='rgba(255,255,255,.3)'; ctx.beginPath(); ctx.arc(-2,-2,c.r*0.45,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  for(const c of current.crabs){ const x=c.x-cameraX, y=c.y; ctx.fillStyle='#dd4949'; ctx.beginPath(); ctx.ellipse(x+c.w/2,y+12,c.w/2,15,0,0,Math.PI*2); ctx.fill(); ctx.fillRect(x+8,y+18,6,12); ctx.fillRect(x+44,y+18,6,12); ctx.fillRect(x+2,y+12,12,5); ctx.fillRect(x+44,y+12,12,5); ctx.fillStyle='#fff'; ctx.fillRect(x+18,y+6,4,4); ctx.fillRect(x+34,y+6,4,4); }

  if(bossMode && current.boss){ const x=current.boss.x-cameraX, y=current.boss.y; ctx.fillStyle='#8e44ad'; ctx.beginPath(); ctx.ellipse(x+current.boss.w/2,y+38,current.boss.w/2,42,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#ffd84f'; ctx.fillRect(x+55,y-8,58,16); ctx.fillRect(x+68,y-24,12,18); ctx.fillRect(x+88,y-24,12,18); }

  drawPlayer();
  if(heartShot){ const x=heartShot.x-cameraX, y=heartShot.y; ctx.fillStyle='#ff4f92'; ctx.beginPath(); ctx.moveTo(x,y+8); ctx.bezierCurveTo(x-9,y-5,x-22,y+10,x,y+24); ctx.bezierCurveTo(x+22,y+10,x+9,y-5,x,y+8); ctx.fill(); }
  particles.forEach(p=>{ ctx.globalAlpha=Math.max(0,p.life/30); ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x-cameraX,p.y,3,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; });
  [860,2760,4920,6060].forEach(x=>drawPalm(x,true));
}

function loop(){ t++; update(); draw(); requestAnimationFrame(loop); }
loop();

function setLeft(on){ player.vx=on?-4.7:(player.vx<0?0:player.vx); }
function setRight(on){ player.vx=on?4.7:(player.vx>0?0:player.vx); }
document.getElementById('newGameBtn').onclick=newGame;
document.getElementById('continueBtn').onclick=continueGame;
document.getElementById('mapBtn').onclick=openMap;
document.getElementById('casinoBtn').onclick=openCasino;
document.getElementById('mapBackBtn').onclick=()=>show(menu);
document.getElementById('left').ontouchstart=e=>{e.preventDefault();setLeft(true)};
document.getElementById('left').ontouchend=e=>{e.preventDefault();setLeft(false)};
document.getElementById('right').ontouchstart=e=>{e.preventDefault();setRight(true)};
document.getElementById('right').ontouchend=e=>{e.preventDefault();setRight(false)};
document.getElementById('jump').ontouchstart=e=>{e.preventDefault();jump()};
document.getElementById('kiss').ontouchstart=e=>{e.preventDefault();fireHeart()};
document.getElementById('pauseBtn').onclick=()=>{paused=!paused};
document.addEventListener('keydown',e=>{ if(e.key==='ArrowLeft') setLeft(true); if(e.key==='ArrowRight') setRight(true); if(e.key==='ArrowUp'||e.key===' ') jump(); if(e.key.toLowerCase()==='x') fireHeart(); if(e.key.toLowerCase()==='p') paused=!paused; if(e.key.toLowerCase()==='m') openMap(); });
document.addEventListener('keyup',e=>{ if(e.key==='ArrowLeft') setLeft(false); if(e.key==='ArrowRight') setRight(false); });
if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js')); }
updateHud();
