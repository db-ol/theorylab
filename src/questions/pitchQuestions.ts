import {
  CLEFS, enharmonicSpellings, formatPitch, formatPitchName, getKeySignature, ordinal,
  pitchAtStaffPosition, sameSpelling, staffPosition, transposeInstrumentPitch, transposeOctaves,
  type Clef, type Pitch, type TransposingInstrument,
} from '../theory'
import { makeOptions, type Question } from './question'
import { createRandom, type QuestionSeed, type Random } from './random'

const GRADES = {
  'PIT-1-STAVE': 1, 'PIT-1-ACC': 1, 'TRN-1-SAME': 1,
  'PIT-2-LEDGER': 2, 'PIT-3-LEDGER': 3, 'TRN-3-OCTAVE': 3,
  'PIT-4-ALTO': 4, 'PIT-4-DOUBLE': 4, 'PIT-4-ENHARMONIC': 4, 'TRN-4-SAME': 4, 'TRN-4-OCTAVE': 4,
  'PIT-5-TENOR': 5, 'PIT-5-FOUR-CLEFS': 5, 'TRN-5-OCTAVE': 5, 'TRN-5-CONCERT': 5,
} as const

export type PitchObjectiveId = keyof typeof GRADES
export const PITCH_OBJECTIVE_IDS = Object.keys(GRADES) as PitchObjectiveId[]
type Payload = Omit<Question, 'id' | 'objectiveId' | 'seed' | 'difficulty'>

const BASIC_CLEFS: readonly Clef[] = ['treble', 'bass']
const EARLY_CLEFS: readonly Clef[] = ['treble', 'alto', 'bass']
const POSITION_LABELS = ['first', 'second', 'third', 'fourth', 'fifth']
const ACCIDENTAL_LABELS = ['double flat', 'flat', 'natural', 'sharp', 'double sharp']
const ACCIDENTAL_ZH = ['重降', '降', '本位', '升', '重升']

function staffLabel(position: number): string {
  if (position >= 0 && position <= 8) {
    return `The ${POSITION_LABELS[Math.floor(position / 2)]} ${position % 2 === 0 ? 'line' : 'space'}`
  }
  const offset = position < 0 ? -position : position - 8
  const direction = position < 0 ? 'below' : 'above'
  const kind = offset % 2 === 0 ? 'ledger line' : 'space'
  return `The ${POSITION_LABELS[Math.ceil(offset / 2) - 1] ?? ordinal(Math.ceil(offset / 2))} ${kind} ${direction} the stave`
}

function keyPitch(clef: Clef, position: number, count: number): Pitch {
  const natural = pitchAtStaffPosition(position, clef)
  return { ...natural, accidental: getKeySignature(count).accidentals[natural.letter] ?? 0 }
}

function readingQuestion(id: PitchObjectiveId, random: Random): Payload {
  const grade = GRADES[id]
  const clef = id === 'PIT-4-ALTO' ? 'alto' : id === 'PIT-5-TENOR' ? 'tenor'
    : random.pick(grade === 5 ? CLEFS : BASIC_CLEFS)
  const positions = id === 'PIT-2-LEDGER' ? [-5, -4, -3, -2, 10, 11, 12, 13]
    : id === 'PIT-3-LEDGER' ? [-7, -6, 14, 15]
      : grade === 1 ? [0, 1, 2, 3, 4, 5, 6, 7, 8, clef === 'treble' ? -2 : 10] : undefined
  const position = positions ? random.pick(positions) : random.integer(-4, 12)
  const count = grade < 3 ? 0 : random.integer(-grade - 1, grade + 1)
  const written = keyPitch(clef, position, count)
  const options = [written, ...random.shuffle([-2, -1, 1, 2]).slice(0, 3).map(offset =>
    keyPitch(clef, position + offset, count))]
  if (grade === 5 && id === 'PIT-5-FOUR-CLEFS') {
    const accidental = random.pick([-2, -1, 0, 1, 2])
    if (accidental !== written.accidental) {
      options[0] = { ...written, accidental }
      options[1] = written
    }
  }
  const note = options[0]
  const answer = formatPitch(note)
  const outside = position < 0 || position > 8
  const placement = position % 2 === 0 ? (outside ? 'ledger line' : 'line') : (outside ? 'outer space' : 'space')
  return {
    variant: `read pitch on a ${placement}`,
    contentKey: `${clef}:${count}:${answer}`,
    stem: 'Identify the pitch of the note shown.',
    ...makeOptions(random, options.map(pitch => ({
      text: formatPitch(pitch),
      explanationZh: sameSpelling(pitch, note)
        ? `这个音在 ${clef} clef 上的位置对应 ${formatPitchName(note)}，八度为 ${note.octave}。`
        : pitch.letter === note.letter && pitch.octave === note.octave
          ? `字母和八度正确。应用调号并检查临时记号后，应写成 ${answer}。`
          : `这个选项对应另一个谱表位置。按当前谱号从定位音数过来，得到 ${answer}。`,
    })), answer),
    explanationZh: `先按 ${clef} clef 的定位音数线和间，找出字母 ${note.letter} 和八度 ${note.octave}。这个位置依调号原本读作 ${formatPitch(written)}。最后检查音符前的临时记号，实际应读作 ${answer}。`,
    terms: [`${clef} clef`, 'ledger line', 'key signature', 'accidental'],
    notation: { clef, pitches: [note], keySignature: count },
  }
}

