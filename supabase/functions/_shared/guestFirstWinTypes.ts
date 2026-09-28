export const SUPPORT_NEEDS = [
  'getting_started',
  'staying_focused',
  'keeping_up',
  'consistency',
  'everything',
] as const

export type SupportNeed = (typeof SUPPORT_NEEDS)[number]

export interface GuestFirstWinRequest {
  task: string
  supportNeed: SupportNeed
  simplificationDepth: number
}

export interface GuestFirstWinResponse {
  acknowledgement: string
  tinyFirstStep: string
  followUpSteps: string[]
  francoLine: string
}
