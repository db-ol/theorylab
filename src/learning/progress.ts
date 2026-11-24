import type { Question } from '../questions'

export type AttemptMode = 'practice' | 'lesson' | 'review' | 'diagnostic' | 'exam' | 'vocabulary'

export const mistakeCauses = [
  'Missing theoretical knowledge', 'Misunderstood English terminology',
  'Misread musical notation', 'Calculation error', 'Careless mistake', 'Time pressure',
] as const

export interface Attempt {
  id: string
  objectiveId: string
  questionId: string
  contentKey: string
  seed: number | string
  variant: string
  stem: string
  answer: string
  correctAnswer: string
  question?: Question
  choices?: { label: string; correct: boolean; explanationZh: string }[]
  explanationZh: string
  correct: boolean
  assisted: boolean
  mode: AttemptMode
  at: number
  durationMs: number
}

export interface MasterySettings {
  minDistinct: number
  minAccuracy: number
  minVariants: number
}

export type MasteryStage = 'Not started' | 'Learning' | 'Practicing' | 'Provisionally mastered' | 'Mastered' | 'Needs review'
export const defaultSettings: MasterySettings = { minDistinct: 10, minAccuracy: 0.9, minVariants: 2 }
export const reviewDays = [1, 3, 7, 14, 30] as const
export const dayMs = 86_400_000

export function accuracy(attempts: readonly Attempt[]): number | null {
  return attempts.length ? attempts.filter((attempt) => attempt.correct).length / attempts.length : null
}

export function orderAttempts(attempts: readonly Attempt[]) {
  return [...attempts].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))
}

export function reviewSchedule(attempts: readonly Attempt[], settings = defaultSettings) {
  let dueAt: number | null = null
  let step = 0
  let delayedSuccess = false
  const history: Attempt[] = []
  const independent = new Map<string, Attempt>()
  for (const attempt of orderAttempts(attempts)) {
    if (!attempt.assisted) independent.set(attempt.contentKey, attempt)
    if (attempt.mode === 'review') history.push(attempt)
    if (!attempt.correct) {
      step = 0
      delayedSuccess = false
      dueAt = attempt.at + reviewDays[step] * dayMs
    } else if (attempt.mode === 'review' && !attempt.assisted && dueAt !== null && attempt.at >= dueAt) {
      step = Math.min(step + 1, reviewDays.length - 1)
      delayedSuccess = true
      dueAt = attempt.at + reviewDays[step] * dayMs
    } else if (dueAt === null && independent.size >= settings.minDistinct) {
      dueAt = attempt.at + reviewDays[step] * dayMs
    }
  }
  return { dueAt, step, delayedSuccess, history }
}

export function summarizeObjective(attempts: readonly Attempt[], visited: boolean, now: number, settings = defaultSettings) {
  const latest = new Map<string, Attempt>()
  for (const attempt of orderAttempts(attempts)) if (!attempt.assisted) latest.set(attempt.contentKey, attempt)
  const independent = [...latest.values()]
  const distinct = independent.length
  const variants = new Set(independent.filter((attempt) => attempt.correct).map((attempt) => attempt.variant)).size
  const independentAccuracy = accuracy(independent)
  const schedule = reviewSchedule(attempts, settings)
  const due = schedule.dueAt !== null && schedule.dueAt <= now
  const qualifies = distinct >= settings.minDistinct && (independentAccuracy ?? 0) >= settings.minAccuracy && variants >= settings.minVariants
  let stage: MasteryStage = visited ? 'Learning' : 'Not started'
  if (attempts.length) stage = 'Practicing'
  if (qualifies) stage = schedule.delayedSuccess ? 'Mastered' : 'Provisionally mastered'
  if (due) stage = 'Needs review'
  return { stage, due, independentAccuracy, distinct, variants, schedule }
}

export function localStreak(attempts: readonly Attempt[], now: number): number {
  const dates = new Set(attempts.map((attempt) => new Date(attempt.at).toDateString()))
  const date = new Date(now)
  if (!dates.has(date.toDateString())) date.setDate(date.getDate() - 1)
  let days = 0
  while (dates.has(date.toDateString())) {
    days += 1
    date.setDate(date.getDate() - 1)
  }
  return days
}
