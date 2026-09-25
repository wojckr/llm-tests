/**
 * Every calculation the experiment needs, with no presentation of any kind.
 * The terminal report and the generated README both read their numbers from here, so the two can
 * never drift apart.
 */

import { readFileSync } from 'node:fs';
import { RESULTS_WITH_EXAMPLE_PATH, RESULTS_WITHOUT_EXAMPLE_PATH } from './paths.js';
import { compareProportions } from './proportions.js';

// The birth year confirmed by documents. A single reference value is not enough to judge the models;
// it serves only to show how far from it the answers lie.
export const DOCUMENTED_YEAR = 1_880;
// Thresholds dividing the models into insistent and scattered, and into close and far.
export const INSISTENT_SHARE_PERCENT = 40;
export const CLOSE_YEARS = 5;
export const MIN_ANSWERS_FOR_BEHAVIOUR = 10;
// The value shown as the example inside the prompt of the first variant.
export const EXAMPLE_VALUE = 1_800;
// The year of death stated in both prompts. Every answer is a birth year counted back from it.
export const DEATH_YEAR = 1_936;

export const VARIANTS = [
  { name: 'withExample', label: 'with example', csvPath: RESULTS_WITH_EXAMPLE_PATH },
  { name: 'withoutExample', label: 'without example', csvPath: RESULTS_WITHOUT_EXAMPLE_PATH }
];

/**
 * Reads the rows of a CSV file whose columns are model and year.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-09 - 2026-09-10.
 * @param {string} csvPath Path to the CSV file.
 * @return {Array<{model: string, year: number}>} Rows in the order in which they were written.
 * @throws {Error} When the file does not exist or cannot be read.
 */
export const readRows = (csvPath) => readFileSync(csvPath, 'utf8')
  .split('\n')
  .slice(1)
  .filter((line) => line.trim() !== '')
  .map((line) => {
    const [model, year] = line.split(',');
    return { model, year: Number(year) };
  });

/**
 * Calculates the arithmetic mean.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-09 - 2026-09-10.
 * @param {number[]} values Values to average.
 * @return {number} The mean.
 * @throws {never} Throws nothing.
 */
export const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

/**
 * Calculates the median of a set of numbers.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-09 - 2026-09-10.
 * @param {number[]} values Values to examine.
 * @return {number} The median.
 * @throws {never} Throws nothing.
 */
export const median = (values) => {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/**
 * Calculates the descriptive statistics of a set of years.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-09 - 2026-09-10.
 * @param {number[]} years Years from one variant.
 * @return {{n: number, mean: number, median: number, sd: number, min: number, max: number}} The descriptive statistics.
 * @throws {never} Throws nothing.
 */
export const describe = (years) => {
  const n = years.length;
  const average = mean(years);
  const variance = years.reduce((sum, year) => sum + (year - average) ** 2, 0) / (n - 1);
  return { n, mean: average, median: median(years), sd: Math.sqrt(variance), min: Math.min(...years), max: Math.max(...years) };
};

/**
 * Groups the years by model.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-09 - 2026-09-10.
 * @param {Array<{model: string, year: number}>} rows Rows of one or both variants.
 * @return {Map<string, number[]>} Years assigned to the names of the models.
 * @throws {never} Throws nothing.
 */
export const groupByModel = (rows) => {
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.model)) grouped.set(row.model, []);
    grouped.get(row.model).push(row.year);
  }
  return grouped;
};

/**
 * Compares the means of two sets of years: the difference, its standard error and the ratio of the two.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {{n: number, mean: number, sd: number}} first Descriptive statistics of the first set.
 * @param {{n: number, mean: number, sd: number}} second Descriptive statistics of the second set.
 * @return {{difference: number, standardError: number, ratio: number}} The comparison.
 * @throws {never} Throws nothing.
 */
export const compareMeans = (first, second) => {
  const difference = first.mean - second.mean;
  const standardError = Math.sqrt(first.sd ** 2 / first.n + second.sd ** 2 / second.n);
  return { difference, standardError, ratio: Math.abs(difference) / standardError };
};

