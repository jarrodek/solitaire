import { Rank } from '../cards/Card.js';

class SoundFX {
  private ctx: AudioContext | null = null;
  private _muted: boolean = localStorage.getItem('solitaire_muted') === 'true';

  get muted(): boolean {
    return this._muted;
  }

  set muted(val: boolean) {
    this._muted = val;
    localStorage.setItem('solitaire_muted', String(val));
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  private initCtx(): AudioContext | null {
    if (this._muted) {
      return null;
    }
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Sound of drawing/dealing a card (subtle paper slide).
   */
  deal(): void {
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.frequency.exponentialRampToValueAtTime(600, now + 0.05);
      filter.Q.setValueAtTime(3, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start(now);
    } catch {
      // Audio playback silently caught
    }
  }

  /**
   * Sound of flipping a face-down card to face-up (crisp snap).
   */
  flip(): void {
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.04);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // Audio playback silently caught
    }
  }

  /**
   * Sound of dropping a card onto the table or stack.
   */
  drop(): void {
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.055);
    } catch {
      // Audio playback silently caught
    }
  }

  /**
   * Melodic ascending chime when placing a card on a Foundation.
   */
  foundation(rank: Rank = Rank.Ace): void {
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const rankIndex = Object.values(Rank).indexOf(rank);
      const baseFreq = 523.25;
      const semitones = (rankIndex >= 0 ? rankIndex : 0) * 2;
      const freq = baseFreq * Math.pow(2, semitones / 12);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const harmonic = ctx.createOscillator();
      harmonic.type = 'triangle';
      harmonic.frequency.setValueAtTime(freq * 2, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      const harmonicGain = ctx.createGain();
      harmonicGain.gain.setValueAtTime(0.08, now);
      harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      harmonic.connect(harmonicGain);
      gain.connect(ctx.destination);
      harmonicGain.connect(ctx.destination);

      osc.start(now);
      harmonic.start(now);
      osc.stop(now + 0.23);
      harmonic.stop(now + 0.23);
    } catch {
      // Audio playback silently caught
    }
  }

  /**
   * Celebratory arpeggio chord fanfare on win.
   */
  win(): void {
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];

      notes.forEach((freq, index) => {
        const noteTime = now + index * 0.1;
        const osc = ctx.createOscillator();
        osc.type = index === notes.length - 1 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, noteTime);
        gain.gain.linearRampToValueAtTime(0.2, noteTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + (index === notes.length - 1 ? 0.8 : 0.35));

        osc.connect(gain);
        gain.connect(ctx.destination);

      osc.start(noteTime);
        osc.stop(noteTime + (index === notes.length - 1 ? 0.85 : 0.38));
      });
    } catch {
      // Audio playback silently caught
    }
  }

  /**
   * Pleasant rising chime when requesting a hint.
   */
  hint(): void {
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [587.33, 880.00]; // D5 -> A5
      notes.forEach((freq, i) => {
        const time = now + i * 0.08;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.16, time + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + 0.19);
      });
    } catch {
      // Audio playback silently caught
    }
  }

  /**
   * Soft double-thud when no hints or moves are available.
   */
  noMove(): void {
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.085);
    } catch {
      // Audio playback silently caught
    }
  }
}

export const soundFX = new SoundFX();
