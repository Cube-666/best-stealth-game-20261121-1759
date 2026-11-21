// Gilded Shadow — shared tuning: canvas size, tile grid, movement, sight and sound.
// One job: every number the rest of the game agrees on lives here.
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 800;
export const HUD_HEIGHT = 64;
export const TILE = 48;
export const COLS = 26;
export const ROWS = 15;
export const PLAY_X = (CANVAS_WIDTH - COLS * TILE) / 2;
export const PLAY_Y = HUD_HEIGHT;

// Movement, in pixels per second.
export const PLAYER_WALK_SPEED = 132;
export const PLAYER_SNEAK_SPEED = 72;
export const PLAYER_RADIUS = 14;
export const GUARD_PATROL_SPEED = 56;
export const GUARD_SUSPECT_SPEED = 78;
export const GUARD_CHASE_SPEED = 118;
export const GUARD_RADIUS = 15;

// Sight: how far a guard sees, and how wide its cone is (half-angle in radians).
export const GUARD_SIGHT_RANGE = 205;
export const GUARD_SIGHT_HALF_ANGLE = 0.62;
// Hearing: a running player is heard inside this radius; a thrown coin is heard inside its own.
export const HEAR_RUN_RADIUS = 135;
export const COIN_NOISE_RADIUS = 175;

// Detection: the meter runs 0 to 100. Suspicion starts the investigate walk, 100 is a chase.
export const DETECT_SUSPECT_AT = 55;
export const DETECT_ALERT_AT = 100;
export const DETECT_FILL_PER_SECOND = 62;
export const DETECT_DECAY_PER_SECOND = 30;
export const HEAR_FILL_PER_SECOND = 14;
// Modifiers on how fast the meter fills while a guard can see the player.
export const MOD_IN_LIGHT = 1.35;
export const MOD_IN_DARK = 0.6;
export const MOD_SNEAKING = 0.55;
export const MOD_RUNNING = 1.15;
// A guard that loses sight keeps chasing for this long, then searches where it last saw the player.
export const LOSE_SIGHT_SECONDS = 2.5;
export const SEARCH_SECONDS = 2.2;

// Coins: how many a level starts the player with.
export const START_COINS = 3;

// Colours.
export const COLORS = {
  floorA: '#2b2f3a',
  floorB: '#272b35',
  wall: '#171a24',
  wallTop: '#3a4152',
  crate: '#6b4a2b',
  crateEdge: '#8a6238',
  caseGlass: '#9fc4d8',
  caseFrame: '#c9a227',
  lampGlow: '#ffb85c',
  player: '#2dd4bf',
  playerDark: '#0f766e',
  guard: '#e8e4d8',
  guardUniform: '#3b4a6b',
  conePatrol: 'rgba(255, 214, 106, 0.20)',
  coneSuspect: 'rgba(255, 154, 60, 0.30)',
  coneAlert: 'rgba(255, 77, 77, 0.34)',
  artifact: '#ffd76a',
  exit: '#4ade80',
  exitLocked: '#64748b',
  hudBg: '#10131c',
  hudText: '#e8e4d8',
  hudDim: '#8a90a3',
};
