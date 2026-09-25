/**
 * Turns the finished Markdown document into a standalone HTML page.
 * The page carries its own style, so it looks the same when opened from disk and when served by
 * GitHub Pages. Nothing is loaded from the network.
 */

import { marked } from 'marked';
import { anchor } from './anchor.js';

const STYLE = `
  :root {
    color-scheme: light dark;
    --surface: #fcfcfb;
    --surface-raised: #f4f3ef;
    --text-primary: #0b0b0b;
    --text-secondary: #52514e;
    --text-muted: #898781;
    --rule: #d9d8d1;
    --rule-strong: #b8b7ae;
    --accent: #2a78d6;
    --link-ink: #073473;
    --link-underline: #9cc4ef;
    --negative: #b3261e;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --surface: #1a1a19;
      --surface-raised: #232322;
      --text-primary: #ffffff;
      --text-secondary: #c3c2b7;
      --text-muted: #898781;
      --rule: #34343180;
      --rule-strong: #4a4a46;
      --accent: #3987e5;
      --link-ink: #eaf1fa;
      --link-underline: #4c7fbd;
      --negative: #f2837a;
    }
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    padding: 0;
    background: var(--surface);
    color: var(--text-primary);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    font-size: 16px;
    line-height: 1.65;
  }

  main {
    max-width: 62rem;
    margin: 0 auto;
    padding: 3rem 1.5rem 6rem;
  }

  h1 {
    font-size: 2rem;
    line-height: 1.2;
    margin: 0 0 0.5rem;
    letter-spacing: -0.01em;
  }

  .subtitle {
    font-size: 1.15rem;
    color: var(--text-secondary);
    margin: 0 0 2rem;
  }

  h2 {
    font-size: 1.6rem;
    line-height: 1.2;
    margin: 4rem 0 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid var(--rule-strong);
    letter-spacing: -0.01em;
  }

  /* The levels below the section are numbered, because a reader who cannot see at a glance which
     heading belongs under which loses the structure of a long page. */
  h3 {
    font-size: 1.25rem;
    line-height: 1.3;
    margin: 3.5rem 0 1rem;
    padding-top: 1.25rem;
    border-top: 3px solid var(--accent);
    color: var(--text-primary);
    letter-spacing: -0.005em;
  }

  h4 {
    font-size: 1.05rem;
    margin: 2rem 0 0.6rem;
    color: var(--text-primary);
  }

  h5 {
    font-size: 0.95rem;
    margin: 1.5rem 0 0.5rem;
    color: var(--text-secondary);
  }

  /* The number the heading opens with, coloured so that the level of a heading is visible before it
     is read. */
  .ordinal {
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }

  .negative { color: var(--negative); }

  /* The name of the author stands above the title, where a reader looks for it. */
  .byline {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 1.75rem;
  }
  .byline span {
    display: block;
    font-size: 0.8rem;
    font-weight: 400;
    color: var(--text-muted);
  }

  /* The identifier that names the article in the terminal, kept small: it is a handle, not a heading. */
  .article-id {
    font-family: ui-monospace, "Cascadia Code", "Source Code Pro", monospace;
    font-size: 0.75rem;
    color: var(--text-muted);
    margin: -0.5rem 0 1.5rem;
  }

  /* Only the copy kept for the author carries this banner, so an article still being written cannot be
     mistaken for one already on the published page. */
  .draft-banner {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--negative);
    border: 2px solid var(--negative);
    border-radius: 4px;
    padding: 0.5rem 0.9rem;
    margin: 0 0 1.5rem;
  }

  /* The name of a table or of a chart, so the text can point at one of them by name. */
  .figure-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-secondary);
    /* Set a little inside the left edge of the text, so the name reads as a label on the drawing
       rather than as another line of the paragraph above it. */
    margin: 2rem 0 0.5rem 0.4rem;
    /* Shifted down without taking part in the layout, so the drawing below it stays where it is. */
    position: relative;
    top: 0.35rem;
  }

  /* The drawing belongs to the name above it, so the two stand closer together than the name stands to
     the text before it. */
  .figure-title + table,
  .figure-title + svg {
    margin-top: 0.4rem;
  }

  .in-preparation {
    color: var(--text-muted);
    font-style: italic;
    margin: -0.5rem 0 2.5rem;
  }

  p { margin: 0 0 1rem; }

  /* The word stays almost as dark as the text around it, so that a page full of links still reads as
     text; the colour that marks it as a link sits in the underline. */
  a {
    color: var(--link-ink);
    text-decoration: underline;
    text-decoration-color: var(--link-underline);
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
  }
  a:hover { color: var(--accent); }

  em { color: var(--text-secondary); }

  blockquote {
    margin: 1rem 0;
    padding: 0.75rem 1.25rem;
    border-left: 3px solid var(--rule-strong);
    background: var(--surface-raised);
    color: var(--text-secondary);
  }
  blockquote p:last-child { margin-bottom: 0; }

  code {
    font-family: ui-monospace, "Cascadia Code", "Source Code Pro", monospace;
    font-size: 0.9em;
    background: var(--surface-raised);
    padding: 0.1em 0.35em;
    border-radius: 3px;
  }

  ul { margin: 0 0 1rem; padding-left: 1.4rem; }
  li { margin-bottom: 0.25rem; }

  /* The table is the reason this page exists: a full grid, numbers aligned on their place value. */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1.25rem 0 2rem;
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
  }

  th, td {
    border: 1px solid var(--rule);
    padding: 0.4rem 0.7rem;
  }

  th {
    background: var(--surface-raised);
    font-weight: 600;
    text-align: left;
    color: var(--text-secondary);
    vertical-align: bottom;
  }

  td[align="right"], th[align="right"] { text-align: right; }

  tbody tr:hover { background: var(--surface-raised); }

  img { max-width: 100%; height: auto; }

  svg {
    display: block;
    max-width: 100%;
    height: auto;
    margin: 2rem 0;
    border: 1px solid var(--rule);
    border-radius: 4px;
  }
  @media (max-width: 40rem) {
    main { padding: 2rem 1rem 4rem; }
    table { font-size: 0.8rem; }
  }
`;

