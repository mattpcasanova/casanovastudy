// The ACT Math section (the 2025 "enhanced" ACT: 45 questions, four options,
// calculator allowed) as a reference for the guide prompts.

import type { ExamProfile } from './types'

import { ACT_NAME } from './act-name'

export const ACT_MATH: ExamProfile = {
  id: 'act-math',
  pace: 67,
  name: 'the ACT Math section',
  detect: {
    exam: ACT_NAME,
    exclude: /\b(english|grammar|punctuation|reading comprehension|science passage|data representation|research summar|conflicting viewpoints)\b/i,
    subjectHints: /\b(math|algebra|geometry|trig|trigonometry|function|equation|matrix|matrices|logarithm|log|complex number|sequence|probability|statistics|percent|ratio|circle|triangle|number and quantity|modeling|integrating essential skills|preparing for higher math)\b/i,
    subjects: ['mathematics', 'math'],
    explicit: /\bact\s+math(?:ematics)?\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Every item is multiple choice with exactly four options A-D. No student-produced responses, true/false, "I, II and III" lists or explain-in-words items.
- Stems are direct and short, in the test's voice: "What is the value of x?", "Which of the following is equivalent to ...?", "In the standard (x, y) coordinate plane, ...", "What is the area, in square inches, of ...?", "If f(x) = ..., what is f(3)?", "The table below shows ... Which of the following ...?". Units are named in the stem when they matter ("in square feet").
- Many items are pure math with no story; the rest have a one- or two-sentence real-world setup. Data comes in a figure block under the question line (a table, a graph in the coordinate plane, a geometry figure labeled with the given measures, a bar graph) and the figure's numbers must match the key.
- Options are numbers or expressions in the form the test uses (fractions reduced, radicals simplified, π left as π when exact), parallel in form; the wrong ones come from the mistakes under WRONG ANSWERS ARE BUILT FROM.
- A calculator is allowed, so the hard part is never arithmetic.
- Before writing an item's answer, solve it from the final numbers in the stem and check that exactly one option is right. If the numbers do not work out, change them. Never leave a note or a second attempt in the explanation.
- Explanations stay short; the full walkthrough is a tap away for the student.`,
  domains: [
    {
      id: 'higher-math',
      name: 'Preparing for Higher Math',
      share: 'about 57-60% of the test',
      detect: /\b(preparing for higher math|number and quantity|algebra|functions?|geometry|statistics|probability|trig\w*|matrix|matrices|logarithm|complex number|sequence|exponent|radical|quadratic|polynomial|circle|triangle|vector|conic|ellipse)\b/i,
      skills: [
        'Number and Quantity: real and complex numbers, integer and rational exponents, radicals, scientific notation, factors and multiples, matrices (addition, scalar multiplication, a simple product), vectors as ordered pairs',
        'Algebra: linear, quadratic, polynomial, radical and exponential expressions and equations; systems of equations; inequalities; absolute value; solving for a variable in a formula',
        'Functions: notation, composition f(g(x)), transformations, domain and range, graphs of linear, quadratic, exponential, logarithmic and trigonometric functions; arithmetic and geometric sequences; logarithm rules',
        'Geometry: angles with parallel lines, triangles (similar, special right, area), circles (arcs, chords, equations), polygons, area and volume, the distance and midpoint formulas, slope, equations of lines, basic conic sections',
        'Statistics and Probability: mean, median, mode, range; weighted averages; probability of single and compound events; counting (permutations and combinations); reading data displays; expected value',
      ],
      hard: [
        'Trigonometry beyond right triangles: the unit circle, radians, amplitude and period of y = a sin(bx), the law of sines or cosines in a word problem',
        'Logarithms: solving an exponential equation with a log, or rewriting a log expression with the product and power rules',
        'Complex numbers (i² = -1 in a product or quotient) and matrices (a product or a determinant)',
        'A function composition or transformation item where the answer is the new expression, not a number',
        'Geometry with two steps: a similar-triangle ratio inside a figure, a circle equation from its graph, the area left after removing a sector',
        'Counting and probability with "at least" or "without replacement"',
      ],
      traps: ['a sign error with i²', 'degrees and radians mixed', 'the slope and the intercept swapped', 'the diameter used as the radius', 'the nearest noun used for the ratio', 'treating a geometric sequence as arithmetic', 'answering for x when 2x was asked'],
      exemplars: [
        `MC_QUESTION: What is the value of log₂ 32 + log₃ 9?
A) 5
B) 7
C) 9
D) 11
Correct Answer: B
Explanation: 2⁵ = 32 and 3² = 9, so the sum is 5 + 2 = 7.`,
        `MC_QUESTION: For i² = -1, what is the product (3 + 2i)(1 - 4i)?
