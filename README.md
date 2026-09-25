# Does the Example in Your Prompt Leak Into the Answer?

<p class="subtitle">Measuring Anchoring in Free Language Models</p>

Two prompts, identical but for a fragment that looks like it could not matter: one ends with
`(np. 1800)`, an example of the form the answer should take. Does that fragment change
the answer? 2000 answers from 15 freely available models say whether it does.
They also show how the models themselves behave, and that part is no less interesting.

## Contents

- [Where the question comes from](#where-the-question-comes-from)
- [Why these models](#why-these-models)
- [The two prompts](#the-two-prompts)
- [The hypothesis](#the-hypothesis)
- [Limitations of the design](#limitations-of-the-design)
- [What emerged along the way](#what-emerged-along-the-way)
- [Articles](#articles)
  - [1. Variants: two prompts, one example apart](#variants)
  - [2. Model shift: asking each model to disagree with itself](#model-shift)
  - [3. A rounded 1800 example in the prompt shifted the last digit in the answer towards zero](#last-digit)
  - [4. Accuracy: which models land near the documented year, and which merely look like it](#accuracy)
  - [5. The example gathered the answers onto one year rather than moving them earlier](#gathered)
  - [6. Why two different sets of answers end on exactly the same middle answer](#same-middle)
  - [7. Repeatability: the same question asked again, and what comes back](#repeatability)
  - [8. Concentration: does the example make a model repeat one year more often?](#concentration)
  - [9. Insistence: a repeated answer looks like confidence, whether or not the year is right](#insistence)
  - [10. Format: does showing an example make a model answer in the requested form?](#format)
  - [11. Usability: whether a year comes back at all](#usability)
  - [12. Filter: which answers the results of this experiment rest on](#filter)
  - [13. Disagreement: the model chosen matters more than the prompt written](#disagreement)
  - [14. Automation bias: when a bare year from an LLM outweighs a person who is right](#automation-bias)
- [The models in the pool](#the-models-in-the-pool)
- [Running it yourself](#running-it-yourself)

## Where the question comes from

[Amos Tversky](https://en.wikipedia.org/wiki/Amos_Tversky) and
[Daniel Kahneman](https://en.wikipedia.org/wiki/Daniel_Kahneman) described in 1974 an effect they
called [anchoring](https://en.wikipedia.org/wiki/Anchoring_effect): when people
estimate a quantity, a number shown to them beforehand pulls the estimate towards itself, even when
that number is plainly irrelevant to the question. Their participants spun a wheel of fortune and
then guessed what share of the member states of the United Nations were African. The wheel changed
the guesses.

A [large language model](https://developers.google.com/machine-learning/glossary?hl=en#large-language-model) produces numbers by a different mechanism than a person does, but it learns from data that is, for the most part, created by people. The question this experiment asks is narrow and testable: does a number placed in the [prompt](https://developers.google.com/machine-learning/glossary?hl=en#prompt) as a mere illustration of the requested format move the answer towards itself?

## Why these models

The [models](https://developers.google.com/machine-learning/glossary?hl=en#model) were chosen because they cost nothing. That is the whole reason: 2000 answers were collected over five days, and at no cost per request their number was not limited by a budget. What models the pool held was not a consideration at the time, and was not known. Taking a sample from wherever it happens to be easy to reach is called [convenience sampling](https://developers.google.com/machine-learning/glossary?hl=en#convenience-sampling), and that is what the pool is.

Every request goes to `openrouter/free`. OpenRouter describes it as follows:

> The simplest way to get free inference. openrouter/free is a router that selects free models at random from the models available on OpenRouter. The router smartly filters for models that support features needed for your request such as image understanding, tool calling, structured outputs and more.

[Machine learning](https://developers.google.com/machine-learning/glossary?hl=en#machine-learning) reserves the name [model router](https://developers.google.com/machine-learning/glossary?hl=en#model-router) for an algorithm determining the model best suited to a given input. Whether the routing here works that way cannot be told from the description, which calls the selection random and the filtering smart in the same breath. How the choice is actually made is not published. This has one clear advantage and one clear cost.

The advantage is **breadth**. A single prompt reaches 17 different models from different makers, so what the answers show is not the habit of one model but something many models share; 15 of them returned a year in the requested form at least once.

The cost is **control**. Which model answers a request is decided by the router, not by the experiment, so no model can be asked on purpose and no model can be asked equally often. The mixture of models behind the answers is therefore whatever the router produced — and, since models differ in how often they answer in the requested form, the two versions of the prompt do not end up with the same mixture.

A remark on how models are chosen belongs beside all that. Judging by what people write about models in public comments, the choice often rests neither on a model being better nor on what it does against what it costs, but on the model being new, or on its maker having a name that is known. That OpenRouter keeps a pool named "free" may point the same way, by the ordinary working of supply and demand: an offer takes the shape of what is asked for. A heading that gathers models by price and by nothing else suggests that some people do ask by price — not "good but cheap", and not "good whatever the price", but "free, whatever the quality and whatever the model was built to do".

How widely such a way of choosing holds, this page cannot say. Price was the criterion here: the pool was taken because it costs nothing, and not because of what stood in it. Outside this experiment the author chooses on other grounds as well, with no idea what to expect from a model and several things weighed at once. Once made, the choice feels reasonable enough, although at the moment of making it nothing supported it: the answers that would say whether the model suits the task arrive only afterwards. Daniel Kahneman named the mechanism: faced with a hard question, a person answers an easier one in its place — [attribute substitution](https://en.wikipedia.org/wiki/Attribute_substitution).

## The two prompts

Both prompts are in Polish. They are the same except for the ending: one closes with an example of the answer, `(np. 1800)`, and the other does not. Their wording is the stimulus under study, so it is quoted here exactly as sent.

With the example:

> Oszacuj datę urodzin mojego pradziadka Stanisława Krajewskiego, który zmarł w 1936 roku. Zwróć tylko liczbę-rok, nic więcej (np. 1800).

Without the example:

> Oszacuj datę urodzin mojego pradziadka Stanisława Krajewskiego, który zmarł w 1936 roku. Zwróć tylko liczbę-rok, nic więcej.

In English: *Estimate the birth year of my great-grandfather Stanisław Krajewski, who died in 1936. Return only the year, nothing else (e.g. 1800).*

Machine learning has names for prompts of this kind. The prompt without the example is [zero-shot prompting](https://developers.google.com/machine-learning/glossary?hl=en#zero-shot-prompting): the model is asked to answer with no worked case in front of it. The other is not quite [one-shot prompting](https://developers.google.com/machine-learning/glossary?hl=en#one-shot-prompting), because a one-shot prompt carries an example of a question together with its answer, while this one shows only the shape the answer should take. What is measured here is therefore narrower than the difference between those two named kinds.

The task asks for an estimate. That is not the same as asking for something nobody could ever find: the person named is private, but Polish cemetery registries are published openly, some of them carrying the dates read off the gravestone. One such registry holds [the grave of Stanisław Krajewski](https://www.parafiaszewna.pl/cmentarz/szewna/grave/detail/1929482), and 1880, the year the articles measure the answers against, is the birth year recorded there. The models answered without access to any search tool, and what any one of them was trained on is not known here. This experiment therefore observes what the models return, and makes no claim about where it comes from.

## The hypothesis

The hypothesis: **Adding `(np. 1800)` to the prompt moves the answers towards 1800.**

The effect is described throughout as a shift of the answers towards a value, not as the answers being fixed at that value. The hypothesis is not that a model replies 1800, but that the middle of its answers moves in that direction.

## Limitations of the design

It is not a study, and it does not pretend to the methods of one: there is no pre-registered design, no control arm with a non-round example, and no random sample of models — the router chooses them. It is an engineer's measurement, taken with the means at hand and reported with the uncertainty it carries. Where the answers do not support a conclusion, the text says so instead of reaching for one.

One thing was fixed before any answer arrived: how many answers each version of the prompt would receive. Collecting stopped when that number was reached, not when the result began to look convincing. The rule is a constant in the collecting script rather than a promise made afterwards, and it is the one guard the design has against [experimenter's bias](https://developers.google.com/machine-learning/glossary?hl=en#experimenters-bias) — the form of confirmation bias in which data keeps being gathered until a hypothesis held beforehand comes out true.

The most serious weakness is the mixture of models — an instance of [selection bias](https://developers.google.com/machine-learning/glossary?hl=en#selection-bias), the error that arises when the cases observed differ systematically from the cases not observed. The router decides which model answers a request, and models differ in how often they answer in the requested form, so the two versions of the prompt do not end up with the same mixture of models behind their answers. A difference between the two groups of answers can then be a difference between the models rather than an effect of the example, and no arithmetic on the two totals can separate the two. The experiment does not remove the weakness; it works around it by also comparing every model only with itself, so that the same model stands on both sides of the subtraction and the mixture cannot matter.

Two things about that bias are worth naming. The first is **coverage bias**: the pool holds only models offered at no cost, so what the answers show holds for free models and not for language models at large. The second has the shape of **non-response bias** without its usual cause. The glossary describes people who opt out of a survey, whereas here every model was asked and every model replied; what removed a model from the results was its inability to reply in the requested form. Models fail that requirement at very different rates, so they drop out of the picture without ever declining to answer.

A third named form, **sampling bias**, was largely avoided, and avoided by doing nothing rather than by design. No model inside the pool was ever chosen on purpose: every request went to the same router, and the router reports that it picks at random among the free models available. Nothing in the collection favoured one free model over another.

One thing the answers are not evidence about is [hallucination](https://developers.google.com/machine-learning/glossary?hl=en#hallucination), also called [confabulation](https://developers.google.com/machine-learning/glossary?hl=en#confabulation) — a model stating as fact something it has made up. The recorded year is public and has been for years, but the models answered without a search tool, and what any of them met in [training](https://developers.google.com/machine-learning/glossary?hl=en#training) is not known here. The prompt also asks for an estimate rather than for a fact. A year far from the record is therefore a poor estimate, which is a different thing from a fabrication.

The standard errors printed throughout rest on an assumption the collection does not meet. They are computed as if the answers were [independently and identically distributed](https://developers.google.com/machine-learning/glossary?hl=en#independently-and-identically-distributed-i.i.d) — drawn from one unchanging distribution, each draw independent of the ones before it. Here the router puts a different model behind one answer than behind the next, and the pool itself changes from day to day, so neither half of that assumption holds exactly. The figures are therefore a guide to how firm a difference is, not an exact probability.

At best this is a starting point for work done properly, or an amateur echo of results that researchers established long ago under conditions this experiment cannot match. Anyone who takes a number from here and acts on it as though it settled something has misread the page.

## What emerged along the way

Besides the main question, other questions appeared while the answers were being collected, and they
turned out to be no less interesting. Some of them rest on stronger evidence than the hypothesis the
experiment was built to test, and one of them needs no reference value at all. They are taken up in
the articles below.

## Articles

Each article below stands on its own and carries an identifier. The same identifier prints the
statistics behind that article in the terminal, with `npm run stats --id=<identifier>`.

<!-- id: variants -->

### 1. Variants: two prompts, one example apart

<p class="article-id">article id: variants</p>

In 1974 [Amos Tversky](https://en.wikipedia.org/wiki/Amos_Tversky) and
[Daniel Kahneman](https://en.wikipedia.org/wiki/Daniel_Kahneman) described what happens when a person is shown a number before estimating an unrelated quantity: the estimate drifts towards it, an effect they called [anchoring](https://en.wikipedia.org/wiki/Anchoring_effect). The number carries no information, the people are told so, and the estimate drifts anyway.

A [language model](https://developers.google.com/machine-learning/glossary?hl=en#language-model) can be shown a number in the same accidental way. A [prompt](https://developers.google.com/machine-learning/glossary?hl=en#prompt) that asks for a year and ends with an example of the expected form — `(np. 1800)`, Polish for "e.g. 1800" — has supplied a number nobody meant as a hint. It is there to show the form the answer should take, not the value it should have, and the person writing the prompt chose it without a thought — which is precisely what makes it worth testing.

The prompt used here asks, in Polish, for an estimate of the birth year of the author's great-grandfather, who died in 1936, and for the year alone in return. It went to the [free models of the OpenRouter service](https://openrouter.ai/openrouter/free) in two versions differing by that one parenthesis and nothing else, sent alternately. Answers that were not exactly four digits were rejected; 2000 answers remained.

<p class="figure-title">Table 1. The answers to each prompt variant, summarised</p>

| prompt | answers | mean | median | standard deviation | earliest year | latest year |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| answers to the prompt ending with "(np. 1800)" | 1000 | 1870.8 | 1870.0 | 6.8 | 1830 | 1904 |
| answers to the prompt without that example | 1000 | 1871.9 | 1870.0 | 8.0 | 1850 | 1915 |

In Table 1 the two means lie **1.15** years apart. The earliest and the latest year in the same table stand **decades** apart. The man died in 1936, so every answer also states an age. The 2000 answers give ages from 21 to 106 years. **No model made a single mistake here: not one of the 2000 answers is an impossible age.**

<p class="figure-title">Chart 1. The mean of each variant, drawn against the spread of the answers behind it</p>

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 220" width="900" height="220" role="img" font-family="system-ui, sans-serif">
<title>The mean answer of each prompt variant, with the range the true mean is expected to fall in.</title>
<rect width="900" height="220" fill="#fcfcfb"/>
<line x1="82.9" y1="32" x2="82.9" y2="172" stroke="#e4e3dd" stroke-width="1"/>
<text x="82.9" y="192" text-anchor="middle" font-size="12" fill="#52514e">1864</text>
<line x1="131.2" y1="32" x2="131.2" y2="172" stroke="#e4e3dd" stroke-width="1"/>
<text x="131.2" y="192" text-anchor="middle" font-size="12" fill="#52514e">1865</text>
<line x1="179.6" y1="32" x2="179.6" y2="172" stroke="#e4e3dd" stroke-width="1"/>
<text x="179.6" y="192" text-anchor="middle" font-size="12" fill="#52514e">1866</text>
<line x1="228.0" y1="32" x2="228.0" y2="172" stroke="#e4e3dd" stroke-width="1"/>
<text x="228.0" y="192" text-anchor="middle" font-size="12" fill="#52514e">1867</text>
<line x1="276.3" y1="32" x2="276.3" y2="172" stroke="#e4e3dd" stroke-width="1"/>
<text x="276.3" y="192" text-anchor="middle" font-size="12" fill="#52514e">1868</text>
<line x1="324.7" y1="32" x2="324.7" y2="172" stroke="#e4e3dd" stroke-width="1"/>
<text x="324.7" y="192" text-anchor="middle" font-size="12" fill="#52514e">1869</text>
<line x1="373.1" y1="32" x2="373.1" y2="172" stroke="#e4e3dd" stroke-width="1"/>
<text x="373.1" y="192" text-anchor="middle" font-size="12" fill="#52514e">1870</text>
<line x1="421.4" y1="32" x2="421.4" y2="172" stroke="#e4e3dd" stroke-width="1"/>
<text x="421.4" y="192" text-anchor="middle" font-size="12" fill="#52514e">1871</text>
<line x1="469.8" y1="32" x2="469.8" y2="172" stroke="#e4e3dd" stroke-width="1"/>
<text x="469.8" y="192" text-anchor="middle" font-size="12" fill="#52514e">1872</text>
<line x1="518.2" y1="32" x2="518.2" y2="172" stroke="#e4e3dd" stroke-width="1"/>
<text x="518.2" y="192" text-anchor="middle" font-size="12" fill="#52514e">1873</text>
<line x1="566.5" y1="32" x2="566.5" y2="172" stroke="#e4e3dd" stroke-width="1"/>
<text x="566.5" y="192" text-anchor="middle" font-size="12" fill="#52514e">1874</text>
<line x1="614.9" y1="32" x2="614.9" y2="172" stroke="#e4e3dd" stroke-width="1"/>
<text x="614.9" y="192" text-anchor="middle" font-size="12" fill="#52514e">1875</text>
<line x1="663.3" y1="32" x2="663.3" y2="172" stroke="#e4e3dd" stroke-width="1"/>
<text x="663.3" y="192" text-anchor="middle" font-size="12" fill="#52514e">1876</text>
<line x1="711.6" y1="32" x2="711.6" y2="172" stroke="#e4e3dd" stroke-width="1"/>
<text x="711.6" y="192" text-anchor="middle" font-size="12" fill="#52514e">1877</text>
<line x1="760.0" y1="32" x2="760.0" y2="172" stroke="#e4e3dd" stroke-width="1"/>
<text x="760.0" y="192" text-anchor="middle" font-size="12" fill="#52514e">1878</text>
<line x1="808.4" y1="32" x2="808.4" y2="172" stroke="#e4e3dd" stroke-width="1"/>
<text x="808.4" y="192" text-anchor="middle" font-size="12" fill="#52514e">1879</text>
<line x1="856.7" y1="32" x2="856.7" y2="172" stroke="#e4e3dd" stroke-width="1"/>
<text x="856.7" y="192" text-anchor="middle" font-size="12" fill="#52514e">1880</text>
<text x="466" y="212" text-anchor="middle" font-size="12" fill="#52514e">year, with the mean of the answers and the range its true value is expected to fall in</text>
<rect x="56" y="14" width="24" height="8" rx="4" fill="#52514e" opacity="0.22"/>
<text x="88" y="22" font-size="12" fill="#52514e">the range a single answer typically falls in</text>
<text x="56" y="70" font-size="13" fill="#0b0b0b">answers to the prompt ending with &quot;(np. 1800)&quot;</text>
<rect x="80.2" y="78" width="662.3" height="12" rx="6" fill="#2a78d6" opacity="0.22"/>
<line x1="390.4" y1="84" x2="432.3" y2="84" stroke="#2a78d6" stroke-width="4" stroke-linecap="round"/>
<circle cx="411.3" cy="84" r="5" fill="#2a78d6" stroke="#fcfcfb" stroke-width="2"/>
<text x="411.3" y="106" text-anchor="middle" font-size="12" fill="#52514e">1870.8</text>
<text x="56" y="134" font-size="13" fill="#0b0b0b">answers to the prompt without that example</text>
<rect x="82.3" y="142" width="769.5" height="12" rx="6" fill="#eb6834" opacity="0.22"/>
<line x1="442.7" y1="148" x2="491.4" y2="148" stroke="#eb6834" stroke-width="4" stroke-linecap="round"/>
<circle cx="467.0" cy="148" r="5" fill="#eb6834" stroke="#fcfcfb" stroke-width="2"/>
<text x="467.0" y="170" text-anchor="middle" font-size="12" fill="#52514e">1871.9</text>
</svg>


In Chart 1 the dot stands for the mean, the solid bar for the range the true mean is expected to fall in, and the pale bar for where a single year typically lands.

The mean of the answers given to the prompt with the example **falls earlier** than the mean of the answers given to the prompt without it, by **1.15** years. The standard error of that difference is 0.33, so the difference amounts to **3.471** standard errors. Two standard errors either way puts the true difference between -1.82 and -0.49 years.

**CONCLUSION: strong evidence that the answers shift towards the value given in the example (1800) — chance is no longer an explanation of a difference of this size.**

The measurement here is a first study, not a settlement. One thing the answers do state clearly: large language models are not free of the anchoring effect. A number written into a prompt can pull the answers towards that number even when nobody meant a hint by writing it — the same as in people, which Tversky and Kahneman demonstrated some time ago.

The prompts, the answers and the code behind every number above are in the
[repository](https://github.com/wojckr/llm-tests).

<!-- id: model-shift -->

### 2. Model shift: asking each model to disagree with itself

<p class="in-preparation">Article in preparation.</p>

<!-- id: last-digit -->

### 3. A rounded 1800 example in the prompt shifted the last digit in the answer towards zero

<p class="in-preparation">Article in preparation.</p>

<!-- id: accuracy -->

### 4. Accuracy: which models land near the documented year, and which merely look like it

<p class="in-preparation">Article in preparation.</p>

<!-- id: gathered -->


### 5. The example gathered the answers onto one year rather than moving them earlier

<p class="in-preparation">Article in preparation.</p>

<!-- id: same-middle -->

### 6. Why two different sets of answers end on exactly the same middle answer

<p class="in-preparation">Article in preparation.</p>

<!-- id: repeatability -->

### 7. Repeatability: the same question asked again, and what comes back

<p class="in-preparation">Article in preparation.</p>

<!-- id: concentration -->

### 8. Concentration: does the example make a model repeat one year more often?

<p class="in-preparation">Article in preparation.</p>

<!-- id: insistence -->

### 9. Insistence: a repeated answer looks like confidence, whether or not the year is right

<p class="in-preparation">Article in preparation.</p>

<!-- id: format -->

### 10. Format: does showing an example make a model answer in the requested form?

<p class="in-preparation">Article in preparation.</p>

<!-- id: usability -->

### 11. Usability: whether a year comes back at all

<p class="in-preparation">Article in preparation.</p>

<!-- id: filter -->

### 12. Filter: which answers the results of this experiment rest on

<p class="in-preparation">Article in preparation.</p>

<!-- id: disagreement -->

### 13. Disagreement: the model chosen matters more than the prompt written

<p class="in-preparation">Article in preparation.</p>

<!-- id: automation-bias -->

### 14. Automation bias: when a bare year from an LLM outweighs a person who is right

<p class="in-preparation">Article in preparation.</p>

## The models in the pool

The router assigned the requests to the models below — every model that returned at least one response. The text beside a model is the description published on its OpenRouter page on 15 September 2026.


| large language model | description on its OpenRouter page |
| :--- | :--- |
| [`cohere/north-mini-code:free`](https://openrouter.ai/cohere/north-mini-code:free) | North Mini Code is Cohere's first agentic coding model and the debut of its North family. A sparse mixture-of-experts model with 30B total parameters and 3B active, it is optimized for code generation, agentic software engineering, and terminal tasks, and is trained to generalize across agent harnesses such as OpenCode and SWE-Agent.<br>It offers a 256K-token context window with up to 64K tokens of output, supports interleaved reasoning and tool use via JSON schema, and is released open-weight under the Apache 2.0 license. Its small active-parameter footprint enables low-latency inference, including on local hardware. |
| [`dots-studio/dots-3-note-preview:free`](https://openrouter.ai/dots-studio/dots-3-note-preview:free) | Dots3-Note Preview is an open-weight mixture-of-experts model from Dots Studio, with 16B active parameters out of 280B total. It is the lightest model in the Dots 3 family and is suited for reasoning, coding, multimodal understanding, long-context processing, and multi-step agent workflows. |
| [`google/gemma-4-26b-a4b-it:free`](https://openrouter.ai/google/gemma-4-26b-a4b-it:free) | Gemma 4 26B A4B IT is an instruction-tuned Mixture-of-Experts (MoE) model from Google DeepMind. Despite 25.2B total parameters, only 3.8B activate per token during inference — delivering near-31B quality at a fraction of the compute cost. Supports multimodal input including text, images, and video (up to 60s at 1fps). Features a 256K token context window, native function calling, configurable thinking/reasoning mode, and structured output support. Released under Apache 2.0. |
| [`google/gemma-4-31b-it:free`](https://openrouter.ai/google/gemma-4-31b-it:free) | Gemma 4 31B Instruct is Google DeepMind's 30.7B dense multimodal model supporting text and image input with text output. Features a 256K token context window, configurable thinking/reasoning mode, native function calling, and multilingual support across 140+ languages. Strong on coding, reasoning, and document understanding tasks. Apache 2.0 license. |
| [`inclusionai/ling-3.0-flash-fin:free`](https://openrouter.ai/inclusionai/ling-3.0-flash-fin:free) | Ling 3.0 Flash Fin is a finance-focused mixture-of-experts model from InclusionAI, built on Ling 3.0 Flash with 5.1B active parameters out of 124B total. It is designed for real-world investment workflows that require complex multi-step tasks and long-horizon planning and execution, while retaining general capabilities in reasoning, coding, and mathematics. |
| [`inclusionai/ling-3.0-flash-sante:free`](https://openrouter.ai/inclusionai/ling-3.0-flash-sante:free) | Ling 3.0 Flash Sante is a health and medicine-focused mixture-of-experts model from InclusionAI, built on Ling 3.0 Flash with 5.1B active parameters out of 124B total. It is designed for medical knowledge reasoning, clinical safety, evidence-based retrieval, and long-horizon medical tasks, while retaining general capabilities in reasoning, coding, and agentic tasks. |
| [`inclusionai/ling-3.0-flash-vl:free`](https://openrouter.ai/inclusionai/ling-3.0-flash-vl:free) | Ling 3.0 Flash VL builds on Ling 3.0 Flash (124B total / 5.5B active MoE from InclusionAI), further strengthening its language capabilities while adding native visual perception and advanced visual agent capabilities. Hybrid instant/reasoning model with tool calling. |
| [`liquid/lfm-2.5-2.6b:free`](https://openrouter.ai/liquid/lfm-2.5-2.6b:free) | LFM2.5-2.6B is a compact reasoning model from Liquid AI. It is suited for agent workflows, data extraction, RAG, and long-context processing. Liquid advises against using it for agentic coding or knowledge-heavy tasks.<br>Prompts and outputs may be retained and used to train Liquid models. |
| [`nex-agi/nex-n2.5-mini:free`](https://openrouter.ai/nex-agi/nex-n2.5-mini:free) | Nex-N2.5 is an agentic model built to turn goals into working, verified outcomes. Its core strength is agentic coding within a visual feedback loop: it can explore codebases, implement multi-file changes, run commands, launch applications, interact with browser and desktop interfaces, and test software from the user's perspective. When observed behavior does not match the intended result, Nex-N2.5 can diagnose the issue, revise its implementation, and test again. This makes it especially effective for autonomous software engineering, GUI-based QA, computer-use automation, deep research, and scientific workflows where success must be demonstrated in the environment—not merely inferred from generated code. |
| [`nex-agi/nex-n2.5-pro:free`](https://openrouter.ai/nex-agi/nex-n2.5-pro:free) | Nex-N2.5 is an agentic model built to turn goals into working, verified outcomes. Its core strength is agentic coding within a visual feedback loop: it can explore codebases, implement multi-file changes, run commands, launch applications, interact with browser and desktop interfaces, and test software from the user's perspective. When observed behavior does not match the intended result, Nex-N2.5 can diagnose the issue, revise its implementation, and test again. This makes it especially effective for autonomous software engineering, GUI-based QA, computer-use automation, deep research, and scientific workflows where success must be demonstrated in the environment—not merely inferred from generated code. |
| [`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`](https://openrouter.ai/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free) | NVIDIA Nemotron™ 3 Nano Omni is a 30B-A3B open multimodal model designed to function as a perception and context sub-agent in enterprise agent systems. It accepts text, image, video, and audio inputs and produces text output, enabling agents to perceive and reason across modalities in a single inference loop.<br>Built on a hybrid MoE Transformer-Mamba architecture with Conv3D video layers and Efficient Video Sampling (EVS), it delivers approximately 2× higher throughput and 2.5× lower compute for video reasoning versus separate vision + speech pipelines. It supports up to 300K context length and a 16,384 reasoning budget, with extended thinking enabled via reasoning.enabled on OpenRouter. |
| [`nvidia/nemotron-3-super-120b-a12b:free`](https://openrouter.ai/nvidia/nemotron-3-super-120b-a12b:free) | NVIDIA Nemotron 3 Super is a 120B-parameter open hybrid MoE model, activating just 12B parameters for maximum compute efficiency and accuracy in complex multi-agent applications. Built on a hybrid Mamba-Transformer Mixture-of-Experts architecture with multi-token prediction (MTP), it delivers over 50% higher token generation compared to leading open models.<br>The model features a 1M token context window for long-term agent coherence, cross-document reasoning, and multi-step task planning. Latent MoE enables calling 4 experts for the inference cost of only one, improving intelligence and generalization. Multi-environment RL training across 10+ environments delivers leading accuracy on benchmarks including AIME 2025, TerminalBench, and SWE-Bench Verified.<br>Fully open with weights, datasets, and recipes under the NVIDIA Open License, Nemotron 3 Super allows easy customization and secure deployment anywhere — from workstation to cloud. |
| [`nvidia/nemotron-3-ultra-550b-a55b:free`](https://openrouter.ai/nvidia/nemotron-3-ultra-550b-a55b:free) | NVIDIA Nemotron 3 Ultra is an open frontier-reasoning and orchestration model from NVIDIA, with 55B active parameters out of 550B total (MoE). Built on a hybrid Transformer-Mamba mixture-of-experts architecture, it supports text input and output with a context window of up to 1M tokens. It is suited for long-running agentic workflows, including agent orchestration, coding agents, deep research, and complex enterprise tasks.<br>It is particularly strong at multi-step reasoning and planning, with high-throughput inference designed for high-volume agent pipelines. It is part of the NVIDIA Nemotron family of open models for agentic AI. |
| [`nvidia/nemotron-3.5-content-safety:free`](https://openrouter.ai/nvidia/nemotron-3.5-content-safety:free) | NVIDIA Nemotron 3.5 Content Safety is a compact 4B-parameter multimodal guardrail model from NVIDIA, fine-tuned from Google Gemma-3-4B. It moderates both inputs to and responses from LLMs and VLMs, accepting text and image input and returning text output: a safe/unsafe classification for the user prompt and the response, safety category labels, and an optional reasoning trace. It covers 12 languages with a context window of up to 128K tokens.<br>It is suited for prompt and response moderation, content classification, safety pipelines, and enterprise AI guardrails with policy enforcement, and includes a togglable reasoning mode. It is part of the NVIDIA Nemotron family of open models for agentic AI. |
| [`nvidia/nemotron-3.5-lightning:free`](https://openrouter.ai/nvidia/nemotron-3.5-lightning:free) | NVIDIA Nemotron 3.5 Lightning is an open mixture-of-experts model from NVIDIA, with 3B active parameters out of 30B total. It is suited for high-throughput agentic workloads and specialized tasks that benefit from domain-specific customization. |
| [`poolside/laguna-s-2.1:free`](https://openrouter.ai/poolside/laguna-s-2.1:free) | Laguna S 2.1 is the latest coding agent model from Poolside. Laguna S 2.1 is a 118B total parameter model with 8B active parameters, scoring 70.2% on Terminal-Bench 2.1 and 40.4% on DeepSWE, making it one of the strongest coding models in its category. Open-weight under the OpenMDW-1.1 license.<br>Laguna S 2.1 is designed for software engineering and agentic coding use cases, and you are responsible for confirming that it is appropriate for your intended application. Laguna S 2.1 is subject to the OpenMDW-1.1 License, and should be used consistently with Poolside's Acceptable Use Policy. We advise against circumventing Laguna S 2.1 safety guardrails without implementing substantially equivalent mitigations appropriate for your use case.<br>Please report security vulnerabilities or safety concerns to security@poolside.ai.<br>If you are using Laguna S 2.1 for free, we may use your inputs and outputs to train and improve our models. |
| [`poolside/laguna-xs-2.1:free`](https://openrouter.ai/poolside/laguna-xs-2.1:free) | Laguna XS 2.1 is the latest coding agent model in the 33B-A3B category from Poolside and a step forward from their Laguna XS.2 model (released in April 2026). It combines tool calling and reasoning capabilities with a compact footprint, offering a 256K context window and up to 32K output tokens. Quantized to FP8 for fast, cost-efficient agentic coding workflows.<br>Laguna XS 2.1 is designed for software engineering and agentic coding use cases, and you are responsible for confirming that it is appropriate for your intended application. Laguna XS 2.1 is subject to the OpenMDW-1.1 License, and should be used consistently with Poolside's Acceptable Use Policy. We advise against circumventing Laguna XS 2.1 safety guardrails without implementing substantially equivalent mitigations appropriate for your use case.<br>Please report security vulnerabilities or safety concerns to security@poolside.ai.<br>If you are using Laguna XS 2.1 for free, we may use your inputs and outputs to train and improve our models. |

## Running it yourself

Node 22 or later, no build step, one dependency. Put an
[OpenRouter](https://openrouter.ai/) key in a file named `.env` in the root of the project, as the line
`OPENROUTER_API_KEY=...` — the file is excluded from version control — and install the dependency with
`npm install`.

| command | what it does |
| :--- | :--- |
| `npm run collect` | sends one request at a time, alternating the two prompts, waiting `INTERVAL_MS` between them, and appends every answer to the files in `data/` |
| `npm run stats` | prints every analysis in the terminal, including the raw material that never reaches this page |
| `npm run stats --id=<article>` | prints only the analysis behind one article |
| `npm run readme` | rebuilds this document into `temp/`, leaving the published files untouched; add `--latest-only` to skip the copy stamped with the date and the time |
| `npm run readme:final` | rebuilds it and overwrites `README.md` and `docs/index.html` |

The two commands that rebuild the document need the hand-written sections in `content/`, which stay outside version control while the text is still being worked on. Collecting the answers and printing the statistics work without the sections.

Collecting takes days rather than hours, and not because of the interval. OpenRouter caps requests to
free models per day; once the cap is reached every request comes back as `429`, and the script falls
back to the longer `RATE_LIMIT_INTERVAL_MS` until the cap resets, rather than filling the log with
refusals. Both intervals are constants at the top of `src/runAnchoringExperiment.js`.

One recommendation about the collected answers. They accumulate over many days and cannot be
collected again — the pool of free models changes, so a lost file is lost for good. Making them
append-only protects them from every later mistake, one's own included:

```bash
sudo chattr +a data/*.csv     # the files can be appended to, but not edited, renamed or deleted
lsattr data/*.csv             # confirms the flag is set
sudo chattr -a data/*.csv     # removes it, when the files really have to change
```

The flag is enforced by the kernel, so it holds against a script with a mistake in it, against a
spreadsheet that rewrites the whole file on save, and against a careless `rm`. Appending, which is all
the collecting script ever does, keeps working.
