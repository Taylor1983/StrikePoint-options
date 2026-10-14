/**
 * StrikePoint Terminal - Account Privacy & Stealth Engine
 * Provides financial balance masking, screen camouflage, and inactivity security.
 */

export interface PrivacySettings {
  isPrivacyMode: boolean;       // Mask dollar amounts, BP, and Net Liq
  isMaskAccountNumbers: boolean; // Mask PA-8821943 -> PA-••••943
  inactivityLockMinutes: number; // 0 = disabled, 1, 3, 5, 10, 15 min
  allowPeekOnHover: boolean;     // Reveal value on mouse hover
  blurBackgroundOnLock: boolean; // Institutional frosted blur
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  isPrivacyMode: false,
  isMaskAccountNumbers: true,
  inactivityLockMinutes: 0,
  allowPeekOnHover: true,
  blurBackgroundOnLock: true,
};

const STORAGE_KEY = 'strikepoint_privacy_settings';

export function loadPrivacySettings(): PrivacySettings {
  if (typeof window === 'undefined') return DEFAULT_PRIVACY_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PRIVACY_SETTINGS;
    return { ...DEFAULT_PRIVACY_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PRIVACY_SETTINGS;
  }
}

export function savePrivacySettings(settings: PrivacySettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('strikepoint:privacy-update', { detail: settings }));
  } catch {}
}

/**
 * Masks a monetary value, returning •••••• if privacy mode is active
 */
export function maskCurrency(
  value: number | string,
  isPrivacyMode: boolean,
  prefix: string = '$',
  decimals: number = 2
): string {
  if (!isPrivacyMode) {
    if (typeof value === 'number') {
      return `${prefix}${value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`;
    }
    return `${prefix}${value}`;
  }
  return `${prefix}••••••`;
}

/**
 * Masks account identifier (e.g. "PA-8821943" -> "PA-••••943")
 */
export function maskAccountIdentifier(
  accountNum: string,
  isPrivacyMode: boolean,
  maskStyle: 'partial' | 'full' = 'partial'
): string {
  if (!isPrivacyMode || !accountNum) return accountNum;
  if (maskStyle === 'full') return '••••••••••';
  
  if (accountNum.length <= 4) return '••••';
  const prefix = accountNum.slice(0, 3);
  const suffix = accountNum.slice(-3);
  return `${prefix}••••${suffix}`;
}

/**
 * Masks percentages (e.g. "+12.45%" -> "••••%")
 */
export function maskPercentage(value: number | string, isPrivacyMode: boolean): string {
  if (!isPrivacyMode) {
    if (typeof value === 'number') {
      return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    }
    return String(value);
  }
  return '••••%';
}
