import { useState } from 'react';
import { Check, Copy, Globe, Sliders, Users, Volume2, VolumeX, Wrench } from 'lucide-react';
import desertImg from '../assets/images/map_desert_alamein_1795126496434.jpg';
import forestImg from '../assets/images/map_forest_ardennes_1795126493538.jpg';
import normandyImg from '../assets/images/map_normandy_valley_1795126495807.jpg';
import stalingradImg from '../assets/images/map_stalingrad_ruins_1795126496029.jpg';
import { STRINGS } from '../game/i18n';
import { PRIMARY_WEAPON_IDS, SLOT2_WEAPON_IDS, WEAPONS } from '../game/rules';
import type { GameMode, Lang, MapId, Team, WeaponId } from '../game/types';
import { WeaponIllustration } from './WeaponIllustration';

const MAP_ARTWORK: Record<MapId, { img: string; fallbackBg: string }> = {
  forest: { img: forestImg, fallbackBg: 'linear-gradient(135deg, #1f3322 0%, #3d4f38 100%)' },
  desert: { img: desertImg, fallbackBg: 'linear-gradient(135deg, #7c562c 0%, #c69a58 100%)' },
  normandy: { img: normandyImg, fallbackBg: 'linear-gradient(135deg, #2d3e34 0%, #64705e 100%)' },
  stalingrad: { img: stalingradImg, fallbackBg: 'linear-gradient(135deg, #2b2d31 0%, #5e6268 100%)' },
};

interface TitleOverlayProps {
  lang: Lang;
  mapId: MapId;
  gameMode: GameMode;
  slot1Id: WeaponId;
  slot2Id: WeaponId;
  muted: boolean;
  isOnline: boolean;
  roomCode: string;
  callsign: string;
  preferredTeam: Team | null;
  onToggleLang: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onOpenGunsmith: () => void;
  onSelectMap: (map: MapId) => void;
  onSelectGameMode: (mode: GameMode) => void;
  onSelectSlot1: (weaponId: WeaponId) => void;
  onSelectSlot2: (weaponId: WeaponId) => void;
  onChangeOnline: (enabled: boolean) => void;
  onChangeRoomCode: (code: string) => void;
  onChangeCallsign: (name: string) => void;
  onChangePreferredTeam: (team: Team | null) => void;
  onStart: () => void;
}

