// Gilded Shadow — keyboard and mouse, nothing else. One job: turn raw events
// into the small state the game loop reads (which way to move, sneak or not,
// where the player clicked, and the one-shot keys the screens listen for).
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.sneak = false;
    this.click = null;
    this.pressed = new Set();
    this.canvas = canvas;
    this.onFirstGesture = null;

    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(event.key.toLowerCase());
      this.keys.add(event.key.toLowerCase());
      this.sneak = this.keys.has('shift');
      this.gesture();
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
      this.sneak = this.keys.has('shift');
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.sneak = false;
    });
    canvas.addEventListener('pointerdown', (event) => {
      this.gesture();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.click = {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
    });
  }

  gesture() {
    if (this.onFirstGesture) {
      const fn = this.onFirstGesture;
      this.onFirstGesture = null;
      fn();
    }
  }

  /** The movement vector from WASD or the arrow keys, normalised. */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  /** True once for a key pressed since the last frame; the game loop drains it. */
  wasPressed(key) {
    return this.pressed.has(key.toLowerCase());
  }

  /** Clear the one-shot keys at the end of each frame. */
  endFrame() {
    this.pressed.clear();
    this.click = null;
  }
}
