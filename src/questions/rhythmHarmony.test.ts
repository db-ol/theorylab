import { expect, it } from 'vitest'
import { harmonyLessons } from '../curriculum/harmonyLessons'
import { rhythmLessons } from '../curriculum/rhythmLessons'
import { generateHarmonyQuestion } from './harmonyQuestions'
import { validateAnswer } from './question'
import { generateRhythmQuestion } from './rhythmQuestions'

it('generates deterministic distinct options and scores every rhythm and harmony objective', () => {
  for (const [lessons, generate] of [[rhythmLessons, generateRhythmQuestion], [harmonyLessons, generateHarmonyQuestion]] as const) {
    for (const id of Object.keys(lessons)) {
      const distinct = new Set<string>()
      for (let seed = 0; seed < 150; seed++) {
        const question = generate(id, seed)
        expect(question).toEqual(generate(id, seed))
        expect(question.objectiveId).toBe(id)
        expect(question.explanationZh).toMatch(/。/)
        distinct.add(question.contentKey ?? question.id)
        if (question.answerKind === 'numeric') {
          const answer = question.correctAnswer.number!
          expect(Number.isInteger(answer)).toBe(true)
          expect(validateAnswer(question, answer)).toBe(true)
          expect(validateAnswer(question, answer + 1)).toBe(false)
        } else {
          expect(question.options.length).toBeGreaterThan(1)
          expect(new Set(question.options.map((option) => option.text)).size).toBe(question.options.length)
          expect(question.options.filter((option) => validateAnswer(question, option.id))).toHaveLength(1)
        }
      }
      expect(distinct.size, id).toBeGreaterThanOrEqual(2)
    }
  }
})

it('checks independent golden duration and harmony examples', () => {
  const find = (id: string, stem: string, generate: typeof generateHarmonyQuestion) =>
    Array.from({ length: 500 }, (_, seed) => generate(id, seed)).find((question) => question.stem.includes(stem))
  const time = find('RHY-4-DOUBLE-DOT', 'How many semiquavers have the same total duration as one double dotted crotchet', generateRhythmQuestion)
  expect(time?.correctAnswer.number).toBe(7)
  const key = find('HAR-4-PRIMARY', 'Which notes, in ascending order, form the root position dominant triad in A minor', generateHarmonyQuestion)
  expect(key?.options.find((option) => option.id === key.correctAnswer.optionId)?.text).toBe('E, G♯, B')
  const cadence = find('HAR-5-PLAGAL', 'Which progression forms a plagal cadence in F major', generateHarmonyQuestion)
  expect(cadence?.options.find((option) => option.id === cadence.correctAnswer.optionId)?.text).toBe('B♭ major to F major')
})
