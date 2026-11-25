import {
  NOTE_VALUES, addDuration, compareDuration, dottedDuration, multiplyDuration, ordinal, rational, tupletDuration,
  type Rational,
} from '../theory'
import { makeOptions, type Question } from './question'
import { createRandom, type QuestionSeed, type Random } from './random'
import type { NoteValue, RhythmPulse, RhythmStimulus } from './stimulus'

const targetIds = ['RHY-5-TUPLET', 'MET-5-GROUP', 'MET-5-IRREGULAR'] as const
type TargetId = typeof targetIds[number]
type Details = Pick<Question, 'stem' | 'variant' | 'explanationZh'>
type Draft = Omit<Question, 'id' | 'objectiveId' | 'difficulty' | 'seed' | 'terms' | 'contentKey'>

const units = ['breve', 'semibreve', 'minim', 'crotchet', 'quaver', 'semiquaver', 'demisemiquaver'] as const
const tupleValues = ['quaver', 'semiquaver', 'demisemiquaver'] as const

function notation(pulses: readonly RhythmPulse[], engraving: Omit<RhythmStimulus, 'pulses' | 'kind'> = {}): RhythmStimulus {
  return { kind: 'rhythm', pulses, ...engraving }
}

function equalPulses(count: number, value: NoteValue): RhythmPulse[] {
  return Array.from({ length: count }, () => ({ value }))
}

function durationOf(pulse: RhythmPulse): Rational {
  return dottedDuration(NOTE_VALUES[pulse.value], pulse.dots ?? 0)
}

function fraction(value: Rational): string {
  return value.denominator === 1 ? String(value.numerator) : `${value.numerator}/${value.denominator}`
}

function equivalentCount(duration: Rational, unit: NoteValue): number {
  const { numerator, denominator } = NOTE_VALUES[unit]
  const division = multiplyDuration(duration, rational(denominator, numerator))
  if (division.denominator !== 1) throw new RangeError('A numeric rhythm question needs a whole number of units.')
  return division.numerator
}

function numeric(details: Details, stimulus: RhythmStimulus, answer: number): Draft {
  return { ...details, stimulus, answerKind: 'numeric', options: [], correctAnswer: { optionId: String(answer), number: answer } }
}

function scores(random: Random, details: Details, candidates: readonly { stimulus: RhythmStimulus; explanationZh: string }[], stimulus?: RhythmStimulus): Draft {
  const options = random.shuffle(candidates).map((candidate, index) => ({
    ...candidate,
    id: String(index + 1),
    text: `Score ${String.fromCharCode(65 + index)}`,
  }))
  const correct = options.find((option) => option.stimulus === candidates[0].stimulus)!
  return { ...details, stimulus, answerKind: 'choice', options, correctAnswer: { optionId: correct.id } }
}

