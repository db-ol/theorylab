# Testing strategy

Verify pitch spelling, interval quality, clef positions, scales, key signatures, chords, transposition and exact rhythmic arithmetic with independent worked examples. Exercise interval recognition and construction across all objectives and a large deterministic seed range. Check that exactly one answer matches, notation fits the clef, and all distractors have explanations.

Test mastery boundaries, assisted attempts, delayed retrieval and review intervals with explicit clocks. Test storage migrations, import validation and record deduplication with isolated IndexedDB instances. Test exam mark totals, result boundaries, unanswered items, elapsed deadlines and repeated submission.

Check keyboard navigation, an interval lesson and interactive controls, an English practice question with Chinese feedback, the mistake notebook and persistence after reload. Check the production build and mobile layout. Record outstanding manual content review separately from automated validation.

Compare the written group and each member against exact, independent duration calculations for generated tuplet scores. Check the pitches, beat divisions, rests and accidentals in each alternative. The browser suite exercises graphical radio choices, numeric input, note placement and five individually saved cadence responses. For the installed Google Chrome, use `THEORYLAB_BROWSER=chrome npm run test:e2e` after building.
