import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  type AuthMode,
  type AuthDiagnosticCode,
  getAuthErrorPresentation,
  getAuthExceptionPresentation,
  validateCredentials,
} from '@/auth/authForm';
import { useAuth } from '@/auth/AuthProvider';
import { GuestButton, GuestHeading, GuestTextInput, guestUiStyles } from '@/components/GuestUi';
import { GuestShell } from '@/components/GuestShell';
import { colors } from '@/theme/colors';

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [diagnosticCode, setDiagnosticCode] = useState<AuthDiagnosticCode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const isSignUp = mode === 'sign-up';

  const submit = async () => {
    if (isSubmitting) return;
    const validation = validateCredentials(mode, email, password);
    if (!validation.ok) {
      setMessage(validation.message);
      setDiagnosticCode(null);
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    setDiagnosticCode(null);
    try {
      const result = isSignUp
        ? await signUpWithPassword(validation.credentials)
        : await signInWithPassword(validation.credentials);

      if (result.error) {
        const presentation = getAuthErrorPresentation(mode, result.error);
        setMessage(presentation.message);
        setDiagnosticCode(presentation.diagnosticCode);
        return;
      }
      if (!result.data.session) {
        if (isSignUp) {
          setPassword('');
          setConfirmationEmail(validation.credentials.email);
          return;
        }
        setMessage('Your credentials were accepted, but no session was returned. Please try again.');
        setDiagnosticCode('AUTH_SESSION_MISSING');
        return;
      }

      setEmail('');
      setPassword('');
      setDiagnosticCode(null);
      // The auth route boundary observes the verified session and redirects.
      // Keeping navigation out of this request prevents a route failure from
      // being misreported as an authentication failure.
    } catch (error) {
      const presentation = getAuthExceptionPresentation(mode, error);
      setMessage(presentation.message);
      setDiagnosticCode(presentation.diagnosticCode);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmationEmail) {
    return (
      <GuestShell>
        <GuestHeading
          eyebrow="ONE MORE STEP"
          title="Check your email."
          body={`We sent confirmation instructions to ${confirmationEmail}. Confirm your account, then come back to sign in.`}
        />
        <GuestButton onPress={() => router.replace('/(auth)/sign-in' as never)}>
          Back to sign in
        </GuestButton>
      </GuestShell>
    );
  }

  return (
    <GuestShell keyboardAware>
      <Pressable
        accessibilityRole="button"
        disabled={isSubmitting}
        onPress={() => router.replace('/(guest)/welcome' as never)}
      >
        <Text style={guestUiStyles.back}>← Back to welcome</Text>
      </Pressable>
      <GuestHeading
        eyebrow={isSignUp ? 'CREATE ACCOUNT' : 'WELCOME BACK'}
        title={isSignUp ? 'Start a separate synced list.' : 'Your next step is waiting.'}
        body={
          isSignUp
            ? 'Your guest First Win stays on this device. Your account starts fresh.'
            : 'Sign in with your email and password to continue.'
        }
      />

      <Text style={guestUiStyles.label}>Email</Text>
      <GuestTextInput
        accessibilityLabel="Email"
        autoCapitalize="none"
        autoComplete="email"
        editable={!isSubmitting}
        inputMode="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="you@example.com"
        returnKeyType="next"
        textContentType="emailAddress"
        value={email}
      />

      <Text style={[guestUiStyles.label, styles.passwordLabel]}>Password</Text>
      <GuestTextInput
        accessibilityLabel="Password"
        autoCapitalize="none"
        autoComplete={isSignUp ? 'new-password' : 'current-password'}
        editable={!isSubmitting}
        onChangeText={setPassword}
        onSubmitEditing={() => void submit()}
        placeholder={isSignUp ? 'Use at least 6 characters' : 'Enter your password'}
        returnKeyType="done"
        secureTextEntry
        textContentType={isSignUp ? 'newPassword' : 'password'}
        value={password}
      />

      {message ? (
        <View accessibilityLiveRegion="assertive">
          <Text style={guestUiStyles.error}>{message}</Text>
          {__DEV__ && diagnosticCode ? (
            <Text style={styles.diagnostic}>Diagnostic: {diagnosticCode}</Text>
          ) : null}
        </View>
      ) : null}

      <GuestButton disabled={isSubmitting} onPress={() => void submit()}>
        {isSubmitting ? (isSignUp ? 'Creating account…' : 'Signing in…') : (isSignUp ? 'Create account' : 'Sign in')}
      </GuestButton>
      {isSubmitting ? (
        <ActivityIndicator accessibilityLabel="Authentication in progress" color={colors.violet} style={styles.spinner} />
      ) : null}

      <View style={styles.switchRow}>
        <Text style={styles.switchCopy}>{isSignUp ? 'Already have an account?' : 'New to Zatora?'}</Text>
        <Pressable
          accessibilityRole="link"
          disabled={isSubmitting}
          onPress={() => router.replace(isSignUp ? '/(auth)/sign-in' as never : '/(auth)/sign-up' as never)}
        >
          <Text style={styles.switchLink}>{isSignUp ? 'Sign in' : 'Create account'}</Text>
        </Pressable>
      </View>

      {!isSignUp ? (
        <Text style={styles.recoveryNote}>
          Password recovery is not available in this native build yet and is required before private beta.
        </Text>
      ) : null}
    </GuestShell>
  );
}

const styles = StyleSheet.create({
  passwordLabel: { marginTop: 18 },
  spinner: { marginTop: 14 },
  switchRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center', marginTop: 24 },
  switchCopy: { color: colors.textMuted, fontSize: 14 },
  switchLink: { color: colors.amber, fontSize: 14, fontWeight: '800' },
  recoveryNote: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 22, textAlign: 'center' },
  diagnostic: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
});
