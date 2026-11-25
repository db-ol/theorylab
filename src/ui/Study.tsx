import { useRef, useState } from 'react'
import { isAvailable, lessons } from '../curriculum/learningContent'
import { objectives, type Grade, type Objective } from '../curriculum/objectives'
import { accuracy, defaultSettings, localStreak, mistakeCauses, summarizeObjective, type Attempt, type MasteryStage } from '../learning/progress'
import { Icon } from './Icon'
import { IntervalExplorer } from './IntervalExplorer'
import { HarmonyExplorer, PitchExplorer, RhythmExplorer, ScaleExplorer } from './MusicExplorers'
import { ExamStimulus } from './ExamStimulus'
import { ReferenceVisual } from './ReferenceVisual'
import { referenceIds } from '../curriculum/referenceLessons'
import { LessonCheck, Quiz } from './Practice'
import { Staff } from './Notation'
import { parsePitch } from '../theory'
import type { Progress } from './useProgress'
import { useInterfaceLanguage, type TranslateInterface } from './interfaceLanguage'

export const objectiveById = new Map(objectives.map((objective) => [objective.id, objective]))
const available = objectives.filter((objective) => isAvailable(objective.id))
const domains = [...new Set(objectives.map((objective) => objective.domain))]
const grade5 = available.filter((objective) => objective.grade === 5)
const intervalDemo = ['C4', 'E4', 'G4'].map(parsePitch)

export type StudyScope = 'grade5' | 'foundations' | 'all'

const studyScopes = {
  grade5: { label: 'Grade 5', chinese: '五级', path: '' },
  foundations: { label: 'Grades 1 to 4', chinese: '一至四级', path: '/foundations' },
  all: { label: 'All grades', chinese: '所有级别', path: '/all' },
} satisfies Record<StudyScope, { label: string; chinese: string; path: string }>

const gradeNames: Record<Grade, string> = { 1: '一级', 2: '二级', 3: '三级', 4: '四级', 5: '五级' }

const domainNames: Record<string, string> = {
  Rhythm: '节奏',
  'Metre and grouping': '节拍与节奏分组',
  'Pitch and clefs': '音高与谱号',
  'Keys and scales': '调与音阶',
  Intervals: '音程',
  'Triads and chords': '三和弦与和弦',
  Transposition: '移调',
  'Terms and signs': '术语与记号',
  Ornaments: '装饰音',
  'Instruments and voices': '乐器与人声',
  'Music in context': '乐谱综合分析',
}

const stageNames: Record<MasteryStage, string> = {
  'Not started': '尚未开始',
  Learning: '学习中',
  Practicing: '练习中',
  'Provisionally mastered': '初步掌握',
  Mastered: '已掌握',
  'Needs review': '待复习',
}

const causeNames: Record<typeof mistakeCauses[number], string> = {
  'Missing theoretical knowledge': '理论知识不熟',
  'Misunderstood English terminology': '误解英文术语',
  'Misread musical notation': '误读乐谱',
  'Calculation error': '计算错误',
  'Careless mistake': '粗心失误',
  'Time pressure': '时间紧张',
}

function gradeLabel(t: TranslateInterface, grade: Grade) {
  return t(`Grade ${grade}`, gradeNames[grade])
}

function domainLabel(t: TranslateInterface, domain: string) {
  return domainNames[domain] ? t(domain, domainNames[domain]) : domain
}

function accuracyLabel(t: TranslateInterface, value: number | null) {
  return value === null ? t('No data', '暂无数据', false) : `${Math.round(value * 100)}%`
}

function inScope(objective: Objective, scope: StudyScope) {
  return scope === 'all' || (scope === 'grade5' ? objective.grade === 5 : objective.grade < 5)
}

function StudyScopeNav({ scope, page }: { scope: StudyScope; page: 'curriculum' | 'practice' }) {
  const { t } = useInterfaceLanguage()
  return <nav className="segmented scope-nav" aria-label={t('Study level', '学习级别')}>
    {Object.entries(studyScopes).map(([id, { label, chinese, path }]) => <a key={id} href={`#/${page}${path}`} aria-current={scope === id ? 'page' : undefined}>{t(label, chinese)}</a>)}
  </nav>
}

