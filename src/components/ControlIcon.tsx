import { Crosshair, RotateCw } from 'lucide-react';
import type { HudControlId } from '../game/types';

export function TacticalControlIcon({
  id,
  className = 'w-5 h-5',
}: {
  id:
    | Exclude<HudControlId, 'joystick' | 'slots'>
    | 'binoculars'
    | 'shovel'
    | 'vehicle'
    | 'armory'
    | 'accessory'
    | 'backpack'
    | 'bomb'
    | 'missile'
    | 'eject'
    | 'flare';
  className?: string;
}) {
  switch (id) {
    case 'binoculars':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M5 7h4l1 4h4l1-4h4v9a3 3 0 0 1-6 0v-2h-2v2a3 3 0 0 1-6 0V7zm2 7.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0zm7 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0z" />
        </svg>
      );
    case 'shovel':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M16.5 3.5l4 4-1.5 1.5-1.3-1.3-5.2 5.2 2.2 2.2-3.5 3.5c-1.8 1.8-4.7 2.2-6.5 1.4-.8-1.8-.4-4.7 1.4-6.5l3.5-3.5 2.2 2.2 5.2-5.2-1.3-1.3 1.5-1.5z" />
        </svg>
      );
    case 'fire':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M9 19V9l3-5 3 5v10H9zm-1 1h8v2H8v-2z" />
          <path d="M5 10l2-2v4l-2-2zm14 0l-2-2v4l2-2z" opacity="0.7" />
        </svg>
      );
    case 'aim':
      return <Crosshair className={className} aria-hidden="true" />;
    case 'reload':
      return <RotateCw className={className} aria-hidden="true" />;
    case 'jump':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 18V6" />
          <path d="M6.5 11.5L12 6l5.5 5.5" />
          <path d="M7 20h10" />
        </svg>
      );
    case 'walk':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <circle cx="13" cy="4.5" r="2.1" />
          <path d="M10.5 8.5l2.8-.6 2.7 3.1-1.3 1.3-1.8-1.9-.7 3.1 2.7 3.4-.9 4.6-2-.4.7-3.4-2.1-2.5-1.5 5.8-2-.5 1.9-7.1-.9 1-1.6-1.2 2.4-2.8 1.9-1.9z" />
        </svg>
      );
    case 'sprint':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <circle cx="15.5" cy="4.5" r="2" />
          <path d="M10 8l3.8-.5 2.4 2.5 2.8-.8.5 1.8-4 1.1-1.7-1.6-1.4 3.2 2.9 2.3-1.6 5.5-1.9-.6 1.2-4-2.7-2-2.8 3.6-1.6-1.2 3.1-4.1.9-3.1-2.4.7-1.1 2.3-1.7-.9 1.9-3.2z" />
        </svg>
      );
    case 'crouch':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <circle cx="13" cy="6.2" r="2.1" />
          <path d="M9.5 10.2l3.8-.8 3.2 2.8-1.4 1.4-2-1.7-1.1 3.1 3.7.8-.7 4.7-2-.3.5-3.1-3.4-.7-2 3.8-1.8-.9 2.5-4.7.7-4.4z" />
        </svg>
      );
    case 'prone':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <circle cx="6.2" cy="12" r="2" />
          <path d="M9 13.5h8.5l3.5 2.2-1 1.7-3.2-1.8H11l-1.5 2.8-1.8-.9 1.3-4z" />
          <path d="M4 19h16v1.8H4z" opacity="0.65" />
        </svg>
      );
    case 'peekLeft':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="14" cy="15" r="2.2" fill="currentColor" stroke="none" />
          <path d="M15 20l-2.5-5.5L8 10" />
          <path d="M7.5 14.5L7 9l5.5-.5" />
        </svg>
      );
    case 'peekRight':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="10" cy="15" r="2.2" fill="currentColor" stroke="none" />
          <path d="M9 20l2.5-5.5L16 10" />
          <path d="M16.5 14.5L17 9l-5.5-.5" />
        </svg>
      );
    case 'grenade':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M10 4h4v2.2h-4V4zm5.2.8a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm0 1.3a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8z" />
          <path d="M8.5 7.5h7c1.6 1.5 2.3 3.7 2.1 6.2-.2 3.2-2.2 5.8-5.6 5.8s-5.4-2.6-5.6-5.8c-.2-2.5.5-4.7 2.1-6.2zm.7 3.8v1.3h5.6v-1.3H9.2zm0 3v1.3h5.6v-1.3H9.2z" />
        </svg>
      );
    case 'vehicle':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M5 10l2.2-4.5h9.6L19 10h1.5a1.5 1.5 0 0 1 1.5 1.5V16h-2a2.5 2.5 0 0 1-5 0H9a2.5 2.5 0 0 1-5 0H2v-4.5A1.5 1.5 0 0 1 3.5 10H5zm2.4-2.5L6.2 10h11.6l-1.2-2.5H7.4z" />
        </svg>
      );
    case 'armory':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M4 7h16v3H4V7zm1 4h14v9H5v-9zm4 2v2h6v-2H9z" />
        </svg>
      );
    case 'accessory':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M3 9h7l4-3v12l-4-3H3V9zm13 2h5v2h-5v-2zm0-4.5l4.2-2.2.9 1.7-4.2 2.2-.9-1.7zm0 11l.9-1.7 4.2 2.2-.9 1.7-4.2-2.2z" />
        </svg>
      );
    case 'backpack':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M9 4h6a2 2 0 0 1 2 2v1h1.5A1.5 1.5 0 0 1 20 8.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8.5A1.5 1.5 0 0 1 5.5 7H7V6a2 2 0 0 1 2-2zm0 3h6V6H9v1zm-2 4v6h10v-6H7zm2 2h6v1.8H9V13z" />
        </svg>
      );
    case 'bomb':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M16 3l5 5-2 2-1.5-1.5-1.5 1.5a6.5 6.5 0 0 1-1.8 6.8l-3 3a4.2 4.2 0 0 1-6-6l3-3A6.5 6.5 0 0 1 15 9l1.5-1.5L15 6l1-3z" />
        </svg>
      );
    case 'missile':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M20 4l-6 2-6 6-4-1-2 2 3.5 2.5L8 19l2-2-1-4 6-6 2-6z" />
        </svg>
      );
    case 'eject':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M12 3c4.4 0 8 3 8 7H4c0-4 3.6-7 8-7zm-6.2 8l4.7 6.5v3.5h3v-3.5L18.2 11H16l-3.2 4.4V11h-1.6v4.4L8 11H5.8z" />
        </svg>
      );
    case 'flare':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" aria-hidden="true">
          <path d="M12 4v4" />
          <path d="M12 8l-5.5 8.5" />
          <path d="M12 8l5.5 8.5" />
          <path d="M12 8v10" />
          <circle cx="6" cy="18.5" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="12" cy="19.5" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="18" cy="18.5" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
