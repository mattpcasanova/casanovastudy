// The Florida B.E.S.T. Algebra 1 EOC as a reference for the guide prompts.
// Untimed (no pace). A no-calculator section and a calculator section; item
// types are multiple choice, multiselect, equation response, graphic response
// and table response, which here become MC and NUM items with figures.

import type { ExamProfile } from './types'

const ALG1_EOC = /\bAlgebra\s*(?:1|I|one)\b.*\bEOC\b|\bEOC\b.*\bAlgebra\s*(?:1|I|one)\b|\bAlgebra\s*(?:1|I)\s+(?:end[- ]of[- ]course|state\s+(?:test|exam|assessment))\b/i

export const FL_ALGEBRA1_EOC: ExamProfile = {
  id: 'fl-algebra1-eoc',
  name: 'the Florida B.E.S.T. Algebra 1 EOC',
  detect: {
    exam: ALG1_EOC,
    subjectHints: /./,
    subjects: ['mathematics'],
    explicit: ALG1_EOC,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly four options A-D, as on the test. No true/false, no "I, II and III" lists. The test's multiselect items ("Select all that apply") become single-answer MC here ("Which statement is true about the function?").
- Equation-response items are NUM_QUESTION: the answer is one number the student types (an integer, a decimal, or a fraction such as 5/2; give the accepted forms with |). The test's graphic-response and table-response items become an MC that asks for the feature the student would plot ("Which ordered pair is the vertex?") or a NUM for one value. Use NUM_QUESTION for about a third of the items.
- Figures where the real test has them: a kind: plane with a line, a parabola or an exponential curve (plot: lines with the function, point: for labeled points, grid), a kind: table of values or a two-way table, a kind: scatter plot with a fit line. Put the fence directly under the question line.
- Stems are the test's: "The function f is defined by ... What is the value of f(-3)?", "Which function has the greater rate of change over the interval 0 ≤ x ≤ 4?", "A rectangular garden has a length that is 3 feet more than twice its width. The area is 65 square feet. Which equation can be used to find the width, w?", "The table shows ... Which type of function best models the data?", "What is the solution to the system of equations shown?", "Which expression is equivalent to ...?". Modeling items give a real situation in plain language and ask for the equation, the meaning of a value ("What does the 15 represent?") or the solution in context.
- Say which section an item belongs to when it matters: items that need arithmetic that is only reasonable with a calculator (irrational roots to decimals, regression) are calculator-section items; factoring, exponent rules and simple solving are no-calculator items.
- Solve every item from its final numbers before writing the key; check that exactly one option is correct and that wrong options come from the course's typical errors (a sign error in the vertex, the x-intercepts of the wrong factor, slope from the wrong pair, the wrong direction for a compound inequality). Never leave a note or a second attempt in the explanation.
- Explanations stay short: the method and the result in one or two sentences, and the error behind the most tempting wrong option.`,
  domains: [
    {
      id: 'expressions-functions-data',
      name: 'Expressions, functions and data analysis (MA.912.AR.1, F.1-F.3, DP.1-DP.3)',
      share: 'about 35-40% of the test',
      detect: /\b(polynomial\w*|monomial\w*|binomial\w*|trinomial\w*|like terms|distributive|function notation|f\(x\)|domain|range|key feature\w*|intercept\w*|increasing|decreasing|maximum|minimum|rate of change|average rate|transformation\w*|scatter ?plot\w*|line of (?:best )?fit|correlation|residual\w*|two[- ]way table\w*|frequenc\w+|statistic\w*|data)\b/i,
      skills: [
        'Operations with polynomials: adding, subtracting, multiplying (including a binomial times a trinomial), dividing by a monomial; identifying the degree and leading coefficient; rewriting expressions with the distributive property and factoring out a GCF',
        'Functions: function notation and evaluating from a rule, table or graph; domain and range (including from a context); key features from graphs and tables (intercepts, intervals of increase and decrease, maximum and minimum, end behavior for linear, quadratic and exponential); average rate of change over an interval; transformations f(x) + k and f(x + k)',
        'Comparing linear, quadratic and exponential functions given in different forms, and which type models a table (constant differences vs constant ratios)',
        'Data: scatter plots, association, a line of fit and the meaning of its slope and intercept, residuals (fit quality), two-way frequency tables with joint, marginal and conditional relative frequencies; one-variable statistics (mean, median, standard deviation as spread, outliers)',
      ],
      hard: [
        'An average-rate-of-change item over an interval read from a graph, with the slope of the tangent-looking secant as a wrong option',
        'A two-way table conditional probability ("given that the student is a junior") with the joint frequency as a wrong option',
        'A "which type of function" item where the table\'s x values skip',
        'A polynomial product (x + 3)(2x² - x + 4) with the middle terms combined incorrectly in the wrong options',
      ],
      traps: ['(a + b)² read as a² + b²', 'domain and range swapped', 'joint frequency for conditional', 'constant differences read as exponential'],
      exemplars: [
        `MC_QUESTION: The function f is defined by f(x) = x² - 6x + 5. What is the average rate of change of f over the interval 1 ≤ x ≤ 4?
A) -3
B) -1
C) 1
D) 3
Correct Answer: B
Explanation: f(1) = 0 and f(4) = 16 - 24 + 5 = -3, so the average rate of change is (-3 - 0)/(4 - 1) = -1. Choice A is the change in f without dividing by the change in x.`,
        `MC_QUESTION: The table shows the results of a survey of 200 students about whether they have a part-time job. A student who is a junior is selected at random. What is the probability that the student has a part-time job?
