const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let gameRunning = false;
let shake = 0;

let player = {x:100,y:300,w:50,h:50,vy:0};
let gravity = 0.6;

let particles = [];

let clouds = [
 {x:0,y:60},
 {x:300,y:90},
 {x:600,y:70}
];

function startGame(){
 document.getElementById("menu").style.display="none";
 gameRunning = true;
}

function hitEffect(x,y){
 for(let i=0;i<8;i++){
  particles.push({
   x:x,y:y,
   vx:(Math.random()-0.5)*6,
   vy:(Math.random()-0.5)*6,
   life:20
  });
 }
 shake = 8;
}

function update(){
 if(!gameRunning) return;

 player.vy += gravity;
 player.y += player.vy;

 if(player.y > canvas.height-100){
  player.y = canvas.height-100;
  player.vy = -12;
  hitEffect(player.x, player.y);
 }

 particles.forEach(p=>{
  p.x+=p.vx;
  p.y+=p.vy;
  p.life--;
 });

 particles = particles.filter(p=>p.life>0);
}

function draw(){
 ctx.save();

 if(shake>0){
  ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake);
  shake*=0.9;
 }

 ctx.clearRect(0,0,canvas.width,canvas.height);

 clouds.forEach(c=>{
  ctx.fillStyle="rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(c.x,c.y,30,0,Math.PI*2);
  ctx.fill();

  c.x-=0.2;
  if(c.x<-50) c.x=canvas.width+50;
 });

 ctx.fillStyle="pink";
 ctx.fillRect(player.x,player.y,player.w,player.h);

 particles.forEach(p=>{
  ctx.fillStyle="red";
  ctx.fillRect(p.x,p.y,5,5);
 });

 ctx.restore();
}

function loop(){
 update();
 draw();
 requestAnimationFrame(loop);
}

loop();
