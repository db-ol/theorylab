import { useRef, useState, type FormEvent } from 'react'
import { glossary } from '../curriculum/glossary'
import { generateStudyQuestion } from '../curriculum/learningContent'
import { validateAnswer, type Question, type QuestionAnswer } from '../questions'
import { formatPitch, pitchAtStaffPosition, staffPosition } from '../theory'
import type { Attempt, AttemptMode } from '../learning/progress'
import { Staff } from './Notation'
import { ExamStimulus } from './ExamStimulus'
import type { Grade5Question } from '../exam/grade5'
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

function PitchAnswer({ question, answer, onAnswer, disabled }: {
  question: Question; answer: Answer | undefined; onAnswer: (answer: Answer) => void; disabled?: boolean
}) {
  const clef = question.notation?.clef ?? 'treble'
  const first = question.notation?.pitches[0]
  const initial = first ? staffPosition(first, clef) : 4
  const pitch = typeof answer === 'object' ? answer : undefined
  const [position, setPosition] = useState(pitch ? staffPosition(pitch, clef) : initial)
  const accidental = pitch?.accidental ?? 0
  const update = (newPosition: number, newAccidental: number) => {
    setPosition(newPosition)
    onAnswer(pitchAtStaffPosition(newPosition, clef, newAccidental))
  }
  return <fieldset className="pitch-answer" disabled={disabled}>
    <legend>Place the second note</legend>
    <Staff clef={clef} keySignature={question.notation?.keySignature} pitches={first ? pitch ? [first, pitch] : [first] : pitch ? [pitch] : []} showClefName={false} />
    <div className="pitch-inputs">
      <label>Staff position<input type="range" min={Math.min(-12, initial - 14)} max={Math.max(18, initial + 14)} value={position} aria-valuetext={position < 0 ? `${-position} steps below the stave` : position > 8 ? `${position - 8} steps above the stave` : position % 2 ? `Space ${(position + 1) / 2}` : `Line ${position / 2 + 1}`} onChange={(e) => update(Number(e.target.value), accidental)} /></label>
      <label>Accidental<select value={accidental} onChange={(e) => update(position, Number(e.target.value))}>
        {['Double flat', 'Flat', 'Natural', 'Sharp', 'Double sharp'].map((label, i) => <option key={label} value={i - 2}>{label}</option>)}
      </select></label>
      {answer === undefined && <button className="button secondary" type="button" onClick={() => update(position, accidental)}>Place note</button>}
    </div>
  </fieldset>
}

export function QuestionInput({ question, answer, onAnswer, disabled }: {
  question: Question; answer: Answer | undefined; onAnswer: (answer: Answer | undefined) => void; disabled?: boolean
}) {
  if (question.answerKind === 'pitch') return <PitchAnswer key={question.id} question={question} answer={answer} onAnswer={onAnswer} disabled={disabled} />
  return <>
    <ExamStimulus stimulus={(question as Grade5Question).stimulus} />
    {question.notation && <Staff {...question.notation} showClefName={false} />}
    {question.answerKind === 'numeric' ? <label className="numeric-answer">Your answer
      <input type="number" step="any" inputMode="decimal" disabled={disabled} value={typeof answer === 'number' ? answer : ''} onChange={(e) => onAnswer(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
    </label> : question.answerKind === 'dropdown' ? <label className="numeric-answer">Your answer
      <select disabled={disabled} value={typeof answer === 'string' ? answer : ''} onChange={(e) => onAnswer(e.target.value || undefined)}>
        <option value="">Select an answer</option>{question.options.map((option) => <option key={option.id} value={option.id}>{option.text}</option>)}
      </select>
    </label> : <fieldset className="option-list" disabled={disabled}>
      <legend className="sr-only">Answer options</legend>
      {question.options.map((option, i) => <label key={option.id} className={answer === option.id ? 'selected' : ''}>
        <input type="radio" name={question.id} value={option.id} checked={answer === option.id} onChange={() => onAnswer(option.id)}/>
        <span className="option-letter">{String.fromCharCode(65 + i)}</span><span>{option.text}</span>
      </label>)}
    </fieldset>}
  </>
}

export function QuestionFeedback({ question, correct }: { question: Question; correct: boolean }) {
  return <section className={`feedback ${correct ? 'correct' : 'incorrect'}`} aria-live="polite">
    <h3>{correct ? 'Correct' : 'Review this answer'}</h3>
    <p lang="zh-Hans">{question.explanationZh}</p>
    {question.options.length > 0 && <ul>
      {question.options.map((option) => <li key={option.id}>
        <strong>{option.text}{option.id === question.correctAnswer.optionId ? ' ✓' : ''}</strong><span lang="zh-Hans">{option.explanationZh}</span>
      </li>)}
    </ul>}
    <a href={`#/lesson/${question.objectiveId}`}>Open the lesson</a>
  </section>
}

export function Quiz({ objectiveId, progress, mode = 'practice', onNext }: {
  objectiveId: string; progress: Progress; mode?: AttemptMode; onNext?: (attempt: Attempt) => void
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
  const [question, setQuestion] = useState(() => generate())
  const [answer, setAnswer] = useState<Answer>()
  const [assisted, setAssisted] = useState(false)
  const [showVocabulary, setShowVocabulary] = useState(false)
  const [attempt, setAttempt] = useState<Attempt>()
  const startAt = useRef(Date.now())
  const lock = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const terms = glossary.filter(({ english }) => question.terms.some((term) => term.toLowerCase() === english.toLowerCase()))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (answer === undefined || lock.current) return
    lock.current = true
    const now = Date.now()
    const item = makeAttempt(question, answer, validateAnswer(question, answer), assisted, mode, now, now - startAt.current)
    setAttempt(item)
    void progress.save('attempts', item)
  }
  const next = () => {
    if (attempt && onNext) { onNext(attempt); return }
    setQuestion(generate(question))
    heading.current?.focus()
    setAnswer(undefined)
    setShowVocabulary(false)
    setAssisted(false)
    setAttempt(undefined)
    lock.current = false
    startAt.current = Date.now()
  }
  return <section className="panel quiz">
    <div className="between">
      <p className="eyebrow">{mode === 'lesson' ? 'Knowledge check' : mode === 'review' ? 'Spaced review' : mode === 'diagnostic' ? 'Diagnostic' : 'Practice question'}</p>
      {!attempt && <button className="text-button" type="button" aria-expanded={showVocabulary} onClick={() => { setAssisted(true); setShowVocabulary(!showVocabulary) }}>Vocabulary help</button>}
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
      <button className="button primary" type="button" onClick={next}><Icon name="check" size={17} />{onNext ? 'Continue' : 'Next question'}</button>
    </>}
  </section>
}
