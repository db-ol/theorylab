import { useState } from 'react'
import {
  CLEFS, LETTERS, NOTE_VALUES, buildChromaticScale, buildScale, buildScaleTriad,
  dottedDuration, formatPitch, getKeySignature, invertTriad, keySignatureFor, parsePitch,
  transposeInstrumentPitch, transposeOctaves,
  type Clef, type Inversion, type Pitch, type ScaleForm, type TransposingInstrument,
} from '../theory'
import { Icon } from './Icon'
import { Keyboard, Staff, playPitches, type StaffPulse } from './Notation'

const signatures = [0, 1, 2, 3, 4, 5, 6, -6, -5, -4, -3, -2, -1].map(getKeySignature)
const forms = ['major', 'harmonic minor', 'melodic minor', 'natural minor', 'chromatic'] as const
const accidentalNames = ['Double flat', 'Flat', 'Natural', 'Sharp', 'Double sharp']
const clefLabel = (name: string) => name[0].toUpperCase() + name.slice(1)
type ScaleChoice = typeof forms[number]

function ClefSelect({ clef, onChange, label = 'Clef' }: { clef: Clef; onChange: (clef: Clef) => void; label?: string }) {
  return <label>{label}<select value={clef} onChange={(event) => onChange(event.target.value as Clef)}>
    {CLEFS.map((name) => <option key={name} value={name}>{clefLabel(name)}</option>)}
  </select></label>
}

function AudioButton({ label, notes, together, progression }: { label: string; notes: readonly Pitch[]; together?: boolean; progression?: readonly Pitch[] }) {
  const [status, setStatus] = useState<'idle' | 'playing' | 'error'>('idle')
  const play = async () => {
    setStatus('playing')
    try {
      await playPitches(notes, together)
      if (progression) await playPitches(progression, together)
      setStatus('idle')
    } catch { setStatus('error') }
  }
  return <><button className="button secondary" type="button" disabled={status === 'playing'} onClick={() => void play()}><Icon name="sound" size={17}/> {label}</button>
    {status === 'error' && <p className="muted" role="status">Audio is unavailable on this device.</p>}</>
}

function SignatureSelect({ count, onChange, minor = false }: { count: number; onChange: (count: number) => void; minor?: boolean }) {
  return <label>Key<select value={count} onChange={(event) => onChange(Number(event.target.value))}>
    {signatures.map((key) => <option key={key.count} value={key.count}>{minor ? key.minor + ' minor' : key.major + ' major'}</option>)}
  </select></label>
}

export function ScaleExplorer({ demo }: { demo?: { clef: Clef; pitches: readonly Pitch[]; keySignature?: number } }) {
  const [count, setCount] = useState(demo?.keySignature ?? 0)
  const [form, setForm] = useState<ScaleChoice>('major')
  const [direction, setDirection] = useState<'ascending' | 'descending'>('ascending')
  const [clef, setClef] = useState<Clef>(demo?.clef ?? 'treble')
  const minor = form.includes('minor')
  const key = getKeySignature(count)
  const start = parsePitch(`${minor ? key.minor : key.major}${clef === 'bass' ? direction === 'descending' ? 4 : 3 : direction === 'descending' ? 5 : 4}`)
  const scale = form === 'chromatic' ? buildChromaticScale(start, direction) : buildScale(start, form, direction)
  return <section className="panel explorer">
    <p className="eyebrow">Interactive example</p><h2>Scale and key explorer</h2>
    {demo && <Staff {...demo} showNames={Boolean(demo.pitches.length)} />}
    <div className="explorer-fields"><SignatureSelect count={count} onChange={setCount} minor={minor} />
      <label>Scale form<select value={form} onChange={(event) => setForm(event.target.value as ScaleChoice)}>{forms.map((name) => <option key={name} value={name}>{clefLabel(name)}</option>)}</select></label>
      <label>Direction<select value={direction} onChange={(event) => setDirection(event.target.value as typeof direction)}><option value="ascending">Ascending</option><option value="descending">Descending</option></select></label>
      <ClefSelect clef={clef} onChange={setClef} />
    </div>
    <div className="circle-fifths" aria-label="Circle of fifths">
      {signatures.filter((item) => item.count !== -6).map((item, i) => {
        const angle = (i * 30 - 90) * Math.PI / 180
        const isSelected = item.count === count || item.count === 6 && count === -6
        return <button key={item.count} title={item.count === 6 ? 'F sharp or G flat major' : item.major + ' major'}
          style={{ left: `${50 + 41 * Math.cos(angle)}%`, top: `${50 + 41 * Math.sin(angle)}%` }}
          aria-pressed={isSelected} onClick={() => setCount(item.count === 6 && count === 6 ? -6 : item.count)}>{item.count === 6 ? 'F♯/G♭' : item.major}</button>
      })}
      <div className="circle-label" aria-live="polite"><strong>{key.major} major</strong><span>{key.minor} minor</span><small>{count ? `${Math.abs(count)} ${count > 0 ? 'sharp' : 'flat'}${Math.abs(count) === 1 ? '' : 's'}` : 'No sharps or flats'}</small></div>
    </div>
    <Staff clef={clef} pitches={scale} keySignature={form === 'chromatic' ? 0 : count} showNames />
    <AudioButton label="Play scale" notes={scale} />
  </section>
}

