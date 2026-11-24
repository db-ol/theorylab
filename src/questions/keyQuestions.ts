import {
  buildChromaticScale, buildScale, formatPitch, formatPitchName, getKeySignature, midiNumber, ordinal, parsePitch,
  scaleDegreeName, staffPosition, transposeOctaves,
  type Clef, type Direction, type Pitch, type ScaleForm,
} from '../theory'
import { makeOptions, type Question } from './question'
import { createRandom, type QuestionSeed, type Random } from './random'

export const KEY_OBJECTIVE_IDS = [
  'KEY-1-SIGNATURE', 'KEY-1-MAJOR', 'KEY-1-DEGREE',
  'KEY-2-RELATIVE', 'KEY-2-SIGNATURE', 'KEY-2-MAJOR', 'KEY-2-HARMONIC', 'KEY-2-DEGREE',
  'KEY-3-SIGNATURE', 'KEY-3-MAJOR', 'KEY-3-HARMONIC', 'KEY-3-MELODIC', 'KEY-3-DEGREE',
  'KEY-4-SIGNATURE', 'KEY-4-SCALES', 'KEY-4-DEGREE', 'KEY-4-CHROMATIC',
  'KEY-5-SIGNATURE', 'KEY-5-SCALES',
] as const

export type KeyObjectiveId = typeof KEY_OBJECTIVE_IDS[number]

type KeyGrade = 1 | 2 | 3 | 4 | 5
type ItemBody = Omit<Question, 'id' | 'objectiveId' | 'seed' | 'difficulty'>

const clefs: Record<KeyGrade, readonly Clef[]> = {
  1: ['treble', 'bass'],
  2: ['treble', 'bass'],
  3: ['treble', 'bass'],
  4: ['treble', 'bass', 'alto'],
  5: ['treble', 'bass', 'alto', 'tenor'],
}

const forms = ['major', 'harmonic minor', 'melodic minor'] as const
const gradeOneSignatures = [-1, 0, 1, 2]
const gradeTwoMinorSignatures = [-1, 0, 1]
const gradeTwoNewMajorSignatures = [-3, -2, 3]

function signatureCounts(grade: KeyGrade): number[] {
  if (grade === 1) return gradeOneSignatures
  const limit = grade === 2 ? 3 : grade + 1
  return Array.from({ length: limit * 2 + 1 }, (_, index) => index - limit)
}

function availableCounts(grade: KeyGrade, minor: boolean): number[] {
  return grade === 2 && minor ? gradeTwoMinorSignatures : signatureCounts(grade)
}

function signatureText(count: number): string {
  if (count === 0) return 'No sharps or flats'
  const unit = count < 0 ? 'flat' : 'sharp'
  return `${Math.abs(count)} ${unit}${Math.abs(count) > 1 ? 's' : ''}`
}

function signatureZh(count: number): string {
  const key = getKeySignature(count)
  const names = Object.keys(key.accidentals)
  if (!names.length) return '没有升降号'
  return `有 ${names.length} 个${count < 0 ? '降号' : '升号'}，依次作用于 ${names.join('、')}`
}

function inRegister(name: string, clef: Clef, direction: Direction): Pitch {
  const centre = direction === 'ascending' ? 1 : 7
  return [3, 4, 5, 2].map(octave => parsePitch(`${name}${octave}`))
    .reduce((best, pitch) =>
      Math.abs(staffPosition(pitch, clef) - centre) < Math.abs(staffPosition(best, clef) - centre) ? pitch : best)
}

function keyName(count: number, minor: boolean): string {
  const key = getKeySignature(count)
  return minor ? `${key.minor} minor` : `${key.major} major`
}

