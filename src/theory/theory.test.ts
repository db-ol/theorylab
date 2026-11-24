import { describe, expect, it } from 'vitest'
import {
  addDuration, buildChromaticScale, buildInterval, buildScale, buildScaleTriad, buildTriad, CLEFS,
  compareDuration, describeInterval, dottedDuration, enharmonicSpellings, formatPitch, getKeySignature,
  identifyCadence, identifyTriadInversion, intervalSemitones, invertTriad, keySignatureFor, midiNumber,
  NOTE_VALUES, parsePitch, pitchAtStaffPosition, rational, relativeTonic, sameSound, sameSpelling,
  scaleDegree, staffPosition, transposeInstrumentPitch, triadQuality, tupletDuration, validQualities,
  type Direction, type Inversion, type Pitch,
} from '.'

const spell = (pitches: readonly Pitch[]) => pitches.map(formatPitch).join(' ')

describe('written and sounding pitch', () => {
  it('keeps enharmonic spellings distinct even across octave boundaries', () => {
    expect(sameSound(parsePitch('B#3'), parsePitch('C4'))).toBe(true)
    expect(sameSpelling(parsePitch('B#3'), parsePitch('C4'))).toBe(false)
    expect(formatPitch(parsePitch('F##4'))).toBe('F𝄪4')
    expect(formatPitch(parsePitch('E𝄫5'))).toBe('E𝄫5')
    expect(enharmonicSpellings(parsePitch('C#4')).map(formatPitch)).toContain('D♭4')
    expect(midiNumber(parsePitch('A4'))).toBe(69)
    expect(() => parsePitch('C#b4')).toThrow()
  })

  it('uses the correct middle C and staff anchor in each clef', () => {
    expect(CLEFS.map(clef => staffPosition(parsePitch('C4'), clef))).toEqual([-2, 4, 6, 10])
    expect(CLEFS.map(clef => formatPitch(pitchAtStaffPosition(0, clef)))).toEqual(['E4', 'F3', 'D3', 'G2'])
    for (const clef of CLEFS) {
      for (let position = -9; position <= 17; position += 1) {
        expect(staffPosition(pitchAtStaffPosition(position, clef, -2), clef)).toBe(position)
      }
    }
  })

  it('transposes B-flat, A and F instruments by exact spelled intervals', () => {
    const written = parsePitch('C#5')
    expect(formatPitch(transposeInstrumentPitch(written, 'B♭', 'sounding'))).toBe('B4')
    expect(formatPitch(transposeInstrumentPitch(written, 'A', 'sounding'))).toBe('A♯4')
    expect(formatPitch(transposeInstrumentPitch(written, 'F', 'sounding'))).toBe('F♯4')
    for (const instrument of ['B♭', 'A', 'F'] as const) {
      const sounding = transposeInstrumentPitch(written, instrument, 'sounding')
      expect(transposeInstrumentPitch(sounding, instrument, 'written')).toEqual(written)
    }
  })
})

