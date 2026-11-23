import type {
  AttachmentCategory,
  GripAttachmentId,
  MagazineAttachmentId,
  MuzzleAttachmentId,
  OpticAttachmentId,
  RailAttachmentId,
  StockAttachmentId,
  WeaponAttachmentLoadout,
  WeaponCustomizationsMap,
  WeaponId,
  WeaponSpec,
} from './types';

const CUSTOMIZATIONS_STORAGE_KEY = 'polyfield_frontline_weapon_attachments_v1';
const CAREER_PROGRESS_KEY = 'polyfield_frontline_career_v1';

export interface AttachmentOption<T extends string = string> {
  id: T;
  category: AttachmentCategory;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  unlockKills: number;
  recoilMult: number;
  spreadMult: number;
  adsFovOverride?: number;
  zoomLabel?: string;
  magMult?: number;
  reloadMult?: number;
  moveSpeedMult?: number;
  suppressed?: boolean;
}

export const OPTIC_OPTIONS: AttachmentOption<OpticAttachmentId>[] = [
  {
    id: 'iron',
    category: 'optic',
    nameEn: 'Iron Sights',
    nameAr: 'تصويب حديدي قياسي',
    descEn: 'Unobstructed peripheral view with classic steel posts',
    descAr: 'رؤية محيطية واضحة مع شعيرات الحديد القياسية',
    unlockKills: 0,
    recoilMult: 1.0,
    spreadMult: 1.0,
    zoomLabel: '1.0×',
  },
  {
    id: 'red_dot',
    category: 'optic',
    nameEn: 'Red Dot Reflex',
    nameAr: 'منظار النقطة الحمراء (Red Dot)',
    descEn: 'Illuminated red dot reflex lens for rapid CQB acquisition',
    descAr: 'عدسة عاكسة سريعة بنقطة حمراء مضيئة للاشتباك القريب',
    unlockKills: 0,
    recoilMult: 0.98,
    spreadMult: 0.92,
    adsFovOverride: 54,
    zoomLabel: '1.2×',
  },
  {
    id: 'holo',
    category: 'optic',
    nameEn: 'Holographic Sight',
    nameAr: 'منظار هولوغرافي (Holographic)',
    descEn: 'Wide-window holographic reticle ring for moving targets',
    descAr: 'نافذة رؤية عريضة بحلقة هولوغرافية لتتبع الأهداف المتحركة',
    unlockKills: 0,
    recoilMult: 0.96,
    spreadMult: 0.88,
    adsFovOverride: 50,
    zoomLabel: '1.4×',
  },
  {
    id: 'optic_2x',
    category: 'optic',
    nameEn: '2× Tactical Prism',
    nameAr: 'منظار 2x تكتيكي',
    descEn: 'Compact 2× prism glass balancing close and mid engagements',
    descAr: 'منظار منشوري مدمج بتقريب 2x للقتال المتوسط والقريب',
    unlockKills: 0,
    recoilMult: 0.95,
    spreadMult: 0.84,
    adsFovOverride: 38,
    zoomLabel: '2.0×',
  },
  {
    id: 'optic_3x',
    category: 'optic',
    nameEn: '3× Magnifier Optic',
    nameAr: 'منظار 3x متوسط',
    descEn: 'Sharp 3× intermediate magnification for rifle squads',
    descAr: 'تقريب واضح 3x مثالي للبنادق الهجومية في الميدان المفتوح',
    unlockKills: 4,
    recoilMult: 0.94,
    spreadMult: 0.78,
    adsFovOverride: 29,
    zoomLabel: '3.0×',
  },
  {
    id: 'scope_4x',
    category: 'optic',
    nameEn: '4× ACOG Combat Scope',
    nameAr: 'منظار 4x قتالي (ACOG)',
    descEn: 'Rugged military 4× illuminated chevron prism scope',
    descAr: 'منظار عسكري متين بتقريب 4x مع شبكة مسافة باليستية',
    unlockKills: 8,
    recoilMult: 0.92,
    spreadMult: 0.72,
    adsFovOverride: 22,
    zoomLabel: '4.0×',
  },
  {
    id: 'scope_6x',
    category: 'optic',
    nameEn: '6× Marksman Scope',
    nameAr: 'منظار 6x للقنص المتوسط',
    descEn: 'Variable elevation turret sniper optic for long sightlines',
    descAr: 'منظار قنص احترافي 6x بأبراج معايرة للمسافات البعيدة',
    unlockKills: 14,
    recoilMult: 0.94,
    spreadMult: 0.65,
    adsFovOverride: 15,
    zoomLabel: '6.0×',
  },
  {
    id: 'scope_8x',
    category: 'optic',
    nameEn: '8× Long-Range Precision',
    nameAr: 'منظار 8x بعيد المدى',
    descEn: 'Full sunshade precision mil-dot telescope for extreme distance',
    descAr: 'تلسكوب قنص فائق المدى 8x مع حاجب شمس وشبكة ميل-دوت',
    unlockKills: 20,
    recoilMult: 0.96,
    spreadMult: 0.56,
    adsFovOverride: 10.5,
    zoomLabel: '8.0×',
  },
];