function signatureQuestion(grade: KeyGrade, random: Random): ItemBody {
  if (grade >= 3 && random.integer(0, 4) === 0) return relativeQuestion(random, grade)
  const clef = random.pick(clefs[grade])
  const minor = grade > 1 && random.integer(0, 1) === 1
  const counts = availableCounts(grade, minor)
  const count = random.pick(counts)
  const name = keyName(count, minor)
  const stemKind = random.integer(0, 2)
  const explanationZh = `${name} 的调号${signatureZh(count)}。关系大小调共用调号，题目中的 major 或 minor 决定用哪一组主音来读。`
  const candidates = [count, ...random.shuffle(counts.filter(value => value !== count)).slice(0, 3)]
  if (stemKind === 0) {
    return {
      variant: 'read-signature',
      contentKey: `read-signature:${count}:${minor}:${clef}`,
      stem: `Which ${minor ? 'minor' : 'major'} key uses this key signature?`,
      explanationZh,
      terms: ['key signature', minor ? 'minor key' : 'major key'],
      notation: { clef, pitches: [], keySignature: count },
      ...makeOptions(random, candidates.map(candidate => ({
        text: keyName(candidate, minor),
        explanationZh: `${keyName(candidate, minor)} 的调号${signatureZh(candidate)}，${candidate === count ? '与谱面相符' : '与谱面不同'}。`,
      })), name),
    }
  }
  if (stemKind === 1) {
    return {
      variant: 'signature-count',
      contentKey: `signature-count:${name}`,
      stem: `Which key signature is used for ${name}?`,
      explanationZh,
      terms: ['key signature', 'sharp', 'flat'],
      ...makeOptions(random, candidates.map(candidate => ({
        text: signatureText(candidate),
        explanationZh: `这个调号${signatureZh(candidate)}。${candidate === count ? '这正是' : '这不同于'} ${name} 的调号。`,
      })), signatureText(count)),
    }
  }
  const letters = Object.keys(getKeySignature(count).accidentals)
  return {
    variant: 'signature-order',
    contentKey: `signature-order:${name}`,
    stem: `Which list gives the notes changed by the key signature of ${name}, in standard order?`,
    explanationZh,
    terms: ['key signature', 'sharp', 'flat'],
    ...makeOptions(random, candidates.map(candidate => {
      const signature = getKeySignature(candidate)
      const names = Object.keys(signature.accidentals)
      const text = names.map(letter => formatPitchName({ letter: letter as Pitch['letter'], accidental: Math.sign(candidate) })).join(' ')
      return {
        text: text || 'None',
        explanationZh: candidate === count
          ? letters.length ? `顺序是 ${letters.join('、')}，与该调号相符。` : '这个调的调号没有任何升号或降号。'
          : `这个列表对应的调号${signatureZh(candidate)}，与 ${name} 的调号不同。`,
      }
    }), letters.map(letter => `${letter}${count < 0 ? '♭' : '♯'}`).join(' ') || 'None'),
  }
}

function relativeQuestion(random: Random, grade: KeyGrade = 2): ItemBody {
  const counts = availableCounts(grade, true)
  const count = random.pick(counts)
  const clef = random.pick(clefs[grade])
  const minor = random.integer(0, 1) === 1
  const byNotation = random.integer(0, 1) === 1
  const majorName = keyName(count, false)
  const minorName = keyName(count, true)
  const source = minor ? majorName : minorName
  const correct = minor ? minorName : majorName
  const choices = [count, ...random.shuffle(counts.filter(value => value !== count)).slice(0, 3)]
  return {
    variant: byNotation ? 'relative-from-signature' : 'relative-key',
    contentKey: byNotation ? `relative-from-signature:${count}:${minor}:${clef}` : `relative-key:${source}`,
    stem: byNotation
      ? `This is the key signature of ${source}. Which is its relative ${minor ? 'minor' : 'major'} key?`
      : `Which is the relative ${minor ? 'minor' : 'major'} of ${source}?`,
    explanationZh: `${majorName} 和 ${minorName} 共用调号。它们的调号${signatureZh(count)}。关系小调的主音是关系大调的第六级，从大调主音向下找小三度也能得到它。`,
    terms: ['relative major', 'relative minor', 'key signature'],
    notation: byNotation ? { clef, pitches: [], keySignature: count } : undefined,
    ...makeOptions(random, choices.map(candidate => ({
      text: keyName(candidate, minor),
      explanationZh: `${keyName(candidate, minor)} 的调号${signatureZh(candidate)}，${candidate === count ? '与给出的调相同' : '与给出的调不同'}。`,
    })), correct),
  }
}

