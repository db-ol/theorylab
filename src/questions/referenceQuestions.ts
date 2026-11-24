import { instruments, ornaments, percussion, supplementalFacts, voices } from '../curriculum/musicReference'
import { performanceTerms, type PerformanceTerm } from '../curriculum/performanceTerms'
import { referenceIds } from '../curriculum/referenceLessons'
import { formatPitchName, pitchAtStaffPosition } from '../theory'
import { makeOptions, type Question } from './question'
import { createRandom, type QuestionSeed, type Random } from './random'

type Body = Omit<Question, 'id' | 'objectiveId' | 'seed' | 'difficulty'>
type Fact = Pick<PerformanceTerm, 'english' | 'definition' | 'chinese' | 'aliases'>

function question(
  random: Random, stem: string, options: readonly [text: string, explanationZh: string][], correct: string,
  explanationZh: string, terms: string[], variant: string, notation?: Question['notation'],
): Body {
  return {
    stem, ...makeOptions(random, options.map(([text, explanationZh]) => ({ text, explanationZh })), correct),
    explanationZh, terms, variant, notation, contentKey: JSON.stringify([variant, stem, correct, notation]),
  }
}

function factQuestion(objectiveId: string, random: Random): Body {
  const rows = (supplementalFacts[objectiveId] ?? []).map(([english, definition, chinese]) => ({ english, definition, chinese }))
  const terms = performanceTerms.filter(item => item.objectiveId === objectiveId)
  const facts = [...terms, ...rows]
  const item: Fact = random.pick(facts)
  const supplemental = [...performanceTerms, ...facts]
  const lookup = new Map(supplemental.filter(fact => fact.definition !== item.definition && fact.english !== item.english).map(fact => [fact.definition, fact]))
  const sameObjective = new Map(facts.filter(fact => fact.definition !== item.definition).map(fact => [fact.definition, fact]))
  const distractors = random.shuffle([...sameObjective.values()])
  for (const fact of random.shuffle([...lookup.values()])) {
    if (distractors.length >= 3) break
    if (!distractors.some(candidate => candidate.definition === fact.definition)) distractors.push(fact)
  }
  const detail = `${item.english} 的英文释义是 ${item.definition}。${item.chinese}。`.replaceAll('。。', '。')
  const reverse = random.integer(0, 1) === 1
  const aliases = item.aliases?.filter(alias => performanceTerms.filter(term => term.aliases?.includes(alias)).length === 1)
  const printed = reverse || !aliases?.length || random.integer(0, 1) === 0 ? item.english : random.pick(aliases)
  const labels: [string, string][] = [item, ...distractors.slice(0, 3)].map(fact => [
    reverse ? fact.english : fact.definition, `${fact.english} 对应 ${fact.definition}。${fact.chinese}。`.replaceAll('。。', '。'),
  ])
  return question(random,
    reverse ? `Which marking means “${item.definition}”?` : `What does ${printed} indicate?`, labels,
    reverse ? item.english : item.definition, detail, [item.english], reverse ? 'meaning to marking' : 'marking to meaning',
  )
}

function endingsQuestion(random: Random): Body {
  if (random.integer(0, 1) === 0) {
    const count = random.integer(2, 16)
    return question(random, `A multiple-bar rest has the number ${count} above it. How long does the silence last?`,
      [[`${count} bars`, '数字记录连续休止的小节数量。'], [`${count} beats`, '多小节休止符上的数字以小节为单位。'],
        [`${count + 1} bars`, '粗横线代表完整的一组休止小节，数字已经包括这一组的全部小节。'],
        [`${count - 1} bars`, '数字直接给出小节数量。']], `${count} bars`,
      `多小节休止符上标 ${count}，表示连续静止 ${count} 小节。拍号另行决定每小节的拍数。`, ['multiple-bar rest'], 'count silent bars')
  }
  const start = random.integer(1, 7)
  const shared = [start, start + 1]
  const endingOne = start + 2
  const endingTwo = start + 3
  const path = [...shared, endingOne, ...shared, endingTwo].join(', ')
  return question(random, `Bars ${start} and ${start + 1} are repeated. Bar ${endingOne} is the first ending and bar ${endingTwo} is the second ending. Which is the correct playing order?`,
    [[path, '第一遍走第一个结尾，反复后进入第二个结尾。'], [[...shared, endingOne, endingTwo].join(', '), '演奏第一个结尾后先折回反复起点。'],
      [[...shared, endingOne, ...shared, endingOne].join(', '), '第二遍要跳过第一个结尾。'],
      [[...shared, endingTwo, ...shared, endingOne].join(', '), '两个结尾的编号决定先后顺序。']], path,
    `演奏两次公共部分。第一次接第 ${endingOne} 小节，第二次接第 ${endingTwo} 小节。`, ['first ending', 'second ending', 'volta bracket'], 'play repeat endings')
}

