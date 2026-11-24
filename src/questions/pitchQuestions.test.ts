import { describe, expect, it } from 'vitest'
import { pitchLessons } from '../curriculum/pitchLessons'
import { formatPitch, formatPitchName, parsePitch, type Pitch } from '../theory'
import { generatePitchQuestion, isPitchObjective, PITCH_OBJECTIVE_IDS } from './pitchQuestions'
import { validateAnswer } from './question'

const pitchClass = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const chromatic = (note: Pitch) => 12 * note.octave + pitchClass[note.letter] + note.accidental
const written = (note: Pitch) => 7 * note.octave + 'CDEFGAB'.indexOf(note.letter)
const bottom = { treble: 'E4', bass: 'G2', alto: 'F3', tenor: 'D3' }
const order = ['first', 'second', 'third', 'fourth', 'fifth']
const sharps = 'FCGDAEB'
const flats = 'BEADGCF'

describe('pitch, clef and transposition practice', () => {
  it.each(PITCH_OBJECTIVE_IDS)('%s has a lesson and original independently validated practice', objectiveId => {
    expect(isPitchObjective(objectiveId)).toBe(true)
    expect(pitchLessons[objectiveId].explanation.length).toBeGreaterThan(50)
    expect(pitchLessons[objectiveId].demo.pitches.length).toBeGreaterThan(1)
    const prompts = new Set<string>()
    const signatures = new Set<number>()
    const stems = new Set<string>()
    const variants = new Set<string>()
    for (let seed = 0; seed < 420; seed += 1) {
      const question = generatePitchQuestion(objectiveId, seed)
      expect(question).toEqual(generatePitchQuestion(objectiveId, seed))
      expect(question.stem).not.toMatch(/\p{Script=Han}/u)
      expect(question.explanationZh).toContain('。')
      expect(question.options.every(option => option.explanationZh.includes('。'))).toBe(true)
      expect(new Set(question.options.map(option => option.text)).size).toBe(question.options.length)
      const correct = question.options.find(option => validateAnswer(question, option.id))!
      expect(question.options.filter(option => validateAnswer(question, option.id))).toHaveLength(1)
      const { clef, pitches, keySignature = 0 } = question.notation!
      const position = written(pitches[0]) - written(parsePitch(bottom[clef]))
      if (question.variant.startsWith('read pitch')) {
        expect(correct.text).toBe(formatPitch(pitches[0]))
        if (objectiveId === 'PIT-2-LEDGER') expect([-5, -4, -3, -2, 10, 11, 12, 13]).toContain(position)
        if (objectiveId === 'PIT-3-LEDGER') expect([-7, -6, 14, 15]).toContain(position)
        if (objectiveId === 'PIT-4-ALTO') expect(clef).toBe('alto')
        if (objectiveId === 'PIT-5-TENOR') expect(clef).toBe('tenor')
      }
      if (question.variant.startsWith('enharmonic equivalent')) {
        expect(question.options.filter(option => chromatic(parsePitch(option.text)) === chromatic(pitches[0])))
          .toEqual([correct])
        expect(correct.text).not.toBe(formatPitch(pitches[0]))
      }
      if (['same bar', 'cancellation', 'new bar'].includes(question.variant)) {
        const note = pitches[0]
        const sign = keySignature > 0 ? sharps : flats
        const defaultAlteration = sign.slice(0, Math.abs(keySignature)).includes(note.letter) ? Math.sign(keySignature) : 0
        const expected = question.variant === 'new bar'
          ? { ...note, accidental: defaultAlteration } : pitches[1]
        expect(correct.text).toBe(formatPitchName(expected))
      }
      if (question.variant.startsWith('same pitch')) {
        const destination = question.stem.match(/the (treble|alto|bass) clef/)?.[1] as 'treble' | 'alto' | 'bass'
        const target = written(pitches[0]) - written(parsePitch(bottom[destination]))
        expect(destination).not.toBe(clef)
        if (target >= 0 && target <= 8) {
          expect(correct.text).toBe(`The ${order[Math.floor(target / 2)]} ${target % 2 === 0 ? 'line' : 'space'}`)
        } else {
          const distance = target < 0 ? -target : target - 8
          expect(correct.text).toBe(`The ${order[Math.ceil(distance / 2) - 1]} ${distance % 2 === 0 ? 'ledger line' : 'space'} ${target < 0 ? 'below' : 'above'} the stave`)
        }
      }
      if (question.variant.startsWith('octave transposition')) {
        const direction = question.stem.includes('octave higher') ? 1 : -1
        const selected = correct.text.split(', ').map(parsePitch)
        expect(selected).toEqual(pitches.map(pitch => ({ ...pitch, octave: pitch.octave + direction })))
      }
      if (question.variant.startsWith('instrument transposition')) {
        const target = correct.text.split(', ').map(parsePitch)
        const keys = question.stem.includes('B flat') ? [1, 2] : question.stem.includes('instrument in A') ? [2, 3] : [4, 7]
        const direction = question.stem.includes('Transpose it down') ? -1 : 1
        expect(target.map((note, i) => written(note) - written(pitches[i]))).toEqual(pitches.map(() => keys[0] * direction))
        expect(target.map((note, i) => chromatic(note) - chromatic(pitches[i]))).toEqual(pitches.map(() => keys[1] * direction))
      }
      prompts.add(question.contentKey!)
      signatures.add(keySignature)
      stems.add(question.stem)
      variants.add(question.variant)
    }
    expect(prompts.size).toBeGreaterThan(10)
    expect(variants.size).toBeGreaterThanOrEqual(2)
    if (objectiveId === 'PIT-5-FOUR-CLEFS') expect(signatures.size).toBe(13)
    if (objectiveId === 'TRN-5-CONCERT') expect(stems.size).toBe(6)
  })

  it('rejects objective ids from other domains', () => {
    expect(isPitchObjective('RHY-1-NOTES')).toBe(false)
    expect(() => generatePitchQuestion('RHY-1-NOTES', 1)).toThrow()
  })
})