function objectiveState(id: string, progress: Progress) {
  return summarizeObjective(progress.data.attempts.filter((item) => item.objectiveId === id),
    progress.data.visits.some((visit) => visit.id === id), Date.now(), progress.data.settings[0]?.value ?? defaultSettings)
}

function ProgressStat({ label, count, total, icon }: { label: string; count: number; total: number; icon: 'book' | 'target' }) {
  const { t } = useInterfaceLanguage()
  return <div className="stat progress-stat">
    <Icon name={icon}/><span>{label}</span>
    <strong>{accuracyLabel(t, count / total)}</strong>
    <small>{t(`${count} of ${total}`, `${count}／${total}`, false)}</small>
    <progress value={count} max={total} aria-label={label} aria-valuetext={t(`${count} of ${total}`, `共 ${total} 项，已完成 ${count} 项`, false)}/>
  </div>
}

export function Dashboard({ progress }: { progress: Progress }) {
  const { t, language } = useInterfaceLanguage()
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
  const streak = localStreak(progress.data.attempts, Date.now())
  return <>
    <section className="hero">
      <div className="hero-content">
        <h1 lang={language === 'zh' ? 'zh-Hans' : 'en'}>{language === 'zh' ? '五级乐理' : <>Grade 5<br/>Music Theory</>}</h1>
        <p>{language === 'bilingual' && <><span lang="zh-Hans">五级乐理</span><br/></>}<span lang={language === 'zh' ? 'zh-Hans' : 'en'}>{t('Study in Chinese and practise in English for the ABRSM exam.', '用中文学乐理，用英文练习，备考 ABRSM。', false)}</span></p>
        <div className="button-row">
          <a href={`#/lesson/${next.id}`} className="button hero-button">{visited ? t('Continue Grade 5', '继续学习五级') : t('Start Grade 5', '开始学习五级')}</a>
          <a href="#/curriculum/foundations" className="hero-link">{t('Review foundations', '复习基础知识')}</a>
        </div>
      </div>
      <div className="hero-art" aria-hidden="true"><Staff pitches={intervalDemo} showClefName={false} /><div className="hero-art-notes"><span>C</span><span>E</span><span>G</span></div></div>
    </section>
    <div className="stats-grid">
      <ProgressStat label={t('Grade 5 lessons studied', '五级已学课程')} icon="book" count={visited} total={grade5.length} />
      <ProgressStat label={t('Grade 5 objectives mastered', '五级已掌握目标')} icon="target" count={mastered} total={grade5.length} />
      <div className="stat"><Icon name="pulse"/><span>{t('Grade 5 independent accuracy', '五级独立答题正确率')}</span><strong>{accuracyLabel(t, accuracy(grade5Attempts.filter((item) => !item.assisted)))}</strong></div>
      <div className="stat"><Icon name="review"/><span>{t('Reviews due', '待复习')}</span><strong>{due.length}</strong></div>
    </div>
    <div className="content-grid">
      <section className="panel study-plan">
        <div className="between"><h2>{t('Study today', '今日学习')}</h2><a href="#/curriculum">{t('View curriculum', '查看课程')}</a></div>
        {due.length > 0 && <a className="plan-row" href={`#/review/${due[0].id}`}><Icon name="review" /><span><strong lang="en">{due[0].title}</strong><small>{t(`Spaced review · ${due.length} due`, `间隔复习，待复习 ${due.length} 项`)}</small></span></a>}
        <a className="plan-row" href={`#/lesson/${next.id}`}><Icon name="book"/><span><strong lang="en">{next.title}</strong><small>{t(`Lesson · Grade ${next.grade}`, `${gradeNames[next.grade]}课程`)}</small></span></a>
        <a className="plan-row" href="#/diagnostic"><Icon name="target"/><span><strong>{t('Curriculum diagnostic', '课程诊断')}</strong><small>{t('Check your starting point', '了解当前水平')}</small></span></a>
        <a className="plan-row" href="#/vocabulary"><Icon name="glossary"/><span><strong>{t('Exam vocabulary', '考试词汇')}</strong><small>{t('Recall and recognition', '回忆与辨认')}</small></span></a>
      </section>
      <section className="panel">
        <h2>{t('Grade 5 mastery by topic', '五级各主题掌握情况')}</h2>
        <p>{t('Mastery requires independent practice and a successful delayed review.', '要达到掌握标准，需要独立练习，并在间隔一段时间后通过复习。', false)}</p>
        <dl className="overview-list">
          {domains.map((domain) => {
            const items = grade5.filter((objective) => objective.domain === domain)
            if (!items.length) return null
            const count = items.filter((item) => states.get(item.id)?.stage === 'Mastered').length
            const mastery = Math.round(count * 100 / items.length)
            return <div key={domain}><dt>{domainLabel(t, domain)}</dt><dd>{t(`${mastery}% mastered`, `已掌握 ${mastery}%`, false)}</dd></div>
          })}
        </dl>
        <p>{t(`Syllabus coverage across all grades · ${available.length} of ${objectives.length} objectives available.`, `全部级别的大纲共有 ${objectives.length} 项学习目标，已开放 ${available.length} 项。`, false)}</p>
      </section>
    </div>
    <div className="content-grid">
      <section className="panel"><h2>{t('Study activity', '学习记录')}</h2><dl className="overview-list">
        <div><dt>{t('Current streak', '连续学习')}</dt><dd>{t(`${streak} days`, `${streak} 天`, false)}</dd></div>
        <div><dt>{t('Assessment time', '测评用时')}</dt><dd>{t(`${minutes} min`, `${minutes} 分钟`, false)}</dd></div>
        <div><dt>{t('English assessment accuracy', '英文测评正确率')}</dt><dd>{accuracyLabel(t, accuracy(domainAttempts))}</dd></div>
        <div><dt>{t('Vocabulary accuracy', '词汇练习正确率')}</dt><dd>{accuracyLabel(t, accuracy(vocabularyAttempts))}</dd></div>
        <div><dt>{t('Mock attempts submitted', '已提交模拟考试')}</dt><dd>{progress.data.exams.filter(({ value }) => typeof value === 'object' && value !== null && 'status' in value && value.status === 'submitted').length}</dd></div>
      </dl></section>
      <section className="panel"><h2>{t('Grade 5 practice priorities', '五级重点练习')}</h2>{weakest.length ? <ul className="marks-list">{weakest.slice(0, 5).map((item) =>
        <li key={item.id}><a href={`#/practice/${item.id}`} lang="en">{item.title}</a><strong>{accuracyLabel(t, independentAccuracy(item))}</strong></li>)}</ul>
        : <p>{t('Independent Grade 5 practice will show where to focus next.', '独立完成五级练习后，这里会显示需要加强的主题。', false)}</p>}</section>
    </div>
  </>
}

