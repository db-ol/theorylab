import 'fake-indexeddb/auto'
import { expect, it } from 'vitest'
import { buildExam, grade5Blueprint, intervalPreviewBlueprint, saveExamAnswer, startExam, submitExam, toggleExamFlag, type ExamSession } from '../exam/engine'
import { generateExamQuestion } from '../exam/grade5'
import { generateIntervalQuestion } from '../questions/intervals'
import { validateAnswer, type Question, type QuestionAnswer } from '../questions/question'
import { exportProgress, importProgress, isExamSession, openProgress, readProgress, writeProgress, type ProgressData } from './progress'

function backup(data: Partial<ProgressData>) {
  return exportProgress({ visits: [], exams: [], attempts: [], annotations: [], settings: [], ...data })
}

function fullExam(seed = 37) {
  const paper = buildExam(grade5Blueprint, seed, (slot) => generateExamQuestion(slot, seed))
  return startExam<Question, QuestionAnswer>(paper, 100)
}

function intervalExam() {
  const paper = buildExam(intervalPreviewBlueprint, 13, (slot) => generateIntervalQuestion('INT-5-SIMPLE', slot.seed, 'construct'))
  return startExam<Question, QuestionAnswer>(paper, 200)
}

it('persists records, validates imports and deduplicates exports', async () => {
  const db = await openProgress('persistence-test')
  await writeProgress(db, 'visits', { id: 'INT-5-SIMPLE', at: 10 })
  db.close()
  const reopened = await openProgress('persistence-test')
  const progress = await readProgress(reopened)
  expect(progress.visits).toEqual([{ id: 'INT-5-SIMPLE', at: 10 }])
  await importProgress(reopened, exportProgress(progress))
  await expect(importProgress(reopened, '{"version":2,"visits":[{}]}')).rejects.toThrow('invalid')
  expect((await readProgress(reopened)).visits).toHaveLength(1)
  reopened.close()
})

it('migrates a version one database and accepts version one exports', async () => {
  await new Promise<void>((resolve, reject) => {
    const opening = indexedDB.open('migration-test', 1)
    opening.onupgradeneeded = () => {
      for (const name of ['attempts', 'visits', 'annotations']) opening.result.createObjectStore(name, { keyPath: 'id' })
      opening.transaction?.objectStore('visits').put({ id: 'old', at: 2 })
    }
    opening.onsuccess = () => { opening.result.close(); resolve() }
    opening.onerror = () => reject(opening.error)
  })
  const db = await openProgress('migration-test')
  expect(await readProgress(db)).toMatchObject({ visits: [{ id: 'old', at: 2 }], exams: [], settings: [] })
  await importProgress(db, '{"version":1,"attempts":[],"visits":[{"id":"new","at":3}],"annotations":[]}')
  expect((await readProgress(db)).visits).toHaveLength(2)
  db.close()
})

it('round trips active and submitted papers with structured answers and original question snapshots', async () => {
  const db = await openProgress('exam-backup-test')
  let active: ExamSession<Question, QuestionAnswer> = fullExam()
  const sampleItems = ['choice', 'numeric', 'pitch', 'dropdown'].map((kind) =>
    active.paper.items.find((item) => item.question.answerKind === kind)!)
  for (const { id, question } of sampleItems) {
    const answer = question.correctAnswer.pitch ?? question.correctAnswer.number ?? question.correctAnswer.optionId
    active = saveExamAnswer(active, id, answer, 110)
  }
  const flagged = toggleExamFlag(active, sampleItems[1].id, 120)
  const submitted = submitExam(flagged, validateAnswer, 130)
  const preview = intervalExam()
  expect(isExamSession(submitted)).toBe(true)
  expect(isExamSession(preview)).toBe(true)

  const question = submitted.paper.items[0].question
  const currentAttempt = {
    id: 'current', questionId: question.id, objectiveId: question.objectiveId, seed: question.seed,
    contentKey: question.contentKey ?? question.id, variant: question.variant, stem: question.stem,
    answer: 'Selected answer', correctAnswer: 'Expected answer', explanationZh: question.explanationZh,
    at: 130, durationMs: 0, assisted: false, correct: true, mode: 'exam' as const, question,
  }
  const oldAttempt = { ...currentAttempt, id: 'legacy', question: undefined }
  const json = backup({
    attempts: [currentAttempt, oldAttempt],
    exams: [{ id: '100', value: submitted }, { id: '200', value: preview }],
  })
  await importProgress(db, json)
  expect(await readProgress(db)).toEqual((({ version: _version, ...records }) => records)(JSON.parse(json)))
  db.close()
})

