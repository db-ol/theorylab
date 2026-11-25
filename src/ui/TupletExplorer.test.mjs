import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { multiplyDuration, rational } from '../theory'
import { RhythmExplorer } from './MusicExplorers'
import { compareTuplet, tupletExamples } from './TupletExplorer'

describe('tuplet explorer', () => {
  it('shows exact fractions for the Grade 5 quintuplet and sextuplet', () => {
    const [quintuplet, sextuplet] = tupletExamples.irregular
    expect(compareTuplet(quintuplet)).toEqual({ member: rational(1, 5), ordinary: rational(1, 4), group: rational(1) })
    expect(compareTuplet(sextuplet)).toEqual({ member: rational(1, 6), ordinary: rational(1, 4), group: rational(1) })
  })

  it('keeps the ordinary duration and total aligned for every example including the rest', () => {
    for (const example of Object.values(tupletExamples).flat()) {
      const { member, ordinary, group } = compareTuplet(example)
      expect(group).toEqual(multiplyDuration(ordinary, rational(example.ordinaryCount)))
      expect(group).toEqual(multiplyDuration(member, rational(example.count)))
    }
    const [quavers, semiquavers, rest] = tupletExamples.triplet
    expect(compareTuplet(quavers)).toEqual({ member: rational(1, 3), ordinary: rational(1, 2), group: rational(1) })
    expect(compareTuplet(semiquavers)).toEqual({ member: rational(1, 6), ordinary: rational(1, 4), group: rational(1, 2) })
    expect(rest.restIndex).toBe(1)
    expect(compareTuplet(rest)).toEqual(compareTuplet(quavers))
  })

  it('renders aligned, explicitly bracketed 5:4 semiquavers and four ordinary semiquavers', () => {
    const markup = renderToStaticMarkup(createElement(RhythmExplorer, { tuplet: 'irregular', chinese: true }))
    const parts = markup.split('<svg').slice(1).map(fragment => fragment.split('</svg>')[0])
    expect(parts).toHaveLength(2)
    const [tuplet, ordinary] = parts
    expect(tuplet).toContain('data-ratio="5:4"')
    expect(tuplet).toContain('>5:4</text>')
    expect(ordinary).not.toContain('data-ratio=')
    expect(tuplet.match(/data-member="note"/gu)).toHaveLength(5)
    expect(ordinary.match(/data-member="note"/gu)).toHaveLength(4)
    expect(tuplet.match(/class="tuplet-beam"/gu)).toHaveLength(2)
    expect(ordinary.match(/class="tuplet-beam"/gu)).toHaveLength(2)
    for (const stave of parts) {
      expect(stave).toContain('x1="28" x2="28"')
      expect(stave).toContain('x1="372" x2="372"')
      expect(stave).toContain('translate(28 72)')
    }
    expect(markup).toContain('1/5 of a crotchet beat')
    expect(markup).toContain('1/4 of a crotchet beat')
    expect(markup).toContain('<dd>1 crotchet beat</dd>')
    expect(markup).toContain('aria-valuetext="0 crotchet beats from the start"')
    expect(markup).toContain('max="20"')
    expect(markup).toContain('lang="zh-Hans"')
  })

  it('defaults Grade 2 to triplet quavers, exposes the rest example and respects Chinese help', () => {
    const markup = renderToStaticMarkup(createElement(RhythmExplorer, { tuplet: 'triplet', chinese: false }))
    expect(markup).toContain('data-ratio="3:2"')
    expect(markup).toContain('1/3 of a crotchet beat')
    expect(markup).toContain('1/2 of a crotchet beat')
    expect(markup).toContain('>Triplet semiquavers</button>')
    expect(markup).toContain('>Triplet with a rest</button>')
    expect(markup).not.toContain('lang="zh-Hans"')
  })
})
