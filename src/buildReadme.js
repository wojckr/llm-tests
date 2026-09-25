/**
 * Builds README.md out of the hand-written sections in content/ and the numbers computed from the data.
 * Every run overwrites README.md and also leaves a stamped copy in temp/, so successive versions can be
 * compared while the wording is still being worked on.
 * Run with: npm run readme
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT_DIR, README_PATH, TEMP_DIR, DOCS_DIR, REPORT_PATH } from './paths.js';
import { fileStamp } from './timestamp.js';
import { loadExperiment, EXAMPLE_VALUE, DOCUMENTED_YEAR, CLOSE_YEARS, MIN_ANSWERS_FOR_BEHAVIOUR } from './statistics.js';
import { renderHtml } from './renderHtml.js';
import { anchor } from './anchor.js';
import { articleBlocks } from './articleBlocks.js';
import { fixed } from './markdown.js';
import { countFilteredByModel, readLog } from './requestsLog.js';

const TITLE = 'Does the Example in Your Prompt Leak Into the Answer?';
const SUBTITLE = 'Measuring Anchoring in Free Language Models';

// Where an article published elsewhere sends the reader for the prompts, the answers and the code.
const REPOSITORY_URL = 'https://github.com/wojckr/llm-tests';

// The published cemetery registry entry the reference year is read from.
const GRAVE_RECORD_URL = 'https://www.parafiaszewna.pl/cmentarz/szewna/grave/detail/1929482';

const PLACEHOLDER_PATTERN = /\{\{([a-zA-Z]+)\}\}/g;

// The marker an article puts above its heading to state its identifier, matching the one the terminal
// uses in "npm run stats --id=...".
const ID_MARKER_PATTERN = /^<!--\s*id:\s*([a-z-]+)\s*-->$/m;

// Leaves only the page under the unchanging name, without the copy stamped with the date and the time.
const LATEST_ONLY_SWITCH = '--latest-only';

// An article reaches the published document whole only when its identifier stands here. Every other
// article keeps its title and loses its text, so the page can name what is coming without showing a
// text still being written.
const PUBLISHED_ARTICLE_IDS = ['variants'];

// What stands under the title of an article that is not published yet: a quiet line for the reader of
// the published page, and a loud one for the author reading the copy under temp/, where the text of
// every article is present and only the banner tells the two apart.
const IN_PREPARATION_NOTE = '<p class="in-preparation">Article in preparation.</p>';
const DRAFT_BANNER = '<p class="draft-banner">DRAFT — NOT PUBLISHED YET</p>';

const MAX_ARTICLE_CHARACTERS = 2_950;
const CHART_PATTERN = /<svg[\s\S]*?<\/svg>/g;
const ID_CAPTION_PATTERN = /<p class="article-id">[^<]*<\/p>/g;

// The name a table or a chart carries. It labels the drawing rather than adding to the text a reader
// has to read, so it is left out of the length of the article, as the drawing itself is.
const FIGURE_TITLE_PATTERN = /<p class="figure-title">[^<]*<\/p>/g;
const ARTICLE_HEADING_PATTERN = /^### .*$/m;
const SECTION_HEADING_PATTERN = /^## /m;

// A link, kept in the count by the words it shows rather than by the address behind them.
const LINK_PATTERN = /\[([^\]]*)\]\([^)]*\)/g;

// A note in brackets, such as "[NOT CHECKED]" opening a title or "[PAR. OK]" opening a paragraph,
// records how far the work on a text has come. The note belongs to the work rather than to the reader,
// so the published document does without it and its length is counted without it. A heading already
// carries its number by then, and the number is kept. A link opening a line is not such a note, which
// the bracket followed by a round bracket tells apart.
const STATUS_MARKER_PATTERN = /^((?:#{2,4} )?(?:[\d.]+ )?)\[[^\]]*\](?!\() */gm;

/**
 * Collects every value that a hand-written section may refer to by a {{name}} placeholder.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} experiment The loaded experiment.
 * @return {Object<string, string>} The values, keyed by placeholder name.
 * @throws {never} Throws nothing.
 */
