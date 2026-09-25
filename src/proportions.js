/**
 * Shared arithmetic on proportions for the scripts that present the results of the experiment.
 */

/**
 * Returns a proportion as a percentage, or a mark of missing data when the denominator is zero.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-09 - 2026-09-10.
 * @param {number} part Numerator.
 * @param {number} whole Denominator.
 * @return {string} The percentage to one decimal place, or "—".
 * @throws {never} Throws nothing.
 */
export const percent = (part, whole) => (whole === 0 ? '—' : `${((100 * part) / whole).toFixed(1)}`);

/**
 * Compares two proportions: gives the difference in percentage points, its standard error
 * and the difference expressed in standard errors.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {number} firstPart Numerator of the first proportion.
 * @param {number} firstWhole Denominator of the first proportion.
 * @param {number} secondPart Numerator of the second proportion.
 * @param {number} secondWhole Denominator of the second proportion.
 * @return {{difference: number, standardError: number, ratio: number}} The difference in percentage points, its standard error and the ratio of the two.
 * @throws {never} Throws nothing.
 */
export const compareProportions = (firstPart, firstWhole, secondPart, secondWhole) => {
  const firstRate = firstPart / firstWhole;
  const secondRate = secondPart / secondWhole;
  const difference = 100 * (firstRate - secondRate);
  const standardError = 100 * Math.sqrt(
    (firstRate * (1 - firstRate)) / firstWhole + (secondRate * (1 - secondRate)) / secondWhole
  );
  return { difference, standardError, ratio: Math.abs(difference) / standardError };
};
