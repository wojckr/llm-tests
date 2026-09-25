/**
 * The registry of analyses. Every analysis has an identifier, a title and a way to print itself in the
 * terminal. The identifier is also the anchor of the article that discusses the analysis, so a reader of
 * the published document and a person working on it in the terminal refer to the same thing by the same
 * name.
 */

import { printGrid, printSection } from './printGrid.js';
import { percent, compareProportions } from './proportions.js';
import { countFilteredByModel, countYearAnswersByModel, readLog, REQUEST_ERROR_MODEL } from './requestsLog.js';
import {
  CLOSE_YEARS,
  DISTINGUISHABLE_STANDARD_ERRORS,
  DOCUMENTED_YEAR,
  EXAMPLE_VALUE,
  INSISTENT_SHARE_PERCENT,
  MIN_ANSWERS_FOR_BEHAVIOUR,
  VARIANTS
} from './statistics.js';
import { smallSampleNote, verdictSentence } from './verdict.js';

const LOG_VARIANTS = ['withExample', 'withoutExample'];

/**
 * Formats a value that is missing when a model gave too few answers to compute it.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {number|null} value The value, or null when it could not be computed.
 * @param {number} places How many decimal places to keep.
 * @return {string} The formatted value, or a dash.
 * @throws {never} Throws nothing.
 */
const orDash = (value, places) => (value === null ? '—' : value.toFixed(places));

/**
 * Prints the descriptive statistics of both variants and the comparison of their means.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {void} Returns nothing.
 * @throws {never} Throws nothing.
 */
const printVariants = (experiment) => {
  const { difference, standardError, ratio } = experiment.meansComparison;

  printGrid(
    ['prompt', 'answers', 'mean', 'median', 'standard\ndeviation', 'minimum', 'maximum'],
    experiment.stats.map((stats, index) => [
      VARIANTS[index].label,
      String(stats.n),
      stats.mean.toFixed(1),
      stats.median.toFixed(1),
      stats.sd.toFixed(1),
      String(stats.min),
      String(stats.max)
    ])
  );
  console.log('');
  console.log(`Difference of means, with example minus without: ${difference.toFixed(2)} years`);
  console.log(`Standard error: ${standardError.toFixed(2)}`);
  console.log(`Difference expressed in standard errors: ${ratio.toFixed(3)}`);
  console.log(`Interval containing the true difference, two standard errors either way: ${(difference - 2 * standardError).toFixed(2)} … ${(difference + 2 * standardError).toFixed(2)}`);

  const direction = difference < 0
    ? `the answers shift towards the value given in the example (${EXAMPLE_VALUE})`
    : 'the answers shift away from the value given in the example';
  console.log(verdictSentence(ratio, direction));

  const note = smallSampleNote(Math.min(...experiment.stats.map((stats) => stats.n)));
  if (note !== null) console.log(note);
};

/**
 * Prints the shift of every model compared with itself across the two prompt variants.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {void} Returns nothing.
 * @throws {never} Throws nothing.
 */
const printModelShift = (experiment) => {
  const summary = experiment.shiftSummary;

  printGrid(
    ['model', 'mean\nwith example', 'mean\nwithout example', 'difference', 'answers\nwith example', 'answers\nwithout example'],
    experiment.shifts.map((entry) => [
      entry.model,
      entry.meanWith.toFixed(1),
      entry.meanWithout.toFixed(1),
      entry.difference.toFixed(1),
      String(entry.countWith),
      String(entry.countWithout)
    ])
  );
  console.log('');
  console.log(`Mean shift across the ${summary.n} comparable models: ${summary.mean.toFixed(2)} years`);
  console.log(`Standard error: ${summary.standardError.toFixed(2)}`);
  console.log(`Difference expressed in standard errors: ${summary.ratio.toFixed(3)}`);
  console.log(`Models shifting towards ${EXAMPLE_VALUE}: ${summary.negative} of ${summary.n}`);

  const direction = summary.mean < 0
    ? `models shift towards ${EXAMPLE_VALUE} when the example is present`
    : `models shift away from ${EXAMPLE_VALUE} when the example is present`;
  console.log(verdictSentence(summary.ratio, direction));
  console.log('');
  console.log('Each model is compared only with itself, so a change in which models happen to pass the format');
  console.log('filter cannot produce this number. That is what makes it stronger than the difference of means.');
};

