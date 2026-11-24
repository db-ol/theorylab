import {
  CLEFS, NOTE_VALUES, SCALE_DEGREES, addDuration, buildScale, buildScaleTriad, compareDuration,
  describeInterval, dottedDuration, enharmonicSpellings, formatInterval, formatPitch, formatPitchName,
  getKeySignature, identifyCadence, invertTriad, midiNumber, parsePitch, pitchAtStaffPosition,
  rational, scaleDegree, staffPosition, transposeInstrumentPitch, transposeOctaves, tupletDuration,
  type Clef, type Pitch, type Rational, type ScaleForm,
} from '../theory'
import { createRandom, generateIntervalQuestion, makeOptions, type Question, type QuestionOption, type Random } from '../questions'
import { performanceTerms } from '../curriculum/performanceTerms'
import type { ExamSlot } from './engine'

export type NoteValue = keyof typeof NOTE_VALUES
export interface RhythmPulse {
  value: NoteValue
  dots?: 1 | 2
  rest?: boolean
  tieAfter?: boolean
  pitch?: Pitch
}

export interface ExamExcerpt {
  clef: Clef
  keySignature: number
  timeSignature: string
  bars: readonly { pulses: readonly RhythmPulse[]; dynamic?: string; direction?: string }[]
}

export type ExamStimulus =
  | { kind: 'rhythm'; pulses: readonly RhythmPulse[]; timeSignature?: string }
  | { kind: 'excerpt'; excerpt: ExamExcerpt }

export interface Grade5Question extends Question {
  stimulus?: ExamStimulus
}

type Draft = Omit<Grade5Question, 'id' | 'seed' | 'difficulty' | 'contentKey'>
type Details = Omit<Draft, 'options' | 'correctAnswer' | 'explanationZh' | 'answerKind'>
type Distractor = [text: string, explanationZh: string]

function choose(
  random: Random, details: Details, answer: string, wrong: readonly Distractor[], explanationZh: string,
  answerKind: Grade5Question['answerKind'] = 'choice',
): Draft {
  const options: Omit<QuestionOption, 'id'>[] = [{ text: answer, explanationZh }]
  for (const [text, reason] of wrong) {
    if (!options.some(option => option.text === text)) options.push({ text, explanationZh: reason })
  }
  return { ...details, ...makeOptions(random, options, answer), explanationZh, answerKind }
}

function trueFalse(random: Random, details: Details, answer: boolean, explanationZh: string): Draft {
  const right = answer ? 'True' : 'False'
  const wrong = answer ? 'False' : 'True'
  return choose(random, details, right, [[wrong, `这项陈述${answer ? '成立' : '不成立'}。${explanationZh}`]], explanationZh)
}

function numeric(details: Details, answer: number, explanationZh: string): Draft {
  return { ...details, options: [], correctAnswer: { optionId: String(answer), number: answer }, explanationZh, answerKind: 'numeric' }
}

function pitchNames(pitches: readonly Pitch[], octaves = false): string {
  return pitches.map(octaves ? formatPitch : formatPitchName).join(', ')
}

const signatureChoices = [
  { signature: '6/8', pulses: [{ value: 'crotchet', dots: 1 }, { value: 'crotchet', dots: 1 }] },
  { signature: '7/8', pulses: [{ value: 'crotchet', dots: 1 }, { value: 'crotchet' }, { value: 'crotchet' }] },
  { signature: '5/8', pulses: [{ value: 'crotchet' }, { value: 'crotchet', dots: 1 }] },
  { signature: '4/4', pulses: [{ value: 'minim' }, { value: 'crotchet' }, { value: 'quaver' }, { value: 'quaver', rest: true }] },
  { signature: '9/8', pulses: [{ value: 'crotchet', dots: 1 }, { value: 'crotchet', dots: 1 }, { value: 'crotchet', dots: 1 }] },
  { signature: '7/4', pulses: [{ value: 'minim' }, { value: 'minim' }, { value: 'minim', dots: 1 }] },
  { signature: '9/4', pulses: [{ value: 'minim', dots: 1 }, { value: 'minim', dots: 1 }, { value: 'minim', dots: 1 }] },
] as const satisfies ReadonlyArray<{ signature: string; pulses: readonly RhythmPulse[] }>

function durationOf(pulse: RhythmPulse): Rational {
  return dottedDuration(NOTE_VALUES[pulse.value], pulse.dots ?? 0)
}

function barDuration(pulses: readonly RhythmPulse[]): Rational {
  return pulses.reduce((total, pulse) => addDuration(total, durationOf(pulse)), rational(0))
}

function timeDuration(signature: string): Rational {
  const [numerator, denominator] = signature.split('/').map(Number)
  return rational(numerator, denominator)
}

