import type { HudControlId, KeyAction, Lang } from './types';

export const STRINGS: Record<
  Lang,
  {
    subtitle: string;
    deploy: string;
    settings: string;
    mapLabel: string;
    forest: string;
    desert: string;
    normandy: string;
    stalingrad: string;
    modeLabel: string;
    conquest: string;
    tdm: string;
    hardcore: string;
    slot1Label: string;
    slot2Label: string;
    slot3Label: string;
    gadgetsBadge: string;
    controlsHint: string;
    allies: string;
    axis: string;
    hp: string;
    ammo: string;
    grenade: string;
    reloading: string;
    paused: string;
    resume: string;
    restart: string;
    mainMenu: string;
    victory: string;
    defeat: string;
    draw: string;
    playAgain: string;
    eliminations: string;
    captures: string;
    score: string;
    accuracy: string;
    time: string;
    respawning: string;
    clickToLock: string;
    capturing: string;
    contested: string;
    stand: string;
    walk: string;
    crouch: string;
    prone: string;
    sprint: string;
    mute: string;
    pause: string;
    fireBtn: string;
    aimBtn: string;
    walkBtn: string;
    sprintBtn: string;
    crouchBtn: string;
    proneBtn: string;
    jumpBtn: string;
    peekLeftBtn: string;
    peekRightBtn: string;
    reloadBtn: string;
    grenadeBtn: string;
    settingsTitle: string;
    pressAnyKey: string;
    resetDefaults: string;
    close: string;
    mouseSensLabel: string;
    adsSensLabel: string;
    fovLabel: string;
    onScreenControlsLabel: string;
    showAimArrowLabel: string;
    graphicsQualityLabel: string;
    graphicsLow: string;
    graphicsMedium: string;
    graphicsHigh: string;
    keybindsSection: string;
    customizeHudBtn: string;
    hudEditorTitle: string;
    buttonSizeLabel: string;
    buttonOpacityLabel: string;
    saveLayoutBtn: string;
    resetLayoutBtn: string;
    rotateTitle: string;
    rotateDesc: string;
    enterLandscapeBtn: string;
    continueAnywayBtn: string;
    outOfAmmoMsg: string;
    resupplyMsg: string;
    binocularsHint: string;
    shovelHint: string;
    playModeOffline: string;
    playModeOnline: string;
    roomCodeLabel: string;
    callsignLabel: string;
    copyInviteBtn: string;
    copiedInviteBtn: string;
    teamSelectLabel: string;
    teamAuto: string;
    onlinePlayersBadge: string;
    aimAssistLabel: string;
    enterJeep: string;
    enterTank: string;
    enterAircraft: string;
    exitVehicle: string;
    vehicleBtn: string;
    jeepName: string;
    tankName: string;
    aircraftName: string;
    aircraftControlsHint: string;
    targetFpsLabel: string;
    fps60: string;
    fps120: string;
    fpsMax: string;
    gunsmithBtn: string;
    gunsmithTitle: string;
    gunsmithSubtitle: string;
    tab3dInspect: string;
    tabRefGuide: string;
    catOptic: string;
    catStock: string;
    catGrip: string;
    catMuzzle: string;
    catRail: string;
    catMagazine: string;
    statDamage: string;
    statRecoilCtrl: string;
    statAccuracy: string;
    statMobility: string;
    statMagCap: string;
    statOpticZoom: string;
    unlockedLabel: string;
    lockedLabel: string;
    unlockReqKills: string;
    unlockAllPassBtn: string;
    unlockAllPassActive: string;
    equippedBadge: string;
    unsupportedSlotMsg: string;
    resetWeaponBtn: string;
    applyChangesBtn: string;
    armoryPrompt: string;
    armoryBtn: string;
    armoryTitle: string;
    killcamKilledBy: string;
    killcamDistance: string;
    killcamHeadshot: string;
    accessoryOn: string;
    accessoryOff: string;
    refMasterTitle: string;
    refOpticsTitle: string;
    refStocksGripsTitle: string;
    refGearTitle: string;
    dragToRotateHint: string;
    actions: Record<KeyAction, string>;
    controlNames: Record<HudControlId, string>;
  }
