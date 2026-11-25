import { useState } from 'react'
import { CLEFS, LETTERS, describeInterval, formatInterval, formatPitch, parsePitch, type Clef, type Pitch } from '../theory'
import { Icon } from './Icon'
import { useInterfaceLanguage } from './interfaceLanguage'
import { Keyboard, Staff, playPitches } from './Notation'

const accidentals = ['Double flat', 'Flat', 'Natural', 'Sharp', 'Double sharp']

function PitchControls({ title, pitch, onChange }: { title: string; pitch: Pitch; onChange: (pitch: Pitch) => void }) {
  const { t } = useInterfaceLanguage()
  return <fieldset className="pitch-controls">
    <legend>{title}</legend>
    <label>{t('Letter', '音名字母')}<select value={pitch.letter} onChange={(event) => onChange({ ...pitch, letter: event.target.value as Pitch['letter'] })}>
      {LETTERS.map((letter) => <option key={letter}>{letter}</option>)}
    </select></label>
    <label>{t('Accidental', '变化记号')}<select value={pitch.accidental} onChange={(event) => onChange({ ...pitch, accidental: Number(event.target.value) })}>
      {accidentals.map((name, i) => <option key={name} value={i - 2}>{name}</option>)}
    </select></label>
    <label>{t('Octave', '八度')}<select value={pitch.octave} onChange={(event) => onChange({ ...pitch, octave: Number(event.target.value) })}>
      {[2, 3, 4, 5, 6].map((octave) => <option key={octave}>{octave}</option>)}
    </select></label>
  </fieldset>
}

export function IntervalExplorer({ initial }: { initial: [string, string] }) {
  const { t } = useInterfaceLanguage()
  const [first, setFirst] = useState(() => parsePitch(initial[0]))
  const [second, setSecond] = useState(() => parsePitch(initial[1]))
  const [clef, setClef] = useState<Clef>('treble')
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState(false)
  const pitches = [first, second]
  const interval = describeInterval(first, second)
  const semitones = Math.abs(interval.semitones)
  const play = async (together: boolean) => {
    setPlaying(true)
    setError(false)
    try { await playPitches(pitches, together) } catch { setError(true) } finally { setPlaying(false) }
  }
  return <section className="panel explorer" aria-labelledby="explorer-title">
    <div className="between">
      <div><p className="eyebrow">{t('Interactive example', '互动示例')}</p><h2 id="explorer-title">{t('Interval explorer', '音程探索')}</h2></div>
      <label className="clef-select">{t('Clef', '谱号')}<select value={clef} onChange={(event) => setClef(event.target.value as Clef)}>
        {CLEFS.map((name) => <option key={name} value={name}>{name[0].toUpperCase() + name.slice(1)}</option>)}
      </select></label>
    </div>
    <Staff pitches={pitches} clef={clef} showNames />
    <div className="interval-facts" aria-live="polite">
      <strong>{formatInterval(interval)}</strong>
      <span>{t(`${interval.number} letter positions`, `${interval.number} 个字母位置`)}</span>
      <span>{t(`${semitones} semitones`, `${semitones} 个半音（semitones）`, false)}</span>
    </div>
    <PitchControls title={t('First note', '第一个音')} pitch={first} onChange={setFirst} />
    <PitchControls title={t('Second note', '第二个音')} pitch={second} onChange={setSecond} />
    <Keyboard pitches={pitches} />
    <div className="button-row">
      <button className="button secondary" disabled={playing} onClick={() => void play(false)}><Icon name="sound" size={17} /> {t(`Play ${formatPitch(first)} then ${formatPitch(second)}`, `依次播放 ${formatPitch(first)}、${formatPitch(second)}`, false)}</button>
      <button className="button secondary" disabled={playing} onClick={() => void play(true)}>{t('Play together', '同时播放')}</button>
    </div>
    {error && <p role="status" className="muted">{t('Audio is unavailable on this device.', '此设备无法播放音频。', false)}</p>}
  </section>
}
