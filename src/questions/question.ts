import { sameSpelling, type Clef, type Pitch } from '../theory'
import type { QuestionSeed, Random } from './random'

export interface QuestionOption {
  id: string
  text: string
  explanationZh: string
}

export interface Question {
  id: string
  objectiveId: string
  seed: QuestionSeed
  difficulty: number
  variant: string
  contentKey?: string
  stem: string
  options: QuestionOption[]
  correctAnswer: { optionId: string; pitch?: Pitch; number?: number }
  answerKind?: 'choice' | 'pitch' | 'numeric' | 'dropdown'
  explanationZh: string
  terms: string[]
  notation?: { clef: Clef; pitches: Pitch[]; keySignature?: number }
}

export function makeOptions(
  random: Random,
  candidates: readonly Omit<QuestionOption, 'id'>[],
  correctText: string,
): Pick<Question, 'options' | 'correctAnswer'> {
  if (new Set(candidates.map(option => option.text)).size !== candidates.length) {
    throw new Error('Question options must have unique labels')
  }
  const options = random.shuffle(candidates).map((option, index) => ({ ...option, id: String(index + 1) }))
  const correct = options.find(option => option.text === correctText)
  if (!correct) throw new Error('The correct answer must be present in the options')
  return { options, correctAnswer: { optionId: correct.id } }
}

export type QuestionAnswer = string | number | Pitch

export function validateAnswer(question: Question, answer: QuestionAnswer): boolean {
  if (typeof answer === 'number') return question.correctAnswer.number === answer
  if (typeof answer === 'string') return question.correctAnswer.optionId === answer
  return question.correctAnswer.pitch !== undefined && sameSpelling(question.correctAnswer.pitch, answer)
}
