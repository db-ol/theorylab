import { useState } from 'react'
import { useInterfaceLanguage } from './interfaceLanguage'
import { formatAccidental, formatPitch, getKeySignature, midiNumber, parsePitch, staffPosition, type Clef, type Pitch } from '../theory'
import type { RhythmPulse, RhythmTuplet } from '../questions/stimulus'

export type StaffPulse = RhythmPulse

const clefNames: Record<Clef, string> = { treble: 'Treble', bass: 'Bass', alto: 'Alto', tenor: 'Tenor' }

function ClefMark({ clef }: { clef: Clef }) {
  if (clef === 'treble') return <path d="M55 120c-10 10-24 1-18-7 4-6 13 0 8 6m10 1c9-7 1-22-1-35-4-21-9-40-5-54 2-9 7-17 10-12 9 15-10 31-22 46-17 19-3 39 15 34 18-5 17-26 4-29-12-3-20 8-13 15" fill="none" stroke="currentColor" strokeWidth="3.7" strokeLinecap="round" />
  if (clef === 'bass') return <g fill="currentColor"><path d="M27 91c36-15 39-47 20-47-11 0-15 10-11 16-9-2-8-13-1-19 13-11 32-1 30 13-2 17-17 31-38 37Z"/><circle cx="35" cy="54" r="5"/><circle cx="73" cy="45" r="2.7"/><circle cx="73" cy="57" r="2.7"/></g>
  return <g transform={clef === 'tenor' ? 'translate(0 -12)' : undefined} fill="currentColor">
    <path d="M27 39h6v48h-6zm9 0h3v48h-3zm6 2c18-8 25 7 15 15l-10 7 10 7c10 8 3 23-15 15v-3c10 5 18-4 11-10l-11-9 11-9c7-6-1-15-11-10Z"/>
  </g>
}

const signaturePitches: Record<Clef, [number[], number[]]> = {
  treble: [[8,5,9,6,3,7,4], [4,7,3,6,2,5,1]],
  bass: [[6,3,7,4,1,5,2], [2,5,1,4,0,3,-1]],
  alto: [[7,4,8,5,2,6,3], [3,6,2,5,1,4,0]],
  tenor: [[2,6,3,7,4,8,5], [5,8,4,7,3,6,2]],
}

const middle = parsePitch('B4')
const flagCounts: Partial<Record<StaffPulse['value'], number>> = { quaver: 1, semiquaver: 2, demisemiquaver: 3 }

function RestMark({ value, x, y }: { value: StaffPulse['value']; x: number; y: number }) {
  if (value === 'breve' || value === 'semibreve' || value === 'minim') {
    return <rect x={x - 7} y={value === 'minim' ? 57 : 51} width={14} height={value === 'breve' ? 12 : 6} fill="currentColor" />
  }
  if (value === 'crotchet') return <path d="m-1-19 6 9-8 8 6 8c-10-3-9 4-4 9" transform={`translate(${x} ${y})`} fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round"/>
  const flags = flagCounts[value] ?? 1
  return <g transform={`translate(${x} ${y + (flags - 1) * 3})`}>
    <path d={`M6 ${-8 - (flags - 1) * 7} -4 12`} fill="none" stroke="currentColor" strokeWidth="1.8" />
    {Array.from({ length: flags }, (_, i) => <g key={i} transform={`translate(0 ${-i * 7})`} fill="currentColor">
      <circle cx="-5" cy="-7" r="3"/><path d="M-7-7c2 8 11 1 13-1-4 2-7 4-10 1Z"/>
    </g>)}
  </g>
}

