import { useEffect, useRef } from 'react';
import { Briefcase, Move, Pause, Sliders, Volume2, VolumeX } from 'lucide-react';
import { STRINGS } from '../game/i18n';
import { ALLY_BASE_CENTER, ARENA_RADIUS, WEAPONS } from '../game/rules';
import type { HudSnapshot, KillcamInfo, Lang, WeaponId } from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  lang: Lang;
  onToggleMute: () => void;
  onPause: () => void;
  onOpenSettings: () => void;
  onOpenHudEditor: () => void;
  onOpenBackpack: () => void;
}

function WeaponSilhouetteSvg({ weaponId }: { weaponId: WeaponId }) {
  if (weaponId === 'rpg7') {
    return (
      <svg viewBox="0 0 112 30" className="w-24 h-7" aria-hidden="true">
        <path
          d="M4 12 L14 14 L84 14 L96 10 L108 15.5 L96 21 L84 17 L52 17 L50 25 L45 25 L47 17 L14 17 L4 19 Z"
          fill="#facc15"
          stroke="#1c1917"
          strokeWidth="1.8"
        />
      </svg>
    );
  }
  if (weaponId === 'bazooka' || weaponId === 'panzerschreck') {
    return (
      <svg viewBox="0 0 112 30" className="w-24 h-7" aria-hidden="true">
        <path
          d="M4 11 L14 14 L98 14 L104 12 L104 19 L98 17 L56 17 L53 26 L48 26 L50 17 L24 17 L22 25 L17 25 L19 17 L14 17 L4 20 Z"
          fill="#facc15"
          stroke="#1c1917"
          strokeWidth="1.8"
        />
      </svg>
    );
  }
  if (weaponId === 'thompson') {
    return (
      <svg viewBox="0 0 96 30" className="w-20 h-7" aria-hidden="true">
        <path
          d="M6 12 L24 12 L28 9 L66 9 L66 13 L88 13 L88 16 L66 16 L64 20 L58 20 L55 28 L49 28 L51 19 L34 19 L22 25 L6 23 Z"
          fill="#e7e5e4"
          stroke="#1c1917"
          strokeWidth="2"
        />
      </svg>
    );
  }
  if (weaponId === 'mp40') {
    return (
      <svg viewBox="0 0 96 32" className="w-20 h-7" aria-hidden="true">
        <path
          d="M8 14 L26 14 L30 10 L66 10 L66 12 L90 12 L90 15 L64 15 L62 19 L55 19 L53 29 L48 29 L49 18 L34 18 L24 26 L18 25 L23 17 L8 17 Z"
          fill="#e7e5e4"
          stroke="#1c1917"
          strokeWidth="2"
        />
      </svg>
    );
  }
  if (weaponId === 'ak47') {
    return (
      <svg viewBox="0 0 108 34" className="w-24 h-7" aria-hidden="true">
        <path
          d="M4 15 L26 12 L34 10 L74 10 L78 12 L102 12 L102 15 L76 15 L70 17 L64 17 Q65 24 70 30 L62 31 Q57 25 56 18 L38 18 L34 27 L27 27 L31 18 L18 22 L4 24 Z"
          fill="#e7e5e4"
          stroke="#1c1917"
          strokeWidth="2"
        />
      </svg>
    );
  }
  if (weaponId === 'm4a1') {
    return (
      <svg viewBox="0 0 110 34" className="w-24 h-7" aria-hidden="true">
        <path
          d="M4 14 L22 12 L24 14 L32 14 L32 12 L37 7 L49 7 L49 12 L80 12 L84 8 L87 13 L106 13 L106 15.5 L83 15.5 L78 17 L71 17 L71 25 L67 25 L67 17 L56 17 L59 30 L51 31 L49 18 L34 18 L31 27 L25 26 L28 18 L20 18 L18 22 L4 23 Z"
          fill="#e7e5e4"
          stroke="#1c1917"
          strokeWidth="1.9"
        />
      </svg>
    );
  }
  if (weaponId === 'stg44' || weaponId === 'bar') {
    return (
      <svg viewBox="0 0 104 32" className="w-24 h-7" aria-hidden="true">
        <path
          d="M4 13 L26 11 L35 9 L68 9 L72 11 L96 11 L96 14 L70 14 L64 17 L59 29 L52 28 L56 17 L34 17 L28 24 L22 24 L25 18 L4 21 Z"
          fill="#e7e5e4"
          stroke="#1c1917"
          strokeWidth="2"
        />
      </svg>
    );
  }
  if (weaponId === 'ppsh41') {
    return (
      <svg viewBox="0 0 104 34" className="w-24 h-7" aria-hidden="true">
        <path
          d="M4 15 L26 13 L35 10 L96 10 L96 14 L62 15 L52 17 L32 18 L18 24 L4 22 Z"
          fill="#e7e5e4"
          stroke="#1c1917"
          strokeWidth="2"
        />
        <circle cx="56" cy="23" r="7" fill="#d6d3d1" stroke="#1c1917" strokeWidth="1.8" />
        <circle cx="56" cy="23" r="2.2" fill="#1c1917" />
      </svg>
    );
  }
  if (weaponId === 'binoculars') {
    return (
      <svg viewBox="0 0 80 34" className="w-16 h-7" aria-hidden="true">
        <rect x="14" y="9" width="22" height="16" rx="3" fill="#eab308" stroke="#1c1917" strokeWidth="1.8" />
        <rect x="44" y="9" width="22" height="16" rx="3" fill="#eab308" stroke="#1c1917" strokeWidth="1.8" />
        <rect x="34" y="13" width="12" height="7" fill="#d6d3d1" stroke="#1c1917" strokeWidth="1.6" />
        <circle cx="25" cy="17" r="4.5" fill="#1c1917" />
        <circle cx="55" cy="17" r="4.5" fill="#1c1917" />
      </svg>
    );
  }
  if (weaponId === 'shovel') {
    return (
      <svg viewBox="0 0 104 32" className="w-24 h-7" aria-hidden="true">
        <rect x="14" y="14" width="52" height="4" fill="#d6b384" stroke="#1c1917" strokeWidth="1.4" />
        <path
          d="M6 10 L14 10 L14 22 L6 22 Z M9 13 L12 13 L12 19 L9 19 Z"
          fill="#d6b384"
          stroke="#1c1917"
          strokeWidth="1.4"
        />
        <path
          d="M66 9 L92 12 L98 16 L92 20 L66 23 Z"
          fill="#e7e5e4"
          stroke="#1c1917"
          strokeWidth="1.8"
        />
      </svg>
    );
  }
  if (weaponId === 'm1911') {
    return (
      <svg viewBox="0 0 64 36" className="w-14 h-7" aria-hidden="true">
        <path
          d="M12 8 L50 8 L50 15 L30 15 L25 30 L15 30 L18 16 L12 16 Z"
          fill="#e7e5e4"
          stroke="#1c1917"
          strokeWidth="2"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 110 30" className="w-24 h-7" aria-hidden="true">
      {weaponId === 'springfield' && (
        <rect x="36" y="4" width="28" height="4" fill="#d4af37" stroke="#1c1917" strokeWidth="1.2" />
      )}
      {weaponId === 'kar98k' && <circle cx="52" cy="10" r="2.2" fill="#d4af37" />}
      <path
        d="M4 15 L26 13 L34 11 L98 11 L98 14 L64 15 L56 18 L28 19 L12 24 L4 22 Z"
        fill="#e7e5e4"
        stroke="#1c1917"
        strokeWidth="2"
      />
    </svg>
  );
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getKillcamWeaponLabel(weaponId: KillcamInfo['killerWeaponId'], lang: Lang): string {
  if (weaponId === 'tank_cannon') return lang === 'ar' ? 'مدفع الدبابة 75مم' : 'Tank 75mm Cannon';
  if (weaponId === 'aircraft_cannon') return lang === 'ar' ? 'مدفع المقاتلة المزدوج' : 'Fighter Twin Cannons';
  if (weaponId === 'aircraft_bomb') return lang === 'ar' ? 'قنبلة جوية ثقيلة' : 'Aerial Bomb';
  if (weaponId === 'aircraft_missile') return lang === 'ar' ? 'صاروخ جو-جو حراري' : 'IR Homing Missile';
  if (weaponId === 'grenade') return lang === 'ar' ? 'قنبلة يدوية' : 'Frag Grenade';
  const w = WEAPONS[weaponId];
  return w ? (lang === 'ar' ? w.nameAr : w.nameEn) : String(weaponId);
}

export function GameHud({
  hud,
  lang,
  onToggleMute,
  onPause,
  onOpenSettings,
  onOpenHudEditor,
  onOpenBackpack,
}: GameHudProps) {
  const t = STRINGS[lang];
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const staticMinimapRef = useRef<{ canvas: HTMLCanvasElement; key: string } | null>(null);
  const weapon = WEAPONS[hud.weaponId];
  const activeZone = hud.zones.find((z) => z.id === hud.activeZoneId) || null;

  useEffect(() => {
    const canvas = minimapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 128;
    const scale = (size * 0.44) / ARENA_RADIUS;
    const cx = size / 2;
    const cy = size / 2;
    const staticKey = `${hud.mapId}|${hud.zones.map((z) => `${z.id}:${z.owner ?? ''}`).join(',')}`;

    if (!staticMinimapRef.current || staticMinimapRef.current.key !== staticKey) {
      const offscreen = staticMinimapRef.current?.canvas ?? document.createElement('canvas');
      offscreen.width = size;
      offscreen.height = size;
      const sctx = offscreen.getContext('2d');
      if (sctx) {
        sctx.clearRect(0, 0, size, size);
        sctx.fillStyle =
          hud.mapId === 'desert'
            ? 'rgba(66, 54, 38, 0.88)'
            : hud.mapId === 'stalingrad'
              ? 'rgba(36, 38, 42, 0.88)'
              : hud.mapId === 'forest'
                ? 'rgba(20, 32, 24, 0.88)'
                : 'rgba(28, 36, 28, 0.88)';
        sctx.fillRect(0, 0, size, size);

        sctx.strokeStyle = 'rgba(214, 196, 165, 0.42)';
        sctx.lineWidth = 5;
        sctx.beginPath();
        sctx.moveTo(cx - 135 * scale, cy + 42 * scale);
        sctx.lineTo(cx + 135 * scale, cy - 42 * scale);
        sctx.stroke();

        if (hud.mapId !== 'desert' && hud.mapId !== 'stalingrad') {
          sctx.strokeStyle = 'rgba(56, 189, 248, 0.42)';
          sctx.lineWidth = 5;
          sctx.beginPath();
          sctx.moveTo(cx + 55 * scale, 0);
          sctx.lineTo(cx - 55 * scale, size);
          sctx.stroke();
        }

        // Allied Home Base Resupply & Armory Station Marker
        const rx = cx + ALLY_BASE_CENTER.x * scale;
        const ry = cy + ALLY_BASE_CENTER.z * scale;
        sctx.fillStyle = '#10b981';
        sctx.fillRect(rx - 3.5, ry - 3.5, 7, 7);
        sctx.fillStyle = '#ecfdf5';
        sctx.fillRect(rx - 2, ry - 0.7, 4, 1.4);
        sctx.fillRect(rx - 0.7, ry - 2, 1.4, 4);

        for (const z of hud.zones) {
          const zx = cx + z.x * scale;
          const zy = cy + z.z * scale;
          sctx.fillStyle =
            z.owner === 'allies' ? '#3b82f6' : z.owner === 'axis' ? '#ef4444' : '#d4d4d8';
          sctx.beginPath();
          sctx.arc(zx, zy, 6.5, 0, Math.PI * 2);
          sctx.fill();
          sctx.fillStyle = '#09090b';
          sctx.font = 'bold 9px "Barlow Condensed", sans-serif';
          sctx.textAlign = 'center';
          sctx.textBaseline = 'middle';
          sctx.fillText(z.label, zx, zy + 0.5);
        }
        staticMinimapRef.current = { canvas: offscreen, key: staticKey };
      }
    }

    ctx.clearRect(0, 0, size, size);
    if (staticMinimapRef.current) {
      ctx.drawImage(staticMinimapRef.current.canvas, 0, 0);
    }

    for (const actor of hud.minimapActors) {
      const ax = cx + actor.x * scale;
      const ay = cy + actor.z * scale;
      ctx.fillStyle = actor.team === 'allies' ? '#60a5fa' : '#f87171';
      if (actor.vehicleKind === 'tank') {
        ctx.fillRect(ax - 3.5, ay - 3.5, 7, 7);
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 1;
        ctx.strokeRect(ax - 3.5, ay - 3.5, 7, 7);
      } else if (actor.vehicleKind === 'jeep') {
        ctx.fillRect(ax - 2.5, ay - 2.5, 5, 5);
      } else if (actor.vehicleKind === 'aircraft') {
        ctx.beginPath();
        ctx.moveTo(ax, ay - 4);
        ctx.lineTo(ax + 3.5, ay + 2);
        ctx.lineTo(ax, ay + 0.5);
        ctx.lineTo(ax - 3.5, ay + 2);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(ax, ay, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const px = cx + hud.playerX * scale;
    const py = cy + hud.playerZ * scale;
    const lookAngle = -hud.playerYaw - Math.PI / 2;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(lookAngle);
    ctx.fillStyle = 'rgba(250, 204, 21, 0.22)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 18, -0.5, 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(-4, -3.5);
    ctx.lineTo(-2.5, 0);
    ctx.lineTo(-4, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [hud]);

  const alliesPct = Math.max(0, Math.min(100, (hud.alliesTickets / hud.maxTickets) * 100));
  const axisPct = Math.max(0, Math.min(100, (hud.axisTickets / hud.maxTickets) * 100));
  const hpPct = Math.max(0, Math.min(100, (hud.health / hud.maxHealth) * 100));
  const spreadPx = Math.max(5, Math.min(26, Math.round(hud.crosshairSpread)));

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none">
      {hud.damageFlashAlpha > 0.02 && (
        <div
          className="fixed inset-0"
          style={{
            boxShadow: `inset 0 0 90px rgba(220, 38, 38, ${Math.min(0.65, hud.damageFlashAlpha * 0.7)})`,
          }}
        />
      )}

      {hud.health > 0 && hud.health <= 30 && (
        <div
          className="fixed inset-0"
          style={{
            boxShadow: 'inset 0 0 70px rgba(185, 28, 28, 0.45)',
          }}
        />
      )}

      {/* DISTINCT OPTIC ADS RETICLES */}
      {hud.isAds &&
        hud.activeSlot <= 3 &&
        !hud.inVehicleKind &&
        hud.health > 0 &&
        hud.activeOptic !== 'iron' && (
          <div
            data-testid={`optic-reticle-${hud.activeOptic}`}
            className="fixed inset-0 flex items-center justify-center"
          >
            {hud.activeOptic === 'red_dot' && (
              <div className="w-2 h-2 rounded-full bg-red-500 ring-1 ring-red-300/60" />
            )}
            {hud.activeOptic === 'holo' && (
              <svg viewBox="0 0 120 120" className="w-32 h-32" aria-hidden="true">
                <circle cx="60" cy="60" r="24" fill="none" stroke="rgba(239,68,68,0.85)" strokeWidth="1.6" />
                <line x1="60" y1="30" x2="60" y2="38" stroke="rgba(239,68,68,0.9)" strokeWidth="1.8" />
                <line x1="60" y1="82" x2="60" y2="90" stroke="rgba(239,68,68,0.9)" strokeWidth="1.8" />
                <line x1="30" y1="60" x2="38" y2="60" stroke="rgba(239,68,68,0.9)" strokeWidth="1.8" />
                <line x1="82" y1="60" x2="90" y2="60" stroke="rgba(239,68,68,0.9)" strokeWidth="1.8" />
                <circle cx="60" cy="60" r="2" fill="#ef4444" />
              </svg>
            )}
            {hud.activeOptic === 'optic_2x' && (
              <div
                className="w-[210px] h-[210px] md:w-[240px] md:h-[240px] rounded-full border-4 border-stone-950 relative flex items-center justify-center"
                style={{ boxShadow: '0 0 0 200vmax rgba(8, 10, 12, 0.55)' }}
              >
                <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
                  <line x1="12" y1="60" x2="48" y2="60" stroke="rgba(20,20,22,0.85)" strokeWidth="1.5" />
                  <line x1="72" y1="60" x2="108" y2="60" stroke="rgba(20,20,22,0.85)" strokeWidth="1.5" />
                  <line x1="60" y1="70" x2="60" y2="108" stroke="rgba(20,20,22,0.85)" strokeWidth="1.5" />
                  <path d="M55 64 L60 57 L65 64" fill="none" stroke="#ef4444" strokeWidth="2" />
                </svg>
              </div>
            )}
            {hud.activeOptic === 'optic_3x' && (
              <div
                className="w-[240px] h-[240px] md:w-[280px] md:h-[280px] rounded-full border-4 border-stone-950 relative flex items-center justify-center"
                style={{ boxShadow: '0 0 0 200vmax rgba(8, 10, 12, 0.72)' }}
              >
                <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
                  <line x1="6" y1="60" x2="114" y2="60" stroke="rgba(18,18,20,0.88)" strokeWidth="1.2" />
                  <line x1="60" y1="6" x2="60" y2="114" stroke="rgba(18,18,20,0.88)" strokeWidth="1.2" />
                  <circle cx="60" cy="60" r="10" fill="none" stroke="#22c55e" strokeWidth="1.4" />
                  <circle cx="60" cy="60" r="1.8" fill="#22c55e" />
                </svg>
              </div>
            )}
            {hud.activeOptic === 'scope_4x' && (
              <div
                className="w-[265px] h-[265px] md:w-[320px] md:h-[320px] rounded-full border-4 border-stone-950 relative"
                style={{ boxShadow: '0 0 0 200vmax rgba(10, 10, 12, 0.86)' }}
              >
                <svg viewBox="0 0 160 160" className="w-full h-full" aria-hidden="true">
                  <line x1="8" y1="80" x2="68" y2="80" stroke="#0c0a09" strokeWidth="1.6" />
                  <line x1="92" y1="80" x2="152" y2="80" stroke="#0c0a09" strokeWidth="1.6" />
                  <line x1="80" y1="88" x2="80" y2="152" stroke="#0c0a09" strokeWidth="1.6" />
                  <path d="M74 84 L80 76 L86 84" fill="none" stroke="#ef4444" strokeWidth="2.2" />
                  <line x1="74" y1="96" x2="86" y2="96" stroke="#0c0a09" strokeWidth="1.4" />
                  <line x1="76" y1="108" x2="84" y2="108" stroke="#0c0a09" strokeWidth="1.4" />
                </svg>
              </div>
            )}
            {(hud.activeOptic === 'scope_6x' || hud.activeOptic === 'scope_8x') && (
              <div
                className="w-[285px] h-[285px] md:w-[350px] md:h-[350px] rounded-full border-[6px] border-stone-950 relative"
                style={{ boxShadow: '0 0 0 200vmax rgba(6, 7, 9, 0.92)' }}
              >
                <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden="true">
                  <line x1="8" y1="100" x2="192" y2="100" stroke="#09090b" strokeWidth="1.2" />
                  <line x1="100" y1="8" x2="100" y2="192" stroke="#09090b" strokeWidth="1.2" />
                  <line x1="8" y1="100" x2="54" y2="100" stroke="#09090b" strokeWidth="3.2" />
                  <line x1="146" y1="100" x2="192" y2="100" stroke="#09090b" strokeWidth="3.2" />
                  <line x1="100" y1="146" x2="100" y2="192" stroke="#09090b" strokeWidth="3.2" />
                  {[66, 78, 89, 111, 122, 134].map((p) => (
                    <circle key={`mx-${p}`} cx={p} cy="100" r="1.6" fill="#09090b" />
                  ))}
                  {[66, 78, 89, 111, 122, 134, 145].map((p) => (
                    <circle key={`my-${p}`} cx="100" cy={p} r="1.6" fill="#09090b" />
                  ))}
                  <circle cx="100" cy="100" r="2" fill="#ef4444" />
                </svg>
              </div>
            )}
          </div>
        )}

      {/* MANUAL RECON BINOCULARS OPTICS (منظار الاستطلاع اليدوي) */}
      {hud.isBinocularsActive && hud.health > 0 && (
        <div
          data-testid="binoculars-overlay"
          className="fixed inset-0 flex items-center justify-center"
        >
          <svg
            viewBox="0 0 1280 720"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full"
            aria-hidden="true"
          >
            <defs>
              <mask id="bino-lenses-mask">
                <rect x="0" y="0" width="1280" height="720" fill="white" />
                <circle cx="485" cy="360" r="225" fill="black" />
                <circle cx="795" cy="360" r="225" fill="black" />
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="1280"
              height="720"
              fill="rgba(7, 9, 11, 0.96)"
              mask="url(#bino-lenses-mask)"
            />
            <circle cx="485" cy="360" r="226" fill="none" stroke="#292524" strokeWidth="10" />
            <circle cx="795" cy="360" r="226" fill="none" stroke="#292524" strokeWidth="10" />
            <circle cx="485" cy="360" r="220" fill="none" stroke="#57534e" strokeWidth="2" />
            <circle cx="795" cy="360" r="220" fill="none" stroke="#57534e" strokeWidth="2" />
            <line x1="360" y1="360" x2="920" y2="360" stroke="rgba(250,204,21,0.58)" strokeWidth="1.5" />
            <line x1="640" y1="220" x2="640" y2="500" stroke="rgba(250,204,21,0.58)" strokeWidth="1.5" />
            {[420, 480, 540, 600, 680, 740, 800, 860].map((tx) => (
              <line
                key={tx}
                x1={tx}
                y1="352"
                x2={tx}
                y2="368"
                stroke="rgba(250,204,21,0.82)"
                strokeWidth="1.5"
              />
            ))}
            {[260, 300, 330, 390, 420, 460].map((ty) => (
              <line
                key={ty}
                x1="632"
                y1={ty}
                x2="648"
                y2={ty}
                stroke="rgba(250,204,21,0.82)"
                strokeWidth="1.5"
              />
            ))}
          </svg>
          <div
            dir="ltr"
            className="absolute bottom-[11%] left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-stone-950/90 border border-amber-500/60 font-mono-nums text-xs font-bold text-amber-300"
          >
            6×30 · {hud.aimTargetDist}m
          </div>
        </div>
      )}

      {/* TOP-LEFT: Tactical Minimap (compact on short landscape mobile) */}
      <div className="fixed top-3 left-3 md:top-4 md:left-4 flex flex-col gap-1">
        <div className="border border-stone-500/70 bg-stone-950/90 p-1 shadow-md">
          <canvas
            ref={minimapRef}
            width={128}
            height={128}
            className="block w-[84px] h-[84px] md:w-[124px] md:h-[124px]"
            aria-label="Tactical Minimap"
          />
        </div>
        <div className="text-[10px] md:text-[11px] font-mono-nums text-stone-200 bg-stone-950/80 px-2 py-0.5 flex items-center justify-between">
          <span>K {hud.kills}</span>
          <span>/</span>
          <span>{hud.score}</span>
        </div>
      </div>

      {/* TOP-CENTER: Conquest Ticket Bars + A..E Flags */}
      <div className="fixed top-2.5 lg:top-4 left-1/2 -translate-x-1/2 max-w-[calc(100vw-290px)] lg:max-w-none flex flex-col items-center gap-1">
        <div className="flex items-center gap-1 lg:gap-3 bg-stone-950/90 border border-stone-600/80 px-1.5 lg:px-3 py-1">
          <div className="flex items-center gap-1 lg:gap-1.5">
            <span className="text-[10px] lg:text-[11px] font-bold text-blue-400">{t.allies}</span>
            <div className="w-10 lg:w-28 h-2 bg-stone-800 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-[width] duration-150"
                style={{ width: `${alliesPct}%` }}
              />
            </div>
            <span className="font-mono-nums text-[11px] lg:text-sm font-bold text-stone-100 w-7 text-right">
              {hud.alliesTickets}
            </span>
          </div>

          <div className="px-1.5 py-0.5 bg-stone-900 border border-stone-700 font-mono-nums text-[10px] lg:text-[11px] font-bold text-amber-300">
            {formatClock(hud.timeRemaining)}
          </div>

          <div className="flex items-center gap-1 lg:gap-1.5">
            <span className="font-mono-nums text-[11px] lg:text-sm font-bold text-stone-100 w-7 text-left">
              {hud.axisTickets}
            </span>
            <div className="w-10 lg:w-28 h-2 bg-stone-800 overflow-hidden">
              <div
                className="h-full bg-red-500 transition-[width] duration-150 ml-auto"
                style={{ width: `${axisPct}%` }}
              />
            </div>
            <span className="text-[10px] lg:text-[11px] font-bold text-red-400">{t.axis}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 lg:gap-1.5">
          {hud.zones.map((z) => {
            const bg =
              z.owner === 'allies'
                ? 'bg-blue-600 border-blue-400 text-white'
                : z.owner === 'axis'
                  ? 'bg-red-600 border-red-400 text-white'
                  : 'bg-stone-900/90 border-stone-500 text-stone-200';
            return (
              <div
                key={z.id}
                className={`w-5 h-5 lg:w-7 lg:h-7 border lg:border-2 flex items-center justify-center font-display font-bold text-[11px] lg:text-sm ${bg}`}
              >
                {z.label}
              </div>
            );
          })}
          {hud.isOnline && (
            <div
              data-testid="hud-online-badge"
              dir="ltr"
              className={`ml-1 px-2 py-0.5 text-[10px] font-mono-nums font-bold border ${
                hud.onlineStatus === 'connected'
                  ? 'bg-emerald-950/90 border-emerald-500/70 text-emerald-300'
                  : 'bg-amber-950/90 border-amber-500/70 text-amber-300'
              }`}
            >
              {hud.onlineRoomCode} · {hud.onlinePlayerCount}
            </div>
          )}
        </div>
      </div>

      {/* TOP-RIGHT: Settings, Mute, Pause + Killfeed */}
      <div className="fixed top-2.5 right-2.5 lg:top-4 lg:right-4 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            aria-label={t.backpackBtn}
            title={t.backpackBtn}
            data-testid="hud-btn-backpack"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.blur();
              onOpenBackpack();
            }}
            className="relative w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center bg-stone-950/88 border border-stone-700 text-emerald-300 hover:bg-stone-800 cursor-pointer"
          >
            <Briefcase className="w-4 h-4" />
            <span
              dir="ltr"
              className="absolute -bottom-1 -right-1 px-1 text-[9px] font-mono-nums font-bold bg-emerald-600 text-white border border-stone-950"
            >
              {hud.backpackMedkits}
            </span>
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label={t.customizeHudBtn}
            title={t.customizeHudBtn}
            data-testid="hud-btn-layout"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.blur();
              onOpenHudEditor();
            }}
            className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center bg-stone-950/88 border border-stone-700 text-amber-300 hover:bg-stone-800 cursor-pointer"
          >
            <Move className="w-4 h-4" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label={t.settings}
            data-testid="hud-btn-settings"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.blur();
              onOpenSettings();
            }}
            className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center bg-stone-950/88 border border-stone-700 text-amber-400 hover:bg-stone-800 cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label={t.mute}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center bg-stone-950/88 border border-stone-700 text-stone-200 hover:bg-stone-800 cursor-pointer"
          >
            {hud.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label={t.pause}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.blur();
              onPause();
            }}
            className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center bg-stone-950/88 border border-stone-700 text-stone-200 hover:bg-stone-800 cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>

        <div className="hidden sm:flex flex-col items-end gap-1">
          {hud.killFeed.map((item) => (
            <div
              key={item.id}
              className="bg-stone-950/82 px-2 py-0.5 text-[11px] flex items-center gap-1.5 border border-stone-800"
            >
              <span className={item.killerTeam === 'allies' ? 'text-blue-400 font-semibold' : 'text-red-400 font-semibold'}>
                {item.killerName}
              </span>
              <span className="text-stone-400">
                {item.weaponId === 'grenade' ? 'FRAG' : item.isHeadshot ? 'HS' : '·'}
              </span>
              <span className={item.victimTeam === 'allies' ? 'text-blue-400 font-semibold' : 'text-red-400 font-semibold'}>
                {item.victimName}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER HIP CROSSHAIR */}
      {!hud.isAds &&
        !hud.isBinocularsActive &&
        hud.weaponId !== 'shovel' &&
        hud.gameMode !== 'hardcore' &&
        hud.health > 0 && (
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-1 h-1 bg-white/80 rounded-full" />
            <div
              className="absolute left-1/2 -translate-x-1/2 w-[2px] h-2.5 bg-white/75"
              style={{ bottom: `${spreadPx}px` }}
            />
            <div
              className="absolute left-1/2 -translate-x-1/2 w-[2px] h-2.5 bg-white/75"
              style={{ top: `${spreadPx}px` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-[2px] w-2.5 bg-white/75"
              style={{ right: `${spreadPx}px` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-[2px] w-2.5 bg-white/75"
              style={{ left: `${spreadPx}px` }}
            />
          </div>
        )}

      {/* OPTIONAL BALLISTIC AIMING ARROW (تظهر فقط عند تفعيلها من الإعدادات) */}
      {hud.showAimArrow &&
        hud.health > 0 &&
        !hud.isBinocularsActive &&
        hud.weaponId !== 'shovel' && (
          <div
            data-testid="ballistic-aim-arrow"
            className="fixed flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `calc(50% + ${hud.aimArrowX}px)`,
              top: `calc(50% + ${hud.aimArrowY}px)`,
            }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 drop-shadow" aria-hidden="true">
              <path
                d="M12 19 L5 7 L12 11 L19 7 Z"
                fill="#facc15"
                stroke="#0c0a09"
                strokeWidth="1.6"
              />
            </svg>
            <span
              dir="ltr"
              className="font-mono-nums text-[9px] font-bold text-amber-300 bg-stone-950/75 px-1 leading-tight"
            >
              {hud.aimTargetDist}m
            </span>
          </div>
        )}

      {/* DYNAMIC VEHICLE / AIRCRAFT BALLISTIC RETICLE */}
      {hud.health > 0 && hud.inVehicleKind && hud.vehicleReticleVisible && (
        <div
          data-testid="vehicle-reticle"
          className="fixed -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: `calc(50% + ${hud.vehicleReticleX}px)`,
            top: `calc(50% + ${hud.vehicleReticleY}px)`,
          }}
        >
          <svg viewBox="0 0 48 48" className="w-11 h-11 drop-shadow" aria-hidden="true">
            <circle
              cx="24"
              cy="24"
              r="14"
              fill="none"
              stroke={hud.inVehicleKind === 'aircraft' ? '#38bdf8' : '#facc15'}
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            <line x1="24" y1="4" x2="24" y2="14" stroke="#facc15" strokeWidth="2" />
            <line x1="24" y1="34" x2="24" y2="44" stroke="#facc15" strokeWidth="2" />
            <line x1="4" y1="24" x2="14" y2="24" stroke="#facc15" strokeWidth="2" />
            <line x1="34" y1="24" x2="44" y2="24" stroke="#facc15" strokeWidth="2" />
            <circle cx="24" cy="24" r="2.3" fill="#ef4444" />
          </svg>
        </div>
      )}

      {/* WAR THUNDER STYLE AIRCRAFT FLIGHT AIM RING */}
      {hud.health > 0 && hud.inVehicleKind === 'aircraft' && (
        <div
          data-testid="flight-aim-cursor"
          className="fixed -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: `calc(50% + ${hud.flightAimX}px)`,
            top: `calc(50% + ${hud.flightAimY}px)`,
          }}
        >
          <svg viewBox="0 0 44 44" className="w-10 h-10" aria-hidden="true">
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              stroke={hud.aircraftLockActive ? '#ef4444' : 'rgba(248, 250, 252, 0.85)'}
              strokeWidth="1.8"
            />
            <line x1="22" y1="1" x2="22" y2="7" stroke="#f8fafc" strokeWidth="1.6" />
            <line x1="22" y1="37" x2="22" y2="43" stroke="#f8fafc" strokeWidth="1.6" />
            <line x1="1" y1="22" x2="7" y2="22" stroke="#f8fafc" strokeWidth="1.6" />
            <line x1="37" y1="22" x2="43" y2="22" stroke="#f8fafc" strokeWidth="1.6" />
          </svg>
        </div>
      )}

      {hud.hitmarkerKind !== 'none' && (
        <svg
          viewBox="0 0 32 32"
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8"
          aria-hidden="true"
        >
          <path
            d="M7 7 L13 13 M25 7 L19 13 M7 25 L13 19 M25 25 L19 19"
            stroke={hud.hitmarkerKind === 'kill' ? '#ef4444' : '#facc15'}
            strokeWidth="2.6"
            strokeLinecap="square"
          />
        </svg>
      )}

      {activeZone && (
        <div className="fixed top-[98px] lg:top-24 left-1/2 -translate-x-1/2 bg-stone-950/90 border border-stone-600/80 px-3 py-1 min-w-[190px] text-center">
          <div className="text-[11px] font-semibold text-stone-200 mb-0.5">
            {activeZone.label} · {lang === 'ar' ? activeZone.nameAr : activeZone.nameEn}
          </div>
          <div className="w-full h-1.5 bg-stone-800 relative overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${
                activeZone.progress >= 0 ? 'bg-blue-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.round(Math.abs(activeZone.progress) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {hud.health > 0 && hud.inVehicleKind === 'aircraft' && hud.aircraftThreatWarning !== 'none' && (
        <div
          data-testid="aircraft-threat-warning"
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          className={`fixed top-16 md:top-20 left-1/2 -translate-x-1/2 px-3 py-1 border text-[11px] md:text-xs font-bold whitespace-nowrap shadow-lg animate-pulse ${
            hud.aircraftThreatWarning === 'pull_up'
              ? 'bg-amber-950/95 border-amber-400 text-amber-200'
              : 'bg-red-950/95 border-red-400 text-red-100'
          }`}
        >
          {hud.aircraftThreatWarning === 'eject'
            ? t.threatEject
            : hud.aircraftThreatWarning === 'missile'
              ? t.threatMissile
              : t.threatPullUp}
        </div>
      )}

      {hud.health > 0 &&
        (hud.inVehicleKind ? (
          <div
            data-testid="hud-in-vehicle"
            className="fixed bottom-2.5 right-2.5 lg:right-auto lg:left-1/2 lg:-translate-x-1/2 bg-stone-950/88 border border-amber-400/70 px-2.5 lg:px-3 py-1 flex items-center gap-2 lg:gap-2.5 text-[10px] lg:text-[11px] font-bold text-stone-100 whitespace-nowrap shadow"
          >
            {hud.inVehicleKind === 'aircraft' ? (
              <span data-testid="aircraft-cockpit-hud" className="flex items-center gap-2 md:gap-2.5">
                <span dir="ltr" className="font-mono-nums text-sky-300">
                  THR {hud.aircraftThrottlePct}%
                </span>
                <span dir="ltr" className="font-mono-nums text-amber-300">
                  BMB {hud.aircraftBombs}/{hud.aircraftBombsMax}
                </span>
                <span
                  dir="ltr"
                  className={`font-mono-nums ${
                    hud.aircraftLockActive ? 'text-red-400 animate-pulse' : 'text-sky-200'
                  }`}
                >
                  IR {hud.aircraftMissiles}/{hud.aircraftMissilesMax}
                </span>
                <span
                  dir="ltr"
                  data-testid="aircraft-flares-count"
                  className={`font-mono-nums ${
                    hud.aircraftThreatWarning === 'missile' && hud.aircraftFlares > 0
                      ? 'text-orange-300 animate-pulse'
                      : 'text-orange-400'
                  }`}
                >
                  FLR {hud.aircraftFlares}/{hud.aircraftFlaresMax}
                </span>
                {hud.aircraftLockActive && (
                  <span className="px-1 bg-red-600 text-white text-[9px]">
                    {t.missileLockedLabel}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-amber-300">
                {hud.inVehicleKind === 'tank' ? t.tankName : t.jeepName}
              </span>
            )}
            <span dir="ltr" className="font-mono-nums text-emerald-400">
              HP {hud.vehicleHp}
            </span>
            <span dir="ltr" className="font-mono-nums text-stone-300">
              {hud.vehicleSpeedKmh} km/h
            </span>
            {hud.inVehicleKind === 'aircraft' && (
              <span dir="ltr" className="font-mono-nums text-sky-300">
                ALT {hud.vehicleAltitudeM}m
              </span>
            )}
            <span dir="ltr" className="font-mono-nums text-amber-200">
              {hud.vehicleAmmo}
            </span>
            <span className="text-stone-400">[X]</span>
          </div>
        ) : hud.isParachuting ? (
          <div
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            data-testid="hud-parachute-banner"
            className="fixed top-[68px] lg:top-auto lg:bottom-16 left-1/2 -translate-x-1/2 bg-sky-950/92 border border-sky-400 px-3.5 py-1 text-[11px] font-bold text-sky-200 whitespace-nowrap shadow flex items-center gap-2"
          >
            <span>{t.parachuteOpenMsg}</span>
            <span dir="ltr" className="font-mono-nums text-amber-300">
              {hud.parachuteAltitudeM}m
            </span>
          </div>
        ) : hud.nearbyVehicleKind ? (
          <div
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            data-testid="hud-enter-vehicle"
            className="fixed top-[68px] lg:top-auto lg:bottom-16 left-1/2 -translate-x-1/2 bg-amber-950/92 border border-amber-400 px-3.5 py-1 text-[11px] font-bold text-amber-200 whitespace-nowrap shadow"
          >
            {hud.nearbyVehicleKind === 'aircraft'
              ? t.enterAircraft
              : hud.nearbyVehicleKind === 'tank'
                ? t.enterTank
                : t.enterJeep}
          </div>
        ) : hud.nearArmory ? (
          <div
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            data-testid="hud-armory-prompt"
            className="fixed top-[68px] lg:top-auto lg:bottom-16 left-1/2 -translate-x-1/2 bg-amber-950/95 border border-amber-400 px-3.5 py-1 text-[11px] font-bold text-amber-200 whitespace-nowrap shadow"
          >
            {t.armoryPrompt}
          </div>
        ) : hud.outOfAmmo ? (
          <div
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            data-testid="hud-out-of-ammo"
            className="fixed top-[98px] lg:top-24 left-1/2 -translate-x-1/2 bg-red-950/92 border border-red-500 px-3 py-1 text-[11px] font-bold text-red-200 whitespace-nowrap shadow"
          >
            {t.outOfAmmoMsg}
          </div>
        ) : hud.resupplyFlash || hud.nearResupply ? (
          <div
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            data-testid="hud-resupply"
            className="fixed top-[98px] lg:top-24 left-1/2 -translate-x-1/2 bg-emerald-950/92 border border-emerald-400 px-3 py-1 text-[11px] font-bold text-emerald-200 whitespace-nowrap shadow"
          >
            {t.resupplyMsg}
          </div>
        ) : hud.weaponId === 'binoculars' ? (
          <div
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            data-testid="hud-binoculars-hint"
            className="fixed top-[68px] lg:top-auto lg:bottom-14 left-1/2 -translate-x-1/2 bg-stone-950/90 border border-amber-500/70 px-3 py-1 text-[11px] font-semibold text-amber-300 whitespace-nowrap"
          >
            {t.binocularsHint}
          </div>
        ) : hud.weaponId === 'shovel' ? (
          <div
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            data-testid="hud-shovel-hint"
            className="fixed top-[68px] lg:top-auto lg:bottom-14 left-1/2 -translate-x-1/2 bg-stone-950/90 border border-amber-500/70 px-3 py-1 text-[11px] font-semibold text-amber-300 whitespace-nowrap"
          >
            {t.shovelHint}
          </div>
        ) : null)}

      {hud.health <= 0 && (
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
          <div className="bg-stone-950/92 border border-red-500/70 px-5 py-3 text-center">
            <div className="text-xs uppercase tracking-wider text-red-400 font-semibold">
              {t.respawning}
            </div>
            <div className="font-mono-nums text-2xl font-bold text-white mt-0.5">
              {hud.respawnTimer.toFixed(1)}s
            </div>
          </div>
          {hud.killcam && (
            <div
              data-testid="killcam-card"
              className="bg-stone-950/95 border border-stone-700 px-4 py-2.5 min-w-[260px] text-center shadow-xl"
            >
              <div className="text-[10px] tracking-wider uppercase text-stone-400 font-bold">
                {t.killcamKilledBy}
              </div>
              <div className="flex items-center justify-center gap-2 mt-0.5">
                <span
                  className={`text-sm font-bold ${
                    hud.killcam.killerTeam === 'allies' ? 'text-blue-400' : 'text-red-400'
                  }`}
                >
                  {hud.killcam.killerName}
                </span>
                {hud.killcam.killerIsHeadshot && (
                  <span className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-bold">
                    {t.killcamHeadshot}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-center gap-2.5 text-[11px] text-stone-300 mt-1">
                <span>{getKillcamWeaponLabel(hud.killcam.killerWeaponId, lang)}</span>
                <span>·</span>
                <span dir="ltr" className="font-mono-nums text-amber-300">
                  {t.killcamDistance}: {hud.killcam.killerDistanceM}m
                </span>
                <span>·</span>
                <span dir="ltr" className="font-mono-nums text-emerald-400">
                  HP {hud.killcam.killerHp}/{hud.killcam.killerMaxHp}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOTTOM-LEFT: Health, Stamina, Stance & Lean */}
      <div className="fixed bottom-3 left-3 md:bottom-4 md:left-4 bg-stone-950/88 border border-stone-700/80 px-3 py-1.5 min-w-[168px] md:min-w-[196px]">
        <div className="flex items-baseline justify-between mb-0.5">
          <span className="text-[10px] font-bold tracking-wider text-stone-400">{t.hp}</span>
          <span className="font-mono-nums text-xl md:text-2xl font-bold leading-none text-stone-100">
            {hud.health}
          </span>
        </div>
        <div className="w-full h-1.5 md:h-2 bg-stone-800 overflow-hidden mb-1">
          <div
            className={`h-full transition-[width] duration-150 ${
              hud.health <= 30 ? 'bg-red-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${hpPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-[10px] md:text-[11px] text-stone-300">
          <span>{t[hud.stance]}</span>
          {Math.abs(hud.lean) > 0.2 && (
            <span className="text-amber-400 font-bold">
              {hud.lean < 0 ? t.peekLeftBtn : t.peekRightBtn}
            </span>
          )}
          <span dir="ltr" className="font-mono-nums text-emerald-400 font-bold">
            +{hud.backpackMedkits} MED
          </span>
          <span dir="ltr" className="font-mono-nums text-stone-400">{hud.stamina}%</span>
        </div>
      </div>

      {/* BOTTOM-RIGHT: Weapon Silhouette, Active Slot, Mag/Reserve & Grenade (hidden while inside a vehicle to keep cockpit clean) */}
      {!hud.inVehicleKind && (
        <div className="fixed bottom-3 right-3 md:bottom-4 md:right-4 bg-stone-950/88 border border-stone-700/80 px-3 py-1.5 min-w-[210px] md:min-w-[250px]">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <WeaponSilhouetteSvg weaponId={hud.weaponId} />
            <div className="text-right">
              {hud.activeSlot === 4 ? (
                <div dir="ltr" className="font-mono-nums text-xl md:text-2xl font-bold leading-none text-amber-300">
                  6×30
                </div>
              ) : hud.activeSlot === 5 ? (
                <div
                  dir="ltr"
                  data-testid="foxhole-counter"
                  className="font-mono-nums text-xl md:text-2xl font-bold leading-none text-amber-300"
                >
                  {hud.foxholesUsed}
                  <span className="text-xs md:text-sm text-stone-400 font-normal">/{hud.foxholesMax}</span>
                </div>
              ) : (
                <div
                  dir="ltr"
                  className={`font-mono-nums text-xl md:text-2xl font-bold leading-none ${
                    hud.outOfAmmo ? 'text-red-400' : 'text-stone-100'
                  }`}
                >
                  {hud.magAmmo}
                  <span className="text-xs md:text-sm text-stone-400 font-normal">/{hud.reserveAmmo}</span>
                </div>
              )}
            </div>
          </div>
          {hud.isReloading ? (
            <div className="w-full h-1.5 bg-stone-800 overflow-hidden mb-1">
              <div
                className="h-full bg-amber-400"
                style={{ width: `${Math.round(hud.reloadProgress * 100)}%` }}
              />
            </div>
          ) : null}
          <div className="flex items-center justify-between text-[10px] md:text-[11px] text-stone-300 gap-2">
            <span className="truncate max-w-[168px]">
              [{hud.activeSlot}] {lang === 'ar' ? weapon.nameAr : weapon.nameEn}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {hud.activeSlot <= 3 &&
                (hud.activeRail === 'flashlight' || hud.activeRail === 'laser') && (
                  <span
                    dir="ltr"
                    data-testid="hud-accessory-badge"
                    className={`px-1 py-0.2 text-[9px] font-mono-nums font-bold border ${
                      hud.accessoryActive
                        ? hud.activeRail === 'laser'
                          ? 'bg-red-600/90 text-white border-red-300'
                          : 'bg-amber-500 text-stone-950 border-amber-200'
                        : 'bg-stone-900 text-stone-400 border-stone-700'
                    }`}
                  >
                    [T] {hud.activeRail === 'laser' ? 'LASER' : 'LIGHT'}{' '}
                    {hud.accessoryActive ? t.accessoryOn : t.accessoryOff}
                  </span>
                )}
              <span dir="ltr" className="font-mono-nums text-amber-400">
                [G] {t.grenade} {hud.grenades}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
