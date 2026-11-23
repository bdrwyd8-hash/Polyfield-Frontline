import { useState } from 'react';
import ak47Img from '../assets/images/weapon_ak47_armory_1795163651011.jpg';
import barImg from '../assets/images/weapon_bar_armory_1795163650994.jpg';
import bazookaImg from '../assets/images/weapon_bazooka_armory_1795163651400.jpg';
import m1GarandImg from '../assets/images/weapon_m1_garand_armory_1795163651001.jpg';
import mp40Img from '../assets/images/weapon_mp40_armory_1795163651363.jpg';
import panzerschreckImg from '../assets/images/weapon_panzerschreck_armory_1795163651439.jpg';
import ppsh41Img from '../assets/images/weapon_ppsh41_armory_1795163651407.jpg';
import rpg7Img from '../assets/images/weapon_rpg7_armory_1795163650976.jpg';
import springfieldImg from '../assets/images/weapon_springfield_armory_1795163651374.jpg';
import stg44Img from '../assets/images/weapon_stg44_armory_1795163651473.jpg';
import thompsonImg from '../assets/images/weapon_thompson_armory_1795163651058.jpg';
import { WEAPONS } from '../game/rules';
import type { WeaponId } from '../game/types';

const WEAPON_PHOTO_MAP: Partial<Record<WeaponId, string>> = {
  ak47: ak47Img,
  bar: barImg,
  bazooka: bazookaImg,
  m1_garand: m1GarandImg,
  mp40: mp40Img,
  panzerschreck: panzerschreckImg,
  ppsh41: ppsh41Img,
  rpg7: rpg7Img,
  springfield: springfieldImg,
  stg44: stg44Img,
  thompson: thompsonImg,
};

