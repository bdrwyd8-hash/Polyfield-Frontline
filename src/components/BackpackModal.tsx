import { useEffect, useState } from 'react';
import { Briefcase, Crosshair, HeartPulse, Shield, X } from 'lucide-react';
import {
  MAGAZINE_OPTIONS,
  MUZZLE_OPTIONS,
  OPTIC_OPTIONS,
  RAIL_OPTIONS,
  sanitizeWeaponAttachmentLoadout,
} from '../game/attachments';
import { STRINGS } from '../game/i18n';
import { WEAPONS } from '../game/rules';
import type { HudSnapshot, KeyAction, Lang, WeaponCustomizationsMap, WeaponId } from '../game/types';
import { WeaponIllustration } from './WeaponIllustration';

interface BackpackModalProps {
  lang: Lang;
  hud: HudSnapshot;
  customizations: WeaponCustomizationsMap;
  onUseMedkit: () => boolean;
  onSelectSlot: (slot: 1 | 2 | 3 | 4 | 5) => void;
  onClose: () => void;
}

export function BackpackModal({
  lang,
  hud,
  customizations,
  onUseMedkit,
  onSelectSlot,
  onClose,
}: BackpackModalProps) {
  const t = STRINGS[lang];
  const isRtl = lang === 'ar';
  const [medkitNote, setMedkitNote] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  const handleHeal = () => {
    if (hud.health >= hud.maxHealth) {
      setMedkitNote(t.medkitFullMsg);
      return;
    }
    if (hud.backpackMedkits <= 0) {
      setMedkitNote(t.medkitEmptyMsg);
      return;
    }
    const ok = onUseMedkit();
    if (ok) {
      setMedkitNote(lang === 'ar' ? '+45 صحة تم العلاج' : '+45 HP Applied');
    } else {
      setMedkitNote(t.medkitFullMsg);
    }
  };

  const renderWeaponCard = (slot: 1 | 2 | 3, weaponId: WeaponId) => {
    const spec = WEAPONS[weaponId];
    const isEquipped = hud.activeSlot === slot;
    const loadout = sanitizeWeaponAttachmentLoadout(weaponId, customizations[weaponId]);
    const opticObj = OPTIC_OPTIONS.find((o) => o.id === loadout.optic);
    const muzzleObj = MUZZLE_OPTIONS.find((m) => m.id === loadout.muzzle);
    const railObj = RAIL_OPTIONS.find((r) => r.id === loadout.rail);
    const magObj = MAGAZINE_OPTIONS.find((m) => m.id === loadout.magazine);
    const slotTitle =
      slot === 1 ? t.slot1Label : slot === 2 ? t.slot2Label : t.actions.slot3;

    const handlePickSlot = () => {
      onSelectSlot(slot);
      onClose();
    };

    return (
      <button
        key={`${slot}-${weaponId}`}
        type="button"
        data-testid={`backpack-slot-${slot}`}
        onClick={handlePickSlot}
        className={`w-full text-start p-2.5 border transition-colors cursor-pointer ${
          isEquipped
            ? 'bg-amber-500/15 border-amber-400'
            : 'bg-stone-950/90 border-stone-800 hover:border-stone-600'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span
              dir="ltr"
              className={`w-6 h-6 text-xs font-mono-nums font-bold flex items-center justify-center border shrink-0 ${
                isEquipped
                  ? 'bg-amber-500 text-stone-950 border-amber-300'
                  : 'bg-stone-800 text-stone-300 border-stone-600'
              }`}
            >
              {slot}
            </span>
            <div className="min-w-0">
              <div className="text-[10px] text-stone-400 truncate">{slotTitle}</div>
              <div className="text-sm font-bold text-stone-100 truncate">
                {lang === 'ar' ? spec.nameAr : spec.nameEn}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEquipped && (
              <span
                dir="ltr"
                className="font-mono-nums text-xs font-bold text-amber-300 bg-stone-900 border border-amber-500/50 px-2 py-0.5"
              >
                {hud.magAmmo}/{hud.reserveAmmo}
              </span>
            )}
            <WeaponIllustration weaponId={weaponId} className="w-20 h-8 hidden sm:block" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-stone-300">
          {opticObj && (
            <span className="px-1.5 py-0.5 bg-stone-900 border border-stone-700">
              {lang === 'ar' ? opticObj.nameAr : opticObj.nameEn}
            </span>
          )}
          {muzzleObj && muzzleObj.id !== 'none' && (
            <span className="px-1.5 py-0.5 bg-emerald-950/70 border border-emerald-700 text-emerald-300">
              {lang === 'ar' ? muzzleObj.nameAr : muzzleObj.nameEn}
            </span>
          )}
          {railObj && railObj.id !== 'none' && (
            <span className="px-1.5 py-0.5 bg-sky-950/70 border border-sky-700 text-sky-300">
              {lang === 'ar' ? railObj.nameAr : railObj.nameEn}
            </span>
          )}
          {magObj && magObj.id !== 'standard_mag' && (
            <span className="px-1.5 py-0.5 bg-amber-950/70 border border-amber-700 text-amber-300">
              {lang === 'ar' ? magObj.nameAr : magObj.nameEn}
            </span>
          )}
        </div>
      </button>
    );
  };

  const hpPct = Math.max(0, Math.min(100, (hud.health / hud.maxHealth) * 100));
  const canHeal = hud.backpackMedkits > 0 && hud.health < hud.maxHealth && hud.health > 0;

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-40 flex items-center justify-center p-3 md:p-5 bg-stone-950/85"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.backpackTitle}
        data-testid="backpack-modal"
        className="w-full max-w-xl max-h-[90vh] flex flex-col bg-stone-900 border border-stone-700 shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-xl font-bold tracking-wide text-stone-100">
              {t.backpackTitle}
            </h2>
          </div>
          <button
            type="button"
            data-testid="btn-close-backpack"
            onClick={onClose}
            aria-label={t.close}
            className="w-8 h-8 flex items-center justify-center bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Field Medkit Card */}
          <div className="bg-stone-950/90 border border-emerald-700/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-300">
                  <HeartPulse className="w-4 h-4" />
                  <span>{t.medkitLabel}</span>
                </span>
                <span
                  dir="ltr"
                  data-testid="backpack-medkit-count"
                  className="font-mono-nums text-xs font-bold px-2 py-0.5 bg-emerald-950 border border-emerald-600 text-emerald-200"
                >
                  {hud.backpackMedkits}/{hud.backpackMedkitsMax}
                </span>
              </div>
              <div className="w-full h-2 bg-stone-800 overflow-hidden">
                <div
                  className={`h-full transition-[width] duration-150 ${
                    hud.health <= 30 ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${hpPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-400">
                <span dir="ltr" className="font-mono-nums">
                  {t.hp}: {hud.health}/{hud.maxHealth}
                </span>
                {medkitNote && <span className="text-amber-300 font-semibold">{medkitNote}</span>}
              </div>
            </div>

            <button
              type="button"
              data-testid="btn-use-medkit"
              onClick={handleHeal}
              disabled={!canHeal}
              className={`h-10 px-4 text-xs font-bold border transition-colors shrink-0 ${
                canHeal
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 border-emerald-300 cursor-pointer'
                  : 'bg-stone-800 text-stone-500 border-stone-700 cursor-not-allowed'
              }`}
            >
              {hud.health >= hud.maxHealth
                ? t.medkitFullMsg
                : hud.backpackMedkits <= 0
                  ? t.medkitEmptyMsg
                  : t.medkitUseBtn}
            </button>
          </div>

          {/* Primary & Secondary Weapons */}
          <div className="space-y-2">
            {renderWeaponCard(1, hud.slot1Id)}
            {renderWeaponCard(2, hud.slot2Id)}
            {renderWeaponCard(3, hud.secondaryId)}
          </div>

          {/* Tactical Gadgets & Supplies */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                onSelectSlot(4);
                onClose();
              }}
              className={`p-2.5 border text-start cursor-pointer ${
                hud.activeSlot === 4
                  ? 'bg-amber-500/15 border-amber-400'
                  : 'bg-stone-950/90 border-stone-800 hover:border-stone-600'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-stone-100">
                <span>{t.actions.slot4}</span>
                <Crosshair className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div dir="ltr" className="text-[11px] font-mono-nums text-stone-400 mt-1">
                6×30 Recon
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectSlot(5);
                onClose();
              }}
              className={`p-2.5 border text-start cursor-pointer ${
                hud.activeSlot === 5
                  ? 'bg-amber-500/15 border-amber-400'
                  : 'bg-stone-950/90 border-stone-800 hover:border-stone-600'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-stone-100">
                <span>{t.actions.slot5}</span>
                <Shield className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div dir="ltr" className="text-[11px] font-mono-nums text-amber-300 mt-1">
                {hud.foxholesUsed}/{hud.foxholesMax}
              </div>
            </button>

            <div className="p-2.5 border bg-stone-950/90 border-stone-800">
              <div className="text-xs font-bold text-stone-100">{t.grenade}</div>
              <div dir="ltr" className="text-[11px] font-mono-nums text-amber-400 mt-1">
                {hud.grenades} × Mk II
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-2.5 border-t border-stone-800 bg-stone-950/75 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-display font-bold tracking-wider border border-amber-300 cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
export type { KeyAction };
