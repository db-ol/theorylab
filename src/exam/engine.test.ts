import { describe, expect, it } from 'vitest'
import {
  buildExam, focusExamItem, classifyGrade5, grade5Blueprint, intervalPreviewBlueprint, remainingExamMs,
  saveExamAnswer, startExam, submitExam, toggleExamFlag,
} from './engine'
import type { ExamSession, ExamSlot } from './engine'

function questionFor(slot: ExamSlot) {
  return { id: `question-${slot.seed}`, objectiveId: `${slot.sectionId}-${slot.group}`, answer: slot.part }
}

const validate = (question: ReturnType<typeof questionFor>, answer: number) => answer === question.answer

describe('Grade 5 exam', () => {
  it('follows the official section totals and the published sample grouping', () => {
    const paper = buildExam(grade5Blueprint, 18, questionFor)
    expect(paper.blueprint.durationMs).toBe(7_200_000)
    expect(paper.items).toHaveLength(75)
    expect(new Set(paper.items.map(item => item.id)).size).toBe(75)
    expect(new Set(paper.items.map(item => item.seed)).size).toBe(75)
    expect(new Set(paper.items.map(item => `${item.sectionId}:${item.group}`)).size).toBe(30)
    const result = submitExam(startExam<ReturnType<typeof questionFor>, number>(paper, 0), validate, 0).result
    expect(result.sections.map(section => section.totalMarks)).toEqual([10, 10, 15, 10, 10, 10, 10])
    expect(buildExam(grade5Blueprint, 18, questionFor)).toEqual(paper)
    expect(buildExam(grade5Blueprint, 19, questionFor).items[0]?.question).not.toEqual(paper.items[0]?.question)
  })

  it.each([
    [0, 'Below Pass'], [49, 'Below Pass'], [50, 'Pass'], [59, 'Pass'],
    [60, 'Merit'], [64, 'Merit'], [65, 'Distinction'], [75, 'Distinction'],
  ])('classifies %i marks as %s', (marks, classification) => {
    expect(classifyGrade5(marks)).toBe(classification)
  })

  it('scores individual parts and records blanks, weak objectives and an immutable result', () => {
    const paper = buildExam(grade5Blueprint, 14, questionFor)
    const started = startExam<ReturnType<typeof questionFor>, number>(paper, 4_000)
    const first = paper.items[0]!
    const second = paper.items[1]!
    const flagged = toggleExamFlag(started, second.id, 4_050)
    expect(flagged.flags).toEqual([second.id])
    expect(toggleExamFlag(flagged, second.id, 4_060).flags).toEqual([])
    const answered = saveExamAnswer(flagged, first.id, first.part, 4_100)
    const incorrect = saveExamAnswer(answered, second.id, -1, 4_110)
    expect(incorrect.answers).toEqual({ [first.id]: first.part, [second.id]: -1 })
    expect(saveExamAnswer(incorrect, second.id, undefined, 4_120).answers).toEqual({ [first.id]: first.part })
    const submitted = submitExam(incorrect, validate, 4_200)
    expect(submitted.reason).toBe('manual')
    expect(submitted.submittedAtMs).toBe(4_200)
    expect(submitted.result.marks).toBe(1)
    expect(submitted.result.classification).toBe('Below Pass')
    expect(submitted.result.sections[0]?.marks).toBe(1)
    expect(submitted.result.outcomes.slice(0, 3).map(outcome => [outcome.marks, outcome.answered])).toEqual([
      [1, true], [0, true], [0, false],
    ])
    expect(submitted.result.recommendedObjectiveIds).toContain(first.question.objectiveId)
    expect(submitExam(submitted, () => true, 9_000)).toBe(submitted)
    expect(saveExamAnswer(submitted, first.id, -1, 9_010)).toBe(submitted)
  })

  it('scores a complete paper across all seven sections', () => {
    const paper = buildExam(grade5Blueprint, 14, questionFor)
    let session: ExamSession<ReturnType<typeof questionFor>, number> = startExam(paper, 100)
    for (const item of paper.items) session = saveExamAnswer(session, item.id, item.question.answer, 101)
    const result = submitExam(session, validate, 200).result
    expect(result.marks).toBe(75)
    expect(result.classification).toBe('Distinction')
    expect(result.recommendedObjectiveIds).toEqual([])
  })

  it('restores an absolute deadline and prevents edits at the expiry boundary', () => {
    const paper = buildExam(intervalPreviewBlueprint, 21, questionFor)
    const started = startExam<ReturnType<typeof questionFor>, number>(paper, 300)
    const item = paper.items[0]!
    const answered = saveExamAnswer(started, item.id, item.question.answer, 400)
    const restored = JSON.parse(JSON.stringify(answered)) as typeof answered
    expect(remainingExamMs(restored, 399)).toBe(960_000 - 99)
    expect(remainingExamMs(restored, restored.deadlineMs - 1)).toBe(1)
    expect(remainingExamMs(restored, restored.deadlineMs)).toBe(0)
    expect(saveExamAnswer(restored, item.id, -1, restored.deadlineMs)).toBe(restored)
    expect(toggleExamFlag(restored, item.id, restored.deadlineMs)).toBe(restored)
    const submitted = submitExam(restored, validate, restored.deadlineMs + 10_000)
    expect(submitted.reason).toBe('time-expired')
    expect(submitted.submittedAtMs).toBe(restored.deadlineMs)
    expect(submitted.result.marks).toBe(1)
    expect(submitted.result.classification).toBeNull()
  })
})

it('tracks viewing time across item navigation and caps elapsed time at the deadline', () => {
  const paper = buildExam(intervalPreviewBlueprint, 72, ({ seed }) => ({ id: String(seed), objectiveId: 'INT-3-QUALITY' }))
  const [first, second] = paper.items
  const start = 2_000
  const active = startExam(paper, start)
  const next = focusExamItem(active, second.id, start + 12_000)
  expect(next.navigation?.durationsMs[first.id]).toBe(12_000)
  const submitted = submitExam(next, () => false, active.deadlineMs + 10_000)
  expect(submitted.navigation?.durationsMs[second.id]).toBe(paper.blueprint.durationMs - 12_000)
  expect(submitted.reason).toBe('time-expired')
})
