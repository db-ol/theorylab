import { mistakeCauses, type Attempt, type MasterySettings } from '../learning/progress'
import { classifyGrade5, grade5Blueprint, intervalPreviewBlueprint, type ExamBlueprint, type ExamPaper, type ExamSession } from '../exam/engine'
import type { Grade5Question } from '../exam/grade5'
import type { QuestionAnswer } from '../questions/question'
import { CLEFS, LETTERS, NOTE_VALUES, type Pitch } from '../theory'

type Cause = typeof mistakeCauses[number]

export interface Visit { id: string; at: number }
export interface Annotation { id: string; cause: Cause | ''; at: number }
export interface SettingsRecord { id: 'mastery'; value: MasterySettings }
export interface ExamRecord { id: string; value: unknown }
export interface ProgressData {
  attempts: Attempt[]
  visits: Visit[]
  annotations: Annotation[]
  settings: SettingsRecord[]
  exams: ExamRecord[]
}

const stores = ['attempts', 'visits', 'annotations', 'settings', 'exams'] as const
const schemaVersion = 2
const modes = new Set(['practice', 'lesson', 'review', 'diagnostic', 'exam', 'vocabulary'])
const answerKinds = new Set(['choice', 'pitch', 'numeric', 'dropdown'])

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('The storage transaction was aborted.'))
  })
}

export function openProgress(name = 'theorylab-progress'): Promise<IDBDatabase> {
  const opening = indexedDB.open(name, schemaVersion)
  opening.onupgradeneeded = () => {
    const database = opening.result
    for (const store of stores) {
      if (!database.objectStoreNames.contains(store)) database.createObjectStore(store, { keyPath: 'id' })
    }
  }
  return request(opening).then((database) => {
    database.onversionchange = () => database.close()
    return database
  })
}

export async function readProgress(database: IDBDatabase): Promise<ProgressData> {
  const transaction = database.transaction(stores, 'readonly')
  const [attempts, visits, annotations, settings, exams] = await Promise.all(
    stores.map((store) => request(transaction.objectStore(store).getAll())),
  )
  return { attempts, visits, annotations, settings, exams: exams.filter((row) => validRow('exams', row)) }
}

export async function writeProgress<K extends keyof ProgressData>(database: IDBDatabase, store: K, record: ProgressData[K][number]) {
  const transaction = database.transaction(store, 'readwrite')
  const done = transactionDone(transaction)
  transaction.objectStore(store).put(record)
  await done
}

export async function writeExamResult(database: IDBDatabase, exam: ExamRecord, attempts: readonly Attempt[]) {
  const transaction = database.transaction(['exams', 'attempts'], 'readwrite')
  const done = transactionDone(transaction)
  transaction.objectStore('exams').put(exam)
  const records = transaction.objectStore('attempts')
  for (const attempt of attempts) records.put(attempt)
  await done
}