function WeaponSvgFallback({
  weaponId,
  className,
}: {
  weaponId: WeaponId;
  className: string;
}) {
  if (weaponId === 'ak47') {
    return (
      <svg viewBox="0 0 120 38" className={className} aria-hidden="true">
        <path d="M5 17 L28 14 L30 22 L6 27 Z" fill="#b45309" stroke="#1c1917" strokeWidth="1.5" />
        <path d="M35 20 L42 20 L38 32 L31 31 Z" fill="#92400e" stroke="#1c1917" strokeWidth="1.4" />
        <rect x="64" y="13" width="22" height="5.5" rx="1" fill="#b45309" stroke="#1c1917" strokeWidth="1.3" />
        <rect x="28" y="13.5" width="38" height="7" fill="#44403c" stroke="#1c1917" strokeWidth="1.4" />
        <rect x="65" y="10.5" width="20" height="3" fill="#57534e" stroke="#1c1917" strokeWidth="1.2" />
        <rect x="85" y="13.5" width="28" height="2.6" fill="#292524" stroke="#1c1917" strokeWidth="1.2" />
        <path d="M107 10 L110 10 L110 14 L107 14 Z" fill="#57534e" stroke="#1c1917" strokeWidth="1" />
        <path
          d="M54 20 L62 20 Q64 28 71 35 L63 36 Q56 29 54 20 Z"
          fill="#d97706"
          stroke="#1c1917"
          strokeWidth="1.4"
        />
      </svg>
    );
  }

  if (weaponId === 'm4a1') {
    return (
      <svg viewBox="0 0 120 40" className={className} aria-hidden="true">
        {/* FDE SOPMOD Adjustable Stock & Buffer Tube */}
        <path
          d="M5 16 L24 14 L26 23 L7 28 L5 24 Z"
          fill="#a18259"
          stroke="#1c1917"
          strokeWidth="1.4"
        />
        <rect x="24" y="15" width="9" height="4" fill="#292524" stroke="#1c1917" strokeWidth="1.2" />
        {/* Upper / Lower Receiver (FDE Lower + Black Upper) */}
        <rect x="33" y="13.5" width="29" height="4.5" fill="#292524" stroke="#1c1917" strokeWidth="1.3" />
        <rect x="33" y="18" width="29" height="4.2" fill="#a18259" stroke="#1c1917" strokeWidth="1.3" />
        {/* Pistol Grip */}
        <path d="M34 22 L40 22 L37 33 L31 32 Z" fill="#a18259" stroke="#1c1917" strokeWidth="1.3" />
        {/* Holographic Sight */}
        <rect x="39" y="7" width="14" height="6.5" rx="1" fill="#1c1917" stroke="#57534e" strokeWidth="1.2" />
        <rect x="42" y="8.5" width="8" height="3.5" fill="#0f172a" />
        {/* Quad-Rail Handguard & Vertical Foregrip */}
        <rect x="62" y="14" width="25" height="6.2" rx="0.8" fill="#292524" stroke="#1c1917" strokeWidth="1.3" />
        <rect x="70" y="20" width="5" height="11" rx="0.8" fill="#1c1917" stroke="#44403c" strokeWidth="1.2" />
        {/* Front A2 Sight Triangle + Barrel & Flash Hider */}
        <path d="M87 15 L91 9 L93 15 Z" fill="#292524" stroke="#1c1917" strokeWidth="1.1" />
        <rect x="87" y="15.4" width="24" height="2.4" fill="#1c1917" stroke="#1c1917" strokeWidth="1" />
        <rect x="110" y="14.7" width="5" height="3.8" fill="#44403c" stroke="#1c1917" strokeWidth="1" />
        {/* Curved 5.56 STANAG Magazine */}
        <path
          d="M52 22 L60 22 L64 36 L55 37 Q52 29 52 22 Z"
          fill="#44403c"
          stroke="#1c1917"
          strokeWidth="1.4"
        />
      </svg>
    );
  }

  if (weaponId === 'ppsh41') {
    return (
      <svg viewBox="0 0 120 38" className={className} aria-hidden="true">
        <path d="M5 17 L48 15 L46 21 L22 23 L7 27 Z" fill="#b45309" stroke="#1c1917" strokeWidth="1.5" />
        <rect x="44" y="11" width="66" height="5" rx="1" fill="#57534e" stroke="#1c1917" strokeWidth="1.4" />
        {[58, 65, 72, 79, 86, 93].map((x) => (
          <circle key={x} cx={x} cy="13.5" r="1.1" fill="#1c1917" />
        ))}
        <circle cx="62" cy="25" r="9.5" fill="#44403c" stroke="#1c1917" strokeWidth="1.5" />
        <circle cx="62" cy="25" r="5" fill="#57534e" stroke="#1c1917" strokeWidth="1.1" />
        <circle cx="62" cy="25" r="1.8" fill="#1c1917" />
      </svg>
    );
  }

  if (weaponId === 'm1_garand') {
    return (
      <svg viewBox="0 0 120 36" className={className} aria-hidden="true">
        <path
          d="M4 17 L30 14 L82 14 L82 18 L48 19 L25 22 L6 26 Z"
          fill="#b45309"
          stroke="#1c1917"
          strokeWidth="1.5"
        />
        <rect x="40" y="11.5" width="22" height="3.5" fill="#44403c" stroke="#1c1917" strokeWidth="1.2" />
        <rect x="82" y="14" width="32" height="2.6" fill="#292524" stroke="#1c1917" strokeWidth="1.2" />
        <rect x="108" y="10.5" width="2.5" height="4" fill="#57534e" />
      </svg>
    );
  }

  if (weaponId === 'kar98k') {
    return (
      <svg viewBox="0 0 120 36" className={className} aria-hidden="true">
        <path
          d="M4 18 L28 14 L84 14 L84 17.5 L48 19 L24 22 L6 26 Z"
          fill="#92400e"
          stroke="#1c1917"
          strokeWidth="1.5"
        />
        <rect x="44" y="12" width="18" height="3" fill="#57534e" stroke="#1c1917" strokeWidth="1.2" />
        <circle cx="54" cy="10.5" r="2.2" fill="#d6d3d1" stroke="#1c1917" strokeWidth="1.1" />
        <rect x="84" y="14" width="31" height="2.3" fill="#292524" stroke="#1c1917" strokeWidth="1.2" />
      </svg>
    );
  }

  if (weaponId === 'springfield') {
    return (
      <svg viewBox="0 0 120 36" className={className} aria-hidden="true">
        <path
          d="M4 18 L30 15 L80 15 L80 18 L48 20 L24 23 L6 26 Z"
          fill="#a16207"
          stroke="#1c1917"
          strokeWidth="1.5"
        />
        <rect x="80" y="14.8" width="34" height="2.4" fill="#292524" stroke="#1c1917" strokeWidth="1.2" />
        <rect x="34" y="6.5" width="38" height="4.8" rx="1.2" fill="#57534e" stroke="#1c1917" strokeWidth="1.3" />
        <rect x="42" y="11" width="3" height="4" fill="#292524" />
        <rect x="61" y="11" width="3" height="4" fill="#292524" />
      </svg>
    );
  }

  if (weaponId === 'thompson') {
    return (
      <svg viewBox="0 0 120 38" className={className} aria-hidden="true">
        <path d="M5 17 L30 14 L32 22 L7 27 Z" fill="#b45309" stroke="#1c1917" strokeWidth="1.5" />
        <path d="M35 20 L42 20 L38 31 L31 30 Z" fill="#92400e" stroke="#1c1917" strokeWidth="1.3" />
        <rect x="66" y="18" width="18" height="4.5" fill="#b45309" stroke="#1c1917" strokeWidth="1.3" />
        <rect x="30" y="12" width="46" height="7.5" fill="#44403c" stroke="#1c1917" strokeWidth="1.4" />
        <rect x="76" y="13.5" width="30" height="3" fill="#292524" stroke="#1c1917" strokeWidth="1.2" />
        <rect x="54" y="19.5" width="6.5" height="14" fill="#57534e" stroke="#1c1917" strokeWidth="1.3" />
      </svg>
    );
  }

  if (weaponId === 'mp40') {
    return (
      <svg viewBox="0 0 120 38" className={className} aria-hidden="true">
        <path d="M12 19 L34 15 L36 18 L15 24 Z" fill="none" stroke="#a8a29e" strokeWidth="2.2" />
        <rect x="33" y="12" width="42" height="6.5" fill="#44403c" stroke="#1c1917" strokeWidth="1.4" />
        <path d="M36 18.5 L42 18.5 L38 30 L32 29 Z" fill="#292524" stroke="#1c1917" strokeWidth="1.3" />
        <rect x="75" y="13.5" width="33" height="2.6" fill="#292524" stroke="#1c1917" strokeWidth="1.2" />
        <rect x="57" y="18.5" width="5.5" height="16" fill="#57534e" stroke="#1c1917" strokeWidth="1.3" />
      </svg>
    );
  }

  if (weaponId === 'stg44' || weaponId === 'bar') {
    return (
      <svg viewBox="0 0 120 38" className={className} aria-hidden="true">
        <path d="M5 17 L30 14 L32 21 L7 26 Z" fill="#92400e" stroke="#1c1917" strokeWidth="1.5" />
        <path d="M35 19 L41 19 L37 30 L31 29 Z" fill="#44403c" stroke="#1c1917" strokeWidth="1.3" />
        <rect x="30" y="12" width="50" height="7" fill="#57534e" stroke="#1c1917" strokeWidth="1.4" />
        <rect x="80" y="13.5" width="30" height="2.8" fill="#292524" stroke="#1c1917" strokeWidth="1.2" />
        <path
          d="M57 19 L64 19 L67 34 L59 35 Z"
          fill="#44403c"
          stroke="#1c1917"
          strokeWidth="1.4"
        />
      </svg>
    );
  }

  if (weaponId === 'rpg7') {
    return (
      <svg viewBox="0 0 120 38" className={className} aria-hidden="true">
        <path d="M3 14 L14 16 L14 21 L3 23 Z" fill="#44403c" stroke="#1c1917" strokeWidth="1.4" />
        <rect x="14" y="16" width="76" height="5" fill="#44403c" stroke="#1c1917" strokeWidth="1.4" />
        <rect x="38" y="15" width="24" height="7" rx="1" fill="#b45309" stroke="#1c1917" strokeWidth="1.2" />
        <path d="M48 22 L53 22 L51 31 L46 31 Z" fill="#78350f" stroke="#1c1917" strokeWidth="1.2" />
        <path d="M90 15.5 L103 11.5 L117 18.5 L103 25.5 L90 21.5 Z" fill="#4d7c0f" stroke="#1c1917" strokeWidth="1.4" />
      </svg>
    );
  }

  if (weaponId === 'bazooka' || weaponId === 'panzerschreck') {
    const isPanzerschreck = weaponId === 'panzerschreck';
    return (
      <svg viewBox="0 0 120 38" className={className} aria-hidden="true">
        <path d="M4 13 L14 15.5 L14 21.5 L4 24 Z" fill="#4d7c0f" stroke="#1c1917" strokeWidth="1.4" />
        <rect
          x="14"
          y="14.5"
          width="94"
          height="7.5"
          fill={isPanzerschreck ? '#57534e' : '#4d7c0f'}
          stroke="#1c1917"
          strokeWidth="1.5"
        />
        <rect x="106" y="13" width="6" height="10.5" fill="#3f6212" stroke="#1c1917" strokeWidth="1.3" />
        {isPanzerschreck && (
          <rect x="74" y="6" width="5" height="20" fill="#78716c" stroke="#1c1917" strokeWidth="1.3" />
        )}
        <path d="M28 22 L33 22 L31 30 L26 30 Z" fill="#78350f" stroke="#1c1917" strokeWidth="1.3" />
        <path d="M58 22 L63 22 L61 31 L56 31 Z" fill="#44403c" stroke="#1c1917" strokeWidth="1.3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 80 36" className={className} aria-hidden="true">
      <path d="M18 10 L62 10 L62 17 L36 17 L30 31 L20 31 L24 17 L18 17 Z" fill="#57534e" stroke="#1c1917" strokeWidth="1.6" />
    </svg>
  );
}

export function WeaponIllustration({
  weaponId,
  className = 'w-20 h-8',
}: {
  weaponId: WeaponId;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const photo = WEAPON_PHOTO_MAP[weaponId];
  const label = WEAPONS[weaponId]?.nameEn ?? weaponId;

  if (photo && !imgFailed) {
    return (
      <div className={`relative overflow-hidden bg-stone-900 ${className}`}>
        <img
          src={photo}
          alt={label}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to right, rgba(12,10,9,0.28) 0%, rgba(12,10,9,0.04) 50%, rgba(12,10,9,0.28) 100%)',
          }}
        />
      </div>
    );
  }

  return <WeaponSvgFallback weaponId={weaponId} className={className} />;
}
