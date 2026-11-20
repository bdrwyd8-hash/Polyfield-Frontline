import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Eye,
  Lock,
  RotateCcw,
  ShieldCheck,
  Unlock,
  Wrench,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import * as THREE from 'three';
import masterSheetImg from '../assets/images/attachments_master_sheet_1795169286950.jpg';
import opticsSheetImg from '../assets/images/attachments_optics_sheet_1795169288537.jpg';
import stocksGripsSheetImg from '../assets/images/attachments_stocks_grips_sheet_1795169286914.jpg';
import gearSheetImg from '../assets/images/attachments_tactical_gear_sheet_1795169287496.jpg';
import {
  type AttachmentOption,
  type CareerProgress,
  GRIP_OPTIONS,
  MAGAZINE_OPTIONS,
  MUZZLE_OPTIONS,
  OPTIC_OPTIONS,
  RAIL_OPTIONS,
  STOCK_OPTIONS,
  computeWeaponWithAttachments,
  getDefaultWeaponAttachmentLoadout,
  getWeaponMountCapabilities,
  isAttachmentUnlocked,
  sanitizeWeaponAttachmentLoadout,
} from '../game/attachments';
import { STRINGS } from '../game/i18n';
import { createFirstPersonWeaponRig } from '../game/models';
import { PRIMARY_WEAPON_IDS, SLOT2_WEAPON_IDS, WEAPONS } from '../game/rules';
import type {
  AttachmentCategory,
  Lang,
  WeaponAttachmentLoadout,
  WeaponCustomizationsMap,
  WeaponId,
} from '../game/types';
import { WeaponIllustration } from './WeaponIllustration';

interface WeaponCustomizerModalProps {
  lang: Lang;
  mode: 'gunsmith' | 'armory';
  initialWeaponId?: WeaponId;
  slot1Id: WeaponId;
  slot2Id: WeaponId;
  customizations: WeaponCustomizationsMap;
  career: CareerProgress;
  onSelectSlot1: (id: WeaponId) => void;
  onSelectSlot2: (id: WeaponId) => void;
  onChangeCustomizations: (next: WeaponCustomizationsMap) => void;
  onChangeCareer: (next: CareerProgress) => void;
  onClose: () => void;
}

const CUSTOMIZABLE_WEAPONS: WeaponId[] = Array.from(
  new Set<WeaponId>([...PRIMARY_WEAPON_IDS, ...SLOT2_WEAPON_IDS, 'm1911']),
);

const CATEGORIES: AttachmentCategory[] = [
  'optic',
  'stock',
  'grip',
  'muzzle',
  'rail',
  'magazine',
];

function disposeObjectTree(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
  });
}

