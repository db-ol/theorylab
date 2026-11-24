type FactRow = [term: string, meaning: string, explanation: string]
export const supplementalFacts: Record<string, readonly FactRow[]> = {
  'TER-1-TEMPO': [
    ['a metronome mark of ♩ = 72', '72 crotchets per minute', '四分音符标示计时单位，72 是一分钟内的数量。'],
    ['a metronome mark of 𝅗𝅥 = 60', '60 minims per minute', '二分音符标示计时单位。每个二分音符持续一秒。'],
  ],
  'TER-1-DYNAMICS': [
    ['an opening hairpin <', 'gradually louder', '随着发夹开口变大，声音逐渐增强。'],
    ['a closing hairpin >', 'gradually quieter', '随着发夹开口收拢，声音逐渐减弱。'],
  ],
  'TER-1-DIRECTIONS': [
    ['a right repeat sign 𝄇', 'repeat from the corresponding left repeat sign or from the beginning', '右反复线是折回的位置。回到与之配对的左反复线，若无左反复线则从开头演奏。'],
    ['common time C', 'four crotchet beats per bar', '普通 C 与 4/4 等效，因此每小节四个四分音符主拍。'],
  ],
  'TER-1-ARTICULATION': [
    ['a slur across a group of notes', 'connect the notes in a smooth group', '连奏线把一组音连贯起来。'],
    ['a tie between adjacent notes at the same pitch', 'add both values with a single attack', '延音线使两音时值相加，第二音保持延续。'],
    ['an accent on a note', 'emphasise its attack', '重音集中加强音符发出的起点。'],
    ['a pause mark 𝄐', 'hold the note or rest longer than written', '延长记号的实际延长量取决于演奏语境。'],
  ],
  'TER-2-SIGNS': [
    ['a short horizontal tenuto line', 'sustain the note for its full value', '短横线提示充分保持时值。'],
    ['a staccato dot combined with a slur', 'play the notes slightly separated', '连线与点并用可以表示较柔和的分离奏法。'],
    ['a staccatissimo wedge', 'play the note very short', '尖楔形断奏符号要求比普通断奏更短。'],
    ['a strong accent ∧ above a note', 'emphasise the note more strongly', '帽形符号在此提示更强的重音。'],
    ['8va above the stave', 'sound an octave higher than written', '上方 8va 让所标音符的实际音高升高一个八度。'],
    ['an alla breve sign 𝄵', 'two minim beats per bar', '带竖线的 C 是 2/2，每小节两个二分音符主拍。'],
  ],
  'TER-4-STRINGS': [
    ['pizzicato', 'pluck the string', '拨奏时用手指拨弦。'], ['arco', 'use the bow', '重新用弓或继续用弓。'],
    ['up bow', 'draw the bow from tip towards heel', '上弓从弓尖方向移向弓根。'], ['down bow', 'draw the bow from heel towards tip', '下弓从弓根方向移向弓尖。'],
    ['a slur over notes in a bowed string part', 'play the group in one bow', '一条连弓线通常要求在同一弓向完成一组音。'],
    ['con sordino', 'use a mute', '装上弱音器。'], ['senza sordino', 'remove the mute', '取下弱音器。'],
    ['avec sourdines', 'use a mute', '这是使用弱音器的法语表达。'], ['sans sourdines', 'remove the mute', '这是不用弱音器的法语表达。'],
    ['sul G', 'play on the G string', '使用 G 弦发出谱上的音。'],
  ],
  'TER-5-PIANO': [
    ['una corda', 'use the soft pedal', '用左侧弱音踏板。'], ['tre corde', 'release the soft pedal', '松开左侧弱音踏板。'],
    ['Ped.', 'depress the sustaining pedal', '踩下右侧延音踏板。'], ['a pedal release asterisk', 'release the sustaining pedal', '踏板星号通常标出松开右侧延音踏板的位置。'],
    ['con pedale', 'play with the sustaining pedal', '演奏时使用延音踏板。'], ['senza pedale', 'play without the sustaining pedal', '演奏时不用延音踏板。'],
    ['mano sinistra', 'use the left hand', '用左手演奏。'], ['mano destra', 'use the right hand', '用右手演奏。'],
    ['an arpeggiation sign beside a chord', 'play the chord notes in rapid succession', '把和弦的音快速依次弹出，方向按记号判断。'],
  ],
}

