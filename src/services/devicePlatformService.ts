export type OperatingSystem = 'Linux' | 'Windows' | 'macOS' | 'Android' | 'iOS' | 'ChromeOS' | 'Unknown';
export type DeviceCategory = 'smartphone' | 'tablet' | 'desktop';
export type ViewportClass = 'mobile' | 'tablet' | 'desktop' | 'ultrawide';

export interface DesktopResolutionPreset {
  id: string;
  name: string;
  shortName: string;
  width: number;
  height: number;
  aspectRatio: string;
  diagonal: string;
  panelType: string;
  description: string;
  isDefault?: boolean;
}

export const DESKTOP_RESOLUTION_PRESETS: DesktopResolutionPreset[] = [
  {
    id: '16-fhd-plus-1920x1200-wva',
    name: '(16") Full HD+ 1920 x 1200 WVA',
    shortName: '16" 1920×1200 WVA',
    width: 1920,
    height: 1200,
    aspectRatio: '16:10',
    diagonal: '16"',
    panelType: 'WVA (Wide Viewing Angle)',
    description: '16.0" Full HD+ (1920 × 1200) WVA anti-glare display with 16:10 productivity aspect ratio. Optimal 142 PPI institutional options density for Bloomberg & ThinkorSwim.',
    isDefault: true,
  },
  {
    id: '15-fhd-1920x1080',
    name: '15.6" Full HD 1920 x 1080',
    shortName: '15.6" 1920×1080',
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
    diagonal: '15.6"',
    panelType: 'IPS / TN',
    description: 'Standard 16:9 Full HD 1080p desktop / laptop display.',
  },
  {
    id: '16-qhd-plus-2560x1600-wva',
    name: '16" QHD+ 2560 x 1600 WVA',
    shortName: '16" 2560×1600 WVA',
    width: 2560,
    height: 1600,
    aspectRatio: '16:10',
    diagonal: '16"',
    panelType: 'WVA / IPS',
    description: '16-inch high-resolution 16:10 quad-HD workstation panel.',
  },
  {
    id: '34-uwqhd-3440x1440',
    name: '34" Ultrawide QHD 3440 x 1440',
    shortName: '34" 3440×1440',
    width: 3440,
    height: 1440,
    aspectRatio: '21:9',
    diagonal: '34"',
    panelType: 'VA / IPS Curved',
    description: 'Panoramic multi-window trading desk ultrawide setup.',
  },
];

export interface DeviceDiagnostics {
  os: OperatingSystem;
  osDetails: string;
  deviceCategory: DeviceCategory;
  isTouchDevice: boolean;
  maxTouchPoints: number;
  viewportClass: ViewportClass;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  orientation: 'portrait' | 'landscape';
  isPWA: boolean;
  browserName: string;
  primaryModifierKey: 'Ctrl' | 'Cmd';
  desktopResolutionName?: string;
  displaySpec?: string;
  aspectRatio?: string;
  panelType?: string;
  screenDiagonal?: string;
  simulatedResolution?: boolean;
}

const STORAGE_KEY_DEVICE_OVERRIDE = 'strikepoint_device_mode_override';
const STORAGE_KEY_DESKTOP_RESOLUTION = 'strikepoint_desktop_resolution';

export function getActiveDesktopResolution(): DesktopResolutionPreset {
  if (typeof window === 'undefined') {
    return DESKTOP_RESOLUTION_PRESETS[0];
  }
  const savedId = localStorage.getItem(STORAGE_KEY_DESKTOP_RESOLUTION);
  const found = DESKTOP_RESOLUTION_PRESETS.find((p) => p.id === savedId);
  return found || DESKTOP_RESOLUTION_PRESETS[0];
}

export function setActiveDesktopResolution(presetId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_DESKTOP_RESOLUTION, presetId);
}