/**
 * Counts the years ending in one of the given digits.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {number[]} years Years of one variant.
 * @param {number[]} digits Digits treated as matching.
 * @return {number} The number of matching years.
 * @throws {never} Throws nothing.
 */
export const countEndingWith = (years, digits) => years.filter((year) => digits.includes(year % 10)).length;

/**
 * Builds the distribution of the last digit of the answer for both variants.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {number[][]} yearsByVariant Years of the variant with the example and of the one without it.
 * @return {Array<{digit: number, withExample: number, withoutExample: number}>} One entry per digit.
 * @throws {never} Throws nothing.
 */
export const lastDigitCounts = ([withExample, withoutExample]) => [...Array(10).keys()].map((digit) => ({
  digit,
  withExample: countEndingWith(withExample, [digit]),
  withoutExample: countEndingWith(withoutExample, [digit])
}));

// The groups of last digits a person reaches for when a year is guessed rather than known.
export const ROUND_ENDINGS = [
  { label: 'ending in 0', digits: [0] },
  { label: 'ending in 0 or 5', digits: [0, 5] }
];

/**
 * Compares how often the answers of the two variants end in a round digit.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {number[][]} yearsByVariant Years of the variant with the example and of the one without it.
 * @return {Array<{label: string, digits: number[], countWith: number, countWithout: number, shareWith: number, shareWithout: number, difference: number, standardError: number, ratio: number}>} One entry per group of digits.
 * @throws {never} Throws nothing.
 */
export const roundEndings = ([withExample, withoutExample]) => ROUND_ENDINGS.map((group) => {
  const countWith = countEndingWith(withExample, group.digits);
  const countWithout = countEndingWith(withoutExample, group.digits);
  return {
    ...group,
    countWith,
    countWithout,
    shareWith: (100 * countWith) / withExample.length,
    shareWithout: (100 * countWithout) / withoutExample.length,
    ...compareProportions(countWith, withExample.length, countWithout, withoutExample.length)
  };
});

/**
 * Summarises the spread of the answers of every model: how many distinct years it gave, its most
 * frequent answer with the share of that answer, and the standard deviation.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {Array<{model: string, year: number}>} rows Rows covered by the summary.
 * @return {Array<{model: string, n: number, distinct: number, mostFrequent: number, mostFrequentCount: number, share: number, sd: number|null}>} One entry per model, ordered from the most repeatable.
 * @throws {never} Throws nothing.
 */
export const spreadByModel = (rows) => [...groupByModel(rows).entries()]
  .map(([model, years]) => {
    const counts = new Map();
    for (const year of years) counts.set(year, (counts.get(year) ?? 0) + 1);
    const [mostFrequent, mostFrequentCount] = [...counts.entries()].sort((first, second) => second[1] - first[1])[0];
    return {
      model,
      n: years.length,
      distinct: counts.size,
      mostFrequent,
      mostFrequentCount,
      share: (100 * mostFrequentCount) / years.length,
      // A standard deviation needs at least two answers.
      sd: years.length < 2 ? null : describe(years).sd
    };
  })
  .sort((first, second) => second.share - first.share);

/**
 * Measures how far the answers of every model lie from the year confirmed by documents.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {Array<{model: string, year: number}>} rows Rows covered by the summary.
 * @return {Array<{model: string, n: number, systematicError: number, sd: number|null, absoluteError: number, hits: number, near: number}>} One entry per model, ordered from the smallest mean absolute error.
 * @throws {never} Throws nothing.
 */
export const accuracyByModel = (rows) => [...groupByModel(rows).entries()]
  .map(([model, years]) => ({
    model,
    n: years.length,
    systematicError: mean(years.map((year) => year - DOCUMENTED_YEAR)),
    sd: years.length < 2 ? null : describe(years).sd,
    absoluteError: mean(years.map((year) => Math.abs(year - DOCUMENTED_YEAR))),
    hits: years.filter((year) => year === DOCUMENTED_YEAR).length,
    near: years.filter((year) => Math.abs(year - DOCUMENTED_YEAR) <= CLOSE_YEARS).length
  }))
  .sort((first, second) => first.absoluteError - second.absoluteError);

