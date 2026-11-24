# Architecture

TheoryLab builds to a static directory. The application uses English navigation and hash routes so a GitHub Pages project can serve every screen from one entry point. Relative asset URLs work under a repository path. No accounts or runtime services are needed.

## Dependencies

React owns views and TypeScript checks every application boundary. Vite supports the build and development server. Vite 8 and Vitest 5 are compatible with Node 22.12 or newer. CI uses Node 24 and installs from the npm lockfile. Prefer transparent browser APIs when a wrapper adds little value. The first slice uses CSS, a small notation renderer, native IndexedDB and Web Audio. This keeps engraving, audio and storage outside the assessment algorithms.

- [Vite 8 release and Node requirements](https://v8.vite.dev/blog/announcing-vite8)
- [Vitest version requirements](https://vitest.dev/guide/migration.html)

## Boundaries

| Module | Responsibility |
| --- | --- |
| `src/theory` | Written spelling, chromatic position, clef geometry, rhythms and harmony |
| `src/curriculum` | Objective metadata and authored lesson material |
| `src/questions` | Seeded generation, answer schemas and explanations |
| `src/exam` | Section blueprint, deadlines and scoring |
| `src/learning` | Study statistics, mastery and spaced repetition |
| `src/storage` | Versioned IndexedDB records and export validation |
| `src/ui` | Views, interactive notation and audio presentation |

Pitch retains letter, accidental and octave. Semitone distance and staff position are derived separately. Duration represents a reduced fraction of a semibreve. Domain code remains independent of React and browser APIs.

Attempts retain complete question snapshots, so generator revisions cannot change historical results. Record identifiers support import deduplication. Calculate progress from attempts and lesson visits. Save the exam deadline as an absolute timestamp. Manual submission and expiry use the same score calculation. An examination result and its learning attempts are written in one transaction. The current item and per item viewing durations survive reload.