export const STOCK_OPTIONS: AttachmentOption<StockAttachmentId>[] = [
  {
    id: 'standard',
    category: 'stock',
    nameEn: 'Standard Stock',
    nameAr: 'الأخمص القياسي',
    descEn: 'Factory balanced wood or polymer buttstock',
    descAr: 'الأخمص الأصلي المتوازن للسلاح',
    unlockKills: 0,
    recoilMult: 1.0,
    spreadMult: 1.0,
    moveSpeedMult: 1.0,
  },
  {
    id: 'adjustable',
    category: 'stock',
    nameEn: 'Adjustable Carbine Stock',
    nameAr: 'أخمص قابل للتعديل',
    descEn: '6-position telescoping buffer stock improving stability',
    descAr: 'أخمص تلسكوبي متعدد الوضعيات يحسن الثبات والتصويب',
    unlockKills: 0,
    recoilMult: 0.88,
    spreadMult: 0.92,
    moveSpeedMult: 1.02,
  },
  {
    id: 'compact',
    category: 'stock',
    nameEn: 'Compact Wire PDW Stock',
    nameAr: 'أخمص مدمج خفيف',
    descEn: 'Minimal folding skeleton frame for fastest movement',
    descAr: 'إطار مدمج خفيف الوزن لسرعة حركة والتفاف أعلى',
    unlockKills: 3,
    recoilMult: 1.06,
    spreadMult: 1.02,
    moveSpeedMult: 1.08,
  },
  {
    id: 'heavy',
    category: 'stock',
    nameEn: 'Heavy Precision Stock',
    nameAr: 'أخمص ثقيل عالي الثبات',
    descEn: 'Reinforced cheek-riser stock cutting vertical recoil',
    descAr: 'أخمص مدعوم بمسند خد يقلل الارتداد بشكل ملحوظ',
    unlockKills: 7,
    recoilMult: 0.74,
    spreadMult: 0.84,
    moveSpeedMult: 0.94,
  },
  {
    id: 'tactical',
    category: 'stock',
    nameEn: 'Tactical Modular Stock',
    nameAr: 'أخمص تكتيكي احترافي',
    descEn: 'Carbon-polymer ergonomic cheek weld for elite control',
    descAr: 'أخمص تكتيكي مريح يجمع بين دقة الإطلاق وخفة التحريك',
    unlockKills: 12,
    recoilMult: 0.8,
    spreadMult: 0.86,
    moveSpeedMult: 1.01,
  },
];

