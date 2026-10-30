// The AP Physics 2: Algebra-Based exam as a reference for the guide prompts
// (the 2024-25 framework, Units 9-15: thermodynamics, electric force and
// field, circuits, magnetism and electromagnetism, geometric and physical
// optics, modern physics). Section I multiple choice (four options, 40 items
// in 80 minutes, many on a described setup, a circuit, a graph or a data
// table) and Section II free response (mathematical routines, translation
// between representations, experimental design and analysis,
// qualitative/quantitative translation).

import type { ExamProfile } from './types'

export const AP_PHYSICS_2: ExamProfile = {
  id: 'ap-physics-2',
  pace: 120,
  name: 'the AP Physics 2: Algebra-Based exam',
  detect: {
    exam: /\bAP\s+Physics\s+2\b/i,
    subjectHints: /./,
    subjects: ['science', 'mathematics'],
    explicit: /\bAP\s+Physics\s+2\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly four options A-D, as on Section I. No true/false, no "I, II and III" lists. Most items are built on a setup described in 2-4 sentences (a gas in a cylinder with a piston, two charged spheres, a circuit of named resistors and a battery, a wire in a magnetic field, a lens with an object at a stated distance, light on a metal surface), often with a graph (P vs V, V vs I, intensity vs frequency), a circuit described element by element, a kind: table figure of data, or a field drawn as a kind: diagram or described in words. Items that share a setup each repeat it, so every item stands alone.
- The exam's item types: a qualitative question with the physics named in the options ("Which of the following best explains ...?" where each option names a principle and its consequence); a ranking task written as four ordered options ("Rank the bulbs from brightest to dimmest" with options like "A, B, C" / "B, A, C"); a symbolic answer where the options are expressions in the given symbols (q, d, k, ε₀, R, V, n, f, λ), parallel in form; a numeric item using the exam's rounding and constants (k = 9 × 10⁹ N·m²/C², e = 1.6 × 10⁻¹⁹ C, h = 6.63 × 10⁻³⁴ J·s, c = 3 × 10⁸ m/s), given in the stem.
- Wrong options come from the mistakes under WRONG ANSWERS ARE BUILT FROM: the inverse-square law applied as inverse, series and parallel rules swapped, the right-hand rule reversed, a sign error in the lens equation, energy and frequency confused for photons.
- Free-response items are SA_QUESTION, one per part, with the exam's task verbs: "Derive an expression for ... in terms of ...", "Sketch/Describe the graph of ... and explain its shape", "Justify your answer using physical principles (not equations alone)", "Describe an experimental procedure ... including what is measured, with what, and how the data would be analyzed to find ...", "Make a claim ... and support it with evidence and reasoning", "In a clear, coherent paragraph, explain ...".
- The Sample Answer for an SA_QUESTION is the scoring guideline: the statement or step that earns each point, e.g. "1 point: applies conservation of energy to the gas (first law, ΔU = Q + W); 1 point: identifies that work is done on the gas because the volume decreases; 1 point: concludes the temperature rises because ΔU is positive".
- A numeric calculation as a free-response part may be NUM_QUESTION (one number, units omitted; at most one in six items).
- Justifications are in terms of principles (conservation of energy and charge, Coulomb's law and superposition, Kirchhoff's rules, Faraday's and Lenz's laws, Snell's law, the photon model), never "because the formula says so"; a qualitative item must be answerable without a calculator.
- Before writing an item's answer, work it from the setup and check that exactly one option (or one sample answer) is right, by a second method where possible (energy and circuit rules; the lens equation and a ray description). If the numbers or symbols do not work out, change the setup. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the principle, and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'thermo-electrostatics',
      name: 'Thermodynamics; Electric Force, Field and Potential (Units 9-10)',
      share: 'about 30-35% of the test',
      detect: /\b(unit (?:9|10)\b|thermodynamic\w*|thermal energy|temperature|heat\b|heat transfer|conduction|convection|radiation|ideal gas|pv\s*=\s*nrt|kinetic theory|pressure|piston|isothermal|adiabatic|isobaric|isochoric|first law|second law|entropy|pv diagram|internal energy|specific heat|electric (?:force|field|potential|charge)\w*|coulomb\w*|point charge\w*|electrostatic\w*|conductor\w*|insulator\w*|induction|polarization|equipotential|potential difference|voltage|capacitor\w*|capacitance|dielectric\w*|parallel[- ]plate)\b/i,
      skills: [
        'Unit 9: thermal energy and temperature, kinetic theory and the ideal gas law, heat transfer (conduction, convection, radiation), the first law in the exam\'s sign convention (ΔU = Q + W, W positive when work is done on the gas), PV diagrams and the processes (isothermal, isobaric, isochoric, adiabatic), work as the area under a PV curve, the second law and entropy, specific heat and thermal equilibrium',
        'Unit 10: charge and charging by friction, contact and induction, conductors and insulators, Coulomb\'s law and superposition, electric field of point charges and between parallel plates, field lines, electric potential and potential energy, equipotential surfaces, potential difference and the motion of charges, capacitors (C = ε₀A/d, Q = CV, stored energy), dielectrics',
      ],
      hard: [
        'A PV cycle described by its vertices where the net work is the enclosed area and its sign depends on the direction around the loop',
        'An adiabatic compression item: no heat flows, yet the temperature rises, justified by the first law',
        'Two point charges where the field is zero at a point outside the pair, on the side of the smaller charge',
        'Potential vs field kept apart: a point where V = 0 but E ≠ 0 between opposite charges',
        'A capacitor disconnected from the battery (charge fixed) vs still connected (voltage fixed) as the plates are pulled apart',
      ],
      traps: ['Coulomb\'s law applied as inverse instead of inverse-square', 'W taken as positive when the gas expands in the exam\'s convention', 'V = 0 read as E = 0', 'the capacitor\'s charge assumed to change while it stays connected to nothing', 'temperature and heat used as the same quantity'],
      exemplars: [
        `MC_QUESTION: A sealed cylinder of ideal gas is compressed quickly by a piston so that no heat is exchanged with the surroundings. Which of the following best describes what happens to the internal energy and temperature of the gas, and why?
A) Both decrease, because the gas does work on the piston.
B) Both increase, because work is done on the gas and no energy leaves as heat.
C) Both stay the same, because no heat enters or leaves the gas.
D) The internal energy increases but the temperature stays the same, because the volume decreases.
Correct Answer: B
Explanation: By the first law, ΔU = Q + W with Q = 0 and W > 0 (work done on the gas), so ΔU > 0; for an ideal gas, internal energy depends only on temperature, so T rises. Option C confuses no heat flow with no energy change.`,
        `MC_QUESTION: Two point charges are fixed on the x-axis: +4q at x = 0 and +q at x = d. At which location is the net electric field equal to zero?
A) x = d/2
B) x = 2d/3
C) x = d/3
D) x = 2d
Correct Answer: B
Explanation: Between like charges the fields oppose; setting k(4q)/x² = kq/(d − x)² gives 2/x = 1/(d − x), so x = 2d/3, closer to the smaller charge. Option A treats the charges as equal.`,
      ],
    },
    {
      id: 'circuits-magnetism',
      name: 'Electric Circuits; Magnetism and Electromagnetism (Units 11-12)',
      share: 'about 30-35% of the test',
      detect: /\b(unit 1[12]\b|circuit\w*|resistor\w*|resistance|resistivity|ohm'?s law|ohm\w*|current|ammeter|voltmeter|battery|emf|internal resistance|kirchhoff\w*|junction rule|loop rule|series|parallel|light ?bulb\w*|brightness|power dissipated|rc circuit|time constant|magnet\w*|magnetic (?:field|force|flux)\w*|right[- ]hand rule|solenoid|current[- ]carrying wire|lorentz|mass spectrometer|velocity selector|faraday\w*|lenz\w*|electromagnetic induction|induced (?:emf|current)|motional emf|generator\w*|transformer\w*|electromagnet\w*)\b/i,
      skills: [
        'Unit 11: current, resistance and resistivity (R = ρL/A), Ohm\'s law and ohmic vs non-ohmic materials, series and parallel resistors, Kirchhoff\'s junction and loop rules, power (P = IV = I²R = V²/R), bulb brightness, batteries with internal resistance, ammeters and voltmeters, capacitors in circuits (steady state and RC charging qualitatively)',
        'Unit 12: magnetic fields of permanent magnets and current-carrying wires and solenoids, the force on a moving charge and on a current-carrying wire (right-hand rule), circular motion of a charge in a uniform field, magnetic flux, Faraday\'s law and Lenz\'s law, motional emf, generators and transformers qualitatively',
      ],
      hard: [
        'Bulb brightness when a switch adds a parallel branch: the total resistance falls, the battery current rises, and the series bulb gets brighter while the others dim',
        'A battery with internal resistance where the terminal voltage drops as the load resistance falls',
        'A charge entering a uniform magnetic field: the radius from qvB = mv²/r and why the speed does not change',
        'Lenz\'s law: the direction of induced current as a loop enters, is inside, and leaves a field region, with zero current while fully inside a uniform field',
        'Faraday\'s law from a flux vs time graph where the emf is the slope, largest where the flux changes fastest',
      ],
      traps: ['series and parallel rules swapped for resistors', 'brightness judged by resistance alone rather than power', 'the magnetic force said to change a charge\'s speed', 'the right-hand rule applied without flipping for a negative charge', 'induced current expected while the flux is constant'],
      exemplars: [
        `MC_QUESTION: Three identical light bulbs are connected to an ideal battery: bulb A is in series with the battery, and bulbs B and C are in parallel with each other, with the pair in series with A. Rank the bulbs from brightest to dimmest.
A) A, then B and C equally
B) B and C equally, then A
C) All three equally bright
D) A, then B, then C
Correct Answer: A
Explanation: The current through A splits equally between B and C, so each of those carries half the current; with P = I²R and equal resistances, A dissipates four times the power of B or C. Option B ranks by voltage across the parallel pair as if it exceeded A's.`,
        `MC_QUESTION: A rectangular loop of wire moves at constant velocity to the right, entering, passing through, and then leaving a region of uniform magnetic field directed into the page. Which of the following describes the induced current in the loop?
A) Counterclockwise while entering, zero while fully inside, clockwise while leaving
B) Clockwise the entire time the loop is in or near the field
C) Zero while entering and leaving, counterclockwise while fully inside
D) Counterclockwise while entering and while leaving, zero while fully inside
Correct Answer: A
Explanation: By Lenz's law the induced current opposes the change in flux: entering (flux into the page increasing) the current makes a field out of the page, counterclockwise; fully inside the flux is constant, so no current; leaving, the flux decreases and the current reverses. Option D forgets the reversal.`,
      ],
    },
    {
      id: 'optics',
      name: 'Geometric and Physical Optics (Unit 13)',
      share: 'about 15-20% of the test',
      detect: /\b(unit 13\b|optic\w*|light\b|wave\w*|wavelength|frequency|amplitude|period|electromagnetic (?:wave|spectrum)\w*|reflection|refraction|snell\w*|index of refraction|total internal reflection|critical angle|dispersion|prism|mirror\w*|lens\w*|converging|diverging|focal (?:length|point)|real image|virtual image|magnification|ray diagram|thin lens|interference|diffraction|double[- ]slit|single[- ]slit|thin film|polarization|polariz\w+|young'?s)\b/i,
      skills: [
        'Waves and the electromagnetic spectrum: wavelength, frequency, speed (v = fλ), amplitude and energy, what changes when light enters a new medium (speed and wavelength, not frequency)',
        'Geometric optics: the law of reflection, Snell\'s law, total internal reflection and the critical angle, dispersion, images in plane and curved mirrors and in converging and diverging lenses (ray diagrams described in words, the thin-lens equation 1/f = 1/dₒ + 1/dᵢ with the exam\'s sign convention, magnification m = −dᵢ/dₒ)',
        'Physical optics: double-slit interference (d sin θ = mλ, fringe spacing Δy ≈ λL/d), single-slit diffraction, thin-film interference qualitatively (phase changes on reflection), polarization',
      ],
      hard: [
        'The object inside the focal length of a converging lens: a virtual, upright, enlarged image, with the sign of dᵢ from the thin-lens equation',
        'Light from water into air at an angle past the critical angle: total internal reflection, no refracted ray',
        'Double-slit fringe spacing when the whole apparatus is submerged in water (the wavelength shrinks, the fringes move closer)',
        'Frequency unchanged across a boundary, used to decide what happens to wavelength and color',
        'A diverging lens item where the image is always virtual, upright and reduced whatever the object distance',
      ],
      traps: ['frequency said to change when light enters glass', 'a sign error in the thin-lens equation giving a real image for an object inside f', 'the critical angle applied going from low to high index', 'a wider slit expected to spread the diffraction pattern more', 'fringe spacing said to grow with slit separation'],
      exemplars: [
        `MC_QUESTION: An object is placed 10 cm from a converging lens of focal length 15 cm. Which of the following describes the image?
A) Real, inverted, 30 cm from the lens on the far side
B) Virtual, upright, 30 cm from the lens on the same side as the object
C) Real, inverted, 6 cm from the lens on the far side
D) Virtual, upright, 6 cm from the lens on the same side as the object
Correct Answer: B
Explanation: 1/dᵢ = 1/15 − 1/10 = (2 − 3)/30 = −1/30, so dᵢ = −30 cm: a virtual image on the object's side, upright with m = −(−30)/10 = +3. Option C comes from adding the reciprocals instead of subtracting.`,
        `MC_QUESTION: In a double-slit experiment with red light, bright fringes appear on a distant screen. The entire apparatus is then submerged in water (index of refraction 1.33) with the same light source. Which of the following best describes the change in the fringe pattern, and why?
A) The fringes move closer together, because the wavelength of the light in water is shorter.
B) The fringes move farther apart, because light travels more slowly in water.
C) The fringes move closer together, because the frequency of the light decreases in water.
D) The pattern does not change, because the frequency of the light is unchanged.
Correct Answer: A
Explanation: Fringe spacing is about λL/d, and in water the wavelength becomes λ/1.33 while the frequency stays the same, so the spacing shrinks. Option D is right about frequency but wrong about what sets the spacing.`,
      ],
    },
    {
      id: 'modern',
      name: 'Modern Physics (Units 14-15)',
      share: 'about 15-20% of the test',
      detect: /\b(unit 1[45]\b|modern physics|quantum\w*|photon\w*|photoelectric|work function|threshold frequency|stopping potential|planck\w*|de broglie|matter wave\w*|wave[- ]particle|compton|energy level\w*|atomic spectr\w+|emission spectr\w+|absorption spectr\w+|bohr|hydrogen atom|electron transition\w*|ionization|nucle\w+|nuclear|radioactiv\w+|alpha decay|beta decay|gamma|half[- ]life|mass[- ]energy|e\s*=\s*mc|binding energy|mass defect|fission|fusion|conservation of (?:charge|nucleon|baryon)\w*)\b/i,
      skills: [
        'Unit 14: the photon model and the photoelectric effect (E = hf, K_max = hf − φ, threshold frequency, stopping potential, why intensity changes the number of electrons but not their maximum energy), wave-particle duality and the de Broglie wavelength (λ = h/p), the Compton effect qualitatively, atomic energy levels and spectra (emission and absorption lines from transitions, E_photon = ΔE)',
        'Unit 15: nuclear structure, isotopes, radioactive decay (alpha, beta, gamma) with conservation of charge and nucleon number, half-life, mass-energy equivalence (E = mc²), mass defect and binding energy, fission and fusion',
      ],
      hard: [
        'A photoelectric graph of K_max vs frequency: the slope is h, the x-intercept the threshold frequency, the y-intercept −φ',
        'Doubling the light intensity below threshold: still no electrons, justified by the photon model',
        'An energy-level diagram where the longest-wavelength photon comes from the smallest transition, not the largest',
        'A beta-minus decay written out with the daughter nucleus one proton up and the same mass number',
        'De Broglie wavelength of an electron vs a proton at the same speed or the same kinetic energy',
      ],
      traps: ['brighter light expected to give faster photoelectrons', 'the biggest energy gap matched to the longest wavelength', 'mass number changed in beta decay', 'the de Broglie wavelength taken as proportional to momentum', 'half-life treated as the time for all nuclei to decay'],
      exemplars: [
        `MC_QUESTION: Light of a single frequency shines on a metal surface and ejects electrons. The intensity of the light is then doubled while the frequency is kept the same. Which of the following best describes the result?
A) The maximum kinetic energy of the ejected electrons doubles.
B) The number of ejected electrons per second doubles, but their maximum kinetic energy is unchanged.
C) The number of ejected electrons per second is unchanged, but their maximum kinetic energy increases.
D) Electrons are no longer ejected, because the metal's work function increases.
Correct Answer: B
Explanation: In the photon model each electron absorbs one photon of energy hf, so K_max = hf − φ depends on frequency alone; doubling the intensity doubles the number of photons and so the number of electrons. Option A is the wave-model prediction that the experiment rules out.`,
        `SA_QUESTION: A hydrogen atom has energy levels at −13.6 eV (n = 1), −3.4 eV (n = 2), −1.5 eV (n = 3) and −0.85 eV (n = 4). a) Identify the transition among these levels that emits the photon of longest wavelength. Justify your answer. b) Calculate the energy, in eV, of the photon emitted in a transition from n = 3 to n = 2.
Sample Answer: a) 1 point: n = 4 to n = 3 (ΔE = 0.65 eV); 1 point for the justification that photon wavelength is inversely related to photon energy (E = hc/λ), so the smallest energy gap between adjacent levels gives the longest wavelength. b) 1 point: E = (−1.5) − (−3.4) = 1.9 eV. An answer of 4.9 eV (adding the energies) or of 10.2 eV (the n = 2 to n = 1 gap) earns nothing.`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the plug-in items (one formula, numbers given). At most 1 item in 8 that easy, never first in a section; about half typical (one principle applied to a setup) and at least a third of the kind under WHAT HARD LOOKS LIKE. Free-response parts should need a justification in terms of principles.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 4 from a 5. At least 4 of every 5 items must be ones a student headed for a 3 would miss: PV cycles with signed work, zero-field points between unequal charges, circuits where adding a branch changes every bulb, Lenz's law through a field region, images inside the focal length, submerged interference, photoelectric graphs, and justifications where the principle must be named. Hard never means heavy algebra or content outside the course framework.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one principle each, in the exam's voice, with the setup stated plainly. Still real exam items.`,
  },
}
