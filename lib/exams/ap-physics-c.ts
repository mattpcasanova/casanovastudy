// The AP Physics C exams (Mechanics; Electricity and Magnetism) as a
// reference for the guide prompts (the 2024-25 framework). Each exam:
// Section I multiple choice (four options, 40 items in 80 minutes, many on
// a described setup or graph, with calculus and symbolic answers) and
// Section II free response (derive an expression, sketch a graph, design
// and analyze an experiment, justify in terms of principles). One profile
// covers both: Mechanics Units 1-5 and E&M Units 8-14, grouped in four
// domains.

import type { ExamProfile } from './types'

export const AP_PHYSICS_C: ExamProfile = {
  id: 'ap-physics-c',
  pace: 120,
  name: 'the AP Physics C exams (Mechanics and Electricity and Magnetism)',
  detect: {
    exam: /\bAP\s+Physics\s+C\b/i,
    subjectHints: /./,
    subjects: ['science', 'mathematics'],
    explicit: /\bAP\s+Physics\s+C\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly four options A-D, as on Section I of each Physics C exam. No true/false, no "I, II and III" lists. Most items are built on a setup described in 2-4 sentences (a block on a rough incline, a particle whose position or velocity is a given function of time, a rod pivoted at one end, a ring of charge, a solenoid, an RC or LR circuit after a switch closes), often with a graph (a vs t, F vs x, V vs t for a charging capacitor), a kind: plane figure of a function, a free-body diagram or a kind: table of data. Items that share a setup each repeat it, so every item stands alone.
- Calculus is expected and should appear: velocity from x(t) by differentiating, work from a variable force by integrating F dx, the center of mass or rotational inertia of a continuous body by integration, the field of a charge distribution by integrating dE or by Gauss's law, potential from the field by integrating E dr, current in an RC or LR circuit from a differential equation. Items may give a function and ask for a derivative or integral, or give a differential equation and ask which function solves it.
- Symbolic answers dominate: the four options are expressions in the given symbols (m, M, L, R, θ, μ, k, b, Q, q, ε₀, μ₀, V, C, L, τ), parallel in form; the wrong ones come from the mistakes under WRONG ANSWERS ARE BUILT FROM (a factor of 2 or 1/2 dropped, a sign flipped, the wrong rotational inertia, the enclosed charge or current misread). Numeric items are rare and use the exam's rounding and given constants.
- Free-response items are SA_QUESTION, one per part, with the exam's task verbs: "Derive an expression for ... in terms of ... and physical constants", "Sketch/Describe the graph of ... from t = 0 to ..., and explain its shape", "Write, but do not solve, a differential equation for ...", "Justify your answer using physical principles", "Describe an experimental procedure ... including what is measured and how the data would be graphed so the slope gives ...", "Use the data to determine ... by graphing a linear relationship".
- The Sample Answer for an SA_QUESTION is the scoring guideline: the statement or step that earns each point, e.g. "1 point: applies Newton's second law along the incline with friction opposing motion; 1 point: writes the differential equation m dv/dt = mg sin θ − bv; 1 point: identifies the terminal speed by setting dv/dt = 0; 1 point: v_T = mg sin θ / b".
- A numeric calculation as a free-response part may be NUM_QUESTION (one number, units omitted; at most one in six items).
- Justifications are in terms of principles (Newton's laws, conservation of momentum, energy and angular momentum, Gauss's law and symmetry, Ampère's and Faraday's laws), never "because the formula says so"; a qualitative item must be answerable without a calculator.
- Before writing an item's answer, derive it from the setup and check that exactly one option (or one sample answer) is right, by a second method where possible (energy and dynamics; Gauss's law and direct integration) and by checking units and limiting cases. If the symbols do not work out, change the setup. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the principle or the key step, and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'mech-kinematics-dynamics-energy',
      name: 'Mechanics Units 1-3: Kinematics, Force and Translational Dynamics, Work, Energy and Power',
      share: 'about half of the Mechanics exam',
      detect: /\b(unit [123]\b|kinematic\w*|position function|velocity|acceleration|projectile|relative motion|newton\w*|force\w*|free[- ]body|friction|incline|tension|drag|air resistance|terminal (?:speed|velocity)|differential equation|circular motion|centripetal|center of mass|work\b|work[- ]energy|kinetic energy|potential energy|conservative|non[- ]conservative|power\b|spring|hooke\w*|energy diagram|variable force|f\s*=\s*-?dU\/dx)\b/i,
      skills: [
        'Unit 1: kinematics with calculus (v = dx/dt, a = dv/dt, x from ∫v dt), motion graphs, projectiles, relative motion, non-constant acceleration given as a function of time or velocity',
        'Unit 2: Newton\'s laws with systems of objects, friction, inclines, pulleys, circular motion, center of mass of systems and (by integration) of continuous bodies, drag forces proportional to v or v² and the differential equation they give, terminal velocity',
        'Unit 3: work by a variable force as ∫F dx, the work-energy theorem, conservative forces and potential energy functions (F = −dU/dx, equilibrium points from U(x) graphs), conservation of energy with and without friction, power (P = dW/dt = F·v)',
      ],
      hard: [
        'A velocity-dependent drag force: writing m dv/dt = mg − bv, finding the terminal speed from dv/dt = 0, and the shape of v(t)',
        'Center of mass of a rod whose linear density varies with position (λ = cx), by integration',
        'A U(x) graph where stable equilibria are the minima and the force is the negative slope, with a turning point read from the total energy',
        'Work from an F vs x graph where the force reverses sign, so the areas carry signs',
        'A circular-motion item at the bottom of a loop where the normal force exceeds mg by mv²/R',
      ],
      traps: ['average velocity computed as the mean of two velocities under non-constant acceleration', 'the center of mass of a non-uniform rod placed at its midpoint', 'F = +dU/dx', 'terminal speed found from the initial acceleration', 'work by friction taken as positive'],
      exemplars: [
        `MC_QUESTION: A particle of mass m is released from rest and falls under gravity while experiencing a drag force of magnitude bv, where v is its speed and b is a positive constant. Which of the following is the terminal speed of the particle?
A) mg/b
B) b/(mg)
C) √(mg/b)
D) 2mg/b
Correct Answer: A
Explanation: Newton's second law gives m dv/dt = mg − bv; at terminal speed dv/dt = 0, so v_T = mg/b. Option C is the terminal speed for drag proportional to v², and option D doubles it.`,
        `MC_QUESTION: A thin rod of length L lies along the x-axis from x = 0 to x = L. Its linear mass density is λ(x) = cx, where c is a positive constant. What is the x-coordinate of the rod's center of mass?
A) L/2
B) L/3
C) 2L/3
D) 3L/4
Correct Answer: C
Explanation: x_cm = ∫x λ dx / ∫λ dx = (cL³/3) / (cL²/2) = 2L/3, toward the heavier end. Option A is the uniform-rod answer, and option B comes from inverting the ratio.`,
      ],
    },
    {
      id: 'mech-momentum-rotation-oscillation',
      name: 'Mechanics Units 4-5: Linear Momentum, Torque and Rotational Dynamics, Oscillations and Gravitation',
      share: 'about half of the Mechanics exam',
      detect: /\b(unit [45]\b|momentum|impulse|collision\w*|elastic|inelastic|explosion|torque|rotational (?:inertia|dynamics|kinetic energy|equilibrium)|moment of inertia|parallel[- ]axis|angular (?:velocity|acceleration|momentum|speed)|rolling|slipping|pulley with mass|yo[- ]yo|pivot\w*|rod pivoted|physical pendulum|simple pendulum|oscillat\w+|simple harmonic|shm\b|spring[- ]mass|period|frequency|gravitation\w*|kepler\w*|orbit\w*|escape (?:speed|velocity)|gravitational potential energy|satellite\w*|universal gravitation)\b/i,
      skills: [
        'Unit 4: impulse as ∫F dt, conservation of linear momentum in collisions and explosions, elastic vs inelastic collisions in one and two dimensions, center-of-mass motion of a system',
        'Unit 5 (rotation): torque, rotational inertia of point masses and continuous bodies by integration (rod about end and center, disk, hoop, sphere given), the parallel-axis theorem, Newton\'s second law for rotation, rolling without slipping (v = ωR, energy split), angular momentum of particles and rigid bodies, conservation of angular momentum, rotational kinetic energy',
        'Unit 5 (oscillations and gravitation): simple harmonic motion from a restoring force (the differential equation d²x/dt² = −ω²x and its solution), spring-mass and pendulum periods, energy in SHM, physical pendulums, Newton\'s law of gravitation, gravitational potential energy U = −GMm/r, orbital speed, period and energy, escape speed, Kepler\'s laws',
      ],
      hard: [
        'A rod pivoted at one end released from horizontal: the angular acceleration from τ = Iα with I = ML²/3 and the end\'s linear acceleration 3g/2',
        'Rolling races down an incline decided by I/(MR²), with the friction force doing no work on a body that rolls without slipping',
        'A collision where a particle sticks to a rotating rod: linear momentum is not conserved (the pivot pushes) but angular momentum about the pivot is',
        'Writing the SHM differential equation from the forces and reading ω from it, then the period',
        'Orbital energy: total energy is −GMm/(2r), so a higher orbit has more total energy but a lower speed',
      ],
      traps: ['the rotational inertia of a rod about its end taken as ML²/12', 'friction said to do work on a rolling body', 'linear momentum conserved in a collision with a pivoted object', 'the pendulum period made to depend on mass or amplitude', 'kinetic energy conserved in a perfectly inelastic collision'],
      exemplars: [
        `MC_QUESTION: A uniform rod of mass M and length L is pivoted about a frictionless axis at one end and held horizontal. It is released from rest. What is the magnitude of the linear acceleration of the free end of the rod immediately after release? (The rotational inertia of a uniform rod about one end is ML²/3.)
A) g/2
B) g
C) 3g/2
D) 3g
Correct Answer: C
Explanation: The torque about the pivot is Mg(L/2), so α = τ/I = (MgL/2)/(ML²/3) = 3g/(2L), and the end's acceleration is αL = 3g/2, more than g because the pivot pulls down on the rod's near end. Option A uses I = ML² and option B assumes the rod falls like a free body.`,
        `SA_QUESTION: A block of mass m on a frictionless horizontal surface is attached to a spring of spring constant k. The block is displaced a distance A from equilibrium and released from rest. a) Write a differential equation for the position x of the block as a function of time, taking x = 0 at equilibrium. b) Derive an expression for the period of the motion. c) Describe how the period would change, if at all, if the block were released from a displacement 2A instead. Justify your answer.
Sample Answer: a) 1 point: applies Newton's second law with the spring force: m d²x/dt² = −kx (or d²x/dt² = −(k/m)x). b) 1 point: identifies the equation as simple harmonic motion with ω² = k/m; 1 point: T = 2π/ω = 2π√(m/k). c) 1 point: the period is unchanged, because T depends only on m and k, not on amplitude; the block moves faster through equilibrium but has farther to go. Stating "the period doubles" earns nothing.`,
      ],
    },
    {
      id: 'em-fields-potential-capacitors',
      name: 'E&M Units 8-10: Electric Charges, Fields and Gauss\'s Law; Electric Potential; Conductors, Capacitors and Dielectrics',
      share: 'about half of the E&M exam',
      detect: /\b(unit (?:8|9|10)\b|electric (?:charge|field|potential|flux|dipole)\w*|coulomb\w*|point charge\w*|charge distribution|line of charge|ring of charge|disk of charge|charged (?:sphere|shell|rod|ring|plane|cylinder)|gauss\w*|gaussian surface|flux|symmetry|potential difference|equipotential|potential energy of a charge|e\s*=\s*-?dV\/dr|conductor\w*|insulator\w*|electrostatic equilibrium|induced charge|capacitor\w*|capacitance|dielectric\w*|parallel[- ]plate|spherical capacitor|cylindrical capacitor|energy stored|energy density)\b/i,
      skills: [
        'Unit 8: Coulomb\'s law and superposition, the field of continuous distributions by integrating dE (a ring on its axis, a finite line), electric flux and Gauss\'s law for spherical, cylindrical and planar symmetry (a uniformly charged sphere or shell inside and out, an infinite line, an infinite sheet), fields inside and outside conductors',
        'Unit 9: electric potential of point charges and distributions, V from E by integrating (V_b − V_a = −∫E·dr) and E from V (E = −dV/dr), equipotentials, electric potential energy of a system of charges, the motion of charges through potential differences',
        'Unit 10: conductors in electrostatic equilibrium (field zero inside, charge on the surface, induced charges on cavities), capacitance of parallel-plate, cylindrical and spherical capacitors from Gauss\'s law, energy stored (½CV², ½Q²/C) and energy density, dielectrics (κ), capacitors connected to or disconnected from a battery when the geometry or dielectric changes',
      ],
      hard: [
        'The field inside a uniformly charged solid sphere (grows linearly with r) vs outside (falls as 1/r²), from Gauss\'s law with the enclosed charge as a fraction of the total',
        'A conducting shell around a point charge: the induced charges on the inner and outer surfaces, and the field in each region',
        'Potential at the center of a uniformly charged ring or shell, nonzero while the field there is zero',
        'A capacitor with a dielectric slab inserted while connected to a battery (V fixed, Q and energy rise) vs after disconnection (Q fixed, V and energy fall)',
        'V from E by integrating from infinity for a shell, with V constant inside',
      ],
      traps: ['the field inside a charged shell taken as nonzero', 'the enclosed charge for a Gaussian sphere inside a solid sphere taken as the total', 'V = 0 where E = 0, or E = 0 where V = 0', 'the energy stored said to rise when a dielectric is inserted into an isolated charged capacitor', 'E = +dV/dr'],
      exemplars: [
        `MC_QUESTION: A solid insulating sphere of radius R carries a total charge Q distributed uniformly throughout its volume. What is the magnitude of the electric field at a point a distance r from the center, where r < R?
A) kQ/r²
B) kQr/R³
C) kQ/R²
D) 0
Correct Answer: B
Explanation: A Gaussian sphere of radius r encloses Q(r³/R³), so E(4πr²) = Q r³/(ε₀R³), giving E = Qr/(4πε₀R³) = kQr/R³, growing linearly with r. Option A uses the total charge, and option D is the answer for a conducting sphere.`,
        `MC_QUESTION: An isolated parallel-plate capacitor is charged to a charge Q and then disconnected from the battery. A dielectric slab of constant κ is then inserted, filling the space between the plates. Which of the following describes the changes in the potential difference V across the plates and the energy U stored in the capacitor?
A) V increases by a factor of κ; U increases by a factor of κ
B) V decreases by a factor of κ; U decreases by a factor of κ
C) V is unchanged; U increases by a factor of κ
D) V decreases by a factor of κ; U is unchanged
Correct Answer: B
Explanation: With the battery disconnected, Q is fixed; C becomes κC, so V = Q/C falls to V/κ and U = Q²/(2C) falls to U/κ (the field pulls the slab in, doing work). Option C is the result when the capacitor stays connected to the battery.`,
      ],
    },
    {
      id: 'em-circuits-magnetism-induction',
      name: 'E&M Units 11-14: Electric Circuits; Magnetic Fields and Forces; Electromagnetism',
      share: 'about half of the E&M exam',
      detect: /\b(unit 1[1234]\b|circuit\w*|resistor\w*|resistance|resistivity|current density|drift velocity|ohm\w*|kirchhoff\w*|junction rule|loop rule|rc circuit|time constant|charging|discharging|emf|internal resistance|power dissipated|magnet\w*|magnetic (?:field|force|flux|dipole)\w*|biot[- ]savart|ampere\w*|ampère\w*|amperian|solenoid|toroid|current[- ]carrying|lorentz|cyclotron|velocity selector|mass spectrometer|hall effect|faraday\w*|lenz\w*|induced (?:emf|current)|motional emf|inductor\w*|inductance|lr circuit|rl circuit|lc circuit|maxwell\w*|displacement current|electromagnetic wave\w*)\b/i,
      skills: [
        'Unit 11: current and current density, resistance from resistivity (R = ρL/A, including a varying cross-section by integration), Kirchhoff\'s rules in multi-loop circuits, power, RC circuits (the differential equation, Q(t) and I(t) when charging and discharging, the time constant RC, behavior just after the switch closes and after a long time)',
        'Unit 12: the force on moving charges and currents, circular and helical motion in a uniform field, the Biot-Savart law (a straight wire, the center of a loop), Ampère\'s law for symmetric distributions (a long wire, a solenoid, a toroid, inside a thick wire), forces between parallel currents, magnetic dipoles and torque on a loop',
        'Units 13-14: magnetic flux, Faraday\'s law (ε = −dΦ/dt) and Lenz\'s law, motional emf and the force on a sliding bar, induced electric fields, self-inductance (a solenoid), LR circuits (the differential equation, I(t), the time constant L/R, the inductor as an open circuit at t = 0 and a wire at t = ∞), energy stored in an inductor, LC oscillations, Maxwell\'s equations and displacement current',
      ],
      hard: [
        'An RC circuit just after the switch closes (the capacitor acts like a wire) vs after a long time (an open branch), then the current through a resistor in parallel with the capacitor',
        'Ampère\'s law inside a thick wire with uniform current density: the enclosed current as a fraction, B growing linearly with r',
        'A sliding bar on rails in a magnetic field: the motional emf BLv, the current, the retarding force B²L²v/R and the differential equation for v',
        'An LR circuit: the current just after closing is zero (inductor opposes the change), the final current is ε/R, and the time constant L/R',
        'Faraday\'s law with a flux given as a function of time: the emf is the derivative, and Lenz\'s law gives its direction',
      ],
      traps: ['the capacitor treated as an open circuit at t = 0', 'the inductor treated as a wire at t = 0', 'the enclosed current for an Amperian loop inside a wire taken as the total', 'the magnetic force said to do work on a charge', 'the time constant of an LR circuit taken as RL'],
      exemplars: [
        `MC_QUESTION: A long straight wire of radius R carries a total current I distributed uniformly over its cross-section. What is the magnitude of the magnetic field at a distance r from the wire's axis, where r < R?
A) μ₀I/(2πr)
B) μ₀Ir/(2πR²)
C) μ₀I/(2πR)
D) 0
Correct Answer: B
Explanation: An Amperian circle of radius r encloses I(r²/R²), so B(2πr) = μ₀I r²/R² and B = μ₀Ir/(2πR²), rising linearly to the surface value. Option A is the field outside the wire, and option D is the field inside a hollow conductor.`,
        `SA_QUESTION: A circuit consists of a battery of emf ε, a resistor R, an inductor L and a switch, all in series. The switch is closed at time t = 0. a) Determine the current in the circuit immediately after the switch is closed. Justify your answer. b) Write a differential equation for the current I as a function of time. c) Derive an expression for the current a long time after the switch is closed. d) Describe the graph of I versus t from t = 0 to a long time.
Sample Answer: a) 1 point: I = 0, because the inductor opposes the change in current with an emf equal to the battery's at the instant of closing (L dI/dt = ε). b) 1 point: Kirchhoff's loop rule: ε − IR − L dI/dt = 0. c) 1 point: after a long time dI/dt = 0, so the inductor acts like a wire and I = ε/R. d) 1 point: the current starts at zero, rises with a decreasing slope and approaches ε/R asymptotically, reaching about 63% of it at t = L/R. A graph that starts at ε/R or rises linearly earns nothing for this part.`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the plug-in items (one formula, numbers given). At most 1 item in 8 that easy, never first in a section; about half typical (one principle applied to a setup, one derivative or integral) and at least a third of the kind under WHAT HARD LOOKS LIKE. Free-response parts should need a derivation or a justification in terms of principles.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 4 from a 5. At least 4 of every 5 items must be ones a student headed for a 3 would miss: drag with a differential equation, non-uniform bodies by integration, pivoted rods and rolling races, angular momentum with a pivot, Gauss's and Ampère's law inside distributions, capacitor changes connected vs disconnected, RC and LR circuits at t = 0 and t = ∞, motional emf with a retarding force, and derivations where a limiting case must be checked. Hard never means heavy algebra or content outside the course framework.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one principle each, in the exam's voice, with the setup stated plainly and any needed rotational inertia or integral given. Still real exam items.`,
  },
}