const placeholderValues = (experiment) => {
  const [withExample, withoutExample] = experiment.stats;
  const { difference, standardError, ratio } = experiment.meansComparison;

  return {
    answersWithExample: String(withExample.n),
    answersWithoutExample: String(withoutExample.n),
    answersTotal: String(withExample.n + withoutExample.n),
    meanWithExample: fixed(withExample.mean, 1),
    meanWithoutExample: fixed(withoutExample.mean, 1),
    meanDifference: fixed(difference, 2),
    meanDifferenceAbsolute: fixed(Math.abs(difference), 2),
    meanStandardError: fixed(standardError, 2),
    meanRatio: fixed(ratio, 1),
    modelCount: String(new Set(experiment.allRows.map((row) => row.model)).size),
    respondingModelCount: String(countFilteredByModel(readLog()).length),
    comparableModelCount: String(experiment.comparableModelCount),
    comparableAnswers: String(experiment.comparableAnswerCount),
    middleYear: String(experiment.middleYear),
    modelsShiftingTowardsExample: String(experiment.shiftSummary.negative),
    shiftAcrossModels: fixed(experiment.shiftSummary.mean, 2),
    shiftAcrossModelsAbsolute: fixed(Math.abs(experiment.shiftSummary.mean), 2),
    shiftAcrossModelsRatio: fixed(experiment.shiftSummary.ratio, 1),
    repository: REPOSITORY_URL,
    graveRecord: GRAVE_RECORD_URL,
    exampleValue: String(EXAMPLE_VALUE),
    documentedYear: String(DOCUMENTED_YEAR),
    closeYears: String(CLOSE_YEARS),
    minAnswersForBehaviour: String(MIN_ANSWERS_FOR_BEHAVIOUR),
    ...articleBlocks(experiment)
  };
};

/**
 * Replaces every {{name}} placeholder in a section with its value.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {string} text The text of one section.
 * @param {string} fileName Name of the file the text came from, used in the error message.
 * @param {Object<string, string>} values The values, keyed by placeholder name.
 * @return {string} The text with every placeholder replaced.
 * @throws {Error} When a section refers to a placeholder that does not exist.
 */
const fillPlaceholders = (text, fileName, values) => text.replace(PLACEHOLDER_PATTERN, (match, name) => {
  if (!(name in values)) throw new Error(`${fileName} refers to an unknown placeholder ${match}`);
  return values[name];
});

/**
 * Puts the small line naming the identifier of an article directly under its title, so that a reader
 * who wants the numbers behind the article knows what to pass to the terminal without looking the name
 * up anywhere.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {string} text The text of one section.
 * @return {string} The text, carrying the line when the section is an article.
 * @throws {Error} When an article declares an identifier but has no title.
 */
const withIdCaption = (text) => {
  const marker = text.match(ID_MARKER_PATTERN);
  if (marker === null) return text;

  const heading = text.match(ARTICLE_HEADING_PATTERN);
  if (heading === null) throw new Error(`The article "${marker[1]}" declares an identifier but has no title.`);

  return text.replace(heading[0], `${heading[0]}\n\n<p class="article-id">article id: ${marker[1]}</p>`);
};

/**
 * Reads the hand-written sections in alphabetical order, so their file names decide the order of the
 * document.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {Object<string, string>} values The values, keyed by placeholder name.
 * @return {string} The sections joined together.
 * @throws {Error} When a section refers to an unknown placeholder.
 */
const readSections = (values) => readdirSync(CONTENT_DIR)
  .filter((fileName) => fileName.endsWith('.md'))
  .sort()
  .map((fileName) => withIdCaption(fillPlaceholders(readFileSync(join(CONTENT_DIR, fileName), 'utf8').trim(), fileName, values)))
  .join('\n\n');

/**
 * Reports how long every article is, and stops the build when one of them is too long. The limit
 * counts the text a reader has to read, so the tables and the charts are left out of it: an article is
 * meant to be publishable on its own, and length is what decides whether it is read to the end.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10 - 2026-09-25.
 * @param {string} document The assembled and numbered document, already without its status markers.
 * @return {void} Returns nothing.
 * @throws {Error} When an article is longer than the limit.
 */
