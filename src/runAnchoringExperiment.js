/**
 * Experiment: the effect of the example "(np. 1800)" in a prompt on the answers of free OpenRouter models.
 * Run with: node runAnchoringExperiment.js
 */

import { readFileSync, appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { ENVIRONMENT_PATH, REQUESTS_LOG_PATH, RESULTS_WITH_EXAMPLE_PATH, RESULTS_WITHOUT_EXAMPLE_PATH } from './paths.js';

const REQUEST_ERROR_MODEL = 'ERROR';
const FRAGMENT_LENGTH = 80;
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Names the caller in OpenRouter analytics. Without HTTP-Referer no public application page is created.
const APP_TITLE = 'LLM anchoring experiment';
const MODEL = 'openrouter/free';
const YEARS_PER_VARIANT = 1_000;
const INTERVAL_MS = 80_000;

// OpenRouter allows a fixed number of requests to free models each day and answers 429 once that number
// is reached. The limit is lifted at midnight UTC, so the run waits an hour between attempts instead of
// asking every eighteen seconds for the rest of the day.
const TOO_MANY_REQUESTS = 429;
const RATE_LIMIT_INTERVAL_MS = 3_600_000;

// The status given to a request that never reached the service at all.
const NO_RESPONSE = 0;

// Both prompts stay in Polish. Their exact wording is the stimulus under study, so changing a single
// word would make the answers already collected incomparable with the ones collected afterwards.
const VARIANTS = [
  {
    name: 'withExample',
    csvPath: RESULTS_WITH_EXAMPLE_PATH,
    prompt: 'Oszacuj datę urodzin mojego pradziadka Stanisława Krajewskiego, który zmarł w 1936 roku. Zwróć tylko liczbę-rok, nic więcej (np. 1800).',
    collected: 0
  },
  {
    name: 'withoutExample',
    csvPath: RESULTS_WITHOUT_EXAMPLE_PATH,
    prompt: 'Oszacuj datę urodzin mojego pradziadka Stanisława Krajewskiego, który zmarł w 1936 roku. Zwróć tylko liczbę-rok, nic więcej.',
    collected: 0
  }
];

process.loadEnvFile(ENVIRONMENT_PATH);
const apiKey = process.env.OPENROUTER_API_KEY;
if (apiKey === undefined) throw new Error(`${ENVIRONMENT_PATH} has to state OPENROUTER_API_KEY.`);

/**
 * Sends a single request to OpenRouter and returns the name of the model together with the content of
 * the answer, or the reason the request did not produce one.
 *
 * The reason is kept rather than discarded because the failures are not all alike: a provider that is
 * momentarily unavailable is worth waiting out, while the daily limit on free models is not, and a run
 * that records only the word ERROR cannot tell the two apart afterwards.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-09 - 2026-09-10.
 * @param {string} prompt Content of the user request.
 * @return {Promise<{model: string, content: string, status: number}|{model: null, reason: string, status: number}>} The answer, or the reason there is none.
 * @throws {never} Network and HTTP errors are caught and returned as a reason.
 */
const requestFreeModel = async (prompt) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-OpenRouter-Title': APP_TITLE
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2_000
      })
    });

    const payload = await response.json();
    if (!response.ok) return { model: null, reason: `HTTP ${response.status} ${payload?.error?.message ?? ''}`.trim(), status: response.status };

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return { model: null, reason: 'the answer carried no content', status: response.status };

    return { model: payload.model ?? 'unknown', content, status: response.status };
  } catch (failure) {
    return { model: null, reason: `the request did not complete: ${failure.message}`, status: NO_RESPONSE };
  }
};

/**
 * Checks whether the answer of a model is a year in the RRRR format and nothing else. The answer is
 * examined exactly as it arrived, so a model adding anything of its own, a space included, does not
 * meet the requested form.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-09.
 * @param {string} content Content of the answer of the model.
 * @return {boolean} True when the content is exactly four digits.
 * @throws {never} Throws nothing.
 */
const isYear = (content) => /^\d{4}$/.test(content);

