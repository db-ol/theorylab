import { generateIntervalQuestion, isIntervalObjective, type Question, type QuestionSeed } from '../questions'
import { generateContextQuestion, isContextObjective } from '../questions/contextQuestions'
import { generateHarmonyQuestion } from '../questions/harmonyQuestions'
import { generateKeyQuestion, isKeyObjective } from '../questions/keyQuestions'
import { generatePitchQuestion, isPitchObjective } from '../questions/pitchQuestions'
import { generateReferenceQuestion } from '../questions/referenceQuestions'
import { generateRhythmQuestion } from '../questions/rhythmQuestions'
import { contextLessons } from './contextLessons'
import type { ExamStimulus } from '../exam/grade5'
import { harmonyLessons } from './harmonyLessons'
import { intervalLessons } from './intervalLessons'
import { keyLessons } from './keyLessons'
import { pitchLessons } from './pitchLessons'
import { referenceLessons } from './referenceLessons'
import { rhythmLessons, type StudyLesson } from './rhythmLessons'
import type { Clef, Pitch } from '../theory'

export interface LearningContent extends StudyLesson {
  demo?: { clef: Clef; pitches: readonly Pitch[]; keySignature?: number }
  pitches?: [string, string]
  stimulus?: ExamStimulus
}

export const lessons: Record<string, LearningContent> = {
  ...rhythmLessons, ...pitchLessons, ...intervalLessons, ...keyLessons, ...harmonyLessons, ...contextLessons, ...referenceLessons,
}

export const isAvailable = (id: string) => Object.hasOwn(lessons, id)
export function generateStudyQuestion(id: string, seed: QuestionSeed): Question {
  if (isContextObjective(id)) return generateContextQuestion(id, seed)
  if (isIntervalObjective(id)) return generateIntervalQuestion(id, seed)
  if (isPitchObjective(id)) return generatePitchQuestion(id, seed)
  if (isKeyObjective(id)) return generateKeyQuestion(id, seed)
  if (Object.hasOwn(rhythmLessons, id)) return generateRhythmQuestion(id, seed)
  if (Object.hasOwn(referenceLessons, id)) return generateReferenceQuestion(id, seed)
  if (Object.hasOwn(harmonyLessons, id)) return generateHarmonyQuestion(id, seed)
  throw new RangeError(`Unknown study objective ${id}`)
}
