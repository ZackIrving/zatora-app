import { useEffect, useRef, type PropsWithChildren } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type GuestShellProps = PropsWithChildren<{
  childrenContainerStyle?: StyleProp<ViewStyle>;
  hero?: boolean;
  keyboardAware?: boolean;
}>;

export function GuestShell({
  children,
  childrenContainerStyle,
  hero = false,
  keyboardAware = false,
}: GuestShellProps) {
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const francoSize = Math.min(300, Math.max(180, Math.min(width * 0.82, height * 0.42)));

  useEffect(() => {
    if (!keyboardAware) return undefined;

    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    });

    return () => subscription.remove();
  }, [keyboardAware]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandRow}>
            <Text style={styles.brand}>ZATORA</Text>
            <Text style={styles.brandCaption}>A little more possible.</Text>
          </View>
          <Image
            accessibilityLabel="Franco the Zatora sidekick"
            accessibilityRole="image"
            source={require('../../assets/franco-tiny-puppy-neutral.png')}
            style={[
              styles.franco,
              hero && styles.heroFranco,
              hero && { height: francoSize, width: francoSize },
            ]}
          />
          {childrenContainerStyle ? (
            <View style={childrenContainerStyle}>{children}</View>
          ) : children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.pageGutter,
    paddingBottom: 40,
  },
  brandRow: { marginTop: 8 },
  brand: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2.5,
  },
  brandCaption: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  franco: {
    alignSelf: 'center',
    height: 150,
    marginVertical: 22,
    width: 150,
  },
  heroFranco: { marginVertical: 16 },
});
