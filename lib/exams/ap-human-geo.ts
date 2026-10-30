// The AP Human Geography exam as a reference for the guide prompts: Section I
// multiple choice (four options, many on a stimulus: a described map, a data
// table, a described photograph, a short quotation) and Section II three
// free-response questions in parts (Identify / Describe / Explain / Compare),
// one of which uses a stimulus. Units 1-7 grouped into four domains.

import type { ExamProfile } from './types'

export const AP_HUMAN_GEO: ExamProfile = {
  id: 'ap-human-geo',
  pace: 60,
  name: 'the AP Human Geography exam',
  detect: {
    exam: /\bAP\s+Human\s+Geo(?:graphy)?\b|\bAPHG\b|\bAP\s+HuG\b/i,
    subjectHints: /./,
    subjects: ['history', 'social-studies', 'social studies', 'science'],
    explicit: /\bAP\s+Human\s+Geo(?:graphy)?\b|\bAPHG\b|\bAP\s+HuG\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly four options A-D, as on Section I of this exam. No true/false, no "I, II and III" lists. About half the items sit on a stimulus the exam would show: a described map ("The map shows the percentage of each country's population living in urban areas in 2020; the darkest shading covers ..."), a table figure (kind: table) with population, economic or agricultural data, a described photograph or landscape ("The photograph shows a street of two-story shophouses with signs in three scripts ..."), or a short quotation attributed generically ("a planning document from a mid-sized city in the American Midwest, 2015"). Put the described stimulus in a \`\`\`passage fence under the question line or use a table figure; items that share a stimulus each repeat it, so every item stands alone. Never invent a real statistic for a named country: round, plausible figures labeled as illustrative, or unnamed regions.
- Stems are the exam's: "Which of the following best explains the pattern shown on the map?", "The data in the table best support which of the following conclusions?", "The landscape shown in the photograph is most characteristic of ...", "Which of the following models best accounts for ...?", "The process described in the passage is an example of ...", "Which of the following is the most likely consequence of the trend shown?", "Compared with ..., countries in stage 2 of the demographic transition model are more likely to ...". Items ask for the concept that explains a pattern, never for a term's definition on its own; concepts appear as the exam names them (demographic transition model, Ravenstein's laws, the gravity model, von Thünen's model, central place theory, Rostow's stages, Wallerstein's world-systems theory, Weber's least cost theory, bid-rent theory, Christaller, Burgess, Hoyt, Harris and Ullman, devolution, gerrymandering, supranationalism, acculturation, syncretism).
- Free-response parts are SA_QUESTION, one per part, in the exam's form: "A. Identify ONE ...", "B. Describe ONE way ...", "C. Explain how ... affects ...", "D. Compare ... in a core country with ... in a periphery country", often with a stimulus. The Sample Answer is the scoring guideline: one acceptable point-earning response (a specific, complete statement with a because or so that clause for Explain parts) and a note on what is too vague to score ("'it changes the culture' earns nothing; 'the arrival of migrants introduces new foods and places of worship that locals adopt, an example of acculturation' earns the point").
- Options are four parallel statements, each true somewhere; the wrong ones are wrong for this stimulus (see WRONG ANSWERS ARE BUILT FROM): the right model applied to the wrong scale, the stage next to the right one, cause and effect reversed, a core-country pattern attributed to the periphery.
- Before writing an item's answer, check that exactly one option fits the stimulus and that each wrong one fails for a nameable reason. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the clue in the stimulus, the concept, and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'population-migration',
      name: 'Units 1-2: thinking geographically; population and migration',
      share: 'about 20-28% of the test',
      detect: /\b(unit [12]\b|map projection|scale|region\w*|formal region|functional region|vernacular|perceptual|spatial|diffusion|distance decay|time[- ]space compression|GIS|remote sensing|census|population (?:density|distribution|pyramid|growth|policy)|arithmetic density|physiological density|agricultural density|demographic transition|DTM|epidemiolog\w+|crude birth rate|CBR|CDR|total fertility|TFR|natural increase|NIR|doubling time|dependency ratio|malthus\w*|neo[- ]malthus\w*|boserup|pronatalist|antinatalist|one[- ]child|aging population|migration|ravenstein|push (?:and|\/) pull|push factor|pull factor|intervening (?:obstacle|opportunit\w+)|chain migration|step migration|forced migration|refugee\w*|internally displaced|asylum|guest worker\w*|remittance\w*|brain drain|gravity model|counter[- ]?urbanization)\b/i,
      skills: [
        'Unit 1: maps and projections, scale of analysis (global, national, local), regions (formal, functional, vernacular), spatial patterns and processes (diffusion types, distance decay, time-space compression), geographic data and its sources',
        'Unit 2: population distribution and the three densities, population composition from pyramids, the demographic transition and epidemiological transition models by stage, measures (CBR, CDR, TFR, NIR, doubling time, dependency ratio), Malthus and his critics, pronatalist and antinatalist policies, aging populations; migration theory (Ravenstein, push and pull, intervening obstacles and opportunities, the gravity model), types of migration (forced, voluntary, chain, step, guest workers, refugees and IDPs) and their effects on origins and destinations (remittances, brain drain)',
      ],
      hard: [
        'A population pyramid described in words, read for its stage and for the policy or event that produced a notch in it',
        'The same data at two scales giving different conclusions (a national average that hides regional contrast)',
        'A migration flow explained by Ravenstein\'s laws and the gravity model together, with an intervening opportunity',
        'Physiological and agricultural density compared to say something about farming, not just crowding',
      ],
      traps: ['arithmetic density read as physiological density', 'stage 2 and stage 3 of the DTM swapped (falling CBR vs falling CDR)', 'a pronatalist policy inferred from a low TFR without evidence', 'remittances read as a cost to the origin country', 'relocation and expansion diffusion confused'],
      exemplars: [
        `MC_QUESTION: The data in the table best support which of the following conclusions about Country X?
\`\`\`graph
kind: table
title: Demographic indicators for Country X, 1990 and 2020 (illustrative)
columns: Indicator | 1990 | 2020
row: Crude birth rate (per 1,000) | 42 | 24
row: Crude death rate (per 1,000) | 14 | 7
row: Total fertility rate | 6.1 | 3.0
row: Percent urban | 28 | 51
\`\`\`
A) Country X has moved from stage 2 to stage 3 of the demographic transition model, with birth rates falling as the country urbanizes
B) Country X has entered stage 4 of the demographic transition model, with births and deaths roughly equal
C) Country X is experiencing negative natural increase and an aging population
D) Country X has adopted a pronatalist policy that has raised fertility
Correct Answer: A
Explanation: Death rates fell first and birth rates are now falling fast while urbanization rises: the move from stage 2 into stage 3. The 2020 rate of natural increase is still 17 per 1,000, so B (near zero growth) and C (negative) are wrong, and fertility halved, so D is backwards.`,
        `SA_QUESTION: C. Explain ONE way that remittances from migrants can affect the economy of the migrants' country of origin.
Sample Answer: Scoring guideline (1 point): the response must name an effect and explain the mechanism. Earns the point: "Remittances raise household income in the origin country, so families can spend on housing, schooling and small businesses, which increases local demand and can reduce poverty in sending regions." Also acceptable: a negative effect with its mechanism (dependence on remittances that fall in a recession abroad; rising prices in sending communities). Does not earn it: "Remittances help the economy" (no mechanism), or an effect on the destination country.`,
      ],
    },
    {
      id: 'culture',
      name: 'Unit 3: cultural patterns and processes',
      share: 'about 13-17% of the test',
      detect: /\b(unit 3\b|culture|cultural (?:landscape|hearth|trait|complex|relativism|convergence|divergence)|folk culture|popular culture|pop culture|material culture|placelessness|sequent occupance|language famil\w+|language branch|dialect|isogloss|lingua franca|creole|pidgin|toponym\w*|religion\w*|universalizing|ethnic religion|sacred (?:space|site)|pilgrimage|hearth|diffusion|hierarchical diffusion|contagious diffusion|stimulus diffusion|relocation diffusion|acculturation|assimilation|syncretism|multiculturalism|ethnicity|ethnic enclave|ethnocentrism|globalization of culture|centripetal|centrifugal)\b/i,
      skills: [
        'Culture as traits, complexes and landscapes; folk and popular culture compared by hearth, diffusion and landscape; the cultural landscape read for sequent occupance and placelessness',
        'Diffusion types (relocation, expansion: contagious, hierarchical, stimulus) applied to languages, religions and popular culture',
        'Languages: families, branches and dialects; lingua francas, pidgins and creoles; toponyms as evidence of history',
        'Religions: universalizing and ethnic religions by hearth, diffusion and landscape (sacred sites, architecture, burial practices)',
        'Cultural change through contact: acculturation, assimilation, syncretism, multiculturalism; culture as a centripetal or centrifugal force',
      ],
      hard: [
        'A landscape description read for which diffusion type produced it (a chain store in a provincial capital before smaller towns: hierarchical)',
        'A religion identified as universalizing or ethnic from its spatial pattern and practices, not its name',
        'Acculturation distinguished from assimilation and syncretism in a described neighborhood',
        'Popular culture\'s effect on folk culture traced to a specific landscape change',
      ],
      traps: ['folk culture read as rural only', 'hierarchical diffusion read as spread from the top of a social hierarchy only', 'a creole confused with a lingua franca', 'ethnic religions described as proselytizing', 'assimilation used where only acculturation is shown'],
      exemplars: [
        `MC_QUESTION: The landscape described in the passage is best explained by which of the following processes?
\`\`\`passage
Field notes from a geographer visiting a neighborhood of a large port city, 2018

The main street is lined with two-story buildings whose ground floors hold groceries, a bakery and three restaurants, with signs in two scripts. A house of worship built in the style of the migrants' homeland stands beside a school that teaches in the national language. On weekends, the restaurants fill with residents from across the city who come for food that has become part of the city's dining culture, while younger members of the community speak the national language among themselves.
\`\`\`
A) Acculturation, in which the migrant community adopts elements of the host culture while the host society adopts some of the migrants' traits
B) Complete assimilation, in which the migrant community has lost its distinct cultural identity
C) Relocation diffusion of folk culture that has remained isolated from the surrounding city
D) Cultural divergence between the migrant community and the host society
Correct Answer: A
Explanation: Two-way exchange (migrants' food adopted citywide, the young speaking the national language) with a visible retained identity (the house of worship, the scripts) is acculturation. B goes too far, C ignores the exchange, and D describes growing difference, the opposite of what the notes show.`,
      ],
    },
    {
      id: 'political',
      name: 'Unit 4: political patterns and processes',
      share: 'about 12-17% of the test',
      detect: /\b(unit 4\b|state\b|nation\b|nation[- ]state|multinational state|multistate nation|stateless nation|autonomous region|sovereignty|territoriality|colonialism|imperialism|decoloniz\w+|neocolonialism|shatterbelt|choke ?point|boundar\w+|border\w*|antecedent|subsequent|superimposed|relic boundary|geometric boundary|demarcat\w+|delimit\w+|UNCLOS|law of the sea|exclusive economic zone|EEZ|territorial sea|unitary|federal\w*|devolution|ethnic separatism|irredentism|balkaniz\w+|supranational\w*|european union|united nations|NATO|redistricting|gerrymander\w*|electoral geography|voting district|centripetal|centrifugal|heartland|rimland|organic theory)\b/i,
      skills: [
        'States, nations and their combinations (nation-state, multinational state, multistate nation, stateless nation, autonomous region); sovereignty and territoriality; colonial legacies and neocolonialism; shatterbelts and choke points',
        'Boundaries by origin (antecedent, subsequent, superimposed, relic, geometric) and the process of defining, delimiting and demarcating them; UNCLOS and maritime zones',
        'Unitary and federal states; devolution\'s causes (ethnic, economic, spatial) and outcomes; irredentism and balkanization',
        'Supranational organizations and what states give up to join them; centripetal and centrifugal forces',
        'Electoral geography: redistricting, gerrymandering (packing and cracking) and their effects on representation',
      ],
      hard: [
        'A described border read for its origin type and for the conflict that origin predicts (a superimposed boundary across ethnic territories)',
        'Devolution\'s cause identified from a region\'s profile (economic grievance vs ethnic distinctness) rather than its name',
        'A described set of district maps read for packing versus cracking and for which party gains',
        'Supranationalism\'s cost to sovereignty distinguished from its economic benefits in a source',
      ],
      traps: ['nation and state used interchangeably', 'a superimposed boundary called geometric because it is straight', 'devolution confused with secession or with decolonization', 'federalism read as weaker government rather than divided sovereignty', 'packing and cracking swapped'],
      exemplars: [
        `MC_QUESTION: The redistricting plan described in the passage is best characterized as an example of which of the following?
\`\`\`passage
Description of a state's new legislative map, following a census

Supporters of the party in control of the legislature are spread fairly evenly across the state's cities and suburbs. Under the new map, most of the opposing party's voters, who are concentrated in two cities, have been drawn into three districts in which they make up more than 80 percent of voters. The remaining districts each contain a modest majority for the party that drew the map.
\`\`\`
A) Packing, a form of gerrymandering that concentrates the opposing party's voters into a few districts so that their votes are wasted elsewhere
B) Cracking, a form of gerrymandering that splits the opposing party's voters across many districts so they are a minority in each
C) Reapportionment, the reallocation of seats among states after a census
D) Devolution, the transfer of districting authority from the state to its cities
Correct Answer: A
Explanation: Drawing the opposition into three districts at 80 percent wastes its surplus votes and leaves the other districts to the map's authors: packing. Cracking (B) would spread those voters thin rather than concentrate them; C is about seats among states, not lines within one.`,
      ],
    },
    {
      id: 'economic',
      name: 'Units 5-7: agriculture and rural land use; cities and urban land use; industrialization and economic development',
      share: 'about 38-50% of the test',
      detect: /\b(unit [567]\b|agricultur\w+|farming|subsistence|commercial farming|intensive|extensive|shifting cultivation|pastoral\w*|plantation|market gardening|mixed crop|dairy|grain farming|ranching|agricultural hearth|first agricultural revolution|second agricultural revolution|green revolution|GMO|genetically modified|agribusiness|commodity chain|von th(?:ü|u)nen|bid[- ]rent|metes and bounds|township and range|long[- ]lot|rural settlement|clustered|dispersed|linear settlement|food desert|aquaculture|organic|fair trade|urban\w*|city|cities|suburb\w*|megacit\w+|metacit\w+|primate city|rank[- ]size|central place theory|christaller|threshold|range\b|urban hierarchy|world cit\w+|global cit\w+|burgess|concentric zone|hoyt|sector model|harris and ullman|multiple nuclei|galactic city|edge cit\w+|latin american city|griffin[- ]ford|african city|southeast asian city|mcgee|gentrification|redlining|blockbusting|zoning|smart growth|new urbanism|urban sprawl|squatter settlement|informal settlement|favela|infrastructure|sustainab\w+|industrial\w+|industrial revolution|fordis\w+|post[- ]fordis\w+|weber|least cost theory|agglomeration|deindustrializ\w+|rust belt|outsourcing|offshoring|maquiladora\w*|special economic zone\w*|export processing|free trade zone|economic sector\w*|primary sector|secondary sector|tertiary|quaternary|quinary|development|GDP|GNI|HDI|gender inequality index|GII|rostow|stages of (?:economic )?growth|wallerstein|world[- ]systems|core|periphery|semi[- ]periphery|dependency theory|commodity dependence|microloan\w*|microfinance|comparative advantage|complementarity|neoliberal\w*|trade (?:bloc|agreement)|tourism|ecotourism)\b/i,
      skills: [
        'Unit 5: agricultural hearths and diffusion; the three agricultural revolutions and the Green Revolution\'s effects; farming types by intensity and purpose with the climates and regions they fit; von Thünen\'s model and its assumptions; settlement and survey patterns; agribusiness, commodity chains and their environmental and social consequences; food insecurity and food deserts',
        'Unit 6: urbanization\'s causes and the urban hierarchy (rank-size, primate cities, central place theory); world and mega cities; models of internal structure (Burgess, Hoyt, Harris and Ullman, the galactic city, and the Latin American, African and Southeast Asian models); housing and land use issues (zoning, redlining, blockbusting, gentrification, squatter settlements, sprawl, smart growth, new urbanism); urban sustainability',
        'Unit 7: the Industrial Revolution\'s diffusion; economic sectors and the changing mix by development; Weber\'s least cost theory, agglomeration and deindustrialization; measures of development (GDP, GNI per capita, HDI, GII) and their limits; Rostow\'s stages and Wallerstein\'s world-systems theory compared; trade, outsourcing, special economic zones and the new international division of labor; sustainable development and ecotourism',
      ],
      hard: [
        'Von Thünen\'s rings applied to a described region where a river or a second market breaks the assumption',
        'A city\'s described structure matched to a model by the location of its elite housing and informal settlements',
        'The same country placed in Rostow\'s and Wallerstein\'s frameworks, with what each explains and misses',
        'A measure of development (HDI vs GNI per capita) chosen for what a described comparison needs',
        'Gentrification\'s causes and effects separated in a passage that mixes them',
      ],
      traps: ['intensive read as "uses machines" rather than high inputs per unit of land', 'the Green Revolution credited with Africa\'s gains', 'central place theory applied to the structure inside one city', 'Hoyt\'s sectors confused with Burgess\'s rings', 'deindustrialization read as a loss of output rather than of employment share', 'Rostow\'s stages treated as a model of all countries\' paths without its critiques'],
      exemplars: [
        `MC_QUESTION: Which of the following models best accounts for the pattern described in the passage?
\`\`\`passage
Description of a city in Latin America

A commercial spine lined with offices, hotels and the city's wealthiest apartments extends from the central business district outward to a mall at its far end. Zones of maturity with older but well-kept housing surround the center, while on the city's outer edge, especially on steep slopes, residents have built their own homes without services, and a ring of recently settled informal housing continues to grow.
\`\`\`
A) The Latin American city model, with an elite spine extending from the CBD and a periphery of squatter settlements
B) The concentric zone model, with the wealthiest residents living farthest from the center
C) The multiple nuclei model, with several unrelated centers of equal importance
D) The galactic city model, with edge cities on a beltway around a declining core
Correct Answer: A
Explanation: An elite spine from the CBD to a mall and a periferico of self-built housing is the Griffin-Ford Latin American model. B puts wealth at the edge, the opposite of this city, and D describes a North American pattern of edge cities, not informal settlements.`,
        `SA_QUESTION: B. Describe ONE limitation of using gross national income (GNI) per capita to compare the level of development of two countries.
Sample Answer: Scoring guideline (1 point): a complete statement of a specific limitation. Earns the point: "GNI per capita is an average, so it hides how income is distributed; a country with a small wealthy elite and a poor majority can have the same figure as one with a broad middle class." Also acceptable: it leaves out non-market work and the informal economy; it says nothing about health, education or gender equality (which HDI and GII add); exchange rates distort it unless adjusted for purchasing power. Does not earn it: "It doesn't show everything" or "it is just money" with no stated limitation.`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the recall items (a term's definition, a model's name). At most 1 item in 8 that easy, never first in a section; about half typical (one concept applied to one stimulus) and at least a third of the kind under WHAT HARD LOOKS LIKE. Free-response parts should need a specific example and a mechanism, not a term.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 4 from a 5. At least 4 of every 5 items must be ones a student headed for a 3 would miss: a stimulus that fits two models until one assumption is checked, the stage next to the right one, data at a scale that changes the conclusion, a described landscape whose clue is a single detail, and Explain parts where the mechanism is the point. Hard never means obscure place facts outside the course framework.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one concept each, with the stimulus stated plainly and the clue obvious. Still real exam items.`,
  },
}
