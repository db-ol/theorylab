import { useEffect, useRef, useState, type FormEvent } from 'react'
import { glossary } from '../curriculum/glossary'
import { generateStudyQuestion } from '../curriculum/learningContent'
import { validateAnswer, type Question, type QuestionAnswer } from '../questions'
import { buildLessonCheck, lessonCheckSize } from '../questions/lessonCheck'
import { formatPitch } from '../theory'
import type { Attempt, AttemptMode } from '../learning/progress'
import { Staff } from './Notation'
import { ExamStimulus } from './ExamStimulus'
import { PitchAnswer } from './PitchAnswer'
import { Icon } from './Icon'
import type { Progress } from './useProgress'

export const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]
export type Answer = QuestionAnswer

export function describeAnswer(question: Question, answer?: Answer) {
  if (typeof answer === 'number') return String(answer)
  if (typeof answer === 'string') return question.options.find((option) => option.id === answer)?.text ?? answer
  if (answer) return formatPitch(answer)
  return 'Unanswered'
}

export function makeAttempt(question: Question, answer: Answer, correct: boolean, assisted: boolean, mode: AttemptMode, at: number, durationMs: number): Attempt {
  return {
    id: crypto.randomUUID(), objectiveId: question.objectiveId, questionId: question.id,
    contentKey: question.contentKey ?? question.id, seed: question.seed, variant: question.variant,
    stem: question.stem, question, answer: describeAnswer(question, answer),
    correctAnswer: question.correctAnswer.pitch ? formatPitch(question.correctAnswer.pitch) : describeAnswer(question, question.correctAnswer.number ?? question.correctAnswer.optionId),
    explanationZh: question.explanationZh, correct, assisted, mode, at, durationMs: Math.max(0, durationMs),
    choices: question.options.map((option) => ({ label: option.text, correct: option.id === question.correctAnswer.optionId, explanationZh: option.explanationZh })),
  }
}

function QuestionFigure({ question }: { question: Question }) {
  return <>
    <ExamStimulus stimulus={question.stimulus} />
    {question.notation && <Staff {...question.notation} showClefName={false} />}
  </>
}

