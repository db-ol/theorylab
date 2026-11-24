import { useState, type FormEvent } from 'react'
import { glossary } from '../curriculum/glossary'
import { defaultSettings, summarizeObjective, type Attempt } from '../learning/progress'
import { createRandom } from '../questions'
import { newSeed } from './Practice'
import type { Progress } from './useProgress'

export function Vocabulary({ progress, train = false }: { progress: Progress; train?: boolean }) {
  const [query, setQuery] = useState('')
  const entries = glossary.filter((term) => [term.english, term.chinese, term.american, term.definition, ...(term.aliases ?? [])].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  return <>
    <div className="page-heading"><p className="eyebrow">English examination language</p><h1>{train ? 'Vocabulary trainer' : 'Glossary'}</h1><p>Study British music terminology and the language of exam questions.</p></div>
    <div className="button-row"><a className={`button ${train ? 'secondary' : 'primary'}`} href="#/glossary">Search glossary</a>
      <a className={`button ${train ? 'primary' : 'secondary'}`} href="#/vocabulary">Train vocabulary</a></div>
    {train ? <VocabularyDrill progress={progress} /> : <section className="panel glossary">
      <label>Search English, Chinese or American equivalents<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try crotchet or 四分音符" /></label>
      <dl>{entries.map((term) => <div key={term.english}><dt>{term.english} <span lang="zh-Hans">{term.chinese}</span></dt>
        <dd>{term.definition}{term.american && <small>American English · {term.american}</small>}{term.aliases?.length ? <small>Also written · {term.aliases.join(', ')}</small> : null}{term.example && <small>{term.example}</small>}</dd></div>)}</dl>
      {!entries.length && <p>No matching terms.</p>}
    </section>}
  </>
}

function vocabularyQuestion(seed: number) {
  const random = createRandom(seed)
  const term = random.pick(glossary)
  const sameMeaning = glossary.filter((item) => item !== term && item.chinese === term.chinese)
  const mode = random.pick(['recall', 'recognition', 'definition'] as const)
  const meanings = [...new Set(glossary.map((item) => item.chinese).filter((meaning) => meaning !== term.chinese))]
  const others = random.shuffle(meanings).slice(0, 3)
  return { term, seed, mode, sameMeaning, choices: random.shuffle([term.chinese, ...others]) }
}

function VocabularyDrill({ progress }: { progress: Progress }) {
  const [question, setQuestion] = useState(() => vocabularyQuestion(newSeed()))
  const [answer, setAnswer] = useState('')
  const [attempt, setAttempt] = useState<Attempt>()
  const [startedAt, setStartedAt] = useState(Date.now)
  const { term, mode, seed, choices, sameMeaning } = question
  const previous = progress.data.attempts.filter((item) => item.mode === 'vocabulary')
  const mastered = glossary.filter((item) => {
    const attempts = previous.filter((entry) => entry.objectiveId === `VOC:${item.english}`)
    return ['Mastered', 'Provisionally mastered'].includes(summarizeObjective(attempts, false, Date.now(), { minDistinct: 2, minAccuracy: 0.9, minVariants: 2 }).stage)
  }).length
  const correctAnswer = mode === 'recognition' ? term.chinese : term.english
  const stem = mode === 'recall' ? 'Type the British English term.' : mode === 'definition' ? 'Which term matches this definition?' : 'Select the Chinese meaning.'
  const sameDefinition = glossary.filter((item) => item.definition.toLowerCase() === term.definition.toLowerCase())
  const accepted = mode === 'recognition' ? [term.chinese] : mode === 'recall'
    ? [term, ...sameMeaning].flatMap((item) => [item.english, ...(item.aliases ?? [])])
    : sameDefinition.flatMap((item) => [item.english, ...(item.aliases ?? [])])
  const explanationZh = `${term.english} 的含义是“${term.chinese}”。${accepted.length > 1 ? `也接受这些写法：${accepted.filter((item) => item !== term.english).join('、')}。` : ''}`
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!answer.trim() || attempt) return
    const at = Date.now()
    const entry: Attempt = { id: crypto.randomUUID(), objectiveId: `VOC:${term.english}`, questionId: `voc:${seed}`,
      contentKey: `${term.english}:${mode}`, seed, variant: mode, stem, answer: answer.trim(), correctAnswer, explanationZh,
      correct: accepted.some((item) => item.toLowerCase() === answer.trim().toLowerCase()), assisted: false, mode: 'vocabulary', at, durationMs: at - startedAt }
    setAttempt(entry)
    void progress.save('attempts', entry)
  }
  return <section className="panel quiz">
    <p className="eyebrow">{mastered} / {glossary.length} terms provisionally mastered or mastered</p>
    <h2>{stem}</h2>
    <p className="vocab-prompt" lang={mode === 'recall' ? 'zh-Hans' : 'en'}>{mode === 'recall' ? term.chinese : mode === 'definition' ? term.definition : term.english}</p>
    <form onSubmit={submit}>
      {mode === 'recognition' ? <fieldset className="option-list" disabled={Boolean(attempt)}>
        <legend className="sr-only">Answer options</legend>{choices.map((choice) => <label key={choice} className={answer === choice ? 'selected' : ''}>
          <input type="radio" name="vocabulary" checked={answer === choice} onChange={() => setAnswer(choice)} /><span lang="zh-Hans">{choice}</span></label>)}
      </fieldset> : <label>Your answer<input value={answer} onChange={(e) => setAnswer(e.target.value)} autoComplete="off" disabled={Boolean(attempt)} /></label>}
      {!attempt && <button className="button primary" disabled={!answer.trim()}>Check answer</button>}
    </form>
    {attempt && <section className={`feedback ${attempt.correct ? 'correct' : 'incorrect'}`} aria-live="polite">
      <h3>{attempt.correct ? 'Correct' : 'Review this term'}</h3>
      <p lang="zh-Hans">{explanationZh}</p><p>{term.definition}</p>
      {term.american && <p>American English · {term.american}</p>}{term.example && <p>{term.example}</p>}
      <button className="button primary" onClick={() => { setQuestion(vocabularyQuestion(newSeed())); setAnswer(''); setAttempt(undefined); setStartedAt(Date.now()) }}>Next term</button>
    </section>}
  </section>
}

