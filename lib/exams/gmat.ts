// The GMAT Focus Edition as a reference for the guide prompts: three
// 45-minute sections (Quantitative Reasoning, Verbal Reasoning, Data
// Insights), every item multiple choice with five options, Data Sufficiency
// with its fixed five answers. Exemplars written here in the test's voice.

import type { ExamProfile } from './types'

export const GMAT: ExamProfile = {
  id: 'gmat',
  pace: 125,
  name: 'the GMAT Focus Edition',
  detect: {
    exam: /\bGMAT\b/,
    subjectHints: /./,
    subjects: ['business', 'mathematics', 'english'],
    explicit: /\bGMAT\b/,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Every item is multiple choice with exactly FIVE options A-E, as on all three sections of the GMAT Focus Edition. No true/false, no "I, II and III" lists, no student-typed numbers (the test has none), no free response.
- Quantitative Reasoning items are Problem Solving: arithmetic, algebra and word problems only (no geometry on the Focus Edition), solved without a calculator, so the numbers are chosen to work cleanly. Stems are terse and formal: "If x and y are positive integers and 3x + 2y = 24, ...", "A tank is filled at a rate of ...", "What is the value of ...?" Options are five numbers or expressions in increasing order where that is natural, with the wrong ones being the results of the common slips (a sign dropped, the question answered for the wrong variable, a percent of the wrong base).
- Critical Reasoning items give a short argument (40-90 words) in a \`\`\`passage fence under the question line, then the exact stem the test uses: "Which of the following, if true, most seriously weakens the argument?", "... most strengthens ...", "The argument depends on which of the following assumptions?", "Which of the following would be most useful to evaluate the argument?", "Which of the following can be properly inferred?", "In the argument, the two portions in [[brackets]] play which of the following roles?", "Which of the following, if true, best resolves the apparent discrepancy?" Wrong options are out of scope, about a different conclusion, the opposite task, or a restatement of a premise.
- Reading Comprehension passages (200-350 words, business, natural science or social science, written by you, attributed to no one) sit in a \`\`\`passage fence under each item that uses them; every item repeats its passage so it stands alone. Stems: "The primary purpose of the passage is to", "According to the passage, ...", "It can be inferred that the author would most likely agree that", "The author mentions X most likely in order to".
- Data Insights items: Data Sufficiency puts the question and the two statements "(1) ..." and "(2) ..." in a passage fence and uses these five options in this exact order and wording, every time:
A) Statement (1) ALONE is sufficient, but statement (2) alone is not sufficient.
B) Statement (2) ALONE is sufficient, but statement (1) alone is not sufficient.
C) BOTH statements TOGETHER are sufficient, but NEITHER statement ALONE is sufficient.
D) EACH statement ALONE is sufficient.
E) Statements (1) and (2) TOGETHER are NOT sufficient.
  Table Analysis and Multi-Source Reasoning items put the data in a kind: table figure (or two tables); Graphics Interpretation items use a kind: bar or kind: plane figure; Two-Part Analysis items are written as one MC item per part, each repeating the setup. Data Sufficiency never asks the student to find the value, only whether it can be found.
- Before writing an item's answer, solve it from the final numbers. For Data Sufficiency, check statement (1) alone, statement (2) alone, then both together, and make sure exactly one of the five answers fits. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the key step, and why the most tempting wrong option fails.`,
  domains: [
    {
      id: 'quant',
      name: 'Quantitative Reasoning',
      share: 'one of the three sections (21 items, 45 minutes)',
      detect: /\b(quant\w*|math|arithmetic|algebra|word problem|rate|ratio|percent|integer|exponent|inequalit|equation|number propert|divisib|remainder|probability|statistics|mean|median)\w*/i,
      skills: [
        'Arithmetic: fractions, decimals, percents, ratios, number properties (factors, multiples, remainders, even/odd), exponents and roots',
        'Algebra: linear and quadratic equations, systems, inequalities and absolute value, functions and sequences, simplifying expressions',
        'Word problems: rates and work, mixtures, interest, profit and discount, sets with overlap, counting and probability, descriptive statistics',
        'Estimation and number sense without a calculator: picking numbers, back-solving from the options, keeping track of units',
      ],
      hard: [
        'A percent change applied to a percent change, or a percent of a base that is itself unknown',
        'A system where the question asks for a combination (x + y, xy) that is quicker than solving for each variable',
        'Remainder and divisibility items that need a number-properties argument, not trial',
        'Rate and work items where two rates combine or one worker leaves partway through',
      ],
      traps: ['the question answered for x when it asked for xy or x + y', 'percent of the wrong base', 'a sign error carried through an inequality', 'counting that double-counts the overlap'],
      exemplars: [
        `MC_QUESTION: If 3x + 2y = 24 and x - y = 3, what is the value of xy?
A) 12
B) 15
C) 18
D) 24
E) 30
Correct Answer: C
Explanation: From x - y = 3, x = y + 3; then 3(y + 3) + 2y = 24 gives 5y = 15, so y = 3 and x = 6, and xy = 18. Choice D is the value of 4xy / 3, a slip from stopping at x + y.`,
        `MC_QUESTION: The price of a jacket was increased by 20 percent and the new price was then decreased by 20 percent. The final price is what percent of the original price?
A) 90%
B) 96%
C) 100%
D) 104%
E) 120%
Correct Answer: B
Explanation: 1.20 × 0.80 = 0.96, so the final price is 96 percent of the original. Choice C is the trap of treating the two 20 percent changes as cancelling; they act on different bases.`,
        `MC_QUESTION: A tank that is initially empty is filled by a pipe at a constant rate of 12 liters per minute while a drain removes water at a constant rate of 8 liters per minute. If both the pipe and the drain are open the whole time, how many minutes does it take for the tank to hold 60 liters of water?
A) 3
B) 5
C) 7.5
D) 15
E) 20
Correct Answer: D
Explanation: The net rate is 12 - 8 = 4 liters per minute, so 60 liters takes 60 / 4 = 15 minutes. Choice B uses the fill rate alone and ignores the drain.`,
      ],
    },
    {
      id: 'critical-reasoning',
      name: 'Verbal Reasoning: Critical Reasoning',
      share: 'about half of the 23 Verbal items',
      detect: /\b(critical reasoning|CR\b|argument|assumption|strengthen|weaken|evaluate|inference|infer|boldface|paradox|discrepanc|conclusion|premise|flaw)\w*/i,
      skills: [
        'Finding the conclusion and the evidence, and the gap between them',
        'Strengthen and weaken: a new fact that makes the gap wider or narrower, usually an alternative cause, a sample problem or a missing comparison',
        'Assumption (necessary): the unstated claim the argument needs; the negation test',
        'Evaluate, inference, boldface role and resolve-the-paradox items, each with its own reading of the stimulus',
      ],
      hard: [
        'A plan or proposal where the weakener attacks whether the plan achieves its goal, not whether the premise is true',
        'A causal conclusion from a correlation where the best option names a third factor or reversed causation in disguise',
        'Boldface items where both portions are evidence for different sides',
        'An inference item where several options are plausible in the real world but only one follows from the text',
      ],
      traps: ['an option that is true but about a different conclusion', 'the opposite task (strengthens when asked to weaken)', 'an option too strong to be a necessary assumption', 'a restated premise offered as the inference'],
      exemplars: [
        `MC_QUESTION: Which of the following, if true, most seriously weakens the argument?
\`\`\`passage
City planner: After speed cameras were installed on Main Street last year, collisions there fell by 40 percent. Installing speed cameras on every major street would therefore reduce collisions citywide by about 40 percent.
\`\`\`
A) Drivers who receive camera-issued tickets often contest them in traffic court.
B) The number of collisions on Main Street in the year before the cameras were installed was far higher than in any of the previous ten years.
C) Speed cameras are considerably more expensive to install and maintain than traditional speed-limit signs.
D) Several of the city's major streets already have lower speed limits than Main Street.
E) Residents of neighborhoods near Main Street strongly supported the installation of the cameras.
Correct Answer: B
Explanation: If the year before the cameras was an unusual spike, much of the 40 percent drop is a return to normal rather than an effect of the cameras, so the planner's projection loses its support. Choices A and C are about cost and enforcement, not about whether cameras reduce collisions.`,
        `MC_QUESTION: The argument depends on which of the following assumptions?
\`\`\`passage
Marketing director: In a survey of 500 of our customers, 70 percent said they would prefer that our products come in recycled packaging. Switching to recycled packaging will therefore increase our sales.
\`\`\`
A) Recycled packaging costs no more to produce than the packaging the company currently uses.
B) At least some customers who prefer recycled packaging would buy more of the company's products if it adopted recycled packaging.
C) The company's competitors do not currently use recycled packaging.
D) Most of the 500 customers surveyed had bought the company's products within the past year.
E) Customers who did not express a preference for recycled packaging would stop buying the company's products if the switch were made.
Correct Answer: B
Explanation: The argument moves from a stated preference to a sales increase; it needs at least some of those customers to buy more as a result. Negating B leaves the preference with no effect on sales, and the conclusion collapses. Choice A is about cost, which the conclusion does not mention.`,
      ],
    },
    {
      id: 'reading',
      name: 'Verbal Reasoning: Reading Comprehension',
      share: 'about half of the 23 Verbal items',
      detect: /\b(reading comprehension|RC\b|passage|main idea|primary purpose|author|tone|infer\w*|paragraph)\b/i,
      skills: [
        'Main idea and primary purpose of a 200-350 word passage',
        'Supporting ideas: what the passage says, found by rereading rather than remembering',
        'Inference: what the author would agree with, based only on the text',
        'Function: why a detail, example or paragraph is there; the author\'s tone toward a view',
      ],
      hard: [
        'A primary-purpose item where two options describe parts of the passage and only one describes the whole',
        'An inference item whose right option is a modest restatement and whose wrong options are the real-world plausible ones',
        'A passage that presents a theory and then qualifies it, where the author\'s own view is the qualification',
      ],
      traps: ['an option true of one paragraph offered as the main idea', 'an inference that goes beyond the text', 'a view the passage reports mistaken for the author\'s own'],
      exemplars: [
        `MC_QUESTION: The primary purpose of the passage is to
\`\`\`passage
When firms first allowed employees to work from home, many managers predicted a collapse in productivity, reasoning that unsupervised workers would do less. Early studies seemed to confirm the fear: self-reported hours fell, and some teams missed deadlines. Later research, using output measures rather than hours, told a different story. Among workers whose tasks could be completed independently, output per week rose modestly, and the rise persisted for more than a year. Among workers whose tasks required frequent coordination, however, output fell, and the decline grew the longer the arrangement lasted. The lesson is not that remote work raises or lowers productivity but that the question was posed too broadly. What matters is the structure of the work itself: how much of it depends on the quick, informal exchanges that an office makes easy and a video call makes costly.
\`\`\`
A) argue that firms should return their employees to the office
B) explain why early studies of remote work reported a fall in productivity
C) show that the effect of remote work on productivity depends on the kind of work being done
D) describe how researchers measure productivity for remote and office workers
E) defend remote work against the predictions of skeptical managers
Correct Answer: C
Explanation: The passage sets up a broad question, reports mixed findings, and resolves them with "what matters is the structure of the work itself." Choice B describes only the second and third sentences, and E takes a side the passage does not take.`,
      ],
    },
    {
      id: 'data-insights',
      name: 'Data Insights',
      share: 'one of the three sections (20 items, 45 minutes)',
      detect: /\b(data insights|data sufficiency|\bDS\b|sufficien\w*|table analysis|multi[- ]source|graphics interpretation|two[- ]part|chart|graph|table|data)\b/i,
      skills: [
        'Data Sufficiency: deciding whether each statement alone, or both together, pins down the answer, without computing it',
        'Table Analysis: sorting and reading a table to check statements, computing a ratio or a median from its rows',
        'Multi-Source Reasoning: combining two or three sources (a table, a memo, a chart) to test a claim',
        'Graphics Interpretation and Two-Part Analysis: reading a bar chart or a scatterplot, and finding a pair of values that satisfy two conditions',
      ],
      hard: [
        'Data Sufficiency where statement (1) looks sufficient but allows a negative or a zero case',
        'A yes/no Data Sufficiency question where a statement that gives a definite "no" is sufficient',
        'A table item where the statement to test needs a ratio of two computed columns',
        'A two-part item where the two conditions interact (the second value depends on the first)',
      ],
      traps: ['solving for the value instead of judging sufficiency', 'forgetting negative or non-integer cases', 'reading a percent from a table that shows counts', 'treating "together sufficient" as the answer when one statement alone already works'],
      exemplars: [
        `MC_QUESTION: Is the value of x determined?
\`\`\`passage
What is the value of x?
(1) x² = 16
(2) x > 0
\`\`\`
A) Statement (1) ALONE is sufficient, but statement (2) alone is not sufficient.
B) Statement (2) ALONE is sufficient, but statement (1) alone is not sufficient.
C) BOTH statements TOGETHER are sufficient, but NEITHER statement ALONE is sufficient.
D) EACH statement ALONE is sufficient.
E) Statements (1) and (2) TOGETHER are NOT sufficient.
Correct Answer: C
Explanation: Statement (1) gives x = 4 or x = -4, two values, so it is not sufficient; statement (2) alone allows any positive number. Together they leave only x = 4. Choice A is the trap of forgetting the negative root.`,
        `MC_QUESTION: Based on the table, which region had the greatest percent increase in sales from the first quarter to the second quarter?
\`\`\`graph
kind: table
title: Sales by region (thousands of dollars)
columns: Region | First quarter | Second quarter
row: North | 200 | 250
row: South | 150 | 180
row: East | 100 | 130
row: West | 300 | 360
\`\`\`
A) North
B) South
C) East
D) West
E) The percent increase cannot be determined from the information given.
Correct Answer: C
Explanation: North rose 25 percent, South 20 percent, East 30 percent and West 20 percent. Choice D has the largest dollar increase (60), which is the trap; the question asks for the percent.`,
      ],
    },
  ],
  scoreRange: { min: 205, max: 805, step: 10 },
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: practice for a test taker past the basics. Skip the items nearly everyone gets (one step, one idea): at most 1 item in 8 is that easy, and never the first item of a section. About half are typical adaptive mid-range items (two steps, one twist) and at least a third are the harder items described under WHAT HARD LOOKS LIKE. A stated score sets the level: write at and above it (a 555 needs the mid-range; a 655 needs mostly hard items).`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 655 from a 705 or higher. At least 4 of every 5 items must be ones a 600-level test taker would miss: number-properties arguments, percent-of-a-percent, Data Sufficiency with a hidden negative or zero case, Critical Reasoning where two options point the right way and only one addresses the gap, Reading Comprehension inferences that stay modest while the distractors overreach. Hard never means geometry (not on the Focus Edition), bigger arithmetic or obscure vocabulary.`,
    easier: `DIFFICULTY ON THIS TEST: the items most test takers get right, one idea each, in the test's voice, with the Data Sufficiency answer following directly from the statements. Still real test items.`,
  },
}
