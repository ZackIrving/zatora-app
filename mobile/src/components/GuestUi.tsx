import { Pressable, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export function GuestButton({
  children,
  onPress,
  disabled = false,
  secondary = false,
}: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.secondaryButton : styles.primaryButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={secondary ? styles.secondaryButtonText : styles.buttonText}>
        {children}
      </Text>
    </Pressable>
  );
}

export function GuestHeading({
  eyebrow,
  title,
  body,
  containerStyle,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.heading, containerStyle]}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

export function GuestTextInput(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput {...props} placeholderTextColor={colors.textMuted} style={[styles.input, props.style]} />;
}

const styles = StyleSheet.create({
  heading: { marginBottom: spacing.section },
  eyebrow: { color: colors.amber, fontSize: 12, fontWeight: '700', letterSpacing: 1.7, marginBottom: 10 },
  title: { color: colors.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.8, lineHeight: 40 },
  body: { color: colors.textMuted, fontSize: 16, lineHeight: 24, marginTop: 12 },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontSize: 17,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  taskInput: { minHeight: 132, textAlignVertical: 'top' },
  button: { alignItems: 'center', borderRadius: 14, minHeight: 54, justifyContent: 'center', marginTop: 18, paddingHorizontal: 18 },
  primaryButton: { backgroundColor: colors.violet },
  secondaryButton: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  secondaryButtonText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.45 },
  option: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, marginBottom: 10, minHeight: 54, justifyContent: 'center', paddingHorizontal: 16 },
  selectedOption: { backgroundColor: colors.indigo, borderColor: colors.violet },
  optionText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  helper: { color: colors.textMuted, fontSize: 13, marginTop: 8 },
  error: { color: '#ff9b9b', fontSize: 13, marginTop: 8 },
  back: { color: colors.textMuted, fontSize: 14, fontWeight: '700', marginBottom: 18 },
});

export const guestUiStyles = styles;
