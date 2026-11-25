import { useState } from 'react'
import {
  CLEFS, LETTERS, NOTE_VALUES, buildChromaticScale, buildScale, buildScaleTriad,
  dottedDuration, formatPitch, getKeySignature, invertTriad, keySignatureFor, parsePitch,
  transposeInstrumentPitch, transposeOctaves,
  type Clef, type Inversion, type Pitch, type ScaleForm, type TransposingInstrument,
} from '../theory'
import { Icon } from './Icon'
import { useInterfaceLanguage } from './interfaceLanguage'
import { MetreExplorer, type InitialMetre } from './MetreExplorer'
import { TupletExplorer, type TupletLesson } from './TupletExplorer'
import { Keyboard, Staff, playPitches, type StaffPulse } from './Notation'

const signatures = [0, 1, 2, 3, 4, 5, 6, -6, -5, -4, -3, -2, -1].map(getKeySignature)
const forms = ['major', 'harmonic minor', 'melodic minor', 'natural minor', 'chromatic'] as const
const accidentalNames = ['Double flat', 'Flat', 'Natural', 'Sharp', 'Double sharp']
const clefLabel = (name: string) => name[0].toUpperCase() + name.slice(1)
type ScaleChoice = typeof forms[number]

function ClefSelect({ clef, onChange, label }: { clef: Clef; onChange: (clef: Clef) => void; label?: string }) {
  const { t } = useInterfaceLanguage()
  return <label>{label ?? t('Clef', '谱号')}<select value={clef} onChange={(event) => onChange(event.target.value as Clef)}>
    {CLEFS.map((name) => <option key={name} value={name}>{clefLabel(name)}</option>)}
  </select></label>
}

function AudioButton({ label, notes, together, progression }: { label: string; notes: readonly Pitch[]; together?: boolean; progression?: readonly Pitch[] }) {
  const { t } = useInterfaceLanguage()
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
    {status === 'error' && <p className="muted" role="status">{t('Audio is unavailable on this device.', '此设备无法播放音频。', false)}</p>}</>
}

function SignatureSelect({ count, onChange, minor = false }: { count: number; onChange: (count: number) => void; minor?: boolean }) {
  const { t } = useInterfaceLanguage()
  return <label>{t('Key', '调性')}<select value={count} onChange={(event) => onChange(Number(event.target.value))}>
    {signatures.map((key) => <option key={key.count} value={key.count}>{minor ? key.minor + ' minor' : key.major + ' major'}</option>)}
  </select></label>
}

export function ScaleExplorer({ demo }: { demo?: { clef: Clef; pitches: readonly Pitch[]; keySignature?: number } }) {
  const { t } = useInterfaceLanguage()
  const [count, setCount] = useState(demo?.keySignature ?? 0)
  const [form, setForm] = useState<ScaleChoice>('major')
  const [direction, setDirection] = useState<'ascending' | 'descending'>('ascending')
  const [clef, setClef] = useState<Clef>(demo?.clef ?? 'treble')
  const minor = form.includes('minor')
  const key = getKeySignature(count)
  const start = parsePitch(`${minor ? key.minor : key.major}${clef === 'bass' ? direction === 'descending' ? 4 : 3 : direction === 'descending' ? 5 : 4}`)
  const scale = form === 'chromatic' ? buildChromaticScale(start, direction) : buildScale(start, form, direction)
  return <section className="panel explorer">
    <p className="eyebrow">{t('Interactive example', '互动示例')}</p><h2>{t('Scale and key explorer', '音阶与调性探索')}</h2>
    {demo && <Staff {...demo} showNames={Boolean(demo.pitches.length)} />}
    <div className="explorer-fields"><SignatureSelect count={count} onChange={setCount} minor={minor} />
      <label>{t('Scale form', '音阶类型')}<select value={form} onChange={(event) => setForm(event.target.value as ScaleChoice)}>{forms.map((name) => <option key={name} value={name}>{clefLabel(name)}</option>)}</select></label>
      <label>{t('Direction', '方向')}<select value={direction} onChange={(event) => setDirection(event.target.value as typeof direction)}><option value="ascending">Ascending</option><option value="descending">Descending</option></select></label>
      <ClefSelect clef={clef} onChange={setClef} />
    </div>
    <div className="circle-fifths" aria-label={t('Circle of fifths', '五度圈')}>
      {signatures.filter((item) => item.count !== -6).map((item, i) => {
        const angle = (i * 30 - 90) * Math.PI / 180
        const isSelected = item.count === count || item.count === 6 && count === -6
        return <button key={item.count} title={item.count === 6 ? t('F sharp or G flat major', 'F♯ 大调或 G♭ 大调', false) : item.major + ' major'}
          style={{ left: `${50 + 41 * Math.cos(angle)}%`, top: `${50 + 41 * Math.sin(angle)}%` }}
          aria-pressed={isSelected} onClick={() => setCount(item.count === 6 && count === 6 ? -6 : item.count)}>{item.count === 6 ? 'F♯/G♭' : item.major}</button>
      })}
      <div className="circle-label" aria-live="polite"><strong>{key.major} major</strong><span>{key.minor} minor</span><small>{count
        ? t(`${Math.abs(count)} ${count > 0 ? 'sharp' : 'flat'}${Math.abs(count) === 1 ? '' : 's'}`, `${Math.abs(count)} 个${count > 0 ? '升号' : '降号'}`, false)
        : t('No sharps or flats', '无升降号', false)}</small></div>
    </div>
    <Staff clef={clef} pitches={scale} keySignature={form === 'chromatic' ? 0 : count} showNames />
    <AudioButton label={t('Play scale', '播放音阶')} notes={scale} />
  </section>
}

