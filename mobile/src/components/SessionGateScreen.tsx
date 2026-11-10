import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GuestButton } from '@/components/GuestUi';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export function SessionGateScreen({
  error,
  onRetry,
}: {
  error?: string | null;
  onRetry?: () => void;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.mark}>
          <Text style={styles.markText}>Z</Text>
        </View>
        <Text style={styles.eyebrow}>ZATORA</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {error ? 'Your session needs another try.' : 'Restoring your session…'}
        </Text>
        {error ? (
          <View accessibilityLiveRegion="assertive">
            <Text style={styles.body}>{error}</Text>
          </View>
        ) : (
          <ActivityIndicator accessibilityLabel="Restoring session" color={colors.violet} size="large" style={styles.spinner} />
        )}
        {error && onRetry ? <GuestButton onPress={onRetry}>Try again</GuestButton> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.pageGutter },
  mark: {
    alignItems: 'center',
    backgroundColor: colors.violet,
    borderRadius: 18,
    height: 58,
    justifyContent: 'center',
    marginBottom: 28,
    width: 58,
  },
  markText: { color: colors.text, fontSize: 30, fontWeight: '800' },
  eyebrow: { color: colors.amber, fontSize: 12, fontWeight: '700', letterSpacing: 1.8, marginBottom: 10 },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', lineHeight: 39, maxWidth: 360 },
  body: { color: colors.textMuted, fontSize: 16, lineHeight: 24, marginTop: 14, maxWidth: 360 },
  spinner: { alignSelf: 'flex-start', marginTop: 28 },
});