\`\`\`graph
kind: table
columns: Has a job | No job | Total
row: Juniors | 36 | 84 | 120
row: Seniors | 44 | 36 | 80
row: Total | 80 | 120 | 200
\`\`\`
A) 36/200
B) 36/120
C) 36/80
D) 120/200
Correct Answer: B
Explanation: The condition "is a junior" makes the 120 juniors the whole, and 36 of them have a job: 36/120 = 0.3. Choice A is the joint relative frequency, and choice C conditions on having a job instead.`,
      ],
    },
    {
      id: 'linear',
      name: 'Linear relationships (MA.912.AR.2, AR.9, parts of AR.3)',
      share: 'about 30-35% of the test',
      detect: /\b(linear|slope\w*|y-intercept|x-intercept|point[- ]slope|standard form|slope[- ]intercept|system\w* of (?:linear )?equations|inequalit\w+|compound inequalit\w+|absolute value|literal equation\w*|solve for|parallel|perpendicular|arithmetic sequence\w*)\b/i,
      skills: [
        'Writing linear equations from a slope and a point, two points, a table, a graph or a context; converting among slope-intercept, point-slope and standard form; parallel and perpendicular lines',
        'Solving linear equations and inequalities in one variable (including variables on both sides, no solution and identities), compound inequalities, absolute value equations and inequalities; graphing solution sets on a number line',
        'Literal equations: solving a formula for a chosen variable',
        'Systems of two linear equations and inequalities: solving by graphing, substitution and elimination; the number of solutions from the slopes and intercepts; interpreting the solution in context; graphing the solution region of a system of inequalities',
        'Linear modeling: the meaning of slope and intercept in context, arithmetic sequences as linear functions with an explicit formula',
      ],
      hard: [
        'A system word problem (tickets and prices, two plans) whose answer is one of the two unknowns, with the other unknown as a wrong option',
        'An absolute value inequality whose solution is two rays ("or"), with the "and" interval as a wrong option',
        'A literal equation with the variable in two terms, requiring factoring',
        'A system with no solution identified from equations in different forms',
      ],
      traps: ['solving for the wrong unknown of a system', 'flipping the inequality sign at the wrong step', 'the "and" case for an absolute value greater-than inequality', 'slope from a table\'s first two rows when x skips'],
      exemplars: [
        `NUM_QUESTION: A school sold 300 tickets to a play. Adult tickets cost $8 and student tickets cost $5. The total collected was $1,890. How many adult tickets were sold?
Answer: 130
Explanation: With a adult and s student tickets, a + s = 300 and 8a + 5s = 1,890. Substituting s = 300 - a gives 8a + 1,500 - 5a = 1,890, so 3a = 390 and a = 130 (and 170 student tickets).`,
        `MC_QUESTION: Which inequality represents all values of x for which |2x - 5| > 7?
A) -1 < x < 6
B) x < -1 or x > 6
C) -6 < x < 1
D) x < -6 or x > 1
Correct Answer: B
Explanation: |2x - 5| > 7 means 2x - 5 > 7 or 2x - 5 < -7, so x > 6 or x < -1. Choice A is the solution of the less-than inequality.`,
      ],
    },
    {
      id: 'nonlinear',
      name: 'Non-linear relationships (MA.912.AR.3, AR.4, AR.5: quadratics, absolute value, exponentials)',
      share: 'about 25-30% of the test',
      detect: /\b(quadratic\w*|parabola\w*|vertex|axis of symmetry|factor\w*|zeros?|roots?|completing the square|quadratic formula|discriminant|exponential\w*|growth|decay|compound\w*|half-life|doubling|geometric sequence\w*|cube root|square root function\w*)\b/i,
      skills: [
        'Quadratics: standard, vertex and factored forms and converting among them; factoring (GCF, trinomials, difference of squares); solving by factoring, square roots, completing the square and the quadratic formula; the vertex, axis of symmetry, intercepts and direction of opening from any form; the meaning of the vertex and the zeros in a context (maximum height, when it lands)',
        'Exponential functions: f(x) = a·b^x from a table, a graph or a context; growth and decay rates and factors; percent change per period; geometric sequences as exponential functions; comparing linear and exponential growth',
        'Absolute value functions and their graphs as transformations; square root and cube root functions at the course\'s level',
        'Systems of a linear and a quadratic equation solved graphically or by substitution',
      ],
      hard: [
        'A projectile item asking when the object lands (the positive zero) with the time to the maximum as a wrong option',
        'A vertex form from standard form by completing the square, with the sign of h wrong in a distractor',
        'An exponential decay item where the rate must be turned into a factor (a 12% decrease each year is 0.88)',
        'A quadratic whose equation must be written from two zeros and a point',
      ],
      traps: ['vertex x-coordinate with the wrong sign', 'the zeros of x² - 5x + 6 given as -2 and -3', 'a 12% decay written as 0.12', 'the time to the maximum read as the time to land'],
      exemplars: [
        `MC_QUESTION: The height, h, in feet, of a ball t seconds after it is thrown is modeled by h(t) = -16t² + 48t + 64. After how many seconds does the ball hit the ground?
A) 1.5
B) 2
C) 4
D) 64
Correct Answer: C
Explanation: Set h(t) = 0: -16(t² - 3t - 4) = -16(t - 4)(t + 1) = 0, so t = 4 (t = -1 is before the throw). Choice A is the time at the maximum height, and choice D is the starting height.`,
        `NUM_QUESTION: A car bought for $24,000 loses 15% of its value each year. To the nearest dollar, what is the value of the car after 3 years?
Answer: 14739
Explanation: The decay factor is 1 - 0.15 = 0.85, so the value is 24,000 × 0.85³ = 24,000 × 0.614125 = 14,739.`,
      ],
    },
    {
      id: 'number-sense',
      name: 'Number sense and operations (MA.912.NSO.1: exponents, radicals, scientific notation) and the calculator sections',
      share: 'about 5-10% of the test',
      detect: /\b(exponent\w*|rational exponent\w*|radical\w*|simplif\w+ (?:the )?(?:radical|square root)|irrational|scientific notation|real number\w*|rational (?:or|and) irrational|calculator)\b/i,
      skills: [
        'Rational exponents and radicals: rewriting between forms (x^(3/2) and √x³), simplifying radicals (√72 = 6√2), operations with radicals, rational vs irrational results (the sum of a rational and an irrational number)',
        'Integer exponent rules applied to algebraic expressions; scientific notation operations with a reasonable answer form',
        'Which section an item is in: no-calculator items keep numbers exact (radicals, fractions); calculator items may ask for decimals rounded',
      ],
      hard: [
        'A radical expression simplified where the wrong options stop one step early (√72 as 2√18)',
        'A rational exponent item converting (16x⁴)^(3/4)',
        'Classifying the product of two irrational numbers (√2 · √8 = 4 is rational)',
      ],
      traps: ['√72 left as 2√18', 'x^(1/2) · x^(1/2) as x^(1/4)', 'the product of two irrationals assumed irrational'],
      exemplars: [
        `MC_QUESTION: Which expression is equivalent to (16x⁴)^(3/4)?
A) 4x³
B) 8x³
C) 12x
D) 8x
Correct Answer: B
Explanation: 16^(3/4) = (⁴√16)³ = 2³ = 8 and (x⁴)^(3/4) = x³, giving 8x³. Choice A uses 16^(1/2) instead of 16^(3/4).`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix around Level 3 (passing), minus the one-step recall items. At most 1 item in 8 a single-step evaluate-or-solve item, never first in a section; about half typical Level 3 items (a system in context, a vertex from vertex form, a line from two points) and at least a third Level 4-5 items of the kind under WHAT HARD LOOKS LIKE (modeling items where the equation must be built, conditional frequencies, factoring with a leading coefficient, completing the square, exponential rates turned into factors).`,
    hard: `DIFFICULTY ON THIS TEST: Level 4 and 5 items. At least 4 of every 5 items must be ones a Level 3 student would miss: two-variable modeling with the answer being the less obvious unknown, average rate of change from a graph, absolute value inequalities with "or" solutions, quadratics in a context needing the right zero, exponential models built from a percent, two-way table conditionals. Hard never means content beyond Algebra 1 (no logarithms, no complex numbers).`,
    easier: `DIFFICULTY ON THIS TEST: Level 2-3 items, one skill each with clean numbers, in the test's voice. Still real test items.`,
  },
}
