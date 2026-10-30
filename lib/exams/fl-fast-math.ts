// The Florida FAST Mathematics test (grades 3-8, B.E.S.T. standards) as a
// reference for the guide prompts. Computer-adaptive and untimed, so no pace.
// Algebra 1 and Geometry are EOCs with their own profiles.

import type { ExamProfile } from './types'
import { FAST_NAME } from './fl-fast-ela'

export const FL_FAST_MATH: ExamProfile = {
  id: 'fl-fast-math',
  name: 'the Florida FAST Mathematics test',
  detect: {
    exam: FAST_NAME,
    exclude: /\b(ELA|reading|english|language arts)\b/i,
    subjectHints: /\b(math|mathematics|number|fraction|decimal|ratio|proportion|expression|equation|geometry|measurement|data|statistic)\w*/i,
    subjects: ['mathematics'],
    explicit: /\bFAST\s+Math(?:ematics)?\b/,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly four options A-D, as on the test. No true/false, no "I, II and III" lists. The test's multiselect items become single-answer MC here.
- Equation-response items are NUM_QUESTION: a word problem or a figure whose answer is one number the student types (a whole number, a decimal or a fraction such as 3/4; give the accepted forms with |). Use NUM_QUESTION for about a third of the items.
- Figures where the real test has them: a kind: table of values or results, a kind: plane with plotted points or a line, a kind: bar chart, a kind: numberline for fractions, decimals and integers, a kind: dotplot or kind: boxplot for data items, a kind: geometry figure for area, angles and shapes. Put the figure fence directly under the question line.
- Word problems are in Florida's plain style: a named student or a store, one situation, the numbers given once, a question that ends with what is asked ("How many ... ?", "What is the total cost, in dollars, ... ?"). Units stated in the stem, never asked for in the answer box.
- Numbers must be the grade's: whole numbers and fractions in grades 3-5, rational numbers and percents in 6-7, scientific notation and irrational estimates in 8. Solve every item from its final numbers before writing the key; wrong options come from the grade's typical errors (adding denominators, dividing the wrong way in a rate, dropping a sign, confusing area and perimeter).
- No items about the test itself; no items that need a formula the grade has not met.
- Explanations stay short: the operation and the result in one or two sentences, and the error behind the most tempting wrong option.`,
  domains: [
    {
      id: 'grades-3-5',
      name: 'Grades 3-5 (number and operations, fractions and decimals, algebraic reasoning, measurement and geometry)',
      share: 'the elementary tests',
      detect: /\b(3rd|4th|5th|third|fourth|fifth)[- ]grade\b|\bgrade\s*[345]\b|\belementary\b|\b(multiplication|division|place value|rounding|fraction\w*|mixed number\w*|decimal\w*|perimeter|area|angle\w*|line plot|elapsed time)\b/i,
      skills: [
        'Place value to the thousandths, rounding, comparing; multi-digit multiplication and division with remainders interpreted in context',
        'Fractions: equivalence, comparing with benchmarks, adding and subtracting with unlike denominators (grade 5), multiplying a fraction by a whole number and by a fraction, dividing a unit fraction and a whole number; decimals to the hundredths and their operations',
        'Algebraic reasoning: writing an equation for a word problem with an unknown, patterns and rules, order of operations with parentheses (grade 5)',
        'Measurement and geometry: perimeter and area of rectangles and composite figures, angle measures (adding and subtracting), classifying triangles and quadrilaterals by properties, volume of rectangular prisms (grade 5), converting units within a system, elapsed time, line plots with fractions',
      ],
      hard: [
        'A two-step word problem where the first result feeds the second operation ("buys 3 packs of 8, gives away 5: how many left")',
        'A composite figure\'s area found by splitting it, with the perimeter as a wrong option',
        'A fraction comparison where the fractions have different denominators and no common benchmark',
        'A remainder that must be interpreted ("how many vans are needed" rounds up)',
      ],
      traps: ['adding denominators', 'perimeter for area', 'dropping the remainder when the question needs it rounded up', 'a product of a fraction and a whole number read as larger than the whole number'],
      exemplars: [
        `NUM_QUESTION: Mia buys 3 packs of pencils. Each pack has 12 pencils. She gives 7 pencils to her brother. How many pencils does Mia have left?
Answer: 29
Explanation: 3 × 12 = 36 pencils, and 36 - 7 = 29.`,
        `MC_QUESTION: The figure shows the floor of a room made of two rectangles. What is the area of the floor, in square feet?
\`\`\`graph
kind: geometry
point: A(0,0) B(10,0) C(10,4) D(6,4) E(6,7) F(0,7)
polygon: A B C D E F
side: A B | 10 ft
side: B C | 4 ft
side: E F | 6 ft
side: F A | 7 ft
\`\`\`
A) 34
B) 52
C) 58
D) 70
Correct Answer: C
Explanation: Split the floor into a 6 by 7 rectangle (42 square feet) and a 4 by 4 rectangle (16 square feet): 42 + 16 = 58. Choice D is the area of the full 10 by 7 rectangle without the missing corner, and choice A is the perimeter.`,
      ],
    },
    {
      id: 'grades-6-7',
      name: 'Grades 6-7 (ratios and rates, rational numbers, expressions and equations, geometry, statistics and probability)',
      share: 'the grade 6 and 7 tests',
      detect: /\b(6th|7th|sixth|seventh)[- ]grade\b|\bgrade\s*[67]\b|\b(ratio\w*|rate\w*|unit rate|percent\w*|proportion\w*|integer\w*|rational number\w*|one[- ]step|two[- ]step|inequalit\w+|circumference|surface area|probabilit\w+)\b/i,
      skills: [
        'Ratios, unit rates and proportional relationships: tables, graphs (the constant of proportionality from a graph), percent problems (discount, tax, tip, percent change), scale drawings',
        'Rational numbers: operations with integers, fractions and decimals (including negatives in grade 7), absolute value, the number line, ordering',
        'Expressions and equations: evaluating and simplifying with the distributive property and like terms, one-step (grade 6) and two-step (grade 7) equations and inequalities from word problems, graphing solutions on a number line',
        'Geometry: area of triangles, trapezoids and composite figures, circumference and area of circles (grade 7), surface area and volume of prisms, angle relationships (supplementary, vertical)',
        'Statistics and probability: mean, median, mode, range and mean absolute deviation; box plots, histograms and dot plots; theoretical and experimental probability, sample spaces for compound events (grade 7)',
      ],
      hard: [
        'A percent-change item where the base is the original value, with the change computed on the new value as a wrong option',
        'A two-step inequality word problem whose solution must be graphed or interpreted ("at most")',
        'A unit-rate comparison between two offers presented as a table and a sentence',
        'A box-plot item asking what fraction of the data lies above the median or inside the box',
      ],
      traps: ['dividing in the wrong order for a rate', 'percent of the new price instead of the original', 'a negative sign dropped when subtracting a negative', 'mean read as median'],
      exemplars: [
        `MC_QUESTION: A store sells 3 notebooks for $4.50. At this rate, what is the cost of 7 notebooks?
A) $9.00
B) $10.50
C) $12.00
D) $13.50
Correct Answer: B
Explanation: One notebook costs 4.50 ÷ 3 = $1.50, so 7 notebooks cost 7 × 1.50 = $10.50. Choice D divides the other way and multiplies 3 × 4.50.`,
        `NUM_QUESTION: The box plot shows the number of minutes 24 students spent on homework one night. How many of the 24 students spent more than 45 minutes on homework?
\`\`\`graph
kind: boxplot
box: 15, 30, 45, 60, 90 | Minutes on homework
x-label: Minutes
\`\`\`
Answer: 12
Explanation: The median is 45, so half of the 24 students, 12, are above it.`,
      ],
    },
    {
      id: 'grade-8',
      name: 'Grade 8 (linear equations and functions, systems, Pythagorean theorem, transformations, exponents)',
      share: 'the grade 8 test (pre-algebra)',
      detect: /\b(8th|eighth)[- ]grade\b|\bgrade\s*8\b|\bpre-?algebra\b|\b(slope\w*|linear (?:equation|function)\w*|y-intercept|system\w* of equations|pythagorean|transformation\w*|dilation\w*|reflection\w*|rotation\w*|exponent\w*|scientific notation|scatter ?plot\w*|square root\w*|irrational)\b/i,
      skills: [
        'Linear equations and functions: slope from two points, a table or a graph; y = mx + b from a situation; solving multi-step equations with variables on both sides (including no solution or infinitely many); identifying functions from tables, graphs and mappings; comparing functions given in different forms',
        'Systems of two linear equations: solving by graphing or substitution and interpreting the solution in context',
        'Pythagorean theorem: the hypotenuse, a leg, the distance between two points, the converse',
        'Transformations: translations, reflections, rotations and dilations on the coordinate plane and their effect on coordinates; congruence and similarity; angle relationships with parallel lines and a transversal; the angle sum of a triangle and exterior angles',
        'Exponents and roots: integer exponent rules, scientific notation operations, square and cube roots, estimating irrational numbers between consecutive integers',
        'Scatter plots: association, a line of fit and its meaning, two-way tables',
      ],
      hard: [
        'A slope item from a table whose x values are not consecutive',
        'A system presented as two situations in words whose solution answers "after how many hours do they cost the same"',
        'A Pythagorean item where the given sides are the hypotenuse and a leg (subtracting, not adding)',
        'A transformation item asking for the coordinates after a rotation of 90 degrees about the origin',
      ],
      traps: ['adding squares when the hypotenuse is given', 'slope as run over rise', 'the rotation rule for 90 degrees clockwise used for counterclockwise', 'exponent rules applied across addition'],
      exemplars: [
        `MC_QUESTION: The table shows the cost of renting a kayak for different numbers of hours. Which equation represents the cost, c, in dollars, of renting a kayak for h hours?
\`\`\`graph
kind: table
columns: Hours (h) | Cost (c)
row: 2 | 26
row: 4 | 42
row: 6 | 58
\`\`\`
A) c = 8h + 10
B) c = 10h + 6
C) c = 13h
D) c = 8h + 26
Correct Answer: A
Explanation: The cost rises 16 for every 2 hours, so the slope is 8; working back from (2, 26), the cost at 0 hours is 26 - 16 = 10. Choice C uses only the first row.`,
        `NUM_QUESTION: A ladder 13 feet long leans against a wall. The bottom of the ladder is 5 feet from the base of the wall. How many feet above the ground does the ladder touch the wall?
Answer: 12
Explanation: The ladder is the hypotenuse: 13² - 5² = 169 - 25 = 144, and the square root of 144 is 12.`,
      ],
    },
    {
      id: 'data-probability',
      name: 'Data and probability (all grades)',
      share: 'items in every grade\'s test',
      detect: /\b(data|graph\w*|dot plot|line plot|bar graph|histogram\w*|box plot|mean|median|mode|range|spread|probabilit\w+|likely|outcome\w*|sample space|survey\w*)\b/i,
      skills: [
        'Reading and making dot plots, bar graphs, pictographs (grades 3-4), line plots with fractions (grades 4-5), histograms and box plots (6-7), scatter plots (8)',
        'Measures of center and spread: mean, median, mode, range, mean absolute deviation (grades 6-7); which measure a situation calls for and how an outlier changes each',
        'Probability (grade 7): the probability of an event as a fraction, decimal or percent; experimental vs theoretical; sample spaces for two events (tables, tree diagrams) and compound probability',
        'Interpreting a graph\'s claim: what a survey result does and does not show',
      ],
      hard: [
        'A mean item where one value is missing and the mean is given ("what score does she need on the fourth test")',
        'A histogram item where the question needs a count across two bins',
        'A compound-probability item with a sample space the student must build (two spinners)',
      ],
      traps: ['median read off an unordered list', 'the bin with the tallest bar read as the median', 'probabilities of two independent events added instead of multiplied'],
      exemplars: [
        `NUM_QUESTION: Jaden's scores on his first three science tests were 82, 90 and 86. What score does he need on his fourth test to have a mean score of exactly 88 on the four tests?
Answer: 94
Explanation: A mean of 88 on four tests needs a total of 4 × 88 = 352; the first three total 258, so he needs 352 - 258 = 94.`,
        `MC_QUESTION: The dot plot shows the number of books 15 students read over the summer. What is the median number of books read?
\`\`\`graph
kind: dotplot
data: 0, 1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 5, 6, 8
x-label: Books read
\`\`\`
A) 2
B) 3
C) 3.1
D) 4
Correct Answer: B
Explanation: With 15 values in order, the median is the 8th value, which is 3. Choice C is close to the mean, and choice A is a mode of part of the data.`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the mix of a real FAST session around Level 3 (on grade level), minus the one-step recall items. At most 1 item in 8 a single-operation item, never first in a section; about half typical Level 3 items (a two-step word problem, a figure read correctly, a rate) and at least a third Level 4-5 items of the kind under WHAT HARD LOOKS LIKE (multi-step problems, figures that must be split or combined, items where the common error is one of the options).`,
    hard: `DIFFICULTY ON THIS TEST: Level 4 and 5 items. At least 4 of every 5 items must be ones a Level 3 student would miss: three-step word problems, non-routine figures, a missing value given the mean, comparisons between representations, remainders and units that must be interpreted. Hard never means arithmetic with big ugly numbers or content from a later grade.`,
    easier: `DIFFICULTY ON THIS TEST: Level 2-3 items, one operation or one figure each, numbers that work out cleanly, in the test's plain word-problem style. Still real test items.`,
  },
}
