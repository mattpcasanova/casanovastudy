// The Cambridge International AS & A Level Thinking Skills exam (9694; AICE
// Thinking Skills in Florida) as a reference for the guide prompts. Paper 1
// Problem Solving: 30 multiple-choice items (five options A-E) in 1 hour 30
// minutes; Paper 2 Critical Thinking: structured short answers on argument
// passages. (A Level adds Papers 3 and 4; the AS papers are the ones most
// AICE students sit.)

import type { ExamProfile } from './types'
import { AICE_DIFFICULTY, AICE_ITEM_RULES } from './aice'

const EXAM = /\b(?:AICE|Cambridge)\s+Thinking\s+Skills\b|\bThinking\s+Skills\b/i

export const AICE_THINKING_SKILLS: ExamProfile = {
  id: 'aice-thinking-skills',
  pace: 180,
  name: 'the Cambridge AS & A Level Thinking Skills exam (AICE Thinking Skills, 9694)',
  detect: {
    exam: EXAM,
    subjectHints: /./,
    subjects: ['other', 'mathematics', 'english'],
    explicit: EXAM,
  },
  itemRules: AICE_ITEM_RULES('Thinking Skills', {
    mcq: true,
    structured: 'Paper 2 parts are mostly 1-3 marks for identifying parts of an argument, 2-4 marks for evaluating evidence, and 5-6 marks for writing a further argument.',
    extra: [
      `- EXCEPTION TO THE FOUR-OPTION RULE: Paper 1 problem-solving items have exactly FIVE options A-E, as on the real paper. Every multiple-choice item in this guide is a Paper 1 item with five options. Each is a self-contained puzzle with all the information needed: a price list, timetable, league table or set of rules in a kind: table figure, or a situation described in the stem (3-8 sentences). The skills are the syllabus's: extracting relevant data, finding and following procedures, searching for solutions, identifying similarity between situations, spatial reasoning (nets, views, tilings, paths), necessary and sufficient conditions, and working with rates, averages and remainders. No specialist knowledge beyond everyday arithmetic. Solve each item completely before writing the key, and make the four wrong options the results of the natural slips (an off-by-one count, a part-hour charged as nothing, a rate applied the wrong way).`,
      `- Paper 2 critical-thinking items are SA_QUESTION on a model-written argument passage of 120-250 words in a \`\`\`passage fence, attributed generically ("a letter to a local newspaper", "a blog post by a parent", "an extract from a campaign leaflet"), with the paper's tasks and marks: "State the main conclusion of the argument. [1]", "Identify two reasons given to support the conclusion. [2]", "Identify an unstated assumption the argument relies on. [2]", "Name and explain a flaw in the reasoning in the second paragraph. [3]" (flaws by their names: slippery slope, straw man, ad hominem, post hoc, hasty generalisation, circular reasoning, false dichotomy, appeal to popularity, confusing correlation with cause, conflation), "Evaluate the credibility of [a source described in the passage]. [3]" (criteria: expertise, vested interest, reputation, ability to see or observe, neutrality, corroboration), "Write your own short argument, with a conclusion and at least two reasons, either for or against the claim that ... [5]". The Sample Answer is the mark scheme: the exact conclusion in the passage's words (a paraphrase that changes the claim earns nothing), the creditable reasons, the assumption stated as a sentence the argument needs to be true, the flaw named and shown in the passage, and for the further argument the level descriptors and a model of 60-90 words.`,
    ],
  }),
  domains: [
    {
      id: 'data-procedures',
      name: 'Problem solving: data and procedures (Paper 1: extracting data, following rules, rates and tables)',
      share: 'about half of Paper 1',
      detect: /\b(data|table\w*|timetable\w*|price\w*|cost\w*|charge\w*|fare\w*|rate\w*|average\w*|procedure\w*|rule\w*|schedule\w*|league|score\w*|points|cheapest|total|minimum|maximum|remainder|percentage\w*|discount\w*)\b/i,
      skills: [
        'Reading exactly the figures a question needs from a table, timetable or price list, and ignoring the rest',
        'Applying a set of rules (charges by the hour or part, discounts, scoring systems) to a case, including the boundary cases',
        'Finding the cheapest or quickest combination by organised trial (packs, tickets, routes)',
        'Rates, averages, totals and remainders in context (speed and time, money, shares)',
      ],
      hard: [
        'A charging rule with a "part of an hour" or a daily cap that changes which option is cheapest',
        'A table with more rows than the question needs, where a near-match row is the trap',
        'Minimum-cost combinations where the obvious mix is beaten by buying slightly more than needed',
        'A league table where the final position depends on a tie-break rule stated in the stem',
      ],
      traps: ['a part-hour charged as nothing or as a full hour when the rule says otherwise', 'the cap ignored or applied too early', 'adding totals the question did not ask for', 'a rate applied in the wrong direction'],
      exemplars: [
        `MC_QUESTION: A town car park charges £2.00 for the first hour and £1.50 for each additional hour or part of an hour, up to a maximum of £9.00 for the day. Jo parks at 09:40 and leaves at 14:10. How much does Jo pay?
A) £6.50
B) £8.00
C) £8.50
D) £9.00
E) £7.50
Correct Answer: B
Explanation: 09:40 to 14:10 is 4 hours 30 minutes. The first hour costs £2.00; the remaining 3 hours 30 minutes count as 4 additional hours (the part hour counts), 4 × £1.50 = £6.00, so £8.00, under the £9.00 cap. E charges the part hour as nothing; D applies the cap when it is not reached.`,
        `MC_QUESTION: A stationery shop sells pens only in packs: a pack of 3 pens for £2 and a pack of 5 pens for £3. A teacher needs at least 19 pens. What is the least she can spend?
A) £11
B) £12
C) £12.50
D) £13
E) £14
Correct Answer: B
Explanation: Exactly 19 pens can be made only as two packs of 5 and three packs of 3 (10 + 9), costing £6 + £6 = £12; buying 20 pens as four packs of 5 also costs £12, and no cheaper combination reaches 19. Three packs of 5 and two of 3 (21 pens) is £13, the natural over-buy.`,
      ],
    },
    {
      id: 'spatial-logical',
      name: 'Problem solving: spatial and logical reasoning (Paper 1: shapes, patterns, conditions, combinations)',
      share: 'about half of Paper 1',
      detect: /\b(shape\w*|net\w*|cube\w*|dice|die\b|tile\w*|tiling|pattern\w*|view\w*|path\w*|route\w*|grid\w*|area|perimeter|fold\w*|rotation\w*|reflection\w*|sequence\w*|necessary|sufficient|condition\w*|combination\w*|arrangement\w*|tournament\w*|knockout|matches|seating|logic\w*|puzzle\w*)\b/i,
      skills: [
        'Visualising nets, views and rotations of solids, and paths or tilings on a grid',
        'Counting arrangements and combinations systematically, without listing every case',
        'Necessary and sufficient conditions: what must be true, what is enough, from a set of rules',
        'Spotting the structure that makes a problem simple (each match eliminates one player; a border is the difference of two areas)',
      ],
      hard: [
        'A counting problem where the direct count is long but a complement or a structural shortcut is short',
        'Conditions that interact (if A then not B; at least one of B and C), with the answer the only arrangement that satisfies all',
        'A net where two faces that look adjacent in the net are opposite on the cube',
      ],
      traps: ['counting the players instead of the matches', 'a border area computed as the perimeter', 'treating a sufficient condition as necessary', 'a sequence rule read from only two terms'],
      exemplars: [
        `MC_QUESTION: A knockout tennis tournament has 37 players. In each match two players play and the loser leaves the tournament; when a round has an odd number of players, one player goes through without playing. How many matches are played in total?
A) 18
B) 19
C) 36
D) 37
E) 72
Correct Answer: C
Explanation: Every match removes exactly one player, and 36 players must be removed to leave one winner, so there are 36 matches however the byes fall. A counts only the first round; D counts players.`,
        `MC_QUESTION: A rectangular lawn measures 12 m by 8 m. A path 1 m wide runs around the inside of its edge, and the rest is grass. What is the area of the path?
A) 32 m²
B) 36 m²
C) 40 m²
D) 44 m²
E) 48 m²
Correct Answer: B
Explanation: The whole lawn is 12 × 8 = 96 m²; the grass inside the path is (12 - 2) × (8 - 2) = 10 × 6 = 60 m²; the path is 96 - 60 = 36 m². C is the lawn's perimeter in metres, a common slip; A adds the four 1 m strips (12 + 12 + 8 + 8 = 40) and then takes the four corner squares off twice.`,
      ],
    },
    {
      id: 'analysing-arguments',
      name: 'Critical thinking: analysing arguments (Paper 2: conclusions, reasons, assumptions, flaws)',
      share: 'about two thirds of Paper 2',
      detect: /\b(argument\w*|conclusion\w*|reason\w*|premise\w*|assumption\w*|flaw\w*|fallac\w+|slippery slope|straw man|ad hominem|post hoc|generali[sz]ation|circular|false dichotomy|appeal to|correlation|cause|causal|counter[- ]?(?:argument|assertion|example)\w*|inference\w*|analy[sz]\w+)\b/i,
      skills: [
        'Finding the main conclusion (often not the last sentence) and the intermediate conclusions',
        'Separating reasons from examples, evidence and asides',
        'Stating an unstated assumption as a sentence the argument needs to be true',
        'Naming and explaining flaws: slippery slope, straw man, ad hominem, post hoc, hasty generalisation, circular reasoning, false dichotomy, appeal to popularity or authority, confusing correlation with cause, conflation of two meanings',
        'Giving a counter-assertion or counter-example that weakens a reason',
      ],
      hard: [
        'A passage where the main conclusion is in the first sentence and the last sentence is a recommendation that follows from it',
        'An assumption that bridges a reason to the conclusion rather than one that merely supports a reason',
        'Two candidate flaws, where only one is actually committed by the wording',
      ],
      traps: ['the last sentence taken as the conclusion', 'an example reported as a reason', 'an assumption stated as a reason already in the text', 'a flaw named without showing where the passage commits it'],
      exemplars: [
        `SA_QUESTION: Read the argument below. a) State the main conclusion of the argument. [1] b) Name and explain one flaw in the reasoning in the second paragraph. [3]
\`\`\`passage
A letter to a local newspaper

Our council should stop building cycle lanes. Since the first lanes were painted three years ago, the number of cyclists injured on our roads has risen every year. The lanes are clearly making cycling more dangerous, not less.

Besides, the people who demand these lanes are the same people who want to ban cars from the town centre altogether. If we give them lanes today, next year it will be car-free streets, and after that we will be told we may not drive at all. Anyone who values their freedom to travel should oppose the lanes now.
\`\`\`
Sample Answer: a) 1 mark: "Our council should stop building cycle lanes" (the first sentence; "we should oppose the lanes now" is the restatement in the last line and is also credited, but "cycle lanes are dangerous" is an intermediate conclusion and earns nothing). b) 1 mark for naming the flaw: slippery slope; 1 mark for explaining what it is: the writer assumes that one step (lanes) will lead inevitably to extreme further steps (car-free streets, a ban on driving) without giving any reason why each step must follow; 1 mark for showing it in the passage: "If we give them lanes today, next year it will be car-free streets, and after that we will be told we may not drive at all." Also creditable for b): ad hominem, if explained as attacking the campaigners' wider aims ("the same people who want to ban cars") rather than the case for lanes, with the quotation. The first paragraph's flaw (post hoc, or correlation taken as cause: more cyclists may mean more injuries) is not in the second paragraph and earns nothing here.`,
      ],
    },
    {
      id: 'evidence-further-argument',
      name: 'Critical thinking: evidence, credibility and writing a further argument (Paper 2)',
      share: 'about a third of Paper 2',
      detect: /\b(evidence|credib\w+|reliab\w+|source\w*|witness\w*|expert\w*|vested interest|reputation|neutral\w*|bias\w*|corroborat\w+|ability to (?:see|observe)|statistic\w*|survey\w*|sample\w*|further argument|own argument|write (?:a|your own) argument|support|weaken|strengthen)\b/i,
      skills: [
        'Assessing a source with the credibility criteria: expertise, vested interest, reputation, ability to see or observe, neutrality, corroboration or conflict with other sources',
        'Judging what a statistic or survey can and cannot show (sample, who asked, what was measured)',
        'Saying how a piece of evidence strengthens or weakens a specific reason',
        'Writing a short argument of your own: a clear conclusion, two or more reasons that support it, and a structure the reader can follow',
      ],
      hard: [
        'A source with high expertise and a strong vested interest, where both must be weighed',
        'Evidence that supports the conclusion but not the reason it is attached to',
        'A further argument that must take the side opposite to the passage and still be reasoned, not a rant',
      ],
      traps: ['"biased" asserted with no criterion named', 'a statistic accepted because it is precise', 'a further argument with a conclusion but only assertions as reasons', 'evaluating the writer instead of the source the question names'],
      exemplars: [
        `SA_QUESTION: In the passage, the writer quotes the owner of a chain of petrol stations who says that cycle lanes have "ruined trade in the town centre". Evaluate the credibility of this source. [3]
Sample Answer: Mark scheme: 1 mark for each criterion applied to this source with a judgement, up to 3: vested interest (the owner sells fuel to drivers, so has a financial reason to oppose lanes, which lowers credibility); ability to see (the owner can observe trade at the petrol stations, but not trade in the town centre as a whole, so the claim goes beyond what the source can observe); expertise (running a business gives some knowledge of trade, but not of the causes of a town-wide change, which would need figures from other traders, so the claim is weakened); corroboration (none is given in the passage, so the claim stands alone). Overall judgement credited within the marks: low to moderate credibility. "The owner is biased" with no criterion or reason earns 0; naming a criterion without applying it to the owner earns 0 for that criterion.`,
        `SA_QUESTION: Write your own short argument, with a conclusion and at least two reasons, either for or against the claim that "schools should ban mobile phones during the school day". [5]
Sample Answer: Mark scheme (levels): 5 marks for a clearly stated conclusion supported by at least two distinct, relevant reasons, with the reasons developed (a consequence or an example) and the argument structured so each reason clearly supports the conclusion; 3-4 marks for a conclusion with two reasons that are relevant but undeveloped, or one developed reason; 1-2 marks for a conclusion with assertions, or reasons without a clear conclusion; 0 for a description of the issue with no argument. Model (for): "Schools should ban mobile phones during the school day. First, phones interrupt learning: a notification pulls attention away from the lesson, and it takes time to return to the task, so even students who do not reply lose learning time. Second, a ban protects students who would otherwise be filmed or messaged unkindly during the day, since the harm of bullying by phone depends on the phone being present. A ban therefore improves both learning and safety." An argument against the claim is credited on the same descriptors.`,
      ],
    },
  ],
  difficulty: AICE_DIFFICULTY,
}