function rhythmQuestion(slot: ExamSlot, random: Random, paperRandom: Random): Draft {
  const { group, part } = slot
  if (group === 1) {
    const choices = paperRandom.shuffle(signatureChoices)
    const { signature, pulses } = choices[part - 1]
    return choose(random, {
      objectiveId: ['5/8', '7/8', '7/4'].includes(signature) ? 'MET-5-IRREGULAR' : 'MET-4-METRE', variant: 'complete-bar',
      stem: 'Select the time signature that gives exactly the duration of this complete bar.', terms: ['time signature', 'bar'],
      stimulus: { kind: 'rhythm', pulses },
    }, signature, choices.filter(choice => choice.signature !== signature).slice(0, 3).map(choice => [choice.signature, `这个拍号需要 ${choice.signature} 个全音符的时值。图中的音符和休止符加起来是 ${signature} 个。`]), `图中的时值合计为 ${signature} 个全音符。此拍号分母指定单位，分子指定一小节有几个这样的单位。`)
  }
  if (group === 2) {
    const [count, base, reference] = random.pick([[3, 'quaver', 'crotchet'], [5, 'semiquaver', 'crotchet'], [6, 'semiquaver', 'crotchet']] as const)
    const inTimeOf = count === 3 ? 2 : 4
    const noteValue = tupletDuration(NOTE_VALUES[base], count, inTimeOf)
    const total = Array.from({ length: count }, () => noteValue).reduce(addDuration, rational(0))
    const numerals = ['triplet', 'quintuplet', 'sextuplet']
    const name = numerals[count === 3 ? 0 : count - 4]
    const correctValue = (['quaver', 'crotchet', 'minim'] as const).find(value => compareDuration(total, NOTE_VALUES[value]) === 0)
    if (!correctValue) throw new RangeError('The tuplet has no equivalent note value.')
    const answer = `One ${correctValue}`
    return choose(random, {
      objectiveId: count === 3 ? 'RHY-2-TRIPLET' : 'RHY-5-TUPLET', variant: 'tuplet-equivalence',
      stem: `A ${name} group contains ${count} ${base}s in the time of ${inTimeOf} ordinary ${base}s. What is the duration of the complete group?`, terms: [name, base, reference],
    }, answer, [
      ['One quaver', '一个 quaver 只占半个 crotchet 的时值。'],
      ['One dotted crotchet', '附点将一个 crotchet 的时值增加一半，比整组更长。'],
      ['One minim', '一个 minim 等于两个 crotchet，比整组长一倍。'],
    ], `整组等于 ${inTimeOf} 个普通 ${base} 的时值，正好是一个 ${reference}。连音数字表示分割方式。`)
  }
  if (group === 3 && part === 1) {
    const [numerator, denominator, beat] = random.pick([[6, 16, 'dotted quaver'], [9, 4, 'dotted minim'], [12, 8, 'dotted crotchet']] as const)
    return numeric({ objectiveId: 'MET-4-METRE', variant: 'compound-beats', stem: `How many ${beat} beats are in a bar of ${numerator}/${denominator}?`, terms: ['compound time', beat] }, numerator / 3,
      `复拍子每一拍由三个分母单位构成。将 ${numerator} 除以三，得到 ${numerator / 3} 拍。`)
  }
  if (group === 3) {
    const note = random.pick(['minim', 'crotchet', 'quaver'] as const)
    const notes = (NOTE_VALUES.breve.numerator * NOTE_VALUES[note].denominator) / (NOTE_VALUES.breve.denominator * NOTE_VALUES[note].numerator)
    return numeric({ objectiveId: 'RHY-4-BREVE', variant: 'breve-equivalence', stem: `How many ${note}s have the same total duration as one breve?`, terms: ['breve', note] }, notes,
      `一个 breve 等于两个 semibreve。每个 semibreve 含 ${notes / 2} 个 ${note}，合计 ${notes} 个。`)
  }
  if (group === 4) {
    const pattern = random.pick(['2 + 2 + 3', '2 + 3 + 2', '3 + 2 + 2'])
    const toWords = (sequence: string) => sequence.split(' + ').map(size => `${size} quavers`).join(', then ')
    return choose(random, { objectiveId: 'MET-5-GROUP', variant: 'irregular-grouping', stem: `A bar of 7/8 is marked ${pattern}. Which beaming follows the specified grouping?`, terms: ['irregular time signature', 'beaming'] },
      toWords(pattern), ['2 + 2 + 3', '2 + 3 + 2', '3 + 2 + 2'].filter(sequence => sequence !== pattern).map(sequence => [toWords(sequence), `这种符杠连接体现 ${sequence}，而题目标记给出的顺序是 ${pattern}。`]),
      `先按标记把七个 quaver 分成 ${pattern}，再在每组内连接符杠。总时值相同的其他顺序会把重心放在不同位置。`)
  }
  const { signature: barSignature, pulses } = paperRandom.shuffle(signatureChoices)[part + 2]
  const signature = random.pick([barSignature, signatureChoices[(part + 1) % signatureChoices.length].signature])
  const total = barDuration(pulses)
  const matches = compareDuration(total, timeDuration(signature)) === 0
  return trueFalse(random, {
    objectiveId: 'MET-4-GROUP', variant: 'rhythm-statement', stem: `The rhythm shown has exactly the duration of one bar of ${signature}.`, terms: ['bar', 'note value'],
    stimulus: { kind: 'rhythm', pulses, timeSignature: signature },
  }, matches, `将每个时值换算成全音符的分数并相加，得到 ${total.numerator}/${total.denominator}。题中拍号规定 ${signature} 个全音符。两者${matches ? '相等' : '不相等'}。`)
}

