import { parsePitch, type Clef, type Pitch } from '../theory'
import type { PitchObjectiveId } from '../questions/pitchQuestions'

interface PitchLesson {
  definition: string
  explanation: string
  example: string
  mistake: string
  memory: string
  pattern: string
  demo: { clef: Clef; pitches: Pitch[]; keySignature?: number }
}

function demo(clef: Clef, notes: string, keySignature?: number): PitchLesson['demo'] {
  return { clef, pitches: notes.split(' ').map(parsePitch), keySignature }
}

export const pitchLessons: Record<PitchObjectiveId, PitchLesson> = {
  'PIT-1-STAVE': {
    definition: 'A clef assigns a specific pitch to one line of the stave and determines all the other notes.',
    explanation: '谱线和间都从下往上数，每往上一步就走到下一个音名字母。高音谱号的旋涡定位第二线的 G4，低音谱号的两个点夹住第四线的 F3。先找这两个定位音，再按 A 到 G 循环往上或往下推。中央 C 是 C4，在高音谱表下方一线、低音谱表上方一线。',
    example: '在高音谱表，第二线 G4 上面一间是 A4，再上一线是 B4。在低音谱表，第四线 F3 上面一间是 G3，再上一线是 A3。',
    mistake: '把第二线误读成从上往下数的第二线。题目里说 second line 时，起点是最下面的谱线。',
    memory: '高音找第二线 G，低音找两点之间的 F。先定一个坐标，再顺着字母走。',
    pattern: 'Identify a note on either stave, including middle C.',
    demo: demo('treble', 'C4 E4 G4 B4'),
  },
  'PIT-1-ACC': {
    definition: 'A sharp raises a note by one semitone, a flat lowers it by one semitone, and a natural restores the unaltered pitch.',
    explanation: '临时记号写在音符左侧，改变的是该位置的音高。看到一个升号，要从该字母的本位音往上移一个琴键。小节未结束时，同一八度的同一个音名再次出现，会沿用这个记号，直到有新的记号或遇到小节线。新小节首先按调号读谱。',
    example: '没有调号时，同一小节中 F♯ 后面再次写同一位置的 F，若前面空白，仍读 F♯。若想回到 F，就在第二个音前写还原号 ♮。',
    mistake: '忽略前面的临时记号，或者误以为一个临时升号会自动升高同小节所有八度的 F。',
    memory: '先看调号，再看本小节同一位置最后一次出现的记号。',
    pattern: 'Read an accidental, its cancellation, or a note after a bar line.',
    demo: demo('treble', 'F#4 F#4 F4'),
  },
  'TRN-1-SAME': {
    definition: 'The same written pitch can occupy different positions in treble and bass clefs.',
    explanation: '更换谱号相当于换坐标系。同一音高的音名字母、八度和升降量全部保持相同。先找离两个谱表都近的中央 C，再把目标音相对于中央 C 的距离搬到新的谱表。看见两个音位于不同的线或间，仍然可能弹同一个琴键。',
    example: '高音谱表下方第一条加线和低音谱表上方第一条加线都表示 C4。若这个音有升号，换谱号后仍表示 C♯4。',
    mistake: '把音符画在新谱表的同一条线。谱号变了，同一条线的音高也会变。',
    memory: '保留琴键，重找谱表位置。',
    pattern: 'Locate the same pitch in the other clef, retaining its octave and spelling.',
    demo: demo('bass', 'B3 C4 D4'),
  },
  'PIT-2-LEDGER': {
    definition: 'A ledger line temporarily extends the stave for notes above or below its five lines.',
    explanation: '加线的间距与谱线一样。紧贴谱表边缘的第一个音在间里，下一步才到第一条加线。音符出现在加线以外的间时，要把那条加线也算进去。先找最上方或最下方的一条正式谱线，再顺着线、间、线、间数。',
    example: '高音谱表最低线是 E4。下面紧贴谱表的间是 D4，下一线是 C4，再下一间是 B3，第二条下加线是 A3。',
    mistake: '从第一条加线开始就数成第一步。谱表和第一条加线之间还有一个间。',
    memory: '离开谱表照旧交替，第一个在间，第二个在线。',
    pattern: 'Identify pitches within two ledger lines above or below a treble or bass stave.',
    demo: demo('treble', 'E4 D4 C4 B3 A3'),
  },
  'PIT-3-LEDGER': {
    definition: 'Notes beyond two ledger lines follow the same alternating lines and spaces as the stave.',
    explanation: '较远的音可以从熟悉的八度位置开始找。例如先认出中央 C，再向下数另一组音。每移动七个线间位置就是一个八度，字母相同。读谱时把加线外的间也数出来，并在最后确认八度，避免只认字母。',
    example: '在高音谱表，从 C4 所在的第一条下加线往下，B3 在间，A3 在第二条加线，G3 在间，F3 在第三条加线。',
    mistake: '把靠外的音当成最近的同名字母，例如把 F3 写成 F4。',
    memory: '很远就跳到熟悉的八度，再补少量线间距离。',
    pattern: 'Read a note on or just beyond a third ledger line.',
    demo: demo('treble', 'C4 A3 F3'),
  },
  'TRN-3-OCTAVE': {
    definition: 'Octave transposition shifts every pitch by twelve semitones and retains each note letter.',
    explanation: '先把原谱读成确切的音名和八度，再把每个八度加一或减一。字母和临时升降量保持一致。最后在目标谱号中重新定位。节奏和旋律方向保持相同，任何相邻两音之间的音程也保持相同。',
    example: '高音谱表的 D4、E4、F♯4 向下移一个八度，读作 D3、E3、F♯3，再写入低音谱表。',
    mistake: '只把同一实际音高改写到另一谱号，遗漏了题目给定的八度变化。',
    memory: '先把音名和八度写成一列，批量加一或减一，再落笔到新谱表。',
    pattern: 'Transpose an original phrase between treble and bass clefs, either up or down an octave.',
    demo: demo('treble', 'D4 E4 F#4', 2),
  },
  'PIT-4-ALTO': {
    definition: 'Alto clef is the C clef with middle C on the third line of the stave.',
    explanation: '中音谱号两个曲线之间指向中央 C。这里的中央是字面意思，五条线正中间的第三线。在这条线的上方，紧邻的一间读 D4，再下一步到 E4。下方第一间读 B3。定完字母和八度后，再看调号及临时记号。',
    example: '中音谱表第三线是 C4，第四线是 E4。在降 E 大调调号下，第四线没有临时记号便读 E♭4。',
    mistake: '因为符号看起来像次中音谱号，就把中央 C 放到第四线。读谱号时同时看它指向哪条线。',
    memory: 'Alto 在正中，第三线就是 C4。',
    pattern: 'Read pitch in alto clef with key signatures of up to five sharps or flats.',
    demo: demo('alto', 'B3 C4 D4 Eb4', -3),
  },
  'PIT-4-DOUBLE': {
    definition: 'A double sharp or double flat raises or lowers an unaltered note by two semitones.',
    explanation: '重升号 𝄪 表示从本位音起向上两个半音，重降号 𝄫 表示向下两个半音。后续出现的新记号会取代前一个记号，所以从重升 F 改成升 F 时，只需写一个升号。用还原号恢复 F 本位音，小节线之后则回归调号。',
    example: '一个小节里依次写 F𝄪、F♯、F♮，在钢琴上每次向下移动一个半音。',
    mistake: '把重升后的单升理解为再上移半音。每个新记号都是相对于其本位字母的新变化量。',
    memory: '升降量直接记为负二、负一、零、一、二。新记号替换数值。',
    pattern: 'Read a double accidental, its replacement, or the pitch carried by the key signature in a new bar.',
    demo: demo('treble', 'F##4 F#4 F4'),
  },
  'PIT-4-ENHARMONIC': {
    definition: 'Enharmonic equivalents have the same sounding pitch and different spellings.',
    explanation: '可以把音名看成字母、八度、半音变化量三部分。先从相应字母的琴键出发，根据变化量移动，再比较两个终点。重升、重降也参与比较。跨过 C 与 B 时，别忘了印在音名里的八度编号会跟着字母边界变动。',
    example: 'B♯3 与 C4 是同一个琴键。B3 上移一个半音就是 C4，因此正确的等音写法跨了八度编号的边界。',
    mistake: '只核对琴键类别，漏看两个音相差一个八度。C♯4 与 D♭5 落在不同的琴键。',
    memory: '等音要同一个键。题目要求特定音程时，还要同正确字母。',
    pattern: 'Identify an enharmonic equivalent, including a double accidental or a boundary between octaves.',
    demo: demo('treble', 'B#3 C4 Dbb4'),
  },
  'TRN-4-SAME': {
    definition: 'Rewriting a pitch in treble, alto or bass clef gives it another staff position while preserving the sound.',
    explanation: '先确认原谱号所指的定位音，读出目标字母、八度与变化量。再用新谱号的定位音设置坐标。例如中音谱表从第三线的 C4 开始，高音谱表从第二线的 G4 开始。比较两谱时，可以用琴键作为中间表示。',
    example: 'A3 在低音谱表的第五线，在中音谱表的第二线。两个位置都应弹钢琴上的 A3。',
    mistake: '按相同音名字母找最近的那个位置，却没比较八度。A3 和 A4 是两个不同的音高。',
    memory: '旧谱读音高，新谱找位置，最后回到同一个键。',
    pattern: 'Locate the same pitch in the treble, alto or bass clef.',
    demo: demo('alto', 'A3 B3 C4'),
  },
  'TRN-4-OCTAVE': {
    definition: 'Octave transposition involving alto clef changes the octave of each pitch before it is rewritten on the destination stave.',
    explanation: '转写前先把草稿写成一列音名，处理调号和临时记号。按题意给整列加或减一个八度，再根据目标谱号检查每个线间位置。中音谱表的 C4 在第三线，适合作为移调结果的校对点。',
    example: '低音谱表上的 A3、B3、C4 升高一个八度得到 A4、B4、C5。写入中音谱表时分别找这三个新音的位置。',
    mistake: '看见中音谱号就把它当成移调乐器。谱号只是写法，八度变化来自题目的指示。',
    memory: '先移音高，再换坐标。',
    pattern: 'Transpose a short phrase up or down an octave to or from the alto clef.',
    demo: demo('bass', 'A3 B3 C4'),
  },
  'PIT-5-TENOR': {
    definition: 'Tenor clef is the C clef with middle C on the fourth line of the stave.',
    explanation: '次中音谱号把中央 C4 定位在自下而上的第四条线。第四线上面的间是 D4，顶线是 E4。第四线下面的间是 B3，第三线是 A3。和中音谱号相比，同一个音在次中音谱表向上移动一整条线的位置。',
    example: '在次中音谱表，A3、C4、E4 分别在第三线、第四线、第五线。',
    mistake: '沿用中音谱号的习惯，从中线开始读 C4。这样所有音都会错一条线。',
    memory: '两个 C 谱号都先找定位线。中音三，次中音四。',
    pattern: 'Identify a note using the fourth line as the tenor clef reference.',
    demo: demo('tenor', 'A3 C4 E4'),
  },
  'PIT-5-FOUR-CLEFS': {
    definition: 'A written pitch is read by combining the clef, key signature and active accidental.',
    explanation: '先辨认谱号的定位音，再读出字母和八度。接着从调号判断该字母的默认变化量。最后检查本小节这个谱表位置是否有临时记号覆盖默认值。每一级信息各有作用，把它们按顺序使用最稳妥。',
    example: '在次中音谱表，顶线是 E4。若调号有六个升号，这条线默认读 E♯4。若音符前有还原号，则读 E4。',
    mistake: '认出了调号便跳过临时记号，尤其容易漏看小调里还原或再升高的音。',
    memory: '字母和八度看谱号，默认升降看调号，例外看临时记号。',
    pattern: 'Read notes in all four clefs and keys with up to six sharps or flats.',
    demo: demo('tenor', 'C#4 E#4 E4', 6),
  },
  'TRN-5-OCTAVE': {
    definition: 'A melody transposed by an octave preserves its rhythm, spelling and interval pattern in the destination clef.',
    explanation: '给旋律做八度移调时，每个实际音高都要移动同样的十二个半音。源谱号与目标谱号只负责两端的读写。如果原旋律先向上再向下，结果也要保持这个轮廓。可以用第一个音和最后一个音交叉校对方向。',
    example: '在次中音谱表读到 C4、D4、B3。若题目要求在高音谱表写高八度，就写 C5、D5、B4。',
    mistake: '只移第一个音，再根据目标谱表的线间位置凭印象抄其余音。最好逐个核对字母和八度。',
    memory: '相同加减应用到每个音，新谱仍然是原来的旋律轮廓。',
    pattern: 'Select the pitches of a short melody moved one octave up or down between any two specified clefs.',
    demo: demo('tenor', 'C4 D4 B3'),
  },
  'TRN-5-CONCERT': {
    definition: 'Written pitch is the performer’s notation, and concert pitch is the actual sounding pitch.',
    explanation: '先确定转换方向。由乐器谱换成实际音高时，用题目给定的方向和音程逐音移调。由实际音高写给乐器时，反向移调。普通降 B 调乐器的书写 C 通常响作低大二度的 B♭，A 调乐器响作低小三度的 A，F 调乐器响作低纯五度的 F。题目会给出需要的音程和方向。',
    example: '降 B 调乐器写 C4、D4、D♯4，向下移大二度得到 B♭3、C4、C♯4。把这组实际音高写回该乐器就向上移大二度。',
    mistake: '只在键盘数半音却忘记数移调度数。D♯4 向下大二度应写 C♯4，写 D♭4 的琴键虽然相同，但字母度数不匹配。',
    memory: '先圈 written 或 concert，确定起点。再圈 up 或 down，然后先数度数，再数半音。',
    pattern: 'Transpose between written and concert pitch for instruments in B flat, A or F.',
    demo: demo('treble', 'C4 D4 D#4'),
  },
}
