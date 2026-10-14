/**
 * Web Audio API synthesizer for Bloomberg Terminal tactile sound effects & market trigger alerts.
 * Pure Web Audio API synthesis: zero external audio files, zero latency, high-fidelity sound.
 */

import {
  ChimeId,
  MarketTriggerType,
  loadSoundSettings,
  saveSoundSettings,
} from '../services/soundSettingsService';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function setTerminalAudioEnabled(enabled: boolean) {
  const current = loadSoundSettings();
  saveSoundSettings({ ...current, masterEnabled: enabled });
}

export function isTerminalAudioEnabled(): boolean {
  return loadSoundSettings().masterEnabled;
}

/** Soft mechanical key click sound */
export function playKeyClick() {
  const settings = loadSoundSettings();
  if (!settings.masterEnabled) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.03);

    const vol = 0.04 * settings.masterVolume;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.035);
  } catch {
    // ignore audio failure
  }
}

/** Ticker tick subtle blip */
export function playTickBlip(up: boolean = true) {
  const settings = loadSoundSettings();
  if (!settings.masterEnabled) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const freq = up ? 880 : 440;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    const vol = 0.015 * settings.masterVolume;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.025);
  } catch {
    // ignore
  }
}

/* =========================================================================
 * CORE CHIME SYNTHESIZERS (8 Custom Institutional Chimes)
 * ========================================================================= */

/** 1. Bloomberg Harmonic Triad (F5 • A5 • D6) */
export function synthBloombergTriad(ctx: AudioContext, baseVolume: number) {
  const now = ctx.currentTime;
  const triad = [587.33, 880, 1174.66];
  triad.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.07);

    const noteVol = baseVolume * 0.08;
    gain.gain.setValueAtTime(noteVol, now + idx * 0.07);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.07);
    osc.stop(now + idx * 0.07 + 0.25);
  });
}

/** 2. Authentic NYSE / TSX Bronze Clapper Strike Bell */
export function synthBronzeBell(ctx: AudioContext, baseVolume: number) {
  const now = ctx.currentTime;
  const harmonics = [920, 1100, 1380, 1840];
  const strikeVol = baseVolume * 0.09;

  harmonics.forEach((freq, hIdx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = hIdx === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(strikeVol / (hIdx + 1), now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.9);
  });
}

/** 3. Avionics Radar Telemetry Ping */
export function synthRadarPing(ctx: AudioContext, baseVolume: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(2150, now);
  osc.frequency.exponentialRampToValueAtTime(1400, now + 0.1);

  gain.gain.setValueAtTime(baseVolume * 0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.13);
}

/** 4. Cockpit Master Caution (Dual-tone 1050Hz -> 700Hz) */
export function synthCockpitCaution(ctx: AudioContext, baseVolume: number) {
  const now = ctx.currentTime;
  [1050, 700].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);
    gain.gain.setValueAtTime(baseVolume * 0.065, now + idx * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.38);
  });
}

/** 5. Tokyo Nikkei Dual Bell (1318.5Hz & 1760Hz E6/A6) */
export function synthTokyoChime(ctx: AudioContext, baseVolume: number) {
  const now = ctx.currentTime;
  [1318.5, 1760].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.09);

    gain.gain.setValueAtTime(0.001, now + idx * 0.09);
    gain.gain.linearRampToValueAtTime(baseVolume * 0.06, now + idx * 0.09 + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.09);
    osc.stop(now + idx * 0.09 + 0.5);
  });
}

/** 6. Matrix Cyber Pulse (Fast futuristic FM chirp) */
export function synthMatrixPulse(ctx: AudioContext, baseVolume: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.linearRampToValueAtTime(1400, now + 0.04);
  osc.frequency.linearRampToValueAtTime(800, now + 0.09);

  gain.gain.setValueAtTime(baseVolume * 0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.11);
}

/** 7. Minimal Tactile Blip (Quiet mechanical stealth click) */
export function synthTactileClick(ctx: AudioContext, baseVolume: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(480, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.02);

  gain.gain.setValueAtTime(baseVolume * 0.03, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.03);
}

/** 8. Master Warning Klaxon (Dual-Frequency Alternating Warble) */
export function synthAlarmKlaxon(ctx: AudioContext, baseVolume: number) {
  const now = ctx.currentTime;
  const pulses = 3;
  for (let i = 0; i < pulses; i++) {
    const pStart = now + i * 0.14;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(i % 2 === 0 ? 960 : 720, pStart);
    gain.gain.setValueAtTime(baseVolume * 0.045, pStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, pStart + 0.11);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(pStart);
    osc.stop(pStart + 0.12);
  }
}

/**
 * Play a specific chime sound by ID with optional volume multiplier.
 */
export function playChimeSound(chimeId: ChimeId, volumeMultiplier: number = 1.0) {
  const settings = loadSoundSettings();
  if (!settings.masterEnabled) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const effectiveVolume = Math.max(0, Math.min(1, settings.masterVolume * volumeMultiplier));
    if (effectiveVolume <= 0) return;

    switch (chimeId) {
      case 'bloomberg_triad':
        synthBloombergTriad(ctx, effectiveVolume);
        break;
      case 'nyse_bell':
        synthBronzeBell(ctx, effectiveVolume);
        break;
      case 'radar_ping':
        synthRadarPing(ctx, effectiveVolume);
        break;
      case 'cockpit_caution':
        synthCockpitCaution(ctx, effectiveVolume);
        break;
      case 'tokyo_chime':
        synthTokyoChime(ctx, effectiveVolume);
        break;
      case 'matrix_pulse':
        synthMatrixPulse(ctx, effectiveVolume);
        break;
      case 'tactile_click':
        synthTactileClick(ctx, effectiveVolume);
        break;
      case 'alarm_klaxon':
        synthAlarmKlaxon(ctx, effectiveVolume);
        break;
      default:
        synthBloombergTriad(ctx, effectiveVolume);
        break;
    }
  } catch {
    // audio failure graceful ignore
  }
}

