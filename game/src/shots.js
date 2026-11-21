// Gilded Shadow — screenshot scenes. One job: play the real rules forward from
// a fresh world, with a small autopilot, so each screenshot is a frame a real
// game produces — never a composed picture. Deterministic: fixed seeds, fixed dt.
import { TILE } from './config.js';
import { tileAt, isWalkable, findTiles } from './levels.js';
import { tileCenter } from './physics.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN, SCREEN_CAUGHT } from './world.js';

const DT = 1 / 60;

/** Breadth-first path over walkable tiles, from one tile to another. */
export function findPath(level, fromTx, fromTy, toTx, toTy) {
  const key = (x, y) => `${x},${y}`;
  const prev = new Map();
  const queue = [[fromTx, fromTy]];
  prev.set(key(fromTx, fromTy), null);
  while (queue.length > 0) {
    const [x, y] = queue.shift();
    if (x === toTx && y === toTy) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (prev.has(key(nx, ny)) || !isWalkable(tileAt(level, nx, ny))) continue;
      prev.set(key(nx, ny), [x, y]);
      queue.push([nx, ny]);
    }
  }
  if (!prev.has(key(toTx, toTy))) return null;
  const path = [];
  let at = [toTx, toTy];
  while (at) {
    path.unshift(tileCenter(at[0], at[1]));
    at = prev.get(key(at[0], at[1]));
  }
  return path;
}

/** A fake input the autopilot steers, shaped like the real Input class. */
function autopilotInput(world, path, nodeIndex, sneak) {
  const target = path[nodeIndex];
  if (!target) return { moveVector: () => ({ x: 0, y: 0 }), sneak, click: null };
  const dx = target.x - world.player.x;
  const dy = target.y - world.player.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 6) return { moveVector: () => ({ x: 0, y: 0 }), sneak, click: null };
  return {
    moveVector: () => ({ x: dx / dist, y: dy / dist }),
    sneak,
    click: null,
  };
}

/**
 * Walk the player through a list of target tiles, sneaking, retreating a step
 * whenever the heat climbs. Stops when every target is reached, the screen
 * leaves play, or the seconds run out. Returns what happened.
 */
export function driveThrough(world, targets, maxSeconds, sneak) {
  const still = { moveVector: () => ({ x: 0, y: 0 }), sneak, click: null };
  let seconds = 0;
  let targetIndex = 0;
  let path = null;
  let nodeIndex = 0;
  let retreat = false;
  while (seconds < maxSeconds && world.screen === SCREEN_PLAY) {
    if (targetIndex >= targets.length) break;
    const [ttx, tty] = targets[targetIndex];
    const here = world.player.tile();
    if (here.tx === ttx && here.ty === tty) {
      targetIndex++;
      path = null;
      continue;
    }
    if (!path) {
      path = findPath(world.level, here.tx, here.ty, ttx, tty);
      nodeIndex = 0;
      if (!path) return { done: false, seconds, reason: 'no path' };
    }
    // Too hot: step back along the path until the eye calms down.
    if (world.heat > 30) retreat = true;
    if (retreat && world.heat < 12) retreat = false;
    if (retreat) {
      nodeIndex = Math.max(0, nodeIndex - 1);
      const back = path[nodeIndex];
      const dx = back.x - world.player.x;
      const dy = back.y - world.player.y;
      const dist = Math.hypot(dx, dy);
      const input = {
        moveVector: () => (dist < 6 ? { x: 0, y: 0 } : { x: dx / dist, y: dy / dist }),
        sneak,
        click: null,
      };
      world.update(DT, input);
      world.updateClear(DT);
      seconds += DT;
      continue;
    }
    const node = path[nodeIndex];
    const dx = node.x - world.player.x;
    const dy = node.y - world.player.y;
    if (Math.hypot(dx, dy) < 6) {
      nodeIndex++;
      continue;
    }
    world.update(DT, autopilotInput(world, path, nodeIndex, sneak));
    world.updateClear(DT);
    seconds += DT;
  }
  return { done: targetIndex >= targets.length, seconds, reason: world.screen };
}

/** Run the world forward with no input, for a number of seconds. */
export function idleFor(world, seconds) {
  const still = { moveVector: () => ({ x: 0, y: 0 }), sneak: false, click: null };
  let elapsed = 0;
  while (elapsed < seconds && world.screen === SCREEN_PLAY) {
    world.update(DT, still);
    elapsed += DT;
  }
  return elapsed;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 *   title  — the title screen over a living first floor
 *   sneak  — sixteen seconds into a careful approach on the first floor
 *   alert  — a guard's eye fills and the chase begins
 *   escape — the whole first floor, lifted and slipped away from
 */
export function stageShot(name, world) {
  if (name === 'sneak') {
    world.loadLevel(0);
    world.screen = SCREEN_PLAY;
    const artifact = findTiles(world.level, 'A')[0];
    driveThrough(world, [[artifact.tx, artifact.ty]], 16, true);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'alert') {
    world.loadLevel(0);
    world.screen = SCREEN_PLAY;
    // Stand one tile below Bram's patrol, in the lamplight, and wait to be seen.
    const at = tileCenter(14, 12);
    world.player.x = at.x;
    world.player.y = at.y;
    const still = { moveVector: () => ({ x: 0, y: 0 }), sneak: false, click: null };
    let elapsed = 0;
    while (elapsed < 12 && world.screen === SCREEN_PLAY) {
      world.update(DT, still);
      elapsed += DT;
      if (world.guards.some((g) => g.state === 'alert')) break;
    }
    return { screen: SCREEN_PLAY };
  }
  if (name === 'escape') {
    world.loadLevel(0);
    world.screen = SCREEN_PLAY;
    const targets = findTiles(world.level, 'A').map((t) => [t.tx, t.ty]);
    const exit = findTiles(world.level, 'E')[0];
    targets.push([exit.tx, exit.ty]);
    driveThrough(world, targets, 150, true);
    // Freeze on the clear screen: the gallery emptied, the score just counted.
    return { screen: world.screen };
  }
  // title (and anything unknown): a living first floor behind the title card.
  world.loadLevel(0);
  world.screen = SCREEN_PLAY;
  idleFor(world, 6);
  world.screen = SCREEN_TITLE;
  return { screen: SCREEN_TITLE };
}
