/**
 * The parts of the articles that are computed rather than written by hand: the tables, the charts and
 * the conclusions. An article in content/ refers to them by placeholder, so the wording around them can
 * be edited freely while the numbers keep coming from the collected answers.
 *
 * The conclusions are drawn by the same code that draws them in the terminal, so the published document
 * and the working instrument cannot disagree.
 */

import { fixed, negative, table } from './markdown.js';
import { compareProportions } from './proportions.js';
import { countFilteredByModel, readLog, REQUEST_ERROR_MODEL } from './requestsLog.js';
import { barsChartSvg, divergingBarsChartSvg, intervalsChartSvg, partOfWholeChartSvg, scatterChartSvg, sortedValuesChartSvg, SERIES_COLOURS } from './chartSvg.js';
import { smallSampleNote, verdictSentence } from './verdict.js';
import {
  CLOSE_YEARS,
  DEATH_YEAR,
  DISTINGUISHABLE_STANDARD_ERRORS,
  DOCUMENTED_YEAR,
  EXAMPLE_VALUE,
  INSISTENT_SHARE_PERCENT,
  MIN_ANSWERS_FOR_BEHAVIOUR,
  mean
} from './statistics.js';

const INTERVAL_STANDARD_ERRORS = 2;
// The number of last digits the article names as the peaks of the distribution.
const PEAK_DIGITS = 2;

// The terminal names the two variants briefly, because the person reading it knows what they are. A
// published page is read by someone who does not, so it names them in full.
const PROMPT_NAMES = [
  `the prompt ending with "(np. ${EXAMPLE_VALUE})"`,
  'the prompt without that example'
];
const VARIANT_NAMES = PROMPT_NAMES.map((name) => `answers to ${name}`);

/**
 * Builds the table of the descriptive statistics of both prompt variants.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The table as Markdown.
 * @throws {never} Throws nothing.
 */
const variantsTable = (experiment) => table(
  ['prompt', 'answers', 'mean', 'median', 'standard deviation', 'earliest year', 'latest year'],
  experiment.stats.map((stats, index) => [
    VARIANT_NAMES[index],
    String(stats.n),
    fixed(stats.mean, 1),
    fixed(stats.median, 1),
    fixed(stats.sd, 1),
    String(stats.min),
    String(stats.max)
  ])
);

/**
 * Builds the chart of the two mean answers, each with the range its true value is expected to fall in.
 * The chart shows the same two numbers as the mean column of the table, and shows in addition how much
 * room the collected answers leave around each of them.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The chart as an SVG element.
 * @throws {Error} When a mean lies outside its own range.
 */
const variantsChart = (experiment) => intervalsChartSvg({
  rows: experiment.stats.map((stats, index) => {
    const standardError = stats.sd / Math.sqrt(stats.n);
    return {
      label: VARIANT_NAMES[index],
      colour: SERIES_COLOURS[index],
      value: stats.mean,
      lower: stats.mean - INTERVAL_STANDARD_ERRORS * standardError,
      upper: stats.mean + INTERVAL_STANDARD_ERRORS * standardError,
      spreadLower: stats.mean - stats.sd,
      spreadUpper: stats.mean + stats.sd
    };
  }),
  spreadLabel: 'the range a single answer typically falls in',
  xLabel: 'year, with the mean of the answers and the range its true value is expected to fall in',
  description: 'The mean answer of each prompt variant, with the range the true mean is expected to fall in.'
});

/**
 * Reads the answers as ages, counting back from the year of death stated in the prompt.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-15.
 * @param {object} experiment The loaded experiment.
 * @return {string} The sentence as Markdown.
 * @throws {never} Throws nothing.
 */
const variantsLifespans = (experiment) => {
  const earliest = Math.min(...experiment.stats.map((stats) => stats.min));
  const latest = Math.max(...experiment.stats.map((stats) => stats.max));
  const answers = experiment.stats.reduce((sum, stats) => sum + stats.n, 0);

  return `The man died in ${DEATH_YEAR}, so every answer also states an age. The ${answers} answers give `
    + `ages from ${DEATH_YEAR - latest} to ${DEATH_YEAR - earliest} years. **No model made a single `
    + `mistake here: not one of the ${answers} answers is an impossible age.**`;
};

/**
 * States how many answers were collected and how far apart the earliest and the latest of them stand.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-15.
 * @param {object} experiment The loaded experiment.
 * @return {string} The sentence as Markdown.
 * @throws {never} Throws nothing.
 */
const answersRange = (experiment) => {
  const earliest = Math.min(...experiment.stats.map((stats) => stats.min));
  const latest = Math.max(...experiment.stats.map((stats) => stats.max));
  const answers = experiment.stats.reduce((sum, stats) => sum + stats.n, 0);

  return `Only one answer is correct, and meanwhile the ${answers} answers run from ${earliest} to `
    + `${latest}, a span of ${latest - earliest} years.`;
};

/**
 * States how far the answers land from the documented year, counting every answer of both variants.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-15.
 * @param {object} experiment The loaded experiment.
 * @return {string} The sentence as Markdown.
 * @throws {never} Throws nothing.
 */
const distanceFromRecord = (experiment) => {
  const years = experiment.yearsByVariant.flat();
  const missed = mean(years.map((year) => Math.abs(year - DOCUMENTED_YEAR)));
  const exact = years.filter((year) => year === DOCUMENTED_YEAR).length;

  return `Measured against ${DOCUMENTED_YEAR}, the answers miss by as many as **${fixed(missed, 1)}** years on `
    + `average, and only **${fixed((100 * exact) / years.length, 1)} %** of the answers name the recorded year exactly.`;
};

/**
 * Builds the conclusion of the comparison of the two variants, stated from the collected answers.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10 - 2026-09-25.
 * @param {object} experiment The loaded experiment.
 * @return {string} The conclusion as Markdown.
 * @throws {never} Throws nothing.
 */
const variantsConclusion = (experiment) => {
  const { difference, standardError, ratio } = experiment.meansComparison;
  const lower = difference - INTERVAL_STANDARD_ERRORS * standardError;
  const upper = difference + INTERVAL_STANDARD_ERRORS * standardError;

  const direction = difference < 0
    ? `the answers shift towards the value given in the example (${EXAMPLE_VALUE})`
    : 'the answers shift away from the value given in the example';

  const comparison = difference < 0 ? 'earlier' : 'later';

  const lines = [
    `The mean of the answers given to the prompt with the example **falls ${comparison}** than the mean of the `
      + `answers given to the prompt without it, by **${fixed(Math.abs(difference), 2)}** years. `
      + `The standard error of that difference is ${fixed(standardError, 2)}, so the difference amounts to `
      + `**${fixed(ratio, 3)}** standard errors. Two standard errors either way puts the true `
      + `difference between ${fixed(lower, 2)} and ${fixed(upper, 2)} years.`,
    '',
    `**${verdictSentence(ratio, direction)}**`
  ];

  const note = smallSampleNote(Math.min(...experiment.stats.map((stats) => stats.n)));
  if (note !== null) lines.push('', note);

  return lines.join('\n');
};

