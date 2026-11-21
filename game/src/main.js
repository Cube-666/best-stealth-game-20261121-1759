// Gilded Shadow — the front door. One job: wire the canvas, the input, the
// world and the renderer together, run the loop, and stage a screenshot scene
// when the page is opened with ?shot=.
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config.js';
import { World, SCREEN_TITLE, SCREEN_PLAY, SCREEN_CLEAR, SCREEN_CAUGHT, SCREEN_WIN, SCREEN_PAUSED } from './world.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const sounds = new SoundBank();
const world = new World(sounds);
const renderer = new Renderer(canvas);
const input = new Input(canvas);
input.onFirstGesture = () => sounds.unlock();

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
let shotMode = false;
if (shot) {
  shotMode = true;
  sounds.muted = true;
  stageShot(shot, world);
  renderer.draw(world);
}

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!shotMode) {
    if (world.screen === SCREEN_TITLE && (input.wasPressed('enter') || input.click)) {
      sounds.unlock();
      world.startGame();
    } else if (world.screen === SCREEN_PLAY) {
      if (input.wasPressed('p') || input.wasPressed('escape')) {
        world.screen = SCREEN_PAUSED;
      } else {
        world.update(dt, input);
      }
    } else if (world.screen === SCREEN_PAUSED) {
      if (input.wasPressed('p') || input.wasPressed('escape') || input.wasPressed('enter')) {
        world.screen = SCREEN_PLAY;
      }
    } else if (world.screen === SCREEN_CLEAR) {
      world.updateClear(dt);
      if (input.wasPressed('enter') || input.click) world.nextLevel();
    } else if (world.screen === SCREEN_CAUGHT || world.screen === SCREEN_WIN) {
      if (input.wasPressed('r')) world.startGame();
    }
    if (input.wasPressed('r') && world.screen === SCREEN_PLAY) world.restartLevel();
    input.endFrame();
  }
  renderer.draw(world);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