/**
 * Prints the distribution of the last digit of the answer and the comparison of the shares of round years.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {void} Returns nothing.
 * @throws {never} Throws nothing.
 */
const printLastDigit = (experiment) => {
  const [withExample, withoutExample] = experiment.stats;
  const [yearsWith, yearsWithout] = experiment.yearsByVariant;

  printGrid(
    ['last\ndigit', 'answers\nwith example', 'share %\nwith example', 'answers\nwithout example', 'share %\nwithout example', 'difference\nin points'],
    experiment.lastDigits.map((entry) => {
      const { difference } = compareProportions(entry.withExample, withExample.n, entry.withoutExample, withoutExample.n);
      return [
        String(entry.digit),
        String(entry.withExample),
        percent(entry.withExample, withExample.n),
        String(entry.withoutExample),
        percent(entry.withoutExample, withoutExample.n),
        difference.toFixed(1)
      ];
    })
  );

  for (const group of experiment.roundEndings) {
    console.log('');
    console.log(`Answers ${group.label}: with example ${group.shareWith.toFixed(1)} %, without example ${group.shareWithout.toFixed(1)} %`);
    console.log(`  Difference: ${group.difference.toFixed(1)} percentage points, standard error ${group.standardError.toFixed(2)}, ratio ${group.ratio.toFixed(3)}`);
    console.log(`  ${verdictSentence(group.ratio, `answers ${group.label} are ${group.difference > 0 ? 'more' : 'less'} frequent when the prompt carries the example`)}`);
  }

  console.log('');
  console.log('Caution: this shows only that the shape of the answers differs between the two prompts. The cause is');
  console.log('not established, because the experiment has no variant with an example ending in a digit other than zero.');
};

/**
 * Prints what each prompt variant puts below the year standing in the middle of the answers, on that
 * year and above it, and how often every model answers that year itself.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-15.
 * @param {object} experiment The loaded experiment.
 * @return {void} Returns nothing.
 * @throws {never} Throws nothing.
 */
const printMiddleAnswer = (experiment) => {
  const [withExample, withoutExample] = experiment.stats;
  const summary = experiment.middleSummary;

  console.log(`Middle answer with example:    ${withExample.median.toFixed(3)}`);
  console.log(`Middle answer without example: ${withoutExample.median.toFixed(3)}`);
  console.log(`Mean answer with example:      ${withExample.mean.toFixed(3)}`);
  console.log(`Mean answer without example:   ${withoutExample.mean.toFixed(3)}`);
  console.log('');

  printGrid(
    ['answers', 'share %\nwith example', 'share %\nwithout example', 'difference\nin points', 'standard\nerrors'],
    experiment.aroundMiddle.map((part) => [
      part.label,
      part.shareWith.toFixed(1),
      part.shareWithout.toFixed(1),
      part.difference.toFixed(1),
      part.ratio.toFixed(3)
    ])
  );

  console.log('');
  printGrid(
    ['model', `share %\n${experiment.middleYear} with example`, `share %\n${experiment.middleYear} without example`, 'difference\nin points', 'answers'],
    experiment.middleShift.map((entry) => [
      entry.model,
      entry.shareWith.toFixed(1),
      entry.shareWithout.toFixed(1),
      entry.difference.toFixed(1),
      `${entry.countWith} / ${entry.countWithout}`
    ])
  );

  console.log('');
  console.log(`Mean change across the ${summary.n} comparable models: ${summary.mean.toFixed(1)} percentage points`);
  console.log(`Standard error: ${summary.standardError.toFixed(2)}, difference expressed in standard errors: ${summary.ratio.toFixed(3)}`);
  console.log(`Models answering ${experiment.middleYear} more often with the example: ${summary.n - summary.negative} of ${summary.n}`);

  const direction = summary.mean > 0
    ? `models answer ${experiment.middleYear} itself more often when the example is present`
    : `models answer ${experiment.middleYear} itself less often when the example is present`;
  console.log(verdictSentence(summary.ratio, direction));
  console.log('');
  console.log('A shift of the whole distribution would move the middle answer as well. The middle answer standing');
  console.log('still while the mean moves means the answers are being collected onto one year rather than slid');
  console.log('along the calendar.');
};