export const GRIP_OPTIONS: AttachmentOption<GripAttachmentId>[] = [
  {
    id: 'standard',
    category: 'grip',
    nameEn: 'Standard Handguard',
    nameAr: 'قبضة أمامية قياسية',
    descEn: 'Classic ribbed handguard with natural balance',
    descAr: 'الحاضن القياسي المتوازن للسلاح',
    unlockKills: 0,
    recoilMult: 1.0,
    spreadMult: 1.0,
  },
  {
    id: 'vertical',
    category: 'grip',
    nameEn: 'Vertical Foregrip',
    nameAr: 'قبضة عمودية (Vertical Grip)',
    descEn: 'Full polymer vertical grip taming sustained recoil',
    descAr: 'قبضة عمودية تخفف ارتداد الإطلاق المتواصل',
    unlockKills: 0,
    recoilMult: 0.82,
    spreadMult: 0.9,
  },
  {
    id: 'angled',
    category: 'grip',
    nameEn: 'Angled Foregrip',
    nameAr: 'قبضة مائلة (Angled Grip)',
    descEn: 'Low-profile angled thumb-over grip speeding target transitions',
    descAr: 'قبضة مائلة تسرّع الانتقال بين الأهداف وتقلل التشتت',
    unlockKills: 6,
    recoilMult: 0.88,
    spreadMult: 0.8,
    moveSpeedMult: 1.02,
  },
  {
    id: 'compact',
    category: 'grip',
    nameEn: 'Compact Handstop',
    nameAr: 'قبضة مدمجة (Compact Grip)',
    descEn: 'Minimalist handstop boosting CQB agility',
    descAr: 'مسند يد مدمج يمنح رشاقة عالية في الاشتباك القريب',
    unlockKills: 10,
    recoilMult: 0.92,
    spreadMult: 0.86,
    moveSpeedMult: 1.05,
  },
];

export const MUZZLE_OPTIONS: AttachmentOption<MuzzleAttachmentId>[] = [
  {
    id: 'none',
    category: 'muzzle',
    nameEn: 'Standard Muzzle',
    nameAr: 'فوهة قياسية',
    descEn: 'Unmodified factory barrel crown',
    descAr: 'فوهة السبطانة الأصلية بدون كاتم',
    unlockKills: 0,
    recoilMult: 1.0,
    spreadMult: 1.0,
  },
  {
    id: 'suppressor',
    category: 'muzzle',
    nameEn: 'Tactical Suppressor',
    nameAr: 'كاتم الصوت التكتيكي (Suppressor)',
    descEn: 'Muffles gunshot sound signature, hides flash & softens recoil',
    descAr: 'يكتم صوت الطلقات ويخفي الوميض ويخفف الارتداد',
    unlockKills: 5,
    recoilMult: 0.86,
    spreadMult: 0.9,
    suppressed: true,
  },
];

export const RAIL_OPTIONS: AttachmentOption<RailAttachmentId>[] = [
  {
    id: 'none',
    category: 'rail',
    nameEn: 'Clean Rail',
    nameAr: 'بدون ملحقات سكة',
    descEn: 'Lightweight bare barrel shroud',
    descAr: 'سكة خفيفة بدون ملحقات إضافية',
    unlockKills: 0,
    recoilMult: 1.0,
    spreadMult: 1.0,
  },
  {
    id: 'flashlight',
    category: 'rail',
    nameEn: 'Tactical Flashlight [T]',
    nameAr: 'كشاف تكتيكي [T]',
    descEn: 'High-lumen rail light illuminating dark rooms & smoke',
    descAr: 'كشاف تكتيكي قوي يضيء الغرف المظلمة والمخابئ (زر T)',
    unlockKills: 0,
    recoilMult: 0.98,
    spreadMult: 0.96,
  },
  {
    id: 'tactical_rail',
    category: 'rail',
    nameEn: 'Quad Tactical Rail',
    nameAr: 'سكة تكتيكية متكاملة',
    descEn: 'Reinforced Picatinny handguard cage improving barrel harmonics',
    descAr: 'سكة بيكاتيني رباعية تزيد ثبات السبطانة',
    unlockKills: 2,
    recoilMult: 0.92,
    spreadMult: 0.9,
  },
  {
    id: 'laser',
    category: 'rail',
    nameEn: 'PEQ Laser Module [T]',
    nameAr: 'مؤشر ليزر تكتيكي [T]',
    descEn: 'Visible laser beam projecting exact hipfire point-of-impact',
    descAr: 'شعاع ليزر تكتيكي يضاعف دقة الرمي بدون منظار (زر T)',
    unlockKills: 9,
    recoilMult: 0.95,
    spreadMult: 0.68,
  },
];

