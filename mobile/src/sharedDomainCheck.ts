import {
  GUEST_ONBOARDING_VERSION,
  MAX_SIMPLIFICATION_DEPTH,
  createGuestDraft,
} from '../../shared/guest/guestOnboardingDomain.js';

export const sharedDomainFoundation = {
  version: GUEST_ONBOARDING_VERSION,
  maxSimplificationDepth: MAX_SIMPLIFICATION_DEPTH,
  initialStep: createGuestDraft(new Date(0)).step,
};
