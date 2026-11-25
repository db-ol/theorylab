import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { InterfaceLabel, InterfaceLanguageContext, readInterfaceLanguage, useInterfaceLanguage } from './interfaceLanguage'
import { LanguagePreferences } from './LanguagePreferences'

function renderIn(language, content) {
  return renderToStaticMarkup(createElement(InterfaceLanguageContext.Provider, { value: language }, content))
}

describe('interface language', () => {
  it('defaults to English for new and unknown preferences', () => {
    for (const value of [null, '', 'other', 'en']) expect(readInterfaceLanguage(value)).toBe('en')
    for (const value of ['zh', 'bilingual']) expect(readInterfaceLanguage(value)).toBe(value)
  })

  it('shows one language for longer guidance and both languages for bilingual controls', () => {
    function Copy() {
      const { t } = useInterfaceLanguage()
      return createElement('p', null, t('Continue', '继续'), ' ', t('Find a lesson.', '查找课程。', false))
    }
    expect(renderIn('en', createElement(Copy))).toBe('<p>Continue Find a lesson.</p>')
    expect(renderIn('zh', createElement(Copy))).toBe('<p>继续 查找课程。</p>')
    expect(renderIn('bilingual', createElement(Copy))).toBe('<p>Continue（继续） Find a lesson.</p>')
    const label = renderIn('bilingual', createElement(InterfaceLabel, { en: 'Practice', zh: '练习' }))
    expect(label).toContain('lang="en">Practice')
    expect(label).toContain('lang="zh-Hans">（练习）')
  })

  it('represents each interface preference independently from the saved lesson help', () => {
    for (const language of ['en', 'zh', 'bilingual']) {
      for (const chineseHelp of [true, false]) {
        const html = renderIn(language, createElement(LanguagePreferences, { chineseHelp }))
        const radios = html.match(/<input type="radio"[^>]+>/gu)
        expect(radios).toHaveLength(3)
        const selected = radios.filter(input => input.includes('checked=""'))
        expect(selected).toHaveLength(1)
        expect(selected[0]).toContain(`value="${language}"`)
        expect(html.match(/<input type="checkbox"[^>]*>/u)[0].includes('checked=""')).toBe(chineseHelp)
      }
    }
  })
})
