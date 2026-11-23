import { useEffect, useState } from 'react';
import { Move, RotateCcw, Sliders, X } from 'lucide-react';
import { STRINGS } from '../game/i18n';
import { DEFAULT_SETTINGS, cloneDefaultHudLayout, formatKeyCode } from '../game/settings';
import type { ControlSettings, GraphicsQuality, KeyAction, Lang, TargetFps } from '../game/types';

interface SettingsModalProps {
  lang: Lang;
  settings: ControlSettings;
  onChange: (next: ControlSettings) => void;
  onOpenHudEditor: () => void;
  onClose: () => void;
}

const MOVEMENT_ACTIONS: KeyAction[] = [
  'moveForward',
  'moveBackward',
  'moveLeft',
  'moveRight',
  'walk',
  'sprint',
  'crouch',
  'prone',
  'jump',
  'leanLeft',
  'leanRight',
];

const COMBAT_ACTIONS: KeyAction[] = [
  'fire',
  'aim',
  'reload',
  'grenade',
  'backpack',
  'interact',
  'armory',
  'toggleAccessory',
  'dropBomb',
  'fireMissile',
  'slot1',
  'slot2',
  'slot3',
  'slot4',
  'slot5',
];

export function SettingsModal({
  lang,
  settings,
  onChange,
  onOpenHudEditor,
  onClose,
}: SettingsModalProps) {
  const t = STRINGS[lang];
  const isRtl = lang === 'ar';
  const [listeningAction, setListeningAction] = useState<KeyAction | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!listeningAction) {
        if (e.code === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setListeningAction(null);
        return;
      }

      const prevCode = settings.bindings[listeningAction];
      const nextBindings = { ...settings.bindings };

      (Object.keys(nextBindings) as KeyAction[]).forEach((act) => {
        if (act !== listeningAction && nextBindings[act] === e.code) {
          nextBindings[act] = prevCode;
        }
      });
      nextBindings[listeningAction] = e.code;

      onChange({
        ...settings,
        bindings: nextBindings,
      });
      setListeningAction(null);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [listeningAction, settings, onChange, onClose]);

  const handleReset = () => {
    setListeningAction(null);
    onChange({
      ...DEFAULT_SETTINGS,
      bindings: { ...DEFAULT_SETTINGS.bindings },
      hudLayout: cloneDefaultHudLayout(),
    });
  };

  const renderBindingRow = (action: KeyAction) => {
    const isListening = listeningAction === action;
    return (
      <div
        key={action}
        className="flex items-center justify-between gap-3 bg-stone-950/90 border border-stone-800 px-3 py-1.5"
      >
        <span className="text-xs font-medium text-stone-200 truncate">
          {t.actions[action]}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            setListeningAction(isListening ? null : action);
          }}
          dir="ltr"
          className={`min-w-[82px] h-7 px-2.5 text-xs font-mono-nums font-bold border transition-colors cursor-pointer ${
            isListening
              ? 'bg-amber-500 text-stone-950 border-amber-300 animate-pulse'
              : 'bg-stone-800 text-stone-100 border-stone-600 hover:bg-stone-700'
          }`}
        >
          {isListening ? t.pressAnyKey : formatKeyCode(settings.bindings[action])}
        </button>
      </div>
    );
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-40 flex items-center justify-center p-3 md:p-4 bg-stone-950/88"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.settingsTitle}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-stone-900 border border-stone-700 shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-xl md:text-2xl font-bold tracking-wide text-stone-100">
              {t.settingsTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="w-8 h-8 flex items-center justify-center bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <button
            type="button"
            data-testid="btn-customize-hud"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenHudEditor();
            }}
            className="w-full h-11 px-4 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/70 text-amber-300 font-bold text-xs sm:text-sm flex items-center justify-between gap-2 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Move className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{t.customizeHudBtn}</span>
            </span>
            <span dir="ltr" className="text-[11px] font-mono-nums text-amber-400/90">
              XY · %
            </span>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-stone-950/85 border border-stone-800 p-2.5">
              <div className="flex items-center justify-between text-xs text-stone-300 mb-1.5">
                <span>{t.mouseSensLabel}</span>
                <span dir="ltr" className="font-mono-nums font-bold text-amber-400">
                  {settings.mouseSensitivity.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.3}
                max={2.5}
                step={0.05}
                value={settings.mouseSensitivity}
                onChange={(e) =>
                  onChange({ ...settings, mouseSensitivity: Number(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="bg-stone-950/85 border border-stone-800 p-2.5">
              <div className="flex items-center justify-between text-xs text-stone-300 mb-1.5">
                <span>{t.adsSensLabel}</span>
                <span dir="ltr" className="font-mono-nums font-bold text-amber-400">
                  {settings.adsSensitivity.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.2}
                max={1.5}
                step={0.05}
                value={settings.adsSensitivity}
                onChange={(e) =>
                  onChange({ ...settings, adsSensitivity: Number(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="bg-stone-950/85 border border-stone-800 p-2.5">
              <div className="flex items-center justify-between text-xs text-stone-300 mb-1.5">
                <span>{t.fovLabel}</span>
                <span dir="ltr" className="font-mono-nums font-bold text-amber-400">
                  {settings.fov}°
                </span>
              </div>
              <input
                type="range"
                min={55}
                max={90}
                step={1}
                value={settings.fov}
                onChange={(e) =>
                  onChange({ ...settings, fov: Number(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <label className="flex items-center justify-between bg-stone-950/85 border border-stone-800 px-3.5 py-2.5 cursor-pointer">
              <span className="text-xs sm:text-sm font-semibold text-stone-200">
                {t.onScreenControlsLabel}
              </span>
              <input
                type="checkbox"
                checked={settings.showOnScreenControls}
                onChange={(e) =>
                  onChange({ ...settings, showOnScreenControls: e.target.checked })
                }
                className="w-5 h-5 accent-amber-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between bg-stone-950/85 border border-stone-800 px-3.5 py-2.5 cursor-pointer">
              <span className="text-xs sm:text-sm font-semibold text-stone-200">
                {t.showAimArrowLabel}
              </span>
              <input
                type="checkbox"
                data-testid="toggle-aim-arrow"
                checked={settings.showAimArrow}
                onChange={(e) =>
                  onChange({ ...settings, showAimArrow: e.target.checked })
                }
                className="w-5 h-5 accent-amber-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between bg-stone-950/85 border border-stone-800 px-3.5 py-2.5 cursor-pointer">
              <span className="text-xs sm:text-sm font-semibold text-stone-200">
                {t.aimAssistLabel}
              </span>
              <input
                type="checkbox"
                data-testid="toggle-aim-assist"
                checked={settings.aimAssistEnabled}
                onChange={(e) =>
                  onChange({ ...settings, aimAssistEnabled: e.target.checked })
                }
                className="w-5 h-5 accent-amber-500 cursor-pointer"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="bg-stone-950/85 border border-stone-800 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-semibold text-stone-200">
                {t.graphicsQualityLabel}
              </span>
              <div className="grid grid-cols-3 gap-1.5 sm:w-56">
                {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => {
                  const label =
                    q === 'low'
                      ? t.graphicsLow
                      : q === 'medium'
                        ? t.graphicsMedium
                        : t.graphicsHigh;
                  const active = settings.graphicsQuality === q;
                  return (
                    <button
                      key={q}
                      type="button"
                      data-testid={`gfx-${q}`}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onChange({ ...settings, graphicsQuality: q });
                      }}
                      className={`h-8 px-2 text-xs font-bold border transition-colors cursor-pointer ${
                        active
                          ? 'bg-amber-500 text-stone-950 border-amber-300'
                          : 'bg-stone-800 text-stone-200 border-stone-600 hover:bg-stone-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-stone-950/85 border border-stone-800 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-semibold text-stone-200">
                {t.targetFpsLabel}
              </span>
              <div dir="ltr" className="grid grid-cols-3 gap-1.5 sm:w-56">
                {([60, 120, 0] as TargetFps[]).map((fps) => {
                  const label = fps === 60 ? t.fps60 : fps === 120 ? t.fps120 : t.fpsMax;
                  const active = settings.targetFps === fps;
                  return (
                    <button
                      key={fps}
                      type="button"
                      data-testid={`fps-${fps}`}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onChange({ ...settings, targetFps: fps });
                      }}
                      className={`h-8 px-1.5 text-[11px] font-bold border transition-colors cursor-pointer ${
                        active
                          ? 'bg-amber-500 text-stone-950 border-amber-300'
                          : 'bg-stone-800 text-stone-200 border-stone-600 hover:bg-stone-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold tracking-wider text-stone-400 mb-2">
              {t.keybindsSection}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                {MOVEMENT_ACTIONS.map(renderBindingRow)}
              </div>
              <div className="space-y-1">
                {COMBAT_ACTIONS.map(renderBindingRow)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-stone-800 bg-stone-950/70">
          <button
            type="button"
            onClick={handleReset}
            className="h-9 px-3.5 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-xs font-semibold flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.resetDefaults}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-display text-base font-bold tracking-wider border border-amber-300 cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
