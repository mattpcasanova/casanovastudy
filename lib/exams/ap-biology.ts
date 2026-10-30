// The AP Biology exam as a reference for the guide prompts: Section I
// multiple choice (four options, mostly in sets around data, a figure or an
// experiment) and Section II free response (describe / explain / predict /
// justify, scored by points). Units 1-8 grouped into four domains.

import type { ExamProfile } from './types'

export const AP_BIOLOGY: ExamProfile = {
  id: 'ap-biology',
  pace: 90,
  name: 'the AP Biology exam',
  detect: {
    exam: /\bAP\s+bio(?:logy)?\b/i,
    subjectHints: /./,
    subjects: ['biology', 'science'],
    explicit: /\bAP\s+bio(?:logy)?\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly four options A-D, as on Section I. Most are built on a stimulus: an experiment described in 2-4 sentences, a data table or graph, a diagram described in words (a pathway, a pedigree, a cladogram), with the question asking for the best explanation, prediction, claim, or the evidence that supports it. Items that share a stimulus each repeat it in their own \`\`\`passage fence or figure block, so every item stands alone. No true/false, no "I, II and III" lists.
- Free-response items are SA_QUESTION, one per part, written with the exam's task verbs: "Describe ...", "Explain how ...", "Predict ... and justify your prediction.", "Identify the independent variable ...", "Construct a graph ... (describe what you would plot)", "Make a claim ... and support it with evidence from the data.", "Calculate ... (chi-square, Hardy-Weinberg, rate, percent change)". The part states what the student must use (the data in the table, the model described).
- The Sample Answer for an SA_QUESTION is the scoring guideline: the specific statement that earns each point, e.g. "1 point: states that the mutation changes the shape of the active site; 1 point: explains that the substrate can no longer bind, so the rate decreases." Calculations show the setup and the value.
- A calculation as a multiple-choice item has four numeric options, as on Section I (the wrong ones from a skipped step, a wrong sign or a wrong factor). NUM_QUESTION is only for a free-response calculation part whose answer is one number (give the value to the exam's precision; alternates with |); keep it to at most one in six items.
- Explanations and justifications use the biology at the right level: molecules and mechanisms (receptor binding, concentration gradients, selective pressure on existing variation), never teleology ("the organism wanted to adapt") or "because it needs to".
- Options for conceptual items are four parallel statements of similar length; the wrong ones are the misconceptions under WRONG ANSWERS ARE BUILT FROM. Data come in a figure block (a table, a bar graph with error bars described in the caption, a line graph) and every value the answer needs is there.
- Before writing an item's answer, work it from the stimulus and check that exactly one option (or one sample answer) is right. If the data do not support a single answer, change the data. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the mechanism, and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'cells',
      name: 'Chemistry of Life, Cells and Energetics (Units 1-3)',
      share: 'about 28-35% of the test',
      detect: /\b(unit [123]\b|chemistry of life|water|hydrogen bond|macromolecule|protein|carbohydrate|lipid|nucleic acid|enzyme|active site|activation energy|inhibit\w+|denatur\w+|cell structure|organelle|membrane|phospholipid|transport|osmosis|diffusion|water potential|surface area|compartmentaliz\w+|endosymbio\w+|cellular energetics|photosynthesis|cellular respiration|ATP|electron transport|chemiosmosis|fermentation|calvin|light reaction|glycolysis|krebs|citric acid)\b/i,
      skills: [
        'Properties of water and the structure and function of macromolecules; enzymes: active sites, activation energy, effects of temperature, pH, substrate concentration and inhibitors on rate',
        'Cell structure and the membrane: selective permeability, passive and active transport, osmosis and water potential, surface-area-to-volume ratio, compartmentalization and the endosymbiotic theory',
        'Cellular energetics: photosynthesis (light reactions and the Calvin cycle, where each occurs and what each needs) and cellular respiration (glycolysis, the citric acid cycle, the electron transport chain and chemiosmosis), fermentation, and the experiments that measure them',
      ],
      hard: [
        'An enzyme rate graph with a competitive vs noncompetitive inhibitor, or a mutation at the active site vs away from it, explained by shape and binding',
        'A water potential calculation (ψ = ψs + ψp, ψs = -iCRT) followed by the direction of water movement',
        'Predicting the effect of an uncoupler or a blocked electron carrier on the proton gradient and ATP yield',
        'A respiration experiment (respirometer, dye reduction) where the right variable must be read as the rate',
        'Surface-area-to-volume reasoning applied to a cell that doubles in size',
      ],
      traps: ['"the enzyme is used up"', 'water moving toward the lower solute concentration', 'ATP made directly by the electron transport chain rather than by chemiosmosis', 'oxygen as a reactant of glycolysis', 'light reactions "need dark" or the Calvin cycle "needs light directly"'],
      exemplars: [
        `MC_QUESTION: A student measures the rate of an enzyme-catalyzed reaction at increasing substrate concentrations, first without an inhibitor and then with a fixed amount of a competitive inhibitor. Which of the following best describes the results at very high substrate concentrations?
A) The rate with the inhibitor approaches the rate without it, because excess substrate outcompetes the inhibitor for the active site.
B) The rate with the inhibitor stays at about half the uninhibited rate, because the inhibitor permanently changes the shape of the active site.
C) The rate with the inhibitor falls to zero, because the inhibitor is used up.
D) Both rates keep rising without limit, because more substrate always produces more product.
Correct Answer: A
Explanation: A competitive inhibitor binds the active site reversibly, so a large excess of substrate makes inhibitor binding rare. B describes a noncompetitive inhibitor; D ignores enzyme saturation.`,
        `SA_QUESTION: A plant cell with a solute potential of -0.8 MPa and a pressure potential of 0.3 MPa is placed in a solution with a water potential of -0.2 MPa. Calculate the water potential of the cell, predict the direction of net water movement, and justify your prediction.