/**
 * Prints how repeatable the answers of every model are.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {void} Returns nothing.
 * @throws {never} Throws nothing.
 */
const printRepeatability = (experiment) => {
  printGrid(
    ['model', 'answers', 'distinct\nyears', 'most frequent\nyear', 'share of most\nfrequent %', 'standard\ndeviation'],
    experiment.spread.map((entry) => [
      entry.model,
      String(entry.n),
      String(entry.distinct),
      String(entry.mostFrequent),
      entry.share.toFixed(1),
      orDash(entry.sd, 1)
    ])
  );
  console.log('');
  console.log('A high share of the most frequent year means the model answers almost the same way every time; a low');
  console.log('share means it scatters its answers. Both prompts ask the same question, so this describes the model.');
};

/**
 * Prints how far the answers of every model lie from the year taken as the point of comparison.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {void} Returns nothing.
 * @throws {never} Throws nothing.
 */
const printAccuracy = (experiment) => {
  /**
   * Prints one table of distances.
   * @author Wojciech Krajewski; Claude Opus 5.
   * @date 2026-09-10.
   * @param {string} label What the table covers.
   * @param {Array<object>} entries The summary of every model.
   * @return {void} Returns nothing.
   * @throws {never} Throws nothing.
   */
  const printTable = (label, entries) => {
    console.log('');
    console.log(label);
    printGrid(
      ['model', 'answers', 'systematic\nerror', 'standard\ndeviation', 'mean absolute\nerror', 'exact\nhits', `within\n${CLOSE_YEARS} years %`],
      entries.map((entry) => [
        entry.model,
        String(entry.n),
        entry.systematicError.toFixed(1),
        orDash(entry.sd, 1),
        entry.absoluteError.toFixed(1),
        String(entry.hits),
        percent(entry.near, entry.n)
      ])
    );
  };

  printTable('Both prompts together', experiment.accuracy);
  VARIANTS.forEach((variant, index) => printTable(`Prompt ${variant.label}`, experiment.accuracyByVariant[index]));

  console.log('');
  console.log(`The point of comparison is ${DOCUMENTED_YEAR}. The systematic error says in which direction a model is wrong on`);
  console.log('average, the standard deviation how widely its answers scatter, the mean absolute error combines the two.');
  console.log('A model whose answers scatter widely can average out near the reference without ever being reliable.');
  console.log('');
  console.log('Caution: a single reference value ranks the models on this one question only. Had the reference been');
  console.log('1866, the order would be close to reversed.');
};

/**
 * Prints which models insist on one answer and whether that answer lies close to the reference year.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {void} Returns nothing.
 * @throws {never} Throws nothing.
 */
