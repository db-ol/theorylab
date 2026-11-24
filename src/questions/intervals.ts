import {
  buildInterval, buildScale, describeInterval, formatInterval, formatPitch, getKeySignature, midiNumber,
  ordinal, parsePitch, pitchAtStaffPosition, staffPosition, transposeOctaves,
  CLEFS, STANDARD_INTERVAL_QUALITIES, validQualities,
  type Clef, type Direction, type Interval, type IntervalSpec, type Pitch, type ScaleForm, type StandardIntervalQuality,
} from '../theory'
import { nameDistractors, numberDistractors, pitchDistractors } from './interval-distractors'
import {
  explainIntervalOption, explainNumberOption, explainPitchOption, explainQualityOption,
  intervalExplanation, numberExplanation,
} from './interval-explanations'
import { makeOptions, type Question } from './question'
import { createRandom, type QuestionSeed, type Random } from './random'

export const INTERVAL_OBJECTIVE_IDS = [
  'INT-1-TONE', 'INT-1-NUMBER', 'INT-2-NUMBER', 'INT-3-QUALITY', 'INT-4-DIATONIC', 'INT-5-SIMPLE', 'INT-5-COMPOUND',
] as const

export type IntervalObjectiveId = typeof INTERVAL_OBJECTIVE_IDS[number]
export type IntervalVariant = 'distance' | 'number' | 'identify' | 'quality' | 'construct'

const TASKS: Record<IntervalObjectiveId, { grade: number; variants: readonly IntervalVariant[] }> = {
  'INT-1-TONE': { grade: 1, variants: ['distance'] },
  'INT-1-NUMBER': { grade: 1, variants: ['number'] },
  'INT-2-NUMBER': { grade: 2, variants: ['number'] },
  'INT-3-QUALITY': { grade: 3, variants: ['identify', 'quality'] },
  'INT-4-DIATONIC': { grade: 4, variants: ['identify', 'quality', 'construct'] },
  'INT-5-SIMPLE': { grade: 5, variants: ['identify', 'quality', 'construct'] },
  'INT-5-COMPOUND': { grade: 5, variants: ['identify', 'quality', 'construct'] },
}

const NOTATION_CLEFS: Record<number, readonly Clef[]> = {
  1: ['treble', 'bass'], 2: ['treble', 'bass'], 3: ['treble', 'bass'],
  4: ['treble', 'alto', 'bass'], 5: CLEFS,
}

const SYLLABUS_QUALITIES: Record<number, readonly StandardIntervalQuality[]> = {
  2: ['major', 'minor', 'augmented'],
  3: ['major', 'minor', 'augmented', 'diminished'],
  4: ['perfect', 'augmented', 'diminished'],
  5: ['perfect', 'augmented', 'diminished'],
  6: ['major', 'minor', 'augmented', 'diminished'],
  7: ['major', 'minor', 'augmented', 'diminished'],
  8: ['perfect', 'augmented', 'diminished'],
}

const GRADE_FOUR_QUALITIES: Partial<Record<number, readonly StandardIntervalQuality[]>> = {
  2: ['minor', 'augmented'],
  4: ['augmented', 'diminished'],
  5: ['augmented', 'diminished'],
  7: ['diminished'],
}

function recognitionPool(grade: number): IntervalSpec[] {
  const lastNumber = grade === 5 ? 15 : 8
  return Array.from({ length: lastNumber - 1 }, (_, index) => {
    const number = index + 2
    if (grade === 5) {
      return SYLLABUS_QUALITIES[number > 8 ? number - 7 : number].map(quality => ({ number, quality }))
    }
    const core = number === 2 ? ['major'] as const
      : validQualities(number).filter(quality => quality !== 'augmented' && quality !== 'diminished')
    const extended = grade === 4 ? GRADE_FOUR_QUALITIES[number] ?? [] : []
    return [...core, ...extended].map(quality => ({ number, quality }))
  }).flat()
}

interface IntervalPair {
  from: Pitch
  to: Pitch
  clef: Clef
  keySignature?: number
  keyName?: string
}