function pitchQuestion(slot: ExamSlot, random: Random, paperRandom: Random): Draft {
  const { group, part } = slot
  const clef = random.pick(CLEFS)
  if (group === 1) {
    const keySignature = random.integer(-6, 6)
    const natural = pitchAtStaffPosition(random.integer(-2, 10), clef)
    const inherited = getKeySignature(keySignature).accidentals[natural.letter] ?? 0
    const pitch = { ...natural, accidental: random.pick([inherited, inherited, 0, 1, -1]) }
    const answer = formatPitchName(pitch)
    const wrong: Distractor[] = [-2, -1, 0, 1, 2].filter(sign => sign !== pitch.accidental).map(sign => [
      formatPitchName({ ...pitch, accidental: sign }), `音名字母 ${pitch.letter} 读对了。结合调号和临时记号后，正确的变化音是 ${answer}。`,
    ])
    const adjacent = pitchAtStaffPosition(staffPosition(pitch, clef) + 1, clef)
    wrong.push([formatPitchName(adjacent), `${adjacent.letter} 位于题中音符的上一格。题目所标的位置对应 ${pitch.letter}。`])
    return choose(random, { objectiveId: 'PIT-5-FOUR-CLEFS', variant: 'note-in-key', stem: 'Identify the note shown on the stave.',
      terms: [`${clef} clef`, 'key signature', 'accidental'], notation: { clef, pitches: [pitch], keySignature } },
    answer, random.shuffle(wrong).slice(0, 3),
    `先从 ${clef} clef 的定位线读出字母 ${pitch.letter}，再应用调号和临时记号，得到 ${answer}。临时记号优先于调号。`)
  }
  if (group === 2) {
    const original = parsePitch(random.pick(['C#4', 'Eb4', 'F#4', 'Gb4', 'A#4', 'B#3', 'Cb4', 'Gx4']))
    const target = random.pick(enharmonicSpellings(original).filter(item => item.letter !== original.letter))
    const notation = { clef, pitches: [original] }
    const answer = formatPitch(target)
    const rationale = `原音 ${formatPitch(original)} 与 ${answer} 对应同一个琴键。等音题要保持实际音高，题目指定的字母决定了升降号和八度位置。`
    const choice = choose(random, { objectiveId: 'PIT-4-ENHARMONIC', variant: 'enharmonic-placement',
      stem: `Place the enharmonic equivalent of the given note using the letter ${target.letter}.`, terms: ['enharmonic equivalent', 'accidental'], notation },
      answer, [-2, -1, 0, 1, 2].filter(sign => sign !== target.accidental).slice(0, 3).map(sign => {
        const alternate = { ...target, accidental: sign }
        const offset = midiNumber(alternate) - midiNumber(original)
        return [formatPitch(alternate), `这个音比原音${offset < 0 ? '低' : '高'} ${Math.abs(offset)} 个半音。等音拼写需要保持同一琴键。`]
      }), rationale, 'pitch')
    return { ...choice, correctAnswer: { ...choice.correctAnswer, pitch: target } }
  }
  if (group === 3) {
    const commonClef = paperRandom.pick(CLEFS)
    const keySignature = paperRandom.pick([-6, -4, -2, 2, 4, 6])
    const signature = getKeySignature(keySignature)
    const start = paperRandom.integer(1, 4)
    const lower = pitchAtStaffPosition(start, commonClef)
    const higher = pitchAtStaffPosition(start + 3, commonClef)
    const pitches = [
      { ...lower, accidental: keySignature > 0 ? 2 : -2 },
      { ...lower, accidental: keySignature > 0 ? 2 : -2 },
      { ...higher, accidental: signature.accidentals[higher.letter] ?? 0 },
      { ...lower, accidental: 0 },
      { ...lower, accidental: 0 },
    ]
    const expected = pitches[part - 1]
    const trueAnswer = random.integer(0, 1) === 1
    const claimed = { ...expected, accidental: trueAnswer ? expected.accidental : expected.accidental === 0 ? 1 : 0 }
    const ordinal = ['first', 'second', 'third', 'fourth', 'fifth'][part - 1]
    return trueFalse(random, { objectiveId: 'PIT-4-DOUBLE', variant: 'accidentals-in-bar',
      stem: `The ${ordinal} note in the bar is ${formatPitchName(claimed)}.`, terms: ['double sharp', 'double flat', 'natural sign'],
      notation: { clef: commonClef, keySignature, pitches } }, trueAnswer,
    `第 ${part} 个音是 ${formatPitchName(expected)}。同一小节内同一个谱表位置会沿用此前的临时记号，直到出现新的变化记号。`)
  }
  const instruments = [{ instrument: 'B♭', interval: 'major 2nd' }, { instrument: 'A', interval: 'minor 3rd' }, { instrument: 'F', interval: 'perfect 5th' }] as const
  const { instrument, interval } = paperRandom.shuffle(instruments)[part - 1]
  const target = random.pick(['written', 'sounding'] as const)
  const source = random.pick(['G4', 'C5', 'B♭4', 'F♯4'])
  const origin = parsePitch(source)
  const transformed = transposeInstrumentPitch(origin, instrument, target)
  const offered = random.integer(0, 1) ? transformed : { ...transformed, accidental: transformed.accidental + 1 }
  const expected = midiNumber(offered) === midiNumber(transformed)
  const from = target === 'written' ? 'sounding' : 'written'
  const direction = target === 'written' ? 'up' : 'down'
  return trueFalse(random, { objectiveId: 'TRN-5-CONCERT', variant: 'concert-transposition',
    stem: `For an instrument in ${instrument}, transpose ${direction} a ${interval} to find ${target} pitch. The ${target} pitch corresponding to ${from} ${source} is ${formatPitch(offered)}.`,
    terms: ['written pitch', 'sounding pitch', 'concert pitch'] }, expected,
  `按题意将 ${source} ${direction === 'up' ? '向上' : '向下'}移一个 ${interval}，得到 ${formatPitch(transformed)}。先按音程度数确定字母，再检查半音数。`)
}

function signatureTerm(count: number): string {
  if (count === 0) return 'No sharps or flats'
  const size = Math.abs(count)
  return `${size} ${count > 0 ? 'sharp' : 'flat'}${size === 1 ? '' : 's'}`
}

