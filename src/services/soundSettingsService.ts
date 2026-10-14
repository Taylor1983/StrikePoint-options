/**
 * Sound Settings Service for Bloomberg Terminal
 * Manages custom audio chime selections for market trigger alerts,
 * volume thresholds, per-trigger configurations, and local persistence.
 */

export type ChimeId =
  | 'bloomberg_triad'
  | 'nyse_bell'
  | 'radar_ping'
  | 'cockpit_caution'
  | 'tokyo_chime'
  | 'matrix_pulse'
  | 'tactile_click'
  | 'alarm_klaxon';

export type MarketTriggerType =
  | 'execution'
  | 'flow'
  | 'volatility'
  | 'risk'
  | 'market_bell';

export interface ChimeMetadata {
  id: ChimeId;
  name: string;
  category: 'Bloomberg Institutional' | 'Exchange Bells' | 'Avionics & Radar' | 'Subtle Tactile';
  description: string;
  frequencies: string;
  durationMs: number;
}

export const AVAILABLE_CHIMES: ChimeMetadata[] = [
  {
    id: 'bloomberg_triad',
    name: 'Bloomberg Triad',
    category: 'Bloomberg Institutional',
    description: 'Classic ascending 3-tone harmonic fill chime (F5 • A5 • D6). Crisp, bright & authoritative.',
    frequencies: '587Hz → 880Hz → 1175Hz',
    durationMs: 380,
  },
  {
    id: 'nyse_bell',
    name: 'NYSE / TSX Bronze Bell',
    category: 'Exchange Bells',
    description: 'Resonant bronze clapper strike with authentic bell partials and rich acoustic sustain.',
    frequencies: '920Hz / 1100Hz / 1380Hz',
    durationMs: 950,
  },
  {
    id: 'radar_ping',
    name: 'Avionics Radar Ping',
    category: 'Avionics & Radar',
    description: 'High-tech crystal telemetry blip. Sharp acoustic transient designed for rapid flow sweeps.',
    frequencies: '2150Hz → 1400Hz sweep',
    durationMs: 140,
  },
  {
    id: 'cockpit_caution',
    name: 'Cockpit Master Caution',
    category: 'Avionics & Radar',
    description: 'Dual-frequency Boeing/Airbus style chime for elevated volatility and caution thresholds.',
    frequencies: '1050Hz → 700Hz',
    durationMs: 420,
  },
  {
    id: 'tokyo_chime',
    name: 'Tokyo Nikkei Bell',
    category: 'Exchange Bells',
    description: 'Clean East Asian exchange bell strike with resonant pure harmonic intervals.',
    frequencies: '1318Hz & 1760Hz (E6 / A6)',
    durationMs: 650,
  },
  {
    id: 'matrix_pulse',
    name: 'Matrix Cyber Pulse',
    category: 'Bloomberg Institutional',
    description: 'Futuristic electronic frequency pulse for algorithmic zero-gamma trigger transitions.',
    frequencies: '1200Hz ↔ 600Hz FM',
    durationMs: 120,
  },
  {
    id: 'tactile_click',
    name: 'Minimal Tactile Blip',
    category: 'Subtle Tactile',
    description: 'Ultra-low distraction mechanical click for quiet trading floors and stealth monitoring.',
    frequencies: '480Hz → 120Hz click',
    durationMs: 40,
  },
  {
    id: 'alarm_klaxon',
    name: 'Master Warning Klaxon',
    category: 'Avionics & Radar',
    description: 'Alternating dual-frequency klaxon pulses for critical margin calls and DEFCON alarms.',
    frequencies: '960Hz / 720Hz warble',
    durationMs: 500,
  },
];

export interface TriggerSoundSetting {
  enabled: boolean;
  chime: ChimeId;
  volume: number; // 0.0 to 1.0
  label: string;
  triggerDescription: string;
}

