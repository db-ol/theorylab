import { useState } from 'react'
import { isAvailable, lessons } from '../curriculum/learningContent'
import { objectives, type Objective } from '../curriculum/objectives'
import { accuracy, defaultSettings, localStreak, mistakeCauses, summarizeObjective, type Attempt } from '../learning/progress'
import { Icon } from './Icon'
import { IntervalExplorer } from './IntervalExplorer'
import { HarmonyExplorer, PitchExplorer, RhythmExplorer, ScaleExplorer } from './MusicExplorers'
import { ExamStimulus } from './ExamStimulus'
import { ReferenceVisual } from './ReferenceVisual'
import { referenceIds } from '../curriculum/referenceLessons'
import { Quiz } from './Practice'
import type { Grade5Question } from '../exam/grade5'
import { Staff } from './Notation'
import { parsePitch } from '../theory'
import type { Progress } from './useProgress'

export const objectiveById = new Map(objectives.map((objective) => [objective.id, objective]))
const available = objectives.filter((objective) => isAvailable(objective.id))
const domains = [...new Set(objectives.map((objective) => objective.domain))]
const grade5 = available.filter((objective) => objective.grade === 5)
const intervalDemo = ['C4', 'E4', 'G4'].map(parsePitch)

export type StudyScope = 'grade5' | 'foundations' | 'all'

const studyScopes: { id: StudyScope; label: string; path: string }[] = [
  { id: 'grade5', label: 'Grade 5', path: '' },
  { id: 'foundations', label: 'Grades 1 to 4', path: '/foundations' },
  { id: 'all', label: 'All grades', path: '/all' },
]

function inScope(objective: Objective, scope: StudyScope) {
  return scope === 'all' || (scope === 'grade5' ? objective.grade === 5 : objective.grade < 5)
}

function StudyScopeNav({ scope, page }: { scope: StudyScope; page: 'curriculum' | 'practice' }) {
  return <nav className="segmented scope-nav" aria-label="Study level">
    {studyScopes.map(({ id, label, path }) => <a key={id} href={`#/${page}${path}`} aria-current={scope === id ? 'page' : undefined}>{label}</a>)}
  </nav>
}

function objectiveState(id: string, progress: Progress) {
  return summarizeObjective(progress.data.attempts.filter((item) => item.objectiveId === id),
    progress.data.visits.some((visit) => visit.id === id), Date.now(), progress.data.settings[0]?.value ?? defaultSettings)
}

export const percent = (value: number | null) => value === null ? 'No data' : `${Math.round(value * 100)}%`