function keyQuestion(slot: ExamSlot, random: Random, paperRandom: Random): Draft {
  const { group, part } = slot
  const signature = getKeySignature(random.integer(-6, 6))
  const clef = random.pick(CLEFS)
  if (group <= 2) {
    const mode = group === 1 ? 'major' : 'minor'
    const count = group === 1 ? random.integer(1, 6) : random.integer(-6, -1)
    const answer = `${getKeySignature(count)[mode]} ${mode}`
    const wrong = random.shuffle([-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].filter(item => item !== count))
      .slice(0, 3).map(item => [`${getKeySignature(item)[mode]} ${mode}`, `该调有 ${signatureTerm(item)}，与谱上的调号不同。`] as [string, string])
    return choose(random, { objectiveId: 'KEY-5-SIGNATURE', variant: 'read-key-signature', stem: `Which ${mode} key has this key signature?`,
      terms: ['key signature', `${mode} key`], notation: { clef, pitches: [], keySignature: count } }, answer, wrong,
    `该调号有 ${signatureTerm(count)}。在题目指定的 ${mode} 调中，主音是 ${getKeySignature(count)[mode]}，所以答案是 ${answer}。`)
  }
  if (group === 3) {
    const form = paperRandom.shuffle(['major', 'harmonic minor', 'melodic minor'] as const)[part - 1]
    const tonic = parsePitch(`${form === 'major' ? signature.major : signature.minor}4`)
    const pitches = buildScale(tonic, form)
    const answer = `${formatPitchName(tonic)} ${form}`
    const alternatives = [signature.major, signature.minor, getKeySignature(signature.count === 6 ? 5 : signature.count + 1).minor]
    const wrong = alternatives.flatMap(name => ['major', 'harmonic minor', 'melodic minor'].flatMap(mode => {
      const label = `${name} ${mode}`
      if (label === answer) return []
      const reason = name === formatPitchName(tonic)
        ? `主音读对了。这个选项的音阶模式是 ${mode}，谱中相邻音的距离符合 ${form}。`
        : `这个音阶的主音应该是 ${name}。谱上首尾都是 ${formatPitchName(tonic)}。`
      return [[label, reason] satisfies Distractor]
    }))
    return choose(random, { objectiveId: 'KEY-5-SCALES', variant: 'recognise-scale', stem: 'Identify the scale shown.',
      terms: ['major scale', 'harmonic minor', 'melodic minor'], notation: { clef: random.pick(['treble', 'alto']), pitches, keySignature: signature.count } },
    answer, random.shuffle(wrong).slice(0, 3), `音阶从 ${formatPitchName(tonic)} 开始和结束。依次读出 ${pitchNames(pitches)}。从主音比较音程，就能确认是 ${form}。`, 'dropdown')
  }
  if (group === 4) {
    const form = part === 1 ? 'harmonic minor' : 'melodic minor'
    const direction = part === 1 ? 'ascending' : random.pick(['ascending', 'descending'] as const)
    const tonic = parsePitch(`${signature.minor}${direction === 'ascending' ? 4 : 5}`)
    const pitches = buildScale(tonic, form, direction)
    const missing = direction === 'ascending' ? 6 : 1
    const target = pitches[missing]
    const answer = formatPitchName(target)
    return choose(random, { objectiveId: 'KEY-5-SCALES', variant: 'missing-scale-note',
      stem: `Complete the ${direction} scale of ${signature.minor} ${form}. ${pitches.map((pitch, index) => index === missing ? '___' : formatPitchName(pitch)).join(', ')}.`,
      terms: [form, direction, 'leading note'] }, answer,
    [-2, -1, 0, 1, 2].filter(sign => sign !== target.accidental).slice(0, 3).map(sign => [formatPitchName({ ...target, accidental: sign }),
      `这个变化记号会使第七级偏${sign < target.accidental ? '低' : '高'} ${Math.abs(sign - target.accidental)} 个半音。`]),
    direction === 'ascending' ? `小调的第七级是 ${answer}。${form} 上行时把自然小调的第七级抬高一个半音。`
      : `旋律小调下行在传统写法中恢复自然小调的第六级和第七级。因此缺少的是 ${answer}。`, 'dropdown')
  }
  if (group === 5) {
    const [start, end] = paperRandom.shuffle([[1, 3], [2, 5], [4, 7], [5, 6]] as const)[part - 1]
    const tonic = parsePitch(`${signature.major}4`)
    const pitches = buildScale(tonic, 'major').slice(start - 1, end)
    const target = random.pick(CLEFS)
    const note = pitches[0]
    const position = staffPosition(note, target)
    const coordinate = position < 0 ? `${Math.abs(position)} staff steps below the bottom line` : position === 0 ? 'the bottom line' : `${position} staff steps above the bottom line`
    if (part !== 3 && Math.abs(position) < 15) {
      return choose(random, { objectiveId: 'PIT-5-FOUR-CLEFS', variant: 'choose-clef',
        stem: `The first note of this ${signature.major} major fragment should be ${formatPitch(note)}. It is placed at ${coordinate}. Which clef gives the required note?`,
        terms: ['clef', 'stave', 'scale'] }, `${target} clef`, CLEFS.filter(item => item !== target).map(item => [
          `${item} clef`, `这个谱号下该位置的音名字母与八度为 ${formatPitch(pitchAtStaffPosition(position, item))}。题目指定 ${formatPitch(note)}。`,
        ]),
      `所要求的音高是 ${formatPitch(note)}。在 ${target} clef 上，它的位置恰好符合题意。其他谱号的定位线不同。`, 'dropdown')
    }
    const degree = scaleDegree(tonic, note)
    const answer = SCALE_DEGREES[degree - 1]
    return choose(random, { objectiveId: 'KEY-4-DEGREE', variant: 'scale-degree-name', stem: `What is the technical name of the first note shown in ${signature.major} major?`,
      terms: ['scale degree', 'tonic', answer], notation: { clef: 'treble', keySignature: signature.count, pitches } }, answer,
    random.shuffle(SCALE_DEGREES.filter(item => item !== answer)).slice(0, 3).map(name => [name, `这个名称表示第 ${SCALE_DEGREES.indexOf(name) + 1} 级。图中的第一个音是第 ${degree} 级。`]),
    `${formatPitchName(note)} 是 ${signature.major} 大调的第 ${degree} 级，所以称为 ${answer}。音级以主音为起点计算。`, 'dropdown')
  }
  if (group === 6) {
    const mode = part === 1 ? 'major' : 'minor'
    const exact = random.integer(0, 1) === 1
    const claimed = exact ? signature.count : signature.count === 6 ? 5 : signature.count + 1
    return trueFalse(random, { objectiveId: 'KEY-5-SIGNATURE', variant: 'signature-statement',
      stem: `${signature[mode]} ${mode} has this key signature.`, terms: ['key signature', `${mode} key`], notation: { clef, pitches: [], keySignature: claimed } }, exact,
    `${signature[mode]} ${mode} 的调号对应 ${signatureTerm(signature.count)}。谱上给的是 ${signatureTerm(claimed)}。`)
  }
  if (part === 1) {
    const origin = parsePitch(random.pick(['C4', 'D4', 'F4', 'Bb4']))
    const shifted = (semitones: number) => random.pick(enharmonicSpellings({ ...origin, accidental: origin.accidental + semitones }))
    const notes = [origin, shifted(1), shifted(random.pick([2, 3]))]
    const correct = notes.every((note, index) => index === 0 || midiNumber(note) - midiNumber(notes[index - 1]) === 1)
    return trueFalse(random, { objectiveId: 'KEY-4-CHROMATIC', variant: 'chromatic-statement',
      stem: 'The notes shown rise by a semitone at each step.', terms: ['chromatic scale', 'semitone'],
      notation: { clef: 'treble', pitches: notes } }, correct, `按实际音高比较相邻的两个间隔，分别是一个半音和 ${midiNumber(notes[2]) - midiNumber(notes[1])} 个半音。`)
  }
  const form: ScaleForm = part === 2 ? 'harmonic minor' : 'melodic minor'
  const tonic = parsePitch(`${signature.minor}4`)
  const pitches = buildScale(tonic, form)
  const claimedForm = random.pick(['harmonic minor', 'melodic minor'])
  return trueFalse(random, { objectiveId: 'KEY-5-SCALES', variant: 'minor-form-statement',
    stem: `These notes form an ascending ${claimedForm} scale.`, terms: ['harmonic minor', 'melodic minor', 'ascending'],
    notation: { clef: 'treble', pitches, keySignature: signature.count } }, form === claimedForm,
  `第六级是 ${formatPitchName(pitches[5])}，第七级是 ${formatPitchName(pitches[6])}。和声小调仅升高第七级。旋律小调上行还要升高第六级。这里是 ${form}。`)
}

