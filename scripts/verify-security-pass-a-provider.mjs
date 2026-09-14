import { createClient } from '@supabase/supabase-js'

const REQUIRED_ENVIRONMENT = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'ZATORA_QA_A_EMAIL',
  'ZATORA_QA_A_PASSWORD',
]
const REQUEST_TIMEOUT_MS = 45_000
function printResult(passed) {
  console.log(
    `Provider probe${'.'.repeat(32 - 'Provider probe'.length)} ${passed ? 'PASS' : 'FAIL'}`
  )
}

async function run() {
  if (REQUIRED_ENVIRONMENT.some((name) => !process.env[name])) {
    printResult(false)
    process.exitCode = 1
    return
  }

  try {
    const client = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      }
    )
    const { data, error } = await client.auth.signInWithPassword({
      email: process.env.ZATORA_QA_A_EMAIL,
      password: process.env.ZATORA_QA_A_PASSWORD,
    })

    if (error || !data.session?.access_token) {
      printResult(false)
      process.exitCode = 1
      return
    }

    const response = await fetch(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/ai-task-coach`,
      {
        method: 'POST',
        headers: {
          apikey: process.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input:
            'Security QA: suggest one harmless five-minute next step.',
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    )

    const passed = response.status === 200
    await response.body?.cancel()
    printResult(passed)
    if (!passed) process.exitCode = 1
  } catch {
    printResult(false)
    process.exitCode = 1
  }
}

await run()