/**
 * Builds the table of the shift of every model compared with itself.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The table as Markdown.
 * @throws {never} Throws nothing.
 */
const modelShiftTable = (experiment) => table(
  [
    'large language model',
    'mean with the full-year example',
    'mean without the full-year example',
    'difference in years',
    'answers with the full-year example',
    'answers without the full-year example'
  ],
  experiment.shifts.map((entry) => [
    entry.model,
    fixed(entry.meanWith, 1),
    fixed(entry.meanWithout, 1),
    negative(fixed(entry.difference, 1), entry.difference < 0),
    String(entry.countWith),
    String(entry.countWithout)
  ])
);

/**
 * Builds the chart of the shift of every model, each bar starting at zero so that the side it falls on
 * is the direction of the shift.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The chart as an SVG element.
 * @throws {Error} When no model answered both variants.
 */
const modelShiftChart = (experiment) => divergingBarsChartSvg({
  entries: experiment.shifts.map((entry) => ({ label: entry.model, value: entry.difference })),
  colours: SERIES_COLOURS,
  xLabel: `years, negative towards the value given in the example (${EXAMPLE_VALUE})`,
  description: 'The shift of the mean answer of every model, measured against that same model without the example.'
});

/**
 * Builds the conclusion of the comparison of every model with itself.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The conclusion as Markdown.
 * @throws {never} Throws nothing.
 */
const modelShiftConclusion = (experiment) => {
  const summary = experiment.shiftSummary;
  const direction = summary.mean < 0
    ? `models move towards the value given in the example (${EXAMPLE_VALUE}) when it is present`
    : 'models move away from the value given in the example when it is present';

  return [
    `Averaged over the ${summary.n} models that answered both versions at least `
      + `${MIN_ANSWERS_FOR_BEHAVIOUR} times, the shift is `
      + `**${fixed(summary.mean, 2)}** years, with a standard error of ${fixed(summary.standardError, 2)} — `
      + `**${fixed(summary.ratio, 3)}** standard errors. `
      + `**${summary.negative}** of the ${summary.n} models answer closer to ${EXAMPLE_VALUE} when `
      + `${EXAMPLE_VALUE} is the example given in the prompt.`,
    '',
    `**${verdictSentence(summary.ratio, direction)}**`
  ].join('\n');
};

/**
 * Builds the table of the last digit of the answers, side by side for the two prompt variants.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The table as Markdown.
 * @throws {never} Throws nothing.
 */
const lastDigitTable = (experiment) => {
  const [withExample, withoutExample] = experiment.stats;

  return table(
    [
      'last digit of the answer',
      'answers with the full-year example',
      'share of those answers, %',
      'answers without the full-year example',
      'share of those answers, %',
      'difference in percentage points'
    ],
    experiment.lastDigits.map((entry) => {
      const shareWith = (100 * entry.withExample) / withExample.n;
      const shareWithout = (100 * entry.withoutExample) / withoutExample.n;
      const difference = shareWith - shareWithout;
      return [
        String(entry.digit),
        String(entry.withExample),
        fixed(shareWith, 1),
        String(entry.withoutExample),
        fixed(shareWithout, 1),
        negative(fixed(difference, 1), difference < 0)
      ];
    })
  );
};

/**
 * Builds the chart of the last digit of the answers. The bars carry shares rather than counts, because
 * the two variants collected a different number of answers and their counts are not comparable.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The chart as an SVG element.
 * @throws {Error} When a variant is missing a digit.
 */
const lastDigitChart = (experiment) => barsChartSvg({
  xValues: experiment.lastDigits.map((entry) => entry.digit),
  series: experiment.stats.map((stats, index) => ({
    label: VARIANT_NAMES[index],
    colour: SERIES_COLOURS[index],
    values: experiment.lastDigits.map((entry) => (100 * (index === 0 ? entry.withExample : entry.withoutExample)) / stats.n)
  })),
  xLabelStep: 1,
  xLabel: 'last digit of the year given as the answer',
  yLabel: 'share of the answers, %',
  description: 'The share of the answers of each prompt variant ending in every digit.'
});

/**
 * Explains what is round about a year ending in the given digit: the year itself, or the age it leaves
 * when counted back from the year of death stated in the prompt.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {number} digit The last digit of the year.
 * @param {number} average The mean of the collected answers, used to pick an example near them.
 * @return {string|null} The explanation, or null when a year ending in that digit is round in neither way.
 * @throws {never} Throws nothing.
 */
const roundnessOf = (digit, average) => {
  if (digit === 0) return `a year ending in ${digit} is a round year`;

  // The year ending in this digit that lies closest to the answers actually given, so that the example
  // is one of them rather than an invented case.
  const year = Math.round((average - digit) / 10) * 10 + digit;
  const age = DEATH_YEAR - year;
  if (age % 10 === 0) return `a year ending in ${digit} leaves an age rounded to ten years — ${year} is a life of exactly ${age} years`;
  if (age % 5 === 0) return `a year ending in ${digit} leaves an age rounded to five years — ${year} is a life of exactly ${age} years`;
  return null;
};

/**
 * Names the two commonest endings of the answers and states what makes each of them round. The digits
 * are read from the collected answers, so the sentence cannot outlive the data it describes.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The paragraph as Markdown.
 * @throws {never} Throws nothing.
 */
const lastDigitPeaks = (experiment) => {
  const average = mean(experiment.yearsByVariant.flat());
  const peaks = [...experiment.lastDigits]
    .sort((first, second) => (second.withExample + second.withoutExample) - (first.withExample + first.withoutExample))
    .slice(0, PEAK_DIGITS)
    .map((entry) => entry.digit);

  const sentence = `The answers pile up on two endings, **${peaks.join('** and **')}**`;
  const explanations = peaks.map((digit) => roundnessOf(digit, average)).filter((explanation) => explanation !== null);

  if (explanations.length < peaks.length) return `${sentence}.`;

  return `${sentence}, and each is round in its own way: ${explanations.join(', while ')}. Both peaks `
    + 'are the same reluctance to name an arbitrary number; only the arithmetic differs.';
};

