// The AP Precalculus exam as a reference for the guide prompts: Section I
// multiple choice (Part A, 28 items, no calculator; Part B, 12 items, graphing
// calculator) and Section II free response (four questions: function concepts,
// modeling a non-periodic context, modeling a periodic context, symbolic
// manipulations). Units 1-3 are tested; Unit 4 (parametric, vectors,
// matrices) is not on the exam.

import type { ExamProfile } from './types'

export const AP_PRECALC: ExamProfile = {
  id: 'ap-precalculus',
  pace: 180,
  name: 'the AP Precalculus exam',
  detect: {
    exam: /\bAP\s+Pre-?calc(?:ulus)?\b/i,
    subjectHints: /./,
    subjects: ['mathematics'],
    explicit: /\bAP\s+Pre-?calc(?:ulus)?\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly four options A-D, as on Section I. About two thirds should be Part A items (solvable by hand with no calculator: exact values, log and exponent properties, unit-circle values, rational function features) and the rest Part B items (a graphing calculator is expected: regression on a data table, a numerical solution, a value read from a model); say nothing about which part an item is from inside the item. No true/false, no "I, II and III" lists.
- Stems are the exam's: "The function f is given by f(x) = ... Which of the following ...?", "The table gives values of the function g for selected values of x. Which of the following could be ...?", "On which of the following intervals is the rate of change of f ... ?", "Which of the following is true about the graph of f?", "The graph of the function h is shown. Which of the following statements ...?", "A quantity is modeled by ... At what value of t ...?". Options are parallel: four intervals, four expressions, four statements about the graph.
- A NUM_QUESTION is used when the answer is a single value found by hand (a solution of a log equation, the number of solutions on an interval, a function value). Answers in exact form where the exam would (give the decimal too: "Answer: 4 | 4.0").
- Tables of values and graphs go in figure blocks: kind: table for a table of values (columns: x | f(x), one row per value) and kind: plane for a graph (plot: the function, window set so the features asked about are visible). Describe polar graphs in words in the stem unless the figure can be drawn as a plane.
- The exam's language for change: "rate of change", "average rate of change over the interval", "increasing at an increasing rate", "concave up/down", "end behavior", "the output values are proportional over equal-length input intervals" (exponential), "successive differences are constant" (linear) or "second differences are constant" (quadratic). Never use derivatives or integrals.
- Free-response items are SA_QUESTION, one per part, in the exam's four forms: function concepts (find a value or feature and give reasoning), modeling a non-periodic context (build a model from data, use it, interpret a value), modeling a periodic context (a sinusoidal model from a described situation: midline, amplitude, period, phase), and symbolic manipulations (solve an equation exactly, rewrite an expression). The Sample Answer is the scoring guideline: the value with its reasoning, the model with correct notation, and a note on what loses the point (a value with no reasoning, a decimal where an exact value is required, a model without the variable defined).
- Solve every item from its final numbers before writing the key and check that exactly one option is right; if the numbers do not work, change the function. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the key step and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'polynomial-rational',
      name: 'Unit 1: Polynomial and rational functions',
      share: 'about 30-40% of the test',
      detect: /\b(unit 1\b|polynomial\w*|rational function\w*|rate of change|average rate|concav\w+|end behavior|zero\w*|root\w*|multiplicity|factor\w*|asymptote\w*|hole\w*|removable|vertical asymptote|horizontal asymptote|slant|oblique|degree|leading (?:term|coefficient)|even function|odd function|inverse function|composition|transformation\w*|piecewise|binomial theorem|complex zero\w*|table of values|successive differences)\b/i,
      skills: [
        'Rates of change: average rate of change over an interval from a formula or a table, increasing/decreasing at an increasing/decreasing rate, concavity from how rates change, points of inflection as where the rate of change changes direction',
        'Polynomials: degree from a table (constant nth differences), zeros and their multiplicities (crossing vs touching), end behavior from the leading term, even and odd functions, local extrema between zeros, complex zeros in conjugate pairs',
        'Rational functions: vertical asymptotes vs holes from common factors, horizontal and slant asymptotes from degrees, zeros, end behavior, sign analysis',
        'Function model construction and transformations: translations, dilations, reflections; compositions and inverses; piecewise models; choosing a polynomial or rational model for a context',
      ],
      hard: [
        'A rational function with a common factor, where the question separates the hole from the vertical asymptote and gives the hole\'s y-coordinate',
        'Degree of a polynomial from a table of equally spaced values, with one option off by one',
        'Concavity and rate of change described in words ("increasing at a decreasing rate") matched to an interval of a graph or table',
        'End behavior stated as a limit in the exam\'s notation (as x increases without bound, f(x) ...) for a rational function with equal degrees',
      ],
      traps: ['a common factor read as a vertical asymptote', 'degree read from the number of zeros visible', 'concave down confused with decreasing', 'the horizontal asymptote read from the constant terms'],
      exemplars: [
        `MC_QUESTION: The function f is given by $$f(x) = \\dfrac{x^2 - 4}{x^2 - x - 2}$$. Which of the following is true about the graph of f?
A) The graph has a hole at x = 2 and a vertical asymptote at x = -1.
B) The graph has vertical asymptotes at x = 2 and x = -1.
C) The graph has a hole at x = -1 and a vertical asymptote at x = 2.
D) The graph has a horizontal asymptote at y = 0.
Correct Answer: A
Explanation: Factoring gives $$\\dfrac{(x-2)(x+2)}{(x-2)(x+1)}$$: the common factor x - 2 makes a hole at x = 2 (at y = 4/3), and x + 1 in the denominator alone makes the vertical asymptote at x = -1. Equal degrees put the horizontal asymptote at y = 1, not 0.`,
        `MC_QUESTION: The table gives values of the polynomial function g for selected values of x. Which of the following could be the degree of g?
\`\`\`graph
kind: table
columns: x | g(x)
row: -1 | 8
row: 0 | 3
row: 1 | 0
row: 2 | -1
row: 3 | 0
\`\`\`
A) 1
B) 2
C) 3
D) 4
Correct Answer: B
Explanation: Over equal steps of 1, the first differences are -5, -3, -1, 1 and the second differences are all 2. Constant second differences mean a quadratic, so the degree is 2. Choice C would need constant third differences with changing second differences.`,
      ],
    },
    {
      id: 'exponential-log',
      name: 'Unit 2: Exponential and logarithmic functions',
      share: 'about 27-40% of the test',
      detect: /\b(unit 2\b|exponential\w*|logarithm\w*|log\b|ln\b|natural log|base\b|growth|decay|half[- ]life|doubling|compound\w*|sequence\w*|arithmetic sequence|geometric sequence|common ratio|common difference|semi[- ]log|regression|residual\w*|data (?:set|table)|model\w* (?:the )?data|inverse|change of base|log properties|product property|quotient property|power property)\b/i,
      skills: [
        'Arithmetic and geometric sequences as linear and exponential functions with integer inputs; the general term from two terms',
        'Exponential functions: outputs proportional over equal-length input intervals, building a model from two points or a growth rate, half-life and doubling time, the constant base e, horizontal asymptotes and end behavior, transformations',
        'Logarithms as inverses of exponentials: log properties (product, quotient, power, change of base), solving exponential and logarithmic equations exactly, extraneous solutions from the domain, graphs of log functions and their vertical asymptotes',
        'Modeling with data: choosing linear, quadratic, exponential or logarithmic models from a table or a scatterplot, semi-log plots turning exponential data linear, regression (calculator) and residuals, interpreting model parameters in context',
      ],
      hard: [
        'A log equation whose algebra produces two candidates, one outside the domain',
        'An exponential model built from two non-adjacent data points, with the ratio found by a root',
        'A semi-log plot read for the base or growth factor of the underlying exponential',
        'Choosing a model from residual patterns or from how outputs change over equal input intervals, not from the shape alone',
      ],
      traps: ['log(a + b) split into log a + log b', 'an extraneous solution kept', 'a geometric sequence modeled with a linear function', 'the growth factor confused with the growth rate (1.08 vs 8%)'],
      exemplars: [
        `NUM_QUESTION: What is the solution to the equation $$\\log_2 x + \\log_2 (x - 2) = 3$$?
Answer: 4 | 4.0
Explanation: The product property gives $$\\log_2 \\big(x(x-2)\\big) = 3$$, so $$x^2 - 2x = 8$$ and (x - 4)(x + 2) = 0. Only x = 4 is in the domain, since log base 2 of a negative number is undefined, so x = -2 is extraneous.`,
        `MC_QUESTION: The function f is exponential, with f(0) = 20 and f(3) = 160. Which of the following could define f?
A) $$f(x) = 20 \\cdot 8^x$$
B) $$f(x) = 20 + \\dfrac{140}{3}x$$
C) $$f(x) = 20 \\cdot 2^x$$
D) $$f(x) = 20 \\cdot \\left(\\dfrac{8}{3}\\right)^x$$
Correct Answer: C
Explanation: An exponential function has the form $$a \\cdot b^x$$ with a = f(0) = 20, and f(3) = 160 gives $$b^3 = 8$$, so b = 2. Choice A uses the three-step ratio as the one-step ratio, and choice B is the linear model through the two points.`,
      ],
    },
    {
      id: 'trig-polar',
      name: 'Unit 3: Trigonometric and polar functions',
      share: 'about 30-35% of the test',
      detect: /\b(unit 3\b|trig\w*|sine|cosine|tangent|sin\b|cos\b|tan\b|secant|cosecant|cotangent|unit circle|radian\w*|periodic|period\b|amplitude|midline|phase shift|sinusoid\w*|inverse trig\w*|arcsin|arccos|arctan|trig(?:onometric)? equation\w*|identit\w+|Pythagorean identity|double[- ]angle|sum (?:and|or) difference|polar\w*|r =|theta|θ|rose curve|limaçon|limacon|cardioid)\b/i,
      skills: [
        'Periodic functions: period, midline, amplitude and phase from a graph, a table or a context; sinusoidal models of tides, temperature, Ferris wheels and seasons',
        'The unit circle and radian measure: exact values at special angles, sine and cosine as coordinates, tangent as slope, the Pythagorean identity, even/odd symmetry, sum/difference and double-angle identities',
        'Inverse trigonometric functions and their restricted ranges; solving trigonometric equations exactly on an interval and in general form; counting solutions',
        'Polar coordinates and polar functions: converting between polar and rectangular forms, graphs of circles, roses, limaçons and cardioids, where r is positive or negative, and how r changes with θ (rates of change in polar graphs)',
      ],
      hard: [
        'A sinusoidal model built from a context\'s high and low values and times, where two options share the right midline and amplitude but differ in phase or period',
        'A trigonometric equation that factors into two cases, counted on an interval',
        'A polar graph read for the intervals of θ where r is negative or decreasing',
        'An inverse trig value where the range restriction rules out the obvious angle',
      ],
      traps: ['period read as the coefficient of x instead of 2π over it', 'a cosine model written as sine with no phase shift', 'solutions outside the stated interval counted', 'arcsin of a value read as the angle in the wrong quadrant'],
      exemplars: [
        `MC_QUESTION: The temperature in a city over one day is modeled by a sinusoidal function of t, the number of hours since midnight. The high temperature of 86°F occurs at t = 15 (3 p.m.) and the low temperature of 62°F occurs at t = 3 (3 a.m.). Which of the following could be the model?
A) $$T(t) = 74 + 12\\sin\\left(\\dfrac{\\pi}{12}(t - 9)\\right)$$
B) $$T(t) = 74 + 12\\sin\\left(\\dfrac{\\pi}{24}(t - 9)\\right)$$
C) $$T(t) = 74 - 12\\sin\\left(\\dfrac{\\pi}{12}(t - 9)\\right)$$
D) $$T(t) = 74 + 12\\cos\\left(\\dfrac{\\pi}{12}(t - 3)\\right)$$
Correct Answer: A
Explanation: The midline is (86 + 62)/2 = 74, the amplitude is 12, and a 24-hour period gives $$\\dfrac{2\\pi}{24} = \\dfrac{\\pi}{12}$$. A sine that rises through the midline at t = 9 reaches its maximum at t = 15, so choice A gives T(15) = 86 and T(3) = 62. Choice B has a 48-hour period, choice C puts the minimum at t = 15, and choice D gives 86 at t = 3, the time of the low.`,
        `NUM_QUESTION: How many solutions does the equation $$2\\cos^2 x - \\cos x - 1 = 0$$ have on the interval $$0 \\le x < 2\\pi$$?
Answer: 3 | 3.0
Explanation: Factoring gives $$(2\\cos x + 1)(\\cos x - 1) = 0$$, so cos x = 1 at x = 0 and cos x = -1/2 at x = 2π/3 and 4π/3: three solutions. Counting x = 2π as well would double-count the solution at 0, which the interval excludes.`,
      ],
    },
    {
      id: 'free-response',
      name: 'Free response: function concepts, modeling a non-periodic context, modeling a periodic context, symbolic manipulations',
      share: 'Section II, about 37% of the score',
      detect: /\b(free[- ]response|FRQ\w*|section (?:II|2)|modeling|model\w* (?:a|the) (?:context|situation|data)|interpret\w*|justify|reasoning|symbolic|rewrite|exact (?:value|form)|calculator|Part [AB]\b|show (?:your )?work)\b/i,
      skills: [
        'FRQ 1, function concepts: features of a function given in several ways (formula, table, graph) with reasoning for each answer, average rate of change, inverse functions, domain restrictions',
        'FRQ 2, modeling a non-periodic context: a linear, quadratic, exponential or logarithmic model from a described situation or data (calculator regression allowed), used to predict a value, with units and interpretation in context, and whether the model is appropriate (residuals, domain)',
        'FRQ 3, modeling a periodic context: a sinusoidal model with midline, amplitude, period and phase from the described high and low values, used to find a value or a time, and a statement about the rate of change on an interval',
        'FRQ 4, symbolic manipulations: solve exponential, logarithmic and trigonometric equations exactly, rewrite expressions with identities and log properties, with correct notation and each step justified',
      ],
      hard: [
        'A part that asks for a value "with reasoning", where the reasoning (not the value) earns the point',
        'A model whose variable definitions and units must be stated for the point',
        'An exact solution of a trigonometric equation in general form, plus the count on a given interval',
        'A judgment about a model\'s fit from a residual plot or from the context\'s end behavior',
      ],
      traps: ['a decimal where the exam asks for an exact value', 'a model with no variable defined', 'a rate of change reported without its units', 'the inverse of a function found by swapping variables but not restricting the domain'],
      exemplars: [
        `SA_QUESTION: The function h is given by $$h(x) = \\dfrac{x^2 - 9}{x - 3}$$ for x ≠ 3. (i) Find the zeros of h. (ii) Describe the behavior of the graph of h near x = 3 and state whether the graph has a hole or a vertical asymptote there, with reasoning. (iii) Find the average rate of change of h over the interval [0, 2].
Sample Answer: (i) One point: $$h(x) = \\dfrac{(x-3)(x+3)}{x-3}$$, so the only zero is x = -3 (x = 3 is not in the domain, so it is not a zero). (ii) One point for hole with reasoning: the factor x - 3 cancels, so h(x) = x + 3 for x ≠ 3 and the output values approach 6 as x approaches 3 from either side; the graph has a hole at (3, 6), not an asymptote, because the outputs do not increase or decrease without bound. (iii) One point: h(0) = 3 and h(2) = 5, so the average rate of change is (5 - 3)/(2 - 0) = 1. A correct value with no reasoning in part (ii) earns no point there; stating "asymptote because the denominator is zero" earns nothing.`,
        `SA_QUESTION: A tank is drained so that the volume of water, in liters, t minutes after the drain opens is modeled by an exponential function V. The volume is 800 liters at t = 0 and 200 liters at t = 10. (i) Write an expression for V(t). (ii) Find the time at which the volume is 100 liters, with the exact value and a decimal approximation. (iii) Interpret the meaning of V(25) ≈ 25 in the context of the problem.
Sample Answer: (i) One point: $$V(t) = 800 \\left(\\dfrac{1}{4}\\right)^{t/10}$$ (equivalently $$800 \\cdot 2^{-t/5}$$), since the volume is multiplied by 1/4 every 10 minutes. (ii) One point: $$100 = 800 \\cdot 2^{-t/5}$$ gives $$2^{-t/5} = \\dfrac{1}{8} = 2^{-3}$$, so t = 15 minutes (exactly 15; a decimal alone without the exact value loses the point if the problem asks for both). (iii) One point: 25 minutes after the drain opens, about 25 liters of water remain in the tank. An interpretation without units or without reference to the time earns nothing.`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the one-step recall items (a unit-circle value, one log property). At most 1 item in 8 that easy, never first in a section; about half typical (one feature from one representation) and at least a third of the kind under WHAT HARD LOOKS LIKE (holes vs asymptotes, extraneous solutions, models from two points, phase and period both in play). Free-response parts should need reasoning, not just a value.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 4 from a 5. At least 4 of every 5 items must be ones a student headed for a 3 would miss: rational functions with a cancelling factor, log equations with an extraneous root, sinusoidal models where phase and period are both tested, polar graphs read for where r is negative, model selection from residuals or differences, and symbolic parts where the exact form or a domain restriction earns the point. Hard never means calculus or Unit 4 topics.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one feature or one property each, in the exam's voice, with the function given plainly. Still real exam items.`,
  },
}
