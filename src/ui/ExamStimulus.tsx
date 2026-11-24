import type { ExamStimulus as Stimulus } from '../exam/grade5'
import { Staff } from './Notation'

export function ExamStimulus({ stimulus }: { stimulus?: Stimulus }) {
  if (!stimulus) return null
  if (stimulus.kind === 'rhythm') return <Staff rhythm={stimulus.pulses} timeSignature={stimulus.timeSignature} hideClef showClefName={false} />
  const { excerpt } = stimulus
  return <div className="score-grid" aria-label="Musical excerpt">
    {excerpt.bars.map((bar, index) => <figure key={index}>
      <figcaption>Bar {index + 1}</figcaption>
      <Staff clef={excerpt.clef} keySignature={excerpt.keySignature} timeSignature={index === 0 ? excerpt.timeSignature : undefined} rhythm={bar.pulses}
        showClefName={false} annotation={[bar.dynamic, bar.direction].filter(Boolean).join(' · ')} />
    </figure>)}
  </div>
}