function ornamentQuestion(objectiveId: string, random: Random): Body {
  const recognise = objectiveId === 'ORN-4-SYMBOLS'
  const item = random.pick(ornaments)
  const options = [item, ...random.shuffle(ornaments.filter(ornament => ornament.name !== item.name)).slice(0, 3)]
  const reasons: [string, string][] = options.map(ornament => [ornament.name, ornament.description])
  if (recognise) {
    if (random.integer(0, 1) === 1) return question(random, `Which description matches the sign for a ${item.name}?`,
      options.map(ornament => [ornament.sign, ornament.description]), item.sign,
      `${item.name} 的符号可以用 ${item.sign} 来辨认。${item.description}`, [item.name, 'ornament sign'], 'recognise sign description')
    return question(random, `Which ornament is shown by ${item.sign}?`, reasons, item.name,
      `题中描述的写法对应 ${item.name}。${item.description}`, [item.name, 'ornament sign'], 'recognise ornament sign')
  }
  const position = random.integer(1, 7)
  const main = pitchAtStaffPosition(position, 'treble')
  if (!('offsets' in item)) {
    const principal = formatPitchName(main)
    const auxiliary = formatPitchName(pitchAtStaffPosition(position + 1, 'treble'))
    const appoggiatura = item.name === 'appoggiatura'
    const stem = appoggiatura
      ? `An ornament on ${principal} gives its upper neighbour ${auxiliary} the first quaver of a crotchet beat, then resolves to ${principal} for the second quaver. Which single grace note marking would commonly indicate this?`
      : `At ${principal}, a very brief ${auxiliary} is heard just before the principal note, as a crushed grace note. Which single grace note marking would commonly indicate this?`
    const detail = appoggiatura
      ? '邻音在拍上占去主音时值的一部分，再级进解决到主音。这是长倚音的典型写法。'
      : '邻音非常短，立即让位给主音。常用带斜线的短倚音来简写。'
    return question(random, stem, reasons, item.name, detail, [item.name, 'grace note', 'principal note'], 'recognise written grace note')
  }
  const pitches = item.offsets.map(offset => pitchAtStaffPosition(position + offset, 'treble'))
  if (random.integer(0, 1) === 1) {
    const label = `${item.name} on ${formatPitchName(main)}`
    const wrongMainNote = formatPitchName(pitchAtStaffPosition(position + random.pick([-1, 1]), 'treble'))
    return question(random, 'Which analysis names both the ornament and its principal note?', [
      [label, item.description],
      [`${item.name} on ${wrongMainNote}`, `装饰音名称正确。按这个记号的音序来读，主音应是 ${formatPitchName(main)}。`],
      ...options.filter(ornament => ornament.name !== item.name).slice(0, 2).map((ornament): [string, string] =>
        [`${ornament.name} on ${formatPitchName(main)}`, ornament.description]),
    ], label, `主音是 ${formatPitchName(main)}。${item.description}`, [item.name, 'principal note'], 'identify ornament and principal note', { clef: 'treble', pitches })
  }
  return question(random, `The notes shown are played rapidly as an ornament on ${formatPitchName(main)}. Which ornament sign could replace them?`, reasons,
    item.name, `以 ${formatPitchName(main)} 为主音，读出 ${pitches.map(formatPitchName).join('、')} 的先后顺序。${item.description}`,
    [item.name, 'upper neighbour', 'lower neighbour'], 'recognise written ornament', { clef: 'treble', pitches })
}

