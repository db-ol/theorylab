export const grade5Blueprint = {
  version: 'grade5-v1',
  durationMs: 120 * 60 * 1_000,
  totalMarks: 75,
  sections: [
    { id: 'rhythm', title: 'Rhythm', groups: [3, 1, 2, 1, 3] },
    { id: 'pitch', title: 'Pitch', groups: [1, 1, 5, 3] },
    { id: 'keys-scales', title: 'Keys and Scales', groups: [1, 1, 3, 2, 3, 2, 3] },
    { id: 'intervals', title: 'Intervals', groups: [3, 3, 4] },
    { id: 'chords', title: 'Chords', groups: [5, 2, 3] },
    { id: 'terms', title: 'Terms, Signs and Instruments', groups: [3, 2, 5] },
    { id: 'context', title: 'Music in Context', groups: [1, 5, 1, 1, 2] },
  ],
} as const

export type ExamSectionId = (typeof grade5Blueprint.sections)[number]['id']

export interface ExamBlueprint {
  readonly version: 'grade5-v1' | 'interval-preview-v1'
  readonly durationMs: number
  readonly totalMarks: number
  readonly sections: readonly {
    readonly id: ExamSectionId
    readonly title: string
    readonly groups: readonly number[]
  }[]
}

export const intervalPreviewBlueprint = {
  version: 'interval-preview-v1',
  durationMs: 16 * 60 * 1_000,
  totalMarks: 10,
  sections: [grade5Blueprint.sections[3]],
} as const satisfies ExamBlueprint

export const officialExamResources = {
  practice: 'https://www.abrsm.org/en-gb/practice-resources#:~:text=Grade%205%20%2D%20English%2C%20Italian%2C%20Spanish',
  sample: 'https://www.abrsm.org/sites/default/files/2023-09/music-theory-grade-5-sample-paper-200722.pdf',
  answers: 'https://www.abrsm.org/sites/default/files/2023-09/music-theory-grade-5-sample-model-answers.pdf',
  guidance: 'https://www.abrsm.org/en-gb/guidance',
  specification: 'https://www.abrsm.org/sites/default/files/2023-09/Music%20Theory%20Qual%20Spec%20April%202023%20%5B2023%20rebrand%5D.pdf',
} as const

export type Grade5Classification = 'Below Pass' | 'Pass' | 'Merit' | 'Distinction'

export function classifyGrade5(marks: number): Grade5Classification {
  if (!Number.isInteger(marks) || marks < 0 || marks > grade5Blueprint.totalMarks) {
    throw new RangeError('Grade 5 marks must be an integer from 0 to 75.')
  }
  if (marks >= 65) return 'Distinction'
  if (marks >= 60) return 'Merit'
  if (marks >= 50) return 'Pass'
  return 'Below Pass'
}

export interface ExamQuestion {
  readonly id: string
  readonly objectiveId: string
}

export interface ExamSlot {
  readonly sectionId: ExamSectionId
  readonly group: number
  readonly part: number
  readonly seed: number
}

export interface ExamItem<Question extends ExamQuestion> extends ExamSlot {
  readonly id: string
  readonly question: Question
}

export interface ExamPaper<Question extends ExamQuestion> {
  readonly blueprint: ExamBlueprint
  readonly seed: number
  readonly items: readonly ExamItem<Question>[]
}

export function buildExam<Question extends ExamQuestion>(
  blueprint: ExamBlueprint,
  seed: number,
  generate: (slot: ExamSlot) => Question,
): ExamPaper<Question> {
  if (!Number.isSafeInteger(seed)) throw new RangeError('Exam seed must be an integer.')
  const canonical = blueprint.version === 'grade5-v1' ? grade5Blueprint : intervalPreviewBlueprint
  const items = canonical.sections.flatMap(({ id, groups }) =>
    groups.flatMap((size, groupIndex) => Array.from({ length: size }, (_, partIndex) => {
      const group = groupIndex + 1
      const part = partIndex + 1
      const sectionIndex = grade5Blueprint.sections.findIndex(section => section.id === id)
      const slotSeed = (seed + Math.imul(0x9e3779b1, sectionIndex * 1_000 + group * 10 + part)) >>> 0
      const slot: ExamSlot = { sectionId: id, group, part, seed: slotSeed }
      return { ...slot, id: `${id}:${group}:${part}`, question: generate(slot) }
    })),
  )
  if (new Set(items.map(item => item.question.id)).size !== items.length) {
    throw new Error('Exam questions must have distinct IDs.')
  }
  return { blueprint: canonical, seed, items }
}

interface ExamAttempt<Question extends ExamQuestion, Answer> {
  readonly paper: ExamPaper<Question>
  readonly startedAtMs: number
  readonly deadlineMs: number
  readonly answers: Readonly<Partial<Record<string, Answer>>>
  readonly flags: readonly string[]
  readonly navigation?: {
    readonly itemId: string
    readonly openedAtMs: number
    readonly durationsMs: Readonly<Partial<Record<string, number>>>
  }
}

export interface ActiveExam<Question extends ExamQuestion, Answer> extends ExamAttempt<Question, Answer> {
  readonly status: 'active'
}

export interface ExamResult {
  readonly marks: number
  readonly totalMarks: number
  readonly classification: Grade5Classification | null
  readonly sections: readonly { id: ExamSectionId; title: string; marks: number; totalMarks: number }[]
  readonly outcomes: readonly { itemId: string; marks: 0 | 1; answered: boolean }[]
  readonly recommendedObjectiveIds: readonly string[]
}

