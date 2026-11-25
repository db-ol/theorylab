import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { InterfaceLanguageContext } from './interfaceLanguage'
import { IntervalExplorer } from './IntervalExplorer'
import { HarmonyExplorer, PitchExplorer, RhythmExplorer, ScaleExplorer } from './MusicExplorers'
import { ReferenceVisual } from './ReferenceVisual'

function renderIn(language, component, properties = {}) {
  return renderToStaticMarkup(createElement(InterfaceLanguageContext.Provider, { value: language },
    createElement(component, properties)))
}

describe('lesson explorer interface language', () => {
  it('localizes interval controls and preserves written pitches and interval names', () => {
    const properties = { initial: ['C4', 'E4'] }
    const english = renderIn('en', IntervalExplorer, properties)
    const chinese = renderIn('zh', IntervalExplorer, properties)
    const bilingual = renderIn('bilingual', IntervalExplorer, properties)
    expect(english).toContain('>Interval explorer</h2>')
    expect(chinese).toContain('>音程探索</h2>')
    expect(bilingual).toContain('>Interval explorer（音程探索）</h2>')
    expect(chinese).toContain('变化记号<select>')
    expect(chinese).toContain('依次播放 C4、E4')
    expect(chinese).toContain('>major 3rd</strong>')
  })

  it('preserves official musical terms in localized scale, transposition and chord controls', () => {
    expect(renderIn('zh', ScaleExplorer)).toContain('音阶类型<select>')
    expect(renderIn('zh', ScaleExplorer)).toContain('>Harmonic minor</option>')
    const pitch = renderIn('zh', PitchExplorer, { instrumentMode: true, transposeMode: true })
    expect(pitch).toContain('记谱音高与实际音高')
    expect(pitch).toContain('>Sounding pitch</option>')
    const harmony = renderIn('zh', HarmonyExplorer, { cadence: false })
    expect(harmony).toContain('根音音级<select>')
    expect(harmony).toContain('>Dominant</option>')
  })

  it('localizes visual rhythm displays independently from the Chinese lesson help', () => {
    const metre = renderIn('bilingual', RhythmExplorer, { metre: true, initialSignature: '7/8', initialGrouping: 1 })
    expect(metre).toContain('<legend>Time signature（拍号）</legend>')
    expect(metre).toContain('Irregular metre · 3 main beats · 2 + 3 + 2. 7 quavers in the bar.')
    const chinese = renderIn('zh', RhythmExplorer, { tuplet: 'irregular', chinese: false })
    expect(chinese).toContain('十六分音符五连音（Quintuplet semiquavers）')
    expect(chinese).toContain('data-ratio="5:4"')
    expect(chinese).toContain('时间位置')
    expect(chinese).not.toContain('class="tuplet-help"')
    const english = renderIn('en', RhythmExplorer, { tuplet: 'irregular', chinese: true })
    expect(english).toContain('>Time position</span>')
    expect(english).toContain('lang="zh-Hans" class="tuplet-help"')
  })

  it('localizes reference controls and keeps ornaments by their published English names', () => {
    const ornament = renderIn('zh', ReferenceVisual, { objectiveId: 'ORN-4-SYMBOLS', chinese: false })
    expect(ornament).toContain('装饰音示例')
    expect(ornament).toContain('>lower mordent</option>')
    const repeat = renderIn('bilingual', ReferenceVisual, { objectiveId: 'TER-2-ENDINGS', chinese: false })
    expect(repeat).toContain('Show second pass（演示第二遍）')
    expect(repeat).toContain('First pass. Return to bar 1 after the first ending.')
  })
})
