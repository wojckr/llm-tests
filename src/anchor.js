/**
 * The rule that turns a heading into the identifier used to link to it. The table of contents and the
 * headings themselves both need it, and they have to agree, so it is written once here.
 */

/**
 * Turns a heading into the anchor GitHub gives it: lowercase, punctuation dropped, spaces to hyphens.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {string} heading Text of the heading.
 * @return {string} The anchor, without the leading hash sign.
 * @throws {never} Throws nothing.
 */
export const anchor = (heading) => heading
  .toLowerCase()
  .replace(/[^\p{Letter}\p{Number} -]/gu, '')
  .trim()
  .replaceAll(' ', '-');
