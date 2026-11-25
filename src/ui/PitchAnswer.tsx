import { useRef, useState } from 'react'
import type { Question, QuestionAnswer } from '../questions'
import { pitchAtStaffPosition, staffPosition } from '../theory'
import { Staff } from './Notation'

const noteheads = [
  { name: 'Double flat', sign: '♭♭' }, { name: 'Flat', sign: '♭' }, { name: 'Natural', sign: '♮' },
  { name: 'Sharp', sign: '♯' }, { name: 'Double sharp', sign: '×' },
]

function positionName(position: number) {
  if (position < 0) return `${-position} steps below the stave`
  if (position > 8) return `${position - 8} steps above the stave`
  return position % 2 ? `Space ${(position + 1) / 2}` : `Line ${position / 2 + 1}`
}

export function PitchAnswer({ question, answer, onAnswer, disabled }: {
  question: Question; answer: QuestionAnswer | undefined; onAnswer: (answer: QuestionAnswer) => void; disabled?: boolean
}) {
  const clef = question.notation?.clef ?? 'treble'
  const first = question.notation?.pitches[0]
  const initial = first ? staffPosition(first, clef) : 4
  const range = { min: Math.min(-12, initial - 14), max: Math.max(18, initial + 14) }
  const pitch = typeof answer === 'object' ? answer : undefined
  const position = pitch ? staffPosition(pitch, clef) : initial
  const [chosen, setChosen] = useState(0)
  const accidental = pitch?.accidental ?? chosen
  const dragSign = useRef<number | null>(null)
  const placedFromPalette = useRef(false)
  const score = useRef<HTMLDivElement>(null)
  const update = (nextPosition: number, sign: number) => {
    if (!disabled) onAnswer(pitchAtStaffPosition(nextPosition, clef, sign))
  }
  const placeAt = (clientX: number, clientY: number, sign: number) => {
    const target = score.current?.querySelector<SVGRectElement>('[data-pitch-target]')
    const matrix = target?.getScreenCTM()
    if (!target || !matrix || disabled) return
    const box = target.getBBox()
    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse())
    if (point.x < box.x || point.x > box.x + box.width || point.y < box.y || point.y > box.y + box.height) return
    update(Math.max(range.min, Math.min(range.max, Math.round((87 - point.y) / 6))), sign)
    return true
  }

  return <fieldset className="pitch-answer" disabled={disabled}
    onPointerCancel={() => { dragSign.current = null }}
    onPointerUp={event => {
      const sign = dragSign.current
      dragSign.current = null
      const placed = placeAt(event.clientX, event.clientY, sign ?? accidental)
      placedFromPalette.current = Boolean(placed && sign !== null)
    }}>
    <legend>Place the second note</legend>
    <p>Choose a notehead, then tap a line or space in the shaded area. You can also drag a notehead there.</p>
    <div className="notehead-palette" role="group" aria-label="Noteheads">
      {noteheads.map(({ name, sign }, index) => {
        const value = index - 2
        return <button type="button" key={name} aria-label={name + ' notehead'} aria-pressed={accidental === value}
          onClick={event => { if (event.detail && placedFromPalette.current) return; setChosen(value); if (pitch) update(position, value) }}
          onPointerDown={event => {
            placedFromPalette.current = false
            dragSign.current = value
            event.currentTarget.setPointerCapture(event.pointerId)
          }} onDragStart={event => event.preventDefault()}>
          <svg viewBox="0 0 52 26" aria-hidden="true"><text x="19" y="19" textAnchor="end" fontSize="18" fill="currentColor">{sign}</text>
            <ellipse cx="29" cy="14" rx="8" ry="5" transform="rotate(-17 29 14)" fill="currentColor"/></svg>
          {name}
        </button>
      })}
    </div>
    <div className="placement-stave" ref={score} onPointerDown={() => { dragSign.current = null }}>
      <Staff clef={clef} keySignature={question.notation?.keySignature} pitches={first ? pitch ? [first, pitch] : [first] : pitch ? [pitch] : []}
        showClefName={false} answerRange={range}/>
    </div>
    <div className="pitch-inputs">
      <label>Staff position<input type="range" min={range.min} max={range.max} value={position}
        aria-valuetext={positionName(position)} onChange={event => update(Number(event.target.value), accidental)} /></label>
      <button className="button secondary" type="button" onClick={() => update(position, accidental)}>Place note</button>
    </div>
    <p role="status">{pitch ? `${positionName(position)}, ${noteheads[accidental + 2].name.toLowerCase()}` : 'No note placed'}</p>
  </fieldset>
}
