import { describe, expect, test } from 'vitest'
import { keyLessons } from '../curriculum/keyLessons'
import type { Pitch } from '../theory'
import { validateAnswer, type Question } from './question'
import { generateKeyQuestion, KEY_OBJECTIVE_IDS } from './keyQuestions'

const letters = 'CDEFGAB'
const naturals = [0, 2, 4, 5, 7, 9, 11]
const tonicMajor = ['G♭', 'D♭', 'A♭', 'E♭', 'B♭', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F♯']
const tonicMinor = ['E♭', 'B♭', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯', 'G♯', 'D♯']
const technical = ['tonic', 'supertonic', 'mediant', 'subdominant', 'dominant', 'submediant', 'leading note']
const formPatterns: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11, 12],
  'harmonic minor': [0, 2, 3, 5, 7, 8, 11, 12],
  'melodic minor': [0, 2, 3, 5, 7, 9, 11, 12],
  'descending melodic minor': [0, 2, 3, 5, 7, 8, 10, 12],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
}

function noteValue(name: string) {
  const accidental = ['', '♯', '𝄪'].indexOf(name.slice(1))
  const alteration = accidental >= 0 ? accidental : name.endsWith('𝄫') ? -2 : -1
  return naturals[letters.indexOf(name[0])] + alteration
}

function pitchValue(pitch: Pitch) {
  return 12 * pitch.octave + naturals[letters.indexOf(pitch.letter)] + pitch.accidental
}

function modulo(value: number, divisor: number) {
  return (value % divisor + divisor) % divisor
}

function targetOption(question: Question) {
  const target = question.options.find(option => option.id === question.correctAnswer.optionId)
  if (!target) throw new Error('Missing correct option')
  return target
}

function pattern(form: string, direction: string) {
  return formPatterns[form === 'melodic minor' && direction === 'descending' ? 'descending melodic minor' : form]
}