/**
 * Builds the conclusion on the last digit of the answers, stated from the collected answers.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The conclusion as Markdown.
 * @throws {never} Throws nothing.
 */
const lastDigitConclusion = (experiment) => {
  const [zero, roundest] = experiment.roundEndings;
  const direction = zero.difference > 0
    ? 'answers end in a round zero more often when the prompt carries the example'
    : 'answers end in a round zero less often when the prompt carries the example';
  const copies = experiment.exampleValueAnswers.reduce((sum, count) => sum + count, 0);
  const answers = experiment.stats[0].n + experiment.stats[1].n;

  return [
    `Years ${zero.label} make up ${fixed(zero.shareWith, 1)} % of the answers to the prompt with the `
      + `example and ${fixed(zero.shareWithout, 1)} % of the answers to the prompt without it — a difference `
      + `of **${fixed(Math.abs(zero.difference), 1)}** percentage points. The standard error of that `
      + `difference is ${fixed(zero.standardError, 2)} percentage points, so the difference amounts to `
      + `**${fixed(zero.ratio, 3)}** standard errors. Widening the group to years ${roundest.label} gives `
      + `${fixed(roundest.shareWith, 1)} % against ${fixed(roundest.shareWithout, 1)} %, a difference of `
      + `${fixed(roundest.ratio, 3)} standard errors.`,
    '',
    `**${verdictSentence(zero.ratio, direction)}**`,
    '',
    copies === 0
      ? `The value shown in the example does not come back as an answer: ${EXAMPLE_VALUE} appears nowhere `
        + `among the ${answers} answers collected.`
      : `The value shown in the example comes back as an answer **${copies}** times among the `
        + `${answers} answers collected.`
  ].join('\n');
};

/**
 * Builds the table of how far the answers of every model fall from the year confirmed by documents.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The table as Markdown.
 * @throws {never} Throws nothing.
 */
const accuracyTable = (experiment) => table(
  [
    'large language model',
    'answers',
    'systematic error in years',
    'standard deviation in years',
    'mean absolute error in years',
    `answers landing on ${DOCUMENTED_YEAR}`,
    `answers within ${CLOSE_YEARS} years, %`
  ],
  experiment.accuracy.map((entry) => [
    entry.model,
    String(entry.n),
    negative(fixed(entry.systematicError, 1), entry.systematicError < 0),
    entry.sd === null ? '—' : fixed(entry.sd, 1),
    fixed(entry.absoluteError, 1),
    String(entry.hits),
    fixed((100 * entry.near) / entry.n, 1)
  ])
);

/**
 * Builds the chart of the accuracy of every model: where the answers of a model sit on average, and how
 * widely they scatter around that position. The two are drawn together because a model close to the
 * documented year on average may be nowhere near it in any single answer.
 *
 * A model that gave a single answer has no standard deviation and therefore no row of its own.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The chart as an SVG element.
 * @throws {Error} When a systematic error lies outside its own range.
 */
const accuracyChart = (experiment) => intervalsChartSvg({
  rows: experiment.accuracy
    .filter((entry) => entry.sd !== null)
    .map((entry) => {
      const standardError = entry.sd / Math.sqrt(entry.n);
      return {
        label: entry.model,
        colour: SERIES_COLOURS[Math.abs(entry.systematicError) <= CLOSE_YEARS ? 0 : 1],
        value: entry.systematicError,
        lower: entry.systematicError - INTERVAL_STANDARD_ERRORS * standardError,
        upper: entry.systematicError + INTERVAL_STANDARD_ERRORS * standardError,
        spreadLower: entry.systematicError - entry.sd,
        spreadUpper: entry.systematicError + entry.sd
      };
    }),
  spreadLabel: 'the range a single answer typically falls in',
  xLabel: `years from ${DOCUMENTED_YEAR}, negative for an answer earlier than that year`,
  description: 'The systematic error of every model, with the range its true value is expected to fall in and the range a single answer typically falls in.'
});

/**
 * States how much the accuracy of a model depends on which version of the prompt it answered, for the
 * models that answered both. The article carries this as one sentence rather than as two more tables.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The sentence as Markdown.
 * @throws {never} Throws nothing.
 */
const accuracyByPrompt = (experiment) => {
  const [withExample, withoutExample] = experiment.accuracyByVariant;
  const differences = withExample
    .map((entry) => {
      const other = withoutExample.find((candidate) => candidate.model === entry.model);
      if (other === undefined) return null;
      return { model: entry.model, difference: entry.absoluteError - other.absoluteError, n: entry.n + other.n };
    })
    .filter((entry) => entry !== null);

  const widest = differences.reduce((worst, entry) => (Math.abs(entry.difference) > Math.abs(worst.difference) ? entry : worst));

  return `Measured separately for the two versions of the prompt, the mean absolute error of a model `
    + `moves by ${fixed(mean(differences.map((entry) => Math.abs(entry.difference))), 1)} years on average `
    + `across the ${differences.length} models that answered both versions, and at most by `
    + `${fixed(Math.abs(widest.difference), 1)} years, for ${widest.model}, a model that answered `
    + `${widest.n} times in total. The ranking above therefore describes a model rather than a version `
    + `of the prompt.`;
};

/**
 * Builds the conclusion on the accuracy of the models, stated from the collected answers.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The conclusion as Markdown.
 * @throws {never} Throws nothing.
 */
const accuracyConclusion = (experiment) => {
  const ranked = experiment.accuracy;
  const [closest] = ranked;
  const furthest = ranked[ranked.length - 1];
  const early = ranked.filter((entry) => entry.systematicError < 0).length;
  const widest = ranked.reduce((worst, entry) => ((entry.sd ?? 0) > (worst.sd ?? 0) ? entry : worst));

  return [
    `The closest model is **${closest.model}**, whose answers miss ${DOCUMENTED_YEAR} by `
      + `${fixed(closest.absoluteError, 1)} years on average and land within ${CLOSE_YEARS} years of it in `
      + `${fixed((100 * closest.near) / closest.n, 1)} % of its answers. The furthest is `
      + `**${furthest.model}**, at ${fixed(furthest.absoluteError, 1)} years. `
      + (early === ranked.length
        ? `Every one of the ${ranked.length} models sits earlier than ${DOCUMENTED_YEAR} on average.`
        : `**${early}** of the ${ranked.length} models sit earlier than ${DOCUMENTED_YEAR} on average.`),
    '',
    `Being close and being steady are not the same property: ${widest.model} scatters most widely, with a `
      + `standard deviation of ${fixed(widest.sd, 1)} years around a systematic error of `
      + `${fixed(widest.systematicError, 1)} years.`
  ].join('\n');
};

