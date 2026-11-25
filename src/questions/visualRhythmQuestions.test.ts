import { describe, expect, test } from 'vitest'
import { type Question, validateAnswer } from './question'
import { generateRhythmQuestion } from './rhythmQuestions'
import type { ExamStimulus, NoteValue, RhythmPulse, RhythmStimulus } from './stimulus'

const ids = ['RHY-5-TUPLET', 'MET-5-GROUP', 'MET-5-IRREGULAR']
const ticks: Record<NoteValue, number> = {
  breve: 3840, semibreve: 1920, minim: 960, crotchet: 480, quaver: 240, semiquaver: 120, demisemiquaver: 60,
}

function writtenTicks(pulse: RhythmPulse) {
  return ticks[pulse.value] * (pulse.dots === 2 ? 7 / 4 : pulse.dots === 1 ? 3 / 2 : 1)
}

function rhythm(stimulus: ExamStimulus | undefined): RhythmStimulus {
  if (stimulus?.kind !== 'rhythm') throw new Error('Expected readable rhythm notation')
  return stimulus
}

function scoreLength(score: RhythmStimulus) {
  return score.pulses.reduce((sum, pulse, index) => {
    const tuplet = score.tuplets?.find(({ start, count }) => start <= index && index < start + count)
    return sum + writtenTicks(pulse) * (tuplet ? tuplet.inTimeOf / tuplet.count : 1)
  }, 0)
}

function barLength(signature: string) {
  const [count, denominator] = signature.split('/').map(Number)
  return 1920 * count / denominator
}

function groupLengths(score: RhythmStimulus): number[] {
  expect(Boolean(score.beamGroups) || Boolean(score.groupStarts)).toBe(true)
  if (score.beamGroups) return [...score.beamGroups]
  const accents = score.groupStarts!
  expect(accents[0]).toBe(0)
  return accents.map((start, index) => (accents[index + 1] ?? score.pulses.length) - start)
}

function compareChoices(question: Question, testOption: (option: Question['options'][number]) => boolean) {
  const matches = question.options.filter(testOption)
  expect(matches).toHaveLength(1)
  for (const option of question.options) {
    expect(validateAnswer(question, option.id)).toBe(option === matches[0])
  }
}

function durationUnit(question: Question) {
  return Object.keys(ticks).find((unit) => question.stem.includes(` ${unit}s `)) as NoteValue
}

function checkItem(question: Question) {
  const scores = question.options.flatMap((option) => option.stimulus ? [rhythm(option.stimulus)] : [])
  if (scores.length) {
    expect(scores).toHaveLength(question.options.length)
    expect(new Set(scores.map((score) => JSON.stringify(score))).size).toBe(scores.length)
    expect(question.options.every((option) => option.explanationZh.includes('。'))).toBe(true)
  }
  if (question.variant.startsWith('tuplet-')) {
    const shown = rhythm(question.stimulus)
    expect(shown.tuplets).toHaveLength(1)
    const mark = shown.tuplets![0]
    expect([5, 6]).toContain(mark.count)
    expect(mark.inTimeOf).toBe(4)
    const member = shown.pulses[mark.start]
    expect(shown.pulses.slice(mark.start, mark.start + mark.count)).toEqual(
      Array.from({ length: mark.count }, () => member),
    )
    if (question.variant === 'tuplet-match-notation') {
      compareChoices(question, (option) => scoreLength(rhythm(option.stimulus)) === mark.inTimeOf * writtenTicks(member))
    } else if (question.variant === 'tuplet-member-fraction') {
      compareChoices(question, ({ text }) => {
        const [numerator, denominator = 1] = text.split('/').map(Number)
        return numerator * mark.count === denominator * mark.inTimeOf
      })
    } else {
      expect(shown.pulses).toHaveLength(mark.count + 1)
      expect(shown.beamGroups?.reduce((sum, n) => sum + n, 0)).toBe(shown.pulses.length)
      expect(validateAnswer(question, scoreLength(shown) / ticks[durationUnit(question)])).toBe(true)
    }
    return
  }
  if (question.variant === 'identify-an-irregular-signature') {
    const shown = rhythm(question.stimulus)
    expect(shown.timeSignature).toBeUndefined()
    compareChoices(question, ({ text }) => barLength(text) === scoreLength(shown))
    return
  }
  if (question.variant === 'count-an-irregular-bar') {
    const shown = rhythm(question.stimulus)
    expect(scoreLength(shown)).toBe(barLength(shown.timeSignature!))
    expect(validateAnswer(question, scoreLength(shown) / ticks[durationUnit(question)])).toBe(true)
    return
  }
  if (question.variant.startsWith('read-')) {
    const shown = rhythm(question.stimulus)
    const beat = Number(question.stem.match(/begins beat (\d+)/)?.[1])
    const expected = groupLengths(shown).slice(0, beat - 1).reduce((sum, n) => sum + n, 1)
    expect(scoreLength(shown)).toBe(barLength(shown.timeSignature!))
    expect(validateAnswer(question, expected)).toBe(true)
    return
  }
  const required = question.stem.match(/[23](?: \+ [23])+/)?.[0].split(' + ').map(Number)
  if (!required) throw new Error('The stem must specify beat order when choosing notation.')
  if (question.variant === 'irregular-grouped-rest') {
    const silentBeat = Number(question.stem.match(/the (\d)(?:st|nd|rd) beat silent/)?.[1])
    compareChoices(question, (option) => {
      const shown = rhythm(option.stimulus)
      const base = shown.timeSignature?.endsWith('/4') ? ticks.crotchet : ticks.quaver
      return shown.pulses.length === required.length && shown.pulses.every((pulse, index) => (
        writtenTicks(pulse) === required[index] * base && Boolean(pulse.rest) === (index + 1 === silentBeat)
      ))
    })
    for (const score of scores) expect(score.pulses.some((pulse) => pulse.rest && pulse.value === 'minim' && pulse.dots)).toBe(false)
  } else {
    for (const score of scores) expect(scoreLength(score)).toBe(barLength(score.timeSignature!))
    compareChoices(question, (option) => groupLengths(rhythm(option.stimulus)).join() === required.join())
  }
}

