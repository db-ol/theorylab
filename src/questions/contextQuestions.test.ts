import { describe, expect, it } from 'vitest'
import { contextLessons } from '../curriculum/contextLessons'
import { formatPitch, formatPitchName, midiNumber, type Pitch } from '../theory'
import { generateContextQuestion, isContextObjective } from './contextQuestions'
import { validateAnswer } from './question'

const dynamicNames: Record<string, string> = {
  p: 'Softly', mp: 'Moderately softly', mf: 'Moderately loudly', f: 'Loudly',
}
const instrumentNames: Record<string, string> = { treble: 'Flute', alto: 'Viola', bass: 'Bassoon' }
const halfBeatValues: Record<string, number> = { quaver: 1, crotchet: 2, minim: 4 }
const keys = Object.keys(contextLessons) as Array<keyof typeof contextLessons>

describe('music in context assessments', () => {
  it.each(keys)('%s generates original and independently checked excerpts', objectiveId => {
    expect(isContextObjective(objectiveId)).toBe(true)
    const lesson = contextLessons[objectiveId]
    expect(lesson.explanation.length).toBeGreaterThan(60)
    expect(lesson.stimulus.kind).toBe('excerpt')
    const clefs = new Set<string>()
    const variants = new Set<string>()
    const prompts = new Set<string>()
    for (let seed = 0; seed < 480; seed += 1) {
      const question = generateContextQuestion(objectiveId, seed)
      expect(question).toEqual(generateContextQuestion(objectiveId, seed))
      expect(question.stem).not.toMatch(/\p{Script=Han}/u)
      expect(question.explanationZh).toContain('。')
      const stimulus = question.stimulus!
      if (stimulus.kind !== 'excerpt') throw new Error('Expected a musical score')
      const { bars, clef, timeSignature } = stimulus.excerpt
      expect(timeSignature).toBe('3/4')
      expect(bars).toHaveLength(4)
      for (const bar of bars) {
        expect(bar.pulses.reduce((sum, pulse) => sum + halfBeatValues[pulse.value] * (pulse.dots ? 1.5 : 1), 0)).toBe(6)
      }
      clefs.add(clef)
      variants.add(question.variant)
      prompts.add(question.contentKey!)
      if (question.variant === 'excerpt count') {
        const label = question.stem.match(/does (.+) occur/)![1]
        const expected = bars.flatMap(bar => bar.pulses.map(pulse => pulse.pitch))
          .filter((pitch): pitch is Pitch => pitch !== undefined)
          .filter(pitch => formatPitchName(pitch) === label).length
        expect(question.correctAnswer.number).toBe(expected)
        expect(validateAnswer(question, expected)).toBe(true)
        expect(validateAnswer(question, expected + 1)).toBe(false)
        continue
      }
      expect(new Set(question.options.map(option => option.text)).size).toBe(question.options.length)
      expect(question.options.every(option => option.explanationZh.includes('。'))).toBe(true)
      const right = question.options.filter(option => validateAnswer(question, option.id))
      expect(right).toHaveLength(1)
      let expected: string
      if (question.variant === 'excerpt pitch') {
        const [, note, bar] = question.stem.match(/note (\d+) of bar (\d+)/)!
        expected = formatPitch(bars[Number(bar) - 1].pulses[Number(note) - 1].pitch!)
      } else if (question.variant === 'excerpt rhythm') {
        const index = Number(question.stem.match(/bar (\d)/)![1]) - 1
        expected = (bars[index].pulses[0].dots ? 'dotted ' : '') + bars[index].pulses[0].value
      } else if (question.variant === 'excerpt dynamics') {
        expected = dynamicNames[bars[0].dynamic!]
      } else if (question.variant === 'excerpt instrument') {
        expected = instrumentNames[clef]
      } else if (question.stem.includes('first and last notes')) {
        const pulses = bars[0].pulses
        const width = Math.abs(midiNumber(pulses[0].pitch!) - midiNumber(pulses.at(-1)!.pitch!))
        const interval = width === 4 ? 'major 3rd' : 'minor 3rd'
        expected = question.stem.includes(interval) ? 'True' : 'False'
      } else if (question.stem.includes('performer')) {
        expect(bars[1].direction).toBe('rall.')
        expected = question.stem.includes('slow down') ? 'True' : 'False'
      } else {
        expected = question.stem.includes(bars[2].pulses[0].value) ? 'True' : 'False'
      }
      expect(right[0].text).toBe(expected)
    }
    expect(prompts.size).toBeGreaterThan(200)
    expect(clefs.size).toBe(objectiveId === 'CTX-1-MELODY' ? 2 : objectiveId === 'CTX-4-EXCERPT' ? 3 : 4)
    expect(variants.size).toBe(objectiveId === 'CTX-1-MELODY' ? 3 : objectiveId === 'CTX-4-EXCERPT' ? 4 : 5)
  })
})
