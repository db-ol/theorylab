import type { ExamExcerpt, Grade5Question, RhythmPulse } from '../exam/grade5'
import {
  buildScale, describeInterval, formatInterval, formatPitch, formatPitchName, getKeySignature, parsePitch,
  pitchAtStaffPosition, staffPosition, transposeOctaves, type Clef, type Pitch,
} from '../theory'
import { makeOptions, type QuestionOption } from './question'
import { createRandom, type QuestionSeed, type Random } from './random'

const GRADES = { 'CTX-1-MELODY': 1, 'CTX-4-EXCERPT': 4, 'CTX-5-OBSERVE': 5 } as const
export type ContextObjectiveId = keyof typeof GRADES
type Draft = Pick<Grade5Question, 'variant' | 'stem' | 'terms' | 'options' | 'correctAnswer' | 'explanationZh' | 'answerKind'>
type Stem = Pick<Draft, 'variant' | 'stem' | 'terms'>

const DYNAMICS = {
  p: ['Softly', 'p 是 piano 的缩写，表示弱奏。'],
  mp: ['Moderately softly', 'mp 是 mezzo piano 的缩写，表示中弱。'],
  mf: ['Moderately loudly', 'mf 是 mezzo forte 的缩写，表示中强。'],
  f: ['Loudly', 'f 是 forte 的缩写，表示强奏。'],
} as const
const INSTRUMENTS = {
  treble: ['Flute', 'Bassoon', 'Viola', 'Timpani'],
  alto: ['Viola', 'Flute', 'Bassoon', 'Timpani'],
  bass: ['Bassoon', 'Viola', 'Flute', 'Oboe'],
} as const
const USUAL_CLEF: Record<string, string> = {
  Flute: '高音谱号', Bassoon: '低音谱号', Viola: '中音谱号', Timpani: '低音谱号', Oboe: '高音谱号',
}
const NOTE_DESCRIPTIONS = {
  crotchet: '四分音符有实心符头和符干。',
  'dotted crotchet': '符头右侧有附点。它给四分音符增加一半的时值。',
  minim: '二分音符有空心符头和符干。',
  quaver: '八分音符有实心符头和一条符尾，或用一条符杠与相邻音连接。',
} as const

function select(
  random: Random, details: Stem, target: string, explanationZh: string, others: readonly Omit<QuestionOption, 'id'>[],
): Draft {
  return { ...details, ...makeOptions(random, [{ text: target, explanationZh }, ...others], target), explanationZh }
}

function chooseNote(random: Random, excerpt: ExamExcerpt): Draft {
  const barIndex = random.integer(0, excerpt.bars.length - 1)
  const notes = excerpt.bars[barIndex].pulses.flatMap(pulse => pulse.pitch ? [pulse.pitch] : [])
  const note = random.pick(notes)
  const correct = formatPitch(note)
  const noteIndex = notes.indexOf(note)
  const options = [-2, -1, 1].map(offset => {
    const wrong = pitchAtStaffPosition(staffPosition(note, excerpt.clef) + offset, excerpt.clef)
    return { text: formatPitch(wrong), explanationZh: '此选项在另一处谱线或间。按小节编号定位，再从左向右数音。' }
  })
  return select(random, {
    stem: `Identify note ${noteIndex + 1} of bar ${barIndex + 1}.`,
    terms: ['identify', 'bar number', `${excerpt.clef} clef`], variant: 'excerpt pitch',
  }, correct, `先找到第 ${barIndex + 1} 小节，再从左向右数到第 ${noteIndex + 1} 个音。结合谱号和调号，读作 ${correct}。`, options)
}

function chooseDynamic(random: Random, excerpt: ExamExcerpt): Draft {
  const symbol = excerpt.bars[0].dynamic as keyof typeof DYNAMICS
  const [label, explanation] = DYNAMICS[symbol]
  return select(random, {
    stem: 'How should the first bar be played according to its dynamic marking?',
    terms: ['dynamic marking', symbol], variant: 'excerpt dynamics',
  }, label, `第 1 小节标的是 ${symbol}。${explanation}`, Object.entries(DYNAMICS).filter(([key]) => key !== symbol)
    .map(([key, [text]]) => ({ text, explanationZh: `${text} 对应 ${key}。谱面上标的是 ${symbol}。` })))
}

function chooseRhythm(random: Random, excerpt: ExamExcerpt): Draft {
  const barIndex = random.integer(0, 3)
  const pulse = excerpt.bars[barIndex].pulses[0]
  const answer = (pulse.dots ? 'dotted crotchet' : pulse.value) as keyof typeof NOTE_DESCRIPTIONS
  return select(random, {
    stem: `What is the value of the first note of bar ${barIndex + 1}?`,
    terms: ['note value', 'bar', answer], variant: 'excerpt rhythm',
  }, answer, `第 ${barIndex + 1} 小节的第一个音是 ${answer}。${NOTE_DESCRIPTIONS[answer]}`,
  Object.entries(NOTE_DESCRIPTIONS).filter(([key]) => key !== answer)
    .map(([text, reason]) => ({ text, explanationZh: `${reason}题中的第一个音不符合这个描述。` })))
}

function chooseInstrument(random: Random, excerpt: ExamExcerpt): Draft {
  const clef = excerpt.clef as keyof typeof INSTRUMENTS
  const [answer, ...alternatives] = INSTRUMENTS[clef]
  return select(random, {
    stem: 'Which instrument usually reads the clef shown in this passage?',
    terms: ['orchestral instrument', 'passage', `${clef} clef`], variant: 'excerpt instrument',
  }, answer, `本段使用 ${clef} clef。${answer} 通常用这个谱号。`, alternatives.map(instrument => ({
    text: instrument, explanationZh: `${instrument} 通常使用${USUAL_CLEF[instrument]}。这段旋律的谱号不同。`,
  })))
}