export const instruments = [
  ['violin', 'strings', 'treble', 'bowed string', 'at written pitch'],
  ['viola', 'strings', 'alto', 'bowed string', 'at written pitch'],
  ['cello', 'strings', 'bass', 'bowed string', 'at written pitch'],
  ['double bass', 'strings', 'bass', 'bowed string', 'an octave below written pitch'],
  ['flute', 'woodwind', 'treble', 'air blown across an edge', 'at written pitch'],
  ['oboe', 'woodwind', 'treble', 'double reed', 'at written pitch'],
  ['B♭ clarinet', 'woodwind', 'treble', 'single reed', 'a major 2nd below written pitch'],
  ['bassoon', 'woodwind', 'bass', 'double reed', 'at written pitch'],
  ['B♭ trumpet', 'brass', 'treble', 'lip vibration', 'a major 2nd below written pitch'],
  ['horn in F', 'brass', 'treble', 'lip vibration', 'a perfect 5th below written pitch'],
  ['trombone', 'brass', 'bass', 'lip vibration', 'at written pitch'],
  ['tuba', 'brass', 'bass', 'lip vibration', 'at written pitch'],
  ['timpani', 'percussion', 'bass', 'struck drumhead', 'at written pitch'],
  ['side drum', 'percussion', 'unpitched percussion', 'struck drumhead', ''],
  ['bass drum', 'percussion', 'unpitched percussion', 'struck drumhead', ''],
  ['cymbals', 'percussion', 'unpitched percussion', 'struck metal', ''],
  ['harp', 'strings', 'treble and bass', 'plucked string', 'at written pitch'],
  ['piccolo', 'woodwind', 'treble', 'air blown across an edge', 'an octave above written pitch'],
  ['cor anglais', 'woodwind', 'treble', 'double reed', 'a perfect 5th below written pitch'],
  ['piano', 'keyboard', 'treble and bass', 'strings struck by hammers', 'at written pitch'],
] as const

export const percussion = [
  ['timpani', true], ['side drum', false], ['bass drum', false], ['cymbals', false],
  ['triangle', false], ['tambourine', false], ['castanets', false], ['tam-tam', false],
  ['xylophone', true], ['marimba', true], ['glockenspiel', true], ['vibraphone', true], ['celesta', true], ['tubular bells', true],
] as const

export const voices = [
  ['soprano', 'the highest of the common female voice types', '女高音通常是女性声部中音区最高的一类。'],
  ['mezzo-soprano', 'the common female voice type between soprano and alto', '常见音区顺序是女高音、女中音、女低音。'],
  ['alto', 'the usual lower of the two upper parts in SATB', '在 SATB 混声合唱中，alto 位于 soprano 下方。'],
  ['tenor', 'the usual higher of the two lower parts in SATB', '在 SATB 混声合唱中，tenor 位于 bass 上方。'],
  ['baritone', 'the common male voice type between tenor and bass', '男中音通常比男高音低，比男低音高。'],
  ['bass', 'the lowest of the common male voice types', '男低音通常是男性声部中音区最低的一类。'],
] as const

export const ornaments = [
  { name: 'trill', sign: 'the abbreviation tr above a note', description: '颤音在主音和上邻音之间快速交替。', offsets: [0, 1, 0, 1, 0, 1, 0] },
  { name: 'upper turn', sign: 'a sideways S shape above a note', description: '上回音依次经过上邻音、主音、下邻音和主音。', offsets: [1, 0, -1, 0] },
  { name: 'upper mordent', sign: 'a short zigzag without a vertical stroke', description: '上波音从主音到上邻音，再立即回到主音。', offsets: [0, 1, 0] },
  { name: 'lower mordent', sign: 'a short zigzag with a vertical stroke', description: '下波音从主音到下邻音，再立即回到主音。', offsets: [0, -1, 0] },
  { name: 'acciaccatura', sign: 'a small grace note with a slash across its stem', description: '短倚音通常写成带斜线的小音符。' },
  { name: 'appoggiatura', sign: 'a small leaning grace note without a slash', description: '长倚音通常写成无斜线的小音符，并占用主音的部分时值。' },
] as const
