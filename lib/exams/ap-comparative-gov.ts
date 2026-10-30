// The AP Comparative Government and Politics exam as a reference for the
// guide prompts: Section I multiple choice (55 items, four options, many on a
// stimulus) and Section II free response (conceptual analysis, quantitative
// analysis, comparative analysis, argument essay). The six course countries
// are China, Iran, Mexico, Nigeria, Russia and the United Kingdom.

import type { ExamProfile } from './types'

export const AP_COMP_GOV: ExamProfile = {
  id: 'ap-comparative-gov',
  pace: 87,
  name: 'the AP Comparative Government and Politics exam',
  detect: {
    exam: /\bAP\s+Comp(?:arative)?\s+Gov(?:ernment)?(?:\s+and\s+Politics)?\b/i,
    subjectHints: /./,
    subjects: ['history', 'social-studies', 'social studies'],
    explicit: /\bAP\s+Comp(?:arative)?\s+Gov(?:ernment)?(?:\s+and\s+Politics)?\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly four options A-D, as on Section I. No true/false, no "I, II and III" lists. Every item is about one or more of the six course countries (China, Iran, Mexico, Nigeria, Russia, the United Kingdom), never about any other country. About half the items sit on a stimulus in a \`\`\`passage fence under the question line (an excerpt attributed generically: "An excerpt from a constitution adopted after a revolution", "A report by a non-governmental organization on press freedom, 2019", "A description of an election by an international observer mission"; never a fabricated quotation attributed to a real named person) or on a kind: table figure of comparative data (vote share and seat share, oil revenue as a share of government revenue, Gini coefficients, turnout). Each item repeats its own stimulus so it stands alone.
- Stems are the exam's: "Which of the following best describes the regime type reflected in the passage?", "Which of the following is an accurate comparison of the legislatures of ... and ...?", "The data in the table best support which of the following conclusions?", "Which of the following electoral systems most likely produced the results shown?", "Which of the following is an example of ... in Nigeria?", "Which of the following best explains why ...?". Options are parallel statements; each wrong one is wrong for a nameable reason (true of a different country, the opposite institution, a different concept).
- Country facts must be the course's: Iran's Supreme Leader, Guardian Council (vets candidates and legislation) and Assembly of Experts; China's Communist Party, Politburo Standing Committee and National People's Congress; Russia's strong presidency, Federation Council, mixed Duma elections and "power vertical"; Mexico's one-term six-year presidency, mixed Chamber of Deputies, independent National Electoral Institute (INE, formerly IFE) and the end of PRI dominance in 2000; Nigeria's federal character principle, 25%-in-two-thirds-of-states presidential rule, oil rentier economy and Sharia courts in northern states; the United Kingdom's unwritten constitution, parliamentary sovereignty, unelected House of Lords, single-member-district plurality elections and devolution. Never invent a statistic, law, leader or date.
- Free-response items are SA_QUESTION, one per part, in the exam's four forms: conceptual analysis ("Define ... Describe ... Explain how ... in one course country"), quantitative analysis on a table or graph ("Identify the country with ... Describe a trend ... Draw a conclusion ... Explain how the data relate to ..."), comparative analysis ("Compare how two course countries ..."), and the argument essay (a thesis with a line of reasoning, evidence from two course countries, reasoning that ties the evidence to the thesis, and a response to an opposing view). The Sample Answer is the scoring guideline: the specific statement that earns each point and a note on what is too vague ("'the government is powerful' earns nothing; 'the Guardian Council disqualified candidates before the Majles election' earns the point").
- Check that exactly one option is correct for the stated country and concept. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the concept, the country fact, and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'regimes-states',
      name: 'Unit 1: Political systems, regimes and governments',
      share: 'about 18-27% of the test',
      detect: /\b(unit 1\b|regime\w*|democra\w+|authoritarian\w*|illiberal|hybrid regime|theocra\w+|legitimacy|sovereignty|state\b|nation\b|government\b|rule of law|rule by law|transparen\w+|federal\w*|unitary|devolution|power[- ]sharing|stability|revolution|Supreme Leader|Communist Party)\b/i,
      skills: [
        'State, regime, government and nation as distinct terms; sovereignty and its limits; federal (Mexico, Nigeria, Russia) vs unitary (China, Iran, UK) systems and devolution in the UK',
        'Democratic vs authoritarian regimes and the hybrid middle: competitive elections, rule of law, free press, independent judiciary as the markers; Iran\'s theocracy with elected institutions; China\'s one-party state',
        'Sources of legitimacy (traditional, charismatic, rational-legal, religious, performance) and how each course regime claims and maintains it',
        'Stability and change: democratization (Mexico after 2000, Nigeria\'s Fourth Republic since 1999), democratic backsliding (Russia), and how regimes manage internal challenges',
      ],
      hard: [
        'A regime identified from the features in a passage, not its name, where two course countries share most features',
        'Rule of law vs rule by law distinguished in a description of courts in China or Russia',
        'Federalism compared: why Nigeria and Mexico devolve power and how Russia recentralized it',
        'Legitimacy sources matched to a specific practice (China\'s economic performance, Iran\'s religious authority, the UK\'s tradition)',
      ],
      traps: ['Iran read as a pure authoritarian state with no elections', 'the UK\'s devolution read as federalism', 'legitimacy confused with popularity', 'regime change confused with a change of government'],
      exemplars: [
        `MC_QUESTION: Which of the following best describes the regime type reflected in the passage?
\`\`\`passage
An excerpt from a constitution adopted after a revolution

All civil, penal, financial, economic, administrative, cultural, military, political and other laws must be based on religious criteria. The leadership of the nation rests with a qualified jurist, while the legislature and the president are chosen by direct vote of the people. A council of jurists reviews legislation for its conformity with religious law.
\`\`\`
A) A theocracy that incorporates elected institutions under the supervision of unelected religious authorities
B) A one-party state in which the party controls the legislature and the courts
C) A parliamentary democracy with an unwritten constitution and a ceremonial head of state
D) A federal presidential democracy with power-sharing requirements among regions
Correct Answer: A
Explanation: A supreme jurist, a popularly elected president and legislature, and a council that reviews laws for conformity with religious law describe Iran's theocratic regime with elected elements. Choice B describes China, where no such religious criteria or direct presidential election exist.`,
      ],
    },
    {
      id: 'institutions',
      name: 'Unit 2: Political institutions',
      share: 'about 22-33% of the test',
      detect: /\b(unit 2\b|institution\w*|legislat\w+|parliament\w*|House of Commons|House of Lords|Duma|Federation Council|Majles|Guardian Council|Assembly of Experts|Expediency Council|National People'?s Congress|Politburo|Chamber of Deputies|Senate|National Assembly|executive\w*|president\w*|prime minister|cabinet|head of state|head of government|judicia\w+|court\w*|judicial review|bureaucra\w+|civil service|military|term limit\w*|impeach\w*|veto|checks? and balances)\b/i,
      skills: [
        'Executives: the UK\'s prime minister and cabinet from the Commons majority; Russia\'s and Nigeria\'s strong presidents; Mexico\'s one-term six-year president; Iran\'s Supreme Leader over an elected president; China\'s party general secretary who is also president, with term limits removed in 2018',
        'Legislatures: bicameral (UK Commons and unelected Lords, Russia\'s Duma and Federation Council, Mexico\'s Chamber and Senate, Nigeria\'s House and Senate) vs unicameral (Iran\'s Majles, China\'s National People\'s Congress, which meets once a year and mostly approves); how much each checks the executive',
        'Judiciaries: independence and judicial review (the UK Supreme Court without the power to strike down statutes, Mexico\'s Supreme Court, Nigeria\'s federal courts and Sharia courts) vs courts under party or executive control (China, Russia); Iran\'s Guardian Council as a constitutional check',
        'Bureaucracies, the military, and unelected bodies (Iran\'s Expediency Council and Assembly of Experts, China\'s Politburo Standing Committee) as centers of power',
      ],
      hard: [
        'Comparing how two legislatures can or cannot remove the executive (a UK no-confidence vote vs Nigeria\'s impeachment vs China\'s formal power never used)',
        'Which unelected body in Iran does what: Guardian Council (vetting and review), Assembly of Experts (chooses the Supreme Leader), Expediency Council (resolves disputes)',
        'Judicial independence judged from a description of how judges are appointed and whether rulings against the state stand',
        'Term limits and their removal or evasion across the six (China 2018, Russia\'s 2020 reset, Mexico\'s absolute one-term rule)',
      ],
      traps: ['the House of Lords read as elected', 'the Federation Council read as directly elected', 'the National People\'s Congress read as an active lawmaking check', 'Iran\'s president read as the head of state'],
      exemplars: [
        `MC_QUESTION: Which of the following is an accurate comparison of legislatures in two course countries?
A) The upper house of the United Kingdom's legislature is unelected, while Nigeria's Senate is directly elected.
B) Russia's Federation Council is directly elected by voters, while Mexico's Senate is appointed by state governors.
C) China's National People's Congress meets continuously through the year, while Iran's Majles meets for one session a year.
D) Bills passed by Iran's Majles take effect without further review, while bills passed by the United Kingdom's House of Commons must be approved by the monarch's council of jurists.
Correct Answer: A
Explanation: Members of the House of Lords are appointed or hereditary, while Nigerians elect three senators per state plus one for the capital territory. Choice B is backwards for Russia (the Federation Council is not directly elected) and wrong for Mexico, and choice D ignores the Guardian Council's review of every Majles bill.`,
      ],
    },
    {
      id: 'participation-elections',
      name: 'Units 3-4: Political culture, participation, parties, elections and citizen organizations',
      share: 'about 23-35% of the test',
      detect: /\b(unit [34]\b|political culture|civil society|social movement\w*|interest group\w*|NGO\w*|protest\w*|participation|turnout|voter\w*|election\w*|electoral system\w*|single[- ]member|SMD|plurality|first[- ]past[- ]the[- ]post|proportional|PR\b|mixed (?:member|system)|party system\w*|dominant party|one[- ]party|two[- ]party|multiparty|PRI\b|Labour|Conservative\w*|United Russia|Communist Party|PDP\b|APC\b|reformist\w*|principlist\w*|media|censorship|civil liberties|civil rights|ethnic|religious cleavage\w*|cleavage\w*|referendum|Brexit)\b/i,
      skills: [
        'Political culture and socialization; civil society and its limits (registered NGOs in China and Russia\'s "foreign agent" rules vs active civil society in the UK and Mexico); social movements and protest',
        'Electoral systems and their effects: single-member-district plurality (UK Commons, Nigeria) producing majorities from pluralities; mixed systems (Russia\'s Duma, Mexico\'s Chamber of Deputies); Iran\'s majoritarian multi-member districts with candidate vetting; China\'s indirect and party-controlled elections',
        'Party systems: the UK\'s two-plus parties, Mexico\'s move from PRI dominance to competition, Nigeria\'s PDP-APC alternation, Russia\'s dominant-party system under United Russia, Iran\'s factions rather than formal parties, China\'s one party',
        'Cleavages (ethnic, religious, regional, class) and how institutions manage them: Nigeria\'s federal character and zoning, Scotland and Northern Ireland in the UK, Mexico\'s north-south divide',
        'Civil rights and liberties, press freedom, censorship and the internet across the six',
      ],
      hard: [
        'Reading an electoral system off a vote-share vs seat-share table (a party with 12% of votes and 2% of seats points to single-member plurality)',
        'Why a dominant-party system is not a one-party system, with Russia and China as the pair',
        'Candidate vetting in Iran compared with ballot access in Mexico as different limits on competition',
        'A social movement or NGO described in a passage, placed in the right country by the state\'s response',
      ],
      traps: ['proportional representation read as what the UK uses for the Commons', 'Russia read as having no opposition parties at all', 'Iran\'s reformist-principlist factions read as formal parties', 'turnout read as a measure of democracy'],
      exemplars: [
        `MC_QUESTION: Which of the following electoral systems most likely produced the results shown in the table?
\`\`\`graph
kind: table
title: Results of a national legislative election
columns: Party | Share of votes | Share of seats
row: Party A | 43.6% | 56.2%
row: Party B | 32.1% | 31.1%
row: Party C | 11.6% | 1.7%
row: Party D | 3.9% | 7.4%
\`\`\`
A) Single-member-district plurality, which rewards parties whose support is concentrated in particular districts
B) Closed-list proportional representation with a 5 percent threshold
C) A mixed system in which compensatory list seats make seat shares match vote shares
D) A two-round majority system in which every seat requires an absolute majority
Correct Answer: A
Explanation: A party with 11.6% of votes winning under 2% of seats while a party with 3.9% wins 7.4% is the signature of single-member plurality: dispersed support wins nothing, concentrated regional support wins seats. Choices B and C would keep seat shares close to vote shares.`,
      ],
    },
    {
      id: 'change-development',
      name: 'Unit 5: Political and economic changes and development',
      share: 'about 16-24% of the test',
      detect: /\b(unit 5\b|globaliz\w+|liberaliz\w+|neoliberal\w*|privatiz\w+|state[- ]owned|SOE\w*|market reform\w*|rentier|oil\b|petroleum|resource curse|corruption|clientelism|patron\w*|GDP|economic growth|inequality|Gini|poverty|development|demographic\w*|population|urbaniz\w+|migration|brain drain|sanction\w*|trade|NAFTA|USMCA|Belt and Road|WTO|IMF|World Bank|supranational|European Union|Brexit|environment\w*|climate|internet|social media)\b/i,
      skills: [
        'Economic liberalization and its politics: China\'s market reforms with state control, Mexico\'s trade opening (NAFTA to USMCA), Russia\'s privatization and renationalization, the UK\'s market economy and Brexit',
        'Rentier states and the resource curse: oil in Nigeria, Iran and Russia; how rents weaken the tax-accountability link and feed corruption and clientelism',
        'Globalization\'s effects on sovereignty and policy: supranational organizations, sanctions on Iran and Russia, foreign investment, the internet and censorship',
        'Demographic and social change: urbanization, youth bulges (Nigeria, Iran), migration, inequality measured by the Gini coefficient, and policy responses',
      ],
      hard: [
        'Explaining a rentier state\'s politics from revenue data rather than from the word "oil"',
        'Liberalization that strengthened an authoritarian regime (China) vs one that opened competition (Mexico), in one comparison',
        'Reading a Gini or GDP table to pick the conclusion the data actually support, not the one the course would predict',
        'Sanctions and their domestic political effects in Iran and Russia, distinguished from economic effects',
      ],
      traps: ['economic liberalization assumed to bring political liberalization', 'a rentier state read as simply a rich state', 'the Gini coefficient read backwards (higher = more equal)', 'globalization read as always reducing state power'],
      exemplars: [
        `MC_QUESTION: Which of the following best explains how a rentier economy affects the relationship between a state and its citizens in a course country such as Nigeria or Iran?
A) Because the state is funded largely by resource revenue rather than taxation, citizens have less leverage to demand accountability in exchange for their taxes.
B) Because resource revenue is shared equally among citizens, political competition shifts from economic to cultural issues.
C) Because resource exports require foreign expertise, the state must adopt democratic reforms demanded by trading partners.
D) Because resource revenue is volatile, the state is forced to rely on a broad income tax that strengthens citizen oversight.
Correct Answer: A
Explanation: A rentier state earns most of its revenue from rents (oil) rather than from taxing citizens, so the bargain "no taxation without representation" never forms and patronage replaces accountability. Choice D describes the opposite outcome; rentier states typically tax little.`,
        `SA_QUESTION: a) Define rentier state. b) Describe one way reliance on resource rents affects the accountability of the state to its citizens. c) Explain how the effect described in part b) is visible in one course country.
Sample Answer: a) One point: a state that derives a large share of its revenue from the rent of natural resources (oil, gas) sold abroad rather than from taxing its own population. b) One point: because the state does not depend on citizens' taxes, citizens have less leverage to demand transparency or representation in return, and the state can buy support through subsidies and patronage instead of answering to taxpayers. c) One point for a specific course-country illustration with explanation, e.g. Nigeria, where oil provides most of the federal government's revenue, which is distributed to states and used for patronage, and where corruption in the oil sector has persisted with little electoral consequence; or Iran, where oil revenue funds subsidies and bonyads (foundations) that sustain regime support. A vague "Nigeria has oil and corruption" with no link to accountability earns nothing.`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the recall items (a definition, a capital). At most 1 item in 8 that easy, never first in a section; about half typical (one concept applied to one country) and at least a third of the kind under WHAT HARD LOOKS LIKE (two-country comparisons, regimes read from features, systems read from data). Free-response parts should need a specific country fact and an explanation, not a term.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 4 from a 5. At least 4 of every 5 items must be ones a student headed for a 3 would miss: comparisons where the tempting option is true of a different course country, institutions distinguished by exact powers (Guardian Council vs Assembly of Experts, Lords vs Federation Council), data tables that support a less obvious conclusion, and argument-essay pieces where one missing element (no line of reasoning, evidence from one country) loses the point. Hard never means countries or facts outside the course.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one concept and one country each, in the exam's voice, with the stimulus stated plainly. Still real exam items.`,
  },
}
