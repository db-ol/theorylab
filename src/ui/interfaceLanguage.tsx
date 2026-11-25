import { createContext, useContext } from 'react'

export type InterfaceLanguage = 'en' | 'zh' | 'bilingual'
export const InterfaceLanguageContext = createContext<InterfaceLanguage>('en')

export function readInterfaceLanguage(value: string | null): InterfaceLanguage {
  return value === 'zh' || value === 'bilingual' ? value : 'en'
}

export type TranslateInterface = (english: string, chinese: string, bilingual?: boolean) => string

const translators: Record<InterfaceLanguage, TranslateInterface> = {
  en: english => english,
  zh: (_english, chinese) => chinese,
  bilingual: (english, chinese, bilingual = true) => bilingual && english !== chinese ? `${english}（${chinese}）` : english,
}

export function useInterfaceLanguage() {
  const language = useContext(InterfaceLanguageContext)
  return { language, t: translators[language] }
}

export function InterfaceLabel({ en, zh }: { en: string; zh: string }) {
  const { language } = useInterfaceLanguage()
  if (language === 'bilingual') return <span className="dual-label"><span lang="en">{en}</span><span lang="zh-Hans">（{zh}）</span></span>
  return language === 'zh' ? zh : en
}