describe('Grade 5 visual rhythm questions', () => {
  test.each(ids)('%s has readable, reproducible stimuli and one independently verified answer', (id) => {
    const modes = new Set()
    const signatures = new Set()
    const distinct = new Set()
    let rests = 0
    for (let seed = 0; seed < 400; seed++) {
      const question = generateRhythmQuestion(id, seed)
      if (seed < 4) expect(question).toEqual(generateRhythmQuestion(id, seed))
      expect(question.id).toMatch(/^rhythm-v2:/)
      expect(question.stem).not.toMatch(/[\p{Script=Han}]/u)
      modes.add(question.variant)
      distinct.add(question.contentKey)
      const figures = [question.stimulus, ...question.options.map((option) => option.stimulus)].filter((value) => value?.kind === 'rhythm')
      expect(figures.length).toBeGreaterThan(0)
      for (const value of figures) {
        if (value?.kind !== 'rhythm') continue
        if (value.timeSignature) signatures.add(value.timeSignature)
        if (value.pulses.some((pulse) => pulse.rest)) rests++
      }
      checkItem(question)
    }
    expect(modes.size).toBeGreaterThanOrEqual(id === 'MET-5-IRREGULAR' ? 2 : 3)
    expect(distinct.size).toBeGreaterThan(10)
    expect(rests).toBeGreaterThan(0)
    if (id !== 'RHY-5-TUPLET') expect([...signatures].sort()).toEqual(['5/4', '5/8', '7/4', '7/8'])
  })

  test('matches quintuplet semiquavers to one crotchet and reads the third beat in 2 + 3 + 2', () => {
    const cases = Array.from({ length: 500 }, (_, seed) => generateRhythmQuestion('RHY-5-TUPLET', seed))
    const quintuplet = cases.find((question) => question.variant === 'tuplet-match-notation'
      && rhythm(question.stimulus).tuplets?.[0].count === 5 && rhythm(question.stimulus).pulses[0].value === 'semiquaver')!
    expect(quintuplet).toBeDefined()
    expect(rhythm(quintuplet.options.find((option) => option.id === quintuplet.correctAnswer.optionId)?.stimulus).pulses).toEqual([{ value: 'crotchet' }])
    const grouping = Array.from({ length: 500 }, (_, seed) => generateRhythmQuestion('MET-5-GROUP', seed))
      .find((question) => question.variant === 'read-beamed-beat' && question.stem.includes('beat 3')
        && rhythm(question.stimulus).beamGroups?.join() === '2,3,2')!
    expect(grouping).toBeDefined()
    expect(grouping.correctAnswer.number).toBe(6)
  })
})