export function PitchExplorer({ demo, instrumentMode, transposeMode }: {
  demo?: { clef: Clef; pitches: readonly Pitch[]; keySignature?: number }; instrumentMode?: boolean; transposeMode?: boolean
}) {
  const [pitch, setPitch] = useState(() => demo?.pitches[0] ?? parsePitch('C4'))
  const [clef, setClef] = useState<Clef>(demo?.clef ?? 'treble')
  const [destination, setDestination] = useState<Clef>('bass')
  const [octaves, setOctaves] = useState(-1)
  const [instrument, setInstrument] = useState<TransposingInstrument>('B♭')
  const [target, setTarget] = useState<'written' | 'sounding'>('sounding')
  const next = instrumentMode ? transposeInstrumentPitch(pitch, instrument, target) : transposeOctaves(pitch, octaves)
  return <section className="panel explorer">
    <p className="eyebrow">Interactive example</p><h2>{instrumentMode ? 'Written and sounding pitch' : transposeMode ? 'Octave transposition' : 'Pitch and clef explorer'}</h2>
    {demo && <Staff {...demo} showNames />}
    <div className="explorer-fields">
      <label>Letter<select value={pitch.letter} onChange={(e) => setPitch({ ...pitch, letter: e.target.value as Pitch['letter'] })}>{LETTERS.map((letter) => <option key={letter}>{letter}</option>)}</select></label>
      <label>Accidental<select value={pitch.accidental} onChange={(e) => setPitch({ ...pitch, accidental: Number(e.target.value) })}>{accidentalNames.map((name, i) => <option key={name} value={i - 2}>{name}</option>)}</select></label>
      <label>Octave<select value={pitch.octave} onChange={(e) => setPitch({ ...pitch, octave: Number(e.target.value) })}>{[2, 3, 4, 5, 6].map((i) => <option key={i}>{i}</option>)}</select></label>
      <ClefSelect clef={clef} onChange={setClef} label={transposeMode ? 'Source clef' : 'Clef'}/>
      {transposeMode && <ClefSelect clef={destination} onChange={setDestination} label="Destination clef" />}
      {transposeMode && !instrumentMode && <label>Destination octave<select value={octaves} onChange={(e) => setOctaves(Number(e.target.value))}><option value={-1}>One octave lower</option><option value={0}>Same pitch</option><option value={1}>One octave higher</option></select></label>}
      {instrumentMode && <>
        <label>Transposing instrument<select value={instrument} onChange={(e) => setInstrument(e.target.value as TransposingInstrument)}><option value="B♭">Instrument in B♭</option><option value="A">Instrument in A</option><option value="F">Instrument in F</option></select></label>
        <label>Convert to<select value={target} onChange={(e) => setTarget(e.target.value as typeof target)}><option value="sounding">Sounding pitch</option><option value="written">Written pitch</option></select></label>
      </>}
    </div>
    {instrumentMode && <h3>{target === 'sounding' ? 'Written pitch' : 'Sounding pitch'}</h3>}
    <Staff clef={clef} pitches={[pitch]} showNames />
    {transposeMode && <><h3>{instrumentMode ? target === 'sounding' ? 'Sounding pitch' : 'Written pitch' : 'Transposed pitch'}</h3>
      <Staff clef={destination} pitches={[next]} showNames /></>}
    <Keyboard pitches={transposeMode ? [pitch, next] : [pitch]} />
  </section>
}

