import { CAMPAIGN_CAST, type CampaignCastMember } from './campaignData';

export interface CampaignSaveProgress {
  highestUnlockedMission: number;
  completedMissions: number[];
  lastPlayedMission: number;
}

const CAMPAIGN_SAVE_KEY = 'polyfield_frontline_campaign_jordan_v1';

export function createDefaultCampaignSave(): CampaignSaveProgress {
  return {
    highestUnlockedMission: 1,
    completedMissions: [],
    lastPlayedMission: 1,
  };
}

export function loadCampaignSave(): CampaignSaveProgress {
  if (typeof window === 'undefined') return createDefaultCampaignSave();
  try {
    const raw = window.localStorage.getItem(CAMPAIGN_SAVE_KEY);
    if (!raw) return createDefaultCampaignSave();
    const parsed = JSON.parse(raw) as Partial<CampaignSaveProgress>;
    const completed = Array.isArray(parsed.completedMissions)
      ? Array.from(
          new Set(
            parsed.completedMissions.filter(
              (n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 20,
            ),
          ),
        ).sort((a, b) => a - b)
      : [];
    const maxDone = completed.length > 0 ? completed[completed.length - 1] : 0;
    const highest = Math.max(
      1,
      Math.min(
        20,
        typeof parsed.highestUnlockedMission === 'number'
          ? Math.max(parsed.highestUnlockedMission, Math.min(20, maxDone + 1))
          : Math.min(20, maxDone + 1),
      ),
    );
    const lastPlayed =
      typeof parsed.lastPlayedMission === 'number' &&
      parsed.lastPlayedMission >= 1 &&
      parsed.lastPlayedMission <= highest
        ? parsed.lastPlayedMission
        : highest;
    return {
      highestUnlockedMission: highest,
      completedMissions: completed,
      lastPlayedMission: lastPlayed,
    };
  } catch {
    return createDefaultCampaignSave();
  }
}

export function saveCampaignProgress(progress: CampaignSaveProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CAMPAIGN_SAVE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors
  }
}

export function markCampaignMissionComplete(
  prev: CampaignSaveProgress,
  missionId: number,
): CampaignSaveProgress {
  const clamped = Math.max(1, Math.min(20, Math.round(missionId)));
  const completed = prev.completedMissions.includes(clamped)
    ? [...prev.completedMissions]
    : [...prev.completedMissions, clamped].sort((a, b) => a - b);
  const highestUnlockedMission = Math.max(
    prev.highestUnlockedMission,
    Math.min(20, clamped + 1),
  );
  const next: CampaignSaveProgress = {
    highestUnlockedMission,
    completedMissions: completed,
    lastPlayedMission: Math.min(20, clamped + 1),
  };
  saveCampaignProgress(next);
  return next;
}

export function resetCampaignSave(): CampaignSaveProgress {
  const fresh = createDefaultCampaignSave();
  saveCampaignProgress(fresh);
  return fresh;
}

export interface CastContinuityStatus {
  member: CampaignCastMember;
  aliveAtMission: boolean;
}

/**
 * Computes consistent character status for a given mission number so
 * scripted casualties earlier in the story remain absent in later chapters.
 */
export function getCampaignCastStatus(missionId: number): CastContinuityStatus[] {
  return CAMPAIGN_CAST.map((member) => ({
    member,
    aliveAtMission: member.diesInMission === null || missionId <= member.diesInMission,
  }));
}
