import type { StudyLesson } from './rhythmLessons'

type Summary = [string, string, string, string, string, string]
const entries: Record<string, Summary> = {
  'HAR-1-TONIC': [
    'A tonic triad contains scale degrees one, three and five.',
    '先把主音当作根音，然后沿指定大调音阶隔一个字母取一个音。根音上方的三度音和五度音共同构成三和弦。三音按根音最低的顺序写出时，就是原位。',
    'C 大调音阶上，第一、第三、第五级是 C、E、G。换成 F 大调时，对应的三个字母是 F、A、C。',
    '直接选音阶前面三个音 C、D、E。三和弦是隔级取音。',
    '用钢琴的 C、E、G 手型回想一、三、五。',
    'Select the three notes of the tonic triad in a given major key.',
  ],
  'HAR-2-TONIC': [
    'The tonic triad in a minor key has a minor third above the root and a perfect fifth.',
    '小调主三和弦同样来自第一、第三、第五级。第三音与根音相隔三个半音，因此品质是小三和弦。即使用和声小调，升高的是第七级，主三和弦的三个音仍保持原来的拼写。',
    'D 小调的主三和弦是 D、F、A。D 大调中第三音是 F♯，这个半音差改变了和弦性质。',
    '看到小调需要升高导音，就在三和弦里随便升高一个音。先核对和弦使用的级数。',
    '先找一、三、五，再检查调内的第三音。',
    'Choose the correctly spelled tonic triad in a Grade 2 key.',
  ],
  'HAR-3-TONIC': [
    'Build a tonic triad from the correctly spelled first, third and fifth scale degrees.',
    '有多个升降号时，把调号影响到的字母先写在草稿上，再取和弦所需的级数。和弦写法要保留以三度叠置的字母关系。',
    'E 大调有 F♯、C♯、G♯ 和 D♯。主三和弦是 E、G♯、B。G♯ 与 A♭ 听起来一样，只有 G♯ 是 E 上方的三度音。',
    '在钢琴上找到等音后，忽略乐谱的拼写。',
    '先隔字母叠三度，再填调号里的升降号。',
    'Select the root position tonic triad in a key with up to four sharps or flats.',
  ],
  'HAR-4-PRIMARY': [
    'The primary chords are built on the tonic, subdominant and dominant degrees.',
    '主和弦、下属和弦、属和弦分别以第一、第四、第五级为根音。三和弦的其他音从该根音起隔级取得。小调题里使用和声小调，因为属和弦通常需要升高的导音。',
    'A 和声小调的主和弦是 A、C、E，下属和弦是 D、F、A，属和弦是 E、G♯、B。',
    '把小调中的 V 写成小三和弦 E、G、B。和声小调第七级要升高。',
    '一、四、五是根音位置，每次从根音另数一、三、五。',
    'Build or identify root position primary chords in a set key.',
  ],
  'HAR-5-SUPERTONIC': [
    'The supertonic triad is built on degree two using the next two stacked thirds.',
    '从第二级向上隔级取第四和第六级。大调中这组音是小三和弦，和声小调中通常是减三和弦。要按指定调的字母和升降号拼写。',
    'C 大调的 ii 是 D、F、A。C 和声小调的 ii 是 D、F、A♭，五度比纯五度少一个半音。',
    '用超主音和弦的名称去猜调式。先从音阶实际取第二、第四、第六级。',
    '二、四、六对着数，先取二级为根音。',
    'Recognise or build a supertonic chord in a Grade 5 key.',
  ],
  'HAR-5-PRIMARY': [
    'The tonic, subdominant and dominant triads use scale degrees one, four and five as their roots.',
    '调号可多至六个升降号。先确定题目的主音和调式，再在音阶里定位目标级数。超出八度时继续按同一音阶取音。小调和弦用和声小调的第七级。',
    'F♯ 大调的属音是 C♯，属和弦是 C♯、E♯、G♯。即使琴键 E♯ 和 F 相同，和弦第三音要写成 E♯。',
    '只根据琴键位置填入 F。正确的和弦第三音与 C 的字母距离是三度。',
    '根音定位后，沿调内字母跳一格取一音。',
    'Choose the spelling of I, IV or V in a key with up to six signs.',
  ],
  'HAR-5-INVERSION': [
    'Inversion is determined by the chord member in the bass.',
    '三和弦的音集合确定和弦本身，最低音决定排列。根音最低是原位 a，第三音最低是第一转位 b，第五音最低是第二转位 c。高声部如何排列不改变转位。',
    'C、E、G 的和弦把 E 移到最低，写成 E、G、C，就成为第一转位。',
    '把最先看到的音直接叫根音。先恢复三度叠置来找根音，再看最低音。',
    'a 看根音，b 看三音，c 看五音。',
    'Name an inversion or select a voicing with the required bass.',
  ],
  'HAR-5-PERFECT': [
    'A perfect cadence ends with V moving to I.',
    '属和弦给出向主和弦解决的倾向。属和弦的导音上行半音到主音是常见的听觉线索。题目要求在 C、G、D 或 F 大调识别或选出这两个和弦。',
    '在 G 大调中，D 大三和弦接 G 大三和弦，是 V 到 I。',
    '看到 I 结束就选 perfect。IV 到 I 的名称是 plagal。',
    '属到主，回到家。',
    'Select the chords that form a perfect cadence in a named major key.',
  ],
  'HAR-5-PLAGAL': [
    'A plagal cadence moves from IV to I.',
    '下属和弦直接接主和弦。两个和弦可以共享主音，因此听起来也有收束感。识别名称时，看倒数第二个和弦的根音是第四级还是第五级。',
    'F 大调里 B♭ 大三和弦接 F 大三和弦，是 IV 到 I。',
    '只凭结束音听出它像结尾，就选择 perfect。两种终止都能在 I 上结束。',
    '先看结束是 I，再看前面是不是 IV。',
    'Identify the IV to I pair as a plagal cadence.',
  ],
  'HAR-5-IMPERFECT': [
    'An imperfect cadence ends on the dominant chord V.',
    '若乐句停在属和弦，听起来常像还等着继续。题目里的常见出发和弦是 I、ii 或 IV，末和弦用 V。先确认给定的调，再算属和弦的根音。',
    'D 大调中，D 大三和弦 I 接 A 大三和弦 V，就是一种 imperfect cadence。',
    '看到 V 就选 perfect。V 在前面并接 I 才构成这里的 perfect。',
    '看最后一站：停在属和弦，期待下句。',
    'Choose a progression ending on V in a given major key.',
  ],
  'HAR-5-CHOICE': [
    'A suitable cadential chord fits both the melody note and the requested cadence.',
    '先写出题目给定终止式的倒数两个和弦，再核对各自位置上的旋律音。如果题目让你选其中一个和弦，先用终止式确定候选级数，再筛出包含该旋律音的和弦。',
    'G 大调的正格终止可以支撑旋律 F♯ 到 G，因为 F♯ 属于 D 大三和弦 V，末音 G 属于主和弦 I。',
    '只检查末音属于主和弦，就忽略前一个音与属和弦的关系。',
    '先定功能顺序，再检查旋律音是否在各自和弦里。',
    'Select the chord pair that supports two notes at a cadential point.',
  ],
}

export const harmonyLessons = Object.fromEntries(Object.entries(entries).map(([id, fields]) => {
  const [definition, explanation, example, mistake, memory, pattern] = fields
  return [id, { definition, explanation, example, mistake, memory, pattern }]
})) as Record<string, StudyLesson>
