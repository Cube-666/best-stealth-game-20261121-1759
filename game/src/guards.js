// Gilded Shadow — the night guards. One job: patrol the floor, see with a cone,
// hear running feet and falling coins, and decide whether to walk, wonder or chase.
import {
  GUARD_PATROL_SPEED,
  GUARD_SUSPECT_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_RADIUS,
  GUARD_SIGHT_RANGE,
  GUARD_SIGHT_HALF_ANGLE,
  DETECT_SUSPECT_AT,
  DETECT_ALERT_AT,
  DETECT_FILL_PER_SECOND,
  DETECT_DECAY_PER_SECOND,
  HEAR_FILL_PER_SECOND,
  HEAR_RUN_RADIUS,
  MOD_IN_LIGHT,
  MOD_IN_DARK,
  MOD_SNEAKING,
  MOD_RUNNING,
  LOSE_SIGHT_SECONDS,
  SEARCH_SECONDS,
  TILE,
} from './config.js';
import { tileCenter, moveCircle, lineBlocked } from './physics.js';
import { tileAt, blocksSight } from './levels.js';

/** Smallest signed angle from a to b, in (-PI, PI]. */
export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

export class Guard {
  constructor(def) {
    const at = tileCenter(def.waypoints[0][0], def.waypoints[0][1]);
    this.name = def.name;
    this.x = at.x;
    this.y = at.y;
    this.radius = GUARD_RADIUS;
    this.waypoints = def.waypoints.map(([tx, ty]) => tileCenter(tx, ty));
    this.pause = def.pause;
    this.state = 'patrol';
    this.wpIndex = 1 % this.waypoints.length;
    this.waitTimer = 0;
    this.facing = 0;
    this.detection = 0;
    this.lastSeen = null;
    this.investigate = null;
    this.loseTimer = 0;
    this.searchTimer = 0;
    this.scanAngle = 0;
    this.stepTimer = 0;
    this.idleTime = 0;
    this.justSpotted = false;
    this.justAlerted = false;
    this.faceToward(this.waypoints[this.wpIndex]);
  }

  faceToward(point) {
    this.facing = Math.atan2(point.y - this.y, point.x - this.x);
  }

