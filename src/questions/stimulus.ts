import type { Clef, NOTE_VALUES, Pitch } from '../theory'

export type NoteValue = keyof typeof NOTE_VALUES

export interface RhythmPulse {
  value: NoteValue
  dots?: 1 | 2
  rest?: boolean
  tieAfter?: boolean
  pitch?: Pitch
}

export interface RhythmTuplet {
  start: number
  count: number
  inTimeOf: number
}

export interface ExamExcerpt {
  clef: Clef
  keySignature: number
  timeSignature: string
  bars: readonly {
    pulses: readonly RhythmPulse[]
    dynamic?: string
    direction?: string
    label?: string
    beamGroups?: readonly number[]
    clef?: Clef
    keySignature?: number
  }[]
}

export interface RhythmStimulus {
  kind: 'rhythm'
  pulses: readonly RhythmPulse[]
  timeSignature?: string
  clef?: Clef
  keySignature?: number
  beamGroups?: readonly number[]
  tuplets?: readonly RhythmTuplet[]
  groupStarts?: readonly number[]
}

export type ExamStimulus = RhythmStimulus
  | { kind: 'excerpt'; excerpt: ExamExcerpt; role?: 'cadence-matching' }
  | { kind: 'harmony'; keySignature: number; chords: readonly { treble: readonly Pitch[]; bass: Pitch; label?: string }[] }
