import { describe, expect, it } from 'vitest'
import { dayMs, reviewSchedule, summarizeObjective, type Attempt } from './progress'

const a = (index: number, overrides: Partial<Attempt> = {}): Attempt => ({
  id: String(index), questionId: String(index), contentKey: String(index), objectiveId: 'INT-5-SIMPLE',
  seed: index, variant: index % 2 ? 'name' : 'construct', mode: 'practice', stem: 'Question',
  answer: 'A', correctAnswer: 'A', explanationZh: '解析。', correct: true, assisted: false,
  at: index, durationMs: 2000, ...overrides,
})

describe('mastery and scheduled review', () => {
  const attempts = Array.from({ length: 10 }, (_, i) => a(i))

  it('requires independent distinct evidence and a delayed review', () => {
    expect(summarizeObjective(attempts, true, dayMs).stage).toBe('Provisionally mastered')
    expect(summarizeObjective([...attempts.slice(0, 9), a(9, { assisted: true })], true, dayMs).stage).toBe('Practicing')
    expect(summarizeObjective([...attempts.slice(0, 9), a(9, { contentKey: '0' })], true, dayMs).distinct).toBe(9)
    expect(summarizeObjective(attempts, true, dayMs + 9).stage).toBe('Needs review')
    expect(summarizeObjective([...attempts, a(11, { mode: 'review', at: dayMs + 9 })], true, dayMs + 9).stage).toBe('Mastered')
  })

  it('schedules 1, 3, 7, 14 and 30 day reviews and resets after a mistake', () => {
    const items = [a(0, { correct: false })]
    let time = 0
    for (const [index, delay] of [1, 3, 7, 14, 30].entries()) {
      time += delay * dayMs
      expect(reviewSchedule(items).dueAt).toBe(time)
      items.push(a(index + 1, { mode: 'review', at: time }))
    }
    items.push(a(9, { mode: 'review', at: time + 2, correct: false }))
    expect(reviewSchedule(items).dueAt).toBe(time + 2 + dayMs)
  })
})
