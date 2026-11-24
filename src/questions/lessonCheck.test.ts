import { describe, expect, it } from 'vitest'
import { objectives } from '../curriculum/objectives'
import { buildLessonCheck, lessonCheckSize } from './lessonCheck'
import { validateAnswer, type Question } from './question'

function key(question: Question): string {
  return question.contentKey ?? question.id
}

describe('lesson knowledge checks', () => {
  it('selects a full set of distinct English questions with valid answers for every objective', () => {
    for (const { id } of objectives) {
      for (const seed of [0, 157, 'lesson']) {
        const questions = buildLessonCheck(id, seed)
        expect(questions, id).toHaveLength(lessonCheckSize)
        expect(new Set(questions.map(key)).size, id).toBe(lessonCheckSize)
        expect(new Set(questions.map(question => question.variant)).size, id).toBeGreaterThanOrEqual(2)
        for (const question of questions) {
          const { optionId, pitch, number } = question.correctAnswer
          expect(question.objectiveId).toBe(id)
          expect([question.stem, ...question.options.map(option => option.text)].join(' ')).not.toMatch(/\p{Script=Han}/u)
          expect(question.explanationZh).toMatch(/\p{Script=Han}/u)
          expect(validateAnswer(question, pitch ?? number ?? optionId)).toBe(true)
        }
      }
    }
  })

  it('uses genuine pitch placement, numeric input and dropdown matching where available', () => {
    const intervals = buildLessonCheck('INT-5-COMPOUND', 16)
    expect(intervals.some(question => question.answerKind === 'pitch' && question.correctAnswer.pitch)).toBe(true)
    expect(intervals.some(question => question.answerKind === undefined || question.answerKind === 'choice')).toBe(true)

    const rhythm = buildLessonCheck('RHY-4-BREVE', 16)
    expect(rhythm.some(question => question.answerKind === 'numeric' && Number.isFinite(question.correctAnswer.number))).toBe(true)

    const cadence = buildLessonCheck('HAR-5-CHOICE', 16)
    const matching = cadence.find(question => question.answerKind === 'dropdown')
    expect(matching?.notation?.pitches).toHaveLength(2)
    expect(new Set(matching?.options.map(option => option.text))).toEqual(new Set(['I', 'II', 'IV', 'V']))
    expect(matching?.options.filter(option => validateAnswer(matching, option.id))).toHaveLength(1)
  })

  it('reproduces a seeded check and prioritises new questions on a retake', () => {
    const first = buildLessonCheck('INT-5-COMPOUND', 'first lesson check')
    expect(buildLessonCheck('INT-5-COMPOUND', 'first lesson check')).toEqual(first)
    const prior = new Set(first.map(key))
    const next = buildLessonCheck('INT-5-COMPOUND', 'first lesson check', prior)
    expect(next.every(question => !prior.has(key(question)))).toBe(true)
  })
})