export function Settings({ progress }: { progress: Progress }) {
  const settings = progress.data.settings[0]?.value ?? defaultSettings
  const [message, setMessage] = useState('')
  const setup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void progress.save('settings', { id: 'mastery', value: {
      minDistinct: Number(form.get('distinct')), minAccuracy: Number(form.get('accuracy')) / 100, minVariants: Number(form.get('variants')),
    } })
    setMessage('Mastery settings saved.')
  }
  return <>
    <div className="page-heading"><p className="eyebrow">This device</p><h1>Settings</h1><p>Your learning records are stored in this browser.</p></div>
    <div className="content-grid">
      <section className="panel"><h2>Mastery criteria</h2><form className="settings-form" onSubmit={setup} key={JSON.stringify(settings)}>
        <label>Distinct independent questions<input type="number" name="distinct" min="1" max="1000" defaultValue={settings.minDistinct} required/></label>
        <label>Minimum accuracy (%)<input type="number" name="accuracy" min="1" max="100" defaultValue={settings.minAccuracy * 100} required/></label>
        <label>Successful variants<input type="number" name="variants" min="1" max="5" defaultValue={settings.minVariants} required/></label>
        <button className="button primary">Save criteria</button>
      </form><p>Delayed review remains part of mastery.</p></section>
      <section className="panel"><h2>Progress backup</h2><p>Export your records as JSON or merge a backup from another browser.</p>
        <button className="button secondary" disabled={!progress.ready} onClick={progress.download}>Export progress</button>
        <label className="import-label">Import progress<input type="file" accept=".json,application/json" onChange={async (event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (file) setMessage(await progress.restore(await file.text()) ? 'Progress imported.' : '')
        }}/></label></section>
    </div>
    {message && <p role="status">{message}</p>}
  </>
}
