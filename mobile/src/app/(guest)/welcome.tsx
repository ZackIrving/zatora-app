import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { GuestButton, GuestHeading, guestUiStyles } from '@/components/GuestUi';
import { GuestShell } from '@/components/GuestShell';
import { useGuestOnboarding } from '@/guest/GuestOnboardingProvider';
import { colors } from '@/theme/colors';

export default function GuestWelcomeRoute() {
  const router = useRouter();
  const { draft, isRestoring, start, startOver, resume, transitionTo } = useGuestOnboarding();

  if (isRestoring) {
    return <GuestShell><Text style={guestUiStyles.body}>Getting your starting point ready…</Text></GuestShell>;
  }

  const begin = () => {
    start();
    // Queue the first legal transition with START so the new draft opens on Name.
    transitionTo('name');
    router.replace('/(guest)/onboarding' as never);
  };

  const continueDraft = () => {
    if (!draft) return;
    resume();
    if (draft.step === 'intro') {
      // A saved intro is a fresh start, not an auto-advanced answer.
      transitionTo('name');
      router.replace('/(guest)/onboarding' as never);
      return;
    }
    router.replace('/(guest)/onboarding' as never);
  };

  return (
    <GuestShell hero childrenContainerStyle={styles.welcomeBody}>
      {draft ? (
        <>
          <GuestHeading
            eyebrow="WELCOME BACK"
            title={draft.name ? `Good to see you, ${draft.name}.` : 'You saved your spot.'}
            body="Franco kept your starting point right here. Pick up where you left off, or begin again."
          />
          <GuestButton onPress={continueDraft}>Keep going</GuestButton>
          <GuestButton onPress={startOver} secondary>Start over</GuestButton>
          <View style={styles.accountActions}>
            <Text style={styles.accountPrompt}>Ready to use an account instead?</Text>
            <GuestButton onPress={() => router.push('/(auth)/sign-in' as never)} secondary>Sign in</GuestButton>
            <GuestButton onPress={() => router.push('/(auth)/sign-up' as never)} secondary>Create account</GuestButton>
          </View>
        </>
      ) : (
        <>
          <GuestHeading
            title="Meet Franco."
            body="Your steady sidekick for making the next thing feel lighter."
            containerStyle={styles.welcomeHeading}
          />
          <View accessibilityLiveRegion="polite">
            <Text style={guestUiStyles.body}>No account needed to begin.</Text>
          </View>
          <GuestButton onPress={begin}>Say hello</GuestButton>
          <View style={styles.accountActions}>
            <Text style={styles.accountPrompt}>Already know where you’re headed?</Text>
            <GuestButton onPress={() => router.push('/(auth)/sign-in' as never)} secondary>Sign in</GuestButton>
            <GuestButton onPress={() => router.push('/(auth)/sign-up' as never)} secondary>Create account</GuestButton>
          </View>
        </>
      )}
    </GuestShell>
  );
}

const styles = StyleSheet.create({
  welcomeBody: {
    flex: 1,
    paddingBottom: 16,
  },
  welcomeHeading: { marginBottom: 6 },
  accountActions: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: 28, paddingTop: 10 },
  accountPrompt: { color: colors.textMuted, fontSize: 13, marginTop: 8, textAlign: 'center' },
});
