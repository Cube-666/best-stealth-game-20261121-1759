// Gilded Shadow — the world: one level at a time, its artifacts, its exit,
// its noises, its score, and the screens between title and triumph.
// One job: hold the state and step it forward one tick at a time.
import {
  COIN_NOISE_RADIUS,
  START_COINS,
  TILE,
  PLAY_X,
  PLAY_Y,
} from './config.js';
import { LEVELS, findTiles, tileAt, TILE_LAMP } from './levels.js';
import { tileCenter } from './physics.js';
import { Player } from './player.js';
import { Guard } from './guards.js';
import { SoundBank } from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_WIN = 'win';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_PAUSED = 'paused';

export class World {
  constructor(sounds) {
    this.sounds = sounds || new SoundBank();
    this.screen = SCREEN_TITLE;
    this.levelIndex = 0;
    this.score = 0;
    this.time = 0;
    this.ghostLevels = 0;
    this.levelAlerted = false;
    this.levelStartScore = 0;
    this.clearTimer = 0;
    this.caughtBy = null;
    this.coinFlight = null;
    this.noises = [];
    this.message = '';
    this.messageTimer = 0;
    this.loadLevel(0);
  }

  get level() {
    return LEVELS[this.levelIndex];
  }

  loadLevel(index) {
    this.levelIndex = index;
    const level = LEVELS[index];
    const start = findTiles(level, 'P')[0];
    this.player = new Player(start.tx, start.ty);
    this.guards = level.guards.map((def) => new Guard(def));
    this.artifacts = findTiles(level, 'A').map(({ tx, ty }) => ({ ...tileCenter(tx, ty), tx, ty, taken: false }));
    const exit = findTiles(level, 'E')[0];
    this.exit = { ...tileCenter(exit.tx, exit.ty), tx: exit.tx, ty: exit.ty, open: false };
    this.lamps = findTiles(level, TILE_LAMP).map(({ tx, ty }) => tileCenter(tx, ty));
    this.coins = START_COINS;
    this.coinFlight = null;
    this.noises = [];
    this.levelAlerted = false;
    this.levelStartScore = this.score;
    this.levelTime = 0;
    this.message = level.intro;
    this.messageTimer = 5;
  }

  get artifactsLeft() {
    return this.artifacts.filter((a) => !a.taken).length;
  }

  get heat() {
    return this.guards.reduce((m, g) => Math.max(m, g.detection), 0);
  }

  get alarmed() {
    return this.guards.some((g) => g.state === 'alert');
  }

  /** Is the player standing in a lamp's pool of light? */
  playerInLight() {
    for (const lamp of this.lamps) {
      if (Math.hypot(this.player.x - lamp.x, this.player.y - lamp.y) < 78) return true;
    }
    return false;
  }

  /** Throw a coin toward the clicked point in world coordinates. */
  throwCoin(wx, wy) {
    if (this.screen !== SCREEN_PLAY || this.coins <= 0 || this.coinFlight) return;
    this.coins -= 1;
    this.player.coinsThrown += 1;
    const dx = wx - this.player.x;
    const dy = wy - this.player.y;
    const dist = Math.hypot(dx, dy);
    const range = Math.min(dist, 260);
    const target = {
      x: this.player.x + (dist === 0 ? 0 : (dx / dist) * range),
      y: this.player.y + (dist === 0 ? 0 : (dy / dist) * range),
    };
    this.coinFlight = { from: { x: this.player.x, y: this.player.y }, to: target, t: 0 };
  }

  startGame() {
    this.score = 0;
    this.time = 0;
    this.ghostLevels = 0;
    this.loadLevel(0);
    this.screen = SCREEN_PLAY;
  }

  restartLevel() {
    this.score = this.levelStartScore;
    this.loadLevel(this.levelIndex);
    this.screen = SCREEN_PLAY;
  }

  nextLevel() {
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.screen = SCREEN_WIN;
      this.sounds.win();
      return;
    }
    this.loadLevel(this.levelIndex + 1);
    this.screen = SCREEN_PLAY;
  }

  /** One tick of play. Input is read here so the loop stays thin. */
  update(dt, input) {
    if (this.screen !== SCREEN_PLAY) return;
    this.time += dt;
    this.levelTime += dt;
    if (this.messageTimer > 0) this.messageTimer -= dt;

    // The flying coin lands, rings, and pulls every guard in earshot.
    if (this.coinFlight) {
      this.coinFlight.t += dt / 0.35;
      if (this.coinFlight.t >= 1) {
        const at = this.coinFlight.to;
        this.noises.push({ x: at.x, y: at.y, radius: COIN_NOISE_RADIUS, ttl: 0.8 });
        this.sounds.coinClink();
        this.coinFlight = null;
      }
    }
    if (input.click) {
      this.throwCoin(input.click.x - PLAY_X, input.click.y - PLAY_Y);
    }

    const stepped = this.player.update(dt, this.level, input);
    if (stepped) this.sounds.playerStep();

    const inLight = this.playerInLight();
    const noises = this.noises;
    for (const guard of this.guards) {
      guard.update(dt, this.level, this.player, inLight, noises);
      if (guard.stepped) {
        const d = Math.hypot(guard.x - this.player.x, guard.y - this.player.y);
        this.sounds.footstep(d, 340);
      }
      if (guard.justSpotted) this.sounds.suspicious();
      if (guard.justAlerted) {
        this.levelAlerted = true;
        this.sounds.alarm();
      }
    }
    for (const noise of this.noises) noise.ttl -= dt;
    this.noises = this.noises.filter((n) => n.ttl > 0);

    // Caught: a chasing guard closes in.
    for (const guard of this.guards) {
      const d = Math.hypot(guard.x - this.player.x, guard.y - this.player.y);
      if (guard.state === 'alert' && d < guard.radius + this.player.radius + 4) {
        this.caughtBy = guard.name;
        this.screen = SCREEN_CAUGHT;
        this.sounds.caught();
        return;
      }
    }

    // Artifacts lift off their pedestals when the player walks over them.
    for (const artifact of this.artifacts) {
      if (artifact.taken) continue;
      if (Math.hypot(artifact.x - this.player.x, artifact.y - this.player.y) < TILE * 0.55) {
        artifact.taken = true;
        this.score += 1000;
        this.sounds.pickup();
        if (this.artifactsLeft === 0) {
          this.exit.open = true;
          this.sounds.doorOpen();
          this.message = 'The way out is open — slip away unseen.';
          this.messageTimer = 4;
        }
      }
    }

    // The exit, once open, ends the level.
    if (this.exit.open) {
      const d = Math.hypot(this.exit.x - this.player.x, this.exit.y - this.player.y);
      if (d < TILE * 0.55) {
        const timeBonus = Math.max(0, 900 - Math.floor(this.levelTime) * 10);
        const ghostBonus = this.levelAlerted ? 0 : 500;
        this.score += timeBonus + ghostBonus;
        if (!this.levelAlerted) this.ghostLevels += 1;
        this.clearTimer = 0;
        this.screen = SCREEN_CLEAR;
      }
    }
  }

  /** Advance a clear screen; the loop calls this outside play. */
  updateClear(dt) {
    if (this.screen !== SCREEN_CLEAR) return;
    this.clearTimer += dt;
    if (this.clearTimer > 2.6) this.nextLevel();
  }
}
