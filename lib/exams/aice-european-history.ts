// The Cambridge International AS & A Level History exam, European option
// (9489; AICE European History in Florida) as a reference for the guide
// prompts. No multiple-choice paper: Paper 1 is a document question on
// liberalism and nationalism in Italy and Germany 1815-71, Paper 2 an outline
// study (modern Europe 1750-1921), Paper 3 an interpretations question (the
// Holocaust) and Paper 4 a depth study (Europe of the dictators 1918-41).

import type { ExamProfile } from './types'
import { AICE_DIFFICULTY, AICE_ITEM_RULES } from './aice'

const EXAM = /\b(?:AICE|Cambridge|(?:AS|A)[- ]?Level)\s+Euro(?:pean)?\s+History\b|\bEuro(?:pean)?\s+History\b.*\b(?:AICE|Cambridge|A[- ]?Level)\b/i

export const AICE_EUROPEAN_HISTORY: ExamProfile = {
  id: 'aice-european-history',
  name: 'the Cambridge AS & A Level History exam, European option (AICE European History, 9489)',
  detect: {
    exam: EXAM,
    subjectHints: /./,
    subjects: ['history', 'social-studies', 'social studies'],
    explicit: EXAM,
  },
  itemRules: AICE_ITEM_RULES('the Cambridge AS & A Level History exam (European option)', {
    mcq: false,
    structured: 'Every paper is essay-style: Paper 1 parts of 15 and 25 marks on sources, Paper 2 parts of 10 and 20 marks, Paper 3 one 40-mark interpretation question, Paper 4 30-mark essays.',
    extra: [
      '- Paper 1 (document question, liberalism and nationalism in Italy and Germany 1815-71) is built on model-written sources in a \`\`\`passage fence, each headed "Source A", "Source B" ... with a generic attribution in the era\'s voice ("A letter from an Austrian diplomat to his foreign minister, 1848", "An article in a Piedmontese liberal newspaper, 1859", "A speech by a deputy in the Prussian parliament, 1862"); never a fabricated quotation attributed to a real named person. Parts are exactly: "(a) Read Sources A and B. Compare and contrast the two sources\' views on ... [15]" and "(b) Read all the sources. How far do the sources support the view that ...? [25]". The Sample Answer for (a) gives the points of similarity and difference with the words from each source that show them, the provenance point (who, when, why) that explains the difference, and the level descriptors (Level 5, 13-15: compares and contrasts content and provenance with a supported judgement; Level 3, 7-9: describes similarities and differences without using provenance; Level 1, 1-3: paraphrases). For (b) the Sample Answer groups the sources for and against the view, evaluates each for reliability and typicality using its provenance and contextual knowledge, and reaches a judgement; Level 5 (21-25) needs both groups evaluated and a judgement that weighs them.',
      '- Paper 2 (outline study, modern Europe 1750-1921) parts are exactly two: "(a) Why did ...? [10]" wanting a range of explained reasons with a judgement about their relative importance (Level 4, 9-10: several developed reasons linked and prioritised; Level 2, 4-6: reasons listed and partly explained), and "(b) \'Statement.\' How far do you agree? [20]" (or "To what extent ...? [20]") wanting a balanced argument with evidence on both sides and a sustained judgement (Level 5, 17-20: analytical, balanced, well supported and consistently focused on the question; Level 3, 9-12: some argument, mostly narrative; Level 1, 1-4: assertion). The Sample Answer is a plan: the judgement, three or four arguments each with specific evidence, the counterargument, the conclusion, then the descriptors.',
      '- Paper 3 (interpretations, the Holocaust) is one question on a model-written extract in a \`\`\`passage fence attributed only as "from a historian writing in the 1960s/1980s/2000s" (never a real historian\'s name or invented words): "Read the extract and then answer the question. What can you learn from this extract about the interpretation and approach of the historian who wrote it? Use the extract and your knowledge of the Holocaust to explain your answer. [40]". The Sample Answer identifies the interpretation (intentionalist: a long-held plan driven from the top by Hitler\'s ideology; functionalist or structuralist: cumulative radicalisation from below, improvisation by competing agencies, the war in the East; synthesis: ideology set the direction while circumstances and local initiative set the timing and method; also views that stress perpetrators\' ordinary motives or the role of bystanders and collaborators), explains the historian\'s approach (what evidence is emphasised, the level of analysis, the language used, the context of writing), supports the reading with phrases from the extract and with contextual knowledge, and reaches a judgement about how convincing the interpretation is. Level 5 (33-40) needs the interpretation identified, the approach analysed and the judgement sustained. Write about the Holocaust with care and precision; never invent a figure, a document or a testimony.',
      '- Paper 4 (depth study, Europe of the dictators 1918-41) questions are exactly "Assess the reasons for ... [30]", "Evaluate the significance of ... [30]", "\'Statement.\' Discuss. [30]" or "To what extent ...? [30]". The Sample Answer is a plan with a thesis, three or four analytical paragraphs each driven by an argument and supported by precise evidence (the Enabling Act 1933, the Night of the Long Knives 1934, the Acerbo Law 1923, the Lateran Pacts 1929, the first Five-Year Plan 1928-32, collectivisation, the Great Purge 1936-38), a counterargument, a conclusion, and the descriptors (Level 5, 25-30: a sustained, well-supported analytical argument that answers the question set; Level 3, 13-18: some analysis within a mainly descriptive account).',
      '- Multiple-choice quick checks (at most half the items) test the knowledge an essay needs: the terms of a named treaty or law, the sequence of events, the position of a group, the historiographical school a view belongs to; four options, each a plausible historical statement, the wrong ones true of a different event, state or decade.',
      '- Never invent a statistic, a quotation or a named minor figure. Use dates, treaties, laws, elections and leaders that any textbook on the period gives.',
    ],
  }),
  domains: [
    {
      id: 'paper1-italy-germany-1815-71',
      name: 'Paper 1 (AS): document question on liberalism and nationalism in Italy and Germany, 1815-71',
      share: 'all of Paper 1 (AS)',
      detect: /\b(paper 1|document question|source\w*|liberalis\w+|nationalis\w+|unification|risorgimento|italy|italian|germany|german|1815|1871|vienna settlement|congress of vienna|metternich|carlsbad|zollverein|1830|1848|frankfurt parliament|piedmont|cavour|garibaldi|mazzini|young italy|plombières|plombieres|solferino|magenta|thousand|bismarck|prussia\w*|austria\w*|schleswig|austro[- ]prussian|sadowa|königgrätz|koniggratz|north german confederation|franco[- ]prussian|sedan|ems telegram|realpolitik)\b/i,
      skills: [
        'The Vienna settlement and the Metternich system 1815-30: the German Confederation, Austrian dominance in Italy, the Carlsbad Decrees, the revolts of 1820-21 and 1830-31 and why they failed',
        'Liberalism and nationalism as movements: Mazzini and Young Italy, the Zollverein, the role of the middle classes, students and the press; the revolutions of 1848-49 in Italy and Germany (the Frankfurt Parliament, the Roman Republic, Piedmont\'s defeats) and the reasons for their failure',
        'Italian unification 1850-70: Cavour\'s Piedmont, Plombières and the war of 1859, Garibaldi and the Thousand, the role of France and Britain, Venetia 1866 and Rome 1870; the debate over Cavour\'s intentions',
        'German unification 1862-71: Bismarck, the Prussian army reforms and the constitutional crisis, Schleswig-Holstein, the Austro-Prussian War 1866 and the North German Confederation, the Franco-Prussian War 1870-71; Realpolitik vs nationalism; source skills: content, provenance, reliability, typicality and "how far"',
      ],
      hard: [
        'Sources from the same side with different purposes (a Prussian liberal who supports Bismarck after 1866 vs one who opposed him in 1862)',
        'Judging whether Cavour or Bismarck planned unification or exploited events, from sources that claim either',
        'The 25-mark part where the sources must be grouped by what they show about the view, not summarised',
        'Separating liberal aims (constitutions, rights) from national aims (unity) in a source that mixes them',
      ],
      traps: ['1848 read as a success for nationalism', 'Garibaldi and Cavour treated as allies with the same aim', 'the Zollverein read as a political union', 'Bismarck read as a German nationalist from the start'],
      exemplars: [
        `SA_QUESTION: Read Sources A and B. Compare and contrast the two sources' views on the role of Piedmont in the unification of Italy. [15]
\`\`\`passage
Source A
A letter from a Mazzinian exile in London to a friend in Genoa, 1860

Piedmont has not made Italy; it has swallowed it. The plebiscites were a form, the result arranged in Turin before a vote was cast. Garibaldi gave a kingdom to a king who would not have dared to take it, and the republic for which our friends died in Rome is further off than it was in 1849.

Source B
An editorial in a Turin newspaper, 1861

Without the army of Piedmont and the diplomacy of its ministers, the heroism of the volunteers would have ended as it ended at Rome in 1849, in exile and the gallows. Italy is one because one Italian state had a constitution, a parliament and allies, and because it knew when to act and when to wait.
\`\`\`
Sample Answer: Mark-scheme points. Contrast in view (up to 6): Source A sees Piedmont as an annexing power that used the plebiscites as a formality ("swallowed it", "arranged in Turin") and robbed the democratic movement of its goal, the republic; Source B sees Piedmont as the indispensable maker of Italy whose institutions, army and alliances turned volunteer heroism into a state ("Italy is one because one Italian state had a constitution"). Similarity (up to 3): both accept that Piedmont now controls the new kingdom and both acknowledge Garibaldi and the volunteers; both measure 1860 against the failure of 1849. Provenance explaining the difference (up to 4): A is a republican exile writing privately in 1860, before the kingdom is proclaimed, defeated in his aims by Garibaldi's handover at Teano; B is a Turin paper in 1861, in the capital of the new kingdom, justifying the settlement to its readers. Judgement (up to 2): the sources differ fundamentally on whether Piedmont made or took Italy, agreeing only on the facts of 1860. Levels: Level 5 (13-15) compares and contrasts content and provenance with a supported judgement; Level 4 (10-12) compares content with some provenance; Level 3 (7-9) similarities and differences from content alone; Level 2 (4-6) one source at a time; Level 1 (1-3) paraphrase.`,
        `MC_QUESTION: Which of the following best explains why the Frankfurt Parliament of 1848-49 failed to unite Germany?
A) Its delegates were overwhelmingly peasants with no political experience
B) It had no army or administration of its own, and the Prussian king refused the crown it offered him in 1849
C) France invaded the Rhineland to prevent unification
D) The Zollverein collapsed, removing the economic basis for unity
Correct Answer: B
Explanation: The Parliament depended on the German states for force; once Austria and Prussia recovered from 1848, Frederick William IV refused a "crown from the gutter" and the assembly was dispersed. Its delegates were largely professional men (A), France did not invade (C) and the Zollverein continued (D).`,
      ],
    },
    {
      id: 'paper2-europe-1750-1921',
      name: 'Paper 2 (AS): outline study, modern Europe 1750-1921',
      share: 'all of Paper 2 (AS)',
      detect: /\b(paper 2|outline study|1750|1921|french revolution|ancien r[ée]gime|estates[- ]general|louis xvi|national assembly|terror|robespierre|jacobin\w*|directory|napoleon\w*|consulate|continental system|hundred days|industrial revolution|industriali[sz]ation|factory|steam|textile\w*|urbani[sz]ation|working class|chartis\w+|origins? of (?:the first world war|world war (?:i|one)|ww1)|alliance system|triple (?:alliance|entente)|arms race|balkan\w*|sarajevo|july crisis|schlieffen|russian revolution|1905 revolution|february revolution|october revolution|bolshevik\w*|lenin|provisional government|civil war|war communism|kronstadt|nep)\b/i,
      skills: [
        'The French Revolution 1789-99: the causes (financial crisis, Enlightenment ideas, the Estates-General), the course from the National Assembly to the Terror and the Directory, why the Revolution became radical; Napoleon 1799-1815: his rise, domestic reforms (the Code, the Concordat), the empire and the reasons for his fall',
        'The Industrial Revolution c. 1750-1850: why Britain first (coal, capital, markets, agriculture), the spread to Belgium, France and Germany, its social effects (urbanisation, the working class, living standards, the family) and responses (Chartism, trade unions, socialism)',
        'The origins of the First World War 1871-1914: the alliance systems, imperial rivalry, the naval race, nationalism in the Balkans, the Bosnian crisis, the Balkan Wars, the July Crisis and the question of responsibility',
        'The Russian Revolution 1905-21: the weaknesses of Tsarism, 1905 and the Dumas, the impact of the war, February and October 1917, why the Bolsheviks won power and the Civil War, War Communism and the turn to the NEP in 1921',
      ],
      hard: [
        'A "why" question where long-term structures and short-term triggers must be weighed (why the Revolution broke out in 1789)',
        'A statement about responsibility that needs a definition before judgement ("Germany was responsible for the First World War")',
        'Comparing the Industrial Revolution\'s effects on different classes or countries',
        'Judging Lenin\'s role against circumstances and Bolshevik organisation in October 1917',
      ],
      traps: ['the Terror read as planned from 1789', 'Britain\'s industrialisation explained by one factor', 'Sarajevo read as the cause rather than the trigger', 'the Bolsheviks read as a mass party in 1917'],
      exemplars: [
        `SA_QUESTION: 'The Bolsheviks seized power in October 1917 because of the weakness of the Provisional Government rather than their own strengths.' How far do you agree? [20]
Sample Answer: A plan the mark scheme rewards. Judgement: largely agree about the opportunity, but the Bolsheviks' strengths explain why they, not another party, took it. For the view: the Provisional Government continued the war and launched the June offensive, postponed the Constituent Assembly and land reform, shared power uneasily with the Petrograd Soviet (dual power, Order No. 1), and was discredited by the Kornilov affair in August, after which it could not rely on the army; by October it had little support in the capital. Against the view: Lenin's April Theses gave the party a distinct position ("Peace, Land, Bread", "All power to the Soviets"), its membership and its majorities in the Petrograd and Moscow Soviets grew after Kornilov, Trotsky's Military Revolutionary Committee organised the seizure, and Lenin's insistence on acting before the Congress of Soviets fixed the timing. Conclusion: weakness created a vacuum that the Bolsheviks alone were prepared and willing to fill. Levels: Level 5 (17-20) argues both sides with precise support and sustains a judgement that links them; Level 4 (13-16) balanced and supported, judgement in the conclusion only; Level 3 (9-12) some argument in a mainly narrative account of 1917; Level 2 (5-8) narrative with an implied view; Level 1 (1-4) assertions. An account of February to October with no reference to the Provisional Government's decisions stays in Level 2.`,
        `MC_QUESTION: Which of the following was a long-term cause of the French Revolution rather than a short-term one?
A) The calling of the Estates-General for May 1789
B) The financial crisis produced by the cost of the American War
C) The privileges and tax exemptions of the First and Second Estates under the ancien régime
D) The poor harvest of 1788 and the rise in bread prices
Correct Answer: C
Explanation: The privileged orders' exemptions were structural features of the old regime for generations; the American War debt (B), the harvest of 1788 (D) and the calling of the Estates-General (A) all belong to the 1780s and to 1789 itself.`,
      ],
    },
    {
      id: 'paper3-holocaust-interpretations',
      name: 'Paper 3 (A Level): interpretations question, the Holocaust',
      share: 'all of Paper 3 (A Level)',
      detect: /\b(paper 3|interpretation\w*|historian\w*|historiograph\w*|intentionalis\w+|functionalis\w+|structuralis\w+|synthesis|cumulative radicali[sz]ation|holocaust|shoah|final solution|wannsee|einsatzgruppen|ghetto\w*|nuremberg laws|kristallnacht|perpetrator\w*|bystander\w*|collaborat\w+|anti[- ]?semitis\w+)\b/i,
      skills: [
        'The schools of interpretation: intentionalist (the Holocaust as the realisation of Hitler\'s long-held ideological aim, directed from the top), functionalist or structuralist (cumulative radicalisation through competing agencies, improvisation, the failure of emigration and expulsion plans, the war in the Soviet Union), the synthesis that most historians now hold (ideology set the direction; circumstances, local initiative and the war set the timing and method), and approaches that focus on perpetrators\' motives, on the occupied societies, or on the victims\' experience',
        'Reading an extract for its interpretation: what it sees as the cause and the decisive moment (1933, 1938, 1939, summer and autumn 1941, Wannsee in January 1942), who is held responsible and at what level (Hitler, the Nazi leadership, the SS, the bureaucracy, ordinary Germans, Europeans)',
        'Analysing a historian\'s approach: the evidence foregrounded (speeches and ideology, administrative documents, local studies, testimony), the language used, the level of analysis, and the context of writing (the trials of the 1940s and 1960s, the Historikerstreit of the 1980s, the opening of eastern European archives after 1990)',
        'Using contextual knowledge of 1933-45 to test an interpretation and reach a judgement about how convincing it is, with precision and without invented detail',
      ],
      hard: [
        'An extract that holds a synthesis position, so neither label fits cleanly',
        'Distinguishing the historian\'s interpretation of causation from their approach to evidence',
        'Judging an interpretation on its own terms rather than by preferring another school',
        'Noticing a shift in the extract\'s level of analysis (from leadership to local perpetrators)',
      ],
      traps: ['intentionalism and functionalism reduced to "Hitler did it" vs "Hitler did not"', 'the Wannsee Conference read as the decision rather than the coordination', '"approach" answered with more narrative of the Holocaust', 'a real historian\'s name invented for the extract'],
      exemplars: [
        `SA_QUESTION: Read the extract and then answer the question. What can you learn from this extract about the interpretation and approach of the historian who wrote it? Use the extract and your knowledge of the Holocaust to explain your answer. [40]
\`\`\`passage
From a historian writing in the 1980s

No order has been found, and none need be looked for. The road to the killing centres was not a straight line drawn in 1924 but a series of improvisations by men who found that each solution created a larger problem. Emigration gave way to expulsion, expulsion to ghettoisation, and the ghettos, overcrowded and starving by 1941, to the murder squads that followed the army into the Soviet Union. At each stage officials competed to offer the regime what it seemed to want. The ideology supplied the direction; it did not supply the plan.
\`\`\`
Sample Answer: Mark-scheme points. Interpretation (up to 12): functionalist or structuralist, with a nod to synthesis in the last sentence; the Holocaust is explained as cumulative radicalisation through improvised stages (emigration, expulsion, ghettoisation, mass shooting) rather than a plan held since Mein Kampf ("not a straight line drawn in 1924"), with responsibility spread across competing officials "working towards" what the regime wanted. Approach (up to 12): a structural, administrative approach that studies agencies and processes rather than Hitler's intentions, treats the absence of a written order as evidence ("none need be looked for"), uses the chronology of policy to argue causation, and adopts a detached, analytical tone; it foregrounds the mechanics of persecution and the war in the East and says little about antisemitic ideology as a motive for individual perpetrators. Context (up to 8): writing in the 1980s, in the decade of the debate between intentionalists and functionalists and of the German Historikerstreit, after the local and institutional studies of the 1970s had shifted attention from Hitler to the bureaucracy. Judgement (up to 8): the extract explains the escalation of 1939-41 convincingly, but its claim that ideology "did not supply the plan" understates the role of Hitler's decisions in 1941 and of antisemitism in making mass murder thinkable, which the later synthesis restored. Levels: Level 5 (33-40) identifies the interpretation and analyses the approach, supported from the extract and from knowledge, with a sustained judgement; Level 4 (25-32) identifies both with some support; Level 3 (17-24) identifies the interpretation and describes the approach; Level 2 (9-16) summarises with some comment; Level 1 (1-8) paraphrase or general narrative.`,
        `MC_QUESTION: A historian argues that the Holocaust was the deliberate fulfilment of an aim Hitler had held since the 1920s and that each step from 1933 was directed from the top towards it. This view is best described as
A) functionalist
B) intentionalist
C) a synthesis of the two main schools
D) a bystander-centred interpretation
Correct Answer: B
Explanation: A long-held aim realised by direction from the top is the intentionalist position; functionalists stress improvisation and competing agencies, the synthesis combines ideological direction with circumstantial timing, and bystander-centred work looks at the occupied societies rather than at the leadership.`,
      ],
    },
    {
      id: 'paper4-dictators-1918-41',
      name: 'Paper 4 (A Level): depth study, Europe of the dictators 1918-41',
      share: 'all of Paper 4 (A Level)',
      detect: /\b(paper 4|depth study|1918|1941|dictator\w*|totalitarian\w*|weimar|spartacist\w*|kapp putsch|hyperinflation|ruhr|stresemann|dawes|young plan|wall street crash|nazi\w*|hitler|enabling act|reichstag fire|night of the long knives|gleichschaltung|hitler youth|propaganda|goebbels|volksgemeinschaft|four[- ]year plan|mussolini|fascis\w+|march on rome|acerbo|matteotti|lateran|corporate state|battle for (?:grain|births)|stalin\w*|lenin|trotsky|power struggle|five[- ]year plan\w*|collectivi[sz]ation|kulak\w*|gulag|great (?:purge|terror)|show trial\w*|cult of personality|nazi[- ]soviet pact)\b/i,
      skills: [
        'Germany: the Weimar Republic\'s problems and recovery (1918-19, the Treaty of Versailles, 1923, the Stresemann years), the rise of the Nazis to 1933 (the Depression, propaganda, elections, the role of elites), the consolidation of power (the Reichstag Fire Decree, the Enabling Act, Gleichschaltung, the Night of the Long Knives), the Nazi state: terror and consent, propaganda, the economy and rearmament, racial policy, the Volksgemeinschaft and its limits',
        'Italy: the post-war crisis and the rise of Fascism, the March on Rome, the Acerbo Law and the Matteotti crisis, the building of the dictatorship, the corporate state, the Lateran Pacts, the "battles", foreign policy and the drift towards Germany',
        'The Soviet Union: Lenin\'s legacy and the power struggle, Stalin\'s victory, the Five-Year Plans and collectivisation (aims, methods, results, the famine), the Great Terror and the show trials, the cult of personality, society and culture under Stalin, the Nazi-Soviet Pact',
        'Comparative themes: how the dictators came to power, the balance of terror and consent, propaganda and the cults, economic policy and its results, the treatment of opponents and minorities, the meaning and limits of "totalitarian"',
      ],
      hard: [
        '"Assess the reasons" questions that need reasons weighed (why Hitler became Chancellor in January 1933)',
        'Statements that require a definition before judgement ("Stalin\'s economic policies were a success")',
        'Comparing terror and consent as the basis of a regime\'s stability',
        'Separating the aims of a policy from its results (collectivisation)',
      ],
      traps: ['Hitler read as elected to power by a majority', 'Mussolini\'s dictatorship dated to 1922 rather than 1925-26', 'collectivisation read as an economic success because industry grew', 'the Great Terror explained by Stalin\'s paranoia alone'],
      exemplars: [
        `SA_QUESTION: Assess the reasons why Hitler was appointed Chancellor in January 1933. [30]
Sample Answer: A plan the mark scheme rewards. Thesis: the Depression made the Nazis the largest party, but it was the decision of the conservative elite around Hindenburg, after the Nazi vote had begun to fall, that put Hitler in office; electoral success was necessary, the "backstairs intrigue" was decisive. Argument 1, the Depression: unemployment over six million by 1932 discredited parliamentary government, which had ruled by presidential decree since 1930, and drove voters to the extremes; the Nazi vote rose from 2.6% in 1928 to 37.3% in July 1932. Argument 2, Nazi strengths: Goebbels's propaganda, Hitler's flights across Germany in the 1932 campaigns, a message that offered something to every group, the SA's visible force, and the party's organisation. Argument 3, the elite: Papen's wish to return to office, Schleicher's failure to split the Nazis, the fear of communism among industrialists and landowners, and Hindenburg's belief, pressed by Papen, that Hitler could be "boxed in" with only two other Nazis in the cabinet. Counterargument: by November 1932 the Nazi vote had fallen to 33.1% and the party was in debt, so without the elite's miscalculation Hitler might never have been appointed; conversely, without the mass vote the elite would have had no reason to consider him. Conclusion: the Depression created the Nazi movement's opportunity; the conservatives' intrigue turned it into power. Levels: Level 5 (25-30) a sustained analytical argument that assesses the relative importance of reasons with precise support; Level 4 (19-24) analytical and supported, assessment uneven; Level 3 (13-18) explains reasons with some analysis in a largely descriptive account; Level 2 (7-12) describes the rise of the Nazis; Level 1 (1-6) assertions.`,
        `MC_QUESTION: Which of the following was the immediate result of the Matteotti crisis of 1924 in Italy?
A) The fall of Mussolini's government and a return to liberal rule
B) The withdrawal of opposition deputies from parliament (the Aventine Secession), which left Mussolini free to build the dictatorship from 1925
C) The signing of the Lateran Pacts with the papacy
D) The abolition of the monarchy
Correct Answer: B
Explanation: The murder of the socialist deputy Matteotti shook Mussolini's position, but the opposition's walkout removed it from parliament and the king did not dismiss him; from January 1925 Mussolini moved to one-party rule. The Lateran Pacts came in 1929 and the monarchy survived until 1946.`,
      ],
    },
  ],
  difficulty: AICE_DIFFICULTY,
}