function tonalPair(grade: number, random: Random): IntervalPair {
  const counts = grade === 1 ? [-1, 0, 1, 2] : grade === 2 ? [-3, -2, -1, 0, 1, 2, 3] : []
  const count = counts.length ? random.pick(counts) : random.integer(-grade - 1, grade + 1)
  const key = getKeySignature(count)
  const minor = grade > 2 ? random.integer(0, 1) === 1 : grade === 2 && [-1, 0, 1].includes(count) && random.integer(0, 1) === 1
  const forms: readonly ScaleForm[] = grade === 2 ? ['harmonic minor'] : ['harmonic minor', 'melodic minor', 'natural minor']
  const form = minor ? random.pick(forms) : 'major'
  const name = minor ? key.minor : key.major
  const start = grade === 4 ? random.integer(0, 6) : 0
  const distance = random.integer(1, 7)
  const tonic = parsePitch(`${name}4`)
  const scale = buildScale(tonic, form)
  const extendedScale = [...scale, ...scale.slice(1, 7).map(pitch => transposeOctaves(pitch, 1))]
  const offsets = [-3, -2, -1, 0, 1]
  const eligible = NOTATION_CLEFS[grade].flatMap(clef => {
    const bottom = grade === 1 ? (clef === 'treble' ? -2 : 0) : grade === 2 ? -5 : -6
    const top = grade === 1 ? (clef === 'treble' ? 9 : 10) : grade === 2 ? 13 : 15
    return offsets.flatMap(offset => {
      const from = transposeOctaves(extendedScale[start], offset)
      const to = transposeOctaves(extendedScale[start + distance], offset)
      return staffPosition(from, clef) >= bottom && staffPosition(to, clef) <= top ? [{ from, to, clef }] : []
    })
  })
  const { from, to, clef } = random.pick(eligible)
  const order = grade === 4 && random.integer(0, 3) === 0 ? { from: to, to: from } : { from, to }
  return { ...order, clef, keySignature: count, keyName: `${name} ${minor ? 'minor' : 'major'}` }
}

function chromaticPair(compound: boolean, random: Random): IntervalPair {
  const clef = random.pick(NOTATION_CLEFS[5])
  const simpleNumber = random.integer(2, 8)
  const spec: IntervalSpec = {
    number: simpleNumber + (compound ? 7 : 0),
    quality: random.pick(SYLLABUS_QUALITIES[simpleNumber]),
  }
  const direction: Direction = random.integer(0, 4) === 0 ? 'descending' : 'ascending'
  const positions = compound
    ? direction === 'ascending' ? [-5, 0] : [10, 14]
    : direction === 'ascending' ? [-4, 5] : [3, 12]
  const natural = pitchAtStaffPosition(random.integer(positions[0], positions[1]), clef)
  const pitchPairs = [0, 0, -1, 1, -2, 2].flatMap(accidental => {
    const from = { ...natural, accidental }
    const to = buildInterval(from, spec, direction)
    return Math.abs(to.accidental) <= 2 ? [{ from, to }] : []
  })
  const pair = random.pick(pitchPairs)
  return {
    ...pair, clef,
    keySignature: random.integer(0, 3) === 0 ? random.integer(-6, 6) : 0,
  }
}

function distanceQuestion(random: Random): Omit<Question, 'id' | 'objectiveId' | 'seed' | 'difficulty'> {
  const clef = random.pick(NOTATION_CLEFS[1])
  const from = pitchAtStaffPosition(random.integer(clef === 'treble' ? -2 : 0, 7), clef)
  const adjacent = [-1, 0, 1].map(accidental => (
    pitchAtStaffPosition(staffPosition(from, clef) + 1, clef, accidental)
  )).filter(pitch => [1, 2].includes(midiNumber(pitch) - midiNumber(from)))
  const to = random.pick(adjacent)
  const distance = midiNumber(to) - midiNumber(from)
  const byName = random.integer(0, 1) === 0
  const explanationZh = `${formatPitch(from)} 到 ${formatPitch(to)} 相隔 ${distance} 个半音。钢琴上每跨到相邻的琴键就是一个半音，两个半音合起来是一个全音。数白键之前，也要检查中间有没有黑键。`
  const labels = byName ? ['A semitone', 'A tone'] : ['0', '1', '2', '3']
  const correct = byName ? labels[distance - 1] : String(distance)
  const options = labels.map((text, index) => {
    const value = byName ? index + 1 : index
    return {
      text,
      explanationZh: value === distance
        ? `这个选项表示 ${distance} 个半音，符合键盘上的实际距离。`
        : `这个选项表示 ${value} 个半音，题目中两音相距 ${distance} 个半音。`,
    }
  })
  return {
    variant: byName ? 'distance terminology' : 'distance semitone count',
    contentKey: `${byName}:${formatPitch(from)}:${formatPitch(to)}`,
    stem: byName ? 'Which term describes the distance between these notes?' : 'How many semitones separate these notes?',
    ...makeOptions(random, options, correct),
    explanationZh,
    terms: ['tone', 'semitone'],
    notation: { clef, pitches: [from, to] },
  }
}

function compoundAlias(interval: IntervalSpec): string {
  const reduced = interval.number - 7
  return `compound ${interval.quality} ${reduced === 8 ? 'octave' : ordinal(reduced)}`
}

