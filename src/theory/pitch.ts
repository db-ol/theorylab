export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
export type Letter = typeof LETTERS[number]

export interface Pitch {
  letter: Letter
  accidental: number
  octave: number
}

export const CLEFS = ['treble', 'alto', 'tenor', 'bass'] as const
export type Clef = typeof CLEFS[number]

const NATURAL_SEMITONES: Record<Letter, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
}

const BOTTOM_LINE: Record<Clef, Pitch> = {
  treble: { letter: 'E', accidental: 0, octave: 4 },
  alto: { letter: 'F', accidental: 0, octave: 3 },
  tenor: { letter: 'D', accidental: 0, octave: 3 },
  bass: { letter: 'G', accidental: 0, octave: 2 },
}

export function modulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus
}

export function parsePitch(text: string): Pitch {
  const match = /^([A-Ga-g])([#b♯♭♮𝄪𝄫x]*)(-?\d+)$/u.exec(text.trim())
  if (!match) throw new RangeError(`Invalid pitch: ${text}`)
  const [, inputLetter, signs, octaveText] = match
  const letter = inputLetter.toUpperCase() as Letter
  const octave = Number(octaveText)
  if (!Number.isSafeInteger(octave)) throw new RangeError(`Invalid octave: ${octaveText}`)
  const accidental = parseAccidental(signs)
  return { letter, accidental, octave }
}

function parseAccidental(signs: string): number {
  if (signs === '' || signs === '♮') return 0
  if (signs === 'x' || signs === '𝄪') return 2
  if (signs === '𝄫') return -2
  if (/^[#♯]+$/u.test(signs)) return signs.length
  if (/^[b♭]+$/u.test(signs)) return -signs.length
  throw new RangeError(`Invalid accidental: ${signs}`)
}

export function formatAccidental(accidental: number): string {
  if (accidental === 2) return '𝄪'
  if (accidental === -2) return '𝄫'
  if (accidental < 0) return '♭'.repeat(-accidental)
  return '♯'.repeat(accidental)
}

export function formatPitch(pitch: Pitch): string {
  return `${pitch.letter}${formatAccidental(pitch.accidental)}${pitch.octave}`
}

export function formatPitchName(pitch: Pick<Pitch, 'letter' | 'accidental'>): string {
  return `${pitch.letter}${formatAccidental(pitch.accidental)}`
}

export function diatonicIndex(pitch: Pick<Pitch, 'letter' | 'octave'>): number {
  return 7 * pitch.octave + LETTERS.indexOf(pitch.letter)
}

export function pitchAtDiatonicIndex(index: number, accidental = 0): Pitch {
  return { letter: LETTERS[modulo(index, 7)], accidental, octave: Math.floor(index / 7) }
}

export function midiNumber(pitch: Pitch): number {
  return 12 * (pitch.octave + 1) + NATURAL_SEMITONES[pitch.letter] + pitch.accidental
}

export function sameSpelling(left: Pitch, right: Pitch): boolean {
  return left.letter === right.letter && left.accidental === right.accidental && left.octave === right.octave
}

export function sameSound(left: Pitch, right: Pitch): boolean {
  return midiNumber(left) === midiNumber(right)
}

export function enharmonicSpellings(pitch: Pitch, maxAccidental = 2): Pitch[] {
  const midi = midiNumber(pitch)
  const octave = Math.floor(midi / 12) - 1
  return [octave - 1, octave, octave + 1].flatMap(candidateOctave => LETTERS.flatMap(letter => {
    const natural = { letter, accidental: 0, octave: candidateOctave }
    const accidental = midi - midiNumber(natural)
    return Math.abs(accidental) <= maxAccidental ? [{ ...natural, accidental }] : []
  }))
}

export function staffPosition(pitch: Pitch, clef: Clef): number {
  return diatonicIndex(pitch) - diatonicIndex(BOTTOM_LINE[clef])
}

export function pitchAtStaffPosition(position: number, clef: Clef, accidental = 0): Pitch {
  return pitchAtDiatonicIndex(diatonicIndex(BOTTOM_LINE[clef]) + position, accidental)
}

export function transposeOctaves(pitch: Pitch, octaves: number): Pitch {
  return { ...pitch, octave: pitch.octave + octaves }
}
