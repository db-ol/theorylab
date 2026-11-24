import { parsePitch, type Clef, type Pitch } from '../theory'
import type { ExamStimulus } from '../exam/grade5'
import type { ContextObjectiveId } from '../questions/contextQuestions'

interface ContextLesson {
  definition: string
  explanation: string
  example: string
  mistake: string
  memory: string
  pattern: string
  demo: { clef: Clef; pitches: Pitch[]; keySignature: number }
  stimulus: ExamStimulus
}

function excerpt(clef: Clef, keySignature: number, notes: string, dynamic: string) {
  const pitches = notes.split(' ').map(parsePitch)
  return {
    demo: { clef, pitches, keySignature },
    stimulus: {
      kind: 'excerpt',
      excerpt: {
        clef, keySignature, timeSignature: '3/4',
        bars: [
          { dynamic, pulses: pitches.slice(0, 3).map(pitch => ({ value: 'crotchet', pitch })) },
          { pulses: [{ value: 'minim', pitch: pitches[3] }, { value: 'crotchet', pitch: pitches[4] }] },
        ],
      },
    } satisfies ExamStimulus,
  }
}

export const contextLessons: Record<ContextObjectiveId, ContextLesson> = {
  'CTX-1-MELODY': {
    definition: 'An excerpt is a short passage of music used to answer questions about the score.',
    explanation: '拿到一段旋律时，先读谱号、调号、拍号与小节线。题目若问某个音，先圈出它的小节编号，再在这一小节内从左往右数音。若题目问时值，看符头、符干、附点和符尾。力度题则从指定小节附近寻找 p、f 等标记。',
    example: '图中第 1 小节标 p，表示弱奏。第 2 小节的第一个音是带符干的空心符头，时值为二分音符。在 3/4 拍中，它占两个四分音符拍。',
    mistake: '从整段开头连续数音。题目说 note 2 of bar 2 时，要先找到第 2 小节，再从这一小节的开头数。',
    memory: '先找小节，再找对象，最后找谱面证据。',
    pattern: 'Identify a note, note value or dynamic marking in a short treble or bass melody.',
    ...excerpt('treble', 0, 'E4 G4 F4 D4 C4', 'p'),
  },
  'CTX-4-EXCERPT': {
    definition: 'A passage can be analysed by reading its notation and identifying a suitable orchestral instrument.',
    explanation: '先从谱号、调号与拍号判断乐段的基本结构，再按问题检查指定的音或记号。与乐器有关时，区分最常用的谱号与偶尔使用的谱号。题目问主要使用的谱号时，就用这个常例配对。若题目给出音域或乐器家族，还需要同时满足这些线索。',
    example: '图中箭头形的 C 谱号定位第三线，表示中音谱表。中提琴通常使用它。若调号只有一个降号，且第三线是 C4，则第三线下方的一间通常读 B♭3。',
    mistake: '知道某种乐器偶尔会读高音谱号，就直接把它选作高音谱表的典型乐器。要结合题目中的 usually 和 register。',
    memory: '先读声部，再匹配常用谱号。题目多给一条线索，就多核对一条。',
    pattern: 'Read a short passage and identify its notation features or the instrument that normally uses its clef.',
    ...excerpt('alto', -1, 'A3 Bb3 C4 F4 C4', 'mf'),
  },
  'CTX-5-OBSERVE': {
    definition: 'A musical observation applies a theory rule to specific evidence in a score.',
    explanation: '先找陈述所指的位置和对象，例如小节的首尾音、某个音级或速度术语。读谱时把观察结果写成简短事实，再和陈述比较。一旦要数音，就按题意区分每个书写音符、总拍数与实际音高。例如问某个音出现几次，每个写出的音符只数一次，不因时值不同而增加次数。',
    example: '图中第 1 小节首尾是 A3 和 C4，先数 A、B、C 得到三度。A 到 C 跨三个半音，因此是小三度。第 2 小节第一个音是 G3，占两拍，这个音只出现一次。',
    mistake: '凭音阶中常见的音或预期的演奏方式判断真假。先在谱面上找证据，再应用乐理。',
    memory: '定位对象，读出事实，写出规则，核对结论。',
    pattern: 'Support an English statement or numeric response with evidence from an original excerpt.',
    ...excerpt('tenor', 0, 'A3 B3 C4 G3 A3', 'mp'),
  },
}
