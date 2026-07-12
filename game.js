// ============================================================
// GAME STATE
// ============================================================
let map;
let camera = { x: 0, y: 0 };
let gameState = 'playing';
let score = 0;
let books = 0;
let timeLeft = GAME_TIME;
let deathTimer = 0;
let victoryTimer = 0;
let particles = [];
let booksHit = [];
let frameCount = 0;
let clouds = [];
let cloudTimer = 0;
let swapCooldown = 0;

const keys = {};

let currentLevel = 0;
let lastCompletedLevel = -1;
const playerAbilities = { ranged: false, ultimate: false };
const abilityState = { rangedCooldown: 0, ultimateUsed: false, freezeTimer: 0, bigTimer: 0 };
let showAbilityNotification = null;

function loadLevel(idx) {
  currentLevel = idx;
  const lvl = LEVELS[idx] || LEVELS[0];
  for (let i = 0; i <= idx; i++) {
    const l = LEVELS[i];
    if (l) {
      for (const a of l.abilitiesUnlocked) playerAbilities[a] = true;
    }
  }
  map = buildLevel();
  resetPlayer();
  initEntities();
  initClouds();
  camera.x = 0;
  gameState = 'playing';
  deathTimer = 0; victoryTimer = 0;
  timeLeft = lvl.time;
  score = 0; books = 0;
  particles = []; booksHit = [];
  swapCooldown = 0;
  abilityState.rangedCooldown = 0;
  abilityState.ultimateUsed = false;
  abilityState.freezeTimer = 0;
  abilityState.bigTimer = 0;
  showAbilityNotification = null;
  stopMusic();
  startMusic();
}

function advanceLevel() {
  if (currentLevel >= LEVELS.length - 1) return;
  const next = currentLevel + 1;
  for (const a of LEVELS[next].abilitiesUnlocked) {
    if (!playerAbilities[a]) showAbilityNotification = { ability: a, timer: 180 };
    playerAbilities[a] = true;
  }
  loadLevel(next);
}

function checkUnlockCode(code) {
  const upper = code.toUpperCase();
  for (let i = 0; i < LEVELS.length; i++) {
    if (LEVELS[i].unlockCode === upper) {
      for (let j = 0; j <= i; j++) {
        for (const a of LEVELS[j].abilitiesUnlocked) playerAbilities[a] = true;
      }
      loadLevel(i);
      return true;
    }
  }
  return false;
}

function initClouds() {
  clouds = [];
  for (let i = 0; i < 12; i++) {
    clouds.push({
      x: Math.random() * COLS * TILE, y: 20 + Math.random() * 120,
      w: 40 + Math.random() * 80, speed: 0.1 + Math.random() * 0.2,
      opacity: 0.2 + Math.random() * 0.4,
    });
  }
}

// ============================================================
// PLAYER
// ============================================================
const player = {
  x: 3 * TILE, y: GROUND_ROW * TILE - 30,
  w: 20, h: 30,
  vx: 0, vy: 0,
  state: 'small',
  onGround: false,
  jumpsLeft: MAX_JUMPS,
  facing: 1,
  squatting: false,
  running: false,
  invincible: 0,
  jumpHeld: false,
  walkFrame: 0, walkTimer: 0, idleTimer: 0,
  charIdx: CHAR.PRINCESS,
};

let currentChar = CHAR.PRINCESS;

function applyCharData(idx) {
  const d = CHAR_DATA[idx];
  const wasLarge = player.state === 'large';
  player.w = wasLarge ? d.lw : d.sw;
  player.h = wasLarge ? d.lh : d.sh;
  player.charIdx = idx;
}

function swapCharacter() {
  if (swapCooldown > 0) return;
  const next = (currentChar + 1) % CHAR_DATA.length;
  currentChar = next;
  applyCharData(next);
  swapCooldown = 20;

  const cd = CHAR_DATA[currentChar];
  const colors = {
    princess: ['#FF69B4','#FFD700','#FFF'],
    jordi: ['#C0C0C0','#FFD700','#CC0000'],
    dragon: ['#5a8a4a','#FF6600','#FFD700'],
  };
  const pal = colors[cd.id] || ['#FFF'];
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: player.x + player.w/2, y: player.y + player.h/2,
      vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8,
      life: 30, size: 3,
      color: pal[Math.floor(Math.random()*pal.length)],
      type: 'transform',
    });
  }
}

function resetPlayer() {
  player.x = 3 * TILE;
  player.y = GROUND_ROW * TILE - 30;
  player.vx = 0; player.vy = 0;
  player.state = 'small';
  player.onGround = false;
  player.jumpsLeft = MAX_JUMPS;
  player.facing = 1;
  player.squatting = false;
  player.running = false;
  player.invincible = 0;
  player.jumpHeld = false;
  player.walkFrame = 0; player.walkTimer = 0;
  currentChar = CHAR.PRINCESS;
  player.charIdx = CHAR.PRINCESS;
  applyCharData(CHAR.PRINCESS);
}

// ============================================================
// ENEMIES & ITEMS
// ============================================================
let enemies = [];
let items = [];
let projectiles = [];

function spawnDragonet(col, row) {
  enemies.push({
    type: 'dragonet',
    x: col * TILE, y: row * TILE,
    w: 28, h: 28,
    vx: -DRAGONET_SPEED, vy: 0,
    alive: true, squished: false, squishTimer: 0,
    walkFrame: 0, walkTimer: 0,
    startX: col * TILE,
    patrolRange: 80 + Math.random() * 60,
  });
}

function spawnShooter(col, row) {
  enemies.push({
    type: 'shooter',
    x: col * TILE, y: row * TILE,
    w: 28, h: 28,
    vx: -SHOOTER_SPEED, vy: 0,
    alive: true, squished: false, squishTimer: 0,
    walkFrame: 0, walkTimer: 0,
    startX: col * TILE,
    patrolRange: 100 + Math.random() * 60,
    shootTimer: 90 + Math.random() * 60,
  });
}

function spawnItem(x, y, type) {
  items.push({
    type: type, x: x, y: y,
    w: 16, h: 16,
    collected: false,
    vy: -5, vx: 0,
    bobTimer: Math.random() * 100,
    sparkleTimer: 0,
  });
}

function initEntities() {
  enemies = []; items = []; booksHit = []; projectiles = [];
  const lvl = LEVELS[currentLevel] || LEVELS[0];
  const spawns = window._lastSpawns || [];

  let dragonetCount = 0;
  let shooterCount = 0;
  for (const et of lvl.enemies) {
    if (et === 'shooter') shooterCount++;
    else dragonetCount++;
  }

  for (const s of spawns) {
    if (s.col > 0 && s.col < COLS - 5) {
      if (shooterCount > 0) {
        spawnShooter(s.col, s.row);
        shooterCount--;
      } else {
        spawnDragonet(s.col, s.row);
        dragonetCount--;
      }
    }
  }

  const needed = Math.max(0, lvl.maxEnemies - enemies.length);
  for (let i = 0; i < needed + 2; i++) {
    if (enemies.length >= lvl.maxEnemies) break;
    const col = 20 + i * 35;
    if (col < levelEnd) {
      if (shooterCount > 0) {
        spawnShooter(col, GroundRowFromCol(col) - 1);
        shooterCount--;
      } else {
        spawnDragonet(col, GroundRowFromCol(col) - 1);
      }
    }
  }
}

function GroundRowFromCol(col) {
  for (let r = 0; r < ROWS; r++) {
    const t = map[r][col];
    if (t === 1 || t === 2 || t === 3 || t === 9) return r;
  }
  return GROUND_ROW;
}

// ============================================================
// COLLISION — Iterative AABB
// ============================================================
function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function getTile(col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return 0;
  return map[row][col];
}

function isSolid(tile) {
  return tile === 1 || tile === 2 || tile === 3 || tile === 4 || tile === 8 || tile === 9;
}