function accidentalQuestion(grade: 1 | 4, random: Random): Payload {
  const clef = random.pick(grade === 1 ? BASIC_CLEFS : EARLY_CLEFS)
  const count = grade === 1 ? 0 : random.integer(-5, 5)
  const position = random.integer(0, 8)
  const natural = pitchAtStaffPosition(position, clef)
  const inherited = keyPitch(clef, position, count)
  const first = { ...natural, accidental: random.pick(grade === 1 ? [-1, 1] : [-2, 2]) }
  const kind = random.pick(['same bar', 'cancellation', 'new bar'] as const)
  const max = grade === 1 ? 1 : 2
  const accidental = kind === 'same bar' ? first.accidental : kind === 'new bar' ? inherited.accidental
    : grade === 1 ? 0 : random.pick([-1, 0, 1])
  const last = { ...natural, accidental }
  const label = formatPitchName(last)
  const reasoning = kind === 'same bar' ? '第二个音在同一小节、同一位置，并且没有新的临时记号，因此沿用前一个音的变化量。'
    : kind === 'new bar' ? '小节线终止上一小节的临时记号。下一小节没有新的临时记号，因此回到调号规定的音高。'
      : '后一个音前的新记号直接给出相对本位音的变化量。它会替代之前的临时记号，无需与之前的变化量相加。'
  const options = Array.from({ length: 2 * max + 1 }, (_, index) => index - max).map(value => ({
    text: formatPitchName({ ...natural, accidental: value }),
    explanationZh: value === accidental
      ? `${reasoning}此处读作 ${label}。`
      : `这个选项使用了${ACCIDENTAL_ZH[value + 2]}音。按当前小节和调号规则，此处应为${ACCIDENTAL_ZH[accidental + 2]}音。`,
  }))
  return {
    variant: kind,
    contentKey: `${clef}:${count}:${formatPitch(first)}:${kind}:${label}`,
    stem: kind === 'new bar'
      ? 'In the next bar, a note appears at the same staff position without an accidental. What is its pitch name?'
      : 'The two notes are in the same bar. What is the pitch name of the second note?',
    ...makeOptions(random, options, label),
    explanationZh: `第一个音是 ${formatPitchName(first)}。${reasoning}答案是 ${label}。`,
    terms: [ACCIDENTAL_LABELS[first.accidental + 2], 'accidental', 'natural', 'bar line'],
    notation: { clef, pitches: kind === 'new bar' ? [first] : [first, last], keySignature: count },
  }
}

function enharmonicQuestion(random: Random): Payload {
  const clef = random.pick(EARLY_CLEFS)
  const initial = pitchAtStaffPosition(random.integer(-2, 10), clef, random.integer(-2, 2))
  const target = random.pick(enharmonicSpellings(initial).filter(pitch => !sameSpelling(pitch, initial)))
  const choices = [
    target, { ...target, accidental: target.accidental === 2 ? 1 : target.accidental + 1 },
    transposeOctaves(target, random.pick([-1, 1])), { ...initial, accidental: initial.accidental === -2 ? -1 : initial.accidental - 1 },
  ]
  const answer = formatPitch(target)
  return {
    variant: `enharmonic equivalent ${target.octave === initial.octave ? 'within an octave' : 'across an octave boundary'}`,
    contentKey: `${formatPitch(initial)}:${answer}`,
    stem: 'Which note is an enharmonic equivalent of the pitch shown?',
    ...makeOptions(random, choices.map(pitch => ({
      text: formatPitch(pitch),
      explanationZh: sameSpelling(pitch, target)
        ? `${formatPitch(initial)} 与 ${answer} 使用不同的字母与记号，却落在同一个钢琴键上。`
        : `除了核对字母与升降号，还需要核对八度。这个选项位于另一个琴键上。`,
    })), answer),
    explanationZh: `把 ${formatPitch(initial)} 和选项分别放到键盘上。只有 ${answer} 与它落在同一个琴键上。字母不同，实际音高相同，因此它们是等音异名。`,
    terms: ['enharmonic equivalent', 'pitch', 'spelling'],
    notation: { clef, pitches: [initial] },
  }
}

