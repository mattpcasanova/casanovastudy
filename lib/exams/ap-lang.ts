// The AP English Language and Composition exam as a reference for the guide
// prompts: Section I multiple choice with FIVE options A-E (reading questions
// on nonfiction passages and writing questions on a draft), Section II three
// essays (synthesis, rhetorical analysis, argument) scored on the 6-point
// rubric (thesis 1, evidence and commentary 4, sophistication 1).

import type { ExamProfile } from './types'

export const AP_LANG: ExamProfile = {
  id: 'ap-lang',
  name: 'the AP English Language and Composition exam',
  detect: {
    exam: /\bAP\s+(?:english\s+)?lang(?:uage)?(?:\s+(?:and|&)\s+comp(?:osition)?)?\b/i,
    exclude: /\bAP\s+(?:english\s+)?lit(?:erature)?\b/i,
    subjectHints: /./,
    subjects: ['english'],
    explicit: /\bAP\s+(?:english\s+)?lang(?:uage)?\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly FIVE options A-E, as on Section I of this exam (never four). No true/false, no "I, II and III" lists. Every item is about a passage: the relevant stretch (80-220 words of nonfiction: an essay, a speech, a letter, an editorial, a memoir, written by you in a named genre and era, e.g. "The following is an excerpt from a 1910 speech to a teachers' association.") goes in a \`\`\`passage fence under the question line, with the sentence or phrase the item asks about in [[double brackets]]. Items that share a passage each repeat their stretch, so every item stands alone.
- Reading items use the exam's stems: "The writer's primary purpose in the passage is to ...", "In the second paragraph, the writer's reference to ... primarily serves to ...", "The writer most likely includes the statistic in order to ...", "Which of the following best describes the function of the underlined sentence?", "The writer's tone in the passage can best be described as ...", "The writer uses the word "X" to ...", "The writer's argument relies on the assumption that ...", "The passage's organization can best be described as ...".
- Writing items present a student draft (a paragraph or two, sentences numbered in the passage as "(1) ...", "(2) ...") and use the exam's stems: "The writer is considering adding the following sentence after sentence 3: ... Should the writer make this addition?", "Which of the following versions of the underlined sentence most effectively establishes the writer's line of reasoning?", "The writer wants to provide evidence that ... Which of the following would best accomplish this goal?", "In sentence 5, the writer wants to acknowledge a counterargument. Which choice ...?", "Which of the following transitions, if added to the beginning of sentence 4, would best ...?"
- Free-response items are SA_QUESTION and ask for a paragraph-length piece of an essay, in the exam's voice: "Write a thesis statement for an essay that analyzes the rhetorical choices the writer makes to ...", "In one paragraph, analyze how the writer's use of [a specific choice] in the passage conveys ...", "Write an argument paragraph that defends, challenges or qualifies the claim that ..., using one specific piece of evidence". The Sample Answer is the rubric: what earns the thesis point (a defensible claim about the choices and their effect, not a restatement), what earns evidence and commentary points (specific evidence from the passage, commentary that explains how the choice works on the audience), and what sophistication looks like.
- Options are five parallel statements of similar length; the wrong ones are the misreadings under WRONG ANSWERS ARE BUILT FROM. Rhetorical terms appear only as the exam uses them (juxtaposition, anecdote, qualification, concession), never as the point of the item.
- Before writing an item's answer, reread the passage and check that exactly one option is supported by the text. Fix the passage or the options until that is true. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the evidence in the passage, and why the most tempting wrong option fails.`,
  domains: [
    {
      id: 'situation',
      name: 'Rhetorical Situation',
      share: 'about 20-25% of the reading questions',
      detect: /\b(rhetorical situation|exigence|audience|purpose|speaker|context|occasion|persona|rhetorical triangle)\b/i,
      skills: [
        'Identifying the exigence, audience, purpose and speaker from the text itself, and how the writer adjusts choices to the audience',
        'How a writer establishes credibility and relates to the audience (shared values, concessions, direct address)',
        'In a draft: adding or revising sentences so they fit the audience and purpose',
      ],
      hard: [
        'A purpose item where the passage does two things and the primary purpose is the second (describe, then urge)',
        'An audience inference from small cues (what the writer explains and what is assumed)',
        'A draft item where the proposed sentence is true and relevant but aimed at the wrong audience or undercuts the purpose',
      ],
      traps: ['the topic given as the purpose', 'the writer\'s stated audience confused with the actual audience', 'an addition that is informative but off purpose'],
      exemplars: [
        `MC_QUESTION: The writer's primary purpose in the passage is to
\`\`\`passage
The following is an excerpt from a 1912 address by a city librarian to a meeting of the city council.

I will not pretend that the reading room is quiet. On a winter afternoon it holds two hundred people, most of them children, and children are not quiet. But I ask the council to notice where those children are not: they are not on the docks, and they are not in the alleys behind the mills. [[The reading room costs the city eleven cents a day for each child in it.]] I have not been able to learn what the alleys cost.
\`\`\`
A) describe the daily operations of the reading room
B) persuade the council to continue funding the reading room by reframing its cost
C) apologize for the noise the children make
D) criticize the council for neglecting the docks and the mills
E) explain why children prefer the library to the streets
Correct Answer: B
Explanation: The concession about noise sets up the argument; the comparison of eleven cents with the unknown cost of the alleys asks the council to see the room as a bargain. A and C describe single moves, not the purpose.`,
        `MC_QUESTION: The writer is considering adding the following sentence after sentence 2: "Many people enjoy spending time outdoors." Should the writer make this addition?
\`\`\`passage
(1) Our town should convert the abandoned rail line into a walking and biking trail. (2) Towns that have done so report higher property values along the route and more customers for nearby businesses. (3) The conversion would cost about $2 million, which the state's trail grant program could cover in full.
\`\`\`
A) Yes, because it introduces the benefit the next sentence develops.
B) Yes, because it acknowledges readers who do not use trails.
C) No, because it is a generalization that adds no evidence for the claim in sentence 1.
D) No, because it contradicts the economic argument in sentence 2.
E) No, because it should be placed before sentence 1 as the thesis.
Correct Answer: C
Explanation: The paragraph argues with specific economic evidence; a vague statement about enjoying the outdoors supports nothing and breaks the line of reasoning. D is wrong because the sentence does not contradict anything.`,
      ],
    },
    {
      id: 'claims',
      name: 'Claims and Evidence',
      share: 'about 25-30% of the reading questions',
      detect: /\b(claims? and evidence|thesis|claim|evidence|support|counterargument|concession|refutation|qualif\w+|assumption|anecdote|statistic|example|testimony|synthesis|source)\b/i,
      skills: [
        'Identifying the writer\'s claim and the evidence offered for it; how a piece of evidence (an anecdote, a statistic, an expert, a comparison) functions in the argument',
        'Recognizing concessions, qualifications and refutations, and the assumptions an argument depends on',
        'In a draft: choosing the evidence that best supports a specific claim, and where a counterargument belongs',
      ],
      hard: [
        'An item where several options name evidence the passage contains and only one names what it does for the argument',
        'An assumption item: the unstated belief the argument needs, not a claim the writer makes',
        'A draft item where two options give relevant evidence and only one supports the exact claim in the sentence',
      ],
      traps: ['evidence identified but its function misnamed', 'a stated claim offered as the hidden assumption', 'evidence that fits the topic but not the specific claim'],
      exemplars: [
        `MC_QUESTION: The writer most likely includes the figure of eleven cents in order to
\`\`\`passage
The following is an excerpt from a 1912 address by a city librarian to a meeting of the city council.

I ask the council to notice where those children are not: they are not on the docks, and they are not in the alleys behind the mills. [[The reading room costs the city eleven cents a day for each child in it.]] I have not been able to learn what the alleys cost.
\`\`\`
A) demonstrate that the library's accounting is precise
B) make the reading room's cost seem small next to a cost the council cannot measure
C) suggest that the council should raise the library's budget
D) show that most of the library's visitors are children
E) concede that the reading room is expensive to operate
Correct Answer: B
Explanation: The precise, small number is set against the unknowable cost of the alleys; the contrast is the argument. E reverses the point.`,
        `MC_QUESTION: The writer's argument in the passage relies on the assumption that
\`\`\`passage
The following is an excerpt from a 2015 opinion column.

Every year the district spends more on security cameras and less on counselors, and every year the number of students suspended goes up. If we want fewer suspensions, we should stop watching students and start listening to them.
\`\`\`
A) security cameras are more expensive than counselors
B) suspensions are caused in part by a lack of adults who listen to students
C) students prefer counselors to cameras
D) the district has not increased its overall budget
E) cameras do not reduce crime in schools
Correct Answer: B
Explanation: The proposal (more listening, fewer suspensions) only follows if suspensions are connected to a shortage of adults who listen; the passage never states this. A and D are not needed for the argument.`,
      ],
    },
    {
      id: 'reasoning',
      name: 'Reasoning and Organization',
      share: 'about 20-25% of the reading questions',
      detect: /\b(reasoning|organization|line of reasoning|structure|paragraph|transition|sequence|cause and effect|comparison|problem[- ]solution|narrative|introduction|conclusion|function of)\b/i,
      skills: [
        'How a passage is organized (narration to argument, problem and solution, comparison, cause and effect) and what a paragraph or sentence does in the line of reasoning',
        'Transitions and the logical relationships they signal; how an introduction or conclusion frames the argument',
        'In a draft: the best transition, where a sentence belongs, whether a sentence should be deleted, how to open or close',
      ],
      hard: [
        'A function item on a sentence that pivots the argument (a concession that sets up the rebuttal)',
        'A transition that must fit the logic of both the sentence before and after, where the tempting option fits one',
        'An organization item on a passage that moves from the particular to the general, where the tempting option names the reverse',
      ],
      traps: ['what a sentence says offered as what it does', 'a transition that matches tone but not logic', 'an organization label that fits one paragraph but not the passage'],
      exemplars: [
        `MC_QUESTION: Which of the following best describes the function of the underlined sentence in the passage as a whole?
\`\`\`passage
The following is an excerpt from a 1912 address by a city librarian to a meeting of the city council.

[[I will not pretend that the reading room is quiet.]] On a winter afternoon it holds two hundred people, most of them children, and children are not quiet. But I ask the council to notice where those children are not: they are not on the docks, and they are not in the alleys behind the mills.
\`\`\`
A) It states the thesis that the reading room needs more space.
B) It concedes a likely objection so that the writer can redirect attention to a larger benefit.
C) It apologizes to the council for the library's failure to enforce rules.
D) It introduces the statistic that follows.
E) It contrasts the reading room with the docks and the mills.
Correct Answer: B
Explanation: Granting the noise up front disarms the complaint the council is most likely to raise, and "But I ask the council to notice" then turns to the real point. E describes a later sentence.`,
      ],
    },
    {
      id: 'style',
      name: 'Style',
      share: 'about 20-25% of the reading questions',
      detect: /\b(style|tone|diction|word choice|syntax|figurative|metaphor|simile|irony|juxtaposition|repetition|parallel|imagery|connotation|register|sentence length|punctuation choice)\b/i,
      skills: [
        'How word choice, syntax, figurative language, repetition and juxtaposition create tone and advance the argument',
        'The effect of a specific choice ("the writer\'s use of X conveys ...") rather than the naming of a device',
        'In a draft: the word or phrasing that keeps the tone consistent and the meaning precise',
      ],
      hard: [
        'A tone item where the tempting option is close but too strong (contemptuous for skeptical, mournful for wistful)',
        'An effect item where the device is obvious and the effect must be tied to the argument, not just named',
        'A diction item where the word\'s connotation does the work (what "alleys" suggests beyond "streets")',
      ],
      traps: ['a tone word too strong for the passage', 'a device named without its effect', 'the dictionary meaning instead of the connotation in context'],
      exemplars: [
        `MC_QUESTION: The writer's tone in the passage can best be described as
\`\`\`passage
The following is an excerpt from a 1912 address by a city librarian to a meeting of the city council.

I will not pretend that the reading room is quiet. On a winter afternoon it holds two hundred people, most of them children, and children are not quiet. But I ask the council to notice where those children are not: they are not on the docks, and they are not in the alleys behind the mills. The reading room costs the city eleven cents a day for each child in it. I have not been able to learn what the alleys cost.
\`\`\`
A) bitterly sarcastic
B) anxious and apologetic
C) plainspoken and quietly pointed
D) detached and clinical
E) sentimental and nostalgic
Correct Answer: C
Explanation: Short declarative sentences and a dry final line make the point without raising the voice. A overstates the edge in the last sentence, and B misreads the opening concession as apology.`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the giveaways (a tone item with four absurd options). At most 1 item in 8 that easy, never first in a section; about half typical (one move in the passage, read correctly) and at least a third of the kind under WHAT HARD LOOKS LIKE. Free-response parts should need a defensible thesis and commentary that explains how a choice works, not what it is called.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 4 from a 5. At least 4 of every 5 items must be ones a student headed for a 3 would miss: purposes that are the second thing a passage does, assumptions rather than claims, functions of pivot sentences, tone with near-miss options, draft revisions where two options are relevant and one serves the exact goal. Hard never means obscure vocabulary or terminology for its own sake.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one clear move each, with plain passages. Still real exam items.`,
  },
}
