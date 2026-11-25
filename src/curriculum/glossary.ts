import { performanceTerms } from './performanceTerms'

export interface Term {
  english: string
  chinese: string
  definition: string
  american?: string
  example?: string
  aliases?: readonly string[]
}

const theoryTerms: readonly Term[] = [
  { english: 'Identify', chinese: '识别并指出', definition: 'Determine and name the item described.', example: 'Identify the interval shown.' },
  { english: 'Select', chinese: '选择', definition: 'Choose an answer or a specified number of answers.', example: 'Select the note that forms a perfect fifth.' },
  { english: 'Complete', chinese: '补全', definition: 'Supply the element needed to finish the notation or pattern.', example: 'Complete the scale with the missing note.' },
  { english: 'Which of the following', chinese: '以下哪一项', definition: 'Compare the listed alternatives and choose the one that fits.' },
  { english: 'Equivalent', chinese: '等值的', definition: 'Having the same relevant value, such as pitch or duration.' },
  { english: 'Ascending', chinese: '上行', definition: 'Moving from lower to higher notes.' },
  { english: 'Descending', chinese: '下行', definition: 'Moving from higher to lower notes.' },
  { english: 'Stave', chinese: '五线谱', definition: 'Five lines and four intervening spaces for notation.', american: 'Staff' },
  { english: 'Bar', chinese: '小节', definition: 'A unit of metre separated in notation by barlines.', american: 'Measure' },
  { english: 'Metre', chinese: '节拍组织', definition: 'The recurring grouping of beats.', american: 'Meter' },
  { english: 'Breve', chinese: '二全音符', definition: 'A note with the duration of two semibreves.', american: 'Double whole note' },
  { english: 'Semibreve', chinese: '全音符', definition: 'A note with the duration of four crotchets.', american: 'Whole note' },
  { english: 'Minim', chinese: '二分音符', definition: 'A note with the duration of two crotchets.', american: 'Half note' },
  { english: 'Crotchet', chinese: '四分音符', definition: 'A note with the duration of two quavers.', american: 'Quarter note' },
  { english: 'Quaver', chinese: '八分音符', definition: 'A note with the duration of two semiquavers.', american: 'Eighth note' },
  { english: 'Semiquaver', chinese: '十六分音符', definition: 'A note with the duration of two demisemiquavers.', american: 'Sixteenth note' },
  { english: 'Demisemiquaver', chinese: '三十二分音符', definition: 'A note lasting one thirty-second of a semibreve.', american: 'Thirty-second note' },
  { english: 'Semitone', chinese: '半音', definition: 'The distance between adjacent keys on a piano.', american: 'Half step' },
  { english: 'Tone', chinese: '全音', definition: 'The distance of two semitones.', american: 'Whole step' },
  { english: 'Interval', chinese: '音程', definition: 'The distance between two pitches.' },
  { english: 'Simple interval', chinese: '单音程', definition: 'An interval numbered from a unison through an octave.' },
  { english: 'Compound interval', chinese: '复音程', definition: 'An interval numbered ninth or higher.' },
  { english: 'Major', chinese: '大的', definition: 'A quality used for seconds, thirds, sixths and sevenths in the major scale from its tonic.' },
  { english: 'Minor', chinese: '小的', definition: 'An interval quality one semitone smaller than the corresponding major interval.' },
  { english: 'Perfect', chinese: '纯的', definition: 'The standard diatonic quality for unisons, fourths, fifths and octaves.' },
  { english: 'Augmented', chinese: '增的', definition: 'One semitone wider than the corresponding major or perfect interval.' },
  { english: 'Diminished', chinese: '减的', definition: 'One semitone narrower than the corresponding minor or perfect interval.' },
  { english: 'Accidental', chinese: '临时变音记号', definition: 'A sign such as a sharp, flat or natural that modifies a written note.' },
  { english: 'Enharmonic', chinese: '等音的', definition: 'Different spellings of the same sounding pitch in equal temperament.' },
  { english: 'Time signature', chinese: '拍号', definition: 'The symbols at the start of music that indicate the metre.' },
  { english: 'Key signature', chinese: '调号', definition: 'The sharps or flats at the start of each stave that apply to listed letter names.' },
  { english: 'Written pitch', chinese: '记谱音高', definition: 'The pitch indicated in a performer’s part.' },
  { english: 'Sounding pitch', chinese: '实际音高', definition: 'The pitch that is heard, also called concert pitch.' },
  { english: 'Root position', chinese: '原位', definition: 'A chord arrangement with its root as the lowest note.' },
  { english: 'First inversion', chinese: '第一转位', definition: 'A triad arrangement with its third as the lowest note.' },
  { english: 'Second inversion', chinese: '第二转位', definition: 'A triad arrangement with its fifth as the lowest note.' },
  { english: 'Simple metre', chinese: '单拍子', definition: 'Metre whose principal beats divide into two equal parts.' },
  { english: 'Compound metre', chinese: '复拍子', definition: 'Metre whose principal beats divide into three equal parts.' },
  { english: 'Irregular time signature', chinese: '不规则拍号', definition: 'A time signature such as 5/8 or 7/4 whose principal beats can have unequal lengths.', aliases: ['Irregular metre'] },
  { english: 'Irregular grouping', chinese: '不规则拍组', definition: 'A specified order of unequal beat groups, such as 2 + 3 + 2 quavers in 7/8.' },
  { english: 'Beam', chinese: '符杠', definition: 'A line connecting the stems of short notes to make their rhythmic grouping visible.', aliases: ['Beaming'] },
  { english: 'Accent', chinese: '重音', definition: 'A stress or emphasis on a note, sometimes marked above or below the note.', aliases: ['Accents'] },
  { english: 'Tuplet', chinese: '连音组', definition: 'A group that divides a given duration into a different number of equal parts from its ordinary subdivision.', aliases: ['Irregular division'] },
  { english: 'Quintuplet', chinese: '五连音', definition: 'A tuplet of five equal parts. A marking of 5:4 fits those parts into the time of four ordinary notes of the same value.' },
  { english: 'Sextuplet', chinese: '六连音', definition: 'A tuplet of six equal parts. A marking of 6:4 fits those parts into the time of four ordinary notes of the same value.' },
  { english: 'Tonic', chinese: '主音', definition: 'The first degree of the scale.' },
  { english: 'Supertonic', chinese: '上主音', definition: 'The second degree of the scale.' },
  { english: 'Mediant', chinese: '中音', definition: 'The third degree of the scale.' },
  { english: 'Subdominant', chinese: '下属音', definition: 'The fourth degree of the scale.' },
  { english: 'Dominant', chinese: '属音', definition: 'The fifth degree of the scale.' },
  { english: 'Submediant', chinese: '下中音', definition: 'The sixth degree of the scale.' },
  { english: 'Leading note', chinese: '导音', definition: 'The seventh degree when it lies a semitone below the tonic.', american: 'Leading tone' },
  { english: 'Perfect cadence', chinese: '正格终止', definition: 'A cadence moving from the dominant chord to the tonic chord.', american: 'Authentic cadence' },
  { english: 'Plagal cadence', chinese: '变格终止', definition: 'A cadence moving from the subdominant chord to the tonic chord.' },
  { english: 'Imperfect cadence', chinese: '半终止', definition: 'A cadence ending on the dominant chord.', american: 'Half cadence' },
]

export const glossary: readonly Term[] = [...theoryTerms, ...performanceTerms.filter((term) => !theoryTerms.some((entry) => entry.english.toLowerCase() === term.english.toLowerCase()))]
