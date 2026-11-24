import { buildChromaticScale, buildScale, parsePitch, type Clef, type Direction, type Pitch, type ScaleForm } from '../theory'
import type { KeyObjectiveId } from '../questions/keyQuestions'

export interface KeyLesson {
  definition: string
  explanation: string
  example: string
  mistake: string
  memory: string
  pattern: string
  demo?: { clef: Clef; pitches: Pitch[]; keySignature?: number }
}

function demo(
  tonic: string,
  form: ScaleForm,
  keySignature?: number,
  clef: Clef = 'treble',
  direction: Direction = 'ascending',
): KeyLesson['demo'] {
  return { clef, pitches: buildScale(parsePitch(tonic), form, direction), keySignature }
}

export const keyLessons: Record<KeyObjectiveId, KeyLesson> = {
  'KEY-1-SIGNATURE': {
    definition: 'A key signature sets the default accidentals for particular note letters throughout a score.',
    explanation: '调号写在谱号之后，规定对应字母在各个八度的默认音高。临时记号可以在局部改变这个默认值。先认出调号上有哪些升降号，再结合主音或题目说明判断调性。一级的大调包括 C、G、D 和 F。',
    example: '高音谱表开头只有 F♯ 时，每个八度的 F 都默认升高。G 大调音阶的第七级因此是 F♯，接着上行一个半音回到 G。',
    mistake: '只把调号上的升号应用到它所在谱线的那个八度。调号的变化作用于同字母的各个八度。',
    memory: 'C 没有升降号，F 降 B，G 升 F，D 在 F♯ 后再加 C♯。',
    pattern: 'Read a key signature in treble or bass clef and identify the major key.',
    demo: demo('G4', 'major', 1),
  },
  'KEY-1-MAJOR': {
    definition: 'A major scale follows the ascending pattern tone, tone, semitone, tone, tone, tone, semitone.',
    explanation: '从主音到高八度主音，每个字母依次出现一次，中途不要跳字母或重复字母。先把七个字母固定在谱表上，再用全音、半音的排列决定每个音的升降。下行是同一套音高逆序排列。',
    example: 'F 大调先写 F、G、A、B、C、D、E、F。A 到第四级需要一个半音，因此写 B♭。从 B♭ 到 C 是一个全音，恰好符合第四级到第五级的距离。',
    mistake: '把 B♭ 改写成 A♯。在钢琴上两者共用一个琴键，但大调音阶在 A 之后需要字母 B。',
    memory: '先排字母，再调半音。小步出现在第三到第四级和第七级到高八度主音。',
    pattern: 'Complete or recognise an ascending or descending major scale.',
    demo: demo('F4', 'major', -1),
  },
  'KEY-1-DEGREE': {
    definition: 'Scale degrees number the notes of a scale from the tonic.',
    explanation: '主音是第一级。从主音开始逐个字母向上数，就得到所问的音级。上面的同名主音在功能上仍是主音。如果题目按一个八度内的顺序计数，它是第八个音。',
    example: 'D 大调从 D 开始，E 是第二级，F♯ 是第三级，G 是第四级。再遇到高一个八度的 D 时，可以按题目的编号记作第八个音。',
    mistake: '从主音的下一个音开始数一，导致答案整体少一。',
    memory: '把 tonic 写成 1，再数到目标字母。',
    pattern: 'Identify a numbered scale degree shown above the tonic.',
    demo: demo('D4', 'major', 2),
  },
  'KEY-2-RELATIVE': {
    definition: 'Relative major and minor keys share a key signature and have different tonics.',
    explanation: '从大调第六级开始弹调号中的音列，就得到关系自然小调。反过来，从小调主音向上小三度，可以找到关系大调主音。小调常见的升高第七级用临时记号实现，关系调仍保持同一个调号。',
    example: 'G 大调和 E 小调都有一个升号 F♯。E 和声小调另用临时升号把 D 变成 D♯。这个 D♯ 不属于共同调号。',
    mistake: '把 E 大调和 E 小调当作关系调。它们共享主音，调号不同。',
    memory: '同调号换主音。从大调主音向下一个小三度，找到关系小调。',
    pattern: 'Choose the relative major or minor key of a given key.',
    demo: demo('E4', 'harmonic minor', 1),
  },
  'KEY-2-SIGNATURE': {
    definition: 'The Grade 2 key set adds three major keys and three minor keys with their relative signatures.',
    explanation: '升号按 F、C、G 的顺序增加，降号按 B、E、A 的顺序增加。一级调号继续有效。二级加入 A、B♭、E♭ 大调以及 A、E、D 小调。小调需要先找关系大调的调号，再检查旋律中的临时记号。',
    example: 'A 大调调号是 F♯、C♯、G♯。A 小调的关系大调是 C 大调，所以 A 小调调号没有升降号。A 和声小调中的 G♯ 来自一个临时升号。',
    mistake: '根据主音字母把 A 大调的三个升号直接搬到 A 小调。',
    memory: '三个升号是 A 大调，两个降号是 B♭ 大调，三个降号是 E♭ 大调。小调先找关系调。',
    pattern: 'Identify a Grade 2 major or minor key from its notated signature.',
    demo: demo('B♭3', 'major', -2, 'bass'),
  },
  'KEY-2-MAJOR': {
    definition: 'The same major scale pattern determines the spelling of A, B flat and E flat major.',
    explanation: '已知调号时，先写出音名字母，再让调号自动改变对应字母。没有给调号时，仍先写相同字母，然后在需要的位置补临时记号。正反两个方向使用的是同一组音。',
    example: 'E♭ 大调下行是 E♭、D、C、B♭、A♭、G、F、E♭。检查 A♭ 到 G 是半音，对应大调上行第三级到第四级相反的方向。',
    mistake: '在 E♭ 大调的下行音阶中漏掉 A♭，因为下行时没有从低主音顺次检查调号。',
    memory: '大调上下行同一组琴键。先想调号，再读方向。',
    pattern: 'Select a missing note in an ascending or descending scale.',
    demo: demo('E♭5', 'major', -3, 'treble', 'descending'),
  },
  'KEY-2-HARMONIC': {
    definition: 'A harmonic minor scale raises the seventh degree of natural minor in both directions.',
    explanation: '先借助关系大调的调号写出自然小调，再把第七级提高半音。第六级保持原样，第六级和升高后的第七级相距三个半音。和声小调无论上行还是下行，都保留升高的第七级。',
    example: 'D 小调调号有 B♭。D 和声小调上行是 D、E、F、G、A、B♭、C♯、D。升高 C 使它到上方主音 D 只差半音。',
    mistake: '沿用 D 大调调号中的 F♯。D 小调的第三级仍然是 F，临时升高的是第七级 C。',
    memory: '先有自然小调，再抬高七级。上下方向都抬七。',
    pattern: 'Complete an ascending or descending harmonic minor scale.',
    demo: demo('D4', 'harmonic minor', -1),
  },
  'KEY-2-DEGREE': {
    definition: 'A scale degree keeps its tonal identity when moved to another octave.',
    explanation: '题目若问音级，先找这个音在调性的七个位置中属于哪一级。题目若明确要求从指定主音连续计数，则要把经过的每个八度算进去。区分音级的功能编号与实际序列中的位置。',
    example: '在 C 大调中，E5 相对 C4 高一个八度再加三度。E 的音级仍是第三级。如果从 C4 算 1 并持续往上数，E5 是第 10 个音。',
    mistake: '看到加线就认定度数更大，忽略题目是在问调性音级还是从给定主音起的序列位置。',
    memory: '问 degree 时先找七级里的位置。题目要求 continue counting 时才不断加七。',
    pattern: 'Identify scale degrees beyond the first octave.',
    demo: { clef: 'treble', pitches: [parsePitch('C4'), parsePitch('E5')] },
  },
  'KEY-3-SIGNATURE': {
    definition: 'Grade 3 extends the set to all major and minor key signatures with up to four sharps or flats.',
    explanation: '沿升号顺序 F、C、G、D 或降号顺序 B、E、A、D 读到底。再检查主音是对应大调还是关系小调。新增四个升号的 E 大调和 C♯ 小调，以及四个降号的 A♭ 大调和 F 小调。',
    example: '四个降号的调号包含 B♭、E♭、A♭、D♭。若旋律以 F 为主音，则读成 F 小调。若以 A♭ 为主音，则读成 A♭ 大调。',
    mistake: '把最后一个降号 D♭ 当成主音。两个以上降号的大调，倒数第二个降号是大调主音。',
    memory: '四升是 E 与 C♯，四降是 A♭ 与 F。',
    pattern: 'Read signatures through four sharps or flats and identify the named major or minor key.',
    demo: demo('A♭3', 'major', -4, 'bass'),
  },
  'KEY-3-MAJOR': {
    definition: 'Diatonic spelling preserves one of each letter within a major scale.',
    explanation: '进入四个升降号的调后，音阶构造规则不变。先根据主音写满七个字母，再检验第三到第四级、第七级到主音是半音。调号是可以整组复用的变化规则。',
    example: 'E 大调上行是 E、F♯、G♯、A、B、C♯、D♯、E。G♯ 到 A、D♯ 到 E 两处都是半音。A♭ 大调依照同样的方式使用 D♭ 作为第四级。',
    mistake: '把 D♭ 等音改写成 C♯，在 A♭ 大调中跳过第四级应有的 D 字母。',
    memory: '升降号越多，越要让字母先占好位置。',
    pattern: 'Complete the major scale in a key with up to four sharps or flats.',
    demo: demo('E4', 'major', 4),
  },
  'KEY-3-HARMONIC': {
    definition: 'The raised seventh of harmonic minor keeps its diatonic letter.',
    explanation: '调号给出自然小调的默认变化。第七级需要再升高半音。原来是降音时，用还原号升高到本位音，原来是本位音时，写升号。每次先找第七级的字母，再确定它原本的音高。',
    example: 'C♯ 小调的调号包括 F♯、C♯、G♯ 和 D♯。第七级 B 本来是本位音，和声小调写 B♯。钢琴上的 C 虽然与 B♯ 同音，谱上仍保留字母 B。',
    mistake: '看到第七级要升高，就总是写升号。F 和声小调第七级从 E♭ 升高到 E，需要还原号。',
    memory: '为了得到导音，先确认它的原始变化量，再加一个半音。',
    pattern: 'Select the valid spelling of a note in harmonic minor, including raised sevenths.',
    demo: demo('C♯4', 'harmonic minor', 4),
  },
  'KEY-3-MELODIC': {
    definition: 'Classical melodic minor raises degrees six and seven going up and uses natural minor going down.',
    explanation: '旋律小调的上行与下行要分开看。上行时第六级和第七级都比自然小调高半音。这样第六到第七级保持全音，也保留第七级的导向。古典旋律小调下行把这两个音恢复为调号确定的自然小调音高。',
    example: 'G 小调的自然调号是 B♭ 和 E♭。上行旋律小调把 E♭ 改为 E，把 F 改为 F♯。下行从 G 经 F、E♭，再继续按小调调号返回 G。',
    mistake: '只提高第七级，就得到了和声小调的音列。看到 descending 时也要把第六级和第七级恢复。',
    memory: '上行抬六七，下行回调号。',
    pattern: 'Complete or distinguish ascending and descending melodic minor.',
    demo: demo('G4', 'melodic minor', -2),
  },
  'KEY-3-DEGREE': {
    definition: 'Scale degrees can be identified above and below a given tonic.',
    explanation: '改换八度不会改变音级。定位主音后，可以把主音下方的目标音想象成提高一个八度，再按主音到上方目标音的顺序数。小调题还要注意第六级、第七级在指定音阶形式中的音高。',
    example: 'D 和声小调中，D4 下方的 C♯4 向上移八度会成为 C♯5。它在 D4 至 D5 的音阶中排第七，因此是第七级。',
    mistake: '把主音往下的第一个相邻字母直接标成第二级。先把目标音移到统一参考八度。',
    memory: '音级照字母，低音先移高。',
    pattern: 'Name the degree of a scale note written above or below the tonic.',
    demo: { clef: 'treble', pitches: [parsePitch('D4'), parsePitch('C♯4')], keySignature: -1 },
  },
  'KEY-4-SIGNATURE': {
    definition: 'Five sharps give B major or G sharp minor. Five flats give D flat major or B flat minor.',
    explanation: '升号顺序延长到 F、C、G、D、A，降号顺序延长到 B、E、A、D、G。读不同谱号时，升降号对应的字母顺序保持一致，变化的是它们落在谱表上的位置。用调号确定音列，用题目给出的大小调或主音确定调性。',
    example: '中音谱号里的五个降号仍然分别改变 B、E、A、D、G。若题目问大调，答案是 D♭ 大调。若题目问小调，答案是 B♭ 小调。',
    mistake: '用高音谱号的谱线位置去认中音谱号中的升降号，或漏掉第五个记号。',
    memory: '五升 B 与 G♯，五降 D♭ 与 B♭。',
    pattern: 'Read or compare major and minor key signatures with up to five sharps or flats.',
    demo: demo('D♭4', 'major', -5, 'alto'),
  },
  'KEY-4-SCALES': {
    definition: 'Major, harmonic minor and melodic minor share the key signature of their tonic and mode, with scale-specific accidentals.',
    explanation: '先确定调号和主音，再按题目要求选择音阶形式及方向。大调遵循固定全半音排列，和声小调始终提高第七级，旋律小调上行提高第六和第七级。调号已有的变化与音阶额外升高叠加时，可能出现重升。',
    example: 'G♯ 和声小调以五个升号为基础。F 已经是 F♯，作为第七级还要再升一个半音成为 F𝄪，随后上行半音到 G♯。',
    mistake: '把 F𝄪 写成 G，因为两者在钢琴上共用一个键。导音和主音需要分别使用 F 和 G 字母。',
    memory: '调号给起点，音阶形式给额外改动，字母永远按顺序。',
    pattern: 'Complete a major, harmonic minor or melodic minor scale in the Grade 4 key set.',
    demo: demo('G♯4', 'harmonic minor', 5),
  },
  'KEY-4-DEGREE': {
    definition: 'Diatonic scale degrees have technical names that describe their tonal roles.',
    explanation: '第一到第七级依次叫 tonic、supertonic、mediant、subdominant、dominant、submediant 和 leading note。主音建立调性中心。属音在主音上方纯五度，下属音在主音下方纯五度移高八度后成为第四级。导音与上方主音相邻一个半音。',
    example: 'F 大调中 C 是 dominant，B♭ 是 subdominant，E 是 leading note。E 走向 F 时只需向上移动一个半音。',
    mistake: '看到 subdominant 就把它理解成 submediant。它们分别对应第四级和第六级。',
    memory: '一主、四下属、五属、七导音。先牢记这四个锚点，再补二、三和六。',
    pattern: 'Supply the technical name for a marked degree of a specified scale.',
    demo: demo('F4', 'major', -1),
  },
  'KEY-4-CHROMATIC': {
    definition: 'A chromatic scale moves by semitone at each step through the octave.',
    explanation: '半音音阶在一个八度内经过全部十二种音高。钢琴上按方向依次走相邻琴键，就会得到这个顺序。上行常见升号拼写，下行常见降号拼写，实际采用哪一种还要结合题目给出的音名和记谱要求。',
    example: '从 C 上行可写 C、C♯、D、D♯、E、F。E 到 F 中间没有其他琴键，所以直接写 F。若 D 和 E 之间留空，应填入它们之间唯一的半音位置。',
    mistake: '在 E 与 F 之间再加 E♯。E♯ 与 F 实际同音，连续写出来会重复同一音高。',
    memory: '不跳琴键，也不重复琴键。',
    pattern: 'Complete an ascending or descending chromatic scale by inserting the missing semitone.',
    demo: { clef: 'treble', pitches: buildChromaticScale(parsePitch('C4')) },
  },
  'KEY-5-SIGNATURE': {
    definition: 'Grade 5 includes major and minor signatures through six sharps and six flats.',
    explanation: '六个升号的顺序是 F、C、G、D、A、E。六个降号是 B、E、A、D、G、C。不要因为两个调在键盘上等音就把调号混用。分别认出本题的拼写和谱号，再确定它对应的调。',
    example: 'F♯ 大调的导音是 E♯，G♭ 大调的导音是 F。两调主音响在同一个琴键上，但分别对应六个升号和六个降号。',
    mistake: '把 D♯ 小调与 E♭ 小调混为一套调号。二者分别跟 F♯ 大调及 G♭ 大调共用调号。',
    memory: '六升 F♯ 与 D♯，六降 G♭ 与 E♭。先数记号，再选拼写。',
    pattern: 'Identify keys from signatures across treble, bass, alto and tenor clefs.',
    demo: demo('G♭3', 'major', -6, 'tenor'),
  },
  'KEY-5-SCALES': {
    definition: 'The Grade 5 scale set applies major and both minor forms to keys through six sharps or flats.',
    explanation: '用调号处理基础音列，单独处理小调的第六级、第七级，再核对音阶方向。注意调号里的同一升降记号适用于所有八度，临时还原号只负责局部修正。音名字母的次序始终保持完整。',
    example: 'D♯ 和声小调的第七级 C 已由调号变为 C♯。再升半音会得到 C𝄪，与高八度的 D♯ 相距一个半音。对应的古典旋律小调下行还原到调号中的 B 和 C♯。',
    mistake: '把升高的 C𝄪 写成 D，或者把上行旋律小调的变化沿用到下行。',
    memory: '遇到复杂调号，写下自然音列，再依据方向有意修改六级与七级。',
    pattern: 'Complete or construct a specified scale using exact diatonic spelling.',
    demo: demo('D♯4', 'harmonic minor', 6, 'alto'),
  },
}