const cadenceOptions = [
  { name: 'perfect', degrees: [5, 1], objectiveId: 'HAR-5-PERFECT', route: 'V to I' },
  { name: 'plagal', degrees: [4, 1], objectiveId: 'HAR-5-PLAGAL', route: 'IV to I' },
  { name: 'imperfect', degrees: [2, 5], objectiveId: 'HAR-5-IMPERFECT', route: 'II to V' },
] as const

const roman = { 1: 'I', 2: 'II', 4: 'IV', 5: 'V' } as const
const positions = ['root position (a)', 'first inversion (b)', 'second inversion (c)'] as const

function chordQuestion(slot: ExamSlot, random: Random, paperRandom: Random): Draft {
  const { group, part } = slot
  if (group === 1) {
    const key = random.pick(['C', 'G', 'D', 'F'])
    const tonic = parsePitch(`${key}4`)
    const [cadence, targetIndex] = paperRandom.shuffle([
      [cadenceOptions[0], 0], [cadenceOptions[0], 1], [cadenceOptions[1], 0], [cadenceOptions[1], 1], [cadenceOptions[2], 1],
    ] as const)[part - 1]
    const [firstDegree, secondDegree] = cadence.degrees
    const target = cadence.degrees[targetIndex]
    const accompanimentNotes = cadence.degrees.map(degree => buildScaleTriad(tonic, 'major', degree))
    const melody = accompanimentNotes.map(chord => random.pick(chord))
    const clef: Clef = 'treble'
    const last = targetIndex === 1
    const other = last ? firstDegree : secondDegree
    const direction = last ? 'follows' : 'precedes'
    const ordinal = last ? 'second' : 'first'
    return choose(random, { objectiveId: 'HAR-5-CHOICE', variant: 'choose-cadential-chord',
      stem: `These are the final two melody notes in ${key} major. For a ${cadence.name} cadence, which chord takes the ${ordinal} note and ${direction} chord ${roman[other]}?`,
      terms: ['cadence', 'suitable chord', `${cadence.name} cadence`], notation: { clef, pitches: melody } },
    roman[target], Object.values(roman).filter(label => label !== roman[target]).map(label => [label,
      `选 ${label} 会把第 ${targetIndex + 1} 个和弦改变。题目指定的 ${cadence.name} cadence 要求 ${cadence.route}。`]),
    `这个终止要求 ${cadence.route}。第 ${targetIndex + 1} 个旋律音是 ${formatPitchName(melody[targetIndex])}，属于和弦 ${roman[target]} 的三音组合 ${pitchNames(accompanimentNotes[targetIndex])}。`, 'dropdown')
  }
  if (group === 2) {
    const cadence = paperRandom.shuffle(cadenceOptions)[part - 1]
    const [first, second] = cadence.degrees
    const key = random.pick(['C', 'G', 'D', 'F'])
    const tonic = parsePitch(`${key}4`)
    const [firstRoot, secondRoot] = cadence.degrees.map(degree => buildScaleTriad(tonic, 'major', degree)[0])
    return choose(random, { objectiveId: cadence.objectiveId, variant: 'recognise-cadence',
      stem: `A phrase in ${key} major ends on ${formatPitchName(firstRoot)} ${first === 2 ? 'minor' : 'major'} followed by ${formatPitchName(secondRoot)} major. Identify the cadence.`,
      terms: ['cadence', 'tonic', 'dominant', 'subdominant'] }, `${identifyCadence(first, second)} cadence`,
    cadenceOptions.filter(item => item !== cadence).map(item => [`${item.name} cadence`, `${item.name} cadence 的典型进行是 ${item.route}。题中和弦的功能不同。`]),
    `在 ${key} 大调中，这两个和弦依次是 ${roman[first]} 与 ${roman[second]}，形成 ${cadence.name} cadence。`)
  }
  const signature = getKeySignature(random.integer(-6, 6))
  const form = random.pick(['major', 'harmonic minor'] as const)
  const key = form === 'major' ? signature.major : signature.minor
  const clef = random.pick(['treble', 'alto'] as const)
  const degree = random.pick([1, 2, 4, 5] as const)
  const inversion = paperRandom.shuffle([0, 1, 2] as const)[part - 1]
  const chord = buildScaleTriad(parsePitch(`${key}4`), form, degree)
  const pitches = invertTriad(chord, inversion)
  const answer = `${roman[degree]} ${positions[inversion]}`
  return choose(random, { objectiveId: 'HAR-5-INVERSION', variant: 'identify-chord-inversion',
    stem: `The notes of a chord in ${key} ${form === 'major' ? 'major' : 'minor'} are shown from lowest to highest. Identify the chord and its position.`,
    terms: ['root position', 'first inversion', 'second inversion'], notation: { clef, pitches, keySignature: signature.count } },
  answer, [
    ...positions.flatMap((label, index) => index === inversion ? [] : [[`${roman[degree]} ${label}`,
      `这种转位应以 ${formatPitchName(chord[index])} 为最低音。谱上的最低音是 ${formatPitchName(pitches[0])}。`] satisfies Distractor]),
    [`${roman[degree === 1 ? 5 : 1]} ${positions[inversion]}`, `最低音决定转位，和弦音组合决定和弦功能。把三个音重新叠成三度可得 ${roman[degree]} 的和弦。`],
  ],
  `把和弦音按三度排列可得 ${pitchNames(chord)}，根音是 ${formatPitchName(chord[0])}，对应 ${roman[degree]}。谱上最低音 ${formatPitchName(pitches[0])} 是${['根音', '三音', '五音'][inversion]}，所以是 ${positions[inversion]}。`)
}

