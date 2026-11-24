import { useState } from 'react'
import { CLEFS, LETTERS, describeInterval, formatInterval, formatPitch, parsePitch, type Clef, type Pitch } from '../theory'
import { Icon } from './Icon'
import { Keyboard, Staff, playPitches } from './Notation'

const accidentals = ['Double flat', 'Flat', 'Natural', 'Sharp', 'Double sharp']

function PitchControls({ title, pitch, onChange }: { title: string; pitch: Pitch; onChange: (pitch: Pitch) => void }) {
  return <fieldset className="pitch-controls">
    <legend>{title}</legend>
    <label>Letter<select value={pitch.letter} onChange={(event) => onChange({ ...pitch, letter: event.target.value as Pitch['letter'] })}>
      {LETTERS.map((letter) => <option key={letter}>{letter}</option>)}
    </select></label>
    <label>Accidental<select value={pitch.accidental} onChange={(event) => onChange({ ...pitch, accidental: Number(event.target.value) })}>
      {accidentals.map((name, i) => <option key={name} value={i - 2}>{name}</option>)}
    </select></label>
    <label>Octave<select value={pitch.octave} onChange={(event) => onChange({ ...pitch, octave: Number(event.target.value) })}>
      {[2, 3, 4, 5, 6].map((octave) => <option key={octave}>{octave}</option>)}
    </select></label>
  </fieldset>
}

export function IntervalExplorer({ initial }: { initial: [string, string] }) {
  const [first, setFirst] = useState(() => parsePitch(initial[0]))
  const [second, setSecond] = useState(() => parsePitch(initial[1]))
  const [clef, setClef] = useState<Clef>('treble')
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState(false)
  const pitches = [first, second]
  const interval = describeInterval(first, second)
  const play = async (together: boolean) => {
    setPlaying(true)
    setError(false)
    try { await playPitches(pitches, together) } catch { setError(true) } finally { setPlaying(false) }
  }
  return <section className="panel explorer" aria-labelledby="explorer-title">
    <div className="between">
      <div><p className="eyebrow">Interactive example</p><h2 id="explorer-title">Interval explorer</h2></div>
      <label className="clef-select">Clef<select value={clef} onChange={(event) => setClef(event.target.value as Clef)}>
        {CLEFS.map((name) => <option key={name} value={name}>{name[0].toUpperCase() + name.slice(1)}</option>)}
      </select></label>
    </div>
    <Staff pitches={pitches} clef={clef} showNames />
    <div className="interval-facts" aria-live="polite">
      <strong>{formatInterval(interval)}</strong>
      <span>{interval.number} letter positions</span><span>{Math.abs(interval.semitones)} semitones</span>
    </div>
    <PitchControls title="First note" pitch={first} onChange={setFirst} />
    <PitchControls title="Second note" pitch={second} onChange={setSecond} />
    <Keyboard pitches={pitches} />
    <div className="button-row">
      <button className="button secondary" disabled={playing} onClick={() => void play(false)}><Icon name="sound" size={17} /> Play {formatPitch(first)} then {formatPitch(second)}</button>
      <button className="button secondary" disabled={playing} onClick={() => void play(true)}>Play together</button>
    </div>
    {error && <p role="status" className="muted">Audio is unavailable on this device.</p>}
  </section>
}
