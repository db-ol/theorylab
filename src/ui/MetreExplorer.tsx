import { useId, useReducer } from 'react'
import type { MetreSignature } from '../theory'
import { useInterfaceLanguage } from './interfaceLanguage'
import { Staff, type StaffPulse } from './Notation'
import './metreExplorer.css'

const families = [
  { name: 'Simple', signatures: ['2/2', '3/2', '4/2', '2/4', '3/4', '4/4', '2/8', '3/8', '4/8'], initial: '4/4' },
  { name: 'Compound', signatures: ['6/4', '9/4', '12/4', '6/8', '9/8', '12/8', '6/16', '9/16', '12/16'], initial: '6/8' },
  { name: 'Irregular', signatures: ['5/8', '7/8', '5/4', '7/4'], initial: '5/8' },
] as const
const familyLabels = { Simple: '单拍子', Compound: '复拍子', Irregular: '不规则拍子' } as const

type Family = typeof families[number]
type GroupingIndex = 0 | 1 | 2

interface Selection {
  signature: MetreSignature
  grouping: number
}

type Change =
  | { family: Family['name'] }
  | { signature: MetreSignature }
  | { grouping: number }

const noteForDenominator: Record<number, StaffPulse['value']> = { 4: 'crotchet', 8: 'quaver', 16: 'semiquaver' }

export function metreExample({ signature, grouping }: Selection) {
  const family = families.find(({ signatures }) => signatures.some((choice) => signature === choice))!
  const [numerator, denominator] = signature.split('/').map(Number)
  const simple = family.name === 'Simple'
  const beatSize = simple ? 2 : 3
  const mainBeats = simple ? numerator : numerator / 3
  const groupings = family.name !== 'Irregular'
    ? [Array.from({ length: mainBeats }, () => beatSize)]
    : numerator === 5 ? [[2, 3], [3, 2]] : [[2, 2, 3], [2, 3, 2], [3, 2, 2]]
  const groupingIndex = groupings[grouping] ? grouping : 0
  const beats = groupings[groupingIndex]
  const unit = noteForDenominator[simple ? denominator * 2 : denominator]
  const rhythm = beats.flatMap((size) => Array.from({ length: size }, () => ({ value: unit })))
  return { family, unit, groupings, groupingIndex, beats, rhythm }
}

export function changeMetre(selection: Selection, change: Change): Selection {
  if ('family' in change) {
    return { signature: families.find(({ name }) => name === change.family)!.initial, grouping: 0 }
  }
  if ('signature' in change) return { signature: change.signature, grouping: 0 }
  return { ...selection, grouping: change.grouping }
}

function Choices<Value extends string | number>({ label, options, value, onChange, className = '' }: {
  label: string
  options: readonly { value: Value; label: string }[]
  value: Value
  onChange: (selected: Value) => void
  className?: string
}) {
  const name = useId()
  return <fieldset className={`metre-field ${className}`}>
    <legend>{label}</legend>
    <div className="metre-choices">
      {options.map((option) => <label key={option.value} className="metre-choice">
        <input type="radio" name={name} checked={value === option.value} onChange={() => onChange(option.value)} />
        <span>{option.label}</span>
      </label>)}
    </div>
  </fieldset>
}

export type InitialMetre = { initialSignature?: MetreSignature; initialGrouping?: GroupingIndex }

export function MetreExplorer({ initialSignature = '6/8', initialGrouping = 0 }: InitialMetre) {
  const { t, language } = useInterfaceLanguage()
  const [selection, select] = useReducer(changeMetre, { signature: initialSignature, grouping: initialGrouping })
  const { family, unit, groupings, groupingIndex, beats, rhythm } = metreExample(selection)
  const pattern = beats.join(' + ')
  return <div className="metre-explorer">
    <Choices label={t('Metre', '拍子')} options={families.map(({ name }) => ({
      value: name, label: t(name, language === 'zh' ? `${familyLabels[name]}（${name}）` : familyLabels[name]),
    }))}
      value={family.name} onChange={(next) => select({ family: next })} />
    <Choices label={t('Time signature', '拍号')} options={family.signatures.map((signature) => ({ value: signature, label: signature }))}
      value={selection.signature} onChange={(signature) => select({ signature })} className={family.name === 'Irregular' ? 'metre-two-columns' : ''} />
    {groupings.length > 1 && <Choices label={t('Beat grouping', '拍组排列')} options={groupings.map((beats, index) => ({ value: index, label: beats.join(' + ') }))}
      value={groupingIndex} onChange={(grouping) => select({ grouping })} className={groupings.length === 2 ? 'metre-two-columns' : ''} />}
    <p className="metre-caption" role="status">{t(
      `${family.name} metre · ${beats.length} main beats · ${pattern}. ${rhythm.length} ${unit}s in the bar.`,
      `${familyLabels[family.name]}（${family.name} metre），共 ${beats.length} 个主拍，分为 ${pattern}。本小节的时值相当于 ${rhythm.length} 个 ${unit}。`,
      false,
    )}</p>
    <ol className="beat-track" aria-label={t('Beat groups', '拍组')}>
      {beats.map((size, index) => <li key={index} className="beat-group" style={{ flex: size }}>
        <span>{t(`Beat ${index + 1}`, `第 ${index + 1} 拍`, false)}</span>
        <span className="sr-only">{t(`, ${size} ${unit}s`, `，${size} 个 ${unit} 时值`, false)}</span>
        <div aria-hidden="true">{Array.from({ length: size }, (_, pulse) => <span key={pulse} className={pulse === 0 ? 'beat-accent' : ''} />)}</div>
      </li>)}
    </ol>
    <Staff rhythm={rhythm} beamGroups={beats} timeSignature={selection.signature} hideClef showClefName={false} />
  </div>
}
