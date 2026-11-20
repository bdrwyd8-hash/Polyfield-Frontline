import type { WeaponId } from './types';

interface WeaponAudioProfile {
  crackFreq: number;
  crackQ: number;
  crackDur: number;
  crackVol: number;
  thumpFreq: number;
  thumpEnd: number;
  thumpDur: number;
  thumpVol: number;
  oscType: OscillatorType;
  tailFreq?: number;
  mechanicalClick?: boolean;
}

const WEAPON_AUDIO: Record<string, WeaponAudioProfile> = {
  ak47: {
    crackFreq: 1080,
    crackQ: 1.15,
    crackDur: 0.15,
    crackVol: 0.36,
    thumpFreq: 210,
    thumpEnd: 46,
    thumpDur: 0.13,
    thumpVol: 0.38,
    oscType: 'sawtooth',
    mechanicalClick: true,
  },
  ppsh41: {
    crackFreq: 1750,
    crackQ: 1.4,
    crackDur: 0.075,
    crackVol: 0.28,
    thumpFreq: 155,
    thumpEnd: 55,
    thumpDur: 0.08,
    thumpVol: 0.28,
    oscType: 'square',
  },
  m1_garand: {
    crackFreq: 980,
    crackQ: 0.85,
    crackDur: 0.21,
    crackVol: 0.4,
    thumpFreq: 192,
    thumpEnd: 38,
    thumpDur: 0.15,
    thumpVol: 0.42,
    oscType: 'triangle',
    tailFreq: 520,
  },
  kar98k: {
    crackFreq: 780,
    crackQ: 0.72,
    crackDur: 0.29,
    crackVol: 0.45,
    thumpFreq: 230,
    thumpEnd: 32,
    thumpDur: 0.19,
    thumpVol: 0.46,
    oscType: 'sawtooth',
    tailFreq: 420,
  },
  springfield: {
    crackFreq: 890,
    crackQ: 0.95,
    crackDur: 0.34,
    crackVol: 0.48,
    thumpFreq: 245,
    thumpEnd: 30,
    thumpDur: 0.21,
    thumpVol: 0.45,
    oscType: 'sawtooth',
    tailFreq: 380,
  },
  thompson: {
    crackFreq: 1220,
    crackQ: 0.9,
    crackDur: 0.1,
    crackVol: 0.3,
    thumpFreq: 138,
    thumpEnd: 42,
    thumpDur: 0.1,
    thumpVol: 0.34,
    oscType: 'triangle',
  },
  mp40: {
    crackFreq: 1580,
    crackQ: 1.25,
    crackDur: 0.095,
    crackVol: 0.29,
    thumpFreq: 162,
    thumpEnd: 48,
    thumpDur: 0.09,
    thumpVol: 0.3,
    oscType: 'triangle',
  },
  stg44: {
    crackFreq: 1180,
    crackQ: 1.0,
    crackDur: 0.145,
    crackVol: 0.34,
    thumpFreq: 178,
    thumpEnd: 40,
    thumpDur: 0.125,
    thumpVol: 0.35,
    oscType: 'triangle',
    mechanicalClick: true,
  },
  bar: {
    crackFreq: 860,
    crackQ: 0.8,
    crackDur: 0.2,
    crackVol: 0.4,
    thumpFreq: 185,
    thumpEnd: 34,
    thumpDur: 0.16,
    thumpVol: 0.44,
    oscType: 'sawtooth',
  },
  m1911: {
    crackFreq: 1420,
    crackQ: 1.05,
    crackDur: 0.11,
    crackVol: 0.32,
    thumpFreq: 150,
    thumpEnd: 48,
    thumpDur: 0.1,
    thumpVol: 0.3,
    oscType: 'triangle',
  },
};

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private unlocked = false;
  private lastBotShotMs = 0;
  private lastEngineCueMs = 0;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || !this.unlocked || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (!this.noiseBuffer && this.ctx) {
      const sampleRate = this.ctx.sampleRate;
      const length = Math.floor(sampleRate * 1.4);
      const buffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.ctx;
  }

  public unlock(): void {
    this.unlocked = true;
    this.ensureContext();
  }

  public playGunshot(
    weaponId: WeaponId,
    isLastRound = false,
    distanceAttenuation = 1,
    suppressed = false,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const vol = Math.max(0.03, Math.min(1, distanceAttenuation));
    const isRemote = vol < 0.85;

    if (isRemote) {
      const nowMs = performance.now();
      if (nowMs - this.lastBotShotMs < 46) return;
      this.lastBotShotMs = nowMs;
    }

    const pitchJitter = 0.92 + Math.random() * 0.16;

    if (weaponId === 'rpg7' || weaponId === 'bazooka' || weaponId === 'panzerschreck') {
      this.playRocketLaunch(
        ctx,
        now,
        vol,
        weaponId === 'panzerschreck',
        weaponId === 'rpg7',
      );
      return;
    }

    const prof = WEAPON_AUDIO[weaponId] ?? WEAPON_AUDIO.m1_garand;

    // 1. High-energy propellant transient + subsonic baffle lowpass when suppressed
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = suppressed || isRemote ? 'lowpass' : 'bandpass';
    const baseFreq = suppressed
      ? isRemote
        ? 480 + 520 * vol
        : 950 * pitchJitter
      : isRemote
        ? 620 + 2100 * vol
        : prof.crackFreq * pitchJitter;
    filter.frequency.setValueAtTime(baseFreq, now);
    if (suppressed || isRemote) {
      filter.frequency.exponentialRampToValueAtTime(suppressed ? 190 : 220, now + prof.crackDur * 1.15);
    } else {
      filter.Q.value = prof.crackQ;
    }

    const durMult = suppressed ? 0.72 : isRemote ? 1.35 : 1;
    const gainMult = suppressed ? (isRemote ? 0.24 : 0.34) : 1;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(prof.crackVol * vol * gainMult, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + prof.crackDur * durMult);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + prof.crackDur * 1.4 + 0.01);

    // 2. Crisp supersonic snap transient (heavily damped by suppressor baffles)
    const snap = ctx.createBufferSource();
    snap.buffer = this.noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(isRemote ? 1850 : 2400, now);
    const snapGain = ctx.createGain();
    snapGain.gain.setValueAtTime((suppressed ? 0.045 : 0.22) * vol, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + (suppressed ? 0.02 : 0.032));
    snap.connect(hp);
    hp.connect(snapGain);
    snapGain.connect(ctx.destination);
    snap.start(now);
    snap.stop(now + 0.036);

    // 3. Clean warm sub-percussion punch
    const osc = ctx.createOscillator();
    osc.type = isRemote || suppressed ? 'sine' : prof.oscType === 'square' ? 'triangle' : prof.oscType;
    osc.frequency.setValueAtTime(
      prof.thumpFreq * pitchJitter * (suppressed ? 0.74 : isRemote ? 0.85 : 1),
      now,
    );
    osc.frequency.exponentialRampToValueAtTime(prof.thumpEnd, now + prof.thumpDur);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(
      prof.thumpVol * vol * (suppressed ? 0.38 : isRemote ? 0.65 : 1),
      now,
    );
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + prof.thumpDur + 0.01);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + prof.thumpDur + 0.015);

    // 4. Rolling outdoor terrain reflection tail (omitted on suppressed rounds)
    if (vol > 0.16 && !suppressed) {
      const tail = ctx.createBufferSource();
      tail.buffer = this.noiseBuffer;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(prof.tailFreq ?? 420, now + 0.045);
      lp.frequency.exponentialRampToValueAtTime(110, now + 0.42);
      const tGain = ctx.createGain();
      tGain.gain.setValueAtTime((isRemote ? 0.22 : 0.14) * vol, now + 0.045);
      tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
      tail.connect(lp);
      lp.connect(tGain);
      tGain.connect(ctx.destination);
      tail.start(now + 0.045);
      tail.stop(now + 0.46);
    }

    // 5. Mechanical piston/carrier clack for AK-47 / StG-44 (first-person only)
    if (prof.mechanicalClick && !isRemote) {
      const mech = ctx.createOscillator();
      mech.type = 'triangle';
      mech.frequency.setValueAtTime(920, now + 0.02);
      mech.frequency.exponentialRampToValueAtTime(340, now + 0.055);
      const mGain = ctx.createGain();
      mGain.gain.setValueAtTime(0.045 * vol, now + 0.02);
      mGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      mech.connect(mGain);
      mGain.connect(ctx.destination);
      mech.start(now + 0.02);
      mech.stop(now + 0.065);
    }

    // 6. Mechanical bolt rack click for bolt-action rifles (first-person only)
    if ((weaponId === 'kar98k' || weaponId === 'springfield') && !isRemote) {
      const boltOsc = ctx.createOscillator();
      boltOsc.type = 'triangle';
      boltOsc.frequency.setValueAtTime(520, now + 0.28);
      boltOsc.frequency.exponentialRampToValueAtTime(220, now + 0.34);
      const boltGain = ctx.createGain();
      boltGain.gain.setValueAtTime(0.055 * vol, now + 0.28);
      boltGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      boltOsc.connect(boltGain);
      boltGain.connect(ctx.destination);
      boltOsc.start(now + 0.28);
      boltOsc.stop(now + 0.36);
    }

    // 7. Iconic M1 Garand metallic en-bloc clip ping on last round
    if (weaponId === 'm1_garand' && isLastRound && !isRemote) {
      const ping = ctx.createOscillator();
      ping.type = 'sine';
      ping.frequency.setValueAtTime(2680, now + 0.04);
      ping.frequency.exponentialRampToValueAtTime(2480, now + 0.38);
      const pingGain = ctx.createGain();
      pingGain.gain.setValueAtTime(0.001, now);
      pingGain.gain.linearRampToValueAtTime(0.16 * vol, now + 0.045);
      pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      ping.connect(pingGain);
      pingGain.connect(ctx.destination);
      ping.start(now + 0.04);
      ping.stop(now + 0.42);
    }
  }

  private playRocketLaunch(
    ctx: AudioContext,
    now: number,
    vol: number,
    heavy: boolean,
    isRpg7 = false,
  ): void {
    if (!this.noiseBuffer) return;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(isRpg7 ? 740 : heavy ? 360 : 450, now);
    bp.frequency.exponentialRampToValueAtTime(isRpg7 ? 210 : 140, now + 0.62);
    bp.Q.value = isRpg7 ? 0.95 : 0.7;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime((isRpg7 ? 0.52 : 0.46) * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.64);
    noise.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.66);

    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(isRpg7 ? 175 : heavy ? 115 : 138, now);
    thump.frequency.exponentialRampToValueAtTime(28, now + 0.28);
    const tGain = ctx.createGain();
    tGain.gain.setValueAtTime(0.45 * vol, now);
    tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.29);
    thump.connect(tGain);
    tGain.connect(ctx.destination);
    thump.start(now);
    thump.stop(now + 0.3);
  }

  public playTankCannon(distanceAttenuation = 1): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const vol = Math.max(0.08, Math.min(1, distanceAttenuation));

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(980, now);
    lp.frequency.exponentialRampToValueAtTime(85, now + 0.9);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.65 * vol, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
    noise.connect(lp);
    lp.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.98);

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(110, now);
    sub.frequency.exponentialRampToValueAtTime(24, now + 0.45);
    const sGain = ctx.createGain();
    sGain.gain.setValueAtTime(0.62 * vol, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    sub.connect(sGain);
    sGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.5);
  }

  public playAircraftCannon(distanceAttenuation = 1): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const vol = Math.max(0.08, Math.min(1, distanceAttenuation));
    const jitter = 0.94 + Math.random() * 0.12;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(720 * jitter, now);
    bp.Q.value = 0.9;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.42 * vol, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    noise.connect(bp);
    bp.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.12);

    const punch = ctx.createOscillator();
    punch.type = 'triangle';
    punch.frequency.setValueAtTime(145 * jitter, now);
    punch.frequency.exponentialRampToValueAtTime(38, now + 0.09);
    const pGain = ctx.createGain();
    pGain.gain.setValueAtTime(0.32 * vol, now);
    pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    punch.connect(pGain);
    pGain.connect(ctx.destination);
    punch.start(now);
    punch.stop(now + 0.105);
  }

  public playEngineCue(kind: 'ground' | 'air', intensity = 0.5): void {
    const nowMs = performance.now();
    if (nowMs - this.lastEngineCueMs < 260) return;
    this.lastEngineCueMs = nowMs;

    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const amp = Math.max(0.015, Math.min(0.09, 0.03 + intensity * 0.055));

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    const baseHz = kind === 'air' ? 92 + intensity * 46 : 44 + intensity * 26;
    osc.frequency.setValueAtTime(baseHz, now);
    osc.frequency.exponentialRampToValueAtTime(baseHz * 0.9, now + 0.22);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(kind === 'air' ? 280 : 165, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(amp, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(lp);
    lp.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playDigShovel(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(480, now);
    lp.frequency.exponentialRampToValueAtTime(140, now + 0.16);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    src.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.18);

    const scrape = ctx.createOscillator();
    scrape.type = 'triangle';
    scrape.frequency.setValueAtTime(165, now);
    scrape.frequency.exponentialRampToValueAtTime(55, now + 0.11);
    const sGain = ctx.createGain();
    sGain.gain.setValueAtTime(0.18, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    scrape.connect(sGain);
    sGain.connect(ctx.destination);
    scrape.start(now);
    scrape.stop(now + 0.13);
  }

  public playResupply(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.09].forEach((off, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(i === 0 ? 440 : 660, now + off);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.09, now + off);
      g.gain.exponentialRampToValueAtTime(0.001, now + off + 0.07);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + off);
      osc.stop(now + off + 0.075);
    });
  }

  public playHitmarker(isKill: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = isKill ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isKill ? 960 : 1450, now);
    osc.frequency.exponentialRampToValueAtTime(isKill ? 500 : 880, now + 0.06);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(isKill ? 0.2 : 0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playReload(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [0, 0.36, 0.72].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(idx === 2 ? 640 : 320 + idx * 95, now + offset);
      osc.frequency.exponentialRampToValueAtTime(125, now + offset + 0.045);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.085, now + offset);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.05);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.055);
    });
  }

  public playExplosion(distanceAttenuation = 1): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const vol = Math.max(0.1, Math.min(1, distanceAttenuation));

    // Initial high-energy detonation crack
    const crack = ctx.createBufferSource();
    crack.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1150, now);
    bp.frequency.exponentialRampToValueAtTime(240, now + 0.22);
    bp.Q.value = 0.7;
    const cGain = ctx.createGain();
    cGain.gain.setValueAtTime(0.55 * vol, now);
    cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    crack.connect(bp);
    bp.connect(cGain);
    cGain.connect(ctx.destination);
    crack.start(now);
    crack.stop(now + 0.27);

    // Heavy rolling blast roar & debris shockwave
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(640, now);
    lowpass.frequency.exponentialRampToValueAtTime(60, now + 1.25);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.68 * vol, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
    noise.connect(lowpass);
    lowpass.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 1.32);

    // Deep sub-bass concussive punch
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(88, now);
    sub.frequency.exponentialRampToValueAtTime(19, now + 0.65);
    const sGain = ctx.createGain();
    sGain.gain.setValueAtTime(0.56 * vol, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
    sub.connect(sGain);
    sGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.7);
  }

  public playFootstep(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320 + Math.random() * 120;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.065);
  }

  public playDamageTaken(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    // 1. Realistic low chest/vest ballistic thud (no artificial sawtooth buzz!)
    const thud = ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(102, now);
    thud.frequency.exponentialRampToValueAtTime(34, now + 0.095);
    const tGain = ctx.createGain();
    tGain.gain.setValueAtTime(0.32, now);
    tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.105);
    thud.connect(tGain);
    tGain.connect(ctx.destination);
    thud.start(now);
    thud.stop(now + 0.11);

    // 2. Fabric & flesh impact smack burst
    const flesh = ctx.createBufferSource();
    flesh.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(880 + Math.random() * 240, now);
    bp.Q.value = 1.1;
    const fGain = ctx.createGain();
    fGain.gain.setValueAtTime(0.24, now);
    fGain.gain.exponentialRampToValueAtTime(0.001, now + 0.058);
    flesh.connect(bp);
    bp.connect(fGain);
    fGain.connect(ctx.destination);
    flesh.start(now);
    flesh.stop(now + 0.065);

    // 3. Sharp supersonic crack snap past ear
    const snap = ctx.createBufferSource();
    snap.buffer = this.noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(2400, now);
    const sGain = ctx.createGain();
    sGain.gain.setValueAtTime(0.11, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    snap.connect(hp);
    hp.connect(sGain);
    sGain.connect(ctx.destination);
    snap.start(now);
    snap.stop(now + 0.03);
  }

  public playZoneCaptured(isFriendly: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = isFriendly ? 1850 : 950;
    bp.Q.value = 3.5;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    src.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.13);
  }

  public playClick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.025);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.032);
  }
}
