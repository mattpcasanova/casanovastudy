// The Florida B.E.S.T. Geometry End-of-Course assessment as a reference for
// the guide prompts. Computer-based, untimed (no pace); item types are
// multiple choice, multiselect, equation response, graphic response and hot
// text. Here: four-option MC, NUM for equation response, with figures where
// the test shows a diagram. The four reporting categories are the domains.

import type { ExamProfile } from './types'

export const FL_GEOMETRY_EOC: ExamProfile = {
  id: 'fl-geometry-eoc',
  name: 'the Florida B.E.S.T. Geometry EOC',
  detect: {
    exam: /\bGeometry\b.*\bEOC\b|\bEOC\b.*\bGeometry\b|\bGeometry\s+(?:end[- ]of[- ]course|state (?:test|exam))\b/i,
    subjectHints: /./,
    subjects: ['mathematics'],
    explicit: /\bGeometry\b.*\bEOC\b|\bEOC\b.*\bGeometry\b|\bGeometry\s+(?:end[- ]of[- ]course|state (?:test|exam))\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly four options A-D, as on the computer-based test. Multiselect items are not written here: every item has one answer. Hot-text items (pick the statement or the step in a proof) become MC with the statements as the four options. No true/false, no "I, II and III" lists.
- Equation-response items are NUM_QUESTION: the student types a number (a length, an area, an angle measure, a coordinate, a scale factor). Give the unit in the stem ("Enter the area, in square centimeters") and the key as the exact value and its decimal ("Answer: 24 | 24.0"; irrational answers are asked rounded to the nearest tenth or left as "in terms of pi" with the coefficient typed).
- Whenever the real test would show a diagram, include one: a \`\`\`graph fence with kind: geometry (points, polygons, sides with lengths, angles with measures, right-angle marks, circles) or kind: plane for coordinate geometry, placed directly under the question line. Never ask about a figure described only in words when a figure can be drawn; never put the answer in the figure (leave the asked length or angle unlabeled).
- Stems are the test's: "Triangle ABC is shown. What is the value of x?", "Which statement must be true?", "Which transformation maps figure A onto figure B?", "A cylinder has a radius of 3 inches and a height of 10 inches. What is its volume, in cubic inches, in terms of pi?", "Which of the following is a step in the proof that ...", "Point P partitions segment AB in a 2:3 ratio. What are the coordinates of P?". Proof items give the statements and ask for the missing reason or statement, with the four reasons as options.
- The reference sheet is available (area, volume, circumference, distance and midpoint formulas, trig ratios), so items test choosing and applying a formula, not recalling it. Numbers are ones that work on a calculator or by hand: Pythagorean triples, 30-60-90 and 45-45-90 ratios, areas that come out whole.
- Solve every item from its final numbers before writing the key; if the numbers don't work, change the numbers, never leave a note. Wrong options are built from the mistakes under WRONG ANSWERS ARE BUILT FROM.
- Explanations stay short: the theorem or formula used, the computation, and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'logic-theorems',
      name: 'Logic, relationships and theorems (GR.1)',
      share: 'about 20-25% of the test',
      detect: /\b(proof\w*|theorem\w*|postulate\w*|conditional|converse|inverse|contrapositive|biconditional|counterexample|transversal|parallel lines|alternate interior|corresponding angles|same[- ]side|vertical angles|linear pair|supplementary|complementary|angle bisector|perpendicular bisector|triangle sum|exterior angle|polygon|interior angle|isosceles|congruen\w*|SSS|SAS|ASA|AAS|HL\b|CPCTC|midsegment|triangle inequality)\b/i,
      skills: [
        'Conditional statements and their converse, inverse and contrapositive; counterexamples; definitions used precisely (perpendicular bisector, midpoint, angle bisector)',
        'Angle relationships: vertical angles, linear pairs, and the angle pairs made by parallel lines cut by a transversal (alternate interior, corresponding, same-side interior) used to find x and to prove lines parallel',
        'Triangle theorems: angle sum, exterior angle, isosceles base angles, midsegment, triangle inequality; polygon interior and exterior angle sums',
        'Triangle congruence criteria (SSS, SAS, ASA, AAS, HL) and two-column or flowchart proofs that use them, with CPCTC',
      ],
      hard: [
        'A proof with one missing reason where two theorems look right and only one matches the statement',
        'Parallel-line angle items that need two steps (a linear pair, then alternate interior angles) with an algebraic expression on each angle',
        'Deciding which congruence criterion a diagram supports when a shared side or vertical angles supply the third piece',
        'Polygon angle items that give an exterior angle and ask for the number of sides',
      ],
      traps: ['the converse read as equivalent to the statement', 'same-side interior angles treated as congruent instead of supplementary', 'SSA used as a congruence criterion', 'the exterior angle theorem applied to the adjacent interior angle'],
      exemplars: [
        `MC_QUESTION: Lines m and n are parallel and are cut by a transversal, as shown. Which equation can be used to find the value of x?
\`\`\`graph
kind: geometry
point: A (0, 0)
point: B (8, 0)
point: C (0, 3)
point: D (8, 3)
point: E (1, -1)
point: F (6, 4)
point: P (2, 0)
point: Q (5, 3)
segment: A B
segment: C D
segment: E F
angle: Q P B | (5x - 30)°
angle: P Q D | (3x + 10)°
\`\`\`
A) 3x + 10 = 5x - 30
B) 3x + 10 + 5x - 30 = 180
C) 3x + 10 + 5x - 30 = 90
D) 5x - 30 = 180 - (3x + 10)
Correct Answer: B
Explanation: The marked angles are same-side interior angles, which are supplementary when the lines are parallel, so their measures add to 180. Choice A treats them as alternate interior angles, which would be congruent.`,
        `MC_QUESTION: In the proof below, which reason completes step 4?
\`\`\`passage
Given: M is the midpoint of segment AC and segment BD.
Prove: triangle AMB is congruent to triangle CMD.

1. M is the midpoint of AC and BD. (Given)
2. AM is congruent to CM; BM is congruent to DM. (Definition of midpoint)
3. Angle AMB is congruent to angle CMD. (Vertical angles are congruent)
4. Triangle AMB is congruent to triangle CMD. (?)
\`\`\`
A) SSS
B) SAS
C) ASA
D) HL
Correct Answer: B
Explanation: Two pairs of congruent sides with the included angle between them (the vertical angles at M) is SAS. ASA would need two angles.`,
      ],
    },
    {
      id: 'similarity-right-triangles',
      name: 'Congruence, similarity and right triangles (GR.2, T.1)',
      share: 'about 25-30% of the test',
      detect: /\b(transformation\w*|translation|reflection|rotation|dilation\w*|rigid motion|scale factor|similar\w*|AA\b|proportion\w*|trig\w*|sine|cosine|tangent|sin\b|cos\b|tan\b|angle of elevation|angle of depression|special right|30[- ]60[- ]90|45[- ]45[- ]90|pythagorean|hypotenuse|right triangle)\b/i,
      skills: [
        'Rigid motions (translations, reflections over axes and lines like y = x, rotations about the origin) written as coordinate rules, sequences of transformations that map one figure onto another, and congruence defined by rigid motions',
        'Dilations from a center with a scale factor, similarity (AA, SSS, SAS) and solving for a side with a proportion; the effect of a scale factor on perimeter (k) and area (k squared)',
        'Right-triangle trigonometry: choosing sine, cosine or tangent for a missing side or angle, angles of elevation and depression, and the relationship sin(A) = cos(90 - A)',
        'The Pythagorean theorem and its converse, and the 30-60-90 and 45-45-90 side ratios',
      ],
      hard: [
        'A sequence of two transformations where order matters (reflect then translate vs translate then reflect)',
        'A similarity item where the proportion must be set up between corresponding sides of overlapping triangles (a triangle inside a triangle)',
        'Trig in context where the given angle is at the top (angle of depression), so the student must decide which side is opposite',
        'Choosing between the Pythagorean theorem and a trig ratio when only one angle and one side are known',
      ],
      traps: ['a scale factor of 2 doubling the area', 'the angle of depression measured from the vertical', 'sine used where the known sides are adjacent and hypotenuse', 'the longer leg of a 30-60-90 triangle given the root-3 factor on the wrong side'],
      exemplars: [
        `NUM_QUESTION: A 24-foot ladder leans against a wall so that it makes a 65-degree angle with the ground. To the nearest tenth of a foot, how high up the wall does the ladder reach?
Answer: 21.8 | 21.75
Hint: The ladder is the hypotenuse and the height is opposite the 65-degree angle.
Explanation: The height is opposite the 65-degree angle and the ladder is the hypotenuse, so height = 24 sin(65°) = 24(0.9063) = 21.8 feet. Using cosine gives 10.1 feet, the distance from the wall.`,
        `MC_QUESTION: Triangle PQR has vertices P(1, 2), Q(4, 2) and R(1, 6). Triangle P'Q'R' has vertices P'(-1, -2), Q'(-4, -2) and R'(-1, -6). Which transformation maps triangle PQR onto triangle P'Q'R'?
A) A reflection over the x-axis
B) A reflection over the y-axis
C) A rotation of 180 degrees about the origin
D) A translation 2 units left and 4 units down
Correct Answer: C
Explanation: Every image point is (-x, -y), the rule for a 180-degree rotation about the origin. A reflection over one axis changes the sign of only one coordinate.`,
      ],
    },
    {
      id: 'coordinate-circles',
      name: 'Coordinate geometry and circles (GR.3, GR.6)',
      share: 'about 25-30% of the test',
      detect: /\b(coordinate\w*|distance formula|midpoint|partition\w*|slope\w*|perpendicular|equation of a (?:line|circle)|circle\w*|radius|radii|diameter|chord\w*|tangent\w*|secant\w*|arc\w*|inscribed|central angle|intercepted|sector|circumference|standard form|center)\b/i,
      skills: [
        'Distance, midpoint and partitioning a segment in a given ratio; classifying a quadrilateral or triangle from its coordinates using slopes and lengths',
        'Slopes of parallel (equal) and perpendicular (negative reciprocal) lines, and writing the equation of a line through a point parallel or perpendicular to a given line',
        'Equations of circles in standard form, completing the square to find the center and radius, and whether a point lies on, inside or outside a circle',
        'Circle theorems: a central angle equals its arc, an inscribed angle is half its intercepted arc, an angle inscribed in a semicircle is right, a tangent is perpendicular to the radius, tangent segments from a point are equal, chords and arcs; arc length and sector area as fractions of the circle',
      ],
      hard: [
        'Partitioning a segment in a 2:3 ratio from the endpoint the test did not start from',
        'Completing the square for a circle given as x² + y² + 6x - 4y - 12 = 0 and then testing a point',
        'A tangent-radius right triangle where the Pythagorean theorem gives the radius from the tangent length and the external distance',
        'Inscribed angles that intercept the same arc, or an inscribed quadrilateral whose opposite angles are supplementary',
      ],
      traps: ['the inscribed angle set equal to its arc', 'the radius read as the constant term in the circle equation (25 instead of 5)', 'a 2:3 partition placed at the midpoint', 'perpendicular slope made the reciprocal without the sign change'],
      exemplars: [
        `MC_QUESTION: A circle has the equation x² + y² - 6x + 4y - 12 = 0. What are the center and radius of the circle?
A) Center (3, -2), radius 5
B) Center (-3, 2), radius 5
C) Center (3, -2), radius 25
D) Center (-6, 4), radius 12
Correct Answer: A
Explanation: Completing the square gives (x - 3)² + (y + 2)² = 12 + 9 + 4 = 25, so the center is (3, -2) and the radius is the square root of 25, which is 5. Choice C forgets the square root.`,
        `NUM_QUESTION: Point A is at (-2, 1) and point B is at (8, 6). Point P lies on segment AB such that AP:PB = 2:3. What is the x-coordinate of point P?
Answer: 2 | 2.0
Hint: P is 2/5 of the way from A to B.
Explanation: P is 2/5 of the way from A to B, so x = -2 + (2/5)(8 - (-2)) = -2 + 4 = 2. (The y-coordinate is 1 + (2/5)(5) = 3.) Starting from B instead gives x = 4.`,
      ],
    },
    {
      id: 'measurement-3d',
      name: 'Measurement and three-dimensional figures (GR.4, GR.5)',
      share: 'about 20-25% of the test',
      detect: /\b(area|perimeter|volume|surface area|cylinder\w*|cone\w*|sphere\w*|prism\w*|pyramid\w*|composite|cross[- ]section\w*|density|population density|net\b|construct\w*|compass|straightedge|three[- ]dimensional|3D|lateral|slant height|rotat\w+ (?:a|the) (?:rectangle|triangle|semicircle))\b/i,
      skills: [
        'Area and perimeter of triangles, parallelograms, trapezoids, regular polygons and composite figures; circumference and area of circles and parts of circles',
        'Volume and surface area of prisms, cylinders, pyramids, cones and spheres from the reference sheet, including composite solids and solids with a part removed',
        'How changing dimensions changes area and volume (scale factor k gives k² and k³), density problems (mass per volume, population per area), and cross sections and solids of revolution',
        'Constructions with a compass and straightedge: what each step produces (perpendicular bisector, angle bisector, inscribed regular hexagon, tangent to a circle)',
      ],
      hard: [
        'A composite solid (a cylinder with a hemisphere on top) where one dimension is given as a diameter',
        'A density problem that requires converting units before dividing',
        'Working backward from a volume to a missing height or radius',
        'Identifying the construction from a description of arcs, where two constructions start the same way',
      ],
      traps: ['the diameter used as the radius', 'the slant height used as the height of a cone', 'doubling a dimension read as doubling the volume', 'surface area computed as the area of one face times the number of faces for a non-regular solid'],
      exemplars: [
        `NUM_QUESTION: A grain silo is shaped like a cylinder with a hemisphere on top. The cylinder has a diameter of 10 meters and a height of 12 meters. What is the volume of the silo, in cubic meters, in terms of pi? Enter the coefficient of pi.
Answer: 1150/3 | 383.33 | 383.3
Hint: The radius is 5 meters; the hemisphere is half a sphere.
Explanation: Cylinder: pi(5²)(12) = 300 pi. Hemisphere: (1/2)(4/3) pi (5³) = 250/3 pi. Total: 300 pi + 250/3 pi = 1150/3 pi, about 383.3 pi cubic meters. Using the diameter as the radius gives four times too much.`,
        `MC_QUESTION: A rectangle with a length of 6 inches and a width of 3 inches is rotated 360 degrees about its longer side. Which solid is formed, and what is its volume?
A) A cylinder with volume 54 pi cubic inches
B) A cylinder with volume 108 pi cubic inches
C) A cone with volume 18 pi cubic inches
D) A cylinder with volume 36 pi cubic inches
Correct Answer: A
Explanation: Rotating about the 6-inch side makes a cylinder with height 6 and radius 3, so V = pi(3²)(6) = 54 pi. Choice B rotates about the shorter side (radius 6, height 3).`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real spread across achievement levels, minus the Level 1-2 items (reading one value off a figure, one formula with the numbers given). At most 1 item in 8 that easy, never first in a section; about half at Level 3 (one theorem or formula applied in a familiar setup) and at least a third at Level 4-5 (two steps, a figure that must be read for the relationship first, an algebraic expression on each angle, working backward from a result).`,
    hard: `DIFFICULTY ON THIS TEST: Level 4-5 items. At least 4 of every 5 items must be ones a Level 3 student would miss: two-step angle items with expressions, proofs with a missing reason where two theorems look right, composite solids with a diameter given, partition items with a ratio, circles that need completing the square, trig in a context where the right side must be identified. Hard never means content outside the B.E.S.T. Geometry benchmarks.`,
    easier: `DIFFICULTY ON THIS TEST: the Level 2-3 items most students get right: one theorem or one reference-sheet formula, the figure labeled plainly, numbers that work. Still real test items in the test's voice.`,
  },
}
