import { useState } from 'react'
import { NOTE_VALUES, multiplyDuration, rational, tupletDuration, type Rational } from '../theory'
import { useInterfaceLanguage } from './interfaceLanguage'
import './tupletExplorer.css'

export type TupletLesson = 'triplet' | 'irregular'
type TupletValue = 'quaver' | 'semiquaver'

interface TupletExample {
  label: string
  labelChinese: string
  count: number
  ordinaryCount: number
  value: TupletValue
  restIndex?: number
  chinese: string
}

export const tupletExamples: Record<TupletLesson, readonly TupletExample[]> = {
  triplet: [
    {
      label: 'Triplet quavers', labelChinese: '八分音符三连音', count: 3, ordinaryCount: 2, value: 'quaver',
      chinese: '括号上的 3：2 表示三个 quavers 占两个普通 quavers 的时间。两行都占一拍。上行把这一拍平分成三份，下行平分成两份。',
    },
    {
      label: 'Triplet semiquavers', labelChinese: '十六分音符三连音', count: 3, ordinaryCount: 2, value: 'semiquaver',
      chinese: '三个 semiquavers 的三连音占两个普通 semiquavers 的时间，也就是半拍。这半拍再平分成三份，每个连音成员占全拍的 1/6。',
    },
    {
      label: 'Triplet with a rest', labelChinese: '带休止符的三连音', count: 3, ordinaryCount: 2, value: 'quaver', restIndex: 1,
      chinese: '中间的休止符也占三连音中的一份。第二份保持安静，第三个位置仍按原来的时间开始。整组依旧占一拍。',
    },
  ],
  irregular: [
    {
      label: 'Quintuplet semiquavers', labelChinese: '十六分音符五连音', count: 5, ordinaryCount: 4, value: 'semiquaver',
      chinese: '括号上的 5：4 表示五个 semiquavers 占四个普通 semiquavers 的时间，也就是一个四分音符拍。上行五等分，每个成员占 1/5 拍。下行四等分，每个普通音占 1/4 拍。',
    },
    {
      label: 'Sextuplet semiquavers', labelChinese: '十六分音符六连音', count: 6, ordinaryCount: 4, value: 'semiquaver',
      chinese: '括号上的 6：4 表示六个 semiquavers 占四个普通 semiquavers 的时间。上行把一拍均分成六份，每个成员占 1/6 拍。两行的结束位置相同。',
    },
  ],
}

export function compareTuplet({ value, count, ordinaryCount }: Pick<TupletExample, 'value' | 'count' | 'ordinaryCount'>) {
  const ordinary = multiplyDuration(NOTE_VALUES[value], rational(4))
  const member = tupletDuration(ordinary, count, ordinaryCount)
  const group = multiplyDuration(member, rational(count))
  return { member, ordinary, group }
}

const fraction = ({ numerator, denominator }: Rational) => denominator === 1 ? String(numerator) : `${numerator}/${denominator}`
const beatLabel = (duration: Rational) => duration.denominator === 1
  ? `${duration.numerator} crotchet beat${duration.numerator === 1 ? '' : 's'}`
  : `${fraction(duration)} of a crotchet beat`
const start = 28
const end = 372
const xAt = (index: number, count: number) => start + (end - start) * index / count
const sharedSteps = (count: number, ordinaryCount: number) => {
  const commonDenominator = rational(count, ordinaryCount).denominator
  return count * commonDenominator
}

function TupletStaff({ count, value, position, steps, inTimeOf, restIndex }: {
  count: number
  value: TupletValue
  position: number
  steps: number
  inTimeOf?: number
  restIndex?: number
}) {
  const { t } = useInterfaceLanguage()
  const beamCount = value === 'quaver' ? 1 : 2
  const beamLeft = xAt(0, count) + 6
  const beamRight = xAt(count - 1, count) + 6
  const bracketCentre = (beamLeft + beamRight) / 2
  const playhead = xAt(position, steps)
  const active = Math.floor(position * count / steps)
  const title = inTimeOf
    ? t(
      `Tuplet stave. ${count} ${value} positions${restIndex === undefined ? '' : ', with a rest in the middle'}. Ratio ${count} to ${inTimeOf}.`,
      `连音谱例。共有 ${count} 个连音成员，符号采用 ${value} 的写法${restIndex === undefined ? '' : '，其中中间一份是休止符'}。比例为 ${count} 比 ${inTimeOf}。`,
      false,
    )
    : t(`Ordinary stave. ${count} ${value}s.`, `普通时值谱例。共有 ${count} 个 ${value}。`, false)
  return <svg viewBox="0 0 400 105" className="tuplet-stave" role="img" aria-label={title}>
    {[60, 68, 76, 84, 92].map((line) => <line key={line} x1="10" x2="390" y1={line} y2={line} className="tuplet-staff-line" />)}
    {[start, end].map((x) => <line key={x} x1={x} x2={x} y1="12" y2="98" className="tuplet-guide" />)}
    {position > 0 && position < steps && <line x1={playhead} x2={playhead} y1="14" y2="98" className="tuplet-playhead" />}
    {inTimeOf !== undefined && <g className="tuplet-bracket" data-ratio={`${count}:${inTimeOf}`}>
      <path d={`M${beamLeft} 31v-7H${bracketCentre - 18} M${bracketCentre + 18} 24H${beamRight}v7`} />
      <text x={bracketCentre} y="29" textAnchor="middle">{count}:{inTimeOf}</text>
    </g>}
    {restIndex === undefined && Array.from({ length: beamCount }, (_, level) => {
      const beamY = 44 + level * 5
      return <line key={level} x1={beamLeft} x2={beamRight} y1={beamY} y2={beamY} className="tuplet-beam" />
    })}
    {Array.from({ length: count }, (_, index) => {
      const x = xAt(index, count)
      const className = active === index ? 'tuplet-current' : undefined
      if (index === restIndex) return <g key={index} data-member="rest" className={className} transform={`translate(${x} 72)`}>
        <circle cx="-4" cy="-5" r="2.6" fill="currentColor" />
        <path d="M-7-5q4 5 12-2L-1 10" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </g>
      return <g key={index} data-member="note" className={className} transform={`translate(${x} 72)`}>
        <ellipse rx="6.7" ry="4.4" transform="rotate(-17)" fill="currentColor" />
        <line x1="6" x2="6" y1="-1" y2="-28" stroke="currentColor" strokeWidth="1.3" />
        {restIndex !== undefined && <path d="M6-28c1 6 9 9 8 16 0 3-2 6-4 7 2-3 3-7 0-10-2-2-3-3-4-4Z" fill="currentColor" />}
      </g>
    })}
  </svg>
}

