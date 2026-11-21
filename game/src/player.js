// Gilded Shadow — Wren, the thief. One job: where the player stands, how fast
// they move, and the coin they can throw to pull a guard away.
import {
  PLAYER_WALK_SPEED,
  PLAYER_SNEAK_SPEED,
  PLAYER_RADIUS,
  TILE,
} from './config.js';
import { tileCenter, moveCircle } from './physics.js';

export class Player {
  constructor(startTx, startTy) {
    const at = tileCenter(startTx, startTy);
    this.x = at.x;
    this.y = at.y;
    this.radius = PLAYER_RADIUS;
    this.dirX = 0;
    this.dirY = 1;
    this.sneaking = false;
    this.moving = false;
    this.stepTimer = 0;
    this.coinsThrown = 0;
  }

  /** Move one tick from the input vector; returns true when a footstep sounds. */
  update(dt, level, input) {
    const v = input.moveVector();
    this.sneaking = input.sneak;
    const speed = this.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
    this.moving = v.x !== 0 || v.y !== 0;
    let stepped = false;
    if (this.moving) {
      this.dirX = v.x;
      this.dirY = v.y;
      const moved = moveCircle(level, this.x, this.y, v.x * speed * dt, v.y * speed * dt, this.radius);
      this.x = moved.x;
      this.y = moved.y;
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.sneaking ? 0.55 : 0.34;
        stepped = true;
      }
    } else {
      this.stepTimer = 0;
    }
    return stepped;
  }

  /** The tile the player stands on. */
  tile() {
    return { tx: Math.floor(this.x / TILE), ty: Math.floor(this.y / TILE) };
  }
}
