import { mistakeCauses, type Attempt, type MasterySettings } from '../learning/progress'
import { classifyGrade5, grade5Blueprint, intervalPreviewBlueprint, type ExamBlueprint, type ExamPaper, type ExamSession } from '../exam/engine'
import type { Grade5Question } from '../exam/grade5'
import type { QuestionAnswer } from '../questions/question'
import { CLEFS, LETTERS, NOTE_VALUES, type Pitch } from '../theory'

type Cause = typeof mistakeCauses[number]

export interface Visit { id: string; at: number }
export interface Annotation { id: string; cause: Cause | ''; at: number }
export interface SettingsRecord { id: 'mastery'; value: MasterySettings }
export interface ExamRecord { id: string; value: unknown; updatedAtMs?: number }
export interface ProgressData {
  attempts: Attempt[]
  visits: Visit[]
  annotations: Annotation[]
  settings: SettingsRecord[]
  exams: ExamRecord[]
}

const stores = ['attempts', 'visits', 'annotations', 'settings', 'exams'] as const
type Store = typeof stores[number]
type ProgressRow = ProgressData[Store][number]
export interface ImportSummary { added: number; updated: number; unchanged: number; keptLocal: number }
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
  return { attempts, visits, annotations, settings, exams: exams.filter((row): row is ExamRecord => validRow('exams', row)) }
}

export async function writeProgress<K extends keyof ProgressData>(database: IDBDatabase, store: K, record: ProgressData[K][number]) {
  const transaction = database.transaction(store, 'readwrite')
  const done = transactionDone(transaction)
  const target = transaction.objectStore(store)
  let saved = record
  if (store === 'exams') {
    const exam = stampExam(record as ExamRecord)
    const lookup = target.get(exam.id)
    lookup.onsuccess = () => {
      const existing = lookup.result as ExamRecord | undefined
      const decision = compareExams(existing, exam, true)
      if (decision === 'same' || decision === 'keep') {
        saved = existing as ProgressData[K][number]
      } else {
        saved = exam as ProgressData[K][number]
        target.put(exam)
      }
    }
  } else {
    target.put(record)
  }
  await done
  return saved
}

export async function writeExamResult(database: IDBDatabase, exam: ExamRecord, attempts: readonly Attempt[]) {
  const transaction = database.transaction(['exams', 'attempts'], 'readwrite')
  const done = transactionDone(transaction)
  const stamped = stampExam(exam)
  const exams = transaction.objectStore('exams')
  const records = transaction.objectStore('attempts')
  let saved = false
  const lookup = exams.get(stamped.id)
  lookup.onsuccess = () => {
    const decision = compareExams(lookup.result, stamped)
    if (decision === 'keep') return
    if (decision !== 'same') exams.put(stamped)
    for (const attempt of attempts) {
      const existing = records.get(attempt.id)
      existing.onsuccess = () => { if (existing.result === undefined) records.add(attempt) }
    }
    saved = true
  }
  await done
  return saved
}