export function TupletExplorer({ lesson, chinese = false }: { lesson: TupletLesson; chinese?: boolean }) {
  const { t, language } = useInterfaceLanguage()
  const [selected, setSelected] = useState(0)
  const [position, setPosition] = useState(0)
  const examples = tupletExamples[lesson]
  const example = examples[selected]
  const { count, ordinaryCount, value, restIndex } = example
  const { member, ordinary, group } = compareTuplet(example)
  const steps = sharedSteps(count, ordinaryCount)
  const elapsed = multiplyDuration(group, rational(position, steps))
  const chooseExample = (index: number) => {
    if (index === selected) return
    setSelected(index)
    setPosition(0)
  }
  const tupletCount = restIndex === undefined ? `${count} ${value}s` : `${count - 1} ${value}s and a ${value} rest`
  const tupletCountChinese = restIndex === undefined ? `${count} 个 ${value}` : `${count - 1} 个 ${value} 音符与 1 个 ${value} 休止符`
  const elapsedLabel = t(`${beatLabel(elapsed)} from the start`, `距起点 ${fraction(elapsed)} 拍（crotchet beats）`, false)
  const localiseBeat = (duration: Rational) => t(beatLabel(duration), `${fraction(duration)} 拍（crotchet beats）`, false)

  return <div className="tuplet-explorer">
    <div className="tuplet-examples" role="group" aria-label={t('Tuplet examples', '连音示例')}>
      {examples.map((item, index) => <button key={item.label} type="button" className="button secondary"
        aria-pressed={selected === index} onClick={() => chooseExample(index)}>{t(item.label,
          language === 'zh' ? `${item.labelChinese}（${item.label}）` : item.labelChinese)}</button>)}
    </div>
    <p>{t(`${count} equal parts fit into the time of ${ordinaryCount} ordinary ${value}s.`,
      `${count} 个等分合计占 ${ordinaryCount} 个普通 ${value} 的时值。`, false)}</p>
    <figure className="tuplet-score">
      <div className="tuplet-axis" aria-hidden="true"><span>{t('Start', '起点')}</span><span>{t('End', '终点')}</span></div>
      <p className="tuplet-row-label">{t(`Tuplet · ${tupletCount}`, `连音：${tupletCountChinese}`, false)}</p>
      <TupletStaff count={count} value={value} position={position} steps={steps} inTimeOf={ordinaryCount} restIndex={restIndex} />
      <p className="tuplet-row-label">{t(`Ordinary · ${ordinaryCount} ${value}s`, `普通时值：${ordinaryCount} 个 ${value}`, false)}</p>
      <TupletStaff count={ordinaryCount} value={value} position={position} steps={steps} />
      <figcaption>{t('Both rows share the same start and end.', '两行同时开始，同时结束。', false)}</figcaption>
    </figure>
    <div className="tuplet-position">
      <label>
        <span>{t('Time position', '时间位置')}</span>
        <input type="range" min={0} max={steps} step={1} value={position} onChange={(event) => setPosition(Number(event.target.value))}
          aria-valuetext={elapsedLabel} />
      </label>
      <output>{elapsedLabel}</output>
    </div>
    <dl className="tuplet-duration">
      <div><dt>{t('Each tuplet member', '每个连音成员')}</dt><dd>{localiseBeat(member)}</dd></div>
      <div><dt>{t('Each ordinary note', '每个普通音符')}</dt><dd>{localiseBeat(ordinary)}</dd></div>
      <div><dt>{t('Each complete row', '每行的总时值')}</dt><dd>{localiseBeat(group)}</dd></div>
    </dl>
    {chinese && <p lang="zh-Hans" className="tuplet-help">{example.chinese}</p>}
  </div>
}