/**
 * Names the behaviour of a model in words, from whether it insists on one year and whether that year
 * lies close to the year confirmed by documents.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {{insists: boolean, close: boolean}} entry Summary of one model.
 * @return {string} The name of the behaviour.
 * @throws {never} Throws nothing.
 */
const behaviourName = (entry) => {
  if (entry.insists) return entry.close ? 'insists, close' : 'insists, far';
  return entry.close ? 'scatters, most often close' : 'scatters, most often far';
};

/**
 * Builds the table of which models insist on one year and how far that year lies from the documented one.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The table as Markdown.
 * @throws {never} Throws nothing.
 */
const insistenceTable = (experiment) => table(
  [
    'large language model',
    'answers',
    'most frequent year',
    'share of the answers taken by that year, %',
    `distance of that year from ${DOCUMENTED_YEAR}`,
    'behaviour'
  ],
  experiment.behaviour.map((entry) => [
    entry.model,
    String(entry.n),
    String(entry.mostFrequent),
    fixed(entry.share, 1),
    negative(String(entry.distance), entry.distance < 0),
    behaviourName(entry)
  ])
);

/**
 * Builds the chart of insistence against accuracy: how large a share of the answers of a model its most
 * frequent year takes, and how far that year lies from the documented one. The dashed lines cut the
 * drawing into the four behaviours, so that a behaviour no model shows leaves a corner empty.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The chart as an SVG element.
 * @throws {Error} When no model gave enough answers to be classified.
 */
const insistenceChart = (experiment) => scatterChartSvg({
  points: experiment.behaviour.map((entry) => ({
    // Every model of the pool carries the same ":free" suffix, so the drawing drops it and keeps the
    // room for the part of the name that tells one model from another. The table above names them fully.
    label: entry.model.replace(/:free$/, ''),
    colour: SERIES_COLOURS[entry.close ? 0 : 1],
    x: entry.share,
    y: entry.distance
  })),
  guides: [
    { axis: 'x', value: INSISTENT_SHARE_PERCENT, label: `insists from ${INSISTENT_SHARE_PERCENT} % rightwards` },
    { axis: 'y', value: -CLOSE_YEARS, label: `${CLOSE_YEARS} years below ${DOCUMENTED_YEAR}` },
    { axis: 'y', value: CLOSE_YEARS, label: `${CLOSE_YEARS} years above ${DOCUMENTED_YEAR}` }
  ],
  xLabel: 'share of the answers of a model taken by its most frequent year, %',
  yLabel: `years from ${DOCUMENTED_YEAR}`,
  description: 'How large a share of the answers of every model its most frequent year takes, against the distance of that year from the documented year.'
});

/**
 * Builds the conclusion on insistence, stated from the collected answers.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The conclusion as Markdown.
 * @throws {never} Throws nothing.
 */
const insistenceConclusion = (experiment) => {
  const classified = experiment.behaviour;
  const insistent = classified.filter((entry) => entry.insists);
  const insistentAndClose = insistent.filter((entry) => entry.close);
  const firmest = classified.reduce((strongest, entry) => (entry.share > strongest.share ? entry : strongest));

  const insistentSentence = insistent.length === 0
    ? `No model repeats one year in at least ${INSISTENT_SHARE_PERCENT} % of its answers.`
    : `**${insistent.length}** of the ${classified.length} models repeat one year in at least `
      + `${INSISTENT_SHARE_PERCENT} % of their answers, and `
      + (insistentAndClose.length === 0
        ? `**none** of those repeats a year within ${CLOSE_YEARS} years of ${DOCUMENTED_YEAR}.`
        : `**${insistentAndClose.length}** of those repeat a year within ${CLOSE_YEARS} years of ${DOCUMENTED_YEAR}.`);

  return [
    `${insistentSentence} The firmest is **${firmest.model}**, which answers ${firmest.mostFrequent} in `
      + `${fixed(firmest.share, 1)} % of its ${firmest.n} answers, `
      + `${Math.abs(firmest.distance)} years from ${DOCUMENTED_YEAR}.`,
    '',
    `A model counts as insisting when its most frequent year covers at least ${INSISTENT_SHARE_PERCENT} % `
      + `of its answers, and as close when that year lies within ${CLOSE_YEARS} years of `
      + `${DOCUMENTED_YEAR}. Models with fewer than ${MIN_ANSWERS_FOR_BEHAVIOUR} answers to either version `
      + 'of the prompt are left out, because a handful of answers always looks like insistence.'
  ].join('\n');
};

/**
 * Builds the table of where every model sits on its own, with no reference value involved.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The table as Markdown.
 * @throws {never} Throws nothing.
 */
const disagreementTable = (experiment) => table(
  ['large language model', 'answers', 'mean answer', 'standard deviation in years', 'standard error of the mean'],
  experiment.modelMeans.map((entry) => [
    entry.model,
    String(entry.n),
    fixed(entry.mean, 1),
    fixed(entry.sd, 1),
    fixed(entry.standardError, 2)
  ])
);

/**
 * Builds the chart of the mean answer of every model, each with the range its true value is expected to
 * fall in. Two models whose ranges do not meet gave answers that cannot be treated as the same.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The chart as an SVG element.
 * @throws {Error} When a mean lies outside its own range.
 */
const disagreementChart = (experiment) => intervalsChartSvg({
  rows: experiment.modelMeans.map((entry) => ({
    label: entry.model,
    colour: SERIES_COLOURS[0],
    value: entry.mean,
    lower: entry.mean - INTERVAL_STANDARD_ERRORS * entry.standardError,
    upper: entry.mean + INTERVAL_STANDARD_ERRORS * entry.standardError,
    spreadLower: entry.mean - entry.sd,
    spreadUpper: entry.mean + entry.sd
  })),
  spreadLabel: 'the range a single answer typically falls in',
  xLabel: 'year, with the mean answer of a model and the range its true value is expected to fall in',
  description: 'The mean answer of every model, with the range its true value is expected to fall in and the range a single answer typically falls in.'
});

/**
 * Builds the conclusion on how far the models stand from one another, stated from the collected answers.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The conclusion as Markdown.
 * @throws {never} Throws nothing.
 */
