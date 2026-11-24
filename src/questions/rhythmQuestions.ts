import { objectives } from '../curriculum/objectives'
import { NOTE_VALUES, addDuration, dottedDuration, multiplyDuration, rational, tupletDuration, type Rational } from '../theory'
import type { ExamStimulus, Grade5Question, NoteValue } from '../exam/grade5'
import { makeOptions } from './question'
import { createRandom, type QuestionSeed, type Random } from './random'

type Draft = { stem: string; answer: string | number; wrong: (string | number)[]; why: string; variant: string; stimulus?: ExamStimulus }

const basic = ['semibreve', 'minim', 'crotchet', 'quaver', 'semiquaver'] as const
const shortest = ['quaver', 'semiquaver', 'demisemiquaver'] as const
const plurality = (count: number, name: string) => `${count} ${name}${count === 1 ? '' : 's'}`
const ratio = (value: Rational, unit: NoteValue) => multiplyDuration(value, rational(NOTE_VALUES[unit].denominator, NOTE_VALUES[unit].numerator))
const show = (value: Rational) => value.denominator === 1 ? value.numerator : `${value.numerator}/${value.denominator}`
const rhythmic = (value: NoteValue, dots?: 1 | 2, rest?: boolean): ExamStimulus => ({ kind: 'rhythm', pulses: [{ value, dots, rest }] })

function countQuestion(random: Random, id: string): Draft {
  const variant = random.pick(['named', 'notation'] as const)
  const isRest = id === 'RHY-1-RESTS' || (id === 'RHY-4-BREVE' || id === 'RHY-4-DOUBLE-DOT' || id === 'RHY-3-SHORT' || id === 'RHY-3-DOT' || id === 'RHY-2-DOT') && random.integer(0, 1) === 1
  const value: NoteValue = id === 'RHY-4-BREVE' ? 'breve'
    : id === 'RHY-3-DOT' ? 'semiquaver'
    : id === 'RHY-3-SHORT' ? random.pick(['crotchet', 'quaver', 'semiquaver'] as const)
    : random.pick(id === 'RHY-2-DOT' ? isRest ? ['quaver', 'crotchet'] as const : ['semibreve', 'minim', 'crotchet', 'quaver'] as const : id === 'RHY-1-DOT' ? ['minim', 'crotchet', 'quaver'] as const : basic.slice(0, 4))
  const dots = id === 'RHY-4-DOUBLE-DOT' ? 2 : ['RHY-1-DOT', 'RHY-2-DOT', 'RHY-3-DOT'].includes(id) ? 1 : 0
  const next = [...basic, 'demisemiquaver'] as const
  const minimumSteps = dots === 2 ? 2 : 1
  const ordered = next.slice(next.indexOf(value as typeof next[number]) + minimumSteps, /^RHY-[12]-/.test(id) ? 5 : undefined)
  const unit = id === 'RHY-3-DOT' ? random.pick(['demisemiquaver', 'quaver', 'crotchet'] as const)
    : id === 'RHY-3-SHORT' ? 'demisemiquaver'
    : id === 'RHY-4-BREVE' ? random.pick(basic)
    : random.pick(ordered)
  const exact = ratio(dottedDuration(NOTE_VALUES[value], dots), unit)
  if (exact.denominator > 1) return {
    stem: `What fraction of a ${unit} has the duration of ${variant === 'notation' ? 'the symbol shown' : `one dotted ${value}${isRest ? ' rest' : ''}`}?`,
    answer: show(exact), wrong: ['1/2', '1/4', '3/4', '3/16', '3/8'], variant: `fraction-${variant}`,
    why: `附点增加原时值的一半。用题目指定的 ${unit} 作单位换算，得到 ${show(exact)}。`,
    stimulus: variant === 'notation' ? rhythmic(value, 1, isRest) : undefined,
  }
  const numerator = exact.numerator
  const descriptor = `${dots === 2 ? 'double dotted ' : dots ? 'dotted ' : ''}${value}${isRest ? ' rest' : ''}`
  return {
    stem: `How many ${unit}s have the same total duration as ${variant === 'notation' ? 'the symbol shown' : `one ${descriptor}`}?`,
    answer: numerator, wrong: [], variant,
    why: `${descriptor} 的时值用 ${unit} 来量是 ${numerator} 个。${dots === 2 ? '双附点分别增加原时值的一半和四分之一。' : dots === 1 ? '附点增加原时值的一半。' : '以全音符为参照换算。'}`,
    stimulus: variant === 'notation' ? rhythmic(value, dots || undefined, isRest) : undefined,
  }
}