function constructionQuestion(
  pair: IntervalPair, interval: Interval, random: Random,
): Pick<Question, 'stem' | 'options' | 'correctAnswer' | 'answerKind' | 'explanationZh'> {
  const { from, to } = pair
  const text = formatPitch(to)
  const name = interval.number > 8 && random.integer(0, 1) === 1
    ? compoundAlias(interval) : formatInterval(interval)
  const direction = interval.direction === 'descending' ? 'lower' : 'higher'
  const choices = makeOptions(random, [to, ...pitchDistractors(from, to, random)].map(pitch => ({
    text: formatPitch(pitch),
    explanationZh: explainPitchOption(from, to, pitch),
  })), text)
  return {
    stem: `Choose the ${direction} note that forms a ${name} with the given note.`,
    ...choices,
    answerKind: 'pitch',
    correctAnswer: { ...choices.correctAnswer, pitch: to },
    explanationZh: `先按度数找到目标字母 ${to.letter} 和所在八度，再用升降号调整到所需的半音宽度。${intervalExplanation(from, to, interval)}`,
  }
}

function recognitionQuestion(
  pair: IntervalPair, interval: Interval, variant: IntervalVariant, grade: number, random: Random,
): Pick<Question, 'stem' | 'options' | 'correctAnswer' | 'explanationZh'> {
  const { from, to, keyName } = pair
  if (variant === 'number') {
    const correct = ordinal(interval.number)
    const labels = [interval.number, ...numberDistractors(interval.number, random)]
    const options = labels.map(number => ({
      text: ordinal(number),
      explanationZh: explainNumberOption(number, interval),
    }))
    return {
      stem: `What is the interval number above the tonic of ${keyName}?`,
      ...makeOptions(random, options, correct),
      explanationZh: numberExplanation(from, to, interval),
    }
  }
  if (variant === 'quality') {
    const qualities = grade === 3 ? ['perfect', 'major', 'minor'] : STANDARD_INTERVAL_QUALITIES
    const options = qualities.map(quality => ({ text: quality, explanationZh: explainQualityOption(quality, interval) }))
    return {
      stem: 'Which quality describes the interval shown?',
      ...makeOptions(random, options, interval.quality),
      explanationZh: intervalExplanation(from, to, interval),
    }
  }
  const labels = [interval, ...nameDistractors(interval, random, recognitionPool(grade))]
  const useCompoundAliases = interval.number > 8 && random.integer(0, 1) === 1
  const label = (option: IntervalSpec) => useCompoundAliases && option.number > 8
    ? compoundAlias(option) : formatInterval(option)
  const options = labels.map(candidate => ({
    text: label(candidate),
    explanationZh: explainIntervalOption(candidate, interval),
  }))
  return {
    stem: grade === 3 ? `Identify the interval shown above the tonic of ${keyName}.` : 'Identify the interval shown.',
    ...makeOptions(random, options, label(interval)),
    explanationZh: intervalExplanation(from, to, interval),
  }
}

export function isIntervalObjective(id: string): id is IntervalObjectiveId {
  return INTERVAL_OBJECTIVE_IDS.some(objective => objective === id)
}

export function generateIntervalQuestion(objectiveId: string, seed: QuestionSeed, requestedVariant?: IntervalVariant): Question {
  if (!isIntervalObjective(objectiveId)) throw new RangeError(`Unknown interval objective: ${objectiveId}`)
  const { grade, variants } = TASKS[objectiveId]
  const random = createRandom(`${objectiveId}:${typeof seed}:${seed}`)
  const variant = requestedVariant ?? random.pick(variants)
  if (!variants.includes(variant)) throw new RangeError(`${variant} is unavailable for ${objectiveId}`)
  const metadata = { id: `${objectiveId}:v1:${variant}:${typeof seed}:${seed}`, objectiveId, seed, difficulty: grade, variant }
  if (variant === 'distance') {
    const distance = distanceQuestion(random)
    return { ...metadata, ...distance, variant: requestedVariant ?? distance.variant }
  }

  const compound = objectiveId === 'INT-5-COMPOUND'
  const pair = grade === 5 ? chromaticPair(compound, random) : tonalPair(grade, random)
  const interval = describeInterval(pair.from, pair.to)
  const terms = variant === 'number'
    ? ['interval', 'tonic', 'octave']
    : ['interval', 'interval quality', 'semitone', interval.quality, compound ? 'compound interval' : 'simple interval']
  const answer = variant === 'construct'
    ? constructionQuestion(pair, interval, random)
    : recognitionQuestion(pair, interval, variant, grade, random)
  const question: Question = {
    ...metadata,
    ...answer,
    contentKey: `${variant}:${formatPitch(pair.from)}:${formatPitch(pair.to)}`,
    terms,
    notation: {
      clef: pair.clef,
      pitches: variant === 'construct' ? [pair.from] : [pair.from, pair.to],
      keySignature: pair.keySignature,
    },
  }
  const numericPresentation = variant === 'number' && requestedVariant === undefined
    && createRandom(`${metadata.id}:presentation`).integer(0, 2) === 0
  if (!numericPresentation) return question
  return {
    ...question,
    id: `${objectiveId}:v2:number-input:${typeof seed}:${seed}`,
    variant: 'number input',
    stem: `Enter the interval number above the tonic of ${pair.keyName}.`,
    options: [],
    answerKind: 'numeric',
    correctAnswer: { optionId: String(interval.number), number: interval.number },
  }
}