const disagreementConclusion = (experiment) => {
  const summary = experiment.disagreement;
  // The shift measured model by model, which the mixture of models reaching the two variants cannot
  // produce, so the two distances are compared on the same set of models.
  const effect = Math.abs(experiment.shiftSummary.mean);

  return [
    `The earliest model, ${summary.lowest.model}, answers ${fixed(summary.lowest.mean, 1)} on average, and `
      + `the latest, ${summary.highest.model}, answers ${fixed(summary.highest.mean, 1)} — **`
      + `${fixed(summary.range, 1)}** years apart. The example in the prompt moves the answers of a model by `
      + `${fixed(effect, 2)} years on average, so the models stand **${fixed(summary.range / effect, 0)}** times `
      + `further from one another than the wording of the prompt moves any of them.`,
    '',
    `**${summary.distinguishable}** of the ${summary.pairs} pairs of models stand more than `
      + `${DISTINGUISHABLE_STANDARD_ERRORS} standard errors apart, so the distance is not an artefact of `
      + `too few answers. The ${summary.n} means scatter by ${fixed(summary.sdOfMeans, 1)} years, a single `
      + `model by ${fixed(summary.meanWithinSd, 1)} years around its own mean: asking one model twenty `
      + 'times and asking twenty models once measure two different things.'
  ].join('\n');
};

/**
 * States the middle answer of each prompt variant. The two are printed to three decimal places,
 * because a single place would leave a reader unable to tell an exact agreement from a rounded one.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-15.
 * @param {object} experiment The loaded experiment.
 * @return {string} The sentence as Markdown.
 * @throws {never} Throws nothing.
 */
const middleMedians = (experiment) => {
  const [withExample, withoutExample] = experiment.stats;
  const agree = withExample.median === withoutExample.median;

  return `The middle answer of the ${withExample.n} answers to the prompt with the example is `
    + `**${fixed(withExample.median, 3)}**. The middle answer of the ${withoutExample.n} answers to the `
    + `prompt without it is **${fixed(withoutExample.median, 3)}**. `
    + (agree
      ? 'The two are the same year, and the decimal places are printed to show that the agreement is exact.'
      : 'The two are different years.');
};

/**
 * Builds the table of what each prompt variant puts below the middle year, on it and above it.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-15.
 * @param {object} experiment The loaded experiment.
 * @return {string} The table as Markdown.
 * @throws {never} Throws nothing.
 */
const middleTable = (experiment) => table(
  [
    'answers',
    `${VARIANT_NAMES[0]}, %`,
    `${VARIANT_NAMES[1]}, %`,
    'difference in percentage points',
    'difference in standard errors'
  ],
  experiment.aroundMiddle.map((part) => [
    part.label,
    fixed(part.shareWith, 1),
    fixed(part.shareWithout, 1),
    negative(fixed(part.difference, 1), part.difference < 0),
    fixed(part.ratio, 3)
  ])
);

/**
 * Builds the chart of how many answers each year received, one bar per prompt variant. Both variants
 * hold the same number of answers, so the counts stand side by side without being turned into shares.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-15.
 * @param {object} experiment The loaded experiment.
 * @return {string} The chart as an SVG element.
 * @throws {Error} When the counted years do not form an unbroken run.
 */
const yearCountsChart = (experiment) => barsChartSvg({
  xValues: experiment.counts.map((entry) => entry.year),
  series: [
    { label: VARIANT_NAMES[0], colour: SERIES_COLOURS[0], values: experiment.counts.map((entry) => entry.withExample) },
    { label: VARIANT_NAMES[1], colour: SERIES_COLOURS[1], values: experiment.counts.map((entry) => entry.withoutExample) }
  ],
  xLabelStep: 10,
  xLabel: 'year answered',
  yLabel: 'answers',
  description: 'How many answers each year received, counted separately for the two prompt variants.'
});

/**
 * Builds the chart of every answer standing in one row, ordered from the earliest year to the latest,
 * one row per prompt variant. The middle year is the flat step the middle of the row falls into, so the
 * chart shows why both variants share a middle answer and how much wider the example makes that step.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-15.
 * @param {object} experiment The loaded experiment.
 * @return {string} The chart as an SVG element.
 * @throws {Error} When a prompt variant received no answers.
 */
const middleRowChart = (experiment) => sortedValuesChartSvg({
  series: experiment.yearsByVariant.map((years, index) => ({
    label: VARIANT_NAMES[index],
    colour: SERIES_COLOURS[index],
    values: [...years].sort((first, second) => first - second)
  })),
  guides: [
    { axis: 'x', value: 50, label: 'middle of the row' },
    { axis: 'y', value: experiment.middleYear, label: String(experiment.middleYear) }
  ],
  xLabel: 'place in the row, from the earliest answer to the latest',
  yLabel: 'year answered',
  description: `Every answer of each prompt variant placed in order, showing that ${experiment.middleYear} covers the middle of both rows.`
});

/**
 * Builds the chart of the change in how often every model answers the middle year itself, each bar
 * starting at zero so that the side it falls on says whether the example drew the model onto that year.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-15.
 * @param {object} experiment The loaded experiment.
 * @return {string} The chart as an SVG element.
 * @throws {Error} When no model answered both variants often enough.
 */
const middleChart = (experiment) => divergingBarsChartSvg({
  entries: experiment.middleShift.map((entry) => ({ label: entry.model, value: entry.difference })),
  colours: [SERIES_COLOURS[1], SERIES_COLOURS[0]],
  xLabel: `percentage points, positive when the model answers ${experiment.middleYear} more often with the example`,
  description: `The change in how often every model answers ${experiment.middleYear} exactly, measured against that same model without the example.`
});

/**
 * Builds the conclusion on the middle year, stated from the collected answers.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-15.
 * @param {object} experiment The loaded experiment.
 * @return {string} The conclusion as Markdown.
 * @throws {never} Throws nothing.
 */
const middleConclusion = (experiment) => {
  const summary = experiment.middleSummary;
  const higher = summary.n - summary.negative;
  const direction = summary.mean > 0
    ? `models answer ${experiment.middleYear} itself more often when the prompt carries the example`
    : `models answer ${experiment.middleYear} itself less often when the prompt carries the example`;

  return [
    `Across the ${summary.n} models that answered each version at least ${MIN_ANSWERS_FOR_BEHAVIOUR} `
      + `times, the share of the answers that are ${experiment.middleYear} exactly changes by `
      + `**${fixed(summary.mean, 1)}** percentage points when the example is shown, with a standard error `
      + `of ${fixed(summary.standardError, 2)} — **${fixed(summary.ratio, 3)}** standard errors. `
      + `**${higher}** of the ${summary.n} models answer ${experiment.middleYear} more often with the example.`,
    '',
    `**${verdictSentence(summary.ratio, direction)}**`
  ].join('\n');
};

/**
 * Builds the table of how repeatable the answers of every model are.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The table as Markdown.
 * @throws {never} Throws nothing.
 */
