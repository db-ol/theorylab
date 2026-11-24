import { describe, expect, it } from 'vitest'
import { formatPitch, parsePitch, staffPosition, type Pitch } from '../theory'
import {
  generateIntervalQuestion, INTERVAL_OBJECTIVE_IDS, isIntervalObjective, validateAnswer,
  type Question, type QuestionOption,
} from '.'

const naturalPitchClasses = { A: 9, B: 11, C: 0, D: 2, E: 4, F: 5, G: 7 }
const refWidth = (pitch: Pitch) => 12 * pitch.octave + naturalPitchClasses[pitch.letter] + pitch.accidental
const referenceNames: Record<number, Record<number, string>> = {
  2: { 1: 'minor', 2: 'major', 3: 'augmented' },
  3: { 2: 'diminished', 3: 'minor', 4: 'major', 5: 'augmented' },
  4: { 4: 'diminished', 5: 'perfect', 6: 'augmented' },
  5: { 6: 'diminished', 7: 'perfect', 8: 'augmented' },
  6: { 7: 'diminished', 8: 'minor', 9: 'major', 10: 'augmented' },
  7: { 9: 'diminished', 10: 'minor', 11: 'major', 12: 'augmented' },
  8: { 11: 'diminished', 12: 'perfect', 13: 'augmented' },
}

function independentInterval(first: Pitch, second: Pitch) {
  const letterOrder = 'CDEFGAB'
  const height = (pitch: Pitch) => letterOrder.indexOf(pitch.letter) + 7 * pitch.octave
  const number = Math.abs(height(second) - height(first)) + 1
  const semitones = Math.abs(refWidth(second) - refWidth(first))
  const simpleNumber = number > 8 ? number - 7 : number
  const width = number > 8 ? semitones - 12 : semitones
  return { number, quality: referenceNames[simpleNumber]?.[width], semitones }
}

function independentlyCorrect(question: Question, option: QuestionOption, first: Pitch, second: Pitch): boolean {
  const actual = independentInterval(first, second)
  if (question.variant.startsWith('distance')) {
    return option.text === String(actual.semitones) || option.text === (actual.semitones === 1 ? 'A semitone' : 'A tone')
  }
  if (question.variant === 'number') return Number.parseInt(option.text, 10) === actual.number
  if (question.variant === 'quality') return option.text === actual.quality
  if (question.variant === 'construct') {
    const candidate = parsePitch(option.text)
    const possible = independentInterval(first, candidate)
    return possible.number === actual.number && possible.quality === actual.quality
      && (refWidth(candidate) > refWidth(first)) === (refWidth(second) > refWidth(first))
  }
  const words = option.text.split(' ')
  if (words[0] !== 'compound') return words[0] === actual.quality && Number.parseInt(words[1], 10) === actual.number
  const simpleNumber = words[2] === 'octave' ? 8 : Number.parseInt(words[2], 10)
  return words[1] === actual.quality && simpleNumber + 7 === actual.number
}

