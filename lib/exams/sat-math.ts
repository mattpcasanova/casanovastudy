// The digital SAT Math section as a reference for the guide prompts: how it
// writes items, what each content domain tests, what its hard questions look
// like, the traps its wrong answers are built from, and a few exemplar items
// in its voice (written here, not copied from the test). lib/exams/profiles.ts
// turns this into a prompt block when a request is about SAT Math.

import type { ExamProfile } from './types'

export const SAT_MATH: ExamProfile = {
  id: 'sat-math',
  name: 'the digital SAT Math section',
  detect: {
    exam: /\b(?:digital\s+)?(?:p?sat|sat\s*math|psat\s*(?:nmsqt|10|8\/9)?)\b/i,
    // Reading and Writing requests are a different profile (not built yet): leave them alone.
    exclude: /\b(reading|writing|grammar|vocab|rhetoric|punctuation|transitions|r&w|rw)\b/i,
    subjectHints: /\b(math|algebra|advanced math|problem[- ]solving|data analysis|geometry|trig|trigonometry|function|equation|linear|quadratic|exponential|ratio|percent|probability|statistics|circle|triangle)\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Two item types only: multiple choice with exactly four options A-D, and student-produced responses where the student types a number (NUM_QUESTION in the quiz format; a FILL blank with a numeric answer in practice; "num" in adaptive). About 1 in 4 items is a student-produced response.
- Never: true/false, "I, II and III" statement questions, "all/none of the above", questions that ask the student to explain or justify in words, matching, or more than four options.
- Student-produced response answers are a single number: an integer, a fraction like 7/2 or a decimal like 3.5 (give the exact value and its decimal form as alternates with |). Never units, a percent sign, or a variable. Fractions can be negative. If an item could have more than one correct value, the question must say "What is one possible value of x?"
- Stems are short and formal, mostly under 50 words, in the test's voice: "What is the value of x?", "Which equation defines line k?", "Which of the following is equivalent to the given expression?", "In the xy-plane, the graph of y = f(x) ...", "The function f is defined by f(x) = ...", "Which of the following is the best interpretation of the number 15 in this context?", "What is the solution (x, y) to the given system of equations?", "Based on the data, which conclusion is most appropriate?"
- About a third of items are in context (a science, social studies, business or everyday setting described in 1-3 sentences); the rest are pure math. Context sentences carry the information the student needs and nothing decorative.
- Data for a question is given in the stem: a table as one line per row (e.g. "Juniors: 45 prefer online, 75 prefer in person"), or a figure block (scatterplot, dot plot, histogram, bar graph, graph in the xy-plane) under the question line. A calculator is always available, so arithmetic is never the hard part.
- Every item stands alone: if two items use the same data, each item gives the data in full. Never "using the same data as above" or "for the survey in the previous question".
- Options are parallel and terse, in the test's register ("The mean of data set B is greater than the mean of data set A."), not a textbook's.
- Before writing an item's answer, solve it from the final numbers in the stem. If the numbers do not work out (the coefficients don't match, a root is not an integer when it should be, two options are both right), change the numbers until they do. Never leave a note, a "recheck" or a second attempt in the explanation: the student sees it.
- Explanations stay short; the full walkthrough is a tap away for the student.`,
  domains: [
    {
      id: 'algebra',
      name: 'Algebra',
      share: 'about 35% of the test',
      detect: /\b(algebra|linear|system of equations|systems|inequalit|slope|intercept|line k|lines)\b/i,
      skills: [
        'Linear equations in one variable, including ones with a constant k where the number of solutions depends on k',
        'Linear equations in two variables and linear functions: slope, intercepts, parallel and perpendicular lines, writing the equation from two points or from a context',
        'Systems of two linear equations: the solution (x, y), and the value of a constant that makes the system have no solution or infinitely many',
        'Linear inequalities in one or two variables, including which ordered pair satisfies a system of inequalities and interpreting a constraint in context',
        'Interpreting the slope or an intercept in a context ("the number 12 means ...")',
      ],
      hard: [
        'A constant in the system (k, a, c) and a question about when the system has no solution / infinitely many solutions / exactly one solution',
        'An equation that must be rearranged or an expression like 2x + 3 asked for instead of x, so solving for x is only the first step',
        'A linear model given in words with two quantities and one asked for after a change (after n months, when both are equal)',
        'Lines described by properties (perpendicular to, passes through, same y-intercept as) rather than equations',
      ],
      traps: ['the slope and the y-intercept swapped', 'answering x when the question asked for y or for 2x + 3', 'the sign of the slope of a perpendicular line', 'treating "no solution" and "infinitely many solutions" as the same condition', 'reading the rate as the starting value'],
      exemplars: [
        `MC_QUESTION: Line k in the xy-plane is defined by 3x + 5y = 12. Line j is perpendicular to line k and passes through the point (0, 4). Which equation defines line j?
A) y = (5/3)x + 4
B) y = (3/5)x + 4
C) y = -(3/5)x + 4
D) y = -(5/3)x + 4
Correct Answer: A`,
        `NUM_QUESTION: In the given system of equations, k is a constant. If the system has infinitely many solutions, what is the value of k?
