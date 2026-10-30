// The Cambridge International AS & A Level Marine Science exam (9693; AICE
// Marine Science in Florida) as a reference for the guide prompts: Paper 1
// multiple choice (40 items, four options), Papers 2-4 structured questions
// with command words and marks in brackets, data handling and practical
// skills throughout. Syllabus topics grouped into four domains.

import type { ExamProfile } from './types'
import { AICE_DIFFICULTY, AICE_ITEM_RULES } from './aice'

const PROGRAMME = String.raw`(?:AICE|Cambridge|(?:AS|A)[- ]?Level)`
const SUBJECT = String.raw`Marine(?:\s+Science)?`
const EXAM = new RegExp(String.raw`\b${PROGRAMME}\b[^.\n]{0,40}\b${SUBJECT}\b|\bMarine\s+Science\b[^.\n]{0,40}\b${PROGRAMME}\b`, 'i')

export const AICE_MARINE_SCIENCE: ExamProfile = {
  id: 'aice-marine-science',
  pace: 112,
  name: 'the Cambridge AS & A Level Marine Science exam (AICE Marine Science, 9693)',
  detect: {
    exam: EXAM,
    subjectHints: /./,
    subjects: ['science'],
    explicit: EXAM,
  },
  itemRules: AICE_ITEM_RULES('the Cambridge AS & A Level Marine Science exam', {
    mcq: true,
    structured: 'Parts are mostly 1-4 marks; each set has one data-handling part and one longer part of 6-8 marks.',
    extra: [
      `- Data-handling parts are the heart of the papers: give a table (kind: table figure) or a graph (kind: plane or kind: bar) of illustrative data, then "Describe the trend shown in Fig. 1.1. [2]" (the mark scheme wants the overall pattern AND figures quoted from the data with units), "Calculate the percentage change in ... between ... and .... Show your working. [2]" (one mark for the method, one for the answer to the stated precision), "Calculate the mean ... [1]", "Suggest one reason for the anomalous result at .... [1]".`,
      `- Practical-skill parts ask the candidate to plan or improve an investigation: "Identify the independent and dependent variables. [2]", "State two variables that should be controlled and explain how. [2]", "Suggest one source of error and how it could be reduced. [2]", "Explain why the investigation was repeated three times. [1]". Mark schemes credit named variables and specific, practical improvements, never "be more careful".`,
      `- Use the syllabus's own terms: pelagic / benthic, photic / aphotic, euryhaline / stenohaline, Simpson's index of diversity (D = 1 - Σ(n/N)², the formula given in the stem), trophic efficiency, keystone species, maximum sustainable yield, bycatch, eutrophication, ocean acidification, bleaching, marine protected area.`,
    ],
  }),
  domains: [
    {
      id: 'ocean-environment',
      name: 'Water, physical processes and the ocean environment',
      share: 'about a quarter of the test',
      detect: /\b(water|salinity|salt\w*|density|thermocline|halocline|pycnocline|current\w*|gyre\w*|upwelling|tide\w*|tidal|wave\w*|zone\w*|photic|aphotic|pelagic|benthic|abyssal|sediment\w*|continental shelf|plate\w*|hydrothermal|ocean(?:ic)? (?:environment|basin|floor)|el ni[ñn]o|coriolis|thermohaline|dissolved oxygen|specific heat|latent heat)\b/i,
      skills: [
        'Properties of water: polarity, hydrogen bonding, high specific heat capacity and latent heat, density maximum, as solvent, and why each matters to marine life',
        'Salinity and density: measuring salinity, what changes it (evaporation, precipitation, river input, ice formation), density from temperature and salinity, stratification and the thermocline, halocline and pycnocline',
        'Ocean movement: surface currents and gyres (wind, the Coriolis effect), upwelling and downwelling, thermohaline circulation, tides (spring and neap) and waves, El Niño and La Niña and their effects on productivity',
        'The ocean environment: zones by depth and light (photic, aphotic; pelagic, benthic), the continental shelf, slope and abyssal plain, sediments and their origin, hydrothermal vents, plate tectonics and the formation of ocean basins',
      ],
      hard: [
        'A temperature and salinity profile read against depth to place the thermocline and explain why mixing stops there',
        'Upwelling explained as a chain: wind, Coriolis deflection, surface water moved offshore, nutrient-rich water rising, productivity',
        'Two water masses compared for density from both temperature and salinity, where one factor pulls each way',
        'El Niño traced from weakened trade winds to a collapsed fishery',
      ],
      traps: ['warm water read as denser', 'the thermocline placed at the surface', 'tides attributed to wind', 'upwelling read as bringing oxygen rather than nutrients'],
      exemplars: [
        `MC_QUESTION: The table shows the temperature and salinity of four samples of seawater. Which sample has the highest density?
\`\`\`graph
kind: table
title: Four seawater samples (illustrative)
columns: Sample | Temperature / °C | Salinity / ppt
row: A | 4 | 34.0
row: B | 4 | 36.5
row: C | 22 | 34.0
row: D | 22 | 36.5
\`\`\`
A) A
B) B
C) C
D) D
Correct Answer: B
Explanation: Density rises as temperature falls and as salinity rises, so the cold, salty sample is densest. D is salty but warm; A is cold but less salty.`,
        `SA_QUESTION: Fig. 1.1 shows how the temperature of the water changes with depth at one site in the tropical Atlantic. Describe the pattern shown in Fig. 1.1 and explain why little mixing occurs between the water above and below 200 m. [4]
\`\`\`graph
kind: plane
title: Fig. 1.1 Water temperature against depth (illustrative)
xlabel: temperature / °C
ylabel: depth / m
x: 0, 30
y: -1000, 0
segment: (28, 0) (27, -100)
segment: (27, -100) (15, -300)
segment: (15, -300) (8, -500)
segment: (8, -500) (5, -1000)
point: (28, 0)
point: (27, -100)
point: (15, -300)
point: (8, -500)
point: (5, -1000)
\`\`\`
Sample Answer: 1 mark: temperature is roughly constant (27-28 °C) in the top 100 m (the mixed layer); 1 mark: it falls steeply between about 100 m and 500 m (from about 27 °C to 8 °C), the thermocline, then falls slowly to about 5 °C at 1000 m; 1 mark: warm water above is less dense than the cold water below, so the water column is stably stratified; 1 mark: the sharp density gradient at the thermocline acts as a barrier, so wind-driven mixing reaches only the surface layer and nutrients below do not reach the photic zone. Also credited: quoting the depth range of the thermocline with figures from the graph. "The water gets colder as you go down" alone earns 1 mark at most, since the pattern has three parts.`,
      ],
    },
    {
      id: 'biodiversity-ecology',
      name: 'Classification, biodiversity and ecology',
      share: 'about a quarter of the test',
      detect: /\b(classif\w+|taxonom\w+|species|genus|phylum|biodiversity|simpson\w*|diversity index|abundance|energy flow|trophic\w*|food (?:web|chain)|producer\w*|consumer\w*|decomposer\w*|phytoplankton|zooplankton|productivity|nutrient cycl\w*|nitrogen cycle|carbon cycle|keystone|niche|competition|predat\w+|symbio\w+|population|sampling|quadrat|transect|mark[- ]release)\b/i,
      skills: [
        'Classification: the hierarchy from domain to species, binomial names, the features that place marine organisms in their groups, dichotomous keys',
        'Biodiversity: species richness vs evenness, Simpson\'s index of diversity (D = 1 - Σ(n/N)²) calculated from counts and compared between sites, sampling methods (quadrats, transects, mark-release-recapture) and their limits',
        'Energy flow: phytoplankton as producers, trophic levels, pyramids of numbers, biomass and energy, trophic efficiency (about 10%) and why food chains are short',
        'Nutrient cycles in the ocean (carbon, nitrogen), the biological pump, the roles of decomposers and upwelling, keystone species and trophic cascades, niches and competition',
      ],
      hard: [
        'Simpson\'s index calculated for two sites and the comparison explained in terms of evenness, not just richness',
        'A trophic cascade traced three levels after a keystone predator is removed (sea otters, urchins, kelp)',
        'Energy lost between trophic levels accounted for (respiration, egestion, not eaten) with a calculation of efficiency',
        'Sampling data judged for reliability (sample size, randomness, mobile organisms) before a conclusion is drawn',
      ],
      traps: ['the site with more species assumed to have the higher index whatever the evenness', 'energy read as cycling like nutrients', 'biomass pyramid for the ocean drawn upright (phytoplankton turnover inverts it)', 'a keystone species confused with the most abundant species'],
      exemplars: [
        `NUM_QUESTION: A student counted the organisms in a rock pool: 10 periwinkles, 5 limpets and 5 beadlet anemones. Simpson's index of diversity is given by D = 1 - Σ(n/N)², where n is the number of individuals of one species and N is the total number of individuals. Calculate D for this rock pool. Give your answer to three decimal places.
Answer: 0.625 | 0.63
Explanation: N = 20. (10/20)² + (5/20)² + (5/20)² = 0.25 + 0.0625 + 0.0625 = 0.375, so D = 1 - 0.375 = 0.625.`,
        `MC_QUESTION: Sea otters eat sea urchins, which graze on kelp. In an area where sea otters were hunted to very low numbers, which outcome is most likely?
A) Kelp forests expand because fewer otters disturb the kelp holdfasts
B) Sea urchin numbers rise and kelp forests are grazed down to urchin barrens
C) Sea urchin numbers fall because their food supply of otters is removed
D) Kelp is unaffected because kelp is a producer and does not depend on consumers
Correct Answer: B
Explanation: The otter is a keystone predator: removing it releases the urchins, which overgraze the kelp (a trophic cascade). C reverses the food chain.`,
      ],
    },
    {
      id: 'ecosystems-physiology',
      name: 'Marine ecosystems and physiology',
      share: 'about a quarter of the test',
      detect: /\b(coral\w*|reef\w*|bleach\w*|zooxanthella\w*|mangrove\w*|seagrass|estuar\w+|salt marsh|rocky shore|intertidal|open ocean|deep sea|hydrothermal vent\w*|chemosynthe\w+|osmoregulat\w+|osmo\w+|buoyan\w+|swim bladder|gas exchange|gill\w*|countercurrent|reproduct\w+|larva\w*|plankton\w*|migration|adaptation\w*|physiolog\w+|temperature regulation|ectotherm\w*|endotherm\w*)\b/i,
      skills: [
        'Coral reefs: conditions needed (warm, shallow, clear, low-nutrient water), the coral-zooxanthellae mutualism, reef types, bleaching and its causes, reef productivity in nutrient-poor water',
        'Coastal ecosystems: mangroves (prop roots, pneumatophores, salt excretion and exclusion, nurseries), seagrass meadows, estuaries and salt marshes (changing salinity, high productivity), the rocky shore and zonation',
        'Open ocean and deep sea: the lack of light and food at depth, adaptations (bioluminescence, large mouths, slow metabolism), hydrothermal vents and chemosynthesis',
        'Physiology: osmoregulation in marine bony fish (drinking, chloride cells, little urine) vs sharks (urea) vs estuarine species, buoyancy (swim bladders, oils, squalene), gas exchange at gills with countercurrent flow, reproductive strategies (broadcast spawning, planktonic larvae, parental care) and migration',
      ],
      hard: [
        'Bleaching explained as the mechanism (heat stress, expulsion of zooxanthellae, loss of photosynthate, starvation) rather than "the coral dies"',
        'Osmoregulation compared between a marine bony fish and a freshwater one, each step in the opposite direction',
        'Countercurrent exchange at the gill explained with the gradient maintained along the whole lamella',
        'A reproductive strategy judged by the trade-off between number of offspring and survival of each',
      ],
      traps: ['coral read as a plant', 'marine bony fish said to gain water by osmosis', 'mangrove roots said to absorb oxygen from the soil', 'vent communities said to depend on sunlight indirectly'],
      exemplars: [
        `SA_QUESTION: Mangrove trees grow with their roots in seawater. Explain how mangroves survive the high salinity of their habitat. [3]
Sample Answer: 1 mark: salt exclusion at the roots, where the root membranes act as an ultrafilter so most salt never enters the xylem; 1 mark: salt secretion by salt glands on the leaves, so excess salt is excreted as crystals; 1 mark: salt is stored in old leaves (or in the bark) that are then shed, or the tissues tolerate a high internal salt concentration by storing it in vacuoles. Also credited: succulent leaves that dilute the salt. "They are adapted to salt" earns nothing; each mark needs a named mechanism.`,
        `MC_QUESTION: Which statement explains why coral reefs can be highly productive in tropical waters that are poor in nutrients?
A) Corals filter large volumes of water and feed on the abundant plankton that nutrient-poor water supports
B) Zooxanthellae inside the coral tissue photosynthesise and pass sugars to the coral, while the coral's waste supplies the algae with nutrients that are recycled rather than lost
C) Reef-building corals obtain most of their energy by chemosynthesis using sulphur compounds from the reef rock
D) Nutrient-poor water is clearer, so the coral itself can photosynthesise at greater depth
Correct Answer: B
Explanation: The mutualism keeps nutrients cycling tightly within the reef. Nutrient-poor water supports little plankton (A), corals are animals and do not photosynthesise (D), and chemosynthesis belongs to vents (C).`,
      ],
    },
    {
      id: 'fisheries-human-impacts',
      name: 'Fisheries, aquaculture and human impacts',
      share: 'about a quarter of the test',
      detect: /\b(fisher\w+|fishing|trawl\w*|long[- ]?lin\w+|purse seine|bycatch|overfish\w*|stock\w*|maximum sustainable yield|MSY|quota\w*|aquacultur\w*|fish farm\w*|mariculture|pollution|oil spill\w*|plastic\w*|microplastic\w*|eutrophication|dead zone\w*|hypoxi\w+|climate change|global warming|acidification|carbonate|sea level|conservation|marine protected area\w*|MPA\w*|sustainab\w+|tourism|coastal development|invasive)\b/i,
      skills: [
        'Fishing methods (trawling, long-lining, purse seining, pots and traps) and their impacts (bycatch, habitat damage, ghost fishing); stock assessment, maximum sustainable yield, the signs of overfishing (falling catch per unit effort, smaller fish), quotas, mesh sizes, closed seasons',
        'Aquaculture: species farmed, methods (cages, ponds, ropes), benefits (food security, pressure off wild stocks) and problems (waste and eutrophication, disease and parasites, escapes, fishmeal demand, mangrove loss)',
        'Pollution: oil spills and clean-up methods, plastics and microplastics, nutrient pollution and eutrophication leading to algal blooms and hypoxia, heavy metals and bioaccumulation, noise and thermal pollution',
        'Climate change and conservation: warming, sea level rise, ocean acidification and its effect on calcifying organisms, bleaching; marine protected areas, sustainable fishing certification, restoration (mangrove replanting, artificial reefs), and evaluating management strategies',
      ],
      hard: [
        'Catch data read beyond MSY and the overfishing argued from catch per unit effort rather than total catch',
        'Ocean acidification explained as chemistry (CO₂ + water, more hydrogen ions, fewer carbonate ions, calcification harder) and linked to a named group',
        'An MPA evaluated with both sides (spillover, enforcement, displaced effort) and a judgement',
        'Aquaculture judged by the species: a filter-feeding bivalve farm vs a carnivorous finfish farm',
      ],
      traps: ['MSY read as the largest possible catch', 'acidification said to dissolve living shells directly rather than slow calcification', 'bycatch confused with overfishing', 'aquaculture said to have no effect on wild stocks'],
      exemplars: [
        `SA_QUESTION: Table 4.1 shows the total catch and the fishing effort for a cod fishery over 20 years. (a) Describe the trend in catch per unit effort shown by the data. [2] (b) Suggest two reasons why the total catch rose between 2004 and 2014 while the catch per unit effort fell. [2]
\`\`\`graph
kind: table
title: Table 4.1 Cod fishery (illustrative)
columns: Year | Total catch / tonnes | Effort / boat-days | Catch per unit effort / tonnes per boat-day
row: 2004 | 40 000 | 8 000 | 5.0
row: 2009 | 44 000 | 11 000 | 4.0
row: 2014 | 45 000 | 15 000 | 3.0
row: 2019 | 36 000 | 18 000 | 2.0
row: 2024 | 27 000 | 18 000 | 1.5
\`\`\`
Sample Answer: (a) 1 mark: catch per unit effort fell steadily over the whole period; 1 mark: from 5.0 tonnes per boat-day in 2004 to 1.5 in 2024 (a 70% fall), with the fall slowing after 2019. (b) 1 mark each for two of: more boats or more days at sea (effort nearly doubled, from 8 000 to 15 000 boat-days) masked the falling stock; improved technology (sonar, larger nets) found the remaining fish; the stock was already being fished above its maximum sustainable yield so each boat caught less. "More fish were caught" restates the stem and earns nothing.`,
        `MC_QUESTION: Rising atmospheric carbon dioxide is lowering the pH of the oceans. Which organisms are most directly harmed, and why?
A) Sharks, because a lower pH damages their cartilaginous skeleton
B) Pteropods and reef-building corals, because fewer carbonate ions are available to build their calcium carbonate shells and skeletons
C) Phytoplankton, because carbon dioxide is toxic to photosynthesis at high concentrations
D) Deep-sea fish, because acidic water holds less dissolved oxygen
Correct Answer: B
Explanation: Dissolved CO₂ forms carbonic acid; the extra hydrogen ions bind carbonate, so calcifiers struggle to build and keep their shells. Extra CO₂ does not poison photosynthesis (C), and oxygen solubility depends on temperature, not pH (D).`,
      ],
    },
  ],
  difficulty: AICE_DIFFICULTY,
}
