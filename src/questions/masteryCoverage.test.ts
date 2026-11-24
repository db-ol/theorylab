import { describe, expect, it } from 'vitest'
import { summarizeObjective, defaultSettings, type Attempt } from '../learning/progress'
import { contextLessons } from '../curriculum/contextLessons'
import { generateContextQuestion } from './contextQuestions'
import { generateIntervalQuestion, INTERVAL_OBJECTIVE_IDS } from './intervals'
import { generatePitchQuestion, PITCH_OBJECTIVE_IDS } from './pitchQuestions'
import { validateAnswer, type Question } from './question'

const domains = [
  { objectives: INTERVAL_OBJECTIVE_IDS, generate: generateIntervalQuestion },
  { objectives: PITCH_OBJECTIVE_IDS, generate: generatePitchQuestion },
  { objectives: Object.keys(contextLessons), generate: generateContextQuestion },
]
const objectives = domains.flatMap(({ objectives, generate }) => objectives.map(objective => ({ objective, generate })))

function rightAttempt(question: Question, at: number, mode: 'practice' | 'review'): Attempt {
  const answer = question.correctAnswer.pitch ?? question.correctAnswer.number ?? question.correctAnswer.optionId
  return {
    id: question.id,
    objectiveId: question.objectiveId,
    questionId: question.id,
    contentKey: question.contentKey!,
    seed: question.seed,
    variant: question.variant,
    stem: question.stem,
    answer: question.correctAnswer.optionId,
    correctAnswer: question.correctAnswer.optionId,
    explanationZh: question.explanationZh,
    correct: validateAnswer(question, answer),
    assisted: false,
    mode,
    at,
    durationMs: 10_000,
  }
}

describe('mastery eligibility for generated objectives', () => {
  it.each(objectives)('$objective can qualify for delayed independent review', ({ objective, generate }) => {
    const unique = new Map(Array.from({ length: 100 }, (_, seed) => {
      const question = generate(objective, seed)
      return [question.contentKey, question]
    }))
    expect(unique.has(undefined)).toBe(false)
    const questions = [...unique.values()]
    const coverage = new Map<string, Question>()
    for (const question of questions) {
      if (!coverage.has(question.variant)) coverage.set(question.variant, question)
    }
    expect(coverage.size).toBeGreaterThanOrEqual(defaultSettings.minVariants)
    const selected = [...coverage.values()].slice(0, defaultSettings.minVariants)
    const firstQuestions = [...selected, ...questions.filter(question => !selected.includes(question))]
    const practice = firstQuestions.slice(0, defaultSettings.minDistinct)
      .map((question, index) => rightAttempt(question, 1_000 + index * 10_000, 'practice'))
    const provisional = summarizeObjective(practice, true, 100_000)
    expect(provisional.stage).toBe('Provisionally mastered')
    expect(provisional.schedule.dueAt).not.toBeNull()
    const reviewAt = provisional.schedule.dueAt!
    const delayed = rightAttempt(firstQuestions[defaultSettings.minDistinct], reviewAt, 'review')
    expect(summarizeObjective([...practice, delayed], true, reviewAt).stage).toBe('Mastered')
  })
})
