// ============================================================
// CONSTANTS
// ============================================================
const TILE = 32;
const COLS = 250;
const ROWS = 15;
const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const MAX_JUMPS = 5;
const PLAYER_ACCEL = 0.35;
const PLAYER_FRICTION = 0.82;
const PLAYER_MAX_SPEED = 3.8;
const PLAYER_RUN_SPEED = 6.5;
const DRAGONET_SPEED = 1.0;
const SHOOTER_SPEED = 0.7;
const GAME_TIME = 300;
const GROUND_ROW = 12;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = 960;
canvas.height = 480;

// ============================================================
// CHARACTER SYSTEM
// ============================================================
const CHAR = {
  PRINCESS: 0,
  JORDI: 1,
  DRAGON: 2,
};

const CHAR_DATA = [
  {
    id: 'princess',
    name: 'PRINCESA',
    smallLabel: 'DONZELLA',
    largeLabel: 'GUERRERA',
    sw: 20, sh: 30,
    lw: 26, lh: 44,
    victoryText: 'SANT JORDI RESCATAT!',
    victorySub: 'La princesa ha salvat Sant Jordi!',
    rangedType: 'dagger',
    ultimate: 'freeze',
  },
  {
    id: 'jordi',
    name: 'SANT JORDI',
    smallLabel: 'ESCUDER',
    largeLabel: 'CAVALLER',
    sw: 20, sh: 30,
    lw: 26, lh: 44,
    victoryText: 'PRINCESA RESCATADA!',
    victorySub: 'Sant Jordi ha salvat la princesa!',
    rangedType: 'lance',
    ultimate: 'big',
  },
  {
    id: 'dragon',
    name: 'DRAC',
    smallLabel: 'DRAC',
    largeLabel: 'DRAC',
    sw: 30, sh: 24,
    lw: 36, lh: 30,
    victoryText: 'DRAC VICTORIOS!',
    victorySub: 'El drac ha dominat el nivell!',
    rangedType: 'fireball',
    ultimate: 'flame',
  },
];

// ============================================================
// LEVEL DEFINITIONS
// ============================================================
const LEVELS = [
  {
    id: 'montblanc-1-1',
    name: 'MONTBLANC 1-1',
    time: 300,
    maxEnemies: 2,
    enemies: ['dragonet'],
    spawnRate: 180,
    unlockCode: 'MB11',
    genParams: {},
    abilitiesUnlocked: [],
  },
  {
    id: 'montblanc-1-2',
    name: 'MONTBLANC 1-2',
    time: 280,
    maxEnemies: 4,
    enemies: ['dragonet', 'dragonet'],
    spawnRate: 120,
    unlockCode: 'MB12',
    genParams: { harder: true },
    abilitiesUnlocked: ['ranged'],
  },
  {
    id: 'castell-2-1',
    name: 'CASTELL 2-1',
    time: 300,
    maxEnemies: 3,
    enemies: ['dragonet', 'shooter'],
    spawnRate: 160,
    unlockCode: 'CS21',
    genParams: {},
    abilitiesUnlocked: ['ultimate'],
  },
  {
    id: 'montblanc-1-3',
    name: 'MONTBLANC 1-3',
    time: 260,
    maxEnemies: 5,
    enemies: ['dragonet', 'dragonet', 'shooter'],
    spawnRate: 100,
    unlockCode: 'MB13',
    genParams: { harder: true },
    abilitiesUnlocked: [],
  },
  {
    id: 'castell-2-2',
    name: 'CASTELL 2-2',
    time: 280,
    maxEnemies: 5,
    enemies: ['dragonet', 'shooter', 'shooter'],
    spawnRate: 130,
    unlockCode: 'CS22',
    genParams: { harder: true },
    abilitiesUnlocked: [],
  },
  {
    id: 'montserrat-3-1',
    name: 'MONTSERRAT 3-1',
    time: 300,
    maxEnemies: 6,
    enemies: ['dragonet', 'dragonet', 'shooter', 'dragonet'],
    spawnRate: 110,
    unlockCode: 'MS31',
    genParams: { veryHard: true },
    abilitiesUnlocked: [],
  },
  {
    id: 'montserrat-3-2',
    name: 'MONTSERRAT 3-2',
    time: 250,
    maxEnemies: 7,
    enemies: ['dragonet', 'shooter', 'dragonet', 'shooter', 'dragonet'],
    spawnRate: 90,
    unlockCode: 'MS32',
    genParams: { veryHard: true },
    abilitiesUnlocked: [],
  },
];