const repeatabilityTable = (experiment) => table(
  [
    'large language model',
    'answers',
    'distinct years given',
    'most frequent year',
    'share of the answers taken by that year, %',
    'standard deviation in years'
  ],
  experiment.spread.map((entry) => [
    entry.model,
    String(entry.n),
    String(entry.distinct),
    String(entry.mostFrequent),
    fixed(entry.share, 1),
    entry.sd === null ? '—' : fixed(entry.sd, 1)
  ])
);

/**
 * Builds the chart of the two ways an answer can be repeatable: how often the commonest year comes
 * back, and how widely the answers scatter. A model may be steady in one sense and not in the other.
 *
 * A model that gave a single answer has no standard deviation and therefore no point of its own.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The chart as an SVG element.
 * @throws {Error} When no model gave two answers.
 */
const repeatabilityChart = (experiment) => scatterChartSvg({
  points: experiment.spread
    .filter((entry) => entry.sd !== null)
    .map((entry) => ({
      // The pool gives every model the same ":free" suffix, which the drawing has no room for.
      label: entry.model.replace(/:free$/, ''),
      colour: SERIES_COLOURS[0],
      x: entry.share,
      y: entry.sd
    })),
  guides: [],
  xLabel: 'share of the answers of a model taken by its most frequent year, %',
  yLabel: 'standard deviation of the answers, in years',
  description: 'How often the commonest year of every model comes back, against how widely the answers of that model scatter.'
});

/**
 * Builds the conclusion on the repeatability of the answers, stated from the collected answers.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The conclusion as Markdown.
 * @throws {never} Throws nothing.
 */
const repeatabilityConclusion = (experiment) => {
  const measured = experiment.spread.filter((entry) => entry.n >= MIN_ANSWERS_FOR_BEHAVIOUR);
  const [steadiest] = measured;
  const loosest = measured[measured.length - 1];

  return [
    `Among the models that answered each version at least ${MIN_ANSWERS_FOR_BEHAVIOUR} times, the most concentrated `
      + `is **${steadiest.model}**: ${fixed(steadiest.share, 1)} % of its ${steadiest.n} answers are the `
      + `single year ${steadiest.mostFrequent}, and it used ${steadiest.distinct} distinct years in all. `
      + `The most spread is **${loosest.model}**, whose commonest year covers `
      + `${fixed(loosest.share, 1)} % of its ${loosest.n} answers, laid over ${loosest.distinct} `
      + 'distinct years.',
    '',
    'Neither position is a fault. A wide spread is an honest report of not knowing, while a narrow one '
      + 'looks like certainty that nothing in the answers confirms.',
    '',
    `The question never changed between one request and the next, so the spread belongs to the model `
      + `rather than to the question. Repeating a request therefore buys a great deal from one model and `
      + `almost nothing from another: ${loosest.model} gives a different year often enough for twenty `
      + `requests to sketch a range, while ${steadiest.model} mostly gives ${steadiest.mostFrequent} again.`
  ].join('\n');
};

/**
 * Builds the table of how much of the output of every model is one single year, side by side for the
 * two prompt variants.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The table as Markdown.
 * @throws {never} Throws nothing.
 */
const concentrationTable = (experiment) => table(
  [
    'large language model',
    'share taken by the most frequent year, with the example, %',
    'share taken by the most frequent year, without it, %',
    'difference in percentage points',
    'most frequent year with the example',
    'most frequent year without it',
    'answers, with and without'
  ],
  experiment.concentration.map((entry) => [
    entry.model,
    fixed(entry.shareWith, 1),
    fixed(entry.shareWithout, 1),
    negative(fixed(entry.difference, 1), entry.difference < 0),
    String(entry.mostFrequentWith),
    String(entry.mostFrequentWithout),
    `${entry.countWith} / ${entry.countWithout}`
  ])
);

/**
 * Builds the chart of the change in concentration of every model, each bar starting at zero so that the
 * side it falls on says whether the example made the model repeat itself more or less.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The chart as an SVG element.
 * @throws {Error} When no model answered both variants often enough.
 */
const concentrationChart = (experiment) => divergingBarsChartSvg({
  entries: experiment.concentration.map((entry) => ({ label: entry.model, value: entry.difference })),
  colours: [SERIES_COLOURS[1], SERIES_COLOURS[0]],
  xLabel: 'percentage points, positive when the model repeats one year more often with the example',
  description: 'The change in the share of the answers taken by the most frequent year of every model, measured against that same model without the example.'
});

/**
 * Builds the conclusion on whether the example makes a model repeat itself more, stated from the
 * collected answers.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {string} The conclusion as Markdown.
 * @throws {never} Throws nothing.
 */
const concentrationConclusion = (experiment) => {
  const summary = experiment.concentrationSummary;
  const higher = summary.n - summary.negative;
  const sameYear = experiment.concentration.filter((entry) => entry.mostFrequentWith === entry.mostFrequentWithout).length;
  const direction = summary.mean > 0
    ? 'models repeat one year more often when the prompt carries the example'
    : 'models repeat one year less often when the prompt carries the example';

  return [
    `Across the ${summary.n} models comparable in both versions, the share of the answers taken by the `
      + `most frequent year changes by **${fixed(summary.mean, 1)}** percentage points when the example is `
      + `shown, with a standard error of ${fixed(summary.standardError, 2)} — **${fixed(summary.ratio, 3)}** `
      + `standard errors. **${higher}** of the ${summary.n} models concentrate more with the example.`,
    '',
    `**${verdictSentence(summary.ratio, direction)}**`,
    '',
    `The year being repeated is mostly the same year: **${sameYear}** of the ${summary.n} models give the `
      + 'same most frequent year in both versions.'
  ].join('\n');
};

/**
 * Reads the log of the requests and states, for every model, how often its answer is a year and nothing
 * else. An answer holding a year inside a longer text is not counted, because the year still has to be
 * found before the answer can be used.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @return {Array<{model: string, answers: number, bareYear: number, bareRate: number}>} One entry per model, ordered from the highest share of answers that are a year.
 * @throws {Error} When the log file does not exist.
 */
const usabilityByModel = () => countFilteredByModel(readLog().filter((row) => row.model !== REQUEST_ERROR_MODEL))
  .map((counts) => ({
    model: counts.model,
    answers: counts.responses,
    bareYear: counts.kept,
    bareRate: (100 * counts.kept) / counts.responses
  }))
  .sort((first, second) => second.bareRate - first.bareRate || second.answers - first.answers);

/**
 * Builds the table of how often every model answers with a year.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {Array<object>} models The summary of every model.
 * @return {string} The table as Markdown.
 * @throws {never} Throws nothing.
 */
