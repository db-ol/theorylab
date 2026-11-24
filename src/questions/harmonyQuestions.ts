import { objectives } from '../curriculum/objectives'
import { buildInterval, buildScaleTriad, formatPitchName, getKeySignature, invertTriad, parsePitch, triadQuality, type Inversion, type Pitch } from '../theory'
import { makeOptions, type Question, type QuestionOption } from './question'
import { createRandom, type QuestionSeed } from './random'

const inversions = ['Root position (a)', 'First inversion (b)', 'Second inversion (c)'] as const
const cadences = {
  'HAR-5-PERFECT': { label: 'perfect', pairs: [[5, 1]] },
  'HAR-5-PLAGAL': { label: 'plagal', pairs: [[4, 1]] },
  'HAR-5-IMPERFECT': { label: 'imperfect', pairs: [[1, 5], [2, 5], [4, 5]] },
} as const
const chordName: Record<number, string> = { 1: 'tonic', 2: 'supertonic', 4: 'subdominant', 5: 'dominant' }
const distinctDegrees = [1, 2, 4, 5]
const join = (pitches: readonly Pitch[]) => pitches.map(formatPitchName).join(', ')

export function generateHarmonyQuestion(id: string, seed: QuestionSeed): Question {
  const objective = objectives.find((item) => item.id === id)
  if (!objective || objective.domain !== 'Triads and chords') throw new Error(`Unknown harmony objective ${id}`)
  const random = createRandom(`harmony-v1:${id}:${seed}`)
  const grade = objective.grade
  const signed = grade === 1 ? [-1, 0, 1, 2] : grade === 2 ? [-3, -2, -1, 0, 1, 2, 3] : Array.from({ length: grade * 2 + 3 }, (_, i) => i - grade - 1)
  const grade2Minor = ['A', 'E', 'D']
  const minor = grade !== 1 && random.integer(0, 1) === 1
  const signature = getKeySignature(random.pick(signed))
  const tonic = id in cadences || id === 'HAR-5-CHOICE' ? parsePitch(random.pick(['C4', 'G4', 'D4', 'F4']))
    : grade === 2 && minor ? parsePitch(`${random.pick(grade2Minor)}4`)
    : parsePitch(`${minor ? signature.minor : signature.major}4`)
  const form = minor && !(id in cadences || id === 'HAR-5-CHOICE') ? 'harmonic minor' : 'major'
  const key = `${formatPitchName(tonic)} ${form === 'major' ? 'major' : 'minor'}`
  const tones = (degree: number) => buildScaleTriad(tonic, form, degree)
  const degree = id === 'HAR-5-SUPERTONIC' ? 2 : id.endsWith('TONIC') ? 1
    : random.pick(id === 'HAR-5-INVERSION' ? distinctDegrees : [1, 4, 5])
  let stem: string
  let answer: string
  let why: string
  let variant: string
  let wrong: string[]
  if (id === 'HAR-5-INVERSION') {
    const inversion = random.pick([0, 1, 2] as const)
    const voicing = join(invertTriad(tones(degree), inversion))
    if (random.integer(0, 1) === 1) {
      stem = `In ${key}, the ${chordName[degree]} chord is written from low to high as ${voicing}. Which position is it in?`
      answer = inversions[inversion]
      wrong = [...inversions]
      variant = 'identify-inversion'
    } else {
      stem = `Which group of notes, in ascending order, shows the ${chordName[degree]} chord of ${key} in ${inversions[inversion].toLowerCase()}?`
      answer = voicing
      wrong = inversions.map((_, i) => join(invertTriad(tones(degree), i as Inversion)))
      variant = 'construct-inversion'
    }
    why = `将和弦还原为根音、三音、五音，得到 ${join(tones(degree)).replaceAll(', ', '、')}。这里最低音是第 ${[1, 3, 5][inversion]} 个和弦级数，所以是 ${inversions[inversion]}。`
  } else if (id in cadences || id === 'HAR-5-CHOICE') {
    const cadenceId = id === 'HAR-5-CHOICE' ? random.pick(Object.keys(cadences)) as keyof typeof cadences : id as keyof typeof cadences
    const { label, pairs } = cadences[cadenceId]
    const pair = random.pick(pairs as readonly (readonly [number, number])[])
    const [first, second] = pair
    const name = (d: number) => `${formatPitchName(tones(d)[0])} ${triadQuality(tones(d))}`
    const roots = ([a, b]: readonly [number, number]) => `${name(a)} to ${name(b)}`
    answer = roots(pair)
    const starting = random.pick(tones(first))
    const ending = random.pick(tones(second))
    const melody = id === 'HAR-5-CHOICE' ? ` with melody notes ${formatPitchName(starting)} then ${formatPitchName(ending)}` : ''
    stem = `Which progression forms a ${label} cadence in ${key}${melody}?`
    const distractors = ([[5, 1], [4, 1], [1, 5], [4, 5], [1, 4], [5, 4]] as const)
      .filter((candidate) => !(pairs as readonly (readonly [number, number])[]).some(([a, b]) => a === candidate[0] && b === candidate[1]))
    wrong = distractors.map(roots)
    variant = melody ? 'harmonise-melody' : 'cadence-pair'
    const namedPair = answer
    if (melody ? random.integer(0, 1) === 1 : random.integer(0, 2) === 1) {
      stem = `In ${key}, a ${label} cadence begins on ${name(first)}${melody ? ` under the melody note ${formatPitchName(starting)}` : ''}. Which chord completes it${melody ? ` under ${formatPitchName(ending)}` : ''}?`
      answer = name(second)
      wrong = distinctDegrees.filter((d) => d !== second).map(name)
      variant = 'complete-cadence'
    } else if (!melody && random.integer(0, 1) === 1) {
      stem = `Which type of cadence is formed by ${namedPair} in ${key}?`
      answer = `${label[0].toUpperCase()}${label.slice(1)} cadence`
      wrong = ['Perfect cadence', 'Plagal cadence', 'Imperfect cadence']
      variant = 'name-cadence'
    }
    why = `${label} cadence 在这个例子中使用第 ${first} 级和弦到第 ${second} 级和弦。正确的根音与调内音给出 ${namedPair}。${melody ? `旋律音 ${formatPitchName(starting)} 和 ${formatPitchName(ending)} 分别属于前后两个和弦。` : ''}`
  } else {
    const chord = tones(degree)
    answer = join(chord)
    wrong = [join([chord[0], buildInterval(chord[0], { number: 2, quality: 'major' }), chord[2]]),
      ...distinctDegrees.filter((d) => d !== degree).map((d) => join(tones(d)))]
    stem = `Which notes, in ascending order, form the root position ${chordName[degree]} triad in ${key}?`
    variant = 'spell-triad'
    const spelled = answer
    const member = random.integer(0, 2)
    if (member !== 0) {
      const remaining = chord.filter((_, index) => index !== member).map(formatPitchName)
      const chordMembers = ['root', 'third', 'fifth']
      stem = `The root position ${chordName[degree]} triad in ${key} contains ${remaining[0]} and ${remaining[1]}. What is its ${chordMembers[member]}?`
      answer = formatPitchName(chord[member])
      wrong = [...new Set(distinctDegrees.flatMap((d) => tones(d).map(formatPitchName)))].filter((note) => !remaining.includes(note))
      variant = member === 1 ? 'supply-third' : 'supply-fifth'
    }
    why = `在 ${key} 中，从 ${chordName[degree]} 级的 ${formatPitchName(chord[0])} 起，按音阶每隔一级取音。根音、三音和五音是 ${spelled.replaceAll(', ', '、')}。${form === 'harmonic minor' ? '本题按和声小调处理第七级。' : ''}`
  }
  const candidates = [answer, ...random.shuffle([...new Set(wrong)].filter((item) => item !== answer)).slice(0, 3)]
  const options: Omit<QuestionOption, 'id'>[] = candidates.map((text) => ({
    text, explanationZh: text === answer ? why : `${text} 的音名、低音或终止方向与题目指定的条件不一致。${why}`,
  }))
  return {
    id: `harmony-v1:${id}:${JSON.stringify(seed)}`, objectiveId: id, seed, difficulty: grade, contentKey: stem,
    variant, stem, terms: objective.terms, explanationZh: why, ...makeOptions(random, options, answer),
  }
}