describe('keys and scales', () => {
  it('derives all major and relative minor signatures and scale patterns', () => {
    const majorNames = ['C♭', 'G♭', 'D♭', 'A♭', 'E♭', 'B♭', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯']
    const minorNames = ['A♭', 'E♭', 'B♭', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯', 'G♯', 'D♯', 'A♯']
    for (let count = -7; count <= 7; count += 1) {
      const key = getKeySignature(count)
      expect([key.major, key.minor]).toEqual([majorNames[count + 7], minorNames[count + 7]])
      expect(Object.keys(key.accidentals)).toHaveLength(Math.abs(count))
      const tonic = parsePitch(`${key.major}4`)
      const minor = parsePitch(`${key.minor}4`)
      expect(keySignatureFor(tonic, 'major')).toEqual(key)
      expect(keySignatureFor(minor, 'minor')).toEqual(key)
      expect(formatPitch(relativeTonic(tonic, 'major')).slice(0, -1)).toBe(key.minor)
      for (const [root, form] of [[tonic, 'major'], [minor, 'natural minor']] as const) {
        const scale = buildScale(root, form)
        expect(scale.map(pitch => pitch.accidental)).toEqual(scale.map(pitch => key.accidentals[pitch.letter] ?? 0))
        expect(scale.map(pitch => scaleDegree(root, pitch))).toEqual([1, 2, 3, 4, 5, 6, 7, 1])
        const fromAbove = { ...root, octave: root.octave + 1 }
        expect(buildScale(fromAbove, form, 'descending')).toEqual([...scale].reverse())
      }
    }
    expect(getKeySignature(4).accidentals).toEqual({ F: 1, C: 1, G: 1, D: 1 })
    expect(getKeySignature(-4).accidentals).toEqual({ B: -1, E: -1, A: -1, D: -1 })
  })

  it('spells harmonic and both directions of melodic minor', () => {
    expect(spell(buildScale(parsePitch('D#4'), 'harmonic minor'))).toBe('D♯4 E♯4 F♯4 G♯4 A♯4 B4 C𝄪5 D♯5')
    expect(spell(buildScale(parsePitch('C#4'), 'melodic minor'))).toBe('C♯4 D♯4 E4 F♯4 G♯4 A♯4 B♯4 C♯5')
    expect(spell(buildScale(parsePitch('C#5'), 'melodic minor', 'descending'))).toBe('C♯5 B4 A4 G♯4 F♯4 E4 D♯4 C♯4')
    expect(spell(buildScale(parsePitch('Gb3'), 'major'))).toBe('G♭3 A♭3 B♭3 C♭4 D♭4 E♭4 F4 G♭4')
  })

  it('constructs a chromatic scale with consecutive semitones and preserved endpoints', () => {
    expect(spell(buildChromaticScale(parsePitch('C4')))).toBe('C4 C♯4 D4 D♯4 E4 F4 F♯4 G4 G♯4 A4 A♯4 B4 C5')
    expect(spell(buildChromaticScale(parsePitch('C5'), 'descending'))).toBe('C5 B4 B♭4 A4 A♭4 G4 G♭4 F4 E4 E♭4 D4 D♭4 C4')
  })
})

describe('intervals', () => {
  it.each([
    ['C4', 'C4', 1, 'perfect', 0, 'unison'],
    ['C4', 'C#4', 1, 'augmented', 1, 'ascending'],
    ['C4', 'Eb4', 3, 'minor', 3, 'ascending'],
    ['C4', 'E#4', 3, 'augmented', 5, 'ascending'],
    ['C#4', 'Eb4', 3, 'diminished', 2, 'ascending'],
    ['C4', 'F#4', 4, 'augmented', 6, 'ascending'],
    ['F#4', 'C4', 4, 'augmented', 6, 'descending'],
    ['C4', 'Gb4', 5, 'diminished', 6, 'ascending'],
    ['C4', 'A#4', 6, 'augmented', 10, 'ascending'],
    ['C#4', 'Ab4', 6, 'diminished', 7, 'ascending'],
    ['C4', 'B#4', 7, 'augmented', 12, 'ascending'],
    ['C4', 'C#5', 8, 'augmented', 13, 'ascending'],
    ['C#4', 'C5', 8, 'diminished', 11, 'ascending'],
    ['C4', 'D5', 9, 'major', 14, 'ascending'],
    ['C4', 'F#5', 11, 'augmented', 18, 'ascending'],
    ['D4', 'Ab5', 12, 'diminished', 18, 'ascending'],
    ['C4', 'C6', 15, 'perfect', 24, 'ascending'],
    ['Dbb4', 'F##4', 3, 'triply augmented', 7, 'ascending'],
  ])('recognises %s to %s', (from, to, number, quality, semitones, direction) => {
    expect(describeInterval(parsePitch(from), parsePitch(to))).toEqual({
      number, quality, semitones, direction,
    })
  })

  it('round trips spelled intervals over four clefs, both directions and multiple octaves', () => {
    const directions: readonly Direction[] = ['ascending', 'descending']
    for (const clef of CLEFS) {
      for (const direction of directions) {
        for (let position = -2; position <= 8; position += 2) {
          for (let accidental = -2; accidental <= 2; accidental += 1) {
            const from = pitchAtStaffPosition(position, clef, accidental)
            for (let number = 1; number <= 15; number += 1) {
              for (const quality of validQualities(number)) {
                const spec = { number, quality }
                const to = buildInterval(from, spec, direction)
                const described = describeInterval(from, to)
                expect(described).toMatchObject({ ...spec, semitones: intervalSemitones(spec) })
              }
            }
          }
        }
      }
    }
  })

  it('rejects quality names outside the interval family', () => {
    expect(() => intervalSemitones({ number: 4, quality: 'major' })).toThrow()
    expect(() => intervalSemitones({ number: 6, quality: 'perfect' })).toThrow()
  })
})

describe('chords and cadences', () => {
  it('spells harmonic minor triads and distinguishes their inversions', () => {
    const chord = buildScaleTriad(parsePitch('C#4'), 'harmonic minor', 5)
    expect(spell(chord)).toBe('G♯4 B♯4 D♯5')
    expect(triadQuality(chord)).toBe('major')
    expect(spell(buildScaleTriad(parsePitch('A3'), 'harmonic minor', 2))).toBe('B3 D4 F4')
    const otherChord = buildTriad(parsePitch('Db4'), 'major')
    expect(spell(otherChord)).toBe('D♭4 F4 A♭4')
    for (const inversion of [0, 1, 2] as readonly Inversion[]) {
      const voicing = invertTriad(chord, inversion)
      expect(identifyTriadInversion(voicing, chord)).toBe(inversion)
    }
    expect(identifyTriadInversion([parsePitch('G#4'), parsePitch('C5'), parsePitch('D#5')], chord)).toBeNull()
  })

  it('names required cadences by their ending chord functions', () => {
    expect(identifyCadence(5, 1)).toBe('perfect')
    expect(identifyCadence(4, 1)).toBe('plagal')
    expect(identifyCadence(2, 5)).toBe('imperfect')
    expect(identifyCadence(5, 6)).toBeNull()
  })
})

describe('rhythmic durations', () => {
  it('adds, dots and subdivides exact rational durations', () => {
    expect(dottedDuration(NOTE_VALUES.minim, 2)).toEqual(rational(7, 8))
    expect(dottedDuration(NOTE_VALUES.crotchet)).toEqual(rational(3, 8))
    expect(tupletDuration(NOTE_VALUES.quaver, 3, 2)).toEqual(rational(1, 12))
    expect(tupletDuration(NOTE_VALUES.quaver, 2, 3)).toEqual(rational(3, 16))
    expect(tupletDuration(NOTE_VALUES.semiquaver, 5, 4)).toEqual(rational(1, 20))
    expect(addDuration(rational(1, 12), rational(1, 6))).toEqual(NOTE_VALUES.crotchet)
    expect(compareDuration(rational(2, 3), rational(3, 4))).toBe(-1)
    expect(compareDuration(rational(2, 4), NOTE_VALUES.minim)).toBe(0)
    expect(rational(-18, -24)).toEqual(rational(3, 4))
    expect(() => rational(1, 0)).toThrow()
    expect(() => tupletDuration(NOTE_VALUES.quaver, 0, 3)).toThrow()
    const largest = Number.MAX_SAFE_INTEGER
    expect(addDuration(rational(1, largest), rational(largest - 1, largest))).toEqual(rational(1))
  })
})