const printInsistence = (experiment) => {
  /**
   * Names the behaviour of a model from its insistence and the distance of its most frequent answer.
   * @author Wojciech Krajewski; Claude Opus 5.
   * @date 2026-09-10.
   * @param {{insists: boolean, close: boolean}} entry Summary of one model.
   * @return {string} A description of the behaviour.
   * @throws {never} Throws nothing.
   */
  const behaviour = (entry) => {
    if (entry.insists) return entry.close ? 'insists on a year\nclose to the reference' : 'insists on a year\nfar from the reference';
    return entry.close ? 'scatters, most often\nclose to the reference' : 'scatters, most often\nfar from the reference';
  };

  printGrid(
    ['model', 'answers', 'most frequent\nyear', 'share of most\nfrequent %', `distance from\n${DOCUMENTED_YEAR}`, 'behaviour'],
    experiment.behaviour.map((entry) => [
      entry.model,
      String(entry.n),
      String(entry.mostFrequent),
      entry.share.toFixed(1),
      String(entry.distance),
      behaviour(entry)
    ])
  );
  console.log('');
  console.log(`A model counts as insisting when its most frequent year covers at least ${INSISTENT_SHARE_PERCENT} % of its answers, and as`);
  console.log(`close when that year lies within ${CLOSE_YEARS} years of the reference. Models with fewer than ${MIN_ANSWERS_FOR_BEHAVIOUR} answers are left out.`);
  console.log('');
  console.log('The worst case is a model that repeats one year and that year is wrong: it never produces a correct');
  console.log('answer at all, whereas a scattered model at least lands close some of the time.');
};

/**
 * Prints how often each prompt variant produced an answer in the requested RRRR format.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @return {void} Returns nothing.
 * @throws {Error} When the log file does not exist.
 */
const printFormatCompliance = () => {
  const rows = readLog();
  const summaries = LOG_VARIANTS.map((variant) => {
    const variantRows = rows.filter((row) => row.variant === variant);
    const errors = variantRows.filter((row) => row.model === REQUEST_ERROR_MODEL).length;
    return {
      requests: variantRows.length,
      errors,
      responses: variantRows.length - errors,
      accepted: variantRows.filter((row) => row.inRequestedFormat).length
    };
  });

  printGrid(
    ['prompt', 'requests', 'request\nerrors', 'error\nrate %', 'responses', 'RRRR\nanswers', 'RRRR\nrate %'],
    summaries.map((summary, index) => [
      VARIANTS[index].label,
      String(summary.requests),
      String(summary.errors),
      percent(summary.errors, summary.requests),
      String(summary.responses),
      String(summary.accepted),
      percent(summary.accepted, summary.responses)
    ])
  );

  const [withExample, withoutExample] = summaries;
  const { difference, standardError, ratio } = compareProportions(
    withExample.accepted, withExample.responses, withoutExample.accepted, withoutExample.responses
  );

  console.log('');
  console.log(`Difference, with example minus without: ${difference.toFixed(1)} percentage points`);
  console.log(`Standard error: ${standardError.toFixed(2)}, difference expressed in standard errors: ${ratio.toFixed(3)}`);
};

/**
 * Prints which models return a year at all and which return it as a bare number.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @return {void} Returns nothing.
 * @throws {Error} When the log file does not exist.
 */
const printUsability = () => {
  const summaries = [...countYearAnswersByModel().entries()]
    .map(([model, counts]) => ({ model, ...counts }))
    .sort((first, second) => second.bareYear / second.answers - first.bareYear / first.answers);

  printGrid(
    ['model', 'answers', 'returned\na year', 'returned\nno year', 'year\n%', 'bare year\n%'],
    summaries.map((summary) => [
      summary.model,
      String(summary.answers),
      String(summary.withYear),
      String(summary.answers - summary.withYear),
      percent(summary.withYear, summary.answers),
      percent(summary.bareYear, summary.answers)
    ])
  );
  console.log('');
  console.log('A model with both last columns near 100 % can be used as it is. A model with a high year rate but a low');
  console.log('bare year rate answers the question, yet the year has to be dug out of surrounding text. A model with a');
  console.log('low year rate does not do the task at all, whatever the reason.');
  console.log('');
  console.log('Two limits: the recorded fragment covers only the beginning of the answer, so a year appearing late in a');
  console.log('long answer counts as absent; and rows written before the fragment column existed are left out.');
};

/**
 * Prints whether a model repeats itself more when the prompt carries the example, measured for every
 * model against that same model without the example.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {void} Returns nothing.
 * @throws {never} Throws nothing.
 */
