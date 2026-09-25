/**
 * The stamp used in the names of generated files.
 */

/**
 * Builds a stamp of the current moment in the form RRRRMMDD_HHMM.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @return {string} The stamp.
 * @throws {never} Throws nothing.
 */
export const fileStamp = () => {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '_',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0')
  ].join('');
};
