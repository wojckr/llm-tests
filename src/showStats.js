/**
 * Prints the analyses of the experiment in the terminal. This is the working instrument: it shows
 * everything, including the raw material that never reaches the published document.
 * Run with: npm run stats          every analysis
 *           npm run stats --id=X   only the analysis X
 * An unknown identifier prints the list of the ones that exist.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ANALYSES, printAnalysis } from './analyses.js';
import { CHART_DATA_DIR } from './paths.js';
import { fileStamp } from './timestamp.js';
import { loadExperiment } from './statistics.js';

const ID_SWITCH = '--id=';

/**
 * Writes the counts of every year to a CSV file, the source of the chart and the table view of it.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-09 - 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {void} Returns nothing.
 * @throws {Error} When writing to the file fails.
 */
const writeChartData = (experiment) => {
  const lines = ['year,occurrences in the prompt with the example,occurrences in the prompt without the example'];
  for (const entry of experiment.counts) lines.push(`${entry.year},${entry.withExample},${entry.withoutExample}`);

  const path = join(CHART_DATA_DIR, `${fileStamp()}.csv`);
  writeFileSync(path, `${lines.join('\n')}\n`);
  console.log(`Chart data: ${path}`);
};

/**
 * Reads the requested identifier from the arguments of the command.
 *
 * Two places have to be examined, and the second is not a matter of taste. Written as
 * "npm run stats -- --id=X" the switch reaches the arguments of the process; written as
 * "npm run stats --id=X" npm treats it as one of its own settings and passes it on only as the
 * environment variable npm_config_id. Both spellings are natural, so both are accepted.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @return {string|null} The identifier, or null when every analysis was requested.
 * @throws {never} Throws nothing.
 */
const requestedId = () => {
  const switchArgument = process.argv.find((argument) => argument.startsWith(ID_SWITCH));
  if (switchArgument !== undefined) return switchArgument.slice(ID_SWITCH.length);
  return process.env.npm_config_id ?? null;
};

/**
 * Prints the analyses that were asked for.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @return {void} Returns nothing.
 * @throws {Error} When a data file does not exist.
 */
const showStats = () => {
  const id = requestedId();
  const chosen = id === null ? ANALYSES : ANALYSES.filter((analysis) => analysis.id === id);

  if (chosen.length === 0) {
    console.log(`Unknown identifier "${id}". Available identifiers:`);
    for (const analysis of ANALYSES) console.log(`  ${analysis.id.padEnd(14)} ${analysis.title}`);
    process.exitCode = 1;
    return;
  }

  const experiment = loadExperiment();
  for (const analysis of chosen) printAnalysis(analysis, experiment);

  // The chart data describes the whole experiment, so it is written only when nothing was singled out.
  if (id === null) writeChartData(experiment);
};

showStats();
