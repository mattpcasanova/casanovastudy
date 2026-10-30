// The GRE General Test's Quantitative Reasoning section (the shorter test since
// September 2023: two sections, 27 items in 47 minutes, scored 130-170) as a
// reference for the guide prompts. Four item types: Quantitative Comparison
// (four fixed options), Problem Solving (five options), Numeric Entry and Data
// Interpretation sets on a table or graph. An on-screen calculator is allowed.

import type { ExamProfile } from './types'

/** Capitals only, like the ACT: "gre" inside a word or a sentence never matches. */
export const GRE_NAME = /\bGRE\b/

const QC_OPTIONS = `A) Quantity A is greater
B) Quantity B is greater
C) The two quantities are equal
D) The relationship cannot be determined from the information given`

export const GRE_QUANT: ExamProfile = {
  id: 'gre-quant',
  pace: 104,
  name: 'the GRE Quantitative Reasoning section',
  detect: {
    exam: GRE_NAME,
    exclude: /\b(verbal|reading|text completion|sentence equivalence|vocabulary|analytical writing|essay)\b/i,
    subjectHints: /\b(quant\w*|math\w*|arithmetic|algebra|geometry|data|statistic\w*|number)\b/i,
    subjects: ['mathematics'],
    explicit: /\bGRE\s+(?:quant\w*|math\w*)\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Four item types, in roughly the test's mix: about a third Quantitative Comparison, about a third Problem Solving, and the rest Numeric Entry and Data Interpretation. No true/false, no "I, II and III" lists, no "explain why" items.
- Quantitative Comparison items are MC_QUESTION with the stem "Compare Quantity A and Quantity B." and a \`\`\`passage fence directly under it holding any centred information on its own line first (for example "x is a positive integer." or "n > 1"), then "Quantity A: ..." and "Quantity B: ..." on separate lines. The options are EXACTLY these four, in this order and wording:
${QC_OPTIONS}
A QC item is only fair when the answer is forced: D is right only when two different legal cases give different orders, and A, B or C only when every legal case agrees. Test at least two cases (a negative, a fraction, zero, a large value) before writing the key.
- Problem Solving items are MC_QUESTION with exactly five options A-E, each a plausible result of a real misstep (a sign slip, a percent of the wrong base, a unit left unconverted, the complement). Answer choices are in numerical order when they are numbers.
- Numeric Entry items are NUM_QUESTION: "Enter your answer as an integer or a decimal" or "as a fraction" is implied; give the key as "Answer: 2.5 | 5/2" with every form that is right. A quantity in the stem says its unit; the answer line says none.
- Data Interpretation items come in sets of 2-3 on one data display, a kind: table or kind: bar figure under the first item and REPEATED under each later item so every item stands alone ("The following questions refer to the table."). Ask what the display can answer: a percent change, a ratio of two cells, a difference of averages, "approximately" when the data are read from a bar.
- Stems are the test's: "If x and y are integers such that ..., which of the following must be true?", "What is the value of ...?", "Approximately what percent of ...", "Which of the following is closest to ...". Figures are described as "not necessarily drawn to scale" and never carry a measurement the stem does not state. Variables and exponents in \`$$LaTeX$$\` or Unicode powers, never calculator notation.
- An on-screen calculator is allowed, so numbers need not be clean; but every key is checked by solving the item from its final numbers before it is written. If the numbers do not give the intended answer, change the numbers, never the key, and never leave a note.
- Explanations stay short: the method in one or two sentences, and the trap in the most tempting wrong option (for QC, the case that rules out the tempting answer).`,
  domains: [
    {
      id: 'arithmetic',
      name: 'Arithmetic and number properties',
      share: 'about 25-30% of the section',
      detect: /\b(arithmetic|integer\w*|divisib\w+|remainder\w*|factor\w*|multiple\w*|prime\w*|even|odd|fraction\w*|decimal\w*|percent\w*|ratio\w*|proportion\w*|exponent\w*|power\w*|root\w*|square root|absolute value|number line|estimat\w+|place value|consecutive)\b/i,
      skills: [
        'Integers: divisibility, primes and factorisation, remainders (including remainders of sums and products), even/odd and sign rules, consecutive integers',
        'Fractions, decimals and percents: percent change and successive percent changes, percent of a percent, ratios and proportions, rates',
        'Exponents and roots: the rules, negative and fractional exponents, comparing powers, simplifying roots, scientific notation',
        'Estimation and the number line: ordering fractions and decimals, absolute value, approximating roots and products',
      ],
      hard: [
        'A QC where a variable can be negative or a fraction, so the "obvious" order flips',
        'Remainders of expressions (what 2x leaves when x leaves 3 on division by 7)',
        'Successive percent changes that do not add (up 20% then down 20%)',
        'Comparing powers with different bases and exponents by rewriting to a common base',
      ],
      traps: ['assuming a variable is a positive integer when the stem does not say so', 'percent of the wrong base', 'treating a remainder question as a divisibility question', 'adding successive percent changes'],
      exemplars: [
        `MC_QUESTION: Compare Quantity A and Quantity B.
\`\`\`passage
When the positive integer x is divided by 7, the remainder is 3.

Quantity A: The remainder when 2x is divided by 7
Quantity B: 6
\`\`\`
${QC_OPTIONS}
Correct Answer: C
Explanation: x = 7k + 3 for some integer k, so 2x = 14k + 6, which leaves remainder 6 on division by 7 for every such x. The quantities are equal in every case, so C, not D: testing x = 3 and x = 10 both give 6.`,
        `MC_QUESTION: If 40 percent of x is 18, what is 150 percent of x?
A) 27
B) 45
C) 60
D) 67.5
E) 72
Correct Answer: D
Explanation: 0.4x = 18 gives x = 45, and 1.5(45) = 67.5. Choice B stops at x; choice A is 150 percent of 18 instead of x.`,
      ],
    },
    {
      id: 'algebra',
      name: 'Algebra',
      share: 'about 25-30% of the section',
      detect: /\b(algebra\w*|equation\w*|inequalit\w+|linear|quadratic\w*|function\w*|f\(x\)|expression\w*|simplif\w+|factor\w+|system\w*|coordinate\w*|slope\w*|intercept\w*|word problem\w*|rate\w*|work\b|mixture\w*|distance|speed|sequence\w*)\b/i,
      skills: [
        'Linear equations and inequalities, systems of two equations, absolute value equations and inequalities',
        'Quadratics: factoring, the formula, the discriminant, sums and products of roots, the special products (a + b)², (a - b)², a² - b²',
        'Functions and their graphs: evaluating, composing, domain, transformations; coordinate geometry: slope, intercepts, distance and midpoint, parallel and perpendicular lines',
        'Word problems: rate, work, mixture, age, interest (simple and compound), sequences with a rule',
      ],
      hard: [
        'A QC with x² = 16 where x may be -4, so the sign cannot be determined',
        'Inequalities multiplied by a variable whose sign is unknown',
        'A work problem with three workers or a worker who leaves part way',
        'Translating "must be true" from a system with more unknowns than equations',
      ],
      traps: ['taking only the positive square root', 'reversing an inequality sign incorrectly (or failing to)', 'adding rates as times', 'solving for x when the question asks for 2x + 1'],
      exemplars: [
        `MC_QUESTION: Compare Quantity A and Quantity B.
\`\`\`passage
x² = 16

Quantity A: x
Quantity B: 4
\`\`\`
${QC_OPTIONS}
Correct Answer: D
Explanation: x can be 4 (the quantities are equal) or -4 (Quantity B is greater), so the relationship cannot be determined. Choosing C assumes x is the positive root.`,
        `NUM_QUESTION: Working alone, machine A completes a job in 6 hours and machine B completes the same job in 3 hours. Working together at these constant rates, how many hours do the two machines take to complete the job?
Answer: 2 | 2.0
Explanation: A does 1/6 of the job per hour and B does 1/3, so together they do 1/6 + 1/3 = 1/2 of the job per hour, which is 2 hours for the whole job. Averaging the times (4.5 hours) is the usual error.`,
      ],
    },
    {
      id: 'geometry',
      name: 'Geometry',
      share: 'about 15-20% of the section',
      detect: /\b(geometr\w+|angle\w*|line\w*|parallel|perpendicular|triangle\w*|right triangle|pythagor\w+|isosceles|equilateral|circle\w*|arc\w*|sector\w*|chord\w*|polygon\w*|quadrilateral\w*|rectangle\w*|square\w*|area|perimeter|circumference|volume|surface area|cylinder\w*|cube\w*|rectangular solid|coordinate plane|xy-plane)\b/i,
      skills: [
        'Lines and angles: vertical, supplementary, parallel lines with a transversal; polygon angle sums; triangle inequality and angle-side relations',
        'Triangles: the Pythagorean theorem and the common triples, 30-60-90 and 45-45-90 ratios, similar triangles, area with any base and height',
        'Circles: circumference and area, arc length and sector area from a central angle, inscribed angles, tangents; polygons and composite figures',
        'Solids and the coordinate plane: volume and surface area of rectangular solids and cylinders, distance and area of figures given by coordinates; "figures not necessarily drawn to scale"',
      ],
      hard: [
        'A QC on a third side of a triangle given two sides (only a range is known)',
        'A composite figure whose shaded area is a difference of a sector and a triangle',
        'A figure drawn to look isosceles or right when nothing in the stem says so',
        'A cylinder problem that mixes a diameter and a radius',
      ],
      traps: ['trusting the drawing', 'using the diameter as the radius', 'sector area from the arc fraction applied to circumference', 'assuming a quadrilateral is a rectangle'],
      exemplars: [
        `MC_QUESTION: A circle has radius 6. What is the area of a sector of the circle whose central angle measures 60°?
A) 3π
B) 6π
C) 12π
D) 18π
E) 36π
Correct Answer: B
Explanation: The sector is 60/360 = 1/6 of the circle, and the circle's area is 36π, so the sector's area is 6π. Choice E is the whole circle; choice A is 1/6 of the circumference confused with area.`,
        `MC_QUESTION: Compare Quantity A and Quantity B.
\`\`\`passage
Two sides of a triangle have lengths 5 and 12.

Quantity A: The length of the third side
Quantity B: 13
\`\`\`
${QC_OPTIONS}
Correct Answer: D
Explanation: The third side can be any length between 7 and 17, so it may be less than, equal to or greater than 13. Choosing C assumes the triangle is right, which the stem never says.`,
      ],
    },
    {
      id: 'data-analysis',
      name: 'Data analysis',
      share: 'about 25-30% of the section, including the data interpretation set',
      detect: /\b(data|statistic\w*|mean|median|mode|range|standard deviation|quartile\w*|percentile\w*|normal distribution|probability|counting|combination\w*|permutation\w*|arrangement\w*|table\w*|chart\w*|graph\w*|bar graph|circle graph|pie chart|interpretation|frequency|distribution)\b/i,
      skills: [
        'Descriptive statistics: mean, median, mode, range, quartiles and interquartile range, standard deviation as spread (no formula needed), the effect of adding or removing a value',
        'The normal distribution: about 68% within one standard deviation, 95% within two, 34% between the mean and one standard deviation, 14% between one and two',
        'Counting and probability: the multiplication principle, permutations and combinations, probability of "and"/"or"/"not", independent events, probability from a table',
        'Data interpretation: reading a table, bar graph, line graph or circle graph; percent change, ratios of categories, averages across groups, approximate reading',
      ],
      hard: [
        'A mean-and-median question where one value is unknown and the median must be placed by cases',
        'A normal-distribution question asking for the percent between two values on different sides of the mean',
        'A counting question that mixes a combination with a restriction (committees with at least one of a type)',
        'A data set question that needs two cells combined before the percent is taken',
      ],
      traps: ['confusing mean and median', 'permutation used for a committee', 'reading a percent off a bar as a count', 'taking the percent change on the wrong base year'],
      exemplars: [
        `NUM_QUESTION: The list consists of the numbers 3, 7, 7, 12 and 16. What is the result when the median of the list is subtracted from the mean of the list?
Answer: 2 | 2.0
Explanation: The mean is 45/5 = 9 and the median (the middle value in order) is 7, so the difference is 9 - 7 = 2. Using the mode, 7, for the mean gives 0.`,
        `MC_QUESTION: The scores on a test are approximately normally distributed with a mean of 70 and a standard deviation of 5. Approximately what percent of the scores are between 65 and 80?
A) 34%
B) 48%
C) 68%
D) 82%
E) 95%
Correct Answer: D
Explanation: From 65 to 70 is one standard deviation below the mean (about 34%) and from 70 to 80 is two standard deviations above (about 34% + 14% = 48%), so about 82% in all. Choice C is the range from 65 to 75; choice E is from 60 to 80.`,
        `MC_QUESTION: The following question refers to the table. In 2023, approximately what percent of the company's total sales came from the West region?
\`\`\`graph
kind: table
title: Sales by region, in millions of dollars (illustrative)
columns: Region | 2022 | 2023
row: North | 48 | 52
row: South | 36 | 40
row: West | 60 | 78
row: Total | 144 | 170
\`\`\`
A) 36%
B) 42%
C) 46%
D) 54%
E) 78%
Correct Answer: C
Explanation: 78/170 ≈ 0.459, about 46%. Choice B uses the 2022 figures (60/144 ≈ 42%); choice E reads the West's sales as a percent.`,
      ],
    },
  ],
  scoreRange: { min: 130, max: 170, step: 1 },
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: practice for someone already past the basics. Skip the items nearly everyone gets (one step, one idea): at most 1 item in 8 is that easy, and never first in a section. About half are typical test items (two steps, a familiar setup with one twist) and at least a third are the kind under WHAT HARD LOOKS LIKE, the items of the harder second section. If a current or target score is given, write at and above that level: a 150 wants the 150-160 items, a 160 wants 160-170.`,
    hard: `DIFFICULTY ON THIS TEST: the items from the harder second section, the ones that separate 160 from 170. At least 4 of every 5 items must be ones a test taker scoring around 155-160 would miss: QC items whose answer flips on a negative or a fraction, "must be true" items with a tempting "could be true" option, remainder and exponent reasoning, counting with a restriction, data interpretation that needs two cells combined. Hard never means more arithmetic; it means a trap that careful reasoning avoids.`,
    easier: `DIFFICULTY ON THIS TEST: the first-section items most test takers get right, one idea each, in the test's voice. Still real test items, not textbook drills.`,
  },
}
