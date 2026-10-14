/**
 * SepsisWatch-X Clinical Web Audio Alert Service
 * 
 * Provides robust Web Audio API synthesized alarms:
 * - Critical Urgency: Dual-tone alternating pulse (880 Hz / 659 Hz)
 * - Moderate Urgency: Harmonic warning chime (587 Hz / 440 Hz)
 * - Test Sound: Auditory test verification chime
 * 
 * Includes user-gesture unlock listener, volume attenuation, mute state,
 * and duplicate suppression to prevent alert fatigue.
 */

class AudioAlertService {
  private ctx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private isMuted: boolean = false;
  private isEnabled: boolean = true;
  private volume: number = 0.7; // 0.0 to 1.0
  private lastPlayedTimestamp: number = 0;
  private lastAlertFingerprint: string = '';
  private activeOscillators: OscillatorNode[] = [];

  constructor() {
    // Restore persistent user audio preferences
    try {
      const storedMute = localStorage.getItem('sepsiswatch_audio_muted');
      if (storedMute !== null) this.isMuted = storedMute === 'true';

      const storedEnabled = localStorage.getItem('sepsiswatch_audio_enabled');
      if (storedEnabled !== null) this.isEnabled = storedEnabled === 'true';

      const storedVol = localStorage.getItem('sepsiswatch_audio_volume');
      if (storedVol !== null) this.volume = parseFloat(storedVol) || 0.7;
    } catch {
      // Fallback to defaults
    }

    // Attach user gesture unlock listener for browser autoplay compliance
    this.setupGestureUnlock();
  }

  private setupGestureUnlock() {
    const unlockHandler = () => {
      this.initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          this.isUnlocked = true;
        }).catch(() => {});
      } else if (this.ctx && this.ctx.state === 'running') {
        this.isUnlocked = true;
      }

      // Remove once unlocked
      window.removeEventListener('click', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
      window.removeEventListener('touchstart', unlockHandler);
    };

    window.addEventListener('click', unlockHandler, { once: true, passive: true });
    window.addEventListener('keydown', unlockHandler, { once: true, passive: true });
    window.addEventListener('touchstart', unlockHandler, { once: true, passive: true });
  }

  private initContext(): AudioContext | null {
    if (!this.ctx) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      } catch (err) {
        console.warn('[AudioAlertService] Web Audio API initialization failed:', err);
      }
    }
    return this.ctx;
  }

  public async resumeContext(): Promise<boolean> {
    const ctx = this.initContext();
    if (!ctx) return false;
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      this.isUnlocked = ctx.state === 'running';
      return this.isUnlocked;
    } catch {
      return false;
    }
  }

  /**
   * Play Critical Emergency Alarm (Two-tone high-urgency medical alert)
   * Pattern: 880 Hz (A5) -> 659 Hz (E5) pulse
   */
  public playCriticalAlarm(fingerprint?: string): boolean {
    if (!this.canPlay(fingerprint)) return false;

    const ctx = this.initContext();
    if (!ctx) return false;

    try {
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume * 0.45, now);
      masterGain.connect(ctx.destination);

      // Pulse 1: 880 Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(1, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.22);

      // Pulse 2: 659 Hz
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(659.25, now + 0.16);
      gain2.gain.setValueAtTime(1, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.42);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.42);

      // Echo Pulse: 880 Hz again for urgency
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(880, now + 0.36);
      gain3.gain.setValueAtTime(0.8, now + 0.36);
      gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
      osc3.connect(gain3);
      gain3.connect(masterGain);
      osc3.start(now + 0.36);
      osc3.stop(now + 0.65);

      this.recordPlayback(fingerprint);
      return true;
    } catch (err) {
      console.warn('[AudioAlertService] Playback error:', err);
      return false;
    }
  }

  /**
   * Play Warning Chime (Moderate severity alert)
   * Pattern: 587.33 Hz (D5) -> 440 Hz (A4) harmonic chime
   */
  public playWarningAlarm(fingerprint?: string): boolean {
    if (!this.canPlay(fingerprint)) return false;

    const ctx = this.initContext();
    if (!ctx) return false;

    try {
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume * 0.3, now);
      masterGain.connect(ctx.destination);

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(1, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(440, now + 0.18);
      gain2.gain.setValueAtTime(0.9, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.6);

      this.recordPlayback(fingerprint);
      return true;
    } catch (err) {
      console.warn('[AudioAlertService] Warning chime error:', err);
      return false;
    }
  }

  /**
   * User-triggered Test Sound
   * Bypasses deduplication, unblocks context if needed, and plays chime.
   */
  public async playTestSound(): Promise<{ success: boolean; message: string }> {
    const unblocked = await this.resumeContext();
    const ctx = this.initContext();
    if (!ctx) {
      return { success: false, message: 'Web Audio API not supported by this browser.' };
    }

    try {
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      // Ensure audible even if muted in UI for test validation
      const testVol = Math.max(0.3, this.volume);
      masterGain.gain.setValueAtTime(testVol * 0.35, now);
      masterGain.connect(ctx.destination);

      // Three ascending melodic test beeps
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + (idx * 0.12));
        gain.gain.setValueAtTime(0.8, now + (idx * 0.12));
        gain.gain.exponentialRampToValueAtTime(0.001, now + (idx * 0.12) + 0.25);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + (idx * 0.12));
        osc.stop(now + (idx * 0.12) + 0.25);
      });

      return { 
        success: true, 
        message: unblocked 
          ? 'Audio test chime played successfully.' 
          : 'Audio test sent (user gesture initialized context).' 
      };
    } catch (e: any) {
      return { success: false, message: `Audio test failed: ${e.message || 'Browser blocked playback'}` };
    }
  }

  private canPlay(fingerprint?: string): boolean {
    if (!this.isEnabled || this.isMuted) return false;

    const now = Date.now();
    // Prevent duplicate alert sound within 4 seconds if same fingerprint
    if (fingerprint && fingerprint === this.lastAlertFingerprint && (now - this.lastPlayedTimestamp) < 4000) {
      return false;
    }
    // Prevent overlapping spam within 600ms
    if (now - this.lastPlayedTimestamp < 600) {
      return false;
    }

    return true;
  }

  private recordPlayback(fingerprint?: string) {
    this.lastPlayedTimestamp = Date.now();
    if (fingerprint) {
      this.lastAlertFingerprint = fingerprint;
    }
  }

  // Configuration Getters & Setters
  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('sepsiswatch_audio_volume', this.volume.toString());
    } catch {}
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('sepsiswatch_audio_muted', muted ? 'true' : 'false');
    } catch {}
  }

  public isAudioMuted(): boolean {
    return this.isMuted;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    try {
      localStorage.setItem('sepsiswatch_audio_enabled', enabled ? 'true' : 'false');
    } catch {}
  }

  public isAudioEnabled(): boolean {
    return this.isEnabled;
  }

  public getStatus(): 'ready' | 'suspended' | 'muted' | 'disabled' | 'unsupported' {
    if (!this.isEnabled) return 'disabled';
    if (this.isMuted) return 'muted';
    if (!this.ctx) return 'suspended';
    if (this.ctx.state === 'running') return 'ready';
    return 'suspended';
  }
}

export const audioAlertService = new AudioAlertService();
