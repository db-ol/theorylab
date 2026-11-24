import { buildInterval, type Direction } from './intervals'
import {
  LETTERS, diatonicIndex, formatPitchName, midiNumber, modulo, parsePitch, pitchAtDiatonicIndex,
  type Letter, type Pitch,
} from './pitch'

export type Mode = 'major' | 'minor'
export type ScaleForm = 'major' | 'natural minor' | 'harmonic minor' | 'melodic minor'

const MAJOR_KEYS = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#']
const MINOR_KEYS = ['Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#']
const SHARP_ORDER: readonly Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B']
const FLAT_ORDER: readonly Letter[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F']
const SCALE_STEPS: Record<ScaleForm, readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11, 12],
  'natural minor': [0, 2, 3, 5, 7, 8, 10, 12],
  'harmonic minor': [0, 2, 3, 5, 7, 8, 11, 12],
  'melodic minor': [0, 2, 3, 5, 7, 9, 11, 12],
}

export const SCALE_DEGREES = [
  'tonic', 'supertonic', 'mediant', 'subdominant', 'dominant', 'submediant', 'leading note',
] as const

export interface KeySignature {
  count: number
  accidentals: Partial<Record<Letter, number>>
  major: string
  minor: string
}

export function getKeySignature(count: number): KeySignature {
  if (!Number.isInteger(count) || Math.abs(count) > 7) throw new RangeError('Invalid key signature')
  const order = count < 0 ? FLAT_ORDER : SHARP_ORDER
  const accidentals: KeySignature['accidentals'] = {}
  for (const letter of order.slice(0, Math.abs(count))) accidentals[letter] = Math.sign(count)
  return {
    count,
    accidentals,
    major: formatPitchName(parsePitch(`${MAJOR_KEYS[count + 7]}4`)),
    minor: formatPitchName(parsePitch(`${MINOR_KEYS[count + 7]}4`)),
  }
}

export function keySignatureFor(tonic: Pick<Pitch, 'letter' | 'accidental'>, mode: Mode): KeySignature {
  const name = formatPitchName(tonic)
  const names = mode === 'major' ? MAJOR_KEYS : MINOR_KEYS
  const index = names.findIndex(entry => formatPitchName(parsePitch(`${entry}4`)) === name)
  if (index < 0) throw new RangeError(`Unknown key: ${name} ${mode}`)
  return getKeySignature(index - 7)
}

export function buildScale(tonic: Pitch, form: ScaleForm, direction: Direction = 'ascending'): Pitch[] {
  const descending = direction === 'descending'
  const pattern = SCALE_STEPS[form === 'melodic minor' && descending ? 'natural minor' : form]
  const ordered = descending ? [...pattern].reverse() : pattern
  const startingIndex = diatonicIndex(tonic)
  const startingMidi = midiNumber(tonic)
  return ordered.map((semitones, step) => {
    const distance = descending ? -step : step
    const target = pitchAtDiatonicIndex(startingIndex + distance)
    const targetMidi = startingMidi + semitones - (descending ? 12 : 0)
    return { ...target, accidental: targetMidi - midiNumber(target) }
  })
}

export function buildChromaticScale(tonic: Pitch, direction: Direction = 'ascending'): Pitch[] {
  const descending = direction === 'descending'
  const sign = descending ? -1 : 1
  const names = descending
    ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
    : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  return Array.from({ length: 13 }, (_, index) => {
    if (index === 0 || index === 12) return { ...tonic, octave: tonic.octave + sign * (index / 12) }
    const midi = midiNumber(tonic) + sign * index
    return parsePitch(`${names[modulo(midi, 12)]}${Math.floor(midi / 12) - 1}`)
  })
}

export function relativeTonic(tonic: Pitch, mode: Mode): Pitch {
  return mode === 'major'
    ? buildInterval(tonic, { number: 3, quality: 'minor' }, 'descending')
    : buildInterval(tonic, { number: 3, quality: 'minor' })
}

export function scaleDegree(tonic: Pick<Pitch, 'letter'>, note: Pick<Pitch, 'letter'>): number {
  return modulo(LETTERS.indexOf(note.letter) - LETTERS.indexOf(tonic.letter), 7) + 1
}

export function scaleDegreeName(degree: number, leadingSemitone = true): string {
  if (!Number.isInteger(degree) || degree < 1 || degree > 7) throw new RangeError('Invalid scale degree')
  return degree === 7 && !leadingSemitone ? 'subtonic' : SCALE_DEGREES[degree - 1]
}
