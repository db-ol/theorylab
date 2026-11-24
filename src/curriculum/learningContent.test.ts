import { expect, it } from 'vitest'
import { generateStudyQuestion, lessons } from './learningContent'
import { objectives } from './objectives'
import { validateAnswer } from '../questions'

it('gives all official objectives published lesson fields and enough original questions for default mastery', () => {
  expect(Object.keys(lessons).sort()).toEqual(objectives.map(({ id }) => id).sort())
  for (const objective of objectives) {
    const lesson = lessons[objective.id]
    expect(objective.status).toBe('implemented')
    expect(objective.validation).toBe('automated')
    expect(lesson.definition.length).toBeGreaterThan(12)
    for (const field of [lesson.explanation, lesson.example, lesson.mistake, lesson.memory]) expect(field, objective.id).toMatch(/\p{Script=Han}/u)
    expect(lesson.pattern.length).toBeGreaterThan(12)
    const questions = Array.from({ length: 400 }, (_, seed) => generateStudyQuestion(objective.id, seed))
    expect(new Set(questions.map((question) => question.contentKey ?? question.id)).size, objective.id).toBeGreaterThanOrEqual(10)
    expect(new Set(questions.map((question) => question.variant)).size, objective.id).toBeGreaterThanOrEqual(2)
    for (const question of questions) {
      const { pitch, number, optionId } = question.correctAnswer
      expect(question.objectiveId).toBe(objective.id)
      expect(question.stem).not.toMatch(/\p{Script=Han}/u)
      expect(validateAnswer(question, pitch ?? number ?? optionId)).toBe(true)
      expect(question.explanationZh).toMatch(/\p{Script=Han}/u)
    }
  }
})
