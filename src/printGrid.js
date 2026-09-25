/**
 * Shared text output for the scripts that present the results of the experiment.
 */

const SECTION_WIDTH = 122;

/**
 * Prints a section heading that separates one subject of the output from the next.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {string} title Title of the section.
 * @return {void} Returns nothing.
 * @throws {never} Throws nothing.
 */
export const printSection = (title) => {
  console.log('');
  console.log('━'.repeat(SECTION_WIDTH));
  console.log(`  ${title}`);
};

/**
 * Prints a framed table: the first column is aligned to the left, the remaining ones to the right.
 * A column heading and a body cell may both contain newline characters; such a cell then spans
 * several lines, which keeps a table of many columns within a narrower screen.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-09 - 2026-09-10.
 * @param {string[]} headers Column headings, each with optional newline characters.
 * @param {string[][]} bodyRows Rows of the table, each cell with optional newline characters.
 * @return {void} Returns nothing.
 * @throws {never} Throws nothing.
 */
export const printGrid = (headers, bodyRows) => {
  const headerLines = headers.map((header) => header.split('\n'));
  const headerHeight = Math.max(...headerLines.map((lines) => lines.length));
  // Headings shorter than the tallest one are padded with empty lines at the top, so that their last
  // line sits against the rule separating the heading from the body of the table.
  const alignedHeaderLines = headerLines.map((lines) => [...Array(headerHeight - lines.length).fill(''), ...lines]);
  // Body cells are padded with empty lines at the bottom, so that the first line of every cell shares one line.
  const bodyLines = bodyRows.map((row) => {
    const cells = row.map((cell) => cell.split('\n'));
    const height = Math.max(...cells.map((lines) => lines.length));
    return cells.map((lines) => [...lines, ...Array(height - lines.length).fill('')]);
  });
  const widths = alignedHeaderLines.map((lines, column) => Math.max(
    ...lines.map((line) => line.length),
    ...bodyLines.map((row) => Math.max(...row[column].map((line) => line.length)))
  ));
  /**
   * Builds a horizontal rule of the frame from the given corner and joining characters.
   * @author Wojciech Krajewski; Claude Opus 5.
   * @date 2026-09-09.
   * @param {string} left Character of the left end.
   * @param {string} join Character joining the columns.
   * @param {string} right Character of the right end.
   * @return {string} The finished rule.
   * @throws {never} Throws nothing.
   */
  const rule = (left, join, right) => `${left}${widths.map((width) => '─'.repeat(width + 2)).join(join)}${right}`;

  /**
   * Builds one line of the table, padding the cells to the width of their columns.
   * @author Wojciech Krajewski; Claude Opus 5.
   * @date 2026-09-09.
   * @param {string[]} row Cells of the line.
   * @return {string} The finished line.
   * @throws {never} Throws nothing.
   */
  const format = (row) => `│ ${row.map((cell, column) => (column === 0 ? cell.padEnd(widths[column]) : cell.padStart(widths[column]))).join(' │ ')} │`;

  console.log(rule('┌', '┬', '┐'));
  for (let line = 0; line < headerHeight; line += 1) console.log(format(alignedHeaderLines.map((lines) => lines[line])));
  console.log(rule('├', '┼', '┤'));
  for (const row of bodyLines) {
    for (let line = 0; line < row[0].length; line += 1) console.log(format(row.map((lines) => lines[line])));
  }
  console.log(rule('└', '┴', '┘'));
};