function samePitchQuestion(grade: 1 | 4, random: Random): Payload {
  const clefs = grade === 1 ? BASIC_CLEFS : EARLY_CLEFS
  const source = random.pick(clefs)
  const destination = random.pick(clefs.filter(clef => clef !== source))
  const count = grade === 1 ? 0 : random.integer(-5, 5)
  const available = [-4, -2, 1, 3, 4, 6, 8, 10, 12].map(position => keyPitch(source, position, count))
    .filter(pitch => staffPosition(pitch, destination) >= -9 && staffPosition(pitch, destination) <= 17)
  const note = grade === 1
    ? pitchAtStaffPosition(random.pick([-3, -2, -1]), 'treble', random.integer(-1, 1))
    : random.pick(available)
  const position = staffPosition(note, destination)
  const unique = new Set([position, position - 1, position + 1, position < 12 ? position + 2 : position - 2])
  const options = [...unique].map(candidate => ({
    text: staffLabel(candidate),
    explanationZh: candidate === position
      ? `目标谱号在这里写出 ${formatPitch(note)}，与题目音符完全同音高。`
      : `这个位置在 ${destination} clef 上对应 ${formatPitchName(pitchAtStaffPosition(candidate, destination))}，无法保留原来的音高。`,
  }))
  return {
    variant: `same pitch in ${destination} clef`,
    contentKey: `${source}:${destination}:${count}:${formatPitch(note)}`,
    stem: `At which position in the ${destination} clef would you write the same pitch? Retain the same pitch spelling.`,
    ...makeOptions(random, options, staffLabel(position)),
    explanationZh: `先将 ${source} clef 上的音读作 ${formatPitch(note)}。在 ${destination} clef 中从其定位音重新找位置，字母、八度和变化量保持不变。`,
    terms: ['same pitch', `${source} clef`, `${destination} clef`],
    notation: { clef: source, pitches: [note], keySignature: count },
  }
}

function phraseLabel(pitches: readonly Pitch[]): string {
  return pitches.map(formatPitch).join(', ')
}

function phraseChoices(source: Pitch[], target: Pitch[], alternative: Pitch[], incorrectAccidental: Pitch[]) {
  return [
    { text: phraseLabel(target), explanationZh: '每个音都按题意移调，保留了正确的字母、八度和变化量。' },
    { text: phraseLabel(source), explanationZh: '此选项保留原音高。题目要求按给定方向改变音高。' },
    { text: phraseLabel(alternative), explanationZh: '这个选项向相反方向移调。请先确认题目给出的方向。' },
    { text: phraseLabel(incorrectAccidental), explanationZh: '最后一个音的变化量不符。应逐音检查拼写并保留题目指定的音程。' },
  ]
}

function alteredFinal(pitches: Pitch[]): Pitch[] {
  const last = pitches[pitches.length - 1]
  return [...pitches.slice(0, -1), { ...last, accidental: last.accidental === 2 ? 1 : last.accidental + 1 }]
}

function octaveQuestion(grade: 3 | 4 | 5, random: Random): Payload {
  const clefs = grade === 3 ? BASIC_CLEFS : grade === 4 ? EARLY_CLEFS : CLEFS
  const clefPairs = clefs.flatMap(source => clefs.filter(destination =>
    destination !== source && (grade !== 4 || source === 'alto' || destination === 'alto'))
    .map(destination => ({ source, destination })))
  const { source, destination } = random.pick(clefPairs)
  const direction = random.pick([-1, 1])
  const offsets = random.pick([[0, 1, 2], [0, -1, 1], [0, 2, -1], [0, -2, -1]])
  const count = random.integer(-grade - 1, grade + 1)
  const min = grade === 3 ? -7 : -9
  const max = grade === 3 ? 15 : 17
  const playable = Array.from({ length: max - min + 1 }, (_, index) => min + index).flatMap(position => {
    const phrase = offsets.map(offset => keyPitch(source, position + offset, count))
    const sourcePositions = phrase.map(pitch => staffPosition(pitch, source))
    const destinationPositions = phrase.map(pitch => staffPosition(transposeOctaves(pitch, direction), destination))
    return [...sourcePositions, ...destinationPositions].every(step => step >= min && step <= max) ? [phrase] : []
  })
  const original = random.pick(playable)
  const target = original.map(pitch => transposeOctaves(pitch, direction))
  const best = phraseLabel(target)
  const opposite = original.map(pitch => transposeOctaves(pitch, -direction))
  return {
    variant: `octave transposition ${direction > 0 ? 'higher' : 'lower'}`,
    contentKey: `${source}:${destination}:${count}:${direction}:${phraseLabel(original)}`,
    stem: `Which pitches should be written, in order, in the ${destination} clef to transpose this melody one octave ${direction > 0 ? 'higher' : 'lower'}?`,
    ...makeOptions(random, phraseChoices(original, target, opposite, alteredFinal(target)), best),
    explanationZh: `题目要求把每个音整体${direction > 0 ? '升高' : '降低'}一个八度。从 ${phraseLabel(original).replaceAll(', ', '、')} 逐个换算，得到 ${best.replaceAll(', ', '、')}。更换到 ${destination} clef 只改变书写位置，不会额外改变实际音高。`,
    terms: ['transpose', 'octave higher', 'octave lower', `${destination} clef`],
    notation: { clef: source, pitches: original, keySignature: count },
  }
}

