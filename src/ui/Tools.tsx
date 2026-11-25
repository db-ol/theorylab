import { useState, type FormEvent, type ReactNode } from 'react'
import { glossary } from '../curriculum/glossary'
import { defaultSettings, summarizeObjective, type Attempt } from '../learning/progress'
import { createRandom } from '../questions'
import type { ImportSummary } from '../storage/progress'
import { useInterfaceLanguage } from './interfaceLanguage'
import { newSeed } from './Practice'
import type { Progress } from './useProgress'

export function Vocabulary({ progress, train = false }: { progress: Progress; train?: boolean }) {
  const { t } = useInterfaceLanguage()
  const [query, setQuery] = useState('')
  const entries = glossary.filter((term) => [term.english, term.chinese, term.american, term.definition, ...(term.aliases ?? [])].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  return <>
    <div className="page-heading"><p className="eyebrow">{t('English examination language', '英文考试用语')}</p>
      <h1>{train ? t('Vocabulary trainer', '词汇训练') : t('Glossary', '术语表')}</h1>
      <p>{t('Study British music terminology and the language of exam questions.', '学习英式音乐术语和考题常用表达。', false)}</p></div>
    <div className="button-row"><a className={`button ${train ? 'secondary' : 'primary'}`} href="#/glossary">{t('Search glossary', '查找术语')}</a>
      <a className={`button ${train ? 'primary' : 'secondary'}`} href="#/vocabulary">{t('Train vocabulary', '练习词汇')}</a></div>
    {train ? <VocabularyDrill progress={progress} /> : <section className="panel glossary">
      <label>{t('Search English, Chinese or American equivalents', '搜索英文术语、中文含义或美式说法')}
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Try crotchet or 四分音符', '例如 crotchet 或四分音符', false)} /></label>
      <dl>{entries.map((term) => <div key={term.english}><dt><span lang="en">{term.english}</span> <span lang="zh-Hans">{term.chinese}</span></dt>
        <dd><span lang="en">{term.definition}</span>
          {term.american && <small>{t('American English', '美式英语')} <span lang="en">{term.american}</span></small>}
          {term.aliases?.length ? <small>{t('Also written', '其他写法')} <span lang="en">{term.aliases.join(', ')}</span></small> : null}
          {term.example && <small lang="en">{term.example}</small>}
        </dd></div>)}</dl>
      {!entries.length && <p>{t('No matching terms.', '没有找到匹配的术语。')}</p>}
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
  const { t } = useInterfaceLanguage()
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
    <p className="eyebrow">{t(`${mastered} / ${glossary.length} terms provisionally mastered or mastered`,
      `${glossary.length} 个术语中，已有 ${mastered} 个达到“初步掌握”或“已掌握”`, false)}</p>
    <h2 lang="en">{stem}</h2>
    <p className="vocab-prompt" lang={mode === 'recall' ? 'zh-Hans' : 'en'}>{mode === 'recall' ? term.chinese : mode === 'definition' ? term.definition : term.english}</p>
    <form onSubmit={submit}>
      {mode === 'recognition' ? <fieldset className="option-list" disabled={Boolean(attempt)}>
        <legend className="sr-only">{t('Answer options', '答题选项')}</legend>{choices.map((choice) => <label key={choice} className={answer === choice ? 'selected' : ''}>
          <input type="radio" name="vocabulary" checked={answer === choice} onChange={() => setAnswer(choice)} /><span lang="zh-Hans">{choice}</span></label>)}
      </fieldset> : <label>{t('Your answer', '你的答案')}<input value={answer} onChange={(e) => setAnswer(e.target.value)} autoComplete="off" disabled={Boolean(attempt)} /></label>}
      {!attempt && <button className="button primary" disabled={!answer.trim()}>{t('Check answer', '核对答案')}</button>}
    </form>
    {attempt && <section className={`feedback ${attempt.correct ? 'correct' : 'incorrect'}`} aria-live="polite">
      <h3>{attempt.correct ? t('Correct', '答对了') : t('Review this term', '复习这个术语')}</h3>
      <p lang="zh-Hans">{explanationZh}</p><p lang="en">{term.definition}</p>
      {term.american && <p>{t('American English', '美式英语')} <span lang="en">{term.american}</span></p>}{term.example && <p lang="en">{term.example}</p>}
      <button className="button primary" onClick={() => { setQuestion(vocabularyQuestion(newSeed())); setAnswer(''); setAttempt(undefined); setStartedAt(Date.now()) }}>{t('Next term', '下一个词')}</button>
    </section>}
  </section>
}

export function Settings({ progress, languagePreferences }: { progress: Progress; languagePreferences?: ReactNode }) {
  const { t } = useInterfaceLanguage()
  const settings = progress.data.settings[0]?.value ?? defaultSettings
  const [message, setMessage] = useState<'saved' | 'downloaded' | 'unreadable' | ImportSummary>()
  const [transfer, setTransfer] = useState<'export' | 'import' | null>(null)
  const setup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const saved = await progress.save('settings', { id: 'mastery', value: {
      minDistinct: Number(form.get('distinct')), minAccuracy: Number(form.get('accuracy')) / 100, minVariants: Number(form.get('variants')),
    } })
    setMessage(saved ? 'saved' : undefined)
  }
  const download = async () => {
    setTransfer('export')
    setMessage(undefined)
    try {
      if (await progress.download()) setMessage('downloaded')
    } finally {
      setTransfer(null)
    }
  }
  const importBackup = async (file: File) => {
    setTransfer('import')
    setMessage(undefined)
    try {
      const summary = await progress.restore(await file.text())
      if (summary) setMessage(summary)
    } catch {
      setMessage('unreadable')
    } finally {
      setTransfer(null)
    }
  }
  const messages = {
    saved: t('Mastery settings saved.', '已保存掌握标准。'),
    downloaded: t('Backup download started.', '已开始下载备份。'),
    unreadable: t('This file could not be read. Choose a TheoryLab JSON backup in Files or Downloads.',
      '无法读取此文件。请在“文件”或“下载”中选择 TheoryLab 的 JSON 备份。', false),
  }
  const status = message && (typeof message === 'string' ? messages[message]
    : t(`Import complete. Added ${message.added}, updated ${message.updated}, skipped ${message.unchanged} matching records and kept ${message.keptLocal} local records.`,
      `导入完成。新增 ${message.added} 条，更新 ${message.updated} 条，跳过 ${message.unchanged} 条相同记录，并保留 ${message.keptLocal} 条本机记录。`, false))
  return <>
    <div className="page-heading"><p className="eyebrow">{t('This device', '本机')}</p><h1>{t('Settings', '设置')}</h1>
      <p>{t('Your learning records are stored in this browser.', '学习记录保存在当前浏览器中。', false)}</p></div>
    <div className="content-grid">
      {languagePreferences}
      <section className="panel"><h2>{t('Mastery criteria', '掌握标准')}</h2><form className="settings-form" onSubmit={setup} key={JSON.stringify(settings)}>
        <label>{t('Distinct independent questions', '独立作答的不同题目数')}<input type="number" name="distinct" min="1" max="1000" defaultValue={settings.minDistinct} required/></label>
        <label>{t('Minimum accuracy (%)', '最低正确率（%）')}<input type="number" name="accuracy" min="1" max="100" defaultValue={settings.minAccuracy * 100} required/></label>
        <label>{t('Successful variants', '答对的题型变体数')}<input type="number" name="variants" min="1" max="5" defaultValue={settings.minVariants} required/></label>
        <button className="button primary" disabled={!progress.ready}>{t('Save criteria', '保存标准')}</button>
      </form><p>{t('Delayed review remains part of mastery.', '达到掌握标准还需通过间隔复习。', false)}</p></section>
      <section className="panel" aria-busy={transfer !== null}><h2>{t('Progress backup', '学习进度备份')}</h2>
        <p>{t('Use a JSON backup to move lessons, practice history and exam results between browsers.', '使用 JSON 备份在浏览器之间转移课程进度、练习记录和考试结果。', false)}</p>
        <ol>
          <li>{t('On the first device, download a dated backup. On iPhone or iPad, find the download in Files and move it to iCloud Drive or another folder both devices can access.',
            '在第一台设备上下载带日期的备份。如果使用 iPhone 或 iPad，请在“文件”中找到下载的备份，然后将它移到 iCloud Drive 或两台设备都能访问的其他文件夹。', false)}</li>
          <li>{t('On the second device, download a backup of its own progress. Then choose Import progress and select the first device’s file.',
            '先备份第二台设备上的学习进度。然后选择“导入进度”，选中第一台设备的备份文件。', false)}</li>
          <li>{t('To move the combined history back to the first device, export a new backup from the second device and import it on the first.',
            '如果要把合并后的记录带回第一台设备，请在第二台设备上导出新备份，再到第一台设备导入。', false)}</li>
        </ol>
        <p>{t('Imports merge learning records and keep this device’s saved mastery settings. Use one device at a time for a timed exam. Its original countdown continues during transfer.',
          '导入会合并学习记录，并保留本机已保存的掌握标准。同一场计时考试请每次只用一台设备作答。转移期间，原倒计时仍会继续。', false)}</p>
        <button className="button secondary" disabled={!progress.ready || transfer !== null} onClick={() => { void download() }}>
          {transfer === 'export' ? t('Preparing backup', '正在准备备份') : t('Export progress', '导出进度')}</button>
        <label className="import-label">{transfer === 'import' ? t('Importing progress', '正在导入进度') : t('Import progress', '导入进度')}<input type="file" accept=".json,application/json" disabled={!progress.ready || transfer !== null} onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (file) void importBackup(file)
        }}/></label></section>
    </div>
    {status && <p role="status">{status}</p>}
  </>
}
