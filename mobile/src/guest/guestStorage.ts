import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  migrateV1Draft,
  normalizeGuestDraft,
} from '../../../shared/guest/guestOnboardingDomain.js';

export const NATIVE_GUEST_ONBOARDING_STORAGE_KEY =
  'zatora_native_guest_onboarding_v2';
export const NATIVE_LEGACY_GUEST_ONBOARDING_STORAGE_KEY =
  'zatora_native_guest_onboarding_v1';

type GuestDraft = Record<string, unknown>;

export async function loadGuestDraft(now = Date.now()): Promise<GuestDraft | null> {
  const current = await AsyncStorage.getItem(NATIVE_GUEST_ONBOARDING_STORAGE_KEY);
  const legacy = current
    ? null
    : await AsyncStorage.getItem(NATIVE_LEGACY_GUEST_ONBOARDING_STORAGE_KEY);
  const raw = current ?? legacy;

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as GuestDraft;
    const migrated = legacy ? migrateV1Draft(parsed, now) : normalizeGuestDraft(parsed, now);
    if (!migrated) {
      await clearGuestDraft();
      return null;
    }
    return migrated as GuestDraft;
  } catch {
    await clearGuestDraft();
    return null;
  }
}

export async function saveGuestDraft(draft: GuestDraft | null): Promise<void> {
  if (!draft) {
    await clearGuestDraft();
    return;
  }

  await AsyncStorage.setItem(
    NATIVE_GUEST_ONBOARDING_STORAGE_KEY,
    JSON.stringify(draft),
  );
  await AsyncStorage.removeItem(NATIVE_LEGACY_GUEST_ONBOARDING_STORAGE_KEY);
}

export async function clearGuestDraft(): Promise<void> {
  await AsyncStorage.multiRemove([
    NATIVE_GUEST_ONBOARDING_STORAGE_KEY,
    NATIVE_LEGACY_GUEST_ONBOARDING_STORAGE_KEY,
  ]);
}
