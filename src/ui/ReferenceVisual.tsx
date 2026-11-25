import { useState } from 'react'
import { instruments, ornaments, percussion, supplementalFacts, voices } from '../curriculum/musicReference'
import { performanceTerms } from '../curriculum/performanceTerms'
import { pitchAtStaffPosition, type Clef } from '../theory'
import { useInterfaceLanguage } from './interfaceLanguage'
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
  const { t } = useInterfaceLanguage()
  const [secondPass, setSecondPass] = useState(false)
  const bars = secondPass ? [1, 2, 4] : [1, 2, 3]
  return <section className="panel">
    <h2>{t('Repeat endings', '反复结尾')}</h2>
    <div className="tags" aria-label={t(`Playing order on pass ${secondPass ? 2 : 1}`, `第 ${secondPass ? 2 : 1} 遍的演奏顺序`, false)}>
      {bars.map(bar => <span key={bar}>{t(
        `Bar ${bar}${bar === 3 ? ' · First ending' : bar === 4 ? ' · Second ending' : ''}`,
        `第 ${bar} 小节${bar === 3 ? '（第一房子）' : bar === 4 ? '（第二房子）' : ''}`,
        false,
      )}</span>)}
    </div>
    <p role="status">{secondPass ? t('Second pass. Skip the first ending.', '第二遍跳过第一房子。', false)
      : t('First pass. Return to bar 1 after the first ending.', '第一遍奏完第一房子后回到第 1 小节。', false)}</p>
    <button type="button" className="button secondary" onClick={() => setSecondPass(value => !value)}>{secondPass
      ? t('Show first pass', '演示第一遍') : t('Show second pass', '演示第二遍')}</button>
    <h3>{t('Multibar rest', '多小节休止')}</h3><p><strong aria-hidden="true">4 ━━━━━</strong> {t('Four bars of silence', '连续休止四小节')}</p>
  </section>
}

function OrnamentSign({ name }: { name: (typeof ornaments)[number]['name'] }) {
  const { t } = useInterfaceLanguage()
  if (name === 'trill') return <strong aria-label={t('The letters tr', '字母 tr')}>tr</strong>
  if (name === 'upper turn') return <svg width="46" height="32" viewBox="0 0 46 32" role="img" aria-label={t('A sideways S shape', '横向 S 形符号')}>
    <path d="M2 16q5-12 12-5l8 8q8 8 14 0 5-8-1-10M22 19l-4-4Q9 6 4 13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
  if (name === 'acciaccatura' || name === 'appoggiatura') {
    const slash = name === 'acciaccatura'
    return <svg width="40" height="32" viewBox="0 0 40 32" role="img" aria-label={slash
      ? t('Small note with stem slash', '符干带斜线的小音符') : t('Small note without stem slash', '符干无斜线的小音符')}>
      <ellipse cx="13" cy="24" rx="6" ry="4" transform="rotate(-20 13 24)" fill="currentColor" />
      <path d="M18 23V4q2 6 10 9" fill="none" stroke="currentColor" strokeWidth="2" />
      {slash && <path d="M11 16l15-9" fill="none" stroke="currentColor" strokeWidth="1.5" />}
    </svg>
  }
  const lower = name === 'lower mordent'
  return <svg width="46" height="30" viewBox="0 0 46 30" role="img" aria-label={lower
    ? t('Zigzag with vertical stroke', '带竖线的锯齿形符号') : t('Zigzag with no vertical stroke', '无竖线的锯齿形符号')}>
    <path d="m2 19 8-8 8 8 8-8 8 8 8-8" fill="none" stroke="currentColor" strokeWidth="2.5" />
    {lower && <path d="M22 4v24" fill="none" stroke="currentColor" strokeWidth="2" />}
  </svg>
}

