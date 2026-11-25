import { describe, expect, it } from 'vitest'
import { objectives } from '../curriculum/objectives'
import { validateAnswer, type QuestionAnswer } from '../questions'
import { formatPitch, getKeySignature, midiNumber, parsePitch, type Pitch } from '../theory'
import type { RhythmStimulus } from '../questions/stimulus'
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

function scoreDurations(stimulus: RhythmStimulus): number[] {
  return stimulus.pulses.map((pulse, index) => {
    const tuplet = stimulus.tuplets?.find(group => index >= group.start && index < group.start + group.count)
    return pulseTotal([pulse]) * (tuplet ? tuplet.inTimeOf / tuplet.count : 1)
  })
}

function pitchClass(pitch: Pitch): number {
  return midiNumber(pitch) % 12
}

const romans = ['I', 'II', 'IV', 'V']
const majorOffsets = [[0, 4, 7], [2, 5, 9], [5, 9, 0], [7, 11, 2]]
const minorOffsets = [[0, 3, 7], [2, 5, 8], [5, 8, 0], [7, 11, 2]]

function chordMembers(tonic: number, offsets: readonly number[]): number[] {
  return offsets.map(offset => (tonic + offset) % 12)
}

function sameMembers(left: readonly number[], right: readonly number[]): boolean {
  return new Set(left).size === right.length && right.every(note => left.includes(note))
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

  it('scores visual rhythm alternatives by their engraved groups and durations', () => {
    const variants = new Set<string>()
    for (let seed = 0; seed < 80; seed++) {
      const paper = buildPaper(seed)
      const convert = paper.items.find(item => item.id === 'rhythm:2:1')!.question
      variants.add(convert.variant)
      const shown = convert.stimulus
      if (shown?.kind !== 'rhythm') throw new Error('A rhythm stave is required.')
      if (convert.variant === 'rewrite-compound-in-simple') {
        const targetRatio = scoreDurations(shown).map(duration => duration / 6)
        const sourcePitches = shown.pulses.map(pulse => pulse.pitch)
        const correct = convert.options.filter(({ stimulus }) => {
          if (stimulus?.kind !== 'rhythm') throw new Error('Each choice needs a stave.')
          expect(stimulus.pulses.map(pulse => pulse.pitch)).toEqual(sourcePitches)
          const duration = scoreDurations(stimulus)
          expect(duration.reduce((total, current) => total + current, 0)).toBeCloseTo(signatureTotal(stimulus.timeSignature!))
          return duration.every((value, index) => Math.abs(value / 4 - targetRatio[index]) < 1e-10)
        })
        expect(correct.map(option => option.id)).toEqual([convert.correctAnswer.optionId])
      } else {
        expect(scoreDurations(shown).reduce((total, duration) => total + duration, 0)).toBeCloseTo(4)
        expect(correctOption(convert)).toBe('One crotchet')
      }

      const beaming = paper.items.find(item => item.id === 'rhythm:4:1')!.question
      const numberOfQuavers = pulseTotal((beaming.options[0].stimulus as RhythmStimulus).pulses) / 2
      const markedPattern = beaming.stem.match(/\d \+ \d \+ \d/u)?.[0]
      const groups = beaming.options.map(({ stimulus }) => {
        if (stimulus?.kind !== 'rhythm' || !stimulus.beamGroups) throw new Error('Each choice needs beam groups.')
        expect(stimulus.pulses).toEqual((beaming.options[0].stimulus as RhythmStimulus).pulses)
        expect(stimulus.beamGroups.reduce((total, size) => total + size)).toBe(numberOfQuavers)
        return stimulus.beamGroups
      })
      expect(new Set(groups.map(group => group.join())).size).toBe(3)
      const correct = beaming.options.filter((_, index) => markedPattern
        ? groups[index].join(' + ') === markedPattern
        : groups[index].every(size => size === 3))
      expect(correct.map(option => option.id)).toEqual([beaming.correctAnswer.optionId])
    }
    expect(variants).toEqual(new Set(['rewrite-compound-in-simple', 'tuplet-equivalence']))
  })

  it('independently checks five concert pitch marks and three clef comparison marks', () => {
    for (let seed = 0; seed < 48; seed++) {
      const paper = buildPaper(seed)
      const pitch = paper.items.filter(item => item.sectionId === 'pitch' && item.group >= 3)
      const concert = pitch[0].question.stimulus
      const comparison = pitch.at(-1)!.question.stimulus
      if (concert?.kind !== 'excerpt' || comparison?.kind !== 'excerpt') throw new Error('Shared excerpts are required.')
      const [clefA, clefB, clefC] = comparison.excerpt.bars
      expect([clefA.clef, clefB.clef, clefC.clef]).toEqual(['treble', 'bass', 'alto'])
      const octaveTests = [[clefA, clefB, 0], [clefC, clefB, -12], [clefA, clefC, 12]] as const
      const [written, target] = concert.excerpt.bars
      const stem = pitch[0].question.stem
      const width = stem.includes('minor 3rd') ? 3 : stem.includes('major 2nd') ? 2 : 7
      const signatureShift = { 3: 3, 2: -2, 7: -1 }[width]
      const expected = [target.keySignature === concert.excerpt.keySignature + signatureShift,
        ...written.pulses.map((pulse, index) => midiNumber(pulse.pitch!) - midiNumber(target.pulses[index].pitch!) === width)]
      expect(expected.filter(Boolean)).toHaveLength(3)
      for (const [index, item] of pitch.entries()) {
        expect(item.question.stimulus).toEqual(index < 5 ? concert : comparison)
        const trueClaim = index < 5 ? expected[index] : (() => {
          const [from, to, difference] = octaveTests[index - 5]
          return from.pulses.every((pulse, i) => midiNumber(to.pulses[i].pitch!) - midiNumber(pulse.pitch!) === difference)
        })()
        expect(correctOption(item.question)).toBe(trueClaim ? 'True' : 'False')
      }
    }
  })

  it('uniquely identifies each marked chord and grand staff inversion', () => {
    for (let seed = 0; seed < 48; seed++) {
      const questions = buildPaper(seed).items.filter(item => item.sectionId === 'chords')
      const matching = questions[0].question.stimulus
      if (matching?.kind !== 'excerpt') throw new Error('Cadence matching needs an excerpt.')
      const { keySignature, bars } = matching.excerpt
      expect(matching.role).toBe('cadence-matching')
      expect([-1, 0, 1, 2]).toContain(keySignature)
      expect(bars.map(bar => bar.label)).toEqual(['A', 'B', 'C', 'D', 'E'])
      expect(bars.map(bar => pulseTotal(bar.pulses))).toEqual([12, 12, 12, 12, 12])
      const tonic = pitchClass(parsePitch(`${getKeySignature(keySignature).major}4`))
      for (const [index, { question }] of questions.entries()) {
        const { stimulus } = question
        if (index < 5) {
          expect(stimulus).toEqual(matching)
          const notes = bars[index].pulses.map(pulse => pitchClass(pulse.pitch!))
          const candidates = romans.filter((_, choice) => sameMembers(notes, chordMembers(tonic, majorOffsets[choice])))
          expect(candidates).toEqual([correctOption(question)])
          continue
        }

        if (stimulus?.kind !== 'harmony') throw new Error('A grand staff score is required.')
        if (index < 7) {
          expect([-1, 0, 1, 2]).toContain(stimulus.keySignature)
          const last = stimulus.chords.slice(-2).map(chord => pitchClass(chord.bass))
          const key = pitchClass(parsePitch(`${getKeySignature(stimulus.keySignature).major}4`))
          const roots = last.map(note => (note - key + 12) % 12)
          const name = roots[1] === 7 ? 'imperfect' : roots[0] === 5 ? 'plagal' : 'perfect'
          expect(correctOption(question)).toBe(`${name} cadence`)
          continue
        }

        expect(stimulus).toEqual(questions[7].question.stimulus)
        const { bass, treble, label } = stimulus.chords[index - 7]
        expect(label).toBe(String.fromCharCode(65 + index - 7))
        const mode = question.stem.endsWith('minor.') ? 'minor' : 'major'
        const key = pitchClass(parsePitch(`${getKeySignature(stimulus.keySignature)[mode]}4`))
        const choices = (mode === 'major' ? majorOffsets : minorOffsets).map(offsets => chordMembers(key, offsets))
        const found = choices.findIndex(notes => sameMembers(treble.map(pitchClass), notes))
        expect(found).toBeGreaterThanOrEqual(0)
        expect(treble.every(note => midiNumber(note) > midiNumber(bass))).toBe(true)
        const inversion = choices[found].indexOf(pitchClass(bass))
        expect(correctOption(question)).toBe(`${romans[found]} ${['root position (a)', 'first inversion (b)', 'second inversion (c)'][inversion]}`)
      }
    }
  })
})
