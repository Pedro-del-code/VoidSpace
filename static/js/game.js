// ============================================================
//  VOID STRIKER — Space Shooter Engine
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ── State ────────────────────────────────────────────────────
let gameState = 'splash'; // splash | playing | gameover
let score = 0;
let highScore = parseInt(localStorage.getItem('voidHighScore') || '0');
let lives = 3;
let wave = 1;
let frameCount = 0;
let animFrame;
let lastTime = 0;

// ── Resize ───────────────────────────────────────────────────
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', () => { resize(); });

// ── Stars ────────────────────────────────────────────────────
const stars = [];
function initStars() {
  stars.length = 0;
  for (let i = 0; i < 220; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.2,
      speed: Math.random() * 0.6 + 0.15,
      alpha: Math.random() * 0.6 + 0.2,
      twinkle: Math.random() * Math.PI * 2,
    });
  }
}
initStars();

function drawStars(dt) {
  for (const s of stars) {
    s.y += s.speed * dt * 0.06;
    if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
    s.twinkle += 0.025;
    const a = s.alpha * (0.7 + 0.3 * Math.sin(s.twinkle));
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,220,255,${a})`;
    ctx.fill();
  }
}

// ── Nebula ───────────────────────────────────────────────────
const nebulae = [
  { x: 0.2, y: 0.1, r: 260, c: '80,40,160' },
  { x: 0.75, y: 0.6, r: 200, c: '20,80,140' },
  { x: 0.5, y: 0.85, r: 180, c: '160,30,80' },
];
function drawNebulae() {
  for (const n of nebulae) {
    const grd = ctx.createRadialGradient(
      n.x * canvas.width, n.y * canvas.height, 0,
      n.x * canvas.width, n.y * canvas.height, n.r
    );
    grd.addColorStop(0, `rgba(${n.c},0.18)`);
    grd.addColorStop(1, `rgba(${n.c},0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(n.x * canvas.width, n.y * canvas.height, n.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Player ───────────────────────────────────────────────────
const player = {
  x: 0, y: 0, w: 44, h: 54,
  speed: 5, vx: 0, vy: 0,
  shootCooldown: 0, shootRate: 14,
  invincible: 0,
  thrusterFlicker: 0,
  reset() {
    this.x = canvas.width / 2;
    this.y = canvas.height * 0.82;
    this.vx = 0; this.vy = 0;
    this.invincible = 120;
  }
};

function drawPlayer() {
  if (player.invincible > 0 && Math.floor(player.invincible / 5) % 2 === 0) return;
  const { x, y, w, h } = player;
  ctx.save();
  ctx.translate(x, y);

  // thruster glow
  player.thrusterFlicker = (player.thrusterFlicker + 0.25) % (Math.PI * 2);
  const thrLen = 18 + 10 * Math.abs(Math.sin(player.thrusterFlicker));
  const thrGrd = ctx.createLinearGradient(0, 6, 0, 6 + thrLen);
  thrGrd.addColorStop(0, 'rgba(0,200,255,0.9)');
  thrGrd.addColorStop(0.5, 'rgba(120,50,255,0.6)');
  thrGrd.addColorStop(1, 'rgba(120,50,255,0)');
  ctx.beginPath();
  ctx.moveTo(-7, 6);
  ctx.lineTo(7, 6);
  ctx.lineTo(4, 6 + thrLen);
  ctx.lineTo(-4, 6 + thrLen);
  ctx.closePath();
  ctx.fillStyle = thrGrd;
  ctx.fill();

  // Hull
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.lineTo(w / 2, h / 3);
  ctx.lineTo(w / 3, h / 2);
  ctx.lineTo(-w / 3, h / 2);
  ctx.lineTo(-w / 2, h / 3);
  ctx.closePath();
  const hullGrd = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  hullGrd.addColorStop(0, '#a0e8ff');
  hullGrd.addColorStop(0.5, '#2060c0');
  hullGrd.addColorStop(1, '#0a1a50');
  ctx.fillStyle = hullGrd;
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,200,255,0.8)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Cockpit
  ctx.beginPath();
  ctx.ellipse(0, -h / 6, 8, 12, 0, 0, Math.PI * 2);
  const cGrd = ctx.createRadialGradient(-2, -h / 6 - 3, 1, 0, -h / 6, 10);
  cGrd.addColorStop(0, 'rgba(200,240,255,0.9)');
  cGrd.addColorStop(1, 'rgba(0,80,160,0.5)');
  ctx.fillStyle = cGrd;
  ctx.fill();

  // Wing accents
  ctx.strokeStyle = 'rgba(0,200,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(w / 2, h / 3); ctx.lineTo(w / 4, -h / 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-w / 2, h / 3); ctx.lineTo(-w / 4, -h / 6); ctx.stroke();

  ctx.restore();
}

// ── Bullets ──────────────────────────────────────────────────
const bullets = [];
const enemyBullets = [];

function spawnBullet() {
  bullets.push({ x: player.x, y: player.y - player.h / 2 - 4, w: 4, h: 14, vy: -12 });
}

function drawBullets() {
  for (const b of bullets) {
    const grd = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.3, '#00eeff');
    grd.addColorStop(1, 'rgba(0,100,255,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.roundRect(b.x - b.w / 2, b.y - b.h, b.w, b.h, 3);
    ctx.fill();
    // glow
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00eeff';
    ctx.fillStyle = 'rgba(0,230,255,0.3)';
    ctx.beginPath();
    ctx.roundRect(b.x - b.w / 2 - 2, b.y - b.h - 2, b.w + 4, b.h + 4, 4);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawEnemyBullets() {
  for (const b of enemyBullets) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff3060';
    const grd = ctx.createLinearGradient(b.x, b.y, b.x, b.y + 14);
    grd.addColorStop(0, '#ff3060');
    grd.addColorStop(1, 'rgba(255,60,60,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.roundRect(b.x - 3, b.y, 6, 14, 3);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// ── Enemies ──────────────────────────────────────────────────
const enemies = [];
const ENEMY_TYPES = [
  { hp: 1, pts: 100, w: 36, h: 30, speed: 1.2, color: '#ff4466', accentColor: '#ff88aa', shootRate: 0 },
  { hp: 2, pts: 200, w: 40, h: 34, speed: 0.9, color: '#ff8822', accentColor: '#ffcc66', shootRate: 180 },
  { hp: 4, pts: 500, w: 54, h: 44, speed: 0.6, color: '#cc22ff', accentColor: '#ee88ff', shootRate: 90 },
];

function spawnWave() {
  const cols = Math.min(5 + wave, 9);
  const typeIdx = Math.min(Math.floor((wave - 1) / 3), 2);
  const type = ENEMY_TYPES[typeIdx];
  const spacing = Math.min((canvas.width - 80) / cols, 80);
  const startX = (canvas.width - spacing * (cols - 1)) / 2;

  for (let i = 0; i < cols; i++) {
    const rows = wave < 3 ? 2 : wave < 6 ? 3 : 4;
    for (let r = 0; r < rows; r++) {
      enemies.push({
        x: startX + i * spacing,
        y: 60 + r * 58,
        w: type.w, h: type.h,
        hp: type.hp, maxHp: type.hp,
        pts: type.pts,
        speed: type.speed * (1 + wave * 0.08),
        color: type.color,
        accentColor: type.accentColor,
        shootRate: type.shootRate,
        shootTimer: Math.floor(Math.random() * (type.shootRate || 999)),
        dx: 1,
        wobbleOffset: Math.random() * Math.PI * 2,
        hit: 0,
      });
    }
  }
}

function drawEnemy(e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const flash = e.hit > 0 ? e.hit / 8 : 0;

  ctx.shadowBlur = 14 + flash * 20;
  ctx.shadowColor = flash > 0 ? '#ffffff' : e.color;

  // Body
  ctx.beginPath();
  ctx.moveTo(0, -e.h / 2);
  ctx.lineTo(e.w / 2, e.h / 4);
  ctx.lineTo(e.w / 3, e.h / 2);
  ctx.lineTo(-e.w / 3, e.h / 2);
  ctx.lineTo(-e.w / 2, e.h / 4);
  ctx.closePath();
  const grd = ctx.createLinearGradient(0, -e.h / 2, 0, e.h / 2);
  grd.addColorStop(0, flash > 0 ? '#ffffff' : e.accentColor);
  grd.addColorStop(1, flash > 0 ? '#ffffff' : e.color);
  ctx.fillStyle = grd;
  ctx.fill();
  ctx.strokeStyle = flash > 0 ? '#ffffff' : e.accentColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Core glow
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fillStyle = flash > 0 ? 'white' : `rgba(255,255,255,0.7)`;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ── Particles ─────────────────────────────────────────────────
const particles = [];

function explode(x, y, color = '#ff8844', count = 18) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 1;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: Math.random() * 4 + 1.5,
      alpha: 1,
      color,
      decay: Math.random() * 0.025 + 0.015,
    });
  }
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.04;
    p.alpha -= p.decay;
    if (p.alpha <= 0) { particles.splice(i, 1); continue; }
    ctx.globalAlpha = p.alpha;
    ctx.shadowBlur = 8; ctx.shadowColor = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
}

// ── HUD ───────────────────────────────────────────────────────
function drawHUD() {
  // Top bar background
  ctx.fillStyle = 'rgba(0,5,20,0.7)';
  ctx.fillRect(0, 0, canvas.width, 48);

  ctx.font = 'bold 14px "Orbitron", monospace';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = 6; ctx.shadowColor = '#00eeff';

  // Score
  ctx.fillStyle = '#00eeff';
  ctx.textAlign = 'left';
  ctx.fillText('SCORE', 14, 16);
  ctx.font = 'bold 20px "Orbitron", monospace';
  ctx.fillText(score.toString().padStart(6, '0'), 14, 36);

  // High Score
  ctx.font = 'bold 12px "Orbitron", monospace';
  ctx.fillStyle = '#aa88ff';
  ctx.textAlign = 'center';
  ctx.fillText('BEST', canvas.width / 2, 16);
  ctx.font = 'bold 18px "Orbitron", monospace';
  ctx.fillText(highScore.toString().padStart(6, '0'), canvas.width / 2, 36);

  // Wave
  ctx.font = 'bold 12px "Orbitron", monospace';
  ctx.fillStyle = '#ffcc44';
  ctx.textAlign = 'right';
  ctx.fillText('WAVE', canvas.width - 14, 16);
  ctx.font = 'bold 20px "Orbitron", monospace';
  ctx.fillText(wave.toString().padStart(2, '0'), canvas.width - 14, 36);

  // Lives
  ctx.shadowBlur = 0;
  for (let i = 0; i < lives; i++) {
    drawMiniShip(16 + i * 26, canvas.height - 22);
  }
}

function drawMiniShip(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(0.45, 0.45);
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(22, 16);
  ctx.lineTo(14, 24);
  ctx.lineTo(-14, 24);
  ctx.lineTo(-22, 16);
  ctx.closePath();
  ctx.fillStyle = '#4488ff';
  ctx.fill();
  ctx.restore();
}

// ── Screens ───────────────────────────────────────────────────
function drawSplash() {
  // Title
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Glow title
  ctx.font = `bold ${Math.min(canvas.width * 0.1, 64)}px "Orbitron", monospace`;
  ctx.shadowBlur = 30; ctx.shadowColor = '#00eeff';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('VOID', canvas.width / 2, canvas.height * 0.28);
  ctx.shadowBlur = 20; ctx.shadowColor = '#aa44ff';
  ctx.fillStyle = '#aa88ff';
  ctx.fillText('STRIKER', canvas.width / 2, canvas.height * 0.38);
  ctx.shadowBlur = 0;

  // Decorative line
  const lx = canvas.width / 2;
  ctx.strokeStyle = 'rgba(0,200,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(lx - 120, canvas.height * 0.44);
  ctx.lineTo(lx + 120, canvas.height * 0.44);
  ctx.stroke();

  // Controls info
  ctx.font = '13px "Share Tech Mono", monospace';
  ctx.fillStyle = 'rgba(180,200,255,0.7)';
  ctx.fillText('📱 ARRASTAR: mover | TOCAR: atirar', canvas.width / 2, canvas.height * 0.52);
  ctx.fillText('⌨️  WASD / setas | ESPAÇO: atirar', canvas.width / 2, canvas.height * 0.58);

  // High score
  if (highScore > 0) {
    ctx.font = 'bold 13px "Orbitron", monospace';
    ctx.fillStyle = '#ffcc44';
    ctx.fillText(`RECORDE: ${highScore.toString().padStart(6, '0')}`, canvas.width / 2, canvas.height * 0.66);
  }

  // Pulse start
  const pulse = 0.7 + 0.3 * Math.sin(frameCount * 0.05);
  ctx.globalAlpha = pulse;
  ctx.font = `bold ${Math.min(canvas.width * 0.05, 22)}px "Orbitron", monospace`;
  ctx.shadowBlur = 10; ctx.shadowColor = '#00eeff';
  ctx.fillStyle = '#00eeff';
  ctx.fillText('TOQUE PARA INICIAR', canvas.width / 2, canvas.height * 0.76);
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,10,0.65)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = `bold ${Math.min(canvas.width * 0.1, 56)}px "Orbitron", monospace`;
  ctx.shadowBlur = 24; ctx.shadowColor = '#ff3060';
  ctx.fillStyle = '#ff3060';
  ctx.fillText('GAME OVER', canvas.width / 2, canvas.height * 0.32);

  ctx.font = 'bold 18px "Orbitron", monospace';
  ctx.shadowBlur = 8; ctx.shadowColor = '#00eeff';
  ctx.fillStyle = '#00eeff';
  ctx.fillText(`PONTOS: ${score.toString().padStart(6, '0')}`, canvas.width / 2, canvas.height * 0.46);

  if (score >= highScore && score > 0) {
    ctx.shadowColor = '#ffcc44';
    ctx.fillStyle = '#ffcc44';
    ctx.fillText('✦ NOVO RECORDE! ✦', canvas.width / 2, canvas.height * 0.54);
  } else if (highScore > 0) {
    ctx.fillStyle = '#aa88ff';
    ctx.fillText(`RECORDE: ${highScore.toString().padStart(6, '0')}`, canvas.width / 2, canvas.height * 0.54);
  }

  const pulse = 0.7 + 0.3 * Math.sin(frameCount * 0.05);
  ctx.globalAlpha = pulse;
  ctx.font = 'bold 18px "Orbitron", monospace';
  ctx.shadowBlur = 10; ctx.shadowColor = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('TOQUE PARA JOGAR DE NOVO', canvas.width / 2, canvas.height * 0.66);
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}

// ── Input ─────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup', e => { keys[e.code] = false; });

// Touch
let touchX = null, touchY = null, touchStartX = null, touchStartY = null;
let tapShoot = false;

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (gameState !== 'playing') { startGame(); return; }
  const t = e.touches[0];
  touchStartX = t.clientX; touchStartY = t.clientY;
  touchX = t.clientX; touchY = t.clientY;
  tapShoot = true;
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if (gameState !== 'playing') return;
  const t = e.touches[0];
  const dx = t.clientX - touchX;
  const dy = t.clientY - touchY;
  player.x = Math.max(player.w / 2, Math.min(canvas.width - player.w / 2, player.x + dx * 1.2));
  player.y = Math.max(60, Math.min(canvas.height - player.h / 2, player.y + dy * 1.2));
  touchX = t.clientX; touchY = t.clientY;
  tapShoot = false;
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  if (tapShoot && gameState === 'playing') spawnBullet();
  touchX = null; touchY = null;
}, { passive: false });

