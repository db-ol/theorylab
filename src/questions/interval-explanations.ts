import {
  describeInterval, formatInterval, formatPitch, intervalSemitones, sameSound, validQualities,
  type Interval, type IntervalSpec, type Pitch,
} from '../theory'

const QUALITY_ZH: Record<string, string> = {
  perfect: '纯', major: '大', minor: '小', augmented: '增', diminished: '减',
}

export function numberExplanation(from: Pitch, to: Pitch, interval: Interval): string {
  return `从 ${formatPitch(from)} 数到 ${formatPitch(to)}，两个端点都要算。按书写字母顺序共数出 ${interval.number} 个位置，因此是 ${interval.number} 度。升降号会影响半音数，但不会改变度数。`
}

export function intervalExplanation(from: Pitch, to: Pitch, interval: Interval): string {
  const { number, quality, semitones } = interval
  const baselineQuality = validQualities(number).includes('perfect') ? 'perfect' : 'major'
  const baseline = intervalSemitones({ number, quality: baselineQuality })
  const comparison = semitones === baseline
    ? '实际宽度正好相等'
    : `实际宽度${semitones > baseline ? '多' : '少'} ${Math.abs(semitones - baseline)} 个半音`
  const compound = number > 8
    ? `这是复音程。移除一个八度后，${number} 度变成 ${number - 7} 度，音程性质保持不变。`
    : ''
  return `${numberExplanation(from, to, interval)}实际宽度为 ${semitones} 个半音。同度数的${QUALITY_ZH[baselineQuality]}音程基准为 ${baseline} 个半音，${comparison}，所以答案是${QUALITY_ZH[quality] ?? ''}${number} 度（${formatInterval(interval)}）。${compound}`
}

export function explainNumberOption(candidate: number, interval: Interval): string {
  if (candidate === interval.number) return `从起点到终点连同两端，共数出 ${candidate} 个字母位置。`
  return `此选项表示 ${candidate} 个字母位置，题目中连同两端共 ${interval.number} 个位置。`
}

export function explainQualityOption(candidate: string, interval: Interval): string {
  if (candidate === interval.quality) return `在 ${interval.number} 度的前提下，${interval.semitones} 个半音对应这种音程性质。`
  if (!validQualities(interval.number).some(quality => quality === candidate)) {
    return `${interval.number} 度不使用 ${candidate} 这一性质名称。应先确定度数所属的类别。`
  }
  const width = intervalSemitones({ number: interval.number, quality: candidate as IntervalSpec['quality'] })
  return `这种 ${interval.number} 度需要 ${width} 个半音，本题为 ${interval.semitones} 个半音。`
}

export function explainIntervalOption(candidate: IntervalSpec, interval: Interval): string {
  if (candidate.number !== interval.number) return explainNumberOption(candidate.number, interval)
  return explainQualityOption(candidate.quality, interval)
}

export function explainPitchOption(from: Pitch, target: Pitch, candidate: Pitch): string {
  const interval = describeInterval(from, target)
  if (formatPitch(candidate) === formatPitch(target)) {
    return `字母位置为 ${interval.number} 度，音高相差 ${interval.semitones} 个半音，两项条件都符合。`
  }
  const attempted = describeInterval(from, candidate)
  if (sameSound(candidate, target)) {
    return `它和正确答案同音异名，但谱表上的字母位置不同。目标字母是 ${target.letter}，此音写成了 ${candidate.letter}。`
  }
  if (attempted.number !== interval.number || attempted.direction !== interval.direction) {
    return `它构成 ${formatInterval(attempted)}，题目所需的谱表方向或度数不同。先从给定音数到正确的字母和八度。`
  }
  return `谱表位置正确，但该升降记号得到 ${attempted.semitones} 个半音，题目要求 ${interval.semitones} 个半音。`
}