const INSTRUMENTS: Record<TransposingInstrument, { name: string; interval: string; width: number }> = {
  'B♭': { name: 'B flat', interval: 'major 2nd', width: 2 },
  A: { name: 'A', interval: 'minor 3rd', width: 3 },
  F: { name: 'F', interval: 'perfect 5th', width: 7 },
}

function concertQuestion(random: Random): Payload {
  const instrument = random.pick(Object.keys(INSTRUMENTS) as TransposingInstrument[])
  const { name, interval, width } = INSTRUMENTS[instrument]
  const to = random.pick(['written', 'sounding'] as const)
  const clef = random.pick(CLEFS)
  const count = random.integer(0, 1) === 0 ? 0 : random.integer(-6, 6)
  const position = random.integer(1, 7)
  const offsets = random.pick([[0, 1, 2], [0, -1, 1], [0, 2, -1], [0, -2, -1]])
  const original = offsets.map(offset => keyPitch(clef, position + offset, count))
  const target = original.map(pitch => transposeInstrumentPitch(pitch, instrument, to))
  const opposite = original.map(pitch => transposeInstrumentPitch(pitch, instrument, to === 'written' ? 'sounding' : 'written'))
  const best = phraseLabel(target)
  const direction = to === 'sounding' ? 'down' : 'up'
  return {
    variant: `instrument transposition to ${to === 'sounding' ? 'concert' : 'written'} pitch`,
    contentKey: `${instrument}:${to}:${clef}:${count}:${phraseLabel(original)}`,
    stem: to === 'sounding'
      ? `This melody is written for an instrument in ${name}. Transpose it ${direction} a ${interval}. What are the concert pitches, in order?`
      : `These notes are at concert pitch. Transpose them ${direction} a ${interval}. What pitches should be written for an instrument in ${name}?`,
    ...makeOptions(random, phraseChoices(original, target, opposite, alteredFinal(target)), best),
    explanationZh: `题目要求${direction === 'down' ? '向下' : '向上'}移调 ${interval}，也就是 ${width} 个半音。每个目标音先按度数找字母，再配上准确的升降号。答案依次为 ${best.replaceAll(', ', '、')}。`,
    terms: ['written pitch', 'concert pitch', 'sounding pitch', `instrument in ${name}`],
    notation: { clef, pitches: original, keySignature: count },
  }
}

export function isPitchObjective(id: string): id is PitchObjectiveId {
  return Object.hasOwn(GRADES, id)
}

export function generatePitchQuestion(objectiveId: string, seed: QuestionSeed): Question {
  if (!isPitchObjective(objectiveId)) throw new RangeError(`Unknown pitch or transposition objective: ${objectiveId}`)
  const difficulty = GRADES[objectiveId]
  const random = createRandom(`${objectiveId}:${typeof seed}:${seed}`)
  const metadata = { id: `${objectiveId}:v1:${typeof seed}:${seed}`, objectiveId, seed, difficulty }
  switch (objectiveId) {
    case 'PIT-1-ACC': return { ...metadata, ...accidentalQuestion(1, random) }
    case 'PIT-4-DOUBLE': return { ...metadata, ...accidentalQuestion(4, random) }
    case 'PIT-4-ENHARMONIC': return { ...metadata, ...enharmonicQuestion(random) }
    case 'TRN-1-SAME': return { ...metadata, ...samePitchQuestion(1, random) }
    case 'TRN-4-SAME': return { ...metadata, ...samePitchQuestion(4, random) }
    case 'TRN-3-OCTAVE': return { ...metadata, ...octaveQuestion(3, random) }
    case 'TRN-4-OCTAVE': return { ...metadata, ...octaveQuestion(4, random) }
    case 'TRN-5-OCTAVE': return { ...metadata, ...octaveQuestion(5, random) }
    case 'TRN-5-CONCERT': return { ...metadata, ...concertQuestion(random) }
    default: return { ...metadata, ...readingQuestion(objectiveId, random) }
  }
}
