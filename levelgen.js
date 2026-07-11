// ============================================================
// LEVEL GENERATION — Procedural, always different & playable
// ============================================================
let levelEnd = 0;
let rescueCol = 0;

function rand(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

function addPit(m, c, w) {
  for (let r = GROUND_ROW; r < ROWS; r++)
    for (let i = 0; i < w; i++)
      if (c + i < COLS) m[r][c + i] = 0;
}

function fillGround(m) {
  for (let c = 0; c < COLS; c++)
    for (let r = GROUND_ROW; r < ROWS; r++)
      m[r][c] = 1;
}

function buildLevel(params) {
  const p = params || {};
  const harder = !!p.harder;
  const veryHard = !!p.veryHard;
  const m = [];
  for (let r = 0; r < ROWS; r++) m[r] = new Array(COLS).fill(0);
  fillGround(m);

  let col = 0;
  let spawns = [];
  rescueCol = 50;

  col += 10;

  col += (harder ? rand(10, 20) : rand(8, 16));

  spawns.push({ col: col + rand(1, 3), row: GroundRowFromMap(m, col + 2) - 1 });
  col += rand(5, 8);

  const wh = rand(7, 9);
  m[wh][col] = 2;
  m[wh][col+1] = Math.random() < 0.3 ? 8 : 4;
  m[wh][col+2] = 2;
  m[wh][col+3] = Math.random() < 0.3 ? 8 : 4;
  col += 5;

  if (Math.random() < (veryHard ? 0.4 : harder ? 0.55 : 0.7)) {
    const pl = rand(2, 4);
    for (let i = 0; i < pl; i++) m[rand(8, 10)][col + i] = 9;
    col += pl + rand(1, 4);
  }

  const tw = rand(2, 3);
  const th = veryHard ? rand(5, 7) : harder ? rand(4, 7) : rand(4, 6);
  const tt = GROUND_ROW - th;
  for (let r = tt; r <= GROUND_ROW; r++)
    for (let w = 0; w < tw; w++)
      m[r][col + w] = 3;
  if (Math.random() < 0.4) m[tt - 1][col] = 7;
  col += tw + rand(1, 3);

  const hpCol = col + rand(1, 2);
  m[rand(8, 9)][hpCol] = 8;
  if (Math.random() < 0.5) {
    m[GROUND_ROW - 1][hpCol - 1] = 1;
    m[GROUND_ROW - 2][hpCol - 1] = 1;
  }
  m[GROUND_ROW - 2][hpCol] = 9;
  m[GROUND_ROW - 1][hpCol] = 1;
  col = hpCol + rand(3, 5);

  const numObs = veryHard ? rand(4, 7) : harder ? rand(4, 6) : rand(3, 5);
  for (let i = 0; i < numObs; i++) {
    const oc = col + i * 2;
    if (oc >= COLS) break;
    if (i === Math.floor(numObs / 2)) {
      m[rand(8, 10)][oc] = 8;
    } else {
      m[rand(8, 10)][oc] = Math.random() < 0.5 ? 2 : 4;
    }
  }
  col += numObs * 2 + rand(1, 3);

  const pitW = veryHard ? rand(4, 6) : harder ? rand(3, 6) : rand(3, 5);
  const pitStart = col + rand(2, 4);
  addPit(m, pitStart, pitW);
  if (Math.random() < (veryHard ? 0.7 : harder ? 0.6 : 0.5)) {
    m[GROUND_ROW - 2][pitStart] = 9;
    if (pitW > 3) m[GROUND_ROW - 2][pitStart + 1] = 9;
  }
  col = pitStart + pitW + (harder ? rand(3, 5) : rand(2, 4));

  if (Math.random() < (veryHard ? 0.3 : harder ? 0.5 : 0.7)) {
    const numPlat = veryHard ? rand(1, 3) : harder ? rand(2, 4) : rand(2, 5);
    for (let i = 0; i < numPlat; i++) {
      const pc = col + i * rand(2, 3);
      if (pc < COLS) {
        const ph = rand(8, 10);
        m[ph][pc] = 9;
        if (Math.random() < 0.3 && ph > 8) {
          m[ph - 2][pc] = 4;
        }
      }
    }
    col += numPlat * 2 + rand(2, 4);
  }

  spawns.push({ col: col + rand(2, 4), row: GroundRowFromMap(m, col + 3) - 1 });
  if (Math.random() < (veryHard ? 0.85 : harder ? 0.75 : 0.6)) {
    spawns.push({ col: col + rand(6, 10), row: GroundRowFromMap(m, col + 8) - 1 });
  }
  col += (veryHard ? rand(12, 22) : harder ? rand(11, 20) : rand(10, 18));

  const lastRedCol = col + rand(1, 2);
  m[rand(8, 9)][lastRedCol] = 8;
  m[GROUND_ROW - 1][lastRedCol] = 1;
  col = lastRedCol + rand(3, 5);

  const numFin = veryHard ? rand(3, 6) : harder ? rand(3, 5) : rand(2, 4);
  for (let i = 0; i < numFin; i++) {
    const fc = col + i * 3;
    if (fc >= COLS) break;
    m[rand(8, 10)][fc] = Math.random() < 0.6 ? 2 : 4;
  }
  col += numFin * 3 + rand(2, 5);

  rescueCol = col + 1;
  for (let r = GROUND_ROW - 3; r <= GROUND_ROW; r++)
    m[r][rescueCol] = 1;
  for (let w = -2; w <= 2; w++)
    if (rescueCol + w >= 0 && rescueCol + w < COLS)
      m[GROUND_ROW][rescueCol + w] = 1;
  m[GROUND_ROW - 3][rescueCol] = 5;
  if (Math.random() < 0.6) {
    m[GROUND_ROW - 5][rescueCol - 1] = 3;
    m[GROUND_ROW - 5][rescueCol + 1] = 3;
    m[GROUND_ROW - 6][rescueCol] = 3;
  }
  col = rescueCol + 4;

  levelEnd = col + 2;
  window._lastSpawns = spawns;
  return m;
}

function GroundRowFromMap(m, col) {
  for (let r = 0; r < ROWS; r++) {
    const t = m[r][col];
    if (t === 1 || t === 2 || t === 3 || t === 9) return r;
  }
  return GROUND_ROW;
}
