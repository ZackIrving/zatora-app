import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function HomeRoute() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.mark}>
          <Text style={styles.markText}>Z</Text>
        </View>
        <Text style={styles.eyebrow}>ZATORA NATIVE</Text>
        <Text style={styles.title}>A calmer way to get things done.</Text>
        <Text style={styles.body}>
          The native foundation is running. Product flows will arrive in the
          next migration phase.
        </Text>
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Expo foundation ready</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.pageGutter,
  },
  mark: {
    alignItems: 'center',
    backgroundColor: colors.violet,
    borderRadius: 20,
    height: 64,
    justifyContent: 'center',
    marginBottom: 32,
    width: 64,
  },
  markText: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
  },
  eyebrow: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1.2,
    lineHeight: 44,
    maxWidth: 360,
  },
  body: {
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 26,
    marginTop: spacing.section,
    maxWidth: 360,
  },
  statusPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 36,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusDot: {
    backgroundColor: colors.emerald ?? '#2fd69b',
    borderRadius: 5,
    height: 10,
    marginRight: 9,
    width: 10,
  },
  statusText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
