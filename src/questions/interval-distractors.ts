import {
  diatonicIndex, enharmonicSpellings, intervalSemitones, midiNumber, pitchAtDiatonicIndex, sameSpelling,
  transposeOctaves,
  type Interval, type IntervalSpec, type Pitch,
} from '../theory'
import type { Random } from './random'

export function numberDistractors(number: number, random: Random): number[] {
  const distances = [number - 1, number + 1, number - 2, number + 2, 2, 8]
  return random.shuffle([...new Set(distances)].filter(value => value >= 2 && value <= 8 && value !== number)).slice(0, 3)
}

export function nameDistractors(interval: Interval, random: Random, pool: readonly IntervalSpec[]): IntervalSpec[] {
  const candidates = pool.filter(({ number, quality }) => number !== interval.number || quality !== interval.quality)
  const scored = random.shuffle(candidates).map(candidate => {
    const sameNumber = candidate.number === interval.number
    const sameWidth = intervalSemitones(candidate) === interval.semitones
    const simpleCounterpart = interval.number > 8 && candidate.number === interval.number - 7
      && candidate.quality === interval.quality
    const numberDistance = Math.abs(candidate.number - interval.number)
    const score = 5 * Number(sameNumber) + 4 * Number(sameWidth) + 6 * Number(simpleCounterpart)
      + 2 * Number(numberDistance === 1 && candidate.quality === interval.quality)
    return { candidate, score }
  })
  return scored.sort((left, right) => right.score - left.score).slice(0, 3).map(({ candidate }) => candidate)
}

export function pitchDistractors(from: Pitch, target: Pitch, random: Random): Pitch[] {
  const higher = midiNumber(target) > midiNumber(from)
  const directionMatches = (pitch: Pitch) => {
    const writtenSteps = diatonicIndex(pitch) - diatonicIndex(from)
    const semitones = midiNumber(pitch) - midiNumber(from)
    return higher ? semitones > 0 && writtenSteps >= 0 : semitones < 0 && writtenSteps <= 0
  }
  const samePitch = enharmonicSpellings(target).filter(pitch => !sameSpelling(pitch, target))
  const nearby = random.shuffle([-1, 1]).map(offset => ({ ...target, accidental: target.accidental + offset }))
  const otherLetters = [-1, 1, -2, 2].map(offset => pitchAtDiatonicIndex(diatonicIndex(target) + offset))
  const differentOctave = transposeOctaves(target, Math.abs(midiNumber(target) - midiNumber(from)) > 12
    ? (higher ? -1 : 1)
    : (higher ? 1 : -1))
  const alternatives = [
    ...random.shuffle(samePitch),
    ...nearby,
    differentOctave,
    ...otherLetters,
  ]
  const candidates: Pitch[] = []
  for (const pitch of alternatives) {
    if (
      Math.abs(pitch.accidental) <= 2 && directionMatches(pitch) && !sameSpelling(pitch, target)
      && !candidates.some(candidate => sameSpelling(candidate, pitch))
    ) candidates.push(pitch)
  }
  return candidates.slice(0, 3)
}
