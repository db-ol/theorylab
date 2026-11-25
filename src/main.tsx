import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Exam } from './ui/Exam'
import { Icon, type IconName } from './ui/Icon'
import { Curriculum, Dashboard, Diagnostic, Lesson, Notebook, PracticePage, objectiveById, type StudyScope } from './ui/Study'
import { Settings, Vocabulary } from './ui/Tools'
import { useProgress } from './ui/useProgress'
import { InterfaceLabel, InterfaceLanguageContext, readInterfaceLanguage, useInterfaceLanguage, type InterfaceLanguage } from './ui/interfaceLanguage'
import { HeaderLanguageMenu, LanguagePreferences } from './ui/LanguagePreferences'
import './style.css'

const navigation: { label: string; chinese: string; url: string; icon: IconName; routes: string[] }[] = [
  { label: 'Dashboard', chinese: '学习首页', url: '#/', icon: 'home', routes: [''] },
  { label: 'Curriculum', chinese: '课程', url: '#/curriculum', icon: 'book', routes: ['curriculum', 'lesson'] },
  { label: 'Practice', chinese: '练习', url: '#/practice', icon: 'practice', routes: ['practice', 'review', 'diagnostic'] },
  { label: 'Mistake notebook', chinese: '错题本', url: '#/notebook', icon: 'review', routes: ['notebook'] },
  { label: 'Glossary', chinese: '术语表', url: '#/glossary', icon: 'glossary', routes: ['glossary', 'vocabulary'] },
  { label: 'Mock exam', chinese: '模拟考试', url: '#/exam', icon: 'exam', routes: ['exam'] },
]

const storageMessages: Record<string, string> = {
  'Progress storage is unavailable. Enable IndexedDB to save your work.': '无法访问进度存储。请启用 IndexedDB 以保存学习进度。',
  'The latest change could not be saved on this device.': '最近的更改未能保存到此设备。',
  'This exam already has a saved result on this device.': '此设备已保存这次考试的成绩。',
  'The exam result could not be saved on this device.': '考试成绩未能保存到此设备。',
  'The progress file could not be imported.': '未能导入进度文件。',
  'The progress backup could not be downloaded.': '未能下载进度备份。',
  'Choose a valid TheoryLab JSON backup.': '请选择有效的 TheoryLab JSON 备份文件。',
  'Unsupported progress file version.': '此版本的进度文件暂不受支持。',
  'The progress file contains invalid or duplicate records.': '进度文件含有无效或重复的记录。',
}

function saved(key: string, fallback: string) {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}
function savePreference(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* The setting still applies in this tab. */ }
}