function tupletQuestion(random: Random): Draft {
  const value = random.pick(tupleValues)
  const count = random.pick([5, 6])
  const inTimeOf = 4
  const member = tupletDuration(NOTE_VALUES[value], count, inTimeOf)
  const grouped = multiplyDuration(member, rational(count))
  const pulses = equalPulses(count, value)
  const marked = notation(pulses, { beamGroups: [count], tuplets: [{ start: 0, count, inTimeOf }] })
  const whole = `括号中的 ${count}:${inTimeOf} 表示 ${count} 个 ${value} 在普通 ${inTimeOf} 个 ${value} 的时间内奏完。`
  const mode = random.pick(['total', 'member', 'equivalence'] as const)
  if (mode === 'member') {
    const exact = fraction(multiplyDuration(member, rational(NOTE_VALUES[value].denominator)))
    const explanationZh = `${whole}把整组的 ${inTimeOf} 个普通时值平均分成 ${count} 份，每份等于普通时值的 ${exact}。`
    return {
      stem: `What fraction of one ordinary ${value} is the duration of one note in the marked group?`,
      stimulus: marked, variant: 'tuplet-member-fraction', explanationZh,
      ...makeOptions(random, [
        { text: exact, explanationZh },
        { text: `1/${count}`, explanationZh: `每个音符占整组的 ${fraction(rational(1, count))}，题目要求以一个普通 ${value} 为单位。` },
        { text: fraction(rational(count, inTimeOf)), explanationZh: '这个分数把连音比例中的两个数字颠倒了。题目要求用普通音符数除以实际分出的份数。' },
        { text: '1', explanationZh: `这相当于一个完整的普通 ${value}。图中的连音把较多的音符放进较短的时间，每个音符都比普通时值短。` },
      ], exact),
    }
  }
  if (mode === 'equivalence') {
    const index = units.indexOf(value)
    const longer = units[index - 3]
    const equal = units[index - 2]
    const shorter = units[index - 1]
    const why = `${whole}把这 ${inTimeOf} 个普通时值合并，得到一个 ${equal}。`
    return scores(random, {
      stem: 'Which score shows the same total duration as the marked group?',
      variant: 'tuplet-match-notation', explanationZh: why,
    }, [
      { stimulus: notation([{ value: equal }]), explanationZh: why },
      { stimulus: notation([{ value: longer }]), explanationZh: `这个 ${longer} 等于两个 ${equal}，是连音组时值的两倍。` },
      { stimulus: notation([{ value: shorter }]), explanationZh: `这个 ${shorter} 只等于半个 ${equal}，只占连音组的一半时间。` },
      { stimulus: notation([{ value: equal, dots: 1 }]), explanationZh: `附点把 ${equal} 的时值增加一半，图中连音组只占一个普通 ${equal} 的时间。` },
    ], marked)
  }
  const extra: RhythmPulse = { value: random.pick([value, units[units.indexOf(value) - 1]]), rest: random.integer(0, 1) === 1 }
  const before = random.integer(0, 1) === 1
  const start = before ? 1 : 0
  const rhythm = notation(before ? [extra, ...pulses] : [...pulses, extra], {
    beamGroups: before ? [1, count] : [count, 1], tuplets: [{ start, count, inTimeOf }],
  })
  const total = addDuration(grouped, durationOf(extra))
  const unit = random.pick(units.slice(units.indexOf(value)))
  const answer = equivalentCount(total, unit)
  return numeric({
    stem: `How many ordinary ${unit}s have the same total duration as the rhythm shown?`,
    variant: 'tuplet-total-with-extra',
    explanationZh: `${whole}括号外的 ${extra.value}${extra.rest ? '休止符' : '音符'}使用普通时值。相加后换算成 ${unit}，一共是 ${answer} 个。`,
  }, rhythm, answer)
}

const irregularMetres = [
  { signature: '5/4', total: 5, unit: 'crotchet', shorter: 'quaver', groupValue: 'minim' },
  { signature: '5/8', total: 5, unit: 'quaver', shorter: 'semiquaver', groupValue: 'crotchet' },
  { signature: '7/4', total: 7, unit: 'crotchet', shorter: 'quaver', groupValue: 'minim' },
  { signature: '7/8', total: 7, unit: 'quaver', shorter: 'semiquaver', groupValue: 'crotchet' },
] as const
type IrregularMetre = typeof irregularMetres[number]
const groupings: Record<5 | 7, readonly (readonly number[])[]> = {
  5: [[2, 3], [3, 2]],
  7: [[2, 2, 3], [2, 3, 2], [3, 2, 2]],
}

function groupStarts(groups: readonly number[]): number[] {
  let start = 0
  return groups.map((size) => {
    const position = start
    start += size
    return position
  })
}

function beamedBar(metre: IrregularMetre, groups: readonly number[]): RhythmStimulus {
  const engraving = metre.unit === 'quaver' ? { beamGroups: groups } : { groupStarts: groupStarts(groups) }
  return notation(equalPulses(metre.total, metre.unit), { timeSignature: metre.signature, ...engraving })
}