function resolveCollisions(entity) {
  let result = { top: false, bottom: false, left: false, right: false };

  for (let pass = 0; pass < 5; pass++) {
    let resolved = false;
    const left   = Math.floor(entity.x / TILE);
    const right  = Math.floor((entity.x + entity.w - 1) / TILE);
    const top    = Math.floor(entity.y / TILE);
    const bottom = Math.floor((entity.y + entity.h - 1) / TILE);

    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        const tile = getTile(c, r);
        if (!isSolid(tile)) continue;

        const tr = { x: c * TILE, y: r * TILE, w: TILE, h: TILE };
        if (!aabb(entity, tr)) continue;

        const ol = (entity.x + entity.w) - tr.x;
        const or2 = (tr.x + tr.w) - entity.x;
        const ot = (entity.y + entity.h) - tr.y;
        const ob = (tr.y + tr.h) - entity.y;
        const min = Math.min(ol, or2, ot, ob);

        if (min === ol) {
          if (entity.y + entity.h >= tr.y - 3 && entity.y + entity.h <= tr.y + 6) continue;
          entity.x = tr.x - entity.w;
          entity.vx = 0;
          result.right = true; resolved = true;
        } else if (min === or2) {
          if (entity.y + entity.h >= tr.y - 3 && entity.y + entity.h <= tr.y + 6) continue;
          entity.x = tr.x + tr.w;
          entity.vx = 0;
          result.left = true; resolved = true;
        } else if (min === ot) {
          entity.y = tr.y - entity.h;
          entity.vy = 0;
          entity.onGround = true;
          result.bottom = true; resolved = true;
        } else if (min === ob) {
          entity.y = tr.y + tr.h;
          entity.vy = 0;
          result.top = true; resolved = true;
          if ((tile === 4 || tile === 8) && entity === player && !booksHit.includes(`${c},${r}`)) hitBook(c, r, tile);
          if (tile === 2 && entity === player && player.state === 'large') breakWall(c, r);
        }
      }
    }
    if (!resolved) break;
  }
  return result;
}

// ============================================================
// INTERACTIONS
// ============================================================
function hitBook(col, row, tileType) {
  if (booksHit.includes(`${col},${row}`)) return;
  booksHit.push(`${col},${row}`);
  map[row][col] = 0;
  const isRed = (tileType === 8);
  spawnItem(col * TILE + 8, row * TILE - 18, isRed ? 'red' : 'gold');
  if (!isRed) score += 100;
  for (let i = 0; i < 14; i++) {
    const angle = (Math.PI * 2 * i) / 14;
    particles.push({
      x: col * TILE + 16, y: row * TILE + 16,
      vx: Math.cos(angle) * 3.5, vy: Math.sin(angle) * 3.5 - 1,
      life: 28, size: 3, color: '#C4963C', type: 'sparkle',
    });
  }
}

function breakWall(col, row) {
  if (map[row][col] !== 2) return;
  map[row][col] = 0;
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: col * TILE + 16, y: row * TILE + 16,
      vx: (Math.random()-0.5)*7, vy: (Math.random()-0.5)*7 - 3,
      life: 35, size: 3+Math.random()*4,
      color: ['#999','#aaa','#888','#777'][Math.floor(Math.random()*4)],
      type: 'debris',
    });
  }
}

// ============================================================
// PROJECTILE SYSTEM
// ============================================================
function fireProjectile() {
  if (!playerAbilities.ranged || abilityState.rangedCooldown > 0) return;
  const p = player;
  const dir = p.facing;
  const cd = CHAR_DATA[currentChar];
  let w, h, speed, projType, color;

  switch (cd.rangedType) {
    case 'dagger':
      w = 10; h = 3; speed = 9;
      projType = 'dagger'; color = '#C0C0C0';
      break;
    case 'lance':
      w = 18; h = 4; speed = 7;
      projType = 'lance'; color = '#AAA';
      break;
    default: // fireball
      w = 12; h = 10; speed = 5;
      projType = 'fireball'; color = '#FF6600';
      break;
  }

  projectiles.push({
    x: p.x + (dir > 0 ? p.w : -w),
    y: p.y + 8,
    w, h,
    vx: dir * speed,
    vy: 0,
    type: projType,
    color,
    fromPlayer: true,
    alive: true,
    life: 50,
    gravity: (projType === 'fireball' ? 0.08 : 0),
  });

  abilityState.rangedCooldown = 25;
}

function updateProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const pr = projectiles[i];
    if (!pr.alive) { projectiles.splice(i, 1); continue; }
    pr.life--;
    if (pr.life <= 0) { projectiles.splice(i, 1); continue; }
    pr.vy += pr.gravity || 0;
    pr.x += pr.vx;
    pr.y += pr.vy;
    const prevGround = false;
    resolveCollisions(pr);
    if (pr.y > ROWS * TILE + 32) { projectiles.splice(i, 1); continue; }

    let hit = false;
    if (pr.fromPlayer) {
      for (const e of enemies) {
        if (!e.alive || e.squished) continue;
        if (aabb(pr, e)) {
          e.alive = false;
          score += 50;
          for (let j = 0; j < 12; j++) particles.push({
            x: e.x + e.w/2, y: e.y + e.h/2,
            vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5 - 2,
            life: 20, size: 3, color: pr.color, type: 'hit',
          });
          hit = true; break;
        }
      }
    }
    if (hit) { projectiles.splice(i, 1); }
  }
}

function useUltimate() {
  if (!playerAbilities.ultimate || abilityState.ultimateUsed) return;
  abilityState.ultimateUsed = true;
  const cd = CHAR_DATA[currentChar];

  switch (cd.ultimate) {
    case 'freeze': // Princess: freeze enemies
      abilityState.freezeTimer = 180;
      for (let i = 0; i < 30; i++) particles.push({
        x: player.x + Math.random() * player.w,
        y: player.y + Math.random() * player.h,
        vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4,
        life: 40, size: 3, color: '#88CCFF', type: 'sparkle',
      });
      break;
    case 'big': // Jordi: become large
      if (player.state !== 'large') {
        player.state = 'large';
        const d = CHAR_DATA[currentChar];
        player.w = d.lw; player.h = d.lh;
        player.y -= 10;
      }
      abilityState.bigTimer = 300;
      player.invincible = 300;
      for (let i = 0; i < 25; i++) particles.push({
        x: player.x + player.w/2, y: player.y + player.h/2,
        vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8,
        life: 40, size: 4, color: '#FFD700', type: 'transform',
      });
      break;
    case 'flame': // Dragon: burn all visible enemies
      for (const e of enemies) {
        if (!e.alive || e.squished) continue;
        const sx = e.x - camera.x;
        if (sx < -e.w || sx > canvas.width + e.w) continue;
        e.alive = false;
        score += 50;
        for (let j = 0; j < 15; j++) particles.push({
          x: e.x + e.w/2, y: e.y + e.h/2,
          vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6 - 3,
          life: 30, size: 4, color: '#FF4400', type: 'fire',
        });
      }
      for (let i = 0; i < 40; i++) particles.push({
        x: player.x + player.w/2 + (Math.random()-0.5)*80,
        y: player.y + player.h/2 + (Math.random()-0.5)*60,
        vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5 - 2,
        life: 35, size: 5+Math.random()*5,
        color: ['#FF6600','#FF4400','#FFD700','#FF2200'][Math.floor(Math.random()*4)],
        type: 'fire',
      });
      break;
  }
}

function killPlayer() {
  if (player.state === 'dead') return;
  player.state = 'dead';
  gameState = 'dead';
  deathTimer = 150;
  const cd = CHAR_DATA[currentChar];
  const pal = cd.id === 'dragon' ? ['#5a8a4a','#8a5a3a','#FF6600','#FFD700']
    : cd.id === 'jordi' ? ['#C0C0C0','#CC0000','#FFD700','#FFF']
    : ['#FF69B4','#FFB6C1','#FFD700','#FFF'];
  for (let i = 0; i < 25; i++) {
    particles.push({
      x: player.x + player.w/2, y: player.y + player.h/2,
      vx: (Math.random()-0.5)*9, vy: (Math.random()-0.5)*9 - 4,
      life: 45, size: 2+Math.random()*4,
      color: pal[Math.floor(Math.random()*pal.length)],
      type: 'death',
    });
  }
  stopMusic();
}

