// The Cambridge International AS & A Level History exam, American option
// (9489; AICE US History in Florida) as a reference for the guide prompts.
// No multiple-choice paper: Paper 1 is a document question on the origins of
// the Civil War, Paper 2 an outline study (USA 1820-1941), Paper 3 an
// interpretations question (the Cold War) and Paper 4 a depth study
// (USA 1944-92), all essay-style and marked by levels.

import type { ExamProfile } from './types'
import { AICE_DIFFICULTY, AICE_ITEM_RULES } from './aice'

const EXAM = /\b(?:AICE|Cambridge|(?:AS|A)[- ]?Level)\s+(?:US|U\.S\.|American|United States)\s+History\b|\b(?:US|U\.S\.|American|United States)\s+History\b.*\b(?:AICE|Cambridge|A[- ]?Level)\b/i

export const AICE_US_HISTORY: ExamProfile = {
  id: 'aice-us-history',
  name: 'the Cambridge AS & A Level History exam, American option (AICE US History, 9489)',
  detect: {
    exam: EXAM,
    subjectHints: /./,
    subjects: ['history', 'social-studies', 'social studies'],
    explicit: EXAM,
  },
  itemRules: AICE_ITEM_RULES('the Cambridge AS & A Level History exam (American option)', {
    mcq: false,
    structured: 'Every paper is essay-style: Paper 1 parts of 15 and 25 marks on sources, Paper 2 parts of 10 and 20 marks, Paper 3 one 40-mark interpretation question, Paper 4 30-mark essays.',
    extra: [
      '- Paper 1 (document question, origins of the Civil War 1846-61) is built on model-written sources in a \`\`\`passage fence, each headed "Source A", "Source B" ... with a generic attribution in the era\'s voice ("A speech by a Southern senator in Congress, 1850", "An editorial in a Northern anti-slavery newspaper, 1854", "A letter from an Illinois farmer to his brother, 1858"); never a fabricated quotation attributed to a real named person. Parts are exactly: "(a) Read Sources A and B. Compare and contrast the two sources\' views on ... [15]" and "(b) Read all the sources. How far do the sources support the view that ...? [25]". The Sample Answer for (a) gives the points of similarity and difference with the words from each source that show them, the provenance point (who, when, why) that explains the difference, and the level descriptors (Level 5, 13-15: compares and contrasts content and provenance with a supported judgement; Level 3, 7-9: describes similarities and differences without using provenance; Level 1, 1-3: paraphrases). For (b) the Sample Answer groups the sources for and against the view, evaluates each for reliability and typicality using its provenance and contextual knowledge, and reaches a judgement; Level 5 (21-25) needs both groups evaluated and a judgement that weighs them.',
      '- Paper 2 (outline study, the USA 1820-1941) parts are exactly two: "(a) Why did ...? [10]" wanting a range of explained reasons with a judgement about their relative importance (Level 4, 9-10: several developed reasons linked and prioritised; Level 2, 4-6: reasons listed and partly explained), and "(b) \'Statement.\' How far do you agree? [20]" (or "To what extent ...? [20]") wanting a balanced argument with evidence on both sides and a sustained judgement (Level 5, 17-20: analytical, balanced, well supported and consistently focused on the question; Level 3, 9-12: some argument, mostly narrative; Level 1, 1-4: assertion). The Sample Answer is a plan: the judgement, three or four arguments each with specific evidence (dates, acts, people, numbers only where well known), the counterargument, the conclusion, then the descriptors.',
      '- Paper 3 (interpretations, the origins and development of the Cold War) is one question on a model-written extract in a \`\`\`passage fence attributed only as "from a historian writing in the 1960s/1970s/1990s" (never a real historian\'s name or invented words): "Read the extract and then answer the question. What can you learn from this extract about the interpretation and approach of the historian who wrote it? Use the extract and your knowledge of the Cold War to explain your answer. [40]". The Sample Answer identifies the interpretation (orthodox: Soviet expansionism caused the Cold War; revisionist: American economic and political ambitions; post-revisionist: mutual misperception and the structure of the post-war world; others such as the role of ideology or of individual leaders), explains the historian\'s approach (what evidence is emphasised, what is left out, the language used, the context in which the historian wrote), supports the reading with phrases from the extract and with contextual knowledge, and reaches a judgement about how convincing the interpretation is. Level 5 (33-40) needs the interpretation identified, the approach analysed and the judgement sustained.',
      '- Paper 4 (depth study, the USA 1944-92) questions are exactly "Assess the reasons for ... [30]", "Evaluate the significance of ... [30]", "\'Statement.\' Discuss. [30]" or "To what extent ...? [30]". The Sample Answer is a plan with a thesis, three or four analytical paragraphs each driven by an argument and supported by precise evidence (Brown v. Board 1954, the Civil Rights Act 1964, the Gulf of Tonkin Resolution 1964, the Great Society programmes, Watergate 1972-74, Reaganomics), a counterargument, a conclusion, and the descriptors (Level 5, 25-30: a sustained, well-supported analytical argument that answers the question set; Level 3, 13-18: some analysis within a mainly descriptive account).',
      '- Multiple-choice quick checks (at most half the items) test the knowledge an essay needs: the content of a named act or decision, the sequence of events, the position of a group, the historiographical school a view belongs to; four options, each a plausible historical statement, the wrong ones true of a different event, group or decade.',
      '- Never invent a statistic, a quotation or a named minor figure. Use dates, acts, cases, elections and leaders that any textbook on the period gives.',
    ],
  }),
  domains: [
    {
      id: 'paper1-civil-war-origins',
      name: 'Paper 1 (AS): document question on the origins of the Civil War, 1846-61',
      share: 'all of Paper 1 (AS)',
      detect: /\b(paper 1|document question|source\w*|civil war|origins? of the (?:civil )?war|mexican[- ]american war|mexican war|wilmot proviso|compromise of 1850|fugitive slave|kansas[- ]nebraska|popular sovereignty|bleeding kansas|dred scott|republican party|free soil|know[- ]nothing\w*|lincoln[- ]douglas|john brown|harpers ferry|election of 1860|secession|fort sumter|1846|1850|1854|1857|1860|1861)\b/i,
      skills: [
        'The Mexican War and the Wilmot Proviso: how territorial expansion reopened the question of slavery in the territories; the Free Soil position; California and the Compromise of 1850 (admission of California, the stronger Fugitive Slave Act, popular sovereignty in Utah and New Mexico) and Northern resistance to the Fugitive Slave Act',
        'The Kansas-Nebraska Act 1854, popular sovereignty, "Bleeding Kansas" and the Lecompton constitution; the collapse of the Whigs, the Know-Nothings and the rise of the Republican Party as a sectional party',
        'The Dred Scott decision 1857, the Lincoln-Douglas debates 1858, John Brown\'s raid 1859, the split of the Democrats, the election of 1860 and secession to Fort Sumter 1861',
        'Source skills: comparing content and provenance, judging reliability and typicality (a secessionist pamphlet vs a Northern editorial), using contextual knowledge to test a source\'s claims, and reaching a judgement on "how far the sources support the view"',
      ],
      hard: [
        'Two sources that agree on facts but differ in purpose, so the contrast is in provenance rather than content',
        'A source that supports the view only partly (a Southern moderate in 1850 who later secedes), needing a qualified judgement',
        'The 25-mark part where the sources must be grouped and evaluated, not summarised one by one',
        'Dating a source\'s position from its content (a reference to popular sovereignty as new puts it in 1854, not 1850)',
      ],
      traps: ['the Compromise of 1850 and the Kansas-Nebraska Act swapped', 'Dred Scott read as a congressional act', 'the Republican Party read as abolitionist rather than free-soil', 'John Brown read as representative of Northern opinion'],
      exemplars: [
        `SA_QUESTION: Read Sources A and B. Compare and contrast the two sources' views on the Kansas-Nebraska Act. [15]
\`\`\`passage
Source A
A speech by a Northern Whig congressman, 1854

This bill tears up a settlement of thirty years. The Missouri line was a solemn compact; the South took its share and now, having pocketed the benefit, it would repeal the condition. Call it popular sovereignty if you like: it is the opening of free territory to slavery, and every free labourer in the North knows it.

Source B
An editorial in a Democratic newspaper in Illinois, 1854

The bill does no more than leave the people of a territory to decide their own institutions, as the Compromise of 1850 already allowed in New Mexico and Utah. Those who cry that it extends slavery know that no planter will carry his slaves to the plains of Nebraska. The outcry is got up by abolitionists for the autumn elections.
\`\`\`
Sample Answer: Mark-scheme points. Contrast in view (up to 6): Source A sees the Act as the repeal of a binding compact (the Missouri Compromise line) and as the deliberate opening of free territory to slavery ("the opening of free territory to slavery"); Source B sees it as a neutral application of popular sovereignty already accepted in 1850 ("no more than leave the people of a territory to decide") and expects slavery not to spread there ("no planter will carry his slaves"). Similarity (up to 3): both accept that the Act applies the principle of popular sovereignty, both are written in the heat of 1854 and both see the other side as acting politically (A: the South pocketing a benefit; B: an outcry "got up ... for the autumn elections"). Provenance explaining the difference (up to 4): A is a Northern Whig in Congress, whose party is collapsing over the issue and whose free-labour constituents fear competition; B is a Democratic paper in Illinois, Douglas's state, defending the party's bill before the mid-term elections. Judgement (up to 2): the sources differ on what the Act does and why it was passed, agreeing only on the mechanism. Levels: Level 5 (13-15) compares and contrasts both content and provenance with a supported judgement; Level 4 (10-12) compares content with some use of provenance; Level 3 (7-9) identifies similarities and differences from content alone; Level 2 (4-6) describes one source at a time; Level 1 (1-3) paraphrases. A paraphrase of each source with no comparison earns Level 1 whatever its length.`,
        `MC_QUESTION: Which provision of the Compromise of 1850 produced the most resistance in the Northern states in the years that followed?
A) The admission of California as a free state
B) The strengthened Fugitive Slave Act
C) The abolition of the slave trade in the District of Columbia
D) The settlement of the Texas-New Mexico boundary
Correct Answer: B
Explanation: The Fugitive Slave Act required Northern citizens and officials to assist in returning escaped slaves, provoking personal liberty laws and rescues; A was the North's gain, and C and D caused little Northern protest.`,
      ],
    },
    {
      id: 'paper2-usa-1820-1941',
      name: 'Paper 2 (AS): outline study, the USA 1820-1941',
      share: 'all of Paper 2 (AS)',
      detect: /\b(paper 2|outline study|1820|1941|jackson\w*|jacksonian|bank war|nullification|indian removal|trail of tears|manifest destiny|westward expansion|oregon|texas annexation|gold rush|reconstruction|radical republican\w*|freedmen|black codes|13th|14th|15th amendment|carpetbagger\w*|compromise of 1877|jim crow|gilded age|robber baron\w*|industriali[sz]ation|railroad\w*|trusts?|populis\w+|progressiv\w+|muckraker\w*|roosevelt|taft|wilson|prohibition|1920s|roaring twenties|red scare|immigration act|great depression|wall street crash|hoover|new deal|first new deal|second new deal|court[- ]packing|dust bowl|1930s)\b/i,
      skills: [
        'Jacksonian democracy 1820-41: the expansion of the franchise, the spoils system, the Bank War, nullification, Indian removal and the Trail of Tears; westward expansion and Manifest Destiny to 1850, Texas, Oregon and the gold rush',
        'The Civil War and Reconstruction 1861-77: why the North won, Presidential vs Radical Reconstruction, the 13th-15th Amendments, the freedmen, Southern resistance and the Compromise of 1877; the rise of Jim Crow',
        'The Gilded Age and Progressivism 1877-1920: industrialisation, railroads, trusts and the robber barons, labour unrest, immigration and the cities, Populism, the Progressive reforms of Roosevelt, Taft and Wilson',
        'The 1920s and the Depression 1920-41: prosperity and its limits, the Red Scare, Prohibition, immigration restriction, the Crash and its causes, Hoover\'s response, the First and Second New Deals, opposition and the court-packing crisis, how far the New Deal ended the Depression',
      ],
      hard: [
        'A "why" question that needs reasons prioritised, not listed (why Reconstruction failed)',
        'A statement that is partly true, so the essay must define terms before agreeing ("The New Deal failed to end the Depression")',
        'Comparing presidents\' motives and results across a period (how Progressive was Wilson compared with Roosevelt)',
        'Long-term vs short-term causes weighed against a trigger (the Crash and the Depression)',
      ],
      traps: ['the New Deal credited with ending the Depression by itself', 'Reconstruction ended by Northern sympathy for the South alone', 'Progressivism read as a single movement', 'Jacksonian democracy read as democracy for all'],
      exemplars: [
        `SA_QUESTION: 'The New Deal did more to restore confidence than to recover the economy.' How far do you agree? [20]
Sample Answer: A plan the mark scheme rewards. Judgement: largely agree for 1933-37, with recovery real but partial and reversed in 1937-38. For the view: the Emergency Banking Act and the fireside chats ended the bank runs within weeks, the FDIC and the SEC restored trust in banks and markets, and the CCC and WPA gave millions work and a sense that government acted; unemployment fell from about 25% in 1933 to about 14% in 1937 but never below 10% before the war, and the 1937 cut in spending brought the "Roosevelt recession", which shows recovery depended on federal spending. Against the view: GNP regained its 1929 level by 1937, the AAA raised farm incomes, the TVA transformed a region, and the Wagner Act and Social Security changed the structure of the economy, which is recovery in a wider sense; and confidence and recovery cannot be separated, since spending returned as confidence did. Conclusion: the New Deal's clearest achievement was psychological and institutional; full economic recovery waited for wartime spending after 1941. Levels: Level 5 (17-20) argues both sides with precise support and sustains the judgement throughout; Level 4 (13-16) balanced and supported but the judgement appears only in the conclusion; Level 3 (9-12) some argument within a mainly narrative account of New Deal measures; Level 2 (5-8) description of the New Deal with an implicit view; Level 1 (1-4) assertions. A list of agencies with no link to confidence or recovery stays in Level 2.`,
        `MC_QUESTION: Which of the following best explains why Reconstruction had ended in every Southern state by 1877?
A) The Supreme Court declared the Reconstruction Amendments unconstitutional
B) Northern political will to enforce Reconstruction had faded, and the disputed election of 1876 was settled by withdrawing federal troops
C) The freedmen voted to return Democratic governments to power
D) Congress repealed the Reconstruction Acts after the death of Thaddeus Stevens
Correct Answer: B
Explanation: Economic depression after 1873, scandal and fatigue in the North, and the Compromise of 1877 that gave Hayes the presidency in return for removing the last troops ended Reconstruction; the Amendments stayed in force (A), freedmen were driven from the polls by violence rather than voting Democrats in (C), and the Acts were not repealed (D).`,
      ],
    },
    {
      id: 'paper3-cold-war-interpretations',
      name: 'Paper 3 (A Level): interpretations question, the origins and development of the Cold War',
      share: 'all of Paper 3 (A Level)',
      detect: /\b(paper 3|interpretation\w*|historian\w*|historiograph\w*|orthodox|traditionalist|revisionis\w+|post[- ]revisionis\w+|cold war|origins? of the cold war|yalta|potsdam|iron curtain|truman doctrine|marshall plan|containment|berlin blockade|nato|korean war|cuban missile|détente|detente|ideolog\w+|misperception|security dilemma)\b/i,
      skills: [
        'The schools of interpretation: orthodox (Soviet expansionism and ideology forced a defensive American response), revisionist (American economic and political aims, the atomic bomb and the open door drove the conflict), post-revisionist (mutual misperception, insecurity and the power vacuum of 1945; both sides share responsibility), and later views that stress ideology, individual leaders or the role of smaller states',
        'Reading an extract for its interpretation: what it identifies as the cause, who it blames, what evidence it foregrounds (Yalta, Potsdam, the Truman Doctrine, the Marshall Plan, Berlin) and what it omits',
        'Analysing a historian\'s approach: the questions asked, the language used ("aggression", "response", "misunderstanding"), the level of analysis (leaders, structures, ideology) and the context in which the historian wrote (the 1950s consensus, Vietnam-era scepticism, the opening of Soviet archives after 1991)',
        'Using contextual knowledge of 1945-62 to test an interpretation and reach a judgement about how convincing it is',
      ],
      hard: [
        'An extract that blends two schools, so the answer must show which elements belong to which',
        'Distinguishing an historian\'s interpretation from their approach (what they argue vs how they argue it)',
        'Judging an interpretation without simply preferring another school',
        'Spotting what the extract leaves out (an orthodox extract that never mentions the atomic bomb)',
      ],
      traps: ['the schools dated wrongly (revisionism placed in the 1950s)', '"approach" answered with more content about the Cold War', 'the historian\'s view summarised rather than analysed', 'a real historian\'s name invented for the extract'],
      exemplars: [
        `SA_QUESTION: Read the extract and then answer the question. What can you learn from this extract about the interpretation and approach of the historian who wrote it? Use the extract and your knowledge of the Cold War to explain your answer. [40]
\`\`\`passage
From a historian writing in the 1960s

The war had left Washington with an economy that could not stand still. Markets and raw materials abroad were not a preference but a necessity, and the open door had to be pushed open wherever it had closed. The Marshall Plan was less a gift than an instrument, binding Western Europe to American goods and American terms. Seen from Moscow, a devastated power with twenty million dead, the demand that Eastern Europe too should be opened could only look like a threat. The Soviet response was defensive, cautious and, for the most part, predictable; it was American policy that left no room for compromise.
\`\`\`
Sample Answer: Mark-scheme points. Interpretation (up to 12): revisionist, placing responsibility on the United States; the cause is American economic need (the open door, markets and raw materials) rather than Soviet ideology; the Marshall Plan is read as an instrument of economic control, and Soviet policy as defensive. Approach (up to 12): an economic and structural approach that looks at systems rather than leaders (no Truman or Stalin by name), reading events from Moscow's perspective ("seen from Moscow"), using loaded language that reverses the orthodox vocabulary ("not a gift but an instrument", "left no room for compromise"), and selecting evidence that fits (the Marshall Plan and the open door) while omitting Soviet actions in Poland in 1945-47, the Czech coup of 1948 and the Berlin blockade. Context (up to 8): writing in the 1960s, when the Vietnam War and the Cuban missile crisis made American motives open to question and the orthodox consensus of the 1950s was under attack; the approach reflects the New Left's interest in economic drivers. Judgement (up to 8): the extract explains American motives convincingly but its account of a "predictable" Soviet response understates Soviet choices and ideology, which post-revisionists later stressed. Levels: Level 5 (33-40) identifies the interpretation and analyses the approach, supported from the extract and from knowledge, with a sustained judgement; Level 4 (25-32) identifies both with some support; Level 3 (17-24) identifies the interpretation and describes the approach; Level 2 (9-16) summarises the extract with some comment; Level 1 (1-8) paraphrase or a general account of the Cold War. Naming a real historian as the author earns nothing extra and is not expected.`,
        `MC_QUESTION: A historian argues that the Cold War arose from mutual misperception in a Europe left without a balance of power in 1945, with neither side intending a conflict. This view belongs to which school of interpretation?
A) Orthodox
B) Revisionist
C) Post-revisionist
D) Ideological
Correct Answer: C
Explanation: Shared responsibility, misperception and the structural vacuum of 1945 are the marks of post-revisionism; orthodox accounts blame Soviet expansion, revisionist ones American economic aims, and an ideological reading stresses the clash of belief systems rather than misunderstanding.`,
      ],
    },
    {
      id: 'paper4-usa-1944-92',
      name: 'Paper 4 (A Level): depth study, the USA 1944-92',
      share: 'all of Paper 4 (A Level)',
      detect: /\b(paper 4|depth study|1944|1992|truman|fair deal|eisenhower|kennedy|new frontier|johnson|great society|nixon|watergate|ford|carter|reagan\w*|reaganomics|bush|civil rights|brown v|montgomery|little rock|sit[- ]ins?|freedom ride\w*|march on washington|civil rights act|voting rights act|black power|malcolm x|martin luther king|affirmative action|vietnam|gulf of tonkin|tet|war powers|mccarthy\w*|second red scare|women'?s (?:movement|liberation)|roe v|equal rights amendment|stagflation|oil crisis|new right|moral majority|iran[- ]contra|end of the cold war)\b/i,
      skills: [
        'Politics and the presidency: Truman\'s Fair Deal and the limits of liberal reform, Eisenhower\'s "modern Republicanism", Kennedy and Johnson (the New Frontier and the Great Society), Nixon and Watergate, Carter and the "crisis of confidence", Reagan and the New Right (Reaganomics, the Moral Majority, Iran-Contra), Bush and the end of the Cold War',
        'Civil rights: the NAACP and Brown v. Board 1954, Montgomery, Little Rock, the sit-ins and Freedom Rides, Birmingham and the March on Washington, the Civil Rights Act 1964 and Voting Rights Act 1965, Black Power and the Northern ghettos, affirmative action and the movement\'s limits; the roles of grass-roots activists, leaders, the courts and the federal government',
        'Society and the economy: post-war prosperity and suburbia, McCarthyism and the Second Red Scare, the women\'s movement (Roe v. Wade, the ERA), the counterculture, stagflation and the oil crises, deindustrialisation, the conservative turn',
        'Foreign policy at home: the Vietnam War\'s domestic impact (the draft, protest, the Gulf of Tonkin Resolution, Tet, the War Powers Act), détente and the end of the Cold War as domestic politics',
      ],
      hard: [
        '"Assess the reasons" questions that need reasons weighed against one another, not described',
        'Significance questions where short-term and long-term significance differ (the Voting Rights Act)',
        'Comparing the contribution of leaders with that of grass-roots activists and federal institutions',
        'Economic statements that need defining ("Reaganomics was a success") before they can be judged',
      ],
      traps: ['the civil rights movement credited to one leader', 'the Great Society read as a failure because of Vietnam alone', 'Watergate read as the cause rather than the symptom of distrust', 'Reagan credited alone with the end of the Cold War'],
      exemplars: [
        `SA_QUESTION: Assess the reasons for the passage of the Civil Rights Act of 1964. [30]
Sample Answer: A plan the mark scheme rewards. Thesis: the Act passed because a decade of grass-roots pressure created a crisis that a president with legislative skill and a national mood of grief after Kennedy's assassination could turn into law; no single reason suffices. Argument 1, the movement: Birmingham in spring 1963 (Bull Connor's dogs and hoses on national television) and the March on Washington in August made inaction politically costly and gave Kennedy's June 1963 bill its urgency. Argument 2, presidential leadership: Johnson's mastery of the Senate, his use of Kennedy's memory ("no memorial oration ... could more eloquently honour President Kennedy's memory"), and the bipartisan deal with Dirksen that broke the 75-day Southern filibuster with the first successful cloture vote on a civil rights bill. Argument 3, the changing context: the Cold War embarrassment of segregation abroad, the growth of the black vote in Northern cities, the shift of Northern Republican opinion, and the groundwork of Brown v. Board 1954 and the Civil Rights Acts of 1957 and 1960. Counterargument: without the movement there would have been no bill to pass, so the movement is the necessary cause while Johnson's skill explains the timing and the strength of the Act. Conclusion: grass-roots pressure made the Act possible; Johnson and the national mood of 1963-64 made it happen. Levels: Level 5 (25-30) a sustained analytical argument that assesses the relative importance of reasons with precise support; Level 4 (19-24) analytical and supported but the assessment is uneven; Level 3 (13-18) explains reasons with some analysis in a largely descriptive account; Level 2 (7-12) describes events of 1963-64; Level 1 (1-6) assertions. A narrative of the movement from Montgomery to Selma with no link to the Act's passage stays in Level 2.`,
        `MC_QUESTION: Which of the following was a direct consequence of the Watergate scandal?
A) The War Powers Act of 1973
B) The impeachment and removal of President Nixon by the Senate
C) Nixon's resignation in August 1974 after the release of the "smoking gun" tape and the loss of Republican support in Congress
D) The end of détente with the Soviet Union
Correct Answer: C
Explanation: The House Judiciary Committee approved articles of impeachment, but Nixon resigned before a House vote or Senate trial, so B is wrong; the War Powers Act (A) answered Vietnam, not Watergate, and détente continued under Ford.`,
      ],
    },
  ],
  difficulty: AICE_DIFFICULTY,
}