export function exportProgress(data: ProgressData): string {
  return JSON.stringify({ version: schemaVersion, ...data }, null, 2)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sameJson(left: unknown, right: unknown): boolean {
  if (left === right) return true
  if (Array.isArray(left)) {
    return Array.isArray(right) && left.length === right.length && left.every((item, index) => sameJson(item, right[index]))
  }
  if (!isRecord(left) || !isRecord(right)) return false
  const keys = Object.keys(left).filter((key) => left[key] !== undefined)
  return keys.length === Object.keys(right).filter((key) => right[key] !== undefined).length
    && keys.every((key) => Object.hasOwn(right, key) && sameJson(left[key], right[key]))
}

function stampExam(record: ExamRecord): ExamRecord {
  if (!isExamSession(record.value)) return record
  const session = record.value
  const lastEvent = session.status === 'submitted' ? session.submittedAtMs : session.startedAtMs
  return { ...record, updatedAtMs: Math.max(lastEvent, record.updatedAtMs ?? 0, Date.now()) }
}

type MergeDecision = 'add' | 'update' | 'same' | 'keep'

function compareExams(existing: ExamRecord | undefined, incoming: ExamRecord, localEdit = false): MergeDecision {
  if (!existing) return 'add'
  if (!isExamSession(existing.value)) return 'update'
  if (!isExamSession(incoming.value)) return 'keep'
  const current = existing.value
  const next = incoming.value
  if (current.startedAtMs !== next.startedAtMs || !sameJson(current.paper, next.paper)) return 'keep'
  if (sameJson(current, next)) {
    return next.status === 'active' && (incoming.updatedAtMs ?? -1) > (existing.updatedAtMs ?? -1) ? 'update' : 'same'
  }
  if (current.status === 'submitted') return 'keep'
  if (next.status === 'submitted') return 'update'
  if (localEdit) return 'update'
  return incoming.updatedAtMs !== undefined && existing.updatedAtMs !== undefined
    && incoming.updatedAtMs > existing.updatedAtMs ? 'update' : 'keep'
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

function validRhythm(value: Record<string, unknown>): boolean {
  const { pulses, beamGroups, tuplets, groupStarts } = value
  if (!Array.isArray(pulses) || !validPulses(pulses)) return false
  if (beamGroups !== undefined && (!Array.isArray(beamGroups) || beamGroups.length > pulses.length
    || !beamGroups.every(size => isInteger(size) && size > 0 && size <= pulses.length)
    || beamGroups.reduce((sum, size) => sum + size, 0) !== pulses.length)) return false
  if (groupStarts !== undefined && (!Array.isArray(groupStarts) || groupStarts.length > pulses.length
    || !groupStarts.every(index => isInteger(index) && index >= 0 && index < pulses.length)
    || new Set(groupStarts).size !== groupStarts.length)) return false
  if (tuplets === undefined) return true
  if (!Array.isArray(tuplets) || tuplets.length > pulses.length) return false
  const occupied = new Set<number>()
  return tuplets.every(mark => {
    if (!isRecord(mark) || !isInteger(mark.start) || mark.start < 0 || !isInteger(mark.count) || mark.count < 2
      || mark.start + mark.count > pulses.length || !isInteger(mark.inTimeOf) || mark.inTimeOf < 1 || mark.inTimeOf > 256) return false
    for (let index = mark.start; index < mark.start + mark.count; index++) {
      if (occupied.has(index)) return false
      occupied.add(index)
    }
    return true
  })
}

function validStimulus(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (value.kind === 'rhythm') {
    return validRhythm(value) && (value.timeSignature === undefined || isText(value.timeSignature))
      && (value.keySignature === undefined || isKeySignature(value.keySignature))
      && (value.clef === undefined || CLEFS.some(clef => value.clef === clef))
  }
  if (value.kind === 'harmony') {
    return isKeySignature(value.keySignature) && Array.isArray(value.chords) && value.chords.length > 0
      && value.chords.length <= 256 && value.chords.every(chord => isRecord(chord)
        && isPitch(chord.bass) && Array.isArray(chord.treble) && chord.treble.length > 0
        && chord.treble.length <= 16 && chord.treble.every(isPitch)
        && (chord.label === undefined || isText(chord.label)))
  }
  const excerpt = value.excerpt
  return value.kind === 'excerpt' && (value.role === undefined || value.role === 'cadence-matching') && isRecord(excerpt)
    && CLEFS.some((clef) => excerpt.clef === clef) && isKeySignature(excerpt.keySignature) && isText(excerpt.timeSignature)
    && Array.isArray(excerpt.bars) && excerpt.bars.length <= 256 && excerpt.bars.every((bar) => isRecord(bar)
      && validRhythm(bar) && (bar.keySignature === undefined || isKeySignature(bar.keySignature))
      && (bar.clef === undefined || CLEFS.some(clef => bar.clef === clef)) && (bar.label === undefined || isText(bar.label))
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
      || (option.stimulus !== undefined && !validStimulus(option.stimulus)) || optionIds.has(option.id)) return false
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

function validRow(store: Store, row: unknown): row is ProgressRow {
  if (!isRecord(row) || typeof row.id !== 'string' || !row.id) return false
  switch (store) {
    case 'attempts': return validAttempt(row)
    case 'visits': return isTime(row.at)
    case 'annotations': return isTime(row.at) && (row.cause === '' || mistakeCauses.some((cause) => cause === row.cause))
    case 'settings': return validSettings(row)
    case 'exams': {
      if (!isExamSession(row.value)) return false
      const earliestUpdate = row.value.status === 'submitted' ? row.value.submittedAtMs : row.value.startedAtMs
      return row.updatedAtMs === undefined || (isTime(row.updatedAtMs) && row.updatedAtMs >= earliestUpdate)
    }
  }
}

function compareRows(store: Store, existing: ProgressRow | undefined, incoming: ProgressRow): MergeDecision {
  if (store === 'exams') return compareExams(existing as ExamRecord | undefined, incoming as ExamRecord)
  if (!existing) return 'add'
  if (sameJson(existing, incoming)) return 'same'
  if (store === 'visits') return (incoming as Visit).at < (existing as Visit).at ? 'update' : 'keep'
  if (store === 'annotations') return (incoming as Annotation).at > (existing as Annotation).at ? 'update' : 'keep'
  return 'keep'
}

const summaryFields = { add: 'added', update: 'updated', same: 'unchanged', keep: 'keptLocal' } as const

export async function importProgress(database: IDBDatabase, json: string): Promise<ImportSummary> {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('Choose a valid TheoryLab JSON backup.')
  }
  if (!isRecord(data) || (data.version !== schemaVersion && data.version !== 1)) throw new Error('Unsupported progress file version.')
  const transactionNames: readonly Store[] = data.version === 1 ? ['attempts', 'visits', 'annotations'] : ['exams', ...stores.slice(0, 4)]
  const incoming = new Map<Store, ProgressRow[]>()
  for (const store of transactionNames) {
    const records = data[store]
    if (!Array.isArray(records) || !records.every((row) => validRow(store, row))
      || new Set(records.map((row) => row.id)).size !== records.length) {
      throw new Error('The progress file contains invalid or duplicate records.')
    }
    incoming.set(store, records)
  }
  const transaction = database.transaction(transactionNames, 'readwrite')
  const done = transactionDone(transaction)
  const summary: ImportSummary = { added: 0, updated: 0, unchanged: 0, keptLocal: 0 }
  const current = new Map<Store, Map<string, ProgressRow>>()
  for (const store of transactionNames) {
    const lookup = transaction.objectStore(store).getAll()
    lookup.onsuccess = () => {
      current.set(store, new Map((lookup.result as ProgressRow[]).map((row) => [row.id, row])))
      if (current.size !== transactionNames.length) return
      const skippedExamStarts = new Set<string>()
      for (const name of transactionNames) {
        const target = transaction.objectStore(name)
        for (const row of incoming.get(name) ?? []) {
          const existing = current.get(name)?.get(row.id)
          let decision = compareRows(name, existing, row)
          if (name === 'exams' && decision === 'keep') {
            const session = (row as ExamRecord).value
            if (isExamSession(session) && session.status === 'submitted') skippedExamStarts.add(String(session.startedAtMs))
          }
          if (name === 'attempts' && (row as Attempt).mode === 'exam'
            && row.id.startsWith('exam:') && skippedExamStarts.has(row.id.split(':')[1])
            && decision !== 'same') decision = 'keep'
          if (decision === 'add' || decision === 'update') target.put(row)
          summary[summaryFields[decision]] += 1
        }
      }
    }
  }
  await done
  return summary
}