function decideStatement(random: Random, excerpt: ExamExcerpt): Draft {
  const first = excerpt.bars[0].pulses[0].pitch!
  const last = excerpt.bars[0].pulses.at(-1)!.pitch!
  const interval = describeInterval(first, last)
  const truth = random.integer(0, 1) === 1
  const kind = random.pick(['interval', 'tempo', 'note value'] as const)
  const [stem, explanationZh] = kind === 'interval'
    ? [`The first and last notes of bar 1 form a ${truth ? formatInterval(interval) : 'perfect 5th'}.`,
      `第 1 小节的首尾音是 ${formatPitch(first)} 和 ${formatPitch(last)}。按书写字母数度数，再数钢琴键之间的半音，得到 ${formatInterval(interval)}。`]
    : kind === 'tempo'
      ? [`The instruction in bar 2 asks the performer to ${truth ? 'slow down' : 'speed up'}.`,
        '第 2 小节写着 rall.，是 rallentando 的缩写，表示逐渐放慢。']
      : [`The first note of bar 3 is a ${truth ? 'minim' : 'crotchet'}.`,
        '第 3 小节开头是空心符头带符干，表示二分音符。在这个拍号中相当于两拍。']
  return select(random, {
    stem, terms: ['true', 'false', 'musical observation', kind], variant: 'excerpt statement',
  }, truth ? 'True' : 'False', explanationZh,
  [{ text: truth ? 'False' : 'True', explanationZh: `请以谱中的记号或音符为依据。${explanationZh}` }])
}

function countPitch(random: Random, excerpt: ExamExcerpt, scale: Pitch[]): Draft {
  const label = formatPitchName(scale[random.integer(0, 5)])
  const count = excerpt.bars.flatMap(bar => bar.pulses)
    .filter(pulse => pulse.pitch && formatPitchName(pulse.pitch) === label).length
  return {
    variant: 'excerpt count',
    stem: `How many times does ${label} occur in the excerpt? Count each written note once.`,
    terms: ['excerpt', 'count', 'pitch'], answerKind: 'numeric',
    correctAnswer: { optionId: String(count), number: count }, options: [],
    explanationZh: `先按谱号和调号找出 ${label}。再逐小节记下每次出现。每个写出的音符只计一次，音符时值不会改变次数。全段共出现 ${count} 次。`,
  }
}

function originalScore(grade: 1 | 4 | 5, random: Random): { excerpt: ExamExcerpt; scale: Pitch[] } {
  const clef = random.pick<Clef>(grade === 1 ? ['treble', 'bass']
    : grade === 4 ? ['treble', 'alto', 'bass'] : ['treble', 'alto', 'tenor', 'bass'])
  const keySignature = grade === 1 ? random.pick([-1, 0, 1, 2]) : random.integer(-grade - 1, grade + 1)
  const key = getKeySignature(keySignature).major
  const root = parsePitch(`${key}${pitchAtStaffPosition(0, clef).octave}`)
  const tonic = staffPosition(root, clef) >= -2 ? root : transposeOctaves(root, 1)
  const scale = buildScale(staffPosition(tonic, clef) > 5 ? transposeOctaves(tonic, -1) : tonic, 'major')
  const opening = random.pick([[0, 1, 2], [2, 1, 0], [1, 2, 3], [3, 2, 1]])
  const phrase = random.pick([[4, 5, 4], [3, 4, 2], [2, 0, 1]])
  const dynamic = random.pick(Object.keys(DYNAMICS))
  const crotchets = (degrees: number[]): RhythmPulse[] => degrees.map(degree => ({ value: 'crotchet', pitch: scale[degree] }))
  return {
    scale,
    excerpt: {
      clef, keySignature, timeSignature: '3/4',
      bars: [
        { dynamic, pulses: crotchets(opening) },
        { direction: grade === 5 ? 'rall.' : undefined, pulses: [
          { value: 'crotchet', dots: 1, pitch: scale[phrase[0]] },
          { value: 'quaver', pitch: scale[phrase[1]] },
          { value: 'crotchet', pitch: scale[phrase[2]] },
        ] },
        { pulses: [{ value: 'minim', pitch: scale[4] }, { value: 'crotchet', pitch: scale[2] }] },
        { pulses: crotchets([2, 1, 0]) },
      ],
    },
  }
}

export function isContextObjective(id: string): id is ContextObjectiveId {
  return Object.hasOwn(GRADES, id)
}

export function generateContextQuestion(objectiveId: string, seed: QuestionSeed): Grade5Question {
  if (!isContextObjective(objectiveId)) throw new RangeError(`Unknown music in context objective: ${objectiveId}`)
  const difficulty = GRADES[objectiveId]
  const random = createRandom(`${objectiveId}:${typeof seed}:${seed}`)
  const { excerpt, scale } = originalScore(difficulty, random)
  const candidates = difficulty === 1 ? [chooseNote, chooseDynamic, chooseRhythm]
    : difficulty === 4 ? [chooseNote, chooseDynamic, chooseRhythm, chooseInstrument]
      : [chooseNote, chooseDynamic, chooseRhythm, decideStatement, countPitch]
  const question = random.pick(candidates)(random, excerpt, scale)
  const scoreKey = excerpt.bars.map(bar => `${bar.dynamic ?? ''}${bar.pulses.map(pulse => formatPitch(pulse.pitch!)).join('/')}`).join('|')
  return {
    ...question, id: `${objectiveId}:v1:${typeof seed}:${seed}`, objectiveId, seed, difficulty,
    contentKey: `${excerpt.clef}:${excerpt.keySignature}:${scoreKey}:${question.stem}`,
    stimulus: { kind: 'excerpt', excerpt },
  }
}
