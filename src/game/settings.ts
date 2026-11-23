import type {
  ControlSettings,
  GraphicsQuality,
  HudControlId,
  HudControlTransform,
  KeyAction,
  TargetFps,
} from './types';

const STORAGE_KEY = 'polyfield_frontline_settings_v5';

export const DEFAULT_BINDINGS: Record<KeyAction, string> = {
  moveForward: 'KeyW',
  moveBackward: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  walk: 'AltLeft',
  sprint: 'ShiftLeft',
  crouch: 'KeyC',
  prone: 'KeyZ',
  jump: 'Space',
  leanLeft: 'KeyQ',
  leanRight: 'KeyE',
  fire: 'KeyF',
  aim: 'KeyV',
  reload: 'KeyR',
  grenade: 'KeyG',
  slot1: 'Digit1',
  slot2: 'Digit2',
  slot3: 'Digit3',
  slot4: 'Digit4',
  slot5: 'Digit5',
  interact: 'KeyX',
  armory: 'KeyB',
  toggleAccessory: 'KeyT',
  backpack: 'KeyI',
  dropBomb: 'KeyC',
  fireMissile: 'KeyQ',
  flare: 'KeyE',
  toggleCamera: 'KeyN',
};

export const DEFAULT_HUD_LAYOUT: Record<HudControlId, HudControlTransform> = {
  joystick: { xPct: 12, yPct: 65, scale: 1.0 },
  walk: { xPct: 23, yPct: 74, scale: 0.92 },
  sprint: { xPct: 23, yPct: 58, scale: 0.95 },
  peekLeft: { xPct: 30, yPct: 54, scale: 0.92 },
  peekRight: { xPct: 36, yPct: 54, scale: 0.92 },
  crouch: { xPct: 30, yPct: 70, scale: 0.95 },
  prone: { xPct: 36, yPct: 70, scale: 0.95 },
  slots: { xPct: 76, yPct: 55, scale: 0.95 },
  jump: { xPct: 71, yPct: 71, scale: 0.95 },
  reload: { xPct: 77, yPct: 71, scale: 0.95 },
  grenade: { xPct: 83, yPct: 71, scale: 0.95 },
  aim: { xPct: 92, yPct: 48, scale: 1.0 },
  fire: { xPct: 91, yPct: 66, scale: 1.15 },
};

export function cloneDefaultHudLayout(): Record<HudControlId, HudControlTransform> {
  const out = {} as Record<HudControlId, HudControlTransform>;
  (Object.keys(DEFAULT_HUD_LAYOUT) as HudControlId[]).forEach((k) => {
    out[k] = { ...DEFAULT_HUD_LAYOUT[k] };
  });
  return out;
}

export const DEFAULT_SETTINGS: ControlSettings = {
  bindings: { ...DEFAULT_BINDINGS },
  mouseSensitivity: 1.0,
  adsSensitivity: 0.62,
  fov: 72,
  showOnScreenControls: true,
  showAimArrow: false,
  aimAssistEnabled: true,
  graphicsQuality: 'auto',
  targetFps: 'auto',
  hudOpacity: 0.86,
  hudLayout: cloneDefaultHudLayout(),
};

function parseQuality(val: unknown): GraphicsQuality {
  if (val === 'auto' || val === 'low' || val === 'medium' || val === 'high') return val;
  return 'auto';
}

function parseTargetFps(val: unknown): TargetFps {
  if (val === 'auto' || val === 30 || val === 60 || val === 120 || val === 0) return val;
  return 'auto';
}

export function loadControlSettings(): ControlSettings {
  if (typeof window === 'undefined') {
    return {
      ...DEFAULT_SETTINGS,
      bindings: { ...DEFAULT_BINDINGS },
      hudLayout: cloneDefaultHudLayout(),
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_SETTINGS,
        bindings: { ...DEFAULT_BINDINGS },
        hudLayout: cloneDefaultHudLayout(),
      };
    }
    const parsed = JSON.parse(raw) as Partial<ControlSettings>;
    const mergedLayout = cloneDefaultHudLayout();
    if (parsed.hudLayout) {
      (Object.keys(mergedLayout) as HudControlId[]).forEach((k) => {
        const entry = parsed.hudLayout?.[k];
        if (
          entry &&
          typeof entry.xPct === 'number' &&
          typeof entry.yPct === 'number' &&
          typeof entry.scale === 'number'
        ) {
          mergedLayout[k] = {
            xPct: Math.max(4, Math.min(96, entry.xPct)),
            yPct: Math.max(8, Math.min(92, entry.yPct)),
            scale: Math.max(0.6, Math.min(1.65, entry.scale)),
          };
        }
      });
    }
    return {
      bindings: {
        ...DEFAULT_BINDINGS,
        ...(parsed.bindings ?? {}),
      },
      mouseSensitivity:
        typeof parsed.mouseSensitivity === 'number' ? parsed.mouseSensitivity : 1.0,
      adsSensitivity:
        typeof parsed.adsSensitivity === 'number' ? parsed.adsSensitivity : 0.62,
      fov: typeof parsed.fov === 'number' ? parsed.fov : 72,
      showOnScreenControls:
        typeof parsed.showOnScreenControls === 'boolean'
          ? parsed.showOnScreenControls
          : true,
      showAimArrow:
        typeof parsed.showAimArrow === 'boolean' ? parsed.showAimArrow : false,
      aimAssistEnabled:
        typeof parsed.aimAssistEnabled === 'boolean' ? parsed.aimAssistEnabled : true,
      graphicsQuality: parseQuality(parsed.graphicsQuality),
      targetFps: parseTargetFps(parsed.targetFps),
      hudOpacity:
        typeof parsed.hudOpacity === 'number'
          ? Math.max(0.35, Math.min(1, parsed.hudOpacity))
          : 0.86,
      hudLayout: mergedLayout,
    };
  } catch {
    return {
      ...DEFAULT_SETTINGS,
      bindings: { ...DEFAULT_BINDINGS },
      hudLayout: cloneDefaultHudLayout(),
    };
  }
}

export function saveControlSettings(settings: ControlSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function formatKeyCode(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'Space') return 'SPACE';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'SHIFT';
  if (code === 'AltLeft' || code === 'AltRight') return 'ALT';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'CTRL';
  if (code === 'Mouse0') return 'LMB';
  if (code === 'Mouse2') return 'RMB';
  return code;
}
