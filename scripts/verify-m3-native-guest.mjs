import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const read = (relative) => readFile(path.join(root, relative), 'utf8')
const checks = []
const check = (name, condition) => {
  assert.ok(condition, name)
  checks.push(name)
}

const storage = await read('mobile/src/guest/guestStorage.ts')
const provider = await read('mobile/src/guest/GuestOnboardingProvider.tsx')
const onboarding = await read('mobile/src/app/(guest)/onboarding.tsx')
const welcome = await read('mobile/src/app/(guest)/welcome.tsx')
const guestLayout = await read('mobile/src/app/(guest)/_layout.tsx')
const rootRoute = await read('mobile/src/app/index.tsx')
const shell = await read('mobile/src/components/GuestShell.tsx')
const ui = await read('mobile/src/components/GuestUi.tsx')
const metro = await read('mobile/metro.config.js')
const domain = await read('shared/guest/guestOnboardingDomain.js')
const placeholder = await read('shared/guest/firstTaskPlaceholder.js')

check('native draft uses AsyncStorage', storage.includes("@react-native-async-storage/async-storage"))
check('native draft has a distinct versioned key', storage.includes('zatora_native_guest_onboarding_v2'))
check('native draft uses shared migration/normalization', storage.includes('migrateV1Draft') && storage.includes('normalizeGuestDraft'))
check('native draft has no browser storage APIs', !/window\.|localStorage|sessionStorage/.test(storage))
check('native provider imports the shared reducer', provider.includes('guestOnboardingReducer'))
check('native provider does not define a duplicate reducer', !/function\s+guestOnboardingReducer|const\s+guestOnboardingReducer\s*=/.test(provider))
check('native provider restores and persists drafts', provider.includes("type: 'RESTORE'") && provider.includes('saveGuestDraft') && provider.includes('clearGuestDraft'))
check('shared domain has native RESTORE action', domain.includes("case 'RESTORE'"))
check('canonical support options are present', ['getting_started', 'staying_focused', 'keeping_up', 'consistency', 'everything'].every((value) => onboarding.includes(value)))
check('native flow uses shared validation', ['normalizeGuestName', 'isValidGuestName', 'normalizeGuestTask', 'isValidGuestTask', 'isValidSupportNeed'].every((value) => onboarding.includes(value)))
check('task remains bounded at 500 characters', onboarding.includes('MAX_GUEST_TASK_LENGTH') && onboarding.includes('maxLength={MAX_GUEST_TASK_LENGTH}'))
check('native flow has keyboard-safe inputs', onboarding.includes('GuestTextInput') && shell.includes('KeyboardAvoidingView') && shell.includes('keyboardShouldPersistTaps'))
check('welcome composition uses responsive hero layout', welcome.includes('hero childrenContainerStyle={styles.welcomeBody}') && shell.includes('useWindowDimensions') && shell.includes('francoSize'))
check('task input uses focus-aware keyboard scrolling', onboarding.includes('<GuestShell keyboardAware>') && shell.includes("keyboardDidShow") && shell.includes('scrollToEnd'))
check('native flow has accessible controls', ui.includes('accessibilityRole="button"') && onboarding.includes('accessibilityRole="radio"') && onboarding.includes('accessibilityLiveRegion'))
check('native flow reaches explicit M4 boundary', onboarding.includes('Sprint 12C native First Win arrives in M4') && onboarding.includes('Edit my task') && onboarding.includes('Start over'))
check('native flow makes no provider/network request', !/requestGuestFirstWin|supabase\.functions\.invoke|\bfetch\s*\(|OPENAI_API_KEY|GUEST_QUOTA_DB_URL/.test(`${onboarding}\n${provider}\n${welcome}`))
check('authenticated session redirects away from guest flow', guestLayout.includes('<Redirect href="/" />'))
check('unauthenticated root redirects to guest flow', rootRoute.includes("'/(guest)/welcome'"))
check('authenticated root is a safe placeholder', rootRoute.includes('Authenticated session restored') && !rootRoute.includes('user.email'))
check('placeholder mapping is shared', onboarding.includes('getFirstTaskPlaceholder') && placeholder.includes('getting_started'))
check('Franco asset is referenced by native shell', shell.includes('franco-tiny-puppy-neutral.png'))
check('M2 auth dependencies remain installed', (await read('mobile/package.json')).includes('@react-native-async-storage/async-storage'))
check('Metro watches the repository root for shared modules', metro.includes('config.watchFolders') && metro.includes("path.resolve(projectRoot, '..')"))
check('Metro resolves app dependencies before workspace dependencies', metro.indexOf("path.resolve(projectRoot, 'node_modules')") < metro.indexOf("path.resolve(workspaceRoot, 'node_modules')"))

const hash = async (relative) => {
  const data = await readFile(path.join(root, relative))
  return createHash('sha256').update(data).digest('hex')
}
check('Franco asset matches source unchanged', await hash('src/assets/franco/characters/tiny-puppy/franco-tiny-puppy-neutral.png') === await hash('mobile/assets/franco-tiny-puppy-neutral.png'))

console.log(`M3 native guest verification passed: ${checks.length} checks`)
