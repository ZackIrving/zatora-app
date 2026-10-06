import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GuestButton, GuestHeading, GuestTextInput, guestUiStyles } from '@/components/GuestUi';
import { GuestShell } from '@/components/GuestShell';
import { useGuestOnboarding } from '@/guest/GuestOnboardingProvider';
import { requestGuestFirstWin } from '@/guest/guestFirstWinLiveService';
import { getFirstTaskPlaceholder } from '../../../../shared/guest/firstTaskPlaceholder.js';
import { MAX_GUEST_TASK_LENGTH, SUPPORT_NEED_VALUES } from '../../../../shared/guest/firstWinContract.js';

const SUPPORT_OPTIONS = [
  ['getting_started', 'Getting started'],
  ['staying_focused', 'Staying focused'],
  ['keeping_up', 'Keeping up with everything'],
  ['consistency', 'Building consistency'],
  ['everything', 'Honestly, a little of everything'],
] as const;

const SUPPORT_ACKNOWLEDGEMENTS: Record<string, string> = {
  getting_started: "We'll make the first move small.",
  staying_focused: "We'll clear some room for one thing.",
  keeping_up: "That's a lot to carry. We'll sort out what matters now.",
  consistency: "We'll build something steady—not perfect.",
  everything: 'Fair. One thing at a time.',
};