function groupedPulses(metre: IrregularMetre, groups: readonly number[], restAt: number): RhythmPulse[] {
  return groups.map((size, index) => ({ value: metre.groupValue, dots: size === 3 ? 1 : undefined, rest: index === restAt }))
}

function wholeBeatRests(metre: IrregularMetre, groups: readonly number[]): number[] {
  // The syllabus introduces dotted minim rests in 6/4 and 9/4.
  return groups.flatMap((size, index) => size === 2 || metre.unit === 'quaver' ? [index] : [])
}

function groupedSilenceQuestion(random: Random, metre: IrregularMetre, groups: readonly number[]): Draft {
  const restPositions = wholeBeatRests(metre, groups)
  const restAt = random.pick(restPositions)
  const alternateRest = restPositions.find((index) => index !== restAt) ?? -1
  const alternateGroups = random.pick(groupings[metre.total].filter((other) => other !== groups))
  const alternatePositions = wholeBeatRests(metre, alternateGroups)
  const alternateGroupRest = alternatePositions.includes(restAt) ? restAt : alternatePositions[0]
  const description = groups.join(' + ')
  const normal = (pulses: RhythmPulse[]) => notation(pulses, { timeSignature: metre.signature })
  const rest = `${groups[restAt] === 3 ? '附点' : ''}${metre.groupValue} 休止符`
  const correct = `每个音符或休止符都占一整拍。分组为 ${description}，第 ${restAt + 1} 拍有 ${groups[restAt]} 个 ${metre.unit} 的时值，应写 ${rest}。`
  const wrongRestUnits = metre.unit === 'crotchet' ? 1 : groups[restAt] === 3 ? 2 : 3
  const changed = groupedPulses(metre, groups, restAt).map((pulse, index) => index === restAt
    ? { ...pulse, value: wrongRestUnits === 1 ? metre.unit : pulse.value, dots: wrongRestUnits === 3 ? 1 as const : undefined }
    : pulse)
  return scores(random, {
    stem: `Choose the score for ${metre.signature} grouped ${description}, with the ${ordinal(restAt + 1)} beat silent. Each note or rest fills one whole beat.`,
    variant: 'irregular-grouped-rest', explanationZh: correct,
  }, [
    { stimulus: normal(groupedPulses(metre, groups, restAt)), explanationZh: correct },
    { stimulus: normal(groupedPulses(metre, groups, alternateRest)), explanationZh: alternateRest === -1
      ? `谱例中每一拍都有音符。第 ${restAt + 1} 拍应改用等长的休止符。`
      : `休止符在第 ${alternateRest + 1} 拍，题目指定的是第 ${restAt + 1} 拍。` },
    { stimulus: normal(groupedPulses(metre, alternateGroups, alternateGroupRest)), explanationZh: `这个谱例的重拍按 ${alternateGroups.join(' + ')} 排列。题目给出的顺序是 ${description}。` },
    { stimulus: normal(changed), explanationZh: `这个休止符的时值是 ${wrongRestUnits} 个 ${metre.unit}，正确的一整拍是 ${groups[restAt]} 个 ${metre.unit}。` },
  ])
}

