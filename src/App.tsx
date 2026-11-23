import { useEffect, useRef, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { BackpackModal } from './components/BackpackModal';
import { GameHud } from './components/GameHud';
import { HudLayoutEditor } from './components/HudLayoutEditor';
import { OnScreenControls } from './components/OnScreenControls';
import { SettingsModal } from './components/SettingsModal';
import { StatusModal } from './components/StatusModal';
import { TitleOverlay } from './components/TitleOverlay';
import { WeaponCustomizerModal } from './components/WeaponCustomizerModal';
import {
  type CareerProgress,
  loadCareerProgress,
  loadWeaponCustomizations,
  saveCareerProgress,
  saveWeaponCustomizations,
} from './game/attachments';
import { PolyfieldEngine } from './game/engine';
import { STRINGS } from './game/i18n';
import {
  MAX_PLAYER_FOXHOLES,
  MAX_TICKETS,
  MATCH_DURATION_SECONDS,
  PRIMARY_WEAPON_IDS,
  SLOT2_WEAPON_IDS,
  createInitialZones,
} from './game/rules';
import { loadControlSettings, saveControlSettings } from './game/settings';
import type {
  ControlSettings,
  GameMode,
  HudSnapshot,
  KeyAction,
  Lang,
  MapId,
  Team,
  WeaponCustomizationsMap,
  WeaponId,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  mapId: 'forest',
  gameMode: 'conquest',
  loadoutId: 'rifleman',
  playerTeam: 'allies',
  isOnline: false,
  onlineStatus: 'offline',
  onlineRoomCode: 'FRONTLINE',
  onlinePlayerCount: 0,
  health: 100,
  maxHealth: 100,
  stamina: 100,
  stance: 'stand',
  lean: 0,
  weaponId: 'm1_garand',
  slot1Id: 'm1_garand',
  slot2Id: 'bazooka',
  secondaryId: 'm1911',
  activeSlot: 1,
  activeOptic: 'iron',
  activeMuzzle: 'none',
  activeRail: 'none',
  accessoryActive: false,
  magAmmo: 8,
  magMax: 8,
  reserveAmmo: 72,
  grenades: 2,
  foxholesUsed: 0,
  foxholesMax: MAX_PLAYER_FOXHOLES,
  isReloading: false,
  reloadProgress: 0,
  isAds: false,
  isBinocularsActive: false,
  showAimArrow: false,
  nearResupply: false,
  nearArmory: false,
  outOfAmmo: false,
  resupplyFlash: false,
  crosshairSpread: 6,
  aimArrowX: 0,
  aimArrowY: 0,
  aimTargetDist: 60,
  alliesTickets: MAX_TICKETS,
  axisTickets: MAX_TICKETS,
  maxTickets: MAX_TICKETS,
  timeRemaining: MATCH_DURATION_SECONDS,
  zones: createInitialZones('forest'),
  activeZoneId: null,
  kills: 0,
  deaths: 0,
  captures: 0,
  score: 0,
  shotsFired: 0,
  shotsHit: 0,
  hitmarkerKind: 'none',
  damageFlashAlpha: 0,
  damageDirectionRad: null,
  pointerLocked: false,
  muted: false,
  playerX: -192,
  playerZ: 66,
  playerYaw: 0,
  minimapActors: [],
  killFeed: [],
  winner: null,
  matchElapsed: 0,
  respawnTimer: 0,
  killcam: null,
  nearbyVehicleKind: null,
  inVehicleKind: null,
  vehicleHp: 0,
  vehicleMaxHp: 0,
  vehicleSpeedKmh: 0,
  vehicleAmmo: 0,
  vehicleAltitudeM: 0,
  vehicleReticleX: 0,
  vehicleReticleY: 0,
  vehicleReticleVisible: false,
  aircraftBombs: 2,
  aircraftBombsMax: 2,
  aircraftMissiles: 2,
  aircraftMissilesMax: 2,
  aircraftFlares: 4,
  aircraftFlaresMax: 4,
  aircraftThrottlePct: 75,
  aircraftLockActive: false,
  aircraftLockTargetName: null,
  aircraftThreatWarning: 'none',
  flightAimX: 0,
  flightAimY: 0,
  isParachuting: false,
  parachuteAltitudeM: 0,
  backpackMedkits: 2,
  backpackMedkitsMax: 2,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<PolyfieldEngine | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [lang, setLang] = useState<Lang>('ar');
  const [settings, setSettings] = useState<ControlSettings>(() => loadControlSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hudEditorOpen, setHudEditorOpen] = useState(false);
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [customizerMode, setCustomizerMode] = useState<'gunsmith' | 'armory' | null>(null);
  const [customizations, setCustomizations] = useState<WeaponCustomizationsMap>(() =>
    loadWeaponCustomizations(),
  );
  const [career, setCareer] = useState<CareerProgress>(() => loadCareerProgress());
  const openedEditorFromPlayRef = useRef(false);
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [dismissedPortrait, setDismissedPortrait] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [roomCode, setRoomCode] = useState('FRONTLINE');
  const [callsign, setCallsign] = useState('Soldier');
  const [preferredTeam, setPreferredTeam] = useState<Team | null>(null);

  // Detect portrait mobile orientation to encourage landscape play
  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 820;
      setIsPortraitMobile(portrait);
      if (!portrait) setDismissedPortrait(false);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const initialSettings = loadControlSettings();
    const engine = new PolyfieldEngine(
      container,
      (snapshot) => {
        setHud(snapshot);
      },
      initialSettings,
    );
    engine.setWeaponCustomizations(loadWeaponCustomizations());
    engine.setCareerProgress(loadCareerProgress());
    engine.setOnArmoryRequest(() => {
      setCareer(loadCareerProgress());
      setCustomizerMode('armory');
    });
    engineRef.current = engine;

    const params = new URLSearchParams(window.location.search);
    const mapParam = params.get('map') as MapId | null;
    if (
      mapParam === 'forest' ||
      mapParam === 'desert' ||
      mapParam === 'normandy' ||
      mapParam === 'stalingrad'
    ) {
      engine.setMap(mapParam);
    }
    const modeParam = params.get('mode') as GameMode | null;
    if (modeParam === 'conquest' || modeParam === 'tdm' || modeParam === 'hardcore') {
      engine.setGameMode(modeParam);
    }
    const slot1Param = params.get('slot1') as WeaponId | null;
    if (slot1Param && PRIMARY_WEAPON_IDS.includes(slot1Param)) {
      engine.setPrimaryWeapon(slot1Param);
    }
    const slot2Param = params.get('slot2') as WeaponId | null;
    if (slot2Param && SLOT2_WEAPON_IDS.includes(slot2Param)) {
      engine.setSlot2Weapon(slot2Param);
    }
    const roomParam = params.get('room');
    const onlineParam = params.get('online');
    if (roomParam || onlineParam === '1') {
      const cleanRoom =
        (roomParam ?? 'FRONTLINE').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 14) ||
        'FRONTLINE';
      setIsOnline(true);
      setRoomCode(cleanRoom);
      engine.setOnlineConfig(true, cleanRoom, 'Soldier', null);
    }
    if (params.get('autostart') === '1') {
      engine.startGame();
      const boardParam = params.get('board');
      if (boardParam === 'aircraft' || boardParam === 'jeep' || boardParam === 'tank') {
        engine.boardTeamVehicle(boardParam);
      }
    }

    return () => {
      engine.setOnArmoryRequest(null);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (hud.phase !== 'title' || settingsOpen || customizerMode !== null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        engineRef.current?.startGame();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hud.phase, settingsOpen, customizerMode]);

  useEffect(() => {
    if (hud.phase !== 'playing') {
      setBackpackOpen(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (settingsOpen || hudEditorOpen || customizerMode !== null) return;
      if (e.code === settings.bindings.backpack) {
        e.preventDefault();
        setBackpackOpen((prev) => {
          const next = !prev;
          if (next) {
            try {
              document.exitPointerLock?.();
            } catch {
              // ignore
            }
          }
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hud.phase, settings.bindings.backpack, settingsOpen, hudEditorOpen, customizerMode]);

  const handleEnterLandscape = async () => {
    try {
      await document.documentElement.requestFullscreen?.();
      const orientation = screen.orientation as { lock?: (mode: string) => Promise<void> } | undefined;
      await orientation?.lock?.('landscape');
    } catch {
      // Browser may block orientation lock outside mobile PWA/fullscreen
    }
    setDismissedPortrait(true);
  };

  const handleSettingsChange = (next: ControlSettings) => {
    setSettings(next);
    saveControlSettings(next);
    engineRef.current?.setControlSettings(next);
  };

  const handleCustomizationsChange = (next: WeaponCustomizationsMap) => {
    setCustomizations(next);
    saveWeaponCustomizations(next);
    engineRef.current?.setWeaponCustomizations(next);
  };

  const handleCareerChange = (next: CareerProgress) => {
    setCareer(next);
    saveCareerProgress(next);
    engineRef.current?.setCareerProgress(next);
  };

  const handleCloseCustomizer = () => {
    const wasArmory = customizerMode === 'armory';
    setCustomizerMode(null);
    if (wasArmory) {
      engineRef.current?.resumeGame();
    }
  };

  const handleOpenSettings = () => {
    if (hud.phase === 'playing') {
      engineRef.current?.pauseGame();
    }
    openedEditorFromPlayRef.current = false;
    setHudEditorOpen(false);
    setSettingsOpen(true);
  };

  const handleOpenHudEditor = () => {
    const fromPlay = hud.phase === 'playing';
    openedEditorFromPlayRef.current = fromPlay;
    if (fromPlay) {
      engineRef.current?.pauseGame();
    }
    setSettingsOpen(false);
    setHudEditorOpen(true);
  };

  const handleCloseHudEditor = () => {
    setHudEditorOpen(false);
    if (openedEditorFromPlayRef.current) {
      openedEditorFromPlayRef.current = false;
      engineRef.current?.resumeGame();
    }
  };

  const handleStart = () => {
    // Attempt non-blocking landscape lock on mobile when starting match
    try {
      const orientation = screen.orientation as { lock?: (mode: string) => Promise<void> } | undefined;
      void orientation?.lock?.('landscape')?.catch(() => {});
    } catch {
      // ignore
    }
    engineRef.current?.startGame();
  };

  const handleOpenBackpack = () => {
    try {
      document.exitPointerLock?.();
    } catch {
      // ignore
    }
    setBackpackOpen(true);
  };

  const handleSelectMap = (m: MapId) => engineRef.current?.setMap(m);
  const handleSelectGameMode = (gm: GameMode) => engineRef.current?.setGameMode(gm);
  const handleSelectSlot1 = (w: WeaponId) => engineRef.current?.setPrimaryWeapon(w);
  const handleSelectSlot2 = (w: WeaponId) => engineRef.current?.setSlot2Weapon(w);
  const handleToggleMute = () => engineRef.current?.toggleMute();
  const handlePause = () => engineRef.current?.pauseGame();
  const handleResume = () => engineRef.current?.resumeGame();
  const handleTitle = () => engineRef.current?.returnToTitle();
  const handleVirtualAction = (action: KeyAction, active: boolean) =>
    engineRef.current?.setVirtualAction(action, active);
  const handleVirtualMove = (mx: number, my: number) =>
    engineRef.current?.setVirtualMove(mx, my);
  const handleVirtualAimDelta = (dx: number, dy: number) =>
    engineRef.current?.addVirtualLook(dx, dy);
  const handleUseMedkit = () => engineRef.current?.useMedkit() ?? false;
  const handleDropBomb = () => engineRef.current?.dropAircraftBomb();
  const handleFireMissile = () => engineRef.current?.fireAircraftMissile();
  const handleDeployFlares = () => engineRef.current?.deployAircraftFlares();
  const handleSelectSlot = (slot: 1 | 2 | 3 | 4 | 5) => {
    const act: KeyAction = `slot${slot}` as KeyAction;
    engineRef.current?.setVirtualAction(act, true);
    window.setTimeout(() => engineRef.current?.setVirtualAction(act, false), 45);
  };

  const syncOnlineConfig = (
    nextOnline: boolean,
    nextRoom: string,
    nextCallsign: string,
    nextTeam: Team | null,
  ) => {
    engineRef.current?.setOnlineConfig(nextOnline, nextRoom, nextCallsign, nextTeam);
  };

  const t = STRINGS[lang];

  return (
    <div className="relative w-full h-full overflow-hidden bg-stone-950">
      <div
        ref={mountRef}
        data-testid="game-viewport"
        className="w-full h-full"
      />

      {hud.phase === 'title' && (
        <TitleOverlay
          lang={lang}
          mapId={hud.mapId}
          gameMode={hud.gameMode}
          slot1Id={hud.slot1Id}
          slot2Id={hud.slot2Id}
          muted={hud.muted}
          isOnline={isOnline}
          roomCode={roomCode}
          callsign={callsign}
          preferredTeam={preferredTeam}
          onToggleLang={() => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'))}
          onToggleMute={handleToggleMute}
          onOpenSettings={handleOpenSettings}
          onOpenGunsmith={() => {
            setCareer(loadCareerProgress());
            setCustomizerMode('gunsmith');
          }}
          onSelectMap={handleSelectMap}
          onSelectGameMode={handleSelectGameMode}
          onSelectSlot1={handleSelectSlot1}
          onSelectSlot2={handleSelectSlot2}
          onChangeOnline={(enabled) => {
            setIsOnline(enabled);
            syncOnlineConfig(enabled, roomCode, callsign, preferredTeam);
          }}
          onChangeRoomCode={(code) => {
            setRoomCode(code);
            syncOnlineConfig(isOnline, code, callsign, preferredTeam);
          }}
          onChangeCallsign={(name) => {
            setCallsign(name);
            syncOnlineConfig(isOnline, roomCode, name, preferredTeam);
          }}
          onChangePreferredTeam={(tm) => {
            setPreferredTeam(tm);
            syncOnlineConfig(isOnline, roomCode, callsign, tm);
          }}
          onStart={handleStart}
        />
      )}

      {hud.phase === 'playing' && (
        <>
          <GameHud
            hud={hud}
            lang={lang}
            onToggleMute={handleToggleMute}
            onPause={handlePause}
            onOpenSettings={handleOpenSettings}
            onOpenHudEditor={handleOpenHudEditor}
            onOpenBackpack={handleOpenBackpack}
          />
          {hud.health > 0 && settings.showOnScreenControls && (
            <OnScreenControls
              hud={hud}
              lang={lang}
              hudLayout={settings.hudLayout}
              hudOpacity={settings.hudOpacity}
              onAction={handleVirtualAction}
              onMove={handleVirtualMove}
              onAimDelta={handleVirtualAimDelta}
              onOpenBackpack={handleOpenBackpack}
              onDropBomb={handleDropBomb}
              onFireMissile={handleFireMissile}
              onDeployFlares={handleDeployFlares}
            />
          )}
        </>
      )}

      {(hud.phase === 'paused' || hud.phase === 'gameover') &&
        !settingsOpen &&
        !hudEditorOpen &&
        customizerMode === null && (
          <StatusModal
            hud={hud}
            lang={lang}
            onResume={handleResume}
            onRestart={handleStart}
            onTitle={handleTitle}
            onOpenSettings={handleOpenSettings}
          />
        )}

      {settingsOpen && (
        <SettingsModal
          lang={lang}
          settings={settings}
          onChange={handleSettingsChange}
          onOpenHudEditor={handleOpenHudEditor}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {hudEditorOpen && (
        <HudLayoutEditor
          lang={lang}
          settings={settings}
          onChange={handleSettingsChange}
          onClose={handleCloseHudEditor}
        />
      )}

      {customizerMode !== null && (
        <WeaponCustomizerModal
          lang={lang}
          mode={customizerMode}
          initialWeaponId={
            hud.activeSlot === 2 ? hud.slot2Id : hud.activeSlot === 3 ? hud.secondaryId : hud.slot1Id
          }
          slot1Id={hud.slot1Id}
          slot2Id={hud.slot2Id}
          customizations={customizations}
          career={career}
          onSelectSlot1={handleSelectSlot1}
          onSelectSlot2={handleSelectSlot2}
          onChangeCustomizations={handleCustomizationsChange}
          onChangeCareer={handleCareerChange}
          onClose={handleCloseCustomizer}
        />
      )}

      {backpackOpen && hud.phase === 'playing' && (
        <BackpackModal
          lang={lang}
          hud={hud}
          customizations={customizations}
          onUseMedkit={handleUseMedkit}
          onSelectSlot={handleSelectSlot}
          onClose={() => setBackpackOpen(false)}
        />
      )}

      {/* Landscape Orientation Guard on narrow portrait mobile screens */}
      {isPortraitMobile && !dismissedPortrait && (
        <div
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-950/96 text-center"
        >
          <div className="max-w-sm bg-stone-900 border border-stone-700 p-6 shadow-2xl space-y-4">
            <Smartphone className="w-12 h-12 text-amber-400 mx-auto rotate-90" />
            <h2 className="font-display text-2xl font-bold text-stone-100">
              {t.rotateTitle}
            </h2>
            <p className="text-xs text-stone-300 leading-relaxed">
              {t.rotateDesc}
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleEnterLandscape}
                className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm cursor-pointer"
              >
                {t.enterLandscapeBtn}
              </button>
              <button
                type="button"
                onClick={() => setDismissedPortrait(true)}
                className="w-full h-9 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs border border-stone-600 cursor-pointer"
              >
                {t.continueAnywayBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
