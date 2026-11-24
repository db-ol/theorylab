import { describe, expect, it } from 'vitest'
import { objectives } from '../curriculum/objectives'
import { validateAnswer, type QuestionAnswer } from '../questions'
import { formatPitch, midiNumber } from '../theory'
import { buildExam, grade5Blueprint, saveExamAnswer, startExam, submitExam, type ExamSession } from './engine'
import { generateExamQuestion, type Grade5Question, type RhythmPulse } from './grade5'

function buildPaper(seed: number) {
  return buildExam(grade5Blueprint, seed, slot => generateExamQuestion(slot, seed))
}

const semiquavers = { breve: 32, semibreve: 16, minim: 8, crotchet: 4, quaver: 2, semiquaver: 1, demisemiquaver: 0.5 }

function pulseTotal(pulses: readonly RhythmPulse[]): number {
  return pulses.reduce((sum, pulse) => sum + semiquavers[pulse.value] * [1, 1.5, 1.75][pulse.dots ?? 0], 0)
}

function signatureTotal(signature: string): number {
  const [beats, unit] = signature.split('/').map(Number)
  return 16 * beats / unit
}

function answerFor(question: Grade5Question): QuestionAnswer {
  if (question.answerKind === 'numeric') return question.correctAnswer.number!
  if (question.answerKind === 'pitch') return question.correctAnswer.pitch!
  return question.correctAnswer.optionId
}

function correctOption(question: Grade5Question): string | undefined {
  return question.options.find(option => option.id === question.correctAnswer.optionId)?.text
}

describe('generated Grade 5 mock', () => {
  it('reproduces each paper and changes stimuli across seeds', () => {
    const first = buildPaper(68)
    const second = buildPaper(69)
    expect(first).toEqual(buildPaper(68))
    expect(first.items).toHaveLength(75)
    expect(second.items.filter((item, index) => item.question.contentKey !== first.items[index].question.contentKey).length).toBeGreaterThan(50)
  })

  it('validates all 75 independent responses in a complete paper', () => {
    const paper = buildPaper(1_942)
    let session: ExamSession<Grade5Question, QuestionAnswer> = startExam(paper, 100)
    for (const item of paper.items) session = saveExamAnswer(session, item.id, answerFor(item.question), 101)
    const result = submitExam(session, validateAnswer, 200).result
    expect(result.marks).toBe(75)
    expect(result.classification).toBe('Distinction')
    expect(result.sections.map(section => section.marks)).toEqual([10, 10, 15, 10, 10, 10, 10])
  })

  it('generates supported interaction types and verifies exact bar totals for 9,600 items', () => {
    const knownObjectives = new Set(objectives.map(objective => objective.id))
    const kinds = new Set<string>()
    for (let seed = 0; seed < 128; seed++) {
      const paper = buildPaper(seed)
      for (const item of paper.items) {
        const { question } = item
        kinds.add(question.answerKind ?? 'choice')
        expect(knownObjectives.has(question.objectiveId), question.objectiveId).toBe(true)
        expect(question.explanationZh.length).toBeGreaterThan(8)
        expect(validateAnswer(question, answerFor(question))).toBe(true)
        const labels = question.options.map(option => option.text)
        expect(new Set(labels).size).toBe(labels.length)
        expect(question.options.filter(option => validateAnswer(question, option.id))).toHaveLength(labels.length ? 1 : 0)
        expect(question.notation?.pitches.every(pitch => Math.abs(pitch.accidental) <= 2) ?? true, question.stem).toBe(true)
        if (question.stimulus?.kind === 'rhythm') {
          const barTotal = pulseTotal(question.stimulus.pulses)
          if (item.group === 1) expect(labels.filter(label => signatureTotal(label) === barTotal)).toEqual([correctOption(question)])
          if (item.group === 5) expect(correctOption(question)).toBe(barTotal === signatureTotal(question.stimulus.timeSignature!) ? 'True' : 'False')
        }
        if (item.sectionId === 'pitch' && item.group === 2) {
          const original = question.notation!.pitches[0]
          const equivalent = question.correctAnswer.pitch!
          expect(equivalent.letter).not.toBe(original.letter)
          expect(midiNumber(equivalent)).toBe(midiNumber(original))
        }
      }
    }
    expect(kinds).toEqual(new Set(['choice', 'dropdown', 'numeric', 'pitch']))
  })

  it('keeps a shared original excerpt across the ten context items', () => {
    for (const seed of [0, 11, 23, 45]) {
      const parts = buildPaper(seed).items.filter(item => item.sectionId === 'context')
      expect(parts).toHaveLength(10)
      const stimulus = parts[0].question.stimulus
      if (stimulus?.kind !== 'excerpt') throw new Error('An excerpt is required.')
      for (const part of parts) expect(part.question.stimulus).toEqual(stimulus)
      const bars = stimulus.excerpt.bars
      expect(bars).toHaveLength(4)
      expect(bars.map(bar => pulseTotal(bar.pulses))).toEqual([12, 12, 12, 12])
      const transposed = bars[0].pulses.map(pulse => formatPitch({ ...pulse.pitch!, octave: pulse.pitch!.octave - 1 })).join(', ')
      expect(correctOption(parts[0].question)).toBe(transposed)
      expect(parts.at(-2)?.question.correctAnswer.number).toBe(4)
      expect(parts.at(-1)?.question.correctAnswer.number).toBe(2)
    }
  })
})