  /** Can this guard see the point (px, py) right now? */
  canSee(level, px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > GUARD_SIGHT_RANGE) return false;
    if (dist > 1 && Math.abs(angleDiff(this.facing, Math.atan2(dy, dx))) > GUARD_SIGHT_HALF_ANGLE) {
      return false;
    }
    return !lineBlocked(level, this.x, this.y, px, py);
  }

  /** The vision cone as a polygon of ray endpoints, clipped by walls. */
  conePolygon(level) {
    const rays = 26;
    const points = [{ x: this.x, y: this.y }];
    for (let i = 0; i <= rays; i++) {
      const a = this.facing - GUARD_SIGHT_HALF_ANGLE + (2 * GUARD_SIGHT_HALF_ANGLE * i) / rays;
      let reach = GUARD_SIGHT_RANGE;
      for (let d = 8; d <= GUARD_SIGHT_RANGE; d += 8) {
        const tx = Math.floor((this.x + Math.cos(a) * d) / TILE);
        const ty = Math.floor((this.y + Math.sin(a) * d) / TILE);
        if (blocksSight(tileAt(level, tx, ty))) {
          reach = d;
          break;
        }
      }
      points.push({ x: this.x + Math.cos(a) * reach, y: this.y + Math.sin(a) * reach });
    }
    return points;
  }

  /** Walk toward a point at a speed; returns true while still moving. */
  walkToward(level, dt, point, speed) {
    const dx = point.x - this.x;
    const dy = point.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return false;
    const step = Math.min(dist, speed * dt);
    this.facing = Math.atan2(dy, dx);
    const moved = moveCircle(level, this.x, this.y, (dx / dist) * step, (dy / dist) * step, this.radius);
    this.x = moved.x;
    this.y = moved.y;
    return true;
  }

  /** One tick: perceive the player, then act on the current state. */
  update(dt, level, player, playerInLight, noises) {
    this.justSpotted = false;
    this.justAlerted = false;
    const sees = this.canSee(level, player.x, player.y);
    const dist = Math.hypot(player.x - this.x, player.y - this.y);

    if (sees) {
      this.lastSeen = { x: player.x, y: player.y };
      this.loseTimer = 0;
      let rate = DETECT_FILL_PER_SECOND * (1 - dist / (GUARD_SIGHT_RANGE * 1.15));
      rate *= playerInLight ? MOD_IN_LIGHT : MOD_IN_DARK;
      rate *= player.sneaking ? MOD_SNEAKING : MOD_RUNNING;
      const before = this.detection;
      this.detection = Math.min(DETECT_ALERT_AT, this.detection + rate * dt);
      if (before < DETECT_SUSPECT_AT && this.detection >= DETECT_SUSPECT_AT && this.state === 'patrol') {
        this.justSpotted = true;
      }
      if (this.detection >= DETECT_ALERT_AT && this.state !== 'alert') {
        this.state = 'alert';
        this.justAlerted = true;
      }
    } else {
      this.detection = Math.max(0, this.detection - DETECT_DECAY_PER_SECOND * dt);
      if (this.state === 'alert') {
        this.loseTimer += dt;
        if (this.loseTimer > LOSE_SIGHT_SECONDS) {
          this.state = 'search';
          this.searchTimer = SEARCH_SECONDS;
          this.investigate = this.lastSeen ? { ...this.lastSeen } : { x: this.x, y: this.y };
        }
      }
    }

    // Hearing: running feet nearby, and any noise that just rang out.
    if (!player.sneaking && player.moving && dist < HEAR_RUN_RADIUS && this.state === 'patrol') {
      this.detection = Math.min(DETECT_ALERT_AT, this.detection + HEAR_FILL_PER_SECOND * dt);
      if (this.detection >= DETECT_SUSPECT_AT) this.justSpotted = true;
    }
    for (const noise of noises) {
      const nd = Math.hypot(noise.x - this.x, noise.y - this.y);
      if (nd < noise.radius && this.state !== 'alert') {
        this.investigate = { x: noise.x, y: noise.y };
        if (this.state === 'patrol') this.state = 'suspect';
        this.detection = Math.max(this.detection, DETECT_SUSPECT_AT);
      }
    }

    let moving = false;
    if (this.state === 'patrol') {
      if (this.detection >= DETECT_SUSPECT_AT) {
        this.state = 'suspect';
        this.investigate = this.lastSeen ? { ...this.lastSeen } : null;
      } else if (this.waitTimer > 0) {
        this.waitTimer -= dt;
        this.idleTime += dt;
        this.facing += Math.sin(this.idleTime * 1.4) * 0.004;
      } else {
        const target = this.waypoints[this.wpIndex];
        moving = this.walkToward(level, dt, target, GUARD_PATROL_SPEED);
        if (!moving) {
          this.waitTimer = this.pause;
          this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
        }
      }
    } else if (this.state === 'suspect') {
      if (this.detection >= DETECT_ALERT_AT) {
        this.state = 'alert';
        this.justAlerted = true;
      } else if (this.investigate) {
        moving = this.walkToward(level, dt, this.investigate, GUARD_SUSPECT_SPEED);
        if (!moving) {
          this.state = 'search';
          this.searchTimer = SEARCH_SECONDS;
          this.scanAngle = this.facing;
        }
      } else {
        this.state = 'search';
        this.searchTimer = SEARCH_SECONDS;
        this.scanAngle = this.facing;
      }
    } else if (this.state === 'alert') {
      moving = this.walkToward(level, dt, { x: player.x, y: player.y }, GUARD_CHASE_SPEED);
    } else if (this.state === 'search') {
      this.searchTimer -= dt;
      this.facing = this.scanAngle + Math.sin((SEARCH_SECONDS - this.searchTimer) * 2.4) * 1.1;
      if (this.searchTimer <= 0) {
        this.state = 'return';
        this.detection = Math.max(0, this.detection - 30);
      }
    } else if (this.state === 'return') {
      let nearest = this.waypoints[0];
      let best = Infinity;
      for (const wp of this.waypoints) {
        const d = Math.hypot(wp.x - this.x, wp.y - this.y);
        if (d < best) {
          best = d;
          nearest = wp;
        }
      }
      moving = this.walkToward(level, dt, nearest, GUARD_PATROL_SPEED);
      if (!moving) {
        this.wpIndex = (this.waypoints.indexOf(nearest) + 1) % this.waypoints.length;
        this.state = 'patrol';
        this.detection = 0;
      }
    }

    // Footsteps: the sound that tells the player where a guard is.
    if (moving) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.state === 'alert' ? 0.3 : 0.46;
        this.stepped = true;
      } else {
        this.stepped = false;
      }
    } else {
      this.stepped = false;
    }
  }
}