export function QuestionInput({ question, answer, onAnswer, disabled }: {
  question: Question; answer: Answer | undefined; onAnswer: (answer: Answer | undefined) => void; disabled?: boolean
}) {
  if (question.answerKind === 'pitch') return <PitchAnswer key={question.id} question={question} answer={answer} onAnswer={onAnswer} disabled={disabled} />
  return <>
    <QuestionFigure question={question} />
    {question.answerKind === 'numeric' ? <label className="numeric-answer">Your answer
      <input type="number" step="any" inputMode="decimal" disabled={disabled} value={typeof answer === 'number' ? answer : ''} onChange={(e) => onAnswer(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
    </label> : question.answerKind === 'dropdown' ? <label className="numeric-answer">Your answer
      <select disabled={disabled} value={typeof answer === 'string' ? answer : ''} onChange={(e) => onAnswer(e.target.value || undefined)}>
        <option value="">Select an answer</option>{question.options.map((option) => <option key={option.id} value={option.id}>{option.text}</option>)}
      </select>
    </label> : <fieldset className={question.options.some(option => option.stimulus) ? 'option-list score-options' : 'option-list'} disabled={disabled}>
      <legend className="sr-only">Answer options</legend>
      {question.options.map((option, i) => <label key={option.id} className={answer === option.id ? 'selected' : ''}>
        <input type="radio" name={question.id} value={option.id} checked={answer === option.id} onChange={() => onAnswer(option.id)}/>
        <span aria-hidden="true" className="option-letter">{String.fromCharCode(65 + i)}</span>
        {option.stimulus ? <><span className="sr-only">{option.text}</span><ExamStimulus stimulus={option.stimulus}/></> : <span>{option.text}</span>}
      </label>)}
    </fieldset>}
  </>
}

export function QuestionFeedback({ question, correct, showPrompt = false }: { question: Question; correct: boolean; showPrompt?: boolean }) {
  return <section className={`feedback ${correct ? 'correct' : 'incorrect'}`} aria-live="polite">
    <h3>{correct ? 'Correct' : 'Review this answer'}</h3>
    {showPrompt && <QuestionFigure question={question} />}
    <p lang="zh-Hans">{question.explanationZh}</p>
    {question.options.length > 0 && <ul>
      {question.options.map((option) => <li key={option.id}>
        <strong>{option.text}{option.id === question.correctAnswer.optionId ? ' ✓' : ''}</strong>
        {showPrompt && <ExamStimulus stimulus={option.stimulus}/>}<span lang="zh-Hans">{option.explanationZh}</span>
      </li>)}
    </ul>}
    <a href={`#/lesson/${question.objectiveId}`}>Open the lesson</a>
  </section>
}

export function Quiz({ objectiveId, progress, mode = 'practice', onNext, checkItem }: {
  objectiveId: string; progress: Progress; mode?: AttemptMode; onNext?: (attempt: Attempt) => void
  checkItem?: { question: Question; number: number; total: number }
}) {
  const generate = (previous?: Question) => {
    const seen = new Set(progress.data.attempts.filter((item) => item.objectiveId === objectiveId).map((item) => item.contentKey))
    const previousKey = previous?.contentKey ?? previous?.id
    let candidate = generateStudyQuestion(objectiveId, newSeed())
    let fallback = candidate
    for (let tries = 0; tries < 48; tries++) {
      const key = candidate.contentKey ?? candidate.id
      if (key !== previousKey) {
        fallback = candidate
        if (!seen.has(key)) return candidate
      }
      candidate = generateStudyQuestion(objectiveId, newSeed())
    }
    return fallback
  }
  const [question, setQuestion] = useState(() => checkItem?.question ?? generate())
  const [answer, setAnswer] = useState<Answer>()
  const [assisted, setAssisted] = useState(false)
  const [showVocabulary, setShowVocabulary] = useState(false)
  const [attempt, setAttempt] = useState<Attempt>()
  const [saving, setSaving] = useState(false)
  const startAt = useRef(Date.now())
  const lock = useRef(false)
  const advanceLock = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const saved = attempt && progress.data.attempts.some(item => item.id === attempt.id)
  const terms = glossary.filter(({ english }) => question.terms.some((term) => term.toLowerCase() === english.toLowerCase()))
  useEffect(() => {
    if (checkItem) heading.current?.focus()
  }, [checkItem?.question.id])

  const saveCheckAttempt = (item: Attempt) => {
    setSaving(true)
    void progress.save('attempts', item).finally(() => setSaving(false))
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (answer === undefined || lock.current) return
    lock.current = true
    const now = Date.now()
    const item = makeAttempt(question, answer, validateAnswer(question, answer), assisted, mode, now, now - startAt.current)
    setAttempt(item)
    if (checkItem) saveCheckAttempt(item)
    else void progress.save('attempts', item)
  }
  const next = () => {
    if (attempt && onNext) {
      if (advanceLock.current) return
      if (checkItem && !saved) { saveCheckAttempt(attempt); return }
      advanceLock.current = true
      onNext(attempt)
      return
    }
    setQuestion(generate(question))
    heading.current?.focus()
    setAnswer(undefined)
    setShowVocabulary(false)
    setAssisted(false)
    setAttempt(undefined)
    lock.current = false
    startAt.current = Date.now()
  }
  const label = checkItem ? `Knowledge check · Question ${checkItem.number} of ${checkItem.total}`
    : mode === 'lesson' ? 'Knowledge check' : mode === 'review' ? 'Spaced review' : mode === 'diagnostic' ? 'Diagnostic' : 'Practice question'
  let nextLabel = 'Next question'
  if (checkItem) {
    if (saving) nextLabel = 'Saving answer'
    else if (!saved) nextLabel = 'Retry saving answer'
    else if (checkItem.number === checkItem.total) nextLabel = 'See check results'
  } else if (onNext) nextLabel = 'Continue'
  return <section className="panel quiz">
    <div className="between">
      <p className="eyebrow">{label}</p>
      {!attempt && !checkItem && <button className="text-button" type="button" aria-expanded={showVocabulary} onClick={() => { setAssisted(true); setShowVocabulary(!showVocabulary) }}>Vocabulary help</button>}
    </div>
    <h2 ref={heading} tabIndex={-1}>{question.stem}</h2>
    {showVocabulary && !attempt && <div className="help-box">{terms.length
      ? terms.map((term) => <p key={term.english}><strong>{term.english}</strong> <span lang="zh-Hans">{term.chinese}</span></p>)
      : <p lang="zh-Hans">先找出题目要求的操作，再确定它针对哪个音乐概念。</p>}
    </div>}
    <form onSubmit={submit}>
      <QuestionInput question={question} answer={answer} onAnswer={setAnswer} disabled={Boolean(attempt)}/>
      {!attempt && <button className="button primary" type="submit" disabled={answer === undefined}>Check answer</button>}
    </form>
    {attempt && <>
      <QuestionFeedback question={question} correct={attempt.correct} />
      <button className="button primary" type="button" disabled={saving} onClick={next}><Icon name="check" size={17} />{nextLabel}</button>
    </>}
  </section>
}

export function LessonCheck({ objectiveId, progress, onComplete }: {
  objectiveId: string; progress: Progress; onComplete: () => void
}) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [results, setResults] = useState<Attempt[]>([])
  const heading = useRef<HTMLHeadingElement>(null)
  const complete = questions.length > 0 && results.length === questions.length
  useEffect(() => {
    if (complete) heading.current?.focus()
  }, [complete])

  const begin = () => {
    const seen = progress.data.attempts.filter(item => item.objectiveId === objectiveId).map(item => item.contentKey)
    setQuestions(buildLessonCheck(objectiveId, newSeed(), seen))
    setResults([])
  }

  if (complete) return <section className="panel">
    <h2 ref={heading} tabIndex={-1}>Knowledge check complete</h2>
    <p>{results.filter(attempt => attempt.correct).length} of {questions.length} correct</p>
    <div className="button-row">
      <a className="button primary" href={`#/practice/${objectiveId}`}>Keep practising</a>
      <button className="button secondary" type="button" onClick={begin}>Try another check</button>
    </div>
  </section>

  const question = questions[results.length]
  if (!question) return <section className="panel">
    <h2>Knowledge check</h2>
    <p>Answer {lessonCheckSize} original exam style questions in English. Review the explanation after each answer.</p>
    <button className="button primary" type="button" onClick={begin}>Start knowledge check</button>
  </section>

  return <Quiz key={`${results.length}:${question.id}`} objectiveId={objectiveId} progress={progress} mode="lesson"
    checkItem={{ question, number: results.length + 1, total: questions.length }} onNext={(attempt) => {
      const updated = [...results, attempt]
      setResults(updated)
      if (updated.length === questions.length) onComplete()
    }} />
}
