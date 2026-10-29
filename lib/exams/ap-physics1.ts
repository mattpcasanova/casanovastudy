// The AP Physics 1 exam as a reference for the guide prompts (the 2024-25
// framework: Units 1-8 incl. fluids): Section I multiple choice (four
// options, many built on a described setup, a graph or a data table) and
// Section II free response (mathematical routines, experimental design,
// qualitative/quantitative translation, with justifications in terms of
// physical principles).

import type { ExamProfile } from './types'

export const AP_PHYSICS_1: ExamProfile = {
  id: 'ap-physics-1',
  name: 'the AP Physics 1 exam',
  detect: {
    // "AP Physics" or "AP Physics 1", never Physics 2 or Physics C (no profiles for those yet).
    exam: /\bAP\s+physics\b(?!\s*(?:2|C)\b)/i,
    subjectHints: /./,
    subjects: ['physics', 'science'],
    explicit: /\bAP\s+physics\b(?!\s*(?:2|C)\b)/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly four options A-D, as on Section I. No true/false, no "I, II and III" lists. Many items are built on a setup described in 2-4 sentences (a block on an incline, a cart on a track, two carts colliding, a pendulum, a ball thrown), often with a graph (velocity vs time, force vs position), a free-body diagram or a data table in a figure block. Items that share a setup each repeat it, so every item stands alone.
- Symbolic answers are common: options are expressions in the given symbols (m, M, θ, μ, v₀, R, g) in the exam's form, parallel in form; the wrong ones come from the mistakes under WRONG ANSWERS ARE BUILT FROM. Numeric items use the exam's rounding (g = 10 m/s² is acceptable when stated).
- Free-response items are SA_QUESTION, one per part, with the exam's task verbs: "Derive an expression for ... in terms of ...", "Draw/Describe the free-body diagram ...", "Justify your answer using physical principles (not equations alone)", "Describe an experimental procedure ... including what is measured and how the data would be analyzed", "Make a claim ... and support it with evidence and reasoning", "Sketch/Describe the graph of ...".
- The Sample Answer for an SA_QUESTION is the scoring guideline: the statement or step that earns each point, e.g. "1 point: applies Newton's second law to the system with the correct net force; 1 point: correct expression a = F/(m + M); 1 point: justification that the tension is less than F because the string accelerates only block B".
- A numeric calculation as a free-response part may be NUM_QUESTION (one number, units omitted; at most one in six items).
- Justifications are in terms of principles (Newton's laws, conservation of momentum or energy, the impulse-momentum theorem, torque and rotational inertia), never "because the formula says so"; a qualitative item must be answerable without a calculator.
- Before writing an item's answer, work it from the setup and check that exactly one option (or one sample answer) is right, by a second method where possible (energy and kinematics). If the numbers or symbols do not work out, change the setup. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the principle, and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'mechanics',
      name: 'Kinematics, Forces and Circular Motion (Units 1-3)',
      share: 'about 35-40% of the test',
      detect: /\b(unit [123]\b|kinematic\w*|projectile|free fall|velocity|acceleration|displacement|motion graph|newton|force|free[- ]body|normal force|friction|tension|incline|atwood|pulley|circular motion|centripetal|gravitation\w*|orbit|kepler)\b/i,
      skills: [
        'Kinematics in one and two dimensions: motion graphs (slope and area), the constant-acceleration equations, projectiles, relative motion',
        'Newton\'s laws: free-body diagrams, systems of objects (tension, normal force, friction, inclines, pulleys), Newton\'s third law pairs, the net force on a system vs on a part',
        'Circular motion and gravitation: centripetal acceleration and the force that provides it, banked and vertical circles, Newton\'s law of gravitation, orbital speed and period',
      ],
      hard: [
        'A system of two connected objects where the tension is less than the applied force, reasoned from the acceleration of the whole system',
        'A velocity vs time graph where displacement is the signed area and the object changes direction',
        'A vertical circle at the top: the normal force or tension can be zero, and the minimum speed follows',
        'A Newton\'s third law item where the "equal and opposite" forces act on different objects and must not be added',
        'An orbit item where doubling the radius changes speed by 1/√2 and period by 2√2',
      ],
      traps: ['the third-law pair added as a net force', 'centripetal force drawn as an extra force on the free-body diagram', 'the normal force assumed to equal mg on an incline or in an accelerating elevator', 'the area under a velocity graph taken as distance when velocity changes sign', 'friction always opposing motion of the system rather than relative motion'],
      exemplars: [
        `MC_QUESTION: Two blocks of masses m and 2m are connected by a light string on a frictionless horizontal surface. A horizontal force F pulls the block of mass 2m, as described, so both blocks accelerate together. What is the tension in the string?
A) F
B) 2F/3
C) F/3
D) F/2
Correct Answer: C
Explanation: The system of mass 3m has acceleration a = F/(3m); the string accelerates only the block of mass m, so T = ma = F/3. Option B is the net force on the 2m block, not the tension.`,
        `MC_QUESTION: A ball of mass m is swung in a vertical circle of radius R on a string. At the top of the circle the string is just barely taut (its tension is essentially zero). What is the speed of the ball at the top?
A) √(gR)
B) √(2gR)
C) gR
D) 2√(gR)
Correct Answer: A
Explanation: With no tension, gravity alone provides the centripetal force: mg = mv²/R, so v = √(gR). B is the speed gained in falling a height R, a different question.`,
      ],
    },
    {
      id: 'energy-momentum',
      name: 'Energy and Momentum (Units 4-5)',
      share: 'about 25-30% of the test',
      detect: /\b(unit [45]\b|energy|work|kinetic|potential|spring|conservation|power|momentum|impulse|collision|elastic|inelastic|center of mass|explosion|recoil)\b/i,
      skills: [
        'Work done by a force (including from a force vs position graph), kinetic energy, gravitational and spring potential energy, the work-energy theorem, conservation of mechanical energy with and without friction, power',
        'Impulse and momentum (including from a force vs time graph), conservation of momentum in one and two dimensions, elastic vs inelastic collisions (what is conserved in each), center of mass motion',
      ],
      hard: [
        'A collision item asking what fraction of kinetic energy is lost, or whether a collision is elastic, from the given masses and speeds',
        'Energy with friction on an incline where the work done by friction depends on the normal force on the slope',
        'A spring launching a block up a ramp: spring energy to gravitational energy plus friction',
        'An explosion or recoil item where momentum is conserved but kinetic energy is created',
        'A force vs position graph where the work is the area, including a negative region',
      ],
      traps: ['kinetic energy conserved in every collision', 'momentum not conserved because "friction acts"', 'spring potential energy written as kx instead of ½kx²', 'work done by gravity on an incline computed with the slope length instead of the height', 'the average force confused with the maximum force on an F vs t graph'],
      exemplars: [
        `MC_QUESTION: A cart of mass m moving at speed v collides with and sticks to an identical cart at rest on a frictionless track. What fraction of the initial kinetic energy is lost in the collision?
A) 0
B) 1/4
C) 1/2
D) 3/4
Correct Answer: C
Explanation: Momentum gives the combined speed v/2, so the final kinetic energy is ½(2m)(v/2)² = ¼mv², half of the initial ½mv². A assumes the collision is elastic.`,
        `SA_QUESTION: A block of mass m is pushed against a spring of spring constant k, compressing it a distance d, and released on a horizontal surface with coefficient of kinetic friction μ. Derive an expression for the distance x the block slides after leaving the spring before coming to rest, in terms of k, d, m, μ and g.
Sample Answer: Energy: the spring's stored energy ½kd² is dissipated by friction over the total distance (d + x) the block slides while friction acts, so ½kd² = μmg(d + x) (1 point for the energy equation with the friction work; 1 point for recognizing friction acts during the release distance d as well). Solving, x = kd²/(2μmg) - d (1 point for the expression). A response that writes ½kd² = μmgx ignores the friction during the release and earns the first point only.`,
      ],
    },
    {
      id: 'rotation-oscillation',
      name: 'Torque, Rotation, Energy and Momentum of Rotating Systems, Oscillations (Units 6-7)',
      share: 'about 20-25% of the test',
      detect: /\b(unit [67]\b|torque|rotation\w*|angular|moment of inertia|rotational inertia|lever arm|equilibrium|rolling|angular momentum|simple harmonic|SHM|oscillat\w*|pendulum|spring[- ]mass|period|frequency|amplitude)\b/i,
      skills: [
        'Torque and rotational equilibrium (lever arms, balanced beams), rotational kinematics, Newton\'s second law for rotation with rotational inertia, rolling without slipping',
        'Rotational kinetic energy and angular momentum, conservation of angular momentum (a skater pulling in her arms, a collision with a rod), the angular momentum of a point mass about a point',
        'Simple harmonic motion: period of a spring-mass system and a pendulum and what does not affect them (amplitude, mass for a pendulum), energy in SHM, position/velocity/acceleration graphs',
      ],
      hard: [
        'Two objects rolling down the same incline: the one with the smaller rotational inertia fraction wins, independent of mass and radius',
        'A rod or disk with a torque applied where the rotational inertia must be chosen for the right axis',
        'Angular momentum conserved when rotational inertia changes, and the kinetic energy increases (work done by the skater)',
        'Why the period of a pendulum is independent of mass but the period of a spring-mass system is not',
        'The phase relationship of x, v and a in SHM read from one graph',
      ],
      traps: ['torque computed with the full length instead of the lever arm', 'rolling objects assumed to finish together', 'kinetic energy assumed conserved when angular momentum is', 'the pendulum period changed by doubling the mass', 'maximum speed in SHM placed at maximum displacement'],
      exemplars: [
        `MC_QUESTION: A uniform solid sphere and a uniform hollow sphere of the same mass and radius are released from rest at the top of the same incline and roll without slipping. Which reaches the bottom first, and why?
A) The solid sphere, because a smaller fraction of its kinetic energy is rotational.
B) The hollow sphere, because its rotational inertia stores more energy.
C) They arrive together, because they have the same mass and radius.
D) They arrive together, because gravity does the same work on each.
Correct Answer: A
Explanation: Both lose the same potential energy, but the hollow sphere (I = ⅔MR²) puts more of it into rotation than the solid one (I = ⅖MR²), leaving less translational kinetic energy. D is true about the work but ignores how it is split.`,
      ],
    },
    {
      id: 'fluids',
      name: 'Fluids (Unit 8)',
      share: 'about 10-15% of the test',
      detect: /\b(unit 8\b|fluid\w*|density|pressure|buoyan\w*|archimedes|continuity equation|bernoulli|flow rate|hydrostatic|pascal)\b/i,
      skills: [
        'Density and pressure, pressure with depth in a static fluid, Pascal\'s principle',
        'Buoyancy and Archimedes\' principle: the buoyant force equals the weight of displaced fluid; floating vs submerged objects',
        'Fluid flow: the continuity equation and Bernoulli\'s equation, qualitative and quantitative',
      ],
      hard: [
        'A floating object where the fraction submerged equals the density ratio, then what changes when it is pushed under',
        'Bernoulli with a height difference and a speed difference at once',
        'The buoyant force on a fully submerged object that does not depend on its depth',
      ],
      traps: ['the buoyant force set equal to the object\'s weight for a sinking object', 'pressure depending on the container\'s shape', 'faster flow assumed to mean higher pressure'],
      exemplars: [
        `MC_QUESTION: A wooden block floats in water with 60% of its volume submerged. The block is then placed in a liquid of density 1.5 times that of water. What fraction of the block's volume is submerged in the new liquid?
A) 0.40
B) 0.60
C) 0.90
D) 0.30
Correct Answer: A
Explanation: Floating means the buoyant force equals the weight, so (fraction submerged) × (fluid density) is constant: 0.60 × 1 = f × 1.5 gives f = 0.40. C multiplies instead of dividing.`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the plug-in items (one formula, numbers given). At most 1 item in 8 that easy, never first in a section; about half typical (one principle applied to a setup) and at least a third of the kind under WHAT HARD LOOKS LIKE. Free-response parts should need a justification in terms of principles.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 4 from a 5. At least 4 of every 5 items must be ones a student headed for a 3 would miss: systems of objects, third-law pairs, vertical circles, energy with friction on slopes, collisions with energy fractions, rolling races, angular momentum with changing inertia, symbolic derivations, and justifications where the principle must be named. Hard never means heavy algebra or content outside the course framework.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one principle each, in the exam's voice, with the setup stated plainly. Still real exam items.`,
  },
}
