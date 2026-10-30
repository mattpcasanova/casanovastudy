// The ACT Science section (2025 "enhanced" ACT: optional, 40 questions, four
// options; passages of Data Representation, Research Summaries and
// Conflicting Viewpoints) as a reference for the guide prompts. The real test
// puts 5-7 questions on one passage; the app shows one passage per item, so
// each item carries its own short study description and its own figure.

import type { ExamProfile } from './types'

import { ACT_NAME } from './act-name'

export const ACT_SCIENCE: ExamProfile = {
  id: 'act-science',
  pace: 60,
  name: 'the ACT Science section',
  detect: {
    exam: ACT_NAME,
    exclude: /\b(math|algebra|geometry|grammar|punctuation|literary|prose fiction)\b/i,
    subjectHints: /\b(science|data representation|research summar\w*|conflicting viewpoints|experiment\w*|hypothes\w+|graph|table|trend|variable|control)\b/i,
    subjects: ['science', 'biology', 'chemistry', 'physics'],
    explicit: /\bact\s+science\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Every item is multiple choice with exactly four options A-D. Never true/false, "I, II and III", free-response, or an item with no data to read.
- Each item carries a short study description in a \`\`\`passage fence under the question line (40-120 words: what was measured, how, and the variables; for a Conflicting Viewpoints item, "Scientist 1" and "Scientist 2" on their own lines with 40-80 words each) and, for data items, a figure block right after it: a table (kind: table) or a graph (scatter, bar, plane with plotted lines) whose numbers the question is answered from. The figure must contain every value the answer needs.
- Keep the same study going across several items of a section (the same experiment, a different question each time), each item repeating what it needs; every item still stands alone.
- Questions use the test's stems: "According to Table 1, as the temperature increased, the solubility ...", "Based on Figure 2, at a pH of 5 the reaction rate was closest to ...", "If a trial had been run at 60°C, the mass lost would most likely have been ...", "Which of the following variables was held constant in Experiment 2?", "Which experiment, if any, tested the effect of ...?", "Suppose a new trial found .... This result would best support the viewpoint of ...", "Scientist 2 would most likely agree with which of the following statements?", "Which of the following best explains why the researchers ...?".
- The science content needed is minimal (the test gives what it needs); the skill is reading the data, the design and the arguments. Options are values read from the figure, trends ("increased only", "increased, then decreased"), variables, or statements.
- Before writing an item's answer, read it off your own figure and check that exactly one option is right. If the data do not support a single answer, change the data. Never leave a note or a second attempt in the explanation.
- Explanations stay short: which row, column or curve gives the answer, and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'data',
      name: 'Interpretation of Data',
      share: 'about 45-55% of the test',
      detect: /\b(interpretation of data|data representation|table|graph|figure|trend|interpolat\w+|extrapolat\w+|read the|closest to|according to (?:table|figure))\b/i,
      skills: [
        'Reading a value from a table or graph, including one that must be matched across two figures',
        'Trends: as x increases, y increases / decreases / stays the same / increases then decreases',
        'Interpolation and extrapolation: a value between or beyond the data, "closest to"',
        'Comparing data sets or trials, converting between the figures\' units, reading a legend',
      ],
      hard: [
        'A value that must be read from one figure and looked up in another (a temperature from a graph, then its solubility from a table)',
        'A trend that reverses partway, where the tempting option is the overall direction',
        'Extrapolation beyond the table when the step between rows is not constant',
        'A graph with two y-axes or two curves, where the wrong curve gives a plausible value',
      ],
      traps: ['the wrong column or curve', 'the overall direction when the trend reverses', 'reading the x value where the y value was asked', 'a unit on the axis ignored (kPa vs Pa)'],
      exemplars: [
        `MC_QUESTION: According to Table 1, as the temperature of the water increased from 10°C to 50°C, the mass of KNO₃ that dissolved in 100 g of water:
\`\`\`passage
Students measured the maximum mass of potassium nitrate (KNO₃) that dissolved in 100 g of water at each of five temperatures. The results are shown in Table 1.
\`\`\`
\`\`\`graph
kind: table
title: Table 1
columns: Temperature (°C) | Mass of KNO₃ dissolved (g)
row: 10 | 21
row: 20 | 32
row: 30 | 46
row: 40 | 64
row: 50 | 86
\`\`\`
A) increased only.
B) decreased only.
C) increased, then decreased.
D) remained the same.
Correct Answer: A
Explanation: Each row's mass is larger than the one above it (21, 32, 46, 64, 86 g), so the mass increased only.`,
        `MC_QUESTION: Based on Table 1, if the students had measured the solubility of KNO₃ at 35°C, the mass dissolved in 100 g of water would most likely have been:
\`\`\`passage
Students measured the maximum mass of potassium nitrate (KNO₃) that dissolved in 100 g of water at each of five temperatures. The results are shown in Table 1.
\`\`\`
\`\`\`graph
kind: table
title: Table 1
columns: Temperature (°C) | Mass of KNO₃ dissolved (g)
row: 10 | 21
row: 20 | 32
row: 30 | 46
row: 40 | 64
row: 50 | 86
\`\`\`
A) less than 46 g.
B) between 46 g and 64 g.
C) between 64 g and 86 g.
D) greater than 86 g.
Correct Answer: B
Explanation: 35°C lies between the 30°C row (46 g) and the 40°C row (64 g), and the mass increases with temperature, so the value falls between them.`,
      ],
    },
    {
      id: 'investigation',
      name: 'Scientific Investigation',
      share: 'about 20-30% of the test',
      detect: /\b(scientific investigation|research summar\w*|experiment\w*|design|control\w*|variable|independent|dependent|procedure|trial|method|hypothesis test)\b/i,
      skills: [
        'Experimental design: the independent and dependent variables, what was held constant, the control, why a step was done',
        'Comparing experiments: what changed between Experiment 1 and Experiment 2 and what each one tests',
        'Predicting the result of a new trial or a changed procedure from the pattern in the results',
      ],
      hard: [
        'Which experiment tested a given factor, when two experiments differ in one variable each',
        'Why a control or a repeated trial was included, in the test\'s wording',
        'A changed procedure whose effect must be reasoned from the design, not read from a table',
      ],
      traps: ['the dependent variable named as the independent one', 'a variable that changed between trials called a constant', 'the control confused with a treatment'],
      exemplars: [
        `MC_QUESTION: Which of the following variables was held constant across the three trials of Experiment 1?
\`\`\`passage
Experiment 1: A student rolled a 0.5 kg cart down a ramp set at 10°, 20° and 30°, releasing it from rest 1.0 m up the ramp each time, and measured the cart's speed at the bottom.
Experiment 2: With the ramp fixed at 20°, the student repeated the procedure with carts of 0.5 kg, 1.0 kg and 1.5 kg.
\`\`\`
A) The angle of the ramp
B) The speed of the cart at the bottom
C) The distance up the ramp from which the cart was released
D) The mass of the cart in Experiment 2
Correct Answer: C
Explanation: In Experiment 1 the angle changed (the variable tested) and the speed was measured; the release distance stayed 1.0 m. D is about the other experiment.`,
      ],
    },
    {
      id: 'evaluation',
      name: 'Evaluation of Models, Inferences and Experimental Results',
      share: 'about 25-35% of the test',
      detect: /\b(evaluation|conflicting viewpoints|scientist [12]|student [12]|viewpoint|model|hypothes\w+|support\w*|consistent with|weaken|conclusion|valid)\b/i,
      skills: [
        'Whether a result supports or weakens a hypothesis or a stated model',
        'Conflicting Viewpoints: what each scientist claims, what they agree on, which new finding would support one over the other, how one would respond to the other',
        'Drawing a conclusion the data support, and recognizing when the data do not settle a question',
      ],
      hard: [
        'A new finding that is consistent with both viewpoints, against one that distinguishes them',
        'A conclusion item where the data support a weaker statement than the tempting option',
        'What two scientists agree on when they disagree about the cause',
      ],
      traps: ['a finding that fits both viewpoints taken as support for one', 'a conclusion stronger than the data', 'attributing a claim to the wrong scientist'],
      exemplars: [
        `MC_QUESTION: Suppose a sample of the lake's sediment from 1850 were found to contain the same concentration of phosphorus as sediment from 2020. This finding would best support the viewpoint of:
\`\`\`passage
Two scientists discuss why algae blooms in a lake have grown larger over the past century.

Scientist 1
The blooms are caused by phosphorus washed into the lake from farm fertilizer, which came into wide use after 1950. Sediment layers should show rising phosphorus after that date.

Scientist 2
The blooms are caused by warmer summers, which let algae grow for more weeks each year. Phosphorus levels in the lake have not changed; the algae simply have more time to use what was always there.
\`\`\`
A) Scientist 1, because it shows phosphorus has been present in the lake for a long time.
B) Scientist 1, because fertilizer use began before 1850.
C) Scientist 2, because it shows phosphorus levels did not rise after fertilizer came into use.
D) Scientist 2, because it shows that summers have become warmer.
Correct Answer: C
Explanation: Scientist 1 predicts rising phosphorus after 1950; equal levels in 1850 and 2020 contradict that and fit Scientist 2's claim that levels did not change. D is Scientist 2's view but is not what the finding shows.`,
      ],
    },
  ],
  scoreRange: { min: 1, max: 36 },
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the giveaways (one value read straight off a table). At most 1 item in 8 that easy, never first in a section; about half typical, at least a third of the harder kind under WHAT HARD LOOKS LIKE.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 30 from a 35. At least 4 of every 5 must be ones a student scoring in the mid-20s would miss: values that must be matched across two figures, reversing trends, extrapolation with uneven steps, which-experiment-tested-what, findings consistent with both viewpoints, conclusions the data only partly support. Hard never means outside science knowledge the test does not give.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one value or one clear trend each, in the test's format. Still real test items.`,
  },
}
