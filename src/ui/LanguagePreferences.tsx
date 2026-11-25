import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from './Icon'
import { InterfaceLabel, type InterfaceLanguage, useInterfaceLanguage } from './interfaceLanguage'

interface LanguagePreferencesProps {
  chineseHelp: boolean
  onHelpChange: (enabled: boolean) => void
  onLanguageChange: (language: InterfaceLanguage) => void
}

export function LanguagePreferences({ chineseHelp, onHelpChange, onLanguageChange }: LanguagePreferencesProps) {
  const { language } = useInterfaceLanguage()
  const name = useId()
  return <div className="language-options">
    <fieldset>
      <legend><InterfaceLabel en="Interface language" zh="界面语言" /></legend>
      <div className="language-choices">
        <label><input type="radio" name={name} value="en" checked={language === 'en'} onChange={() => onLanguageChange('en')}/><span lang="en">English</span></label>
        <label><input type="radio" name={name} value="zh" checked={language === 'zh'} onChange={() => onLanguageChange('zh')}/><span lang="zh-Hans">简体中文</span></label>
        <label><input type="radio" name={name} value="bilingual" checked={language === 'bilingual'} onChange={() => onLanguageChange('bilingual')}/><span lang="en">Bilingual</span><span lang="zh-Hans">（双语）</span></label>
      </div>
    </fieldset>
    <label className="lesson-language-option"><input type="checkbox" checked={chineseHelp} onChange={event => onHelpChange(event.target.checked)} />
      <InterfaceLabel en="Chinese lesson explanations" zh="课程中文讲解" />
    </label>
  </div>
}

export function HeaderLanguageMenu(props: LanguagePreferencesProps) {
  const { language, t } = useInterfaceLanguage()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent | FocusEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('focusin', closeOutside)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('focusin', closeOutside)
    }
  }, [open])

  return <div ref={root} className="language-menu" onKeyDown={event => {
    if (event.key === 'Escape' && open) {
      event.stopPropagation()
      setOpen(false)
      trigger.current?.focus()
    }
  }}>
    <button ref={trigger} type="button" className="language-trigger" aria-label={t('Language settings', '语言设置')}
      aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
      <Icon name="globe" size={18} /><span>{language === 'bilingual' ? 'EN／中文' : language === 'zh' ? '简体中文' : 'English'}</span>
    </button>
    {open && <div id={panelId} className="language-popover"><LanguagePreferences {...props}/></div>}
  </div>
}
