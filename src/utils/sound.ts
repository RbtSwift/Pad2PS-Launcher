import { CustomSoundPreset, ThemeId } from '../types';

// Pure Web Audio API console synthesizer — adapts timbre per active theme, zero external audio files

class ConsoleSoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private theme: ThemeId = 'pad2ps-default';
  private customSoundPreset: CustomSoundPreset = 'pad2ps-default';

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setEnabled(value: boolean) {
    this.enabled = value;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setTheme(theme: ThemeId) {
    this.theme = theme;
  }

  public setCustomSoundPreset(preset: CustomSoundPreset) {
    this.customSoundPreset = preset;
  }

  private getEffectiveSoundTheme(): Exclude<ThemeId, 'custom'> {
    if (this.theme === 'custom') {
      return this.customSoundPreset;
    }
    return this.theme;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0
  ) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, freqEnd),
        now + duration
      );
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(
      volume,
      now + Math.min(0.012, duration * 0.25)
    );
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  /** Soft move tick tailored to active theme */
  public playMove() {
    switch (this.getEffectiveSoundTheme()) {
      case 'pixel':
        this.playTone(440, 660, 0.045, 'square', 0.032);
        break;
      case 'cute':
        this.playTone(880, 1174.66, 0.065, 'sine', 0.055);
        break;
      case 'horror':
        this.playTone(135, 82, 0.095, 'triangle', 0.075);
        break;
      case 'futuristic':
        this.playTone(1040, 1480, 0.04, 'triangle', 0.045);
        break;
      case 'ps2-classic':
        // Soft crystalline glass tick
        this.playTone(740, 987.77, 0.075, 'sine', 0.05);
        break;
      case 'synthwave':
        // Warm analog 80s synth pluck
        this.playTone(392, 523.25, 0.065, 'sawtooth', 0.024);
        this.playTone(196, 261.63, 0.07, 'triangle', 0.045);
        break;
      case 'clean-light':
        // Crisp Switch-inspired tactile pop
        this.playTone(680, 920, 0.04, 'sine', 0.05);
        break;
      case 'emerald-matrix':
        // Digital terminal matrix beep
        this.playTone(1320, 1320, 0.032, 'square', 0.022);
        break;
      default:
        this.playTone(520, 760, 0.055, 'sine', 0.06);
        break;
    }
  }

  /** Tab / category switch sound */
  public playTab() {
    switch (this.getEffectiveSoundTheme()) {
      case 'pixel':
        this.playTone(330, 330, 0.04, 'square', 0.03, 0);
        this.playTone(523.25, 523.25, 0.055, 'square', 0.03, 0.04);
        break;
      case 'cute':
        this.playTone(783.99, 1046.5, 0.08, 'sine', 0.055, 0);
        this.playTone(1318.5, 1567.98, 0.09, 'sine', 0.045, 0.04);
        break;
      case 'horror':
        this.playTone(164.81, 110, 0.14, 'sawtooth', 0.028, 0);
        this.playTone(98, 73.42, 0.16, 'triangle', 0.06, 0.02);
        break;
      case 'futuristic':
        this.playTone(620, 1240, 0.08, 'sine', 0.045, 0);
        this.playTone(1240, 1860, 0.07, 'triangle', 0.035, 0.03);
        break;
      case 'ps2-classic':
        this.playTone(587.33, 880, 0.14, 'sine', 0.05, 0);
        this.playTone(1174.66, 1479.98, 0.14, 'sine', 0.035, 0.035);
        break;
      case 'synthwave':
        this.playTone(261.63, 392, 0.11, 'sawtooth', 0.022, 0);
        this.playTone(523.25, 783.99, 0.11, 'triangle', 0.045, 0.03);
        break;
      case 'clean-light':
        this.playTone(523.25, 659.25, 0.06, 'sine', 0.05, 0);
        this.playTone(783.99, 1046.5, 0.07, 'sine', 0.045, 0.035);
        break;
      case 'emerald-matrix':
        this.playTone(980, 1480, 0.045, 'square', 0.02, 0);
        this.playTone(1480, 1960, 0.045, 'square', 0.018, 0.04);
        break;
      default:
        this.playTone(340, 640, 0.1, 'triangle', 0.055, 0);
        this.playTone(680, 960, 0.1, 'sine', 0.045, 0);
        break;
    }
  }

  /** Confirm / Launch Game chord */
  public playConfirm() {
    switch (this.getEffectiveSoundTheme()) {
      case 'pixel': {
        const arp = [523.25, 659.25, 783.99, 1046.5];
        arp.forEach((f, i) =>
          this.playTone(f, f, 0.07, 'square', 0.03, i * 0.045)
        );
        break;
      }
      case 'cute': {
        const drops = [659.25, 880, 1046.5, 1318.5];
        drops.forEach((f, i) =>
          this.playTone(f, f * 1.03, 0.14, 'sine', 0.05, i * 0.04)
        );
        break;
      }
      case 'horror': {
        const dark = [146.83, 174.61, 220];
        dark.forEach((f, i) =>
          this.playTone(f, f * 0.96, 0.28, 'triangle', 0.06, i * 0.055)
        );
        break;
      }
      case 'futuristic': {
        const sci = [587.33, 880, 1174.66, 1760];
        sci.forEach((f, i) =>
          this.playTone(
            f,
            f * 1.02,
            0.16,
            i % 2 === 0 ? 'sine' : 'triangle',
            0.045,
            i * 0.03
          )
        );
        break;
      }
      case 'ps2-classic': {
        const crystal = [392.0, 587.33, 739.99, 1174.66];
        crystal.forEach((f, i) =>
          this.playTone(f, f * 1.01, 0.28, 'sine', 0.045, i * 0.045)
        );
        break;
      }
      case 'synthwave': {
        const retro = [220, 277.18, 329.63, 440];
        retro.forEach((f, i) => {
          this.playTone(f, f * 1.015, 0.22, 'sawtooth', 0.02, i * 0.04);
          this.playTone(f * 2, f * 2.01, 0.2, 'triangle', 0.035, i * 0.04);
        });
        break;
      }
      case 'clean-light': {
        const crisp = [523.25, 659.25, 1046.5];
        crisp.forEach((f, i) =>
          this.playTone(f, f, 0.12, 'sine', 0.05, i * 0.035)
        );
        break;
      }
      case 'emerald-matrix': {
        const term = [880, 1174.66, 1760];
        term.forEach((f, i) =>
          this.playTone(f, f, 0.06, 'square', 0.022, i * 0.038)
        );
        break;
      }
      default: {
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((f, i) =>
          this.playTone(
            f,
            f * 1.015,
            0.24,
            i % 2 === 0 ? 'sine' : 'triangle',
            0.05,
            i * 0.035
          )
        );
        break;
      }
    }
  }

  /** Back / Cancel sound */
  public playCancel() {
    switch (this.getEffectiveSoundTheme()) {
      case 'pixel':
        this.playTone(392, 196, 0.09, 'square', 0.03);
        break;
      case 'cute':
        this.playTone(987.77, 659.25, 0.1, 'sine', 0.05);
        break;
      case 'horror':
        this.playTone(110, 65.41, 0.18, 'triangle', 0.07);
        break;
      case 'futuristic':
        this.playTone(880, 440, 0.09, 'triangle', 0.045);
        break;
      case 'ps2-classic':
        this.playTone(587.33, 293.66, 0.14, 'sine', 0.05);
        break;
      case 'synthwave':
        this.playTone(392, 196, 0.14, 'sawtooth', 0.022);
        this.playTone(196, 98, 0.14, 'triangle', 0.04);
        break;
      case 'clean-light':
        this.playTone(620, 420, 0.08, 'sine', 0.048);
        break;
      case 'emerald-matrix':
        this.playTone(880, 440, 0.065, 'square', 0.022);
        break;
      default:
        this.playTone(480, 240, 0.12, 'sine', 0.055);
        break;
    }
  }

  /** Favorite toggle chime */
  public playFavorite() {
    switch (this.getEffectiveSoundTheme()) {
      case 'pixel':
        this.playTone(659.25, 659.25, 0.05, 'square', 0.03, 0);
        this.playTone(987.77, 987.77, 0.08, 'square', 0.03, 0.055);
        break;
      case 'cute':
        this.playTone(1046.5, 1174.66, 0.1, 'sine', 0.05, 0);
        this.playTone(1567.98, 1760, 0.12, 'sine', 0.05, 0.055);
        break;
      case 'horror':
        this.playTone(196, 185, 0.14, 'triangle', 0.055, 0);
        this.playTone(293.66, 277.18, 0.16, 'sine', 0.045, 0.06);
        break;
      case 'ps2-classic':
        this.playTone(659.25, 783.99, 0.13, 'sine', 0.048, 0);
        this.playTone(987.77, 1318.5, 0.16, 'sine', 0.042, 0.055);
        break;
      case 'synthwave':
        this.playTone(440, 523.25, 0.1, 'triangle', 0.045, 0);
        this.playTone(659.25, 880, 0.14, 'sawtooth', 0.02, 0.05);
        break;
      case 'emerald-matrix':
        this.playTone(1046.5, 1046.5, 0.04, 'square', 0.02, 0);
        this.playTone(1567.98, 1567.98, 0.055, 'square', 0.02, 0.045);
        break;
      default:
        this.playTone(587.33, 587.33, 0.12, 'sine', 0.05, 0);
        this.playTone(880, 880, 0.14, 'sine', 0.05, 0.055);
        break;
    }
  }
}

export const soundEngine = new ConsoleSoundEngine();
