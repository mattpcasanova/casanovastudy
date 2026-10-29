// The digital SAT Reading and Writing section as a reference for the guide
// prompts (see sat-math.ts for the shape). Every item on this test is one
// short passage (25-150 words) followed by one four-option question. The
// passages in the exemplars are written here, not taken from the test.

import type { ExamProfile } from './types'

export const SAT_RW: ExamProfile = {
  id: 'sat-rw',
  name: 'the digital SAT Reading and Writing section',
  detect: {
    exam: /\b(?:digital\s+)?(?:p?sat|psat\s*(?:nmsqt|10|8\/9)?)\b/i,
    exclude: /\b(math|algebra|geometry|trig|equation|quadratic|linear|data analysis|problem[- ]solving)\b/i,
    subjectHints: /\b(reading|writing|grammar|vocab\w*|rhetoric\w*|punctuation|transitions?|conventions|evidence|inference|verbal|english|r&w|rw|words? in context|passages?|synthesis|craft and structure|information and ideas|expression of ideas|standard english)\b/i,
    subjects: ['english'],
    explicit: /\b(reading\s*(?:and|&)\s*writing|r&w|rw|verbal|evidence[- ]based reading)\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Every item is ONE short passage followed by ONE question with exactly four options A-D. Never: true/false, "I, II and III" lists, free-response, matching, questions without a passage, or several questions on one passage.
- The passage goes in a \`\`\`passage fence directly under the question line (the app shows it above the question). 25-150 words, written by you, never quoted from a real published work unless it is public domain and short. A literary passage opens with a line like "The following text is from Edith Wharton's 1905 novel The House of Mirth." (real works are fine to name; invent nothing about them) or "The following text is adapted from a 2019 article about urban beekeeping." Science and social science passages read like a magazine's research summary: a named researcher, a finding, a claim.
- A blank in the passage is "______" (six underscores). The sentence a question asks about is wrapped in [[double brackets]] and the question calls it "the underlined sentence". Two texts are labeled on their own lines, "Text 1" and "Text 2". Notes for a synthesis item are bullet lines ("- ...") after "While researching a topic, a student has taken the following notes:".
- The question is one of the test's stems, used exactly: "Which choice completes the text with the most logical and precise word or phrase?" / "As used in the text, what does the word "X" most nearly mean?" / "Which choice best describes the function of the underlined sentence in the text as a whole?" / "Which choice best states the main purpose of the text?" / "Based on the texts, how would (the author of Text 2) most likely respond to (the claim in Text 1)?" / "Which choice best states the main idea of the text?" / "According to the text, ...?" / "Which finding, if true, would most directly support (or weaken) the claim?" / "Which quotation from (work) most effectively illustrates the claim?" / "Which choice most effectively uses data from the table to complete the statement?" / "Which choice most logically completes the text?" / "Which choice completes the text so that it conforms to the conventions of Standard English?" / "Which choice completes the text with the most logical transition?" / "Which choice most effectively uses relevant information from the notes to accomplish this goal?"
- Options are parallel and terse. For conventions items the options are the four ways to fill the blank (punctuation and word forms only, e.g. "segments," / "segments;" / "segments" / "segments: and"). For words in context, four single words or short phrases. For function, purpose, inference and synthesis items, four full sentences of similar length that each sound plausible.
- Order the sections as the test does: Craft and Structure, then Information and Ideas, then Standard English Conventions, then Expression of Ideas; within each, easier to harder.
- Every item stands alone with its own passage, even when two items could share one.
- Conventions items: the three wrong options must each break a rule (a comma splice, a fragment, a semicolon before a fragment, an agreement error, a dangling modifier, the wrong possessive), never be merely wordier or less elegant than the key. If a wrong option would make a correct sentence, rewrite it.
- Before writing an item's answer, reread the passage and check that exactly one option is right by the test's standard (the most precise word, the one function the sentence serves, the one conclusion the evidence supports, the one punctuation that makes a correct sentence). Fix the passage or the options until that is true. Never leave a note or a second attempt in the explanation.
- Explanations stay short: why the keyed option fits and why the most tempting wrong option does not.`,
  domains: [
    {
      id: 'craft',
      name: 'Craft and Structure',
      share: 'about 28% of the test',
      detect: /\b(craft and structure|words? in context|vocab\w*|word choice|text structure|purpose|function of|cross[- ]text|two texts|main purpose)\b/i,
      skills: [
        'Words in Context: pick the most logical and precise word for a blank, or say what a word most nearly means as used, in texts whose diction is often formal, literary or scientific',
        'Text Structure and Purpose: the main purpose of a text, or the function of one underlined sentence in the text as a whole (to introduce, to qualify, to give an example, to concede, to set up a contrast)',
        'Cross-Text Connections: two short texts on one topic; how the author of one would most likely respond to a claim in the other (agreement, partial agreement, a different explanation, a methodological objection)',
      ],
      hard: [
        'A words-in-context blank in a dense literary or historical text where two options fit the topic and only one fits the precise logic of the sentence (praised publicly but doubted privately = ambivalence, not indifference)',
        'A function question about a sentence that qualifies or sets up a contrast, where the tempting option describes what the sentence says instead of what it does',
        'Cross-text items where Text 2 partly agrees: the right option captures the exact point of difference, the wrong ones overstate or reverse it',
        'A purpose question on a text that does two things (describe and then challenge), where the main purpose is the second',
      ],
      traps: ['a word that fits the topic but not the precise logic of the sentence', 'an option that restates the sentence\'s content rather than its function', 'an option that goes beyond what Text 2 says (claiming disagreement where there is a different emphasis)', 'the purpose of one sentence given as the purpose of the whole text'],
      exemplars: [
        `MC_QUESTION: Which choice completes the text with the most logical and precise word or phrase?
\`\`\`passage
The following text is adapted from a 1911 magazine article about a city planning proposal.

The planners' proposal was met with ______ from residents, who praised its ambition in public meetings but privately told reporters that they doubted it would ever be funded.
\`\`\`
A) indifference
B) ambivalence
C) hostility
D) enthusiasm
Correct Answer: B
Explanation: Praising the plan in public while doubting it in private is mixed feeling, which is ambivalence. Indifference would mean the residents did not care either way.`,
        `MC_QUESTION: Which choice best describes the function of the underlined sentence in the text as a whole?
\`\`\`passage
Marine biologist Ana Ruiz has studied the feeding habits of leatherback sea turtles for two decades. [[Her early research relied on observing turtles from boats, a method that captured only surface behavior.]] More recently, she has fitted turtles with small cameras, revealing that they dive far deeper for jellyfish than anyone had documented.
\`\`\`
A) It explains why Ruiz's recent findings were unexpected.
B) It introduces a limitation that the next sentence shows was later overcome.
C) It questions the reliability of Ruiz's early conclusions.
D) It summarizes the main finding of Ruiz's research.
Correct Answer: B
Explanation: The sentence names a limit of the early method ("only surface behavior") that the camera work then overcomes. It does not judge the early conclusions, so C overstates it.`,
        `MC_QUESTION: Based on the texts, how would Okafor (Text 2) most likely respond to the historians' argument in Text 1?
\`\`\`passage
Text 1
Many historians argue that the printing press drove the rapid spread of Reformation ideas in the 1500s, pointing to the thousands of pamphlets printed in the decade after 1517.

Text 2
Historian Maya Okafor notes that literacy rates in most of Europe at the time were below 20 percent. She argues that sermons and public readings, not printed pages themselves, carried Reformation ideas to most people, with pamphlets serving mainly as scripts for speakers.
\`\`\`
A) By agreeing that pamphlets were central but disputing how many were printed.
B) By arguing that pamphlets mattered mainly as a source for speakers rather than as something most people read.
C) By claiming that the Reformation would have spread just as quickly without the printing press.
D) By questioning whether Reformation ideas spread rapidly at all.
Correct Answer: B
Explanation: Okafor keeps the pamphlets in the story but changes their role: scripts for oral transmission. She does not deny the press mattered (C) or that ideas spread quickly (D).`,
      ],
    },
    {
      id: 'ideas',
      name: 'Information and Ideas',
      share: 'about 26% of the test',
      detect: /\b(information and ideas|central idea|main idea|details?|evidence|support(?:s|ing)? the claim|weaken|quotation|data from the (?:table|graph)|inference|most logically completes)\b/i,
      skills: [
        'Central Ideas and Details: the main idea of a text, or a specific detail asked with "According to the text"',
        'Command of Evidence (textual): which finding, if true, would most directly support or weaken a claim; which quotation from a work most effectively illustrates a claim',
        'Command of Evidence (quantitative): which choice most effectively uses data from a table or graph to complete a statement or support a claim',
        'Inferences: which choice most logically completes a text that sets up an argument and stops before its conclusion',
      ],
      hard: [
        'An evidence item where two options are consistent with the claim but only one bears on it directly (the beetle finding that birds avoid a second beetle supports "coloring deters predators"; equal coloring in both sexes only hints)',
        'A quantitative item where every option states something true from the table and only one supports the specific claim',
        'An inference that must honor a "however" or "although" in the last sentence: the completion is the caution or the exception, not the main finding restated',
        'A quotation item where the tempting quotation is on the topic but does not illustrate the claim\'s specific point',
      ],
      traps: ['a true statement that does not answer the question asked', 'a detail from the text presented as its main idea', 'data that is in the table but does not bear on the claim', 'a completion that restates the earlier finding instead of following the final sentence\'s logic', 'an option that goes further than the text supports'],
      exemplars: [
        `MC_QUESTION: Which choice best states the main idea of the text?
\`\`\`passage
The cliff dwellings at Mesa Verde, in present-day Colorado, were built by Ancestral Puebloans in the 1100s and 1200s. Although the dwellings are often described as fortresses, archaeologist Kira Holt has found few signs of conflict at the sites. She points instead to the alcoves' south-facing orientation, which keeps the interiors warm in winter and shaded in summer, as the likely reason for their location.
\`\`\`
A) The cliff dwellings were built primarily for defense against attack.
B) Holt argues that the dwellings' location is better explained by climate than by defense.
C) Archaeologists disagree about when the cliff dwellings were built.
D) The alcoves at Mesa Verde are warmer than other sites in the region.
Correct Answer: B
Explanation: The text sets up the fortress view and then gives Holt's alternative, climate, as the likely reason. D is a supporting detail, not the main idea.`,
        `MC_QUESTION: Which finding, if true, would most directly support Mendes's hypothesis?
\`\`\`passage
The brightly colored shell of the harlequin beetle has long been assumed to help males attract mates. Entomologist Luis Mendes hypothesizes instead that the coloring deters predators by signaling that the beetle tastes bad.
\`\`\`
A) Birds that eat one harlequin beetle rarely attack a second one.
B) Male and female harlequin beetles are equally brightly colored.
C) Harlequin beetles are most active during daylight hours.
D) Female harlequin beetles prefer the brightest males.
Correct Answer: A
Explanation: A bird learning to avoid the beetle after one taste is exactly the deterrent effect Mendes proposes. B is consistent with his idea but does not show deterrence; D supports the mate-attraction view.`,
        `MC_QUESTION: Which choice most effectively uses data from the table to support Weil's claim?
\`\`\`passage
Nesting success of the golden-winged warbler by habitat, 2020 study
- Forest edge: 38%
- Forest interior: 61%
- Grassland: 44%

Ecologist Dana Weil claims that the warblers nest more successfully in dense cover than in open or edge habitat.
\`\`\`
A) The nesting success rate in the forest interior (61%) was higher than at the forest edge (38%) and in grassland (44%).
B) The nesting success rate in grassland (44%) was higher than at the forest edge (38%).
C) The forest edge had the lowest nesting success rate of the three habitats.
D) Nesting success rates ranged from 38% to 61% across the three habitats.
Correct Answer: A
Explanation: The claim compares dense cover (forest interior) with open and edge habitat, so the supporting data must set the interior rate against both of the others. B, C and D are true but do not make that comparison.`,
        `MC_QUESTION: Which choice most logically completes the text?
\`\`\`passage
Researchers found that participants who took brief walks outdoors reported better moods afterward than participants who walked the same distance on an indoor treadmill. Because both groups exercised equally, the researchers concluded that physical activity alone could not explain the difference. However, the outdoor group also spent more time in sunlight, so the researchers caution that ______
\`\`\`
A) the mood benefit may have come from light exposure rather than from being outdoors as such.
B) walking indoors provides no mood benefit at all.
C) the two groups may not have exercised equally after all.
D) participants should walk outdoors only on sunny days.
Correct Answer: A
Explanation: The last sentence introduces a second difference between the groups (sunlight), so the caution is that this difference, not the outdoors itself, may explain the result. C contradicts what the text states.`,
      ],
    },
    {
      id: 'conventions',
      name: 'Standard English Conventions',
      share: 'about 26% of the test',
      detect: /\b(standard english|conventions|grammar|punctuation|boundaries|comma|semicolon|colon|dash|subject[- ]verb|agreement|pronoun|possessive|verb tense|modifier|fragment|run[- ]on|apostrophe)\b/i,
      skills: [
        'Boundaries: joining or separating independent clauses with commas and conjunctions, semicolons, colons, dashes and periods; avoiding comma splices and fragments; commas around nonessential elements and appositives',
        'Form, Structure and Sense: subject-verb agreement across intervening phrases, pronoun-antecedent agreement, verb tense consistency, plural vs possessive (its / it\'s, their / there), dangling and misplaced modifiers, parallel structure',
      ],
      hard: [
        'A boundary where the subject is long and the blank sits between it and the verb (no comma), or a colon that must follow a complete clause',
        'Nonessential elements set off by a pair of commas or dashes, where the tempting option closes with the wrong mark',
        'Subject-verb agreement with a singular subject followed by a plural phrase ("The collection of letters, photographs and notebooks ... is")',
        'A participial phrase at the start of a sentence whose subject must come right after the comma',
      ],
      traps: ['a comma splice offered as the join between two independent clauses', 'a semicolon before a fragment', 'the verb agreeing with the nearest noun instead of the subject', 'it\'s for its, their for its', 'a colon after an incomplete clause', 'one dash where the pair needs two'],
      exemplars: [
        `MC_QUESTION: Which choice completes the text so that it conforms to the conventions of Standard English?
\`\`\`passage
The James Webb Space Telescope's primary mirror is made of 18 hexagonal ______ each one coated in a thin layer of gold to reflect infrared light.
\`\`\`
A) segments,
B) segments;
C) segments
D) segments: and
Correct Answer: A
Explanation: "Each one coated ... light" is a modifying phrase, not an independent clause, so it is set off with a comma. A semicolon or a colon would need a complete clause after it.`,
        `MC_QUESTION: Which choice completes the text so that it conforms to the conventions of Standard English?
\`\`\`passage
The collection of letters, photographs and field notebooks kept by the expedition's members ______ now housed at the university library.
\`\`\`
A) are
B) is
C) were
D) have been
Correct Answer: B
Explanation: The subject is the singular "collection"; "of letters, photographs and field notebooks" is a prepositional phrase. The present tense fits "now."`,
        `MC_QUESTION: Which choice completes the text so that it conforms to the conventions of Standard English?
\`\`\`passage
Each of the three tide pools has ______ own community of organisms, shaped by how long the pool stays exposed at low tide.
\`\`\`
A) their
B) its
C) it's
D) there
Correct Answer: B
Explanation: "Each" is singular, so the possessive is "its." "It's" is the contraction of "it is."`,
      ],
    },
    {
      id: 'expression',
      name: 'Expression of Ideas',
      share: 'about 20% of the test',
      detect: /\b(expression of ideas|transitions?|rhetorical synthesis|synthesis|notes|student has taken|accomplish this goal)\b/i,
      skills: [
        'Transitions: the word or phrase that makes the logical relationship between two sentences explicit (contrast, cause, example, addition, sequence, restatement)',
        'Rhetorical Synthesis: a student\'s bulleted notes and a stated goal; the sentence that uses relevant notes to accomplish exactly that goal (emphasize a difference, introduce the topic to an unfamiliar audience, make a comparison, stress how far from a goal)',
      ],
      hard: [
        'A transition where the tempting option matches the tone but the wrong logical relation (a contrast that reads like an example)',
        'A synthesis item where two options use only true information from the notes and only one accomplishes the stated goal (emphasizing a gap needs both the target and the current number)',
      ],
      traps: ['a transition that fits the topic but not the logic (likewise where the sentences contrast)', 'an option that includes accurate notes but serves a different goal', 'an option that assumes the audience already knows the topic when the goal says they do not'],
      exemplars: [
        `MC_QUESTION: Which choice completes the text with the most logical transition?
\`\`\`passage
Early radio broadcasters assumed that listeners wanted mostly music. ______ the first regular news bulletins, introduced in the 1920s, quickly became the most popular programs on many stations.
\`\`\`
A) Likewise,
B) For example,
C) However,
D) In other words,
Correct Answer: C
Explanation: The second sentence contradicts the assumption in the first, so the transition must signal contrast.`,
        `MC_QUESTION: Which choice most effectively uses relevant information from the notes to accomplish this goal?
\`\`\`passage
While researching a topic, a student has taken the following notes:
- The Great Green Wall is an African-led project begun in 2007.
- Its goal is to restore 100 million hectares of degraded land across the Sahel region by 2030.
- As of 2023, about 18 million hectares had been restored.
- Restored land has provided jobs and food for local communities.

The student wants to emphasize how far the project remains from its goal.
\`\`\`
A) Begun in 2007, the Great Green Wall is an African-led project to restore degraded land across the Sahel region.
B) The Great Green Wall has restored about 18 million hectares of land, providing jobs and food for local communities.
C) Although the Great Green Wall aims to restore 100 million hectares by 2030, only about 18 million had been restored as of 2023.
D) The Great Green Wall, which began in 2007, had restored about 18 million hectares as of 2023.
Correct Answer: C
Explanation: Showing how far the project is from its goal needs both the target (100 million) and the progress (18 million). D gives the progress without the target.`,
      ],
    },
  ],
  scoreRange: { min: 200, max: 800 },
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: practice for a student past the basics. Skip the items nearly everyone gets (a transition where only one option is grammatical, a vocabulary blank with three absurd options): at most 1 item in 8 is that easy, never the first of a section. About half are typical test items and at least a third are the harder-module items described under WHAT HARD LOOKS LIKE. Order each section from typical to hard.`,
    hard: `DIFFICULTY ON THIS TEST: the student is working toward a top score, so write the items from the harder second module, the ones that separate 700 from 800. At least 4 of every 5 items must be ones a student scoring around 650-700 would get wrong: dense literary or historical passages with formal diction, function and purpose items on sentences that qualify or concede, cross-text items with partial agreement, evidence items where every option is true and only one bears on the claim, inference items that turn on a "however", boundary items with nonessential elements and long subjects, synthesis items where two options use true notes. Hard never means a longer passage than the test uses, trick wording, or obscure vocabulary the test would not test.`,
    easier: `DIFFICULTY ON THIS TEST: the first-module items most students get right, one clear idea each, in the test's voice, with plain passages. Still real test items, not worksheets.`,
  },
}
