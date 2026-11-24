export interface PerformanceTerm {
  english: string
  chinese: string
  definition: string
  objectiveId: string
  aliases?: readonly string[]
}

type TermRow = [term: string, definition: string, chinese: string, aliases?: readonly string[]]

const termsByObjective: Record<string, readonly TermRow[]> = {
  'TER-1-TEMPO': [
    ['a tempo', 'return to the preceding tempo', '回到之前的速度'],
    ['accelerando', 'gradually faster', '逐渐加快', ['accel.']],
    ['adagio', 'slow and at ease', '缓慢而从容'], ['allegretto', 'fairly quick and lively', '较快而活泼'],
    ['allegro', 'quick and lively', '快速而活泼'], ['andante', 'at a walking pace', '以步行般的速度'],
    ['moderato', 'at a moderate speed', '以适中的速度'],
    ['rallentando', 'gradually slower', '逐渐放慢', ['rall.']],
    ['ritardando', 'gradually slower', '逐渐放慢', ['ritard.', 'rit.']],
  ],
  'TER-1-DYNAMICS': [
    ['crescendo', 'gradually louder', '逐渐增强力度', ['cresc.']],
    ['decrescendo', 'gradually quieter', '逐渐减弱力度', ['decresc.']],
    ['diminuendo', 'gradually quieter', '逐渐减弱力度', ['dim.']],
    ['forte', 'loud', '强奏', ['f']], ['fortissimo', 'very loud', '很强地演奏', ['ff']],
    ['mezzo forte', 'moderately loud', '以中强力度演奏', ['mf']],
    ['mezzo piano', 'moderately quiet', '以中弱力度演奏', ['mp']],
    ['piano', 'quiet', '弱奏', ['p']], ['pianissimo', 'very quiet', '很弱地演奏', ['pp']],
  ],
  'TER-1-DIRECTIONS': [
    ['cantabile', 'in a singing style', '以歌唱般的方式演奏'], ['dolce', 'sweetly', '甜美、柔和地演奏'],
    ['da capo', 'go back to the beginning', '返回曲首', ['D.C.']],
    ['fine', 'the point where the music ends', '结束处'], ['al fine', 'continue as far as the indicated end', '继续演奏至结束标记'],
  ],
  'TER-1-ARTICULATION': [
    ['legato', 'smoothly joined', '连贯地演奏'], ['staccato', 'with short, detached sounds', '短促分离地演奏', ['stacc.']],
  ],
  'TER-2-ITALIAN': [
    ['alla marcia', 'in march style', '以进行曲的风格演奏'], ['allargando', 'becoming broader and slower', '逐渐舒展并放慢'],
    ['con moto', 'with motion', '带着流动感'], ['con', 'with', '带有', ['col']],
    ['dal segno', 'return to the sign', '回到记号处', ['D.S.']], ['e', 'and', '和、与', ['ed']],
    ['espressivo', 'expressively', '富有表情地', ['espress.']],
    ['fortepiano', 'loud with an immediate change to quiet', '强奏后立即转弱', ['fp']],
    ['grave', 'solemn and very slow', '庄重而十分缓慢'], ['grazioso', 'gracefully', '优雅地'],
    ['largo', 'broad and slow', '宽广而缓慢'], ['lento', 'slow', '缓慢地'], ['ma', 'but', '但是'],
    ['meno', 'less', '较少'], ['meno mosso', 'with less motion', '放慢一些'], ['molto', 'very or much', '很、十分'],
    ['non troppo', 'without excess', '不过分'], ['più', 'more', '更多'], ['più mosso', 'with more motion', '加快一些'],
    ['poco', 'a little', '稍微'], ['poco a poco', 'little by little', '一点一点地'], ['presto', 'very fast', '很快地'],
    ['ritenuto', 'immediately held back', '立刻略放慢', ['riten.', 'rit.']], ['senza', 'without', '不带、没有'],
    ['vivace', 'lively', '活泼地', ['vivo']],
  ],
  'TER-3-ITALIAN': [
    ['agitato', 'restlessly agitated', '不安而激动地'],
    ['andantino', 'near andante, commonly slightly quicker', '接近行板，通常略快，个别历史作品也可略慢'],
    ['animato', 'animated', '富有生气地'], ['ben', 'well', '充分地'], ['con forza', 'with force', '有力地'],
    ['energico', 'energetically', '充满活力地'], ['giocoso', 'playfully', '俏皮地'], ['leggiero', 'lightly', '轻盈地'],
    ['maestoso', 'majestically', '庄严雄伟地'], ['marcato', 'marked with emphasis', '清楚而有重音地', ['marc.']],
    ['pesante', 'heavily', '沉重地'], ['prestissimo', 'as fast as possible', '尽可能快地'],
    ['prima', 'first or earlier', '最初的、先前的', ['primo']], ['risoluto', 'decisively and firmly', '果断而坚定地'],
    ['scherzando', 'playfully', '带着玩笑意味地'], ['semplice', 'simply', '朴素自然地'], ['sempre', 'always', '始终'],
    ['sforzando', 'with a sudden strong emphasis', '突然加强重音', ['sforzato', 'sfz', 'sf']],
    ['simile', 'continue in the same manner', '继续采用相同奏法', ['sim.']], ['sostenuto', 'sustained', '保持音值地演奏', ['sost.']],
    ['subito', 'suddenly', '突然地', ['sub.']], ['tranquillo', 'calmly', '平静地'],
    ['triste', 'sadly', '悲伤地', ['tristamente']],
  ],
  'TER-4-ITALIAN': [
    ['affettuoso', 'with affection', '深情地'], ['alla breve', 'in cut common time', '采用二二拍'],
    ['amabile', 'in a pleasant, amiable manner', '亲切愉悦地'], ['appassionato', 'passionately', '热情奔放地'],
    ['assai', 'very much', '非常'], ['come prima', 'as before', '恢复先前的奏法或速度'],
    ['comodo', 'at a comfortable pace', '以舒适的速度', ['tempo comodo']], ['con brio', 'with spirit', '有精神地'],
    ['deciso', 'decisively', '果断地'], ['larghetto', 'rather broadly at a slow pace', '稍宽广而缓慢'],
    ['mesto', 'sad', '悲伤地'], ['misterioso', 'mysteriously', '神秘地'], ['ritmico', 'with rhythmic emphasis', '突出节奏地'],
    ['rubato', 'with flexible timing', '灵活处理乐句速度', ['tempo rubato']],
    ['stringendo', 'pressing ahead with increasing speed', '逐渐催快'],
  ],
  'TER-4-FRENCH': [
    ['animé', 'animated', '有活力地'], ['douce', 'gently', '柔和地'], ['lent', 'slow', '慢速'],
    ['modéré', 'moderate', '以适中的速度'], ['retenu', 'held back', '稍稍收住速度'], ['vite', 'quick', '快速'],
  ],
  'TER-5-ITALIAN': [
    ['a niente', 'to nothing', '到声音完全消失'], ['ad libitum', 'at the performer’s discretion', '由演奏者自由决定', ['ad lib.']],
    ['attacca', 'continue without a break', '不间断地直接进入下一部分'], ['cantando', 'in a singing style', '以歌唱般的方式演奏'],
    ['con dolore', 'sorrowfully', '悲痛地'], ['con spirito', 'with spirit', '有精神地'], ['doloroso', 'sorrowfully', '悲痛地'],
    ['largamente', 'broadly', '宽广地'], ['morendo', 'dying away', '让声音逐渐消退'],
    ['perdendosi', 'dying away', '让乐声逐渐隐去'], ['quasi', 'as if or nearly', '仿佛、近似'],
    ['rinforzando', 'with renewed emphasis', '加强力度或重音', ['rf', 'rfz', 'rinf.']],
    ['smorzando', 'dying away', '逐渐消退，常伴随速度放缓', ['smorz.']],
    ['sonoro', 'resonant', '饱满而有共鸣地'], ['sotto voce', 'in an undertone', '压低声音，像轻声说话'],
  ],
  'TER-5-GERMAN': [
    ['langsam', 'slow', '慢速'], ['lebhaft', 'lively', '活泼地'], ['mässig', 'moderate', '适中'],
    ['ruhig', 'calm', '平静地'], ['schnell', 'quick', '快速'], ['traurig', 'sad', '悲伤地'],
  ],
}

export const performanceTerms: readonly PerformanceTerm[] = Object.entries(termsByObjective).flatMap(([objectiveId, rows]) =>
  rows.map(([english, definition, chinese, aliases]) => ({ english, definition, chinese, objectiveId, aliases })),
)
