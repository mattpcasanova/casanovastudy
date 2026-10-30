// The ACT Reading section (2025 "enhanced" ACT: 36 questions, four options;
// four passages: literary narrative, social science, humanities, natural
// science, one of them a paired set) as a reference for the guide prompts.
// The real test puts 9 questions on one 700-900 word passage; the app shows
// one passage per item, so items here carry a 120-250 word excerpt each.

import type { ExamProfile } from './types'

import { ACT_NAME } from './act-name'

export const ACT_READING: ExamProfile = {
  id: 'act-reading',
  pace: 67,
  name: 'the ACT Reading section',
  detect: {
    exam: ACT_NAME,
    exclude: /\b(math|algebra|geometry|grammar|punctuation|science passage|data representation|research summar|conflicting viewpoints)\b/i,
    subjectHints: /\b(reading|comprehension|passage|literary narrative|prose fiction|humanities|social science|natural science|main idea|inference|tone|author'?s purpose|paired passages?)\b/i,
    subjects: ['english'],
    explicit: /\bact\s+reading\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Every item is one passage excerpt followed by one question with exactly four options A-D. Never true/false, "I, II and III", free-response, or an item without a passage.
- The excerpt goes in a \`\`\`passage fence under the question line: 120-250 words, written by you in one of the test's four genres, opening with a line like "The following passage is adapted from a short story about a family's move to a desert town." or "The following passage is adapted from an essay on the history of lighthouses." A paired item shows "Passage A" and "Passage B" on their own lines, 60-120 words each.
- Keep the same passage subject going across several items of a section (the same story or essay, a different stretch each time), so a student reads the way the test asks; every item still stands alone with its own excerpt.
- Questions use the test's stems: "According to the passage, ...", "The main idea of the passage is that ...", "It can reasonably be inferred from the passage that ...", "As it is used in the passage, the word "X" most nearly means", "The author's attitude toward ... can best be described as", "The primary purpose of the passage is to ...", "Which of the following best describes the function of the second paragraph?", "The narrator describes ... mainly in order to ...", "Compared with Passage A, Passage B ...". Refer to text by quoting a phrase or naming the paragraph ("the second paragraph"), never by line number.
- The answer must be provable from the excerpt. Options are four full statements of similar length; the wrong ones are the test's kinds: true in the world but not in the passage, too strong (always, never, only), a detail from the wrong part, the opposite of the passage's point.
- Before writing an item's answer, reread the excerpt and check that exactly one option is supported. Fix the excerpt or the options until that is true. Never leave a note or a second attempt in the explanation.
- Explanations stay short: where in the excerpt the answer is, and why the most tempting wrong option fails.`,
  domains: [
    {
      id: 'key-ideas',
      name: 'Key Ideas and Details',
      share: 'about 52-60% of the test',
      detect: /\b(key ideas|details?|main idea|central idea|summar\w+|sequence|cause and effect|comparative relationship|according to the passage|inference|infer)\b/i,
      skills: [
        'Central ideas, themes and summaries of a passage or a paragraph',
        'Specific details stated in the passage ("According to the passage")',
        'Inferences and conclusions the passage supports but does not state',
        'Relationships: sequence of events, cause and effect, comparisons the passage draws',
      ],
      hard: [
        'An inference that needs two sentences combined, where a wrong option states only one of them',
        'A detail item whose answer is paraphrased in different words from the passage while a wrong option reuses the passage\'s words about something else',
        'A main-idea item on a passage that concedes a view before arguing against it',
      ],
      traps: ['an option that uses the passage\'s words about a different point', 'a statement that is true but goes beyond the passage', 'an "always" or "never" the passage did not say', 'the concession read as the main idea'],
      exemplars: [
        `MC_QUESTION: It can reasonably be inferred from the passage that the narrator's mother regards the move to Alamogordo as:
\`\`\`passage
The following passage is adapted from a short story about a family's move to a desert town.

My mother unpacked the kitchen first, as she always did, and by the second evening the shelves held her spices in the exact order they had kept in three other houses. She did not unpack the photographs. They stayed in their box in the hall for a month, and when I finally asked, she said the walls here were the wrong color for them, which was not a thing she had ever said about walls before. My father, meanwhile, had already learned the names of the neighbors on both sides and the man who sold firewood from a truck on Saturdays.
\`\`\`
A) a welcome change she has been planning for years.
B) temporary, since the family has moved three times before.
C) something she is reluctant to accept as permanent.
D) an improvement over the family's previous houses.
Correct Answer: C
Explanation: She settles the kitchen but leaves the photographs boxed with an excuse she has never used before, while the father settles in fully. B overreaches: nothing says this move is temporary.`,
        `MC_QUESTION: According to the passage, the narrator's father differs from the mother in that he:
\`\`\`passage
The following passage is adapted from a short story about a family's move to a desert town.

My mother unpacked the kitchen first, as she always did, and by the second evening the shelves held her spices in the exact order they had kept in three other houses. She did not unpack the photographs. They stayed in their box in the hall for a month. My father, meanwhile, had already learned the names of the neighbors on both sides and the man who sold firewood from a truck on Saturdays.
\`\`\`
A) has lived in the town before.
B) quickly gets to know the people around the new house.
C) takes responsibility for unpacking the house.
D) dislikes the color of the walls.
Correct Answer: B
Explanation: The passage says he "had already learned the names of the neighbors" and the firewood seller. C describes the mother; A and D are not in the passage.`,
      ],
    },
    {
      id: 'craft',
      name: 'Craft and Structure',
      share: 'about 25-30% of the test',
      detect: /\b(craft and structure|word choice|most nearly means|tone|attitude|point of view|purpose|function of|structure|narrator|author'?s)\b/i,
      skills: [
        'The meaning of a word or phrase as it is used in the passage (often a common word used in a less common sense)',
        'Text structure: the function of a paragraph or sentence, how the passage is organized',
        'The author\'s or narrator\'s purpose, tone, attitude and point of view, and how they differ from a character\'s',
      ],
      hard: [
        'A word with a common meaning that is not the one used in the passage ("the plan was sound")',
        'A tone item where the tempting option is the character\'s feeling rather than the author\'s stance',
        'A function item where the paragraph does something (qualifies, anticipates an objection) rather than says something',
      ],
      traps: ['the dictionary\'s first meaning instead of the one in context', 'a tone word that is too strong (contemptuous for skeptical)', 'the content of a paragraph given as its function'],
      exemplars: [
        `MC_QUESTION: As it is used in the passage, the word "sound" most nearly means:
\`\`\`passage
The following passage is adapted from an essay on the history of lighthouses.

The plan to build a tower on the Eddystone rocks was sound, but the sea was not interested in plans. The first tower stood six years. Its builder, confident enough to spend a stormy night inside it, was never seen again after the night of 26 November 1703, and neither was the tower.
\`\`\`
A) noisy
B) reasonable
C) healthy
D) complete
Correct Answer: B
Explanation: "The plan ... was sound, but the sea was not interested in plans" contrasts a reasonable plan with an indifferent sea. "Noisy" is the common meaning, not the one used here.`,
        `MC_QUESTION: The author's attitude toward the builder of the first tower can best be described as:
\`\`\`passage
The following passage is adapted from an essay on the history of lighthouses.

The plan to build a tower on the Eddystone rocks was sound, but the sea was not interested in plans. The first tower stood six years. Its builder, confident enough to spend a stormy night inside it, was never seen again after the night of 26 November 1703, and neither was the tower. The second tower, of oak and iron, burned. The third was built of stone blocks cut to lock into one another, and it is the third that every lighthouse since has copied.
\`\`\`
A) openly contemptuous of his recklessness.
B) wryly aware of his misplaced confidence.
C) warmly admiring of his courage.
D) indifferent to his fate.
Correct Answer: B
Explanation: "Confident enough to spend a stormy night inside it ... never seen again" is dry understatement about overconfidence. Contemptuous (A) is too strong, and the author is neither admiring nor indifferent.`,
      ],
    },
    {
      id: 'integration',
      name: 'Integration of Knowledge and Ideas',
      share: 'about 13-19% of the test',
      detect: /\b(integration of knowledge|paired passages?|passage a|passage b|two passages|argument|claims?|evidence|reasoning|compare|contrast)\b/i,
      skills: [
        'Arguments: the claim, the evidence offered for it, and whether the reasoning supports the claim',
        'Paired passages: what the two authors agree and disagree about, how one would respond to the other, how their purposes and tones differ',
      ],
      hard: [
        'A paired item where the two passages agree on the facts and differ on their significance',
        'An evidence item where the tempting option is a claim, not the support for it',
      ],
      traps: ['assuming the two passages disagree about everything', 'a claim mistaken for evidence', 'a point made in only one passage attributed to both'],
      exemplars: [
        `MC_QUESTION: Compared with the author of Passage A, the author of Passage B is more:
\`\`\`passage
Passage A
The following passage is adapted from an essay on reading habits.

Surveys show that the number of adults who read a book for pleasure each year has fallen for two decades. Libraries, which once measured success in books lent, now count visits to makerspaces and language classes. Something has been lost that no number of 3D printers replaces.

Passage B
The following passage is adapted from an article on public libraries.

The same surveys that show fewer adults reading novels show more of them reading, full stop: on phones, in forums, in the long comment threads under recipes. Libraries that lend fewer books but teach more people to find reliable information are not abandoning reading. They are following it to where it went.
\`\`\`
A) concerned that fewer adults read books for pleasure.
B) willing to see new library services as a continuation of reading rather than a loss.
C) skeptical of what surveys about reading can show.
D) focused on the history of public libraries.
Correct Answer: B
Explanation: Both cite the same surveys; A mourns what was lost, B argues reading moved and libraries followed. B does not doubt the surveys (C); it uses them.`,
      ],
    },
  ],
  scoreRange: { min: 1, max: 36 },
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the giveaways (a detail the excerpt states in the same words). At most 1 item in 8 that easy, never first in a section; about half typical, at least a third of the harder kind under WHAT HARD LOOKS LIKE. Within a section, mix them as the test does.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 30 from a 35. At least 4 of every 5 must be ones a student scoring in the mid-20s would miss: inferences that combine two sentences, words used in their less common sense, tone and function items, paired items that turn on significance rather than fact, options that reuse the passage's words about something else. Hard never means a longer excerpt than the test uses or vocabulary the test would not test.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one stated detail or one clear main idea each, with plain excerpts. Still real test items.`,
  },
}