export function getDeviceDiagnostics(): DeviceDiagnostics {
  const activeDesktopRes = getActiveDesktopResolution();

  if (typeof window === 'undefined') {
    return {
      os: 'Unknown',
      osDetails: 'Server Side Environment',
      deviceCategory: 'desktop',
      isTouchDevice: false,
      maxTouchPoints: 0,
      viewportClass: 'desktop',
      screenWidth: activeDesktopRes.width,
      screenHeight: activeDesktopRes.height,
      devicePixelRatio: 1,
      orientation: 'landscape',
      isPWA: false,
      browserName: 'Unknown',
      primaryModifierKey: 'Ctrl',
      desktopResolutionName: activeDesktopRes.name,
      displaySpec: `${activeDesktopRes.diagonal} ${activeDesktopRes.panelType}`,
      aspectRatio: activeDesktopRes.aspectRatio,
      panelType: activeDesktopRes.panelType,
      screenDiagonal: activeDesktopRes.diagonal,
      simulatedResolution: false,
    };
  }

  const ua = window.navigator.userAgent;
  const platform = (window.navigator as any).userAgentData?.platform || window.navigator.platform || '';
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;

  // OS Detection
  let os: OperatingSystem = 'Unknown';
  let osDetails = 'Generic OS';

  if (/Android/i.test(ua)) {
    os = 'Android';
    osDetails = 'Android Mobile / Tablet OS';
  } else if (/iPhone|iPod/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1 && width < 600)) {
    os = 'iOS';
    osDetails = 'Apple iOS (iPhone)';
  } else if (/iPad/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    os = 'iOS';
    osDetails = 'Apple iPadOS (Tablet)';
  } else if (/CrOS/i.test(ua)) {
    os = 'ChromeOS';
    osDetails = 'Google ChromeOS';
  } else if (/Linux/i.test(platform) || /Linux/i.test(ua) || /X11/i.test(ua)) {
    os = 'Linux';
    osDetails = 'GNU/Linux Desktop (Ubuntu, Debian, Fedora, Arch)';
  } else if (/Win/i.test(platform) || /Windows/i.test(ua)) {
    os = 'Windows';
    osDetails = 'Microsoft Windows 10/11 (PC / Surface)';
  } else if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) {
    os = 'macOS';
    osDetails = 'Apple macOS';
  }

  // Device Category Detection
  const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  let deviceCategory: DeviceCategory = 'desktop';

  // Check manual override first
  const savedOverride = localStorage.getItem(STORAGE_KEY_DEVICE_OVERRIDE) as DeviceCategory | null;
  if (savedOverride && (savedOverride === 'smartphone' || savedOverride === 'tablet' || savedOverride === 'desktop')) {
    deviceCategory = savedOverride;
  } else {
    if (os === 'Android') {
      deviceCategory = width >= 600 && height >= 600 ? 'tablet' : 'smartphone';
    } else if (os === 'iOS') {
      deviceCategory = /iPad/i.test(ua) || width >= 768 ? 'tablet' : 'smartphone';
    } else if (hasTouch && width < 640) {
      deviceCategory = 'smartphone';
    } else if (hasTouch && width >= 640 && width <= 1024) {
      deviceCategory = 'tablet';
    } else {
      deviceCategory = width < 640 ? 'smartphone' : width <= 1024 ? 'tablet' : 'desktop';
    }
  }

  // Viewport Class
  let viewportClass: ViewportClass = 'desktop';
  if (width < 640) viewportClass = 'mobile';
  else if (width <= 1024) viewportClass = 'tablet';
  else if (width > 1920) viewportClass = 'ultrawide';

  // Browser detection
  let browserName = 'Browser';
  if (/Edg/i.test(ua)) browserName = 'Microsoft Edge';
  else if (/Chrome/i.test(ua)) browserName = 'Google Chrome';
  else if (/Firefox/i.test(ua)) browserName = 'Mozilla Firefox';
  else if (/Safari/i.test(ua)) browserName = 'Apple Safari';
  else if (/Brave/i.test(ua)) browserName = 'Brave';

  // Standalone PWA detection
  const isPWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  const isSimulated = isDesktopResolutionSimulationActive();

  return {
    os,
    osDetails,
    deviceCategory,
    isTouchDevice: hasTouch,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    viewportClass,
    screenWidth: isSimulated && deviceCategory === 'desktop' ? activeDesktopRes.width : width,
    screenHeight: isSimulated && deviceCategory === 'desktop' ? activeDesktopRes.height : height,
    devicePixelRatio: Number(dpr.toFixed(2)),
    orientation: width > height ? 'landscape' : 'portrait',
    isPWA,
    browserName,
    primaryModifierKey: os === 'macOS' ? 'Cmd' : 'Ctrl',
    desktopResolutionName: activeDesktopRes.name,
    displaySpec: `${activeDesktopRes.diagonal} ${activeDesktopRes.panelType}`,
    aspectRatio: activeDesktopRes.aspectRatio,
    panelType: activeDesktopRes.panelType,
    screenDiagonal: activeDesktopRes.diagonal,
    simulatedResolution: isSimulated,
  };
}

export function isDesktopResolutionSimulationActive(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('strikepoint_simulate_desktop_res') === 'true';
}

export function setDesktopResolutionSimulationActive(active: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('strikepoint_simulate_desktop_res', String(active));
}

export function setDeviceCategoryOverride(category: DeviceCategory | null) {
  if (typeof window === 'undefined') return;
  if (category) {
    localStorage.setItem(STORAGE_KEY_DEVICE_OVERRIDE, category);
  } else {
    localStorage.removeItem(STORAGE_KEY_DEVICE_OVERRIDE);
  }
}