const metrePatterns: Record<string, number[]> = {
  '2/2': [2, 2], '3/2': [2, 2, 2], '4/2': [2, 2, 2, 2],
  '2/4': [2, 2], '3/4': [2, 2, 2], '4/4': [2, 2, 2, 2],
  '2/8': [2, 2], '3/8': [2, 2, 2], '4/8': [2, 2, 2, 2],
  '6/4': [3, 3], '9/4': [3, 3, 3], '12/4': [3, 3, 3, 3],
  '6/8': [3, 3], '9/8': [3, 3, 3], '12/8': [3, 3, 3, 3],
  '6/16': [3, 3], '9/16': [3, 3, 3], '12/16': [3, 3, 3, 3],
  '5/8': [2, 3], '7/8': [2, 2, 3], '5/4': [2, 3], '7/4': [2, 2, 3],
}
const baseValues = Object.keys(NOTE_VALUES) as StaffPulse['value'][]

export function RhythmExplorer({ metre = false }: { metre?: boolean }) {
  const [time, setTime] = useState('6/8')
  const [reverse, setReverse] = useState(false)
  const [value, setValue] = useState<StaffPulse['value']>('crotchet')
  const [dots, setDots] = useState<0 | 1 | 2>(0)
  const [rest, setRest] = useState(false)
  const pattern = reverse ? [...metrePatterns[time]].reverse() : metrePatterns[time]
  const family = pattern.every((size) => size === 2) ? 'Simple' : pattern.every((size) => size === 3) ? 'Compound' : 'Irregular'
  const pulseUnit = ({
    '2': 'crotchet', '4': family === 'Simple' ? 'quaver' : 'crotchet',
    '8': family === 'Simple' ? 'semiquaver' : 'quaver', '16': 'semiquaver',
  } as const)[time.split('/')[1] as '2' | '4' | '8' | '16']
  const duration = dottedDuration(NOTE_VALUES[value], dots)
  const semibreves = duration.numerator / duration.denominator
  const blocks = Math.max(1, Math.ceil(semibreves))
  return <section className="panel explorer">
    <p className="eyebrow">Interactive example</p><h2>{metre ? 'Metre and grouping explorer' : 'Rhythmic duration explorer'}</h2>
    {metre ? <>
      <div className="explorer-fields"><label>Time signature<select value={time} onChange={(e) => setTime(e.target.value)}>
        {Object.keys(metrePatterns).map((item) => <option key={item}>{item}</option>)}
      </select></label></div>
      <p className="metre-caption" aria-live="polite">{family} metre · {pattern.length} main beats · {pattern.join(' + ')}</p>
      <div className="beat-track" aria-label="Beat groups">
        {pattern.map((size, i) => <div key={i} className="beat-group" style={{ flex: size }}>
          <span>Beat {i + 1}</span>
          <div>{Array.from({ length: size }, (_, j) => <span key={j} aria-label={`Subdivision ${j + 1}`} className={j === 0 ? 'beat-accent' : ''} />)}</div>
        </div>)}
      </div>
      <Staff rhythm={pattern.flatMap((size) => Array.from({ length: size }, () => ({ value: pulseUnit })))}
        beamGroups={pattern} timeSignature={time} hideClef showClefName={false} />
      {family === 'Irregular' && <button className="button secondary" onClick={() => setReverse(!reverse)}>Reverse group order</button>}
    </> : <>
      <div className="explorer-fields">
        <label>Note value<select value={value} onChange={(e) => setValue(e.target.value as StaffPulse['value'])}>{baseValues.map((name) => <option key={name} value={name}>{clefLabel(name)}</option>)}</select></label>
        <label>Dots<select value={dots} onChange={(e) => setDots(Number(e.target.value) as typeof dots)}>{[0, 1, 2].map((count) => <option key={count}>{count}</option>)}</select></label>
        <label>Symbol<select value={rest ? 'rest' : 'note'} onChange={(e) => setRest(e.target.value === 'rest')}><option value="note">Note</option><option value="rest">Rest</option></select></label>
      </div>
      <Staff rhythm={[{ value, dots: dots || undefined, rest }]} hideClef showClefName={false} />
      <p aria-live="polite"><strong>{duration.numerator}{duration.denominator > 1 ? '/' + duration.denominator : ''}</strong> semibreve units</p>
      <div className="duration-units" aria-hidden="true">{Array.from({ length: blocks }, (_, i) => <span key={i}><i style={{ width: `${Math.min(1, semibreves - i) * 100}%` }} /></span>)}</div>
    </>}
  </section>
}