export interface SoundSettings {
  masterEnabled: boolean;
  masterVolume: number; // 0.0 to 1.0
  triggers: Record<MarketTriggerType, TriggerSoundSetting>;
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  masterEnabled: true,
  masterVolume: 0.85,
  triggers: {
    execution: {
      enabled: true,
      chime: 'bloomberg_triad',
      volume: 0.9,
      label: 'Trade & Order Executions',
      triggerDescription: 'Order fills, option strategy executions, ticket submissions & leg confirmations',
    },
    flow: {
      enabled: true,
      chime: 'radar_ping',
      volume: 0.75,
      label: 'Unusual Flow & Whales',
      triggerDescription: 'Institutional block orders, aggressive sweep prints & dark pool volume triggers',
    },
    volatility: {
      enabled: true,
      chime: 'cockpit_caution',
      volume: 0.85,
      label: 'Zero-Gamma & IV Spikes',
      triggerDescription: 'Underlying crossing zero-gamma flip level, IV Rank > 80% breakout surges',
    },
    risk: {
      enabled: true,
      chime: 'alarm_klaxon',
      volume: 1.0,
      label: 'Margin & DEFCON Alarms',
      triggerDescription: 'Capital cushion breach (<15%), margin call risk status & geopolitical alerts',
    },
    market_bell: {
      enabled: true,
      chime: 'nyse_bell',
      volume: 0.8,
      label: 'Exchange Market Bells',
      triggerDescription: 'NYSE / TSX 09:30 AM market opening bell & 16:00 PM closing gong chimes',
    },
  },
};

const STORAGE_KEY = 'bloomberg_sound_settings_v2';

let cachedSettings: SoundSettings | null = null;
const listeners = new Set<(settings: SoundSettings) => void>();

export function loadSoundSettings(): SoundSettings {
  if (cachedSettings) return cachedSettings;
  if (typeof window === 'undefined') return DEFAULT_SOUND_SETTINGS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Deep merge with defaults to avoid missing keys
      const merged: SoundSettings = {
        masterEnabled: typeof parsed.masterEnabled === 'boolean' ? parsed.masterEnabled : DEFAULT_SOUND_SETTINGS.masterEnabled,
        masterVolume: typeof parsed.masterVolume === 'number' ? Math.max(0, Math.min(1, parsed.masterVolume)) : DEFAULT_SOUND_SETTINGS.masterVolume,
        triggers: {
          execution: { ...DEFAULT_SOUND_SETTINGS.triggers.execution, ...(parsed.triggers?.execution || {}) },
          flow: { ...DEFAULT_SOUND_SETTINGS.triggers.flow, ...(parsed.triggers?.flow || {}) },
          volatility: { ...DEFAULT_SOUND_SETTINGS.triggers.volatility, ...(parsed.triggers?.volatility || {}) },
          risk: { ...DEFAULT_SOUND_SETTINGS.triggers.risk, ...(parsed.triggers?.risk || {}) },
          market_bell: { ...DEFAULT_SOUND_SETTINGS.triggers.market_bell, ...(parsed.triggers?.market_bell || {}) },
        },
      };
      cachedSettings = merged;
      return merged;
    }
  } catch (err) {
    console.warn('Failed to load sound settings from localStorage:', err);
  }

  cachedSettings = DEFAULT_SOUND_SETTINGS;
  return DEFAULT_SOUND_SETTINGS;
}

export function saveSoundSettings(settings: SoundSettings) {
  cachedSettings = settings;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.warn('Failed to save sound settings:', err);
    }
  }
  listeners.forEach((listener) => {
    try {
      listener(settings);
    } catch {
      // ignore
    }
  });
}

export function subscribeSoundSettings(callback: (settings: SoundSettings) => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function getChimeMetadata(chimeId: ChimeId): ChimeMetadata {
  return AVAILABLE_CHIMES.find((c) => c.id === chimeId) || AVAILABLE_CHIMES[0];
}