/**
 * Suspends execution for the given number of milliseconds.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-09.
 * @param {number} ms Waiting time in milliseconds.
 * @return {Promise<void>} A promise fulfilled once the time has passed.
 * @throws {never} Throws nothing.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Shortens the content of an answer to a fragment that is safe to store in a CSV file.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-09.
 * @param {string|null} content Content of the answer of the model, or null when the request failed.
 * @return {string} A fragment of up to FRAGMENT_LENGTH characters, without commas and newline characters.
 * @throws {never} Throws nothing.
 */
const answerFragment = (content) => (content === null ? '' : content.replace(/[\r\n]+/g, ' ').replaceAll(',', ';').slice(0, FRAGMENT_LENGTH));

/**
 * Appends to the log one row describing a single request.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-09.
 * @param {string} variantName Name of the prompt variant.
 * @param {string} model Name of the model, or ERROR when the request failed.
 * @param {boolean} inRequestedFormat Whether the answer had the RRRR format.
 * @param {string|null} content Content of the answer of the model, or null when the request failed.
 * @return {void} Returns nothing.
 * @throws {Error} When writing to the file fails.
 */
const logRequest = (variantName, model, inRequestedFormat, content) => {
  if (!existsSync(REQUESTS_LOG_PATH)) writeFileSync(REQUESTS_LOG_PATH, 'variant,model,inRequestedFormat,answerFragment\n');
  appendFileSync(REQUESTS_LOG_PATH, `${variantName},${model},${inRequestedFormat},${answerFragment(content)}\n`);
};

/**
 * Carries out the experiment: one request per iteration, the variants in turn, until both CSV files
 * hold YEARS_PER_VARIANT answers in the RRRR format each.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-09.
 * @return {Promise<void>} A promise fulfilled once the full set of answers has been gathered.
 * @throws {never} Throws nothing.
 */
const runExperiment = async () => {
  for (const variant of VARIANTS) {
    if (!existsSync(variant.csvPath)) writeFileSync(variant.csvPath, 'model,year\n');
    // Continuing an interrupted run: answers already stored count towards the target number.
    variant.collected = readFileSync(variant.csvPath, 'utf8').split('\n').slice(1).filter((line) => line.trim() !== '').length;
    console.log(`${variant.name}: ${variant.collected}/${YEARS_PER_VARIANT}`);
  }

  let iteration = 0;
  let interval = INTERVAL_MS;
  while (VARIANTS.some((variant) => variant.collected < YEARS_PER_VARIANT)) {
    const pending = VARIANTS.filter((variant) => variant.collected < YEARS_PER_VARIANT);
    const variant = pending[iteration % pending.length];

    if (iteration > 0) await sleep(interval);
    iteration += 1;

    const result = await requestFreeModel(variant.prompt);
    const accepted = result.model !== null && isYear(result.content);
    // A failed request carries no model name; its reason takes the place of the answer in the log.
    logRequest(variant.name, result.model ?? REQUEST_ERROR_MODEL, accepted, result.content ?? result.reason);
    if (accepted) {
      appendFileSync(variant.csvPath, `${result.model},${result.content}\n`);
      variant.collected += 1;
    }

    // The daily limit on free models is not lifted by asking again in eighteen seconds. Waiting an hour
    // between attempts keeps the run alive until the limit resets, without filling the log with refusals.
    interval = result.status === TOO_MANY_REQUESTS ? RATE_LIMIT_INTERVAL_MS : INTERVAL_MS;
    const nextRequest = `next request in ${interval / 1_000} s`;
    if (result.status === TOO_MANY_REQUESTS) console.log(`${iteration}\t${variant.name}\tRATE LIMIT\t${result.reason}\t${nextRequest}`);
    else console.log(`${iteration}\t${variant.name}\t${result.model ?? 'ERROR'}\t${accepted ? result.content : 'skipped'}\t(${variant.collected}/${YEARS_PER_VARIANT})\t${nextRequest}`);
  }
};

await runExperiment();
