// The Cambridge International AS Level Environmental Management exam (8291;
// AICE Environmental Management in Florida) as a reference for the guide
// prompts: two structured papers, no multiple choice. Questions sit on a
// data stimulus ("Fig. 1.1 shows ...") or a case study, with command words
// and marks in brackets; evaluation parts are levels-marked. Syllabus topics
// grouped into four domains.

import type { ExamProfile } from './types'
import { AICE_DIFFICULTY, AICE_ITEM_RULES } from './aice'

const PROGRAMME = String.raw`(?:AICE|Cambridge|(?:AS|A)[- ]?Level)`
const SUBJECT = String.raw`Environmental\s+Management`
const EXAM = new RegExp(String.raw`\b${PROGRAMME}\b[^.\n]{0,40}\b${SUBJECT}\b|\b${SUBJECT}\b[^.\n]{0,40}\b${PROGRAMME}\b`, 'i')

export const AICE_ENVIRONMENTAL_MANAGEMENT: ExamProfile = {
  id: 'aice-environmental-management',
  name: 'the Cambridge AS Level Environmental Management exam (AICE Environmental Management, 8291)',
  detect: {
    exam: EXAM,
    subjectHints: /./,
    subjects: ['science', 'history', 'social-studies', 'social studies'],
    explicit: EXAM,
  },
  itemRules: AICE_ITEM_RULES('the Cambridge AS Level Environmental Management exam', {
    mcq: false,
    structured: 'Parts run 1-4 marks, with one 6-mark evaluation ("Evaluate ...", "To what extent ...") in every set, marked by levels.',
    extra: [
      `- Almost every question opens on a stimulus the way the papers do: "Fig. 1.1 shows ..." followed by a table (kind: table figure) or a graph (kind: bar or kind: plane) of illustrative data, or a short case study in a \`\`\`passage fence ("A town of 40 000 people in a semi-arid region ..."). Then the parts: "Describe the trend shown in Fig. 1.1. [2]" (pattern plus figures quoted with units), "Suggest two reasons for the change shown. [2]", "Explain how ... [3]", "Describe one strategy for ... and explain one limitation of it. [4]", "Evaluate the strategy ... [6]".`,
      `- Case-study parts are generic ("a country with a rapidly growing population", "a coastal city"), never a real named place with invented numbers. A real example may be named only as the kind of place where the strategy is used, without statistics.`,
      `- Mark schemes credit specific, environmental-management vocabulary: sustainable development, carrying capacity, renewable and non-renewable resources, biodiversity, ecosystem services, eutrophication, bioaccumulation, enhanced greenhouse effect, demographic transition, the precautionary principle, polluter pays, conservation vs preservation.`,
    ],
  }),
  domains: [
    {
      id: 'research-data',
      name: 'Environmental research, data and sustainability',
      share: 'about a sixth of the test (the skills run through every paper)',
      detect: /\b(research|investigat\w+|sampl\w+|quadrat\w*|transect\w*|questionnaire\w*|survey\w*|data|graph\w*|table\w*|mean|median|range|anomal\w+|reliab\w+|valid\w+|accura\w+|precis\w+|bias|method\w*|evaluat\w+|sustainab\w+|carrying capacity|resource\w*|renewable|non-renewable|ecosystem services|indicator\w*|footprint)\b/i,
      skills: [
        'Planning an investigation: aims and hypotheses, independent, dependent and control variables, sampling (random, systematic, stratified; quadrats and transects; questionnaires and interviews), sample size and repeats',
        'Presenting and processing data: choosing the graph (bar, line, pie, scatter), means and ranges, percentage change, reading trends and anomalies with figures quoted',
        'Evaluating methods and conclusions: reliability vs validity vs accuracy, bias in social surveys, limitations and improvements, the strength of a conclusion from the data given',
        'Sustainability as a lens: renewable and non-renewable resources, carrying capacity, ecosystem services, the three pillars of sustainable development, indicators of environmental quality',
      ],
      hard: [
        'A sampling method judged for the question asked (random quadrats vs a transect across a gradient) with the reasoning in terms of bias and representativeness',
        'A trend described with the anomaly separated out and a reason suggested for it',
        'Reliability and validity kept apart in an evaluation of a questionnaire survey',
        'A conclusion qualified: what the data can and cannot show, and the extra data needed',
      ],
      traps: ['"more repeats" offered to fix validity', 'a trend described without figures', 'correlation read as cause', 'random sampling used across an obvious gradient'],
      exemplars: [
        `SA_QUESTION: A student investigated the effect of distance from a road on the number of lichen species on tree trunks. Trees were sampled every 20 m along a line from the road into a wood. (a) State the name of this sampling method. [1] (b) Explain why this method is more suitable than random sampling for this investigation. [2] (c) Suggest two variables, other than distance from the road, that could affect the number of lichen species, and describe how the student could control one of them. [3]
Sample Answer: (a) 1 mark: systematic sampling along a (line) transect. (b) 1 mark: the variable of interest (pollution from traffic) changes with distance from the road, a gradient; 1 mark: systematic sampling at fixed intervals makes sure every distance is represented, while random sampling could miss parts of the gradient or cluster near one end. (c) 1 mark each for two of: species of tree (bark texture or pH), aspect of the trunk sampled (north vs south side), trunk diameter or tree age, shading, height above ground of the quadrat; 1 mark: controlling one, e.g. sample only one species of tree, or always sample the north side of each trunk at 1.5 m. "Weather" with no explanation of control earns the variable mark only if it is plausible; "be careful" earns nothing.`,
      ],
    },
    {
      id: 'lithosphere-hydrosphere',
      name: 'Lithosphere and hydrosphere',
      share: 'about a quarter of the test',
      detect: /\b(rock\w*|igneous|sedimentary|metamorphic|mineral\w*|mining|quarr\w+|ore\w*|soil\w*|erosion|weathering|desertification|salinisation|salinization|lithosphere|tecton\w+|volcan\w+|earthquake\w*|hydrosphere|water cycle|hydrological|aquifer\w*|groundwater|river\w*|dam\w*|reservoir\w*|irrigat\w+|drought\w*|flood\w*|water (?:supply|quality|stress|scarcity|treatment)|desalination|sewage|potable|wetland\w*)\b/i,
      skills: [
        'The lithosphere: rock types and the rock cycle, the formation and extraction of mineral resources, the impacts of mining (habitat loss, spoil heaps, acid mine drainage, dust, subsidence) and how they are managed and sites restored',
        'Soils: composition and formation, soil profiles, fertility, soil erosion by wind and water (causes: deforestation, overgrazing, ploughing) and its control (contour ploughing, terracing, windbreaks, cover crops), desertification and salinisation',
        'The hydrosphere: the water cycle, where fresh water is stored, water supply (reservoirs, aquifers, desalination, rainwater harvesting), water quality and treatment, pollution of water (sewage, agricultural runoff, industry) and its indicators',
        'Water management: irrigation methods and their efficiency (flood, sprinkler, drip), water stress and scarcity, floods and drought and their causes, dams with their costs and benefits, managing demand',
      ],
      hard: [
        'A soil erosion strategy matched to the cause and the landform (terracing on steep slopes, windbreaks on flat dry land) with the mechanism explained',
        'Drip irrigation evaluated against flood irrigation on water efficiency, cost and salinisation',
        'A large dam evaluated with both sides (power, water supply, flood control vs sediment trapping, displacement, downstream effects) and a judgement',
        'Water-quality data (BOD, nitrate, dissolved oxygen) read along a river below a sewage outfall',
      ],
      traps: ['weathering and erosion used as one word', 'irrigation said to cause erosion rather than salinisation', 'groundwater treated as inexhaustible', 'a dam evaluated with benefits only'],
      exemplars: [
        `SA_QUESTION: Fig. 2.1 shows the dissolved oxygen concentration of a river at sampling points downstream of a sewage outfall. (a) Describe the trend shown in Fig. 2.1. [2] (b) Explain why the dissolved oxygen concentration changes in this way. [3]
\`\`\`graph
kind: plane
title: Fig. 2.1 Dissolved oxygen downstream of an outfall (illustrative)
xlabel: distance downstream / km
ylabel: dissolved oxygen / mg per dm3
x: 0, 12
y: 0, 10
segment: (0, 9) (1, 4)
segment: (1, 4) (2, 2)
segment: (2, 2) (4, 3)
segment: (4, 3) (8, 7)
segment: (8, 7) (12, 9)
point: (0, 9)
point: (1, 4)
point: (2, 2)
point: (4, 3)
point: (8, 7)
point: (12, 9)
\`\`\`
Sample Answer: (a) 1 mark: dissolved oxygen falls sharply just below the outfall and then recovers further downstream; 1 mark: from 9 mg per dm³ at the outfall to a minimum of 2 mg per dm³ at 2 km, back to 9 mg per dm³ by 12 km. (b) 1 mark: sewage adds organic matter, which is food for aerobic bacteria; 1 mark: the bacteria multiply and respire, using up dissolved oxygen (a high biochemical oxygen demand); 1 mark: downstream the organic matter is used up, so bacterial numbers fall, and oxygen returns by re-aeration from the air and photosynthesis by plants and algae. "Pollution uses oxygen" with no bacteria earns at most 1 mark.`,
      ],
    },
    {
      id: 'atmosphere-biosphere',
      name: 'Atmosphere and biosphere',
      share: 'about a quarter of the test',
      detect: /\b(atmospher\w+|weather|climate|greenhouse|global warming|climate change|carbon dioxide|methane|CO2|ozone|CFC\w*|ultraviolet|acid rain|smog|particulate\w*|air (?:pollution|quality)|biosphere|ecosystem\w*|biome\w*|biodiversity|habitat\w*|species|extinct\w*|conservation|preserv\w+|national park\w*|forest\w*|deforestation|rainforest\w*|agricultur\w+|farming|crop\w*|pesticide\w*|fertili[sz]er\w*|food security|GM|organic|yield\w*|photosynthe\w+|nutrient cycl\w*)\b/i,
      skills: [
        'The atmosphere: its structure and composition, weather and climate, the natural and enhanced greenhouse effect, evidence for climate change (temperature records, ice cores, sea level, glaciers) and its predicted impacts, mitigation and adaptation',
        'Atmospheric pollution: sources and effects of carbon monoxide, sulfur dioxide and acid rain, nitrogen oxides, particulates and photochemical smog; ozone depletion by CFCs and the Montreal Protocol as a management success; strategies (catalytic converters, scrubbers, clean fuels, legislation)',
        'The biosphere: ecosystems, biomes and their distribution, food webs and nutrient cycling, biodiversity and why it matters, causes of extinction (habitat loss, invasive species, pollution, overexploitation, climate change), conservation methods in situ and ex situ',
        'Agriculture and forests: soil and water needs, intensive vs subsistence farming, the Green Revolution, fertilisers, pesticides, irrigation and their impacts, GM crops, food security; the value of forests, deforestation and its effects, sustainable forest management and agroforestry',
      ],
      hard: [
        'The enhanced greenhouse effect explained as a mechanism (short-wave in, long-wave out, absorbed and re-emitted) and distinguished from ozone depletion',
        'Acid rain traced from a named source gas to a named effect, with the chemistry outline and a management strategy judged',
        'Intensive farming evaluated on yield against soil, water and biodiversity costs with a conclusion',
        'A conservation strategy (captive breeding vs habitat protection) weighed for a named kind of species',
      ],
      traps: ['the ozone hole given as a cause of global warming', 'greenhouse gases said to let heat in rather than trap heat leaving', 'organic farming said to need no inputs', 'deforestation effects listed without the mechanism (less transpiration, exposed soil, carbon released)'],
      exemplars: [
        `SA_QUESTION: Explain how an increase in the concentration of carbon dioxide in the atmosphere leads to an increase in global temperatures. [3]
Sample Answer: 1 mark: short-wave solar radiation passes through the atmosphere and warms the Earth's surface, which then emits long-wave (infrared) radiation; 1 mark: carbon dioxide absorbs this long-wave radiation and re-emits it in all directions, including back towards the surface; 1 mark: a higher concentration of carbon dioxide absorbs and re-emits more of the outgoing radiation, so less escapes to space and the lower atmosphere and surface warm (the enhanced greenhouse effect). Also credited: positive feedbacks such as melting ice lowering albedo. Any mention of the ozone layer or "holes letting heat in" earns nothing for that point.`,
        `SA_QUESTION: A government plans to reduce the loss of its tropical forest by paying villages for every hectare of forest that remains standing each year. Evaluate this strategy. [6]
Sample Answer: Levels marking. Level 3 (5-6 marks): a developed evaluation with points on both sides and a supported judgement. Level 2 (3-4 marks): some explanation of benefits and limitations but one-sided or without a judgement. Level 1 (1-2 marks): simple assertions. Points for: payments give the forest a value standing, so villages gain an income without logging and the forest's ecosystem services (carbon storage, water regulation, biodiversity) are kept; it rewards those closest to the forest who can monitor it. Points against: it depends on funding continuing and on monitoring (satellite checks, patrols) to prevent payments for forest already cleared; logging may move to unpaid forest elsewhere (leakage); the payment may be lower than the income from farming or timber, so poorer villages still clear land; benefits may not reach everyone in the village. Model Level 3 conclusion: the strategy can work where payments match or exceed what clearing would earn and where monitoring is reliable, but on its own it is unlikely to stop deforestation, so it should be combined with protected areas and alternative livelihoods.`,
      ],
    },
    {
      id: 'managing-human-impacts',
      name: 'Managing human impacts: population, urbanisation, energy, waste',
      share: 'about a quarter of the test',
      detect: /\b(population\w*|birth rate|death rate|fertility rate|natural increase|demographic\w*|population pyramid|ageing|aging|migration|urban\w+|cit(?:y|ies)|megacit\w+|slum\w*|squatter|housing|transport|energy|fossil fuel\w*|coal|oil|gas|nuclear|renewable\w*|solar|wind (?:power|farm|turbine)\w*|hydro\w*|geothermal|biofuel\w*|biomass|energy (?:efficien\w+|conservation|security|demand)|waste|landfill\w*|recycl\w+|incinerat\w+|plastic\w*|pollution control|legislation|polluter pays|precautionary)\b/i,
      skills: [
        'Population: measuring and changing birth and death rates, natural increase, the demographic transition model, population pyramids read for structure and future needs, migration causes and effects, managing population growth (education, family planning, policies) and ageing',
        'Urbanisation: causes (rural push, urban pull), problems of rapid growth (informal settlements, water, sanitation, traffic, air pollution, waste) and strategies for sustainable cities (transport, green spaces, services, planning)',
        'Energy: fossil fuels and their impacts, nuclear power, renewables (solar, wind, hydro, geothermal, biomass, tidal) each with advantages and limitations, energy efficiency and conservation, energy security and the choices a country faces',
        'Waste and pollution control: types of waste, the hierarchy (reduce, reuse, recycle, recover, dispose), landfill and incineration with their impacts, pollution control through technology, legislation (polluter pays, standards) and education',
      ],
      hard: [
        'A population pyramid read for the stage of the demographic transition and the services needed in 20 years',
        'Two energy sources compared for one location given its climate, geography and wealth',
        'An urban strategy evaluated for a low-income city rather than a wealthy one',
        'A waste strategy weighed with the hierarchy and a judgement about what the data allow',
      ],
      traps: ['a wide-based pyramid read as an ageing population', 'nuclear power called renewable', 'incineration said to produce no pollution', 'urbanisation treated only as a problem'],
      exemplars: [
        `SA_QUESTION: Fig. 4.1 shows the age structure of the population of a country. (a) Describe the age structure shown in Fig. 4.1. [2] (b) Suggest two problems this age structure may cause for the country in the next 20 years. [2] (c) Explain how improving the education of girls can reduce a country's birth rate. [2]
\`\`\`graph
kind: bar
title: Fig. 4.1 Population by age group, percent of total (illustrative)
xlabel: age group / years
ylabel: percent of population
bar: 0-14 | 42
bar: 15-29 | 27
bar: 30-44 | 16
bar: 45-59 | 9
bar: 60+ | 6
\`\`\`
Sample Answer: (a) 1 mark: a young population, with the largest group the youngest; 1 mark: 42% are under 15 and only 6% are 60 or over, each group smaller than the one below it (a wide-based pyramid, stage 2 of the demographic transition). (b) 1 mark each for two of: a large number entering the workforce with too few jobs; pressure on schools then housing and health services; the 0-14 group will reach child-bearing age, so the population keeps growing even if the fertility rate falls (population momentum); a high dependency ratio now. (c) 1 mark: educated girls marry and have their first child later, shortening the years of child-bearing; 1 mark: they are more likely to work, to know about and use contraception, and to want fewer children in whom they invest more. "Education helps" alone earns nothing.`,
      ],
    },
  ],
  difficulty: AICE_DIFFICULTY,
}