export function Curriculum({ progress, chinese, scope = 'grade5' }: { progress: Progress; chinese: boolean; scope?: StudyScope }) {
  const { t } = useInterfaceLanguage()
  const [byGrade, setByGrade] = useState(false)
  const [query, setQuery] = useState('')
  const scoped = objectives.filter((item) => inScope(item, scope))
  const matches = scoped.filter((item) => [item.title, item.chineseTitle, item.id, ...item.terms].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  const states = new Map(scoped.map((item) => [item.id, objectiveState(item.id, progress)]))
  const studied = new Set(progress.data.visits.map((visit) => visit.id))
  const label = studyScopes[scope]
  const groups = scope !== 'grade5' && byGrade
    ? ([1, 2, 3, 4, 5] as const).map((grade) => ({ key: grade, name: gradeLabel(t, grade), items: matches.filter((item) => item.grade === grade) }))
    : domains.map((domain) => ({ key: domain, name: domainLabel(t, domain), items: matches.filter((item) => item.domain === domain) }))
  return <>
    <div className="page-heading"><p className="eyebrow">{t(label.label, label.chinese)}</p><h1>{t('Curriculum', '课程')}</h1><p>{scope === 'grade5'
      ? t('Study the Grade 5 topics. Each lesson links to its prerequisite concepts.', '学习五级主题。每节课都提供所需基础知识的课程链接。', false)
      : scope === 'foundations' ? t('Review the earlier concepts you need for Grade 5.', '复习五级所需的一至四级基础知识。', false)
        : t('Explore the cumulative syllabus by topic or grade.', '按主题或级别浏览一至五级考试大纲。', false)}</p></div>
    <div className="filter-row"><StudyScopeNav scope={scope} page="curriculum" />
      {scope !== 'grade5' && <div className="segmented" role="group" aria-label={t('Group objectives', '学习目标分组')}><button aria-pressed={!byGrade} onClick={() => setByGrade(false)}>{t('By domain', '按主题')}</button><button aria-pressed={byGrade} onClick={() => setByGrade(true)}>{t('By grade', '按级别')}</button></div>}
      <label className="search-label"><span className="sr-only">{t('Search objectives', '搜索学习目标')}</span><input type="search" placeholder={t('Search objectives', '搜索学习目标')} value={query} onChange={(e) => setQuery(e.target.value)} /></label></div>
    <div className="curriculum-progress">
      <ProgressStat label={t(`${label.label} lessons studied`, `${label.chinese}已学课程`)} icon="book" count={scoped.filter((item) => studied.has(item.id)).length} total={scoped.length} />
      <ProgressStat label={t(`${label.label} objectives mastered`, `${label.chinese}已掌握目标`)} icon="target" count={scoped.filter((item) => states.get(item.id)?.stage === 'Mastered').length} total={scoped.length} />
    </div>
    {groups.map(({ key, name, items }) => {
      if (!items.length) return null
      return <section key={key} className="panel curriculum-group">
        <div className="between"><h2>{name}</h2><span className="muted">{t(`${items.length} objectives`, `${items.length} 项目标`, false)}</span></div>
        <ul>{items.map((item) => {
          const state = states.get(item.id)!
          const status = isAvailable(item.id) ? t(state.stage, stageNames[state.stage]) : t('Syllabus preview', '大纲预览')
          return <li key={item.id} className="objective-row">
            <div><a href={`#/lesson/${item.id}`} lang="en">{item.title}</a>{chinese && <span lang="zh-Hans">{item.chineseTitle}</span>}</div>
            <small>{gradeLabel(t, item.grade)} · {status}</small>
          </li>
        })}</ul>
      </section>
    })}
    {!matches.length && <p>{t('No matching objectives.', '没有找到符合条件的学习目标。', false)}</p>}
  </>
}

export function Lesson({ objective, progress, chinese }: { objective: Objective; progress: Progress; chinese: boolean }) {
  const { t } = useInterfaceLanguage()
  const lesson = lessons[objective.id]
  const [marking, setMarking] = useState(false)
  const visitPending = useRef(false)
  const visited = progress.data.visits.some((visit) => visit.id === objective.id)
  const markVisited = () => {
    if (visited || visitPending.current) return
    visitPending.current = true
    setMarking(true)
    void progress.save('visits', { id: objective.id, at: Date.now() }).finally(() => {
      visitPending.current = false
      setMarking(false)
    })
  }
  const peers = available.filter((item) => item.domain === objective.domain)
  const next = peers[peers.findIndex((item) => item.id === objective.id) + 1]
  let visual
  if (lesson?.pitches) visual = <IntervalExplorer initial={lesson.pitches} />
  else if (objective.domain === 'Keys and scales') visual = <ScaleExplorer demo={lesson?.demo} />
  else if (objective.domain === 'Pitch and clefs' || objective.domain === 'Transposition') visual = <PitchExplorer demo={lesson?.demo} transposeMode={objective.domain === 'Transposition'} instrumentMode={objective.id === 'TRN-5-CONCERT'} />
  else if (objective.domain === 'Rhythm' || objective.domain === 'Metre and grouping') {
    const tuplet = objective.id === 'RHY-2-TRIPLET' ? 'triplet' : objective.id === 'RHY-5-TUPLET' ? 'irregular' : undefined
    visual = <RhythmExplorer metre={objective.domain === 'Metre and grouping'} tuplet={tuplet} chinese={chinese} {...lesson?.metreExample} />
  }
  else if (objective.domain === 'Triads and chords') visual = <HarmonyExplorer cadence={['HAR-5-PERFECT', 'HAR-5-PLAGAL', 'HAR-5-IMPERFECT', 'HAR-5-CHOICE'].includes(objective.id)} />
  else if (referenceIds.includes(objective.id)) visual = <ReferenceVisual objectiveId={objective.id} chinese={chinese} />
  else if (lesson?.stimulus || lesson?.demo) visual = <section className="panel"><h2>{t('Score example', '乐谱示例')}</h2>{lesson.stimulus
    ? <ExamStimulus stimulus={lesson.stimulus} /> : <Staff {...lesson.demo} showNames />}</section>
  return <>
    <div className="page-heading"><p className="eyebrow">{domainLabel(t, objective.domain)} · {gradeLabel(t, objective.grade)}</p><h1 lang="en">{objective.title}</h1>
      {chinese && <p className="subtitle" lang="zh-Hans">{objective.chineseTitle}</p>}
      {lesson && <p lang="en">{lesson.definition}</p>}
    </div>
    <div className="content-grid lesson-grid">
      <div className="stack">
        <section className="panel">
          <h2>{lesson ? t('The concept', '概念讲解') : t('Syllabus preview', '大纲预览')}</h2>
          {chinese && <p lang="zh-Hans">{lesson?.explanation ?? objective.chineseExplanation}</p>}
          {lesson && chinese && <>
            <h3>{t('Worked example', '例题讲解')}</h3><p lang="zh-Hans">{lesson.example}</p>
            <h3>{t('Common mistake', '常见错误')}</h3><p lang="zh-Hans">{lesson.mistake}</p>
            <h3>{t('Recall cue', '记忆提示')}</h3><p lang="zh-Hans">{lesson.memory}</p>
          </>}
          {lesson && <><h3>{t('Exam pattern', '考试题型')}</h3><p lang="en">{lesson.pattern}</p></>}
          <h3>{t('Terminology', '英文术语')}</h3><div className="tags" lang="en">{objective.terms.map((term) => <span key={term}>{term}</span>)}</div>
          <h3>{t('Prerequisites', '先修知识')}</h3>
          {objective.prerequisites.length ? <ul>{objective.prerequisites.map((id) =>
            <li key={id}><a href={`#/lesson/${id}`} lang="en">{objectiveById.get(id)?.title ?? id}</a></li>)}</ul> : <p>{t('Start here. No prior theory objective is required.', '可以从这里开始，无需先学习其他乐理目标。', false)}</p>}
          <p className="source"><a href={`${objective.source.url}#page=${objective.source.pages[0]}`} target="_blank" rel="noreferrer">{t(`ABRSM specification, pp. ${objective.source.pages.join(', ')}`, `ABRSM 考试说明，第 ${objective.source.pages.join('、')} 页`, false)}</a></p>
          {lesson && <div className="button-row"><button className="button secondary" disabled={visited || marking} onClick={markVisited}><Icon name="check" size={17} />{visited ? t('Lesson visited', '已学本课') : marking ? t('Saving visit', '正在保存') : t('Mark lesson visited', '标记为已学')}</button>
            {next && <a className="button secondary" href={`#/lesson/${next.id}`}>{t('Next lesson', '下一课')}</a>}</div>}
        </section>
      </div>
      {lesson && visual}
    </div>
    {lesson && <LessonCheck key={objective.id} progress={progress} objectiveId={objective.id} onComplete={markVisited} />}
  </>
}

export function Notebook({ progress }: { progress: Progress }) {
  const { t, language } = useInterfaceLanguage()
  const mistakes = progress.data.attempts.filter((attempt) => !attempt.correct).sort((a, b) => b.at - a.at)
  const due = available.filter((objective) => objectiveState(objective.id, progress).due)
  const dateLabel = (at: number) => new Date(at).toLocaleDateString(language === 'zh' ? 'zh-Hans' : undefined)
  const causeLabel = t('Likely cause', '可能的错因')
  return <>
    <div className="page-heading"><p className="eyebrow">{t('Spaced repetition', '间隔复习')}</p><h1>{t('Mistake notebook', '错题本')}</h1><p>{t('Revisit the concept with a fresh question when your next review comes due.', '到了复习时间，用一道新题巩固同一个概念。', false)}</p></div>
    <section className="panel"><h2>{t('Due today', '今日待复习')}</h2>{due.length
      ? <ul>{due.map((item) => <li key={item.id}><a href={`#/review/${item.id}`} lang="en">{item.title}</a></li>)}</ul>
      : <p>{t("You're caught up on scheduled reviews.", '目前没有待复习的内容。', false)}</p>}</section>
    <section className="panel"><h2>{t('Past mistakes', '历史错题')}</h2>{mistakes.length === 0 && <p>{t('Incorrect answers will appear here after practice.', '练习中答错的题会记录在这里。', false)}</p>}
      {mistakes.map((mistake) => {
        const objective = objectiveById.get(mistake.objectiveId)
        const state = objectiveState(mistake.objectiveId, progress)
        const cause = progress.data.annotations.find((item) => item.id === mistake.id)?.cause ?? ''
        const assessmentLanguage = mistake.mode === 'vocabulary' ? undefined : 'en'
        const seconds = Math.round(mistake.durationMs / 1000)
        return <details key={mistake.id} className="notebook-row">
          <summary><strong lang={objective ? 'en' : undefined}>{objective?.title ?? t('Vocabulary', '词汇')}</strong><span>{dateLabel(mistake.at)}</span></summary>
          <p lang={assessmentLanguage}>{mistake.stem}</p>
          <ExamStimulus stimulus={mistake.question?.stimulus} />
          {mistake.question?.notation && <Staff {...mistake.question.notation} showClefName={false} />}
          <dl className="overview-list"><div><dt>{t('Your answer', '你的答案')}</dt><dd lang={assessmentLanguage}>{mistake.answer}</dd></div><div><dt>{t('Correct answer', '正确答案')}</dt><dd lang={assessmentLanguage}>{mistake.correctAnswer}</dd></div>
            <div><dt>{t('Question seed', '题目种子')}</dt><dd>{mistake.seed}</dd></div><div><dt>{t('Time spent', '答题用时')}</dt><dd>{t(`${seconds} s`, `${seconds} 秒`, false)}</dd></div>
            <div><dt>{t('Vocabulary assistance', '词汇辅助')}</dt><dd>{mistake.assisted ? t('Used', '已使用') : t('None', '未使用')}</dd></div>
            <div><dt>{t('Next review', '下次复习')}</dt><dd>{state.schedule.dueAt === null ? t('None', '暂无安排') : dateLabel(state.schedule.dueAt)}</dd></div>
          </dl>
          <p lang="zh-Hans">{mistake.explanationZh}</p>
          {mistake.choices?.length ? <ul>{mistake.choices.map((choice, index) => <li key={choice.label}><strong lang={assessmentLanguage}>{choice.label}</strong><ExamStimulus stimulus={mistake.question?.options[index]?.stimulus} /> <span lang="zh-Hans">{choice.explanationZh}</span></li>)}</ul> : null}
          <label className="cause-label">{causeLabel}<select aria-label={causeLabel} value={cause} onChange={(e) => void progress.save('annotations', { id: mistake.id, cause: e.target.value as typeof cause, at: Date.now() })}>
            <option value="">{t('Unclassified', '未分类')}</option>{mistakeCauses.map((label) => <option key={label} value={label}>{t(label, causeNames[label])}</option>)}</select></label>
          {state.schedule.history.length > 0 && <p>{t('Previous reviews', '复习记录')} · {state.schedule.history.map((review) => `${dateLabel(review.at)} ${review.correct ? t('correct', '答对', false) : t('incorrect', '答错', false)}`).join(' · ')}</p>}
          {objective && isAvailable(objective.id) && <div className="button-row"><a className="button secondary" href={`#/lesson/${objective.id}`}>{t('Open lesson', '打开课程')}</a><a className="button primary" href={`#/review/${objective.id}`}>{t('Try a fresh question', '练习一道新题')}</a></div>}
        </details>
      })}
    </section>
  </>
}

export function PracticePage({ objective, progress, review = false, scope = 'grade5' }: { objective?: Objective; progress: Progress; review?: boolean; scope?: StudyScope }) {
  const { t } = useInterfaceLanguage()
  if (!objective || !isAvailable(objective.id)) return <>
    <div className="page-heading"><p className="eyebrow">{t('English assessment', '英文测评')}</p><h1>{t('Practice', '练习')}</h1><p>{t('Choose an objective to start an original question.', '选择一项学习目标，开始练习原创题目。', false)}</p></div>
    <div className="filter-row"><StudyScopeNav scope={scope} page="practice" /></div>
    <section className="panel"><h2>{t('Available objectives', '可练习的目标')}</h2><ul className="marks-list">{available.filter((item) => inScope(item, scope)).map((item) => <li key={item.id}><a href={`#/practice/${item.id}`} lang="en">{item.title}</a><span>{gradeLabel(t, item.grade)}</span></li>)}</ul></section>
  </>
  const state = objectiveState(objective.id, progress)
  return <>
    <div className="page-heading"><p className="eyebrow">{review ? t('Spaced review', '间隔复习') : t('Practice mode', '练习模式')} · {gradeLabel(t, objective.grade)}</p><h1 lang="en">{objective.title}</h1><p>{t(state.stage, stageNames[state.stage])} · {t(`${state.distinct} distinct independent questions`, `已独立尝试 ${state.distinct} 道不同题目`, false)}</p></div>
    <Quiz key={`${objective.id}:${review}`} objectiveId={objective.id} progress={progress} mode={review ? 'review' : 'practice'} />
  </>
}

export function Diagnostic({ progress }: { progress: Progress }) {
  const { t } = useInterfaceLanguage()
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
  const introductoryCount = initial.length || available.length
  const correctCount = results.filter((item) => item.correct).length
  const recommendations = [...new Set(results.filter((attempt) => !attempt.correct || attempt.assisted)
    .flatMap((attempt) => {
      const objective = objectiveById.get(attempt.objectiveId)
      const unmet = objective?.prerequisites.filter((id) => isAvailable(id) && objectiveState(id, progress).stage !== 'Mastered') ?? []
      return [...unmet, attempt.objectiveId]
    }))]
  return <>
    <div className="page-heading"><p className="eyebrow">{t('Learning path', '学习路径')}</p><h1>{t('Curriculum diagnostic', '课程诊断')}</h1><p>{t('Find which skills to study first across Grades 1 to 5.', '找出一至五级中需要优先学习的知识与技能。', false)}</p></div>
    {!queue.length ? <section className="panel"><h2>{t('Check your starting point', '了解当前水平')}</h2><p>{t(`Get a broad starting point with ${introductoryCount} questions, or sample all ${available.length} available objectives.`, `用 ${introductoryCount} 道题快速了解当前水平，也可以测评全部 ${available.length} 项学习目标。`, false)}</p>
      <label className="checkbox-label"><input type="checkbox" checked={full} onChange={(e) => setFull(e.target.checked)} /> {t('Include every objective', '测评所有目标')}</label>
      <button className="button primary" onClick={() => setQueue(sampled)}>{t('Start diagnostic', '开始诊断')}</button></section>
      : finished
        ? <section className="panel"><h2>{t(`${correctCount} of ${results.length} correct`, `共 ${results.length} 题，答对 ${correctCount} 题`, false)}</h2>
          <h3>{t('Recommended next lessons', '下一步推荐课程')}</h3>
          {recommendations.length ? <ul>{recommendations.slice(0, 15).map((id) => <li key={id}><a href={`#/lesson/${id}`} lang="en">{objectiveById.get(id)?.title}</a></li>)}</ul>
            : <p>{t('Start independent practice on an objective you want to retain.', '选择一个想巩固的学习目标，开始独立练习。', false)}</p>}
          <a className="button primary" href="#/curriculum">{t('Browse the curriculum', '浏览课程')}</a>
        </section>
        : <><p>{t(`Question ${results.length + 1} of ${queue.length}`, `第 ${results.length + 1} 题，共 ${queue.length} 题`, false)}</p><Quiz key={results.length} progress={progress} objectiveId={queue[results.length].id} mode="diagnostic" onNext={(attempt) => setResults([...results, attempt])} /></>}
  </>
}
