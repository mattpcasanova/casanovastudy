// The Florida Civics End-of-Course assessment (grade 7) as a reference for
// the guide prompts. Computer-based, untimed (no pace), four-option multiple
// choice only; most items sit on a stimulus (a founding-document passage, a
// described cartoon, a chart). The four reporting categories are the domains.

import type { ExamProfile } from './types'

export const FL_CIVICS_EOC: ExamProfile = {
  id: 'fl-civics-eoc',
  name: 'the Florida Civics EOC',
  detect: {
    exam: /\bCivics\b.*\bEOC\b|\bEOC\b.*\bCivics\b|\bCivics\s+(?:end[- ]of[- ]course|state (?:test|exam))\b|\b7th[- ]grade\s+civics\b/i,
    subjectHints: /./,
    subjects: ['history', 'social-studies', 'social studies'],
    explicit: /\bCivics\b.*\bEOC\b|\bEOC\b.*\bCivics\b|\bCivics\s+(?:end[- ]of[- ]course|state (?:test|exam))\b|\b7th[- ]grade\s+civics\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly four options A-D, as on the test, which is multiple choice only. No true/false, no "I, II and III" lists, no NUM_QUESTION; at most one SA_QUESTION in eight, written as a constructed-response practice ("Explain how the passage reflects the principle of ...") with the Sample Answer as the statement a scorer would credit.
- Most items sit on a stimulus, as the test's do, in a \`\`\`passage fence directly under the question line: an excerpt from a founding document (public-domain texts like the Preamble, the Declaration of Independence, the Bill of Rights, Federalist excerpts and the Florida Constitution may be quoted exactly; mark the part the question is about with [[double brackets]]), a described political cartoon ("The cartoon shows ..."), a chart or table (kind: table), a scenario ("A city council passes a law that ..."), or a quotation attributed generically ("A speech by a candidate for governor"), never a fabricated quotation from a real named person.
- Stems are the test's, written for a 7th grader: "The passage below is from the Declaration of Independence. Which document most influenced the idea in the passage?", "Which statement best describes the purpose of ...", "Based on the chart, which conclusion can be drawn?", "Which constitutional principle is illustrated by the scenario?", "Which amendment protects the right described?", "What was a weakness of the Articles of Confederation that the Constitution addressed?", "Which action is a responsibility, rather than an obligation, of a citizen?". Options are four parallel phrases of similar length; the wrong ones are the confusions under WRONG ANSWERS ARE BUILT FROM.
- Content stays inside the Civics benchmarks (SS.7.C.1-4): Enlightenment ideas, the founding documents, the Constitution and Bill of Rights, the branches and levels of government, citizenship, elections, the court system and landmark cases, and Florida's government. Court cases are the benchmark list (Marbury v. Madison, Plessy v. Ferguson, Brown v. Board of Education, Gideon v. Wainwright, Miranda v. Arizona, In re Gault, Tinker v. Des Moines, Hazelwood v. Kuhlmeier, United States v. Nixon, Bush v. Gore, District of Columbia v. Heller), described by their holdings as the test does.
- Before writing the key, check that exactly one option fits the stimulus and that each wrong option is wrong for a nameable reason. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the idea in the stimulus, the benchmark fact that decides it, and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'origins',
      name: 'Origins and purposes of law and government (SS.7.C.1)',
      share: 'about 25% of the test',
      detect: /\b(enlightenment|locke|montesquieu|natural rights|social contract|rule of law|magna carta|mayflower compact|english bill of rights|common sense|paine|declaration of independence|grievance\w*|articles of confederation|preamble|constitution\w*|federalis\w+|anti[- ]federalis\w+|separation of powers|checks and balances|limited government|popular sovereignty|republican\w*|individual rights|monarch\w*|oligarch\w*|autocra\w*|democra\w*|communis\w*|socialis\w*|capitalis\w*|market economy|command economy|mixed economy|founding)\b/i,
      skills: [
        'Enlightenment ideas and their sources: Locke (natural rights, consent of the governed), Montesquieu (separation of powers), and the English influences: Magna Carta (limits on the monarch), the English Bill of Rights, the Mayflower Compact (self-government), Common Sense',
        'The Declaration of Independence: its ideas (natural rights, consent, the right to alter government) and the grievances against the king that the Constitution later addressed',
        'The Articles of Confederation and its weaknesses (no power to tax, no executive, no national court, unanimous amendment), the Constitutional Convention, Federalists vs Anti-Federalists and the Bill of Rights as the compromise',
        'The Preamble\'s six purposes and the constitutional principles (popular sovereignty, rule of law, limited government, separation of powers, checks and balances, federalism, individual rights); forms of government (monarchy, oligarchy, autocracy, direct and representative democracy) and economic systems (market, command, mixed)',
      ],
      hard: [
        'Matching a Declaration grievance to the constitutional provision that fixed it (quartering troops, trial by jury)',
        'Distinguishing the Magna Carta\'s contribution (limits on the king) from the English Bill of Rights (rights of Parliament and citizens) from the Mayflower Compact (self-government)',
        'A scenario about a government where the student must name the principle at work (checks and balances vs separation of powers)',
        'An Anti-Federalist argument read for what it wanted (a bill of rights, stronger states)',
      ],
      traps: ['separation of powers confused with checks and balances', 'the Declaration treated as the plan of government', 'Locke credited with separation of powers', 'the Articles having a strong national government'],
      exemplars: [
        `MC_QUESTION: The passage below is from the Declaration of Independence. Which Enlightenment thinker most directly influenced the idea in the bracketed part?
\`\`\`passage
We hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness. [[That to secure these rights, Governments are instituted among Men, deriving their just powers from the consent of the governed.]]
\`\`\`
A) John Locke, who wrote that government is a social contract based on the consent of the people
B) Baron de Montesquieu, who wrote that power should be divided among three branches
C) Thomas Hobbes, who wrote that people need an absolute ruler to keep order
D) William Blackstone, who wrote about English common law
Correct Answer: A
Explanation: Government "deriving its just powers from the consent of the governed" is Locke's social contract. Montesquieu's idea, separation of powers, appears in the Constitution's structure rather than in this passage.`,
        `MC_QUESTION: Which statement describes a weakness of the Articles of Confederation that the U.S. Constitution corrected?
A) The national government could not collect taxes, so it could not pay its debts.
B) The president had too much power over the states.
C) The national courts overturned too many state laws.
D) Large states had more votes in Congress than small states.
Correct Answer: A
Explanation: Under the Articles, Congress could only ask the states for money; the Constitution gave Congress the power to tax. The Articles had no president or national court system (choices B and C), and each state had one vote (choice D).`,
      ],
    },
    {
      id: 'citizens',
      name: 'Roles, rights and responsibilities of citizens (SS.7.C.2)',
      share: 'about 25% of the test',
      detect: /\b(citizen\w*|naturaliz\w*|obligation\w*|responsibilit\w*|jury duty|selective service|bill of rights|first amendment|freedom of (?:speech|religion|the press|assembly)|petition|due process|search and seizure|double jeopardy|self[- ]incrimination|right to (?:an attorney|counsel|bear arms|vote)|13th|14th|15th|19th|24th|26th|amendment\w*|equal protection|poll tax|suffrage|marbury|plessy|brown v|gideon|miranda|tinker|in re gault|hazelwood|bush v\.? gore|heller|nixon|landmark|supreme court case\w*|political part\w*|interest group\w*|lobby\w*|media|bias|propaganda|public opinion|symbolism|bandwagon|testimonial|public policy)\b/i,
      skills: [
        'Citizenship by birth (the 14th Amendment) and naturalization (its steps), and the difference between obligations (obey laws, pay taxes, jury duty, Selective Service) and responsibilities (vote, stay informed, volunteer, run for office)',
        'The Bill of Rights, especially the First Amendment freedoms and the rights of the accused (4th, 5th, 6th, 8th), due process, and the amendments that expanded voting and equality (13th, 14th, 15th, 19th, 24th, 26th)',
        'Landmark Supreme Court cases by their holdings: Marbury (judicial review), Plessy (separate but equal) and Brown (overturned it), Gideon (right to an attorney), Miranda (rights read at arrest), In re Gault (due process for juveniles), Tinker (student speech) and Hazelwood (school newspapers), U.S. v. Nixon (no one above the law), Bush v. Gore (equal protection in recounts), D.C. v. Heller (individual right to bear arms)',
        'How citizens influence government: political parties, interest groups and lobbying, the media and bias, propaganda techniques (bandwagon, testimonial, glittering generalities, name-calling), and public opinion polls',
      ],
      hard: [
        'A scenario where the student must pick which amendment protects the right described, with two amendments about similar rights',
        'Distinguishing Tinker from Hazelwood when a school limits student expression',
        'An obligation vs responsibility item where the wrong options are responsibilities that feel required',
        'Identifying the propaganda technique in a described advertisement',
      ],
      traps: ['voting treated as an obligation', 'Plessy and Brown reversed', 'Gideon confused with Miranda', 'the 15th Amendment credited with women\'s suffrage'],
      exemplars: [
        `MC_QUESTION: Students at a public middle school wear black armbands to protest a war. The principal suspends them, although the armbands caused no disruption. Based on a landmark Supreme Court case, which statement best describes the students' rights?
A) The students' speech is protected because it did not substantially disrupt the school.
B) The students have no free speech rights while they are at school.
C) The school may ban any protest because the armbands expressed a political view.
D) The students may be punished because the principal disagreed with the message.
Correct Answer: A
Explanation: Tinker v. Des Moines held that students do not "shed their constitutional rights at the schoolhouse gate"; speech can be limited only if it substantially disrupts school. Hazelwood, which allowed limits on a school-sponsored newspaper, is the tempting confusion.`,
        `MC_QUESTION: Which of the following is an obligation of United States citizens, rather than a responsibility?
A) Voting in local elections
B) Serving on a jury when called
C) Attending a city council meeting
D) Volunteering at a community food bank
Correct Answer: B
Explanation: Obligations are required by law, such as jury duty, paying taxes and obeying laws. Voting, staying informed and volunteering are responsibilities citizens should do but are not legally required to do.`,
      ],
    },
    {
      id: 'processes',
      name: 'Government policies and political processes (SS.7.C.3)',
      share: 'about 30% of the test',
      detect: /\b(legislative|executive|judicial|congress|senate|house of representatives|president\w*|veto|cabinet|supreme court|federal court\w*|bill becomes|how a bill|committee\w*|amendment process|ratif\w*|electoral college|election\w*|primary|caucus|campaign\w*|voter|census|apportion\w*|impeach\w*|judicial review|appellate|jurisdiction|trial court|circuit court|district court|domestic policy|foreign policy|treaty|treaties|ambassador\w*|united nations|NATO|international organization\w*|concurrent powers|enumerated|reserved powers|implied powers|elastic clause|necessary and proper|supremacy clause|federal\w*|state government\w*|local government\w*)\b/i,
      skills: [
        'The three branches: their powers and how each checks the others (veto and override, judicial review, confirmation of appointments, impeachment); the structure of Congress and how a bill becomes a law',
        'Federalism: enumerated, reserved and concurrent powers, the supremacy clause and the elastic clause; comparing federal, state and local governments and their leaders',
        'The court system: trial vs appellate courts, state vs federal jurisdiction, how a case reaches the Supreme Court; the amendment process (propose by two-thirds, ratify by three-fourths)',
        'Elections and the Electoral College, primaries and general elections, the census and apportionment; domestic vs foreign policy and the U.S. role in international organizations (the UN, NATO) and treaties',
      ],
      hard: [
        'A scenario tracing a bill through both houses and a veto, asking what happens next (the override vote)',
        'Sorting a power into enumerated, reserved or concurrent when it sounds like it belongs to another level',
        'An Electoral College item where the candidate who wins the popular vote loses, explained by state-by-state totals in a table',
        'A court-system item asking which court would hear an appeal of a state criminal conviction',
      ],
      traps: ['a simple majority overriding a veto', 'the Supreme Court as a trial court', 'the popular vote deciding the presidency', 'amendments ratified by Congress alone'],
      exemplars: [
        `MC_QUESTION: The table shows the results of a presidential election in three states. Based on the table, which conclusion can be drawn about how the president is elected?
\`\`\`graph
kind: table
title: Election results in three states (illustrative)
columns: | Popular vote winner | Margin of victory | Electoral votes awarded
row: State X | Candidate A | 2,000,000 votes | 20 to A
row: State Y | Candidate B | 5,000 votes | 15 to B
row: State Z | Candidate B | 8,000 votes | 12 to B
\`\`\`
A) The candidate with the most total popular votes always becomes president.
B) A candidate can win more electoral votes while receiving fewer total popular votes.
C) Electoral votes are divided among the candidates according to each one's share of the popular vote.
D) Larger states have fewer electoral votes than smaller states.
Correct Answer: B
Explanation: Candidate A wins one state by two million votes but only 20 electoral votes; Candidate B wins two states by about 13,000 votes combined and takes 27 electoral votes. Nearly every state awards all its electoral votes to the state's popular-vote winner, so choice C is wrong.`,
        `MC_QUESTION: Congress passes a bill, and the president vetoes it. Which action can Congress take to make the bill a law?
A) Pass the bill again with a two-thirds vote in both the House and the Senate
B) Pass the bill again with a simple majority in both houses
C) Ask the Supreme Court to declare the veto unconstitutional
D) Send the bill to the states for ratification by three-fourths of them
Correct Answer: A
Explanation: Congress can override a veto with a two-thirds vote in each house, a check on the executive branch. Three-fourths of the states ratify constitutional amendments, not bills.`,
      ],
    },
    {
      id: 'florida-government',
      name: 'Organization and function of government (SS.7.C.3, SS.7.C.4; state and local)',
      share: 'about 20% of the test',
      detect: /\b(florida\w*|state constitution\w*|governor|state legislature|legislature|county|counties|cit(?:y|ies)|municipal\w*|mayor|city council|school board|commission\w*|ordinance\w*|budget\w*|tax\w*|revenue|spending|appropriation\w*|executive agenc\w*|department of|bureaucrac\w*|compar\w* (?:the )?constitution\w*|state court\w*|local government\w*|public services?)\b/i,
      skills: [
        'The structure of Florida\'s government: its constitution (how it compares with the U.S. Constitution, how it is amended by citizen initiative), the governor and cabinet, the Legislature, and the state court system',
        'Local governments (counties, cities, school boards): what each does, ordinances vs state laws, and how citizens take part',
        'Budgets and taxes at each level: where revenue comes from (income, sales, property taxes) and what it pays for; how spending decisions are made',
        'Executive agencies and departments that carry out laws, and how citizens can affect government at every level (contacting representatives, public meetings, voting, running for office)',
      ],
      hard: [
        'Deciding which level of government handles an issue (zoning, driver licenses, the military) from a scenario',
        'Comparing the Florida and U.S. constitutions (both have a bill of rights and three branches; Florida\'s can be amended by citizen initiative)',
        'A budget table item asking which revenue source matters most to a city vs the federal government',
      ],
      traps: ['property taxes credited to the federal government', 'the governor appointing the Legislature', 'city ordinances overriding state law', 'the U.S. Constitution amended by citizen initiative'],
      exemplars: [
        `MC_QUESTION: Residents of a Florida neighborhood want a stop sign at a busy intersection near their school. Which level of government would most likely make this decision?
A) The United States Congress
B) The Florida Legislature
C) The city or county commission
D) The Florida Supreme Court
Correct Answer: C
Explanation: Local roads and traffic signs are a local government service, decided by a city or county commission. The Legislature and Congress handle statewide and national laws, and courts do not place signs.`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real spread across achievement levels, minus the Level 1-2 items (a term matched to its definition). At most 1 item in 8 that easy, never first in a section; about half at Level 3 (one benchmark fact applied to a passage or scenario) and at least a third at Level 4-5 (a passage that must be read for its principle first, two similar cases or amendments to tell apart, a chart to interpret, a process traced one step further).`,
    hard: `DIFFICULTY ON THIS TEST: Level 4-5 items. At least 4 of every 5 items must be ones a Level 3 student would miss: a grievance matched to the constitutional fix, Tinker vs Hazelwood, obligation vs responsibility with tempting wrong options, enumerated vs reserved vs concurrent powers, an Electoral College table, which level of government handles a scenario. Hard never means content outside the Civics benchmarks.`,
    easier: `DIFFICULTY ON THIS TEST: the Level 2-3 items most students get right: one benchmark fact, a short plain stimulus, options that differ clearly. Still real test items in the test's voice, written for a 7th grader.`,
  },
}
