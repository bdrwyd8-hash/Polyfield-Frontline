import type { AircraftThreatWarning, WeaponId } from './types';

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
  m4a1: {
    crackFreq: 1420,
    crackQ: 1.25,
    crackDur: 0.125,
    crackVol: 0.34,
    thumpFreq: 190,
    thumpEnd: 52,
    thumpDur: 0.11,
    thumpVol: 0.33,
    oscType: 'triangle',
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
  private activeWarning: AircraftThreatWarning = 'none';
  private lastWarningAudioMs = 0;
  private lastWarningVoiceMs = 0;
  private speechEndTimeMs = 0;

  // Persistent continuous engine & wind synth nodes (zero choppy transients)
  private engineNodesReady = false;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private engineWindSrc: AudioBufferSourceNode | null = null;
  private engineWindFilter: BiquadFilterNode | null = null;
  private engineWindGain: GainNode | null = null;
  private rainNodesReady = false;
  private rainSrc: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopCockpitWarnings();
      this.stopEngineCue();
      this.playRainAmbience(false);
    }
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopCockpitWarnings();
      this.stopEngineCue();
      this.playRainAmbience(false);
    }
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

    // 5. Mechanical piston/carrier clack + crisp chamber ring for rifles (first-person only)
    if (prof.mechanicalClick && !isRemote) {
      const mech = ctx.createOscillator();
      mech.type = 'triangle';
      mech.frequency.setValueAtTime(1060 * pitchJitter, now + 0.018);
      mech.frequency.exponentialRampToValueAtTime(320, now + 0.052);
      const mGain = ctx.createGain();
      mGain.gain.setValueAtTime(0.055 * vol, now + 0.018);
      mGain.gain.exponentialRampToValueAtTime(0.001, now + 0.058);
      mech.connect(mGain);
      mGain.connect(ctx.destination);
      mech.start(now + 0.018);
      mech.stop(now + 0.064);

      const spring = ctx.createOscillator();
      spring.type = 'sine';
      spring.frequency.setValueAtTime(310, now + 0.032);
      spring.frequency.exponentialRampToValueAtTime(140, now + 0.09);
      const sGain = ctx.createGain();
      sGain.gain.setValueAtTime(0.038 * vol, now + 0.032);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
      spring.connect(sGain);
      sGain.connect(ctx.destination);
      spring.start(now + 0.032);
      spring.stop(now + 0.1);
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

  private ensureEngineNodes(ctx: AudioContext): void {
    if (this.engineNodesReady || !this.noiseBuffer) return;
    this.engineNodesReady = true;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(60, now);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(30, now);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(220, now);
    lp.Q.value = 0.65;

    const eg = ctx.createGain();
    eg.gain.setValueAtTime(0, now);

    osc1.connect(lp);
    osc2.connect(lp);
    lp.connect(eg);
    eg.connect(ctx.destination);
    osc1.start(now);
    osc2.start(now);

    const wind = ctx.createBufferSource();
    wind.buffer = this.noiseBuffer;
    wind.loop = true;

    const wFilter = ctx.createBiquadFilter();
    wFilter.type = 'bandpass';
    wFilter.frequency.setValueAtTime(360, now);
    wFilter.Q.value = 0.7;

    const wg = ctx.createGain();
    wg.gain.setValueAtTime(0, now);

    wind.connect(wFilter);
    wFilter.connect(wg);
    wg.connect(ctx.destination);
    wind.start(now);

    this.engineOsc1 = osc1;
    this.engineOsc2 = osc2;
    this.engineFilter = lp;
    this.engineGain = eg;
    this.engineWindSrc = wind;
    this.engineWindFilter = wFilter;
    this.engineWindGain = wg;
  }

  public stopEngineCue(): void {
    if (!this.ctx || !this.engineNodesReady) return;
    const now = this.ctx.currentTime;
    this.engineGain?.gain.setTargetAtTime(0, now, 0.06);
    this.engineWindGain?.gain.setTargetAtTime(0, now, 0.06);
  }

  public playEngineCue(kind: 'ground' | 'air' | 'heli', intensity = 0.5, muffled = false): void {
    const nowMs = performance.now();
    if (nowMs - this.lastEngineCueMs < 40) return;
    this.lastEngineCueMs = nowMs;

    const ctx = this.ensureContext();
    if (!ctx) return;
    this.ensureEngineNodes(ctx);
    if (!this.engineNodesReady) return;

    const load01 = Math.max(0, Math.min(1, intensity));
    const cabinAtten = muffled ? 0.62 : 1.0;
    const cabinCutoff = muffled ? 0.68 : 1.0;
    const now = ctx.currentTime;
    if (kind === 'heli') {
      // Rhythmic rotor blade chop + turboshaft whine
      const f1 = 18 + load01 * 14;
      const f2 = 112 + load01 * 56;
      this.engineOsc1?.frequency.setTargetAtTime(f1, now, 0.08);
      this.engineOsc2?.frequency.setTargetAtTime(f2, now, 0.08);
      this.engineFilter?.frequency.setTargetAtTime((240 + load01 * 180) * cabinCutoff, now, 0.08);
      this.engineGain?.gain.setTargetAtTime((0.036 + load01 * 0.04) * cabinAtten, now, 0.08);
      this.engineWindFilter?.frequency.setTargetAtTime(210 + load01 * 240, now, 0.08);
      this.engineWindGain?.gain.setTargetAtTime((0.02 + load01 * 0.032) * cabinAtten, now, 0.08);
    } else if (kind === 'air') {
      const f1 = 74 + load01 * 52;
      const f2 = f1 * 0.505;
      this.engineOsc1?.frequency.setTargetAtTime(f1, now, 0.08);
      this.engineOsc2?.frequency.setTargetAtTime(f2, now, 0.08);
      this.engineFilter?.frequency.setTargetAtTime((220 + load01 * 170) * cabinCutoff, now, 0.08);
      this.engineGain?.gain.setTargetAtTime((0.032 + load01 * 0.036) * cabinAtten, now, 0.08);
      this.engineWindFilter?.frequency.setTargetAtTime(320 + load01 * 320, now, 0.08);
      this.engineWindGain?.gain.setTargetAtTime((0.015 + load01 * 0.038) * cabinAtten, now, 0.08);
    } else {
      const f1 = 36 + load01 * 30;
      const f2 = f1 * 1.49;
      this.engineOsc1?.frequency.setTargetAtTime(f1, now, 0.08);
      this.engineOsc2?.frequency.setTargetAtTime(f2, now, 0.08);
      this.engineFilter?.frequency.setTargetAtTime((125 + load01 * 90) * cabinCutoff, now, 0.08);
      this.engineGain?.gain.setTargetAtTime((0.025 + load01 * 0.035) * cabinAtten, now, 0.08);
      this.engineWindGain?.gain.setTargetAtTime(0, now, 0.08);
    }
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

  public playBombDrop(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const whistle = ctx.createOscillator();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(920, now);
    whistle.frequency.exponentialRampToValueAtTime(290, now + 0.72);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    whistle.connect(g);
    g.connect(ctx.destination);
    whistle.start(now);
    whistle.stop(now + 0.76);
  }

  public playMissileLaunch(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const whoosh = ctx.createBufferSource();
    whoosh.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1450, now);
    bp.frequency.exponentialRampToValueAtTime(380, now + 0.55);
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.42, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.56);
    whoosh.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    whoosh.start(now);
    whoosh.stop(now + 0.58);
  }

  public playMissileLockTone(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1680, now);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  public playParachuteOpen(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const billow = ctx.createBufferSource();
    billow.buffer = this.noiseBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(720, now);
    lp.frequency.exponentialRampToValueAtTime(180, now + 0.42);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
    billow.connect(lp);
    lp.connect(g);
    g.connect(ctx.destination);
    billow.start(now);
    billow.stop(now + 0.45);
  }

  public playMedkitHeal(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const wrap = ctx.createBufferSource();
    wrap.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1100, now);
    bp.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    wrap.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    wrap.start(now);
    wrap.stop(now + 0.2);

    const chime = ctx.createOscillator();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(520, now + 0.05);
    chime.frequency.exponentialRampToValueAtTime(780, now + 0.22);
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.09, now + 0.05);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    chime.connect(cg);
    cg.connect(ctx.destination);
    chime.start(now + 0.05);
    chime.stop(now + 0.25);
  }

  public playFlareDeploy(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    // Double countermeasure pyrotechnic pop + sizzling magnesium hiss
    [0, 0.065].forEach((off) => {
      const pop = ctx.createOscillator();
      pop.type = 'triangle';
      pop.frequency.setValueAtTime(260, now + off);
      pop.frequency.exponentialRampToValueAtTime(75, now + off + 0.055);
      const pGain = ctx.createGain();
      pGain.gain.setValueAtTime(0.24, now + off);
      pGain.gain.exponentialRampToValueAtTime(0.001, now + off + 0.06);
      pop.connect(pGain);
      pGain.connect(ctx.destination);
      pop.start(now + off);
      pop.stop(now + off + 0.065);

      const hiss = ctx.createBufferSource();
      hiss.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2600, now + off);
      bp.frequency.exponentialRampToValueAtTime(1250, now + off + 0.34);
      bp.Q.value = 1.2;
      const hGain = ctx.createGain();
      hGain.gain.setValueAtTime(0.18, now + off + 0.01);
      hGain.gain.exponentialRampToValueAtTime(0.001, now + off + 0.35);
      hiss.connect(bp);
      bp.connect(hGain);
      hGain.connect(ctx.destination);
      hiss.start(now + off);
      hiss.stop(now + off + 0.36);
    });
  }

  public playArmorImpact(distanceAttenuation = 1): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol = Math.max(0.06, Math.min(1, distanceAttenuation));
    const clang = ctx.createOscillator();
    clang.type = 'triangle';
    clang.frequency.setValueAtTime(1280 + Math.random() * 260, now);
    clang.frequency.exponentialRampToValueAtTime(420, now + 0.14);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.2 * vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    clang.connect(g);
    g.connect(ctx.destination);
    clang.start(now);
    clang.stop(now + 0.16);
  }

  public stopCockpitWarnings(): void {
    this.activeWarning = 'none';
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore speech synthesis errors on restricted platforms
      }
    }
  }

  public updateCockpitWarningAudio(warning: AircraftThreatWarning): void {
    if (warning === 'none' || this.muted) {
      if (this.activeWarning !== 'none') {
        this.stopCockpitWarnings();
      }
      return;
    }

    const threatChanged = this.activeWarning !== warning;
    this.activeWarning = warning;
    const nowMs = performance.now();

    const tonePeriodMs = warning === 'missile' ? 420 : warning === 'eject' ? 520 : 720;
    if (threatChanged || nowMs - this.lastWarningAudioMs >= tonePeriodMs) {
      this.lastWarningAudioMs = nowMs;
      const ctx = this.ensureContext();
      if (ctx) {
        const now = ctx.currentTime;
        if (warning === 'pull_up') {
          // Authentic GPWS rising dual whoop-whoop tone
          [0, 0.18].forEach((off) => {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(420, now + off);
            osc.frequency.exponentialRampToValueAtTime(980, now + off + 0.14);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.09, now + off);
            g.gain.exponentialRampToValueAtTime(0.001, now + off + 0.16);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start(now + off);
            osc.stop(now + off + 0.17);
          });
        } else if (warning === 'missile') {
          // Urgent RWR fast warble
          [0, 0.11, 0.22].forEach((off, idx) => {
            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(idx % 2 === 0 ? 1950 : 1480, now + off);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.065, now + off);
            g.gain.exponentialRampToValueAtTime(0.001, now + off + 0.085);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start(now + off);
            osc.stop(now + off + 0.09);
          });
        } else if (warning === 'eject') {
          // Master caution urgent descending klaxon
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(1180, now);
          osc.frequency.exponentialRampToValueAtTime(520, now + 0.28);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.11, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.31);
        }
      }
    }

    const MIN_SPEECH_GAP_MS = 4800;
    const voiceCooldownMs = warning === 'missile' ? 4800 : 5400;
    const speechReady =
      nowMs - this.speechEndTimeMs >= MIN_SPEECH_GAP_MS &&
      nowMs - this.lastWarningVoiceMs >= voiceCooldownMs;
    if (threatChanged || speechReady) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && this.unlocked) {
        try {
          if (threatChanged) {
            window.speechSynthesis.cancel();
          }
          if (!window.speechSynthesis.speaking && (threatChanged || nowMs - this.speechEndTimeMs >= MIN_SPEECH_GAP_MS)) {
            this.lastWarningVoiceMs = nowMs;
            const phrase =
              warning === 'pull_up'
                ? 'Pull up! Pull up!'
                : warning === 'missile'
                  ? 'Missile! Flare! Flare!'
                  : 'Eject! Eject!';
            const utter = new SpeechSynthesisUtterance(phrase);
            utter.lang = 'en-US';
            utter.rate = 1.12;
            utter.pitch = 1.0;
            utter.volume = 0.88;
            utter.onend = () => {
              this.speechEndTimeMs = performance.now();
            };
            utter.onerror = () => {
              this.speechEndTimeMs = performance.now();
            };
            window.speechSynthesis.speak(utter);
          }
        } catch {
          // Ignore unsupported browser speech synthesis
        }
      }
    }
  }

  public playBaseAlarm(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.65].forEach((offset) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(510, now + offset);
      osc.frequency.linearRampToValueAtTime(790, now + offset + 0.34);
      osc.frequency.linearRampToValueAtTime(490, now + offset + 0.56);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1350;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now + offset);
      g.gain.linearRampToValueAtTime(0.11, now + offset + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.58);
      osc.connect(lp);
      lp.connect(g);
      g.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.6);
    });
  }

  public playDistantBlast(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(340, now);
    lp.frequency.exponentialRampToValueAtTime(48, now + 1.5);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.32, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 1.55);
    noise.connect(lp);
    lp.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 1.58);

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(72, now);
    sub.frequency.exponentialRampToValueAtTime(22, now + 0.72);
    const sGain = ctx.createGain();
    sGain.gain.setValueAtTime(0.28, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.76);
    sub.connect(sGain);
    sGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.8);
  }

  public playRainAmbience(active: boolean): void {
    if (!active || this.muted) {
      if (this.ctx && this.rainGain) {
        this.rainGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.14);
      }
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    if (!this.rainNodesReady) {
      this.rainNodesReady = true;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1180, now);
      bp.Q.value = 0.55;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      src.start(now);
      this.rainSrc = src;
      this.rainGain = g;
    }
    this.rainGain?.gain.setTargetAtTime(0.045, now, 0.25);
  }

  public playCharacterVoiceCadence(
    pitchHz: number,
    emotion: 'calm' | 'tense' | 'urgent' | 'somber' | 'command' = 'calm',
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const baseHz = Math.max(75, Math.min(280, pitchHz));
    const syllables = emotion === 'urgent' ? 4 : emotion === 'somber' ? 2 : 3;
    const step = emotion === 'urgent' ? 0.085 : emotion === 'somber' ? 0.145 : 0.11;

    for (let i = 0; i < syllables; i++) {
      const t0 = now + i * step;
      const osc = ctx.createOscillator();
      osc.type = emotion === 'command' || emotion === 'urgent' ? 'sawtooth' : 'triangle';
      const fStart = baseHz * (0.94 + ((i * 7) % 3) * 0.06);
      const fEnd = emotion === 'somber' ? fStart * 0.86 : fStart * 1.05;
      osc.frequency.setValueAtTime(fStart, t0);
      osc.frequency.linearRampToValueAtTime(fEnd, t0 + step * 0.8);

      // Formant shaping for human vocal cadence without harshness
      const formant = ctx.createBiquadFilter();
      formant.type = 'bandpass';
      formant.frequency.setValueAtTime(emotion === 'urgent' ? 880 : 620, t0);
      formant.Q.value = 2.4;

      const g = ctx.createGain();
      const peakVol = emotion === 'urgent' ? 0.042 : emotion === 'somber' ? 0.028 : 0.034;
      g.gain.setValueAtTime(0.001, t0);
      g.gain.linearRampToValueAtTime(peakVol, t0 + 0.018);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + step * 0.88);

      osc.connect(formant);
      formant.connect(g);
      g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + step * 0.92);
    }
  }
}