export function PitchExplorer({ demo, instrumentMode, transposeMode }: {
  demo?: { clef: Clef; pitches: readonly Pitch[]; keySignature?: number }; instrumentMode?: boolean; transposeMode?: boolean
}) {
  const { t } = useInterfaceLanguage()
  const [pitch, setPitch] = useState(() => demo?.pitches[0] ?? parsePitch('C4'))
  const [clef, setClef] = useState<Clef>(demo?.clef ?? 'treble')
  const [destination, setDestination] = useState<Clef>('bass')
  const [octaves, setOctaves] = useState(-1)
  const [instrument, setInstrument] = useState<TransposingInstrument>('B♭')
  const [target, setTarget] = useState<'written' | 'sounding'>('sounding')
  const next = instrumentMode ? transposeInstrumentPitch(pitch, instrument, target) : transposeOctaves(pitch, octaves)
  return <section className="panel explorer">
    <p className="eyebrow">{t('Interactive example', '互动示例')}</p><h2>{instrumentMode ? t('Written and sounding pitch', '记谱音高与实际音高') : transposeMode ? t('Octave transposition', '八度移调') : t('Pitch and clef explorer', '音高与谱号探索')}</h2>
    {demo && <Staff {...demo} showNames />}
    <div className="explorer-fields">
      <label>{t('Letter', '音名字母')}<select value={pitch.letter} onChange={(e) => setPitch({ ...pitch, letter: e.target.value as Pitch['letter'] })}>{LETTERS.map((letter) => <option key={letter}>{letter}</option>)}</select></label>
      <label>{t('Accidental', '变化记号')}<select value={pitch.accidental} onChange={(e) => setPitch({ ...pitch, accidental: Number(e.target.value) })}>{accidentalNames.map((name, i) => <option key={name} value={i - 2}>{name}</option>)}</select></label>
      <label>{t('Octave', '八度')}<select value={pitch.octave} onChange={(e) => setPitch({ ...pitch, octave: Number(e.target.value) })}>{[2, 3, 4, 5, 6].map((i) => <option key={i}>{i}</option>)}</select></label>
      <ClefSelect clef={clef} onChange={setClef} label={transposeMode ? t('Source clef', '原谱号') : undefined}/>
      {transposeMode && <ClefSelect clef={destination} onChange={setDestination} label={t('Destination clef', '目标谱号')} />}
      {transposeMode && !instrumentMode && <label>{t('Destination octave', '目标八度')}<select value={octaves} onChange={(e) => setOctaves(Number(e.target.value))}><option value={-1}>{t('One octave lower', '低一个八度')}</option><option value={0}>{t('Same pitch', '相同音高')}</option><option value={1}>{t('One octave higher', '高一个八度')}</option></select></label>}
      {instrumentMode && <>
        <label>{t('Transposing instrument', '移调乐器')}<select value={instrument} onChange={(e) => setInstrument(e.target.value as TransposingInstrument)}><option value="B♭">{t('Instrument in B♭', 'B♭ 调乐器')}</option><option value="A">{t('Instrument in A', 'A 调乐器')}</option><option value="F">{t('Instrument in F', 'F 调乐器')}</option></select></label>
        <label>{t('Convert to', '转换为')}<select value={target} onChange={(e) => setTarget(e.target.value as typeof target)}><option value="sounding">Sounding pitch</option><option value="written">Written pitch</option></select></label>
      </>}
    </div>
    {instrumentMode && <h3>{target === 'sounding' ? t('Written pitch', '记谱音高') : t('Sounding pitch', '实际音高')}</h3>}
    <Staff clef={clef} pitches={[pitch]} showNames />
    {transposeMode && <><h3>{instrumentMode ? target === 'sounding' ? t('Sounding pitch', '实际音高') : t('Written pitch', '记谱音高') : t('Transposed pitch', '移调后的音高')}</h3>
      <Staff clef={destination} pitches={[next]} showNames /></>}
    <Keyboard pitches={transposeMode ? [pitch, next] : [pitch]} />
  </section>
}

