// The Cambridge International AS & A Level Mathematics exam (9709; AICE
// Mathematics in Florida) as a reference for the guide prompts. No multiple-
// choice paper: Paper 1 Pure Mathematics 1, Papers 2 and 3 Pure Mathematics
// 2 and 3, Paper 4 Mechanics, Paper 5 Probability & Statistics 1 are all
// structured questions with the marks in brackets, marked M1/A1/B1.

import type { ExamProfile } from './types'
import { AICE_DIFFICULTY, AICE_ITEM_RULES } from './aice'

export const AICE_MATHEMATICS: ExamProfile = {
  id: 'aice-mathematics',
  name: 'the Cambridge AS & A Level Mathematics exam (AICE Mathematics, 9709)',
  detect: {
    exam: /\b(?:AICE|Cambridge|(?:AS|A)[- ]?Level)\s+(?:Pure\s+|Further\s+)?Math(?:ematic)?s?\b|\bMath(?:ematic)?s?\b.*\b(?:AICE|Cambridge|A[- ]?Level)\b/i,
    subjectHints: /./,
    subjects: ['mathematics'],
    explicit: /\b(?:AICE|Cambridge|(?:AS|A)[- ]?Level)\s+(?:Pure\s+|Further\s+)?Math(?:ematic)?s?\b|\bMath(?:ematic)?s?\b.*\b(?:AICE|Cambridge|A[- ]?Level)\b/i,
  },
  itemRules: AICE_ITEM_RULES('the Cambridge AS & A Level Mathematics exam', {
    mcq: false,
    structured: 'Every paper is structured questions: parts of 1-5 marks that build on each other ("Hence ..."), with a question worth 8-12 marks in all. A "Show that ..." part gives the answer, so the marks are for the method.',
    extra: [
      '- Every structured part ends with its marks in square brackets, in the papers\' own forms: "Find the coordinates of the stationary points of the curve. [4]", "Determine the nature of each stationary point. [2]", "Hence, or otherwise, solve ... [3]", "Show that ... [2]", "Find the exact value of ... [3]", "Express ... in the form ... where R > 0 and 0° < α < 90°. [3]", "Find the probability that ... [3]". Give answers to 3 significant figures, or in exact form where the part says "exact"; angles in degrees to 1 decimal place unless the part is in radians.',
      '- The Sample Answer is the mark scheme in Cambridge\'s codes: M1 for a correct method (differentiating, setting the derivative to zero, resolving forces, standardising), A1 for an accurate result that depends on the method mark, B1 for an independent correct statement, with the working shown line by line and the final answer stated. Say what loses a mark (an unsimplified answer when "exact" is asked, a missing unit, the second solution of a trigonometric equation omitted, a sign error in resolving).',
      '- Mechanics (Paper 4) takes g = 10 m s⁻², particles and strings are light and inextensible, pulleys smooth, planes rough or smooth as stated; every item says which. Resolve along and perpendicular to the plane, state Newton\'s second law for each particle separately, and name the model used.',
      '- Probability & Statistics 1 (Paper 5): the normal distribution is used through standardising and the table (Φ(z) values quoted to 4 decimal places, e.g. Φ(1.5) = 0.9332, z = 1.282 for 0.9, 1.645 for 0.95, 1.960 for 0.975), binomial probabilities computed from the formula with the combination shown, permutations and combinations distinguished by whether order matters.',
      '- NUM_QUESTION for a single-value answer the student types (up to a third of the items): the exact value or the 3 significant figure value, both listed as accepted answers ("Answer: 16/3 | 5.33"). MC quick checks are a minority with four options that are each a plausible slip (a sign error, a dropped factor, integer division, the wrong formula) rather than random numbers.',
      '- Numbers are chosen so that the method the paper allows works cleanly: factorisable quadratics, exact trigonometric values, cash values and masses that give whole or 1-decimal answers. Solve every item from its final numbers before writing its key.',
    ],
  }),
  domains: [
    {
      id: 'pure-1',
      name: 'Pure Mathematics 1 (Paper 1: quadratics, functions, coordinate geometry, circular measure, trigonometry, series, differentiation and integration)',
      share: 'all of Paper 1 (AS)',
      detect: /\b(paper 1|pure (?:math\w* )?1|p1\b|quadratic\w*|discriminant|completing the square|function\w*|inverse function|composite|domain|range|transformation\w*|coordinate geometry|gradient\w*|perpendicular|midpoint|circle\w*|radian\w*|arc length|sector\w*|segment\w*|trigonometr\w+|sin\w*|cos\w*|tan\w*|identit\w+|series|arithmetic progression|geometric progression|sum to infinity|binomial expansion|differentiat\w+|derivative\w*|tangent\w*|normal\w*|stationary|maximum|minimum|rate of change|integrat\w+|area under|volume of revolution)\b/i,
      skills: [
        'Quadratics: completing the square, the discriminant and the number of roots, quadratic inequalities, simultaneous equations of a line and a curve, disguised quadratics',
        'Functions: domain and range, composite and inverse functions (and the condition for an inverse to exist), transformations of graphs (translations, stretches, reflections) and their effect on f(x)',
        'Coordinate geometry: gradients, parallel and perpendicular lines, midpoints and lengths, the equation of a circle in centre-radius form and from the expanded form, tangents to circles',
        'Circular measure: radians, arc length s = rθ, sector area ½r²θ, segment areas by subtraction, perimeters of shaded regions',
        'Trigonometry: exact values, the graphs of sin, cos and tan, the identities tan θ = sin θ / cos θ and sin²θ + cos²θ = 1, solving equations in a given interval including those needing a substitution',
        'Series: binomial expansion of (a + bx)ⁿ for positive integer n and a specific coefficient, arithmetic and geometric progressions, the nth term and the sum, the sum to infinity when |r| < 1',
        'Differentiation: powers of x including fractional and negative, the chain rule for (ax + b)ⁿ, tangents and normals, increasing and decreasing functions, stationary points and their nature by the second derivative, connected rates of change',
        'Integration: as the reverse of differentiation including (ax + b)ⁿ, finding a curve from its gradient and a point, definite integrals, areas between a curve and the axes or two curves, volumes of revolution about the x- or y-axis',
      ],
      hard: [
        'An area between a line and a curve that needs the intersection points found first, with part of the region below the axis',
        'A sector question where the shaded region\'s perimeter mixes an arc with a chord found by the cosine rule or trigonometry',
        'A trigonometric equation that becomes a quadratic in sin θ or cos θ, with all solutions in the interval and the invalid root rejected',
        'A connected rate of change where the chain rule links dA/dt to dr/dt through dA/dr',
        'A geometric progression whose first term and ratio must be found from two given terms before the sum to infinity',
      ],
      traps: [
        'the sector angle used in degrees in ½r²θ',
        'a stationary point\'s nature decided from the value of y rather than the second derivative or gradient either side',
        'a definite integral giving a negative area read as the answer rather than its magnitude',
        'the constant of integration omitted when a curve is to be found from its gradient',
        'the second solution of sin θ = k in 0° to 360° dropped',
      ],
      exemplars: [
        `SA_QUESTION: The curve y = x³ - 6x² + 9x + 1 has two stationary points. Find the coordinates of the stationary points and determine the nature of each. [6]
Sample Answer: M1: differentiate: dy/dx = 3x² - 12x + 9. M1: set dy/dx = 0 and factorise: 3(x² - 4x + 3) = 3(x - 1)(x - 3) = 0, so x = 1 or x = 3. A1: both y-values: at x = 1, y = 1 - 6 + 9 + 1 = 5; at x = 3, y = 27 - 54 + 27 + 1 = 1, so the stationary points are (1, 5) and (3, 1). M1: d²y/dx² = 6x - 12. A1: at x = 1, d²y/dx² = -6 < 0, so (1, 5) is a maximum. A1: at x = 3, d²y/dx² = 6 > 0, so (3, 1) is a minimum. Also credited for the nature: the sign of dy/dx either side of each point. Loses a mark: a point given as an x-value only; the nature asserted with no test.`,
        `NUM_QUESTION: A sector OAB of a circle with centre O and radius 8 cm has angle AOB = 1.5 radians. Find the area of the sector, in cm².
Answer: 48 | 48.0
Explanation: Area = ½r²θ = ½ × 8² × 1.5 = ½ × 64 × 1.5 = 48 cm². Using 1.5 as degrees, or the arc length 12 cm in place of the area, are the usual slips.`,
        `MC_QUESTION: A geometric progression has first term 12 and common ratio ¼. What is the sum to infinity of the progression?
A) 16
B) 9
C) 48
D) 15
Correct Answer: A
Explanation: S∞ = a / (1 - r) = 12 / (1 - ¼) = 12 / ¾ = 16. Choice B uses 1 + r in the denominator; C divides by r itself.`,
        `NUM_QUESTION: Find the exact value of the area of the region bounded by the curve y = 4 - x², the x-axis and the y-axis, for x ≥ 0.
Answer: 16/3 | 5.33
Explanation: The curve meets the x-axis at x = 2 (for x ≥ 0). Area = ∫₀² (4 - x²) dx = [4x - x³/3]₀² = 8 - 8/3 = 16/3. Integrating to x = 4 (where y = 4 on the y-axis) or forgetting the ⅓ in x³/3 are the usual slips.`,
      ],
    },
    {
      id: 'pure-2-3',
      name: 'Pure Mathematics 2 and 3 (Papers 2 and 3: algebra, logarithms and exponentials, further trigonometry, further calculus, numerical methods, vectors, differential equations, complex numbers)',
      share: 'all of Paper 2 (AS) or Paper 3 (A Level)',
      detect: /\b(paper [23]|pure (?:2|3)|p[23]\b|modulus|\|x\||polynomial\w*|factor theorem|remainder theorem|division|logarithm\w*|ln\b|log\w*|exponential\w*|e\^|r ?sin|r ?cos|compound angle|double angle|sec\w*|cosec\w*|cot\w*|product rule|quotient rule|implicit|parametric|integration by parts|substitution|partial fractions|numerical|iteration|iterative|trapezium|newton[- ]raphson|vector\w*|scalar product|dot product|skew|differential equation\w*|separat\w+ the variables|complex number\w*|argand|modulus[- ]argument|imaginary)\b/i,
      skills: [
        'Algebra: the modulus function and equations and inequalities with |ax + b|, polynomial division, the factor and remainder theorems, partial fractions with linear, repeated and quadratic denominators',
        'Logarithms and exponentials: laws of logarithms, solving aˣ = b, equations reducible to quadratics in eˣ, using logarithms to linearise y = kxⁿ or y = abˣ from data',
        'Trigonometry: sec, cosec and cot and their identities, compound and double angle formulae, expressing a sin θ ± b cos θ as R sin(θ ± α) or R cos(θ ± α) and using it to solve equations and find maxima and minima',
        'Differentiation: eˣ, ln x, sin x, cos x, tan x; the product, quotient and chain rules; implicit and parametric differentiation and tangents to such curves',
        'Integration: eᵃˣ⁺ᵇ, 1/(ax + b), sin and cos, using trigonometric identities, by substitution, by parts, using partial fractions; areas and volumes with these functions',
        'Numerical methods: locating a root by a sign change, an iterative formula xₙ₊₁ = F(xₙ) and its convergence, the trapezium rule and whether it over- or under-estimates',
        'Vectors: position vectors, the vector equation of a line, whether two lines intersect, are parallel or are skew, the scalar product for the angle between lines and for perpendicularity, the perpendicular distance from a point to a line',
        'Differential equations: forming one from a rate of change, solving by separating the variables, the particular solution from a boundary condition',
        'Complex numbers: arithmetic, the conjugate, modulus and argument, the Argand diagram, square roots of a complex number, loci such as |z - a| = r and arg(z - a) = θ',
      ],
      hard: [
        'A differential equation whose right-hand side needs partial fractions before integrating, then rearranging to make y the subject',
        'Showing two lines are skew (not parallel and not intersecting) with the inconsistent third equation written out',
        'An integration by parts applied twice, or a substitution where the limits must be changed',
        'An R sin(θ + α) equation with two solutions in the interval where one candidate falls outside it',
        'A complex-number locus combining a circle and a half-line, with the region shaded on an Argand diagram',
      ],
      traps: [
        'the modulus inequality |x - 2| < 3 solved as a single inequality',
        'ln(a + b) read as ln a + ln b',
        'the parametric derivative dy/dx found as dx/dt ÷ dy/dt',
        'the limits of a definite integral kept in x after substituting for u',
        'the angle between skew lines reported as the obtuse angle from a negative scalar product',
      ],
      exemplars: [
        `SA_QUESTION: (a) Express 3 sin θ + 4 cos θ in the form R sin(θ + α), where R > 0 and 0° < α < 90°, giving the exact value of R and the value of α correct to 2 decimal places. [3]
(b) Hence solve the equation 3 sin θ + 4 cos θ = 2.5 for 0° ≤ θ ≤ 360°. [4]
Sample Answer: (a) M1: expand R sin(θ + α) = R sin θ cos α + R cos θ sin α and equate: R cos α = 3, R sin α = 4. A1: R = √(3² + 4²) = 5. A1: tan α = 4/3, α = 53.13°. (b) M1: 5 sin(θ + 53.13°) = 2.5, so sin(θ + 53.13°) = 0.5. A1: θ + 53.13° = 30° or 150° or 390°. M1: subtract 53.13° and keep the values in the interval (30° - 53.13° = -23.13° is rejected). A1: θ = 96.9° and θ = 336.9° (from 150° - 53.13° and 390° - 53.13°). Loses a mark: only 96.9° given; α rounded to 53.1° before use so that θ comes out as 96.9° by luck but 336.9° as 336.9° (accept) or outside tolerance.`,
        `NUM_QUESTION: Find the exact value of ∫₁ᵉ ln x dx.
Answer: 1 | 1.0
Explanation: By parts with u = ln x and dv = dx: ∫ ln x dx = x ln x - ∫ x · (1/x) dx = x ln x - x. Evaluating from 1 to e: (e · 1 - e) - (1 · 0 - 1) = 0 + 1 = 1. The slip is treating ∫ ln x dx as 1/x or as (ln x)²/2.`,
        `MC_QUESTION: The polynomial p(x) = 2x³ + ax² - 5x + 6 has (x - 2) as a factor. What is the value of the constant a?
A) -3
B) 3
C) -0.5
D) -12
Correct Answer: A
Explanation: By the factor theorem p(2) = 0: 2(8) + 4a - 10 + 6 = 12 + 4a = 0, so a = -3. Choice C comes from taking 2³ as 6; B from a sign slip in the last step.`,
        `SA_QUESTION: The lines l₁ and l₂ have equations r = i + 2j + 3k + s(2i - j + k) and r = 4i + 5k + t(i + j - 2k) respectively.
(a) Show that l₁ and l₂ do not intersect. [4]
(b) Find the acute angle between the directions of l₁ and l₂. [3]
Sample Answer: (a) M1: equate components: 1 + 2s = 4 + t, 2 - s = t, 3 + s = 5 - 2t. M1: solve two of them: substituting t = 2 - s into the first gives 1 + 2s = 6 - s, so s = 5/3 and t = 1/3. A1: check the third: 3 + 5/3 = 14/3 but 5 - 2/3 = 13/3, which differ. B1: the direction vectors (2, -1, 1) and (1, 1, -2) are not multiples of each other, so the lines are not parallel; with no common point they are skew and do not intersect. (b) M1: scalar product of the directions: 2(1) + (-1)(1) + 1(-2) = -1. M1: cos θ = -1 / (√6 × √6) = -1/6. A1: the acute angle is cos⁻¹(1/6) = 80.4°. Loses a mark in (a): the third equation not checked explicitly; in (b): 99.6° given as the answer.`,
      ],
    },
    {
      id: 'mechanics',
      name: 'Mechanics (Paper 4: forces and equilibrium, kinematics, Newton\'s laws, connected particles, friction, energy, work and power, momentum)',
      share: 'all of Paper 4',
      detect: /\b(paper 4|mechanic\w*|m1\b|force\w*|equilibrium|resultant|resolv\w+|component\w*|tension\w*|friction\w*|coefficient of friction|normal (?:reaction|contact)|incline\w*|slope\w*|rough|smooth|pulley\w*|connected particle\w*|string\w*|newton\w*|acceleration|velocity|displacement|kinematic\w*|velocity[- ]time|speed[- ]time|constant acceleration|suvat|work done|kinetic energy|potential energy|energy|power\b|momentum|collision\w*|impulse|lift\b)\b/i,
      skills: [
        'Forces and equilibrium: resolving in two perpendicular directions, the triangle of forces, resultant force by components, equilibrium of a particle on a rough or smooth inclined plane, limiting friction F = μR and the inequality F ≤ μR',
        'Kinematics in a straight line: displacement, velocity and acceleration; velocity-time and displacement-time graphs; the constant-acceleration formulae; motion under gravity; motion with variable acceleration using differentiation and integration (distance vs displacement)',
        'Newton\'s laws: F = ma for a single particle, connected particles with a string over a pulley or a tow bar, a particle in a lift, motion on an inclined plane with friction, the tension or thrust in a connecting rod',
        'Energy, work and power: work done by a constant force (including the component along the motion), kinetic and gravitational potential energy, the work-energy principle, power P = Fv, a vehicle driven at a given power against resistance, up or down a slope',
        'Momentum: conservation of momentum in a direct collision between two particles, coalescence, loss of kinetic energy in a collision',
      ],
      hard: [
        'A particle on a rough inclined plane where the direction of friction must be decided before resolving (about to slip up or down)',
        'Connected particles where one is on a rough table and the other hangs, the string then breaking and the motion continuing under gravity and friction',
        'A velocity found as a polynomial in t where the particle reverses direction, so the total distance is not the displacement',
        'A power question where the resistance is a function of speed or the car is on a slope so weight has a component along the road',
        'A work-energy question with friction doing negative work over a distance along a slope',
      ],
      traps: [
        'the normal reaction taken as mg on an inclined plane, or when a pulling force has a vertical component',
        'friction set to μR when the particle is at rest and not on the point of slipping',
        'total distance travelled read as the final displacement',
        'the tension treated as different on the two sides of a smooth pulley',
        'g taken as 9.8 or 9.81 on a Cambridge paper that uses 10',
      ],
      exemplars: [
        `SA_QUESTION: A particle P of mass 2 kg lies on a rough horizontal surface. The coefficient of friction between P and the surface is 0.3. A force of magnitude 10 N acting at an angle of 30° above the horizontal pulls P so that it moves along the surface. Find the acceleration of P. [5]
Sample Answer: M1: resolve vertically: R + 10 sin 30° = 2 × 10, so R = 20 - 5 = 15 N (A1). M1: friction is limiting as P moves: F = μR = 0.3 × 15 = 4.5 N. M1: Newton's second law horizontally: 10 cos 30° - 4.5 = 2a, so 8.66 - 4.5 = 2a. A1: a = 2.08 m s⁻². Loses a mark: R taken as 20 N (friction 6 N, a = 1.33); the vertical component added to the weight instead of subtracted; the answer not to 3 significant figures.`,
        `NUM_QUESTION: A car of mass 1200 kg travels along a horizontal road at a constant speed of 20 m s⁻¹. The total resistance to motion is 500 N. Find the power of the car's engine, in W.
Answer: 10000 | 10 000
Explanation: At constant speed the driving force equals the resistance, 500 N, so P = Fv = 500 × 20 = 10 000 W (10 kW). The mass is not needed; using 1200 × 10 as the force is the slip.`,
        `MC_QUESTION: A particle moves in a straight line so that its velocity at time t seconds is v = 3t² - 12t + 9 m s⁻¹, for t ≥ 0. What is the total distance travelled by the particle in the first 3 seconds?
A) 0 m
B) 4 m
C) 8 m
D) 9 m
Correct Answer: C
Explanation: v = 3(t - 1)(t - 3) is zero at t = 1 and t = 3, so the particle reverses at t = 1. Displacement s = t³ - 6t² + 9t gives s(1) = 4 and s(3) = 0, so it moves 4 m forward and 4 m back: total distance 8 m. Choice A is the displacement, not the distance.`,
        `SA_QUESTION: Particles A and B, of masses 3 kg and 2 kg respectively, are connected by a light inextensible string passing over a smooth fixed pulley. The particles hang vertically and the system is released from rest. Find the acceleration of the particles and the tension in the string. [5]
Sample Answer: M1: Newton's second law for A (downwards positive): 3 × 10 - T = 3a. M1: for B (upwards positive): T - 2 × 10 = 2a. M1: add the equations: 30 - 20 = 5a. A1: a = 2 m s⁻². A1: T = 20 + 2 × 2 = 24 N (or 30 - 3 × 2 = 24 N). Also credited: the system equation (3 - 2)g = (3 + 2)a for the first three marks, provided one particle's equation is then written for T. Loses a mark: g taken as 9.8 (a = 1.96, T = 23.5); the tension found as the weight of either particle.`,
      ],
    },
    {
      id: 'statistics-1',
      name: 'Probability & Statistics 1 (Paper 5: data representation, permutations and combinations, probability, discrete random variables, the binomial and geometric distributions, the normal distribution)',
      share: 'all of Paper 5',
      detect: /\b(paper 5|statistic\w*|s1\b|stem[- ]and[- ]leaf|box[- ]and[- ]whisker|box plot|histogram\w*|cumulative frequency|median|quartile\w*|interquartile|mean\b|standard deviation|variance|coded|permutation\w*|combination\w*|arrange\w*|select\w*|probability|conditional|independent event\w*|mutually exclusive|tree diagram|random variable\w*|probability distribution|expectation|expected value|e\(x\)|var\(x\)|binomial\w*|geometric distribution|normal distribution|normal\w* approximat\w+|standardi[sz]\w+|z[- ]value\w*|phi\b)\b/i,
      skills: [
        'Representation of data: stem-and-leaf diagrams, box-and-whisker plots, histograms with unequal widths (frequency density), cumulative frequency graphs for the median and quartiles, the mean and standard deviation from raw, grouped or coded data, comparing distributions in context',
        'Permutations and combinations: arrangements with repeated letters, with restrictions (together, apart, at the ends), selections with and without order, counting cases and adding them',
        'Probability: addition and multiplication rules, mutually exclusive and independent events, conditional probability P(A|B) = P(A ∩ B)/P(B), tree diagrams and tables, testing independence',
        'Discrete random variables: a probability distribution table, finding a constant so probabilities sum to 1, E(X) and Var(X) = E(X²) - [E(X)]²',
        'The binomial distribution B(n, p): conditions for its use, P(X = r) from the formula, P(X ≤ r) by adding terms, mean np and variance np(1 - p); the geometric distribution Geo(p): P(X = r) = p(1 - p)^(r-1), P(X > r) = (1 - p)^r, mean 1/p',
        'The normal distribution: standardising, Φ from the table, probabilities of intervals, finding a value from a given probability, finding μ or σ from two probabilities, the normal approximation to the binomial with a continuity correction when np > 5 and nq > 5',
      ],
      hard: [
        'Finding both μ and σ of a normal distribution from two given probabilities by solving simultaneous equations in z',
        'A conditional probability where the condition is "at least one" and the numerator needs a case count',
        'An arrangement with two different restrictions at once (two particular letters apart and a vowel at each end)',
        'A binomial question asking for P(X ≥ 3) from P(X ≤ 2) with the complement, and then a second-stage probability built on the first',
        'Comparing two distributions from box plots in the context given, using median and interquartile range, not just quoting them',
      ],
      traps: [
        'Var(X) computed as E(X²) without subtracting [E(X)]²',
        'permutations used when order does not matter',
        'P(X ≥ 3) read as 1 - P(X ≤ 3)',
        'standardising with the variance in place of the standard deviation',
        'the continuity correction omitted or applied in the wrong direction',
      ],
      exemplars: [
        `NUM_QUESTION: On average, 30% of the seeds of a certain plant fail to germinate. 10 seeds are planted. Find the probability that exactly 2 of the seeds fail to germinate, giving your answer correct to 3 significant figures.
Answer: 0.233 | 0.2335
Explanation: X ~ B(10, 0.3) and P(X = 2) = C(10, 2) × 0.3² × 0.7⁸ = 45 × 0.09 × 0.05765 = 0.2335, so 0.233. Omitting the combination gives 0.00519; using 0.7² × 0.3⁸ gives almost zero.`,
        `SA_QUESTION: The heights of adult men in a town are normally distributed with mean 170 cm and standard deviation 8 cm.
(a) Find the probability that a randomly chosen man is taller than 182 cm. [2]
(b) Find the height exceeded by the tallest 10% of men. [3]
Sample Answer: (a) M1: z = (182 - 170)/8 = 1.5. A1: P(X > 182) = 1 - Φ(1.5) = 1 - 0.9332 = 0.0668. (b) B1: the z-value with Φ(z) = 0.9 is 1.282. M1: standardise: (h - 170)/8 = 1.282. A1: h = 170 + 8 × 1.282 = 180.3 cm, so 180 cm (accept 180.2 to 180.3). Loses a mark: 0.9332 given as the answer to (a); in (b) z = 1.28 used without the table's 1.282 (accept if the final answer rounds to 180); the "top 10%" read as Φ(z) = 0.1, giving 159.7.`,
        `MC_QUESTION: How many different arrangements are there of the 6 letters of the word BANANA?
A) 60
B) 720
C) 120
D) 360
Correct Answer: A
Explanation: 6! / (3! × 2!) = 720 / 12 = 60, dividing by 3! for the three As and 2! for the two Ns. Choice B ignores the repeats; D divides by 2! only; C by 3! only.`,
        `SA_QUESTION: The random variable X takes the values 1, 2, 3 and 4, with P(X = x) = kx for each value.
(a) Find the value of k. [1]
(b) Find E(X). [2]
(c) Find Var(X). [2]
Sample Answer: (a) B1: k + 2k + 3k + 4k = 10k = 1, so k = 0.1. (b) M1: E(X) = Σ x P(X = x) = 1(0.1) + 2(0.2) + 3(0.3) + 4(0.4). A1: E(X) = 0.1 + 0.4 + 0.9 + 1.6 = 3. (c) M1: E(X²) = 1(0.1) + 4(0.2) + 9(0.3) + 16(0.4) = 0.1 + 0.8 + 2.7 + 6.4 = 10, then Var(X) = E(X²) - [E(X)]². A1: Var(X) = 10 - 9 = 1. Loses a mark: Var(X) given as 10 (the square of the mean not subtracted), or E(X) taken as the mean of the values, 2.5.`,
      ],
    },
  ],
  difficulty: AICE_DIFFICULTY,
}
