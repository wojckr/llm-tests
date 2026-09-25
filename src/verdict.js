/**
 * How a difference is judged against its own standard error, stated once for every analysis that
 * needs it.
 *
 * The thresholds are the usual reading of a ratio of a difference to its standard error: below one the
 * difference cannot be told from zero, one to two is weak evidence, two to three is moderate, and above
 * three chance stops being an explanation.
 *
 * The names say how strong the evidence is, not how probable the effect is. A word such as "probable"
 * would cover everything from near certainty to near impossibility, while the strength of evidence is
 * what the ratio actually measures. No probability is printed beside it either, because the answers are
 * not a random sample of anything and a p-value would claim more than the data can support; the ratio
 * itself is stated in every report, so a reader who wants the number has it.
 */

const MIN_ANSWERS_FOR_A_FIRM_CONCLUSION = 100;

export const STRENGTHS = {
  none: 'none',
  indication: 'indication',
  likely: 'likely',
  confirmed: 'confirmed'
};

/**
 * Judges how strongly a difference stands out from its own standard error.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {number} ratio Absolute value of the difference expressed in standard errors.
 * @return {string} One of the values of STRENGTHS.
 * @throws {never} Throws nothing.
 */
export const strengthOf = (ratio) => {
  if (ratio < 1) return STRENGTHS.none;
  if (ratio < 2) return STRENGTHS.indication;
  if (ratio < 3) return STRENGTHS.likely;
  return STRENGTHS.confirmed;
};

/**
 * Builds the sentence stating what follows from a difference and its ratio to the standard error.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {number} ratio Absolute value of the difference expressed in standard errors.
 * @param {string} effect What the effect would be, phrased so that it can follow the word "that".
 * @return {string} The sentence.
 * @throws {never} Throws nothing.
 */
export const verdictSentence = (ratio, effect) => {
  const strength = strengthOf(ratio);
  if (strength === STRENGTHS.none) return 'Conclusion: no evidence that the effect exists — the difference lies within the noise.';
  if (strength === STRENGTHS.indication) return `Conclusion: weak evidence that ${effect} — chance explains a difference of this size without difficulty.`;
  if (strength === STRENGTHS.likely) return `Conclusion: moderate evidence that ${effect} — chance explains a difference of this size only with difficulty.`;
  return `CONCLUSION: strong evidence that ${effect} — chance is no longer an explanation of a difference of this size.`;
};

/**
 * Builds the warning shown while a variant still holds too few answers for a firm conclusion.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {number} smallestCount The number of answers in the smaller of the two variants.
 * @return {string|null} The warning, or null when there are enough answers.
 * @throws {never} Throws nothing.
 */
export const smallSampleNote = (smallestCount) => (smallestCount >= MIN_ANSWERS_FOR_A_FIRM_CONCLUSION
  ? null
  : `Note: with fewer than ${MIN_ANSWERS_FOR_A_FIRM_CONCLUSION} answers per variant the conclusion is provisional.`);