function tripletQuestion(random: Random, id: string): Draft {
  const [count, inTimeOf, unit] = id === 'RHY-4-DUPLET' ? [2, 3, random.pick(['quaver', 'crotchet', 'semiquaver'] as const)] as const
    : id === 'RHY-5-TUPLET' ? [random.pick([5, 6]), 4, random.pick(shortest)] as const
    : [3, 2, id === 'RHY-3-TRIPLET' ? 'demisemiquaver' : random.pick(['minim', 'quaver', 'crotchet', 'semiquaver'] as const)] as const
  const one = tupletDuration(NOTE_VALUES[unit], count, inTimeOf)
  const member = random.integer(0, 1) === 1
  const groups = random.integer(1, 5)
  const extra = id === 'RHY-3-TRIPLET' && !member ? random.integer(0, 4) : 0
  const ordinary = groups * inTimeOf + extra
  return {
    stem: `${count} ${unit}s are played in the time of ${inTimeOf} ordinary ${unit}s. What is the duration of ${member ? 'one member' : groups === 1 ? 'one complete group' : `${groups} complete groups`}${extra ? ` followed by ${plurality(extra, `ordinary ${unit}`)}` : ''}, measured in ordinary ${unit}s?`,
    answer: member ? show(ratio(one, unit)) : ordinary, wrong: member ? [show(rational(1, count)), count, inTimeOf] : [],
    variant: member ? 'member' : 'group',
    why: `整组等于 ${inTimeOf} 个普通 ${unit}。${member ? `把总时值平分成 ${count} 份，每份是 ${show(ratio(one, unit))} 个普通单位。` : `有 ${groups} 组${extra ? `，再加 ${extra} 个普通单位` : ''}，合计 ${ordinary} 个普通单位。`}`,
  }
}

