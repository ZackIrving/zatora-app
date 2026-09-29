# M4 native First Win founder QA

M4 is local-only. `mobile/src/guest/guestFirstWinService.ts` is the single
service seam; it currently validates the shared request/result contract and
uses the deterministic fallback. M5 can replace that implementation with the
guest-first-win Edge Function without changing the native reducer or screens.

## Physical iPhone sequence

1. Complete M3 onboarding and enter a first task.
2. Tap **Help me start**; confirm Franco processing is visible and responsive.
3. Confirm the original task remains visible and a tiny first step appears.
4. Tap **Make it even smaller** once, then a second time.
5. Confirm depth 2 has no third smaller-step action.
6. Tap **Start with this**.
7. Tap **Still working**; confirm the commitment state remains, with no completion or XP.
8. Tap **I did it**; confirm the First Win screen and exactly **+25 XP**.
9. Repeat/reload the completed state; confirm XP remains 25 and does not increase.
10. Close and reopen at result, depth 1, depth 2, commitment, and win states.
11. On a short iPhone, tall iPhone, and typical Android, check safe-area content, touch targets, wrapping text, keyboard avoidance, status announcements, and reduced-motion clarity.

No live provider, OpenAI call, guest Edge Function call, deployment, or
production mutation is required for M4 QA.