/**
 * Classifies every model by whether it insists on one answer and whether that answer lies close to the
 * year confirmed by documents. Models with too few answers are left out, because a handful of answers
 * always looks like insistence.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {Array<{model: string, year: number}>} rows Rows covered by the summary.
 * @return {Array<{model: string, n: number, mostFrequent: number, share: number, distance: number, insists: boolean, close: boolean}>} One entry per model, ordered from insistent and close to insistent and far.
 * @throws {never} Throws nothing.
 */
export const behaviourByModel = (rows) => {
  /**
   * Establishes the order of the behaviours: from insistent and close to insistent and far.
   * @author Wojciech Krajewski; Claude Opus 5.
   * @date 2026-09-10.
   * @param {{insists: boolean, close: boolean}} entry Summary of one model.
   * @return {number} The ordinal position of the behaviour.
   * @throws {never} Throws nothing.
   */
  const rank = (entry) => {
    if (entry.insists) return entry.close ? 0 : 3;
    return entry.close ? 1 : 2;
  };

  return spreadByModel(rows)
    .filter((entry) => entry.n >= MIN_ANSWERS_FOR_BEHAVIOUR)
    .map((entry) => ({
      model: entry.model,
      n: entry.n,
      mostFrequent: entry.mostFrequent,
      share: entry.share,
      distance: entry.mostFrequent - DOCUMENTED_YEAR,
      insists: entry.share >= INSISTENT_SHARE_PERCENT,
      close: Math.abs(entry.mostFrequent - DOCUMENTED_YEAR) <= CLOSE_YEARS
    }))
    .sort((first, second) => rank(first) - rank(second) || second.share - first.share);
};

/**
 * Compares one model with itself across the two prompt variants, for the models that answered both
 * often enough for a mean to say anything. A model that answered a handful of times has a mean made
 * mostly of chance, and here every model counts once, so such a model would carry the same weight as
 * one that answered two hundred times.
 * @author Wojciech Krajewski; Claude Opus 5; Claude Fable 5.1.
 * @date 2026-09-10 - 2026-09-15.
 * @param {Array<Array<{model: string, year: number}>>} rowsByVariant Rows of the variant with the example and of the one without it.
 * @return {Array<{model: string, meanWith: number, meanWithout: number, difference: number, countWith: number, countWithout: number}>} One entry per comparable model, ordered from the largest shift towards the example.
 * @throws {never} Throws nothing.
 */
export const perModelShift = (rowsByVariant) => {
  const [withExample, withoutExample] = rowsByVariant.map((rows) => groupByModel(rows));

  return [...comparableModels(rowsByVariant)]
    .map((model) => ({
      model,
      meanWith: mean(withExample.get(model)),
      meanWithout: mean(withoutExample.get(model)),
      difference: mean(withExample.get(model)) - mean(withoutExample.get(model)),
      countWith: withExample.get(model).length,
      countWithout: withoutExample.get(model).length
    }))
    .sort((first, second) => first.difference - second.difference);
};

/**
 * Compares, for every model present in both prompt variants, how large a share of its answers is taken
 * by the year it gives most often. A model whose answers concentrate more when the example is shown
 * repeats itself more, whatever year it repeats.
 *
 * Models with few answers are left out, because a handful of answers concentrates by itself.
 * @author Wojciech Krajewski; Claude Opus 5; Claude Fable 5.1.
 * @date 2026-09-10 - 2026-09-15.
 * @param {Array<Array<{model: string, year: number}>>} rowsByVariant Rows of the variant with the example and of the one without it.
 * @return {Array<{model: string, shareWith: number, shareWithout: number, difference: number, mostFrequentWith: number, mostFrequentWithout: number, countWith: number, countWithout: number}>} One entry per comparable model, ordered from the largest gain in concentration.
 * @throws {never} Throws nothing.
 */