function groupingQuestion(random: Random, metre: IrregularMetre, groups: readonly number[]): Draft {
  const pattern = groups.join(' + ')
  const mode = random.pick(['display', 'read', 'rest'] as const)
  if (mode === 'rest') return groupedSilenceQuestion(random, metre, groups)
  if (mode === 'read') {
    const index = random.integer(1, groups.length - 1)
    const end = groupStarts(groups)[index]
    const sign = metre.unit === 'quaver' ? '符杠' : '重音'
    return numeric({
      stem: `Which numbered ${metre.unit} begins beat ${index + 1}? Count the first ${metre.unit} as 1.`,
      variant: metre.unit === 'quaver' ? 'read-beamed-beat' : 'read-accented-beat',
      explanationZh: `图中的分组由${sign}标出，顺序为 ${pattern}。在第 ${index + 1} 拍之前已经数过 ${end} 个 ${metre.unit}，所以下一拍从第 ${end + 1} 个音符开始。`,
    }, beamedBar(metre, groups), end + 1)
  }
  const quotation = metre.unit === 'quaver' ? 'beaming' : 'accents'
  const others = groupings[metre.total].filter((grouping) => grouping !== groups)
  const wrongGrouping = metre.total === 5 ? [[1, 4], [5]] : [[3, 4]]
  const explanationZh = `先按 ${pattern} 分组，再检查每组起点。相同总时值可以有不同的拍组，这里要按题目给出的顺序。`
  return scores(random, {
    stem: `Which score uses ${quotation} to show the grouping ${pattern} in ${metre.signature}?`,
    variant: metre.unit === 'quaver' ? 'select-irregular-beaming' : 'select-irregular-accents',
    explanationZh,
  }, [
    { stimulus: beamedBar(metre, groups), explanationZh },
    ...[...others, ...wrongGrouping].map(grouping => ({
      stimulus: beamedBar(metre, grouping),
      explanationZh: `这个谱例显示 ${grouping.join(' + ')}，题目要求 ${pattern}。小节的总时值相同，差异在拍点位置。`,
    })),
  ])
}

function signatureQuestion(random: Random, metre: IrregularMetre, groups: readonly number[]): Draft {
  const restPositions = wholeBeatRests(metre, groups)
  const restAt = random.pick([-1, ...restPositions])
  const pulses = groupedPulses(metre, groups, restAt)
  const sum = pulses.reduce((duration, pulse) => addDuration(duration, durationOf(pulse)), rational(0))
  const explanationZh = `普通音符和休止符都要计入时值。图中共 ${metre.total} 个 ${metre.unit} 的时值，等于全音符的 ${fraction(sum)}。`
  if (random.integer(0, 1) === 1) {
    const unit = random.pick([metre.unit, metre.shorter])
    const answer = equivalentCount(sum, unit)
    return numeric({
      stem: `How many ${unit}s have the same total duration as this complete bar?`,
      variant: 'count-an-irregular-bar',
      explanationZh: `${explanationZh}换算成 ${unit} 后，一共是 ${answer} 个。`,
    }, notation(pulses, { timeSignature: metre.signature }), answer)
  }
  return {
    stem: 'Which time signature gives the exact duration of this complete bar?',
    stimulus: notation(pulses), variant: 'identify-an-irregular-signature',
    explanationZh: `${explanationZh}分子是 ${metre.total}，分母由 ${metre.unit} 的时值决定，因此拍号是 ${metre.signature}。`,
    ...makeOptions(random, irregularMetres.map(candidate => {
      const duration = multiplyDuration(NOTE_VALUES[candidate.unit], rational(candidate.total))
      return {
        text: candidate.signature,
        explanationZh: compareDuration(duration, sum) === 0 ? explanationZh
          : `${candidate.signature} 所需的时值是全音符的 ${fraction(duration)}，图中的时值是 ${fraction(sum)}。`,
      }
    }), metre.signature),
  }
}

export function isVisualRhythmObjective(id: string): id is TargetId {
  return targetIds.some((target) => target === id)
}

export function generateVisualRhythmQuestion(id: TargetId, seed: QuestionSeed, terms: string[]): Question {
  const random = createRandom(`rhythm-v2:${id}:${JSON.stringify(seed)}`)
  let draft: Draft
  if (id === 'RHY-5-TUPLET') {
    draft = tupletQuestion(random)
  } else {
    const metre = random.pick(irregularMetres)
    const groups = random.pick(groupings[metre.total])
    draft = id === 'MET-5-GROUP' ? groupingQuestion(random, metre, groups) : signatureQuestion(random, metre, groups)
  }
  const correctScore = draft.options.find((option) => option.id === draft.correctAnswer.optionId)?.stimulus
  return {
    ...draft, id: `rhythm-v2:${id}:${JSON.stringify(seed)}`, objectiveId: id, difficulty: 5, seed, terms,
    contentKey: JSON.stringify([draft.stem, draft.stimulus, correctScore]),
  }
}
