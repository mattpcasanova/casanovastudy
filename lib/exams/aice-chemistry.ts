// The Cambridge International AS & A Level Chemistry exam (9701; AICE
// Chemistry in Florida) as a reference for the guide prompts: Paper 1
// multiple choice (40 items, four options), Paper 2 AS structured questions,
// Paper 4 A Level structured questions, Paper 3 practical and Paper 5
// planning, analysis and evaluation. Mark schemes credit one point per mark.

import type { ExamProfile } from './types'
import { AICE_DIFFICULTY, AICE_ITEM_RULES } from './aice'

export const AICE_CHEMISTRY: ExamProfile = {
  id: 'aice-chemistry',
  pace: 112,
  name: 'the Cambridge AS & A Level Chemistry exam (AICE Chemistry, 9701)',
  detect: {
    exam: /\b(?:AICE|Cambridge|(?:AS|A)[- ]?Level)\s+Chem(?:istry)?\b|\bChem(?:istry)?\b.*\b(?:AICE|Cambridge|A[- ]?Level)\b/i,
    subjectHints: /./,
    subjects: ['science'],
    explicit: /\b(?:AICE|Cambridge|(?:AS|A)[- ]?Level)\s+Chem(?:istry)?\b|\bChem(?:istry)?\b.*\b(?:AICE|Cambridge|A[- ]?Level)\b/i,
  },
  itemRules: AICE_ITEM_RULES('the Cambridge AS & A Level Chemistry exam', {
    mcq: true,
    structured: 'Paper 2 and Paper 4 parts are mostly 1-3 marks, with calculations of 2-4 marks and one 4-6 mark "explain" or "suggest" part per set.',
    extra: [
      '- Calculations use the values the paper gives in the stem: state the relative atomic masses used (Ar: Mg 24.0, O 16.0 and so on), the molar gas volume 24.0 dm³ at room temperature and pressure, and any Ka, E° or ΔH value, so the item can be solved from its own data. Volumes in cm³ and dm³, concentrations in mol dm⁻³, three significant figures unless the data has fewer.',
      '- "Explain" parts are marked in the mark scheme\'s own phrases: for trends, "more shielding so weaker attraction between the nucleus and the outer electron"; for bonding, "stronger instantaneous dipole-induced dipole forces because there are more electrons"; for equilibria, "the position shifts to the side with fewer moles of gas to reduce the pressure". An answer that names the effect without the cause earns nothing.',
      '- Mechanisms are described in words with the curly-arrow steps named: the attacking species and what makes it a nucleophile or electrophile, which bond breaks (heterolytic fission) and where the electron pair goes, the intermediate (carbocation, with its stability) and the final step. Name the mechanism exactly (free-radical substitution, electrophilic addition, nucleophilic substitution SN1 or SN2, nucleophilic addition, electrophilic substitution).',
      '- Where the paper would show a structure or shape, use a figure: `kind: lewis` for a dot-and-cross structure, `kind: vsepr` for a shape question (with `name: hide` when the shape is the answer), `kind: reaction` for a reaction profile, `kind: table` for titration or rate data.',
      '- Practical skills (Papers 3 and 5) are SA parts: identify the dependent variable, suggest how to control a named variable, describe a titration or a gas-collection method in the order it is done, explain an anomalous result, calculate the percentage uncertainty of a reading (half the smallest division, or the stated precision, as a percentage of the measurement), suggest an improvement that reduces a specific error.',
    ],
  }),
  domains: [
    {
      id: 'as-physical',
      name: 'AS physical and inorganic chemistry (atomic structure, moles, bonding, energetics, equilibria, kinetics, periodicity, Groups 2 and 17)',
      share: 'about a third of the AS papers',
      detect: /\b(atomic structure|electron\w* configuration|ionisation energy|ionization energy|mole\w*|stoichiometr\w+|titration\w*|empirical formula|molecular formula|bonding|electronegativity|intermolecular|hydrogen bond\w*|van der waals|shape\w* of molecules|vsepr|enthalp\w+|hess\w*|bond energ\w+|redox|oxidation number\w*|oxidation state\w*|equilibri\w+|le chatelier|kc|kp|kinetic\w*|rate of reaction|activation energy|boltzmann|catalys\w+|periodic\w*|group 2|group 17|halogen\w*|chlorine|bromine|iodine|ideal gas|pv ?= ?nrt)\b/i,
      skills: [
        'Atomic structure: subshells and orbitals, electron configurations, trends in first ionisation energy across Period 3 and down a group explained by nuclear charge, shielding and distance (and the drops at Al and S)',
        'Moles and stoichiometry: Ar/Mr, the mole, empirical and molecular formulae, concentration, titration calculations, gas volumes (24.0 dm³ mol⁻¹ at r.t.p., pV = nRT), percentage yield and atom economy',
        'Bonding and structure: ionic, covalent (dative), metallic; shapes from electron pairs (linear, trigonal planar, tetrahedral, trigonal bipyramidal, octahedral, with lone pairs); bond polarity and electronegativity; hydrogen bonding, permanent and instantaneous dipoles; giant and simple structures and their properties',
        'Energetics: enthalpy change definitions (formation, combustion, neutralisation), Hess\'s law cycles, bond energy calculations and why they differ from measured values',
        'Equilibria: dynamic equilibrium, Le Chatelier\'s principle, Kc and Kp expressions and calculations, the Haber and Contact processes; acid-base theory (Brønsted-Lowry), strong and weak acids',
        'Kinetics: collision theory, the Boltzmann distribution and the effect of temperature and catalysts on it, rate from graphs',
        'Periodicity: Period 3 trends in melting point, atomic radius and ionisation energy, oxides and chlorides with water; Group 2 reactions and thermal decomposition of carbonates and nitrates; Group 17 trends in volatility and reactivity, displacement, reactions with silver nitrate, disproportionation of chlorine',
        'Redox: oxidation numbers, half-equations, balancing redox equations in acid',
      ],
      hard: [
        'A titration with a back-titration or a dilution step before the concentration asked for',
        'Explaining an anomaly in a trend (the Al or S ionisation energy drop, the melting point of silicon vs sulfur) in mark-scheme language',
        'A Kc calculation where the equilibrium moles must be found from initial moles and one measured quantity first',
        'Hess cycles where the data given are combustion enthalpies and the target is a formation enthalpy (arrows must point the right way)',
        'Predicting a shape when the central atom has lone pairs and the molecule is unfamiliar, from counting electron pairs',
      ],
      traps: [
        'ionisation energy explained by "a full shell is stable" rather than attraction, shielding and distance',
        'the Boltzmann curve shifted to the right when a catalyst is added (a catalyst lowers Ea; it does not move the curve)',
        'Kc units omitted or Kp written in concentrations',
        'moles of acid equated to moles of base without the 2:1 ratio for sulfuric acid',
        'bond breaking read as exothermic',
      ],
      exemplars: [
        `MC_QUESTION: 25.0 cm³ of 0.100 mol dm⁻³ sodium hydroxide is exactly neutralised by 20.0 cm³ of dilute sulfuric acid. What is the concentration of the sulfuric acid?
A) 0.0313 mol dm⁻³
B) 0.0625 mol dm⁻³
C) 0.125 mol dm⁻³
D) 0.250 mol dm⁻³
Correct Answer: B
Explanation: Moles of NaOH = 0.0250 × 0.100 = 2.50 × 10⁻³; H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O, so moles of acid = 1.25 × 10⁻³ in 0.0200 dm³, giving 0.0625 mol dm⁻³. Choice C forgets the 1 : 2 ratio.`,
        `NUM_QUESTION: 2.40 g of magnesium (Ar: Mg 24.0) reacts completely with an excess of dilute hydrochloric acid. Calculate the volume of hydrogen gas produced, in dm³, measured at room temperature and pressure (molar gas volume 24.0 dm³ mol⁻¹).
Answer: 2.40 | 2.4
Explanation: Mg + 2HCl → MgCl₂ + H₂, so moles of H₂ = moles of Mg = 2.40 / 24.0 = 0.100 mol, and 0.100 × 24.0 = 2.40 dm³.`,
        `SA_QUESTION: The first ionisation energy of aluminium is lower than that of magnesium, although aluminium has the greater nuclear charge. Explain why. [2]
Sample Answer: 1 mark: the outer electron of aluminium is in a 3p orbital, which is higher in energy than the 3s orbital holding magnesium's outer electron. 1 mark: the 3p electron is further from the nucleus and is shielded by the 3s electrons, so it experiences weaker attraction to the nucleus and less energy is needed to remove it. Does not score: "aluminium has a bigger atom" alone, or "magnesium has a full 3s subshell which is stable" (stability is not a mark-scheme reason).`,
      ],
    },
    {
      id: 'as-organic',
      name: 'AS organic chemistry (nomenclature and isomerism, alkanes to carboxylic acids, mechanisms, IR and mass spectrometry)',
      share: 'about a third of the AS papers',
      detect: /\b(organic|nomenclature|isomer\w*|structural isomer\w*|stereoisomer\w*|cis[- ]trans|optical|chiral\w*|alkane\w*|alkene\w*|halogenoalkane\w*|haloalkane\w*|alcohol\w*|carbonyl\w*|aldehyde\w*|ketone\w*|carboxylic|ester\w*|mechanism\w*|free[- ]radical|electrophilic addition|nucleophilic substitution|sn1|sn2|hydrolysis|elimination|oxidation of alcohol\w*|tollens|fehling|2,4-dnp|infra-?red|ir spectr\w+|mass spectr\w+|molecular ion|fragmentation|polymer\w*|addition polymer\w*|cracking|combustion)\b/i,
      skills: [
        'Formulae and naming: empirical, molecular, structural, displayed and skeletal formulae; IUPAC names; functional groups; structural, cis-trans and optical isomerism with chiral centres',
        'Alkanes: free-radical substitution (initiation, propagation, termination), combustion, cracking',
        'Alkenes: electrophilic addition (Br₂, HBr, H₂O/steam, H₂), Markovnikov and carbocation stability, oxidation by cold and hot acidified manganate(VII), addition polymerisation',
        'Halogenoalkanes: nucleophilic substitution with OH⁻, CN⁻ and NH₃ (SN1 vs SN2 and the role of the carbocation), elimination with ethanolic KOH, rates of hydrolysis and the C–X bond energy',
        'Alcohols: classification, oxidation of primary alcohols to aldehydes (distil) and carboxylic acids (reflux) and secondary to ketones, dehydration, esterification, the tri-iodomethane test',
        'Carbonyls and carboxylic acids: nucleophilic addition of HCN, reduction with NaBH₄, tests with 2,4-DNPH, Tollens\' and Fehling\'s reagents, esters and their hydrolysis',
        'Analysis: IR absorptions from the data booklet (O–H broad 3200-3600, C=O 1680-1750, C–O), mass spectra: the molecular ion, M+1 and M+2 peaks (Cl, Br), fragmentation patterns',
      ],
      hard: [
        'Deducing a structure from Mr, an IR spectrum and the results of chemical tests given together',
        'Choosing SN1 or SN2 for a given halogenoalkane and justifying it by carbocation stability and steric hindrance',
        'Counting stereoisomers (cis-trans and chiral centres together) in an unfamiliar molecule',
        'Writing the mechanism for an unsymmetrical alkene and explaining the major product',
        'Distinguishing oxidation conditions (distil vs reflux) and predicting the product of each',
      ],
      traps: [
        'the halogenoalkane with the most polar C–X bond read as the fastest to hydrolyse (the weakest bond, C–I, is)',
        'a tertiary alcohol oxidised by acidified dichromate',
        'cis-trans isomerism claimed for an alkene with two identical groups on one carbon',
        'the molecular ion peak confused with the base peak',
        'curly arrows drawn from atoms instead of electron pairs or bonds',
      ],
      exemplars: [
        `MC_QUESTION: Separate samples of four halogenoalkanes are warmed with aqueous silver nitrate in ethanol. Which halogenoalkane gives a precipitate most quickly?
A) 1-chlorobutane
B) 1-bromobutane
C) 1-iodobutane
D) 1-fluorobutane
Correct Answer: C
Explanation: The rate of hydrolysis depends on the strength of the carbon-halogen bond, and C–I is the weakest, so it breaks most readily to release I⁻ and form a yellow precipitate of AgI. Choice D picks the most polar bond, which is the strongest.`,
        `SA_QUESTION: Ethene reacts with bromine at room temperature to form 1,2-dibromoethane. Describe the mechanism of this reaction, naming the type of mechanism. [4]
Sample Answer: 1 mark: electrophilic addition. 1 mark: as the Br₂ molecule approaches the C=C double bond, the electron-rich π bond induces a dipole in Br₂ (Brδ+–Brδ−). 1 mark: a curly arrow from the C=C bond to the Brδ+ atom forms a C–Br bond, with heterolytic fission of the Br–Br bond giving Br⁻ and a carbocation intermediate. 1 mark: a curly arrow from a lone pair on Br⁻ to the positive carbon forms the second C–Br bond. Does not score: "bromine adds across the double bond" alone, or naming it nucleophilic addition.`,
      ],
    },
    {
      id: 'a2-physical',
      name: 'A Level physical and inorganic chemistry (lattice energy, entropy and Gibbs energy, electrochemistry, ionic equilibria, rate equations, transition elements)',
      share: 'about half of Paper 4',
      detect: /\b(lattice (?:energy|enthalpy)|born[- ]haber|enthalpy of (?:hydration|solution|atomisation)|entrop\w+|gibbs|free energy|ΔG|feasib\w+|electrochem\w+|electrode potential\w*|E°|standard cell|fuel cell|electrolysis|faraday|ionic equilibri\w+|Ka\b|pKa|pH\b|buffer\w*|solubility product|Ksp|indicator\w*|rate equation\w*|order of reaction|rate constant|half[- ]life|rate[- ]determining|transition (?:element|metal)\w*|complex\w* ion\w*|ligand\w*|d orbital\w*|colou?r of|stability constant|cis[- ]platin)\b/i,
      skills: [
        'Lattice energy: definitions, Born-Haber cycles, factors (charge and radius), enthalpies of solution and hydration, trends in solubility and thermal stability of Group 2 compounds',
        'Entropy and Gibbs free energy: predicting the sign of ΔS, calculating ΔS and ΔG = ΔH − TΔS, feasibility and the temperature at which a reaction becomes feasible',
        'Electrochemistry: standard electrode potentials and the standard hydrogen electrode, cell diagrams and E°cell, predicting feasibility from E° values and its limits (kinetics, non-standard conditions), the Nernst equation, electrolysis calculations with the Faraday constant',
        'Ionic equilibria: Ka and pKa, pH of strong and weak acids and strong bases (Kw), buffer solutions and their calculations, titration curves and indicator choice, solubility product and the common ion effect',
        'Reaction kinetics: rate equations from initial-rate data, orders from concentration-time graphs (constant half-life for first order), rate constant units, the rate-determining step and proposed mechanisms, the Arrhenius equation',
        'Transition elements: electron configurations of atoms and ions, variable oxidation states, complexes (ligands, coordination number, shapes, stereoisomerism), ligand exchange and stability constants, the origin of colour (d-orbital splitting, absorbed and transmitted light), redox titrations with manganate(VII) and thiosulfate',
      ],
      hard: [
        'A Born-Haber cycle with a Group 2 halide where the second ionisation energy and two electron affinities must be included with the right signs',
        'Finding the temperature at which a reaction becomes feasible from ΔH and ΔS in different units (kJ vs J)',
        'A buffer calculation after adding a small amount of acid or base (the change in moles before the ratio)',
        'Deducing a rate equation and a consistent two-step mechanism from initial-rate data',
        'Explaining why a reaction with positive E°cell does not appear to happen (high activation energy, non-standard concentrations)',
      ],
      traps: [
        'ΔS in J K⁻¹ mol⁻¹ combined with ΔH in kJ mol⁻¹ without converting',
        'the more negative E° read as the better oxidising agent',
        'pH of a weak acid found by treating it as fully dissociated',
        'the colour of a complex given as the colour absorbed',
        'zero order read from a straight-line concentration-time graph as first order',
      ],
      exemplars: [
        `MC_QUESTION: The table gives standard electrode potentials. Which species is the strongest oxidising agent?
\`\`\`graph
kind: table
columns: Electrode reaction | E° / V
row: Cl₂ + 2e⁻ ⇌ 2Cl⁻ | +1.36
row: Br₂ + 2e⁻ ⇌ 2Br⁻ | +1.07
row: Fe³⁺ + e⁻ ⇌ Fe²⁺ | +0.77
row: Zn²⁺ + 2e⁻ ⇌ Zn | −0.76
\`\`\`
A) Cl₂
B) Br⁻
C) Fe²⁺
D) Zn
Correct Answer: A
Explanation: The strongest oxidising agent is the species on the left of the half-equation with the most positive E°, because it is reduced most readily: Cl₂ at +1.36 V. Choice D is the strongest reducing agent.`,
        `NUM_QUESTION: Ethanoic acid has Ka = 1.80 × 10⁻⁵ mol dm⁻³ at 298 K. Calculate the pH of a 0.0500 mol dm⁻³ solution of ethanoic acid, to 2 decimal places. Assume that [H⁺] = [CH₃COO⁻] and that the acid concentration at equilibrium equals the initial concentration.
Answer: 3.02 | 3.0
Explanation: [H⁺] = √(Ka × c) = √(1.80 × 10⁻⁵ × 0.0500) = √(9.00 × 10⁻⁷) = 9.49 × 10⁻⁴ mol dm⁻³, so pH = −log(9.49 × 10⁻⁴) = 3.02.`,
        `SA_QUESTION: Aqueous copper(II) ions, [Cu(H₂O)₆]²⁺, are pale blue. Explain, in terms of d orbitals, why this complex is coloured. [3]
Sample Answer: 1 mark: in the complex the ligands split the five d orbitals into two sets of slightly different energy (the d orbitals are non-degenerate). 1 mark: an electron is promoted from the lower set to the higher set by absorbing light of a frequency in the visible region, since ΔE = hν. 1 mark: the colour seen is the complementary colour of the light absorbed (orange light is absorbed, so the solution appears blue). Does not score: "copper is a transition metal so it is coloured", or saying the d orbitals are full (Cu²⁺ is d⁹; a d¹⁰ ion such as Zn²⁺ is colourless because no d-d transition is possible).`,
      ],
    },
    {
      id: 'a2-organic',
      name: 'A Level organic chemistry and analysis (arenes, phenols, acyl chlorides, nitrogen compounds, polymers, synthesis, NMR and chromatography)',
      share: 'about half of Paper 4',
      detect: /\b(arene\w*|benzene|aromatic|phenol\w*|electrophilic substitution|nitration|friedel|acyl chloride\w*|acylation|amine\w*|amide\w*|amino acid\w*|zwitterion\w*|peptide\w*|protein\w*|nitrile\w*|diazo\w*|azo dye\w*|condensation polymer\w*|polyester\w*|polyamide\w*|nylon|kevlar|synthe(?:sis|tic route)|retrosynthe\w+|nmr|chemical shift|splitting pattern|TMS|carbon-13|proton nmr|chromatograph\w+|Rf|paper chromatography|GC|HPLC|electrophoresis|carbonyl\w* (?:A level|advanced))\b/i,
      skills: [
        'Arenes: the delocalised structure of benzene and evidence for it, electrophilic substitution (nitration with the NO₂⁺ electrophile, halogenation with a halogen carrier, Friedel-Crafts alkylation and acylation), directing effects of substituents, side-chain oxidation',
        'Phenols: acidity compared with alcohols and carboxylic acids, reaction with bases and sodium, bromination without a catalyst and why the ring is activated',
        'Carboxylic acids and derivatives: relative acidity and the inductive effect, acyl chlorides with water, alcohols, ammonia and amines (addition-elimination), esters and their hydrolysis',
        'Nitrogen compounds: basicity of amines compared (aliphatic, ammonia, aromatic), preparation of amines (reduction of nitriles and nitrobenzene), amides, amino acids and zwitterions, peptides and hydrolysis, azo dyes from diazonium salts',
        'Polymerisation: addition vs condensation polymers (polyesters, polyamides), identifying monomers from a repeat unit, degradable polymers',
        'Organic synthesis: multi-step routes with reagents and conditions, identifying functional groups from tests, stereochemistry in synthesis',
        'Analytical techniques: carbon-13 NMR (number of environments), proton NMR (chemical shift, integration, splitting by the n+1 rule, D₂O exchange), thin-layer and gas chromatography and Rf values, electrophoresis of amino acids',
      ],
      hard: [
        'Deducing a structure from a proton NMR spectrum given shifts, integration ratios and splitting patterns together',
        'A three-step synthesis where the order of steps matters (nitrate before alkylate, protect a group) with reagents and conditions for each',
        'Explaining the order of basicity of phenylamine, ammonia and ethylamine by the availability of the nitrogen lone pair',
        'Identifying the monomers of a condensation polymer from a repeat unit with two different linkages',
        'Predicting the product of an electrophilic substitution on a disubstituted benzene using directing effects',
      ],
      traps: [
        'phenol said to react with sodium carbonate like a carboxylic acid',
        'the number of ¹³C peaks counted as the number of carbon atoms rather than environments',
        'a splitting pattern read as the number of protons on the carbon itself rather than on neighbouring carbons',
        'phenylamine called a stronger base than ammonia',
        'addition polymer monomers drawn from a polyester repeat unit',
      ],
      exemplars: [
        `MC_QUESTION: How many peaks are present in the carbon-13 NMR spectrum of propan-2-ol, CH₃CH(OH)CH₃?
A) 1
B) 2
C) 3
D) 4
Correct Answer: B
Explanation: The two CH₃ carbons are equivalent by symmetry, so there are two carbon environments: the CH₃ carbons and the CH(OH) carbon. Choice C counts atoms rather than environments.`,
        `SA_QUESTION: Ethyl ethanoate can be made from ethanol in two steps. Give the reagents and conditions for each step and name the type of reaction in each. [4]
Sample Answer: Step 1 (1 mark reagents and conditions, 1 mark type): heat ethanol under reflux with acidified potassium dichromate(VI) (K₂Cr₂O₇ with dilute H₂SO₄) to form ethanoic acid; oxidation. Step 2 (1 mark, 1 mark): heat ethanoic acid with ethanol and a few drops of concentrated sulfuric acid as catalyst to form ethyl ethanoate; esterification (condensation). Also credited: using acidified KMnO₄ in step 1; "reflux" is required for the acid (distillation gives ethanal). Does not score: "oxidise ethanol" with no oxidising agent named, or a catalyst omitted in step 2.`,
      ],
    },
  ],
  difficulty: AICE_DIFFICULTY,
}