export function Staff({ clef = 'treble', pitches, keySignature = 0, showNames = false, showClefName = true, hideClef = false, showKeySignature = true, rhythm, timeSignature, annotation, simultaneous = false, beamGroups, tuplets = [], groupStarts = [], answerRange, chordColumns, columnLabels }: {
  clef?: Clef; pitches?: readonly Pitch[]; keySignature?: number; showNames?: boolean; showClefName?: boolean;
  hideClef?: boolean; showKeySignature?: boolean; rhythm?: readonly StaffPulse[]; timeSignature?: string; annotation?: string; simultaneous?: boolean; beamGroups?: readonly number[]
  tuplets?: readonly RhythmTuplet[]; groupStarts?: readonly number[]; answerRange?: { min: number; max: number }; chordColumns?: readonly (readonly Pitch[])[]; columnLabels?: readonly (string | undefined)[]
}) {
  const columns = chordColumns?.flatMap((pitches, column) => {
    let displaced = false
    return pitches.map((pitch, index) => {
      displaced = index > 0 && !displaced && Math.abs(staffPosition(pitch, clef) - staffPosition(pitches[index - 1], clef)) <= 1
      return { column, displaced, pitch, accidentalColumn: index }
    })
  })
  const notes = columns?.map(note => note.pitch) ?? rhythm?.map((pulse) => pulse.pitch ?? middle) ?? pitches ?? []
  const startX = (hideClef ? 30 : 83) + Math.abs(keySignature) * 16 + (timeSignature ? 29 : 0)
  const slots = chordColumns?.length ?? notes.length
  const width = Math.max(304, startX + slots * (chordColumns ? 65 : 43) + 24)
  const span = width - startX - 18
  const positions = notes.map((pitch) => staffPosition(pitch, clef))
  const columnX = (index: number) => startX + (index + 0.57) * span / slots
  const xAt = (i: number) => {
    if (columns) return columnX(columns[i].column) + (columns[i].displaced ? 12 : 0)
    if (simultaneous) return startX + 0.57 * span + (i && positions[i] - positions[i - 1] === 1 ? 10 : 0)
    return startX + (i + 0.58) * span / Math.max(answerRange ? 2 : 1, notes.length)
  }
  const beams: { first: number; last: number; end: number; stemUp: boolean; levels: number }[] = []
  let first = 0
  for (const size of beamGroups ?? []) {
    const last = first + size - 1
    const value = rhythm?.[first]?.value
    const levels = value ? flagCounts[value] ?? 0 : 0
    if (last < notes.length && size > 1 && levels) {
      const points = positions.slice(first, last + 1)
      const stemUp = points.reduce((total, position) => total + position, 0) / size < 4
      const end = 87 - (stemUp ? Math.max(...points) : Math.min(...points)) * 6 + (stemUp ? -32 : 32)
      beams.push({ first, last, end, stemUp, levels })
    }
    first = last + 1
  }
  const topMark = Math.min(22, ...positions.map((position) => 87 - position * 6 - (chordColumns ? 15 : 43)))
  const bracketY = topMark - (groupStarts.length ? 15 : 2)
  const above = Math.max(0, (Math.max(8, answerRange?.max ?? 8, ...positions) - 12) * 6, tuplets.length ? 13 - bracketY : groupStarts.length || columnLabels ? 12 - topMark : 0)
  const below = Math.max(0, (-Math.min(0, answerRange?.min ?? 0, ...positions) - 6) * 6)
  const signature = getKeySignature(keySignature).accidentals
  const signPositions = signaturePitches[clef][keySignature > 0 ? 0 : 1]
  const usedAccidentals = new Map<string, number>()
  const rhythmDescription = rhythm?.map((pulse) => `${pulse.dots === 2 ? 'double dotted ' : pulse.dots ? 'dotted ' : ''}${pulse.value}${pulse.rest ? ' rest' : pulse.pitch ? ' ' + formatPitch(pulse.pitch) : ''}${pulse.tieAfter ? ' tied to the next note' : ''}`).join(', ')
  const signatureCount = Math.abs(keySignature)
  const signatureDescription = signatureCount && showKeySignature
    ? `Key signature with ${signatureCount} ${keySignature > 0 ? 'sharp' : 'flat'}${signatureCount > 1 ? 's' : ''}`
    : ''
  const markings = [
    signatureDescription, annotation,
    ...(chordColumns ? [clefNames[clef] + ' clef', ...chordColumns.map((pitches, index) =>
      `Chord ${columnLabels?.[index] ?? index + 1}, ${pitches.map(formatPitch).join(', ')}`)] : []),
    ...(beamGroups?.length ? ['Beam groups ' + beamGroups.join(', ')] : []),
    ...tuplets.map(({ start, count, inTimeOf }) => `Group starting at note ${start + 1}, ${count} in the time of ${inTimeOf}`),
    ...(groupStarts.length ? ['Accents on notes ' + groupStarts.map(index => index + 1).join(', ')] : []),
  ]
  const label = `${hideClef ? 'Rhythm stave' : showClefName ? clefNames[clef] + ' clef staff' : 'Music notation'}${timeSignature ? ', ' + timeSignature : ''}${rhythmDescription ? ', ' + rhythmDescription : ''}${showNames ? ', ' + notes.map(formatPitch).join(', ') : ''}`
  return <div className="staff">
    <svg lang="en" viewBox={`0 ${-above} ${width} ${129 + above + below}`} role="img" aria-label={[label, ...markings].filter(Boolean).join('. ')}>
      {[0, 1, 2, 3, 4].map((line) => <line key={line} x1="16" x2={width - 15} y1={39 + line * 12} y2={39 + line * 12} className="staff-line" />)}
      {answerRange && <g>
        <rect data-pitch-target="" x={(xAt(0) + xAt(1)) / 2} y={87 - answerRange.max * 6 - 3}
          width={width - 16 - (xAt(0) + xAt(1)) / 2} height={(answerRange.max - answerRange.min + 1) * 6}
          fill="currentColor" opacity="0.055"/>
        <line x1={xAt(1)} x2={xAt(1)} y1={87 - answerRange.max * 6} y2={87 - answerRange.min * 6}
          stroke="currentColor" strokeDasharray="2 5" opacity="0.38"/>
      </g>}
      {!hideClef && <ClefMark clef={clef} />}
      {showKeySignature && Array.from({ length: Math.abs(keySignature) }, (_, i) => <text key={i} x={79 + i * 15} y={87 - signPositions[i] * 6 + 7} className="accidental">{keySignature > 0 ? '♯' : '♭'}</text>)}
      {timeSignature?.split('/').map((number, i) => <text key={i} x={startX - 15} y={61 + i * 24} textAnchor="middle" className="time-signature">{number}</text>)}
      {annotation && <text x={startX} y={114 + below} className="score-annotation">{annotation}</text>}
      {notes.map((pitch, i) => {
        const pulse = rhythm?.[i]
        const x = xAt(i)
        const beam = beams.find((item) => i >= item.first && i <= item.last)
        const position = positions[i]
        const y = pulse?.rest ? 63 : 87 - position * 6
        const ledger = position < 0
          ? Array.from({ length: Math.floor(-position / 2) }, (_, n) => -2 * (n + 1))
          : Array.from({ length: Math.max(0, Math.floor((position - 8) / 2)) }, (_, n) => 10 + 2 * n)
        const index = `${pitch.letter}${pitch.octave}`
        const inherited = usedAccidentals.get(index) ?? signature[pitch.letter] ?? 0
        if (!pulse?.rest) usedAccidentals.set(index, pitch.accidental)
        const open = Boolean(chordColumns) || pulse?.value === 'minim' || pulse?.value === 'semibreve' || pulse?.value === 'breve'
        const stem = !chordColumns && (!simultaneous || i === notes.length - 1) && pulse?.value !== 'semibreve' && pulse?.value !== 'breve'
        const stemUp = beam?.stemUp ?? position < 4
        const stemX = x + (stemUp ? 7 : -7)
        const stemEnd = beam?.end ?? y + (stemUp ? -32 : 32) + (simultaneous && !stemUp ? (positions[i] - positions[0]) * 6 : 0)
        const flags = pulse && !beam ? flagCounts[pulse.value] ?? 0 : 0
        const accidental = pitch.accidental === 2 ? '×' : pitch.accidental === -2 ? '♭♭' : formatAccidental(pitch.accidental)
        return <g key={i}>
          {pulse?.rest ? <RestMark value={pulse.value} x={x} y={y} /> : <>
            {ledger.map((line) => <line key={line} x1={x - 12} x2={x + 12} y1={87 - line * 6} y2={87 - line * 6} className="staff-line" />)}
            {pitch.accidental !== inherited && <text x={x - 13 - (columns ? columns[i].accidentalColumn * 11 : simultaneous ? i * 12 : 0)} y={y + 7} textAnchor="end" className="accidental">{pitch.accidental === 0 ? '♮' : accidental}</text>}
            <ellipse cx={x} cy={y} rx="7.9" ry="5.5" transform={chordColumns || pulse?.value === 'semibreve' ? undefined : `rotate(-17 ${x} ${y})`}
              fill={open ? '#fdfbf2' : 'currentColor'} stroke="currentColor" strokeWidth={open ? 2.5 : 1}/>
            {stem && <line x1={stemX} x2={stemX} y1={y} y2={stemEnd} stroke="currentColor" strokeWidth="1.4"/>}
            {pulse?.value === 'breve' && <path d={`M${x - 11} ${y - 8}v16m22-16v16`} stroke="currentColor" strokeWidth="1.4"/>}
            {Array.from({ length: flags }, (_, flag) => <path key={flag}
              d={stemUp ? 'M0 0c3 7 12 8 10 17-1-7-7-7-10-11Z' : 'M0 0c4-7 13-8 11-17-1 7-8 7-11 11Z'}
              transform={`translate(${stemX} ${stemEnd + (stemUp ? 1 : -1) * flag * 7})`} fill="currentColor" />)}
          </>}
          {pulse?.tieAfter && i + 1 < notes.length && <path d={`M${x + 5} ${y - 8}q${span / notes.length / 2 - 5} -11 ${span / notes.length - 10} 0`}
            fill="none" stroke="currentColor" strokeWidth="1.7"/>}
          {Array.from({ length: pulse?.dots ?? 0 }, (_, dot) => <circle key={dot} cx={x + 12 + dot * 6} cy={y + (position % 2 === 0 ? -4 : 0)} r="2" fill="currentColor"/>)}
        </g>
      })}
      {beams.flatMap(({ first, last, end, stemUp, levels }) => Array.from({ length: levels }, (_, level) => {
        const y = end + level * (stemUp ? 6 : -6)
        const offset = stemUp ? 7 : -7
        return <line key={`${first}:${level}`} x1={xAt(first) + offset} x2={xAt(last) + offset} y1={y} y2={y} stroke="currentColor" strokeWidth="4"/>
      }))}
      {columnLabels?.map((label, index) => label && <text key={index} x={columnX(index)}
        y={topMark} textAnchor="middle" fontSize="15" fill="currentColor">{label}</text>)}
      {groupStarts.map(index => <path key={index} d={`M${xAt(index) - 5} ${topMark - 3}l10 3-10 3`} fill="none" stroke="currentColor" strokeWidth="1.5"/>)}
      {tuplets.map(({ start, count, inTimeOf }) => {
        const left = xAt(start) - 7
        const right = xAt(start + count - 1) + 7
        const centre = (left + right) / 2
        return <g key={start} fill="currentColor">
          <path d={`M${left} ${bracketY + 6}v-6H${centre - 15}M${centre + 15} ${bracketY}H${right}v6`} fill="none" stroke="currentColor" strokeWidth="1.4"/>
          <text x={centre} y={bracketY + 5} textAnchor="middle" fontSize="15" fontStyle="italic">{count}:{inTimeOf}</text>
        </g>
      })}
      {rhythm && <line x1={width - 16} x2={width - 16} y1="39" y2="87" stroke="currentColor" strokeWidth="1.4"/>}
    </svg>
    {(showNames || showClefName) && <div className="staff-caption" lang="en">{showClefName && <span>{clefNames[clef]} clef</span>}{showNames && <strong>{notes.map(formatPitch).join(' · ')}</strong>}</div>}
  </div>
}