export const perModelConcentration = (rowsByVariant) => {
  const [withExample, withoutExample] = rowsByVariant
    .map((rows) => new Map(spreadByModel(rows).map((entry) => [entry.model, entry])));

  return [...comparableModels(rowsByVariant)]
    .map((model) => {
      const entry = withExample.get(model);
      const other = withoutExample.get(model);
      return {
        model,
        shareWith: entry.share,
        shareWithout: other.share,
        difference: entry.share - other.share,
        mostFrequentWith: entry.mostFrequent,
        mostFrequentWithout: other.mostFrequent,
        countWith: entry.n,
        countWithout: other.n
      };
    })
    .sort((first, second) => second.difference - first.difference);
};

/**
 * Names the year that stands in the middle of all the answers, counting both prompt variants
 * together. The year is read from the answers rather than chosen, so it moves with the data.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-15.
 * @param {number[][]} yearsByVariant Years of the variant with the example and of the one without it.
 * @return {number} The year in the middle.
 * @throws {never} Throws nothing.
 */
export const middleYear = (yearsByVariant) => median(yearsByVariant.flat());

/**
 * Divides the answers of both variants into the three parts a single year makes of them: the answers
 * earlier than that year, the answers that are that year, and the answers later than it. A shift of
 * the whole distribution moves all three; a pull towards one year moves only the middle part and the
 * part it draws from.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-15.
 * @param {number[][]} yearsByVariant Years of the variant with the example and of the one without it.
 * @param {number} year The year the answers are divided around.
 * @return {Array<{label: string, countWith: number, countWithout: number, shareWith: number, shareWithout: number, difference: number, standardError: number, ratio: number}>} One entry per part.
 * @throws {never} Throws nothing.
 */
export const sharesAroundYear = ([withExample, withoutExample], year) => [
  { label: `earlier than ${year}`, holds: (value) => value < year },
  { label: `exactly ${year}`, holds: (value) => value === year },
  { label: `later than ${year}`, holds: (value) => value > year }
].map((part) => {
  const countWith = withExample.filter(part.holds).length;
  const countWithout = withoutExample.filter(part.holds).length;
  return {
    label: part.label,
    countWith,
    countWithout,
    shareWith: (100 * countWith) / withExample.length,
    shareWithout: (100 * countWithout) / withoutExample.length,
    ...compareProportions(countWith, withExample.length, countWithout, withoutExample.length)
  };
});

/**
 * Measures, for every model comparable in both variants, how large a share of its answers is exactly
 * the given year. Each model stands on both sides of the subtraction, so the mixture of models
 * reaching the two variants cannot produce the result.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-15.
 * @param {Array<Array<{model: string, year: number}>>} rowsByVariant Rows of the variant with the example and of the one without it.
 * @param {number} year The year being counted.
 * @return {Array<{model: string, shareWith: number, shareWithout: number, difference: number, countWith: number, countWithout: number}>} One entry per comparable model, ordered from the largest gain.
 * @throws {never} Throws nothing.
 */
export const perModelYearShare = (rowsByVariant, year) => {
  const [withExample, withoutExample] = rowsByVariant.map((rows) => groupByModel(rows));

  /**
   * States what share of a set of answers is exactly the year being counted.
   * @author Wojciech Krajewski; Claude Opus 5.
   * @date 2026-09-15.
   * @param {number[]} years Answers of one model in one variant.
   * @return {number} The share, as a percentage.
   * @throws {never} Throws nothing.
   */
  const shareOf = (years) => (100 * years.filter((value) => value === year).length) / years.length;

  return [...comparableModels(rowsByVariant)]
    .map((model) => ({
      model,
      shareWith: shareOf(withExample.get(model)),
      shareWithout: shareOf(withoutExample.get(model)),
      difference: shareOf(withExample.get(model)) - shareOf(withoutExample.get(model)),
      countWith: withExample.get(model).length,
      countWithout: withoutExample.get(model).length
    }))
    .sort((first, second) => second.difference - first.difference);
};

