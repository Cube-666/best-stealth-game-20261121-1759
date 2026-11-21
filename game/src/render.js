// Gilded Shadow — everything the eye sees. One job: draw the museum, the
// cones, the thief, the guards, the lamplight and the dark, plus the HUD and
// the title, clear, caught and win screens.
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  HUD_HEIGHT,
  TILE,
  COLS,
  ROWS,
  PLAY_X,
  PLAY_Y,
  COLORS,
} from './config.js';
import { tileAt, TILE_WALL, TILE_CRATE, TILE_CASE, TILE_LAMP } from './levels.js';
import {
  SCREEN_TITLE,
  SCREEN_PLAY,
  SCREEN_CLEAR,
  SCREEN_WIN,
  SCREEN_CAUGHT,
  SCREEN_PAUSED,
} from './world.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = CANVAS_WIDTH;
    this.lightCanvas.height = CANVAS_HEIGHT;
    this.lightCtx = this.lightCanvas.getContext('2d');
  }

  draw(world) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.save();
    ctx.translate(PLAY_X, PLAY_Y);
    this.drawFloor(world);
    this.drawExit(world);
    this.drawArtifacts(world);
    this.drawProps(world);
    this.drawWalls(world);
    this.drawNoises(world);
    this.drawCones(world);
    this.drawGuards(world);
    this.drawPlayer(world);
    this.drawLighting(world);
    ctx.restore();
    this.drawHud(world);
    this.drawScreen(world);
  }

  drawFloor(world) {
    const ctx = this.ctx;
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < COLS; tx++) {
        const x = tx * TILE;
        const y = ty * TILE;
        ctx.fillStyle = (tx + ty) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
        ctx.fillRect(x, y, TILE, TILE);
        // Parquet seams.
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        if (tileAt(world.level, tx, ty) === TILE_LAMP) {
          const cx = x + TILE / 2;
          const cy = y + TILE / 2;
          const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 74);
          glow.addColorStop(0, 'rgba(255, 184, 92, 0.30)');
          glow.addColorStop(1, 'rgba(255, 184, 92, 0)');
          ctx.fillStyle = glow;
          ctx.fillRect(cx - 74, cy - 74, 148, 148);
        }
      }
    }
  }

  drawWalls(world) {
    const ctx = this.ctx;
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < COLS; tx++) {
        if (tileAt(world.level, tx, ty) !== TILE_WALL) continue;
        const x = tx * TILE;
        const y = ty * TILE;
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, TILE, 5);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      }
    }
  }

  drawProps(world) {
    const ctx = this.ctx;
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < COLS; tx++) {
        const tile = tileAt(world.level, tx, ty);
        const x = tx * TILE;
        const y = ty * TILE;
        if (tile === TILE_CRATE) {
          ctx.fillStyle = COLORS.crate;
          ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);
          ctx.strokeStyle = COLORS.crateEdge;
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 5, y + 5, TILE - 10, TILE - 10);
          ctx.beginPath();
          ctx.moveTo(x + 5, y + 5);
          ctx.lineTo(x + TILE - 5, y + TILE - 5);
          ctx.moveTo(x + TILE - 5, y + 5);
          ctx.lineTo(x + 5, y + TILE - 5);
          ctx.stroke();
        } else if (tile === TILE_CASE) {
          ctx.fillStyle = 'rgba(159, 196, 216, 0.22)';
          ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
          ctx.strokeStyle = COLORS.caseFrame;
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
          ctx.fillStyle = COLORS.caseFrame;
          ctx.fillRect(x + 4, y + TILE - 8, TILE - 8, 4);
        } else if (tile === TILE_LAMP) {
          const cx = x + TILE / 2;
          const cy = y + TILE / 2;
          ctx.fillStyle = '#3a2f22';
          ctx.fillRect(cx - 3, cy - 8, 6, 16);
          ctx.fillStyle = COLORS.lampGlow;
          ctx.beginPath();
          ctx.arc(cx, cy - 10, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  drawExit(world) {
    const ctx = this.ctx;
    const e = world.exit;
    const x = e.x - TILE / 2;
    const y = e.y - TILE / 2;
    ctx.fillStyle = e.open ? 'rgba(74, 222, 128, 0.25)' : 'rgba(100, 116, 139, 0.18)';
    ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
    ctx.strokeStyle = e.open ? COLORS.exit : COLORS.exitLocked;
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
    ctx.fillStyle = e.open ? COLORS.exit : COLORS.exitLocked;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', e.x, e.y);
  }

  drawArtifacts(world) {
    const ctx = this.ctx;
    for (const a of world.artifacts) {
      if (a.taken) continue;
      const pulse = 0.75 + 0.25 * Math.sin(world.time * 3 + a.tx);
      const glow = ctx.createRadialGradient(a.x, a.y, 2, a.x, a.y, 30);
      glow.addColorStop(0, `rgba(255, 215, 106, ${0.5 * pulse})`);
      glow.addColorStop(1, 'rgba(255, 215, 106, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(a.x - 30, a.y - 30, 60, 60);
      ctx.fillStyle = COLORS.artifact;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y - 12);
      ctx.lineTo(a.x + 9, a.y);
      ctx.lineTo(a.x, a.y + 12);
      ctx.lineTo(a.x - 9, a.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff7d6';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y - 6);
      ctx.lineTo(a.x + 4, a.y);
      ctx.lineTo(a.x, a.y + 6);
      ctx.lineTo(a.x - 4, a.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawNoises(world) {
    const ctx = this.ctx;
    if (world.coinFlight) {
      const f = world.coinFlight;
      const x = f.from.x + (f.to.x - f.from.x) * f.t;
      const y = f.from.y + (f.to.y - f.from.y) * f.t - Math.sin(f.t * Math.PI) * 26;
      ctx.fillStyle = COLORS.artifact;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const noise of world.noises) {
      const p = 1 - noise.ttl / 0.8;
      ctx.strokeStyle = `rgba(255, 215, 106, ${0.8 * (1 - p)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(noise.x, noise.y, 12 + p * noise.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawCones(world) {
    const ctx = this.ctx;
    for (const guard of world.guards) {
      const poly = guard.conePolygon(world.level);
      ctx.fillStyle =
        guard.state === 'alert'
          ? COLORS.coneAlert
          : guard.state === 'suspect' || guard.state === 'search'
            ? COLORS.coneSuspect
            : COLORS.conePatrol;
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawGuards(world) {
    const ctx = this.ctx;
    for (const guard of world.guards) {
      // Body.
      ctx.fillStyle = COLORS.guardUniform;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.guard;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Facing tick and cap brim.
      const fx = guard.x + Math.cos(guard.facing) * (guard.radius + 4);
      const fy = guard.y + Math.sin(guard.facing) * (guard.radius + 4);
      ctx.strokeStyle = COLORS.guard;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      ctx.lineTo(fx, fy);
      ctx.stroke();
      ctx.fillStyle = COLORS.guard;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (guard.state === 'alert') ctx.fillText('!', guard.x, guard.y - guard.radius - 12);
      else if (guard.state === 'suspect' || guard.state === 'search') {
        ctx.fillText('?', guard.x, guard.y - guard.radius - 12);
      }
      // Detection arc over the guard's head.
      if (guard.detection > 4) {
        ctx.strokeStyle = guard.detection >= 55 ? '#ff9a3c' : '#ffd76a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(guard.x, guard.y, guard.radius + 7, -Math.PI / 2, -Math.PI / 2 + (guard.detection / 100) * Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  drawPlayer(world) {
    const ctx = this.ctx;
    const p = world.player;
    const r = p.sneaking ? p.radius - 2 : p.radius;
    // A soft ring shows how hot the player is running.
    const heat = world.heat;
    if (heat > 4) {
      ctx.strokeStyle = heat >= 55 ? 'rgba(255, 77, 77, 0.85)' : 'rgba(255, 214, 106, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 8, -Math.PI / 2, -Math.PI / 2 + (heat / 100) * Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = p.sneaking ? COLORS.playerDark : COLORS.player;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a7f3ea';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Hood point shows the direction of travel.
    const hx = p.x + p.dirX * (r + 5);
    const hy = p.y + p.dirY * (r + 5);
    ctx.fillStyle = '#a7f3ea';
    ctx.beginPath();
    ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  /** The night itself: a dark veil with holes punched at the lamps and the player. */
  drawLighting(world) {
    const ctx = this.ctx;
    const lc = this.lightCtx;
    lc.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    lc.save();
    lc.translate(PLAY_X, PLAY_Y);
    lc.fillStyle = 'rgba(5, 7, 18, 0.44)';
    lc.fillRect(-PLAY_X, -PLAY_Y, CANVAS_WIDTH, CANVAS_HEIGHT);
    lc.globalCompositeOperation = 'destination-out';
    const hole = (x, y, radius) => {
      const g = lc.createRadialGradient(x, y, 4, x, y, radius);
      g.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
      g.addColorStop(0.7, 'rgba(0, 0, 0, 0.55)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lc.fillStyle = g;
      lc.beginPath();
      lc.arc(x, y, radius, 0, Math.PI * 2);
      lc.fill();
    };
    for (const lamp of world.lamps) hole(lamp.x, lamp.y, 120);
    hole(world.player.x, world.player.y, 110);
    for (const guard of world.guards) hole(guard.x, guard.y, 70);
    hole(world.exit.x, world.exit.y, 70);
    lc.restore();
    ctx.drawImage(this.lightCanvas, -PLAY_X, -PLAY_Y);
  }

  drawHud(world) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.hudBg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);
    ctx.fillStyle = '#2a2f3f';
    ctx.fillRect(0, HUD_HEIGHT - 2, CANVAS_WIDTH, 2);
    ctx.textBaseline = 'middle';

    // Left: level and relics.
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText(`Gilded Shadow — ${world.level.name}`, 18, 22);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '15px sans-serif';
    const taken = world.artifacts.length - world.artifactsLeft;
    ctx.fillText(`Relics ${taken}/${world.artifacts.length}    Coins ${world.coins}    Score ${world.score}`, 18, 46);

    // Centre: the eye — how seen the player is.
    const heat = world.heat;
    const barX = CANVAS_WIDTH / 2 - 130;
    const barY = 22;
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(world.alarmed ? 'SPOTTED — RUN!' : heat >= 55 ? 'SUSPICIOUS' : 'UNSEEN', barX, barY - 8 + 8);
    ctx.fillStyle = '#262b38';
    ctx.fillRect(barX, barY + 10, 260, 12);
    ctx.fillStyle = heat >= 100 ? '#ff4d4d' : heat >= 55 ? '#ff9a3c' : '#ffd76a';
    ctx.fillRect(barX, barY + 10, 260 * Math.min(1, heat / 100), 12);
    ctx.strokeStyle = '#3a4152';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX + 0.5, barY + 10.5, 260, 12);

    // Right: the clock.
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 19px sans-serif';
    const t = Math.floor(world.time);
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = String(t % 60).padStart(2, '0');
    ctx.fillText(`${mm}:${ss}`, CANVAS_WIDTH - 18, 22);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '15px sans-serif';
    ctx.fillText(world.player.sneaking ? 'SNEAKING' : 'WALKING', CANVAS_WIDTH - 18, 46);
  }

  /** The dim hint line under the playfield, and the level's own message. */
  drawHint(world, text) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10);
  }

  panel(title, lines, accent) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(5, 7, 18, 0.72)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const w = 680;
    const h = 150 + lines.length * 30;
    const x = (CANVAS_WIDTH - w) / 2;
    const y = (CANVAS_HEIGHT - h) / 2;
    ctx.fillStyle = '#141824';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accent;
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(title, CANVAS_WIDTH / 2, y + 52);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = '17px sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, CANVAS_WIDTH / 2, y + 108 + i * 30);
    });
  }

  drawScreen(world) {
    const ctx = this.ctx;
    if (world.screen === SCREEN_TITLE) {
      this.panel('GILDED SHADOW', [
        'The Meridian Gallery, after dark. You are Wren, and the relics are unguarded — almost.',
        'Slip past the patrols, lift every relic, and reach the green EXIT unseen.',
        'WASD or arrows to move · hold Shift to sneak · click to toss a coin and distract a guard',
        'Lamplight betrays you. Darkness hides you. A guard who sees you fills the eye above.',
        'Press Enter or click to begin.',
      ], COLORS.artifact);
      this.drawHint(world, 'A stealth game in three galleries · sound on for footsteps');
    } else if (world.screen === SCREEN_CLEAR) {
      const timeBonus = Math.max(0, 900 - Math.floor(world.levelTime) * 10);
      this.panel('GALLERY CLEARED', [
        `${world.level.name} — every relic lifted.`,
        `Time bonus ${timeBonus} · ${world.levelAlerted ? 'Spotted along the way.' : 'Never once seen. Ghost bonus +500.'}`,
        `Score ${world.score}`,
      ], COLORS.exit);
    } else if (world.screen === SCREEN_WIN) {
      this.panel('THE NIGHT IS YOURS', [
        'All three galleries emptied, and the Meridian never knew you were there.',
        `Final score ${world.score} · ${world.ghostLevels} ghost ${world.ghostLevels === 1 ? 'gallery' : 'galleries'} · ${Math.floor(world.time)}s in the dark`,
        'Press R to steal it all again.',
      ], COLORS.artifact);
    } else if (world.screen === SCREEN_CAUGHT) {
      this.panel('SPOTTED!', [
        `${world.caughtBy} caught you in the lamplight. The gallery keeps its relics — this time.`,
        'Watch the patrols, mind the cones, and toss a coin when a guard will not turn.',
        'Press R to try the gallery again.',
      ], '#ff4d4d');
    } else if (world.screen === SCREEN_PAUSED) {
      this.panel('PAUSED', ['Press P to slip back into the dark.'], COLORS.hudDim);
    } else if (world.screen === SCREEN_PLAY) {
      if (world.messageTimer > 0) {
        ctx.fillStyle = 'rgba(5, 7, 18, 0.78)';
        const text = world.message;
        ctx.font = '15px sans-serif';
        const tw = ctx.measureText(text).width;
        ctx.fillRect((CANVAS_WIDTH - tw) / 2 - 14, HUD_HEIGHT + 10, tw + 28, 30);
        ctx.fillStyle = COLORS.hudText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, CANVAS_WIDTH / 2, HUD_HEIGHT + 25);
      }
      this.drawHint(world, 'WASD move · Shift sneak · Click toss a coin · P pause · R restart');
    }
  }
}
