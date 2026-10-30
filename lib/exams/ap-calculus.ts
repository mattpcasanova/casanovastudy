// The AP Calculus AB and BC exams as a reference for the guide prompts:
// Section I multiple choice (four options; Part A no calculator, Part B
// calculator) and Section II free response (six questions, scored by points,
// with justifications that must cite the calculus). Units 1-8 are AB; Units
// 9-10 (parametric/polar/vector, series) are BC only.

import type { ExamProfile } from './types'

export const AP_CALCULUS: ExamProfile = {
  id: 'ap-calculus',
  pace: 140,
  name: 'the AP Calculus exam',
  detect: {
    exam: /\bAP\s+calc(?:ulus)?(?:\s+(?:AB|BC))?\b/i,
    subjectHints: /./,
    subjects: ['mathematics', 'math'],
    explicit: /\bAP\s+calc(?:ulus)?\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly four options A-D, as on Section I. No true/false, no "I, II and III" lists. Options are expressions or values in the exam's form (exact values with π, e, ln 2 and radicals in the no-calculator style; decimals to three places where a calculator item would give them), parallel in form; the wrong ones come from the mistakes under WRONG ANSWERS ARE BUILT FROM.
- Free-response items are SA_QUESTION, one per part, in the exam's voice: a function, a table of values, or a graph (as a figure block) with a context, then the part: "Find ... Show the work that leads to your answer.", "Is f increasing or decreasing at x = 2? Give a reason for your answer.", "Find the value of ... or explain why it does not exist.", "Using correct units, interpret the meaning of ... in the context of the problem.", "Write an equation for the line tangent to ...", "Find the absolute minimum value of f on the interval ... Justify your answer.", "Set up, but do not evaluate, an integral expression that gives ...".
- The Sample Answer for an SA_QUESTION is the scoring guideline: the points and what earns each, e.g. "1 point: f'(x) = 3x² - 12x; 1 point: f'(2) = -12 < 0, so f is decreasing at x = 2 (the reason must cite the sign of f'); 1 point: answer with units". Justifications must cite a derivative sign, a sign change, the Candidates Test, the Mean Value Theorem's hypotheses, or a theorem by name; "because the graph goes down" earns nothing.
- A calculation as a multiple-choice item has four options; NUM_QUESTION only for a free-response part whose answer is one number (give the exact value and a 3-decimal form as alternates with |); at most one in six items.
- Say which items are no-calculator and write them so the arithmetic is clean (nice factorizations, integrals that evaluate to simple exact values); calculator items may use a function that needs numerical solving ("the solution to f'(x) = 0 on (1, 3) is x = 1.826").
- Tables of values and graphs go in a figure block (kind: table; kind: plane with the plotted function or a piecewise linear graph given by points and segments). The item's numbers must match the key.
- Before writing an item's answer, work it from the function or data in the stem and check that exactly one option (or one sample answer) is right; verify by differentiating or integrating back. If the numbers do not work out, change the function. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the key step and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'limits-derivatives',
      name: 'Limits, Continuity and Derivatives (Units 1-3)',
      share: 'about 25-33% of the test',
      detect: /\b(unit [123]\b|limit\w*|continuit\w*|continuous|discontinuit\w*|asymptote|squeeze|intermediate value|IVT|derivative\w*|differentiab\w*|differentiation|tangent line|rate of change|product rule|quotient rule|chain rule|implicit|inverse function|trig derivative)\b/i,
      skills: [
        'Limits from graphs, tables and algebra (factoring, rationalizing, special trig limits), one-sided limits, limits at infinity and asymptotes, the squeeze theorem',
        'Continuity at a point and on an interval, types of discontinuity, the Intermediate Value Theorem and its hypotheses',
        'The derivative as a limit and as a rate of change; differentiability vs continuity; derivative rules (power, product, quotient, chain), derivatives of trig, exponential, logarithmic and inverse trig functions, implicit differentiation, derivatives of inverse functions, higher-order derivatives',
      ],
      hard: [
        'A piecewise function with a parameter chosen so the function is both continuous and differentiable at the join',
        'The chain rule inside a product or quotient, or a derivative read from a table of values of f, g, f\' and g\' at several points',
        'Implicit differentiation followed by the slope at a point, or where the tangent is horizontal or vertical',
        'The derivative of an inverse function at a point (1 / f\'(f⁻¹(a)))',
        'A limit that is the definition of a derivative in disguise (lim (f(2 + h) - f(2))/h)',
      ],
      traps: ['continuity assumed to give differentiability', 'the chain rule\'s inner derivative dropped', 'the quotient rule\'s numerator reversed', 'the derivative of an inverse computed at the wrong point', 'a limit evaluated by substitution where the form is 0/0'],
      exemplars: [
        `MC_QUESTION: Let f be the function defined by f(x) = x² + 2x for x ≤ 1 and f(x) = ax + b for x > 1, where a and b are constants. If f is differentiable at x = 1, what is the value of b?
A) -1
B) 1
C) 3
D) 4
Correct Answer: A
Explanation: Differentiability needs matching slopes: 2x + 2 = 4 at x = 1, so a = 4; continuity needs 1 + 2 = 4(1) + b, so b = -1. Answering 4 stops at a.`,
        `MC_QUESTION: The table gives values of the differentiable functions f and g and their derivatives at x = 2. If h(x) = f(x) · g(x), what is h'(2)?
\`\`\`graph
kind: table
columns: x | f(x) | f'(x) | g(x) | g'(x)
row: 2 | 3 | -1 | 5 | 4
\`\`\`
A) -4
B) 7
C) 12
D) 17
Correct Answer: B
Explanation: h'(2) = f'(2)g(2) + f(2)g'(2) = (-1)(5) + (3)(4) = 7. Multiplying the derivatives gives -4.`,
      ],
    },
    {
      id: 'applications',
      name: 'Applications of Differentiation (Units 4-5)',
      share: 'about 25-30% of the test',
      detect: /\b(unit [45]\b|related rates|linearization|linear approximation|l'h[oô]pital|motion|velocity|acceleration|speed|mean value theorem|MVT|extreme value|rolle|critical point|increasing|decreasing|concav\w*|inflection|first derivative test|second derivative test|candidates test|absolute (?:max|min)|optimization|particle)\b/i,
      skills: [
        'Rates of change in context with units; particle motion (position, velocity, acceleration, speed, when a particle changes direction or speeds up)',
        'Related rates and linear approximation; L\'Hôpital\'s rule for 0/0 and ∞/∞ forms',
        'The Mean Value Theorem and the Extreme Value Theorem with their hypotheses; critical points, intervals of increase and decrease, relative extrema (first and second derivative tests), concavity and points of inflection, absolute extrema on a closed interval (the Candidates Test), curve sketching from f\' graphs, optimization',
      ],
      hard: [
        'Reading the graph of f\' (not f): where f has a relative maximum, where f is concave up, where f has an inflection point',
        'A particle-motion item asking when the particle is speeding up (velocity and acceleration with the same sign)',
        'A related-rates problem where the relationship must be built from a figure (similar triangles, a cone) before differentiating',
        'An absolute-extremum justification that must compare the endpoint values with the critical-point values and say so',
        'A Mean Value Theorem item where the hypotheses fail on part of the interval',
      ],
      traps: ['the graph of f\' read as the graph of f', 'speed and velocity confused', 'a critical point called an extremum without a sign change', 'f\'\' = 0 called an inflection point without a concavity change', 'endpoints skipped in an absolute-extremum problem'],
      exemplars: [
        `MC_QUESTION: The graph of f', the derivative of f, is shown for -3 ≤ x ≤ 4. At which of the following values of x does f have a relative maximum?
\`\`\`graph
kind: plane
x: -3, 4
y: -3, 4
line: (-3, -2) (-1, 2) | f'
line: (-1, 2) (1, 0)
line: (1, 0) (2, -2)
line: (2, -2) (4, 2)
point: (-1, 2)
point: (1, 0)
point: (2, -2)
\`\`\`
A) x = -1
B) x = 1
C) x = 2
D) x = 3
Correct Answer: B
Explanation: f has a relative maximum where f' changes from positive to negative, which happens at x = 1 (f' crosses from above the axis to below). At x = -1, f' has its own maximum, which is an inflection point of f.`,
        `SA_QUESTION: A particle moves along the x-axis with velocity v(t) = t² - 4t + 3 for 0 ≤ t ≤ 5. Find all times in the interval 0 < t < 5 at which the particle changes direction, and give a reason for your answer. Then determine whether the particle is speeding up or slowing down at t = 2.5, and justify your answer.
Sample Answer: v(t) = (t - 1)(t - 3) = 0 at t = 1 and t = 3; v changes sign at both (positive to negative at t = 1, negative to positive at t = 3), so the particle changes direction at t = 1 and t = 3 (1 point for the times, 1 point for the sign-change reason). At t = 2.5: v(2.5) = 6.25 - 10 + 3 = -0.75 < 0 and a(t) = v'(t) = 2t - 4, so a(2.5) = 1 > 0; velocity and acceleration have opposite signs, so the particle is slowing down (1 point for the signs of v and a, 1 point for the conclusion with the reason).`,
      ],
    },
    {
      id: 'integration',
      name: 'Integration, Differential Equations and Applications of Integrals (Units 6-8)',
      share: 'about 35-42% of the test',
      detect: /\b(unit [678]\b|integral\w*|integrat\w*|riemann|trapezoid\w*|antiderivative|fundamental theorem|FTC|accumulation|u[- ]substitution|integration by parts|partial fractions|improper integral|differential equation|slope field|separable|exponential growth|logistic|euler|average value|area between|volume|disk|washer|cross section|arc length|net change|displacement|total distance)\b/i,
      skills: [
        'Riemann and trapezoidal sums from a table or graph (over- or underestimate from monotonicity or concavity), accumulation functions, both parts of the Fundamental Theorem of Calculus, antiderivatives and u-substitution (BC: integration by parts, partial fractions, improper integrals)',
        'Differential equations: slope fields, separation of variables with an initial condition, exponential growth and decay (BC: logistic growth, Euler\'s method)',
        'Applications: average value, net change and total distance from velocity, area between curves (in x or y), volumes of solids of revolution (disks and washers) and of solids with known cross sections (BC: arc length)',
      ],
      hard: [
        'The derivative of an accumulation function with a variable upper limit that is itself a function (chain rule inside the FTC)',
        'A Riemann sum from a table with unequal subintervals, and whether it over- or underestimates',
        'Separation of variables where the constant must be found from the initial condition after integrating, with an absolute value or a square root to resolve',
        'A washer volume where the region is bounded by two curves and revolved about a line other than an axis',
        'Total distance vs displacement when velocity changes sign on the interval',
      ],
      traps: ['the chain rule skipped in d/dx ∫₀^(x²) f(t) dt', '+C dropped before applying the initial condition', 'disks used where washers are needed', 'the integral of velocity reported as total distance', 'the trapezoidal sum called an underestimate for a concave-down function'],
      exemplars: [
        `MC_QUESTION: If g(x) = ∫₀^(x²) sin(t) dt, what is g'(x)?
A) sin(x²)
B) 2x sin(x²)
C) cos(x²)
D) -2x cos(x²)
Correct Answer: B
Explanation: By the Fundamental Theorem of Calculus and the chain rule, g'(x) = sin(x²) · d/dx(x²) = 2x sin(x²). Option A forgets the chain rule.`,
        `SA_QUESTION: Let R be the region in the first quadrant bounded by the graph of y = √x, the vertical line x = 4 and the x-axis. Find the volume of the solid generated when R is revolved about the x-axis. Show the setup.
Sample Answer: Disks with radius y = √x from x = 0 to x = 4: V = π ∫₀⁴ (√x)² dx = π ∫₀⁴ x dx (1 point for the integrand and limits, 1 point for the π and the disk form). = π [x²/2]₀⁴ = π(8) = 8π (1 point for the value). Using the radius without squaring, or revolving about the y-axis, are the common errors.`,
      ],
    },
    {
      id: 'bc',
      name: 'Parametric, Polar, Vector Functions and Series (Units 9-10, BC only)',
      share: 'about 28-35% of the BC test',
      detect: /\b(unit (?:9|10)\b|\bBC\b|parametric|polar|vector[- ]valued|series|sequence|convergen\w*|divergen\w*|taylor|maclaurin|power series|radius of convergence|interval of convergence|ratio test|alternating series|lagrange error|geometric series|p[- ]series|harmonic)\b/i,
      skills: [
        'Parametric and vector-valued functions: dy/dx and d²y/dx², speed and arc length, position from velocity; polar curves: area inside a curve or between curves, dr/dθ meanings',
        'Series: tests for convergence (nth-term, geometric, p-series, integral, comparison, ratio, alternating series), absolute vs conditional convergence, the alternating series error bound',
        'Taylor and Maclaurin series: building them from known series (eˣ, sin x, cos x, 1/(1 - x)), the radius and interval of convergence (endpoints checked), the Lagrange error bound, using a series to approximate a value or an integral',
      ],
      hard: [
        'The interval of convergence where both endpoints must be tested with different tests',
        'A Taylor polynomial built by substitution and multiplication from a known series, then its coefficient of a given power',
        'A polar area between two curves where the intersection angle must be found first',
        'An error bound item: which bound applies (alternating series vs Lagrange) and the value',
      ],
      traps: ['the nth-term test used to prove convergence', 'endpoints of the interval of convergence not checked', 'the polar area formula without the 1/2', 'speed computed as dy/dx', 'the Lagrange bound evaluated at the wrong point'],
      exemplars: [
        `MC_QUESTION: Which of the following is the interval of convergence of the series Σ (x - 2)ⁿ / (n · 3ⁿ) for n = 1 to ∞?
A) -1 < x < 5
B) -1 ≤ x < 5
C) -1 < x ≤ 5
D) -1 ≤ x ≤ 5
Correct Answer: B
Explanation: The ratio test gives |x - 2| < 3. At x = 5 the series is the harmonic series (diverges); at x = -1 it is the alternating harmonic series (converges). A skips the endpoints.`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the one-rule items (a power-rule derivative, a basic antiderivative). At most 1 item in 8 that easy, never first in a section; about half typical (one rule applied in a setup, one theorem used correctly) and at least a third of the kind under WHAT HARD LOOKS LIKE. Free-response parts should need a justification in the exam's form.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 4 from a 5. At least 4 of every 5 items must be ones a student headed for a 3 would miss: f' graphs read for f, the FTC with the chain rule, piecewise parameters, related rates from a figure, washers about a shifted line, total distance, endpoints of an interval of convergence, justifications where one missing phrase loses the point. Hard never means messy algebra or content outside the course framework.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one rule or one theorem each, in the exam's voice. Still real exam items.`,
  },
}