export function TitleOverlay({
  lang,
  mapId,
  gameMode,
  slot1Id,
  slot2Id,
  muted,
  isOnline,
  roomCode,
  callsign,
  preferredTeam,
  onToggleLang,
  onToggleMute,
  onOpenSettings,
  onOpenGunsmith,
  onSelectMap,
  onSelectGameMode,
  onSelectSlot1,
  onSelectSlot2,
  onChangeOnline,
  onChangeRoomCode,
  onChangeCallsign,
  onChangePreferredTeam,
  onStart,
}: TitleOverlayProps) {
  const t = STRINGS[lang];
  const isRtl = lang === 'ar';
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyInvite = async () => {
    const cleanRoom = roomCode.toUpperCase().replace(/[^A-Z0-9_-]/g, '') || 'FRONTLINE';
    const url = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(cleanRoom)}&map=${mapId}&mode=${gameMode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    }
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-4 md:p-5 pointer-events-none"
      style={{
        background: isRtl
          ? 'linear-gradient(255deg, rgba(13,15,14,0.94) 0%, rgba(13,15,14,0.78) 58%, rgba(13,15,14,0.18) 100%)'
          : 'linear-gradient(105deg, rgba(13,15,14,0.94) 0%, rgba(13,15,14,0.78) 58%, rgba(13,15,14,0.18) 100%)',
      }}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 pointer-events-auto min-w-0">
          <div dir="ltr" className="flex items-center gap-1.5 shrink-0">
            <svg viewBox="0 0 36 36" className="w-7 h-7" aria-hidden="true">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#eab308" strokeWidth="1.8" strokeDasharray="5 3" />
              <polygon
                points="18,6 21,14 29,14 23,19 25,27 18,22 11,27 13,19 7,14 15,14"
                fill="#eab308"
              />
            </svg>
            <span className="font-display font-extrabold text-lg sm:text-xl tracking-wider text-stone-100">
              POLYFIELD
            </span>
          </div>
          <span className="hidden sm:inline text-[11px] text-stone-400 truncate">· {t.subtitle}</span>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
          <button
            type="button"
            data-testid="btn-open-gunsmith"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenGunsmith();
            }}
            className="h-8 px-2.5 bg-amber-500/20 border border-amber-400/80 text-amber-200 text-xs font-bold hover:bg-amber-500/35 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            <span className="truncate max-w-[155px] sm:max-w-none">{t.gunsmithBtn}</span>
          </button>
          <button
            type="button"
            data-testid="btn-open-settings"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenSettings();
            }}
            className="h-8 px-2.5 bg-stone-900/95 border border-stone-600/70 text-stone-100 text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.settings}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleLang();
            }}
            aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
            className="h-8 px-2.5 bg-stone-900/95 border border-stone-600/70 text-stone-100 text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer"
          >
            {lang === 'ar' ? 'EN' : 'عربي'}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={t.mute}
            className="h-8 w-8 flex items-center justify-center bg-stone-900/95 border border-stone-600/70 text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Visual Lobby Panel */}
      <div className="w-full max-w-4xl my-auto pointer-events-auto overflow-y-auto max-h-[calc(100vh-70px)] pr-1 space-y-2.5">
        {/* Row 1: Solo vs Online Multiplayer Switch + Mode */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
          <div className="md:col-span-6 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              data-testid="playmode-offline"
              onClick={(e) => {
                e.currentTarget.blur();
                onChangeOnline(false);
              }}
              className={`h-9 px-2.5 border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                !isOnline
                  ? 'bg-amber-500 text-stone-950 border-amber-300'
                  : 'bg-stone-900/90 text-stone-200 border-stone-700 hover:bg-stone-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.playModeOffline}</span>
            </button>
            <button
              type="button"
              data-testid="playmode-online"
              onClick={(e) => {
                e.currentTarget.blur();
                onChangeOnline(true);
              }}
              className={`h-9 px-2.5 border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                isOnline
                  ? 'bg-emerald-500 text-stone-950 border-emerald-300'
                  : 'bg-stone-900/90 text-stone-200 border-stone-700 hover:bg-stone-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.playModeOnline}</span>
            </button>
          </div>

          <div className="md:col-span-6 grid grid-cols-3 gap-1">
            {(['conquest', 'tdm', 'hardcore'] as GameMode[]).map((gm) => (
              <button
                key={gm}
                type="button"
                data-testid={`mode-${gm}`}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onSelectGameMode(gm);
                }}
                className={`h-9 px-1.5 text-[11px] font-semibold border transition-colors cursor-pointer truncate ${
                  gameMode === gm
                    ? 'bg-stone-100 text-stone-950 border-white'
                    : 'bg-stone-900/90 text-stone-200 border-stone-700 hover:bg-stone-800'
                }`}
              >
                {t[gm]}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Online Room Bar */}
        {isOnline && (
          <div
            data-testid="online-room-panel"
            className="grid grid-cols-2 sm:grid-cols-12 gap-1.5 p-2 bg-stone-950/90 border border-emerald-500/50"
          >
            <div className="sm:col-span-3">
              <label className="block text-[10px] text-stone-400 mb-0.5">{t.callsignLabel}</label>
              <input
                type="text"
                data-testid="input-callsign"
                value={callsign}
                maxLength={16}
                onChange={(e) => onChangeCallsign(e.target.value)}
                className="w-full h-8 px-2 bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[10px] text-stone-400 mb-0.5">{t.roomCodeLabel}</label>
              <input
                type="text"
                dir="ltr"
                data-testid="input-room-code"
                value={roomCode}
                maxLength={14}
                onChange={(e) => onChangeRoomCode(e.target.value.toUpperCase())}
                className="w-full h-8 px-2 bg-stone-900 border border-stone-700 text-emerald-300 font-mono-nums text-xs font-bold focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[10px] text-stone-400 mb-0.5">{t.teamSelectLabel}</label>
              <div className="grid grid-cols-3 gap-1 h-8">
                {([null, 'allies', 'axis'] as const).map((tm) => (
                  <button
                    key={tm ?? 'auto'}
                    type="button"
                    onClick={() => onChangePreferredTeam(tm)}
                    className={`text-[10px] font-bold border cursor-pointer truncate px-1 ${
                      preferredTeam === tm
                        ? tm === 'axis'
                          ? 'bg-red-600 text-white border-red-400'
                          : tm === 'allies'
                            ? 'bg-blue-600 text-white border-blue-400'
                            : 'bg-emerald-500 text-stone-950 border-emerald-300'
                        : 'bg-stone-900 text-stone-300 border-stone-700 hover:bg-stone-800'
                    }`}
                  >
                    {tm === null ? t.teamAuto : tm === 'allies' ? t.allies : t.axis}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-3 flex items-end">
              <button
                type="button"
                data-testid="btn-copy-invite"
                onClick={handleCopyInvite}
                className="w-full h-8 px-2 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-100 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span className="truncate">{copiedLink ? t.copiedInviteBtn : t.copyInviteBtn}</span>
              </button>
            </div>
          </div>
        )}

        {/* Row 2: Visual Battlefield Theater Image Cards */}
        <div>
          <div className="text-[11px] font-semibold text-stone-300 mb-1">{t.mapLabel}</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['forest', 'desert', 'normandy', 'stalingrad'] as MapId[]).map((m) => {
              const art = MAP_ARTWORK[m];
              const active = mapId === m;
              return (
                <button
                  key={m}
                  type="button"
                  data-testid={`map-${m}`}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSelectMap(m);
                  }}
                  style={{ background: art.fallbackBg }}
                  className={`relative h-16 sm:h-20 overflow-hidden border transition-colors cursor-pointer group text-start ${
                    active
                      ? 'border-amber-400 ring-1 ring-amber-400/60'
                      : 'border-stone-700/90 opacity-85 hover:opacity-100 hover:border-stone-500'
                  }`}
                >
                  <img
                    src={art.img}
                    alt={t[m]}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(10,12,11,0.92) 0%, rgba(10,12,11,0.28) 58%, rgba(10,12,11,0.08) 100%)',
                    }}
                  />
                  <div className="relative h-full flex items-end justify-between px-2 py-1.5">
                    <span
                      className={`text-xs font-bold leading-tight truncate ${
                        active ? 'text-amber-300' : 'text-stone-100'
                      }`}
                    >
                      {t[m]}
                    </span>
                    {active && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Visual Weapon Cards (Slot 1 + Slot 2) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <div className="text-[11px] font-semibold text-stone-300 mb-1">{t.slot1Label}</div>
            <div className="grid grid-cols-1 gap-1 max-h-[168px] overflow-y-auto pr-0.5">
              {PRIMARY_WEAPON_IDS.map((wId) => {
                const spec = WEAPONS[wId];
                const active = slot1Id === wId;
                return (
                  <button
                    key={wId}
                    type="button"
                    data-testid={`weapon-s1-${wId}`}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onSelectSlot1(wId);
                    }}
                    className={`px-2 py-1 text-start border flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      active
                        ? 'bg-stone-100 text-stone-950 border-white'
                        : 'bg-stone-900/92 text-stone-200 border-stone-700 hover:bg-stone-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`shrink-0 overflow-hidden border ${
                          active ? 'bg-stone-200 border-stone-400' : 'bg-stone-950/75 border-stone-800'
                        }`}
                      >
                        <WeaponIllustration weaponId={wId} className="w-20 h-7" />
                      </div>
                      <span className="text-[11px] font-bold truncate">
                        {lang === 'ar' ? spec.nameAr : spec.nameEn}
                      </span>
                    </div>
                    <span dir="ltr" className="text-[10px] font-mono-nums opacity-75 shrink-0">
                      {spec.magSize}/{spec.reserveMax}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-1.5">
            <div>
              <div className="text-[11px] font-semibold text-amber-300 mb-1">{t.slot2Label}</div>
              <div className="grid grid-cols-1 gap-1 max-h-[124px] overflow-y-auto pr-0.5">
                {SLOT2_WEAPON_IDS.map((wId) => {
                  const spec = WEAPONS[wId];
                  const active = slot2Id === wId;
                  return (
                    <button
                      key={wId}
                      type="button"
                      data-testid={`weapon-s2-${wId}`}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSelectSlot2(wId);
                      }}
                      className={`px-2 py-1 text-start border flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        active
                          ? 'bg-amber-400 text-stone-950 border-amber-200'
                          : 'bg-stone-900/92 text-stone-200 border-stone-700 hover:bg-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`shrink-0 overflow-hidden border ${
                            active ? 'bg-amber-300 border-amber-600' : 'bg-stone-950/75 border-stone-800'
                          }`}
                        >
                          <WeaponIllustration weaponId={wId} className="w-20 h-7" />
                        </div>
                        <span className="text-[11px] font-bold truncate">
                          {lang === 'ar' ? spec.nameAr : spec.nameEn}
                        </span>
                      </div>
                      <span dir="ltr" className="text-[10px] font-mono-nums opacity-75 shrink-0">
                        {spec.magSize}/{spec.reserveMax}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-2 py-1 bg-stone-950/85 border border-stone-700/80 text-[10px] text-stone-300 flex items-center justify-between gap-2">
              <span className="truncate">{t.slot3Label} · {t.gadgetsBadge}</span>
              <span dir="ltr" className="font-mono-nums text-amber-300 shrink-0">7/56</span>
            </div>
          </div>
        </div>

        {/* Deploy Button */}
        <button
          type="button"
          data-start="true"
          onClick={(e) => {
            e.currentTarget.blur();
            onStart();
          }}
          className="w-full h-10 bg-amber-500 hover:bg-amber-400 text-stone-950 font-display text-lg font-bold tracking-wider uppercase border border-amber-300 transition-colors cursor-pointer shadow-lg"
        >
          {t.deploy}
        </button>
      </div>

      {/* Bottom Hint */}
      <div className="text-[11px] text-stone-300 tracking-wide truncate">
        {t.controlsHint}
      </div>
    </div>
  );
}