const chromatic = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']
const black = new Set([1, 3, 6, 8, 10])

export function playPitches(pitches: readonly Pitch[], together = false) {
  return playMidi(pitches.map(midiNumber), together)
}

async function playMidi(notes: readonly number[], together = false) {
  const context = new AudioContext()
  try {
    await context.resume()
    const start = context.currentTime + 0.025
    for (const [index, note] of notes.entries()) {
      const at = start + (together ? 0 : index * 0.42)
      const oscillator = context.createOscillator()
      const envelope = context.createGain()
      oscillator.type = 'triangle'
      oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12)
      envelope.gain.setValueAtTime(0, at)
      envelope.gain.linearRampToValueAtTime(0.17 / (together ? notes.length : 1), at + 0.035)
      envelope.gain.exponentialRampToValueAtTime(0.002, at + 0.39)
      oscillator.connect(envelope).connect(context.destination)
      oscillator.start(at)
      oscillator.stop(at + 0.42)
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 475 + (together ? 0 : Math.max(0, notes.length - 1) * 420)))
  } finally {
    await context.close()
  }
}

export function Keyboard({ pitches }: { pitches: readonly Pitch[] }) {
  const { t } = useInterfaceLanguage()
  const notes = pitches.map(midiNumber)
  const low = Math.min(...notes)
  const high = Math.max(...notes)
  const start = Math.floor(low / 12) * 12
  const end = Math.max(start + 12, high + ((12 - high % 12) % 12))
  const whiteNotes = Array.from({ length: end - start + 1 }, (_, i) => start + i).filter((n) => !black.has(n % 12))
  const [audioError, setAudioError] = useState(false)
  const name = (note: number) => `${chromatic[note % 12]}${Math.floor(note / 12) - 1}`
  const play = (note: number) => { void playMidi([note]).catch(() => setAudioError(true)) }
  return <>
    <div className="keyboard" role="group" aria-label={t('Piano keyboard. Select a key to hear it.', '钢琴键盘。选择琴键即可试听。', false)}>
      {whiteNotes.map((note, i) => <div className="key-slot" key={note}>
        <button type="button" aria-label={t(`Play ${name(note)}`, `试听 ${name(note)}`)} className={`white-key ${notes.includes(note) ? 'key-active' : ''}`} onClick={() => play(note)}>{note % 12 === 0 ? name(note) : ''}</button>
        {i < whiteNotes.length - 1 && black.has((note + 1) % 12) && <button type="button" aria-label={t(`Play ${name(note + 1)}`, `试听 ${name(note + 1)}`)} className={`black-key ${notes.includes(note + 1) ? 'key-active' : ''}`} onClick={() => play(note + 1)} />}
      </div>)}
    </div>
    {audioError && <p role="status" className="muted">{t('Audio is unavailable on this device.', '此设备无法播放音频。', false)}</p>}
  </>
}
