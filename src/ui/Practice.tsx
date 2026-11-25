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
import { useInterfaceLanguage } from './interfaceLanguage'
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
  const { t } = useInterfaceLanguage()
  if (question.answerKind === 'pitch') return <PitchAnswer key={question.id} question={question} answer={answer} onAnswer={onAnswer} disabled={disabled} />
  return <>
    <QuestionFigure question={question} />
    {question.answerKind === 'numeric' ? <label className="numeric-answer">{t('Your answer', '你的答案')}
      <input type="number" step="any" inputMode="decimal" disabled={disabled} value={typeof answer === 'number' ? answer : ''} onChange={(e) => onAnswer(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
    </label> : question.answerKind === 'dropdown' ? <label className="numeric-answer">{t('Your answer', '你的答案')}
      <select disabled={disabled} value={typeof answer === 'string' ? answer : ''} onChange={(e) => onAnswer(e.target.value || undefined)}>
        <option value="">{t('Select an answer', '选择一个答案')}</option>{question.options.map((option) => <option key={option.id} value={option.id} lang="en">{option.text}</option>)}
      </select>
    </label> : <fieldset className={question.options.some(option => option.stimulus) ? 'option-list score-options' : 'option-list'} disabled={disabled}>
      <legend className="sr-only">{t('Answer options', '答题选项')}</legend>
      {question.options.map((option, i) => <label key={option.id} lang="en" className={answer === option.id ? 'selected' : ''}>
        <input type="radio" name={question.id} value={option.id} checked={answer === option.id} onChange={() => onAnswer(option.id)}/>
        <span aria-hidden="true" className="option-letter">{String.fromCharCode(65 + i)}</span>
        {option.stimulus ? <><span className="sr-only">{option.text}</span><ExamStimulus stimulus={option.stimulus}/></> : <span>{option.text}</span>}
      </label>)}
    </fieldset>}
  </>
}

export function QuestionFeedback({ question, correct, showPrompt = false }: { question: Question; correct: boolean; showPrompt?: boolean }) {
  const { t } = useInterfaceLanguage()
  return <section className={`feedback ${correct ? 'correct' : 'incorrect'}`} aria-live="polite">
    <h3>{correct ? t('Correct', '答对了') : t('Review this answer', '查看答案解析')}</h3>
    {showPrompt && <QuestionFigure question={question} />}
    <p lang="zh-Hans">{question.explanationZh}</p>
    {question.options.length > 0 && <ul>
      {question.options.map((option) => <li key={option.id}>
        <strong lang="en">{option.text}{option.id === question.correctAnswer.optionId ? ' ✓' : ''}</strong>
        {showPrompt && <ExamStimulus stimulus={option.stimulus}/>}<span lang="zh-Hans">{option.explanationZh}</span>
      </li>)}
    </ul>}
    <a href={`#/lesson/${question.objectiveId}`}>{t('Open the lesson', '查看课程')}</a>
  </section>
}

export function Quiz({ objectiveId, progress, mode = 'practice', onNext, checkItem }: {
  objectiveId: string; progress: Progress; mode?: AttemptMode; onNext?: (attempt: Attempt) => void
  checkItem?: { question: Question; number: number; total: number }
}) {
  const { t } = useInterfaceLanguage()
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
  const label = checkItem ? t(`Knowledge check · Question ${checkItem.number} of ${checkItem.total}`, `知识检查，第 ${checkItem.number} 题，共 ${checkItem.total} 题`)
    : mode === 'lesson' ? t('Knowledge check', '知识检查')
      : mode === 'review' ? t('Spaced review', '间隔复习')
        : mode === 'diagnostic' ? t('Diagnostic', '摸底测验') : t('Practice question', '练习题')
  let nextLabel = t('Next question', '下一题')
  if (checkItem) {
    if (saving) nextLabel = t('Saving answer', '正在保存答案')
    else if (!saved) nextLabel = t('Retry saving answer', '重新保存答案')
    else if (checkItem.number === checkItem.total) nextLabel = t('See check results', '查看检查结果')
  } else if (onNext) nextLabel = t('Continue', '继续')
  return <section className="panel quiz">
    <div className="between">
      <p className="eyebrow">{label}</p>
      {!attempt && !checkItem && <button className="text-button" type="button" aria-expanded={showVocabulary} onClick={() => { setAssisted(true); setShowVocabulary(!showVocabulary) }}>{t('Vocabulary help', '词汇提示')}</button>}
    </div>
    <h2 ref={heading} tabIndex={-1} lang="en">{question.stem}</h2>
    {showVocabulary && !attempt && <div className="help-box">{terms.length
      ? terms.map((term) => <p key={term.english}><strong lang="en">{term.english}</strong> <span lang="zh-Hans">{term.chinese}</span></p>)
      : <p lang="zh-Hans">先找出题目要求的操作，再确定它针对哪个音乐概念。</p>}
    </div>}
    <form onSubmit={submit}>
      <QuestionInput question={question} answer={answer} onAnswer={setAnswer} disabled={Boolean(attempt)}/>
      {!attempt && <button className="button primary" type="submit" disabled={answer === undefined}>{t('Check answer', '核对答案')}</button>}
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
  const { t } = useInterfaceLanguage()
  const [questions, setQuestions] = useState<Question[]>([])
  const [results, setResults] = useState<Attempt[]>([])
  const heading = useRef<HTMLHeadingElement>(null)
  const complete = questions.length > 0 && results.length === questions.length
  const correctCount = results.filter(attempt => attempt.correct).length
  useEffect(() => {
    if (complete) heading.current?.focus()
  }, [complete])

  const begin = () => {
    const seen = progress.data.attempts.filter(item => item.objectiveId === objectiveId).map(item => item.contentKey)
    setQuestions(buildLessonCheck(objectiveId, newSeed(), seen))
    setResults([])
  }

  if (complete) return <section className="panel">
    <h2 ref={heading} tabIndex={-1}>{t('Knowledge check complete', '已完成知识检查')}</h2>
    <p>{t(`${correctCount} of ${questions.length} correct`, `${questions.length} 题中答对 ${correctCount} 题`)}</p>
    <div className="button-row">
      <a className="button primary" href={`#/practice/${objectiveId}`}>{t('Keep practising', '继续练习')}</a>
      <button className="button secondary" type="button" onClick={begin}>{t('Try another check', '再做一组')}</button>
    </div>
  </section>

  const question = questions[results.length]
  if (!question) return <section className="panel">
    <h2>{t('Knowledge check', '知识检查')}</h2>
    <p>{t(`Answer ${lessonCheckSize} original exam style questions in English. Review the explanation after each answer.`,
      `完成 ${lessonCheckSize} 道原创全英文考题。每题作答后都可查看解析。`, false)}</p>
    <button className="button primary" type="button" onClick={begin}>{t('Start knowledge check', '开始知识检查')}</button>
  </section>

  return <Quiz key={`${results.length}:${question.id}`} objectiveId={objectiveId} progress={progress} mode="lesson"
    checkItem={{ question, number: results.length + 1, total: questions.length }} onNext={(attempt) => {
      const updated = [...results, attempt]
      setResults(updated)
      if (updated.length === questions.length) onComplete()
    }} />
}
