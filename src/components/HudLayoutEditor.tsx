import { useRef, useState } from 'react';
import { Check, Move, RotateCcw } from 'lucide-react';
import { STRINGS } from '../game/i18n';
import { cloneDefaultHudLayout } from '../game/settings';
import type { ControlSettings, HudControlId, Lang } from '../game/types';
import { TacticalControlIcon } from './ControlIcon';

interface HudLayoutEditorProps {
  lang: Lang;
  settings: ControlSettings;
  onChange: (next: ControlSettings) => void;
  onClose: () => void;
}

const ALL_CONTROL_IDS: HudControlId[] = [
  'joystick',
  'walk',
  'sprint',
  'crouch',
  'prone',
  'peekLeft',
  'peekRight',
  'jump',
  'reload',
  'grenade',
  'aim',
  'fire',
  'slots',
];

export function HudLayoutEditor({
  lang,
  settings,
  onChange,
  onClose,
}: HudLayoutEditorProps) {
  const t = STRINGS[lang];
  const isRtl = lang === 'ar';
  const [selectedId, setSelectedId] = useState<HudControlId>('fire');
  const draggingId = useRef<HudControlId | null>(null);
  const dragPointerId = useRef<number | null>(null);
  const dragOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const selectedTransform = settings.hudLayout[selectedId];

  const handleReset = () => {
    onChange({
      ...settings,
      hudOpacity: 0.86,
      hudLayout: cloneDefaultHudLayout(),
    });
  };

  const updateSelectedScale = (scale: number) => {
    onChange({
      ...settings,
      hudLayout: {
        ...settings.hudLayout,
        [selectedId]: {
          ...settings.hudLayout[selectedId],
          scale,
        },
      },
    });
  };

  const startDrag = (id: HudControlId, e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(id);
    draggingId.current = id;
    dragPointerId.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    const curX = (settings.hudLayout[id].xPct / 100) * vw;
    const curY = (settings.hudLayout[id].yPct / 100) * vh;
    dragOffset.current = {
      dx: e.clientX - curX,
      dy: e.clientY - curY,
    };
  };

  const moveDrag = (id: HudControlId, e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingId.current !== id || dragPointerId.current !== e.pointerId) return;
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    const xPct = Math.max(4, Math.min(96, ((e.clientX - dragOffset.current.dx) / vw) * 100));
    const yPct = Math.max(12, Math.min(92, ((e.clientY - dragOffset.current.dy) / vh) * 100));
    onChange({
      ...settings,
      hudLayout: {
        ...settings.hudLayout,
        [id]: {
          ...settings.hudLayout[id],
          xPct: Number(xPct.toFixed(1)),
          yPct: Number(yPct.toFixed(1)),
        },
      },
    });
  };

  const endDrag = (id: HudControlId, e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingId.current === id && dragPointerId.current === e.pointerId) {
      draggingId.current = null;
      dragPointerId.current = null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 select-none touch-none">
      {/* Top Floating Layout Toolbar */}
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="fixed top-2 left-1/2 -translate-x-1/2 z-50 w-[min(96vw,780px)] bg-stone-900/95 border border-amber-500/60 px-3 py-2 shadow-2xl flex flex-wrap items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Move className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="truncate">
            <div className="text-xs font-bold text-amber-300 truncate">
              {t.controlNames[selectedId]}
            </div>
            <div className="text-[10px] text-stone-300 truncate">{t.hudEditorTitle}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[11px] text-stone-200">
            <span>{t.buttonSizeLabel}</span>
            <input
              type="range"
              aria-label={t.buttonSizeLabel}
              min={0.6}
              max={1.6}
              step={0.05}
              value={selectedTransform.scale}
              onChange={(e) => updateSelectedScale(Number(e.target.value))}
              className="w-24 accent-amber-500 cursor-pointer"
            />
            <span dir="ltr" className="font-mono-nums text-amber-400 font-bold w-9">
              {Math.round(selectedTransform.scale * 100)}%
            </span>
          </label>

          <label className="flex items-center gap-2 text-[11px] text-stone-200">
            <span>{t.buttonOpacityLabel}</span>
            <input
              type="range"
              aria-label={t.buttonOpacityLabel}
              min={0.35}
              max={1.0}
              step={0.05}
              value={settings.hudOpacity}
              onChange={(e) =>
                onChange({ ...settings, hudOpacity: Number(e.target.value) })
              }
              className="w-20 accent-amber-500 cursor-pointer"
            />
          </label>

          <button
            type="button"
            onClick={handleReset}
            className="h-8 px-2.5 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.resetLayoutBtn}</span>
          </button>

          <button
            type="button"
            data-testid="btn-save-hud-layout"
            onClick={onClose}
            className="h-8 px-3 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold border border-amber-300 flex items-center gap-1 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t.saveLayoutBtn}</span>
          </button>
        </div>
      </div>

      {/* Draggable Live Control Handles */}
      {ALL_CONTROL_IDS.map((id) => {
        const tf = settings.hudLayout[id];
        const isSelected = selectedId === id;
        const ringClass = isSelected
          ? 'ring-2 ring-amber-400 shadow-[0_0_0_4px_rgba(245,158,11,0.22)]'
          : 'ring-1 ring-stone-400/50';

        return (
          <div
            key={id}
            data-testid={`edit-ctrl-${id}`}
            onPointerDown={(e) => startDrag(id, e)}
            onPointerMove={(e) => moveDrag(id, e)}
            onPointerUp={(e) => endDrag(id, e)}
            onPointerCancel={(e) => endDrag(id, e)}
            style={{
              left: `${tf.xPct}%`,
              top: `${tf.yPct}%`,
              opacity: settings.hudOpacity,
              transform: `translate(-50%, -50%) scale(${tf.scale})`,
            }}
            className={`fixed cursor-grab active:cursor-grabbing touch-none ${ringClass} rounded-full`}
          >
            {id === 'joystick' ? (
              <div className="w-20 h-20 rounded-full bg-stone-950/80 border-2 border-stone-500 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-amber-500/90 border border-amber-300" />
              </div>
            ) : id === 'slots' ? (
              <div
                dir="ltr"
                className="flex items-center gap-1 bg-stone-950/85 border border-stone-500 px-1.5 py-1 rounded-full"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      n === 1 ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-200'
                    }`}
                  >
                    {n === 4 ? (
                      <TacticalControlIcon id="binoculars" className="w-4 h-4" />
                    ) : n === 5 ? (
                      <TacticalControlIcon id="shovel" className="w-4 h-4" />
                    ) : (
                      n
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <div
                className={`flex items-center justify-center rounded-full border ${
                  id === 'fire'
                    ? 'w-14 h-14 bg-red-600/90 border-red-300 text-white'
                    : 'w-11 h-11 bg-stone-950/85 border-stone-500 text-stone-100'
                }`}
              >
                <TacticalControlIcon id={id} className={id === 'fire' ? 'w-6 h-6' : 'w-5 h-5'} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