/**
 * Preview a chime directly from settings modal (plays even if master mute is temporarily engaged).
 */
export function previewChimeSound(chimeId: ChimeId, volume: number = 0.85) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const effectiveVolume = Math.max(0.1, Math.min(1, volume));

    switch (chimeId) {
      case 'bloomberg_triad':
        synthBloombergTriad(ctx, effectiveVolume);
        break;
      case 'nyse_bell':
        synthBronzeBell(ctx, effectiveVolume);
        break;
      case 'radar_ping':
        synthRadarPing(ctx, effectiveVolume);
        break;
      case 'cockpit_caution':
        synthCockpitCaution(ctx, effectiveVolume);
        break;
      case 'tokyo_chime':
        synthTokyoChime(ctx, effectiveVolume);
        break;
      case 'matrix_pulse':
        synthMatrixPulse(ctx, effectiveVolume);
        break;
      case 'tactile_click':
        synthTactileClick(ctx, effectiveVolume);
        break;
      case 'alarm_klaxon':
        synthAlarmKlaxon(ctx, effectiveVolume);
        break;
      default:
        synthBloombergTriad(ctx, effectiveVolume);
        break;
    }
  } catch {
    // ignore
  }
}

/**
 * Play alert chime configured for a specific market trigger event.
 */
export function playMarketTriggerAlert(triggerType: MarketTriggerType = 'execution') {
  const settings = loadSoundSettings();
  if (!settings.masterEnabled) return;

  const triggerConfig = settings.triggers[triggerType];
  if (!triggerConfig || !triggerConfig.enabled) return;

  playChimeSound(triggerConfig.chime, triggerConfig.volume);
}

/** Default Execution Chime (dispatches to user-selected execution chime) */
export function playExecutionChime() {
  playMarketTriggerAlert('execution');
}

/** Default Terminal Alert (dispatches to user-selected volatility chime) */
export function playTerminalAlert() {
  playMarketTriggerAlert('volatility');
}

/**
 * Authentic NYSE / TSX Exchange Opening Bell
 */
export function playOpeningBell() {
  const settings = loadSoundSettings();
  if (!settings.masterEnabled) return;
  const triggerConfig = settings.triggers.market_bell;
  if (triggerConfig && !triggerConfig.enabled) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const strikeCount = 8;
    const strikeInterval = 0.11;
    const vol = (triggerConfig ? triggerConfig.volume : 0.8) * settings.masterVolume;

    for (let i = 0; i < strikeCount; i++) {
      const strikeTime = now + i * strikeInterval;
      const harmonics = [920, 1100, 1380, 1840];
      const strikeVelocity = (i === strikeCount - 1 ? 0.09 : 0.06) * vol;

      harmonics.forEach((freq, hIdx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = hIdx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq * (1 + (Math.random() - 0.5) * 0.01), strikeTime);

        gain.gain.setValueAtTime(0.001, strikeTime);
        gain.gain.linearRampToValueAtTime(strikeVelocity / (hIdx + 1), strikeTime + 0.004);
        const decayDuration = i === strikeCount - 1 ? 1.6 : 0.22;
        gain.gain.exponentialRampToValueAtTime(0.0001, strikeTime + decayDuration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(strikeTime);
        osc.stop(strikeTime + decayDuration + 0.05);
      });
    }
  } catch {
    // ignore
  }
}

/**
 * Authentic NYSE / TSX Exchange Closing Bell
 */
export function playClosingBell() {
  const settings = loadSoundSettings();
  if (!settings.masterEnabled) return;
  const triggerConfig = settings.triggers.market_bell;
  if (triggerConfig && !triggerConfig.enabled) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const strikes = [0, 0.45, 0.95];
    const vol = (triggerConfig ? triggerConfig.volume : 0.8) * settings.masterVolume;

    strikes.forEach((offset, sIdx) => {
      const strikeTime = now + offset;
      const harmonics = [580, 870, 1160, 1740];
      const volume = (sIdx === strikes.length - 1 ? 0.10 : 0.07) * vol;
      const decayTime = sIdx === strikes.length - 1 ? 2.8 : 1.2;

      harmonics.forEach((freq, hIdx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = hIdx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, strikeTime);

        gain.gain.setValueAtTime(0.001, strikeTime);
        gain.gain.linearRampToValueAtTime(volume / (hIdx + 1), strikeTime + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, strikeTime + decayTime);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(strikeTime);
        osc.stop(strikeTime + decayTime + 0.1);
      });
    });
  } catch {
    // ignore
  }
}

/** Cockpit Master Warning */
export function playCockpitMasterWarning() {
  playMarketTriggerAlert('risk');
}

/** Cockpit Master Caution */
export function playCockpitMasterCaution() {
  playMarketTriggerAlert('volatility');
}

/** Cockpit Stall Warning Horn */
export function playCockpitStallHorn() {
  const settings = loadSoundSettings();
  if (!settings.masterEnabled) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol = 0.05 * settings.masterVolume;
    for (let i = 0; i < 4; i++) {
      const t = now + i * 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  } catch {
    // ignore
  }
}

/** Heavy Cockpit Guarded Switch */
export function playCockpitSwitchClick() {
  playKeyClick();
}

/** Avionics Radar / Telemetry Ping */
export function playCockpitRadarPing() {
  playMarketTriggerAlert('flow');
}