const checkArticleLengths = (document) => {
  const articles = document.split(/^### /m).slice(1);
  const tooLong = [];

  for (const whole of articles) {
    // A section of the document ends the last article of the section that precedes it, so the text of
    // an article stops at the next heading of the second level rather than at the end of the document.
    const nextSection = whole.search(SECTION_HEADING_PATTERN);
    const article = nextSection === -1 ? whole : whole.slice(0, nextSection);
    const title = article.slice(0, article.indexOf('\n')).trim();
    const text = article
      .replace(CHART_PATTERN, '')
      .replace(ID_CAPTION_PATTERN, '')
      .replace(FIGURE_TITLE_PATTERN, '')
      .split('\n')
      .filter((line) => !line.startsWith('|'))
      .join('\n')
      .replace(LINK_PATTERN, '$1')
      .trim();

    console.log(`  ${String(text.length).padStart(5)} characters  ${title}`);
    if (text.length > MAX_ARTICLE_CHARACTERS) tooLong.push(`"${title}" holds ${text.length} characters`);
  }

  if (tooLong.length > 0) throw new Error(`An article may hold at most ${MAX_ARTICLE_CHARACTERS} characters of text: ${tooLong.join('; ')}.`);
};

/**
 * Numbers the articles and the parts inside them. The number is written into the heading itself rather
 * than added by the style sheet, so that the table of contents, the page and the file published on the
 * repository all show the same numbering.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {string} document The assembled document.
 * @return {string} The document with the headings numbered.
 * @throws {never} Throws nothing.
 */
const numberHeadings = (document) => {
  let article = 0;
  let part = 0;

  return document.split('\n').map((line) => {
    if (line.startsWith('### ')) {
      article += 1;
      part = 0;
      return `### ${article}. ${line.slice(4).trim()}`;
    }
    if (line.startsWith('#### ')) {
      part += 1;
      return `#### ${article}.${part} ${line.slice(5).trim()}`;
    }
    return line;
  }).join('\n');
};

/**
 * Checks that the title of an article contains its own identifier, so that a reader of the page and a
 * person working in the terminal never have to guess that "variants" and a differently worded heading
 * are the same article. The build stops rather than publishing a document where the two disagree.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {string} id The identifier declared above the heading.
 * @param {string} heading Text of the heading.
 * @return {void} Returns nothing.
 * @throws {Error} When the heading does not contain the identifier.
 */
const checkHeadingMatchesId = (id, heading) => {
  const words = id.replaceAll('-', ' ');
  if (heading.toLowerCase().includes(words)) return;
  throw new Error(`The article "${heading}" declares the identifier "${id}", which its title does not contain.`);
};

/**
 * Builds a list of links to the second-level and third-level headings of the document, the third level
 * indented under the second, so that the titles of the articles are visible from the top of the page.
 *
 * An article states its own identifier in a marker placed just above its heading, and that identifier,
 * rather than the text of the heading, becomes the target of the link.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {string} document The assembled document.
 * @return {string} The list as Markdown.
 * @throws {never} Throws nothing.
 */
const tableOfContents = (document) => {
  const entries = [];
  let declaredId = null;

  for (const line of document.split('\n')) {
    const marker = line.match(ID_MARKER_PATTERN);
    if (marker !== null) {
      [, declaredId] = marker;
      continue;
    }

    const subsection = line.startsWith('### ');
    if (!subsection && !line.startsWith('## ')) continue;

    const heading = line.slice(subsection ? 4 : 3).trim();
    if (declaredId !== null) checkHeadingMatchesId(declaredId, heading);
    entries.push(`${subsection ? '  ' : ''}- [${heading}](#${declaredId ?? anchor(heading)})`);
    declaredId = null;
  }
  return entries.join('\n');
};

/**
 * Removes the notes in brackets by which the work on a text is tracked, leaving the heading, its number
 * and the paragraph that carried the note untouched.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-25.
 * @param {string} document The assembled and numbered document.
 * @return {string} The document without the notes.
 * @throws {never} Throws nothing.
 */
const withoutStatusMarkers = (document) => document.replace(STATUS_MARKER_PATTERN, '$1');

/**
 * Puts a note under the title of every article that is not listed as published, and, when asked,
 * drops the text under it as well. The published document drops the text, so a reader sees what is
 * coming without reading a text that is still being written; the copy kept for the author keeps the
 * text and carries the note alone, which is how an unpublished article is recognised while working.
 * The titles stay in the table of contents, because the table is built from the headings.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-25.
 * @param {string} document The assembled and numbered document.
 * @param {string} note The line placed under the title of an unpublished article.
 * @param {boolean} dropText Whether the text of an unpublished article is left out.
 * @return {string} The marked document.
 * @throws {never} Throws nothing.
 */
const withUnpublishedArticlesMarked = (document, note, dropText) => {
  const kept = [];
  let declaredId = null;
  let unpublished = false;

  for (const line of document.split('\n')) {
    const marker = line.match(ID_MARKER_PATTERN);
    const articleHeading = line.startsWith('### ');

    if (marker !== null) {
      [, declaredId] = marker;
      unpublished = false;
    } else if (articleHeading) {
      unpublished = !PUBLISHED_ARTICLE_IDS.includes(declaredId);
    } else if (line.startsWith('## ')) {
      unpublished = false;
    } else if (dropText && unpublished) {
      continue;
    }

    kept.push(line);
    if (articleHeading && unpublished) kept.push('', note, '');
  }

  return kept.join('\n');
};

/**
 * Puts the parts of the document together: the title, the lead that opens it, the table of contents
 * built from the headings, and the sections themselves.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-25.
 * @param {string} body The assembled and numbered sections.
 * @return {string} The whole document as Markdown.
 * @throws {Error} When the body does not open with a lead followed by a section.
 */
const assembleDocument = (body) => {
  // The text before the first section opens the document, above the table of contents; the sections
  // themselves follow it.
  const firstSection = body.indexOf('\n## ');
  if (firstSection <= 0) throw new Error('The document has to open with a lead, followed by its first section.');
  const lead = body.slice(0, firstSection).trim();
  const sections = body.slice(firstSection + 1);

  return [
    `# ${TITLE}`,
    '',
    `<p class="subtitle">${SUBTITLE}</p>`,
    '',
    lead,
    '',
    '## Contents',
    '',
    tableOfContents(sections),
    '',
    sections,
    ''
  ].join('\n');
};

/**
 * Builds the document. By default it writes only a stamped copy under temp/, which is not published;
 * with the --final switch it also overwrites README.md, the file the repository publishes. The copy
 * under temp/ holds every article and every status marker, because it is what the author reads while
 * working; the published files hold neither.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10 - 2026-09-25.
 * @return {void} Returns nothing.
 * @throws {Error} When a section refers to an unknown placeholder or a file cannot be written.
 */
const buildReadme = () => {
  const final = process.argv.includes('--final');

  // Written as "npm run readme -- --latest-only" the switch reaches the arguments of the process;
  // written as "npm run readme --latest-only" npm keeps it for itself and passes it on as an
  // environment variable. Both spellings are natural, so both are accepted.
  const latestOnly = process.argv.includes(LATEST_ONLY_SWITCH) || process.env.npm_config_latest_only !== undefined;

  const experiment = loadExperiment();
  const values = placeholderValues(experiment);

  const body = numberHeadings(readSections(values));
  checkArticleLengths(withoutStatusMarkers(body));

  const document = assembleDocument(withUnpublishedArticlesMarked(body, DRAFT_BANNER, false));
  const page = renderHtml(document, TITLE);

  mkdirSync(TEMP_DIR, { recursive: true });
  // The same page under a name that never changes, so a preview opened once keeps showing the newest run.
  const latestPagePath = join(TEMP_DIR, 'report_latest.html');
  writeFileSync(latestPagePath, page);
  console.log(`always newest:   ${latestPagePath} (${document.length} characters)`);

  if (!latestOnly) {
    const stamp = fileStamp();
    const draftMarkdownPath = join(TEMP_DIR, `README_${stamp}.md`);
    const draftPagePath = join(TEMP_DIR, `report_${stamp}.html`);
    writeFileSync(draftMarkdownPath, document);
    writeFileSync(draftPagePath, page);
    console.log(`draft, Markdown: ${draftMarkdownPath}`);
    console.log(`draft, page:     ${draftPagePath}`);
  }

  if (final) {
    const publishedDocument = assembleDocument(withoutStatusMarkers(withUnpublishedArticlesMarked(body, IN_PREPARATION_NOTE, true)));

    mkdirSync(DOCS_DIR, { recursive: true });
    writeFileSync(README_PATH, publishedDocument);
    writeFileSync(REPORT_PATH, renderHtml(publishedDocument, TITLE));
    console.log(`published articles: ${PUBLISHED_ARTICLE_IDS.join(', ')}`);
    console.log(`published document overwritten: ${README_PATH}`);
    console.log(`published page overwritten:     ${REPORT_PATH}`);
    return;
  }
  console.log('Published files left untouched. Run "npm run readme:final" to overwrite them.');
};

buildReadme();