const instrumentFacts = [
  [
    { instrument: 'viola', property: 'normally uses the alto clef', explanation: '中提琴通常用中音谱号记谱。高音区也可能改用高音谱号。', objectiveId: 'INS-4-CLEF' },
    { instrument: 'bassoon', property: 'normally uses the bass clef', explanation: '巴松管以低音谱号记谱为主，高音区也可用次中音谱号。', objectiveId: 'INS-4-CLEF' },
    { instrument: 'violin', property: 'normally uses the treble clef', explanation: '小提琴通常用高音谱号。', objectiveId: 'INS-4-CLEF' },
  ],
  [
    { instrument: 'oboe', property: 'uses a double reed', explanation: '双簧管的两片簧片相对振动。', objectiveId: 'INS-5-SOUND' },
    { instrument: 'clarinet', property: 'uses a single reed', explanation: '单簧管由单片簧片振动发声。', objectiveId: 'INS-5-SOUND' },
    { instrument: 'cor anglais', property: 'uses a double reed', explanation: '英国管属于双簧管家族，也使用双簧片。', objectiveId: 'INS-5-SOUND' },
  ],
  [
    { instrument: 'tubular bells', property: 'have definite pitch', explanation: '管钟的各根金属管可以发出明确的音高。', objectiveId: 'INS-5-PERCUSSION' },
    { instrument: 'tambourine', property: 'has indefinite pitch', explanation: '铃鼓以节奏和音色为主，通常没有可记为旋律的明确音高。', objectiveId: 'INS-5-PERCUSSION' },
    { instrument: 'glockenspiel', property: 'has definite pitch', explanation: '钟琴的各根金属条调到明确的音高。', objectiveId: 'INS-5-PERCUSSION' },
  ],
  [
    { instrument: 'piccolo', property: 'sounds one octave higher than written', explanation: '短笛的实际音高比书写音高高一个八度。', objectiveId: 'INS-5-TRANSPOSING' },
    { instrument: 'double bass', property: 'sounds one octave lower than written', explanation: '通常记谱下，低音提琴的实际音高比书写音高低一个八度。', objectiveId: 'INS-5-TRANSPOSING' },
    { instrument: 'oboe', property: 'sounds at written pitch', explanation: '标准双簧管是非移调乐器。', objectiveId: 'INS-5-TRANSPOSING' },
  ],
  [
    { instrument: 'tenor voice', property: 'is typically higher than baritone', explanation: '成年男性声部通常从高到低为男高音、男中音、男低音。', objectiveId: 'INS-5-VOICE' },
    { instrument: 'soprano voice', property: 'is typically higher than mezzo-soprano', explanation: '常见女性声部从高到低为女高音、女中音、女低音。', objectiveId: 'INS-5-VOICE' },
    { instrument: 'alto voice', property: 'is typically lower than soprano', explanation: '合唱编制中女低音声部通常低于女高音声部。', objectiveId: 'INS-5-VOICE' },
  ],
] as const