A) 3 - 8i
B) 11 - 10i
C) -5 - 10i
D) 11 + 10i
Correct Answer: B
Explanation: 3 - 12i + 2i - 8i² = 3 - 10i + 8 = 11 - 10i. Forgetting that i² = -1 gives -5 - 10i.`,
        `MC_QUESTION: In the standard (x, y) coordinate plane, a circle has its center at (3, -2) and passes through the point (7, 1). What is the equation of the circle?
A) (x - 3)² + (y + 2)² = 5
B) (x - 3)² + (y + 2)² = 25
C) (x + 3)² + (y - 2)² = 25
D) (x - 3)² + (y + 2)² = 7
Correct Answer: B
Explanation: The radius is the distance from (3, -2) to (7, 1): √(4² + 3²) = 5, so r² = 25. Option A uses r instead of r².`,
      ],
    },
    {
      id: 'essential',
      name: 'Integrating Essential Skills',
      share: 'about 40-43% of the test',
      detect: /\b(integrating essential skills|rates?|percent\w*|proportion\w*|ratio|average|median|area|perimeter|volume|unit conversion|word problem|modeling)\b/i,
      skills: [
        'Rates, percentages and proportional relationships in multi-step word problems: percent change, discounts and tax, unit rates, scale, mixtures',
        'Area, surface area and volume of common shapes, often combined ("the shaded region", a box with a cylinder removed)',
        'Averages and medians, including a missing value from a known mean and a weighted average',
        'Expressing numbers in different ways: fractions, decimals, percents, scientific notation',
        'Modeling: reading a described situation into an equation or a graph and using it',
      ],
      hard: [
        'A percent problem with two changes on different bases, or an original amount asked after a discount and tax',
        'A missing data value from a mean or a median, or the mean after a value is added',
        'An area or volume problem that needs a dimension found first (from a perimeter, a diagonal or a ratio)',
        'A rate problem with a unit conversion in the middle (minutes to hours, feet to miles)',
      ],
      traps: ['adding percents instead of multiplying the factors', 'the percent of the wrong base', 'the mean used where the median was asked', 'a unit conversion skipped', 'area scaled like a length'],
      exemplars: [
        `MC_QUESTION: A store marks a jacket up 25% from its wholesale cost and later sells it at 20% off the marked price. The sale price is what percent of the wholesale cost?
A) 95%
B) 100%
C) 105%
D) 125%
Correct Answer: B
Explanation: 1.25 × 0.80 = 1.00, so the sale price equals the wholesale cost. Adding the percents (+25 - 20) gives the 105% trap.`,
        `MC_QUESTION: The mean of 5 test scores is 82. When a sixth score is added, the mean of all 6 scores is 85. What is the sixth score?
A) 88
B) 91
C) 97
D) 100
Correct Answer: D
Explanation: The totals are 5(82) = 410 and 6(85) = 510, so the added score is 100.`,
        `MC_QUESTION: A rectangular box is 10 inches long, 6 inches wide and 4 inches tall. A cylindrical hole with a radius of 1 inch is drilled straight through the box from top to bottom. What is the volume, in cubic inches, of the box that remains?
A) 240 - 4π
B) 240 - 8π
C) 240 - 16π
D) 240 - π
Correct Answer: A
Explanation: The box is 240 cubic inches and the hole is π(1²)(4) = 4π. Using the height of 4 as the radius, or the diameter as the radius, gives the other options.`,
      ],
    },
  ],
  scoreRange: { min: 1, max: 36 },
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the test runs from easy to hard across the section, but this is practice, so skip the giveaways: at most 1 item in 8 is a one-step item, never first in a section. About half typical (two steps, a familiar setup) and at least a third from the harder end described under WHAT HARD LOOKS LIKE (the last third of the real section).`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 30 from a 36, the last third of the section. At least 4 of every 5 items must be ones a student scoring in the mid-20s would miss: trig beyond right triangles, logarithms, complex numbers and matrices, compositions and transformations, two-step geometry, counting with conditions, multi-step rates and percents. Hard never means messy arithmetic or content the test does not cover.`,
    easier: `DIFFICULTY ON THIS TEST: the first third of the section, one idea each, in the test's voice. Still real test items.`,
  },
}