export const MAGAZINE_OPTIONS: AttachmentOption<MagazineAttachmentId>[] = [
  {
    id: 'standard_mag',
    category: 'magazine',
    nameEn: 'Standard Magazine',
    nameAr: 'مخزن قياسي',
    descEn: 'Standard factory ammunition capacity & fast reload',
    descAr: 'السعة القياسية للذخيرة مع سرعة تعبئة طبيعية',
    unlockKills: 0,
    recoilMult: 1.0,
    spreadMult: 1.0,
    magMult: 1.0,
    reloadMult: 1.0,
  },
  {
    id: 'extended_mag',
    category: 'magazine',
    nameEn: 'Extended Magazine (+50%)',
    nameAr: 'مخزن موسع (+50%)',
    descEn: 'Increases magazine capacity by 50% for sustained firefights',
    descAr: 'يزيد سعة المخزن بنسبة 50% لمواجهات أطول بدون تعبئة',
    unlockKills: 0,
    recoilMult: 1.02,
    spreadMult: 1.0,
    magMult: 1.5,
    reloadMult: 1.15,
  },
  {
    id: 'drum_mag',
    category: 'magazine',
    nameEn: 'High-Cap Drum Magazine',
    nameAr: 'مخزن أسطواني كبير (Drum)',
    descEn: 'Double-drum high capacity magazine for heavy suppression',
    descAr: 'مخزن أسطواني ضخم يضاعف الذخيرة للسيطرة النارية',
    unlockKills: 11,
    recoilMult: 1.05,
    spreadMult: 1.04,
    magMult: 2.2,
    reloadMult: 1.35,
    moveSpeedMult: 0.95,
  },
];

export interface WeaponMountCapabilities {
  supportsOptic: boolean;
  supportsStock: boolean;
  supportsGrip: boolean;
  supportsMuzzle: boolean;
  supportsRail: boolean;
  supportsMagazine: boolean;
  supportsDrumMag: boolean;
  defaultOptic: OpticAttachmentId;
}

export function getWeaponMountCapabilities(weaponId: WeaponId): WeaponMountCapabilities {
  if (weaponId === 'binoculars' || weaponId === 'shovel') {
    return {
      supportsOptic: false,
      supportsStock: false,
      supportsGrip: false,
      supportsMuzzle: false,
      supportsRail: false,
      supportsMagazine: false,
      supportsDrumMag: false,
      defaultOptic: 'iron',
    };
  }
  if (weaponId === 'rpg7' || weaponId === 'bazooka' || weaponId === 'panzerschreck') {
    return {
      supportsOptic: true,
      supportsStock: false,
      supportsGrip: false,
      supportsMuzzle: false,
      supportsRail: false,
      supportsMagazine: false,
      supportsDrumMag: false,
      defaultOptic: 'iron',
    };
  }
  if (weaponId === 'm1911') {
    return {
      supportsOptic: true,
      supportsStock: false,
      supportsGrip: false,
      supportsMuzzle: true,
      supportsRail: true,
      supportsMagazine: true,
      supportsDrumMag: false,
      defaultOptic: 'iron',
    };
  }
  if (weaponId === 'kar98k' || weaponId === 'springfield' || weaponId === 'm1_garand') {
    return {
      supportsOptic: true,
      supportsStock: true,
      supportsGrip: true,
      supportsMuzzle: true,
      supportsRail: true,
      supportsMagazine: true,
      supportsDrumMag: false,
      defaultOptic: weaponId === 'springfield' ? 'scope_4x' : 'iron',
    };
  }
  // Full modern/assault modular platform (M4A1, AK-47, StG-44, BAR, PPSh-41, Thompson, MP40)
  return {
    supportsOptic: true,
    supportsStock: true,
    supportsGrip: true,
    supportsMuzzle: true,
    supportsRail: true,
    supportsMagazine: true,
    supportsDrumMag: true,
    defaultOptic: weaponId === 'm4a1' ? 'holo' : 'iron',
  };
}