function termsQuestion(slot: ExamSlot, random: Random, paperRandom: Random): Draft {
  const { group, part } = slot
  if (group === 1) {
    const objectiveId = (['TER-5-ITALIAN', 'TER-4-FRENCH', 'TER-5-GERMAN'] as const)[part - 1]
    const rows = performanceTerms.filter(item => item.objectiveId === objectiveId)
    const { english: term, definition: meaning, chinese: explanation } = random.pick(rows)
    const distinctMeanings = new Map(rows.filter(item => item.definition !== meaning).map(item => [item.definition, item.english]))
    return choose(random, { objectiveId, variant: 'performance-term', stem: `What does ${term} mean?`, terms: [term, 'performance direction'] },
      meaning, random.shuffle([...distinctMeanings.entries()]).slice(0, 3).map(([wrongMeaning, wrongTerm]) => [wrongMeaning,
        `这个英文释义对应 ${wrongTerm}。题中 ${term} 表示${explanation}。`]),
      `${term} 表示${explanation}。英文常用 ${meaning} 表达。`, 'dropdown')
  }
  if (group === 2) {
    const ornaments = [
      { name: 'upper mordent', offsets: [0, 1, 0], reason: '主音到上邻音后立即回到主音。' },
      { name: 'lower mordent', offsets: [0, -1, 0], reason: '主音到下邻音后立即回到主音。' },
      { name: 'upper turn', offsets: [1, 0, -1, 0], reason: '依次奏上邻音、主音、下邻音和主音。' },
      { name: 'trill', offsets: [0, 1, 0, 1, 0, 1, 0], reason: '主音与上邻音之间连续快速交替。' },
    ] as const
    const selected = paperRandom.shuffle(ornaments)[part - 1]
    const position = random.integer(2, 6)
    const main = pitchAtStaffPosition(position, 'treble')
    const pitches = selected.offsets.map(offset => pitchAtStaffPosition(position + offset, 'treble'))
    return choose(random, { objectiveId: 'ORN-5-WRITTEN', variant: 'replace-ornament',
      stem: `These notes are played rapidly as an ornament on ${formatPitchName(main)}. Which ornament sign can replace the notes shown?`,
      terms: ['written-out ornament', 'upper neighbour', 'lower neighbour'], notation: { clef: 'treble', pitches } },
    selected.name, ornaments.filter(item => item !== selected).map(item => [item.name, `${item.name} 的音序特点是${item.reason}题中实际音序不同。`]),
    `读出音序 ${pitchNames(pitches)}。这个装饰音的特点是${selected.reason}因此使用 ${selected.name}。`)
  }
  const fact = random.pick<{ instrument: string; property: string; explanation: string; objectiveId: string }>(instrumentFacts[part - 1])
  const correct = random.integer(0, 1) === 1
  const incorrectProperty = fact.property.replace(/^normally uses /, 'does not normally use ')
    .replace(/^uses /, 'does not use ').replace(/^have /, 'do not have ').replace(/^has /, 'does not have ')
    .replace(/^sounds /, 'does not sound ').replace(/^is /, 'is not ')
  return trueFalse(random, { objectiveId: fact.objectiveId, variant: 'instrument-statement',
    stem: `The ${fact.instrument} ${correct ? fact.property : incorrectProperty}.`,
    terms: [fact.instrument, fact.property] }, correct, fact.explanation)
}

function originalExcerpt(random: Random): ExamExcerpt {
  const keySignature = random.pick([-1, 0, 1, 2])
  const tonic = parsePitch(`${getKeySignature(keySignature).major}4`)
  const scale = buildScale(tonic, 'major')
  const motifStart = random.pick([0, 1, 2])
  const motif = [motifStart, motifStart + 1, motifStart + 2].map(index => scale[index])
  return {
    clef: 'treble', keySignature, timeSignature: '3/4',
    bars: [
      { dynamic: 'p', pulses: motif.map(pitch => ({ value: 'crotchet', pitch })) },
      { direction: 'cresc.', pulses: [{ value: 'crotchet', dots: 1, pitch: scale[4] }, { value: 'quaver', pitch: scale[5] }, { value: 'crotchet', pitch: scale[4] }] },
      { dynamic: 'f', pulses: [{ value: 'minim', pitch: scale[3] }, { value: 'crotchet', pitch: scale[2] }] },
      { direction: 'dim.', pulses: [{ value: 'crotchet', pitch: scale[2] }, { value: 'crotchet', pitch: scale[1] }, { value: 'crotchet', pitch: tonic }] },
    ],
  }
}

