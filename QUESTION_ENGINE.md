# Question engine

Generators accept an objective ID and a seed. They return a stable versioned ID, a difficulty, a variation, an English stem, structured options and answer, explanations in Simplified Chinese, terminology and optional notation. Original questions should cover recognition and construction where the specification calls for both.

Use separate functions for computation, option generation, explanations and validation. A semitone match alone cannot validate a written interval construction. Choice IDs bind exact entities independently of display order. Validate objective scope before producing an item, and verify that distractors are distinct and wrong under the same rules as the answer.

Use one seed per attempt or examination slot. Store the generated snapshot and the selected label with an attempt. For a review, request a new seed and prefer a variant that exercises the same objective in a different way. Static facts need cited reference data and can still use deterministic selection and shuffling.
