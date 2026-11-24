import { generateStudyQuestion } from '../curriculum/learningContent'
import { generateExamQuestion } from '../exam/grade5'
import type { Question } from './question'
import { createRandom, type QuestionSeed } from './random'

export const lessonCheckSize = 3

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
  const kinds = new Set<NonNullable<Question['answerKind']>>()
  const priority = (key: string, question: Question) => {
    const kind = question.answerKind ?? 'choice'
    const newFormat = selected.length === 0 ? kind === 'choice' : !kinds.has(kind)
    return (seen.has(key) ? 0 : 8) + (newFormat ? 2 : 0) + (variants.has(question.variant) ? 0 : 1)
  }

  while (selected.length < lessonCheckSize && candidates.size > 0) {
    const [key, question] = [...candidates.entries()].sort(([keyA, a], [keyB, b]) => priority(keyB, b) - priority(keyA, a))[0]
    selected.push(question)
    variants.add(question.variant)
    kinds.add(question.answerKind ?? 'choice')
    candidates.delete(key)
  }
  return selected
}
