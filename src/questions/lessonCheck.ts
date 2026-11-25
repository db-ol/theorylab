import { generateStudyQuestion } from '../curriculum/learningContent'
import { generateExamQuestion } from '../exam/grade5'
import type { Question } from './question'
import { createRandom, type QuestionSeed } from './random'

export const lessonCheckSize = 3

function checkFormat(question: Question) {
  if (question.options.some((option) => option.stimulus)) return 'score-choice'
  return question.answerKind ?? 'choice'
}

export function buildLessonCheck(objectiveId: string, seed: QuestionSeed, previousKeys: Iterable<string> = []): Question[] {
  const random = createRandom(`lesson-check-v1:${objectiveId}:${typeof seed}:${seed}`)
  const seen = new Set(previousKeys)
  const candidates = new Map<string, Question>()

  for (let i = 0; i < 48; i++) {
    const questionSeed = random.integer(0, 0xffff_ffff)
    const question = objectiveId === 'HAR-5-CHOICE' && i % 2 === 1
      ? generateExamQuestion({ sectionId: 'chords', group: 1, part: random.integer(1, 5), seed: questionSeed }, questionSeed)
      : generateStudyQuestion(objectiveId, questionSeed)
    const key = question.contentKey ?? question.id
    if (!candidates.has(key)) candidates.set(key, question)
  }

  const selected: Question[] = []
  const variants = new Set<string>()
  const kinds = new Set<ReturnType<typeof checkFormat>>()
  const priority = (key: string, question: Question) => {
    const kind = checkFormat(question)
    let formatBonus = kinds.has(kind) ? 0 : 2
    if (selected.length === 0) formatBonus = kind === 'score-choice' ? 3 : kind === 'choice' ? 2 : 0
    return (seen.has(key) ? 0 : 8) + formatBonus + (variants.has(question.variant) ? 0 : 1)
  }

  while (selected.length < lessonCheckSize && candidates.size > 0) {
    const [key, question] = [...candidates.entries()].sort(([keyA, a], [keyB, b]) => priority(keyB, b) - priority(keyA, a))[0]
    selected.push(question)
    variants.add(question.variant)
    kinds.add(checkFormat(question))
    candidates.delete(key)
  }
  return selected
}
