// Gilded Shadow — every sound is synthesized with WebAudio, no audio files.
// One job: footsteps that tell the player where a guard is, and the stings
// for suspicion, alarm, pickups, coins, winning and losing.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  /** Start the audio context. Call from a user gesture; browsers block it before one. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
    } catch {
      this.ctx = null;
    }
  }

  /** A short tone. Volume is 0..1; freq in Hz; type is an oscillator shape. */
  tone(freq, duration, type = 'sine', volume = 0.12, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  /** A soft footstep tick, quieter the further the walker is from the player. */
  footstep(distance, maxDistance) {
    const closeness = Math.max(0, 1 - distance / maxDistance);
    if (closeness <= 0.02) return;
    this.tone(82, 0.07, 'triangle', 0.05 + 0.1 * closeness);
  }

  /** The player's own step: barely there. */
  playerStep() {
    this.tone(64, 0.05, 'triangle', 0.03);
  }

  /** A guard grows suspicious: one rising blip. */
  suspicious() {
    this.tone(520, 0.12, 'square', 0.06);
    this.tone(660, 0.14, 'square', 0.06, 0.11);
  }

  /** The alarm: a sharp two-note sting when a guard starts the chase. */
  alarm() {
    this.tone(392, 0.16, 'sawtooth', 0.09);
    this.tone(311, 0.24, 'sawtooth', 0.09, 0.14);
  }

  /** An artifact lifts off its pedestal: a bright little chime. */
  pickup() {
    this.tone(880, 0.12, 'sine', 0.1);
    this.tone(1318, 0.2, 'sine', 0.09, 0.09);
  }

  /** A thrown coin lands and rings: the sound that pulls a guard over. */
  coinClink() {
    this.tone(2093, 0.1, 'triangle', 0.09);
    this.tone(1568, 0.16, 'triangle', 0.07, 0.07);
  }

  /** The exit opens: a low warm chord. */
  doorOpen() {
    this.tone(262, 0.3, 'sine', 0.08);
    this.tone(392, 0.3, 'sine', 0.07, 0.05);
    this.tone(523, 0.4, 'sine', 0.06, 0.1);
  }

  /** The whole gallery is cleared: a rising arpeggio. */
  win() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.28, 'sine', 0.1, i * 0.12));
  }

  /** Caught: a short falling phrase. */
  caught() {
    [330, 262, 196].forEach((f, i) => this.tone(f, 0.25, 'sawtooth', 0.08, i * 0.14));
  }
}