const progression = { Perfect: [5, 1], Plagal: [4, 1], Imperfect: [1, 5] } as const

export function HarmonyExplorer({ cadence }: { cadence: boolean }) {
  const [count, setCount] = useState(0)
  const [form, setForm] = useState<'major' | 'harmonic minor'>('major')
  const [degree, setDegree] = useState(1)
  const [inversion, setInversion] = useState<Inversion>(0)
  const [label, setLabel] = useState<keyof typeof progression>('Perfect')
  const key = getKeySignature(count)
  const tonic = parsePitch(`${form === 'major' ? key.major : key.minor}4`)
  const signature = keySignatureFor(tonic, form === 'major' ? 'major' : 'minor').count
  const chord = (nextDegree: number, scale: ScaleForm = form) => invertTriad(buildScaleTriad(tonic, scale, nextDegree), cadence ? 0 : inversion)
  const notes = chord(cadence ? progression[label][0] : degree)
  const next = chord(progression[label][1])
  return <section className="panel explorer">
    <p className="eyebrow">Interactive example</p><h2>{cadence ? 'Cadence explorer' : 'Triad explorer'}</h2>
    <div className="explorer-fields">
      {cadence ? <>
        <label>Key<select value={count} onChange={(e) => setCount(Number(e.target.value))}>{[-1, 0, 1, 2].map((n) => <option key={n} value={n}>{getKeySignature(n).major} major</option>)}</select></label>
        <label>Cadence<select value={label} onChange={(e) => setLabel(e.target.value as typeof label)}>{Object.keys(progression).map((item) => <option key={item}>{item}</option>)}</select></label>
      </> : <>
        <SignatureSelect count={count} onChange={setCount} minor={form !== 'major'} />
        <label>Mode<select value={form} onChange={(e) => setForm(e.target.value as typeof form)}><option value="major">Major</option><option value="harmonic minor">Harmonic minor</option></select></label>
        <label>Root degree<select value={degree} onChange={(e) => setDegree(Number(e.target.value))}><option value="1">Tonic</option><option value="2">Supertonic</option><option value="4">Subdominant</option><option value="5">Dominant</option></select></label>
        <label>Position<select value={inversion} onChange={(e) => setInversion(Number(e.target.value) as Inversion)}><option value="0">Root position (a)</option><option value="1">First inversion (b)</option><option value="2">Second inversion (c)</option></select></label>
      </>}
    </div>
    <Staff pitches={notes} keySignature={signature} showNames simultaneous />
    {cadence && <Staff pitches={next} keySignature={signature} showNames simultaneous />}
    {!cadence && <p aria-live="polite">Lowest note · {formatPitch(notes[0])}</p>}
    <AudioButton label={cadence ? 'Play progression' : 'Play chord'} notes={notes} progression={cadence ? next : undefined} together />
  </section>
}