interface ScaleContext {
  grade: KeyGrade
  clef: Clef
  count: number
  name: string
  form: ScaleForm
  direction: Direction
  pitches: Pitch[]
}

function scaleContext(grade: KeyGrade, form: ScaleForm, random: Random, counts?: number[]): ScaleContext {
  const minor = form !== 'major'
  const count = random.pick(counts ?? availableCounts(grade, minor))
  const key = getKeySignature(count)
  const name = minor ? key.minor : key.major
  const clef = random.pick(clefs[grade])
  const direction = random.pick<Direction>(['ascending', 'descending'])
  const pitches = buildScale(inRegister(name, clef, direction), form, direction)
  return { grade, clef, count, name, form, direction, pitches }
}

function spellOption(
  pitch: Pitch, correct: Pitch, direction: Direction, previous: Pitch, chromatic: boolean,
): { text: string; explanationZh: string } {
  const expected = formatPitchName(correct)
  const text = formatPitchName(pitch)
  if (text === expected) return { text, explanationZh: `${expected} 的字母和音高都符合题目要求。` }
  const distance = (midiNumber(pitch) - midiNumber(previous)) * (direction === 'ascending' ? 1 : -1)
  if (chromatic) return { text, explanationZh: `从前一个音按给定方向移动到这里，音高变化为 ${distance} 个半音。半音音阶的相邻音应相差一个半音。` }
  return {
    text,
    explanationZh: pitch.letter === correct.letter
      ? `${text} 的字母位置正确，但变化记号与音阶不符。这里应填 ${expected}。`
      : `${text} 的字母位置不符。这里需要按顺序使用 ${correct.letter}，完整拼写为 ${expected}。`,
  }
}

function gapQuestion(
  context: ScaleContext, random: Random, chromatic = false,
): ItemBody {
  const { grade, clef, count, name, direction, pitches, form } = context
  const interior = Array.from({ length: pitches.length - 2 }, (_, index) => index + 1)
  const changingDegrees = direction === 'ascending' ? [5, 6] : [1, 2]
  const missing = form !== 'major' && !chromatic && random.integer(0, 1) === 1
    ? random.pick(changingDegrees)
    : random.pick(interior)
  const correct = pitches[missing]
  const previous = pitches[missing - 1]
  const next = pitches[missing + 1]
  const correctName = formatPitchName(correct)
  const contextLabel = `${name} ${chromatic ? 'chromatic' : form}`
  const displayed = pitches.map((pitch, index) => index === missing ? '[blank]' : formatPitchName(pitch)).join(' ')
  const accidentals = grade < 4 ? [0, -1, 1] : [0, -1, 1, -2, 2]
  const sameLetter = accidentals.map(accidental => ({ ...correct, accidental }))
  const nearby = random.shuffle([previous, next, ...sameLetter])
  const seen = new Set([correctName])
  const alternate = nearby.filter(pitch => {
    const label = formatPitchName(pitch)
    if (seen.has(label) || chromatic && midiNumber(pitch) === midiNumber(correct)) return false
    seen.add(label)
    return true
  }).slice(0, 3)
  const step = Math.abs(midiNumber(correct) - midiNumber(previous))
  const formExplanation = form === 'major'
    ? '大调的上行音程排列是全、全、半、全、全、全、半。下行按相反次序读取。'
    : form === 'harmonic minor'
      ? '和声小调在两个方向都比自然小调升高第七级。'
      : direction === 'ascending'
        ? '旋律小调上行比自然小调升高第六级和第七级。'
        : '古典旋律小调下行恢复自然小调的第六级和第七级。'
  const explanationZh = chromatic
    ? `${formatPitchName(previous)}、${correctName}、${formatPitchName(next)} 按指定方向依次相隔一个半音。因此空格应选 ${correctName}。`
    : `${formExplanation} 空格处需要字母 ${correct.letter}，与前一个音相隔 ${step} 个半音，因此应拼写成 ${correctName}。完整音阶为 ${pitches.map(formatPitchName).join('、')}。`
  const byNotation = !chromatic && random.integer(0, 2) === 0
  if (byNotation) {
    const position = missing + 1
    const options = [correct, ...alternate].map(pitch => ({
      ...spellOption(pitch, correct, direction, previous, false),
      text: formatPitch(pitch),
    }))
    const choice = makeOptions(random, options, formatPitch(correct))
    return {
      variant: 'place-scale-degree',
      contentKey: `place-scale-degree:${contextLabel}:${direction}:${clef}:${position}`,
      stem: `Place the ${ordinal(position)} note of the ${direction} scale of ${contextLabel}. The first note is shown.`,
      explanationZh,
      terms: ['scale', 'scale degree', direction, form],
      notation: { clef, pitches: [pitches[0]], keySignature: count },
      ...choice,
      answerKind: 'pitch',
      correctAnswer: { ...choice.correctAnswer, pitch: correct },
    }
  }
  return {
    variant: chromatic ? `chromatic-gap-${direction}` : 'diatonic-gap',
    contentKey: `scale-gap:${contextLabel}:${direction}:${missing}`,
    stem: `Complete the ${direction} ${contextLabel} scale. ${displayed}.`,
    explanationZh,
    terms: ['scale', direction, chromatic ? 'chromatic scale' : form],
    ...makeOptions(random, [correct, ...alternate].map(pitch => spellOption(pitch, correct, direction, previous, chromatic)), correctName),
  }
}