> = {
  ar: {
    subtitle: 'معركة السيطرة الواسعة · فيزياء باليستية واقعية',
    deploy: 'انطلاق للمعركة',
    settings: 'الإعدادات والتحكم',
    mapLabel: 'ساحة القتال',
    forest: 'غابات الآردين',
    desert: 'صحراء العلمين',
    normandy: 'وادي نورماندي',
    stalingrad: 'أطلال ستالينغراد',
    modeLabel: 'وضع اللعب',
    conquest: 'السيطرة الكاملة',
    tdm: 'معركة الفرق',
    hardcore: 'الواقعية القصوى',
    slot1Label: 'السلاح الأساسي 1',
    slot2Label: 'السلاح الأساسي 2 / القاذفة',
    slot3Label: 'المسدس: Colt 1911',
    gadgetsBadge: 'منظار يدوي (4) · مجرفة حفر (5)',
    controlsHint:
      'اسحب الشاشة للتصويب · 1/2/3 أسلحة · 4 منظار استطلاع · 5 مجرفة حفر خنادق',
    allies: 'الحلفاء',
    axis: 'المحور',
    hp: 'الصحة',
    ammo: 'الذخيرة',
    grenade: 'قنبلة',
    reloading: 'إعادة تعبئة...',
    paused: 'توقف تكتيكي',
    resume: 'استئناف القتال',
    restart: 'إعادة المعركة',
    mainMenu: 'القائمة الرئيسية',
    victory: 'نصر ساحق للحلفاء',
    defeat: 'سقوط الجبهة',
    draw: 'تعادل تكتيكي',
    playAgain: 'معركة جديدة',
    eliminations: 'الإصابات',
    captures: 'احتلال المواقع',
    score: 'النقاط',
    accuracy: 'الدقة',
    time: 'المدة',
    respawning: 'إعادة انتشار خلال',
    clickToLock: 'اسحب الشاشة لتحريك التصويب',
    capturing: 'جارٍ السيطرة على الموقع',
    contested: 'منطقة متنازع عليها',
    stand: 'وقوف',
    walk: 'مشي هادئ',
    crouch: 'انحناء',
    prone: 'جلوس منخفض',
    sprint: 'ركض',
    mute: 'كتم الصوت',
    pause: 'إيقاف مؤقت',
    fireBtn: 'إطلاق النار',
    aimBtn: 'تصويب',
    walkBtn: 'مشي',
    sprintBtn: 'ركض',
    crouchBtn: 'انحناء',
    proneBtn: 'جلوس',
    jumpBtn: 'قفز',
    peekLeftBtn: 'نظرة يسار',
    peekRightBtn: 'نظرة يمين',
    reloadBtn: 'تعبئة',
    grenadeBtn: 'قنبلة',
    settingsTitle: 'إعدادات التحكم والرسومات',
    pressAnyKey: 'اضغط أي زر...',
    resetDefaults: 'استعادة الافتراضي',
    close: 'حفظ وإغلاق',
    mouseSensLabel: 'حساسية التصويب',
    adsSensLabel: 'حساسية المنظار',
    fovLabel: 'مجال الرؤية (FOV)',
    onScreenControlsLabel: 'إظهار أزرار التحكم على الشاشة',
    showAimArrowLabel: 'إظهار سهم المسافة الباليستي',
    graphicsQualityLabel: 'جودة الرسومات',
    graphicsLow: 'منخفضة',
    graphicsMedium: 'متوسطة',
    graphicsHigh: 'عالية',
    keybindsSection: 'تخصيص أزرار لوحة المفاتيح',
    customizeHudBtn: 'تخصيص أماكن وحجم الأزرار',
    hudEditorTitle: 'اسحب أي زر لتغيير مكانه واضغط عليه لتغيير حجمه',
    buttonSizeLabel: 'حجم الزر',
    buttonOpacityLabel: 'شفافية الأزرار',
    saveLayoutBtn: 'حفظ التخصيص',
    resetLayoutBtn: 'إعادة توزيع',
    rotateTitle: 'الوضع الأفقي مطلوب للعب',
    rotateDesc: 'أدر هاتفك بالعرض أو اضغط الزر بالأسفل للدخول بالوضع الأفقي الكامل.',
    enterLandscapeBtn: 'تفعيل الوضع الأفقي (ملء الشاشة)',
    continueAnywayBtn: 'متابعة على أية حال',
    outOfAmmoMsg: 'نفذت الذخيرة! ارجع لقاعدة الحلفاء أو صندوق الإمداد للتزود',
    resupplyMsg: 'تم التزود بالذخيرة والإسعافات من القاعدة',
    binocularsHint: 'منظار استطلاع (ممنوع إطلاق النار · للاستطلاع فقط)',
    shovelHint: 'وجّه نقطة الحفر على الأرض واضغط الإطلاق لحفر خندق في أي مكان',
    playModeOffline: 'لعب فردي (ضد الروبوتات)',
    playModeOnline: 'لعب أونلاين (جماعي)',
    roomCodeLabel: 'رمز الغرفة',
    callsignLabel: 'اسمك بالمعركة',
    copyInviteBtn: 'نسخ رابط الدعوة',
    copiedInviteBtn: 'تم نسخ الرابط!',
    teamSelectLabel: 'الفريق',
    teamAuto: 'تلقائي',
    onlinePlayersBadge: 'متصل بالغرفة',
    aimAssistLabel: 'مساعد التصويب الخفيف',
    enterJeep: 'اضغط [X] أو زر المركبة لقيادة السيارة القتالية',
    enterTank: 'اضغط [X] أو زر المركبة لقيادة الدبابة',
    enterAircraft: 'اضغط [X] أو زر المركبة لقيادة الطائرة الحربية',
    exitVehicle: 'مغادرة [X]',
    vehicleBtn: 'مركبة',
    jeepName: 'سيارة قتالية مدرعة',
    tankName: 'دبابة قتال ثقيلة',
    aircraftName: 'مقاتلة حربية',
    aircraftControlsHint: 'W/S سرعة · A/D انعطاف · Q/E أو سحب للشاشة صعود/هبوط · إطلاق نار',
    targetFpsLabel: 'معدل الإطارات (FPS)',
    fps60: '60 FPS',
    fps120: '120 FPS',
    fpsMax: 'مفتوح (Max)',
    gunsmithBtn: 'تخصيص الأسلحة والإضافات (Gunsmith)',
    gunsmithTitle: 'ورشة تخصيص الأسلحة الاحترافية',
    gunsmithSubtitle: 'ركّب المناظير والأخمصات والقبضات وكاتم الصوت والمخازن وشاهدها ثلاثية الأبعاد',
    tab3dInspect: 'معاينة وتعديل 3D',
    tabRefGuide: 'دليل الأشكال والمرجع البصري',
    catOptic: 'المناظير',
    catStock: 'الأخمص (Stock)',
    catGrip: 'القبضة (Grip)',
    catMuzzle: 'الفوهة / الكاتم',
    catRail: 'الكشاف والليزر والسكة',
    catMagazine: 'المخازن',
    statDamage: 'الضرر',
    statRecoilCtrl: 'ثبات الارتداد',
    statAccuracy: 'الدقة',
    statMobility: 'خفة الحركة',
    statMagCap: 'سعة المخزن',
    statOpticZoom: 'التقريب',
    unlockedLabel: 'متوفر',
    lockedLabel: 'مقفل',
    unlockReqKills: 'يتطلب إصابات:',
    unlockAllPassBtn: 'فتح كل الإضافات للتجربة',
    unlockAllPassActive: 'كل الإضافات مفتوحة',
    equippedBadge: 'مُركَّب',
    unsupportedSlotMsg: 'هذا السلاح لا يدعم هذا النوع من الإضافات',
    resetWeaponBtn: 'استعادة الافتراضي',
    applyChangesBtn: 'حفظ والعودة',
    armoryPrompt: 'أنت عند نقطة عتاد القاعدة — اضغط [B] لتغيير الأسلحة والإضافات',
    armoryBtn: 'العتاد [B]',
    armoryTitle: 'مستودع عتاد القاعدة — تغيير السلاح والإضافات',
    killcamKilledBy: 'قُتلت بواسطة',
    killcamDistance: 'المسافة',
    killcamHeadshot: 'إصابة رأس',
    accessoryOn: 'تشغيل',
    accessoryOff: 'إيقاف',
    refMasterTitle: 'المخطط العام لإضافات الأسلحة',
    refOpticsTitle: 'المناظير القتالية (Red Dot · Holo · 2x–8x)',
    refStocksGripsTitle: 'الأخمصات (5) والقبضات الأمامية (4)',
    refGearTitle: 'كاتم الصوت · الكشاف · الليزر · السكة · المخازن',
    dragToRotateHint: 'اسحب للتدوير 360° · عجلة الماوس للتقريب',
    actions: {
      moveForward: 'تقدم للأمام',
      moveBackward: 'تراجع للخلف',
      moveLeft: 'تحرك لليسار',
      moveRight: 'تحرك لليمين',
      walk: 'مشي تكتيكي بطيء',
      sprint: 'ركض سريع',
      crouch: 'انحناء',
      prone: 'جلوس / انبطاح',
      jump: 'قفز',
      leanLeft: 'نظرة خاطفة يسار',
      leanRight: 'نظرة خاطفة يمين',
      fire: 'إطلاق النار / حفر',
      aim: 'التصويب / تقريب المنظار',
      reload: 'إعادة التعبئة',
      grenade: 'رمي قنبلة',
      slot1: 'السلاح الأساسي 1',
      slot2: 'السلاح 2 / القاذفة',
      slot3: 'المسدس الثانوي (3)',
      slot4: 'المنظار اليدوي (4)',
      slot5: 'المجرفة / الحفارة (5)',
      interact: 'ركوب / مغادرة المركبة والطائرة',
      armory: 'فتح مستودع الأسلحة بالقاعدة',
      toggleAccessory: 'تشغيل/إيقاف الكشاف أو الليزر',
    },
    controlNames: {
      joystick: 'عصا الحركة',
      fire: 'زر الإطلاق / الحفر',
      aim: 'زر التصويب / المنظار',
      crouch: 'زر الانحناء',
      prone: 'زر الجلوس',
      sprint: 'زر الركض',
      walk: 'زر المشي',
      peekLeft: 'نظرة يسار',
      peekRight: 'نظرة يمين',
      jump: 'زر القفز',
      reload: 'زر التعبئة',
      grenade: 'زر القنبلة',
      slots: 'خانات الأسلحة والأدوات',
    },
  },
  en: {
    subtitle: 'Large-Scale Tactical Conquest · Ballistic Physics',
    deploy: 'Deploy to Frontline',
    settings: 'Controls & Settings',
    mapLabel: 'Theater',
    forest: 'Ardennes Forest',
    desert: 'El Alamein Desert',
    normandy: 'Normandy Valley',
    stalingrad: 'Stalingrad Ruins',
    modeLabel: 'Game Mode',
    conquest: 'Conquest',
    tdm: 'Team Deathmatch',
    hardcore: 'Hardcore Realism',
    slot1Label: 'Primary Weapon 1',
    slot2Label: 'Primary 2 / Launcher',
    slot3Label: 'Sidearm: Colt M1911',
    gadgetsBadge: 'Binoculars (4) · Entrenching Shovel (5)',
    controlsHint:
      'Drag screen to aim · 1/2/3 Weapons · 4 Recon Binoculars · 5 Shovel (Dig Foxholes)',
    allies: 'Allies',
    axis: 'Axis',
    hp: 'HP',
    ammo: 'AMMO',
    grenade: 'FRAG',
    reloading: 'Reloading...',
    paused: 'Tactical Pause',
    resume: 'Resume Battle',
    restart: 'Restart Match',
    mainMenu: 'Main Menu',
    victory: 'Allied Victory',
    defeat: 'Frontline Lost',
    draw: 'Tactical Draw',
    playAgain: 'Play Again',
    eliminations: 'Eliminations',
    captures: 'Captures',
    score: 'Score',
    accuracy: 'Accuracy',
    time: 'Duration',
    respawning: 'Redeploying in',
    clickToLock: 'Drag viewport to aim',
    capturing: 'Securing Sector',
    contested: 'Sector Contested',
    stand: 'STAND',
    walk: 'WALK',
    crouch: 'CROUCH',
    prone: 'SIT / LOW',
    sprint: 'SPRINT',
    mute: 'Toggle Mute',
    pause: 'Pause Game',
    fireBtn: 'Fire',
    aimBtn: 'Aim',
    walkBtn: 'Walk',
    sprintBtn: 'Sprint',
    crouchBtn: 'Crouch',
    proneBtn: 'Sit',
    jumpBtn: 'Jump',
    peekLeftBtn: 'Peek Left',
    peekRightBtn: 'Peek Right',
    reloadBtn: 'Reload',
    grenadeBtn: 'Grenade',
    settingsTitle: 'Controls & Graphics Settings',
    pressAnyKey: 'Press key...',
    resetDefaults: 'Reset Defaults',
    close: 'Save & Close',
    mouseSensLabel: 'Look Sensitivity',
    adsSensLabel: 'ADS Sensitivity',
    fovLabel: 'Field of View',
    onScreenControlsLabel: 'Show On-Screen Touch/Click Controls',
    showAimArrowLabel: 'Show Ballistic Distance Arrow',
    graphicsQualityLabel: 'Graphics Quality',
    graphicsLow: 'Low',
    graphicsMedium: 'Medium',
    graphicsHigh: 'High',
    keybindsSection: 'Custom Keyboard Bindings',
    customizeHudBtn: 'Customize Button Positions & Size',
    hudEditorTitle: 'Drag any button to reposition · Tap to resize',
    buttonSizeLabel: 'Button Size',
    buttonOpacityLabel: 'Opacity',
    saveLayoutBtn: 'Save Layout',
    resetLayoutBtn: 'Reset',
    rotateTitle: 'Landscape Mode Recommended',
    rotateDesc: 'Rotate your device sideways or tap below to lock landscape fullscreen.',
    enterLandscapeBtn: 'Enter Landscape Fullscreen',
    continueAnywayBtn: 'Continue Anyway',
    outOfAmmoMsg: 'Out of ammo! Return to Allied Base / Supply Crate to resupply',
    resupplyMsg: 'Ammo & Supplies replenished at Base',
    binocularsHint: 'Recon Binoculars (Observation only · Firing disabled)',
    shovelHint: 'Aim the ground ring and press Fire to dig a foxhole anywhere',
    playModeOffline: 'Solo vs Squad Bots',
    playModeOnline: 'Online Multiplayer',
    roomCodeLabel: 'Room Code',
    callsignLabel: 'Callsign',
    copyInviteBtn: 'Copy Invite Link',
    copiedInviteBtn: 'Link Copied!',
    teamSelectLabel: 'Team',
    teamAuto: 'Auto',
    onlinePlayersBadge: 'In Room',
    aimAssistLabel: 'Light Aim Assist',
    enterJeep: 'Press [X] or Vehicle Button to Drive Gun Truck',
    enterTank: 'Press [X] or Vehicle Button to Command Tank',
    enterAircraft: 'Press [X] or Vehicle Button to Pilot Fighter Aircraft',
    exitVehicle: 'Exit [X]',
    vehicleBtn: 'Vehicle',
    jeepName: 'Armored Gun Truck',
    tankName: 'Heavy Battle Tank',
    aircraftName: 'Combat Fighter Plane',
    aircraftControlsHint: 'W/S Throttle · A/D Bank Turn · Q/E Pitch Up/Down · Fire Wing Cannons',
    targetFpsLabel: 'Frame Rate Cap (FPS)',
    fps60: '60 FPS',
    fps120: '120 FPS',
    fpsMax: 'Uncapped',
    gunsmithBtn: 'Weapon Gunsmith & Attachments',
    gunsmithTitle: 'Tactical Weapon Gunsmith',
    gunsmithSubtitle: 'Equip 3D optics, stocks, foregrips, suppressors, rails & extended magazines',
    tab3dInspect: '3D Workbench',
    tabRefGuide: 'Visual Attachment Reference',
    catOptic: 'Optics',
    catStock: 'Stocks',
    catGrip: 'Foregrips',
    catMuzzle: 'Muzzle',
    catRail: 'Rail / Light / Laser',
    catMagazine: 'Magazines',
    statDamage: 'Damage',
    statRecoilCtrl: 'Recoil Control',
    statAccuracy: 'Accuracy',
    statMobility: 'Mobility',
    statMagCap: 'Mag Capacity',
    statOpticZoom: 'Optic Zoom',
    unlockedLabel: 'Unlocked',
    lockedLabel: 'Locked',
    unlockReqKills: 'Kills req:',
    unlockAllPassBtn: 'Unlock All Armory Pass',
    unlockAllPassActive: 'All Attachments Unlocked',
    equippedBadge: 'EQUIPPED',
    unsupportedSlotMsg: 'This weapon platform does not mount this slot',
    resetWeaponBtn: 'Reset Defaults',
    applyChangesBtn: 'Save & Close',
    armoryPrompt: 'At Base Armory — Press [B] to Switch Weapons & Attachments',
    armoryBtn: 'Armory [B]',
    armoryTitle: 'Forward Base Armory — Switch Loadout & Attachments',
    killcamKilledBy: 'ELIMINATED BY',
    killcamDistance: 'Distance',
    killcamHeadshot: 'HEADSHOT',
    accessoryOn: 'ON',
    accessoryOff: 'OFF',
    refMasterTitle: 'Master Tactical Attachments Overview',
    refOpticsTitle: 'Combat Optics (Red Dot · Holo · 2x–8x)',
    refStocksGripsTitle: 'Rifle Stocks (5) & Foregrips (4)',
    refGearTitle: 'Suppressor · Flashlight · Laser · Rails · Magazines',
    dragToRotateHint: 'Drag to orbit 360° · Scroll to zoom',
    actions: {
      moveForward: 'Move Forward',
      moveBackward: 'Move Backward',
      moveLeft: 'Strafe Left',
      moveRight: 'Strafe Right',
      walk: 'Tactical Walk',
      sprint: 'Sprint',
      crouch: 'Crouch',
      prone: 'Sit / Low Stance',
      jump: 'Jump',
      leanLeft: 'Peek Left',
      leanRight: 'Peek Right',
      fire: 'Fire / Dig',
      aim: 'Aim / Zoom Optics',
      reload: 'Reload',
      grenade: 'Throw Grenade',
      slot1: 'Primary Weapon 1',
      slot2: 'Primary 2 / Launcher',
      slot3: 'Sidearm Pistol (3)',
      slot4: 'Field Binoculars (4)',
      slot5: 'Entrenching Shovel (5)',
      interact: 'Enter / Exit Vehicle & Aircraft',
      armory: 'Open Base Armory',
      toggleAccessory: 'Toggle Flashlight / Laser',
    },
    controlNames: {
      joystick: 'Move Joystick',
      fire: 'Fire / Dig Button',
      aim: 'Aim / Binoculars',
      crouch: 'Crouch',
      prone: 'Sit / Low',
      sprint: 'Sprint',
      walk: 'Walk',
      peekLeft: 'Peek Left',
      peekRight: 'Peek Right',
      jump: 'Jump',
      reload: 'Reload',
      grenade: 'Grenade',
      slots: 'Weapon & Gear Slots',
    },
  },
};
