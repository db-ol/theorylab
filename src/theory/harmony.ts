import { buildInterval, describeInterval, type Direction, type IntervalSpec } from './intervals'
import { buildScale, type ScaleForm } from './keys'
import { formatPitchName, midiNumber, transposeOctaves, type Pitch } from './pitch'

export type Triad = [Pitch, Pitch, Pitch]
export type TriadQuality = 'major' | 'minor' | 'diminished' | 'augmented'
export type Inversion = 0 | 1 | 2

const CHORD_INTERVALS: Record<TriadQuality, [IntervalSpec, IntervalSpec]> = {
  major: [{ number: 3, quality: 'major' }, { number: 5, quality: 'perfect' }],
  minor: [{ number: 3, quality: 'minor' }, { number: 5, quality: 'perfect' }],
  diminished: [{ number: 3, quality: 'minor' }, { number: 5, quality: 'diminished' }],
  augmented: [{ number: 3, quality: 'major' }, { number: 5, quality: 'augmented' }],
}

export function buildTriad(root: Pitch, quality: TriadQuality): Triad {
  const [third, fifth] = CHORD_INTERVALS[quality]
  return [root, buildInterval(root, third), buildInterval(root, fifth)]
}

export function invertTriad([root, third, fifth]: Triad, inversion: Inversion): Triad {
  if (inversion === 1) return [third, fifth, transposeOctaves(root, 1)]
  if (inversion === 2) return [fifth, transposeOctaves(root, 1), transposeOctaves(third, 1)]
  return [root, third, fifth]
}

export function buildScaleTriad(tonic: Pitch, form: ScaleForm, degree: number): Triad {
  if (!Number.isInteger(degree) || degree < 1 || degree > 7) throw new RangeError('Invalid chord degree')
  const scale = buildScale(tonic, form)
  const scaleNote = (index: number) => transposeOctaves(scale[index % 7], Math.floor(index / 7))
  return [scaleNote(degree - 1), scaleNote(degree + 1), scaleNote(degree + 3)]
}

export function triadQuality([root, third, fifth]: Triad): TriadQuality {
  const thirdInterval = describeInterval(root, third)
  const fifthInterval = describeInterval(root, fifth)
  for (const [quality, [candidateThird, candidateFifth]] of Object.entries(CHORD_INTERVALS)) {
    if (
      thirdInterval.number === candidateThird.number && thirdInterval.quality === candidateThird.quality
      && fifthInterval.number === candidateFifth.number && fifthInterval.quality === candidateFifth.quality
    ) return quality as TriadQuality
  }
  throw new RangeError('Expected a tertian triad in root position')
}

export function identifyTriadInversion(voicing: readonly Pitch[], rootPosition: Triad): Inversion | null {
  if (voicing.length !== 3) return null
  const expected = rootPosition.map(formatPitchName)
  const sorted = [...voicing].sort((left, right) => midiNumber(left) - midiNumber(right))
  const given = sorted.map(formatPitchName)
  if (!expected.every(note => given.includes(note))) return null
  return expected.indexOf(given[0]) as Inversion
}

export type Cadence = 'perfect' | 'plagal' | 'imperfect'

export function identifyCadence(penultimateDegree: number, finalDegree: number): Cadence | null {
  if (penultimateDegree === 5 && finalDegree === 1) return 'perfect'
  if (penultimateDegree === 4 && finalDegree === 1) return 'plagal'
  if ([1, 2, 4].includes(penultimateDegree) && finalDegree === 5) return 'imperfect'
  return null
}

export function transposePitch(
  pitch: Pitch, interval: IntervalSpec, direction: Direction = 'ascending',
): Pitch {
  return buildInterval(pitch, interval, direction)
}

export type TransposingInstrument = 'B♭' | 'A' | 'F'

const INSTRUMENT_TRANSPOSITION: Record<TransposingInstrument, IntervalSpec> = {
  'B♭': { number: 2, quality: 'major' },
  A: { number: 3, quality: 'minor' },
  F: { number: 5, quality: 'perfect' },
}

export function transposeInstrumentPitch(
  pitch: Pitch, instrument: TransposingInstrument, target: 'written' | 'sounding',
): Pitch {
  const direction = target === 'sounding' ? 'descending' : 'ascending'
  return transposePitch(pitch, INSTRUMENT_TRANSPOSITION[instrument], direction)
}