const usabilityTable = (models) => table(
  ['large language model', 'answers', 'answers that are a year', 'share of the answers, %'],
  models.map((entry) => [
    entry.model,
    String(entry.answers),
    String(entry.bareYear),
    fixed(entry.bareRate, 1)
  ])
);

/**
 * Builds the chart of what share of the answers of every model is a year and nothing else. The bar is
 * drawn against the same full width for every model, so models of very different workloads stand on one
 * scale; the counts the share rests on are written beside it.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {Array<object>} models The summary of every model.
 * @return {string} The chart as an SVG element.
 * @throws {Error} When no model answered.
 */
const usabilityChart = (models) => partOfWholeChartSvg({
  entries: models.map((entry) => ({
    label: entry.model,
    part: entry.bareRate,
    whole: 100,
    text: `${fixed(entry.bareRate, 1)} %`,
    note: `— ${entry.bareYear} of ${entry.answers}`
  })),
  colours: SERIES_COLOURS,
  partLabel: 'answers that are a year',
  restLabel: 'answers that are not a year',
  xLabel: 'share of the answers of the model, %',
  description: 'What share of the answers of every model is a year and nothing else.'
});

/**
 * Builds the conclusion on how usable the answers are, stated from the log of the requests.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {Array<object>} models The summary of every model.
 * @return {string} The conclusion as Markdown.
 * @throws {never} Throws nothing.
 */
const usabilityConclusion = (models) => {
  const readable = models.filter((entry) => entry.bareRate === 100);
  const answers = models.reduce((sum, entry) => sum + entry.answers, 0);
  const bare = models.reduce((sum, entry) => sum + entry.bareYear, 0);
  const halfway = models.filter((entry) => entry.bareRate > 0 && entry.bareRate < 100);

  return `**${fixed((100 * bare) / answers, 1)} %** of the ${answers} answers read are a year and `
    + 'nothing else. '
    + `**${readable.length}** of the ${models.length} models answer with a year every single time, `
    + `${halfway.length} do so part of the time, and `
    + `**${models.length - readable.length - halfway.length}** never do.`;
};

// The names the log gives the two prompt variants.
const LOG_VARIANTS = ['withExample', 'withoutExample'];

/**
 * Reads the log of the requests and counts, for each prompt variant, how many requests failed, how many
 * responses came back and how many of those responses carried an answer of exactly four digits.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @return {{variants: Array<{requests: number, errors: number, responses: number, accepted: number}>, models: Array<{model: string, rateWith: number, rateWithout: number, difference: number, responsesWith: number, responsesWithout: number}>}} The counts of both variants and the same rate model by model.
 * @throws {Error} When the log file does not exist.
 */
const formatCompliance = () => {
  const rows = readLog();

  const variants = LOG_VARIANTS.map((variant) => {
    const variantRows = rows.filter((row) => row.variant === variant);
    const errors = variantRows.filter((row) => row.model === REQUEST_ERROR_MODEL).length;
    return {
      requests: variantRows.length,
      errors,
      responses: variantRows.length - errors,
      accepted: variantRows.filter((row) => row.inRequestedFormat).length
    };
  });

  const [withExample, withoutExample] = LOG_VARIANTS.map((variant) => new Map(
    countFilteredByModel(rows.filter((row) => row.variant === variant && row.model !== REQUEST_ERROR_MODEL))
      .map((entry) => [entry.model, entry])
  ));

  const models = [...withExample.keys()]
    .filter((model) => withoutExample.has(model))
    .map((model) => {
      const first = withExample.get(model);
      const second = withoutExample.get(model);
      const rateWith = (100 * first.kept) / first.responses;
      const rateWithout = (100 * second.kept) / second.responses;
      return {
        model,
        rateWith,
        rateWithout,
        difference: rateWith - rateWithout,
        responsesWith: first.responses,
        responsesWithout: second.responses
      };
    })
    .sort((first, second) => second.difference - first.difference);

  return { variants, models };
};

/**
 * Builds the table of how often each prompt variant produced an answer of the requested form.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {{variants: Array<object>}} compliance The counts of both variants.
 * @return {string} The table as Markdown.
 * @throws {never} Throws nothing.
 */
const formatTable = (compliance) => table(
  ['prompt', 'requests', 'requests that failed', 'responses', 'answers of exactly four digits', 'share of the responses, %'],
  compliance.variants.map((summary, index) => [
    PROMPT_NAMES[index],
    String(summary.requests),
    String(summary.errors),
    String(summary.responses),
    String(summary.accepted),
    fixed((100 * summary.accepted) / summary.responses, 1)
  ])
);

/**
 * Builds the chart of the same comparison made model by model, which the mixture of models reaching the
 * two variants cannot produce.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {{models: Array<object>}} compliance The rate of every model in both variants.
 * @return {string} The chart as an SVG element.
 * @throws {Error} When no model answered both variants.
 */
const formatChart = (compliance) => divergingBarsChartSvg({
  entries: compliance.models.map((entry) => ({ label: entry.model, value: entry.difference })),
  colours: [SERIES_COLOURS[1], SERIES_COLOURS[0]],
  xLabel: 'percentage points, positive when the model obeys the requested form more often with the example',
  description: 'The difference in the share of answers of the requested form, measured for every model between the two prompt variants.'
});

/**
 * Builds the conclusion on the form of the answers, stated from the log of the requests.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {{variants: Array<object>, models: Array<object>}} compliance The counts of both variants and of every model.
 * @return {string} The conclusion as Markdown.
 * @throws {never} Throws nothing.
 */
const formatConclusion = (compliance) => {
  const [withExample, withoutExample] = compliance.variants;
  const { difference, standardError, ratio } = compareProportions(
    withExample.accepted, withExample.responses, withoutExample.accepted, withoutExample.responses
  );
  const higher = compliance.models.filter((entry) => entry.difference > 0).length;
  const lower = compliance.models.filter((entry) => entry.difference < 0).length;
  const unchanged = compliance.models.length - higher - lower;
  const direction = difference > 0
    ? 'the requested form is obeyed more often when the prompt shows an example of it'
    : 'the requested form is obeyed less often when the prompt shows an example of it';

  return [
    `A response carries an answer of exactly four digits in ${fixed((100 * withExample.accepted) / withExample.responses, 1)} % `
      + `of the responses to the prompt with the example and in `
      + `${fixed((100 * withoutExample.accepted) / withoutExample.responses, 1)} % of the responses to the `
      + `prompt without it — a difference of **${fixed(Math.abs(difference), 1)}** percentage points. The `
      + `standard error of that difference is ${fixed(standardError, 2)} percentage points, so the `
      + `difference amounts to **${fixed(ratio, 3)}** standard errors.`,
    '',
    `**${verdictSentence(ratio, direction)}**`,
    '',
    `Measured model by model, **${higher}** of the ${compliance.models.length} models that answered both `
      + `versions obey the requested form more often with the example, ${unchanged} obey it exactly as `
      + `often either way, and ${lower === 0 ? '**none**' : `**${lower}**`} obey it less often with the example.`
  ].join('\n');
};