describe('interval question generator', () => {
  it.each(INTERVAL_OBJECTIVE_IDS)('%s produces deterministic and independently scored questions', objectiveId => {
    const variants = new Set<string>()
    const musicalPrompts = new Set<string>()
    const shapes = new Set<string>()
    for (let seed = 0; seed < 1400; seed += 1) {
      const question = generateIntervalQuestion(objectiveId, seed)
      expect(question).toEqual(generateIntervalQuestion(objectiveId, seed))
      expect(question.objectiveId).toBe(objectiveId)
      expect(question.seed).toBe(seed)
      expect(question.id).toContain(objectiveId)
      expect(question.explanationZh).toMatch(/[。]/)
      expect(question.options.every(option => option.explanationZh.includes('。'))).toBe(true)
      expect(question.stem).not.toMatch(/\p{Script=Han}/u)
      expect(question.options.some(option => /\p{Script=Han}/u.test(option.text))).toBe(false)
      expect(new Set(question.options.map(option => option.text)).size).toBe(question.options.length)
      expect(question.contentKey).toBeDefined()
      expect(question.notation).toBeDefined()

      const notation = question.notation!
      const first = notation.pitches[0]
      const second = question.correctAnswer.pitch ?? notation.pitches[1]
      const result = independentInterval(first, second)
      expect(notation.pitches.every(pitch => Math.abs(pitch.accidental) <= 2)).toBe(true)
      expect(Math.abs(second.accidental)).toBeLessThanOrEqual(2)
      expect(notation.pitches.every(pitch => staffPosition(pitch, notation.clef) >= -6)).toBe(true)
      expect(notation.pitches.every(pitch => staffPosition(pitch, notation.clef) <= 15)).toBe(true)
      if (question.answerKind === 'numeric') {
        expect(question.variant).toBe('number input')
        expect(question.correctAnswer.number).toBe(result.number)
        expect(validateAnswer(question, result.number)).toBe(true)
        expect(validateAnswer(question, result.number + 1)).toBe(false)
      } else {
        expect(question.options.filter(option => independentlyCorrect(question, option, first, second)).map(option => option.id),
          JSON.stringify({ objectiveId, seed, first, second, stem: question.stem, options: question.options.map(option => option.text), result }))
          .toEqual([question.correctAnswer.optionId])
        expect(question.options.filter(option => validateAnswer(question, option.id))).toHaveLength(1)
      }
      expect(validateAnswer(question, 'invalid')).toBe(false)

      if (question.variant === 'construct') {
        expect(question.options).toHaveLength(4)
        expect(notation.pitches).toHaveLength(1)
        expect(validateAnswer(question, second)).toBe(true)
        expect(validateAnswer(question, { ...second, accidental: second.accidental + 1 })).toBe(false)
        expect(validateAnswer(question, { ...second, octave: second.octave + 1 })).toBe(false)
        const correctChoice = question.options.find(option => validateAnswer(question, option.id))
        expect(correctChoice?.text).toBe(formatPitch(second))
      }
      if (objectiveId === 'INT-5-COMPOUND') expect(result.number).toBeGreaterThanOrEqual(9)
      else expect(result.number).toBeLessThanOrEqual(8)
      if (objectiveId === 'INT-1-TONE') expect([1, 2]).toContain(result.semitones)

      variants.add(question.variant)
      musicalPrompts.add(question.contentKey!)
      shapes.add(`${result.quality} ${result.number}`)
    }
    expect(musicalPrompts.size).toBeGreaterThan(20)
    if (objectiveId === 'INT-1-TONE') expect([...variants].sort()).toEqual(['distance semitone count', 'distance terminology'])
    if (objectiveId === 'INT-1-NUMBER' || objectiveId === 'INT-2-NUMBER') {
      expect([...variants].sort()).toEqual(['number', 'number input'])
    }
    if (objectiveId === 'INT-3-QUALITY') expect([...variants].sort()).toEqual(['identify', 'quality'])
    if (objectiveId === 'INT-4-DIATONIC' || objectiveId.startsWith('INT-5')) {
      expect([...variants].sort()).toEqual(['construct', 'identify', 'quality'])
    }
    if (objectiveId === 'INT-4-DIATONIC') {
      expect([...shapes]).toEqual(expect.arrayContaining([
        'minor 2', 'augmented 2', 'augmented 4', 'diminished 4',
        'augmented 5', 'diminished 5', 'diminished 7',
      ]))
    }
  })

  it('supports deliberate selection of Grade 5 test patterns with reproducible IDs', () => {
    const question = generateIntervalQuestion('INT-5-COMPOUND', 'mock/session/4', 'construct')
    expect(question.answerKind).toBe('pitch')
    expect(question.variant).toBe('construct')
    expect(question).toEqual(generateIntervalQuestion(question.objectiveId, question.seed, 'construct'))
    expect(generateIntervalQuestion(question.objectiveId, question.seed, 'quality').id).not.toBe(question.id)
    expect(isIntervalObjective('INT-5-COMPOUND')).toBe(true)
    expect(isIntervalObjective('KEY-1-MAJOR')).toBe(false)
    expect(() => generateIntervalQuestion('KEY-1-MAJOR', 1)).toThrow()
    expect(() => generateIntervalQuestion('INT-1-NUMBER', 1, 'construct')).toThrow()
  })

  it('preserves the explicitly requested foundation choice formats and identifiers', () => {
    const distance = generateIntervalQuestion('INT-1-TONE', 42, 'distance')
    const number = generateIntervalQuestion('INT-2-NUMBER', 42, 'number')
    expect(distance).toMatchObject({ variant: 'distance', id: 'INT-1-TONE:v1:distance:number:42' })
    expect(number).toMatchObject({ variant: 'number', id: 'INT-2-NUMBER:v1:number:number:42' })
    expect(number.options).toHaveLength(4)
  })
})
