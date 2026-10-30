// The AP Chemistry exam as a reference for the guide prompts: Section I
// multiple choice (four options, often in sets sharing a stimulus) and
// Section II free response (calculate / justify / explain / represent, scored
// by points). Units 1-9 grouped into four domains.

import type { ExamProfile } from './types'

export const AP_CHEMISTRY: ExamProfile = {
  id: 'ap-chemistry',
  pace: 90,
  name: 'the AP Chemistry exam',
  detect: {
    exam: /\bAP\s+chem(?:istry)?\b/i,
    subjectHints: /./,
    subjects: ['chemistry', 'science'],
    explicit: /\bAP\s+chem(?:istry)?\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly four options A-D, as on Section I. Many come in sets of 2-4 that share one stimulus (a data table, a graph, a particulate diagram described in words, a reaction with conditions); each item of a set repeats the stimulus in its own \`\`\`passage fence or figure block, so every item stands alone. No true/false, no "I, II and III" lists.
- Free-response items are SA_QUESTION, one per part, written as the exam writes them: the stimulus (a reaction, data table or experiment) in a passage fence or a table figure, then the part with its task verb: "Calculate ...", "Identify ... Justify your answer.", "Explain, in terms of ..., why ...", "Predict whether ... Justify your prediction.", "Draw/Describe the particulate representation ...", "Write the balanced net ionic equation ...". A justification must use the chemistry (IMF strength, Coulomb's law, equilibrium shift, entropy change), never "because the data show it".
- The Sample Answer for an SA_QUESTION is the scoring guideline: the specific statements and the numbers (with units and correct significant figures) that earn each point, e.g. "1 point: 0.025 mol; 1 point: states that the solution is more dilute so K is unchanged and Q < K, so the reaction shifts right." A calculation shows the setup and the result.
- A calculation as a multiple-choice item has four numeric options, as on Section I (the wrong ones from a skipped step, a wrong sign or a wrong factor). NUM_QUESTION is only for a free-response calculation part whose answer is one number (give the value to the exam's precision; alternates with |); keep it to at most one in six items.
- Calculators are allowed on both sections; the hard part is the chemistry, never the arithmetic. Use the exam's constants (R = 8.314 J/(mol·K), 0.08206 L·atm/(mol·K), F = 96,485 C/mol) and give any needed data (Ka, ΔH°f, E°) in the stem.
- Options for conceptual items are four parallel statements of similar length; the wrong ones are the misconceptions under WRONG ANSWERS ARE BUILT FROM.
- Before writing an item's answer, solve it from the data in the stem and check that exactly one option (or one sample answer) is right. If the numbers do not work out, change them. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the key step and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'structure',
      name: 'Atomic Structure, Bonding and Intermolecular Forces (Units 1-3)',
      share: 'about 32-40% of the test',
      detect: /\b(unit [123]\b|atomic structure|electron configuration|periodic trend|ionization energy|electronegativity|coulomb|photoelectron|PES|mass spectr\w+|mole|molar mass|empirical formula|bond\w*|lewis|vsepr|molecular geometry|hybridization|polarity|dipole|intermolecular|IMF|hydrogen bond|london|dispersion|vapor pressure|boiling point|solubility|chromatography|ideal gas|kinetic molecular|spectroscopy|beer)\b/i,
      skills: [
        'Moles, molar mass, empirical and molecular formulas, mass spectra, mixtures and pure substances',
        'Electron configurations, photoelectron spectra, periodic trends explained with Coulomb\'s law (effective nuclear charge and distance), ionization energies',
        'Bonding: ionic vs covalent vs metallic, lattice energy, bond length and strength, Lewis structures, formal charge, resonance, VSEPR shapes, hybridization, molecular polarity',
        'Intermolecular forces (dispersion, dipole-dipole, hydrogen bonding, ion-dipole) and their effect on boiling point, vapor pressure, solubility and chromatography',
        'Ideal gases, partial pressures, kinetic molecular theory and deviations from ideal behavior; solutions and Beer\'s law',
      ],
      hard: [
        'A periodic-trend justification that must cite both effective nuclear charge and distance (shielding) in the right direction',
        'Comparing boiling points of molecules where dispersion forces (size and shape) beat a weak dipole, or where hydrogen bonding is possible in only one',
        'A photoelectron spectrum item where peak position and height together identify the element or subshell',
        'Deviations from the ideal gas law explained by molecular volume or attractions at high pressure or low temperature',
        'Formal charge used to pick the best Lewis structure, or a resonance item where bond order is fractional',
      ],
      traps: ['"bigger molecule, higher boiling point" without naming dispersion forces', 'ionic bonds called intermolecular forces', 'hydrogen bonding claimed for any molecule containing hydrogen', 'electronegativity used to explain ionization energy', 'moles of molecules confused with moles of atoms'],
      exemplars: [
        `MC_QUESTION: Which of the following best explains why the first ionization energy of Mg (738 kJ/mol) is greater than that of Na (496 kJ/mol)?
A) Mg has more electrons, so its electron-electron repulsions are greater.
B) The valence electron of Mg experiences a greater effective nuclear charge at a similar distance from the nucleus.
C) Mg has a filled 3s subshell, and filled subshells cannot lose electrons easily.
D) The valence electron of Mg is in a higher energy level than that of Na.
Correct Answer: B
Explanation: Across a period, one more proton with the same shielding raises the effective nuclear charge on a 3s electron at about the same distance, so it is held more tightly. D is false: both are 3s.`,
        `MC_QUESTION: The boiling points of CH₃OH (65°C) and CH₃SH (6°C) differ even though CH₃SH has the larger molar mass. Which of the following best accounts for the difference?