/**
 * Treats every model as one observation and compares the shifts across models. This estimate cannot be
 * produced by a change in which models happen to pass the format filter, because each model is compared
 * only with itself.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {Array<{difference: number}>} shifts The per-model shifts.
 * @return {{n: number, mean: number, standardError: number, ratio: number, negative: number}} The summary across models.
 * @throws {never} Throws nothing.
 */
export const shiftAcrossModels = (shifts) => {
  const differences = shifts.map((entry) => entry.difference);
  const n = differences.length;
  const average = mean(differences);
  const variance = differences.reduce((sum, value) => sum + (value - average) ** 2, 0) / (n - 1);
  const standardError = Math.sqrt(variance / n);
  return {
    n,
    mean: average,
    standardError,
    ratio: Math.abs(average) / standardError,
    negative: differences.filter((value) => value < 0).length
  };
};

// How many standard errors two model means have to stand apart before the two models are called
// distinguishable. The same threshold divides an indication from a likely finding elsewhere.
export const DISTINGUISHABLE_STANDARD_ERRORS = 2;

/**
 * Summarises where every model sits on its own, without any reference value: its mean answer, how
 * widely its answers scatter and how precisely its mean is known. Models with a single answer have
 * neither a scatter nor a precision and are left out.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {Array<{model: string, year: number}>} rows Rows covered by the summary.
 * @return {Array<{model: string, n: number, mean: number, sd: number, standardError: number}>} One entry per model, ordered from the earliest mean answer.
 * @throws {never} Throws nothing.
 */
export const meansByModel = (rows) => [...groupByModel(rows).entries()]
  .filter(([, years]) => years.length >= 2)
  .map(([model, years]) => {
    const summary = describe(years);
    return {
      model,
      n: summary.n,
      mean: summary.mean,
      sd: summary.sd,
      standardError: summary.sd / Math.sqrt(summary.n)
    };
  })
  .sort((first, second) => first.mean - second.mean);

/**
 * Measures how far apart the models stand from one another. The measure needs no reference value: it
 * compares the models only with each other, so it holds whatever the true year is.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {Array<{model: string, n: number, mean: number, sd: number, standardError: number}>} models The summary of every model.
 * @return {{n: number, lowest: object, highest: object, range: number, sdOfMeans: number, meanWithinSd: number, pairs: number, distinguishable: number}} The summary across models.
 * @throws {never} Throws nothing.
 */
export const disagreementAcrossModels = (models) => {
  const means = models.map((entry) => entry.mean);
  const average = mean(means);
  const variance = means.reduce((sum, value) => sum + (value - average) ** 2, 0) / (means.length - 1);

  let pairs = 0;
  let distinguishable = 0;
  for (const [index, first] of models.entries()) {
    for (const second of models.slice(index + 1)) {
      const standardError = Math.sqrt(first.standardError ** 2 + second.standardError ** 2);
      pairs += 1;
      if (Math.abs(first.mean - second.mean) > DISTINGUISHABLE_STANDARD_ERRORS * standardError) distinguishable += 1;
    }
  }

  return {
    n: models.length,
    lowest: models[0],
    highest: models[models.length - 1],
    range: models[models.length - 1].mean - models[0].mean,
    sdOfMeans: Math.sqrt(variance),
    meanWithinSd: mean(models.map((entry) => entry.sd)),
    pairs,
    distinguishable
  };
};

/**
 * Builds the counts of every year in both variants, covering the full range of years so that the gaps
 * are visible.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-09 - 2026-09-10.
 * @param {number[][]} yearsByVariant Years of the variant with the example and of the one without it.
 * @return {Array<{year: number, withExample: number, withoutExample: number}>} One entry per year.
 * @throws {never} Throws nothing.
 */