export function Dashboard({ progress }: { progress: Progress }) {
  const domainAttempts = progress.data.attempts.filter((attempt) => attempt.mode !== 'vocabulary')
  const grade5Attempts = domainAttempts.filter((attempt) => objectiveById.get(attempt.objectiveId)?.grade === 5)
  const vocabularyAttempts = progress.data.attempts.filter((attempt) => attempt.mode === 'vocabulary')
  const states = new Map(available.map((objective) => [objective.id, objectiveState(objective.id, progress)]))
  const due = available.filter((objective) => states.get(objective.id)?.due).sort((a, b) => b.grade - a.grade)
  const completed = new Set(progress.data.visits.map((visit) => visit.id))
  const incomplete = grade5.filter((objective) => !completed.has(objective.id) && states.get(objective.id)?.stage !== 'Mastered')
  const independentAccuracy = (objective: Objective) => states.get(objective.id)?.independentAccuracy ?? null
  const weakest = grade5.filter((objective) => independentAccuracy(objective) !== null)
    .sort((a, b) => (independentAccuracy(a) ?? 1) - (independentAccuracy(b) ?? 1))
  const ready = incomplete.find((objective) => objective.prerequisites.every((id) =>
    !isAvailable(id) || states.get(id)?.stage !== 'Not started'))
  const targetAccuracy = progress.data.settings[0]?.value.minAccuracy ?? defaultSettings.minAccuracy
  const priority = weakest.find((objective) => (independentAccuracy(objective) ?? 1) < targetAccuracy)
  const next = priority ?? ready ?? incomplete[0] ?? weakest[0] ?? grade5[0]
  const visited = grade5.filter((objective) => completed.has(objective.id)).length
  const mastered = grade5.filter((objective) => states.get(objective.id)?.stage === 'Mastered').length
  const minutes = Math.floor(domainAttempts.reduce((sum, attempt) => sum + attempt.durationMs, 0) / 60000)
  return <>
    <section className="hero">
      <div className="hero-content">
        <h1>Grade 5<br/>Music Theory</h1>
        <p>Study in Chinese and practise in English for the ABRSM exam.</p>
        <div className="button-row">
          <a href={`#/lesson/${next.id}`} className="button hero-button">{visited ? 'Continue Grade 5' : 'Start Grade 5'}</a>
          <a href="#/curriculum/foundations" className="hero-link">Review foundations</a>
        </div>
      </div>
      <div className="hero-art" aria-hidden="true"><Staff pitches={intervalDemo} showClefName={false} /><div className="hero-art-notes"><span>C</span><span>E</span><span>G</span></div></div>
    </section>
    <div className="stats-grid">
      <div className="stat"><Icon name="book"/><span>Grade 5 lessons visited</span><strong>{visited}<small> / {grade5.length}</small></strong></div>
      <div className="stat"><Icon name="target"/><span>Grade 5 objectives mastered</span><strong>{mastered}<small> / {grade5.length}</small></strong></div>
      <div className="stat"><Icon name="pulse"/><span>Grade 5 independent accuracy</span><strong>{percent(accuracy(grade5Attempts.filter((item) => !item.assisted)))}</strong></div>
      <div className="stat"><Icon name="review"/><span>Reviews due</span><strong>{due.length}</strong></div>
    </div>
    <div className="content-grid">
      <section className="panel study-plan">
        <div className="between"><h2>Study today</h2><a href="#/curriculum">View curriculum</a></div>
        {due.length > 0 && <a className="plan-row" href={`#/review/${due[0].id}`}><Icon name="review" /><span><strong>{due[0].title}</strong><small>Spaced review · {due.length} due</small></span></a>}
        <a className="plan-row" href={`#/lesson/${next.id}`}><Icon name="book"/><span><strong>{next.title}</strong><small>Lesson · Grade {next.grade}</small></span></a>
        <a className="plan-row" href="#/diagnostic"><Icon name="target"/><span><strong>Curriculum diagnostic</strong><small>Check your starting point</small></span></a>
        <a className="plan-row" href="#/vocabulary"><Icon name="glossary"/><span><strong>Exam vocabulary</strong><small>Recall and recognition</small></span></a>
      </section>
      <section className="panel">
        <h2>Curriculum coverage</h2>
        <p>{available.length} of {objectives.length} mapped objectives have an interactive lesson and practice.</p>
        <progress value={available.length} max={objectives.length} aria-label="Syllabus implementation coverage"/>
        <dl className="overview-list">
          {domains.map((domain) => {
            const items = objectives.filter((objective) => objective.domain === domain)
            const count = items.filter((item) => states.get(item.id)?.stage === 'Mastered').length
            return <div key={domain}><dt>{domain}</dt><dd>{Math.round(count * 100 / items.length)}% mastered</dd></div>
          })}
        </dl>
      </section>
    </div>
    <div className="content-grid">
      <section className="panel"><h2>Study activity</h2><dl className="overview-list">
        <div><dt>Current streak</dt><dd>{localStreak(progress.data.attempts, Date.now())} days</dd></div>
        <div><dt>Assessment time</dt><dd>{minutes} min</dd></div>
        <div><dt>English assessment accuracy</dt><dd>{percent(accuracy(domainAttempts))}</dd></div>
        <div><dt>Vocabulary accuracy</dt><dd>{percent(accuracy(vocabularyAttempts))}</dd></div>
        <div><dt>Mock attempts submitted</dt><dd>{progress.data.exams.filter(({ value }) => typeof value === 'object' && value !== null && 'status' in value && value.status === 'submitted').length}</dd></div>
      </dl></section>
      <section className="panel"><h2>Grade 5 practice priorities</h2>{weakest.length ? <ul className="marks-list">{weakest.slice(0, 5).map((item) =>
        <li key={item.id}><a href={`#/practice/${item.id}`}>{item.title}</a><strong>{percent(independentAccuracy(item))}</strong></li>)}</ul>
        : <p>Independent Grade 5 practice will show where to focus next.</p>}</section>
    </div>
  </>
}