A) CH₃OH molecules form hydrogen bonds with one another, and CH₃SH molecules do not.
B) The dispersion forces between CH₃OH molecules are stronger because O is more electronegative than S.
C) CH₃SH is nonpolar, so it has only dispersion forces.
D) The C–O bond is stronger than the C–S bond, so CH₃OH is harder to vaporize.
Correct Answer: A
Explanation: An H bonded to O gives hydrogen bonding; S is not electronegative enough. D confuses intramolecular bond strength with the intermolecular forces broken on boiling.`,
      ],
    },
    {
      id: 'reactions',
      name: 'Chemical Reactions, Kinetics and Thermochemistry (Units 4-6)',
      share: 'about 26-33% of the test',
      detect: /\b(unit [456]\b|stoichiometr\w+|net ionic|precipitat\w+|redox|oxidation|titration|limiting|percent yield|kinetics|rate law|rate constant|half[- ]life|activation energy|arrhenius|catalyst|mechanism|rate[- ]determining|thermochemistry|enthalpy|calorimetr\w+|hess|bond enthalp\w+|heat capacity|exothermic|endothermic)\b/i,
      skills: [
        'Balanced and net ionic equations, stoichiometry, limiting reactant, percent yield, titrations (including from a titration curve), precipitation, acid-base and redox classification, oxidation numbers',
        'Kinetics: rate laws from initial-rate data, integrated rate laws (zero, first, second order; half-life), the Arrhenius equation and activation energy, catalysts, mechanisms and the rate-determining step, intermediates vs catalysts',
        'Thermochemistry: heat transfer and calorimetry (q = mcΔT, q = CΔT), enthalpy of reaction from Hess\'s law, formation enthalpies and bond enthalpies, energy diagrams',
      ],
      hard: [
        'Determining the order with respect to each reactant from initial-rate data when two reactants change at once',
        'A proposed mechanism: does it add to the overall reaction, and does the slow step give the observed rate law (with an intermediate substituted out)?',
        'A calorimetry calculation where the heat absorbed by the solution has the opposite sign of the reaction\'s enthalpy and must be scaled per mole of limiting reactant',
        'Bond enthalpies: bonds broken minus bonds formed, counting every bond in the balanced equation',
        'A titration item where the equivalence volume gives moles, then molar mass or concentration',
      ],
      traps: ['the sign of ΔH flipped in calorimetry', 'the rate constant\'s units ignored', 'a catalyst listed as an intermediate', 'using the fast step for the rate law', 'moles of the wrong species in a stoichiometry chain', 'bonds formed minus bonds broken'],
      exemplars: [
        `MC_QUESTION: For the reaction 2 NO(g) + O₂(g) → 2 NO₂(g), the following initial rates were measured.
