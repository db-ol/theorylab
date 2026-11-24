# TheoryLab product requirements

TheoryLab prepares an adult Mandarin speaker with Grade 5 practical piano experience to take the English ABRSM Grade 5 Music Theory examination. Cover the cumulative Grade 1 to 5 requirements. Use the learner's piano knowledge in explanations and examples while assessing prerequisites directly.

## Learning experience

| Mode | Learner experience | Evidence recorded |
| --- | --- | --- |
| Learn | English concept and definition, substantive Simplified Chinese explanation, interactive notation, worked examples, mistakes, memory cue, and knowledge check | Lesson completion |
| Practice | English prompts and options, optional vocabulary help, and Chinese reasoning after submission | Objective, variation, answer, accuracy, timestamp, elapsed time, and help used |
| Review | New questions for missed or due objectives, plus a sortable notebook of previous errors | Review timing, outcomes, and optional mistake classification |
| Diagnostic | English questions spanning the cumulative curriculum, with objective and prerequisite recommendations after submission | Objective evidence and recommended next actions |
| Mock exam | English timed paper with marks, navigation, flags, and automatic local saving. Present explanations and scores after submission | Completed paper, total, section marks, objective results, and submission time |

Separate syllabus coverage, lesson completion, theory mastery, and vocabulary mastery on the dashboard. The initial theory mastery policy requires ten distinct attempts, at least 90% independent accuracy, more than one question variation, and successful delayed review. Use 1, 3, 7, 14, and 30 days as the review steps. An incorrect delayed answer sends the item back to the first step.

Glossary and vocabulary training reinforce British terms, common examination instructions, conflicting meanings, and American equivalents. Score vocabulary separately. Audio is an optional aid during lessons and exploration. Keep the English exam interface free of translations, hints, and study audio.

## Verified exam design

ABRSM specifies 120 minutes for Grade 5 and 75 marks. The specification supplies section weights and result bands. The answer key confirms the seven section headings and sample distribution. [Qualification specification, pages 10, 25 and 26](https://www.abrsm.org/sites/default/files/2023-09/Music%20Theory%20Qual%20Spec%20April%202023%20%5B2023%20rebrand%5D.pdf) · [Grade 5 sample model answers, pages 1 to 5](https://www.abrsm.org/sites/default/files/2023-09/music-theory-grade-5-sample-model-answers.pdf)

| Section | Marks | Top level item marks in the public sample |
| --- | ---: | --- |
| Rhythm | 10 | 3, 1, 2, 1, 3 |
| Pitch | 10 | 1, 1, 5, 3 |
| Keys and Scales | 15 | 1, 1, 3, 2, 3, 2, 3 |
| Intervals | 10 | 3, 3, 4 |
| Chords | 10 | 5, 2, 3 |
| Terms, Signs and Instruments | 10 | 3, 2, 5 |
| Music in Context | 10 | 1, 5, 1, 1, 2 |
| **Total** | **75** | **30 top level items** |

| Result | Verified mark band |
| --- | --- |
| Distinction | 65 to 75 |
| Merit | 60 to 64 |
| Pass | 50 to 59 |
| Below Pass | 0 to 49 |

The sample item counts guide mock layout. Section weights and grade thresholds come from the qualification specification. Award marks per independently assessable response, including subparts, and award zero for blanks. Each mock uses original material and a seed for its excerpt and question variations. [Grade 5 sample paper](https://www.abrsm.org/sites/default/files/2023-09/music-theory-grade-5-sample-paper-200722.pdf)

The online examples explicitly demonstrate single selection, notehead placement including double accidentals, numeric entry, and dropdown matching. The Grade 5 sample also contains true or false statements, notation choice, and multiple questions about an excerpt. Provide keyboard input for stave placement and preserve the requested spelling. [Online example items, sheets 2 to 5](https://www.abrsm.org/sites/default/files/2023-09/abrsm-ot-reference-sheet-example-questions_online-music-theory-from-2020.pdf) · [Grade 5 sample paper](https://www.abrsm.org/sites/default/files/2023-09/music-theory-grade-5-sample-paper-200722.pdf)

Save the started time, deadline, original questions, answers, and flags locally. Recompute remaining time from the deadline after reload or tab suspension. Freeze responses when the user submits or time expires. Provide a clearly labelled unofficial result, per section marks, review explanations, and recommended objectives. ABRSM's current guidance describes the PSI Bridge setup and countdown. Its three hour launch window concerns starting the exam. [Current ABRSM online exam guidance](https://www.abrsm.org/en-gb/guidance)

TheoryLab presents each marked response as a navigable part and reuses shared musical material across related parts. It uses accessible position and accidental controls for notehead placement. Some notation alternatives use English descriptions of the intended grouping or written pitches. The Music in Context bank currently uses one family of seeded four bar melodies and the Terms, Signs and Instruments section samples a subset of the cumulative terminology. Broader excerpt formats, graphical notation alternatives, and multirow matching remain content and interaction gaps.

## Official practice resources

The current ABRSM resource page lists free Grade 5 online practice in English, downloadable papers and model answers, and newer commercial editions alongside the freely available 2020 sample. The 2023 qualification specification combines earlier documents and records that syllabus content and exam requirements are unchanged. The current official site continues to list the from 2020 Grades 1 to 5 syllabus. TheoryLab links to the Grade 5 entry on the official resource page. Its separate exam launch destination could not be verified from this environment. [About ABRSM Music Theory](https://www.abrsm.org/en-gb/music-theory/about-music-theory) · [Official free Grade 5 practice](https://www.abrsm.org/en-gb/practice-resources#:~:text=Grade%205%20%2D%20English%2C%20Italian%2C%20Spanish) · [ABRSM syllabus outline](https://www.abrsm.org/sites/default/files/2024-01/music-theory-syllabus-outline-grades-1-5-from-2020.pdf)

## Release acceptance

1. The first usable release includes the interval progression, bilingual lessons, keyboard and stave interactions, deterministic quizzes, objective progress, mistake review, and an automated end to end workflow.
2. Full curriculum acceptance requires sourced objectives, substantive Chinese lessons, English questions, and independent checks for every required objective. Track remaining work in the coverage matrix.
3. Examination readiness acceptance requires a cumulative diagnostic, actionable review queue, vocabulary training, and a full original mock with the verified scoring above.
4. Distribution requires a production build, passing automated tests, responsive and keyboard checks, local progress import and export, and a GitHub Pages deployment. The publication destination requires explicit approval before publishing.
