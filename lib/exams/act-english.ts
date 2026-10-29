// The ACT English section (the 2025 "enhanced" ACT: 50 questions, four
// options) as a reference for the guide prompts. Items are an essay with
// underlined portions; the app shows the relevant stretch of the essay as a
// passage with the underlined portion in [[double brackets]].

import type { ExamProfile } from './types'

import { ACT_NAME } from './act-name'

export const ACT_ENGLISH: ExamProfile = {
  id: 'act-english',
  name: 'the ACT English section',
  detect: {
    exam: ACT_NAME,
    exclude: /\b(math|algebra|geometry|trig|reading comprehension|science|data representation|research summar)\b/i,
    subjectHints: /\b(english|grammar|punctuation|usage|rhetoric\w*|conventions|writing|transitions?|commas?|semicolons?|essay|sentence structure|wordiness|concision|redundan\w+)\b/i,
    subjects: ['english'],
    explicit: /\bact\s+english\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Every item is multiple choice with exactly four options A-D. Never true/false, "I, II and III", free-response, or an item without the essay text.
- Each item carries the stretch of the essay it is about in a \`\`\`passage fence under the question line: 40-140 words, written by you, from a personal essay, a short informative piece, or a profile (the essay genres the test uses). The portion the item asks about is wrapped in [[double brackets]]. Keep the same essay going across several items of a section (same topic and voice), each item showing its own stretch, so a student feels the essay; every item still stands alone.
- Underlined-portion items: the question line is the test's instruction, e.g. "Which choice best replaces the underlined portion? If the underlined portion is correct as written, choose NO CHANGE." and option A is always "NO CHANGE". The other three options are rewrites of the underlined portion only, each wrong for a reason (a comma splice, a dangling modifier, a wrong verb form, wordiness, a vague pronoun, a tone shift), never merely a different style.
- Rhetorical items ask a question in the test's words: "Which choice most effectively introduces the paragraph?", "Given that all the choices are accurate, which one provides the most specific detail?", "The writer is considering deleting the underlined sentence. Should the writer make this deletion?" (options: Yes, because ... / No, because ...), "Which choice provides the best transition from the preceding paragraph?", "The writer wants to emphasize ... Which choice best accomplishes this goal?", "Where should the underlined sentence be placed?" (options: Where it is now / Before the first sentence / After the second sentence / ...).
- Each option replaces ONLY the bracketed words; the text outside the brackets stays exactly as written. Write out the full sentence with each option dropped in and read it: the keyed option must make a complete, correct sentence with the words that follow, and the three others must each fail. An option that only works if the rest of the sentence changed is wrong and must be rewritten.
- Test only rules with one accepted answer on the test. Never build an item on a style preference: singular "they" vs "him or her", the serial comma, a comma before a trailing subordinate clause, "which" vs "that" in an essential clause, or "wordy but correct" vs "concise". For a comma-splice item, the period option must leave a fragment or a plainly broken sentence, not a defensible shorter one; if two options would both be accepted by a careful editor, rewrite one.
- Keep NO CHANGE the keyed answer about a quarter of the time, so it is a real option.
- Before writing an item's answer, reread the stretch and check that exactly one option produces a correct, clear, consistent sentence or accomplishes the stated goal; the three others must each fail for a nameable reason. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the rule or goal, and why the most tempting wrong option fails.`,
  domains: [
    {
      id: 'conventions',
      name: 'Conventions of Standard English',
      share: 'about 52-55% of the test',
      detect: /\b(conventions|grammar|punctuation|usage|commas?|semicolons?|colons?|dash|apostrophe|possessive|pronoun|verb|tense|agreement|modifier|fragment|run[- ]on|comma splice|sentence structure|parallel)\b/i,
      skills: [
        'Sentence structure and formation: fragments, run-ons and comma splices, misplaced and dangling modifiers, parallel structure, shifts in construction',
        'Punctuation: commas (around nonessential elements, between items, not between subject and verb), semicolons between independent clauses, colons after a complete clause, dashes, apostrophes for possession and contractions, unnecessary punctuation',
        'Usage: subject-verb and pronoun-antecedent agreement, verb tense and form, pronoun case (who/whom, I/me), comparative and superlative forms, idiom and preposition choice, commonly confused words (its/it\'s, their/there, affect/effect)',
      ],
      hard: [
        'A long subject with a plural noun right before the verb',
        'Nonessential vs essential clauses (which with commas, that without), and a pair of dashes or commas that must close',
        'A sentence that is grammatical in two options but only one keeps the meaning or avoids a comma splice elsewhere in the sentence',
        'Unnecessary punctuation: the keyed answer removes a comma the others keep in different places',
        'Who vs whom, or a pronoun whose antecedent is ambiguous',
      ],
      traps: ['a comma between a subject and its verb', 'a semicolon joining a clause to a fragment', 'its/it\'s and their/there', 'the verb agreeing with the nearest noun', 'adding punctuation where none is needed', 'one dash where a pair is needed'],
      exemplars: [
        `MC_QUESTION: Which choice best replaces the underlined portion? If the underlined portion is correct as written, choose NO CHANGE.
\`\`\`passage
My grandmother's bakery opened in 1962 on a corner that has since seen three banks, two phone stores and a yoga studio come and go. The bakery [[remains, its windows]] still fogging every morning when the first trays come out of the oven.
\`\`\`
A) NO CHANGE
B) remains; its windows
C) remains, its windows,
D) remains its windows
Correct Answer: A
Explanation: "Its windows still fogging ..." is an absolute phrase that modifies the sentence, so a comma sets it off. A semicolon would need an independent clause after it, and D runs the two together.`,
        `MC_QUESTION: Which choice best replaces the underlined portion? If the underlined portion is correct as written, choose NO CHANGE.
\`\`\`passage
Each of the apprentices who train under her for the summer [[learn]] to laminate dough by hand before touching a machine.
\`\`\`
A) NO CHANGE
B) learns
C) have learned
D) are learning
Correct Answer: B
Explanation: The subject is "Each," which is singular; "of the apprentices who train" is a modifying phrase. Only B is singular.`,
      ],
    },
    {
      id: 'production',
      name: 'Production of Writing',
      share: 'about 29-32% of the test',
      detect: /\b(production of writing|topic development|organization|unity|cohesion|transition|introduc\w+|conclusion|placement|delete|deleting|add|relevant|purpose|goal|paragraph)\b/i,
      skills: [
        'Topic development: whether a sentence or detail supports the paragraph\'s purpose; what to add or delete and why; which choice best accomplishes a stated goal (emphasize, specify, introduce, conclude)',
        'Organization, unity and cohesion: the best opening or closing sentence, the most logical transition between sentences or paragraphs, where a sentence belongs in a paragraph, whether the essay meets a stated purpose',
      ],
      hard: [
        'A deletion item where the sentence is true and interesting but off the paragraph\'s point (delete it) or looks like a digression but sets up the next sentence (keep it)',
        'A placement item that depends on a pronoun or "this" needing its antecedent in the sentence before',
        'A transition that must fit the logic of both the preceding and the following paragraph, not just one',
        'A goal item where two options are accurate and only one does what the goal says ("emphasize how long the process takes" needs a number or a duration)',
      ],
      traps: ['keeping a sentence because it is true rather than because it belongs', 'a transition that matches tone but not logic', 'an introduction that previews the wrong paragraph', 'a choice that is specific but about the wrong thing'],
      exemplars: [
        `MC_QUESTION: The writer is considering deleting the underlined sentence. Should the writer make this deletion?
\`\`\`passage
Laminating dough means folding butter into it again and again until the layers number in the hundreds. The folds must be made quickly, before the butter softens. [[Butter is made by churning cream until the fat separates from the liquid.]] A warm kitchen can ruin a batch in minutes, so my grandmother laminates at dawn.
\`\`\`
A) Yes, because the sentence does not explain why butter must stay cold.
B) Yes, because the sentence shifts the focus away from the laminating process to how butter is made.
C) No, because the sentence explains what the butter in the dough is made of.
D) No, because the sentence provides a detail that supports the claim that the kitchen must be cool.
Correct Answer: B
Explanation: The paragraph is about laminating and keeping the butter cold; how butter is churned is a different topic. D is wrong because the sentence says nothing about temperature.`,
        `MC_QUESTION: Given that all the choices are accurate, which one most effectively emphasizes how long the bakery's signature loaf takes to make?
\`\`\`passage
The bakery's signature loaf is its sourdough, [[which is popular with regulars]].
\`\`\`
A) NO CHANGE
B) which begins as a starter fed twice a day for three days before the dough is even mixed
C) which my grandmother learned to make from her own mother
D) which sells out most mornings before nine
Correct Answer: B
Explanation: Only B gives a duration (three days of feeding before mixing), which is what "how long it takes" asks for. The others are accurate but about popularity or history.`,
      ],
    },
    {
      id: 'language',
      name: 'Knowledge of Language',
      share: 'about 13-19% of the test',
      detect: /\b(knowledge of language|word choice|precision|concision|wordiness|wordy|redundan\w+|style|tone|register|consistent|vague|precise)\b/i,
      skills: [
        'Precision and concision: the option that says what is meant in the fewest clear words; removing redundancy ("annually every year") and empty phrases',
        'Style and tone: a word that keeps the essay\'s register (no slang in a formal piece, no stiff formality in a personal one), consistent point of view',
      ],
      hard: [
        'Redundancy that spans two sentences or hides in a modifier ("the final result at the end")',
        'A word-choice item where three options are near-synonyms and only one fits the exact meaning and tone of the sentence',
        'An option that is concise but drops a needed idea, against one that is longer but complete',
      ],
      traps: ['the longest, most "formal" option read as the best one', 'a synonym that is close but shifts the meaning', 'cutting a phrase that carried information'],
      exemplars: [
        `MC_QUESTION: Which choice best replaces the underlined portion? If the underlined portion is correct as written, choose NO CHANGE.
\`\`\`passage
The loaves are [[weighed on a scale to check their weight]] before they go into the oven, so that each one bakes at the same rate.
\`\`\`
A) NO CHANGE
B) weighed to check their weight on a scale
C) weighed
D) weighed in order to find out how heavy each one is
Correct Answer: C
Explanation: "Weighed" already means checking the weight on a scale; the other options repeat the idea.`,
        `MC_QUESTION: Which choice best replaces the underlined portion? If the underlined portion is correct as written, choose NO CHANGE.
\`\`\`passage
When the health inspector arrived unannounced, my grandmother [[freaked out]] for a moment, then handed him a warm roll and walked him through the kitchen.
\`\`\`
A) NO CHANGE
B) was seized with the most profound consternation
C) stiffened
D) had a cow
Correct Answer: C
Explanation: The essay is a warm personal piece in plain language; "freaked out" and "had a cow" are slang, and B is stiff and overblown. "Stiffened" fits the register and the brief moment.`,
      ],
    },
  ],
  scoreRange: { min: 1, max: 36 },
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the giveaways. Skip the items where three options are plainly ungrammatical: at most 1 in 8 that easy, never first in a section. About half typical (one rule, applied in a real sentence) and at least a third of the harder kind described under WHAT HARD LOOKS LIKE. The test mixes difficulties within a passage, so do not order easy to hard.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 30 from a 35. At least 4 of every 5 must be ones a student scoring in the mid-20s would miss: punctuation with nonessential elements and long subjects, deletion and placement items that turn on the paragraph's logic, redundancy spread across a sentence, near-synonym word choice, items where two options are grammatical and only one keeps the meaning. Hard never means obscure rules the test does not test.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one clear rule or one clear rhetorical goal each, in the test's format. Still real test items.`,
  },
}
