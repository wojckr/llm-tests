/**
 * The small pieces of Markdown that more than one part of the document needs.
 */

/**
 * Formats a number with a fixed number of decimal places.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {number} value The value to format.
 * @param {number} places How many decimal places to keep.
 * @return {string} The formatted number.
 * @throws {never} Throws nothing.
 */
export const fixed = (value, places) => value.toFixed(places);

/**
 * Marks a value that falls below zero, so that the direction of a whole column can be seen without
 * reading the minus signs one by one.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {string} text The formatted value.
 * @param {boolean} below Whether the value falls below zero.
 * @return {string} The value, marked when it falls below zero.
 * @throws {never} Throws nothing.
 */
export const negative = (text, below) => (below ? `<span class="negative">${text}</span>` : text);

/**
 * Builds a table. The first column names the row and stays aligned to the left; every other column
 * holds numbers and is aligned to the right, so that digits of the same place value line up.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {string[]} headers Column headings.
 * @param {Array<Array<string>>} rows Rows of the table.
 * @return {string} The table as Markdown.
 * @throws {never} Throws nothing.
 */
export const table = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${[...headers.keys()].map((column) => (column === 0 ? ':---' : '---:')).join(' | ')} |`,
  ...rows.map((row) => `| ${row.join(' | ')} |`)
].join('\n');
