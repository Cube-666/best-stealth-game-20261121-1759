// Gilded Shadow — circle-against-tile movement and sight lines. One job:
// slide a round body through the museum without ever entering a solid tile,
// and say whether one point can see another.
import { TILE } from './config.js';
import { tileAt, isWalkable, blocksSight } from './levels.js';

/** The pixel position of a tile's centre, in world coordinates. */
export function tileCenter(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}

/**
 * Move a circle by (dx, dy) against the level's solid tiles, axis by axis so it
 * slides along walls instead of sticking. Returns the new position.
 */
export function moveCircle(level, x, y, dx, dy, radius) {
  const hitsSolid = (cx, cy) => {
    const left = Math.floor((cx - radius) / TILE);
    const right = Math.floor((cx + radius) / TILE);
    const top = Math.floor((cy - radius) / TILE);
    const bottom = Math.floor((cy + radius) / TILE);
    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (isWalkable(tileAt(level, tx, ty))) continue;
        const nearestX = Math.max(tx * TILE, Math.min(cx, tx * TILE + TILE));
        const nearestY = Math.max(ty * TILE, Math.min(cy, ty * TILE + TILE));
        const ddx = cx - nearestX;
        const ddy = cy - nearestY;
        if (ddx * ddx + ddy * ddy < radius * radius) return true;
      }
    }
    return false;
  };
  let nx = x;
  let ny = y;
  if (dx !== 0 && !hitsSolid(x + dx, y)) nx = x + dx;
  if (dy !== 0 && !hitsSolid(nx, y + dy)) ny = y + dy;
  return { x: nx, y: ny };
}

/** Whether the straight line between two points crosses a sight-blocking tile. */
export function lineBlocked(level, x1, y1, x2, y2) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor((x1 + (x2 - x1) * t) / TILE);
    const ty = Math.floor((y1 + (y2 - y1) * t) / TILE);
    if (blocksSight(tileAt(level, tx, ty))) return true;
  }
  return false;
}
