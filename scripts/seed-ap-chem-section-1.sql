-- One-time seed for "AP Chem — Section I Practice (Princeton Review Test 1)".
-- The questions_content blob is transcribed verbatim from the standalone HTML
-- the teacher authored. The answer_key includes both the correct letter and
-- the AP Chem Big Idea (legacy framework, 1–6) for each question:
--   1 = Atoms, elements, electron config, mass spec, empirical formulas
--   2 = Bonding, IMFs, lattice/MP, gas laws/KMT, polarity
--   3 = Chemical reactions, stoichiometry, redox, precipitation
--   4 = Kinetics (rate laws, orders, catalysis, mechanisms)
--   5 = Thermodynamics (calorimetry, ΔH/ΔS/ΔG, bond enthalpy, Hess, phase changes)
--   6 = Equilibrium, K_eq/K_sp, acids/bases, buffers, titrations, electrochem

INSERT INTO practice_tests (
  teacher_id,
  title,
  description,
  answer_key,
  questions_content,
  share_token,
  results_share_token
)
VALUES (
  'd14a9ed5-c863-4756-8793-41f9ca8a0c77',
  'AP Chem — Section I Practice (Princeton Review Test 1)',
  '60 multiple-choice questions, 90 minutes. Used to gauge student weak areas before the impromptu intensive review.',
  $ak${
    "1":  {"answer": "A", "bigIdea": 4},
    "2":  {"answer": "D", "bigIdea": 4},
    "3":  {"answer": "B", "bigIdea": 1},
    "4":  {"answer": "B", "bigIdea": 6},
    "5":  {"answer": "A", "bigIdea": 6},
    "6":  {"answer": "D", "bigIdea": 6},
    "7":  {"answer": "D", "bigIdea": 6},
    "8":  {"answer": "B", "bigIdea": 6},
    "9":  {"answer": "B", "bigIdea": 2},
    "10": {"answer": "C", "bigIdea": 2},
    "11": {"answer": "C", "bigIdea": 1},
    "12": {"answer": "A", "bigIdea": 1},
    "13": {"answer": "D", "bigIdea": 1},
    "14": {"answer": "A", "bigIdea": 2},
    "15": {"answer": "D", "bigIdea": 6},
    "16": {"answer": "D", "bigIdea": 6},
    "17": {"answer": "D", "bigIdea": 2},
    "18": {"answer": "D", "bigIdea": 5},
    "19": {"answer": "A", "bigIdea": 4},
    "20": {"answer": "C", "bigIdea": 5},
    "21": {"answer": "A", "bigIdea": 5},
    "22": {"answer": "A", "bigIdea": 1},
    "23": {"answer": "A", "bigIdea": 3},
    "24": {"answer": "B", "bigIdea": 6},
    "25": {"answer": "D", "bigIdea": 4},
    "26": {"answer": "C", "bigIdea": 2},
    "27": {"answer": "A", "bigIdea": 6},
    "28": {"answer": "B", "bigIdea": 6},
    "29": {"answer": "C", "bigIdea": 6},
    "30": {"answer": "C", "bigIdea": 6},
    "31": {"answer": "C", "bigIdea": 6},
    "32": {"answer": "C", "bigIdea": 5},
    "33": {"answer": "C", "bigIdea": 2},
    "34": {"answer": "B", "bigIdea": 2},
    "35": {"answer": "C", "bigIdea": 5},
    "36": {"answer": "C", "bigIdea": 2},
    "37": {"answer": "B", "bigIdea": 2},
    "38": {"answer": "A", "bigIdea": 2},
    "39": {"answer": "C", "bigIdea": 2},
    "40": {"answer": "A", "bigIdea": 3},
    "41": {"answer": "D", "bigIdea": 1},
    "42": {"answer": "D", "bigIdea": 3},
    "43": {"answer": "A", "bigIdea": 5},
    "44": {"answer": "B", "bigIdea": 6},
    "45": {"answer": "B", "bigIdea": 2},
    "46": {"answer": "D", "bigIdea": 6},
    "47": {"answer": "A", "bigIdea": 5},
    "48": {"answer": "B", "bigIdea": 4},
    "49": {"answer": "A", "bigIdea": 6},
    "50": {"answer": "B", "bigIdea": 6},
    "51": {"answer": "C", "bigIdea": 6},
    "52": {"answer": "B", "bigIdea": 6},
    "53": {"answer": "A", "bigIdea": 2},
    "54": {"answer": "B", "bigIdea": 5},
    "55": {"answer": "A", "bigIdea": 5},
    "56": {"answer": "B", "bigIdea": 6},
    "57": {"answer": "B", "bigIdea": 6},
    "58": {"answer": "C", "bigIdea": 6},
    "59": {"answer": "B", "bigIdea": 2},
    "60": {"answer": "C", "bigIdea": 5}
  }$ak$::jsonb,
  $qc${
    "questions": [
      {
        "n": 1,
        "prompt": "The reaction between H<sub>2</sub> and ICl can be broken down into two elementary steps. If the first step is known to be the rate determining one, what is the correct rate law for the overall reaction?",
        "figure": "Step 1: H<sub>2</sub>(g) + ICl(g) → HCl(g) + HI(g)<br>Step 2: HI(g) + ICl(g) → HCl(g) + I<sub>2</sub>(g)",
        "choices": [
          "Rate = k[H<sub>2</sub>][ICl]",
          "Rate = k[HI][ICl]",
          "Rate = k[H<sub>2</sub>][ICl]<sup>2</sup>",
          "Rate = k[H<sub>2</sub>][HI]"
        ]
      },
      {
        "n": 2,
        "prompt": "The decomposition of hydrogen peroxide is a first-order process which can be catalyzed in the presence of the iodide ion, I<sup>−</sup>. What would happen to the concentration of the iodide ion as the reaction progresses?",
        "figure": "2 H<sub>2</sub>O<sub>2</sub>(aq) → 2 H<sub>2</sub>O(l) + O<sub>2</sub>(g)",
        "choices": [
          "It would decrease at the same rate as the H<sub>2</sub>O<sub>2</sub>.",
          "It would decrease half as quickly as the H<sub>2</sub>O<sub>2</sub>.",
          "It would decrease twice as quickly as the H<sub>2</sub>O<sub>2</sub>.",
          "It would remain unchanged."
        ]
      },
      {
        "n": 3,
        "prompt": "Based on its Lewis diagram, what would be the empirical formula for a molecule of caffeine?",
        "figure": "<em>(See Lewis structure of caffeine — molecular formula C<sub>8</sub>H<sub>10</sub>N<sub>4</sub>O<sub>2</sub>)</em>",
        "choices": [
          "C<sub>8</sub>H<sub>10</sub>N<sub>4</sub>O<sub>2</sub>",
          "C<sub>4</sub>H<sub>5</sub>N<sub>2</sub>O",
          "C<sub>16</sub>H<sub>20</sub>N<sub>8</sub>O<sub>4</sub>",
          "C<sub>12</sub>H<sub>15</sub>N<sub>6</sub>O<sub>3</sub>"
        ]
      },
      {
        "n": 4,
        "stem": "qs4-8",
        "prompt": "What is the standard reduction potential for the full reaction?",
        "choices": ["1.68 V", "1.24 V", "1.16 V", "0.36 V"]
      },
      {
        "n": 5,
        "stem": "qs4-8",
        "prompt": "Which of the following starting concentration values for each solution would produce the highest cell potential?",
        "choices": [
          "[Ag<sup>+</sup>] = 2.0 M, [Fe<sup>2+</sup>] = 1.0 M",
          "[Ag<sup>+</sup>] = 2.0 M, [Fe<sup>2+</sup>] = 2.0 M",
          "[Ag<sup>+</sup>] = 0.5 M, [Fe<sup>2+</sup>] = 1.0 M",
          "[Ag<sup>+</sup>] = 0.5 M, [Fe<sup>2+</sup>] = 2.0 M"
        ]
      },
      {
        "n": 6,
        "stem": "qs4-8",
        "prompt": "Which diagram correctly shows the pathway and direction of the electron flow in the cell?",
        "choices": [
          "Electrons flow externally from Ag(s) → Fe(s)",
          "Electrons flow externally from Fe(s) → Ag(s)",
          "Electrons flow through the salt bridge from Ag(s) → Fe(s)",
          "Electrons flow through the salt bridge from Fe(s) → Ag(s)"
        ]
      },
      {
        "n": 7,
        "stem": "qs4-8",
        "prompt": "What is true about the values for K<sub>eq</sub> and ΔG for this cell?",
        "choicesAreTable": true,
        "choices": [
          [["K<sub>eq</sub>", "ΔG"], ["< 1", "> 0"]],
          [["K<sub>eq</sub>", "ΔG"], ["< 1", "< 0"]],
          [["K<sub>eq</sub>", "ΔG"], ["> 0", "> 1"]],
          [["K<sub>eq</sub>", "ΔG"], ["> 1", "< 0"]]
        ]
      },
      {
        "n": 8,
        "stem": "qs4-8",
        "prompt": "What is the function of the salt bridge in the cell?",
        "choices": [
          "It prevents the mass of the electrodes from changing.",
          "It donates ions to keep the solutions at the electrodes electrically neutral.",
          "It allows the solutions from both electrodes to mix freely.",
          "It serves as a return pathway for the electrons to move between electrodes."
        ]
      },
      {
        "n": 9,
        "prompt": "Stainless steel is primarily made up of three elements: iron, carbon, and chromium. Which of the diagrams below is an accurate representation of stainless steel on a particular level?",
        "figure": "<em>(Each option shows a 12-atom lattice with different proportions of Fe, Cr, and C atoms.)</em>",
        "choices": [
          "A roughly equal mix of Fe, Cr, and C atoms (Fe ≈ Cr ≈ C)",
          "A mix dominated by Fe with smaller amounts of Cr, and C atoms placed in interstitial positions",
          "Mostly Fe atoms with Cr atoms substituted in and a few C atoms in interstitial sites (small carbon, large iron and chromium)",
          "Mostly C atoms with smaller amounts of Cr and Fe"
        ]
      },
      {
        "n": 10,
        "prompt": "Light in which region of the electromagnetic spectrum supports the hypothesis that the N–O bonds in a nitrate (NO<sub>3</sub><sup>−</sup>) ion are longer than those in a nitrite (NO<sub>2</sub><sup>−</sup>) ion?",
        "choices": ["Gamma rays", "Ultraviolet", "Infrared", "Microwave"]
      },
      {
        "n": 11,
        "stem": "qs11-13",
        "prompt": "Which element does the spectrum above belong to?",
        "choices": ["Boron", "Fluorine", "Sodium", "Aluminum"]
      },
      {
        "n": 12,
        "stem": "qs11-13",
        "prompt": "Electrons from which peak would have been closest, originally, to the nucleus?",
        "choices": ["Peak 1", "Peak 2", "Peak 3", "Peak 4"]
      },
      {
        "n": 13,
        "stem": "qs11-13",
        "prompt": "Electrons from which peak would have the highest velocity after being ejected?",
        "choices": ["Peak 1", "Peak 2", "Peak 3", "Peak 4"]
      },
      {
        "n": 14,
        "prompt": "At which point in the graph are the interactions between the two nuclei the strongest?",
        "figure": "<em>(Potential Energy vs. Internuclear Distance graph: Point A is high on the left at small distance; Point B is on the descending curve approaching the minimum; Point C is at the bottom (minimum) of the well; Point D is on the right where PE returns to zero at large distance.)</em>",
        "choices": ["Point A", "Point B", "Point C", "Point D"]
      },
      {
        "n": 15,
        "prompt": "Alanine, C<sub>3</sub>H<sub>7</sub>NO<sub>2</sub>, has a Lewis structure as shown. Which hydrogen is most likely to be transferred when alanine is mixed with water?",
        "figure": "H<sub>1</sub>—C—C—C(=O)—O—H<sub>4</sub>, with H<sub>2</sub> on the middle carbon and H<sub>3</sub> on the nitrogen (NH<sub>2</sub> group).",
        "choices": ["Hydrogen 1", "Hydrogen 2", "Hydrogen 3", "Hydrogen 4"]
      },
      {
        "n": 16,
        "prompt": "The equilibrium constant for the reaction below is 2.0 × 10<sup>−3</sup> at a certain temperature. What would the equilibrium constant for the reaction 2 Cl<sub>2</sub>(g) + 2 PCl<sub>3</sub>(g) ⇌ 2 PCl<sub>5</sub>(g) be at the same temperature?",
        "figure": "PCl<sub>5</sub>(g) ⇌ PCl<sub>3</sub>(g) + Cl<sub>2</sub>(g)&nbsp;&nbsp;&nbsp;K<sub>c</sub> = 2.0 × 10<sup>−3</sup>",
        "choices": [
          "4.0 × 10<sup>−3</sup>",
          "5.0 × 10<sup>2</sup>",
          "1.0 × 10<sup>5</sup>",
          "2.5 × 10<sup>5</sup>"
        ]
      },
      {
        "n": 17,
        "prompt": "Liquid hexane, C<sub>6</sub>H<sub>14</sub>, would be most miscible with which of the following solutions?",
        "choices": ["NaCl(aq)", "NF<sub>3</sub>(l)", "H<sub>2</sub>O(l)", "CCl<sub>4</sub>(l)"]
      },
      {
        "n": 18,
        "stem": "qs18-21",
        "prompt": "Approximately how much energy was transferred from the vanadium to the water?",
        "choices": ["150 J", "265 J", "310 J", "385 J"]
      },
      {
        "n": 19,
        "stem": "qs18-21",
        "prompt": "If the experiment were repeated with finely ground vanadium powder instead of a vanadium cube, how would that affect the water compared to the original experiment?",
        "choices": [
          "It will take a shorter time to reach the same final temperature.",
          "It will take a longer time to reach the same final temperature.",
          "It will take a shorter time to reach a higher final temperature.",
          "It will take a longer time to reach a higher final temperature."
        ]
      },
      {
        "n": 20,
        "stem": "qs18-21",
        "prompt": "If the vanadium cube were replaced with an aluminum (c = 0.900 J/g·°C) cube of the same mass and the experiment were repeated, how would that affect the final temperature of the water, compared with the final temperature in the vanadium experiment?",
        "choices": [
          "It would be the same.",
          "It would be lower.",
          "It would be higher.",
          "The aluminum will dissolve, so it is impossible to say."
        ]
      },
      {
        "n": 21,
        "stem": "qs18-21",
        "prompt": "The student observes that the maximum temperature of the boiling water bath never increases above 100 °C. Why is this true?",
        "choices": [
          "The energy being added to the water goes into breaking intermolecular forces.",
          "It is impossible to increase the temperature of a covalent substance above 100 °C.",
          "The presence of the metal strengthens the hydrogen bonding between the water molecules.",
          "The sea of electrons present in the water molecules is an effective conductor of heat."
        ]
      },
      {
        "n": 22,
        "prompt": "In which of the below isotopes does the number of valence electrons exceed the number of core electrons?",
        "choices": [
          "<sup>13</sup><sub>7</sub>N",
          "<sup>33</sup><sub>16</sub>S",
          "<sup>22</sup><sub>11</sub>Na",
          "<sup>4</sup><sub>2</sub>He"
        ]
      },
      {
        "n": 23,
        "prompt": "When 112 g of iron (MM = 56 g/mol) reacts with 64 g of oxygen (MM = 32 g/mol) via the above reaction, how many grams of excess reactant are left after the reaction goes to completion?",
        "figure": "4 Fe(s) + 3 O<sub>2</sub>(g) → 2 Fe<sub>2</sub>O<sub>3</sub>(s)",
        "choices": ["16 g", "32 g", "48 g", "64 g"]
      },
      {
        "n": 24,
        "prompt": "Three different gases are introduced into an empty flask at the pressures given above with the temperature held at 400 K. As the reaction moves toward equilibrium while the temperature remains constant, what will happen to the partial pressure of each species?",
        "figure": "2 N<sub>2</sub>O<sub>5</sub>(g) ⇌ O<sub>2</sub>(g) + 4 NO<sub>2</sub>(g)&nbsp;&nbsp;K<sub>p</sub> = 0.62 at 400 K<br><br>Initial pressures: N<sub>2</sub>O<sub>5</sub> = 0.20 atm, O<sub>2</sub> = 0.20 atm, NO<sub>2</sub> = 0.10 atm",
        "choicesAreTable": true,
        "choices": [
          [["N<sub>2</sub>O<sub>5</sub>", "O<sub>2</sub>", "NO<sub>2</sub>"], ["Increase", "Decrease", "Decrease"]],
          [["N<sub>2</sub>O<sub>5</sub>", "O<sub>2</sub>", "NO<sub>2</sub>"], ["Decrease", "Increase", "Increase"]],
          [["N<sub>2</sub>O<sub>5</sub>", "O<sub>2</sub>", "NO<sub>2</sub>"], ["No change", "Increase", "Increase"]],
          [["N<sub>2</sub>O<sub>5</sub>", "O<sub>2</sub>", "NO<sub>2</sub>"], ["No change", "No change", "No change"]]
        ]
      },
      {
        "n": 25,
        "prompt": "The decomposition of acetaldehyde is known to be a second-order process, as shown above. Which graph below correctly shows the relationship of concentration of acetaldehyde vs. time during its decomposition?",
        "figure": "CH<sub>3</sub>CHO(g) → CH<sub>4</sub>(g) + CO(g)",
        "choices": [
          "Linear plot of [CH<sub>3</sub>CHO] vs. time, decreasing",
          "Linear plot of log[CH<sub>3</sub>CHO] vs. time, decreasing",
          "Linear plot of ln[CH<sub>3</sub>CHO] vs. time, decreasing",
          "Linear plot of 1/[CH<sub>3</sub>CHO] vs. time, increasing"
        ]
      },
      {
        "n": 26,
        "prompt": "The melting point trend above is best explained by which of the following?",
        "figure": "<em>NaF: 993 °C&nbsp;&nbsp;|&nbsp;&nbsp;KCl: 770 °C&nbsp;&nbsp;|&nbsp;&nbsp;RbBr: 693 °C</em>",
        "choices": [
          "The nuclear charge in the anion",
          "The electronegativity difference between the ions",
          "The atomic radii of both ions",
          "The conductivity of each ion"
        ]
      },
      {
        "n": 27,
        "stem": "qs27-30",
        "prompt": "What is the concentration of the HCl?",
        "choices": ["0.67 M", "1.0 M", "1.33 M", "1.50 M"]
      },
      {
        "n": 28,
        "stem": "qs27-30",
        "prompt": "What is the approximate K<sub>b</sub> for ethylamine?",
        "choices": [
          "1.0 × 10<sup>−2</sup>",
          "1.0 × 10<sup>−4</sup>",
          "1.0 × 10<sup>−6</sup>",
          "1.0 × 10<sup>−8</sup>"
        ]
      },
      {
        "n": 29,
        "stem": "qs27-30",
        "prompt": "Which species is present in the greatest concentration at the equivalence point?",
        "choices": [
          "H<sup>+</sup>",
          "CH<sub>3</sub>CH<sub>2</sub>NH<sub>2</sub>",
          "CH<sub>3</sub>CH<sub>2</sub>NH<sub>3</sub><sup>+</sup>",
          "HCl"
        ]
      },
      {
        "n": 30,
        "stem": "qs27-30",
        "prompt": "If the ethylamine were replaced with an identical volume of NaOH, how would that affect the volume of HCl needed to reach equivalence as well as the pH at the equivalence point?",
        "choicesAreTable": true,
        "choices": [
          [["Vol. HCl to reach equivalence", "Equivalence pH"], ["Lower", "Lower"]],
          [["Vol. HCl to reach equivalence", "Equivalence pH"], ["Lower", "No Change"]],
          [["Vol. HCl to reach equivalence", "Equivalence pH"], ["No Change", "Higher"]],
          [["Vol. HCl to reach equivalence", "Equivalence pH"], ["Higher", "Lower"]]
        ]
      },
      {
        "n": 31,
        "prompt": "100. mL of 0.10 M HClO is mixed with 100. mL of 0.10 M HNO<sub>2</sub>. After the solutions are fully mixed, which of the following concentration relationships is true?",
        "figure": "HClO(aq) ⇌ H<sup>+</sup>(aq) + ClO<sup>−</sup>(aq)&nbsp;&nbsp;K<sub>a</sub> = 1.1 × 10<sup>−2</sup><br>HNO<sub>2</sub>(aq) ⇌ H<sup>+</sup>(aq) + NO<sub>2</sub><sup>−</sup>(aq)&nbsp;&nbsp;K<sub>a</sub> = 4.0 × 10<sup>−4</sup>",
        "choices": [
          "[HClO] > [HNO<sub>2</sub>] > [H<sup>+</sup>]",
          "[H<sup>+</sup>] > [HNO<sub>2</sub>] > [HClO]",
          "[HNO<sub>2</sub>] > [HClO] > [H<sup>+</sup>]",
          "[H<sup>+</sup>] > [HClO] > [HNO<sub>2</sub>]"
        ]
      },
      {
        "n": 32,
        "prompt": "What would be the approximate enthalpy value for an H–H bond?",
        "figure": "CH<sub>4</sub> + C<sub>2</sub>H<sub>6</sub> → C<sub>3</sub>H<sub>8</sub> + H<sub>2</sub>&nbsp;&nbsp;ΔH = 40 kJ/mol<br><br>Bond enthalpies: C–H = 410 kJ/mol, C–C = 350 kJ/mol, H–H = ?",
        "choices": [
          "−430 kJ·mol<sup>−1</sup>",
          "190 kJ·mol<sup>−1</sup>",
          "430 kJ·mol<sup>−1</sup>",
          "780 kJ·mol<sup>−1</sup>"
        ]
      },
      {
        "n": 33,
        "prompt": "When studying the structure of a molecule, infrared radiation would be most effective at determining which of the following?",
        "choices": [
          "The electron configuration of a neutral atom",
          "The molecular geometry of a molecule",
          "The length of the bonds within a molecule",
          "The oxidation state of atoms and ions"
        ]
      },
      {
        "n": 34,
        "prompt": "Which of the following graphs correctly displays the relationship between gas pressure and volume at constant temperature?",
        "choices": [
          "A linearly decreasing line of P vs. V",
          "A hyperbolic decreasing curve of P vs. V (P decreases sharply then levels off)",
          "A linearly increasing line of P vs. V",
          "A curve of P vs. V that increases and then levels off"
        ]
      },
      {
        "n": 35,
        "prompt": "Which of the reaction coordinates shown below correctly labels both the activation energy, E<sub>a</sub>, and the enthalpy change, ΔH, for the above reaction?",
        "figure": "CH<sub>4</sub>(g) + NH<sub>3</sub>(g) → HCN(g) + 3 H<sub>2</sub>&nbsp;&nbsp;ΔH = 256 kJ/mol",
        "choices": [
          "Endergonic curve with E<sub>a</sub> labeled from reactants to peak, ΔH labeled from reactants to products (products higher) — but ΔH spans only part of the energy gap",
          "Endothermic curve where ΔH is labeled at the top peak and E<sub>a</sub> is labeled from reactants to a low product line",
          "Endothermic curve with both E<sub>a</sub> and ΔH labeled from reactants going up to peak/products correctly",
          "Exothermic curve where E<sub>a</sub> is labeled correctly but ΔH is labeled going down (products lower than reactants)"
        ]
      },
      {
        "n": 36,
        "prompt": "Atoms of which element, when bonded with an atom of nitrogen, would cause the nitrogen atom to have the strongest positive partial charge?",
        "choices": ["Phosphorus", "Carbon", "Oxygen", "Arsenic"]
      },
      {
        "n": 37,
        "stem": "qs37-39",
        "prompt": "Which gas would exert the greatest pressure initially?",
        "choices": [
          "H<sub>2</sub>",
          "H<sub>2</sub>O",
          "N<sub>2</sub>",
          "All three gases would exert the same pressure."
        ]
      },
      {
        "n": 38,
        "stem": "qs37-39",
        "prompt": "The stopcocks are then opened, and the gases are allowed to mix fully. Which gas would exert the greatest pressure afterward?",
        "choices": [
          "H<sub>2</sub>",
          "H<sub>2</sub>O",
          "N<sub>2</sub>",
          "All three gases would exert the same pressure."
        ]
      },
      {
        "n": 39,
        "stem": "qs37-39",
        "prompt": "The velocity distribution for all three gases is plotted on the diagram below. Which gas belongs to which distribution? <em>(X = tallest, narrowest peak; Y = middle peak; Z = lowest, broadest peak)</em>",
        "choicesAreTable": true,
        "choices": [
          [["Gas X", "Gas Y", "Gas Z"], ["H<sub>2</sub>", "H<sub>2</sub>O", "N<sub>2</sub>"]],
          [["Gas X", "Gas Y", "Gas Z"], ["H<sub>2</sub>", "N<sub>2</sub>", "H<sub>2</sub>O"]],
          [["Gas X", "Gas Y", "Gas Z"], ["N<sub>2</sub>", "H<sub>2</sub>O", "H<sub>2</sub>"]],
          [["Gas X", "Gas Y", "Gas Z"], ["H<sub>2</sub>O", "N<sub>2</sub>", "H<sub>2</sub>"]]
        ]
      },
      {
        "n": 40,
        "prompt": "The contents of the two beakers above are mixed into a third beaker, and a precipitate of Mg(OH)<sub>2</sub> forms. Which of the diagrams below correctly demonstrates the ratio of the ions present in the product beaker?",
        "figure": "Beaker 1 contains Mg(NO<sub>3</sub>)<sub>2</sub> in solution (Mg<sup>2+</sup> and NO<sub>3</sub><sup>−</sup> ions). Beaker 2 contains NaOH in solution (Na<sup>+</sup> and OH<sup>−</sup> ions). Mg<sup>2+</sup> + 2 OH<sup>−</sup> → Mg(OH)<sub>2</sub>(s).",
        "choices": [
          "Mostly NO<sub>3</sub><sup>−</sup> with several Na<sup>+</sup> and a few leftover Mg<sup>2+</sup> ions",
          "Only Na<sup>+</sup>, NO<sub>3</sub><sup>−</sup>, and excess OH<sup>−</sup> (no Mg<sup>2+</sup>)",
          "A mixture of Na<sup>+</sup>, NO<sub>3</sub><sup>−</sup>, OH<sup>−</sup>, and Mg<sup>2+</sup> in roughly equal amounts",
          "Only Na<sup>+</sup> and NO<sub>3</sub><sup>−</sup> in solution, with Mg(OH)<sub>2</sub> as a solid precipitate"
        ]
      },
      {
        "n": 41,
        "prompt": "The mass spectrum for zinc is shown above. Based on the spectrum, which of the following can be correctly concluded about zinc?",
        "figure": "<em>(Zn mass spectrum shows 5 peaks at masses 64, 66, 67, 68, and 70 amu, with the tallest peak at 64 amu.)</em>",
        "choices": [
          "Zinc atoms will always form an ion with a charge of +2.",
          "The most common isotope of zinc has 35 neutrons.",
          "The melting point of zinc is lower than the other transition metals in the same period.",
          "A sample of zinc contains atoms with four different atomic masses."
        ]
      },
      {
        "n": 42,
        "prompt": "In which of the following reactions is carbon reduced?",
        "choices": [
          "C(s) + H<sub>2</sub>O(l) → CO(g) + H<sub>2</sub>(g)",
          "C<sub>2</sub>H<sub>2</sub>(g) + O<sub>2</sub>(g) → CO<sub>2</sub>(g) + H<sub>2</sub>O(g)",
          "CO<sub>2</sub>(g) + H<sub>2</sub>O(l) → H<sub>2</sub>CO<sub>3</sub>(aq)",
          "CO<sub>2</sub>(g) → CO(g) + ½ O<sub>2</sub>(g)"
        ]
      },
      {
        "n": 43,
        "prompt": "Using the given values, calculate the entropy change, ΔS°, for the above reaction.",
        "figure": "2 NO<sub>2</sub>(g) + 7 H<sub>2</sub>(g) → 2 NH<sub>3</sub>(g) + 4 H<sub>2</sub>O(l)<br><br>S° (J·mol<sup>−1</sup>·K<sup>−1</sup>): NO<sub>2</sub>(g) = 240, H<sub>2</sub>(g) = 130, NH<sub>3</sub>(g) = 190, H<sub>2</sub>O(l) = 70",
        "choices": [
          "−730 J·mol<sup>−1</sup>·K<sup>−1</sup>",
          "−520 J·mol<sup>−1</sup>·K<sup>−1</sup>",
          "−110 J·mol<sup>−1</sup>·K<sup>−1</sup>",
          "630 J·mol<sup>−1</sup>·K<sup>−1</sup>"
        ]
      },
      {
        "n": 44,
        "prompt": "A current of 0.15 A is run through a solution containing Cu<sup>2+</sup> ions, causing solid copper to plate out on an electrode. Which of the following expressions can be used to correctly calculate the mass of copper that will plate out over 300 seconds?",
        "choices": [
          "[(0.15)(96,500)(63.55)] / [(300)(2)]",
          "[(0.15)(300)(63.55)] / [(96,500)(2)]",
          "[(2)(63.55)(300)] / [(96,500)(0.15)]",
          "[(96,500)(63.55)(2)] / [(0.15)(300)]"
        ]
      },
      {
        "n": 45,
        "prompt": "Which molecule below would be completely nonpolar?",
        "choices": [
          "ClF<sub>5</sub> (square pyramidal)",
          "XeF<sub>4</sub> (square planar)",
          "NF<sub>3</sub> (trigonal pyramidal)",
          "OF<sub>2</sub> (bent)"
        ]
      },
      {
        "n": 46,
        "prompt": "There are 200 mL of 1.0 M HCN (pK<sub>a</sub> = 9.2) present in a 400 mL beaker. Adding 100 mL of which of the following 1.0 M solutions would create a buffer with a pH of 9.2?",
        "choices": [
          "HC<sub>2</sub>H<sub>3</sub>O<sub>2</sub> (K<sub>a</sub> = 1.8 × 10<sup>−5</sup>)",
          "NH<sub>3</sub> (K<sub>b</sub> = 1.8 × 10<sup>−5</sup>)",
          "HCl",
          "NaOH"
        ]
      },
      {
        "n": 47,
        "prompt": "What would be the enthalpy change for the below reaction?",
        "figure": "C(graphite) + O<sub>2</sub>(g) → CO<sub>2</sub>(g)&nbsp;&nbsp;ΔH = −394 kJ/mol<br>4 Fe(s) + 3 O<sub>2</sub>(g) → 2 Fe<sub>2</sub>O<sub>3</sub>(s)&nbsp;&nbsp;ΔH = −1,650 kJ/mol<br><br>Target: 2 Fe<sub>2</sub>O<sub>3</sub>(s) + 3 C(graphite) → 4 Fe(s) + 3 CO<sub>2</sub>(g)",
        "choices": [
          "468 kJ·mol<sup>−1</sup>",
          "1,256 kJ·mol<sup>−1</sup>",
          "−2,044 kJ·mol<sup>−1</sup>",
          "−2,832 kJ·mol<sup>−1</sup>"
        ]
      },
      {
        "n": 48,
        "prompt": "A reaction between substances X and Y yields a product of Z, and the concentration of all three species is monitored over time. What would the correct balanced equation for the reaction be?",
        "figure": "<em>(Concentration vs. time graph: Y starts highest and decreases slightly. X starts lower and decreases at twice the rate of Y. Z starts at zero and increases at the same rate as X decreases.)</em>",
        "choices": [
          "X + Y ⇌ Z",
          "2X + Y ⇌ 2Z",
          "X + 2Y ⇌ Z",
          "2X + 2Y ⇌ Z"
        ]
      },
      {
        "n": 49,
        "stem": "qs49-53",
        "prompt": "What will the concentration of each ion be in the solution?",
        "choices": [
          "[Cd<sup>2+</sup>] = 0.010 M, [IO<sub>3</sub><sup>−</sup>] = 0.020 M",
          "[Cd<sup>2+</sup>] = 0.010 M, [IO<sub>3</sub><sup>−</sup>] = 0.040 M",
          "[Cd<sup>2+</sup>] = 0.040 M, [IO<sub>3</sub><sup>−</sup>] = 0.080 M",
          "[Cd<sup>2+</sup>] = 0.020 M, [IO<sub>3</sub><sup>−</sup>] = 0.040 M"
        ]
      },
      {
        "n": 50,
        "stem": "qs49-53",
        "prompt": "Which of the following would reduce the concentration of the IO<sub>3</sub><sup>−</sup> in solution?",
        "choices": [
          "Allowing some water to evaporate",
          "Adding some Cd(NO<sub>3</sub>)<sub>2</sub> to the solution",
          "Adding some NaIO<sub>3</sub> to the solution",
          "Adding some NaNO<sub>3</sub> to the solution"
        ]
      },
      {
        "n": 51,
        "stem": "qs49-53",
        "prompt": "An additional 1.0 g of Cd(IO<sub>3</sub>)<sub>2</sub> is added to the beaker. What effect will that have on the concentration of the ions in solution?",
        "choices": [
          "They would both decrease.",
          "They would both increase.",
          "They would both remain unchanged.",
          "The concentration of Cd<sup>2+</sup> would increase, while the concentration of IO<sub>3</sub><sup>−</sup> would increase."
        ]
      },
      {
        "n": 52,
        "stem": "qs49-53",
        "prompt": "5.0 g of another salt, Ni(IO<sub>3</sub>)<sub>2</sub> (K<sub>sp</sub> = 5.0 × 10<sup>−5</sup>), is added to a separate beaker that contains the same amount of water, and some solid settles to the bottom. Which solution, of the two, will contain the higher concentration of IO<sub>3</sub><sup>−</sup> ions?",
        "choices": [
          "The Cd(IO<sub>3</sub>)<sub>2</sub> solution",
          "The Ni(IO<sub>3</sub>)<sub>2</sub> solution",
          "Both solutions would have the same concentration of IO<sub>3</sub><sup>−</sup>.",
          "Whichever solution has a smaller volume of water."
        ]
      },
      {
        "n": 53,
        "stem": "qs49-53",
        "prompt": "Of the three ions in either beaker (Ni<sup>2+</sup>, Cd<sup>2+</sup>, and IO<sub>3</sub><sup>−</sup>), which would form the strongest attractions with water molecules?",
        "choices": [
          "Ni<sup>2+</sup>",
          "Cd<sup>2+</sup>",
          "IO<sub>3</sub><sup>−</sup>",
          "All three ions would have identical attractive forces."
        ]
      },
      {
        "n": 54,
        "prompt": "1.0 mole of a pure substance is heated, and the temperature change is tracked. Given the rate of heating, which section of the graph above could be used to find the molar heat of fusion?",
        "figure": "<em>(Heating curve, Temperature vs. Energy: Section A = warming solid, Section B = solid→liquid plateau, Section C = warming liquid, Section D = liquid→gas plateau)</em>",
        "choices": ["Section A", "Section B", "Section C", "Section D"]
      },
      {
        "n": 55,
        "prompt": "A certain chemical process is favored at 500 K, but not favored at 300 K. What must be true about the signs for ΔH and ΔS for this process?",
        "choicesAreTable": true,
        "choices": [
          [["ΔH", "ΔS"], ["> 0", "> 0"]],
          [["ΔH", "ΔS"], ["> 0", "< 0"]],
          [["ΔH", "ΔS"], ["< 0", "> 0"]],
          [["ΔH", "ΔS"], ["< 0", "< 0"]]
        ]
      },
      {
        "n": 56,
        "prompt": "20. mL of 1.0 M H<sub>2</sub>SO<sub>3</sub>, a diprotic acid, is titrated with 1.0 M NaOH, creating the above graph. What are the approximate pK<sub>a</sub> values for each dissociation of H<sub>2</sub>SO<sub>3</sub>?",
        "figure": "<em>(Titration curve shows two equivalence points; the first half-equivalence is around 5 mL NaOH at pH ≈ 2, and the second half-equivalence is around 30 mL NaOH at pH ≈ 7.)</em>",
        "choicesAreTable": true,
        "choices": [
          [["pK<sub>a1</sub>", "pK<sub>a2</sub>"], ["5.0", "9.0"]],
          [["pK<sub>a1</sub>", "pK<sub>a2</sub>"], ["2.0", "7.0"]],
          [["pK<sub>a1</sub>", "pK<sub>a2</sub>"], ["2.0", "9.0"]],
          [["pK<sub>a1</sub>", "pK<sub>a2</sub>"], ["5.0", "7.0"]]
        ]
      },
      {
        "n": 57,
        "prompt": "The above system is at equilibrium. Predict whether the solution would become more yellow, more red, or experience no color change when it is either heated or when it is diluted with extra water.",
        "figure": "H<sup>+</sup>(aq) + Fe<sup>3+</sup>(aq) + SCN<sup>−</sup>(aq) ⇌ FeSCN<sup>2+</sup>(aq)&nbsp;&nbsp;ΔH < 0<br>(yellow)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(red)",
        "choicesAreTable": true,
        "choices": [
          [["Heating", "Diluting"], ["Yellow", "No Change"]],
          [["Heating", "Diluting"], ["Yellow", "Yellow"]],
          [["Heating", "Diluting"], ["Red", "No Change"]],
          [["Heating", "Diluting"], ["Red", "Yellow"]]
        ]
      },
      {
        "n": 58,
        "prompt": "If 1.0 g of Mg(OH)<sub>2</sub> (K<sub>sp</sub> = 1.8 × 10<sup>−11</sup>) were added to 100. mL of the following solutions, in which would the largest mass of salt dissolve?",
        "choices": ["Water", "1.0 M NaOH", "1.0 M HCl", "1.0 M Mg(NO<sub>3</sub>)<sub>2</sub>"]
      },
      {
        "n": 59,
        "prompt": "Some magnesium chloride is fully dissolved in water, as shown above. Which of the forces involved in the solution would be the strongest?",
        "figure": "<em>(Diagram shows Mg<sup>2+</sup> and Cl<sup>−</sup> ions surrounded by water molecules.)</em>",
        "choices": [
          "The attraction between the hydrogen and the Cl<sup>−</sup> anions",
          "The attraction between the oxygen and the Mg<sup>2+</sup> ion",
          "The hydrogen bonding between water molecules",
          "The bond between the Mg<sup>2+</sup> and Cl<sup>−</sup> ions"
        ]
      },
      {
        "n": 60,
        "prompt": "In which of the following situations would the entropy of the system increase?",
        "choices": [
          "A bond forms between two atoms.",
          "A pure liquid freezes.",
          "The volume of a gas increases.",
          "A precipitate forms when two aqueous solutions are mixed."
        ]
      }
    ],
    "stems": {
      "qs4-8": {
        "title": "Questions 4–8 refer to the following.",
        "body": "Two half-cells are connected to form a voltaic cell. The initial concentration of both solutions is 1.0 M, and the temperature is 25 °C. The left cell contains a Ag(s) electrode in AgNO<sub>3</sub>(aq); the right cell contains a Fe(s) electrode in Fe(NO<sub>3</sub>)<sub>2</sub>(aq). The two cells are connected by a NaNO<sub>3</sub>(aq) salt bridge.<br><br><strong>Standard reduction potentials:</strong><br>Ag<sup>+</sup>(aq) + e<sup>−</sup> → Ag(s)&nbsp;&nbsp;&nbsp;&nbsp;E° = +0.80 V<br>Fe<sup>2+</sup>(aq) + 2 e<sup>−</sup> → Fe(s)&nbsp;&nbsp;&nbsp;E° = −0.44 V<br><br><strong>Net ionic reaction:</strong> 2 Ag<sup>+</sup>(aq) + Fe(s) → Fe<sup>2+</sup>(aq) + 2 Ag(s)"
      },
      "qs11-13": {
        "title": "Questions 11–13 refer to the following.",
        "body": "The photoelectron spectrum for an element in its standard state is shown below.<br><br><em>(Relative number of electrons vs. binding energy in kJ/mol. Four peaks are present: Peak 1 at 104 kJ/mol (small), Peak 2 at 6.84 kJ/mol (medium), Peak 3 at 3.67 kJ/mol (largest peak), Peak 4 at 0.50 kJ/mol (smallest, lowest binding energy).)</em>"
      },
      "qs18-21": {
        "title": "Questions 18–21 refer to the following.",
        "body": "A cube of vanadium (c = 0.50 J/g·°C) metal with a mass of 10.0 g is heated to 100 °C in a boiling water bath. The metal is then transferred into a Styrofoam cup containing some water initially at a temperature of 22.0 °C, and the solution is stirred with a stir bar until the temperature reaches a maximum value of 23.0 °C."
      },
      "qs27-30": {
        "title": "Questions 27–30 refer to the following.",
        "body": "Ethylamine, CH<sub>3</sub>CH<sub>2</sub>NH<sub>2</sub>, is a weak base that can accept a single proton. A 20.0 mL sample of 1.0 M ethylamine is titrated with a strong acid, and the pH is monitored as the titration progresses.<br><br><em>(Titration curve: pH starts at ~12, plateaus around 10–11 from 0–~10 mL HCl, drops sharply through equivalence near 30 mL HCl, then levels at ~1.)</em>"
      },
      "qs37-39": {
        "title": "Questions 37–39 refer to the following.",
        "body": "Three chambers are filled with gases, sealed, and connected using several tubes as shown below. The system is held at constant temperature throughout and the stopcocks are initially closed.<br><br>Chamber 1 (1.0 L): 12.0 g H<sub>2</sub>O&nbsp;&nbsp;|&nbsp;&nbsp;Chamber 2 (2.0 L): 14.0 g N<sub>2</sub>&nbsp;&nbsp;|&nbsp;&nbsp;Chamber 3 (3.0 L): 3.0 g H<sub>2</sub>"
      },
      "qs49-53": {
        "title": "Questions 49–53 refer to the following.",
        "body": "A 400 mL beaker is filled with 250 mL of water, and 5.0 g of Cd(IO<sub>3</sub>)<sub>2</sub> is added. The solution is stirred, and some solid Cd(IO<sub>3</sub>)<sub>2</sub> settles to the bottom.<br><br>Cd(IO<sub>3</sub>)<sub>2</sub>(s) ⇌ Cd<sup>2+</sup>(aq) + 2 IO<sub>3</sub><sup>−</sup>(aq)&nbsp;&nbsp;K<sub>sp</sub> = 4.0 × 10<sup>−6</sup>"
      }
    }
  }$qc$::jsonb,
  encode(gen_random_bytes(24), 'hex'),
  encode(gen_random_bytes(24), 'hex')
)
RETURNING id, share_token, results_share_token;