export function getDefaultWeaponAttachmentLoadout(weaponId: WeaponId): WeaponAttachmentLoadout {
  const caps = getWeaponMountCapabilities(weaponId);
  return {
    optic: caps.defaultOptic,
    stock: 'standard',
    grip: 'standard',
    muzzle: 'none',
    rail: 'none',
    magazine: 'standard_mag',
  };
}

export function sanitizeWeaponAttachmentLoadout(
  weaponId: WeaponId,
  raw?: Partial<WeaponAttachmentLoadout>,
): WeaponAttachmentLoadout {
  const caps = getWeaponMountCapabilities(weaponId);
  const def = getDefaultWeaponAttachmentLoadout(weaponId);
  if (!raw) return def;

  const validOptic = OPTIC_OPTIONS.some((o) => o.id === raw.optic) ? raw.optic! : def.optic;
  const validStock = STOCK_OPTIONS.some((o) => o.id === raw.stock) ? raw.stock! : def.stock;
  const validGrip = GRIP_OPTIONS.some((o) => o.id === raw.grip) ? raw.grip! : def.grip;
  const validMuzzle = MUZZLE_OPTIONS.some((o) => o.id === raw.muzzle) ? raw.muzzle! : def.muzzle;
  const validRail = RAIL_OPTIONS.some((o) => o.id === raw.rail) ? raw.rail! : def.rail;
  let validMag = MAGAZINE_OPTIONS.some((o) => o.id === raw.magazine) ? raw.magazine! : def.magazine;
  if (!caps.supportsDrumMag && validMag === 'drum_mag') {
    validMag = 'extended_mag';
  }

  return {
    optic: caps.supportsOptic ? validOptic : 'iron',
    stock: caps.supportsStock ? validStock : 'standard',
    grip: caps.supportsGrip ? validGrip : 'standard',
    muzzle: caps.supportsMuzzle ? validMuzzle : 'none',
    rail: caps.supportsRail ? validRail : 'none',
    magazine: caps.supportsMagazine ? validMag : 'standard_mag',
  };
}

export interface EffectiveWeaponStats {
  spec: WeaponSpec;
  loadout: WeaponAttachmentLoadout;
  suppressed: boolean;
  hasFlashlight: boolean;
  hasLaser: boolean;
  moveSpeedMult: number;
  zoomLabel: string;
}