function instrumentQuestion(objectiveId: string, random: Random): Body {
  if (objectiveId === 'INS-4-PERCUSSION' || objectiveId === 'INS-5-PERCUSSION') {
    const pool = objectiveId === 'INS-4-PERCUSSION' ? percussion.slice(0, 4) : percussion.slice(4)
    const [instrument, definite] = random.pick(pool)
    const classification = definite ? 'Definite pitch' : 'Indefinite pitch'
    const reason = (pitched: boolean) => pitched ? '它可以产生可辨认的音名。' : '它通常用于节奏和音色。'
    const scenario = random.integer(0, 2)
    if (scenario === 1) {
      const other = random.shuffle(pool.filter(row => row[1] !== definite)).slice(0, 3)
      return question(random, `Which of these instruments has ${classification.toLowerCase()}?`,
        [[instrument, reason(definite)], ...other.map(([name, pitched]): [string, string] => [name, reason(pitched)])],
        instrument, `${instrument} 属于 ${classification}。${reason(definite)}`, [instrument, classification], 'choose percussion instrument')
    }
    const explanation = `${instrument} 在本题的标准配器分类是 ${classification}。${reason(definite)}`
    return question(random, scenario === 0 ? `How is the pitch of ${instrument} usually classified?`
      : `Think of a standard orchestral ${instrument}. Can it reliably play a named note?`, [
      [scenario === 0 ? 'Definite pitch' : 'Yes', reason(true)],
      [scenario === 0 ? 'Indefinite pitch' : 'No', reason(false)],
    ], scenario === 0 ? classification : definite ? 'Yes' : 'No', explanation,
    [instrument, 'definite pitch', 'indefinite pitch'], 'classify percussion pitch')
  }
  if (objectiveId === 'INS-5-VOICE') {
    const [name, description, explanation] = random.pick(voices)
    const reverse = random.integer(0, 1) === 1
    const rows = [voices.find(row => row[0] === name)!, ...random.shuffle(voices.filter(row => row[0] !== name)).slice(0, 3)]
    return question(random, reverse ? `Which description fits ${name} in typical vocal writing?` : `Which voice is ${description}?`,
      rows.map(([term, register, reason]) => [reverse ? register : term, reason]), reverse ? description : name,
      explanation, [name, 'voice type'], reverse ? 'describe voice register' : 'identify voice register')
  }
  const core = instruments.slice(0, 16)
  const additional = instruments.slice(16)
  const attribute = objectiveId === 'INS-4-CLEF' ? 2 : objectiveId === 'INS-5-SOUND' ? 3 : objectiveId === 'INS-5-TRANSPOSING' ? 4
    : objectiveId === 'INS-5-ADDITIONAL' ? random.pick([1, 2, 3, 4] as const) : 1
  const questionPool = objectiveId === 'INS-5-ADDITIONAL' ? additional : attribute === 1 || attribute === 2 ? core : instruments
  const valid = (row: typeof instruments[number]) => row[attribute] !== '' && (attribute !== 2 || row[2] !== 'unpitched percussion')
  const selected = random.pick(questionPool.filter(valid))
  const name = selected[0]
  const answer = selected[attribute]
  const candidates = new Map(instruments.filter(row => valid(row) && row[attribute] !== answer).map(row => [row[attribute], row[0]]))
  const explanation = attribute === 1 ? `${name} 属于 ${answer} 家族。按常规乐队分组判断。`
    : attribute === 2 ? `在通常的管弦乐音区里，${name} 主要用 ${answer} clef 记谱。`
    : attribute === 3 ? `${name} 的基本发声方式是 ${answer}。按振动来源区分。`
    : `按照题中乐器在通常管弦乐记谱中的约定，${name} 的声音是 ${answer}。`
  const label = (value: string) => attribute === 2 ? `${value} clef` : value
  const distractors = random.shuffle([...candidates.entries()].filter(([item]) => attribute !== 2 || item !== 'treble and bass')).slice(0, 3)
  const stems = ['', `Which family does the ${name} belong to?`, `Which clef does the ${name} normally use in its usual orchestral register?`,
    `How does the ${name} chiefly produce sound?`, `How does the ${name} sound in relation to its written pitch in a standard orchestral part?`]
  if (random.integer(0, 1) === 1) {
    const reverse = ['', `Which of these instruments belongs to the ${answer} group?`,
      answer === 'treble and bass' ? 'Which of these instruments normally reads a grand stave?'
        : `Which of these instruments normally uses the ${answer} clef in its usual orchestral register?`,
      `Which of these instruments chiefly uses this sound production mechanism? ${answer}.`,
      `For which of these instruments does the sound come out ${answer}?`]
    const alternatives = random.shuffle(instruments.filter(row => valid(row) && row[attribute] !== answer)).slice(0, 3)
    return question(random, reverse[attribute], [
      [name, explanation], ...alternatives.map(row => [row[0], `${row[0]} 对应的是 ${row[attribute]}。`]) as [string, string][],
    ], name, explanation, [name, label(answer)], 'identify instrument')
  }
  return question(random, stems[attribute], [
    [label(answer), explanation], ...distractors.map(([text, example]): [string, string] => [label(text), `这个属性可见于 ${example}。${explanation}`]),
  ], label(answer), explanation, [name, label(answer)], 'identify instrument property')
}

export function generateReferenceQuestion(objectiveId: string, seed: QuestionSeed): Question {
  if (!referenceIds.includes(objectiveId)) throw new RangeError(`Unknown reference objective ${objectiveId}`)
  const random = createRandom(seed)
  const body = objectiveId === 'TER-2-ENDINGS' ? endingsQuestion(random)
    : objectiveId.startsWith('ORN-') ? ornamentQuestion(objectiveId, random)
      : objectiveId.startsWith('INS-') ? instrumentQuestion(objectiveId, random)
        : factQuestion(objectiveId, random)
  return {
    ...body, id: `reference-v1:${objectiveId}:${typeof seed}:${seed}`, objectiveId, seed,
    difficulty: Number(objectiveId.split('-')[1]),
  }
}