export function exportProgress(data: ProgressData): string {
  return JSON.stringify({ version: schemaVersion, ...data }, null, 2)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isText(value: unknown): value is string {
  return typeof value === 'string'
}

function isId(value: unknown): value is string {
  return isText(value) && value.length > 0
}

function isSeed(value: unknown): value is number | string {
  return isText(value) || isInteger(value)
}

function isPitch(value: unknown): value is Pitch {
  return isRecord(value) && LETTERS.some((letter) => value.letter === letter)
    && isInteger(value.accidental) && Math.abs(value.accidental) <= 2
    && isInteger(value.octave) && Math.abs(value.octave) <= 20
}

function isKeySignature(value: unknown): value is number {
  return isInteger(value) && Math.abs(value) <= 7
}

function validNotation(value: unknown): boolean {
  return isRecord(value) && CLEFS.some((clef) => value.clef === clef)
    && Array.isArray(value.pitches) && value.pitches.length <= 256 && value.pitches.every(isPitch)
    && (value.keySignature === undefined || isKeySignature(value.keySignature))
}

function validPulses(value: unknown): boolean {
  return Array.isArray(value) && value.length <= 256 && value.every((pulse) =>
    isRecord(pulse) && isText(pulse.value) && Object.hasOwn(NOTE_VALUES, pulse.value)
    && (pulse.dots === undefined || pulse.dots === 1 || pulse.dots === 2)
    && (pulse.rest === undefined || typeof pulse.rest === 'boolean')
    && (pulse.tieAfter === undefined || typeof pulse.tieAfter === 'boolean')
    && (pulse.pitch === undefined || isPitch(pulse.pitch)))
}

function validStimulus(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (value.kind === 'rhythm') {
    return validPulses(value.pulses) && (value.timeSignature === undefined || isText(value.timeSignature))
  }
  const excerpt = value.excerpt
  return value.kind === 'excerpt' && isRecord(excerpt)
    && CLEFS.some((clef) => excerpt.clef === clef) && isKeySignature(excerpt.keySignature) && isText(excerpt.timeSignature)
    && Array.isArray(excerpt.bars) && excerpt.bars.length <= 256 && excerpt.bars.every((bar) => isRecord(bar)
      && validPulses(bar.pulses)
      && (bar.dynamic === undefined || isText(bar.dynamic))
      && (bar.direction === undefined || isText(bar.direction)))
}

function isQuestionSnapshot(value: unknown): value is Grade5Question {
  if (!isRecord(value) || !isId(value.id) || !isId(value.objectiveId)
    || !isId(value.variant) || !isText(value.stem) || !isText(value.explanationZh) || !isSeed(value.seed)
    || !isInteger(value.difficulty) || value.difficulty < 1 || value.difficulty > 5
    || (value.contentKey !== undefined && !isText(value.contentKey))
    || (value.answerKind !== undefined && (!isText(value.answerKind) || !answerKinds.has(value.answerKind)))
    || !Array.isArray(value.terms) || !value.terms.every(isText)
    || (value.notation !== undefined && !validNotation(value.notation))
    || (value.stimulus !== undefined && !validStimulus(value.stimulus))
    || !Array.isArray(value.options)) return false
  const optionIds = new Set<string>()
  for (const option of value.options) {
    if (!isRecord(option) || !isId(option.id) || !isText(option.text) || !isText(option.explanationZh)
      || optionIds.has(option.id)) return false
    optionIds.add(option.id)
  }
  const answer = value.correctAnswer
  if (!isRecord(answer) || !isId(answer.optionId)
    || (answer.pitch !== undefined && !isPitch(answer.pitch))
    || (answer.number !== undefined && !isFiniteNumber(answer.number))) return false
  if (value.answerKind === 'numeric') return isFiniteNumber(answer.number)
  if (value.answerKind === 'pitch') return isPitch(answer.pitch)
  return optionIds.has(answer.optionId)
}

function matchesBlueprint(value: unknown, blueprint: ExamBlueprint): boolean {
  if (!isRecord(value) || value.version !== blueprint.version || value.durationMs !== blueprint.durationMs
    || value.totalMarks !== blueprint.totalMarks || !Array.isArray(value.sections)
    || value.sections.length !== blueprint.sections.length) return false
  return value.sections.every((section, index) => {
    const expected = blueprint.sections[index]
    return isRecord(section) && section.id === expected.id && section.title === expected.title
      && Array.isArray(section.groups) && section.groups.length === expected.groups.length
      && section.groups.every((size, group) => size === expected.groups[group])
  })
}

function isExamPaper(value: unknown): value is ExamPaper<Grade5Question> {
  if (!isRecord(value) || !isRecord(value.blueprint) || !Array.isArray(value.items) || !isInteger(value.seed)) return false
  const blueprint: ExamBlueprint = value.blueprint.version === grade5Blueprint.version ? grade5Blueprint : intervalPreviewBlueprint
  if (!matchesBlueprint(value.blueprint, blueprint) || value.items.length !== blueprint.totalMarks) return false
  const expected = blueprint.sections.flatMap(({ id, groups }) => groups.flatMap((count, group) =>
    Array.from({ length: count }, (_, part) => ({ sectionId: id, group: group + 1, part: part + 1 }))))
  const questionIds = new Set<string>()
  return value.items.every((item, index) => {
    const { sectionId, group, part } = expected[index]
    if (!isRecord(item) || item.sectionId !== sectionId || item.group !== group || item.part !== part
      || item.id !== `${sectionId}:${group}:${part}` || !isTime(item.seed)
      || !isQuestionSnapshot(item.question) || questionIds.has(item.question.id)) return false
    questionIds.add(item.question.id)
    return true
  })
}

function validSavedAnswer(value: unknown, question: Grade5Question): boolean {
  if (question.answerKind === 'numeric') return isFiniteNumber(value)
  if (question.answerKind === 'pitch' && isPitch(value)) return true
  return isText(value) && question.options.some((option) => option.id === value)
}

function validResult(
  value: unknown, paper: ExamPaper<Grade5Question>, answers: Record<string, unknown>,
): boolean {
  const { blueprint, items } = paper
  if (!isRecord(value) || !isTime(value.marks) || value.marks > blueprint.totalMarks
    || value.totalMarks !== blueprint.totalMarks || !Array.isArray(value.outcomes)
    || value.outcomes.length !== items.length || !Array.isArray(value.sections)
    || value.sections.length !== blueprint.sections.length || !Array.isArray(value.recommendedObjectiveIds)) return false
  const expectedClassification = blueprint.version === grade5Blueprint.version ? classifyGrade5(value.marks) : null
  if (value.classification !== expectedClassification) return false
  const marksBySection = new Map<string, number>()
  for (const [index, outcome] of value.outcomes.entries()) {
    const { id, sectionId } = items[index]
    const answered = Object.hasOwn(answers, id)
    if (!isRecord(outcome) || outcome.itemId !== id || outcome.answered !== answered
      || (outcome.marks !== 0 && outcome.marks !== 1) || (!answered && outcome.marks !== 0)) return false
    marksBySection.set(sectionId, (marksBySection.get(sectionId) ?? 0) + outcome.marks)
  }
  const validSections = value.sections.every((section, index) => {
    const expected = blueprint.sections[index]
    return isRecord(section) && section.id === expected.id && section.title === expected.title
      && section.marks === marksBySection.get(expected.id)
      && section.totalMarks === expected.groups.reduce((sum, count) => sum + count, 0)
  })
  const objectives = new Set(items.map((item) => item.question.objectiveId))
  return validSections && value.marks === [...marksBySection.values()].reduce((total, marks) => total + marks, 0)
    && value.recommendedObjectiveIds.every((objective) => isText(objective) && objectives.has(objective))
}

export function isExamSession(value: unknown): value is ExamSession<Grade5Question, QuestionAnswer> {
  if (!isRecord(value) || (value.status !== 'active' && value.status !== 'submitted')
    || !isTime(value.startedAtMs) || !isTime(value.deadlineMs) || !isExamPaper(value.paper)
    || value.deadlineMs - value.startedAtMs !== value.paper.blueprint.durationMs
    || !isRecord(value.answers) || !Array.isArray(value.flags)) return false
  const items = new Map(value.paper.items.map((item) => [item.id, item.question]))
  if (!value.flags.every((flag) => isText(flag) && items.has(flag))
    || new Set(value.flags).size !== value.flags.length) return false
  for (const [id, answer] of Object.entries(value.answers)) {
    const question = items.get(id)
    if (!question || !validSavedAnswer(answer, question)) return false
  }
  if (value.navigation !== undefined) {
    const navigation = value.navigation
    const end = value.status === 'submitted' ? value.submittedAtMs : value.deadlineMs
    if (!isRecord(navigation) || !isId(navigation.itemId) || !items.has(navigation.itemId)
      || !isTime(navigation.openedAtMs) || !isTime(end) || navigation.openedAtMs < value.startedAtMs
      || navigation.openedAtMs > end || !isRecord(navigation.durationsMs)) return false
    let cumulative = 0
    for (const [itemId, duration] of Object.entries(navigation.durationsMs)) {
      if (!items.has(itemId) || !isTime(duration)) return false
      cumulative += duration
    }
    if (cumulative > navigation.openedAtMs - value.startedAtMs) return false
  }
  if (value.status === 'active') return true
  return isTime(value.submittedAtMs) && value.submittedAtMs >= value.startedAtMs && value.submittedAtMs <= value.deadlineMs
    && (value.reason === 'manual' || value.reason === 'time-expired')
    && validResult(value.result, value.paper, value.answers)
}

function validAttempt(row: Record<string, unknown>): boolean {
  const fields = ['objectiveId', 'questionId', 'contentKey', 'variant', 'stem', 'answer', 'correctAnswer', 'explanationZh']
  return fields.every((field) => typeof row[field] === 'string')
    && isSeed(row.seed)
    && typeof row.correct === 'boolean' && typeof row.assisted === 'boolean'
    && typeof row.mode === 'string' && modes.has(row.mode)
    && isTime(row.at) && isTime(row.durationMs)
    && (row.question === undefined || (isQuestionSnapshot(row.question) && row.question.id === row.questionId
      && row.question.objectiveId === row.objectiveId && row.question.seed === row.seed))
    && (row.choices === undefined || (Array.isArray(row.choices) && row.choices.every((choice) =>
      isRecord(choice) && typeof choice.label === 'string' && typeof choice.correct === 'boolean' && typeof choice.explanationZh === 'string')))
}

function validSettings(row: Record<string, unknown>): boolean {
  const value = row.value
  return row.id === 'mastery' && isRecord(value) && isTime(value.minDistinct) && value.minDistinct >= 1
    && isTime(value.minVariants) && value.minVariants >= 1
    && typeof value.minAccuracy === 'number' && value.minAccuracy > 0 && value.minAccuracy <= 1
}

function validRow(store: typeof stores[number], row: unknown): boolean {
  if (!isRecord(row) || typeof row.id !== 'string' || !row.id) return false
  switch (store) {
    case 'attempts': return validAttempt(row)
    case 'visits': return isTime(row.at)
    case 'annotations': return isTime(row.at) && (row.cause === '' || mistakeCauses.some((cause) => cause === row.cause))
    case 'settings': return validSettings(row)
    case 'exams': return isExamSession(row.value)
  }
}

export async function importProgress(database: IDBDatabase, json: string) {
  const data: unknown = JSON.parse(json)
  if (!isRecord(data) || (data.version !== schemaVersion && data.version !== 1)) throw new Error('Unsupported progress file version.')
  const transactionNames = data.version === 1 ? stores.slice(0, 3) : stores
  const valid = transactionNames.every((store) => Array.isArray(data[store]) && data[store].every((record) => validRow(store, record)))
  if (!valid) throw new Error('The progress file contains invalid records.')
  const transaction = database.transaction(transactionNames, 'readwrite')
  const done = transactionDone(transaction)
  for (const store of transactionNames) {
    for (const record of data[store] as unknown[]) transaction.objectStore(store).put(record)
  }
  await done
}