export function computeWeaponWithAttachments(
  baseSpec: WeaponSpec,
  rawLoadout?: Partial<WeaponAttachmentLoadout>,
): EffectiveWeaponStats {
  const loadout = sanitizeWeaponAttachmentLoadout(baseSpec.id, rawLoadout);
  const optic = OPTIC_OPTIONS.find((o) => o.id === loadout.optic) ?? OPTIC_OPTIONS[0];
  const stock = STOCK_OPTIONS.find((o) => o.id === loadout.stock) ?? STOCK_OPTIONS[0];
  const grip = GRIP_OPTIONS.find((o) => o.id === loadout.grip) ?? GRIP_OPTIONS[0];
  const muzzle = MUZZLE_OPTIONS.find((o) => o.id === loadout.muzzle) ?? MUZZLE_OPTIONS[0];
  const rail = RAIL_OPTIONS.find((o) => o.id === loadout.rail) ?? RAIL_OPTIONS[0];
  const mag = MAGAZINE_OPTIONS.find((o) => o.id === loadout.magazine) ?? MAGAZINE_OPTIONS[0];

  const recoilMult =
    optic.recoilMult *
    stock.recoilMult *
    grip.recoilMult *
    muzzle.recoilMult *
    rail.recoilMult *
    (mag.recoilMult ?? 1);

  const spreadMult =
    optic.spreadMult *
    stock.spreadMult *
    grip.spreadMult *
    muzzle.spreadMult *
    rail.spreadMult *
    (mag.spreadMult ?? 1);

  const hipSpreadMult = loadout.rail === 'laser' ? spreadMult * 0.65 : spreadMult;

  const magMult = mag.magMult ?? 1;
  const computedMagSize =
    baseSpec.magSize <= 1
      ? baseSpec.magSize
      : Math.max(
          baseSpec.magSize,
          loadout.magazine === 'extended_mag' && baseSpec.magSize <= 8
            ? baseSpec.magSize + 3
            : Math.round(baseSpec.magSize * magMult),
        );
  const reserveScale = computedMagSize / Math.max(1, baseSpec.magSize);
  const computedReserve = Math.round(baseSpec.reserveMax * Math.max(1, reserveScale));

  const moveSpeedMult =
    (stock.moveSpeedMult ?? 1) * (grip.moveSpeedMult ?? 1) * (mag.moveSpeedMult ?? 1);

  const adsFov = optic.adsFovOverride
    ? Math.min(baseSpec.adsFov, optic.adsFovOverride)
    : baseSpec.adsFov;

  return {
    spec: {
      ...baseSpec,
      magSize: computedMagSize,
      reserveMax: computedReserve,
      reloadTime: Number((baseSpec.reloadTime * (mag.reloadMult ?? 1)).toFixed(2)),
      hipSpread: Number((baseSpec.hipSpread * hipSpreadMult).toFixed(5)),
      adsSpread: Number((baseSpec.adsSpread * spreadMult).toFixed(5)),
      recoilPitch: Number((baseSpec.recoilPitch * recoilMult).toFixed(5)),
      recoilYaw: Number((baseSpec.recoilYaw * recoilMult).toFixed(5)),
      adsFov,
    },
    loadout,
    suppressed: Boolean(muzzle.suppressed),
    hasFlashlight: loadout.rail === 'flashlight',
    hasLaser: loadout.rail === 'laser',
    moveSpeedMult,
    zoomLabel: optic.zoomLabel ?? '1.0×',
  };
}

export interface CareerProgress {
  careerKills: number;
  unlockAllPass: boolean;
}

export function loadCareerProgress(): CareerProgress {
  if (typeof window === 'undefined') {
    return { careerKills: 0, unlockAllPass: false };
  }
  try {
    const raw = window.localStorage.getItem(CAREER_PROGRESS_KEY);
    if (!raw) return { careerKills: 0, unlockAllPass: false };
    const parsed = JSON.parse(raw) as Partial<CareerProgress>;
    return {
      careerKills: typeof parsed.careerKills === 'number' ? Math.max(0, parsed.careerKills) : 0,
      unlockAllPass: Boolean(parsed.unlockAllPass),
    };
  } catch {
    return { careerKills: 0, unlockAllPass: false };
  }
}

export function saveCareerProgress(progress: CareerProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CAREER_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

export function isAttachmentUnlocked(opt: AttachmentOption, career: CareerProgress): boolean {
  return career.unlockAllPass || career.careerKills >= opt.unlockKills;
}

export function loadWeaponCustomizations(): WeaponCustomizationsMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(CUSTOMIZATIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as WeaponCustomizationsMap;
    const out: WeaponCustomizationsMap = {};
    for (const [key, val] of Object.entries(parsed)) {
      const wId = key as WeaponId;
      out[wId] = sanitizeWeaponAttachmentLoadout(wId, val);
    }
    return out;
  } catch {
    return {};
  }
}

export function saveWeaponCustomizations(map: WeaponCustomizationsMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CUSTOMIZATIONS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}