export function Curriculum({ progress, chinese, scope = 'grade5' }: { progress: Progress; chinese: boolean; scope?: StudyScope }) {
  const [byGrade, setByGrade] = useState(false)
  const [query, setQuery] = useState('')
  const matches = objectives.filter((item) => inScope(item, scope)
    && [item.title, item.chineseTitle, item.id, ...item.terms].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  const label = studyScopes.find(({ id }) => id === scope)?.label
  const groups: [string, Objective[]][] = scope !== 'grade5' && byGrade
    ? ([1, 2, 3, 4, 5] as const).map((grade) => [`Grade ${grade}`, matches.filter((item) => item.grade === grade)])
    : domains.map((domain) => [domain, matches.filter((item) => item.domain === domain)])
  return <>
    <div className="page-heading"><p className="eyebrow">{label}</p><h1>Curriculum</h1><p>{scope === 'grade5'
      ? 'Study the Grade 5 topics. Each lesson links to its prerequisite concepts.'
      : scope === 'foundations' ? 'Review the earlier concepts you need for Grade 5.'
        : 'Explore the cumulative syllabus by topic or grade.'}</p></div>
    <div className="filter-row"><StudyScopeNav scope={scope} page="curriculum" />
      {scope !== 'grade5' && <div className="segmented" role="group" aria-label="Group objectives"><button aria-pressed={!byGrade} onClick={() => setByGrade(false)}>By domain</button><button aria-pressed={byGrade} onClick={() => setByGrade(true)}>By grade</button></div>}
      <label className="search-label"><span className="sr-only">Search objectives</span><input type="search" placeholder="Search objectives" value={query} onChange={(e) => setQuery(e.target.value)} /></label></div>
    {groups.map(([name, items]) => {
      if (!items.length) return null
      return <section key={name} className="panel curriculum-group">
        <div className="between"><h2>{name}</h2><span className="muted">{items.length} objectives</span></div>
        <ul>{items.map((item) => {
          const state = objectiveState(item.id, progress)
          return <li key={item.id} className="objective-row">
            <div><a href={`#/lesson/${item.id}`}>{item.title}</a>{chinese && <span lang="zh-Hans">{item.chineseTitle}</span>}</div>
            <small>Grade {item.grade} · {isAvailable(item.id) ? state.stage : 'Syllabus preview'}</small>
          </li>
        })}</ul>
      </section>
    })}
    {!matches.length && <p>No matching objectives.</p>}
  </>
}

export function Lesson({ objective, progress, chinese }: { objective: Objective; progress: Progress; chinese: boolean }) {
  const lesson = lessons[objective.id]
  const [confirmed, setConfirmed] = useState(false)
  const visited = progress.data.visits.some((visit) => visit.id === objective.id)
  const peers = available.filter((item) => item.domain === objective.domain)
  const next = peers[peers.findIndex((item) => item.id === objective.id) + 1]
  let visual
  if (lesson?.pitches) visual = <IntervalExplorer initial={lesson.pitches} />
  else if (objective.domain === 'Keys and scales') visual = <ScaleExplorer demo={lesson?.demo} />
  else if (objective.domain === 'Pitch and clefs' || objective.domain === 'Transposition') visual = <PitchExplorer demo={lesson?.demo} transposeMode={objective.domain === 'Transposition'} instrumentMode={objective.id === 'TRN-5-CONCERT'} />
  else if (objective.domain === 'Rhythm' || objective.domain === 'Metre and grouping') visual = <RhythmExplorer metre={objective.domain === 'Metre and grouping'} />
  else if (objective.domain === 'Triads and chords') visual = <HarmonyExplorer cadence={['HAR-5-PERFECT', 'HAR-5-PLAGAL', 'HAR-5-IMPERFECT', 'HAR-5-CHOICE'].includes(objective.id)} />
  else if (referenceIds.includes(objective.id)) visual = <ReferenceVisual objectiveId={objective.id} chinese={chinese} />
  else if (lesson?.stimulus || lesson?.demo) visual = <section className="panel"><h2>Score example</h2>{lesson.stimulus
    ? <ExamStimulus stimulus={lesson.stimulus} /> : <Staff {...lesson.demo} showNames />}</section>
  return <>
    <div className="page-heading"><p className="eyebrow">{objective.domain} · Grade {objective.grade}</p><h1>{objective.title}</h1>
      {chinese && <p className="subtitle" lang="zh-Hans">{objective.chineseTitle}</p>}
      {lesson && <p>{lesson.definition}</p>}
    </div>
    <div className="content-grid lesson-grid">
      <div className="stack">
        <section className="panel">
          <h2>{lesson ? 'The concept' : 'Syllabus preview'}</h2>
          {chinese && <p lang="zh-Hans">{lesson?.explanation ?? objective.chineseExplanation}</p>}
          {lesson && chinese && <>
            <h3>Worked example</h3><p lang="zh-Hans">{lesson.example}</p>
            <h3>Common mistake</h3><p lang="zh-Hans">{lesson.mistake}</p>
            <h3>Recall cue</h3><p lang="zh-Hans">{lesson.memory}</p>
          </>}
          {lesson && <><h3>Exam pattern</h3><p>{lesson.pattern}</p></>}
          <h3>Terminology</h3><div className="tags">{objective.terms.map((term) => <span key={term}>{term}</span>)}</div>
          <h3>Prerequisites</h3>
          {objective.prerequisites.length ? <ul>{objective.prerequisites.map((id) =>
            <li key={id}><a href={`#/lesson/${id}`}>{objectiveById.get(id)?.title ?? id}</a></li>)}</ul> : <p>Start here. No prior theory objective is required.</p>}
          <p className="source"><a href={`${objective.source.url}#page=${objective.source.pages[0]}`} target="_blank" rel="noreferrer">ABRSM specification, pp. {objective.source.pages.join(', ')}</a></p>
          {lesson && <div className="button-row"><button className="button secondary" disabled={visited || confirmed} onClick={() => { setConfirmed(true); void progress.save('visits', { id: objective.id, at: Date.now() }) }}><Icon name="check" size={17} />{visited || confirmed ? 'Lesson visited' : 'Mark lesson visited'}</button>
            {next && <a className="button secondary" href={`#/lesson/${next.id}`}>Next lesson</a>}</div>}
        </section>
      </div>
      {lesson && visual}
    </div>
    {lesson && <Quiz key={objective.id} progress={progress} objectiveId={objective.id} mode="lesson" />}
  </>
}

export function Notebook({ progress }: { progress: Progress }) {
  const mistakes = progress.data.attempts.filter((attempt) => !attempt.correct).sort((a, b) => b.at - a.at)
  const due = available.filter((objective) => objectiveState(objective.id, progress).due)
  return <>
    <div className="page-heading"><p className="eyebrow">Spaced repetition</p><h1>Mistake notebook</h1><p>Revisit the concept with a fresh question when your next review comes due.</p></div>
    <section className="panel"><h2>Due today</h2>{due.length
      ? <ul>{due.map((item) => <li key={item.id}><a href={`#/review/${item.id}`}>{item.title}</a></li>)}</ul>
      : <p>You're caught up on scheduled reviews.</p>}</section>
    <section className="panel"><h2>Past mistakes</h2>{mistakes.length === 0 && <p>Incorrect answers will appear here after practice.</p>}
      {mistakes.map((mistake) => {
        const objective = objectiveById.get(mistake.objectiveId)
        const state = objectiveState(mistake.objectiveId, progress)
        const cause = progress.data.annotations.find((item) => item.id === mistake.id)?.cause ?? ''
        return <details key={mistake.id} className="notebook-row">
          <summary><strong>{objective?.title ?? 'Vocabulary'}</strong><span>{new Date(mistake.at).toLocaleDateString()}</span></summary>
          <p>{mistake.stem}</p>
          {(mistake.question as Grade5Question | undefined)?.stimulus && <ExamStimulus stimulus={(mistake.question as Grade5Question).stimulus} />}
          {mistake.question?.notation && <Staff {...mistake.question.notation} showClefName={false} />}
          <dl className="overview-list"><div><dt>Your answer</dt><dd>{mistake.answer}</dd></div><div><dt>Correct answer</dt><dd>{mistake.correctAnswer}</dd></div>
            <div><dt>Question seed</dt><dd>{mistake.seed}</dd></div><div><dt>Time spent</dt><dd>{Math.round(mistake.durationMs / 1000)} s</dd></div>
            <div><dt>Vocabulary assistance</dt><dd>{mistake.assisted ? 'Used' : 'None'}</dd></div>
            <div><dt>Next review</dt><dd>{state.schedule.dueAt === null ? 'None' : new Date(state.schedule.dueAt).toLocaleDateString()}</dd></div>
          </dl>
          <p lang="zh-Hans">{mistake.explanationZh}</p>
          {mistake.choices?.length ? <ul>{mistake.choices.map((choice) => <li key={choice.label}><strong>{choice.label}</strong> <span lang="zh-Hans">{choice.explanationZh}</span></li>)}</ul> : null}
          <label className="cause-label">Likely cause<select value={cause} onChange={(e) => void progress.save('annotations', { id: mistake.id, cause: e.target.value as typeof cause, at: Date.now() })}>
            <option value="">Unclassified</option>{mistakeCauses.map((label) => <option key={label}>{label}</option>)}</select></label>
          {state.schedule.history.length > 0 && <p>Previous reviews · {state.schedule.history.map((review) => `${new Date(review.at).toLocaleDateString()} ${review.correct ? 'correct' : 'incorrect'}`).join(' · ')}</p>}
          {objective && isAvailable(objective.id) && <div className="button-row"><a className="button secondary" href={`#/lesson/${objective.id}`}>Open lesson</a><a className="button primary" href={`#/review/${objective.id}`}>Try a fresh question</a></div>}
        </details>
      })}
    </section>
  </>
}

export function PracticePage({ objective, progress, review = false, scope = 'grade5' }: { objective?: Objective; progress: Progress; review?: boolean; scope?: StudyScope }) {
  if (!objective || !isAvailable(objective.id)) return <>
    <div className="page-heading"><p className="eyebrow">English assessment</p><h1>Practice</h1><p>Choose an objective to start an original question.</p></div>
    <div className="filter-row"><StudyScopeNav scope={scope} page="practice" /></div>
    <section className="panel"><h2>Available objectives</h2><ul className="marks-list">{available.filter((item) => inScope(item, scope)).map((item) => <li key={item.id}><a href={`#/practice/${item.id}`}>{item.title}</a><span>Grade {item.grade}</span></li>)}</ul></section>
  </>
  const state = objectiveState(objective.id, progress)
  return <>
    <div className="page-heading"><p className="eyebrow">{review ? 'Spaced review' : 'Practice mode'} · Grade {objective.grade}</p><h1>{objective.title}</h1><p>{state.stage} · {state.distinct} distinct independent questions</p></div>
    <Quiz key={`${objective.id}:${review}`} objectiveId={objective.id} progress={progress} mode={review ? 'review' : 'practice'} />
  </>
}

export function Diagnostic({ progress }: { progress: Progress }) {
  const [full, setFull] = useState(false)
  const [queue, setQueue] = useState<Objective[]>([])
  const [results, setResults] = useState<Attempt[]>([])
  const initial = domains.flatMap((domain) => {
    const related = available.filter((item) => item.domain === domain)
    if (!related.length) return []
    if (related.length === 1) return related
    const first = related.find((item) => objectiveState(item.id, progress).stage !== 'Mastered')
    const last = [...related].reverse().find((item) => objectiveState(item.id, progress).stage !== 'Mastered')
    return first && last && first.id !== last.id ? [first, last] : first ? [first] : []
  })
  const sampled = full ? available : initial.length ? initial : available
  const finished = queue.length > 0 && results.length >= queue.length
  const recommendations = [...new Set(results.filter((attempt) => !attempt.correct || attempt.assisted)
    .flatMap((attempt) => {
      const objective = objectiveById.get(attempt.objectiveId)
      const unmet = objective?.prerequisites.filter((id) => isAvailable(id) && objectiveState(id, progress).stage !== 'Mastered') ?? []
      return [...unmet, attempt.objectiveId]
    }))]
  return <>
    <div className="page-heading"><p className="eyebrow">Learning path</p><h1>Curriculum diagnostic</h1><p>Find which skills to study first across Grades 1 to 5.</p></div>
    {!queue.length ? <section className="panel"><h2>Check your starting point</h2><p>Get a broad starting point with {initial.length || available.length} questions, or sample all {available.length} available objectives.</p>
      <label className="checkbox-label"><input type="checkbox" checked={full} onChange={(e) => setFull(e.target.checked)} /> Include every objective</label>
      <button className="button primary" onClick={() => setQueue(sampled)}>Start diagnostic</button></section>
      : finished
        ? <section className="panel"><h2>{results.filter((item) => item.correct).length} of {results.length} correct</h2>
          <h3>Recommended next lessons</h3>
          {recommendations.length ? <ul>{recommendations.slice(0, 15).map((id) => <li key={id}><a href={`#/lesson/${id}`}>{objectiveById.get(id)?.title}</a></li>)}</ul>
            : <p>Start independent practice on an objective you want to retain.</p>}
          <a className="button primary" href="#/curriculum">Browse the curriculum</a>
        </section>
        : <><p>Question {results.length + 1} of {queue.length}</p><Quiz key={results.length} progress={progress} objectiveId={queue[results.length].id} mode="diagnostic" onNext={(attempt) => setResults([...results, attempt])} /></>}
  </>
}