2x - 7y = 9
kx - 21y = 27
Answer: 6`,
        `MC_QUESTION: A gym charges a one-time membership fee plus a fixed amount per month. The total cost after m months is given by C(m) = 45m + 120. Which of the following is the best interpretation of the number 45 in this context?
A) The one-time membership fee is $45.
B) The total cost for the first month is $45.
C) The cost increases by $45 for each additional month.
D) The membership lasts 45 months.
Correct Answer: C`,
      ],
    },
    {
      id: 'advanced',
      name: 'Advanced Math',
      share: 'about 35% of the test',
      detect: /\b(advanced math|quadratic|polynomial|nonlinear|exponential|radical|rational (?:expression|function)|absolute value|vertex|parabola|factor|discriminant|equivalent expression)\b/i,
      skills: [
        'Equivalent expressions: factoring, expanding, matching coefficients ("if (ax + 2)(bx + 7) = 12x² + cx + 14 for all x, what is the value of c?"), rewriting rational expressions',
        'Nonlinear equations in one variable: quadratics by factoring, the quadratic formula and the discriminant (exactly one real solution, no real solutions), radical and rational equations with extraneous solutions',
        'Systems of one linear and one nonlinear equation: solutions as intersection points, the number of intersections',
        'Nonlinear functions: quadratic (vertex, minimum or maximum, x-intercepts, axis of symmetry), exponential (growth or decay factor per period, "increases by 4% every 3 months"), polynomial zeros and end behavior, graphs and transformations f(x + 2), f(x) - 3',
        'Function notation and composition in context ("f(3) = ..., what is f(6)?")',
      ],
      hard: [
        'Match constants between two forms of the same expression, or find a constant from a condition (one real solution, the vertex lies on the x-axis)',
        'Interpret a constant in an exponential model where the exponent is t/5 or 2t (the percent change per period is not per year)',
        'A quadratic given in one form (factored, standard, vertex) and a question whose answer is easy in another form',
        'Equivalent rational expressions, or a radical/rational equation where one algebraic solution is extraneous',
        'How many times the graphs of a parabola and a line intersect, from a discriminant rather than a sketch',
      ],
      traps: ['the vertex x-coordinate instead of the minimum value (or the reverse)', 'the sign flipped in vertex form (h in (x - h)²)', 'the extraneous solution kept', 'reading the base 1.06 as 6% per year when the exponent is t/5', 'only one of two solutions', 'the y-intercept of f(x) = a(x - 2)(x + 5) read as a instead of -10a'],
      exemplars: [
        `MC_QUESTION: The function f is defined by f(x) = (x - 4)² - 9. In the xy-plane, the graph of y = f(x) crosses the x-axis at two points. What is the distance between these two points?
A) 3
B) 6
C) 7
D) 9
Correct Answer: B`,
        `NUM_QUESTION: In the equation x² + 10x + c = 0, c is a constant. If the equation has exactly one real solution, what is the value of c?
