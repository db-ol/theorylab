import { useRef, useState } from 'react'
import type { Question, QuestionAnswer } from '../questions'
import { pitchAtStaffPosition, staffPosition } from '../theory'
import { Staff } from './Notation'
import { useInterfaceLanguage } from './interfaceLanguage'

const noteheads = [
  { name: 'Double flat', chinese: '重降', sign: '♭♭' }, { name: 'Flat', chinese: '降', sign: '♭' },
  { name: 'Natural', chinese: '本位', sign: '♮' }, { name: 'Sharp', chinese: '升', sign: '♯' },
  { name: 'Double sharp', chinese: '重升', sign: '×' },
]

function positionNames(position: number): [string, string] {
  if (position < 0) return [`${-position} steps below the stave`, `下方第 ${-position} 个位置`]
  if (position > 8) return [`${position - 8} steps above the stave`, `上方第 ${position - 8} 个位置`]
  return position % 2
    ? [`Space ${(position + 1) / 2}`, `第 ${(position + 1) / 2} 间`]
    : [`Line ${position / 2 + 1}`, `第 ${position / 2 + 1} 线`]
}

export function PitchAnswer({ question, answer, onAnswer, disabled }: {
  question: Question; answer: QuestionAnswer | undefined; onAnswer: (answer: QuestionAnswer) => void; disabled?: boolean
}) {
  const { t } = useInterfaceLanguage()
  const clef = question.notation?.clef ?? 'treble'
  const first = question.notation?.pitches[0]
  const initial = first ? staffPosition(first, clef) : 4
  const range = { min: Math.min(-12, initial - 14), max: Math.max(18, initial + 14) }
  const pitch = typeof answer === 'object' ? answer : undefined
  const position = pitch ? staffPosition(pitch, clef) : initial
  const [chosen, setChosen] = useState(0)
  const accidental = pitch?.accidental ?? chosen
  const positionLabel = positionNames(position)
  const placedNotehead = noteheads[accidental + 2]
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
    <legend>{t('Place the second note', '放置第二个音符')}</legend>
    <p>{t('Choose a notehead, then tap a line or space in the shaded area. You can also drag a notehead there.',
      '选好符头后，点击阴影区内的线或间。也可以直接将符头拖到该处。', false)}</p>
    <div className="notehead-palette" role="group" aria-label={t('Noteheads', '符头')}>
      {noteheads.map(({ name, sign }, index) => {
        const value = index - 2
        return <button type="button" key={name} lang="en" aria-label={name + ' notehead'} aria-pressed={accidental === value}
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
      <label>{t('Staff position', '谱上位置')}<input type="range" min={range.min} max={range.max} value={position}
        aria-valuetext={t(...positionLabel)} onChange={event => update(Number(event.target.value), accidental)} /></label>
      <button className="button secondary" type="button" onClick={() => update(position, accidental)}>{t('Place note', '放置音符')}</button>
    </div>
    <p role="status">{pitch
      ? t(`${positionLabel[0]}, ${placedNotehead.name.toLowerCase()}`, `${positionLabel[1]}，${placedNotehead.chinese}`)
      : t('No note placed', '尚未放置音符')}</p>
  </fieldset>
}