function degreeQuestion(grade: KeyGrade, random: Random): ItemBody {
  const form = grade === 1 ? 'major' : random.pick(forms.filter(value => grade > 2 || value !== 'melodic minor'))
  const context = scaleContext(grade, form, random)
  const { count, name, clef } = context
  const tonic = inRegister(name, clef, grade === 1 ? 'ascending' : 'descending')
  const degrees = buildScale(tonic, form)
  const index = random.integer(grade === 2 ? 1 : 0, grade === 1 ? 7 : 6)
  const above = grade === 1 || grade === 2 || random.integer(0, 1) === 1
  const extension = grade === 2 ? 1 : above ? 0 : -1
  const selected = transposeOctaves(degrees[index], extension)
  const named = grade === 4
  const counting = grade === 2 && random.integer(0, 1) === 1
  const expected = named ? scaleDegreeName(index + 1) : String(index + 1 + (counting ? 7 : 0))
  const numbers = named ? [1, 2, 3, 4, 5, 6, 7]
    : counting ? [8, 9, 10, 11, 12, 13, 14] : grade === 1 ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 7]
  const target = index + 1 + (counting ? 7 : 0)
  const labels = [target, ...random.shuffle(numbers.filter(number => number !== target)).slice(0, 3)]
  const source = `${name} ${form}`
  const explanationZh = counting
    ? `从 ${formatPitch(tonic)} 算作 1，走到高八度主音时为 8。再沿原音阶继续数，到 ${formatPitch(selected)} 是第 ${target} 个音。按调性音级，它相当于第 ${index + 1} 级。`
    : `${formatPitchName(selected)} 在 ${source} 音阶中对应第 ${index + 1} 级。${named ? `该音级的名称是 ${expected}。` : index === 7 ? '题目按从低主音到高主音的顺序计数，所以高主音记作 8。' : '换到另一个八度时，音级的调性作用保持不变。'}`
  const countingPrompt = grade === 1
    ? 'Count up from the first note, including both notes.'
    : 'Use scale degree numbers 1 to 7, regardless of octave.'
  return {
    variant: named ? `degree-name-${clef}` : counting ? 'extended-position' : `degree-number-${clef}`,
    contentKey: `degree:${source}:${formatPitch(selected)}:${counting}:${clef}`,
    stem: named
      ? `Which technical name describes the second note in ${source}?`
      : counting
        ? `What is the position of the second note when counted upwards in ${source}? Count the given tonic as 1 and continue beyond the octave.`
        : `Which degree of ${source} is the second note? ${countingPrompt}`,
    explanationZh,
    terms: ['tonic', 'scale degree', ...(named ? [expected] : ['octave'])],
    notation: { clef, pitches: [tonic, selected], keySignature: count },
    ...makeOptions(random, labels.map(number => {
      const text = named ? scaleDegreeName(number) : String(number)
      return {
        text,
        explanationZh: `这个选项表示第 ${number} ${counting ? '个音' : '级'}，${number === target ? '符合' : '不符合'}题目所示位置。`,
      }
    }), expected),
  }
}

