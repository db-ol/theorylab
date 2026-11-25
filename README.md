# TheoryLab

TheoryLab is an independent study application for learners preparing for the English ABRSM Grade 5 Music Theory examination. Study a concept in Simplified Chinese, practise with original English questions, and check readiness with an unofficial timed mock.

## Run locally

Use Node 24 and npm.

```sh
npm ci
npm run dev
```

Vite prints the local address. The dashboard opens on Grade 5 and recommends a lesson. Curriculum and Practice open with Grade 5 topics selected. Choose **Grades 1 to 4** to revisit a prerequisite or **All grades** to browse the cumulative syllabus. Open **Settings** to configure mastery thresholds and export or import a progress backup.

## Check and build

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The build goes into `dist`. For GitHub Pages, select **GitHub Actions** as the Pages source. The repository workflow checks the application, tests the built assets under a project path, and deploys a successful build from `main`. Learning records stay in the learner's browser in IndexedDB. A JSON backup allows moving progress to a different browser or site origin.

## Study workflow

Use the globe in the header or open **Settings** to choose English, Simplified Chinese or a bilingual interface. In bilingual mode, main controls show English first with a short Chinese label. The separate **Chinese lesson explanations** switch keeps its own setting. Both preferences are remembered in the current browser. Theory practice questions use English in all modes. Opening a mock exam switches the interface to English automatically. Leaving the exam restores the chosen interface language.

- **Learn** with written explanations and interactive notation. In metre lessons, choose a metre family, a time signature and, where applicable, a beat grouping. Compare tuplets with ordinary notes on two staves that share a time cursor. End each lesson with three original English questions and review the Chinese feedback.
- **Practise** in English and review Chinese reasoning after submitting. Optional vocabulary help is recorded separately.
- **Review** errors with fresh questions on the same objective. Mastery requires varied independent answers and a later successful review.
- **Take a diagnostic** across all domains or sample all 105 objectives. The results link to relevant objectives and prerequisites.
- **Sit a mock** with 75 marks across seven sections, a 120 minute countdown, question flags, browser saving, and result explanations after submission.

The dashboard shows the percentage of Grade 5 lessons studied and the percentage of objectives mastered. Mark a lesson visited or finish its knowledge check to count it as studied. To move progress between devices, export a dated backup from **Settings**, save it to a shared folder such as iCloud Drive and import it on the other device. Export the merged backup to bring the first device up to date.

## Curriculum and sources

The coverage matrix identifies the source pages, grade and automated validation status of each objective. The app uses the published section weights and grade thresholds. The practice and mock material is original. [Syllabus coverage](SYLLABUS_COVERAGE.md) · [Qualification specification](https://www.abrsm.org/sites/default/files/2023-09/Music%20Theory%20Qual%20Spec%20April%202023%20%5B2023%20rebrand%5D.pdf) · [Official practice resources](https://www.abrsm.org/en-gb/practice-resources)

The [product requirements](PRD.md), [architecture](ARCHITECTURE.md), [curriculum](CURRICULUM.md), [question engine](QUESTION_ENGINE.md), [learning engine](LEARNING_ENGINE.md), [content style guide](CONTENT_STYLE_GUIDE.md), [testing strategy](TESTING_STRATEGY.md) and [implementation plan](IMPLEMENTATION_PLAN.md) describe the design and review process.

## Validation and limitations

- Every mapped objective has an implemented lesson and practice, with automated checks for question diversity and scoring. A separate music theory educator and native Chinese editorial review are still pending.
- The mock includes original engraved bars, visual answer choices, numeric entry and note placement by touch, drag or keyboard. Five cadence responses share a labelled melody and are scored separately. The questions use a limited set of musical patterns. The official online practice exam provides the reference for the examination interface.
- The project uses a small SVG renderer, Web Audio, CSS, and native IndexedDB. The renderer supports the notation used by the app. Engraving details and layout still need a visual review across browsers.
- GitHub Actions installs dependencies, runs the unit tests, builds the site and checks it in Chromium before deploying to GitHub Pages. [View deployment runs](https://github.com/db-ol/theorylab/actions/workflows/site.yml)
- TheoryLab is an unofficial study resource. The official ABRSM practice page links to its own examination experience.

Released under the [MIT licence](LICENSE).
