import { useState } from 'react'
import { instruments, ornaments, percussion, supplementalFacts, voices } from '../curriculum/musicReference'
import { performanceTerms } from '../curriculum/performanceTerms'
import { pitchAtStaffPosition, type Clef } from '../theory'
import { Staff } from './Notation'

function ReferenceList({ entries, chinese }: {
  entries: readonly { label: string; meaning: string; explanation?: string }[]
  chinese: boolean
}) {
  return <ul className="marks-list">{entries.map(({ label, meaning, explanation }) =>
    <li key={label}>
      <strong>{label}</strong><span>{meaning}{chinese && explanation && <> <span lang="zh-Hans">{explanation}</span></>}</span>
    </li>,
  )}</ul>
}

function RepeatDemonstration() {
  const [secondPass, setSecondPass] = useState(false)
  const bars = secondPass ? [1, 2, 4] : [1, 2, 3]
  return <section className="panel">
    <h2>Repeat endings</h2>
    <div className="tags" aria-label={`Playing order on pass ${secondPass ? 2 : 1}`}>
      {bars.map(bar => <span key={bar}>Bar {bar}{bar === 3 ? ' · First ending' : bar === 4 ? ' · Second ending' : ''}</span>)}
    </div>
    <p role="status">{secondPass ? 'Second pass. Skip the first ending.' : 'First pass. Return to bar 1 after the first ending.'}</p>
    <button type="button" className="button secondary" onClick={() => setSecondPass(value => !value)}>{secondPass ? 'Show first pass' : 'Show second pass'}</button>
    <h3>Multibar rest</h3><p><strong aria-hidden="true">4 ━━━━━</strong> Four bars of silence</p>
  </section>
}

function OrnamentSign({ name }: { name: (typeof ornaments)[number]['name'] }) {
  if (name === 'trill') return <strong aria-label="The letters tr">tr</strong>
  if (name === 'upper turn') return <svg width="46" height="32" viewBox="0 0 46 32" role="img" aria-label="A sideways S shape">
    <path d="M2 16q5-12 12-5l8 8q8 8 14 0 5-8-1-10M22 19l-4-4Q9 6 4 13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
  if (name === 'acciaccatura' || name === 'appoggiatura') {
    const slash = name === 'acciaccatura'
    return <svg width="40" height="32" viewBox="0 0 40 32" role="img" aria-label={slash ? 'Small note with stem slash' : 'Small note without stem slash'}>
      <ellipse cx="13" cy="24" rx="6" ry="4" transform="rotate(-20 13 24)" fill="currentColor" />
      <path d="M18 23V4q2 6 10 9" fill="none" stroke="currentColor" strokeWidth="2" />
      {slash && <path d="M11 16l15-9" fill="none" stroke="currentColor" strokeWidth="1.5" />}
    </svg>
  }
  const lower = name === 'lower mordent'
  return <svg width="46" height="30" viewBox="0 0 46 30" role="img" aria-label={lower ? 'Zigzag with vertical stroke' : 'Zigzag with no vertical stroke'}>
    <path d="m2 19 8-8 8 8 8-8 8 8 8-8" fill="none" stroke="currentColor" strokeWidth="2.5" />
    {lower && <path d="M22 4v24" fill="none" stroke="currentColor" strokeWidth="2" />}
  </svg>
}

function OrnamentVisual({ chinese }: { chinese: boolean }) {
  const [index, setIndex] = useState(0)
  const ornament = ornaments[index]
  const pitches = 'offsets' in ornament ? ornament.offsets.map(offset => pitchAtStaffPosition(4 + offset, 'treble')) : []
  return <section className="panel">
    <h2>Ornament examples</h2>
    <label>Ornament <select value={index} onChange={event => setIndex(Number(event.target.value))}>
      {ornaments.map((item, i) => <option value={i} key={item.name}>{item.name}</option>)}
    </select></label>
    <p><OrnamentSign name={ornament.name} /> <span>{ornament.sign}</span></p>
    {pitches.length > 0 && <Staff clef="treble" pitches={pitches} showNames />}
    {chinese && <p lang="zh-Hans">{ornament.description}</p>}
  </section>
}

function InstrumentVisual({ objectiveId, chinese }: { objectiveId: string; chinese: boolean }) {
  if (objectiveId === 'INS-5-VOICE') return <section className="panel"><h2>Voice registers</h2>
    <ReferenceList entries={voices.map(([label, meaning, explanation]) => ({ label, meaning, explanation }))} chinese={chinese} />
  </section>
  if (objectiveId.endsWith('PERCUSSION')) {
    const pool = objectiveId === 'INS-4-PERCUSSION' ? percussion.slice(0, 4) : percussion.slice(4)
    return <section className="panel"><h2>Percussion pitch</h2>
      {[true, false].map(definite => <div key={String(definite)}>
        <h3>{definite ? 'Definite pitch' : 'Indefinite pitch'}</h3>
        <div className="tags">{pool.filter(([, value]) => value === definite).map(([name]) => <span key={name}>{name}</span>)}</div>
      </div>)}
    </section>
  }
  return <InstrumentComparison objectiveId={objectiveId} />
}

function InstrumentComparison({ objectiveId }: { objectiveId: string }) {
  const list = objectiveId === 'INS-5-ADDITIONAL' ? instruments.slice(16) : objectiveId.startsWith('INS-5-') ? instruments : instruments.slice(0, 16)
  const [index, setIndex] = useState(0)
  const [, family, clef, mechanism, pitch] = list[index] ?? list[0]
  return <section className="panel">
    <h2>Instrument comparison</h2>
    <label>Instrument <select value={index} onChange={event => setIndex(Number(event.target.value))}>
      {list.map(([label], i) => <option value={i} key={label}>{label}</option>)}
    </select></label>
    <dl className="overview-list">
      <div><dt>Family</dt><dd>{family}</dd></div>
      <div><dt>Usual stave</dt><dd>{clef}</dd></div>
      <div><dt>Sound production</dt><dd>{mechanism}</dd></div>
      {pitch && <div><dt>Sounds</dt><dd>{pitch}</dd></div>}
    </dl>
    {['treble', 'alto', 'bass'].includes(clef) && <Staff clef={clef as Clef} pitches={[]} />}
    {clef === 'treble and bass' && <><Staff clef="treble" pitches={[]} /><Staff clef="bass" pitches={[]} /></>}
  </section>
}

export function ReferenceVisual({ objectiveId, chinese }: { objectiveId: string; chinese: boolean }) {
  if (objectiveId.startsWith('ORN-')) return <OrnamentVisual chinese={chinese} />
  if (objectiveId.startsWith('INS-')) return <InstrumentVisual objectiveId={objectiveId} chinese={chinese} />
  if (objectiveId === 'TER-2-ENDINGS') return <RepeatDemonstration />
  const terms = performanceTerms.filter(term => term.objectiveId === objectiveId).map(term => ({
    label: [term.english, ...(term.aliases ?? [])].join(' · '), meaning: term.definition, explanation: term.chinese,
  }))
  const examples = (supplementalFacts[objectiveId] ?? []).map(([label, meaning, explanation]) => ({ label, meaning, explanation }))
  if (!terms.length && !examples.length) return null
  return <section className="panel"><h2>Markings and meanings</h2><ReferenceList entries={[...terms, ...examples]} chinese={chinese} /></section>
}
