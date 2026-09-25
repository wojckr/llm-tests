/**
 * Shared reading of the request log.
 */

import { readFileSync } from 'node:fs';
import { REQUESTS_LOG_PATH } from './paths.js';

const YEAR_ANYWHERE_PATTERN = /1[89][0-9]{2}/;

export const REQUEST_ERROR_MODEL = 'ERROR';

/**
 * Reads the request log: one row per request.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-09 - 2026-09-10.
 * @return {Array<{variant: string, model: string, inRequestedFormat: boolean, answerFragment: string}>} Rows of the log.
 * @throws {Error} When the file does not exist.
 */
export const readLog = () => readFileSync(REQUESTS_LOG_PATH, 'utf8')
  .split('\n')
  .slice(1)
  .filter((line) => line.trim() !== '')
  .map((line) => {
    const [variant, model, inRequestedFormat, answerFragment] = line.split(',');
    return { variant, model, inRequestedFormat: inRequestedFormat === 'true', answerFragment: answerFragment ?? '' };
  });

/**
 * Counts, for each model, how many responses it produced and how many of them passed the filter that
 * keeps only answers of exactly four digits. Failed requests carry no model and are skipped.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {Array<{model: string, inRequestedFormat: boolean}>} rows Rows of the log, all of them or those of one prompt variant.
 * @return {Array<{model: string, responses: number, kept: number}>} One entry per model, ordered from the most responses.
 * @throws {never} Throws nothing.
 */
export const countFilteredByModel = (rows) => {
  const counted = new Map();
  for (const row of rows) {
    if (row.model === REQUEST_ERROR_MODEL) continue;
    if (!counted.has(row.model)) counted.set(row.model, { model: row.model, responses: 0, kept: 0 });

    const entry = counted.get(row.model);
    entry.responses += 1;
    if (row.inRequestedFormat) entry.kept += 1;
  }
  return [...counted.values()].sort((first, second) => second.responses - first.responses);
};

/**
 * Counts, for each model, how many of its answers carry a year at all and how many carry it as a bare number.
 * Failed requests are skipped, as are rows written before the answer fragment was recorded, which cannot be judged.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @return {Map<string, {answers: number, withYear: number, bareYear: number}>} Counts per model.
 * @throws {Error} When the log file does not exist.
 */
export const countYearAnswersByModel = () => {
  const counted = new Map();
  for (const row of readLog()) {
    if (row.model === REQUEST_ERROR_MODEL) continue;
    if (!row.inRequestedFormat && row.answerFragment === '') continue;
    if (!counted.has(row.model)) counted.set(row.model, { answers: 0, withYear: 0, bareYear: 0 });

    const entry = counted.get(row.model);
    entry.answers += 1;
    if (row.inRequestedFormat) {
      entry.withYear += 1;
      entry.bareYear += 1;
    } else if (YEAR_ANYWHERE_PATTERN.test(row.answerFragment)) {
      entry.withYear += 1;
    }
  }
  return counted;
};
