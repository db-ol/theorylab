import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Exam } from './ui/Exam'
import { Icon, type IconName } from './ui/Icon'
import { Curriculum, Dashboard, Diagnostic, Lesson, Notebook, PracticePage, objectiveById, type StudyScope } from './ui/Study'
import { Settings, Vocabulary } from './ui/Tools'
import { useProgress } from './ui/useProgress'
import './style.css'

const navigation: { label: string; url: string; icon: IconName; routes: string[] }[] = [
  { label: 'Dashboard', url: '#/', icon: 'home', routes: [''] },
  { label: 'Curriculum', url: '#/curriculum', icon: 'book', routes: ['curriculum', 'lesson'] },
  { label: 'Practice', url: '#/practice', icon: 'practice', routes: ['practice', 'review', 'diagnostic'] },
  { label: 'Mistake notebook', url: '#/notebook', icon: 'review', routes: ['notebook'] },
  { label: 'Glossary', url: '#/glossary', icon: 'glossary', routes: ['glossary', 'vocabulary'] },
  { label: 'Mock exam', url: '#/exam', icon: 'exam', routes: ['exam'] },
]

function saved(key: string, fallback: string) {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}
function savePreference(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* The setting still applies in this tab. */ }
}

function App() {
  const [route, setRoute] = useState(window.location.hash || '#/')
  const [language, setLanguage] = useState(() => saved('theorylab-help', 'zh'))
  const [theme, setTheme] = useState(() => saved('theorylab-theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  const [navigationOpen, setNavigationOpen] = useState(false)
  const progress = useProgress()
  const [, page = '', id = ''] = route.replace(/^#/, '').split('/')
  const exam = page === 'exam'
  const chinese = language === 'zh' && !exam
  const objective = objectiveById.get(id)
  const scope: StudyScope = id === 'foundations' ? 'foundations' : id === 'all' ? 'all' : 'grade5'

  useEffect(() => {
    const onHashChange = () => {
      setRoute(window.location.hash || '#/')
      setNavigationOpen(false)
      window.scrollTo(0, 0)
      document.querySelector('main')?.focus({ preventScroll: true })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  useEffect(() => { document.documentElement.dataset.theme = theme; savePreference('theorylab-theme', theme) }, [theme])
  useEffect(() => { savePreference('theorylab-help', language) }, [language])

  const view = (() => {
    switch (page) {
      case 'curriculum': return <Curriculum progress={progress} chinese={chinese} scope={scope} />
      case 'lesson': return objective ? <Lesson key={objective.id} progress={progress} objective={objective} chinese={chinese} /> : <Curriculum progress={progress} chinese={chinese} />
      case 'practice': case 'review': return <PracticePage progress={progress} objective={objective} review={page === 'review'} scope={scope} />
      case 'diagnostic': return <Diagnostic progress={progress} />
      case 'notebook': return <Notebook progress={progress} />
      case 'glossary': case 'vocabulary': return <Vocabulary progress={progress} train={page === 'vocabulary'} />
      case 'exam': return <Exam progress={progress} />
      case 'settings': return <Settings progress={progress} />
      default: return <Dashboard progress={progress} />
    }
  })()

  return <div className="app-shell">
    <header className="topbar">
      <button className="icon-button menu-button" aria-label="Toggle navigation" aria-expanded={navigationOpen} onClick={() => setNavigationOpen(!navigationOpen)}><Icon name="menu" /></button>
      <a href="#/" className="brand" aria-label="TheoryLab dashboard"><span className="brand-icon"><Icon name="music" size={24} /></span><span>TheoryLab</span></a>
      <div className="header-actions">
        {!exam && <button className="help-toggle" type="button" aria-label="Chinese help" aria-pressed={chinese} onClick={() => setLanguage(chinese ? 'en' : 'zh')}><span lang="zh-Hans">中文</span><span className="help-word"> help {chinese ? 'on' : 'off'}</span></button>}
        <button className="icon-button" type="button" aria-label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
      </div>
    </header>
    <aside className={`sidebar ${navigationOpen ? 'sidebar-open' : ''}`}>
      <nav aria-label="Main navigation">
        {navigation.map(({ label, url, icon, routes }) => <a key={url} href={url} aria-current={routes.includes(page) ? 'page' : undefined}><Icon name={icon}/>{label}</a>)}
      </nav>
      <a className="settings-link" href="#/settings" aria-current={page === 'settings' ? 'page' : undefined}><Icon name="settings"/>Settings</a>
    </aside>
    <main tabIndex={-1} className="main">
      {progress.error && <p className="error-banner" role="alert">{progress.error}</p>}
      <div className="main-inner">{view}</div>
      <footer>Independent study resource for ABRSM Music Theory.</footer>
    </main>
  </div>
}

const root = document.getElementById('root')
if (!root) throw new Error('The application root is missing.')
createRoot(root).render(<App />)
