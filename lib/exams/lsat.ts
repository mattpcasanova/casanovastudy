// The LSAT (August 2024 format onward) as a reference for the guide prompts:
// two scored Logical Reasoning sections, one Reading Comprehension section,
// unscored Argumentative Writing; every scored item multiple choice with five
// options. Exemplars written here in the test's voice.

import type { ExamProfile } from './types'

export const LSAT: ExamProfile = {
  id: 'lsat',
  pace: 82,
  name: 'the LSAT',
  detect: {
    exam: /\bLSAT\b/,
    subjectHints: /./,
    subjects: ['english', 'other', 'history', 'social-studies', 'social studies'],
    explicit: /\bLSAT\b/,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Every scored item is multiple choice with exactly FIVE options A-E, as on the LSAT. No true/false, no "I, II and III" lists, no student-typed numbers. The only free response is the Argumentative Writing task (SA_QUESTION, see below). There are no Logic Games (analytical reasoning) on the test since August 2024; never write one.
- Logical Reasoning items put the stimulus (an argument or a set of facts, 40-100 words, often in the voice of a named role: "Columnist:", "Economist:", "Ethicist:") in a \`\`\`passage fence under the question line, then the stem in the test's exact words: "Which one of the following, if true, most seriously weakens the argument?", "Which one of the following, if true, most strengthens the argument?", "The argument requires the assumption that", "The conclusion follows logically if which one of the following is assumed?", "The argument's reasoning is flawed because the argument", "Which one of the following most accurately expresses the main conclusion of the argument?", "If the statements above are true, which one of the following must also be true?", "Which one of the following is most strongly supported by the information above?", "The reasoning in which one of the following arguments is most similar to the reasoning in the argument above?", "Which one of the following principles, if valid, most helps to justify the reasoning above?", "Which one of the following, if true, most helps to resolve the apparent discrepancy?", "The statement in [[brackets]] plays which one of the following roles in the argument?" Always "Which one of the following", never "Which of the following".
- Options are written in the test's abstract register: flaw options describe the error in general terms ("takes a condition that is sufficient for a result to be necessary for it", "treats evidence that a claim is unsupported as evidence that the claim is false"); parallel-reasoning options are complete miniature arguments; principle options are general rules. Wrong options are the LSAT's: out of scope, too strong, a reversal, the opposite task, a premise restated, or a flaw the argument does not commit.
- Reading Comprehension passages (400-500 words, written by you and attributed to no one; law, humanities, natural science, social science; one set in each guide may be a comparative pair labeled "Passage A" and "Passage B") sit in a \`\`\`passage fence under each item that uses them; every item repeats its passage so it stands alone. Stems: "Which one of the following most accurately expresses the main point of the passage?", "The author's attitude toward X can most accurately be described as", "The passage most strongly supports which one of the following?", "The primary function of the second paragraph is to", "Which one of the following is most analogous to ...?", "Both passages are concerned with answering which one of the following questions?"
- Argumentative Writing items are SA_QUESTION: a short debatable issue with two to four perspectives in a passage fence, then "Write a thesis statement that takes a clear position and names the perspective it most directly responds to" or "Write one paragraph that develops your position and addresses one counterargument." The Sample Answer gives the holistic criteria (a clear position, engagement with at least one perspective, a reason supported by an example, consideration of a counterargument, organized prose) and a model answer of 3-5 sentences.
- Before writing an item's answer, check that exactly one option does what the stem asks and that each other option fails for a nameable reason. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the gap or the inference, and why the most tempting wrong option fails.`,
  domains: [
    {
      id: 'lr-assumption',
      name: 'Logical Reasoning: the assumption family (strengthen, weaken, assumption, flaw, evaluate)',
      share: 'about half of the roughly 50 scored Logical Reasoning items',
      detect: /\b(logical reasoning|\bLR\b|assumption|strengthen|weaken|flaw\w*|evaluate|causal|correlation|sufficient|necessary|argument)\b/i,
      skills: [
        'Finding the conclusion and the support, and stating the gap in one sentence',
        'Weaken and strengthen: alternative causes, sample and survey problems, missing comparisons, whether a plan achieves its goal',
        'Necessary assumption (the negation test) and sufficient assumption (the option that makes the conclusion follow)',
        'Flaw items: the named families (sufficient/necessary confusion, part to whole, ad hominem, equivocation, percent vs number, unrepresentative sample, appeal to ignorance, circular reasoning)',
        'Evaluate items: the question whose answer would bear on the conclusion',
      ],
      hard: [
        'A weakener that works only after the conclusion\'s precise scope is noticed (all vs most, "the only way", "should")',
        'A necessary assumption that is modest and dull next to attractive stronger options',
        'A flaw described abstractly where two options name real flaws and only one fits this argument',
        'A causal argument where the right option introduces reversed causation without using the word',
      ],
      traps: ['an option that strengthens when the stem asks to weaken', 'an assumption too strong to be necessary', 'an option about a different conclusion than the one drawn', 'a flaw the argument does not actually commit'],
      exemplars: [
        `MC_QUESTION: Which one of the following, if true, most seriously weakens the argument?
\`\`\`passage
Columnist: Since the city replaced its central library with smaller neighborhood branches, the new branch in Riverside has averaged far fewer visitors per day than the old central library did. Clearly, the decision to open neighborhood branches has reduced the number of people in the city who use libraries.
\`\`\`
A) The Riverside branch is open for more hours each week than the old central library was.
B) Several other neighborhood branches opened at the same time as the Riverside branch, and their combined daily visitors exceed the old central library's.
C) The Riverside branch's collection is considerably smaller than the old central library's was.
D) The city plans to open two additional neighborhood branches next year.
E) Most visitors to the Riverside branch live within a mile of it.
Correct Answer: B
Explanation: The columnist compares one branch with the whole old system. If the branches together draw more visitors than the central library did, library use rose, and the conclusion fails. Choice C, if anything, supports the columnist; A and D do not bear on how many people use libraries now.`,
        `MC_QUESTION: The argument's reasoning is flawed because the argument
\`\`\`passage
Everyone who regularly reads literary fiction has a well-developed capacity for empathy. Dana has a well-developed capacity for empathy. It follows that Dana regularly reads literary fiction.
\`\`\`
A) relies on a generalization about readers of literary fiction that is not supported by evidence
B) treats a characteristic that all members of a group share as sufficient for membership in that group
C) fails to consider that some people who read literary fiction may not do so regularly
D) presumes, without justification, that empathy cannot be developed in more than one way
E) confuses a claim about what people value with a claim about what people do
Correct Answer: B
Explanation: The premise makes reading fiction sufficient for empathy; the argument treats empathy as sufficient for reading fiction, the classic reversal. Choice D is close but describes a presumption the argument would need, not the structural error it makes.`,
      ],
    },
    {
      id: 'lr-inference',
      name: 'Logical Reasoning: the inference and structure family (must be true, main conclusion, method, parallel, principle, paradox, role)',
      share: 'about half of the scored Logical Reasoning items',
      detect: /\b(inference|must be true|most strongly supported|main conclusion|method of reasoning|parallel|principle|paradox|discrepanc|role|structure|point at issue|disagree)\w*/i,
      skills: [
        'Must be true and most strongly supported: combining conditional and quantified statements (all, some, most, none) exactly as far as they go',
        'Main conclusion and role items: separating the conclusion from the evidence, the concession and the intermediate conclusion',
        'Method of reasoning and parallel reasoning: matching the structure (conditional chain, analogy, counterexample) rather than the topic',
        'Principle items: the general rule that justifies the specific judgment, or the judgment that conforms to the rule',
        'Resolve the paradox and point at issue: the fact that reconciles two findings; the claim two speakers disagree about',
      ],
      hard: [
        'A must-be-true item where several options are plausible in the world and only one follows from the statements',
        'A parallel-flaw item where the topics are unrelated and one option matches the structure exactly',
        'A main-conclusion item where the first sentence is a concession and the conclusion sits in the middle',
        'A paradox item whose resolving fact is modest while the distractors deepen the puzzle',
      ],
      traps: ['an inference that goes one step beyond the statements', 'a parallel option that matches the topic rather than the structure', 'an intermediate conclusion offered as the main one', 'a principle that is too narrow to cover the case'],
      exemplars: [
        `MC_QUESTION: If the statements above are true, which one of the following must also be true?
\`\`\`passage
All of the law firm's senior partners have practiced law for at least twenty years. Some of the firm's senior partners teach at the university's law school. Anyone who teaches at the university's law school holds a doctorate.
\`\`\`
A) Most of the firm's senior partners hold a doctorate.
B) Some people who have practiced law for at least twenty years hold a doctorate.
C) Anyone who holds a doctorate has practiced law for at least twenty years.
D) None of the firm's junior associates teach at the university's law school.
E) All of the firm's senior partners who hold a doctorate teach at the university's law school.
Correct Answer: B
Explanation: The senior partners who teach have practiced for twenty years (first statement) and hold a doctorate (third statement), so some twenty-year practitioners hold a doctorate. Choice A turns "some" into "most," and C reverses the third statement.`,
        `MC_QUESTION: The statement in [[brackets]] plays which one of the following roles in the argument?
\`\`\`passage
Economist: Some analysts claim that raising the minimum wage always reduces employment among low-wage workers. [[Yet in several regions where the minimum wage rose last year, employment among such workers increased.]] Employment in those regions was also helped by an unusually strong tourist season, so the increases do not show that the wage rise created jobs. They do show, however, that the analysts' claim is too strong.
\`\`\`
A) It is the main conclusion of the argument.
B) It is evidence offered in support of the argument's main conclusion.
C) It is a claim the argument ultimately rejects.
D) It is a concession that the argument's conclusion does not apply in every case.
E) It describes the position the argument is attempting to refute.
Correct Answer: B
Explanation: The bracketed sentence is the fact that, once the tourist-season qualification is set aside, supports the conclusion that the analysts' claim is too strong. Choice E describes the first sentence, and C would be true of the claim that the wage rise created jobs, which the argument sets aside.`,
      ],
    },
    {
      id: 'reading',
      name: 'Reading Comprehension',
      share: 'one of the three scored sections (27 items, 35 minutes, four passage sets including one comparative pair)',
      detect: /\b(reading comprehension|\bRC\b|passage|main point|author'?s attitude|comparative|passage a|passage b|analogous|function of)\b/i,
      skills: [
        'Main point: the one sentence the whole passage supports, not its most interesting paragraph',
        'The author\'s attitude and the views the passage reports, kept apart',
        'Inference and "most strongly supports" items answered from the text alone',
        'Structure: the function of a paragraph or a detail; analogy items that match the relationship described',
        'Comparative reading: what Passage A and Passage B agree and disagree on, and how each would respond to the other',
      ],
      hard: [
        'A main-point item where the distractors are accurate summaries of individual paragraphs',
        'An attitude item where the author is "qualified approval" and the options offer enthusiasm or skepticism',
        'A dense law or science passage where the right inference restates a technical relation in plain words',
        'A comparative item asking what both passages would agree on when their emphases differ',
      ],
      traps: ['a reported view taken for the author\'s', 'a detail from the passage offered as the main point', 'an inference stronger than the text supports', 'an analogy that matches the topic, not the relationship'],
      exemplars: [
        `MC_QUESTION: Which one of the following most accurately expresses the main point of the passage?
\`\`\`passage
Legal scholars have long debated whether judges should interpret statutes according to the ordinary meaning of their words or according to the purposes the legislature had in mind. Textualists argue that ordinary meaning is the only legitimate guide: the words are what the legislature enacted, and a judge who looks beyond them substitutes her own view of good policy for the law. Purposivists reply that words are chosen to achieve ends, and that reading them without regard to those ends produces results no legislator intended, as when a statute forbidding "vehicles" in a park is read to bar a war memorial that happens to be a tank.

The debate is often presented as a contest between two methods, one of which must be right. This framing obscures how much the two camps share. Both agree that a judge must begin with the text, both accept that the text is sometimes ambiguous, and both consult the statute's structure and the surrounding law to resolve the ambiguity. Where they differ is in a narrow class of cases: those in which the text is clear but its application would be absurd or plainly at odds with the statute's evident aim. Even here the disagreement is about degree. Few textualists would send the tank out of the park; few purposivists would rewrite a clear deadline because the legislature "must have wanted" a longer one.

Seen this way, the dispute is less a clash of philosophies than a disagreement about how strong a showing of absurdity should be before a clear text yields. That is a question worth arguing about, but it is a smaller one than the rhetoric on either side suggests.
\`\`\`
A) Textualism and purposivism are irreconcilable approaches to statutory interpretation, and judges must choose between them.
B) The dispute between textualists and purposivists, though often presented as a clash of philosophies, concerns a narrow question about when a clear text should yield to a statute's evident purpose.
C) Purposivism produces better results than textualism because it avoids absurd applications of statutory language.
D) Both textualists and purposivists agree that judges should begin with the text of a statute and resolve ambiguities by consulting its structure.
E) Legal scholars have exaggerated the practical importance of theories of statutory interpretation.
Correct Answer: B
Explanation: The passage's final paragraph states its thesis: the dispute is narrower than its rhetoric. Choice D is a true supporting point from the second paragraph, not the main point; A describes the framing the passage rejects.`,
      ],
    },
    {
      id: 'writing',
      name: 'Argumentative Writing (unscored, sent to law schools)',
      share: 'one 50-minute task, unscored but read by admissions',
      detect: /\b(writing|essay|argumentative|thesis|perspective\w*|counterargument|position)\b/i,
      skills: [
        'Taking a clear position on a debatable issue and naming the perspective it responds to',
        'Supporting the position with a reason and a concrete example',
        'Addressing a counterargument from one of the given perspectives without conceding the position',
        'Organizing 300-500 words in 35 minutes after 15 minutes of prewriting',
      ],
      hard: [
        'Engaging a perspective that is partly right and saying exactly where it goes wrong',
        'A position that is qualified ("in most cases") and still clear',
      ],
      traps: ['summarizing the perspectives instead of taking a position', 'a thesis that agrees with everyone', 'an example that illustrates the issue but not the writer\'s reason'],
      exemplars: [
        `SA_QUESTION: Write a thesis statement for the issue below that takes a clear position and names the perspective it most directly responds to.
\`\`\`passage
Issue: Should cities require all new residential buildings to include a minimum amount of parking?

Perspective 1: Parking minimums keep residents from crowding neighborhood streets with cars, so they protect existing residents.
Perspective 2: Parking minimums raise construction costs and the price of housing, and they encourage driving in places that could support transit.
Perspective 3: Whether minimums make sense depends on the neighborhood: they are reasonable where transit is poor and counterproductive where it is good.
\`\`\`
Sample Answer: Criteria: a clear position (not a summary), explicit engagement with at least one perspective, and a reason that can be supported with an example. Model: "Cities should replace blanket parking minimums with requirements set block by block according to transit access, because, as Perspective 3 recognizes, a rule that protects a street with no bus service only raises rents and invites more cars on a street with a subway stop; Perspective 1's concern about crowded streets is real but is better met with permit parking than with a rule that applies everywhere." Earns credit for position, engagement with Perspectives 3 and 1, and a stated reason; a thesis that merely says "there are good arguments on both sides" earns little.`,
      ],
    },
  ],
  scoreRange: { min: 120, max: 180, step: 1 },
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: practice for a test taker past the basics. Skip the items nearly everyone gets (a conclusion stated in the first sentence, a weakener that names the obvious alternative cause): at most 1 item in 8 is that easy, and never the first item of a section. About half are typical mid-section items and at least a third are the late-section items described under WHAT HARD LOOKS LIKE. A stated score sets the level: write at and above it (a 155 needs mid-section items; a 165 needs mostly hard ones).`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 160 from a 170 or higher. At least 4 of every 5 items must be ones a 155-level test taker would miss: necessary assumptions that are modest and dull, flaws described abstractly with two tempting real flaws among the options, inference items where the right option is the least interesting one, parallel reasoning with unrelated topics, reading passages whose author holds a qualified view, and comparative items on what both passages would accept. Hard never means obscure vocabulary, trick wording or content knowledge.`,
    easier: `DIFFICULTY ON THIS TEST: the early-section items most test takers get right, one inference or one clear gap each, in the test's voice. Still real test items.`,
  },
}
