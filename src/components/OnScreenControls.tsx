import { useRef, useState } from 'react';
import { STRINGS } from '../game/i18n';
import type { HudControlId, HudControlTransform, HudSnapshot, KeyAction, Lang } from '../game/types';
import { TacticalControlIcon } from './ControlIcon';

interface OnScreenControlsProps {
  hud: HudSnapshot;
  lang: Lang;
  hudLayout: Record<HudControlId, HudControlTransform>;
  hudOpacity: number;
  onAction: (action: KeyAction, active: boolean) => void;
  onMove: (mx: number, my: number) => void;
  onAimDelta: (dx: number, dy: number) => void;
  onOpenBackpack: () => void;
  onDropBomb: () => void;
  onFireMissile: () => void;
  onDeployFlares: () => void;
}

export function OnScreenControls({
  hud,
  lang,
  hudLayout,
  hudOpacity,
  onAction,
  onMove,
  onAimDelta,
  onOpenBackpack,
  onDropBomb,
  onFireMissile,
  onDeployFlares,
}: OnScreenControlsProps) {
  const t = STRINGS[lang];
  const isAircraft = hud.inVehicleKind === 'aircraft';
  const isInfantry = !hud.inVehicleKind;
  const padRef = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);
  const firePointerRef = useRef<{ id: number; lastX: number; lastY: number } | null>(null);
  const [sprintToggled, setSprintToggled] = useState(false);
  const [peekSide, setPeekSide] = useState<'left' | 'right' | null>(null);

  const updateStick = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const maxR = rect.width * 0.36;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > maxR && len > 0) {
      dx = (dx / len) * maxR;
      dy = (dy / len) * maxR;
    }
    setKnob({ x: dx, y: dy });
    onMove(dx / maxR, -dy / maxR);
  };

  const resetStick = () => {
    activePointerId.current = null;
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };

  const triggerInstant = (action: KeyAction) => {
    onAction(action, true);
    window.setTimeout(() => onAction(action, false), 45);
  };

  const toggleSprint = () => {
    const next = !sprintToggled;
    setSprintToggled(next);
    onAction('sprint', next);
  };

  const togglePeek = (side: 'left' | 'right') => {
    if (peekSide === side) {
      setPeekSide(null);
      onAction(side === 'left' ? 'leanLeft' : 'leanRight', false);
    } else {
      if (peekSide === 'left') onAction('leanLeft', false);
      if (peekSide === 'right') onAction('leanRight', false);
      setPeekSide(side);
      onAction(side === 'left' ? 'leanLeft' : 'leanRight', true);
    }
  };

  const getStyle = (id: HudControlId) => {
    const tf = hudLayout[id];
    return {
      left: `${tf.xPct}%`,
      top: `${tf.yPct}%`,
      opacity: hudOpacity,
      transform: `translate(-50%, -50%) scale(${tf.scale})`,
    };
  };

  const iconBtnBase =
    'fixed pointer-events-auto select-none touch-none rounded-full border flex items-center justify-center transition-colors cursor-pointer shadow-md';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none">
      {/* Virtual Movement Joystick */}
      <div
        ref={padRef}
        style={getStyle('joystick')}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // ignore
          }
          activePointerId.current = e.pointerId;
          updateStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (activePointerId.current !== e.pointerId) return;
          updateStick(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (activePointerId.current !== e.pointerId) return;
          resetStick();
        }}
        onPointerCancel={resetStick}
        aria-label="Movement Pad"
        className="fixed pointer-events-auto touch-none w-20 h-20 rounded-full bg-stone-950/70 border-2 border-stone-500/80 flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <div className="w-8 h-8 rounded-full border border-stone-600/60" />
        <div
          className="absolute w-7 h-7 rounded-full bg-amber-500/90 border border-amber-300 shadow"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>

      {/* Infantry-only Posture, Peek, Slots, Jump, Reload, Grenade */}
      {isInfantry && (
        <>
          {/* Peek Left */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={t.peekLeftBtn}
        title={t.peekLeftBtn}
        data-testid="btn-peek-left"
        style={getStyle('peekLeft')}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          e.currentTarget.blur();
          togglePeek('left');
        }}
        className={`${iconBtnBase} w-10 h-10 ${
          peekSide === 'left' || hud.lean < -0.3
            ? 'bg-amber-500 text-stone-950 border-amber-300'
            : 'bg-stone-950/80 text-stone-100 border-stone-600/80 hover:bg-stone-800'
        }`}
      >
        <TacticalControlIcon id="peekLeft" className="w-5 h-5" />
      </button>

      {/* Peek Right */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={t.peekRightBtn}
        title={t.peekRightBtn}
        data-testid="btn-peek-right"
        style={getStyle('peekRight')}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          e.currentTarget.blur();
          togglePeek('right');
        }}
        className={`${iconBtnBase} w-10 h-10 ${
          peekSide === 'right' || hud.lean > 0.3
            ? 'bg-amber-500 text-stone-950 border-amber-300'
            : 'bg-stone-950/80 text-stone-100 border-stone-600/80 hover:bg-stone-800'
        }`}
      >
        <TacticalControlIcon id="peekRight" className="w-5 h-5" />
      </button>

      {/* Tactical Walk */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={t.walkBtn}
        title={t.walkBtn}
        data-testid="btn-walk"
        style={getStyle('walk')}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          e.currentTarget.blur();
          if (sprintToggled) {
            setSprintToggled(false);
            onAction('sprint', false);
          }
          triggerInstant('walk');
        }}
        className={`${iconBtnBase} w-10 h-10 ${
          hud.stance === 'walk'
            ? 'bg-amber-500 text-stone-950 border-amber-300'
            : 'bg-stone-950/80 text-stone-100 border-stone-600/80 hover:bg-stone-800'
        }`}
      >
        <TacticalControlIcon id="walk" className="w-5 h-5" />
      </button>

      {/* Sprint */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={t.sprintBtn}
        title={t.sprintBtn}
        data-testid="btn-sprint"
        style={getStyle('sprint')}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          e.currentTarget.blur();
          toggleSprint();
        }}
        className={`${iconBtnBase} w-10 h-10 ${
          sprintToggled || hud.stance === 'sprint'
            ? 'bg-emerald-500 text-stone-950 border-emerald-300'
            : 'bg-stone-950/80 text-stone-100 border-stone-600/80 hover:bg-stone-800'
        }`}
      >
        <TacticalControlIcon id="sprint" className="w-5 h-5" />
      </button>

      {/* Crouch */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={t.crouchBtn}
        title={t.crouchBtn}
        data-testid="btn-crouch"
        style={getStyle('crouch')}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          e.currentTarget.blur();
          triggerInstant('crouch');
        }}
        className={`${iconBtnBase} w-10 h-10 ${
          hud.stance === 'crouch'
            ? 'bg-amber-500 text-stone-950 border-amber-300'
            : 'bg-stone-950/80 text-stone-100 border-stone-600/80 hover:bg-stone-800'
        }`}
      >
        <TacticalControlIcon id="crouch" className="w-5 h-5" />
      </button>

      {/* Sit / Low Stance */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={t.proneBtn}
        title={t.proneBtn}
        data-testid="btn-prone"
        style={getStyle('prone')}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          e.currentTarget.blur();
          triggerInstant('prone');
        }}
        className={`${iconBtnBase} w-10 h-10 ${
          hud.stance === 'prone'
            ? 'bg-amber-500 text-stone-950 border-amber-300'
            : 'bg-stone-950/80 text-stone-100 border-stone-600/80 hover:bg-stone-800'
        }`}
      >
        <TacticalControlIcon id="prone" className="w-5 h-5" />
      </button>

      {/* Weapon & Gadget Slots [1] [2] [3] [4 Binoculars] [5 Shovel] */}
      <div
        dir="ltr"
        style={getStyle('slots')}
        className="fixed pointer-events-auto touch-none flex items-center gap-1 bg-stone-950/75 border border-stone-600/80 px-1 py-1 rounded-full"
      >
        {([1, 2, 3, 4, 5] as const).map((slot) => (
          <button
            key={slot}
            type="button"
            tabIndex={-1}
            data-testid={`btn-slot-${slot}`}
            aria-label={slot === 4 ? t.actions.slot4 : slot === 5 ? t.actions.slot5 : `${slot}`}
            title={slot === 4 ? t.actions.slot4 : slot === 5 ? t.actions.slot5 : undefined}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              e.currentTarget.blur();
              const act: KeyAction =
                slot === 1
                  ? 'slot1'
                  : slot === 2
                    ? 'slot2'
                    : slot === 3
                      ? 'slot3'
                      : slot === 4
                        ? 'slot4'
                        : 'slot5';
              triggerInstant(act);
            }}
            className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center cursor-pointer transition-colors ${
              hud.activeSlot === slot
                ? 'bg-amber-500 text-stone-950'
                : 'bg-stone-800/90 text-stone-200 hover:bg-stone-700'
            }`}
          >
            {slot === 4 ? (
              <TacticalControlIcon id="binoculars" className="w-4 h-4" />
            ) : slot === 5 ? (
              <TacticalControlIcon id="shovel" className="w-4 h-4" />
            ) : (
              slot
            )}
          </button>
        ))}
      </div>

      {/* Jump */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={t.jumpBtn}
        title={t.jumpBtn}
        data-testid="btn-jump"
        style={getStyle('jump')}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          e.currentTarget.blur();
          triggerInstant('jump');
        }}
        className={`${iconBtnBase} w-10 h-10 bg-stone-950/80 text-stone-100 border-stone-600/80 hover:bg-stone-800`}
      >
        <TacticalControlIcon id="jump" className="w-5 h-5" />
      </button>

      {/* Reload */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={t.reloadBtn}
        title={t.reloadBtn}
        data-testid="btn-reload"
        style={getStyle('reload')}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          e.currentTarget.blur();
          triggerInstant('reload');
        }}
        className={`${iconBtnBase} w-10 h-10 ${
          hud.isReloading
            ? 'bg-amber-500 text-stone-950 border-amber-300'
            : 'bg-stone-950/80 text-stone-100 border-stone-600/80 hover:bg-stone-800'
        }`}
      >
        <TacticalControlIcon id="reload" className="w-5 h-5" />
      </button>

      {/* Grenade */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={t.grenadeBtn}
        title={t.grenadeBtn}
        data-testid="btn-grenade"
        style={getStyle('grenade')}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          e.currentTarget.blur();
          triggerInstant('grenade');
        }}
        className={`${iconBtnBase} w-10 h-10 bg-stone-950/80 text-amber-300 border-stone-600/80 hover:bg-stone-800`}
      >
        <TacticalControlIcon id="grenade" className="w-5 h-5" />
      </button>
        </>
      )}

      {/* Aim / ADS (Infantry & Ground Vehicles) */}
      {!isAircraft && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={t.aimBtn}
          title={t.aimBtn}
          data-testid="btn-aim"
          style={getStyle('aim')}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            e.currentTarget.blur();
            triggerInstant('aim');
          }}
          className={`${iconBtnBase} w-12 h-12 ${
            hud.isAds
              ? 'bg-amber-500 text-stone-950 border-amber-300'
              : 'bg-stone-950/85 text-stone-100 border-stone-500 hover:bg-stone-800'
          }`}
        >
          <TacticalControlIcon id="aim" className="w-6 h-6" />
        </button>
      )}

      {/* Fire (Supports holding + dragging finger to aim while firing) */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={t.fireBtn}
        title={t.fireBtn}
        data-testid="btn-fire"
        style={getStyle('fire')}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // ignore
          }
          firePointerRef.current = {
            id: e.pointerId,
            lastX: e.clientX,
            lastY: e.clientY,
          };
          onAction('fire', true);
        }}
        onPointerMove={(e) => {
          const active = firePointerRef.current;
          if (!active || active.id !== e.pointerId) return;
          e.stopPropagation();
          const dx = e.clientX - active.lastX;
          const dy = e.clientY - active.lastY;
          active.lastX = e.clientX;
          active.lastY = e.clientY;
          if (dx !== 0 || dy !== 0) {
            onAimDelta(dx, dy);
          }
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          e.currentTarget.blur();
          if (firePointerRef.current?.id === e.pointerId) {
            firePointerRef.current = null;
          }
          onAction('fire', false);
        }}
        onPointerCancel={(e) => {
          if (firePointerRef.current?.id === e.pointerId) {
            firePointerRef.current = null;
          }
          onAction('fire', false);
        }}
        className={`${iconBtnBase} w-14 h-14 bg-red-600/90 hover:bg-red-500 active:bg-red-400 text-white border-red-300 shadow-xl`}
      >
        <TacticalControlIcon id="fire" className="w-7 h-7" />
      </button>

      {/* Backpack Quick Access Button */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={t.backpackBtn}
        title={t.backpackBtn}
        data-testid="btn-backpack"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          e.currentTarget.blur();
          onOpenBackpack();
        }}
        style={{ left: '21%', top: '38%', opacity: hudOpacity }}
        className={`${iconBtnBase} w-10 h-10 -translate-x-1/2 -translate-y-1/2 bg-stone-950/85 text-emerald-300 border-emerald-500/70 hover:bg-stone-800`}
      >
        <TacticalControlIcon id="backpack" className="w-5 h-5" />
        <span
          dir="ltr"
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-mono-nums font-bold flex items-center justify-center border border-stone-950"
        >
          {hud.backpackMedkits}
        </span>
      </button>

      {/* Contextual Enter / Exit Vehicle or Aircraft Parachute Bailout Button */}
      {(hud.nearbyVehicleKind || hud.inVehicleKind) && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={t.vehicleBtn}
          title={t.vehicleBtn}
          data-testid="btn-vehicle"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            e.currentTarget.blur();
            triggerInstant('interact');
          }}
          style={{
            left: isAircraft ? '59%' : '61%',
            top: isAircraft ? '72%' : '74%',
            opacity: hudOpacity,
          }}
          className={`${iconBtnBase} w-11 h-11 -translate-x-1/2 -translate-y-1/2 ${
            isAircraft
              ? 'bg-sky-500 text-stone-950 border-sky-200'
              : hud.inVehicleKind
                ? 'bg-amber-500 text-stone-950 border-amber-200'
                : 'bg-emerald-600/95 text-white border-emerald-300'
          }`}
        >
          <TacticalControlIcon id={isAircraft ? 'eject' : 'vehicle'} className="w-5 h-5" />
        </button>
      )}

      {/* Contextual Aircraft Climb / Dive / Bomb / IR Missile / Flare Controls */}
      {isAircraft && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Climb"
            data-testid="btn-pitch-up"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              e.currentTarget.blur();
              onAction('leanLeft', true);
            }}
            onPointerUp={() => onAction('leanLeft', false)}
            onPointerCancel={() => onAction('leanLeft', false)}
            style={{ left: '79%', top: '31%', opacity: hudOpacity }}
            className={`${iconBtnBase} w-10 h-10 -translate-x-1/2 -translate-y-1/2 bg-sky-700/90 text-white border-sky-300 text-xs font-bold`}
          >
            ▲
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Dive"
            data-testid="btn-pitch-down"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              e.currentTarget.blur();
              onAction('leanRight', true);
            }}
            onPointerUp={() => onAction('leanRight', false)}
            onPointerCancel={() => onAction('leanRight', false)}
            style={{ left: '79%', top: '48%', opacity: hudOpacity }}
            className={`${iconBtnBase} w-10 h-10 -translate-x-1/2 -translate-y-1/2 bg-sky-700/90 text-white border-sky-300 text-xs font-bold`}
          >
            ▼
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label={t.dropBombBtn}
            title={t.dropBombBtn}
            data-testid="btn-drop-bomb"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              e.currentTarget.blur();
              onDropBomb();
            }}
            style={{ left: '69%', top: '39%', opacity: hudOpacity }}
            className={`${iconBtnBase} w-11 h-11 -translate-x-1/2 -translate-y-1/2 ${
              hud.aircraftBombs > 0
                ? 'bg-amber-600/95 text-white border-amber-300'
                : 'bg-stone-900/80 text-stone-500 border-stone-700'
            }`}
          >
            <TacticalControlIcon id="bomb" className="w-5 h-5" />
            <span
              dir="ltr"
              className="absolute -bottom-1 -right-1 px-1 rounded-full bg-stone-950 text-amber-300 text-[9px] font-mono-nums font-bold border border-amber-500"
            >
              {hud.aircraftBombs}
            </span>
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label={t.fireMissileBtn}
            title={t.fireMissileBtn}
            data-testid="btn-fire-missile"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              e.currentTarget.blur();
              onFireMissile();
            }}
            style={{ left: '90%', top: '32%', opacity: hudOpacity }}
            className={`${iconBtnBase} w-11 h-11 -translate-x-1/2 -translate-y-1/2 ${
              hud.aircraftLockActive && hud.aircraftMissiles > 0
                ? 'bg-red-600 text-white border-red-200 animate-pulse'
                : hud.aircraftMissiles > 0
                  ? 'bg-sky-600/95 text-white border-sky-200'
                  : 'bg-stone-900/80 text-stone-500 border-stone-700'
            }`}
          >
            <TacticalControlIcon id="missile" className="w-5 h-5" />
            <span
              dir="ltr"
              className="absolute -bottom-1 -right-1 px-1 rounded-full bg-stone-950 text-sky-300 text-[9px] font-mono-nums font-bold border border-sky-400"
            >
              {hud.aircraftMissiles}
            </span>
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label={t.flareBtn}
            title={t.flareBtn}
            data-testid="btn-flare"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              e.currentTarget.blur();
              onDeployFlares();
            }}
            style={{ left: '71%', top: '61%', opacity: hudOpacity }}
            className={`${iconBtnBase} w-11 h-11 -translate-x-1/2 -translate-y-1/2 ${
              hud.aircraftThreatWarning === 'missile' && hud.aircraftFlares > 0
                ? 'bg-amber-500 text-stone-950 border-amber-100 animate-pulse'
                : hud.aircraftFlares > 0
                  ? 'bg-orange-600/95 text-white border-orange-300'
                  : 'bg-stone-900/80 text-stone-500 border-stone-700'
            }`}
          >
            <TacticalControlIcon id="flare" className="w-5 h-5" />
            <span
              dir="ltr"
              className="absolute -bottom-1 -right-1 px-1 rounded-full bg-stone-950 text-orange-300 text-[9px] font-mono-nums font-bold border border-orange-400"
            >
              {hud.aircraftFlares}
            </span>
          </button>
        </>
      )}

      {/* Contextual Base Armory [B] Button */}
      {hud.nearArmory && isInfantry && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={t.armoryBtn}
          title={t.armoryBtn}
          data-testid="btn-armory"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            e.currentTarget.blur();
            triggerInstant('armory');
          }}
          style={{ left: '60%', top: '39%', opacity: hudOpacity }}
          className={`${iconBtnBase} w-11 h-11 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-stone-950 border-amber-200`}
        >
          <TacticalControlIcon id="armory" className="w-5 h-5" />
        </button>
      )}

      {/* Contextual Flashlight / Laser Toggle [T] */}
      {hud.activeSlot <= 3 &&
        isInfantry &&
        (hud.activeRail === 'flashlight' || hud.activeRail === 'laser') && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={t.actions.toggleAccessory}
            title={t.actions.toggleAccessory}
            data-testid="btn-accessory"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              e.currentTarget.blur();
              triggerInstant('toggleAccessory');
            }}
            style={{ left: '84%', top: '42%', opacity: hudOpacity }}
            className={`${iconBtnBase} w-10 h-10 -translate-x-1/2 -translate-y-1/2 ${
              hud.accessoryActive
                ? hud.activeRail === 'laser'
                  ? 'bg-red-600 text-white border-red-300'
                  : 'bg-amber-400 text-stone-950 border-amber-200'
                : 'bg-stone-950/85 text-stone-200 border-stone-600'
            }`}
          >
            <TacticalControlIcon id="accessory" className="w-5 h-5" />
          </button>
        )}
    </div>
  );
}