Sample Answer: ψ(cell) = ψs + ψp = -0.8 + 0.3 = -0.5 MPa (1 point). Water moves from higher to lower water potential, so net movement is from the solution (-0.2 MPa) into the cell (-0.5 MPa) (1 point for the direction with the justification in terms of water potential). The cell's pressure potential would rise as it takes up water (accepted as further justification).`,
      ],
    },
    {
      id: 'signaling',
      name: 'Cell Communication, Cell Cycle, Heredity and Gene Expression (Units 4-6)',
      share: 'about 27-33% of the test',
      detect: /\b(unit [456]\b|cell communication|signal\w*|receptor|ligand|second messenger|feedback|homeostasis|cell cycle|mitosis|meiosis|checkpoint|cyclin|apoptosis|heredity|mendel\w*|punnett|dihybrid|linked genes|recombination|chi[- ]square|pedigree|sex[- ]linked|x[- ]linked|nondisjunction|gene expression|transcription|translation|DNA replication|mutation|operon|promoter|regulat\w+|epigenetic|biotechnology|PCR|gel electrophoresis|plasmid|CRISPR)\b/i,
      skills: [
        'Cell signaling: receptors and ligands, signal transduction and second messengers, how a change in the pathway changes the response; feedback loops and homeostasis',
        'The cell cycle and its checkpoints, mitosis and meiosis (what each produces, crossing over and independent assortment as sources of variation), nondisjunction',
        'Heredity: Mendelian ratios, dihybrid crosses, linked genes and recombination frequency, sex-linked traits, pedigrees, chi-square goodness of fit for a predicted ratio (with degrees of freedom and the critical value)',
        'Gene expression: replication, transcription, translation, the effects of mutations (silent, missense, nonsense, frameshift), regulation (operons, promoters, transcription factors, epigenetics), and biotechnology tools (PCR, gel electrophoresis, plasmids)',
      ],
      hard: [
        'Predicting the effect of a mutation in a receptor or in a step of a transduction pathway on the final response (a constitutively active kinase, a lost phosphatase)',
        'A chi-square test on observed offspring counts against a 9:3:3:1 or 3:1 expectation, with the right degrees of freedom and a conclusion about the hypothesis',
        'Telling linked from unlinked genes from a testcross, and computing recombination frequency',
        'Why a mutation in a promoter changes the amount of protein while a frameshift changes the protein itself',
        'Reading a pedigree to decide dominant vs recessive and autosomal vs X-linked from the carriers',
      ],
      traps: ['a chi-square value compared against the wrong degrees of freedom', 'recombination frequency above 50%', 'a dominant allele assumed to be more common', 'a mutation in a gene assumed to change the protein (silent mutations)', 'the lac operon described as always on'],
      exemplars: [
        `MC_QUESTION: In a signaling pathway, a hormone binds a membrane receptor, which activates a G protein that activates adenylyl cyclase to produce cAMP; cAMP activates protein kinase A, which triggers the response. A mutation causes the G protein to remain active even without the hormone. Which of the following best predicts the effect of the mutation?
A) The response occurs only when the hormone is present, because the receptor is unchanged.
B) The response occurs continuously, even in the absence of the hormone.
C) No response occurs, because cAMP cannot be produced without hormone binding.
D) The response is reduced, because the active G protein uses up the cell's ATP.
Correct Answer: B
Explanation: The G protein is downstream of the receptor; if it is always active, the rest of the pathway runs regardless of the hormone. A ignores that the receptor's step is bypassed.`,
        `NUM_QUESTION: A cross between two heterozygous pea plants (Tt × Tt) produces 180 offspring: 125 tall and 55 short. Calculate the chi-square value for the hypothesis that the trait follows a 3:1 ratio. Round to two decimal places.
Answer: 2.96 | 2.9 | 3.0
Explanation: Expected counts are 135 tall and 45 short. χ² = (125 - 135)²/135 + (55 - 45)²/45 = 0.74 + 2.22 = 2.96, which is less than the critical value of 3.84 for 1 degree of freedom, so the 3:1 hypothesis is not rejected.`,
      ],
    },
    {
      id: 'evolution',
      name: 'Natural Selection (Unit 7)',
      share: 'about 13-20% of the test',
      detect: /\b(unit 7\b|natural selection|evolution\w*|fitness|adaptation|artificial selection|genetic drift|bottleneck|founder effect|gene flow|hardy[- ]weinberg|allele frequenc\w+|speciation|reproductive isolation|cladogram|phylogen\w+|common ancest\w+|homolog\w+|convergent|vestigial|extinction|origin of life)\b/i,
      skills: [
        'Natural selection acting on existing heritable variation; fitness as reproductive success; types of selection; artificial selection; genetic drift, bottlenecks and founder effects; gene flow',
        'Hardy-Weinberg: calculating allele and genotype frequencies, the conditions, and using a change in frequencies as evidence of evolution',
        'Evidence for evolution (homologies, fossils, molecular data), phylogenetic trees and cladograms (reading shared derived characters and common ancestors), speciation and reproductive isolation, extinction',
      ],
      hard: [
        'A Hardy-Weinberg problem that starts from the frequency of the recessive phenotype and asks for the heterozygote frequency or the number of carriers',
        'Explaining a change in a population without teleology: variation existed, the environment favored one variant, its alleles increased over generations',
        'Reading which two taxa are most closely related on a cladogram (the most recent common ancestor), not the ones drawn next to each other',
        'Distinguishing genetic drift from selection in a small population\'s data',
      ],
      traps: ['"organisms adapted because they needed to"', 'mutations arising in response to the environment', 'p taken as the dominant phenotype frequency', 'taxa adjacent on a cladogram assumed to be closest relatives', 'drift called selection'],
      exemplars: [
        `NUM_QUESTION: In a population of 2,000 plants in Hardy-Weinberg equilibrium, 160 plants have white flowers, a recessive trait. How many plants in the population are expected to be heterozygous for flower color? Round to the nearest whole number.
Answer: 811 | 810 | 812
Explanation: q² = 160/2,000 = 0.08, so q = 0.283 and p = 0.717. Then 2pq = 2(0.717)(0.283) = 0.406, and 0.406 × 2,000 ≈ 811. Using 0.08 as q (instead of q²) is the trap.`,
        `MC_QUESTION: On an island, a population of lizards shows a range of leg lengths. After a hurricane, the island's vegetation becomes dominated by narrow twigs rather than broad branches, and over 20 years the average leg length in the population decreases. Which of the following best explains this change?
A) Lizards grew shorter legs during their lifetimes to move better on twigs, and passed the shorter legs to their offspring.
B) Lizards with shorter legs, which already existed in the population, survived and reproduced more on narrow twigs, so the alleles for shorter legs became more common.
C) The hurricane caused mutations for shorter legs, which spread because the lizards needed them.
D) The population's leg length changed by genetic drift, because the island population is small.
Correct Answer: B
Explanation: Selection acts on variation that already exists; the environment changed which variants left more offspring. A and C are the acquired-trait and need-driven misconceptions, and D names a random process for a directional change that matches the new environment.`,
      ],
    },
    {
      id: 'ecology',
      name: 'Ecology (Unit 8)',
      share: 'about 10-15% of the test',
      detect: /\b(unit 8\b|ecolog\w+|population (?:growth|density|size)|carrying capacity|logistic|exponential growth|r[- ]selected|k[- ]selected|predator|prey|competition|niche|symbio\w+|mutualism|community|biodiversity|keystone|trophic|food web|energy flow|10 ?%|biomass|biogeochemical|carbon cycle|nitrogen cycle|ecosystem|disturbance|succession|invasive|behavior|innate|learned)\b/i,
      skills: [
        'Responses to the environment and behavior (innate, learned, signaling); energy flow through trophic levels and the roughly 10% transfer; biogeochemical cycles',
        'Population ecology: exponential and logistic growth, carrying capacity, density-dependent and density-independent factors, reading growth curves',
        'Community ecology: niches, competition, predation, symbioses, keystone species, biodiversity and resilience, succession, invasive species, human impacts',
      ],
      hard: [
        'Predicting a population\'s growth from a logistic curve when the carrying capacity changes, in terms of births and deaths',
        'A keystone-removal item where the data show indirect effects two trophic levels away',
        'Energy budget calculations across trophic levels with losses at each step',
      ],
      traps: ['carrying capacity as a fixed property of the species rather than the environment', 'energy "cycling" instead of flowing', 'competition assumed to eliminate one species in every case'],
      exemplars: [
        `MC_QUESTION: A population of deer on an island grew rapidly for 10 years, then leveled off near 800 individuals. In year 15, a drought reduced the island's vegetation by half for several years. Which of the following best predicts the population's response and its cause?
A) The population will stay near 800, because carrying capacity is a fixed property of deer.
B) The population will decline toward a new, lower carrying capacity, because food limitation raises the death rate and lowers the birth rate.
C) The population will grow exponentially again, because the drought removes predators.
D) The population will drop to zero, because density-independent factors always cause extinction.
Correct Answer: B
Explanation: Carrying capacity depends on resources; less vegetation means fewer deer can be supported, through density-dependent changes in births and deaths. A states the misconception the item tests.`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the recall items (a definition, naming a structure). At most 1 item in 8 that easy, never first in a section; about half typical (one mechanism applied to a scenario or data) and at least a third of the kind under WHAT HARD LOOKS LIKE. Free-response parts should need a mechanism, not a term.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 4 from a 5. At least 4 of every 5 items must be ones a student headed for a 3 would miss: predictions from a changed step in a pathway, data where the obvious read is wrong, calculations with a step to set up (chi-square, Hardy-Weinberg from a phenotype, water potential), justifications that must name the mechanism and avoid teleology, and experimental-design parts with controls and variables identified. Hard never means content outside the course framework.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one mechanism each, in the exam's voice, with the scenario stated plainly. Still real exam items.`,
  },
}