function App() {
  const [route, setRoute] = useState(window.location.hash || '#/')
  const [preferredLanguage, setPreferredLanguage] = useState(() => readInterfaceLanguage(saved('theorylab-interface-language', 'en')))
  const [, page = '', id = ''] = route.replace(/^#/, '').split('/')
  const effectiveLanguage = page === 'exam' ? 'en' : preferredLanguage

  useEffect(() => {
    const onHashChange = () => {
      setRoute(window.location.hash || '#/')
      window.scrollTo(0, 0)
      document.querySelector('main')?.focus({ preventScroll: true })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  useEffect(() => { savePreference('theorylab-interface-language', preferredLanguage) }, [preferredLanguage])
  useEffect(() => { document.documentElement.lang = effectiveLanguage === 'zh' ? 'zh-Hans' : 'en' }, [effectiveLanguage])

  return <InterfaceLanguageContext.Provider value={effectiveLanguage}>
    <Shell page={page} id={id} onLanguageChange={setPreferredLanguage}/>
  </InterfaceLanguageContext.Provider>
}

function Shell({ page, id, onLanguageChange }: { page: string; id: string; onLanguageChange: (language: InterfaceLanguage) => void }) {
  const { t } = useInterfaceLanguage()
  const [chineseHelp, setChineseHelp] = useState(() => saved('theorylab-help', 'zh') === 'zh')
  const [theme, setTheme] = useState(() => saved('theorylab-theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  const [navigationOpen, setNavigationOpen] = useState(false)
  const progress = useProgress()
  const exam = page === 'exam'
  const objective = objectiveById.get(id)
  const scope: StudyScope = id === 'foundations' ? 'foundations' : id === 'all' ? 'all' : 'grade5'

  useEffect(() => { setNavigationOpen(false) }, [page, id])
  useEffect(() => { document.documentElement.dataset.theme = theme; savePreference('theorylab-theme', theme) }, [theme])
  useEffect(() => { savePreference('theorylab-help', chineseHelp ? 'zh' : 'en') }, [chineseHelp])
  const languageProps = { chineseHelp, onHelpChange: setChineseHelp, onLanguageChange }
  const view = (() => {
    switch (page) {
      case 'curriculum': return <Curriculum progress={progress} chinese={chineseHelp} scope={scope} />
      case 'lesson': return objective ? <Lesson key={objective.id} progress={progress} objective={objective} chinese={chineseHelp} /> : <Curriculum progress={progress} chinese={chineseHelp} />
      case 'practice': case 'review': return <PracticePage progress={progress} objective={objective} review={page === 'review'} scope={scope} />
      case 'diagnostic': return <Diagnostic progress={progress} />
      case 'notebook': return <Notebook progress={progress} />
      case 'glossary': case 'vocabulary': return <Vocabulary progress={progress} train={page === 'vocabulary'} />
      case 'exam': return <Exam progress={progress} />
      case 'settings': return <Settings progress={progress} languagePreferences={<section className="panel">
        <h2><InterfaceLabel en="Language" zh="语言" /></h2>
        <LanguagePreferences {...languageProps}/>
      </section>} />
      default: return <Dashboard progress={progress} />
    }
  })()

  return <div className="app-shell">
    <header className="topbar">
      <button className="icon-button menu-button" aria-label={t('Toggle navigation', '展开或收起导航')} aria-expanded={navigationOpen} onClick={() => setNavigationOpen(!navigationOpen)}><Icon name="menu" /></button>
      <a href="#/" className="brand" aria-label={t('TheoryLab dashboard', 'TheoryLab 学习首页')}><span className="brand-icon"><Icon name="music" size={24} /></span><span lang="en">TheoryLab</span></a>
      <div className="header-actions">
        {!exam && <HeaderLanguageMenu key={page + '/' + id} {...languageProps} />}
        <button className="icon-button" type="button" aria-label={theme === 'dark' ? t('Use light theme', '切换为浅色主题') : t('Use dark theme', '切换为深色主题')} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
      </div>
    </header>
    <aside className={`sidebar ${navigationOpen ? 'sidebar-open' : ''}`}>
      <nav aria-label={t('Main navigation', '主导航')}>
        {navigation.map(({ label, chinese, url, icon, routes }) => <a key={url} href={url} aria-current={routes.includes(page) ? 'page' : undefined}><Icon name={icon}/><InterfaceLabel en={label} zh={chinese} /></a>)}
      </nav>
      <a className="settings-link" href="#/settings" aria-current={page === 'settings' ? 'page' : undefined}><Icon name="settings"/><InterfaceLabel en="Settings" zh="设置" /></a>
    </aside>
    <main tabIndex={-1} className="main">
      {progress.error && <p className="error-banner" role="alert">{t(progress.error, storageMessages[progress.error] ?? progress.error, false)}</p>}
      <div className="main-inner">{view}</div>
      <footer>{t('Independent study resource for ABRSM Music Theory.', '供 ABRSM 乐理学习者使用的独立学习资源。', false)}</footer>
    </main>
  </div>
}

const root = document.getElementById('root')
if (!root) throw new Error('The application root is missing.')
createRoot(root).render(<App />)