canvas.addEventListener('click', () => {
  if (gameState !== 'playing') startGame();
});

// ── Game Logic ────────────────────────────────────────────────
function startGame() {
  score = 0; lives = 3; wave = 1;
  bullets.length = 0;
  enemyBullets.length = 0;
  enemies.length = 0;
  particles.length = 0;
  player.reset();
  spawnWave();
  gameState = 'playing';
}

function updatePlayer(dt) {
  if (keys['ArrowLeft'] || keys['KeyA']) player.x -= player.speed * dt * 0.06;
  if (keys['ArrowRight'] || keys['KeyD']) player.x += player.speed * dt * 0.06;
  if (keys['ArrowUp'] || keys['KeyW']) player.y -= player.speed * dt * 0.06;
  if (keys['ArrowDown'] || keys['KeyS']) player.y += player.speed * dt * 0.06;

  player.x = Math.max(player.w / 2, Math.min(canvas.width - player.w / 2, player.x));
  player.y = Math.max(60, Math.min(canvas.height - player.h / 2, player.y));

  if (player.invincible > 0) player.invincible--;

  player.shootCooldown--;
  if ((keys['Space'] || keys['KeyZ']) && player.shootCooldown <= 0) {
    spawnBullet();
    player.shootCooldown = player.shootRate;
  }
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y += bullets[i].vy;
    if (bullets[i].y < -20) bullets.splice(i, 1);
  }
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    enemyBullets[i].y += enemyBullets[i].vy;
    if (enemyBullets[i].y > canvas.height + 20) enemyBullets.splice(i, 1);
  }
}