\`\`\`graph
kind: table
columns: Trial | [NO] (M) | [O₂] (M) | Initial rate (M/s)
row: 1 | 0.010 | 0.010 | 2.5 × 10⁻⁵
row: 2 | 0.020 | 0.010 | 1.0 × 10⁻⁴
row: 3 | 0.020 | 0.020 | 2.0 × 10⁻⁴
\`\`\`
What is the rate law for the reaction?
A) rate = k[NO][O₂]
B) rate = k[NO]²[O₂]
C) rate = k[NO][O₂]²
D) rate = k[NO]²[O₂]²
Correct Answer: B
Explanation: Doubling [NO] (trials 1 to 2) quadruples the rate, so NO is second order; doubling [O₂] (trials 2 to 3) doubles the rate, so O₂ is first order.`,
        `SA_QUESTION: A student dissolves 2.00 g of NH₄NO₃ (molar mass 80.0 g/mol) in 50.0 g of water in a coffee-cup calorimeter. The temperature of the solution falls from 22.0°C to 19.0°C. Assume the solution has the specific heat of water, 4.18 J/(g·°C), and a mass of 52.0 g. Calculate the enthalpy of dissolution of NH₄NO₃ in kJ/mol. Include the sign.
Sample Answer: q(solution) = (52.0 g)(4.18 J/(g·°C))(19.0 - 22.0 °C) = -652 J, so the dissolution absorbed +652 J (1 point for q with the correct sign relationship). Moles of NH₄NO₃ = 2.00 / 80.0 = 0.0250 mol (1 point). ΔH = +652 J / 0.0250 mol = +26,100 J/mol = +26.1 kJ/mol; the process is endothermic (1 point for the value with the positive sign and units).`,
      ],
    },
    {
      id: 'equilibrium',
      name: 'Equilibrium and Acids and Bases (Units 7-8)',
      share: 'about 18-25% of the test',
      detect: /\b(unit [78]\b|equilibrium|le ch[aâ]telier|reaction quotient|\bK[cp]?\b|ICE table|solubility product|Ksp|common ion|acid|base|\bpH\b|pOH|\bKa\b|\bKb\b|\bKw\b|buffer|henderson|titration curve|equivalence|half[- ]equivalence|weak acid|strong acid|conjugate|indicator|hydrolysis)\b/i,
      skills: [
        'Equilibrium constants Kc and Kp, the reaction quotient Q and the direction of shift, ICE tables, Le Chatelier\'s principle (concentration, pressure, temperature; why a catalyst does nothing), Ksp and the common-ion effect',
        'Acids and bases: pH, pOH and Kw; strong vs weak; Ka, Kb and percent ionization; conjugate pairs; pH of weak acid and weak base solutions; salt hydrolysis',
        'Buffers and titrations: the Henderson-Hasselbalch relation, buffer capacity, titration curves (equivalence and half-equivalence points, pH at equivalence for weak acid-strong base), choosing an indicator',
      ],
      hard: [
        'Q vs K from given concentrations to predict the direction, then the effect of a volume change on a reaction with unequal moles of gas',
        'A weak-acid pH where the "x is small" approximation must be checked, or percent ionization that changes with dilution',
        'Reading Ka (pKa) from the half-equivalence point of a titration curve and identifying which species dominate at each region',
        'Why a buffer resists pH change, written as the reaction of added H⁺ or OH⁻ with the specific conjugate species',
        'Ksp with a common ion, or comparing solubilities of salts with different stoichiometry (Ksp alone is not enough)',
      ],
      traps: ['a catalyst shifting an equilibrium', 'temperature treated like concentration (K is unchanged only for the latter)', 'pH of a weak acid taken from its concentration as if strong', 'comparing Ksp values of AB and AB₂ salts directly', 'equivalence point assumed to be pH 7 for a weak acid'],
      exemplars: [
        `MC_QUESTION: The reaction N₂O₄(g) ⇌ 2 NO₂(g) is endothermic. A sealed container at equilibrium is heated and its volume is kept constant. Which of the following correctly describes the changes?
A) [NO₂] increases, and K increases.
B) [NO₂] increases, and K is unchanged.
C) [NO₂] decreases, and K decreases.
D) [NO₂] is unchanged, and K increases.
Correct Answer: A
Explanation: Heating an endothermic reaction shifts it toward products and raises K; temperature is the one change that alters K. B describes a concentration or volume change, not a temperature change.`,
        `SA_QUESTION: A 0.100 M solution of a weak acid HA has a pH of 2.87. Calculate Ka for HA. Then explain whether the percent ionization of HA would increase, decrease or stay the same if the solution were diluted to 0.0100 M, and justify your answer.
Sample Answer: [H⁺] = 10⁻²·⁸⁷ = 1.35 × 10⁻³ M (1 point). Ka = (1.35 × 10⁻³)² / (0.100 - 0.00135) ≈ 1.8 × 10⁻⁵ (1 point; using 0.100 in the denominator is accepted). Percent ionization increases on dilution (1 point): Q = [H⁺][A⁻]/[HA] falls below Ka when all concentrations are divided by 10 (the numerator drops by 100, the denominator by 10), so the system shifts toward ionization (1 point for the Q vs Ka justification or an equivalent Le Chatelier argument in terms of moles of particles).`,
      ],
    },
    {
      id: 'thermo',
      name: 'Thermodynamics and Electrochemistry (Unit 9)',
      share: 'about 7-9% of the test',
      detect: /\b(unit 9\b|entropy|gibbs|free energy|spontaneous|thermodynamic\w*|electrochem\w*|galvanic|voltaic|electrolytic|electrolysis|cell potential|E°|standard reduction|nernst|faraday|anode|cathode|salt bridge|coupled)\b/i,
      skills: [
        'Entropy changes from phase, moles of gas and complexity; ΔG° = ΔH° - TΔS° and the temperature at which a reaction becomes favorable; ΔG° = -RT ln K; thermodynamic vs kinetic control',
        'Galvanic cells: half-reactions, anode and cathode, E°cell from standard reduction potentials, the salt bridge, ΔG° = -nFE°; how concentrations change E (qualitatively, via Q); electrolytic cells and Faraday\'s law (moles of product from current and time)',
      ],
      hard: [
        'The sign of ΔS predicted for a reaction with a phase change and a change in moles of gas pulling in opposite directions',
        'ΔG° = -nFE° with n counted from the balanced overall reaction, not the half-reaction as written',
        'Why a cell\'s voltage changes when one concentration is raised: Q changes, so E moves away from or toward E°',
        'A reaction with negative ΔG° that does not proceed (kinetic control), or a non-favorable reaction driven by coupling',
        'Electrolysis: grams deposited from amperes and seconds through moles of electrons',
      ],
      traps: ['"spontaneous" taken to mean fast', 'E° multiplied when a half-reaction is doubled', 'the anode and cathode reversed in an electrolytic cell', 'ΔG° used for non-standard conditions', 'moles of electrons counted from one half-reaction'],
      exemplars: [
        `MC_QUESTION: For the reaction 2 H₂O₂(l) → 2 H₂O(l) + O₂(g), ΔH° = -196 kJ/mol and ΔS° = +126 J/(mol·K). Which of the following is true about the reaction at 298 K?
A) It is thermodynamically favorable at all temperatures.
B) It is thermodynamically favorable only at high temperatures.
C) It is thermodynamically favorable only at low temperatures.
D) It is not thermodynamically favorable at any temperature.
Correct Answer: A
Explanation: ΔH° is negative and ΔS° is positive, so ΔG° = ΔH° - TΔS° is negative at every temperature. (It is still slow without a catalyst: favorable does not mean fast.)`,
        `NUM_QUESTION: A current of 2.00 A is passed through molten NaCl for 3.00 hours. How many grams of Na (molar mass 23.0 g/mol) are deposited at the cathode? (F = 96,485 C/mol)
Answer: 5.15 | 5.1 | 5.2
Explanation: Charge = 2.00 A × 10,800 s = 21,600 C; moles of e⁻ = 21,600 / 96,485 = 0.224 mol; Na⁺ + e⁻ → Na, so 0.224 mol × 23.0 g/mol = 5.15 g.`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the recall items (a definition, a single trend with no justification). At most 1 item in 8 that easy, never first in a section; about half typical (one concept applied to data or a reaction) and at least a third of the kind under WHAT HARD LOOKS LIKE. Free-response parts should need a justification with the chemistry named.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 4 from a 5. At least 4 of every 5 items must be ones a student headed for a 3 would miss: two-concept items (equilibrium with gas moles and temperature, kinetics with a mechanism, thermochemistry with a limiting reactant), justifications that must name the right particle-level reason, data sets where the obvious read is wrong, calculations with a sign or stoichiometric factor to get right. Hard never means obscure content outside the course framework.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one concept each, in the exam's voice, with the data given plainly. Still real exam items.`,
  },
}