// ============================================================
// UPDATE
// ============================================================
function update() {
  frameCount++;
  if (swapCooldown > 0) swapCooldown--;

  if (gameState === 'dead') {
    deathTimer--; updateParticles();
    if (deathTimer <= 0) restartGame();
    return;
  }
  if (gameState === 'victory') {
    victoryTimer--; updateParticles();
    if (victoryTimer <= 0) restartGame();
    return;
  }

  if (timeLeft > 0) {
    timeLeft -= 1/60;
    if (timeLeft <= 0) { timeLeft = 0; killPlayer(); return; }
  }

  if (!musicPlaying && (keys['ArrowLeft'] || keys['ArrowRight'] || keys['Space'] || keys['ArrowUp'])) {
    startMusic();
  }

  // Character swap
  if (keys['KeyC'] && gameState === 'playing') {
    keys['KeyC'] = false;
    swapCharacter();
  }

  // Ranged attack
  if (keys['KeyX'] && gameState === 'playing') {
    fireProjectile();
    keys['KeyX'] = false;
  }

  // Ultimate
  if (keys['KeyZ'] && gameState === 'playing' && playerAbilities.ultimate && !abilityState.ultimateUsed) {
    useUltimate();
    keys['KeyZ'] = false;
  }

  // Ability cooldowns
  if (abilityState.rangedCooldown > 0) abilityState.rangedCooldown--;
  if (abilityState.freezeTimer > 0) abilityState.freezeTimer--;
  if (abilityState.bigTimer > 0) {
    abilityState.bigTimer--;
    if (abilityState.bigTimer <= 0 && player.state === 'large') {
      player.state = 'small';
      const d = CHAR_DATA[currentChar];
      player.w = d.sw; player.h = d.sh;
    }
  }
  if (showAbilityNotification) {
    showAbilityNotification.timer--;
    if (showAbilityNotification.timer <= 0) showAbilityNotification = null;
  }

  // ---- Player ----
  const p = player;
  let moveX = 0;
  if (keys['ArrowLeft'] || keys['KeyA']) moveX = -1;
  if (keys['ArrowRight'] || keys['KeyD']) moveX = 1;
  p.running = !!(keys['ShiftLeft'] || keys['ShiftRight']);
  p.squatting = !!(keys['ArrowDown'] || keys['KeyS']) && p.onGround;

  const maxSpeed = p.running ? PLAYER_RUN_SPEED : PLAYER_MAX_SPEED;
  if (moveX !== 0) {
    p.vx += moveX * PLAYER_ACCEL;
    p.facing = moveX;
    if (Math.abs(p.vx) > maxSpeed) p.vx = Math.sign(p.vx) * maxSpeed;
  } else {
    p.vx *= PLAYER_FRICTION;
    if (Math.abs(p.vx) < 0.15) p.vx = 0;
  }

  const jumpKey = keys['Space'] || keys['ArrowUp'] || keys['KeyW'];
  if (jumpKey && p.jumpsLeft > 0 && !p.jumpHeld) {
    p.vy = JUMP_FORCE;
    p.jumpsLeft--;
    p.onGround = false;
    p.jumpHeld = true;
    if (currentChar === CHAR.DRAGON) {
      for (let i = 0; i < 8; i++) {
        particles.push({
          x: p.x + p.w/2 + (p.facing * (5 + Math.random()*10)),
          y: p.y + p.h/2 + (Math.random()-0.5)*8,
          vx: p.facing * (2 + Math.random()*3),
          vy: (Math.random()-0.5)*2 - 1,
          life: 15 + Math.random()*10,
          size: 4 + Math.random()*4,
          color: ['#FF6600','#FF4400','#FFD700','#FF2200'][Math.floor(Math.random()*4)],
          type: 'fire',
        });
      }
    }
  }
  if (!jumpKey) p.jumpHeld = false;

  if (p.vy < -3 && !jumpKey) p.vy *= 0.85;

  p.vy += GRAVITY;
  if (p.vy > 15) p.vy = 15;

  p.onGround = false;
  p.x += p.vx;
  resolveCollisions(p);
  p.y += p.vy;
  resolveCollisions(p);

  if (p.onGround) p.jumpsLeft = MAX_JUMPS;

  if (p.y > ROWS * TILE + 64) { killPlayer(); return; }
  if (p.x < 0) { p.x = 0; p.vx = 0; }
  if (p.x + p.w > COLS * TILE) { p.x = COLS * TILE - p.w; p.vx = 0; }
  if (p.invincible > 0) p.invincible--;

  // ---- Enemies ----
  const frozen = abilityState.freezeTimer > 0;
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.squished) { e.squishTimer--; if (e.squishTimer <= 0) e.alive = false; continue; }

    if (!frozen) {
      if (e.x < e.startX - e.patrolRange) e.vx = Math.abs(e.vx);
      if (e.x > e.startX + e.patrolRange) e.vx = -Math.abs(e.vx);

      const prevVx = e.vx;
      e.vy += GRAVITY;
      e.x += e.vx;
      const xCol = resolveCollisions(e);
      e.y += e.vy;
      resolveCollisions(e);
      if (xCol.left || xCol.right) e.vx = -prevVx;
      if (e.y > ROWS * TILE + 64) e.alive = false;

      e.walkTimer++;
      if (e.walkTimer > 8) { e.walkTimer = 0; e.walkFrame = (e.walkFrame + 1) % 2; }

      // Shooter AI
      if (e.type === 'shooter' && e.alive) {
        e.shootTimer--;
        if (e.shootTimer <= 0) {
          e.shootTimer = 90 + Math.random() * 60;
          const dx = player.x - e.x;
          const dy = player.y - e.y;
          if (Math.abs(dy) < 80 && Math.abs(dx) < 250) {
            const dir = dx < 0 ? -1 : 1;
            projectiles.push({
              x: e.x + (dir > 0 ? e.w : -8),
              y: e.y + e.h/2 - 3,
              w: 10, h: 4,
              vx: dir * 4,
              vy: 0,
              type: 'enemy_shot',
              color: '#FF4444',
              fromPlayer: false,
              alive: true,
              life: 60,
              gravity: 0.05,
            });
          }
        }
      }
    }

    if (aabb(p, e)) {
      const playerAbove = p.y + p.h <= e.y + e.h * 0.65;
      const falling = p.vy > 0;
      if (playerAbove && falling) {
        e.squished = true; e.squishTimer = 20;
        p.vy = -8; score += 50;
        for (let i = 0; i < 8; i++) particles.push({
          x: e.x + e.w/2, y: e.y + e.h/2,
          vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4 - 2,
          life: 20, size: 3, color: '#5a8a4a', type: 'squish',
        });
      } else if (p.invincible <= 0) {
        if (p.state === 'large') {
          p.state = 'small';
          p.invincible = 90;
          const d = CHAR_DATA[currentChar];
          p.w = d.sw; p.h = d.sh;
          p.vy = -6;
          for (let i = 0; i < 10; i++) particles.push({
            x: p.x + p.w/2, y: p.y + p.h/2,
            vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6 - 3,
            life: 25, size: 3, color: '#FFF', type: 'hit',
          });
        } else { killPlayer(); return; }
      }
    }
  }

  // ---- Items ----
  for (const item of items) {
    if (item.collected) continue;
    item.bobTimer++; item.sparkleTimer++;
    item.vy += GRAVITY; item.x += item.vx; item.y += item.vy;
    resolveCollisions(item); resolveCollisions(item);
    if (aabb(p, item)) {
      item.collected = true;
      const color = item.type === 'gold' ? '#C4963C' : '#CC0000';
      for (let i = 0; i < 14; i++) {
        const angle = (Math.PI * 2 * i) / 14;
        particles.push({
          x: item.x+8, y: item.y+8,
          vx: Math.cos(angle)*3, vy: Math.sin(angle)*3 - 1,
          life: 30, size: 3, color, type: 'collect',
        });
      }
      if (item.type === 'gold') { score += 200; books++; }
      else {
        if (p.state === 'small') {
          p.state = 'large';
          const d = CHAR_DATA[currentChar];
          p.w = d.lw; p.h = d.lh;
          p.y -= 10;
          const pal = currentChar === CHAR.DRAGON
            ? ['#FF6600','#FFD700','#5a8a4a','#FFF']
            : ['#FFD700','#FF69B4','#C0C0C0','#FFF'];
          for (let i = 0; i < 25; i++) particles.push({
            x: p.x + p.w/2, y: p.y + p.h/2,
            vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8,
            life: 40, size: 4,
            color: pal[Math.floor(Math.random()*pal.length)],
            type: 'transform',
          });
        }
        score += 500; books++;
      }
    }
    if (item.y > ROWS * TILE + 32) item.collected = true;
  }

  // ---- Projectiles ----
  updateProjectiles();

  // ---- Rescue target ----
  const rescueRect = { x: rescueCol * TILE, y: 9 * TILE, w: TILE, h: TILE * 3 };
  if (aabb(p, rescueRect)) {
    gameState = 'victory';
    victoryTimer = 300;
    score += Math.floor(timeLeft) * 10;
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      particles.push({
        x: canvas.width/2, y: canvas.height/2,
        vx: Math.cos(angle)*(2+Math.random()*5),
        vy: Math.sin(angle)*(2+Math.random()*5)-2,
        life: 70+Math.random()*30, size: 2+Math.random()*4,
        color: ['#FFD700','#FF4444','#FFF','#FF69B4','#C0C0C0'][Math.floor(Math.random()*5)],
        type: 'confetti',
      });
    }
    stopMusic();
  }

  updateParticles();

  // Camera
  const targetCam = p.x - canvas.width/2 + p.w/2;
  camera.x += (targetCam - camera.x) * 0.08;
  const levelBound = Math.max(levelEnd * TILE, COLS * TILE - canvas.width);
  camera.x = Math.max(0, Math.min(camera.x, levelBound));

  // Clouds
  cloudTimer++;
  if (cloudTimer > 120) {
    cloudTimer = 0;
    clouds.push({
      x: camera.x - 100, y: 20+Math.random()*100,
      w: 40+Math.random()*80, speed: 0.15+Math.random()*0.25,
      opacity: 0.2+Math.random()*0.4,
    });
    if (clouds.length > 20) clouds.shift();
  }
  for (const c of clouds) c.x += c.speed;
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx; pt.y += pt.vy;
    pt.vy += 0.08; pt.vx *= 0.98;
    pt.life--;
    if (pt.life <= 0 || pt.y > ROWS * TILE + 32) particles.splice(i, 1);
  }
}

