import type { ReactNode } from 'react'
import type { ExamStimulus as Stimulus } from '../questions/stimulus'
import { Staff } from './Notation'
import './examNotation.css'

export function ExamStimulus({ stimulus, renderBarAnswer }: {
  stimulus?: Stimulus
  renderBarAnswer?: (index: number) => ReactNode
}) {
  if (!stimulus) return null
  if (stimulus.kind === 'rhythm') return <Staff rhythm={stimulus.pulses} timeSignature={stimulus.timeSignature}
    clef={stimulus.clef} keySignature={stimulus.keySignature} hideClef={!stimulus.clef} showClefName={false}
    beamGroups={stimulus.beamGroups} tuplets={stimulus.tuplets} groupStarts={stimulus.groupStarts} />
  if (stimulus.kind === 'harmony') {
    const { keySignature, chords } = stimulus
    return <div className="exam-grand-staff" role="group" aria-label="Harmony score">
      <Staff clef="treble" keySignature={keySignature} chordColumns={chords.map(({ treble }) => treble)}
        columnLabels={chords.map(({ label }) => label)} showClefName={false} />
      <Staff clef="bass" keySignature={keySignature} chordColumns={chords.map(({ bass }) => [bass])} showClefName={false} />
    </div>
  }
  const { excerpt } = stimulus
  const renderBar = (bar: typeof excerpt.bars[number], index: number) => <figure key={index}>
    <figcaption>{bar.label ?? `Bar ${index + 1}`}</figcaption>
    <Staff clef={bar.clef ?? excerpt.clef} keySignature={bar.keySignature ?? excerpt.keySignature} timeSignature={index === 0 || bar.clef !== undefined || bar.keySignature !== undefined ? excerpt.timeSignature : undefined} rhythm={bar.pulses}
      beamGroups={bar.beamGroups} showClefName={false} annotation={[bar.dynamic, bar.direction].filter(Boolean).join(' · ')} />
    {renderBarAnswer?.(index)}
  </figure>
  if (stimulus.role === 'cadence-matching') return <div className="cadence-score" role="group" aria-label="Melody for two cadences">
    <div className="score-grid cadence-phrase" role="group" aria-label="First phrase">{excerpt.bars.slice(0, 2).map(renderBar)}</div>
    <div className="score-grid cadence-phrase" role="group" aria-label="Second phrase">{excerpt.bars.slice(2).map((bar, index) => renderBar(bar, index + 2))}</div>
  </div>
  return <div className="score-grid" aria-label="Musical excerpt">{excerpt.bars.map(renderBar)}</div>
}