export default function GuestOnboardingRoute() {
  const router = useRouter();
  const {
    draft,
    isRestoring,
    transitionTo,
    startOver,
    normalizeGuestName,
    isValidGuestName,
    normalizeGuestTask,
    isValidGuestTask,
    isValidSupportNeed,
    requestSimplification,
    applySimplification,
    failSimplification,
    applyDeterministicFallback,
    acceptTask,
    stillWorking,
    completeFirstWin,
  } = useGuestOnboarding();
  const [nameInput, setNameInput] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [error, setError] = useState('');
  const requestKeyRef = useRef('');
  const restoredStep = draft?.step;
  const restoredName = draft?.name;
  const restoredTask = draft?.firstTask;

  useEffect(() => {
    if (!restoredStep) return;
    // Draft persistence is the external source of truth on restore/navigation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNameInput(restoredName ?? '');
    setTaskInput(restoredTask ?? '');
    setError('');
  }, [restoredStep, restoredName, restoredTask]);

  // M4 intentionally uses the shared deterministic fallback behind a service
  // boundary. Restored processing states remain an explicit recovery/error
  // state because the shared domain forbids automatic generation retries.
  useEffect(() => {
    if (draft?.step !== 'simplify' || draft.simplificationStatus !== 'idle') return;
    requestSimplification();
  }, [draft?.step, draft?.simplificationStatus, requestSimplification]);

  useEffect(() => {
    if (draft?.step !== 'simplify' || draft.simplificationStatus !== 'processing') {
      requestKeyRef.current = '';
      return;
    }
    const requestKey = `${draft.guestId}:${draft.simplificationDepth}:${draft.firstTask}:${draft.simplifiedTask}:processing`;
    if (requestKeyRef.current === requestKey) return;
    requestKeyRef.current = requestKey;
    let cancelled = false;
    const task = draft.simplificationDepth === 0 ? draft.firstTask : draft.simplifiedTask;
    void requestGuestFirstWin({
      task,
      supportNeed: draft.supportNeed,
      simplificationDepth: draft.simplificationDepth,
    }).then((result) => {
      if (!cancelled) applySimplification(result);
    }).catch((serviceError: { code?: string }) => {
      if (!cancelled) failSimplification(serviceError.code ?? 'provider');
    });
    return () => {
      cancelled = true;
    };
  }, [
    applySimplification,
    draft?.firstTask,
    draft?.guestId,
    draft?.simplificationDepth,
    draft?.simplificationStatus,
    draft?.simplifiedTask,
    draft?.step,
    draft?.supportNeed,
    failSimplification,
  ]);

  const supportLabel = useMemo(
    () => SUPPORT_OPTIONS.find(([value]) => value === draft?.supportNeed)?.[1] ?? 'your next step',
    [draft?.supportNeed],
  );

  if (isRestoring) return <GuestShell><Text style={guestUiStyles.body}>Restoring your starting point…</Text></GuestShell>;
  if (!draft) return <Redirect href={'/(guest)/welcome' as any} />;

  const back = (step: string) => {
    setError('');
    transitionTo(step);
  };

  const submitName = () => {
    const name = normalizeGuestName(nameInput);
    if (!isValidGuestName(name)) {
      setError('Tell Franco what to call you (up to 60 characters).');
      return;
    }
    transitionTo('support', { name });
  };

  const chooseSupport = (supportNeed: string) => {
    if (!isValidSupportNeed(supportNeed) || !SUPPORT_NEED_VALUES.includes(supportNeed as any)) return;
    transitionTo('handoff', { supportNeed });
  };

  const submitTask = () => {
    const firstTask = normalizeGuestTask(taskInput);
    if (!isValidGuestTask(firstTask)) {
      setError('Keep it to one clear task (up to 500 characters).');
      return;
    }
    transitionTo('simplify', { firstTask });
  };

  if (draft.step === 'name') {
    return <GuestShell>
      <Pressable accessibilityRole="button" onPress={() => { back('intro'); router.replace('/(guest)/welcome' as never); }}><Text style={guestUiStyles.back}>‹ Back</Text></Pressable>
      <GuestHeading eyebrow="FRANCO" title="Hey—I’m Franco." body="We'll take things one small step at a time." />
      <Text style={guestUiStyles.label}>You can call me</Text>
      <GuestTextInput accessibilityLabel="Your name" autoCapitalize="words" autoCorrect={false} autoFocus maxLength={60} onChangeText={setNameInput} onSubmitEditing={submitName} placeholder="Your name" returnKeyType="next" value={nameInput} />
      {error ? <Text accessibilityLiveRegion="assertive" style={guestUiStyles.error}>{error}</Text> : null}
      <GuestButton onPress={submitName}>That’s me</GuestButton>
    </GuestShell>;
  }

  if (draft.step === 'support') {
    return <GuestShell>
      <Pressable accessibilityRole="button" onPress={() => back('name')}><Text style={guestUiStyles.back}>‹ Back</Text></Pressable>
      <GuestHeading eyebrow="FRANCO" title={`Nice to meet you, ${draft.name}.`} body="What would make things feel a little easier right now?" />
      <View accessibilityRole="radiogroup" accessibilityLabel="Support need options">
        {SUPPORT_OPTIONS.map(([value, label]) => {
          const selected = draft.supportNeed === value;
          return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} key={value} onPress={() => chooseSupport(value)} style={[guestUiStyles.option, selected && guestUiStyles.selectedOption]}><Text style={guestUiStyles.optionText}>{label}</Text></Pressable>;
        })}
      </View>
    </GuestShell>;
  }

  if (draft.step === 'handoff') {
    return <GuestShell>
      <Pressable accessibilityRole="button" onPress={() => back('support')}><Text style={guestUiStyles.back}>‹ Back</Text></Pressable>
      <GuestHeading eyebrow="I’M WITH YOU" title={`Got it, ${draft.name}.`} body={SUPPORT_ACKNOWLEDGEMENTS[draft.supportNeed] ?? 'We’ll take it one step at a time.'} />
      <Text style={guestUiStyles.body}>Let’s make something easier right now.</Text>
      <GuestButton onPress={() => transitionTo('task')}>Let’s do it</GuestButton>
    </GuestShell>;
  }

  if (draft.step === 'task') {
    return <GuestShell keyboardAware>
      <Pressable accessibilityRole="button" onPress={() => back('handoff')}><Text style={guestUiStyles.back}>‹ Back</Text></Pressable>
      <GuestHeading eyebrow={supportLabel.toUpperCase()} title="What’s one thing you’ve been putting off?" body="Don’t overthink it. Just give me the thing that’s been hanging around in your head." />
      <Text style={guestUiStyles.label}>The thing I’ve been putting off</Text>
      <GuestTextInput accessibilityLabel="Your first task" autoCapitalize="sentences" autoCorrect blurOnSubmit onChangeText={setTaskInput} multiline maxLength={MAX_GUEST_TASK_LENGTH} onSubmitEditing={submitTask} placeholder={getFirstTaskPlaceholder(draft.supportNeed)} returnKeyType="done" style={guestUiStyles.taskInput} value={taskInput} />
      <Text style={guestUiStyles.helper}>{Array.from(taskInput).length}/{MAX_GUEST_TASK_LENGTH} characters</Text>
      {error ? <Text accessibilityLiveRegion="assertive" style={guestUiStyles.error}>{error}</Text> : null}
      <GuestButton onPress={submitTask}>Help me start</GuestButton>
    </GuestShell>;
  }

  if (draft.step === 'simplify') {
    // Sprint 12C native First Win arrives in M4 through the local service seam.
    const isProcessing = draft.simplificationStatus === 'processing';
    const isAvailable = draft.simplificationStatus === 'available';
    const errorMessage: Record<string, string> = {
      timeout: 'That took too long. Nothing was lost.',
      provider: 'Franco hit a small snag. Your task is still here.',
      rate_limited: 'Franco needs a breather before trying that again.',
      invalid_response: 'Franco could not make a safe small step this time.',
      offline: 'You appear to be offline. Your task is saved locally.',
      feature_disabled: 'Franco is taking a short maintenance nap.',
    };
    return <GuestShell>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit my task" onPress={() => transitionTo('task')}><Text style={guestUiStyles.back}>‹ Edit my task</Text></Pressable>
      <View accessibilityLiveRegion="polite" accessibilityRole="text">
        <GuestHeading
          eyebrow={isAvailable ? "LET'S MAKE THIS SMALLER" : 'FRANCO IS THINKING'}
          title={isAvailable ? 'Start here.' : 'Let me make this easier.'}
          body={isProcessing ? 'Franco is helping make the task smaller.' : undefined}
        />
        <View style={styles.taskContext}>
          <Text style={styles.taskContextLabel}>YOUR TASK</Text>
          <Text style={styles.taskContextText}>{draft.firstTask}</Text>
        </View>
        {isAvailable ? (
          <>
            {draft.acknowledgement ? <Text style={guestUiStyles.body}>{draft.acknowledgement}</Text> : null}
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>START HERE</Text>
              <Text style={styles.resultText}>{draft.simplifiedTask}</Text>
            </View>
            {draft.followUpSteps.length > 0 ? <Text style={guestUiStyles.helper}>After that, if you want: {draft.followUpSteps.join(' · ')}</Text> : null}
            {draft.francoLine ? <Text style={styles.francoLine}>{draft.francoLine}</Text> : null}
          </>
        ) : null}
        {draft.simplificationStatus === 'error' ? <Text style={guestUiStyles.error}>{errorMessage[draft.simplificationError ?? 'provider']}</Text> : null}
      </View>
      {isAvailable ? <>
        <GuestButton onPress={acceptTask}>Start with this</GuestButton>
        {draft.simplificationDepth < 2 ? <GuestButton secondary onPress={() => transitionTo('simplify', { simplificationDepth: draft.simplificationDepth + 1, acceptedTask: false, followUpSteps: [], simplificationStatus: 'idle' })}>Make it even smaller</GuestButton> : null}
      </> : null}
      {draft.simplificationStatus === 'error' ? <>
        <GuestButton onPress={requestSimplification}>Try Franco again</GuestButton>
        <GuestButton secondary onPress={applyDeterministicFallback}>Use a tiny local step</GuestButton>
      </> : null}
      <GuestButton secondary onPress={() => { startOver(); router.replace('/(guest)/welcome' as never); }}>Start over</GuestButton>
    </GuestShell>;
  }

  if (draft.step === 'commitment') {
    return <GuestShell>
      <Pressable accessibilityRole="button" onPress={() => transitionTo('simplify')}><Text style={guestUiStyles.back}>‹ Back</Text></Pressable>
      <View accessibilityLiveRegion="polite" accessibilityRole="text">
        <GuestHeading eyebrow="ONE SMALL MOVE" title="Just this one thing." body="No timer. No pressure. Franco will stay right here." />
        <View style={styles.resultCard}><Text style={styles.resultText}>{draft.simplifiedTask}</Text></View>
      </View>
      <GuestButton onPress={completeFirstWin}>I did it</GuestButton>
      <GuestButton secondary onPress={stillWorking}>Still working</GuestButton>
      {draft.simplificationDepth < 2 ? <GuestButton secondary onPress={() => transitionTo('simplify', { simplificationDepth: draft.simplificationDepth + 1, acceptedTask: false, followUpSteps: [], simplificationStatus: 'idle' })}>Make it smaller</GuestButton> : null}
    </GuestShell>;
  }

  if (draft.step === 'win') {
    return <GuestShell hero>
      <View accessibilityLiveRegion="polite" accessibilityRole="text">
        <GuestHeading eyebrow="FIRST WIN" title="There it is. You started." body="You started. That counts." />
        <View style={styles.xpCard}><Text style={styles.xpText}>+25 XP</Text><Text style={styles.xpCaption}>Starter XP earned locally</Text></View>
      </View>
    </GuestShell>;
  }

  return <Redirect href={'/(guest)/welcome' as any} />;
}

const styles = StyleSheet.create({
  resultCard: { backgroundColor: '#171c29', borderColor: '#7c5cff55', borderRadius: 16, borderWidth: 1, marginTop: 18, padding: 18 },
  resultLabel: { color: '#c9beff', fontSize: 11, fontWeight: '800', letterSpacing: 1.6, marginBottom: 8 },
  resultText: { color: '#f7f7fb', fontSize: 20, fontWeight: '800', lineHeight: 29 },
  taskContext: { marginTop: 4, paddingHorizontal: 4, paddingVertical: 8 },
  taskContextLabel: { color: '#7f879a', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  taskContextText: { color: '#a7adbd', fontSize: 14, lineHeight: 20, marginTop: 4 },
  francoLine: { color: '#ffdc91', fontSize: 14, fontStyle: 'italic', lineHeight: 21, marginTop: 16 },
  xpCard: { alignItems: 'center', backgroundColor: '#3b2d18', borderColor: '#ffb34066', borderRadius: 18, borderWidth: 1, marginTop: 20, padding: 20 },
  xpText: { color: '#ffedbd', fontSize: 34, fontWeight: '900' },
  xpCaption: { color: '#ffedbda8', fontSize: 13, marginTop: 4 },
});
