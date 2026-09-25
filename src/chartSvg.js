/**
 * Draws charts as SVG. The file is written as text, without any library, because an SVG is text and
 * because a published page must not load anything from the network.
 *
 * The surface, the ink and the series colours are stated explicitly rather than inherited from the page.
 * A chart without its own background becomes unreadable on one of the two GitHub themes, and the two
 * series colours were checked to stay distinguishable in the common forms of colour blindness.
 */

const WIDTH = 900;
const HEIGHT = 400;
const MARGIN = { top: 44, right: 24, bottom: 48, left: 56 };

const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;

const SURFACE = '#fcfcfb';
const INK = '#0b0b0b';
const INK_SECONDARY = '#52514e';
const GRID = '#e4e3dd';
// Ink for a value that accompanies another one: still dark enough to read, plainly lighter than the ink
// of the value it accompanies.
const INK_MUTED = '#93907b';

export const SERIES_COLOURS = ['#2a78d6', '#eb6834'];

const HORIZONTAL_GRID_LINES = 4;

// The surface left free inside a band, and between two bars of the same band.
const BAND_PADDING = 3;
const BAR_GAP = 2;
const MIN_BAR_WIDTH = 1;

const INTERVAL_ROW_HEIGHT = 64;
const INTERVAL_MARKER_RADIUS = 5;
const INTERVAL_AXIS_MARGIN = 0.5;
const SPREAD_OPACITY = 0.22;

const SCATTER_HEIGHT = 480;
const SCATTER_MARKER_RADIUS = 6;
const SCATTER_LABEL_GAP = 10;
const SCATTER_LABEL_SIZE = 11;
const SCATTER_LABEL_HEIGHT = 12;
// The width a character of the name of a point takes, close enough to keep two names from overlapping.
const SCATTER_CHARACTER_WIDTH = 5.9;
// The share of the width of an axis left free around the points, so that no point sits on the frame.
const SCATTER_AXIS_MARGIN = 0.08;

const SORTED_HEIGHT = 420;
const SORTED_LINE_WIDTH = 2;
// The room above the drawing for the label of a dashed line standing on the horizontal axis.
const SORTED_GUIDE_LABEL_ROOM = 22;

const DIVERGING_ROW_HEIGHT = 26;
const DIVERGING_BAR_HEIGHT = 14;
const NAME_COLUMN_WIDTH = 260;
// The room left to the right of the bars for the counts written beside them.
const VALUE_COLUMN_WIDTH = 140;

// The distances between the labels of an axis that a reader recognises without counting.
const AXIS_STEPS = [1, 2, 5, 10, 20, 50, 100];
const MAX_AXIS_LABELS = 20;

/**
 * Escapes the characters that would end an attribute or start an element.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {string} text The text to place inside the SVG.
 * @return {string} The text with the reserved characters replaced by entities.
 * @throws {never} Throws nothing.
 */
const escape = (text) => text
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

/**
 * Rounds the top of the value axis up to a round number, so that its labels are readable.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {number} highest The largest value that has to fit on the axis.
 * @return {number} The top of the axis.
 * @throws {never} Throws nothing.
 */
const axisTop = (highest) => {
  const step = 10 ** Math.floor(Math.log10(highest));
  return Math.ceil(highest / (step / 2)) * (step / 2);
};

/**
 * Draws a chart of one or more series measured against a shared numeric horizontal axis, the series
 * drawn as bars standing side by side above every position of that axis.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} chart The description of the chart.
 * @param {number[]} chart.xValues The positions on the horizontal axis, in increasing order.
 * @param {Array<{label: string, colour: string, values: number[]}>} chart.series The series to draw.
 * @param {number} chart.xLabelStep The distance between two labelled positions of the horizontal axis.
 * @param {string} chart.xLabel Name of the horizontal axis.
 * @param {string} chart.yLabel Name of the vertical axis.
 * @param {string} chart.description Text read instead of the chart by a screen reader.
 * @return {string} The chart as an SVG element.
 * @throws {Error} When a series does not hold one value per position on the horizontal axis.
 */