function OrnamentVisual({ chinese }: { chinese: boolean }) {
  const { t } = useInterfaceLanguage()
  const [index, setIndex] = useState(0)
  const ornament = ornaments[index]
  const pitches = 'offsets' in ornament ? ornament.offsets.map(offset => pitchAtStaffPosition(4 + offset, 'treble')) : []
  return <section className="panel">
    <h2>{t('Ornament examples', '装饰音示例')}</h2>
    <label>{t('Ornament', '装饰音')} <select value={index} onChange={event => setIndex(Number(event.target.value))}>
      {ornaments.map((item, i) => <option value={i} key={item.name}>{item.name}</option>)}
    </select></label>
    <p><OrnamentSign name={ornament.name} /> <span>{ornament.sign}</span></p>
    {pitches.length > 0 && <Staff clef="treble" pitches={pitches} showNames />}
    {chinese && <p lang="zh-Hans">{ornament.description}</p>}
  </section>
}

function InstrumentVisual({ objectiveId, chinese }: { objectiveId: string; chinese: boolean }) {
  const { t } = useInterfaceLanguage()
  if (objectiveId === 'INS-5-VOICE') return <section className="panel"><h2>{t('Voice registers', '人声音区')}</h2>
    <ReferenceList entries={voices.map(([label, meaning, explanation]) => ({ label, meaning, explanation }))} chinese={chinese} />
  </section>
  if (objectiveId.endsWith('PERCUSSION')) {
    const pool = objectiveId === 'INS-4-PERCUSSION' ? percussion.slice(0, 4) : percussion.slice(4)
    return <section className="panel"><h2>{t('Percussion pitch', '打击乐器的音高')}</h2>
      {[true, false].map(definite => <div key={String(definite)}>
        <h3>{definite ? t('Definite pitch', '有确定音高') : t('Indefinite pitch', '无确定音高')}</h3>
        <div className="tags">{pool.filter(([, value]) => value === definite).map(([name]) => <span key={name}>{name}</span>)}</div>
      </div>)}
    </section>
  }
  return <InstrumentComparison objectiveId={objectiveId} />
}

function InstrumentComparison({ objectiveId }: { objectiveId: string }) {
  const { t } = useInterfaceLanguage()
  const list = objectiveId === 'INS-5-ADDITIONAL' ? instruments.slice(16) : objectiveId.startsWith('INS-5-') ? instruments : instruments.slice(0, 16)
  const [index, setIndex] = useState(0)
  const [, family, clef, mechanism, pitch] = list[index] ?? list[0]
  return <section className="panel">
    <h2>{t('Instrument comparison', '乐器比较')}</h2>
    <label>{t('Instrument', '乐器')} <select value={index} onChange={event => setIndex(Number(event.target.value))}>
      {list.map(([label], i) => <option value={i} key={label}>{label}</option>)}
    </select></label>
    <dl className="overview-list">
      <div><dt>{t('Family', '乐器家族')}</dt><dd>{family}</dd></div>
      <div><dt>{t('Usual stave', '常用谱表')}</dt><dd>{clef}</dd></div>
      <div><dt>{t('Sound production', '发声方式')}</dt><dd>{mechanism}</dd></div>
      {pitch && <div><dt>{t('Sounds', '实际发声')}</dt><dd>{pitch}</dd></div>}
    </dl>
    {['treble', 'alto', 'bass'].includes(clef) && <Staff clef={clef as Clef} pitches={[]} />}
    {clef === 'treble and bass' && <><Staff clef="treble" pitches={[]} /><Staff clef="bass" pitches={[]} /></>}
  </section>
}

export function ReferenceVisual({ objectiveId, chinese }: { objectiveId: string; chinese: boolean }) {
  const { t } = useInterfaceLanguage()
  if (objectiveId.startsWith('ORN-')) return <OrnamentVisual chinese={chinese} />
  if (objectiveId.startsWith('INS-')) return <InstrumentVisual objectiveId={objectiveId} chinese={chinese} />
  if (objectiveId === 'TER-2-ENDINGS') return <RepeatDemonstration />
  const terms = performanceTerms.filter(term => term.objectiveId === objectiveId).map(term => ({
    label: [term.english, ...(term.aliases ?? [])].join(' · '), meaning: term.definition, explanation: term.chinese,
  }))
  const examples = (supplementalFacts[objectiveId] ?? []).map(([label, meaning, explanation]) => ({ label, meaning, explanation }))
  if (!terms.length && !examples.length) return null
  return <section className="panel"><h2>{t('Markings and meanings', '记号及含义')}</h2><ReferenceList entries={[...terms, ...examples]} chinese={chinese} /></section>
}
