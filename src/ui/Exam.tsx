import { useEffect, useState } from 'react'
import { intervalIds } from '../curriculum/intervalLessons'
import { objectives } from '../curriculum/objectives'
import {
  buildExam, focusExamItem, grade5Blueprint, intervalPreviewBlueprint, officialExamResources, remainingExamMs,
  saveExamAnswer, startExam, submitExam, toggleExamFlag, type ExamSession,
} from '../exam/engine'
import { generateIntervalQuestion, validateAnswer, type Question } from '../questions'
import { generateExamQuestion } from '../exam/grade5'
import { isExamSession } from '../storage/progress'
import { getKeySignature } from '../theory'
import { ExamStimulus } from './ExamStimulus'
import { Icon } from './Icon'
import { describeAnswer, makeAttempt, newSeed, QuestionFeedback, QuestionInput, type Answer } from './Practice'
import type { Progress } from './useProgress'

function clock(ms: number) {
  const seconds = Math.ceil(ms / 1_000)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

const chordChoiceOrder = ['I', 'II', 'IV', 'V']

export function Exam({ progress }: { progress: Progress }) {
  const exams = progress.data.exams.map((row) => row.value).filter(isExamSession).sort((a, b) => b.startedAtMs - a.startedAtMs)
  const [localSession, setLocalSession] = useState<ExamSession<Question, Answer> | null>(null)
  const [showSubmit, setShowSubmit] = useState(false)
  const [now, setNow] = useState(Date.now)
  const session = localSession ?? exams.find((item) => item.status === 'active')
  const active = session?.status === 'active'
  const remaining = session ? remainingExamMs(session, now) : 0

  const persist = (next: ExamSession<Question, Answer>) => {
    setLocalSession(next)
    void progress.save('exams', { id: String(next.startedAtMs), value: next })
  }

  const finish = (current: ExamSession<Question, Answer>) => {
    if (current.status === 'submitted') return
    const scored = submitExam(current, (question, answer) => validateAnswer(question, answer), Date.now())
    const attempts = scored.paper.items.map((item, i) => {
      const answer = scored.answers[item.id]
      const duration = scored.navigation?.durationsMs[item.id] ?? 0
      const attempt = makeAttempt(item.question, answer ?? 'Unanswered', Boolean(scored.result.outcomes[i].marks),
        false, 'exam', scored.submittedAtMs, duration)
      return { ...attempt, id: `exam:${scored.startedAtMs}:${item.id}` }
    })
    setLocalSession(scored)
    void progress.saveExamResult({ id: String(scored.startedAtMs), value: scored }, attempts)
    setShowSubmit(false)
  }

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [active])

  useEffect(() => { if (session?.status === 'active' && remaining === 0) finish(session) }, [session, remaining])

  const begin = (full: boolean) => {
    const paperSeed = newSeed()
    const paper = full ? buildExam(grade5Blueprint, paperSeed, (slot) => generateExamQuestion(slot, paperSeed))
      : buildExam(intervalPreviewBlueprint, paperSeed, ({ group, part, seed }) =>
        generateIntervalQuestion(intervalIds[(group * 3 + part) % intervalIds.length], seed))
    const started = Date.now()
    setNow(started)
    persist(startExam<Question, Answer>(paper, started))
  }

  if (!session) return <>
    <div className="page-heading"><p className="eyebrow">Exam mode</p><h1>Mock examination</h1><p>Practise under English only conditions. TheoryLab questions are independently written.</p></div>
    <div className="content-grid">
      <section className="panel"><p className="eyebrow">Unofficial</p><h2>Grade 5 mock examination</h2><p>75 marks across seven sections. Allow 120 minutes. Answers and flags are saved on this device.</p>
        <button className="button primary" disabled={!progress.ready} onClick={() => begin(true)}>Start full mock</button>
        <h3>Intervals section practice</h3><p>10 marks across 10 parts. Allow 16 minutes.</p>
        <button className="button secondary" disabled={!progress.ready} onClick={() => begin(false)}>Start timed practice</button>
      </section>
      <section className="panel"><h2>Official Grade 5 format</h2><p>120 minutes · 75 marks</p><ul className="marks-list">
        {grade5Blueprint.sections.map((section) => <li key={section.id}><span>{section.title}</span><strong>{section.groups.reduce((a: number, b: number) => a + b, 0)}</strong></li>)}
      </ul><ul className="official-links"><li><a href={officialExamResources.practice} target="_blank" rel="noreferrer">Official ABRSM practice exams</a></li>
      <li><a href={officialExamResources.sample} target="_blank" rel="noreferrer">Official Grade 5 sample paper</a></li>
      <li><a href={officialExamResources.answers} target="_blank" rel="noreferrer">Official model answers</a></li></ul></section>
    </div>
    {exams.some((item) => item.status === 'submitted') && <section className="panel"><h2>Exam history</h2>{exams.filter((item) => item.status === 'submitted').map((item) =>
      <button className="history-row" key={item.startedAtMs} onClick={() => setLocalSession(item)}>{new Date(item.startedAtMs).toLocaleDateString()} <strong>{item.result.marks}/{item.result.totalMarks}</strong></button>)}</section>}
  </>

  if (session.status === 'submitted') return <>
    <div className="page-heading"><p className="eyebrow">Exam results</p><h1>{session.result.marks} / {session.result.totalMarks}</h1><p>{session.result.classification ?? 'Intervals section score'} · {session.reason === 'time-expired' ? 'Time expired' : 'Submitted'}</p></div>
    <section className="panel">
      <h2>Review priorities</h2>
      {session.result.recommendedObjectiveIds.length ? <ul>{session.result.recommendedObjectiveIds.map((id) =>
        <li key={id}><a href={`#/lesson/${id}`}>{objectives.find((objective) => objective.id === id)?.title ?? id}</a></li>)}</ul> : <p>All answers were correct.</p>}
      <ul className="marks-list">{session.result.sections.map((section) => <li key={section.id}>{section.title}<strong>{section.marks}/{section.totalMarks}</strong></li>)}</ul>
      <button className="button secondary" onClick={() => setLocalSession(null)}>Back to exams</button>
    </section>
    <section className="panel">
      <h2>Answer explanations</h2>
      {session.paper.items.map((item, i) => <details key={item.id} className="exam-explanation"><summary>{i + 1}. {item.question.stem} <strong>{session.result.outcomes[i].marks}/1</strong></summary>
        <p>Your answer · {describeAnswer(item.question, session.answers[item.id])}</p>
        <QuestionFeedback question={item.question} correct={Boolean(session.result.outcomes[i].marks)} showPrompt />
      </details>)}
    </section>
  </>

  const index = Math.max(0, session.paper.items.findIndex((item) => item.id === session.navigation?.itemId))
  const current = session.paper.items[index]
  const stimulus = current.question.stimulus
  const cadenceItems = stimulus?.kind === 'excerpt' && stimulus.role === 'cadence-matching'
    ? session.paper.items.filter(item => item.sectionId === current.sectionId && item.group === current.group)
    : []
  const first = cadenceItems.length ? index - current.part + 1 : index
  const last = cadenceItems.length ? first + cadenceItems.length - 1 : index
  const select = (itemIndex: number) => {
    const item = session.paper.items[itemIndex]
    if (item) persist(focusExamItem(session, item.id, Date.now()))
  }
  return <>
    <div className="page-heading exam-header">
      <div><p className="eyebrow">Unofficial exam practice</p><h1>{session.paper.blueprint.sections.find((section) => section.id === current.sectionId)?.title}</h1><p>{Object.keys(session.answers).length} of {session.paper.items.length} answered</p></div>
      <span className="timer" aria-label={`${Math.ceil(remaining / 1000)} seconds remaining`}>{clock(remaining)}</span>
    </div>
    <div className="exam-layout">
      <section className="panel quiz">
        <div className="between"><p className="eyebrow">{first === last
          ? `Question ${index + 1} · 1 mark`
          : `Questions ${first + 1} to ${last + 1} · ${cadenceItems.length} marks`}</p>
          <button className="button secondary" aria-pressed={session.flags.includes(current.id)} onClick={() => persist(toggleExamFlag(session, current.id, Date.now()))}><Icon name="flag" size={16} /> Flag{cadenceItems.length > 0 && stimulus?.kind === 'excerpt' ? ` ${stimulus.excerpt.bars[current.part - 1]?.label}` : ''}</button></div>
        <h2>{cadenceItems.length > 0 && stimulus?.kind === 'excerpt'
          ? `Choose chords for the marked bars in this melody in ${getKeySignature(stimulus.excerpt.keySignature).major} major.`
          : current.question.stem}</h2>
        {cadenceItems.length > 0 && stimulus?.kind === 'excerpt' ? <ExamStimulus stimulus={stimulus} renderBarAnswer={(barIndex) => {
          const item = cadenceItems[barIndex]
          if (!item) return null
          const answer = session.answers[item.id]
          return <label className="numeric-answer">Chord {stimulus.excerpt.bars[barIndex].label}
            <select value={typeof answer === 'string' ? answer : ''} onFocus={() => select(first + barIndex)} onChange={(event) => {
              const now = Date.now()
              const focused = focusExamItem(session, item.id, now)
              persist(saveExamAnswer(focused, item.id, event.currentTarget.value || undefined, now))
            }}>
              <option value="">Select an answer</option>
              {[...item.question.options].sort((a, b) => chordChoiceOrder.indexOf(a.text) - chordChoiceOrder.indexOf(b.text))
                .map(option => <option key={option.id} value={option.id}>{option.text}</option>)}
            </select>
          </label>
        }} /> : <QuestionInput question={current.question} answer={session.answers[current.id]} onAnswer={(value) => persist(saveExamAnswer(session, current.id, value, Date.now()))}/>}
        <div className="button-row"><button className="button secondary" disabled={first === 0} onClick={() => select(first - 1)}>Previous</button>
          <button className="button primary" disabled={last >= session.paper.items.length - 1} onClick={() => select(last + 1)}>Next question</button></div>
      </section>
      <section className="panel exam-navigation"><h2>Questions</h2><div className="number-grid">
        {session.paper.items.map((item, i) => <button key={item.id} className={`${session.answers[item.id] !== undefined ? 'answered' : ''} ${session.flags.includes(item.id) ? 'flagged' : ''}`} aria-current={i === index ? 'step' : undefined} aria-label={`Question ${i + 1}${session.flags.includes(item.id) ? ', flagged' : ''}`} onClick={() => select(i)}>{i + 1}</button>)}
      </div>
        {showSubmit ? <div className="submit-confirm"><p>Submit this attempt? You have {session.paper.items.length - Object.keys(session.answers).length} unanswered.</p><div className="button-row"><button className="button primary" onClick={() => finish(session)}>Submit examination</button><button className="button secondary" onClick={() => setShowSubmit(false)}>Keep working</button></div></div>
          : <button className="button secondary" onClick={() => setShowSubmit(true)}>Finish attempt</button>}
      </section>
    </div>
  </>
}
