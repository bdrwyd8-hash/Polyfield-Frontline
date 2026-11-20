import { Sliders } from 'lucide-react';
import { STRINGS } from '../game/i18n';
import type { HudSnapshot, Lang } from '../game/types';

interface StatusModalProps {
  hud: HudSnapshot;
  lang: Lang;
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
  onOpenSettings: () => void;
}

export function StatusModal({
  hud,
  lang,
  onResume,
  onRestart,
  onTitle,
  onOpenSettings,
}: StatusModalProps) {
  const t = STRINGS[lang];
  const isRtl = lang === 'ar';
  const isPaused = hud.phase === 'paused';
  const accuracy =
    hud.shotsFired > 0 ? Math.round((hud.shotsHit / hud.shotsFired) * 100) : 0;

  const headline = isPaused
    ? t.paused
    : hud.winner === 'allies'
      ? t.victory
      : hud.winner === 'axis'
        ? t.defeat
        : t.draw;

  const accentClass = isPaused
    ? 'text-amber-400'
    : hud.winner === 'allies'
      ? 'text-blue-400'
      : hud.winner === 'axis'
        ? 'text-red-400'
        : 'text-stone-200';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-stone-950/78"
    >
      <div className="w-full max-w-md bg-stone-900 border border-stone-700 p-6 shadow-2xl">
        <h2 className={`font-display text-3xl font-extrabold tracking-wide mb-1 ${accentClass}`}>
          {headline}
        </h2>
        <p className="text-xs text-stone-400 mb-5">
          {t.allies} {hud.alliesTickets} · {t.axis} {hud.axisTickets}
        </p>

        {/* Tabular-Nums Match Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-stone-950/90 border border-stone-800 p-3">
            <div className="text-[11px] text-stone-400 mb-0.5">{t.eliminations}</div>
            <div className="font-mono-nums text-2xl font-bold text-stone-100">{hud.kills}</div>
          </div>
          <div className="bg-stone-950/90 border border-stone-800 p-3">
            <div className="text-[11px] text-stone-400 mb-0.5">{t.captures}</div>
            <div className="font-mono-nums text-2xl font-bold text-stone-100">{hud.captures}</div>
          </div>
          <div className="bg-stone-950/90 border border-stone-800 p-3">
            <div className="text-[11px] text-stone-400 mb-0.5">{t.score}</div>
            <div className="font-mono-nums text-2xl font-bold text-amber-400">{hud.score}</div>
          </div>
          <div className="bg-stone-950/90 border border-stone-800 p-3">
            <div className="text-[11px] text-stone-400 mb-0.5">{t.accuracy}</div>
            <div className="font-mono-nums text-2xl font-bold text-stone-100">{accuracy}%</div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col gap-2">
          {isPaused ? (
            <button
              type="button"
              onClick={onResume}
              className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-stone-950 font-display text-lg font-bold tracking-wide cursor-pointer"
            >
              {t.resume}
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-stone-950 font-display text-lg font-bold tracking-wide cursor-pointer"
            >
              {t.playAgain}
            </button>
          )}
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full h-10 bg-stone-800 hover:bg-stone-700 text-amber-300 text-sm font-semibold border border-stone-600 cursor-pointer flex items-center justify-center gap-2"
          >
            <Sliders className="w-4 h-4" />
            <span>{t.settings}</span>
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full h-10 bg-stone-800 hover:bg-stone-700 text-stone-100 text-sm font-semibold border border-stone-600 cursor-pointer"
          >
            {t.restart}
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="w-full h-10 bg-stone-950 hover:bg-stone-800 text-stone-300 text-sm font-semibold border border-stone-700 cursor-pointer"
          >
            {t.mainMenu}
          </button>
        </div>
      </div>
    </div>
  );
}