Answer: 25`,
        `MC_QUESTION: The function P is defined by P(t) = 4,200(1.06)^(t/5), where P(t) is the estimated population of a town t years after 2010. Which of the following is the best interpretation of 1.06 in this context?
A) The population increases by 6% each year.
B) The population increases by 6% every 5 years.
C) The population increases by 1.06 people each year.
D) The population in 2010 was 1.06 times its population in 2005.
Correct Answer: B`,
      ],
    },
    {
      id: 'psda',
      name: 'Problem-Solving and Data Analysis',
      share: 'about 15% of the test',
      detect: /\b(problem[- ]solving|data analysis|psda|ratio|rate|proportion|percent|unit conversion|mean|median|standard deviation|scatterplot|line of best fit|probability|two[- ]way table|margin of error|sample|survey|statistic|box plot|dot plot|histogram)\b/i,
      skills: [
        'Ratios, rates, proportional relationships and unit conversions, including multi-step rates (miles per gallon with a price per gallon, scale drawings, density)',
        'Percentages: percent of a percent, percent change, finding the original amount, a percent of a different base',
        'One-variable data: reading dot plots, histograms, bar graphs and frequency tables (box plots are rare on the digital test); mean, median, range, standard deviation; how an outlier or an added value changes the mean vs the median; comparing spreads of two distributions',
        'Two-variable data: scatterplots, the line of best fit and its slope/intercept in context, predicted vs actual values, linear vs exponential models from a table',
        'Probability and conditional probability from two-way tables and counts ("if a student who prefers online is chosen at random, what is the probability the student is a senior?")',
        'Inference from sample statistics and margin of error: what the interval means, which population it applies to, how sample size changes the margin',
        'Evaluating statistical claims: random sampling supports generalizing to the population; random assignment supports a cause-and-effect conclusion; what a study without one of them can and cannot conclude',
      ],
      hard: [
        'A conditional probability where the condition changes the denominator (a column total, not the grand total), from a table given in the stem',
        'Compare the mean and median, or two standard deviations, of distributions described by data or a plot, without calculating much: shape and outliers decide it',
        'A chain of percents (a 15% discount then 8% tax; x is 150% of y and y is 40% less than z) where adding the percents is the trap',
        'The right conclusion from a study design: which population a random sample of city R voters speaks for, whether a non-random assignment allows a causal claim',
        'Interpreting a number in a model built from data (the slope of the line of best fit in units, the predicted value at a point, the meaning of the y-intercept)',
        'A mean that changes when one value is added or removed: find the added value',
      ],
      traps: ['the grand total used as the denominator of a conditional probability', 'the percent change measured against the wrong base', 'margin of error applied to the sample instead of the population, or to a population that was not sampled', 'a causal conclusion from an observational study', 'confusing the mean and the median after an outlier', 'answering the number of items when the question asked for a percent (or the reverse)', 'reading the units of a rate backwards (gallons per mile)'],
      exemplars: [
        `MC_QUESTION: A survey asked 200 students at a school whether they prefer online or in-person classes. The results are shown.
Juniors: 45 prefer online, 75 prefer in person
Seniors: 30 prefer online, 50 prefer in person
If a student who prefers online classes is selected at random, what is the probability that the student is a senior?
A) 3/20
B) 3/8
C) 2/5
D) 3/5
Correct Answer: C`,
        `MC_QUESTION: Data set A consists of the values 5, 7, 8, 8, 9 and 11. Data set B consists of the values 5, 7, 8, 8, 9 and 40. Which of the following statements about the two data sets is true?
A) The means are equal, and the medians are equal.
B) The means are equal, and the median of data set B is greater than the median of data set A.
C) The medians are equal, and the mean of data set B is greater than the mean of data set A.
D) The medians are equal, and the mean of data set A is greater than the mean of data set B.
Correct Answer: C`,
        `NUM_QUESTION: The mean score of 20 students on a test was 82. After one more student took the test, the mean score of all 21 students was 83. What was the score of the 21st student?