function metreQuestion(random: Random, id: string): Draft {
  const compound = id.startsWith('MET-3') || id === 'RHY-4-REST-GROUP'
  const irregular = id.startsWith('MET-5')
  const extended = id.startsWith('MET-4')
  const simpleDenom = id.startsWith('MET-1') ? 4 : id.startsWith('MET-2') ? random.pick([2, 8]) : random.pick([2, 4, 8, 16])
  const compoundDenom = id.startsWith('MET-3') ? 8 : id === 'RHY-4-REST-GROUP' ? 4 : random.pick([4, 8, 16])
  const split = compound || extended && random.integer(0, 1) === 1 ? 3 : 2
  const top = id === 'RHY-4-REST-GROUP' ? random.pick([6, 9]) : irregular ? random.pick([5, 7]) : (simpleDenom === 8 && id.startsWith('MET-2') ? 3 : random.pick([2, 3, 4])) * (split === 3 ? 3 : 1)
  const bottom = irregular ? random.pick([4, 8]) : split === 3 ? compoundDenom : simpleDenom
  const signature = `${top}/${bottom}`
  const base = ({ 2: 'minim', 4: 'crotchet', 8: 'quaver', 16: 'semiquaver' } as const)[bottom as 2 | 4 | 8 | 16]
  if (id.endsWith('GROUP') && irregular) {
    const group = random.pick(top === 7 ? ['2 + 2 + 3', '2 + 3 + 2', '3 + 2 + 2'] : ['2 + 3', '3 + 2'])
    const starts = group.split(' + ').map(Number).slice(0, -1).reduce((values, count) => [...values, values[values.length - 1] + count], [1])
    if (random.integer(0, 1) === 1) {
      const chosen = random.integer(2, starts.length)
      return { stem: `A bar of ${signature} is grouped ${group}. Which numbered ${base} starts beat ${chosen}?`,
        answer: starts[chosen - 1], wrong: [], variant: 'choose-beat-start',
        why: `从第一单位开始，跨过前 ${chosen - 1} 个小组，落到第 ${starts[chosen - 1]} 个 ${base}。` }
    }
    return { stem: `A bar of ${signature} is grouped ${group}. On which ${base}s do the main beats start?`, answer: starts.join(', '),
      wrong: ['1, 2', '1, 6', '1, 2, 3'], variant: 'accent-positions', why: `从第一个 ${base} 起，每走完一组就到下一个拍点，所以落在第 ${starts.join('、')} 个单位。` }
  }
  if (id.endsWith('GROUP') || id === 'RHY-4-REST-GROUP') {
    const value = split === 3 ? (bottom === 4 ? 'minim' : bottom === 8 ? 'crotchet' : 'quaver') : base
    const description = `${split === 3 ? 'Dotted ' : ''}${value}`
    const showRest = id === 'RHY-4-REST-GROUP' || id === 'MET-2-GROUP' && random.integer(0, 1) === 1
    if (showRest) {
      const position = random.integer(1, split === 3 ? top / 3 : top)
      if (random.integer(0, 1) === 1) {
        const units = random.pick(bottom === 4 ? ['quaver','crotchet','semiquaver'] as const : ['quaver','semiquaver','crotchet'] as const)
        return { stem: `Beat ${position} of a ${signature} bar is silent. What is the duration of that silence, measured in ${units}s?`,
          answer: show(ratio(dottedDuration(NOTE_VALUES[value], split === 3 ? 1 : 0), units)),
          wrong: ['1/2', '1/4', '1/8', 1, 2, 3, 4, 6, 8, 12], variant: 'convert-rest',
          why: `休止占满 ${signature} 的一拍，先用 ${description} 得到总时值，再换算为 ${units}。` }
      }
      return { stem: `Which rest fills exactly beat ${position} of a ${signature} bar?`, answer: `${description} rest`,
        wrong: ['Semibreve rest', 'Crotchet rest', 'Dotted quaver rest', 'Minim rest', 'Quaver rest'], variant: 'select-rest',
        why: `以一个主拍为界，${signature} 的主拍时值由 ${description} 表示。完整一拍的无声部分可用对应的休止符。` }
    }
    const level = random.pick(split === 3 ? [1, 2] : bottom === 16 || id === 'MET-2-GROUP' && bottom === 8 ? [2] : [2, 4])
    const unit = [...basic, 'demisemiquaver'][[...basic].indexOf(base as typeof basic[number]) + Math.log2(level)] as NoteValue
    const drawingUnit: NoteValue = unit ?? (split === 3 ? base : 'demisemiquaver')
    const perBeat = ratio(dottedDuration(NOTE_VALUES[value], split === 3 ? 1 : 0), drawingUnit).numerator
    const beats = split === 3 ? top / 3 : top
    const count = beats * perBeat
    if (random.integer(0, 1) === 1) {
      const chosen = random.integer(2, beats)
      return { stem: `A bar of ${signature} is written as ${count} equal ${drawingUnit}s. On which numbered ${drawingUnit} does beat ${chosen} begin?`,
        answer: (chosen - 1) * perBeat + 1, wrong: [], variant: 'group-start',
        why: `每拍有 ${perBeat} 个 ${drawingUnit}。第 ${chosen} 拍起点前已经经过 ${chosen - 1} 个完整拍。` }
    }
    const groups = (size: number, total: number) => Array.from({ length: Math.ceil(total / size) }, (_, i) => Math.min(size, total - i * size)).join(' + ')
    return { stem: `There are ${count} ${drawingUnit}s in a bar of ${signature}. Which grouping shows each main beat separately?`,
      answer: groups(perBeat, count), wrong: [groups(perBeat + 1, count), groups(1, count), String(count)], variant: 'group-pattern',
      why: `${signature} 每拍由 ${perBeat} 个 ${drawingUnit} 组成。分组应先显示每个主拍，再检查整小节的总长度。` }
  }
  if (id === 'MET-3-UPBEAT' || id === 'MET-1-BAR') {
    const units = id === 'MET-1-BAR' && random.integer(0, 1) === 1 ? 'quaver' : base
    const barLength = ratio(rational(top, bottom), units).numerator
    const used = random.integer(1, barLength - 1)
    if (random.integer(0, 1) === 1) {
      const stimulus: ExamStimulus = { kind: 'rhythm', pulses: Array.from({ length: used }, () => ({ value: units })), timeSignature: signature }
      return { stem: id === 'MET-3-UPBEAT' ? `The upbeat is shown. How many ${units}s balance it in the final bar?` : `How many additional ${units}s complete the first bar?`,
        answer: barLength - used, wrong: [], variant: 'read-notation', stimulus,
        why: `完整小节有 ${barLength} 个 ${units}。图中有 ${used} 个，还差 ${barLength - used} 个。` }
    }
    return { stem: id === 'MET-3-UPBEAT'
      ? `An upbeat in ${signature} lasts ${plurality(used, units)}. How many ${units}s are needed in the final bar to balance it?`
      : `The first ${plurality(used, units)} of a ${signature} bar have been written. How many further ${units}s complete the bar?`,
      answer: barLength - used, wrong: [], variant: id === 'MET-3-UPBEAT' ? 'balance-upbeat' : 'complete-bar',
      why: `完整小节的长度是 ${barLength} 个 ${units}，减去已经写出的 ${used} 个，剩下 ${barLength - used} 个。` }
  }
  if (irregular) {
    const bars = random.integer(1, 5)
    return { stem: `How many ${base}s have the duration of ${plurality(bars, 'complete bar')} of ${signature}?`, answer: top * bars, wrong: [],
      why: `${signature} 的分母指定 ${base} 单位，分子说明一小节共有 ${top} 个单位。${bars} 小节共有 ${top * bars} 个。`, variant: bars === 1 ? 'bar-length' : 'span-length' }
  }
  const lengthQuestion = random.integer(0, 1) === 1
  if (lengthQuestion) {
    const bars = random.integer(1, 4)
    const unit: NoteValue = id === 'MET-1-SIMPLE' ? 'quaver' : base
    const result = ratio(rational(top * bars, bottom), unit).numerator
    return { stem: `How many ${unit}s have the same duration as ${plurality(bars, 'complete bar')} of ${signature}?`,
      answer: result, wrong: [], variant: 'count-subdivision',
      why: `先根据拍号算出一小节的时值，再乘以 ${bars}。换算为 ${unit} 后得到 ${result} 个。` }
  }
  if (id === 'MET-4-METRE' || id === 'MET-3-COMPOUND') {
    const names = ['duple', 'triple', 'quadruple']
    const labels = ['Simple', 'Compound'].flatMap((family) => names.map((name) => `${family} ${name}`))
    const count = split === 3 ? top / 3 : top
    return { stem: `How is ${signature} classified?`, answer: `${split === 3 ? 'Compound' : 'Simple'} ${names[count - 2]}`, wrong: labels, variant: 'classification',
      why: `${signature} 每小节有 ${count} 个主拍，每拍分 ${split} 份。先看拍数，再看拍内的等分数。` }
  }

  return { stem: `Which note value represents one beat in ${signature}?`, answer: base, wrong: [...basic], variant: 'beat-unit',
    why: `${signature} 是单拍子，每拍用一个 ${base} 表示。分母 ${bottom} 给出了这个时值。` }
}