export interface SubmittedExam<Question extends ExamQuestion, Answer> extends ExamAttempt<Question, Answer> {
  readonly status: 'submitted'
  readonly submittedAtMs: number
  readonly reason: 'manual' | 'time-expired'
  readonly result: ExamResult
}

export type ExamSession<Question extends ExamQuestion, Answer = string> =
  | ActiveExam<Question, Answer>
  | SubmittedExam<Question, Answer>

export function startExam<Question extends ExamQuestion, Answer = string>(paper: ExamPaper<Question>, now: number): ActiveExam<Question, Answer> {
  if (!Number.isFinite(now)) throw new RangeError('Exam start time must be finite.')
  return {
    status: 'active',
    paper,
    startedAtMs: now,
    deadlineMs: now + paper.blueprint.durationMs,
    answers: {},
    flags: [],
    navigation: { itemId: paper.items[0].id, openedAtMs: now, durationsMs: {} },
  }
}

export function remainingExamMs(session: ExamSession<ExamQuestion, unknown>, now: number): number {
  if (session.status === 'submitted') return 0
  return Math.max(0, session.deadlineMs - Math.max(session.startedAtMs, now))
}

function acceptsEdits(session: ExamSession<ExamQuestion, unknown>, itemId: string, now: number): boolean {
  return session.status === 'active'
    && remainingExamMs(session, now) > 0
    && session.paper.items.some(item => item.id === itemId)
}

function recordViewedTime(
  session: ExamSession<ExamQuestion, unknown>, now: number,
): NonNullable<ExamAttempt<ExamQuestion, unknown>['navigation']> {
  const previous = session.navigation
  const itemId = previous?.itemId ?? session.paper.items[0].id
  const started = previous?.openedAtMs ?? session.startedAtMs
  const openedAtMs = Math.max(started, Math.min(now, session.deadlineMs))
  const durationsMs = {
    ...previous?.durationsMs,
    [itemId]: (previous?.durationsMs[itemId] ?? 0) + openedAtMs - started,
  }
  return { itemId, openedAtMs, durationsMs }
}

export function focusExamItem<Question extends ExamQuestion, Answer>(
  session: ExamSession<Question, Answer>, itemId: string, now: number,
): ExamSession<Question, Answer> {
  if (!acceptsEdits(session, itemId, now) || session.navigation?.itemId === itemId) return session
  return { ...session, navigation: { ...recordViewedTime(session, now), itemId } }
}

export function saveExamAnswer<Question extends ExamQuestion, Answer>(
  session: ExamSession<Question, Answer>,
  itemId: string,
  answer: Answer | undefined,
  now: number,
): ExamSession<Question, Answer> {
  if (!acceptsEdits(session, itemId, now)) return session
  const answers = { ...session.answers }
  if (answer === undefined) delete answers[itemId]
  else answers[itemId] = answer
  return { ...session, answers }
}

export function toggleExamFlag<Question extends ExamQuestion, Answer>(
  session: ExamSession<Question, Answer>,
  itemId: string,
  now: number,
): ExamSession<Question, Answer> {
  if (!acceptsEdits(session, itemId, now)) return session
  const flags = session.flags.includes(itemId)
    ? session.flags.filter(id => id !== itemId)
    : [...session.flags, itemId]
  return { ...session, flags }
}

export function submitExam<Question extends ExamQuestion, Answer>(
  session: ExamSession<Question, Answer>,
  validate: (question: Question, answer: Answer) => boolean,
  now: number,
): SubmittedExam<Question, Answer> {
  if (session.status === 'submitted') return session
  if (!Number.isFinite(now)) throw new RangeError('Exam submission time must be finite.')

  const { paper } = session
  const sectionMarks = new Map<ExamSectionId, number>()
  const objectiveResults = new Map<string, { missed: number; total: number }>()
  let marks = 0
  const outcomes = paper.items.map(item => {
    const answer = session.answers[item.id]
    const awarded = answer !== undefined && validate(item.question, answer) ? 1 : 0
    const objectiveId = item.question.objectiveId
    const evidence = objectiveResults.get(objectiveId) ?? { missed: 0, total: 0 }
    evidence.missed += 1 - awarded
    evidence.total += 1
    objectiveResults.set(objectiveId, evidence)
    sectionMarks.set(item.sectionId, (sectionMarks.get(item.sectionId) ?? 0) + awarded)
    marks += awarded
    return { itemId: item.id, marks: awarded, answered: answer !== undefined } as const
  })
  const recommendedObjectiveIds = [...objectiveResults.entries()]
    .filter(([, evidence]) => evidence.missed > 0)
    .sort(([, a], [, b]) => b.missed / b.total - a.missed / a.total || b.missed - a.missed)
    .map(([objectiveId]) => objectiveId)

  return {
    ...session,
    status: 'submitted',
    submittedAtMs: Math.max(session.startedAtMs, Math.min(now, session.deadlineMs)),
    navigation: recordViewedTime(session, now),
    reason: now >= session.deadlineMs ? 'time-expired' : 'manual',
    result: {
      marks,
      totalMarks: paper.blueprint.totalMarks,
      classification: paper.blueprint.version === 'grade5-v1' ? classifyGrade5(marks) : null,
      sections: paper.blueprint.sections.map(section => ({
        id: section.id,
        title: section.title,
        marks: sectionMarks.get(section.id) ?? 0,
        totalMarks: section.groups.reduce((sum, count) => sum + count, 0),
      })),
      outcomes,
      recommendedObjectiveIds,
    },
  }
}
