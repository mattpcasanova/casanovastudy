// The AP United States Government and Politics exam as a reference for the
// guide prompts: Section I multiple choice (four options: concept
// application, quantitative analysis of a chart or table, qualitative
// analysis of a passage, comparison of Supreme Court cases) and Section II
// four free-response questions (concept application, quantitative analysis,
// SCOTUS comparison, argument essay using the required foundational
// documents). Units 1-5.

import type { ExamProfile } from './types'

export const AP_GOV: ExamProfile = {
  id: 'ap-gov',
  pace: 87,
  name: 'the AP U.S. Government and Politics exam',
  detect: {
    exam: /\bAP\s+(?:US\s+|U\.S\.\s+|United States\s+|American\s+)?gov(?:ernment)?(?:\s+(?:and|&)\s+politics)?\b/i,
    exclude: /\bcomparative\b/i,
    subjectHints: /./,
    subjects: ['history', 'social-studies', 'social studies', 'government', 'civics'],
    explicit: /\bAP\s+(?:US\s+|U\.S\.\s+|United States\s+|American\s+)?gov(?:ernment)?\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly four options A-D, as on Section I. No true/false, no "I, II and III" lists. The exam's four item types, all represented: concept application (a 2-4 sentence scenario: "A state legislature passes ... Which of the following ..."), quantitative analysis (a table or bar graph in a figure block, with "Which of the following is an accurate conclusion from the data?" and "Which of the following best explains the trend?"), qualitative analysis (an excerpt in a \`\`\`passage fence from a required foundational document, a Supreme Court opinion or a described political text, 40-150 words, written by you in the style of the source and attributed, e.g. "excerpt adapted from a Supreme Court majority opinion" or "from Federalist No. 51"), and Supreme Court comparison ("Which of the following cases ... the same constitutional principle as ...?").
- The required foundational documents (the Declaration of Independence, the Articles of Confederation, the Constitution, Federalist Nos. 10, 51, 70 and 78, Brutus No. 1, and Letter from Birmingham Jail) and the required Supreme Court cases (Marbury v. Madison, McCulloch v. Maryland, Schenck v. United States, Brown v. Board of Education, Baker v. Carr, Engel v. Vitale, Gideon v. Wainwright, Tinker v. Des Moines, New York Times Co. v. United States, Wisconsin v. Yoder, Shaw v. Reno, United States v. Lopez, McDonald v. Chicago, Citizens United v. FEC) are the ones to use; describe their holdings accurately. A non-required case may appear only as a described scenario to compare with a required case.
- Stems use the exam's wording: "Which of the following best describes ...", "Which of the following constitutional provisions is most relevant to the scenario?", "The scenario best illustrates which of the following?", "Which of the following is an accurate comparison of ...?", "The author of the excerpt would most likely agree with which of the following?", "Which of the following actions could Congress take in response?"
- Free-response items are SA_QUESTION, one per part, in the exam's forms: concept application ("Describe ... Explain how ... In the context of the scenario, explain how ... could ..."), quantitative ("Identify the trend ... Describe a similarity or difference ... Explain how the data illustrate ..."), SCOTUS comparison ("Identify the constitutional clause common to both cases. Explain how the facts of ... led to a holding similar to/different from ... Describe an action that ... could take in response to the holding."), and argument pieces ("Write a defensible thesis ... Support it with one piece of evidence from a required foundational document and explain how it supports the claim."). The Sample Answer is the scoring guideline: the point-earning statement for each part, with the specific document or case and the explanation required ("'the Constitution' is not specific; 'the necessary and proper clause' is").
- Options are four parallel statements; the wrong ones are the misconceptions under WRONG ANSWERS ARE BUILT FROM (a power given to the wrong branch, a case's holding reversed, a correlation read as the only explanation).
- Before writing an item's answer, check that exactly one option is correct and the facts (which branch, which clause, which case) are right. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the provision, case or data point that decides it, and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'foundations',
      name: 'Unit 1: Foundations of American Democracy',
      share: 'about 15-22% of the test',
      detect: /\b(unit 1\b|foundations|democracy|republic\w*|social contract|natural rights|declaration|articles of confederation|constitution\w*|federalist|brutus|anti[- ]federalist|separation of powers|checks and balances|federalis\w+|commerce clause|necessary and proper|supremacy clause|tenth amendment|enumerated|implied powers|grants?[- ]in[- ]aid|block grant|mandate|devolution|mcculloch|lopez|great compromise|three[- ]fifths|electoral college|amendment process|participatory|pluralist|elite)\b/i,
      skills: [
        'Models of democracy (participatory, pluralist, elite) and the ideals in the Declaration; the weaknesses of the Articles of Confederation; the Constitution\'s compromises (Great Compromise, Three-Fifths, the Electoral College) and ratification (Federalist No. 10 and 51 vs Brutus No. 1)',
        'Separation of powers and checks and balances; federalism (enumerated, implied and reserved powers; the commerce, necessary and proper, and supremacy clauses; the 10th and 14th Amendments), fiscal federalism (categorical and block grants, mandates), McCulloch v. Maryland and United States v. Lopez',
      ],
      hard: [
        'Matching a Federalist 10 or Brutus 1 excerpt to its argument about the size of a republic, without names',
        'A scenario where the question is whether a federal law can reach an activity under the commerce clause, with Lopez as the limit',
        'Distinguishing categorical grants, block grants and mandates by what the state keeps control of',
        'A checks-and-balances scenario where the right check belongs to a less obvious branch (the Senate\'s advice and consent, judicial review)',
      ],
      traps: ['McCulloch and Lopez holdings swapped', 'Federalist 10\'s view of factions attributed to Brutus', 'the Articles credited with a power they lacked (taxation)', 'a block grant described as having strict federal conditions'],
      exemplars: [
        `MC_QUESTION: The author of the excerpt would most likely agree with which of the following statements?
\`\`\`passage
Excerpt adapted from an essay published during the ratification debate, 1787

In a republic so extensive as the United States, the legislature cannot attend to the various concerns and wants of its different parts. The representatives will be so far removed from the people that the government will be exercised by a few, and the people will lose their liberty.
\`\`\`
A) A large republic is the best safeguard against the dangers of faction.
B) Liberty is best preserved in small republics where representatives stay close to the people.
C) A strong national executive is necessary to energetic government.
D) The judiciary should have the power to strike down state laws.
Correct Answer: B
Explanation: The excerpt is the Anti-Federalist argument of Brutus No. 1; A is Madison's reply in Federalist No. 10, and C is Hamilton's point in Federalist No. 70.`,
        `MC_QUESTION: Congress passes a law making it a federal crime to possess a firearm within 1,000 feet of a school, citing its power to regulate interstate commerce. A defendant challenges the law. Based on United States v. Lopez (1995), which of the following is the most likely outcome?
A) The law is upheld, because the Supreme Court has never limited Congress's commerce power.
B) The law is struck down, because possessing a gun near a school is not an economic activity that substantially affects interstate commerce.
C) The law is upheld under the necessary and proper clause, as in McCulloch v. Maryland.
D) The law is struck down, because the Second Amendment protects an individual right to bear arms.
Correct Answer: B
Explanation: Lopez held exactly this: the Gun-Free School Zones Act exceeded the commerce power because the regulated activity was not economic. D is a different constitutional question (McDonald), not the one Lopez decided.`,
      ],
    },
    {
      id: 'branches',
      name: 'Unit 2: Interactions Among Branches of Government',
      share: 'about 25-36% of the test',
      detect: /\b(unit 2\b|branches|congress\w*|house|senate|filibuster|cloture|committee|speaker|majority leader|gerrymander\w*|redistricting|apportionment|baker v|shaw v|logrolling|pork|earmark|trustee|delegate|politico|president\w*|executive order|veto|signing statement|bully pulpit|federalist (?:no\. )?70|war powers|impeach\w*|bureaucra\w+|agency|rulemaking|iron triangle|issue network|oversight|judicial review|marbury|federalist (?:no\. )?78|precedent|stare decisis|judicial activism|restraint|appointment|confirmation)\b/i,
      skills: [
        'Congress: structure and powers, the lawmaking process (committees, the filibuster and cloture, the Speaker and majority leader), representation models (trustee, delegate, politico), redistricting and gerrymandering (Baker v. Carr, Shaw v. Reno), budget politics and mandatory vs discretionary spending',
        'The presidency: formal and informal powers (veto, executive orders, executive agreements, appointments, the bully pulpit), Federalist No. 70, the War Powers Resolution, the expansion of presidential power and the 22nd Amendment',
        'The bureaucracy: implementation and rulemaking, discretionary authority, iron triangles and issue networks, oversight and control by Congress, the president and the courts',
        'The judiciary: judicial review (Marbury v. Madison, Federalist No. 78), precedent and stare decisis, judicial activism vs restraint, appointments and life tenure, checks on the courts (amendments, jurisdiction, appointments)',
      ],
      hard: [
        'A scenario where a presidential power is informal (an executive order) and the question asks how Congress or the courts can respond',
        'Distinguishing Baker v. Carr (justiciability of apportionment, "one person, one vote") from Shaw v. Reno (race as the predominant factor in a district)',
        'How the Senate\'s rules (the filibuster) shape what a majority can pass, in a scenario',
        'Bureaucratic discretion read from a statute\'s vague language, and the oversight tools Congress has',
      ],
      traps: ['the House and Senate\'s distinctive powers swapped (impeachment vs trial, revenue bills, treaties)', 'an executive order treated as a law Congress cannot touch', 'Marbury read as giving Congress a power', 'the bureaucracy placed outside the executive branch'],
      exemplars: [
        `MC_QUESTION: Which of the following is an accurate comparison of the House of Representatives and the Senate?
A) House: initiates revenue bills; Senate: ratifies treaties and confirms presidential appointments
B) House: tries impeachments; Senate: brings articles of impeachment
C) House: unlimited debate on most bills; Senate: debate limited by the Rules Committee
D) House: six-year terms; Senate: two-year terms
Correct Answer: A
Explanation: Revenue bills originate in the House (Article I, Section 7); treaties and appointments go through the Senate. B, C and D each reverse the chambers' roles.`,
        `SA_QUESTION: A president issues an executive order directing federal agencies to stop enforcing a provision of a law passed by Congress. a) Describe the constitutional basis for the president's claim to this power. b) Explain how Congress could respond to the executive order. c) Explain how the judiciary could limit the executive order.
Sample Answer: a) One point: the president's authority as chief executive under Article II (the "take care" clause and the vesting of executive power) to direct how the executive branch carries out laws. b) One point for a specific congressional response with explanation: Congress could pass legislation that explicitly requires enforcement or withholds funding from the agencies until they comply (the power of the purse), or hold oversight hearings; a vague "Congress could disagree" earns nothing. c) One point: a federal court, in a case brought by a party with standing, could rule the order unconstitutional or contrary to the statute under the power of judicial review established in Marbury v. Madison, enjoining its enforcement.`,
      ],
    },
    {
      id: 'liberties-rights',
      name: 'Unit 3: Civil Liberties and Civil Rights',
      share: 'about 13-18% of the test',
      detect: /\b(unit 3\b|civil libert\w+|civil rights|bill of rights|first amendment|establishment clause|free exercise|engel|yoder|free speech|schenck|tinker|clear and present danger|symbolic speech|free press|new york times|prior restraint|second amendment|mcdonald|selective incorporation|due process|gideon|right to counsel|exclusionary rule|miranda|privacy|equal protection|fourteenth amendment|brown v|plessy|affirmative action|title ix|civil rights act|voting rights act|letter from birmingham jail|king)\b/i,
      skills: [
        'The Bill of Rights and selective incorporation through the 14th Amendment (McDonald v. Chicago); the First Amendment: establishment (Engel v. Vitale) and free exercise (Wisconsin v. Yoder), speech (Schenck, Tinker), press (New York Times Co. v. United States); the Second Amendment (McDonald)',
        'Due process and the rights of the accused (Gideon v. Wainwright, the exclusionary rule, Miranda); the right to privacy as a contested doctrine',
        'Civil rights: the equal protection clause, Brown v. Board of Education, Letter from Birmingham Jail, the Civil Rights Act of 1964 and the Voting Rights Act of 1965, Title IX, affirmative action, and the role of social movements and the courts',
      ],
      hard: [
        'A speech scenario where the question is whether it is more like Schenck (a clear and present danger) or Tinker (symbolic speech that does not disrupt)',
        'Establishment vs free exercise: which clause a scenario raises, and the holdings of Engel and Yoder',
        'Selective incorporation explained as the mechanism, with McDonald as the example',
        'Letter from Birmingham Jail read for its argument about just and unjust laws and direct action',
      ],
      traps: ['Engel and Yoder holdings swapped', 'Tinker read as allowing any student speech', 'incorporation attributed to the Fifth Amendment', 'Brown credited with the Civil Rights Act\'s provisions'],
      exemplars: [
        `MC_QUESTION: A public high school suspends students for wearing wristbands protesting a school board decision; the wristbands caused no disruption. Which of the following cases most directly supports the students' claim that their suspension violated the First Amendment?
A) Schenck v. United States, because the protest created a clear and present danger
B) Tinker v. Des Moines, because symbolic speech by students that does not substantially disrupt the school is protected
C) Engel v. Vitale, because schools may not sponsor particular viewpoints
D) New York Times Co. v. United States, because the school imposed a prior restraint on the press
Correct Answer: B
Explanation: Tinker protected armbands worn in silent protest absent substantial disruption; Schenck cuts the other way, and C and D concern religion and the press.`,
      ],
    },
    {
      id: 'ideologies',
      name: 'Unit 4: American Political Ideologies and Beliefs',
      share: 'about 10-15% of the test',
      detect: /\b(unit 4\b|ideolog\w+|political socialization|political culture|individualism|equality of opportunity|free enterprise|rule of law|limited government|public opinion|poll\w*|sampling|margin of error|scientific poll|liberal\w*|conservativ\w*|libertarian\w*|keynesian|supply[- ]side|monetary policy|fiscal policy|federal reserve|generational|life[- ]cycle effects)\b/i,
      skills: [
        'Core American political values (individualism, equality of opportunity, free enterprise, rule of law, limited government) and political socialization (family, school, peers, media, generational and life-cycle effects)',
        'Measuring public opinion: scientific polling, random samples, sampling error, question wording, types of polls and their uses and limits',
        'Ideologies (liberal, conservative, libertarian) on economic and social issues; Keynesian vs supply-side economics, monetary vs fiscal policy and the Federal Reserve',
      ],
      hard: [
        'A poll result item where the question is what the methodology (sample, wording, margin of error) does or does not allow one to conclude',
        'Placing a position on both the economic and the social dimension (a libertarian stance)',
        'Monetary vs fiscal policy from a described action and who takes it',
      ],
      traps: ['a larger sample read as removing bias from a non-random sample', 'the Federal Reserve treated as part of Congress', 'conservatives and libertarians conflated on social issues'],
      exemplars: [
        `MC_QUESTION: A poll of 1,000 randomly selected adults reports that 52% favor a policy, with a margin of error of ±3 percentage points, while 48% oppose it. Which of the following is an accurate conclusion?
A) A majority of adults definitely favors the policy.
B) The poll cannot determine whether a majority favors the policy, because the result is within the margin of error.
C) The sample is too small to produce a reliable estimate.
D) The result shows that opinion has shifted since the previous poll.
Correct Answer: B
Explanation: 52 ± 3 includes values below 50, so support could be a minority; a random sample of 1,000 is standard (C), and nothing is said about earlier polls (D).`,
      ],
    },
    {
      id: 'participation',
      name: 'Unit 5: Political Participation',
      share: 'about 20-27% of the test',
      detect: /\b(unit 5\b|participation|voting|voter turnout|suffrage|15th|17th|19th|24th|26th amendment|voter registration|rational[- ]choice|retrospective|prospective|party[- ]line|political part\w+|party realignment|candidate[- ]centered|third part\w+|winner[- ]take[- ]all|primary|caucus|convention|electoral college|incumbency|campaign finance|citizens united|super PAC|PAC|federal election|interest group|lobbying|free rider|linkage institution|media|horse[- ]race|social media|elections?)\b/i,
      skills: [
        'Voting rights and turnout (the 15th, 17th, 19th, 24th and 26th Amendments, registration laws, demographic and structural factors), models of voting behavior (rational choice, retrospective, prospective, party-line)',
        'Political parties as linkage institutions, realignments, candidate-centered campaigns, why third parties struggle (winner-take-all), primaries and caucuses, the Electoral College and its effects, incumbency advantage',
        'Interest groups and lobbying (free-rider problem, iron triangles), campaign finance (FECA, BCRA, Citizens United v. FEC, PACs and super PACs), the media as a linkage institution (horse-race coverage, media consolidation, social media)',
      ],
      hard: [
        'Explaining a turnout gap from both structural (registration, election day) and demographic factors in one item',
        'Citizens United\'s holding (independent expenditures by corporations and unions are protected speech) distinguished from contribution limits that remain',
        'Why the Electoral College encourages a two-party system and swing-state campaigning',
        'A scenario where an interest group\'s tactic (litigation, lobbying, grassroots) is matched to its resources',
      ],
      traps: ['Citizens United read as allowing unlimited direct contributions to candidates', 'the 24th and 26th Amendments swapped', 'turnout decline attributed only to apathy', 'a super PAC coordinating with a campaign'],
      exemplars: [
        `MC_QUESTION: Which of the following best explains why third parties rarely win seats in Congress?
A) Federal law prohibits third-party candidates from appearing on most state ballots.
B) Single-member districts with winner-take-all elections give a party no representation unless it finishes first in a district.
C) Third parties are barred from receiving campaign contributions from PACs.
D) The Seventeenth Amendment limits congressional elections to two parties.
Correct Answer: B
Explanation: Finishing second everywhere yields nothing under winner-take-all rules, so voters and donors drift to the two parties that can win. A, C and D describe restrictions that do not exist.`,
        `SA_QUESTION: Using the data, identify the trend in voter turnout among 18-to-29-year-olds from 2014 to 2022, describe one difference between that group and voters 65 and older, and explain one factor that could account for the difference.
\`\`\`graph
kind: table
title: Reported turnout in midterm elections by age group
columns: Year | Ages 18-29 | Ages 65 and older
row: 2014 | 20% | 59%
row: 2018 | 36% | 66%
row: 2022 | 27% | 63%
\`\`\`
Sample Answer: Trend (1 point): turnout among 18-to-29-year-olds rose sharply from 2014 to 2018 and then fell in 2022, while staying above its 2014 level. Difference (1 point): voters 65 and older turned out at a far higher rate in every year (more than double in 2014 and 2022). Explanation (1 point for a factor tied to the data): older voters are more likely to be registered, to have stable addresses and to have voted before (habit and life-cycle effects), while younger citizens face registration hurdles and move more often; a specific structural factor such as registration deadlines also earns the point.`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the recall items (a definition, which amendment did what). At most 1 item in 8 that easy, never first in a section; about half typical (one concept, case or clause applied to a scenario) and at least a third of the kind under WHAT HARD LOOKS LIKE. Free-response parts should need a specific document, case or clause and the explanation.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 4 from a 5. At least 4 of every 5 items must be ones a student headed for a 3 would miss: cases compared by principle rather than topic, scenarios where the relevant clause is not the obvious one, excerpts from the foundational documents without names, data items where the methodology limits the conclusion, and free-response parts where one missing specific loses the point. Hard never means cases or facts outside the course framework.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one concept or one case each, with the scenario stated plainly. Still real exam items.`,
  },
}