it('accepts newly generated full papers and results after serialization', () => {
  for (let seed = 0; seed < 25; seed += 1) {
    const session = fullExam(seed)
    expect(isExamSession(JSON.parse(JSON.stringify(session)))).toBe(true)
    const scored = submitExam(session, validateAnswer, session.deadlineMs)
    expect(isExamSession(JSON.parse(JSON.stringify(scored)))).toBe(true)
  }
})

it('rejects invalid nested exam state before importing any records', async () => {
  const db = await openProgress('exam-invalid-backup-test')
  await writeProgress(db, 'visits', { id: 'saved', at: 10 })
  const active = fullExam()
  const submitted = submitExam(active, validateAnswer, 130)
  const item = active.paper.items.find(({ question }) => 'stimulus' in question)!
  const items = active.paper.items.map((candidate) => candidate.id === item.id
    ? { ...item, question: { ...item.question, stimulus: { kind: 'excerpt', excerpt: { bars: [null] } } } }
    : candidate)
  const invalid: unknown[] = [
    {},
    { ...active, status: 'paused' },
    { ...active, deadlineMs: active.startedAtMs - 1 },
    { ...active, paper: { ...active.paper, blueprint: { ...active.paper.blueprint, sections: [] } } },
    { ...active, paper: { ...active.paper, items } },
    { ...active, flags: ['unknown-item'] },
    { ...active, answers: { [active.paper.items[0].id]: 'missing-option' } },
    { ...submitted, result: { ...submitted.result, recommendedObjectiveIds: null } },
    { ...submitted, result: { ...submitted.result, outcomes: submitted.result.outcomes.slice(1) } },
  ]
  for (const value of invalid) {
    expect(isExamSession(value)).toBe(false)
    const json = backup({ visits: [{ id: 'must-not-import', at: 20 }], exams: [{ id: 'invalid', value }] })
    await expect(importProgress(db, json)).rejects.toThrow('invalid')
  }
  expect((await readProgress(db)).visits).toEqual([{ id: 'saved', at: 10 }])
  await writeProgress(db, 'exams', { id: 'legacy-malformed', value: {} })
  expect((await readProgress(db)).exams).toEqual([])
  db.close()
})

it('rejects an invalid original question snapshot or attempt mode without writing other records', async () => {
  const db = await openProgress('attempt-invalid-backup-test')
  const question = generateIntervalQuestion('INT-5-SIMPLE', 32, 'construct')
  const attempt = {
    id: 'test', questionId: question.id, objectiveId: question.objectiveId, seed: question.seed,
    contentKey: question.contentKey!, variant: question.variant, stem: question.stem,
    answer: 'A4', correctAnswer: 'B4', explanationZh: question.explanationZh, question,
    at: 150, durationMs: 4, correct: false, assisted: false, mode: 'practice' as const,
  }
  const invalid = [
    { ...attempt, question: { ...question, id: 'other' } },
    { ...attempt, question: { ...question, notation: { clef: 'unknown', pitches: [] } } },
    { ...attempt, question: { ...question, notation: { clef: 'bass', pitches: [], keySignature: 99 } } },
    { ...attempt, question: { ...question, correctAnswer: [] } },
    { ...attempt, mode: 'mock' },
    { ...attempt, at: -1 },
  ]
  for (const record of invalid) {
    const json = JSON.stringify({ version: 2, attempts: [record], visits: [{ id: 'new', at: 123 }], annotations: [], settings: [], exams: [] })
    await expect(importProgress(db, json)).rejects.toThrow('invalid')
  }
  expect(await readProgress(db)).toMatchObject({ attempts: [], visits: [] })
  db.close()
})
