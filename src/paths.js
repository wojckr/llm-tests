/**
 * Locations of the files the scripts read and write, stated once for the whole project.
 * Every path is derived from the directory of this file, so the project can be moved as a whole.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SOURCE_DIR, '..');

// The settings of the environment, holding the OpenRouter key under OPENROUTER_API_KEY. The file never
// reaches version control.
export const ENVIRONMENT_PATH = join(ROOT, '.env');

export const REQUESTS_LOG_PATH = join(ROOT, 'data', 'requests_log.csv');
export const RESULTS_WITH_EXAMPLE_PATH = join(ROOT, 'data', 'results_with_example.csv');
export const RESULTS_WITHOUT_EXAMPLE_PATH = join(ROOT, 'data', 'results_without_example.csv');

export const CHART_DATA_DIR = join(ROOT, 'output', 'chartData');
export const CHARTS_DIR = join(ROOT, 'output', 'charts');

// The hand-written sections of the document, and the generated document itself.
export const CONTENT_DIR = join(ROOT, 'content');
export const README_PATH = join(ROOT, 'README.md');
// Stamped copies kept for review while the wording is worked on; never published.
export const TEMP_DIR = join(ROOT, 'temp');

// The full report, served by GitHub Pages once the repository publishes this directory.
export const DOCS_DIR = join(ROOT, 'docs');
export const REPORT_PATH = join(DOCS_DIR, 'index.html');