function contextQuestion(slot: ExamSlot, random: Random, paperRandom: Random): Draft {
  const { group, part } = slot
  const excerpt = originalExcerpt(paperRandom)
  const notes = excerpt.bars.flatMap(bar => bar.pulses.flatMap(pulse => pulse.pitch ? [pulse.pitch] : []))
  const key = getKeySignature(excerpt.keySignature).major
  const scale = buildScale(parsePitch(`${key}4`), 'major')
  const details = { objectiveId: 'CTX-5-OBSERVE', stimulus: { kind: 'excerpt', excerpt } as const }
  if (group === 1) {
    const from = excerpt.bars[0].pulses.map(pulse => pulse.pitch!)
    const result = from.map(pitch => transposeOctaves(pitch, -1))
    return choose(random, { ...details, variant: 'excerpt-transposition', stem: 'Which written pitches reproduce bar 1 one octave lower in the bass clef?',
      terms: ['octave lower', 'bass clef', 'transposition'] }, pitchNames(result, true), [
      [pitchNames(from, true), '这一组选项保留原八度。需要将每个音降低一个八度。'],
      [pitchNames(result.map(pitch => transposeOctaves(pitch, -1)), true), '这一组选项将每个音降低了两个八度。'],
      [pitchNames([result[0], result[2], result[1]], true), '第二和第三个音在降八度后仍须保持原来的先后顺序。'],
    ], `第 1 小节的音高为 ${pitchNames(from, true)}。逐个下降八度得到 ${pitchNames(result, true)}，音名和先后顺序仍然相同。`)
  }
  if (group === 2) {
    const truth = random.integer(0, 1) === 1
    const intervals = describeInterval(notes[0], notes[2])
    const statements = [
      [`The excerpt begins ${truth ? 'quietly' : 'loudly'}.`, '开头的 p 是 piano，表示弱奏。', 'dynamics'],
      [`The last note is the ${truth ? 'tonic' : 'dominant'} of ${key} major.`, `最后一个音是 ${formatPitchName(notes.at(-1)!)}，也就是 ${key} 大调的主音。`, 'tonic'],
      [`The interval between the first and last notes of bar 1 is a ${truth ? formatInterval(intervals) : 'perfect 4th'}.`, `第 1 小节的首尾音为 ${formatPitch(notes[0])} 和 ${formatPitch(notes[2])}，相隔 ${formatInterval(intervals)}。`, 'interval'],
      [`Bar 2 contains a dotted ${truth ? 'crotchet' : 'minim'}.`, '第 2 小节开头的符号是附点四分音符。接着是一个八分音符和一个四分音符。', 'dotted crotchet'],
      [`The volume should ${truth ? 'decrease' : 'increase'} in bar 4.`, '第 4 小节的 dim. 是 diminuendo，指力度逐渐减弱。', 'diminuendo'],
    ] as const
    const [stem, explanation, term] = statements[part - 1]
    return trueFalse(random, { ...details, variant: 'excerpt-statement', stem, terms: ['musical observation', term] }, truth, explanation)
  }
  if (group === 3) {
    return choose(random, { ...details, variant: 'excerpt-instrument',
      stem: 'Which instrument normally reads the treble clef and can play the excerpt at its written pitch?',
      terms: ['treble clef', 'written pitch', 'sounding pitch'] }, 'Violin', [
      ['Viola', '中提琴通常读中音谱号，虽然在高音区也会用高音谱号。'],
      ['Piccolo', '短笛使用高音谱号，但实际音高通常比书写音高高一个八度。'],
      ['Tuba', '大号一般使用低音谱号，而且其常用音域远低于这段旋律。'],
    ], '小提琴通常读高音谱号，实际音高与书写音高一致，并能演奏本段的音域。')
  }
  if (group === 4) {
    const degree = random.pick([1, 2, 3, 4, 5, 6] as const)
    const target = scale[degree - 1]
    const name = SCALE_DEGREES[degree - 1]
    const count = notes.filter(pitch => scaleDegree(scale[0], pitch) === degree).length
    return numeric({ ...details, variant: 'excerpt-count', stem: `How many times does the ${name} of ${key} major occur in the excerpt?`,
      terms: ['scale degree', name] }, count, `${key} 大调的第 ${degree} 级是 ${formatPitchName(target)}。在四个小节中逐个数出该音，一共出现 ${count} 次。`)
  }
  const isRhythm = part === 1
  return numeric({ ...details, variant: 'excerpt-bar-number', stem: isRhythm
    ? 'Which other bar has the same sequence of note values as bar 1? Enter its number.' : 'In which bar does the crescendo begin? Enter its number.',
    terms: ['bar', isRhythm ? 'note value' : 'crescendo'] }, isRhythm ? 4 : 2,
  isRhythm ? '第 1 与第 4 小节都由三个四分音符组成。其他小节含附点音符或二分音符。' : 'cresc. 出现在第 2 小节，指力度逐渐增强。第 4 小节的 dim. 表示逐渐减弱。')
}

export function generateExamQuestion(slot: ExamSlot, paperSeed: number): Grade5Question {
  const { sectionId, group, part, seed } = slot
  const random = createRandom(seed)
  const paperRandom = createRandom(`${paperSeed}:${sectionId}`)
  if (sectionId === 'intervals') {
    const objective = part % 2 === group % 2 ? 'INT-5-COMPOUND' : 'INT-5-SIMPLE'
    const variant = group === 1 ? 'identify' : group === 2 ? 'quality' : 'construct'
    return generateIntervalQuestion(objective, seed, variant)
  }
  const generators = {
    rhythm: rhythmQuestion, pitch: pitchQuestion, 'keys-scales': keyQuestion,
    chords: chordQuestion, terms: termsQuestion, context: contextQuestion,
  }
  const item = generators[sectionId](slot, random, paperRandom)
  return {
    ...item, id: `grade5-original-v1:${sectionId}:${group}:${part}:${seed}`, seed, difficulty: 5,
    contentKey: JSON.stringify([item.objectiveId, item.stem, item.notation, item.stimulus]),
  }
}