export function WeaponCustomizerModal({
  lang,
  mode,
  initialWeaponId,
  slot1Id,
  slot2Id,
  customizations,
  career,
  onSelectSlot1,
  onSelectSlot2,
  onChangeCustomizations,
  onChangeCareer,
  onClose,
}: WeaponCustomizerModalProps) {
  const t = STRINGS[lang];
  const isRtl = lang === 'ar';

  const defaultWeapon =
    initialWeaponId && CUSTOMIZABLE_WEAPONS.includes(initialWeaponId)
      ? initialWeaponId
      : slot1Id;

  const [selectedWeaponId, setSelectedWeaponId] = useState<WeaponId>(defaultWeapon);
  const [viewTab, setViewTab] = useState<'3d' | 'ref'>('3d');
  const [activeCategory, setActiveCategory] = useState<AttachmentCategory>('optic');
  const [zoomDist, setZoomDist] = useState<number>(0.78);
  const [webglFailed, setWebglFailed] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const pivotRef = useRef<THREE.Group | null>(null);
  const rigGroupRef = useRef<THREE.Object3D | null>(null);
  const orbitRef = useRef({ yaw: -0.62, pitch: 0.16, zoom: 0.78, dragging: false, lastX: 0, lastY: 0 });
  const renderOnceRef = useRef<(() => void) | null>(null);

  const baseSpec = WEAPONS[selectedWeaponId];
  const rawLoadout = customizations[selectedWeaponId];
  const activeLoadout = useMemo(
    () => sanitizeWeaponAttachmentLoadout(selectedWeaponId, rawLoadout),
    [selectedWeaponId, rawLoadout],
  );
  const caps = useMemo(() => getWeaponMountCapabilities(selectedWeaponId), [selectedWeaponId]);
  const baseStats = useMemo(
    () => computeWeaponWithAttachments(baseSpec, getDefaultWeaponAttachmentLoadout(selectedWeaponId)),
    [baseSpec, selectedWeaponId],
  );
  const effectiveStats = useMemo(
    () => computeWeaponWithAttachments(baseSpec, activeLoadout),
    [baseSpec, activeLoadout],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  useEffect(() => {
    orbitRef.current.zoom = zoomDist;
    renderOnceRef.current?.();
  }, [zoomDist]);

  // Initialize Three.js 3D Preview Stage
  useEffect(() => {
    if (viewTab !== '3d') return;
    const container = stageRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const gl = renderer.getContext();
    let isSoftwareGl = false;
    try {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const rStr = dbg
        ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '')
        : String(gl.getParameter(gl.RENDERER) || '');
      isSoftwareGl = /swiftshader|llvmpipe|software|microsoft basic/i.test(rStr);
    } catch {
      isSoftwareGl = false;
    }

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const rect = container.getBoundingClientRect();
    const w = Math.max(240, rect.width || 480);
    const h = Math.max(180, rect.height || 260);
    renderer.setSize(w, h);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1b1e24);

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.04, 20);
    camera.position.set(0, 0.08, orbitRef.current.zoom);

    const hemi = new THREE.HemisphereLight(0xfffbeb, 0x292524, 1.75);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    keyLight.position.set(1.6, 2.4, 2.0);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.25);
    rimLight.position.set(-1.8, 1.1, -1.6);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xfde68a, 0.85);
    fillLight.position.set(0.2, -1.2, 1.6);
    scene.add(fillLight);

    // Subtle turntable floor ring
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x292524,
      transparent: true,
      opacity: 0.55,
      wireframe: true,
    });
    const floorRing = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.01, 24), floorMat);
    floorRing.position.y = -0.16;
    scene.add(floorRing);

    const pivot = new THREE.Group();
    scene.add(pivot);

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    pivotRef.current = pivot;

    const drawFrame = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !pivotRef.current) return;
      pivotRef.current.rotation.y = orbitRef.current.yaw;
      pivotRef.current.rotation.x = orbitRef.current.pitch;
      cameraRef.current.position.set(0, 0.04, orbitRef.current.zoom);
      cameraRef.current.lookAt(0, 0, 0);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    renderOnceRef.current = drawFrame;

    const ro = new ResizeObserver(() => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const r = container.getBoundingClientRect();
      const nw = Math.max(240, r.width);
      const nh = Math.max(180, r.height);
      cameraRef.current.aspect = nw / nh;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(nw, nh);
      drawFrame();
    });
    ro.observe(container);

    let animId = 0;
    let lastTime = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      if (!orbitRef.current.dragging) {
        orbitRef.current.yaw += dt * 0.28;
      }
      drawFrame();
      if (!isSoftwareGl) {
        animId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      // Single immediate frame + slow interval so headless Chromium stays snappy
      drawFrame();
      animId = window.setInterval(() => {
        if (!orbitRef.current.dragging) {
          orbitRef.current.yaw += 0.04;
        }
        drawFrame();
      }, 220);
    } else {
      animId = requestAnimationFrame(tick);
    }

    return () => {
      ro.disconnect();
      if (isSoftwareGl) {
        window.clearInterval(animId);
      } else {
        cancelAnimationFrame(animId);
      }
      renderOnceRef.current = null;
      if (rigGroupRef.current && pivotRef.current) {
        pivotRef.current.remove(rigGroupRef.current);
        disposeObjectTree(rigGroupRef.current);
        rigGroupRef.current = null;
      }
      disposeObjectTree(floorRing);
      renderer.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      pivotRef.current = null;
    };
  }, [viewTab]);

  // Rebuild 3D Weapon Mesh whenever selected weapon or attachments change
  useEffect(() => {
    if (viewTab !== '3d' || !pivotRef.current) return;
    if (rigGroupRef.current) {
      pivotRef.current.remove(rigGroupRef.current);
      disposeObjectTree(rigGroupRef.current);
      rigGroupRef.current = null;
    }

    const rig = createFirstPersonWeaponRig(selectedWeaponId, activeLoadout, {
      hideArms: true,
    });
    const effGroup = rig.accessoryEffectGroup;
    const effParent = effGroup?.parent ?? null;
    if (effGroup && effParent) {
      effParent.remove(effGroup);
    }
    const flash = rig.muzzleFlash;
    const flashParent = flash.parent;
    if (flashParent) {
      flashParent.remove(flash);
      disposeObjectTree(flash);
    }

    rig.root.rotation.set(0, Math.PI * 0.5, 0);
    rig.root.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(rig.root);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const maxDim = Math.max(0.22, size.x, size.y, size.z);
    const normScale = 0.78 / maxDim;

    if (effGroup && effParent && (activeLoadout.rail === 'laser' || activeLoadout.rail === 'flashlight')) {
      effGroup.visible = true;
      effGroup.scale.set(1, 1, 0.04);
      effParent.add(effGroup);
    }

    const wrapper = new THREE.Group();
    rig.root.position.sub(center);
    wrapper.add(rig.root);
    wrapper.scale.setScalar(normScale);

    pivotRef.current.add(wrapper);
    rigGroupRef.current = wrapper;
    renderOnceRef.current?.();
  }, [viewTab, selectedWeaponId, activeLoadout]);

  const getCategoryOptions = (cat: AttachmentCategory): AttachmentOption[] => {
    switch (cat) {
      case 'optic':
        return OPTIC_OPTIONS;
      case 'stock':
        return STOCK_OPTIONS;
      case 'grip':
        return GRIP_OPTIONS;
      case 'muzzle':
        return MUZZLE_OPTIONS;
      case 'rail':
        return RAIL_OPTIONS;
      case 'magazine':
        return MAGAZINE_OPTIONS;
    }
  };

  const isCategorySupported = (cat: AttachmentCategory): boolean => {
    switch (cat) {
      case 'optic':
        return caps.supportsOptic;
      case 'stock':
        return caps.supportsStock;
      case 'grip':
        return caps.supportsGrip;
      case 'muzzle':
        return caps.supportsMuzzle;
      case 'rail':
        return caps.supportsRail;
      case 'magazine':
        return caps.supportsMagazine;
    }
  };

  const getCategoryLabel = (cat: AttachmentCategory): string => {
    switch (cat) {
      case 'optic':
        return t.catOptic;
      case 'stock':
        return t.catStock;
      case 'grip':
        return t.catGrip;
      case 'muzzle':
        return t.catMuzzle;
      case 'rail':
        return t.catRail;
      case 'magazine':
        return t.catMagazine;
    }
  };

  const handleSelectAttachment = (cat: AttachmentCategory, opt: AttachmentOption) => {
    if (!isCategorySupported(cat)) return;
    if (cat === 'magazine' && opt.id === 'drum_mag' && !caps.supportsDrumMag) return;
    if (!isAttachmentUnlocked(opt, career)) return;

    const updated: WeaponAttachmentLoadout = {
      ...activeLoadout,
      [cat]: opt.id,
    };
    onChangeCustomizations({
      ...customizations,
      [selectedWeaponId]: sanitizeWeaponAttachmentLoadout(selectedWeaponId, updated),
    });
  };

  const handleResetWeapon = () => {
    const next = { ...customizations };
    delete next[selectedWeaponId];
    onChangeCustomizations(next);
  };

  const canEquipSlot1 = PRIMARY_WEAPON_IDS.includes(selectedWeaponId);
  const canEquipSlot2 = SLOT2_WEAPON_IDS.includes(selectedWeaponId);
  const isSlot1Equipped = slot1Id === selectedWeaponId;
  const isSlot2Equipped = slot2Id === selectedWeaponId;

  const baseRecoilScore = Math.round(Math.min(100, (0.008 / Math.max(0.004, baseStats.spec.recoilPitch)) * 55));
  const effRecoilScore = Math.round(Math.min(100, (0.008 / Math.max(0.004, effectiveStats.spec.recoilPitch)) * 55));
  const baseAccScore = Math.round(Math.min(100, (0.0018 / Math.max(0.0005, baseStats.spec.adsSpread)) * 52));
  const effAccScore = Math.round(Math.min(100, (0.0018 / Math.max(0.0005, effectiveStats.spec.adsSpread)) * 52));
  const effMobScore = Math.round(Math.min(100, effectiveStats.moveSpeedMult * 85));

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      data-testid="gunsmith-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/95"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'armory' ? t.armoryTitle : t.gunsmithTitle}
        className="w-full max-w-6xl h-[92vh] flex flex-col bg-stone-900 border border-stone-700 shadow-2xl overflow-hidden"
      >
        {/* Top Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-stone-800 bg-stone-950/85">
          <div className="flex items-center gap-2.5 min-w-0">
            <Wrench className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-bold tracking-wide text-stone-100 truncate">
                {mode === 'armory' ? t.armoryTitle : t.gunsmithTitle}
              </h2>
              <p className="text-[11px] text-stone-400 truncate hidden sm:block">
                {t.gunsmithSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex border border-stone-700 bg-stone-900">
              <button
                type="button"
                data-testid="tab-3d-inspect"
                onClick={() => setViewTab('3d')}
                className={`h-8 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  viewTab === '3d'
                    ? 'bg-amber-500 text-stone-950'
                    : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>{t.tab3dInspect}</span>
              </button>
              <button
                type="button"
                data-testid="tab-ref-guide"
                onClick={() => setViewTab('ref')}
                className={`h-8 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  viewTab === 'ref'
                    ? 'bg-amber-500 text-stone-950'
                    : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{t.tabRefGuide}</span>
              </button>
            </div>

            <button
              type="button"
              data-testid="btn-unlock-all-pass"
              onClick={() =>
                onChangeCareer({
                  ...career,
                  unlockAllPass: !career.unlockAllPass,
                })
              }
              className={`h-8 px-2.5 text-xs font-bold border flex items-center gap-1.5 cursor-pointer ${
                career.unlockAllPass
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-stone-800 text-amber-300 border-stone-600 hover:bg-stone-700'
              }`}
            >
              {career.unlockAllPass ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
              <span className="hidden md:inline">
                {career.unlockAllPass ? t.unlockAllPassActive : t.unlockAllPassBtn}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label={t.close}
              className="w-8 h-8 flex items-center justify-center bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {viewTab === 'ref' ? (
          <div
            data-testid="ref-guide-panel"
            className="flex-1 overflow-y-auto p-3 sm:p-4 bg-stone-950/75"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { src: masterSheetImg, title: t.refMasterTitle, testId: 'ref-img-master' },
                { src: opticsSheetImg, title: t.refOpticsTitle, testId: 'ref-img-optics' },
                { src: stocksGripsSheetImg, title: t.refStocksGripsTitle, testId: 'ref-img-stocks' },
                { src: gearSheetImg, title: t.refGearTitle, testId: 'ref-img-gear' },
              ].map((sheet) => (
                <div
                  key={sheet.testId}
                  className="bg-stone-900 border border-stone-700 p-2.5 flex flex-col gap-2"
                >
                  <div className="text-xs font-bold text-amber-300">{sheet.title}</div>
                  <div className="bg-stone-950 border border-stone-800 overflow-hidden">
                    <img
                      src={sheet.src}
                      alt={sheet.title}
                      data-testid={sheet.testId}
                      className="w-full h-56 sm:h-64 object-contain"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Sidebar: Weapon Selector */}
            <div className="w-full md:w-60 border-b md:border-b-0 md:border-e border-stone-800 bg-stone-950/80 flex md:flex-col overflow-x-auto md:overflow-y-auto shrink-0 p-2 gap-1.5">
              {CUSTOMIZABLE_WEAPONS.map((wId) => {
                const spec = WEAPONS[wId];
                const selected = selectedWeaponId === wId;
                const s1 = slot1Id === wId;
                const s2 = slot2Id === wId;
                return (
                  <button
                    key={wId}
                    type="button"
                    data-testid={`gunsmith-weapon-${wId}`}
                    onClick={() => setSelectedWeaponId(wId)}
                    className={`min-w-[155px] md:min-w-0 p-2 text-start border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      selected
                        ? 'bg-stone-100 text-stone-950 border-white'
                        : 'bg-stone-900 text-stone-200 border-stone-800 hover:bg-stone-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`shrink-0 border ${
                          selected ? 'bg-stone-200 border-stone-400' : 'bg-stone-950 border-stone-800'
                        }`}
                      >
                        <WeaponIllustration weaponId={wId} className="w-12 h-5" />
                      </div>
                      <span className="text-[11px] font-bold truncate">
                        {lang === 'ar' ? spec.nameAr : spec.nameEn}
                      </span>
                    </div>
                    {(s1 || s2) && (
                      <span
                        dir="ltr"
                        className={`text-[9px] font-mono-nums font-bold px-1 py-0.5 shrink-0 ${
                          s1 ? 'bg-amber-500 text-stone-950' : 'bg-sky-500 text-stone-950'
                        }`}
                      >
                        {s1 ? 'S1' : 'S2'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Center: 3D Turntable + Stats + Armory Slot Assignment */}
            <div className="flex-1 flex flex-col overflow-y-auto p-3 gap-3 bg-stone-900/95">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-base font-bold text-stone-100">
                    {lang === 'ar' ? baseSpec.nameAr : baseSpec.nameEn}
                  </div>
                  <div className="text-[11px] text-stone-400">
                    {lang === 'ar' ? baseSpec.roleAr : baseSpec.roleEn}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {canEquipSlot1 && (
                    <button
                      type="button"
                      data-testid="btn-assign-slot1"
                      onClick={() => onSelectSlot1(selectedWeaponId)}
                      className={`h-8 px-2.5 text-xs font-bold border cursor-pointer ${
                        isSlot1Equipped
                          ? 'bg-amber-500 text-stone-950 border-amber-300'
                          : 'bg-stone-800 text-stone-200 border-stone-600 hover:bg-stone-700'
                      }`}
                    >
                      {isSlot1Equipped ? `✓ ${t.slot1Label}` : t.slot1Label}
                    </button>
                  )}
                  {canEquipSlot2 && (
                    <button
                      type="button"
                      data-testid="btn-assign-slot2"
                      onClick={() => onSelectSlot2(selectedWeaponId)}
                      className={`h-8 px-2.5 text-xs font-bold border cursor-pointer ${
                        isSlot2Equipped
                          ? 'bg-sky-500 text-stone-950 border-sky-300'
                          : 'bg-stone-800 text-stone-200 border-stone-600 hover:bg-stone-700'
                      }`}
                    >
                      {isSlot2Equipped ? `✓ ${t.slot2Label}` : t.slot2Label}
                    </button>
                  )}
                </div>
              </div>

              {/* 3D Interactive Stage */}
              <div className="relative h-56 sm:h-64 border border-stone-700 bg-stone-950 overflow-hidden select-none">
                {webglFailed ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
                    <WeaponIllustration weaponId={selectedWeaponId} className="w-56 h-20" />
                    <span className="text-xs text-stone-400">
                      {lang === 'ar' ? baseSpec.nameAr : baseSpec.nameEn}
                    </span>
                  </div>
                ) : (
                  <div
                    ref={stageRef}
                    data-testid="gunsmith-3d-stage"
                    onPointerDown={(e) => {
                      orbitRef.current.dragging = true;
                      orbitRef.current.lastX = e.clientX;
                      orbitRef.current.lastY = e.clientY;
                      try {
                        e.currentTarget.setPointerCapture(e.pointerId);
                      } catch {
                        // ignore
                      }
                    }}
                    onPointerMove={(e) => {
                      if (!orbitRef.current.dragging) return;
                      const dx = e.clientX - orbitRef.current.lastX;
                      const dy = e.clientY - orbitRef.current.lastY;
                      orbitRef.current.lastX = e.clientX;
                      orbitRef.current.lastY = e.clientY;
                      orbitRef.current.yaw += dx * 0.012;
                      orbitRef.current.pitch = Math.max(
                        -0.65,
                        Math.min(0.65, orbitRef.current.pitch + dy * 0.008),
                      );
                      renderOnceRef.current?.();
                    }}
                    onPointerUp={() => {
                      orbitRef.current.dragging = false;
                    }}
                    onPointerCancel={() => {
                      orbitRef.current.dragging = false;
                    }}
                    onWheel={(e) => {
                      e.preventDefault();
                      setZoomDist((z) =>
                        Number(Math.max(0.48, Math.min(1.25, z + e.deltaY * 0.0007)).toFixed(2)),
                      );
                    }}
                    className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
                  />
                )}

                <div className="absolute top-2 left-2 px-2 py-0.5 bg-stone-950/85 border border-stone-700 text-[10px] text-stone-300 pointer-events-none">
                  {t.dragToRotateHint}
                </div>

                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Zoom In"
                    onClick={() => setZoomDist((z) => Math.max(0.48, Number((z - 0.1).toFixed(2))))}
                    className="w-7 h-7 flex items-center justify-center bg-stone-900/90 border border-stone-700 text-stone-200 hover:bg-stone-800 cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Zoom Out"
                    onClick={() => setZoomDist((z) => Math.min(1.25, Number((z + 0.1).toFixed(2))))}
                    className="w-7 h-7 flex items-center justify-center bg-stone-900/90 border border-stone-700 text-stone-200 hover:bg-stone-800 cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
                  <div className="flex flex-wrap gap-1">
                    {effectiveStats.suppressed && (
                      <span className="px-1.5 py-0.5 bg-emerald-950/90 border border-emerald-500/70 text-[10px] font-bold text-emerald-300">
                        SUPPRESSED
                      </span>
                    )}
                    {effectiveStats.hasLaser && (
                      <span className="px-1.5 py-0.5 bg-red-950/90 border border-red-500/70 text-[10px] font-bold text-red-300">
                        LASER [T]
                      </span>
                    )}
                    {effectiveStats.hasFlashlight && (
                      <span className="px-1.5 py-0.5 bg-amber-950/90 border border-amber-500/70 text-[10px] font-bold text-amber-300">
                        FLASHLIGHT [T]
                      </span>
                    )}
                  </div>
                  <div
                    dir="ltr"
                    className="px-2 py-0.5 bg-stone-950/90 border border-stone-700 font-mono-nums text-[11px] font-bold text-amber-300"
                  >
                    {effectiveStats.zoomLabel} · {effectiveStats.spec.magSize}/{effectiveStats.spec.reserveMax}
                  </div>
                </div>
              </div>

              {/* Computed Weapon Stat Delta Bars */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {
                    label: t.statRecoilCtrl,
                    val: effRecoilScore,
                    base: baseRecoilScore,
                  },
                  {
                    label: t.statAccuracy,
                    val: effAccScore,
                    base: baseAccScore,
                  },
                  {
                    label: t.statMobility,
                    val: effMobScore,
                    base: 85,
                  },
                  {
                    label: t.statMagCap,
                    val: Math.min(100, Math.round((effectiveStats.spec.magSize / 75) * 100)),
                    base: Math.min(100, Math.round((baseStats.spec.magSize / 75) * 100)),
                    textOverride: `${effectiveStats.spec.magSize}/${effectiveStats.spec.reserveMax}`,
                  },
                ].map((stat) => {
                  const delta = stat.val - stat.base;
                  return (
                    <div
                      key={stat.label}
                      className="bg-stone-950/85 border border-stone-800 p-2"
                    >
                      <div className="flex items-center justify-between text-[10px] text-stone-300 mb-1">
                        <span>{stat.label}</span>
                        <span
                          dir="ltr"
                          className={`font-mono-nums font-bold ${
                            delta > 0
                              ? 'text-emerald-400'
                              : delta < 0
                                ? 'text-red-400'
                                : 'text-amber-300'
                          }`}
                        >
                          {stat.textOverride ??
                            `${stat.val}${delta !== 0 ? ` (${delta > 0 ? `+${delta}` : delta})` : ''}`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-stone-800 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            delta >= 0 ? 'bg-amber-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${Math.max(8, Math.min(100, stat.val))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Category Tabs & Attachment Cards */}
              <div className="flex flex-wrap gap-1 border-b border-stone-800 pb-2">
                {CATEGORIES.map((cat) => {
                  const supported = isCategorySupported(cat);
                  const active = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      data-testid={`cat-${cat}`}
                      onClick={() => setActiveCategory(cat)}
                      className={`h-8 px-2.5 text-xs font-bold border cursor-pointer transition-colors ${
                        active
                          ? 'bg-amber-500 text-stone-950 border-amber-300'
                          : supported
                            ? 'bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700'
                            : 'bg-stone-900/60 text-stone-500 border-stone-800'
                      }`}
                    >
                      {getCategoryLabel(cat)}
                    </button>
                  );
                })}
              </div>

              {!isCategorySupported(activeCategory) ? (
                <div className="p-4 bg-stone-950/75 border border-stone-800 text-xs text-stone-400 text-center">
                  {t.unsupportedSlotMsg}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {getCategoryOptions(activeCategory).map((opt) => {
                    const drumUnsupported =
                      activeCategory === 'magazine' &&
                      opt.id === 'drum_mag' &&
                      !caps.supportsDrumMag;
                    const unlocked = isAttachmentUnlocked(opt, career);
                    const equipped = activeLoadout[activeCategory] === opt.id;
                    const disabled = drumUnsupported || !unlocked;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={disabled}
                        data-testid={`att-opt-${activeCategory}-${opt.id}`}
                        onClick={() => handleSelectAttachment(activeCategory, opt)}
                        className={`p-2.5 text-start border flex flex-col justify-between gap-1.5 transition-colors ${
                          equipped
                            ? 'bg-amber-500/20 border-amber-400 text-stone-100 cursor-pointer'
                            : disabled
                              ? 'bg-stone-950/60 border-stone-800 text-stone-500 cursor-not-allowed'
                              : 'bg-stone-950/90 border-stone-700 text-stone-200 hover:bg-stone-800 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold leading-snug">
                            {lang === 'ar' ? opt.nameAr : opt.nameEn}
                          </span>
                          {equipped ? (
                            <span className="px-1.5 py-0.5 bg-amber-500 text-stone-950 text-[9px] font-bold flex items-center gap-0.5 shrink-0">
                              <Check className="w-3 h-3" />
                              {t.equippedBadge}
                            </span>
                          ) : !unlocked ? (
                            <span className="px-1.5 py-0.5 bg-stone-800 border border-stone-700 text-stone-400 text-[9px] font-bold flex items-center gap-1 shrink-0">
                              <Lock className="w-2.5 h-2.5" />
                              {opt.unlockKills}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[10px] opacity-80 leading-relaxed">
                          {lang === 'ar' ? opt.descAr : opt.descEn}
                        </p>
                        {!unlocked && (
                          <div className="text-[10px] text-amber-400/85">
                            {t.unlockReqKills} {career.careerKills}/{opt.unlockKills}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-stone-800 bg-stone-950/90">
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="btn-reset-weapon"
              onClick={handleResetWeapon}
              className="h-9 px-3 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.resetWeaponBtn}</span>
            </button>
            <span dir="ltr" className="text-[11px] font-mono-nums text-stone-400 hidden sm:inline">
              {t.unlockReqKills} {career.careerKills}
            </span>
          </div>

          <button
            type="button"
            data-testid="btn-close-gunsmith"
            onClick={onClose}
            className="h-9 px-5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-display text-base font-bold tracking-wider border border-amber-300 cursor-pointer"
          >
            {t.applyChangesBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
