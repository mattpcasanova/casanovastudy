// The Florida U.S. History End-of-Course assessment (grade 11, NGSSS) as a
// reference for the guide prompts: four-option multiple choice, most items on
// a stimulus (a quoted public-domain document, a described cartoon, map or
// table), 1860s to the present in three reporting categories, plus a fourth
// domain here for the source-reading skills every category uses. Untimed.

import type { ExamProfile } from './types'

const EXAM = /\b(?:U\.?S\.?|United States|American)\s+History\b.*\bEOC\b|\bEOC\b.*\b(?:U\.?S\.?|United States|American)\s+History\b|\b(?:U\.?S\.?|United States|American)\s+History\s+(?:end[- ]of[- ]course|state (?:test|exam))\b/i

export const FL_USHISTORY_EOC: ExamProfile = {
  id: 'fl-ushistory-eoc',
  name: 'the Florida U.S. History EOC',
  detect: {
    exam: EXAM,
    subjectHints: /./,
    subjects: ['history', 'social-studies', 'social studies'],
    explicit: EXAM,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Every item is multiple choice with exactly four options A-D, as on the EOC. No true/false, no "I, II and III" lists, no free response.
- Most items sit on a stimulus in a \`\`\`passage fence directly under the question line (or a kind: table figure): a short excerpt from a public-domain document quoted accurately (the Gettysburg Address, the 13th-15th Amendments, the Fourteen Points, the Four Freedoms speech, the Truman Doctrine, Brown v. Board, the Civil Rights Act of 1964), a described political cartoon ("The cartoon, published in 1904, shows an octopus labeled ... with its arms wrapped around ..."), a described map ("The map shows the states that ... in 1890"), or a table of data. Anything not a well-known public document is written by you and attributed generically ("Excerpt from a letter by a steelworker in Pittsburgh, 1892"), never a fabricated quotation from a real named person. Items that share a stimulus each repeat it, so every item stands alone.
- Stems are the test's: "Which factor most contributed to the trend shown in the table?", "The quotation below is from a speech given in 1941. Which policy does the speaker support?", "Based on the map, which conclusion can be drawn about ...?", "Which of the following was a direct result of ...?", "The passage reflects which of the following developments?", "Which event is most closely associated with the cartoon's point of view?". When a specific sentence of the excerpt is asked about, mark it with [[double brackets]].
- Options are four parallel statements, each true of some period, place or group; the wrong ones are wrong for this stimulus, this decade or this cause (see WRONG ANSWERS ARE BUILT FROM). No "all of the above" or "none of the above".
- Dates, names and developments must be accurate and in the right decade; a described source must be plausible for its stated date. Never invent a named law, court case, treaty, person or statistic.
- Before writing an item's answer, check that exactly one option is correct for this stimulus and that the others are wrong for a nameable reason. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the evidence in the stimulus and the decade, and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'gilded-progressive',
      name: 'Late nineteenth and early twentieth centuries (Reconstruction through Progressivism and imperialism)',
      share: 'about 30% of the test',
      detect: /\b(reconstruction|freedmen|13th|14th|15th amendment|jim crow|plessy|sharecrop\w*|homestead|transcontinental|railroad\w*|plains indians|dawes|wounded knee|industriali\w+|carnegie|rockefeller|vertical|horizontal integration|trust\w*|sherman antitrust|gospel of wealth|social darwinism|labor union\w*|knights of labor|AFL|haymarket|pullman|homestead strike|immigra\w+|ellis island|chinese exclusion|nativis\w+|urbani\w+|tenement\w*|political machine\w*|tammany|populis\w+|free silver|bryan|progressiv\w+|muckraker\w*|jungle|pure food|19th amendment|suffrage|17th amendment|initiative|referendum|recall|theodore roosevelt|square deal|conservation|imperialis\w+|spanish[- ]american|philippine\w*|hawaii|open door|panama canal|roosevelt corollary|big stick|dollar diplomacy)\b/i,
      skills: [
        'Reconstruction: the 13th, 14th and 15th Amendments, Radical Reconstruction, the Freedmen\'s Bureau, sharecropping, the Compromise of 1877, Jim Crow and Plessy v. Ferguson',
        'The West: the Homestead Act, the transcontinental railroad, conflicts with Plains nations, the Dawes Act, the closing of the frontier',
        'Industrialization and its critics: big business (Carnegie, Rockefeller, trusts), the Sherman Antitrust Act, labor unions and strikes (Haymarket, Homestead, Pullman), the Gospel of Wealth and Social Darwinism',
        'Immigration and urbanization: "new" immigrants, Ellis Island, nativism and the Chinese Exclusion Act, tenements, political machines',
        'Populism and Progressivism: farmers\' grievances and free silver, muckrakers, Progressive reforms (initiative, referendum, recall, the 16th-19th Amendments, the Pure Food and Drug Act), Theodore Roosevelt\'s Square Deal and conservation',
        'Imperialism: the Spanish-American War and its causes, the Philippines debate, Hawaii, the Open Door, the Panama Canal, the Roosevelt Corollary, Dollar Diplomacy',
      ],
      hard: [
        'A Populist or Progressive document read for which grievance it addresses and which reform answered it',
        'A cartoon about trusts or imperialism described in words, with the point of view to be inferred before the question',
        'Cause and effect across two developments (the railroad and the cattle industry, immigration and nativist laws, strikes and public opinion)',
        'Distinguishing Reconstruction amendments by what each did, from an excerpt of one of them',
      ],
      traps: ['the 14th and 15th Amendments swapped', 'Populism and Progressivism confused (farmers vs urban middle-class reformers)', 'the Sherman Antitrust Act read as pro-business', 'the Spanish-American War dated to the 1880s or placed in Mexico'],
      exemplars: [
        `MC_QUESTION: The excerpt below is from an amendment to the United States Constitution ratified in 1868. Which of the following was a direct result of the Supreme Court's interpretation of this amendment in Plessy v. Ferguson (1896)?
\`\`\`passage
[[No State shall make or enforce any law which shall abridge the privileges or immunities of citizens of the United States; nor shall any State deprive any person of life, liberty, or property, without due process of law; nor deny to any person within its jurisdiction the equal protection of the laws.]]
\`\`\`
A) Segregation laws were upheld as constitutional under the "separate but equal" doctrine
B) African American men gained the constitutional right to vote in every state
C) Public schools were ordered to desegregate with all deliberate speed
D) Literacy tests and poll taxes were banned in federal elections
Correct Answer: A
Explanation: The excerpt is the 14th Amendment's equal protection clause; in Plessy the Court held that separate facilities did not violate it if they were "equal," so segregation laws stood. B is the 15th Amendment (1870), C is Brown v. Board (1954-55), and D is the 24th Amendment and the Voting Rights Act (1960s).`,
        `MC_QUESTION: Which factor most directly contributed to the trend shown in the table?
\`\`\`graph
kind: table
title: Estimated population of Chicago (illustrative)
columns: Year | Population
row: 1870 | 300,000
row: 1890 | 1,100,000
row: 1910 | 2,200,000
\`\`\`
A) The growth of factory jobs that drew immigrants and rural Americans to cities
B) The passage of the Homestead Act, which offered free land in the West
C) The decline of railroad construction after the Panic of 1873
D) Federal laws that limited immigration from southern and eastern Europe
Correct Answer: A
Explanation: Cities like Chicago grew because industrial jobs pulled in new immigrants and people leaving farms. The Homestead Act (B) pulled people away from cities, railroads expanded after 1873 (C), and immigration quotas (D) came in the 1920s, after this growth.`,
      ],
    },
    {
      id: 'wars-depression-cold-war',
      name: 'Global military, political and economic challenges (World War I through the end of the Cold War)',
      share: 'about 40% of the test',
      detect: /\b(world war i|wwi|great war|lusitania|zimmermann|fourteen points|league of nations|treaty of versailles|red scare|palmer raids|1920s|roaring twenties|harlem renaissance|prohibition|18th amendment|scopes|flapper\w*|immigration act of 1924|quota\w*|great depression|stock market crash|dust bowl|hoover\w*|new deal|fdr|franklin|social security|wpa|ccc|tva|court[- ]packing|neutrality act\w*|lend[- ]lease|pearl harbor|world war ii|wwii|internment|korematsu|rosie|d-day|manhattan project|hiroshima|yalta|cold war|containment|truman doctrine|marshall plan|berlin airlift|nato|korea\w*|mccarthy\w*|sputnik|cuban missile|bay of pigs|vietnam|gulf of tonkin|tet|détente|detente|salt|reagan|star wars|glasnost|berlin wall|soviet union)\b/i,
      skills: [
        'World War I: causes of U.S. entry (unrestricted submarine warfare, the Zimmermann telegram), the home front (the Espionage and Sedition Acts, the Great Migration), the Fourteen Points, the League of Nations debate and the Senate\'s rejection of the treaty',
        'The 1920s: the Red Scare, the Immigration Act of 1924 and quotas, Prohibition, the Scopes trial, the Harlem Renaissance, consumer culture and credit',
        'The Great Depression and the New Deal: causes of the crash, Hoover\'s response, the Dust Bowl, relief/recovery/reform programs (CCC, WPA, TVA, Social Security, FDIC, SEC), critics and the court-packing plan',
        'World War II: neutrality to Lend-Lease, Pearl Harbor, mobilization and the home front (women and minorities in war work, rationing), Japanese American internment and Korematsu, D-Day, the atomic bomb decision',
        'The Cold War: containment, the Truman Doctrine and Marshall Plan, the Berlin Airlift, NATO, Korea, McCarthyism, the space race, the Cuban Missile Crisis, Vietnam (Gulf of Tonkin, Tet, the antiwar movement), détente, Reagan and the end of the Cold War',
      ],
      hard: [
        'A speech excerpt (the Four Freedoms, the Truman Doctrine, Eisenhower\'s farewell) read for the policy it supports and the event that prompted it',
        'New Deal programs matched to relief, recovery or reform from a description of what one did',
        'A 1920s source read for the tension it shows (nativism vs immigration, modern vs traditional values)',
        'Cause and effect in the Cold War: an event and the U.S. response it produced, with options from neighboring years',
      ],
      traps: ['the Truman Doctrine and Marshall Plan swapped (military/political aid vs economic recovery)', 'Lend-Lease placed after Pearl Harbor', 'Korea and Vietnam outcomes confused', 'Social Security read as a relief program for the unemployed', 'the League of Nations read as something the United States joined'],
      exemplars: [
        `MC_QUESTION: The quotation below is from a speech by a United States president in 1947. Which policy does the speaker support?
\`\`\`passage
[[I believe that it must be the policy of the United States to support free peoples who are resisting attempted subjugation by armed minorities or by outside pressures.]] I believe that we must assist free peoples to work out their own destinies in their own way.
\`\`\`
A) Containment of communism through aid to Greece and Turkey
B) Isolation from European conflicts through the Neutrality Acts
C) Détente with the Soviet Union through arms-control treaties
D) Collective security through membership in the League of Nations
Correct Answer: A
Explanation: The 1947 speech announcing the Truman Doctrine asked Congress for aid to Greece and Turkey, the start of containment. The Neutrality Acts (B) were the 1930s, détente (C) the 1970s, and the United States never joined the League (D).`,
        `MC_QUESTION: The cartoon, published in 1937, shows a man labeled "FDR" trying to add six new chairs to a bench already filled with nine robed judges, while a figure labeled "Congress" looks on with alarm. Which event is the cartoon most closely commenting on?
\`\`\`passage
Description of a political cartoon published in a national newspaper, 1937
\`\`\`
A) The president's plan to add justices after the Supreme Court struck down New Deal programs
B) The Senate's refusal to confirm the president's nominee to the Court
C) The Court's decision to uphold the Social Security Act
D) Congressional investigations into the Tennessee Valley Authority
Correct Answer: A
Explanation: Six new "chairs" for nine judges is the 1937 court-packing plan, proposed after the Court struck down the NRA and AAA; Congress rejected it. The Court did uphold Social Security in 1937 (C), but a cartoon adding chairs is about expanding the Court, not a ruling.`,
      ],
    },
    {
      id: 'civil-rights-contemporary',
      name: 'Civil rights and the contemporary United States (the 1950s rights movements through the 2000s)',
      share: 'about 30% of the test',
      detect: /\b(civil rights|brown v\.? board|little rock|montgomery|bus boycott|rosa parks|martin luther king|mlk|sit[- ]ins|freedom ride\w*|birmingham|march on washington|civil rights act|voting rights act|24th amendment|black power|malcolm x|cesar chavez|chávez|united farm workers|american indian movement|aim\b|feminis\w+|betty friedan|title ix|equal rights amendment|era\b|roe|stonewall|great society|medicare|medicaid|war on poverty|watergate|nixon|ford|pardon|carter|iran hostage|stagflation|opec|reagan\w*|reaganomics|supply[- ]side|deregulation|bush|gulf war|clinton|nafta|impeach\w*|9\/11|september 11|patriot act|afghanistan|iraq war|obama)\b/i,
      skills: [
        'The civil rights movement: Brown v. Board, Little Rock, the Montgomery bus boycott, sit-ins and Freedom Rides, Birmingham and the March on Washington, the Civil Rights Act of 1964 and the Voting Rights Act of 1965, the 24th Amendment, Black Power and Malcolm X',
        'Other rights movements: the women\'s movement (Friedan, NOW, Title IX, the ERA debate), the United Farm Workers, the American Indian Movement, the disability rights movement, Stonewall',
        'The Great Society: Medicare and Medicaid, the War on Poverty, immigration reform of 1965',
        'The 1970s: Watergate and its effects on trust in government, the pardon, stagflation and the oil embargo, the Iran hostage crisis',
        'The 1980s-2000s: Reaganomics and deregulation, the end of the Cold War, the Persian Gulf War, NAFTA and globalization, the impeachment of 1998, September 11 and the Patriot Act, the wars in Afghanistan and Iraq',
      ],
      hard: [
        'A civil rights document (a letter from a jail, a speech at a march) read for its strategy: nonviolent direct action vs legal challenge vs Black Power',
        'Two laws of the 1960s distinguished by what each outlawed (public accommodations vs voting barriers)',
        'Watergate\'s effect inferred from a table of public trust in government',
        'Economic policy of the 1980s read from a description of its goals, against the New Deal and Great Society approaches',
      ],
      traps: ['the Civil Rights Act of 1964 and the Voting Rights Act of 1965 swapped', 'Brown v. Board dated to the 1960s', 'the Great Society credited to Kennedy', 'Watergate read as a foreign policy crisis', 'supply-side economics described as raising taxes'],
      exemplars: [
        `MC_QUESTION: The excerpt below is from a federal law passed in 1964. Which earlier Supreme Court decision did this law most directly extend into public accommodations?
\`\`\`passage
[[All persons shall be entitled to the full and equal enjoyment of the goods, services, facilities, privileges, advantages, and accommodations of any place of public accommodation ... without discrimination or segregation on the ground of race, color, religion, or national origin.]]
\`\`\`
A) Brown v. Board of Education, which held that segregated public schools were unconstitutional
B) Plessy v. Ferguson, which established the "separate but equal" doctrine
C) Marbury v. Madison, which established judicial review
D) Korematsu v. United States, which upheld wartime internment
Correct Answer: A
Explanation: Title II of the Civil Rights Act of 1964 carried Brown's rejection of segregation from schools into restaurants, hotels and theaters. Plessy (B) is the doctrine the law dismantled, and C and D concern other issues.`,
        `MC_QUESTION: Based on the table, which conclusion can be drawn about the effect of events in the early 1970s on American public opinion?
\`\`\`graph
kind: table
title: Share of Americans saying they trust the federal government "most of the time" or "just about always" (illustrative)
columns: Year | Share
row: 1964 | 77%
row: 1972 | 53%
row: 1976 | 34%
\`\`\`
A) The Watergate scandal and the end of the Vietnam War deepened distrust of government
B) The Great Society programs increased confidence in federal institutions
C) The end of the Cold War led Americans to expect less from government
D) The Iran hostage crisis restored faith in presidential leadership
Correct Answer: A
Explanation: The sharpest fall is between 1972 and 1976, the years of the Watergate revelations and the fall of Saigon. The Great Society (B) was the 1960s, the Cold War ended in 1991 (C), and the hostage crisis (D) began in 1979 and hurt, not restored, confidence.`,
      ],
    },
    {
      id: 'sources',
      name: 'Historical thinking with sources (documents, cartoons, maps and tables across every era)',
      share: 'woven through every reporting category',
      detect: /\b(primary source\w*|secondary source\w*|document\w*|excerpt\w*|quotation\w*|cartoon\w*|map\w*|table\w*|graph\w*|chart\w*|point of view|perspective|bias|cause and effect|chronolog\w+|timeline|historical thinking|dbq|analy[sz]\w+ (?:a|the) source)\b/i,
      skills: [
        'Reading a document for its main idea, purpose and audience, then connecting it to the event or policy it reflects',
        'Describing a political cartoon\'s symbols and inferring its point of view',
        'Drawing a conclusion from a map (territorial change, election results, migration) or a table (population, production, prices, votes) and ruling out conclusions the data do not support',
        'Cause and effect, continuity and change, and chronological order across the eras',
      ],
      hard: [
        'A source whose author\'s point of view must be inferred before the question can be answered (a nativist pamphlet, a business leader\'s defense of trusts)',
        'A table where the tempting conclusion goes beyond the data (a correlation read as a cause)',
        'Two excerpts from the same era with opposed views, and the question asks what they disagree about',
      ],
      traps: ['a conclusion the table does not support', 'the cartoonist\'s view confused with the view being mocked', 'a source dated by its topic rather than its clues'],
      exemplars: [
        `MC_QUESTION: The two excerpts below were written in the 1890s. The authors most directly disagree about which of the following?
\`\`\`passage
Text 1
Excerpt from a pamphlet by a railroad executive, 1893

Combination is the law of progress. Where a dozen small lines once fought each other into bankruptcy, one well-managed system now carries the nation's goods more cheaply than ever before.

Text 2
Excerpt from a resolution adopted by a farmers' convention, 1892

The railroads, having destroyed all competition, charge what they please. The farmer pays more to ship his wheat to market than the wheat will bring.
\`\`\`
A) Whether the consolidation of railroads into large systems benefited the public
B) Whether the federal government should build and own the railroads
C) Whether farmers should abandon wheat for other crops
D) Whether immigration should be restricted to protect railroad workers
Correct Answer: A
Explanation: The executive praises combination as cheaper service; the farmers say monopoly lets railroads charge what they please. Neither text raises government ownership (B), crop choice (C) or immigration (D).`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the one-step recall items. At most 1 item in 8 that easy (a date or a definition), never first in a section; about half at Level 3 (one source read in its decade, one cause linked to one effect) and at least a third at Levels 4-5 (a source whose point of view must be inferred, a table whose tempting conclusion goes too far, two developments linked across decades). Level 3 is passing; a student aiming to pass needs steady Level 3 items with Level 4 items mixed in.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate Level 5 from Level 3. At least 4 of every 5 items must be ones a Level 3 student would miss: sources read against their author's point of view, options true of a neighboring decade, cause-and-effect chains with two steps, cartoons whose target must be inferred, and data conclusions that must be ruled out as beyond the evidence. Hard never means trivia outside the course benchmarks.`,
    easier: `DIFFICULTY ON THIS TEST: Level 2-3 items most students get right, one development each, the source's meaning stated plainly, in the test's voice. Still real exam items.`,
  },
}