function chromaticQuestion(random: Random): ItemBody {
  const direction = random.pick<Direction>(['ascending', 'descending'])
  const name = random.pick(['C', 'D', 'E', 'F', 'G', 'A', 'B', 'F♯', 'B♭'])
  const clef = random.pick(clefs[4])
  return gapQuestion({
    grade: 4,
    clef,
    count: 0,
    name,
    form: 'major',
    direction,
    pitches: buildChromaticScale(inRegister(name, clef, direction), direction),
  }, random, true)
}

type Task = (random: Random) => ItemBody
const scaleTask = (grade: KeyGrade, form: ScaleForm, counts?: number[]): Task =>
  random => gapQuestion(scaleContext(grade, form, random, counts), random)
const bothForms = (grade: KeyGrade): Task =>
  random => gapQuestion(scaleContext(grade, random.pick(forms), random), random)

const tasks: Record<KeyObjectiveId, Task> = {
  'KEY-1-SIGNATURE': random => signatureQuestion(1, random),
  'KEY-1-MAJOR': scaleTask(1, 'major'),
  'KEY-1-DEGREE': random => degreeQuestion(1, random),
  'KEY-2-RELATIVE': relativeQuestion,
  'KEY-2-SIGNATURE': random => signatureQuestion(2, random),
  'KEY-2-MAJOR': scaleTask(2, 'major', gradeTwoNewMajorSignatures),
  'KEY-2-HARMONIC': scaleTask(2, 'harmonic minor'),
  'KEY-2-DEGREE': random => degreeQuestion(2, random),
  'KEY-3-SIGNATURE': random => signatureQuestion(3, random),
  'KEY-3-MAJOR': scaleTask(3, 'major'),
  'KEY-3-HARMONIC': scaleTask(3, 'harmonic minor'),
  'KEY-3-MELODIC': scaleTask(3, 'melodic minor'),
  'KEY-3-DEGREE': random => degreeQuestion(3, random),
  'KEY-4-SIGNATURE': random => signatureQuestion(4, random),
  'KEY-4-SCALES': bothForms(4),
  'KEY-4-DEGREE': random => degreeQuestion(4, random),
  'KEY-4-CHROMATIC': chromaticQuestion,
  'KEY-5-SIGNATURE': random => signatureQuestion(5, random),
  'KEY-5-SCALES': bothForms(5),
}

export function isKeyObjective(id: string): id is KeyObjectiveId {
  return Object.hasOwn(tasks, id)
}

export function generateKeyQuestion(objectiveId: string, seed: QuestionSeed): Question {
  if (!isKeyObjective(objectiveId)) throw new RangeError(`Unknown keys and scales objective: ${objectiveId}`)
  const difficulty = Number(objectiveId[4])
  const item = tasks[objectiveId](createRandom(`${objectiveId}:${typeof seed}:${seed}`))
  return { id: `${objectiveId}:v1:${typeof seed}:${seed}`, objectiveId, seed, difficulty, ...item }
}
