// The Cambridge International AS & A Level Biology exam (9700; AICE Biology
// in Florida) as a reference for the guide prompts: Paper 1 multiple choice
// (40 items, four options), Papers 2 and 4 structured questions with command
// words and marks in brackets, Paper 3 practical and Paper 5 planning and
// analysis. AS and A Level topics grouped into four domains.

import type { ExamProfile } from './types'
import { AICE_DIFFICULTY, AICE_ITEM_RULES } from './aice'

const PROGRAMME = String.raw`(?:AICE|Cambridge|(?:AS|A)[- ]?Level)`
const SUBJECT = String.raw`Bio(?:logy)?`
const EXAM = new RegExp(String.raw`\b${PROGRAMME}\b[^.\n]{0,40}\b${SUBJECT}\b|\bBiology\b[^.\n]{0,40}\b${PROGRAMME}\b`, 'i')

export const AICE_BIOLOGY: ExamProfile = {
  id: 'aice-biology',
  pace: 112,
  name: 'the Cambridge AS & A Level Biology exam (AICE Biology, 9700)',
  detect: {
    exam: EXAM,
    subjectHints: /./,
    subjects: ['science'],
    explicit: EXAM,
  },
  itemRules: AICE_ITEM_RULES('the Cambridge AS & A Level Biology exam', {
    mcq: true,
    structured: 'Parts are mostly 1-4 marks, with "explain" parts of 3-4 marks; Paper 4 adds a 9-10 mark essay-style part marked by points.',
    extra: [
      `- Calculations use the formulae the papers give or expect: magnification = image size / actual size (with unit conversion, 1 mm = 1000 µm); Simpson's index of diversity D = 1 - Σ(n/N)²; chi-squared χ² = Σ((O - E)² / E) with the degrees of freedom and the critical value at p = 0.05 given in the stem; the Hardy-Weinberg equations p + q = 1 and p² + 2pq + q² = 1; percentage change; rate from a graph. Numbers divide cleanly. Show the working in the Sample Answer with the method mark and the answer mark separate.`,
      `- "Explain" parts are marked for the mechanism in the syllabus's words: cohesion-tension and the transpiration pull; the Bohr shift (higher carbon dioxide lowers haemoglobin's affinity, so more oxygen is unloaded); complementary base pairing; the induced-fit model; oxidative phosphorylation and chemiosmosis; the light-dependent and light-independent stages; the counter-current multiplier in the loop of Henle; resting and action potentials. A mark scheme line names the term and the step it refers to.`,
      `- Paper 5 planning parts ask for a method: "Describe how you would investigate ... Your plan should include the independent and dependent variables, the variables you would standardise and how, a control, and how you would make your results reliable. [6-8]" The Sample Answer lists the marking points (named variables, a range of at least five values of the independent variable, how the dependent variable is measured, two standardised variables with how, a control, repeats and a mean, a risk) and the statistical test that fits the data (t-test for two means, chi-squared for categories, Spearman's or Pearson's for correlation), with why.`,
      `- Micrographs are described in words ("The electron micrograph shows a cell with many mitochondria and an extensive rough endoplasmic reticulum") since the paper's image cannot be shown.`,
    ],
  }),
  domains: [
    {
      id: 'cells-molecules',
      name: 'AS: cells, biological molecules, enzymes, membranes, the cell cycle and nucleic acids',
      share: 'about a quarter of the test',
      detect: /\b(cell structure|organelle\w*|mitochondri\w+|chloroplast\w*|ribosome\w*|endoplasmic|golgi|nucleus|prokaryot\w+|eukaryot\w+|virus\w*|micrograph\w*|magnification|resolution|biological molecule\w*|carbohydrate\w*|glucose|starch|glycogen|cellulose|lipid\w*|triglyceride\w*|phospholipid\w*|protein\w*|amino acid\w*|peptide|haemoglobin structure|collagen|benedict|biuret|iodine test|emulsion test|enzyme\w*|active site|induced fit|inhibit\w+|Km|Vmax|membrane\w*|fluid mosaic|diffusion|osmosis|water potential|active transport|endocytosis|mitosis|cell cycle|chromosome\w*|telomere\w*|stem cell\w*|DNA|RNA|replication|transcription|translation|codon\w*|mutation\w*|nucleic acid\w*|nucleotide\w*)\b/i,
      skills: [
        'Cell structure: organelles and their functions, prokaryotic vs eukaryotic cells, viruses, light vs electron microscopes (resolution), magnification and actual-size calculations with unit conversions',
        'Biological molecules: monosaccharides to polysaccharides (starch, glycogen, cellulose) and their structure-function links, triglycerides and phospholipids, protein levels of structure with haemoglobin and collagen, the biochemical tests, water\'s properties',
        'Enzymes: the active site, induced fit, factors affecting rate (temperature, pH, concentration), Vmax and Km, competitive and non-competitive inhibition, immobilised enzymes',
        'Cell membranes and transport (fluid mosaic, diffusion, facilitated diffusion, osmosis and water potential, active transport, endo- and exocytosis), the mitotic cell cycle (stages, chromosome behaviour, telomeres, stem cells, cancer), nucleic acids and protein synthesis (replication, transcription, translation, the genetic code, gene mutation)',
      ],
      hard: [
        'A magnification calculation with the unit conversion done the right way round',
        'Competitive vs non-competitive inhibition told apart from a Vmax and Km graph, with the reasoning',
        'Water potential used to predict the direction of osmosis between cells of stated solute potentials',
        'A base substitution traced through the code to its effect, or not, on the protein (degenerate code)',
      ],
      traps: ['magnification multiplied where it should be divided', 'enzymes "killed" rather than denatured', 'water moving to the higher (less negative) water potential', 'a mutation always said to change the protein'],
      exemplars: [
        `NUM_QUESTION: In an electron micrograph, a mitochondrion is 40 mm long. Its actual length is 8 µm. Calculate the magnification of the micrograph.
Answer: 5000 | 5 000 | ×5000
Explanation: Convert to the same unit: 40 mm = 40 000 µm. Magnification = image size / actual size = 40 000 / 8 = ×5000.`,
        `MC_QUESTION: An enzyme-catalysed reaction was investigated with and without an inhibitor. With the inhibitor, Vmax was unchanged but Km increased. What does this show about the inhibitor?
A) It is a competitive inhibitor, because a high enough substrate concentration overcomes its effect
B) It is a non-competitive inhibitor, because it changes the shape of the active site permanently
C) It denatures the enzyme, because the rate falls at every substrate concentration
D) It is a cofactor, because it increases the affinity of the enzyme for its substrate
Correct Answer: A
Explanation: A competitive inhibitor competes for the active site, so more substrate is needed to reach half Vmax (Km rises) but the same maximum is reached eventually. A non-competitive inhibitor lowers Vmax (B).`,
      ],
    },
    {
      id: 'transport-exchange-disease',
      name: 'AS: transport in plants and mammals, gas exchange, infectious disease and immunity',
      share: 'about a quarter of the test',
      detect: /\b(transport in plants|xylem|phloem|transpiration|cohesion|tension|translocation|mass flow|stomata\w*|guard cell\w*|xerophyte\w*|potometer|transport in mammals|circulat\w+|heart|cardiac cycle|artery|arteries|vein\w*|capillar\w+|blood|haemoglobin|hemoglobin|oxygen dissociation|bohr|tissue fluid|lymph|gas exchange|alveol\w+|trachea|bronch\w+|lung\w*|smoking|infectious disease\w*|pathogen\w*|cholera|malaria|tuberculosis|TB|HIV|AIDS|measles|antibiotic\w*|resistance|immun\w+|antibod\w+|antigen\w*|lymphocyte\w*|phagocyt\w+|vaccin\w+|monoclonal)\b/i,
      skills: [
        'Transport in plants: xylem and phloem structure, the transpiration stream (cohesion-tension), factors affecting transpiration and the potometer, xerophyte adaptations, translocation by mass flow (source to sink, companion cells)',
        'Transport in mammals: the heart and the cardiac cycle with pressure changes, blood vessel structure, blood cells, haemoglobin and oxygen dissociation curves, the Bohr shift, fetal haemoglobin and myoglobin, tissue fluid and lymph formation',
        'Gas exchange: the structure of the gas exchange system, alveoli and their features, the effects of smoking (tar, carbon monoxide, nicotine) on the system',
        'Infectious disease and immunity: the causes and transmission of cholera, malaria, TB, HIV/AIDS and measles, antibiotics and how resistance spreads, phagocytes and lymphocytes, antibodies, primary and secondary responses, active and passive and natural and artificial immunity, vaccination programmes, monoclonal antibodies',
      ],
      hard: [
        'The cohesion-tension explanation built as a chain from evaporation at the leaf to uptake at the root',
        'Two dissociation curves compared (fetal vs adult, or at two carbon dioxide concentrations) with the physiological advantage',
        'Antibiotic resistance explained as selection, not as bacteria "learning" or "becoming immune"',
        'Why one disease can be eradicated by vaccination and another cannot (antigenic variation, animal reservoirs)',
      ],
      traps: ['transpiration said to pull water up by the roots pushing', 'the Bohr shift drawn as a shift to the left', 'antibiotics said to kill viruses', 'antibodies said to kill pathogens directly'],
      exemplars: [
        `SA_QUESTION: Explain how water moves from the roots to the leaves of a tall tree. [4]
Sample Answer: 1 mark: water evaporates from the cell walls of mesophyll cells and the vapour diffuses out through the stomata (transpiration), lowering the water potential of the leaf cells; 1 mark: water is drawn out of the xylem into the leaf cells down the water potential gradient, creating tension (negative pressure) in the xylem; 1 mark: hydrogen bonds between water molecules (cohesion) hold the column together, and adhesion to the xylem walls, so the whole column is pulled upwards (the transpiration pull, cohesion-tension); 1 mark: water enters the root xylem by osmosis from root hair cells, maintaining the column, with root pressure as a minor contribution. "Water goes up the xylem" earns nothing without the mechanism; "capillary action" alone is not credited.`,
        `MC_QUESTION: During exercise, the concentration of carbon dioxide in the blood flowing through muscles rises. What effect does this have on haemoglobin, and what is the advantage?
A) Its affinity for oxygen rises, so more oxygen is loaded in the muscles
B) Its affinity for oxygen falls, so more oxygen is unloaded to the respiring muscle cells
C) Its affinity for oxygen falls, so more oxygen is carried to the lungs for excretion
D) Its affinity for oxygen rises, so the dissociation curve shifts to the right
Correct Answer: B
Explanation: The Bohr shift: carbon dioxide (via hydrogen ions) lowers affinity, shifting the curve to the right, so haemoglobin releases more oxygen exactly where respiration is fastest. D pairs a rightward shift with a rise in affinity, which contradict.`,
      ],
    },
    {
      id: 'energy-genetics',
      name: 'A Level: respiration, photosynthesis, homeostasis, coordination, inheritance, selection and evolution',
      share: 'about a quarter of the test',
      detect: /\b(respiration|glycolysis|link reaction|krebs|oxidative phosphorylation|chemiosmosis|ATP|anaerobic|respiratory quotient|RQ|photosynthe\w+|light[- ]dependent|light[- ]independent|calvin|rubisco|limiting factor\w*|chlorophyll|homeostasis|kidney\w*|nephron|loop of henle|ultrafiltration|selective reabsorption|ADH|insulin|glucagon|blood glucose|coordinat\w+|neurone\w*|action potential|synapse\w*|hormone\w*|auxin\w*|gibberellin\w*|inheritance|genetics|allele\w*|dihybrid|monohybrid|test cross|codominan\w+|sex[- ]link\w+|chi[- ]squared|epistasis|gene control|lac operon|selection|evolution|hardy[- ]weinberg|speciation|genetic drift|founder effect)\b/i,
      skills: [
        'Respiration: glycolysis, the link reaction, the Krebs cycle, oxidative phosphorylation and chemiosmosis, ATP yields, anaerobic respiration in yeast and muscle, respiratory quotients, respirometers',
        'Photosynthesis: the light-dependent stage (photolysis, photophosphorylation) and the Calvin cycle, limiting factors and their graphs, chloroplast structure, C4 plants',
        'Homeostasis and coordination: the kidney (ultrafiltration, selective reabsorption, the loop of Henle, ADH), blood glucose control (insulin, glucagon, cell signalling), neurones, action potentials and synapses, plant hormones (auxin, gibberellin), stomatal control',
        'Inheritance, selection and evolution: monohybrid and dihybrid crosses with codominance, multiple alleles, sex linkage, epistasis and autosomal linkage, test crosses, chi-squared tests, gene control (lac operon), natural and artificial selection, Hardy-Weinberg, genetic drift and the founder effect, speciation',
      ],
      hard: [
        'A chi-squared test carried through to the decision against the critical value, with the conclusion worded correctly ("no significant difference, accept the null hypothesis")',
        'Hardy-Weinberg from a recessive phenotype frequency to the heterozygote frequency, and when the equations do not apply',
        'A dihybrid ratio that departs from 9:3:3:1 explained by linkage or epistasis from the numbers',
        'A limiting-factors graph read at two points with a different limiting factor at each',
      ],
      traps: ['oxygen said to be used in the Krebs cycle', 'the Calvin cycle said to need light directly', 'q found as 0.16 instead of √0.16', 'a chi-squared result below the critical value read as a significant difference'],
      exemplars: [
        `NUM_QUESTION: In a large, randomly mating population, 16% of individuals show the phenotype of a recessive allele. Using the Hardy-Weinberg equations p + q = 1 and p² + 2pq + q² = 1, calculate the percentage of the population expected to be heterozygous.
Answer: 48 | 48%
Explanation: q² = 0.16, so q = 0.4 and p = 0.6. Heterozygotes are 2pq = 2 × 0.6 × 0.4 = 0.48, or 48%.`,
        `SA_QUESTION: A student crossed pea plants heterozygous for two unlinked genes and expected a 9 : 3 : 3 : 1 ratio among 160 offspring. The observed numbers were 90 round yellow, 25 round green, 35 wrinkled yellow and 10 wrinkled green. Carry out a chi-squared test (χ² = Σ((O - E)² / E)) to find whether the observed results differ significantly from the expected ratio. The critical value of χ² at p = 0.05 with 3 degrees of freedom is 7.815. [4]
Sample Answer: 1 mark: expected numbers 90, 30, 30, 10 (160 × 9/16, 3/16, 3/16, 1/16); 1 mark: χ² = 0 + (25 - 30)²/30 + (35 - 30)²/30 + 0 = 0.83 + 0.83 = 1.67 (accept 1.66 to 1.67); 1 mark: 1.67 is less than the critical value 7.815 at p = 0.05 with 3 degrees of freedom; 1 mark: so the difference between observed and expected is not significant, the null hypothesis is accepted and the results are consistent with independent assortment in a 9 : 3 : 3 : 1 ratio. Stating "the results are significant" or "the hypothesis is proved" loses the last mark.`,
      ],
    },
    {
      id: 'ecology-biotech-practical',
      name: 'A Level: classification and biodiversity, genetic technology, and the practical and planning skills of Papers 3 and 5',
      share: 'about a quarter of the test',
      detect: /\b(classif\w+|taxonom\w+|domain\w*|kingdom\w*|biodiversity|simpson\w*|species richness|evenness|random sampling|quadrat\w*|transect\w*|mark[- ]release|conservation|endangered|seed bank\w*|captive breeding|genetic technolog\w*|genetic engineering|recombinant|plasmid\w*|restriction enzyme\w*|PCR|gel electrophoresis|gene therapy|GM|genetically modified|CRISPR|microarray\w*|bioinformatics|practical|investigat\w+|plan\w*|variable\w*|control\w*|reliab\w+|valid\w+|t-test|chi[- ]squared|spearman|pearson|standard deviation|error bar\w*|standard error|95% confidence|graph\w*|dilution\w*|serial dilution|colorimeter|respirometer|potometer)\b/i,
      skills: [
        'Classification and biodiversity: the three domains and the kingdoms, species concepts, biodiversity at three levels, Simpson\'s index, sampling methods and their fit to the organisms, correlation (Spearman\'s rank, Pearson\'s) between species and an abiotic factor, reasons for and methods of conservation (in situ, ex situ, seed banks, assisted reproduction)',
        'Genetic technology: recombinant DNA (restriction enzymes, sticky ends, plasmids, ligase), PCR, gel electrophoresis, genetic markers, gene therapy, GM crops and microorganisms (insulin, Bt, Golden Rice) with their benefits and concerns, genome sequencing, bioinformatics, CRISPR-Cas9',
        'Paper 3 practical skills: following a method, serial dilutions, using a colorimeter or potometer, drawing and labelling from a specimen in words, recording in tables, drawing graphs, identifying sources of error and suggesting improvements',
        'Paper 5 planning and analysis: variables and how to standardise them, a range of the independent variable, controls, reliability from repeats, choosing and interpreting a statistical test (t-test, chi-squared, correlation), standard deviation, standard error and 95% confidence intervals from error bars, evaluating conclusions',
      ],
      hard: [
        'A statistical test chosen for the data type and the result interpreted at p = 0.05 in the right words',
        'Two means with overlapping error bars read as "no significant difference" and the reasoning given',
        'A full plan with every marking point present, in the order a candidate would carry it out',
        'A GM example evaluated on both sides with the scientific concern stated precisely (gene flow, resistance evolving, allergenicity)',
      ],
      traps: ['a higher Simpson\'s index read as more species', 'a t-test used on frequency counts', 'error bars that overlap read as a significant difference', 'PCR confused with gel electrophoresis'],
      exemplars: [
        `MC_QUESTION: A student measured the diameter of 20 leaves from a shaded tree and 20 from an unshaded tree of the same species and wanted to test whether the means differed significantly. Which statistical test is appropriate, and why?
A) Chi-squared, because there are two categories of tree
B) The t-test, because two means of normally distributed continuous measurements are being compared
C) Spearman's rank correlation, because leaf diameter and shading are related variables
D) Simpson's index, because the sample contains more than one group
Correct Answer: B
Explanation: Two sets of continuous measurements with means to compare call for the t-test. Chi-squared needs frequency counts in categories, and a correlation test needs paired values of two variables for each item.`,
        `SA_QUESTION: A student has a solution of the enzyme catalase, hydrogen peroxide solution, a water bath, a gas syringe and a stopwatch. Describe how the student could investigate the effect of temperature on the rate of the catalase-catalysed breakdown of hydrogen peroxide. Your plan should include the variables, how you would make your results reliable, and a control. [6]
Sample Answer: Marking points, one mark each up to 6: independent variable is temperature, with at least five values across a range such as 10, 20, 30, 40, 50 and 60 °C, set with the water bath and checked with a thermometer, equilibrating the enzyme and substrate separately before mixing; dependent variable is the rate, measured as the volume of oxygen collected in the gas syringe in a fixed time (e.g. 30 s) or the time to collect a fixed volume; standardise the volume and concentration of hydrogen peroxide and of catalase (same batch), the pH with a buffer, and the mixing method; a control with boiled (denatured) catalase, or water in place of the enzyme, to show the oxygen comes from the enzyme's action; repeat each temperature at least three times, discard anomalies and calculate a mean rate; a safety point (hydrogen peroxide is an irritant, wear eye protection); plot mean rate against temperature. A plan with no range of temperatures, or that measures "how much bubbling" without a quantity, loses the corresponding marks.`,
      ],
    },
  ],
  difficulty: AICE_DIFFICULTY,
}
