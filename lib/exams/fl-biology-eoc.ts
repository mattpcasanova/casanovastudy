// The Florida Biology 1 End-of-Course assessment (NGSSS) as a reference for
// the guide prompts. Computer-based, untimed (no pace), four-option multiple
// choice only. The three reporting categories plus Nature of Science (which
// the test folds into the others) are the four domains.

import type { ExamProfile } from './types'

export const FL_BIOLOGY_EOC: ExamProfile = {
  id: 'fl-biology-eoc',
  name: 'the Florida Biology 1 EOC',
  detect: {
    exam: /\bBiology\s*(?:1|I)?\b.*\bEOC\b|\bEOC\b.*\bBiology\b|\bBiology\s+(?:end[- ]of[- ]course|state (?:test|exam))\b/i,
    subjectHints: /./,
    subjects: ['science'],
    explicit: /\bBiology\s*(?:1|I)?\b.*\bEOC\b|\bEOC\b.*\bBiology\b|\bBiology\s+(?:end[- ]of[- ]course|state (?:test|exam))\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly four options A-D, as on the test, which is multiple choice only. No true/false, no "I, II and III" lists, no NUM_QUESTION. Up to a quarter of the items may be SA_QUESTION written as a lab-analysis prompt ("Describe how the student could improve the experiment", "Explain how the data support the conclusion"), with the Sample Answer as the statement a scorer would credit.
- Most items sit on a stimulus, as the test's do: a described experiment or scenario in a \`\`\`passage fence ("A student places potato cores in four salt solutions..."), a data table (kind: table), a graph (kind: bar or kind: plane), a Punnett square (kind: punnett, with "ratios: hide" when the ratio is asked), a pedigree (kind: pedigree) or a described diagram. Put the stimulus directly under the question line.
- Stems are the test's: "Which statement best describes...", "Which of the following is the most likely result...", "Based on the data, which conclusion is supported?", "Which process is represented by the diagram?", "The student's hypothesis is best supported by which observation?", "Which factor is the independent variable in this experiment?". Options are four parallel statements of the same length; the wrong ones are the misconceptions under WRONG ANSWERS ARE BUILT FROM, not nonsense.
- Items test the benchmark, not vocabulary alone: a question about osmosis gives a situation and asks for the direction of water movement, not the definition. Every item must be answerable from the stimulus plus Biology 1 content.
- Before writing the key, check that exactly one option is correct for the stimulus and that each wrong option is wrong for a nameable reason. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the biology that decides it and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'molecular-cellular',
      name: 'Molecular and cellular biology (SC.912.L.14, L.16, L.18)',
      share: 'about 35% of the test',
      detect: /\b(cell theory|organelle\w*|nucleus|mitochondri\w*|chloroplast\w*|ribosome\w*|membrane\w*|osmosis|diffusion|active transport|hypotonic|hypertonic|isotonic|enzyme\w*|substrate|activation energy|photosynthesis|respiration|ATP|glycolysis|fermentation|DNA|RNA|replication|transcription|translation|codon|protein synthesis|mitosis|meiosis|cell cycle|chromosome\w*|biotechnolog\w*|gel electrophoresis|PCR|cloning|GMO|macromolecule\w*|carbohydrate\w*|lipid\w*|nucleic acid\w*|water propert\w*)\b/i,
      skills: [
        'Cell theory and the organelles of plant, animal and bacterial cells matched to their functions; the cell membrane and passive vs active transport, osmosis in hypotonic, hypertonic and isotonic solutions',
        'Macromolecules and their monomers, the properties of water, and enzymes: specificity, activation energy, effects of temperature and pH on reaction rate',
        'Photosynthesis and cellular respiration as connected processes (reactants, products, where they happen, aerobic vs anaerobic) and ATP as the energy currency',
        'DNA structure and replication, transcription and translation (reading a codon chart), mutations, the cell cycle, mitosis vs meiosis, and biotechnology (gel electrophoresis, PCR, genetic engineering, cloning) with its uses and concerns',
      ],
      hard: [
        'Osmosis items that give solute concentrations inside and outside the cell and ask what happens to the cell',
        'An enzyme graph (rate vs temperature) where the student must explain the drop as denaturation, not "less enzyme"',
        'Connecting photosynthesis and respiration in one item (the product of one as the reactant of the other) in a sealed system',
        'A codon chart item where a point mutation changes or does not change the amino acid',
      ],
      traps: ['water moving toward lower solute concentration', 'enzymes used up in a reaction', 'plants doing only photosynthesis and not respiration', 'mitosis producing genetically different cells'],
      exemplars: [
        `MC_QUESTION: A student places a red blood cell in a solution with a higher salt concentration than the inside of the cell. Which statement best describes what happens to the cell?
A) Water moves into the cell, and the cell swells and may burst.
B) Water moves out of the cell, and the cell shrinks.
C) Salt moves into the cell by osmosis, and the cell stays the same size.
D) Salt moves out of the cell by active transport, and the cell swells.
Correct Answer: B
Explanation: The solution is hypertonic to the cell, so water leaves the cell by osmosis toward the higher solute concentration and the cell shrinks. Osmosis moves water, not salt (choices C and D).`,
        `MC_QUESTION: The graph shows the rate of a reaction controlled by a human enzyme at different temperatures. Which statement best explains the shape of the graph above 40°C?
\`\`\`graph
kind: bar
title: Reaction rate at different temperatures (illustrative)
x-label: Temperature (°C)
y-label: Rate (relative)
bar: 10 | 2
bar: 20 | 4
bar: 30 | 7
bar: 37 | 10
bar: 45 | 4
bar: 55 | 1
\`\`\`
A) The enzyme is used up by the reaction at high temperatures.
B) The substrate molecules move too fast to bind to the enzyme.
C) The enzyme's shape changes, so the substrate no longer fits the active site.
D) High temperatures increase the activation energy of the reaction.
Correct Answer: C
Explanation: Above its optimum, the enzyme denatures: its shape, including the active site, changes, so the substrate no longer fits. Enzymes are not consumed (choice A), and they lower activation energy rather than raise it.`,
      ],
    },
    {
      id: 'heredity-evolution',
      name: 'Classification, heredity and evolution (SC.912.L.15, L.16)',
      share: 'about 25% of the test',
      detect: /\b(punnett|pedigree\w*|genotype\w*|phenotype\w*|allele\w*|dominant|recessive|heterozygous|homozygous|codominan\w*|incomplete dominance|sex[- ]linked|X[- ]linked|dihybrid|monohybrid|mutation\w*|natural selection|evolution\w*|adaptation\w*|fitness|speciation|fossil\w*|homologous|vestigial|embryolog\w*|common ancestor|cladogram\w*|phylogen\w*|classification|taxonom\w*|domain\w*|kingdom\w*|binomial|hominid\w*|human evolution|gene flow|genetic drift)\b/i,
      skills: [
        'Mendelian crosses with Punnett squares (monohybrid and dihybrid), probability of a genotype or phenotype, incomplete dominance, codominance (blood types) and sex-linked traits; reading a pedigree for a trait\'s inheritance pattern',
        'Mutations (point, frameshift, chromosomal) and their effects; sources of variation including meiosis and crossing over',
        'Natural selection (variation, overproduction, competition, differential survival and reproduction) and the evidence for evolution: fossils, homologous and vestigial structures, embryology, DNA comparisons; speciation, gene flow and genetic drift',
        'Classification: the three domains and six kingdoms, binomial nomenclature, dichotomous keys and cladograms (shared derived characters, closest relatives), and the trends in human evolution (bipedalism, brain size, tool use)',
      ],
      hard: [
        'A pedigree where the student must decide between autosomal recessive and X-linked recessive from which parents produce an affected daughter',
        'A cladogram read for the most recent common ancestor, where the branch order is not the order of appearance on the page',
        'Natural selection in a described population (antibiotic resistance, peppered moths) where the wrong options describe individuals changing',
        'A dihybrid cross asking for the fraction with one specific phenotype combination',
      ],
      traps: ['individuals adapting during their lifetime', 'a cladogram\'s left-to-right order read as a line of descent', 'an affected daughter being possible with an X-linked recessive trait and an unaffected father', 'dominant read as more common'],
      exemplars: [
        `MC_QUESTION: In humans, the allele for normal color vision (X^C) is dominant to the allele for red-green color blindness (X^c). A woman who is a carrier has children with a man who has normal color vision. What is the probability that a son will be color-blind?
\`\`\`graph
kind: punnett
cross: XCXc x XCY
dominant: normal color vision
recessive: red-green color blindness
ratios: hide
\`\`\`
A) 0%
B) 25%
C) 50%
D) 100%
Correct Answer: C
Explanation: Sons get their X chromosome from their mother, who passes X^c half the time, so half of sons are color-blind. Choice B is the chance for all children combined (1 of 4 boxes).`,
        `MC_QUESTION: A population of bacteria is exposed to an antibiotic. A few bacteria survive, reproduce, and within weeks most of the population is resistant. Which statement best explains this change?
A) Individual bacteria changed their DNA to resist the antibiotic after exposure.
B) Bacteria that already carried a resistance mutation survived and reproduced, passing it on.
C) The antibiotic caused the bacteria to need resistance, so they developed it.
D) The bacteria learned to avoid the antibiotic and taught their offspring.
Correct Answer: B
Explanation: Natural selection acts on variation that already exists: the resistant few survived and reproduced. Choices A and C describe individuals changing in response to need, which is the common misconception.`,
      ],
    },
    {
      id: 'organisms-ecosystems',
      name: 'Organisms, populations and ecosystems (SC.912.L.14, L.17, L.18)',
      share: 'about 30% of the test',
      detect: /\b(ecosystem\w*|food (?:web|chain)|trophic|energy pyramid|producer\w*|consumer\w*|decomposer\w*|biomass|carbon cycle|nitrogen cycle|water cycle|carrying capacity|limiting factor\w*|population growth|exponential|logistic|predat\w*|symbio\w*|succession|biodiversity|invasive|habitat|climate change|human impact|pollution|eutrophication|homeostasis|feedback|body system\w*|circulatory|respiratory system|digestive|nervous system|immune|antibod\w*|vaccine\w*|pathogen\w*|plant (?:tissue|structure|hormone)\w*|xylem|phloem|stomata|organ system|biome\w*)\b/i,
      skills: [
        'Levels of organization, biomes, and energy flow: food chains and webs, trophic levels, the 10% rule and energy pyramids; the carbon, nitrogen and water cycles',
        'Population dynamics: exponential and logistic growth, carrying capacity, limiting factors, predator-prey cycles, succession, and relationships (mutualism, commensalism, parasitism, competition)',
        'Human impact: pollution, habitat loss, invasive species, eutrophication, climate change, and biodiversity as a measure of ecosystem health',
        'Human body systems working together to maintain homeostasis (feedback loops: temperature, blood glucose), the immune response (antibodies, vaccines, pathogens), and plant structures and transport (xylem, phloem, stomata, tropisms)',
      ],
      hard: [
        'A food web item where removing one species has an effect two links away',
        'A population graph where the student must identify the carrying capacity and the limiting factor from the shape',
        'An energy pyramid item asking how much energy reaches the third level from a given amount at the base',
        'A homeostasis item where a feedback loop must be traced (insulin after a meal) to predict the response',
      ],
      traps: ['energy recycled through an ecosystem like matter', 'a predator\'s removal reducing the prey population', 'a vaccine curing an infection', 'xylem carrying sugars'],
      exemplars: [
        `MC_QUESTION: In a grassland ecosystem, producers store 20,000 kilocalories of energy per square meter per year. Based on the typical transfer of energy between trophic levels, how much energy is available to the secondary consumers?
A) 20,000 kilocalories
B) 2,000 kilocalories
C) 200 kilocalories
D) 20 kilocalories
Correct Answer: C
Explanation: About 10% passes to each level: 2,000 to primary consumers, then 200 to secondary consumers. Choice B is the primary consumers' share.`,
        `SA_QUESTION: A lake near a farm develops a thick layer of algae each summer, and fish begin dying. Explain how fertilizer from the farm could cause the fish to die.
Sample Answer: Scorers credit the chain: fertilizer runoff adds nitrogen and phosphorus to the lake (1), which causes algae to grow rapidly, an algal bloom (1); when the algae die, decomposers break them down and use up the dissolved oxygen (1); fish die from the low oxygen (1). "The fertilizer poisons the fish" or "algae block the light so fish die" without the oxygen step earns at most one point.`,
      ],
    },
    {
      id: 'nature-of-science',
      name: 'Nature of science (SC.912.N.1, N.2, N.3)',
      share: 'woven through every reporting category',
      detect: /\b(experiment\w*|hypothesis|hypotheses|independent variable|dependent variable|control(?:led)? (?:group|variable)|constant\w*|repeated trials|sample size|data|conclusion\w*|valid\w*|reliab\w*|scientific (?:theory|law|method)|theory|law\b|peer review|bias|observation\w*|inference\w*|model\w*)\b/i,
      skills: [
        'Experimental design: identifying the independent, dependent and controlled variables and the control group; why repeated trials and larger samples matter; what makes a conclusion valid',
        'Reading data tables and graphs: trends, which conclusion the data support and which claims go beyond the data',
        'The difference between a scientific theory (a well-supported explanation) and a scientific law (a description of a pattern), and why theories change with new evidence',
        'Science as a human endeavor: peer review, replication, bias, and the limits of science (what questions it can and cannot answer)',
      ],
      hard: [
        'Picking the one conclusion the data support when three options are true statements the data do not test',
        'Identifying a design flaw (two variables changed at once, no control group) in a described experiment',
        'A theory-vs-law item where the wrong options say a theory becomes a law with more evidence',
      ],
      traps: ['a theory promoted to a law when proven', 'the control group confused with controlled variables', 'a conclusion about cause from a correlation', 'a single trial treated as sufficient'],
      exemplars: [
        `MC_QUESTION: A student tests whether the amount of light affects how fast radish seeds sprout. She places 10 seeds in each of four trays under 0, 4, 8 and 12 hours of light per day, keeps the water and temperature the same, and records the day each seed sprouts. Which is the dependent variable in this experiment?
\`\`\`passage
Trays: 10 radish seeds each
Light: 0, 4, 8 or 12 hours per day
Kept the same: water, temperature, soil
Recorded: the day each seed sprouts
\`\`\`
A) The number of hours of light per day
B) The number of seeds in each tray
C) The day each seed sprouts
D) The temperature of the room
Correct Answer: C
Explanation: The dependent variable is what is measured in response to the change: the sprouting day. Hours of light is the independent variable, and seeds, water and temperature are held constant.`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real spread across achievement levels, minus the Level 1-2 items (a definition, one value read off a table). At most 1 item in 8 that easy, never first in a section; about half at Level 3 (one concept applied to a described situation) and at least a third at Level 4-5 (data that must be interpreted before the question, a process traced two steps, a design flaw to spot, a misconception the options are built on).`,
    hard: `DIFFICULTY ON THIS TEST: Level 4-5 items. At least 4 of every 5 items must be ones a Level 3 student would miss: osmosis with concentrations given, pedigrees that distinguish inheritance patterns, cladograms read for common ancestors, food webs with indirect effects, feedback loops traced to a prediction, conclusions chosen against three true-but-unsupported statements. Hard never means content outside the Biology 1 benchmarks.`,
    easier: `DIFFICULTY ON THIS TEST: the Level 2-3 items most students get right: one concept, a plain stimulus, options that differ clearly. Still real test items in the test's voice.`,
  },
}