// A heading preceded by the identifier marker of an article, as Markdown leaves it in the page.
const DECLARED_HEADING_PATTERN = /<!--\s*id:\s*([a-z-]+)\s*-->\s*<h([23])>(.*?)<\/h\2>/g;

// Any remaining second-level or third-level heading.
const PLAIN_HEADING_PATTERN = /<h([23])>(.*?)<\/h\1>/g;

// The number a numbered heading opens with, for example "3." or "3.2".
const ORDINAL_PATTERN = /^(\d+(?:\.\d+)*\.?)\s+/;

/**
 * Sets apart the number a heading opens with, so that it can be coloured.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {string} text Text of the heading.
 * @return {string} The text with the number wrapped, or unchanged when the heading has no number.
 * @throws {never} Throws nothing.
 */
const withOrdinal = (text) => text.replace(ORDINAL_PATTERN, (match, ordinal) => `<span class="ordinal">${ordinal}</span> `);

/**
 * Gives every second-level and third-level heading an identifier, so that the table of contents leads
 * somewhere. An article states its own identifier in a marker above its heading, and that identifier is
 * kept, because the terminal refers to the same article by the same name.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {string} html The page body as produced from the Markdown document.
 * @return {string} The body with identifiers on the headings.
 * @throws {never} Throws nothing.
 */
const withHeadingIds = (html) => html
  .replace(DECLARED_HEADING_PATTERN, (match, id, level, text) => `<h${level} id="${id}">${withOrdinal(text)}</h${level}>`)
  .replace(PLAIN_HEADING_PATTERN, (match, level, text) => `<h${level} id="${anchor(text)}">${withOrdinal(text)}</h${level}>`);

/**
 * Wraps the Markdown document in a complete HTML page.
 * @author Wojciech Krajewski; Claude Opus 5.
 * @date 2026-09-10.
 * @param {string} markdown The finished Markdown document.
 * @param {string} title Text of the browser tab and of the page metadata.
 * @return {string} The complete HTML page.
 * @throws {never} Throws nothing.
 */
export const renderHtml = (markdown, title) => `<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<header class="byline">Wojciech Krajewski<span><a href="mailto:wojckr@gmail.com">wojckr@gmail.com</a></span><span>Wrocław, Poland · September 15th, 2026</span><span>Written with the help of Claude Opus 5 (medium effort) and Claude Fable 5.1 (medium effort)</span></header>
${withHeadingIds(marked.parse(markdown))}
</main>
</body>
</html>
`;