export function generateRhythmQuestion(id: string, seed: QuestionSeed): Grade5Question {
  const objective = objectives.find((item) => item.id === id)
  if (!objective || !/^(RHY|MET)-/.test(id)) throw new Error(`Unknown rhythm objective ${id}`)
  const random = createRandom(`rhythm-v1:${id}:${seed}`)
  let draft: Draft
  if (id === 'RHY-1-TIE') {
    const [value, second] = [random.pick(basic.slice(1)), random.pick(basic.slice(1))]
    const count = ratio(addDuration(NOTE_VALUES[value], NOTE_VALUES[second]), 'semiquaver').numerator
    const drawn = random.integer(0, 1) === 1
    draft = { stem: drawn ? 'The equal pitches shown are tied. How many semiquavers equal the combined duration?'
      : `A ${value} is tied to a ${second} of the same pitch. How many semiquavers equal the combined duration?`,
      answer: count, wrong: [], variant: drawn ? 'recognise-tie' : 'sum-durations',
      stimulus: drawn ? { kind: 'rhythm', pulses: [{ value, tieAfter: true }, { value: second }] } : undefined,
      why: `延音线把两个时值相加。一个 ${value} 加一个 ${second}，合计 ${count} 个 semiquaver 的时值。` }
  } else if (id === 'RHY-1-RESTS' && random.integer(0, 1) === 1) {
    const beats = random.pick([2, 3, 4])
    const unit = random.pick(['crotchet', 'quaver', 'semiquaver'] as const)
    const count = ratio(rational(beats, 4), unit).numerator
    draft = { stem: `How many ${unit}s have the same duration as a whole-bar rest in ${beats}/4?`,
      answer: count, wrong: [], variant: 'whole-bar-rest',
      why: `整小节休止的长度由拍号决定。${beats}/4 一小节有 ${beats} 个 crotchet，等于 ${count} 个 ${unit}。` }
  } else if (id.includes('TRIPLET') || id.includes('DUPLET') || id.includes('TUPLET')) draft = tripletQuestion(random, id)
  else if (id.startsWith('MET-') || id === 'RHY-4-REST-GROUP') draft = metreQuestion(random, id)
  else draft = countQuestion(random, id)
  const { answer, wrong, why, variant, stem, stimulus } = draft
  const base = { id: `rhythm-v1:${id}:${JSON.stringify(seed)}`, objectiveId: id, seed, difficulty: objective.grade,
    contentKey: JSON.stringify([stem, stimulus]), variant, stem, stimulus, terms: objective.terms, explanationZh: why }
  if (typeof answer === 'number') return { ...base, options: [], answerKind: 'numeric', correctAnswer: { optionId: String(answer), number: answer } }
  const candidates = [answer, ...random.shuffle([...new Set(wrong.map(String))].filter((option) => option !== answer)).slice(0, 3)]
  const options = candidates.map((text) => ({ text, explanationZh: text === answer ? why : `${text} 与题目所给的时值关系或拍组不符。${why}` }))
  return { ...base, ...makeOptions(random, options, answer) }
}
