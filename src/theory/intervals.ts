import { diatonicIndex, midiNumber, pitchAtDiatonicIndex, type Pitch } from './pitch'

export const STANDARD_INTERVAL_QUALITIES = ['perfect', 'major', 'minor', 'augmented', 'diminished'] as const
export type StandardIntervalQuality = typeof STANDARD_INTERVAL_QUALITIES[number]
export type IntervalQuality = StandardIntervalQuality | 'doubly augmented' | 'doubly diminished'
  | 'triply augmented' | 'triply diminished' | `${number} times augmented` | `${number} times diminished`
export type Direction = 'ascending' | 'descending'

export interface IntervalSpec {
  number: number
  quality: IntervalQuality
}

export interface Interval extends IntervalSpec {
  semitones: number
  direction: Direction | 'unison'
}

const BASE_SEMITONES = [0, 2, 4, 5, 7, 9, 11]

function intervalBaseline(number: number): { semitones: number; perfectFamily: boolean } {
  if (!Number.isSafeInteger(number) || number < 1) throw new RangeError('Invalid interval number')
  const index = (number - 1) % 7
  return {
    semitones: BASE_SEMITONES[index] + 12 * Math.floor((number - 1) / 7),
    perfectFamily: index === 0 || index === 3 || index === 4,
  }
}

function repeatedQuality(count: number, quality: 'augmented' | 'diminished'): IntervalQuality {
  if (count === 1) return quality
  if (count === 2) return `doubly ${quality}`
  if (count === 3) return `triply ${quality}`
  return `${count} times ${quality}`
}

export function describeInterval(from: Pitch, to: Pitch): Interval {
  const steps = diatonicIndex(to) - diatonicIndex(from)
  const chromatic = midiNumber(to) - midiNumber(from)
  const order = Math.sign(steps || chromatic)
  const number = Math.abs(steps) + 1
  const semitones = chromatic * order || 0
  const baseline = intervalBaseline(number)
  const offset = semitones - baseline.semitones
  let quality: IntervalQuality
  if (offset === 0) quality = baseline.perfectFamily ? 'perfect' : 'major'
  else if (offset > 0) quality = repeatedQuality(offset, 'augmented')
  else if (offset === -1 && !baseline.perfectFamily) quality = 'minor'
  else quality = repeatedQuality(-offset - Number(!baseline.perfectFamily), 'diminished')
  const direction = order < 0 ? 'descending' : order > 0 ? 'ascending' : 'unison'
  return { number, quality, semitones, direction }
}

export function intervalSemitones({ number, quality }: IntervalSpec): number {
  const baseline = intervalBaseline(number)
  if (
    (quality === 'perfect' && baseline.perfectFamily)
    || (quality === 'major' && !baseline.perfectFamily)
  ) return baseline.semitones
  if (quality === 'minor' && !baseline.perfectFamily) return baseline.semitones - 1
  const modified = /^(?:(doubly|triply|\d+ times) )?(augmented|diminished)$/.exec(quality)
  if (!modified) throw new RangeError(`Invalid interval quality for a ${number}: ${quality}`)
  const [, multiplier, modifier] = modified
  let count = 1
  if (multiplier === 'doubly') count = 2
  else if (multiplier === 'triply') count = 3
  else if (multiplier) count = Number.parseInt(multiplier, 10)
  if (!Number.isSafeInteger(count) || count < 1) throw new RangeError(`Invalid interval quality: ${quality}`)
  return modifier === 'augmented'
    ? baseline.semitones + count
    : baseline.semitones - count - Number(!baseline.perfectFamily)
}

export function buildInterval(from: Pitch, interval: IntervalSpec, direction: Direction = 'ascending'): Pitch {
  const sign = direction === 'ascending' ? 1 : -1
  const semitones = intervalSemitones(interval)
  if (interval.number === 1 && semitones < 0) throw new RangeError('A unison cannot have negative width')
  const target = pitchAtDiatonicIndex(diatonicIndex(from) + sign * (interval.number - 1))
  const midi = midiNumber(from) + sign * semitones
  return { ...target, accidental: midi - midiNumber(target) }
}

export function validQualities(number: number): readonly StandardIntervalQuality[] {
  if (number === 1) return ['perfect', 'augmented']
  return intervalBaseline(number).perfectFamily
    ? ['perfect', 'augmented', 'diminished']
    : ['major', 'minor', 'augmented', 'diminished']
}

export function ordinal(number: number): string {
  const lastTwo = number % 100
  const endings: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }
  const suffix = lastTwo >= 11 && lastTwo <= 13 ? 'th' : (endings[number % 10] ?? 'th')
  return `${number}${suffix}`
}

export function formatInterval({ number, quality }: IntervalSpec): string {
  return `${quality} ${number === 1 ? 'unison' : ordinal(number)}`
}