// ============================================================
// RENDER
// ============================================================
function render() {
  // Sky
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#1a1a3a'); grad.addColorStop(0.12, '#2a3a6a');
  grad.addColorStop(0.3, '#4a7ab5'); grad.addColorStop(0.5, '#6a9ad5');
  grad.addColorStop(0.7, '#8ab8e8'); grad.addColorStop(1, '#b8d8f0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  for (let i = 0; i < 25; i++) {
    const sx = (i*137+50) % canvas.width;
    const sy = (i*89+30) % (canvas.height*0.2);
    ctx.fillRect(sx, sy, 1+(i%2), 1+(i%2));
  }

  // Mountains
  ctx.fillStyle = '#2a3a5a';
  for (let i = 0; i < 12; i++) {
    const mx = i*220 - (camera.x*0.12) % 2640;
    const mh = 70 + (i%6)*25;
    ctx.beginPath();
    ctx.moveTo(mx, canvas.height-75);
    ctx.lineTo(mx+55, canvas.height-75-mh);
    ctx.lineTo(mx+110, canvas.height-75);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 0; i < 12; i++) {
    const mx = i*220 - (camera.x*0.12) % 2640;
    const mh = 70 + (i%6)*25;
    ctx.beginPath();
    ctx.moveTo(mx+45, canvas.height-75-mh+8);
    ctx.lineTo(mx+55, canvas.height-75-mh);
    ctx.lineTo(mx+65, canvas.height-75-mh+8);
    ctx.fill();
  }

  // Hills
  ctx.fillStyle = '#3a6a3a';
  for (let i = 0; i < 10; i++) {
    const hx = i*180 - (camera.x*0.25) % 1800;
    const hw = 130+(i%5)*35;
    const hh = 35+(i%4)*18;
    ctx.beginPath();
    ctx.ellipse(hx, canvas.height-68+hh/2, hw, hh, 0, Math.PI, 0);
    ctx.fill();
  }
  ctx.fillStyle = '#4a8a4a';
  for (let i = 0; i < 7; i++) {
    const hx = i*260+50 - (camera.x*0.18) % 1820;
    const hw = 110+(i%3)*25;
    const hh = 25+(i%4)*12;
    ctx.beginPath();
    ctx.ellipse(hx, canvas.height-58+hh/2, hw, hh, 0, Math.PI, 0);
    ctx.fill();
  }

  // Trees
  const treeXs = [60,180,310,470,620,790,940,1080,1220,1380,1520,1680,1820,1980,2120,2280,2420,2580,2720,2880,3020,3180,3320,3480,3620,3780,3920,4080,4220,4380,4520,4680,4820,4980,5120,5280,5420,5580,5720,5880,6020,6180,6320,6480,6620,6780,6920,7080,7220,7380,7520,7680,7820,7980,8120,8280];
  for (const tx of treeXs) {
    const sx = tx - camera.x*0.45;
    if (sx < -60 || sx > canvas.width+60) continue;
    const h = 45+(tx*7%25);
    ctx.fillStyle = '#4a2a10';
    ctx.fillRect(sx-2, canvas.height-72-h, 5, h);
    ctx.fillStyle = '#2a6a2a';
    ctx.beginPath();
    ctx.arc(sx, canvas.height-74-h, 16+(tx%6), 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#3a8a3a';
    ctx.beginPath();
    ctx.arc(sx-5, canvas.height-68-h, 10+(tx%4), 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx+6, canvas.height-70-h, 9+(tx%5), 0, Math.PI*2);
    ctx.fill();
  }

  // Clouds
  for (const c of clouds) {
    const sx = c.x - camera.x*0.08;
    if (sx < -c.w || sx > canvas.width+c.w) continue;
    ctx.fillStyle = `rgba(255,255,255,${c.opacity*0.5})`;
    ctx.beginPath();
    ctx.ellipse(sx, c.y, c.w/2, c.w/6, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx - c.w*0.2, c.y+2, c.w*0.28, c.w*0.09, 0, 0, Math.PI*2);
    ctx.fill();
  }

  // ---- TILES ----
  const startCol = Math.max(0, Math.floor(camera.x/TILE));
  const endCol = Math.min(COLS, Math.ceil((camera.x+canvas.width)/TILE)+1);

  for (let r = 0; r < ROWS; r++) {
    for (let c = startCol; c < endCol; c++) {
      const tile = map[r][c];
      const sx = c*TILE - camera.x;
      const sy = r*TILE;
      const seed = (c*7 + r*13) % 100;

      if (tile === 0) {
        if (r >= GROUND_ROW) {
          ctx.fillStyle = '#080808';
          ctx.fillRect(sx, sy, TILE, TILE);
          ctx.fillStyle = '#111';
          ctx.fillRect(sx, sy, TILE, 1);
          const glow = Math.sin(frameCount*0.03 + c*0.5)*0.5+0.5;
          ctx.fillStyle = `rgba(60,0,0,${glow*0.08})`;
          ctx.fillRect(sx, sy, TILE, TILE);
        }
        continue;
      }

      switch (tile) {
        case 1:
          if (r === GROUND_ROW) {
            ctx.fillStyle = '#3a7a2a';
            ctx.fillRect(sx, sy, TILE, TILE);
            ctx.fillStyle = '#4a8a3a';
            ctx.fillRect(sx, sy, TILE, 5);
            ctx.fillStyle = '#5a9a4a';
            ctx.fillRect(sx, sy, TILE, 2);
            if (seed%3===0) {
              ctx.fillStyle = '#6aaa5a';
              ctx.fillRect(sx+6+(seed%12), sy-2, 3, 4);
            }
            if (c>0 && map[r][c-1]===0) {
              ctx.fillStyle = '#5a3a1a';
              ctx.fillRect(sx, sy, 3, TILE);
            }
            ctx.fillStyle = '#8B5E3C';
            ctx.fillRect(sx, sy+5, TILE, TILE-5);
            if (seed%4===0) ctx.fillRect(sx+5+seed%20, sy+10+seed%18, 2, 2);
          } else {
            ctx.fillStyle = '#7B4E2C';
            ctx.fillRect(sx, sy, TILE, TILE);
            ctx.fillStyle = '#6B3E1C';
            ctx.fillRect(sx, sy, TILE, 1);
            if (seed%3===0) ctx.fillRect(sx+3+seed%10, sy+4+seed%18, 5, 3);
          }
          break;
        case 2:
          ctx.fillStyle = '#777';
          ctx.fillRect(sx, sy, TILE, TILE);
          ctx.fillStyle = '#888'; ctx.fillRect(sx+1, sy+1, TILE-2, TILE-2);
          ctx.fillStyle = '#7a7a7a';
          ctx.fillRect(sx+8, sy+4, 16, 10); ctx.fillRect(sx+4, sy+18, 24, 10);
          ctx.fillStyle = '#6a6a6a';
          ctx.fillRect(sx+4, sy+4, 4, 10); ctx.fillRect(sx+24, sy+4, 4, 10);
          ctx.fillRect(sx+4, sy+18, 6, 10); ctx.fillRect(sx+22, sy+18, 6, 10);
          if (seed%5===0) { ctx.fillStyle = 'rgba(60,120,40,0.3)'; ctx.fillRect(sx+seed%20, sy+seed%26, 6, 4); }
          break;
        case 3:
          ctx.fillStyle = '#6B5B45'; ctx.fillRect(sx, sy, TILE, TILE);
          ctx.fillStyle = '#8B7355'; ctx.fillRect(sx+1, sy+1, TILE-2, TILE-2);
          ctx.fillStyle = '#7B6345'; ctx.fillRect(sx+4, sy+4, TILE-8, TILE-8);
          ctx.strokeStyle = '#5B4B35'; ctx.lineWidth = 1;
          ctx.strokeRect(sx+4, sy+4, TILE-8, TILE-8);
          if (r>=8 && r<=10) {
            ctx.fillStyle = '#1a2a4a'; ctx.fillRect(sx+10, sy+6, 12, 14);
            ctx.fillStyle = '#ffd700'; ctx.fillRect(sx+12, sy+8, 3, 3);
          }
          if (r===6) {
            ctx.fillStyle = '#5B4B35';
            ctx.fillRect(sx+2, sy-4, 8, 4); ctx.fillRect(sx+22, sy-4, 8, 4);
          }
          break;
        case 4:
          const bobY = Math.sin(frameCount*0.05 + c)*2;
          ctx.fillStyle = '#5a3a08'; ctx.fillRect(sx, sy+bobY, TILE, TILE);
          ctx.fillStyle = '#8B6914'; ctx.fillRect(sx+2, sy+2+bobY, TILE-4, TILE-4);
          ctx.fillStyle = '#C4963C'; ctx.fillRect(sx+3, sy+3+bobY, TILE-6, TILE-6);
          const sh = Math.sin(frameCount*0.06)*0.3+0.7;
          ctx.fillStyle = `rgba(255,215,0,${sh*0.15})`;
          ctx.fillRect(sx+3, sy+3+bobY, TILE-6, TILE-6);
          ctx.fillStyle = '#FFF'; ctx.font = 'bold 20px monospace';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('?', sx+TILE/2, sy+TILE/2+bobY+1);
          if (frameCount%30<4) {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillRect(sx+6+(frameCount%10), sy+5+bobY, 3, 3);
          }
          break;
        case 8:
          const rbY = Math.sin(frameCount*0.05 + c*1.3)*2;
          ctx.fillStyle = '#5a0000'; ctx.fillRect(sx, sy+rbY, TILE, TILE);
          ctx.fillStyle = '#8B0000'; ctx.fillRect(sx+2, sy+2+rbY, TILE-4, TILE-4);
          ctx.fillStyle = '#CC2222'; ctx.fillRect(sx+3, sy+3+rbY, TILE-6, TILE-6);
          const rsh = Math.sin(frameCount*0.07)*0.3+0.7;
          ctx.fillStyle = `rgba(255,50,50,${rsh*0.2})`;
          ctx.fillRect(sx+3, sy+3+rbY, TILE-6, TILE-6);
          ctx.fillStyle = '#FFD700'; ctx.font = 'bold 22px monospace';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('♥', sx+TILE/2, sy+TILE/2+rbY+1);
          if (frameCount%20<4) {
            ctx.fillStyle = 'rgba(255,200,200,0.6)';
            ctx.fillRect(sx+6+(frameCount%10), sy+5+rbY, 3, 3);
          }
          break;
        case 5: {
          const off = Math.sin(frameCount*0.035)*1.5;
          const isDragon = currentChar === CHAR.DRAGON;
          const isJordi = currentChar === CHAR.JORDI;
          ctx.fillStyle = '#4a3020';
          ctx.fillRect(sx+14, sy, 4, TILE*5);
          ctx.fillStyle = '#6B5030';
          ctx.fillRect(sx+12, sy-2, 8, 4);
          ctx.fillStyle = '#7B6345';
          ctx.fillRect(sx+8, sy+4+off, 2, 7);
          ctx.fillRect(sx+22, sy+4+off, 2, 7);

          if (isDragon) {
            ctx.fillStyle = '#8B6914';
            ctx.beginPath(); ctx.arc(sx+16, sy+22, 12, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#FFD700';
            ctx.beginPath(); ctx.arc(sx+16, sy+20, 8, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#FF6600';
            ctx.beginPath(); ctx.arc(sx+12, sy+18, 4, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(sx+20, sy+22, 3, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#FFF';
            const sp = Math.sin(frameCount*0.05)*0.5+0.5;
            ctx.globalAlpha = sp*0.7;
            ctx.fillRect(sx+8, sy+12, 2, 2);
            ctx.fillRect(sx+22, sy+15, 2, 2);
            ctx.fillRect(sx+14, sy+10, 2, 2);
            ctx.globalAlpha = 1;
          } else if (isJordi) {
            ctx.fillStyle = '#FFDAB9';
            ctx.fillRect(sx+10, sy+4+off, 12, 10);
            ctx.fillStyle = '#6B2A1A';
            ctx.fillRect(sx+9, sy+2+off, 14, 6);
            ctx.fillStyle = '#4499CC';
            ctx.fillRect(sx+6, sy+14+off, 20, 16);
            ctx.fillStyle = '#55AAEE';
            ctx.fillRect(sx+8, sy+16+off, 16, 12);
            ctx.fillStyle = '#000';
            ctx.fillRect(sx+13, sy+7+off, 2, 3);
            ctx.fillRect(sx+17, sy+7+off, 2, 3);
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(sx+12, sy+1+off, 8, 3);
            ctx.fillRect(sx+11, sy+2+off, 2, 2);
            ctx.fillRect(sx+19, sy+2+off, 2, 2);
          } else {
            ctx.fillStyle = '#B0B0B0';
            ctx.fillRect(sx+5, sy+18+off, 22, 18);
            ctx.fillStyle = '#C0C0C0';
            ctx.fillRect(sx+7, sy+20+off, 18, 14);
            ctx.fillStyle = '#CC0000';
            ctx.fillRect(sx+13, sy+22+off, 4, 10);
            ctx.fillRect(sx+9, sy+25+off, 12, 4);
            ctx.fillStyle = '#D0D0D0';
            ctx.fillRect(sx+9, sy+2+off, 14, 15);
            ctx.fillStyle = '#333';
            ctx.fillRect(sx+12, sy+8+off, 8, 3);
            ctx.fillStyle = '#CC0000';
            ctx.fillRect(sx+19, sy+off, 4, 8);
            ctx.fillStyle = '#888';
            ctx.fillRect(sx+7, sy+36+off, 7, 10);
            ctx.fillRect(sx+18, sy+36+off, 7, 10);
            ctx.fillStyle = '#CCC';
            ctx.fillRect(sx+2, sy+40, 6, 3);
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(sx+2, sy+39, 6, 2);
          }
          break;
        }
        case 9:
          ctx.fillStyle = '#7B6345'; ctx.fillRect(sx, sy, TILE, TILE);
          ctx.fillStyle = '#8B7355'; ctx.fillRect(sx+1, sy+1, TILE-2, TILE-2);
          ctx.fillStyle = '#9B8365'; ctx.fillRect(sx+2, sy+2, TILE-4, 3);
          ctx.strokeStyle = '#6B5345'; ctx.lineWidth = 1;
          ctx.strokeRect(sx+2, sy+2, TILE-4, TILE-4);
          break;
      }
    }
  }

  // ---- Items ----
  for (const item of items) {
    if (item.collected) continue;
    const sx = item.x - camera.x;
    const sy = item.y + Math.sin(item.bobTimer*0.06)*4;
    const glow = Math.sin(item.sparkleTimer*0.1)*0.3+0.7;
    ctx.save();
    ctx.translate(sx+8, sy+8);
    ctx.globalAlpha = glow*0.15;
    ctx.fillStyle = item.type==='gold'?'#C4963C':'#CC0000';
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = item.type==='gold'?'#8B6914':'#8B0000';
    ctx.fillRect(-7, -5, 14, 10);
    ctx.fillStyle = item.type==='gold'?'#C4963C':'#CC2222';
    ctx.fillRect(-5, -3, 10, 6);
    ctx.fillStyle = '#FFF8DC';
    ctx.fillRect(-4, -2, 8, 4);
    ctx.fillStyle = item.type==='gold'?'#6B4A0A':'#6B0000';
    ctx.fillRect(-7, -5, 3, 10);
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(-4, 0, 8, 1);
    if (item.type==='red') {
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  // ---- Enemies ----
  for (const e of enemies) {
    if (!e.alive) continue;
    const sx = e.x - camera.x, sy = e.y;
    const edir = e.vx < 0 ? -1 : 1;
    if (e.squished) {
      ctx.fillStyle = '#4a6b3a';
      ctx.fillRect(sx, sy+e.h-6, e.w, 5);
      ctx.fillStyle = '#3a5b2a';
      ctx.fillRect(sx+4, sy+e.h-4, e.w-8, 2);
      continue;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(sx+e.w/2, sy+e.h-2, e.w/2-2, 4, 0, 0, Math.PI*2); ctx.fill();
    const lo = e.walkFrame?2:0;
    ctx.fillStyle = '#3a5b2a';
    ctx.fillRect(sx+4, sy+e.h-8+lo, 5, 6+(lo?-2:0));
    ctx.fillRect(sx+e.w-9, sy+e.h-8-lo, 5, 6+(lo?0:-2));
    ctx.fillStyle = '#5a8a4a';
    ctx.fillRect(sx+2, sy+5, e.w-4, e.h-12);
    ctx.fillStyle = '#7aaa6a';
    ctx.fillRect(sx+6, sy+8, e.w-12, e.h-18);
    const hx = edir<0?sx:sx+e.w-10;
    ctx.fillStyle = '#4a7a3a';
    ctx.fillRect(hx, sy+1, 10, 10);
    ctx.fillStyle = '#FF0';
    ctx.fillRect(hx+2, sy+3, 6, 5);
    ctx.fillStyle = '#000';
    ctx.fillRect(hx+(edir<0?3:5), sy+4, 3, 3);
    ctx.fillStyle = '#FFF';
    ctx.fillRect(hx+(edir<0?4:6), sy+5, 1, 1);
    ctx.fillStyle = '#3a6a2a';
    for (let i = 0; i < 3; i++) {
      const spX = sx+5+i*7;
      ctx.beginPath(); ctx.moveTo(spX, sy+5); ctx.lineTo(spX+3, sy-2); ctx.lineTo(spX+6, sy+5); ctx.fill();
    }
    ctx.fillStyle = '#5a8a4a';
    const tx2 = edir<0?sx+e.w-2:sx-4;
    ctx.fillRect(tx2, sy+13, 6, 3);
    ctx.fillRect(tx2+(edir<0?4:-2), sy+15, 4, 3);
    ctx.fillStyle = '#3a6a2a';
    ctx.beginPath(); ctx.moveTo(tx2+(edir<0?8:-2), sy+14);
    ctx.lineTo(tx2+(edir<0?12:-6), sy+16);
    ctx.lineTo(tx2+(edir<0?8:-2), sy+18); ctx.fill();
  }

  // ---- Projectiles ----
  for (const pr of projectiles) {
    if (!pr.alive) continue;
    const sx = pr.x - camera.x, sy = pr.y;
    if (sx < -20 || sx > canvas.width + 20) continue;
    ctx.fillStyle = pr.color || '#FFF';
    if (pr.type === 'fireball') {
      ctx.beginPath();
      ctx.arc(sx + pr.w/2, sy + pr.h/2, pr.w/2, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,100,0,0.3)';
      ctx.beginPath();
      ctx.arc(sx + pr.w/2, sy + pr.h/2, pr.w, 0, Math.PI*2);
      ctx.fill();
    } else if (pr.type === 'dagger') {
      ctx.fillRect(sx, sy, pr.w, pr.h);
    } else if (pr.type === 'lance') {
      ctx.fillRect(sx, sy, pr.w, pr.h);
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(sx + pr.w - 4, sy - 1, 4, pr.h + 2);
    } else {
      ctx.fillRect(sx, sy, pr.w, pr.h);
      ctx.fillStyle = 'rgba(255,200,50,0.4)';
      ctx.beginPath();
      ctx.arc(sx + pr.w/2, sy + pr.h/2, pr.w, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // ---- Player ----
  const p = player;
  if (p.state !== 'dead') {
    const sx = p.x - camera.x, sy = p.y;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(sx+p.w/2, sy+p.h-2, p.w/2-2, 4, 0, 0, Math.PI*2); ctx.fill();
    if (p.invincible<=0 || Math.floor(p.invincible/3)%2===0) {
      ctx.save();
      if (p.facing<0) { ctx.translate(sx+p.w, sy); ctx.scale(-1,1); }
      else { ctx.translate(sx, sy); }

      if (currentChar === CHAR.DRAGON) {
        const legAnim = p.onGround&&Math.abs(p.vx)>0.5?Math.sin(p.walkFrame*Math.PI/2)*2:0;
        ctx.fillStyle = '#5a8a4a';
        ctx.fillRect(3, 6, p.w-6, p.h-10);
        ctx.fillStyle = '#6a9a5a';
        ctx.fillRect(4, 8, p.w-8, p.h-14);
        ctx.fillStyle = '#8aaa6a';
        ctx.fillRect(6, 12, p.w-12, p.h-20);
        ctx.fillStyle = '#4a7a3a';
        ctx.fillRect(p.w-6, 0, 8, 8);
        ctx.fillStyle = '#FF0';
        ctx.fillRect(p.w-5, 2, 3, 3);
        ctx.fillStyle = '#000';
        ctx.fillRect(p.w-4, 3, 2, 2);
        ctx.fillStyle = '#3a5a2a';
        ctx.fillRect(p.w-8, 4, 2, 2);
        const wingWave = Math.sin(frameCount*0.08)*3;
        ctx.fillStyle = '#4a6a3a';
        ctx.beginPath();
        ctx.moveTo(3, 8);
        ctx.lineTo(-6, 4+wingWave);
        ctx.lineTo(-2, 10);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(3, 12);
        ctx.lineTo(-8, 8-wingWave);
        ctx.lineTo(-2, 14);
        ctx.fill();
        ctx.fillStyle = '#5a8a4a';
        ctx.fillRect(-2, p.h-12, 5, 8);
        ctx.fillStyle = '#4a6a3a';
        ctx.beginPath();
        ctx.moveTo(0, p.h-4);
        ctx.lineTo(-4, p.h-2);
        ctx.lineTo(2, p.h-1);
        ctx.fill();
        ctx.fillStyle = '#4a6a3a';
        ctx.fillRect(3+legAnim, p.h-7, 5, 7);
        ctx.fillRect(p.w-8-legAnim, p.h-7, 5, 7);
        ctx.fillStyle = '#3a5a2a';
        for (let i = 0; i < 3; i++) {
          const spX = 8+i*6;
          ctx.beginPath();
          ctx.moveTo(spX, 6);
          ctx.lineTo(spX+2, 0);
          ctx.lineTo(spX+4, 6);
          ctx.fill();
        }
        if (p.state === 'large') {
          ctx.fillStyle = 'rgba(255,100,0,0.08)';
          ctx.fillRect(0, 0, p.w, p.h);
        }
      } else if (currentChar === CHAR.JORDI) {
        const legAnim = p.onGround&&Math.abs(p.vx)>0.5?Math.sin(p.walkFrame*Math.PI/2)*3:0;
        if (p.state === 'large') {
          const cw = Math.sin(frameCount*0.08)*2;
          ctx.fillStyle = '#AA0000';
          ctx.fillRect(0, 8+cw, 5, p.h-10);
          ctx.fillStyle = '#C0C0C0';
          ctx.fillRect(3, 12, p.w-6, p.h-16);
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(7, 16, p.w-14, 4);
          ctx.fillStyle = '#CC0000';
          ctx.fillRect(p.w/2-1, 15, 2, 8);
          ctx.fillRect(p.w/2-4, 17, 8, 2);
          ctx.fillStyle = '#A0A0A0';
          ctx.fillRect(1, 12, 5, 6);
          ctx.fillRect(p.w-6, 12, 5, 6);
          ctx.fillStyle = '#D0D0D0';
          ctx.fillRect(4, 0, p.w-8, 13);
          ctx.fillStyle = '#333';
          ctx.fillRect(6, 5, p.w-12, 3);
          const pw = Math.sin(frameCount*0.06)*2;
          ctx.fillStyle = '#CC0000';
          ctx.fillRect(p.w-7, -3+pw, 4, 10);
          ctx.fillStyle = '#888';
          ctx.fillRect(4+legAnim, p.h-8, 6, 8);
          ctx.fillRect(p.w-10-legAnim, p.h-8, 6, 8);
          ctx.fillStyle = '#665544';
          ctx.fillRect(3+legAnim, p.h-3, 7, 3);
          ctx.fillRect(p.w-10-legAnim, p.h-3, 7, 3);
          ctx.fillStyle = '#CCC';
          ctx.fillRect(p.w-4, 14, 3, 20);
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(p.w-6, 14, 7, 3);
          ctx.fillStyle = '#3366AA';
          ctx.fillRect(2, 17, 7, 14);
        } else {
          ctx.fillStyle = '#1a4488';
          ctx.fillRect(3, 10, p.w-6, p.h-14);
          ctx.fillStyle = '#2255AA';
          ctx.fillRect(4, 11, p.w-8, p.h-16);
          ctx.fillStyle = '#CC2222';
          ctx.fillRect(4, 12, p.w-8, 5);
          ctx.fillStyle = '#6B3A1E';
          ctx.fillRect(3, 17, p.w-6, 2);
          ctx.fillStyle = '#FFDAB9';
          ctx.fillRect(4, 1, p.w-8, 11);
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(5, 0, p.w-10, 4);
          ctx.fillStyle = '#000';
          ctx.fillRect(7, 4, 3, 3);
          ctx.fillRect(p.w-10, 4, 3, 3);
          ctx.fillStyle = '#1a4488';
          ctx.fillRect(3+legAnim, p.h-8, 6, 8);
          ctx.fillRect(p.w-9-legAnim, p.h-8, 6, 8);
          ctx.fillStyle = '#5C4033';
          ctx.fillRect(2+legAnim, p.h-4, 7, 4);
          ctx.fillRect(p.w-9-legAnim, p.h-4, 7, 4);
        }
      } else {
        const legAnim = p.onGround&&Math.abs(p.vx)>0.5?Math.sin(p.walkFrame*Math.PI/2)*2:0;
        if (p.state === 'large') {
          const cw = Math.sin(frameCount*0.08)*2;
          ctx.fillStyle = '#AA0044';
          ctx.fillRect(0, 8+cw, 4, p.h-10);
          ctx.fillStyle = '#A0A0D0';
          ctx.fillRect(3, 12, p.w-6, p.h-16);
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(7, 16, p.w-14, 3);
          ctx.fillStyle = '#FF69B4';
          ctx.fillRect(p.w/2-1, 15, 2, 8);
          ctx.fillRect(p.w/2-4, 17, 8, 2);
          ctx.fillStyle = '#9090C0';
          ctx.fillRect(1, 12, 5, 5);
          ctx.fillRect(p.w-6, 12, 5, 5);
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(5, 0, p.w-10, 5);
          ctx.fillRect(4, 2, 3, 3);
          ctx.fillRect(p.w-7, 2, 3, 3);
          const hw = Math.sin(frameCount*0.07)*2;
          ctx.fillStyle = '#6B2A1A';
          ctx.fillRect(p.w-5, 3+hw, 4, 10);
          ctx.fillRect(1, 3-hw, 4, 10);
          ctx.fillStyle = '#FFDAB9';
          ctx.fillRect(6, 5, p.w-12, 7);
          ctx.fillStyle = '#000';
          ctx.fillRect(8, 7, 2, 3);
          ctx.fillRect(p.w-10, 7, 2, 3);
          ctx.fillStyle = '#8888B0';
          ctx.fillRect(4+legAnim, p.h-8, 6, 8);
          ctx.fillRect(p.w-10-legAnim, p.h-8, 6, 8);
          ctx.fillStyle = '#665588';
          ctx.fillRect(3+legAnim, p.h-3, 7, 3);
          ctx.fillRect(p.w-10-legAnim, p.h-3, 7, 3);
          ctx.fillStyle = '#8B6914';
          ctx.fillRect(p.w-3, 14, 3, 20);
          ctx.fillStyle = '#FFD700';
          ctx.beginPath(); ctx.arc(p.w-1, 14, 4, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#FF69B4';
          ctx.beginPath(); ctx.arc(p.w-1, 14, 2, 0, Math.PI*2); ctx.fill();
        } else {
          ctx.fillStyle = '#4499CC';
          ctx.fillRect(3, 10, p.w-6, p.h-14);
          ctx.fillStyle = '#55AAEE';
          ctx.fillRect(4, 11, p.w-8, p.h-16);
          ctx.fillStyle = '#3366AA';
          ctx.fillRect(4, 11, p.w-8, 6);
          ctx.fillStyle = '#8B6914';
          ctx.fillRect(3, 17, p.w-6, 2);
          ctx.fillStyle = '#FFDAB9';
          ctx.fillRect(4, 1, p.w-8, 11);
          const hwv = Math.sin(frameCount*0.05)*1;
          ctx.fillStyle = '#6B2A1A';
          ctx.fillRect(5, 0, p.w-10, 4);
          ctx.fillRect(3, 3+hwv, 4, 6);
          ctx.fillRect(p.w-7, 3-hwv, 4, 6);
          ctx.fillStyle = '#000';
          ctx.fillRect(7, 4, 3, 3);
          ctx.fillRect(p.w-10, 4, 3, 3);
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(7, 0, 6, 3);
          ctx.fillRect(6, 1, 2, 2);
          ctx.fillRect(p.w-8, 1, 2, 2);
          ctx.fillStyle = '#4499CC';
          ctx.fillRect(3+legAnim, p.h-8, 6, 8);
          ctx.fillRect(p.w-9-legAnim, p.h-8, 6, 8);
          ctx.fillStyle = '#3366AA';
          ctx.fillRect(2+legAnim, p.h-4, 7, 4);
          ctx.fillRect(p.w-9-legAnim, p.h-4, 7, 4);
        }
      }
      ctx.restore();
    }
  }

  // ---- Particles ----
  for (const pt of particles) {
    const sx = pt.x - camera.x, sy = pt.y;
    if (sx < -20 || sx > canvas.width+20) continue;
    const alpha = pt.life/(pt.type==='confetti'?80:35);
    ctx.globalAlpha = Math.max(0, alpha);
    if (pt.type==='fire') {
      ctx.fillStyle = pt.color;
      const sz = pt.size*(0.5+Math.sin(pt.life*0.5)*0.5);
      ctx.beginPath(); ctx.arc(sx, sy, sz, 0, Math.PI*2); ctx.fill();
    } else if (pt.type==='sparkle'||pt.type==='collect') {
      ctx.fillStyle = pt.color;
      const sz = pt.size*(0.5+Math.sin(pt.life*0.3)*0.5);
      ctx.fillRect(sx-sz/2, sy-sz/2, sz, sz);
    } else if (pt.type==='confetti') {
      ctx.fillStyle = pt.color;
      const rot = pt.life*0.1;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(rot);
      ctx.fillRect(-pt.size/2, -pt.size/4, pt.size, pt.size/2);
      ctx.restore();
    } else {
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(sx, sy, pt.size*alpha, 0, Math.PI*2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  renderHUD();
}

// ============================================================
// HUD
// ============================================================
function renderHUD() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, canvas.width, 36);
  ctx.fillStyle = 'rgba(255,215,0,0.25)';
  ctx.fillRect(0, 36, canvas.width, 1);

  ctx.textBaseline = 'middle';
  ctx.font = '13px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFD700';
  ctx.fillText('PUNTUACIO', 12, 14);
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`${score}`, 12, 28);

  ctx.font = '13px monospace';
  ctx.fillStyle = '#C4963C';
  ctx.textAlign = 'center';
  ctx.fillText(`LLIBRES: ${books}`, canvas.width*0.28, 18);

  ctx.fillStyle = '#AAA';
  const lvlName = (LEVELS[currentLevel] || LEVELS[0]).name;
  ctx.fillText(lvlName, canvas.width*0.5, 18);

  ctx.textAlign = 'center';
  const td = Math.max(0, Math.ceil(timeLeft));
  ctx.fillStyle = timeLeft<30?'#FF4444':'#FFF';
  ctx.font = timeLeft<30?'bold 16px monospace':'13px monospace';
  ctx.fillText(`TEMPS: ${td}s`, canvas.width*0.72, 18);

  // Ability indicators in HUD bar
  if (playerAbilities.ranged || playerAbilities.ultimate) {
    let ax = canvas.width * 0.80;
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px monospace';
    if (playerAbilities.ranged) {
      const ready = abilityState.rangedCooldown <= 0;
      ctx.fillStyle = ready ? '#FFD700' : '#555';
      ctx.fillText('⚔', ax, 14);
      ctx.fillStyle = ready ? '#FFD700' : '#333';
      ctx.font = '10px monospace';
      ctx.fillText('[X]', ax, 27);
      const maxCd = 25;
      const ratio = Math.max(0, Math.min(1, 1 - abilityState.rangedCooldown / maxCd));
      ctx.fillStyle = '#222';
      ctx.fillRect(ax - 10, 31, 20, 3);
      ctx.fillStyle = ready ? '#FFD700' : '#882222';
      ctx.fillRect(ax - 10, 31, 20 * ratio, 3);
      ax += 26;
    }
    if (playerAbilities.ultimate) {
      const avail = !abilityState.ultimateUsed;
      ctx.fillStyle = avail ? '#FF6600' : '#444';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('★', ax, 14);
      ctx.fillStyle = avail ? '#FF6600' : '#444';
      ctx.font = '10px monospace';
      ctx.fillText(avail ? '[Z]' : 'USAT', ax, 27);
      ctx.fillStyle = '#222';
      ctx.fillRect(ax - 10, 31, 20, 3);
      ctx.fillStyle = avail ? '#FF6600' : '#444';
      ctx.fillRect(ax - 10, 31, avail ? 20 : 0, 3);
    }
  }

  // Character indicator
  const cd = CHAR_DATA[currentChar];
  ctx.textAlign = 'right';
  ctx.fillStyle = currentChar===CHAR.DRAGON?'#5a8a4a':currentChar===CHAR.JORDI?'#C0C0C0':'#FF69B4';
  ctx.font = '12px monospace';
  ctx.fillText(`[C] ${cd.name}`, canvas.width-12, 12);
  ctx.fillStyle = '#FFF';
  ctx.font = '11px monospace';
  const label = player.state==='large'?cd.largeLabel:cd.smallLabel;
  ctx.fillText(label, canvas.width-12, 26);
  // HP bar
  ctx.fillStyle = player.state==='large'?'#FFD700':'#AAA';
  ctx.fillRect(canvas.width-12-40, 30, 40, 3);
  ctx.fillStyle = currentChar===CHAR.DRAGON?'#FF6600':currentChar===CHAR.JORDI?'#CC0000':'#FF69B4';
  ctx.fillRect(canvas.width-12-40, 30, player.state==='large'?40:20, 3);

  // Ability notification
  if (showAbilityNotification) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(canvas.width/2-100, canvas.height/2-40, 200, 80);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = showAbilityNotification.ability === 'ranged' ? 'ATAC A DISTANCIA!' : 'ULTIMATA!';
    ctx.fillText(label, canvas.width/2, canvas.height/2);
    ctx.fillStyle = '#AAA';
    ctx.font = '12px monospace';
    ctx.fillText('Nova habilitat desbloquejada!', canvas.width/2, canvas.height/2 + 20);
    ctx.restore();
  }

  // Overlays
  if (gameState === 'dead') {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#CC0066';
    ctx.font = 'bold 54px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('DERROTA', canvas.width/2, canvas.height/2-30);
    ctx.fillStyle = '#FFF';
    ctx.font = '18px monospace';
    ctx.fillText(`Puntuacio: ${score}`, canvas.width/2, canvas.height/2+25);
    ctx.fillStyle = '#AAA';
    ctx.font = '15px monospace';
    ctx.fillText('Prem R per reiniciar', canvas.width/2, canvas.height/2+55);
  }

  if (gameState === 'victory') {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(cd.victoryText, canvas.width/2, canvas.height/2-65);
    ctx.fillStyle = '#FFF';
    ctx.font = '18px monospace';
    ctx.fillText(cd.victorySub, canvas.width/2, canvas.height/2-25);
    ctx.font = '20px monospace';
    ctx.fillText(`Puntuacio final: ${score}`, canvas.width/2, canvas.height/2+10);
    ctx.fillStyle = '#C4963C';
    ctx.font = '17px monospace';
    ctx.fillText(`Llibres: ${books}`, canvas.width/2, canvas.height/2+40);
    ctx.fillStyle = '#AAA';
    ctx.font = '15px monospace';
    ctx.fillText('Prem R per reiniciar nivell', canvas.width/2, canvas.height/2+75);
    const hasNext = currentLevel < LEVELS.length - 1;
    if (hasNext) {
      ctx.fillStyle = '#FFD700';
      ctx.fillText('Prem Enter per següent nivell', canvas.width/2, canvas.height/2+100);
    } else {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('HAS COMPLETAT TOTS ELS NIVELLS!', canvas.width/2, canvas.height/2+100);
    }
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText('Prem O per codi de desbloqueig', canvas.width/2, canvas.height/2+125);
  }

  ctx.restore();
}

// ============================================================
// GAME LOOP
// ============================================================
function gameLoop(timestamp) {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// ============================================================
// RESTART
// ============================================================
function restartGame() {
  loadLevel(currentLevel);
}

// ============================================================
// INPUT
// ============================================================
document.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyR' && (gameState==='dead'||gameState==='victory')) restartGame();
  if (e.code === 'Enter' && gameState === 'victory') advanceLevel();
  if (e.code === 'KeyO' && (gameState === 'victory' || gameState === 'dead' || gameState === 'playing')) {
    const code = prompt('Introdueix codi de desbloqueig (ex: MB11, MB12, CS21):');
    if (code && checkUnlockCode(code.trim())) { /* level loaded */ }
  }
  if (!musicPlaying && gameState==='playing' &&
      (e.code==='ArrowLeft'||e.code==='ArrowRight'||e.code==='Space'||e.code==='ArrowUp')) startMusic();
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('click', () => {
  if (!musicPlaying && gameState === 'playing') startMusic();
  if (gameState === 'dead' || gameState === 'victory') restartGame();
});

// ============================================================
// TOUCH CONTROLS
// ============================================================
function setupTouchControls() {
  const ctrl = document.getElementById('touch-controls');
  if (!('ontouchstart' in window) && navigator.maxTouchPoints === 0) return;
  ctrl.style.display = '';

  document.querySelectorAll('.touch-btn').forEach(btn => {
    const key = btn.dataset.key;

    function onStart(e) {
      e.preventDefault();
      keys[key] = true;
      btn.classList.add('pressed');
      if (key === 'KeyR' && (gameState === 'dead' || gameState === 'victory')) {
        restartGame();
      }
      if (!musicPlaying && gameState === 'playing' &&
          ['ArrowLeft','ArrowRight','Space','ArrowUp'].includes(key)) {
        startMusic();
      }
    }
    function onEnd(e) {
      e.preventDefault();
      keys[key] = false;
      btn.classList.remove('pressed');
    }

    btn.addEventListener('touchstart', onStart, { passive: false });
    btn.addEventListener('touchend', onEnd, { passive: false });
    btn.addEventListener('touchcancel', onEnd, { passive: false });
    btn.addEventListener('mousedown', onStart);
    btn.addEventListener('mouseup', onEnd);
    btn.addEventListener('mouseleave', onEnd);
  });

  // Fullscreen toggle
  const fsBtn = document.getElementById('fs-btn');
  if (fsBtn) {
    function toggleFs(e) {
      e.preventDefault();
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        const el = document.documentElement;
        (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      }
    }
    fsBtn.addEventListener('touchstart', toggleFs, { passive: false });
    fsBtn.addEventListener('mousedown', toggleFs);
  }
}

setupTouchControls();

// ============================================================
// START
// ============================================================
loadLevel(0);
requestAnimationFrame(gameLoop);
