# Does the Example in Your Prompt Leak Into the Answer?

Measuring Anchoring in Free Language Models

Two prompts, identical but for a fragment that looks like it could not matter: one ends with
`(np. 1800)`, an example of the form the answer should take. Does that fragment change
the answer? 2000 answers from 15 freely available models say whether it does.
They also show how the models themselves behave, and that part is no less interesting.

## [Read the report](https://wojckr.github.io/llm-tests)

The charts are drawn as SVG elements, which a browser shows and a Markdown file of a repository does not,
so the report is published as a page rather than as this file.

`data/` holds every answer collected, `src/` the scripts that collected and read them, and `docs/` the published page.