const printConcentration = (experiment) => {
  const summary = experiment.concentrationSummary;
  const sameYear = experiment.concentration.filter((entry) => entry.mostFrequentWith === entry.mostFrequentWithout).length;

  printGrid(
    ['model', 'share of most\nfrequent %\nwith example', 'share of most\nfrequent %\nwithout example', 'difference\nin points', 'most frequent\nyear\nwith example', 'most frequent\nyear\nwithout example', 'answers'],
    experiment.concentration.map((entry) => [
      entry.model,
      entry.shareWith.toFixed(1),
      entry.shareWithout.toFixed(1),
      entry.difference.toFixed(1),
      String(entry.mostFrequentWith),
      String(entry.mostFrequentWithout),
      `${entry.countWith} / ${entry.countWithout}`
    ])
  );

  console.log('');
  console.log(`Mean change in concentration across the ${summary.n} comparable models: ${summary.mean.toFixed(1)} percentage points`);
  console.log(`Standard error: ${summary.standardError.toFixed(2)}, difference expressed in standard errors: ${summary.ratio.toFixed(3)}`);
  console.log(`Models concentrating more with the example: ${summary.n - summary.negative} of ${summary.n}`);
  console.log(`Models whose most frequent year is the same in both variants: ${sameYear} of ${summary.n}`);

  const direction = summary.mean > 0
    ? 'models repeat one year more often when the prompt carries the example'
    : 'models repeat one year less often when the prompt carries the example';
  console.log(verdictSentence(summary.ratio, direction));
  console.log('');
  console.log(`Models with fewer than ${MIN_ANSWERS_FOR_BEHAVIOUR} answers in either variant are left out, because a handful of`);
  console.log('answers concentrates by itself. Each model is compared only with itself, so the mixture of models');
  console.log('reaching the two variants cannot produce the number.');
};

/**
 * Prints what the format filter did to the composition of the answers every other analysis reads: which
 * models it kept, which it thinned out and which it removed from the collection altogether.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @return {void} Returns nothing.
 * @throws {Error} When the log file does not exist.
 */
const printFilter = () => {
  const models = countFilteredByModel(readLog());
  const responses = models.reduce((sum, entry) => sum + entry.responses, 0);
  const kept = models.reduce((sum, entry) => sum + entry.kept, 0);

  const shares = models.map((entry) => ({
    ...entry,
    shareOfResponses: (100 * entry.responses) / responses,
    shareOfKept: (100 * entry.kept) / kept
  }));

  printGrid(
    ['model', 'responses', 'answers\nkept', 'kept\nrate %', 'share of all\nresponses %', 'share of the\nanswers kept %', 'difference in\npercentage points'],
    shares.map((entry) => [
      entry.model,
      String(entry.responses),
      String(entry.kept),
      percent(entry.kept, entry.responses),
      entry.shareOfResponses.toFixed(1),
      entry.shareOfKept.toFixed(1),
      (entry.shareOfKept - entry.shareOfResponses).toFixed(1)
    ])
  );

  const silent = shares.filter((entry) => entry.kept === 0);
  const gained = [...shares].sort((first, second) => (second.shareOfKept - second.shareOfResponses) - (first.shareOfKept - first.shareOfResponses));

  console.log('');
  console.log(`Responses: ${responses}. Answers kept: ${kept} (${percent(kept, responses)} %).`);
  console.log(`Models answering: ${models.length}. Models absent from every other analysis: ${silent.length}.`);
  console.log(`Most over-represented after the filter: ${gained[0].model}, ${(gained[0].shareOfKept - gained[0].shareOfResponses).toFixed(1)} percentage points.`);
  console.log(`Most under-represented: ${gained[gained.length - 1].model}, ${(gained[gained.length - 1].shareOfKept - gained[gained.length - 1].shareOfResponses).toFixed(1)} percentage points.`);
  console.log('');
  console.log('The filter keeps an answer of exactly four digits and rejects every other answer, so a model that');
  console.log('obeys the instruction weighs more in every other analysis than its share of the responses, and a');
  console.log('model that never obeys weighs nothing at all. Comparisons between the two prompt variants are');
  console.log('affected by the same mechanism, which is why the shift is also measured model by model.');
};

