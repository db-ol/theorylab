import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NOTE_VALUES, addDuration, rational } from '../theory'
import { changeMetre, metreExample } from './MetreExplorer'
import { RhythmExplorer } from './MusicExplorers'

const signatures = [
  ['Simple', ['2/2', '3/2', '4/2', '2/4', '3/4', '4/4', '2/8', '3/8', '4/8']],
  ['Compound', ['6/4', '9/4', '12/4', '6/8', '9/8', '12/8', '6/16', '9/16', '12/16']],
  ['Irregular', ['5/8', '7/8', '5/4', '7/4']],
]

function duration(pulses) {
  return pulses.reduce((total, pulse) => addDuration(total, NOTE_VALUES[pulse.value]), rational(0))
}

describe('metre explorer', () => {
  it.each(signatures)('retains every %s signature and uses the correct units', (name, choices) => {
    for (const signature of choices) {
      const [numerator, denominator] = signature.split('/').map(Number)
      const example = metreExample({ signature, grouping: 0 })
      expect(example.family.name).toBe(name)
      expect(example.family.signatures).toEqual(choices)
      expect(duration(example.rhythm)).toEqual(rational(numerator, denominator))
      const denominatorInNotation = name === 'Simple' ? denominator * 2 : denominator
      expect(NOTE_VALUES[example.unit]).toEqual(rational(1, denominatorInNotation))
      if (name === 'Simple') expect(example.beats).toEqual(Array(numerator).fill(2))
      if (name === 'Compound') expect(example.beats).toEqual(Array(numerator / 3).fill(3))
    }
  })

  it('supports both possible 5 groupings and all three 7 groupings in either denominator', () => {
    for (const denominator of [4, 8]) {
      const fives = metreExample({ signature: `5/${denominator}`, grouping: 0 }).groupings
      const sevens = metreExample({ signature: `7/${denominator}`, grouping: 0 }).groupings
      expect(fives).toEqual([[2, 3], [3, 2]])
      expect(sevens).toEqual([[2, 2, 3], [2, 3, 2], [3, 2, 2]])
      sevens.forEach((beats, grouping) => {
        const example = metreExample({ signature: `7/${denominator}`, grouping })
        expect(example.beats).toEqual(beats)
        expect(duration(example.rhythm)).toEqual(rational(7, denominator))
      })
    }
  })

  it('regroups the current signature and resets grouping when a family or signature changes', () => {
    const original = { signature: '7/8', grouping: 0 }
    const regroup = changeMetre(original, { grouping: 2 })
    expect(metreExample(regroup).beats).toEqual([3, 2, 2])
    const moved = changeMetre(regroup, { signature: '5/4' })
    expect(moved).toEqual({ signature: '5/4', grouping: 0 })
    expect(metreExample(moved).beats).toEqual([2, 3])
    expect(changeMetre(moved, { family: 'Simple' })).toEqual({ signature: '4/4', grouping: 0 })
    expect(changeMetre(moved, { family: 'Compound' })).toEqual({ signature: '6/8', grouping: 0 })
    expect(changeMetre(moved, { family: 'Irregular' })).toEqual({ signature: '5/8', grouping: 0 })
  })

  it('renders the requested irregular signature and grouping with visible native radio choices', () => {
    const html = renderToStaticMarkup(createElement(RhythmExplorer, { metre: true, initialSignature: '7/8', initialGrouping: 1 }))
    expect(html).toContain('<legend>Metre</legend>')
    expect(html).toContain('<legend>Time signature</legend>')
    expect(html).toContain('<legend>Beat grouping</legend>')
    expect(html).toContain('<span>Simple</span>')
    expect(html).toContain('<span>Compound</span>')
    expect(html).toMatch(/<input[^>]+checked=""[^>]*><span>Irregular<\/span>/u)
    expect(html).toMatch(/<input[^>]+checked=""[^>]*><span>7\/8<\/span>/u)
    expect(html).toMatch(/<input[^>]+checked=""[^>]*><span>2 \+ 3 \+ 2<\/span>/u)
    expect(html).toContain('Irregular metre · 3 main beats · 2 + 3 + 2. 7 quavers in the bar.')
    expect(html).not.toContain('<select')
  })

  it('renders the initial simple and compound rules and keeps note duration controls', () => {
    const simple = renderToStaticMarkup(createElement(RhythmExplorer, { metre: true, initialSignature: '3/4' }))
    expect(simple).toContain('Simple metre · 3 main beats · 2 + 2 + 2. 6 quavers in the bar.')
    expect(simple).not.toContain('<legend>Beat grouping</legend>')
    const compound = renderToStaticMarkup(createElement(RhythmExplorer, { metre: true }))
    expect(compound).toContain('Compound metre · 2 main beats · 3 + 3. 6 quavers in the bar.')
    const duration = renderToStaticMarkup(createElement(RhythmExplorer))
    expect(duration).toContain('Rhythmic duration explorer')
    expect(duration).toContain('Note value<select>')
    expect(duration).toContain('Dots<select>')
    expect(duration).toContain('Symbol<select>')
  })
})