Answer: 103`,
        `MC_QUESTION: A researcher selected a random sample of 400 registered voters in City R and found that 56% of the sample supported a ballot measure, with a margin of error of 4 percentage points. Which of the following is the most appropriate conclusion?
A) Exactly 56% of all registered voters in City R support the measure.
B) It is plausible that between 52% and 60% of all registered voters in City R support the measure.
C) Between 52% and 60% of all registered voters in the state support the measure.
D) Between 52% and 60% of the 400 voters in the sample support the measure.
Correct Answer: B`,
      ],
    },
    {
      id: 'geometry',
      name: 'Geometry and Trigonometry',
      share: 'about 15% of the test',
      detect: /\b(geometry|trig|trigonometry|triangle|circle|angle|area|volume|perimeter|arc|sector|radian|sine|cosine|tangent|pythagorean|similar)\b/i,
      skills: [
        'Area and volume: composite figures, a change in one dimension and its effect, volume of cylinders, cones, spheres and prisms (formulas are given on the test)',
        'Lines, angles and triangles: parallel lines with a transversal, angle sums, isosceles and equilateral triangles, similar triangles and proportional sides',
        'Right triangles and trigonometry: the Pythagorean theorem, special right triangles, sine, cosine and tangent as ratios, complementary angles (sin A = cos B), radians and degrees',
        'Circles: arc length and sector area, the equation of a circle in the xy-plane including completing the square, tangent lines, inscribed angles',
      ],
      hard: [
        'A trig ratio of one acute angle given and a ratio of the other (or of a similar triangle) asked, so the answer comes from the relationship, not from the numbers',
        'A circle in general form x² + y² + Dx + Ey + F = 0 where the center or radius requires completing the square',
        'Similar triangles inside a figure (a line parallel to one side) where the ratio must be set up from corresponding sides',
        'Area or volume asked after a scaling, or a dimension found from a given area and then used again',
        'Arc length or sector area with the angle in radians, or converting between them',
      ],
      traps: ['the adjacent and opposite sides swapped', 'the radius squared left as the radius (r² = 25 read as r = 25)', 'the diameter used as the radius', 'the ratio of areas taken as the ratio of sides', 'degrees and radians mixed', 'a sign error when completing the square'],
      exemplars: [
        `MC_QUESTION: In right triangle ABC, the right angle is at C, and sin A = 0.6. What is the value of cos B?
A) 0.6
B) 0.8
C) 0.75
D) 1.25
Correct Answer: A`,
        `NUM_QUESTION: A circle in the xy-plane has the equation x² + y² - 6x + 4y - 12 = 0. What is the radius of the circle?
Answer: 5`,
        `MC_QUESTION: In triangle ABC, AB = 5, BC = 12 and angle B is a right angle. What is the value of cos A?
A) 5/13
B) 12/13
C) 5/12
D) 12/5
Correct Answer: A`,
      ],
    },
  ],
  scoreRange: { min: 200, max: 800 },
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: practice for a student who is already past the basics. Skip the items nearly everyone gets (one idea, one step, "if 3x - 7 = 11, what is x?"): at most 1 item in 8 is that easy, and never the first item of a section. About half are typical test items (two steps, a familiar setup with one twist) and at least a third are the harder-module items described under WHAT HARD LOOKS LIKE. Order each section from typical to hard.`,
    hard: `DIFFICULTY ON THIS TEST: the student is working toward a top score, so write the items from the harder second module, the ones that separate 700 from 800. At least 4 of every 5 items must be ones a student scoring around 650-700 would get wrong: a parameter to reason about, an interpretation in context with a tempting near-miss option, a familiar idea in a form that needs rewriting first, a condition that changes the denominator or the base, a conclusion that depends on the study design, or two skills in one item. Nothing that is answered by one formula or one direct read of a plot. It never means bigger numbers, more arithmetic, obscure formulas or content the test does not cover. A well-prepared student should need 1-3 minutes per item, with a calculator.`,
    easier: `DIFFICULTY ON THIS TEST: the first-module items most students get right, one idea each, in the test's voice. Still real test items, not textbook drills.`,
  },
}