function verdict(question: Question, optionLabel: string) {
  if (question.variant.startsWith('chromatic-gap-') || question.variant === 'diatonic-gap') {
    const match = /^Complete the (ascending|descending) ([A-G][♯♭]?) (major|harmonic minor|melodic minor|chromatic) scale\. (.*)\.$/.exec(question.stem)
    if (!match) throw new Error('Malformed scale gap stem')
    const [, direction, tonic, form, hints] = match
    const notes = hints.split(' ').map(note => note === '[blank]' ? optionLabel : note)
    const descent = direction === 'descending'
    const offsets = pattern(form, direction)
    return notes.every((note, index) => (
      modulo(noteValue(note) - noteValue(tonic), 12) === (descent ? offsets[offsets.length - index - 1] : offsets[index]) % 12
      && (form === 'chromatic' || modulo(letters.indexOf(note[0]) - letters.indexOf(tonic[0]), 7) === modulo(index * (descent ? -1 : 1), 7))
    ))
  }
  if (question.variant === 'place-scale-degree') {
    const match = /^Place the (\d+)(st|nd|rd|th) note of the (ascending|descending) scale of [A-G][♯♭]? (major|harmonic minor|melodic minor)\./.exec(question.stem)
    const tonic = question.notation?.pitches[0]
    const written = /^([A-G][♯♭𝄪𝄫]?)(\d+)$/u.exec(optionLabel)
    if (!match || !tonic || !written) throw new Error('Incomplete placement question')
    const [, name, octave] = written
    const [, position, , direction, form] = match
    const offsets = pattern(form, direction)
    const step = Number(position) - 1
    const sign = direction === 'ascending' ? 1 : -1
    const expected = sign > 0 ? offsets[step] : offsets[offsets.length - step - 1] - 12
    const distance = (Number(octave) - tonic.octave) * 7 + letters.indexOf(name[0]) - letters.indexOf(tonic.letter)
    return 12 * Number(octave) + noteValue(name) - pitchValue(tonic) === expected && distance === sign * step
  }
  if (question.variant.startsWith('degree') || question.variant === 'extended-position') {
    const [tonic, note] = question.notation?.pitches ?? []
    const difference = (note.octave - tonic.octave) * 7 + letters.indexOf(note.letter) - letters.indexOf(tonic.letter)
    const degree = modulo(difference, 7)
    if (question.variant.startsWith('degree-name-')) return optionLabel === technical[degree]
    return Number(optionLabel) === 1 + (question.difficulty === 1 || question.variant === 'extended-position' ? difference : degree)
  }
  if (question.variant.startsWith('relative')) {
    const match = / of ([A-G][♯♭]?) (major|minor)[.?]/.exec(question.stem)
    if (!match) throw new Error('Missing source key')
    const [, source, mode] = match
    const targetMinor = mode === 'major'
    const sourceIndex = (targetMinor ? tonicMajor : tonicMinor).indexOf(source)
    if (sourceIndex < 0) throw new Error(`Unrecognised key in ${question.stem}`)
    return optionLabel === (targetMinor ? tonicMinor[sourceIndex] + ' minor' : tonicMajor[sourceIndex] + ' major')
  }
  if (question.variant === 'read-signature') {
    const count = question.notation?.keySignature
    if (count === undefined) throw new Error('Missing key signature')
    return optionLabel === (question.stem.includes('minor') ? tonicMinor[count + 6] + ' minor' : tonicMajor[count + 6] + ' major')
  }
  const key = question.stem.match(/([A-G][♯♭]?) (major|minor)/)
  if (!key) throw new Error('Missing key in stem')
  const count = (key[2] === 'major' ? tonicMajor : tonicMinor).indexOf(key[1]) - 6
  if (question.variant === 'signature-count') {
    const expected = /^([1-6]) (sharp|flat)s?$/.exec(optionLabel)
    return expected ? Number(expected[1]) * (expected[2] === 'sharp' ? 1 : -1) === count : optionLabel === 'No sharps or flats' && count === 0
  }
  if (question.variant === 'signature-order') {
    const list = (count > 0 ? 'FCGDAE' : 'BEADGC').slice(0, Math.abs(count))
    const expected = [...list].map(letter => letter + (count > 0 ? '♯' : '♭')).join(' ')
    return optionLabel === (expected || 'None')
  }
  throw new Error(`Unexpected variant ${question.variant}`)
}

describe('keys and scales', () => {
  test('ships lesson material for all nineteen objectives', () => {
    expect(Object.keys(keyLessons)).toEqual([...KEY_OBJECTIVE_IDS])
    for (const lesson of Object.values(keyLessons)) {
      expect(lesson.explanation.length).toBeGreaterThan(45)
      expect(lesson.demo?.pitches.length).toBeGreaterThan(1)
    }
  })

  test('checks deterministic answers and distractors against independent key and scale rules', () => {
    for (const id of KEY_OBJECTIVE_IDS) {
      const contentKeys = new Set()
      const variants = new Set()
      for (let seed = 0; seed < 420; seed += 1) {
        const question = generateKeyQuestion(id, seed)
        const target = targetOption(question)
        contentKeys.add(question.contentKey)
        variants.add(question.variant)
        expect(question.stem).not.toMatch(/[\p{Script=Han}]/u)
        expect(new Set(question.options.map(option => option.text)).size).toBe(question.options.length)
        expect(question.options.filter(option => verdict(question, option.text)).map(option => option.id)).toEqual([target.id])
        expect(validateAnswer(question, target.id)).toBe(true)
        expect(question.options.filter(option => option.id !== target.id).every(option => !validateAnswer(question, option.id))).toBe(true)
        if (question.correctAnswer.pitch) expect(validateAnswer(question, question.correctAnswer.pitch)).toBe(true)
        if (seed < 3) expect(generateKeyQuestion(id, seed)).toEqual(question)
      }
      expect(contentKeys.size).toBeGreaterThan(10)
      expect(variants.size).toBeGreaterThanOrEqual(2)
    }
  })
})