/**
 * Reads the log of the requests and states, for every model, how much room the format filter gave it in
 * the collection every result of the experiment rests on.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @return {{models: Array<object>, responses: number, kept: number, silent: number}} The models with their two shares, and the totals.
 * @throws {Error} When the log file does not exist.
 */
const filterEffect = () => {
  const counted = countFilteredByModel(readLog());
  const responses = counted.reduce((sum, entry) => sum + entry.responses, 0);
  const kept = counted.reduce((sum, entry) => sum + entry.kept, 0);

  const models = counted
    .map((entry) => ({
      ...entry,
      shareOfResponses: (100 * entry.responses) / responses,
      shareOfKept: (100 * entry.kept) / kept,
      difference: (100 * entry.kept) / kept - (100 * entry.responses) / responses
    }))
    .sort((first, second) => second.difference - first.difference);

  return { models, responses, kept, silent: models.filter((entry) => entry.kept === 0).length };
};

/**
 * Builds the table of what the format filter did to every model.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {{models: Array<object>}} effect The summary of the filter.
 * @return {string} The table as Markdown.
 * @throws {never} Throws nothing.
 */
const filterTable = (effect) => table(
  [
    'large language model',
    'responses',
    'answers kept',
    'answers kept, %',
    'share of all responses, %',
    'share of the answers kept, %',
    'difference in percentage points'
  ],
  effect.models.map((entry) => [
    entry.model,
    String(entry.responses),
    String(entry.kept),
    fixed((100 * entry.kept) / entry.responses, 1),
    fixed(entry.shareOfResponses, 1),
    fixed(entry.shareOfKept, 1),
    negative(fixed(entry.difference, 1), entry.difference < 0)
  ])
);

/**
 * Builds the chart of how much room the filter gave every model, each bar starting at zero so that the
 * side it falls on says whether the model gained or lost weight in the results.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {{models: Array<object>}} effect The summary of the filter.
 * @return {string} The chart as an SVG element.
 * @throws {Error} When no model answered.
 */
const filterChart = (effect) => divergingBarsChartSvg({
  entries: effect.models.map((entry) => ({ label: entry.model, value: entry.difference })),
  colours: SERIES_COLOURS,
  xLabel: 'percentage points gained or lost between the share of the responses and the share of the answers kept',
  description: 'How much weight the format filter gave every model, as the difference between its share of the answers kept and its share of all responses.'
});

/**
 * Builds the conclusion on the format filter, stated from the log of the requests.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {{models: Array<object>, responses: number, kept: number, silent: number}} effect The summary of the filter.
 * @return {string} The conclusion as Markdown.
 * @throws {never} Throws nothing.
 */
const filterConclusion = (effect) => {
  const [gained] = effect.models;
  const lost = effect.models[effect.models.length - 1];

  return [
    `Of the ${effect.responses} responses the models returned, **${effect.kept}** carry an answer of `
      + `exactly four digits and enter the results; the remaining `
      + `${effect.responses - effect.kept} are gone. ${effect.models.length} models answered, and `
      + `**${effect.silent}** of them have no answer that passes the filter, so nothing they said is `
      + 'counted anywhere.',
    '',
    `The models that remain do not keep their proportions. ${gained.model} holds `
      + `${fixed(gained.shareOfResponses, 1)} % of the responses and `
      + `**${fixed(gained.shareOfKept, 1)} %** of the answers kept, while ${lost.model} falls from `
      + `${fixed(lost.shareOfResponses, 1)} % to **${fixed(lost.shareOfKept, 1)} %**.`
  ].join('\n');
};

/**
 * Collects every computed block an article may refer to by a {{name}} placeholder.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {Object<string, string>} The blocks, keyed by placeholder name.
 * @throws {Error} When a chart cannot be drawn from the collected answers.
 */
export const articleBlocks = (experiment) => {
  const filter = filterEffect();
  const compliance = formatCompliance();
  const usability = usabilityByModel();

  return {
    variantsTable: variantsTable(experiment),
    variantsChart: variantsChart(experiment),
    variantsLifespans: variantsLifespans(experiment),
    answersRange: answersRange(experiment),
    distanceFromRecord: distanceFromRecord(experiment),
    variantsConclusion: variantsConclusion(experiment),
    modelShiftTable: modelShiftTable(experiment),
    modelShiftChart: modelShiftChart(experiment),
    modelShiftConclusion: modelShiftConclusion(experiment),
    lastDigitTable: lastDigitTable(experiment),
    lastDigitChart: lastDigitChart(experiment),
    lastDigitPeaks: lastDigitPeaks(experiment),
    lastDigitConclusion: lastDigitConclusion(experiment),
    middleMedians: middleMedians(experiment),
    middleTable: middleTable(experiment),
    yearCountsChart: yearCountsChart(experiment),
    middleRowChart: middleRowChart(experiment),
    middleChart: middleChart(experiment),
    middleConclusion: middleConclusion(experiment),
    repeatabilityTable: repeatabilityTable(experiment),
    repeatabilityChart: repeatabilityChart(experiment),
    repeatabilityConclusion: repeatabilityConclusion(experiment),
    concentrationTable: concentrationTable(experiment),
    concentrationChart: concentrationChart(experiment),
    concentrationConclusion: concentrationConclusion(experiment),
    accuracyTable: accuracyTable(experiment),
    accuracyChart: accuracyChart(experiment),
    accuracyByPrompt: accuracyByPrompt(experiment),
    accuracyConclusion: accuracyConclusion(experiment),
    insistenceTable: insistenceTable(experiment),
    insistenceChart: insistenceChart(experiment),
    insistenceConclusion: insistenceConclusion(experiment),
    disagreementTable: disagreementTable(experiment),
    disagreementChart: disagreementChart(experiment),
    disagreementConclusion: disagreementConclusion(experiment),
    formatTable: formatTable(compliance),
    formatChart: formatChart(compliance),
    formatConclusion: formatConclusion(compliance),
    usabilityTable: usabilityTable(usability),
    usabilityChart: usabilityChart(usability),
    usabilityConclusion: usabilityConclusion(usability),
    filterTable: filterTable(filter),
    filterChart: filterChart(filter),
    filterConclusion: filterConclusion(filter)
  };
};