function updateEnemies(dt) {
  let hitEdge = false;
  for (const e of enemies) {
    e.wobbleOffset += 0.02;
    e.x += e.dx * e.speed * (dt * 0.05);
    e.y += Math.sin(e.wobbleOffset) * 0.3;
    if (e.hit > 0) e.hit--;
    if (e.x + e.w / 2 > canvas.width - 10 || e.x - e.w / 2 < 10) hitEdge = true;
    if (e.shootRate > 0) {
      e.shootTimer--;
      if (e.shootTimer <= 0) {
        enemyBullets.push({ x: e.x, y: e.y + e.h / 2, vy: 4 + wave * 0.15 });
        e.shootTimer = e.shootRate - wave * 2;
      }
    }
  }
  if (hitEdge) {
    for (const e of enemies) {
      e.dx *= -1;
      e.y += 14;
    }
  }
}

function checkCollisions() {
  // Bullets vs enemies
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];
      if (Math.abs(b.x - e.x) < e.w / 2 + 2 && Math.abs(b.y - e.y) < e.h / 2 + 6) {
        bullets.splice(bi, 1);
        e.hp--;
        e.hit = 8;
        if (e.hp <= 0) {
          score += e.pts;
          if (score > highScore) { highScore = score; localStorage.setItem('voidHighScore', highScore); }
          explode(e.x, e.y, e.color, 22);
          enemies.splice(ei, 1);
        }
        break;
      }
    }
  }

  // Enemy bullets vs player
  if (player.invincible <= 0) {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      if (Math.abs(b.x - player.x) < player.w / 2 - 4 && Math.abs(b.y - player.y) < player.h / 2 - 4) {
        enemyBullets.splice(i, 1);
        loseLife();
      }
    }
    // Enemies vs player
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (Math.abs(e.x - player.x) < (e.w + player.w) / 2 - 8 && Math.abs(e.y - player.y) < (e.h + player.h) / 2 - 8) {
        explode(e.x, e.y, e.color, 22);
        enemies.splice(i, 1);
        loseLife();
      }
    }
  }
}

function loseLife() {
  lives--;
  explode(player.x, player.y, '#00eeff', 28);
  if (lives <= 0) {
    gameState = 'gameover';
  } else {
    player.invincible = 150;
  }
}

// ── Loop ──────────────────────────────────────────────────────
function loop(timestamp) {
  const dt = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;
  frameCount++;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#030814';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawNebulae();
  drawStars(dt);

  if (gameState === 'splash') {
    drawPlayer();
    drawSplash();
  } else if (gameState === 'playing') {
    updatePlayer(dt);
    updateBullets();
    updateEnemies(dt);
    checkCollisions();

    if (enemies.length === 0 && gameState === 'playing') {
      wave++;
      bullets.length = 0;
      enemyBullets.length = 0;
      spawnWave();
    }

    for (const e of enemies) drawEnemy(e);
    drawBullets();
    drawEnemyBullets();
    drawParticles();
    drawPlayer();
    drawHUD();
  } else if (gameState === 'gameover') {
    drawParticles();
    drawGameOver();
  }

  animFrame = requestAnimationFrame(loop);
}

// Init
player.reset();
requestAnimationFrame(ts => { lastTime = ts; loop(ts); });
