import { describe, expect, it } from 'vitest'
import { objectives } from '../curriculum/objectives'
import { performanceTerms } from '../curriculum/performanceTerms'
import { referenceIds, referenceLessons } from '../curriculum/referenceLessons'
import { validateAnswer } from './question'
import { generateReferenceQuestion } from './referenceQuestions'

describe('reference lessons and practice', () => {
  it('covers every terms, instruments and ornaments objective', () => {
    const required = objectives.filter(objective => /^(TER|INS|ORN)-/.test(objective.id)).map(objective => objective.id)
    expect([...referenceIds].sort()).toEqual(required.sort())
    for (const lesson of Object.values(referenceLessons)) {
      expect(lesson.explanation.length).toBeGreaterThan(50)
      expect(lesson.example).toBeTruthy()
      expect(lesson.mistake).toBeTruthy()
      expect(lesson.memory).toBeTruthy()
      expect(lesson.pattern).toBeTruthy()
    }
  })

  it('generates enough distinct, unambiguous items and variants for independent mastery', () => {
    for (const objectiveId of referenceIds) {
      const content = new Set<string>()
      const variants = new Set<string>()
      for (let seed = 0; seed < 256; seed++) {
        const item = generateReferenceQuestion(objectiveId, seed)
        content.add(item.contentKey!)
        variants.add(item.variant)
        expect(item.options.filter(option => validateAnswer(item, option.id))).toHaveLength(1)
        expect(new Set(item.options.map(option => option.text)).size).toBe(item.options.length)
        expect(item.options.length).toBeGreaterThanOrEqual(2)
        for (const option of item.options) expect(option.explanationZh).toMatch(/[。！]$/u)
      }
      expect(content.size, objectiveId).toBeGreaterThanOrEqual(10)
      expect(variants.size, objectiveId).toBeGreaterThanOrEqual(2)
      expect(generateReferenceQuestion(objectiveId, 'repeat')).toEqual(generateReferenceQuestion(objectiveId, 'repeat'))
    }
  })

  it('preserves diacritics and groups abbreviations with their underlying term', () => {
    expect(performanceTerms.find(term => term.english === 'animé')?.objectiveId).toBe('TER-4-FRENCH')
    expect(performanceTerms.find(term => term.english === 'mässig')?.definition).toBe('moderate')
    expect(performanceTerms.find(term => term.english === 'sforzando')?.aliases).toContain('sfz')
    expect(performanceTerms.find(term => term.english === 'fortepiano')?.aliases).toContain('fp')
  })
})
