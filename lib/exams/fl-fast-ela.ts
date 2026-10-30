// The Florida FAST ELA Reading test (grades 3-10, B.E.S.T. standards) as a
// reference for the guide prompts. Computer-adaptive and untimed, so no pace.
// Every item sits on a passage the model writes; two-part evidence items are
// two MC items that repeat the passage. The 10th-grade test is the graduation
// requirement. FAST is matched in capitals only (like ACT), so "fast" in a
// sentence never triggers it.

import type { ExamProfile } from './types'

/** "FAST" in capitals, not "fast food"/"fast track", or the full name with capitals. */
export const FAST_NAME = /\bFAST\b(?!\s*(?:food|track|lane|pass))|\bFlorida\s+Assessment\s+of\s+Student\s+Thinking\b/

export const FL_FAST_ELA: ExamProfile = {
  id: 'fl-fast-ela',
  name: 'the Florida FAST ELA Reading test',
  detect: {
    exam: FAST_NAME,
    exclude: /\b(math|mathematics|algebra|geometry)\b/i,
    subjectHints: /\b(ELA|reading|english|language arts|literature|informational)\b/i,
    subjects: ['english'],
    explicit: /\bFAST\s+(?:ELA|Reading)\b/,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Every item sits on a passage in a \`\`\`passage fence directly under the question line: 150-400 words, written by you for the grade (literary: a story excerpt, a poem, a scene; informational: an article, a biography excerpt, a how-it-works piece, a speech), attributed generically ("an excerpt from a short story about a lighthouse keeper", "from an article about coral reefs", "a poem about a first snowfall"). Never a real author's text. Number the paragraphs when a stem refers to one ("paragraph 3"), by starting each paragraph with its number in parentheses: "(1) ...". Put the sentence a stem refers to in [[double brackets]]. Items on the same passage each repeat the passage so every item stands alone.
- Multiple-choice items have exactly four options A-D, as on the test. No true/false, no "I, II and III" lists. The test's multiselect, hot-text and table items become single-answer MC here ("Which sentence from the passage best shows ...", with four sentences from the passage as the options).
- Two-part evidence items are two MC items in a row on the same passage: Part A asks the inference, theme or meaning ("Part A: Which statement best describes the theme of the passage?"), Part B asks for the evidence ("Part B: Which sentence from the passage best supports the answer to Part A?") with four sentences from the passage as options, one of which supports the Part A key.
- Stems are the test's: "What does the word [[tentative]] mean as it is used in paragraph 2?", "How does paragraph 4 contribute to the development of the central idea?", "Read this sentence from the passage. [[...]] What is the effect of the author's word choice?", "Which detail from the passage best supports the inference that ...", "How does the author's use of a flashback in paragraphs 5 and 6 affect the passage?", "What is the most likely reason the author included the information in paragraph 3?", "Which statement best describes how the two texts differ in their treatment of ...". Wrong options are plausible readings that the passage does not support (a detail that is true but does not answer the question, a theme stated too broadly, a meaning of the word that fits another context).
- No items about test-taking or the test itself; no vocabulary items that can be answered without the passage.
- Before writing an item's key, check that exactly one option is supported by the passage and that each wrong option fails for a nameable reason.
- Explanations stay short: the words in the passage that support the key and why the most tempting wrong option fails.`,
  domains: [
    {
      id: 'grades-3-5',
      name: 'Grades 3-5 reading (prose and poetry, informational text)',
      share: 'the elementary tests: about half literary, half informational',
      detect: /\b(3rd|4th|5th|third|fourth|fifth)[- ]grade\b|\bgrade\s*[345]\b|\belementary\b|\bfolktale|fable|legend|myth\b/i,
      skills: [
        'Literary: theme or lesson of a story, fable, poem or play; character traits, motivations and how a character changes; point of view and how it shapes the telling; figurative language (simile, metaphor, personification, idiom) and its meaning; structure of a poem (stanza, rhyme, repetition) and of a story (problem and solution, flashback at grade 5)',
        'Informational: central idea and the key details that support it; text structure (chronological, compare and contrast, cause and effect, problem and solution) and text features (headings, captions, diagrams); author\'s purpose and perspective; how two texts on one topic present it',
        'Vocabulary in context at the grade\'s level; grade-level academic words ("determine", "describe", "contribute")',
      ],
      hard: [
        'A theme inferred from how a character changes across the whole passage, with a wrong option that states a detail rather than a lesson',
        'A text-structure item where the signal words are implicit',
        'A Part B evidence item where two sentences relate to the theme but only one supports the exact claim in Part A',
      ],
      traps: ['a detail mistaken for the theme', 'the narrator\'s view mistaken for the author\'s purpose', 'the literal meaning of a figurative phrase'],
      exemplars: [
        `MC_QUESTION: Part A: Which statement best describes the theme of the passage?
\`\`\`passage
An excerpt from a short story about a girl and her grandfather's garden

(1) Every Saturday, Rosa helped her grandfather in his garden. She did not like it. The sun was hot, the dirt got under her nails, and the tomato plants never seemed to grow.

(2) "Why do we keep doing this?" she asked one morning, dropping her trowel. "Nothing is happening."

(3) Her grandfather did not look up. He pressed a seed into the soil and covered it gently. "When I was your age, I planted a lemon tree," he said. "For three years, it gave me nothing. I wanted to cut it down."

(4) "Did you?"

(5) "No. The fourth summer, it gave me more lemons than I could carry." He handed her the seed packet. "Things that are worth having take time, Rosa. The garden is teaching you to wait."

(6) Rosa picked up her trowel. [[She still did not like the heat, but she planted the rest of the row.]]
\`\`\`
A) Gardens need sun and water to grow.
B) Grandparents know more than children do.
C) Good things are worth waiting for.
D) Hard work is always unpleasant.
Correct Answer: C
Explanation: The grandfather's lemon tree story and his line "Things that are worth having take time" state the lesson, and Rosa acts on it by planting the rest of the row. Choice A is a detail, not a lesson about life.`,
        `MC_QUESTION: Part B: Which sentence from the passage best supports the answer to Part A?
\`\`\`passage
An excerpt from a short story about a girl and her grandfather's garden

(1) Every Saturday, Rosa helped her grandfather in his garden. She did not like it. The sun was hot, the dirt got under her nails, and the tomato plants never seemed to grow.

(2) "Why do we keep doing this?" she asked one morning, dropping her trowel. "Nothing is happening."

(3) Her grandfather did not look up. He pressed a seed into the soil and covered it gently. "When I was your age, I planted a lemon tree," he said. "For three years, it gave me nothing. I wanted to cut it down."

(4) "Did you?"

(5) "No. The fourth summer, it gave me more lemons than I could carry." He handed her the seed packet. "Things that are worth having take time, Rosa. The garden is teaching you to wait."

(6) Rosa picked up her trowel. She still did not like the heat, but she planted the rest of the row.
\`\`\`
A) "The sun was hot, the dirt got under her nails, and the tomato plants never seemed to grow."
B) "He pressed a seed into the soil and covered it gently."
C) "Things that are worth having take time, Rosa."
D) "She still did not like the heat, but she planted the rest of the row."
Correct Answer: C
Explanation: The grandfather's sentence states the lesson directly. Choice D shows Rosa acting on the lesson but does not state what the lesson is.`,
      ],
    },
    {
      id: 'grades-6-8',
      name: 'Grades 6-8 reading (literary analysis, argument, comparing texts)',
      share: 'the middle school tests',
      detect: /\b(6th|7th|8th|sixth|seventh|eighth)[- ]grade\b|\bgrade\s*[678]\b|\bmiddle school\b|\bargument\w*|claim\w*|counterclaim|rhetoric\w*\b/i,
      skills: [
        'Literary: theme developed across a text and how specific scenes build it; characterization through dialogue and action; narrator reliability and point of view shifts; figurative language, tone and mood; how structure (flashback, foreshadowing, parallel plots) creates effects',
        'Informational and argument: central idea with the details that develop it; an author\'s claim, the reasons and evidence for it, and whether the evidence is relevant and sufficient; counterclaims; rhetorical appeals (ethos, pathos, logos) at grade 8; text structure and how a paragraph contributes to the whole',
        'Comparing two texts on one topic or theme: how the authors\' perspectives, purposes or structures differ',
        'Vocabulary: word meaning from context, connotation vs denotation, figurative vs literal, Greek and Latin roots',
      ],
      hard: [
        'A claim-and-evidence item where every option is a true statement from the passage but only one is evidence for the stated claim',
        'A tone item where the wrong options are near synonyms with the wrong charge ("critical" vs "skeptical" vs "hostile")',
        'A paired-text item asking how the second author would respond to a claim in the first',
      ],
      traps: ['evidence confused with a restatement of the claim', 'a counterclaim read as the author\'s own position', 'the most dramatic sentence taken as the central idea'],
      exemplars: [
        `MC_QUESTION: How does paragraph 3 contribute to the development of the author's argument?
\`\`\`passage
From an opinion article about later school start times

(1) Every weekday morning, millions of teenagers sit in first-period classes with their eyes half shut. Schools that start before 8:00 a.m. are asking adolescents to learn at the hour their bodies are least ready for it.

(2) During the teenage years, the body's internal clock shifts later. Melatonin, the hormone that signals sleepiness, is released later at night than it is in children or adults, so a 10:00 p.m. bedtime that works for a fourth grader leaves a ninth grader staring at the ceiling.

(3) Critics argue that later start times would disrupt after-school sports and leave parents without child care. These are real concerns. But districts that have moved start times to 8:30 have found that practices simply shifted later, and attendance at first period rose.

(4) The question is not whether teenagers can adapt to early mornings. They have been trying for decades. The question is whether schools will adapt to teenagers.
\`\`\`
A) It presents the scientific evidence that supports the author's claim.
B) It acknowledges an opposing view and then responds to it with evidence.
C) It restates the claim in stronger language to persuade the reader.
D) It introduces a new problem that the author does not resolve.
Correct Answer: B
Explanation: Paragraph 3 names the critics' concerns, calls them real, then answers them with what districts found. Choice A describes paragraph 2; choice D is wrong because the paragraph does resolve the concern.`,
      ],
    },
    {
      id: 'grades-9-10',
      name: 'Grades 9-10 reading (the graduation-requirement test)',
      share: 'the high school tests; 10th grade must be passed to graduate',
      detect: /\b(9th|10th|ninth|tenth)[- ]grade\b|\bgrade\s*(?:9|10)\b|\bhigh school\b|\bgraduation\b|\bretake\b|\bconcordant\b/i,
      skills: [
        'Literary: how an author develops a universal theme; complex characters and conflicting motivations; irony (verbal, situational, dramatic), satire and allusion; how structure and point of view create tension or ambiguity; interpreting figurative language in dense prose and poetry',
        'Informational and argument: central ideas and how they interact; an author\'s rhetorical choices (appeals, repetition, diction, structure) and their effect; evaluating the reasoning and evidence of an argument, including logical fallacies; how seminal and foundational documents build their arguments',
        'Research and multiple sources: integrating information from two or three sources, telling fact from opinion, recognizing bias and purpose',
        'Vocabulary: connotation, technical and academic language, how an author\'s word choice shapes tone and meaning',
      ],
      hard: [
        'A rhetorical-effect item on a speech excerpt where the wrong options describe real features of the passage but not the effect asked about',
        'An irony item where the surface statement and the intended meaning must both be identified',
        'A multiple-source item asking which claim all three sources would support',
      ],
      traps: ['a rhetorical device named correctly but its effect misread', 'the speaker\'s stated position mistaken for the author\'s satirical target', 'a source\'s evidence treated as its conclusion'],
      exemplars: [
        `MC_QUESTION: Read this sentence from paragraph 2. [[We did not build the levee because we expected the river to stay small.]] What is the effect of the author's word choice in this sentence?
\`\`\`passage
From a speech given at the opening of a new public library

(1) Some people have asked why a town of this size needs a library with three floors and two hundred computers. They have asked whether we expect that many readers.

(2) I will answer with a story about the river. Fifty years ago, this town built a levee higher than any flood on record. People laughed. We did not build the levee because we expected the river to stay small. We built it because we knew what it could become.

(3) A library is a levee of another kind. It holds back nothing. It holds open everything: every door a child might one day decide to walk through. We did not build it for the readers we have. We built it for the readers we expect.
\`\`\`
A) The matter-of-fact tone suggests that the town's decision was obvious and required no debate.
B) The contrast between "expected" and "knew" implies that the levee was built out of fear rather than planning.
C) The negative phrasing sets up the next sentence, so that the real reason for the levee lands with more force.
D) The word "small" minimizes the river, suggesting the town exaggerated the danger it faced.
Correct Answer: C
Explanation: Saying what the town did not do delays the reason, so "We built it because we knew what it could become" arrives as the answer; the speaker then applies the same pattern to the library. Choice B misreads "knew" as fear.`,
      ],
    },
    {
      id: 'vocabulary-language',
      name: 'Vocabulary and language in context (all grades)',
      share: 'items in every passage set',
      detect: /\b(vocab\w*|word meaning|context clue\w*|roots?|affix\w*|prefix\w*|suffix\w*|connotation|denotation|figurative|idiom\w*|synonym\w*)\b/i,
      skills: [
        'Meaning of a word or phrase from context clues (definition, example, contrast, restatement) at the grade\'s level',
        'Greek and Latin roots and affixes (bio-, geo-, -ology, -ment, in-/im-, trans-) to work out an unfamiliar word',
        'Connotation vs denotation and the effect of a word with a strong charge; figurative language, idioms and multiple-meaning words in context',
        'How a word choice shapes tone, mood or a character\'s voice',
      ],
      hard: [
        'A multiple-meaning word where the common meaning is a wrong option and the context demands the rarer one',
        'A connotation item asking what a word suggests about the narrator\'s attitude, with options that are all accurate denotations',
      ],
      traps: ['the most common meaning of a multiple-meaning word', 'a synonym that fits the sentence but not the paragraph', 'a root read as a different root (ped- foot vs ped- child)'],
      exemplars: [
        `MC_QUESTION: What does the word [[reluctantly]] mean as it is used in paragraph 2?
\`\`\`passage
An excerpt from a story about a school science fair

(1) Devon had spent three weeks on his volcano. It erupted on command, it had a working light inside, and the painted lava looked almost wet.

(2) When the judges stopped at the next table, Devon saw it: a plain cardboard box with a hand-crank generator that lit a small bulb. The girl behind it explained how the magnets worked. The judges asked her questions for ten minutes. Devon clapped reluctantly when they handed her the blue ribbon, then looked at his volcano and, for the first time, saw only paint.
\`\`\`
A) loudly and with excitement
B) without really wanting to
C) in a confused way
D) later than everyone else
Correct Answer: B
Explanation: Devon clapped while feeling the sting of losing to a plainer project, so he clapped without wanting to. Nothing in the passage says he was confused (C) or late (D).`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the mix of a real FAST session around Level 3 (on grade level), minus the easiest recall items. At most 1 item in 8 that asks only for a stated detail, never first in a section; about half typical Level 3 items (an inference with clear support, a word in context, a paragraph's purpose) and at least a third Level 4-5 items of the kind under WHAT HARD LOOKS LIKE (theme developed across the passage, an author's choice and its effect, evidence that fits one exact claim).`,
    hard: `DIFFICULTY ON THIS TEST: Level 4 and 5 items. At least 4 of every 5 items must be ones a Level 3 student would miss: effects of structure and word choice, evidence items with two near-fit sentences, paired-text comparisons, irony and tone, claims whose support must be judged relevant and sufficient. Hard never means obscure vocabulary or passages above the grade's reading level.`,
    easier: `DIFFICULTY ON THIS TEST: Level 2-3 items, each on one clearly stated idea, with the passage written plainly at the grade's level. Still real test items on a passage.`,
  },
}