/**
 * Prints how far the models stand from one another, measured without any reference value.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {void} Returns nothing.
 * @throws {never} Throws nothing.
 */
const printDisagreement = (experiment) => {
  const summary = experiment.disagreement;

  printGrid(
    ['model', 'answers', 'mean\nanswer', 'standard\ndeviation', 'standard error\nof the mean'],
    experiment.modelMeans.map((entry) => [
      entry.model,
      String(entry.n),
      entry.mean.toFixed(1),
      entry.sd.toFixed(1),
      entry.standardError.toFixed(2)
    ])
  );

  console.log('');
  console.log(`Earliest model: ${summary.lowest.model} at ${summary.lowest.mean.toFixed(1)}`);
  console.log(`Latest model:   ${summary.highest.model} at ${summary.highest.mean.toFixed(1)}`);
  console.log(`Distance between them: ${summary.range.toFixed(1)} years`);
  console.log(`Standard deviation of the ${summary.n} model means: ${summary.sdOfMeans.toFixed(1)} years`);
  console.log(`Mean standard deviation inside a model: ${summary.meanWithinSd.toFixed(1)} years`);
  console.log(`Pairs of models standing more than ${DISTINGUISHABLE_STANDARD_ERRORS} standard errors apart: ${summary.distinguishable} of ${summary.pairs} (${percent(summary.distinguishable, summary.pairs)} %)`);

  const effect = Math.abs(experiment.shiftSummary.mean);
  console.log('');
  console.log(`The example moves the answers of a model by ${effect.toFixed(2)} years on average, so the models stand`);
  console.log(`${(summary.range / effect).toFixed(0)} times further apart from one another than the example moves the answers.`);
  console.log('');
  console.log('This comparison uses no reference value: it holds whatever the true year is. Models with fewer than');
  console.log(`${MIN_ANSWERS_FOR_BEHAVIOUR} answers to either variant are left out, because their means are too unsteady to place. A model`);
  console.log('that gave the same year every time has a standard error of zero, so every pair it belongs to counts');
  console.log('as distinguishable.');
};

export const ANALYSES = [
  {
    id: 'variants',
    title: 'Results for both prompt variants',
    run: printVariants
  },
  {
    id: 'model-shift',
    title: 'The same shift measured model by model',
    run: printModelShift
  },
  {
    id: 'last-digit',
    title: 'Last digit of the answer',
    run: printLastDigit
  },
  {
    id: 'middle-answer',
    title: 'The middle answer of each prompt variant, and what stands around it',
    run: printMiddleAnswer
  },
  {
    id: 'repeatability',
    title: 'Repeatability of the answers per model',
    run: printRepeatability
  },
  {
    id: 'concentration',
    title: 'Whether the example makes a model repeat one year more often',
    run: printConcentration
  },
  {
    id: 'accuracy',
    title: `Distance from the reference year (${DOCUMENTED_YEAR})`,
    run: printAccuracy
  },
  {
    id: 'insistence',
    title: 'Insistence on one answer, and whether that answer is close to the reference',
    run: printInsistence
  },
  {
    id: 'format',
    title: 'Format compliance (answers matching RRRR)',
    run: printFormatCompliance
  },
  {
    id: 'usability',
    title: 'Which models return a year, and in what form',
    run: printUsability
  },
  {
    id: 'filter',
    title: 'What the format filter did to the composition of the answers',
    run: printFilter
  },
  {
    id: 'disagreement',
    title: 'How far the models stand from one another',
    run: printDisagreement
  }
];

/**
 * Prints one analysis under its own heading.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {{id: string, title: string, run: Function}} analysis The analysis to print.
 * @param {object} experiment The loaded experiment.
 * @return {void} Returns nothing.
 * @throws {Error} When the analysis needs a file that does not exist.
 */
export const printAnalysis = (analysis, experiment) => {
  printSection(`${analysis.title}   [--id=${analysis.id}]`);
  analysis.run(experiment);
  console.log('');
};
