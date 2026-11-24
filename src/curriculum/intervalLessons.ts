export interface IntervalLesson {
  definition: string
  explanation: string
  example: string
  mistake: string
  memory: string
  pattern: string
  pitches: [string, string]
}

export const intervalLessons: Record<string, IntervalLesson> = {
  'INT-1-TONE': {
    definition: 'A semitone is one chromatic step. A tone is two semitones.',
    explanation: '在钢琴上，从一个琴键走到紧邻的下一个琴键，距离就是一个半音，无论琴键是白色还是黑色。两个半音合起来是一个全音。E 与 F 之间没有黑键，B 与 C 之间也没有，所以这两组相邻的白键各相隔一个半音。',
    example: '从 C 到 D，依次经过 C♯ 和 D，一共走两步，因此是一个全音。从 E 到 F 只走一步，因此是一个半音。',
    mistake: '常见错误是把相邻白键一律看成全音。判断时请数键与键之间的移动次数。',
    memory: '一格是半音，两格是全音。看到 E 到 F 和 B 到 C，就想起这两组白键之间没有黑键。',
    pattern: 'Decide whether two notes are a tone or a semitone apart.',
    pitches: ['E4', 'F4'],
  },
  'INT-1-NUMBER': {
    definition: 'An interval number counts letter names inclusively, starting with the lower note at one.',
    explanation: '音程的度数来自乐谱上的字母位置。先把下方的音算作一，再依次读出字母，直到上方的音。线和间交替，每一步都加一。升降号会改变音高与半音距离，但同一个字母的谱表位置保持不变。',
    example: 'C 到 E 依次经过 C、D、E，共三个字母，所以是三度。在同一八度里把 E 降成 E♭，字母数仍然是三。',
    mistake: '只数两音之间的空隙，会把三度错算成二度。',
    memory: '落笔先写一，把第一个音也算进去。',
    pattern: 'Identify the number of an interval above the tonic.',
    pitches: ['C4', 'E4'],
  },
  'INT-2-NUMBER': {
    definition: 'Diatonic interval numbers are counted from the tonic through successive scale letters.',
    explanation: '先从调号或题目找出主音，再从主音向上按字母计数。音阶的升降号负责给出正确的调内音高，度数依旧由字母决定。这个方法在大调和小调中都一样。',
    example: '以 D 为主音，向上数 D、E、F、G、A，到 A 为五度。D 大调和 D 小调的五度位置相同。',
    mistake: '看到带升号的调号就额外加一格，会把度数与半音距离混在一起。',
    memory: '先找 tonic，再沿着 scale letters 数到目标音。',
    pattern: 'Identify the number of an interval whose lower note is the tonic of a key for Grade 2.',
    pitches: ['D4', 'A4'],
  },
  'INT-3-QUALITY': {
    definition: 'Interval quality specifies a semitone distance within the family defined by its number.',
    explanation: '把字母数和半音数分开处理。二、三、六、七度以大音程为基准，少一个半音就是小音程。同度、四度、五度和八度以纯音程为基准。先知道度数，才能选择正确的性质类别。',
    example: 'A 到 C 包含 A、B、C，是三度，距离为三个半音，因此是小三度。A 到 C♯ 有四个半音，因此是大三度。',
    mistake: '只记“三个半音是小三度”容易忽略拼写。某些相同半音数的音程可以有不同的度数。',
    memory: '先问 how many letters，再问 how many semitones。',
    pattern: 'Name the number and quality of a diatonic interval above the tonic.',
    pitches: ['A3', 'C4'],
  },
  'INT-4-DIATONIC': {
    definition: 'A diatonic interval can start on any degree of the given scale.',
    explanation: '起点不一定是主音。先按调号和题目指定的音阶形式确定两个实际音高，再从两个端点直接数度数和半音。例如，和声小调升高第七级后，这个变化也会影响以第七级为端点的音程。',
    example: '在 G 大调中，B 与 D 都属于音阶。B、C、D 给出三度，B 到 D 跨三个半音，所以是小三度。',
    mistake: '用调名直接猜音程性质。大调内照样可以出现小三度。',
    memory: '调号决定音高，端点决定名称。',
    pattern: 'Identify or construct a diatonic interval from a given note in a key set for the grade.',
    pitches: ['B4', 'D5'],
  },
  'INT-5-SIMPLE': {
    definition: 'A simple interval has a number from a unison through an octave.',
    explanation: '先数包含两端的字母，再与同度数的大音程或纯音程比较。比大音程或纯音程多一个半音是增音程。比小音程或纯音程少一个半音是减音程。构造时先固定目标字母，再调整升降号，有时需要重升或重降。',
    example: 'C 到 F♯ 是增四度，C 到 G♭ 是减五度。两组都跨六个半音，目标字母不同，因此在谱表上的位置和音程名称都不同。',
    mistake: '在钢琴上找到正确的键后就结束。需要写音时，还要核对字母和八度。',
    memory: '以大或纯作基准。大往下走半音成小，再走一步成减。纯往下走一步就是减。',
    pattern: 'Name a simple interval or select the correct note and accidental to construct it.',
    pitches: ['C4', 'F#4'],
  },
  'INT-5-COMPOUND': {
    definition: 'A compound interval has a number of nine or more. Grade 5 uses ninths through fifteenths.',
    explanation: '复音程的度数从九度开始。可以先缩减一个八度，再判断对应单音程的性质。每多一个八度，半音数加十二，度数加七，因为两段共用一个端点。性质保持相同。作答前确认题目是否要求复音程度数。',
    example: 'C4 到 E5 跨十六个半音。把 E5 降一个八度得到大三度，因此原音程是大十度。',
    mistake: '把三度加一个八度算成十一度，或把十度写成三度。',
    memory: '跨一圈，度数加七，半音加十二，性质照旧。',
    pattern: 'Name an interval wider than an octave or construct it with the given quality.',
    pitches: ['C4', 'E5'],
  },
}

export const intervalIds = Object.keys(intervalLessons)