export const yearCounts = (yearsByVariant) => {
  const [withExample, withoutExample] = yearsByVariant;
  const allYears = yearsByVariant.flat();

  /**
   * Counts the occurrences of the given year within one prompt variant.
   * @author Wojciech Krajewski; Claude Opus 5.
   * @date 2026-09-09 - 2026-09-10.
   * @param {number[]} years Years of one variant.
   * @param {number} year The year to count.
   * @return {number} The number of occurrences.
   * @throws {never} Throws nothing.
   */
  const countOf = (years, year) => years.filter((value) => value === year).length;

  const counts = [];
  for (let year = Math.min(...allYears); year <= Math.max(...allYears); year += 1) {
    counts.push({ year, withExample: countOf(withExample, year), withoutExample: countOf(withoutExample, year) });
  }
  return counts;
};

/**
 * Names the models that answered both prompt variants often enough to be described on their own. A
 * model with a handful of answers looks steady, insistent or accurate for no reason but the size of
 * its sample, so every summary made model by model reads only these models. The answers of the other
 * models still count wherever the answers are treated as one mass.
 * @author Wojciech Krajewski; Claude Fable 5.1.
 * @date 2026-09-15.
 * @param {Array<Array<{model: string, year: number}>>} rowsByVariant Rows of the variant with the example and of the one without it.
 * @return {Set<string>} The names of the models.
 * @throws {never} Throws nothing.
 */
export const comparableModels = (rowsByVariant) => {
  const [withExample, withoutExample] = rowsByVariant.map((rows) => groupByModel(rows));
  return new Set([...withExample.keys()]
    .filter((model) => withExample.get(model).length >= MIN_ANSWERS_FOR_BEHAVIOUR
      && (withoutExample.get(model)?.length ?? 0) >= MIN_ANSWERS_FOR_BEHAVIOUR));
};

/**
 * Reads both result files and derives every summary the reports use.
 * @author Wojciech Krajewski; Claude Opus 5; Claude Fable 5.1.
 * @date 2026-09-10 - 2026-09-15.
 * @return {object} The rows, the years, the descriptive statistics and every derived summary.
 * @throws {Error} When one of the CSV files does not exist.
 */
export const loadExperiment = () => {
  const rowsByVariant = VARIANTS.map((variant) => readRows(variant.csvPath));
  const yearsByVariant = rowsByVariant.map((rows) => rows.map((row) => row.year));
  const allRows = rowsByVariant.flat();
  const stats = yearsByVariant.map((years) => describe(years));
  const shifts = perModelShift(rowsByVariant);
  const concentration = perModelConcentration(rowsByVariant);

  // The rows of the models described one by one: the same set of models in every such summary.
  const comparable = comparableModels(rowsByVariant);
  const comparableRowsByVariant = rowsByVariant.map((rows) => rows.filter((row) => comparable.has(row.model)));
  const comparableRows = comparableRowsByVariant.flat();
  const modelMeans = meansByModel(comparableRows);

  // The year in the middle of the answers, and what each variant puts on it.
  const middle = middleYear(yearsByVariant);
  const middleShift = perModelYearShare(rowsByVariant, middle);

  return {
    rowsByVariant,
    yearsByVariant,
    allRows,
    stats,
    meansComparison: compareMeans(stats[0], stats[1]),
    shifts,
    shiftSummary: shiftAcrossModels(shifts),
    lastDigits: lastDigitCounts(yearsByVariant),
    roundEndings: roundEndings(yearsByVariant),
    exampleValueAnswers: yearsByVariant.map((years) => years.filter((year) => year === EXAMPLE_VALUE).length),
    comparableModelCount: comparable.size,
    comparableAnswerCount: comparableRows.length,
    middleYear: middle,
    aroundMiddle: sharesAroundYear(yearsByVariant, middle),
    middleShift,
    middleSummary: shiftAcrossModels(middleShift),
    spread: spreadByModel(comparableRows),
    accuracy: accuracyByModel(comparableRows),
    accuracyByVariant: comparableRowsByVariant.map((rows) => accuracyByModel(rows)),
    behaviour: behaviourByModel(comparableRows),
    modelMeans,
    disagreement: disagreementAcrossModels(modelMeans),
    concentration,
    concentrationSummary: shiftAcrossModels(concentration),
    counts: yearCounts(yearsByVariant)
  };
};
