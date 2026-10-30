// The AP Environmental Science exam as a reference for the guide prompts:
// Section I multiple choice (four options, 80 items in 90 minutes, many in
// sets on a data table, graph, described diagram or short text; no
// calculator) and Section II free response (three FRQs: design an
// investigation; analyze an environmental problem and propose a solution;
// analyze an environmental problem with calculations). Units 1-9 grouped
// into four domains.

import type { ExamProfile } from './types'

export const AP_ENVIRONMENTAL: ExamProfile = {
  id: 'ap-environmental',
  pace: 67,
  name: 'the AP Environmental Science exam',
  detect: {
    exam: /\bAP\s+Environmental(?:\s+Science)?\b|\bAPES\b/i,
    subjectHints: /./,
    subjects: ['science'],
    explicit: /\bAP\s+Environmental(?:\s+Science)?\b|\bAPES\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly four options A-D, as on Section I. No true/false, no "I, II and III" lists. Most items are built on a stimulus: a described experiment or field study (2-4 sentences in a \`\`\`passage fence), a data table (kind: table figure) or bar chart (kind: bar figure), a described diagram or model ("The diagram shows a food web in which ..."), or a short text about a real kind of place or policy (a city's water supply, a coal plant, a wetland). Items that share a stimulus each repeat it, so every item stands alone.
- Stems are the exam's: "Which of the following best explains the pattern shown in the table?", "Which of the following is the most likely consequence of ...?", "Based on the data, which of the following claims is best supported?", "Which of the following would be the most effective way to reduce ...?", "The practice described is most likely to result in which of the following?", "Which of the following best identifies a limitation of the study?". Options are four parallel statements, each true of some situation; the wrong ones are wrong for this stimulus (see WRONG ANSWERS ARE BUILT FROM).
- No calculator is allowed on either section, so every calculation uses numbers that divide cleanly: percent change, the rule of 70 for doubling time (70 / growth rate in percent), the 10% rule for energy between trophic levels, unit conversions and dimensional analysis (kWh to cost, gallons to liters with a given factor, tons of CO₂ per gallon with a given factor), half-lives in whole steps. Give every conversion factor in the stem. A multiple-choice calculation has four numeric options (the wrong ones from a skipped step, an inverted ratio or a wrong power of ten). NUM_QUESTION is only for a free-response calculation part whose answer is one number (at most one in six items; units omitted, alternates with |).
- Free-response items are SA_QUESTION, one per part, in the form of the three FRQs: (1) design an investigation: "Identify the hypothesis ...", "Describe a method for measuring ...", "Identify a control ...", "Explain how ... could affect the results"; (2) analyze an environmental problem and propose a solution: "Identify ...", "Describe one environmental consequence of ...", "Propose a realistic solution ... and justify it"; (3) analyze with calculations: "Calculate ... Show your work.", then "Explain how the result ...". The Sample Answer is the scoring guideline: the statement that earns each point ("1 point: identifies that the increased impervious surface raises runoff volume; 1 point: explains that the runoff carries fertilizer into the lake, adding nutrients"), with a note on what is too vague to score ("'it hurts the environment' earns nothing").
- Explanations and justifications must use the science (eutrophication from nitrogen and phosphorus, the greenhouse effect from re-radiated infrared, bioaccumulation and biomagnification of fat-soluble toxins, thermal inversions trapping pollutants), never "because it is bad for the environment".
- Before writing an item's answer, check it against the data in the stimulus and that exactly one option (or one sample answer) is right; solve every calculation from its final numbers. If the numbers do not work out cleanly, change them. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the evidence or the principle, and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'ecosystems',
      name: 'Units 1-2: The Living World (ecosystems and biodiversity)',
      share: 'about 12-16% of the test',
      detect: /\b(unit [12]\b|ecosystem\w*|biome\w*|biodiversity|species richness|trophic|food (?:web|chain)|energy pyramid|10% rule|primary productivity|npp|gpp|carbon cycle|nitrogen cycle|phosphorus cycle|water cycle|hydrologic|biogeochemical|succession|keystone|ecological tolerance|niche|symbio\w+|mutualis\w+|predation|competition|island biogeography|adaptation|natural selection|ecosystem service\w*|aquatic biome\w*|estuar\w+|coral reef\w*|wetland\w*)\b/i,
      skills: [
        'Unit 1: predator-prey and symbiotic relationships, terrestrial and aquatic biomes, the carbon, nitrogen, phosphorus and hydrologic cycles, primary productivity (GPP, NPP and respiration), trophic levels and the 10% rule, food webs',
        'Unit 2: biodiversity (genetic, species, ecosystem), ecosystem services, island biogeography, ecological tolerance and range, natural disruptions and adaptation, ecological succession (primary vs secondary, pioneer species, climax community)',
      ],
      hard: [
        'A food web described in words where removing one species changes two trophic levels in opposite directions',
        'An NPP calculation from GPP and respiration, or energy available at a trophic level after two 10% steps',
        'The nitrogen cycle item that asks which process makes nitrogen usable by plants vs which returns it to the atmosphere',
        'Island biogeography: which island has the most species when size and distance point different ways',
        'Distinguishing primary from secondary succession from a description of what remains after a disturbance',
      ],
      traps: ['energy recycled like matter', 'nitrogen fixation confused with denitrification', 'biodiversity read as species count alone', 'large far islands assumed to have more species than small near ones', 'succession after a fire called primary'],
      exemplars: [
        `MC_QUESTION: In a grassland ecosystem, the producers capture 20,000 kJ/m² per year. Based on the data, approximately how much energy is available to the secondary consumers each year?
\`\`\`graph
kind: table
title: Energy captured by trophic level
columns: Trophic level | Energy (kJ/m² per year)
row: Producers | 20,000
row: Primary consumers | 2,000
row: Secondary consumers | ?
\`\`\`
A) 20,000 kJ/m²
B) 2,000 kJ/m²
C) 200 kJ/m²
D) 20 kJ/m²
Correct Answer: C
Explanation: About 10% of the energy at one level is passed to the next, so 2,000 × 0.10 = 200 kJ/m². Option D applies the rule one level too many.`,
        `MC_QUESTION: Researchers surveyed the plant species on four islands of different sizes and distances from a mainland that is the source of colonists. Which island would be expected to have the greatest number of species?
A) A small island 10 km from the mainland
B) A large island 10 km from the mainland
C) A small island 200 km from the mainland
D) A large island 200 km from the mainland
Correct Answer: B
Explanation: Island biogeography predicts the most species where immigration is highest (near) and extinction is lowest (large). Option D has the lower extinction rate but far fewer colonists arriving.`,
      ],
    },
    {
      id: 'populations-earth',
      name: 'Units 3-4: Populations and Earth Systems and Resources',
      share: 'about 20-26% of the test',
      detect: /\b(unit [34]\b|population\w*|carrying capacity|k[- ]selected|r[- ]selected|survivorship|age[- ]structure|demographic transition|total fertility|birth rate|death rate|rule of 70|doubling time|growth rate|infant mortality|overshoot|logistic|exponential growth|plate tectonic\w*|earthquake\w*|volcan\w+|soil|weathering|erosion|watershed|atmosphere|troposphere|stratosphere|global wind|coriolis|el niño|el nino|la niña|la nina|solar radiation|insolation|season\w*|earth'?s tilt|soil texture|soil horizon|rain shadow)\b/i,
      skills: [
        'Unit 3: generalist and specialist species, K- and r-selected species, survivorship curves, carrying capacity and overshoot, population growth (exponential vs logistic), age-structure diagrams, total fertility rate, the demographic transition, the rule of 70 for doubling time, factors that change human population growth',
        'Unit 4: plate tectonics and the hazards at each boundary, soil formation and horizons, soil texture and water-holding capacity, the layers of the atmosphere, global wind patterns and the Coriolis effect, watersheds, solar radiation and the seasons, El Niño and La Niña',
      ],
      hard: [
        'A country\'s stage in the demographic transition read from birth and death rates, with the growth rate computed as (births minus deaths) per 1,000 turned into a percent',
        'Doubling time by the rule of 70 after first finding the growth rate from the data',
        'An age-structure diagram described in words (wide base vs narrow base) matched to its growth outlook and development stage',
        'A soil texture item where the percentages of sand, silt and clay are given and the question is about water retention or drainage',
        'An El Niño item asking what changes in the eastern Pacific (upwelling, fisheries, rainfall)',
      ],
      traps: ['the growth rate used in the rule of 70 as a decimal instead of a percent', 'K-selected species given high reproductive rates', 'a type I survivorship curve assigned to insects', 'denser (clay) soil given faster drainage', 'El Niño said to strengthen upwelling off Peru'],
      exemplars: [
        `MC_QUESTION: The table shows population data for a country. What is the approximate doubling time of this country's population, assuming the growth rate stays constant?
\`\`\`graph
kind: table
title: Population data, Country X
columns: Measure | Value
row: Crude birth rate | 35 per 1,000
row: Crude death rate | 15 per 1,000
row: Net migration | 0
\`\`\`
A) 2 years
B) 20 years
C) 35 years
D) 70 years
Correct Answer: C
Explanation: Growth rate = (35 − 15) / 1,000 = 2.0%, and by the rule of 70 the doubling time is 70 / 2 = 35 years. Option D forgets to divide by the rate; option A uses the rate as if it were years.`,
        `SA_QUESTION: A developing country has a wide-based age-structure diagram, a crude birth rate of 40 per 1,000 and a crude death rate of 12 per 1,000. a) Identify the stage of the demographic transition this country is most likely in. b) Describe one change that would most likely move the country toward the next stage. c) Explain how that change affects the total fertility rate.
Sample Answer: a) 1 point: Stage 2 (early expanding): death rates have fallen with sanitation and medicine while birth rates stay high, so growth is rapid. b) 1 point for a specific change such as increased access to education and employment for women, access to family planning, or urbanization; "development" alone earns nothing. c) 1 point: with education, employment and family planning, women tend to marry later and choose fewer children, lowering the total fertility rate toward replacement level (about 2.1), which slows growth and narrows the base of the diagram.`,
      ],
    },
    {
      id: 'land-water-energy',
      name: 'Units 5-6: Land and Water Use; Energy Resources and Consumption',
      share: 'about 20-26% of the test',
      detect: /\b(unit [56]\b|tragedy of the commons|green revolution|irrigation|salinization|waterlogging|pesticide\w*|integrated pest|ipm|cafo|feedlot|aquaculture|overfishing|clearcutting|deforestation|urbanization|urban sprawl|impervious|ecological footprint|sustainab\w+|mining|strip mining|mountaintop|tailings|meat production|fertilizer\w*|monocrop\w*|monoculture|tilling|crop rotation|contour plowing|terracing|energy (?:source|resource|consumption|efficiency)\w*|fossil fuel\w*|coal|natural gas|fracking|hydraulic fracturing|petroleum|nuclear|fission|uranium|radioactive waste|half[- ]life|hydroelectric|dam\b|solar|photovoltaic|wind turbine\w*|geothermal|biomass|biofuel\w*|ethanol|hydrogen fuel cell|kwh|kilowatt|cogeneration|energy conservation)\b/i,
      skills: [
        'Unit 5: the tragedy of the commons, clearcutting and the Green Revolution, irrigation methods and their problems (salinization, waterlogging), pest control and IPM, meat production and CAFOs, overfishing and aquaculture, mining impacts, urbanization and impervious surfaces, the ecological footprint, sustainable practices (crop rotation, contour plowing, terracing, no-till, windbreaks)',
        'Unit 6: renewable and nonrenewable sources, global energy consumption by region and development, fossil fuel formation and extraction (incl. fracking), nuclear power (fission, the fuel cycle, waste and half-lives), hydroelectric, solar, wind, geothermal, biomass and biofuels, hydrogen fuel cells, energy conservation and efficiency, with calculations in kWh and cost',
      ],
      hard: [
        'A dimensional-analysis item: a household\'s kWh per month, a cost per kWh and a CO₂ factor per kWh, asking for the yearly cost or emissions',
        'A half-life item where the number of half-lives must be found first (whole steps only, no calculator)',
        'Trade-offs of an energy source given a scenario (a dam\'s reservoir effects, wind turbines and birds, biofuel land use) with the one real limitation among plausible-sounding options',
        'The irrigation method matched to its problem: flood irrigation and waterlogging, salinization in arid regions, center-pivot and aquifer drawdown',
        'A fishing item where the decline in catch per unit effort, not total catch, shows overfishing',
      ],
      traps: ['nuclear power said to emit CO₂ while generating', 'biomass treated as carbon-free in every case', 'a half-life step skipped or doubled', 'kW confused with kWh', 'drip irrigation given the highest water loss'],
      exemplars: [
        `MC_QUESTION: A household uses an average of 900 kWh of electricity per month. The local utility charges $0.10 per kWh and emits 0.5 kg of CO₂ for each kWh it generates. Which of the following is closest to the mass of CO₂ emitted to supply this household's electricity for one year?
A) 450 kg
B) 1,080 kg
C) 5,400 kg
D) 10,800 kg
Correct Answer: C
Explanation: 900 kWh/month × 12 months = 10,800 kWh per year; × 0.5 kg/kWh = 5,400 kg. Option D forgets the CO₂ factor (it is the kWh), and option B is the yearly cost in dollars.`,
        `NUM_QUESTION: A sample contains 800 grams of a radioactive isotope with a half-life of 30 years. How many grams of the isotope remain after 120 years?
Answer: 50 | 50.0
Explanation: 120 / 30 = 4 half-lives; 800 → 400 → 200 → 100 → 50 grams.`,
      ],
    },
    {
      id: 'pollution-global-change',
      name: 'Units 7-9: Atmospheric Pollution, Aquatic and Terrestrial Pollution, Global Change',
      share: 'about 36-44% of the test',
      detect: /\b(unit [789]\b|air pollution|clean air act|photochemical smog|tropospheric ozone|ozone|nitrogen oxide\w*|nox|sulfur dioxide|so2|particulate\w*|pm2\.5|pm10|thermal inversion|acid rain|acid deposition|catalytic converter|scrubber\w*|indoor air|radon|asbestos|carbon monoxide|noise pollution|water pollution|point source|nonpoint|eutrophication|dead zone\w*|hypoxi\w+|dissolved oxygen|biochemical oxygen demand|bod\b|thermal pollution|endocrine disruptor\w*|lethal dose|ld50|dose[- ]response|bioaccumulat\w+|biomagnif\w+|mercury|lead poisoning|wastewater|sewage|septic|solid waste|landfill\w*|e[- ]waste|recycl\w+|composting|pathogen\w*|cholera|dysentery|malaria|zika|stratospheric ozone|cfc\w*|montreal protocol|greenhouse (?:gas|effect)\w*|global warming|climate change|carbon dioxide|methane|sea level|ocean acidification|kyoto|paris agreement|invasive species|endangered|habitat fragmentation|hippco|coral bleaching)\b/i,
      skills: [
        'Unit 7: major air pollutants and their sources, photochemical smog (NOx, VOCs, sunlight, tropospheric ozone), thermal inversions, acid deposition (SO₂ and NOx), the Clean Air Act, indoor air pollutants (radon, asbestos, CO, VOCs), reduction methods (catalytic converters, scrubbers, electrostatic precipitators), noise pollution',
        'Unit 8: point and nonpoint sources, eutrophication and dead zones (nutrients, algal blooms, decomposition, low dissolved oxygen), BOD, thermal pollution, endocrine disruptors, heavy metals, LD50 and dose-response curves, bioaccumulation and biomagnification (DDT, mercury), wastewater treatment (primary, secondary, tertiary), solid waste and landfills, e-waste, the three Rs, waterborne pathogens and vector-borne diseases',
        'Unit 9: stratospheric ozone depletion (CFCs, the Montreal Protocol) as distinct from the greenhouse effect, greenhouse gases and the greenhouse effect, global climate change and its evidence and effects (sea level, ice, ocean circulation), ocean warming and acidification, invasive species, endangered species, HIPPCO and habitat fragmentation, international agreements',
      ],
      hard: [
        'A dissolved-oxygen graph downstream of a sewage outfall (the oxygen sag curve) with the item about where decomposers are most active',
        'Stratospheric ozone depletion and the greenhouse effect kept apart: which problem CFCs cause, and which the Montreal Protocol addressed',
        'Biomagnification: the concentration multiplying at each trophic level from a table, and why a fat-soluble, persistent toxin does it',
        'A thermal inversion item explaining why pollution is worst on a cold, still, clear morning in a valley',
        'Ocean acidification as a CO₂ problem, with the chemistry (carbonic acid, fewer carbonate ions for shells), not a warming problem',
      ],
      traps: ['the ozone hole given as a cause of global warming', 'eutrophication said to kill fish by poisoning rather than low oxygen', 'water-soluble toxins given biomagnification', 'a thermal inversion described as warm air near the ground', 'ocean acidification attributed to acid rain'],
      exemplars: [
        `MC_QUESTION: Scientists measured dissolved oxygen in a river at several distances downstream from a sewage outfall. Which of the following best explains the pattern in the data?
\`\`\`graph
kind: bar
title: Dissolved oxygen downstream of the outfall
bar: 0 km | 8.5
bar: 2 km | 5.0
bar: 5 km | 2.5
bar: 10 km | 4.5
bar: 20 km | 7.5
\`\`\`
A) The sewage adds oxygen-rich water, which is gradually mixed away downstream.
B) Decomposers consuming the organic waste use up oxygen, and oxygen recovers downstream as the waste is depleted and the water reaerates.
C) Warmer water near the outfall holds more oxygen than cooler water downstream.
D) Algae near the outfall remove oxygen by photosynthesis, which stops farther downstream.
Correct Answer: B
Explanation: This is the oxygen sag curve: aerobic bacteria breaking down the organic waste raise the biochemical oxygen demand, so dissolved oxygen falls, then recovers as waste is used up. Option C is backwards (warmer water holds less oxygen), and photosynthesis adds oxygen, not removes it.`,
        `MC_QUESTION: The table shows the concentration of a pesticide in organisms of a lake food chain. Which property of the pesticide best explains the pattern?
\`\`\`graph
kind: table
title: Pesticide concentration by trophic level
columns: Organism | Concentration (ppm)
row: Lake water | 0.00005
row: Zooplankton | 0.04
row: Small fish | 0.5
row: Large fish | 2.0
row: Fish-eating birds | 25
\`\`\`
A) It is water-soluble and excreted quickly by each organism.
B) It is fat-soluble and persistent, so it is stored in tissue and passed up the chain.
C) It breaks down rapidly in sunlight at the lake surface.
D) It is a nutrient that stimulates growth at higher trophic levels.
Correct Answer: B
Explanation: Concentrations climbing by a factor of 10 or more at each step is biomagnification, which needs a toxin that is stored in fat and not broken down or excreted. A water-soluble toxin (A) is excreted and does not accumulate.`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the recall items (a definition, a single fact). At most 1 item in 8 that easy, never first in a section; about half typical (one stimulus read and one concept applied) and at least a third of the kind under WHAT HARD LOOKS LIKE. Free-response parts should need a specific explanation or a worked calculation, not a term.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 4 from a 5. At least 4 of every 5 items must be ones a student headed for a 3 would miss: data sets where the pattern must be explained with a mechanism, two-step calculations without a calculator, trade-off items with one real limitation among plausible ones, the ozone/greenhouse and eutrophication/toxicity distinctions, and FRQ parts where a vague answer earns nothing. Hard never means obscure trivia outside the course framework.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one concept each, in the exam's voice, with the stimulus stated plainly. Still real exam items.`,
  },
}