const baseValues = Object.keys(NOTE_VALUES) as StaffPulse['value'][]

export function RhythmExplorer({ metre = false, tuplet, chinese, ...initialMetre }: { metre?: boolean; tuplet?: TupletLesson; chinese?: boolean } & InitialMetre) {
  const { t } = useInterfaceLanguage()
  const [value, setValue] = useState<StaffPulse['value']>('crotchet')
  const [dots, setDots] = useState<0 | 1 | 2>(0)
  const [rest, setRest] = useState(false)
  const duration = dottedDuration(NOTE_VALUES[value], dots)
  const semibreves = duration.numerator / duration.denominator
  const blocks = Math.max(1, Math.ceil(semibreves))
  return <section className="panel explorer">
    <p className="eyebrow">{t('Interactive example', '互动示例')}</p><h2>{tuplet ? t('Tuplet explorer', '连音探索') : metre ? t('Metre and grouping explorer', '拍子与分组探索') : t('Rhythmic duration explorer', '节奏时值探索')}</h2>
    {tuplet ? <TupletExplorer lesson={tuplet} chinese={chinese} /> : metre ? <MetreExplorer {...initialMetre} /> : <>
      <div className="explorer-fields">
        <label>{t('Note value', '音符时值')}<select value={value} onChange={(e) => setValue(e.target.value as StaffPulse['value'])}>{baseValues.map((name) => <option key={name} value={name}>{clefLabel(name)}</option>)}</select></label>
        <label>{t('Dots', '附点数')}<select value={dots} onChange={(e) => setDots(Number(e.target.value) as typeof dots)}>{[0, 1, 2].map((count) => <option key={count}>{count}</option>)}</select></label>
        <label>{t('Symbol', '符号')}<select value={rest ? 'rest' : 'note'} onChange={(e) => setRest(e.target.value === 'rest')}><option value="note">{t('Note', '音符（Note）', false)}</option><option value="rest">{t('Rest', '休止符（Rest）', false)}</option></select></label>
      </div>
      <Staff rhythm={[{ value, dots: dots || undefined, rest }]} hideClef showClefName={false} />
      <p aria-live="polite"><strong>{duration.numerator}{duration.denominator > 1 ? '/' + duration.denominator : ''}</strong> {t('semibreve units', '个全音符时值（semibreve units）', false)}</p>
      <div className="duration-units" aria-hidden="true">{Array.from({ length: blocks }, (_, i) => <span key={i}><i style={{ width: `${Math.min(1, semibreves - i) * 100}%` }} /></span>)}</div>
    </>}
  </section>
}

const progression = { Perfect: [5, 1], Plagal: [4, 1], Imperfect: [1, 5] } as const

export function HarmonyExplorer({ cadence }: { cadence: boolean }) {
  const { t } = useInterfaceLanguage()
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
    <p className="eyebrow">{t('Interactive example', '互动示例')}</p><h2>{cadence ? t('Cadence explorer', '终止式探索') : t('Triad explorer', '三和弦探索')}</h2>
    <div className="explorer-fields">
      {cadence ? <>
        <label>{t('Key', '调性')}<select value={count} onChange={(e) => setCount(Number(e.target.value))}>{[-1, 0, 1, 2].map((n) => <option key={n} value={n}>{getKeySignature(n).major} major</option>)}</select></label>
        <label>{t('Cadence', '终止式')}<select value={label} onChange={(e) => setLabel(e.target.value as typeof label)}>{Object.keys(progression).map((item) => <option key={item}>{item}</option>)}</select></label>
      </> : <>
        <SignatureSelect count={count} onChange={setCount} minor={form !== 'major'} />
        <label>{t('Mode', '调式')}<select value={form} onChange={(e) => setForm(e.target.value as typeof form)}><option value="major">Major</option><option value="harmonic minor">Harmonic minor</option></select></label>
        <label>{t('Root degree', '根音音级')}<select value={degree} onChange={(e) => setDegree(Number(e.target.value))}><option value="1">Tonic</option><option value="2">Supertonic</option><option value="4">Subdominant</option><option value="5">Dominant</option></select></label>
        <label>{t('Position', '和弦位置')}<select value={inversion} onChange={(e) => setInversion(Number(e.target.value) as Inversion)}><option value="0">Root position (a)</option><option value="1">First inversion (b)</option><option value="2">Second inversion (c)</option></select></label>
      </>}
    </div>
    <Staff pitches={notes} keySignature={signature} showNames simultaneous />
    {cadence && <Staff pitches={next} keySignature={signature} showNames simultaneous />}
    {!cadence && <p aria-live="polite">{t(`Lowest note · ${formatPitch(notes[0])}`, `最低音：${formatPitch(notes[0])}`, false)}</p>}
    <AudioButton label={cadence ? t('Play progression', '播放和弦进行') : t('Play chord', '播放和弦')} notes={notes} progression={cadence ? next : undefined} together />
  </section>
}