export const barsChartSvg = ({ xValues, series, xLabelStep, xLabel, yLabel, description }) => {
  for (const line of series) {
    if (line.values.length !== xValues.length) throw new Error(`The series "${line.label}" holds ${line.values.length} values for ${xValues.length} positions.`);
  }
  // The bands are of equal width, so a position missing from the axis would silently shift the bars
  // that follow it.
  for (const [index, value] of xValues.entries()) {
    if (value !== xValues[0] + index) throw new Error(`The horizontal axis skips from ${xValues[index - 1]} to ${value}.`);
  }

  const first = xValues[0];
  const last = xValues[xValues.length - 1];
  const top = axisTop(Math.max(...series.flatMap((line) => line.values)));

  // Every position of the horizontal axis owns a band of the same width; the bars of that position
  // stand inside it, separated by a gap of the surface colour so that neighbouring bars stay distinct.
  const bandWidth = PLOT_WIDTH / xValues.length;
  const barWidth = Math.max((bandWidth - BAND_PADDING - BAR_GAP * (series.length - 1)) / series.length, MIN_BAR_WIDTH);

  /**
   * Places the middle of a band of the horizontal axis on the drawing.
   * @author Wojciech Krajewski; Claude Opus 5.
   * @date 2026-09-10.
   * @param {number} value The position on the horizontal axis.
   * @return {number} The distance from the left edge of the drawing.
   * @throws {never} Throws nothing.
   */
  const x = (value) => MARGIN.left + (value - first + 0.5) * bandWidth;

  /**
   * Places a value on the drawing.
   * @author Wojciech Krajewski; Claude Opus 5.
   * @date 2026-09-10.
   * @param {number} value The value.
   * @return {number} The distance from the top edge of the drawing.
   * @throws {never} Throws nothing.
   */
  const y = (value) => MARGIN.top + PLOT_HEIGHT - (value / top) * PLOT_HEIGHT;

  const parts = [];

  parts.push(`<rect width="${WIDTH}" height="${HEIGHT}" fill="${SURFACE}"/>`);

  for (let line = 0; line <= HORIZONTAL_GRID_LINES; line += 1) {
    const value = (top * line) / HORIZONTAL_GRID_LINES;
    const position = y(value);
    parts.push(`<line x1="${MARGIN.left}" y1="${position}" x2="${MARGIN.left + PLOT_WIDTH}" y2="${position}" stroke="${GRID}" stroke-width="1"/>`);
    parts.push(`<text x="${MARGIN.left - 10}" y="${position + 4}" text-anchor="end" font-size="12" fill="${INK_SECONDARY}">${value.toFixed(top < 10 ? 1 : 0)}</text>`);
  }

  const firstLabel = Math.ceil(first / xLabelStep) * xLabelStep;
  for (let value = firstLabel; value <= last; value += xLabelStep) {
    parts.push(`<text x="${x(value)}" y="${MARGIN.top + PLOT_HEIGHT + 22}" text-anchor="middle" font-size="12" fill="${INK_SECONDARY}">${value}</text>`);
  }

  parts.push(`<text x="${MARGIN.left + PLOT_WIDTH / 2}" y="${HEIGHT - 8}" text-anchor="middle" font-size="12" fill="${INK_SECONDARY}">${escape(xLabel)}</text>`);
  parts.push(`<text x="${MARGIN.left - 44}" y="${MARGIN.top + PLOT_HEIGHT / 2}" text-anchor="middle" font-size="12" fill="${INK_SECONDARY}" transform="rotate(-90 ${MARGIN.left - 44} ${MARGIN.top + PLOT_HEIGHT / 2})">${escape(yLabel)}</text>`);

  const groupWidth = barWidth * series.length + BAR_GAP * (series.length - 1);
  for (const [order, line] of series.entries()) {
    for (const [index, value] of line.values.entries()) {
      if (value === 0) continue;
      const left = x(xValues[index]) - groupWidth / 2 + order * (barWidth + BAR_GAP);
      const height = (value / top) * PLOT_HEIGHT;
      parts.push(`<rect x="${left.toFixed(1)}" y="${y(value).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${height.toFixed(1)}" fill="${line.colour}"/>`);
    }
  }

  let legendX = MARGIN.left;
  for (const line of series) {
    parts.push(`<rect x="${legendX}" y="14" width="10" height="10" rx="2" fill="${line.colour}"/>`);
    parts.push(`<text x="${legendX + 16}" y="23" font-size="12" fill="${INK}">${escape(line.label)}</text>`);
    legendX += 26 + line.label.length * 6.4;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" font-family="system-ui, sans-serif">
<title>${escape(description)}</title>
${parts.join('\n')}
</svg>
`;
};

/**
 * Draws one estimate per row: a marker at the estimated value and a bar covering the range the true
 * value is expected to fall in. Two estimates whose bars overlap cannot be told apart by the data,
 * and the chart is meant to make exactly that visible.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} chart The description of the chart.
 * Every row may also state the range a single measured value typically falls in. Drawn behind the
 * estimate, and included in the axis, it keeps the drawing honest: an axis fitted to the estimates
 * alone magnifies a small difference until it fills the width of the chart and looks decisive.
 * @param {Array<{label: string, colour: string, value: number, lower: number, upper: number, spreadLower: number|undefined, spreadUpper: number|undefined}>} chart.rows The estimates.
 * @param {string} chart.xLabel Name of the horizontal axis.
 * @param {string} chart.spreadLabel What the pale bar behind each estimate stands for.
 * @param {string} chart.description Text read instead of the chart by a screen reader.
 * @return {string} The chart as an SVG element.
 * @throws {Error} When an estimate does not lie inside its own range.
 */
export const intervalsChartSvg = ({ rows, xLabel, spreadLabel, description }) => {
  for (const row of rows) {
    if (row.value < row.lower || row.value > row.upper) throw new Error(`The estimate of "${row.label}" lies outside its own range.`);
  }

  const height = MARGIN.top + rows.length * INTERVAL_ROW_HEIGHT + MARGIN.bottom;
  const edges = rows.flatMap((row) => [row.lower, row.upper, row.spreadLower, row.spreadUpper].filter((edge) => edge !== undefined));
  const first = Math.min(...edges) - INTERVAL_AXIS_MARGIN;
  const last = Math.max(...edges) + INTERVAL_AXIS_MARGIN;
  const step = AXIS_STEPS.find((candidate) => (last - first) / candidate <= MAX_AXIS_LABELS) ?? AXIS_STEPS[AXIS_STEPS.length - 1];

  /**
   * Places a value of the horizontal axis on the drawing.
   * @author Wojciech Krajewski; Claude Opus 5.
   * @date 2026-09-10.
   * @param {number} value The value.
   * @return {number} The distance from the left edge of the drawing.
   * @throws {never} Throws nothing.
   */
  const x = (value) => MARGIN.left + ((value - first) / (last - first)) * PLOT_WIDTH;

  const parts = [`<rect width="${WIDTH}" height="${height}" fill="${SURFACE}"/>`];

  const firstLabel = Math.ceil(first / step) * step;
  for (let value = firstLabel; value <= last; value += step) {
    parts.push(`<line x1="${x(value).toFixed(1)}" y1="${MARGIN.top - 12}" x2="${x(value).toFixed(1)}" y2="${height - MARGIN.bottom}" stroke="${GRID}" stroke-width="1"/>`);
    parts.push(`<text x="${x(value).toFixed(1)}" y="${height - MARGIN.bottom + 20}" text-anchor="middle" font-size="12" fill="${INK_SECONDARY}">${value}</text>`);
  }
  parts.push(`<text x="${MARGIN.left + PLOT_WIDTH / 2}" y="${height - 8}" text-anchor="middle" font-size="12" fill="${INK_SECONDARY}">${escape(xLabel)}</text>`);

  if (spreadLabel !== undefined) {
    parts.push(`<rect x="${MARGIN.left}" y="14" width="24" height="8" rx="4" fill="${INK_SECONDARY}" opacity="${SPREAD_OPACITY}"/>`);
    parts.push(`<text x="${MARGIN.left + 32}" y="22" font-size="12" fill="${INK_SECONDARY}">${escape(spreadLabel)}</text>`);
  }

  for (const [order, row] of rows.entries()) {
    const middle = MARGIN.top + order * INTERVAL_ROW_HEIGHT + INTERVAL_ROW_HEIGHT / 2;
    parts.push(`<text x="${MARGIN.left}" y="${middle - 6}" font-size="13" fill="${INK}">${escape(row.label)}</text>`);
    if (row.spreadLower !== undefined) {
      parts.push(`<rect x="${x(row.spreadLower).toFixed(1)}" y="${middle + 2}" width="${(x(row.spreadUpper) - x(row.spreadLower)).toFixed(1)}" height="12" rx="6" fill="${row.colour}" opacity="${SPREAD_OPACITY}"/>`);
    }
    parts.push(`<line x1="${x(row.lower).toFixed(1)}" y1="${middle + 8}" x2="${x(row.upper).toFixed(1)}" y2="${middle + 8}" stroke="${row.colour}" stroke-width="4" stroke-linecap="round"/>`);
    parts.push(`<circle cx="${x(row.value).toFixed(1)}" cy="${middle + 8}" r="${INTERVAL_MARKER_RADIUS}" fill="${row.colour}" stroke="${SURFACE}" stroke-width="2"/>`);
    parts.push(`<text x="${x(row.value).toFixed(1)}" y="${middle + 30}" text-anchor="middle" font-size="12" fill="${INK_SECONDARY}">${row.value.toFixed(1)}</text>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" width="${WIDTH}" height="${height}" role="img" font-family="system-ui, sans-serif">
<title>${escape(description)}</title>
${parts.join('\n')}
</svg>
`;
};

/**
 * Draws one row per entry, divided in two: the part being counted, and the rest of the whole. Both
 * carry a colour of their own, because the rest is a result in itself rather than a background.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} chart The description of the chart.
 * @param {Array<{label: string, part: number, whole: number, text: string, note: string}>} chart.entries The rows, in the order they are drawn, each carrying the value written beside its bar and a note written after it in a lighter ink.
 * @param {string[]} chart.colours The colour of the part and the colour of the rest.
 * @param {string} chart.partLabel What the first colour stands for.
 * @param {string} chart.restLabel What the second colour stands for.
 * @param {string} chart.xLabel Name of the horizontal axis.
 * @param {string} chart.description Text read instead of the chart by a screen reader.
 * @return {string} The chart as an SVG element.
 * @throws {Error} When there is nothing to draw, or a part is larger than its whole.
 */
export const partOfWholeChartSvg = ({ entries, colours, partLabel, restLabel, xLabel, description }) => {
  if (entries.length === 0) throw new Error('A chart needs at least one entry.');
  for (const entry of entries) {
    if (entry.part > entry.whole) throw new Error(`The part of "${entry.label}" is larger than its whole.`);
  }

  const height = MARGIN.top + entries.length * DIVERGING_ROW_HEIGHT + MARGIN.bottom;
  const plotLeft = MARGIN.left + NAME_COLUMN_WIDTH;
  const plotWidth = WIDTH - plotLeft - MARGIN.right - VALUE_COLUMN_WIDTH;
  const top = axisTop(Math.max(...entries.map((entry) => entry.whole)));
  const step = AXIS_STEPS.map((candidate) => candidate * 10 ** Math.floor(Math.log10(top)) / 10)
    .find((candidate) => top / candidate <= MAX_AXIS_LABELS) ?? top;

  /**
   * Places a count on the drawing.
   * @author Wojciech Krajewski; Claude Opus 5.
   * @date 2026-09-10.
   * @param {number} value The count.
   * @return {number} The distance from the left edge of the drawing.
   * @throws {never} Throws nothing.
   */
  const x = (value) => plotLeft + (value / top) * plotWidth;

  const parts = [`<rect width="${WIDTH}" height="${height}" fill="${SURFACE}"/>`];

  for (let value = 0; value <= top; value += step) {
    parts.push(`<line x1="${x(value).toFixed(1)}" y1="${MARGIN.top - 10}" x2="${x(value).toFixed(1)}" y2="${height - MARGIN.bottom}" stroke="${GRID}" stroke-width="1"/>`);
    parts.push(`<text x="${x(value).toFixed(1)}" y="${height - MARGIN.bottom + 20}" text-anchor="middle" font-size="12" fill="${INK_SECONDARY}">${value}</text>`);
  }
  parts.push(`<text x="${plotLeft + plotWidth / 2}" y="${height - 8}" text-anchor="middle" font-size="12" fill="${INK_SECONDARY}">${escape(xLabel)}</text>`);

  parts.push(`<rect x="${plotLeft}" y="14" width="10" height="10" rx="2" fill="${colours[0]}"/>`);
  parts.push(`<text x="${plotLeft + 16}" y="23" font-size="12" fill="${INK}">${escape(partLabel)}</text>`);
  const restLegendX = plotLeft + 26 + partLabel.length * 6.4;
  parts.push(`<rect x="${restLegendX}" y="14" width="10" height="10" rx="2" fill="${colours[1]}"/>`);
  parts.push(`<text x="${restLegendX + 16}" y="23" font-size="12" fill="${INK}">${escape(restLabel)}</text>`);

  for (const [order, entry] of entries.entries()) {
    const rowTop = MARGIN.top + order * DIVERGING_ROW_HEIGHT + (DIVERGING_ROW_HEIGHT - DIVERGING_BAR_HEIGHT) / 2;
    const middle = rowTop + DIVERGING_BAR_HEIGHT / 2 + 4;

    parts.push(`<text x="${plotLeft - 12}" y="${middle}" text-anchor="end" font-size="12" fill="${INK}">${escape(entry.label)}</text>`);
    // The rest begins exactly where the part ends: the two together are the whole, and any gap between
    // them would make the row read as less than it is.
    const restLeft = x(entry.part);
    if (entry.whole > entry.part) parts.push(`<rect x="${restLeft.toFixed(1)}" y="${rowTop}" width="${Math.max(x(entry.whole) - restLeft, 1).toFixed(1)}" height="${DIVERGING_BAR_HEIGHT}" fill="${colours[1]}"/>`);
    if (entry.part > 0) parts.push(`<rect x="${plotLeft}" y="${rowTop}" width="${(x(entry.part) - plotLeft).toFixed(1)}" height="${DIVERGING_BAR_HEIGHT}" fill="${colours[0]}"/>`);
    parts.push(`<text x="${(x(entry.whole) + 8).toFixed(1)}" y="${middle}" font-size="12" fill="${INK_SECONDARY}">${escape(entry.text)}<tspan fill="${INK_MUTED}"> ${escape(entry.note)}</tspan></text>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" width="${WIDTH}" height="${height}" role="img" font-family="system-ui, sans-serif">
<title>${escape(description)}</title>
${parts.join('\n')}
</svg>
`;
};

/**
 * Draws one point per entry against two numeric axes, with the name of the entry beside it, and with
 * optional dashed lines across the drawing. Two properties measured at once are what a point carries
 * that a bar cannot: the corner of the drawing a point falls into is the combination of the two, and a
 * corner nothing falls into is itself a finding.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} chart The description of the chart.
 * @param {Array<{label: string, colour: string, x: number, y: number}>} chart.points The points to draw.
 * @param {Array<{axis: string, value: number, label: string}>} chart.guides The dashed lines, each on the axis "x" or "y".
 * @param {string} chart.xLabel Name of the horizontal axis.
 * @param {string} chart.yLabel Name of the vertical axis.
 * @param {string} chart.description Text read instead of the chart by a screen reader.
 * @return {string} The chart as an SVG element.
 * @throws {Error} When there is nothing to draw.
 */
export const scatterChartSvg = ({ points, guides, xLabel, yLabel, description }) => {
  if (points.length === 0) throw new Error('A chart needs at least one point.');

  const plotLeft = MARGIN.left + 24;
  const plotWidth = WIDTH - plotLeft - MARGIN.right;
  const plotHeight = SCATTER_HEIGHT - MARGIN.top - MARGIN.bottom;

  /**
   * Establishes the ends of one axis, wide enough to hold every value drawn on it and rounded outwards
   * to the distance its labels are spaced by.
   * @author Wojciech Krajewski; Claude Opus 5.
   * @date 2026-09-10.
   * @param {number[]} values Every value that has to fit on the axis.
   * @return {{first: number, last: number, step: number}} The ends of the axis and the distance between two labels.
   * @throws {never} Throws nothing.
   */
  const axisOf = (values) => {
    const lowest = Math.min(...values);
    const highest = Math.max(...values);
    const margin = Math.max((highest - lowest) * SCATTER_AXIS_MARGIN, 1);
    const step = AXIS_STEPS.find((candidate) => (highest - lowest + 2 * margin) / candidate <= MAX_AXIS_LABELS) ?? AXIS_STEPS[AXIS_STEPS.length - 1];
    return {
      first: Math.floor((lowest - margin) / step) * step,
      last: Math.ceil((highest + margin) / step) * step,
      step
    };
  };

  const horizontal = axisOf([...points.map((point) => point.x), ...guides.filter((guide) => guide.axis === 'x').map((guide) => guide.value)]);
  const vertical = axisOf([...points.map((point) => point.y), ...guides.filter((guide) => guide.axis === 'y').map((guide) => guide.value)]);

  /**
   * Places a value of the horizontal axis on the drawing.
   * @author Wojciech Krajewski; Claude Opus 5.
   * @date 2026-09-10.
   * @param {number} value The value.
   * @return {number} The distance from the left edge of the drawing.
   * @throws {never} Throws nothing.
   */
  const x = (value) => plotLeft + ((value - horizontal.first) / (horizontal.last - horizontal.first)) * plotWidth;

  /**
   * Places a value of the vertical axis on the drawing.
   * @author Wojciech Krajewski; Claude Opus 5.
   * @date 2026-09-10.
   * @param {number} value The value.
   * @return {number} The distance from the top edge of the drawing.
   * @throws {never} Throws nothing.
   */
  const y = (value) => MARGIN.top + plotHeight - ((value - vertical.first) / (vertical.last - vertical.first)) * plotHeight;

  const parts = [`<rect width="${WIDTH}" height="${SCATTER_HEIGHT}" fill="${SURFACE}"/>`];

  for (let value = horizontal.first; value <= horizontal.last; value += horizontal.step) {
    parts.push(`<line x1="${x(value).toFixed(1)}" y1="${MARGIN.top}" x2="${x(value).toFixed(1)}" y2="${MARGIN.top + plotHeight}" stroke="${GRID}" stroke-width="1"/>`);
    parts.push(`<text x="${x(value).toFixed(1)}" y="${MARGIN.top + plotHeight + 20}" text-anchor="middle" font-size="12" fill="${INK_SECONDARY}">${value}</text>`);
  }
  for (let value = vertical.first; value <= vertical.last; value += vertical.step) {
    parts.push(`<line x1="${plotLeft}" y1="${y(value).toFixed(1)}" x2="${plotLeft + plotWidth}" y2="${y(value).toFixed(1)}" stroke="${GRID}" stroke-width="1"/>`);
    parts.push(`<text x="${plotLeft - 10}" y="${(y(value) + 4).toFixed(1)}" text-anchor="end" font-size="12" fill="${INK_SECONDARY}">${value}</text>`);
  }

  parts.push(`<text x="${plotLeft + plotWidth / 2}" y="${SCATTER_HEIGHT - 8}" text-anchor="middle" font-size="12" fill="${INK_SECONDARY}">${escape(xLabel)}</text>`);
  parts.push(`<text x="${plotLeft - 46}" y="${MARGIN.top + plotHeight / 2}" text-anchor="middle" font-size="12" fill="${INK_SECONDARY}" transform="rotate(-90 ${plotLeft - 46} ${MARGIN.top + plotHeight / 2})">${escape(yLabel)}</text>`);

  for (const guide of guides) {
    if (guide.axis === 'x') {
      parts.push(`<line x1="${x(guide.value).toFixed(1)}" y1="${MARGIN.top}" x2="${x(guide.value).toFixed(1)}" y2="${MARGIN.top + plotHeight}" stroke="${INK_SECONDARY}" stroke-width="1" stroke-dasharray="4 4"/>`);
      parts.push(`<text x="${(x(guide.value) + 6).toFixed(1)}" y="${MARGIN.top - 10}" font-size="12" fill="${INK_SECONDARY}">${escape(guide.label)}</text>`);
      continue;
    }
    parts.push(`<line x1="${plotLeft}" y1="${y(guide.value).toFixed(1)}" x2="${plotLeft + plotWidth}" y2="${y(guide.value).toFixed(1)}" stroke="${INK_SECONDARY}" stroke-width="1" stroke-dasharray="4 4"/>`);
    parts.push(`<text x="${plotLeft + plotWidth}" y="${(y(guide.value) - 6).toFixed(1)}" text-anchor="end" font-size="12" fill="${INK_SECONDARY}">${escape(guide.label)}</text>`);
  }

  // Where a name may be written, in the order the places are tried: beside the point, then above or
  // below it. A name is written in the first place no name written before it occupies.
  const placements = [
    { anchor: 'start', shiftX: SCATTER_LABEL_GAP, shiftY: 4 },
    { anchor: 'end', shiftX: -SCATTER_LABEL_GAP, shiftY: 4 },
    { anchor: 'middle', shiftX: 0, shiftY: -SCATTER_LABEL_GAP - 4 },
    { anchor: 'middle', shiftX: 0, shiftY: SCATTER_LABEL_GAP + 10 },
    { anchor: 'start', shiftX: SCATTER_LABEL_GAP, shiftY: -SCATTER_LABEL_GAP },
    { anchor: 'end', shiftX: -SCATTER_LABEL_GAP, shiftY: -SCATTER_LABEL_GAP },
    { anchor: 'start', shiftX: SCATTER_LABEL_GAP, shiftY: SCATTER_LABEL_GAP + 8 },
    { anchor: 'end', shiftX: -SCATTER_LABEL_GAP, shiftY: SCATTER_LABEL_GAP + 8 },
    { anchor: 'middle', shiftX: 0, shiftY: -SCATTER_LABEL_GAP - 20 },
    { anchor: 'middle', shiftX: 0, shiftY: SCATTER_LABEL_GAP + 26 }
  ];
  const taken = [];

  for (const point of points) {
    const centreX = x(point.x);
    const centreY = y(point.y);
    parts.push(`<circle cx="${centreX.toFixed(1)}" cy="${centreY.toFixed(1)}" r="${SCATTER_MARKER_RADIUS}" fill="${point.colour}" stroke="${SURFACE}" stroke-width="2"/>`);

    const textWidth = point.label.length * SCATTER_CHARACTER_WIDTH;
    const boxes = placements.map((placement) => {
      const start = centreX + placement.shiftX;
      const left = placement.anchor === 'start' ? start : (placement.anchor === 'end' ? start - textWidth : start - textWidth / 2);
      return { placement, left, right: left + textWidth, top: centreY + placement.shiftY - SCATTER_LABEL_HEIGHT, bottom: centreY + placement.shiftY };
    });

    const free = boxes.find((box) => box.left >= plotLeft
      && box.right <= plotLeft + plotWidth
      && !taken.some((other) => box.left < other.right && other.left < box.right && box.top < other.bottom && other.top < box.bottom));

    // A name that fits nowhere is written beside the point regardless, because a point without a name
    // cannot be read at all, while two names close together can still be told apart.
    const chosen = free ?? boxes[0];
    taken.push(chosen);
    parts.push(`<text x="${(centreX + chosen.placement.shiftX).toFixed(1)}" y="${(centreY + chosen.placement.shiftY).toFixed(1)}" text-anchor="${chosen.placement.anchor}" font-size="${SCATTER_LABEL_SIZE}" fill="${INK}">${escape(point.label)}</text>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${SCATTER_HEIGHT}" width="${WIDTH}" height="${SCATTER_HEIGHT}" role="img" font-family="system-ui, sans-serif">
<title>${escape(description)}</title>
${parts.join('\n')}
</svg>
`;
};

/**
 * Draws every answer of a set standing in one row, ordered from the smallest to the largest, the
 * horizontal axis being the place in that row and the vertical axis the value standing there. A value
 * many answers share becomes a flat step as wide as its share of the row, which is what the middle
 * answer is read from: the step the middle of the row falls into is the middle answer.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-15.
 * @param {object} chart The description of the chart.
 * @param {Array<{label: string, colour: string, values: number[]}>} chart.series The sets to draw, the values of each already ordered from the smallest to the largest.
 * @param {Array<{axis: string, value: number, label: string}>} chart.guides The dashed lines, each on the axis "x" or "y".
 * @param {string} chart.xLabel Name of the horizontal axis.
 * @param {string} chart.yLabel Name of the vertical axis.
 * @param {string} chart.description Text read instead of the chart by a screen reader.
 * @return {string} The chart as an SVG element.
 * @throws {Error} When a set holds no values, or its values are not ordered.
 */
export const sortedValuesChartSvg = ({ series, guides, xLabel, yLabel, description }) => {
  for (const set of series) {
    if (set.values.length === 0) throw new Error(`The set "${set.label}" holds no values.`);
    for (const [index, value] of set.values.entries()) {
      if (index > 0 && value < set.values[index - 1]) throw new Error(`The values of "${set.label}" are not ordered.`);
    }
  }

  // The dashed lines of this chart carry their labels above the drawing, so it begins lower than the
  // drawings whose top margin holds the legend alone.
  const plotTop = MARGIN.top + SORTED_GUIDE_LABEL_ROOM;
  const plotHeight = SORTED_HEIGHT - plotTop - MARGIN.bottom;

  const values = series.flatMap((set) => [set.values[0], set.values[set.values.length - 1]]);
  const guideValues = guides.filter((guide) => guide.axis === 'y').map((guide) => guide.value);
  const step = AXIS_STEPS.find((candidate) => (Math.max(...values) - Math.min(...values)) / candidate <= MAX_AXIS_LABELS) ?? AXIS_STEPS[AXIS_STEPS.length - 1];
  const lowest = Math.floor(Math.min(...values, ...guideValues) / step) * step;
  const highest = Math.ceil(Math.max(...values, ...guideValues) / step) * step;

  /**
   * Places a share of the row on the drawing.
   * @author Wojciech Krajewski; Claude Opus 5.
   * @date 2026-09-15.
   * @param {number} share The place in the row, from 0 at its start to 100 at its end.
   * @return {number} The distance from the left edge of the drawing.
   * @throws {never} Throws nothing.
   */
  const x = (share) => MARGIN.left + (share / 100) * PLOT_WIDTH;

  /**
   * Places a value on the drawing.
   * @author Wojciech Krajewski; Claude Opus 5.
   * @date 2026-09-15.
   * @param {number} value The value.
   * @return {number} The distance from the top edge of the drawing.
   * @throws {never} Throws nothing.
   */
  const y = (value) => plotTop + plotHeight - ((value - lowest) / (highest - lowest)) * plotHeight;

  const parts = [`<rect width="${WIDTH}" height="${SORTED_HEIGHT}" fill="${SURFACE}"/>`];

  for (let value = lowest; value <= highest; value += step) {
    parts.push(`<line x1="${MARGIN.left}" y1="${y(value).toFixed(1)}" x2="${MARGIN.left + PLOT_WIDTH}" y2="${y(value).toFixed(1)}" stroke="${GRID}" stroke-width="1"/>`);
    parts.push(`<text x="${MARGIN.left - 10}" y="${(y(value) + 4).toFixed(1)}" text-anchor="end" font-size="12" fill="${INK_SECONDARY}">${value}</text>`);
  }
  for (let share = 0; share <= 100; share += 10) {
    parts.push(`<text x="${x(share).toFixed(1)}" y="${plotTop + plotHeight + 20}" text-anchor="middle" font-size="12" fill="${INK_SECONDARY}">${share}%</text>`);
  }

  parts.push(`<text x="${MARGIN.left + PLOT_WIDTH / 2}" y="${SORTED_HEIGHT - 8}" text-anchor="middle" font-size="12" fill="${INK_SECONDARY}">${escape(xLabel)}</text>`);
  parts.push(`<text x="${MARGIN.left - 44}" y="${plotTop + plotHeight / 2}" text-anchor="middle" font-size="12" fill="${INK_SECONDARY}" transform="rotate(-90 ${MARGIN.left - 44} ${plotTop + plotHeight / 2})">${escape(yLabel)}</text>`);

  for (const guide of guides) {
    if (guide.axis === 'x') {
      parts.push(`<line x1="${x(guide.value).toFixed(1)}" y1="${plotTop}" x2="${x(guide.value).toFixed(1)}" y2="${plotTop + plotHeight}" stroke="${INK}" stroke-width="1" stroke-dasharray="4 4"/>`);
      parts.push(`<text x="${x(guide.value).toFixed(1)}" y="${plotTop - 10}" text-anchor="middle" font-size="12" fill="${INK}">${escape(guide.label)}</text>`);
      continue;
    }
    parts.push(`<line x1="${MARGIN.left}" y1="${y(guide.value).toFixed(1)}" x2="${MARGIN.left + PLOT_WIDTH}" y2="${y(guide.value).toFixed(1)}" stroke="${INK}" stroke-width="1" stroke-dasharray="4 4"/>`);
    parts.push(`<text x="${MARGIN.left + PLOT_WIDTH}" y="${(y(guide.value) - 6).toFixed(1)}" text-anchor="end" font-size="12" fill="${INK}">${escape(guide.label)}</text>`);
  }

  for (const set of series) {
    // Equal values next to each other are drawn as one step rather than as one point each, which keeps
    // the drawing short and is also what the reader is meant to see.
    const corners = [];
    for (const [index, value] of set.values.entries()) {
      if (index > 0 && value === set.values[index - 1]) continue;
      const share = (index / set.values.length) * 100;
      // The step rises at the place the new value begins, so the corner below it repeats the value the
      // previous step ended on.
      if (index > 0) corners.push([share, set.values[index - 1]]);
      corners.push([share, value]);
    }
    corners.push([100, set.values.at(-1)]);
    const line = corners.map(([share, value]) => `${x(share).toFixed(1)},${y(value).toFixed(1)}`);
    parts.push(`<polyline points="${line.join(' ')}" fill="none" stroke="${set.colour}" stroke-width="${SORTED_LINE_WIDTH}" stroke-linejoin="round"/>`);
  }

  let legendX = MARGIN.left;
  for (const set of series) {
    parts.push(`<rect x="${legendX}" y="14" width="10" height="10" rx="2" fill="${set.colour}"/>`);
    parts.push(`<text x="${legendX + 16}" y="23" font-size="12" fill="${INK}">${escape(set.label)}</text>`);
    legendX += 26 + set.label.length * 6.4;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${SORTED_HEIGHT}" width="${WIDTH}" height="${SORTED_HEIGHT}" role="img" font-family="system-ui, sans-serif">
<title>${escape(description)}</title>
${parts.join('\n')}
</svg>
`;
};

/**
 * Draws one bar per entry, all of them starting at zero, so that the direction of a value is read from
 * the side the bar falls on and its size from the length of the bar. The name of the entry stands to
 * the left of the drawing, which leaves room for the long names of the models.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {object} chart The description of the chart.
 * @param {Array<{label: string, value: number}>} chart.entries The values, in the order they are drawn.
 * @param {string[]} chart.colours The colour of a value below zero and of a value above it.
 * @param {string} chart.xLabel Name of the horizontal axis.
 * @param {string} chart.description Text read instead of the chart by a screen reader.
 * @return {string} The chart as an SVG element.
 * @throws {Error} When there is nothing to draw.
 */
export const divergingBarsChartSvg = ({ entries, colours, xLabel, description }) => {
  if (entries.length === 0) throw new Error('A chart needs at least one entry.');

  const height = MARGIN.top + entries.length * DIVERGING_ROW_HEIGHT + MARGIN.bottom;
  const plotLeft = MARGIN.left + NAME_COLUMN_WIDTH;
  const plotWidth = WIDTH - plotLeft - MARGIN.right;

  const widest = Math.max(...entries.map((entry) => Math.abs(entry.value)));
  const reach = axisTop(widest);
  const step = AXIS_STEPS.find((candidate) => (2 * reach) / candidate <= MAX_AXIS_LABELS) ?? AXIS_STEPS[AXIS_STEPS.length - 1];

  /**
   * Places a value on the drawing.
   * @author Wojciech Krajewski; Claude Opus 5.
   * @date 2026-09-10.
   * @param {number} value The value.
   * @return {number} The distance from the left edge of the drawing.
   * @throws {never} Throws nothing.
   */
  const x = (value) => plotLeft + ((value + reach) / (2 * reach)) * plotWidth;

  const parts = [`<rect width="${WIDTH}" height="${height}" fill="${SURFACE}"/>`];

  for (let value = -reach; value <= reach; value += step) {
    if (value === 0) continue;
    parts.push(`<line x1="${x(value).toFixed(1)}" y1="${MARGIN.top - 10}" x2="${x(value).toFixed(1)}" y2="${height - MARGIN.bottom}" stroke="${GRID}" stroke-width="1"/>`);
    parts.push(`<text x="${x(value).toFixed(1)}" y="${height - MARGIN.bottom + 20}" text-anchor="middle" font-size="12" fill="${INK_SECONDARY}">${value}</text>`);
  }

  // Zero is the line every bar is measured from, so it carries a label of its own even when the step
  // of the axis passes it by.
  parts.push(`<line x1="${x(0).toFixed(1)}" y1="${MARGIN.top - 10}" x2="${x(0).toFixed(1)}" y2="${height - MARGIN.bottom}" stroke="${INK_SECONDARY}" stroke-width="1"/>`);
  parts.push(`<text x="${x(0).toFixed(1)}" y="${height - MARGIN.bottom + 20}" text-anchor="middle" font-size="12" font-weight="600" fill="${INK}">0</text>`);
  parts.push(`<text x="${plotLeft + plotWidth / 2}" y="${height - 8}" text-anchor="middle" font-size="12" fill="${INK_SECONDARY}">${escape(xLabel)}</text>`);

  for (const [order, entry] of entries.entries()) {
    const top = MARGIN.top + order * DIVERGING_ROW_HEIGHT + (DIVERGING_ROW_HEIGHT - DIVERGING_BAR_HEIGHT) / 2;
    const middle = top + DIVERGING_BAR_HEIGHT / 2 + 4;
    const left = Math.min(x(0), x(entry.value));
    const width = Math.abs(x(entry.value) - x(0));

    parts.push(`<text x="${plotLeft - 12}" y="${middle}" text-anchor="end" font-size="12" fill="${INK}">${escape(entry.label)}</text>`);
    parts.push(`<rect x="${left.toFixed(1)}" y="${top}" width="${Math.max(width, 1).toFixed(1)}" height="${DIVERGING_BAR_HEIGHT}" fill="${entry.value < 0 ? colours[0] : colours[1]}"/>`);
    parts.push(`<text x="${(entry.value < 0 ? left - 8 : left + width + 8).toFixed(1)}" y="${middle}" text-anchor="${entry.value < 0 ? 'end' : 'start'}" font-size="12" fill="${INK_SECONDARY}">${entry.value.toFixed(1)}</text>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" width="${WIDTH}" height="${height}" role="img" font-family="system-ui, sans-serif">
<title>${escape(description)}</title>
${parts.join('\n')}
</svg>
`;
};
