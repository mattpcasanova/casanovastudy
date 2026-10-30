// The Cambridge International AS & A Level Global Perspectives & Research
// qualification (9239; AICE Global Perspectives in Florida) as a reference for
// the guide prompts. AS: Paper 1 written exam (deconstruct two documents on a
// global issue), Paper 2 essay (1,750-2,000 words), Paper 3 team project
// (presentation and reflective paper). A Level: Paper 4 Cambridge Research
// Report (5,000 words). The Critical Path (deconstruct, reconstruct, reflect,
// communicate) runs through all of it. No multiple-choice paper, so no pace.
// "AICE GP" is left out of detection because it also means General Paper.

import type { ExamProfile } from './types'
import { AICE_DIFFICULTY, AICE_ITEM_RULES } from './aice'

const EXAM = /\b(?:AICE|Cambridge|(?:AS|A)[- ]?Level)\s+Global\s+Perspectives\b|\bGlobal\s+Perspectives\b|\bGPR\b/i

export const AICE_GLOBAL_PERSPECTIVES: ExamProfile = {
  id: 'aice-global-perspectives',
  name: 'the Cambridge AS & A Level Global Perspectives & Research exam (AICE Global Perspectives, 9239)',
  detect: {
    exam: EXAM,
    subjectHints: /./,
    subjects: ['other', 'english', 'history', 'social-studies', 'social studies'],
    explicit: EXAM,
  },
  itemRules: AICE_ITEM_RULES('the Cambridge AS & A Level Global Perspectives & Research exam', {
    mcq: false,
    structured: 'Paper 1 (written exam, 1 hour 30) sets two documents on one global issue and asks structured questions worth 2 to 12 marks that end with a comparison or an evaluation; Papers 2, 3 and 4 are coursework (essay, team project, research report) assessed on the same assessment objectives, so items on them ask for one piece of that work.',
    extra: [
      `- Paper 1 items are SA_QUESTION on one or two model-written documents of 150-300 words each in a \`\`\`passage fence (an opinion article, a report summary, a speech, a blog, attributed generically: "Document 1: an article by a journalist in a national newspaper, 2022"; "Document 2: a post on the website of an environmental organisation"; never a real author's text, never invented statistics presented as real: any figure is labelled illustrative or kept general). Questions use the paper's forms: "Identify the main conclusion of Document 1. [2]", "Identify one reason the author gives to support this conclusion and explain how it supports it. [4]", "Explain one assumption the author makes. [3]", "Assess the strengths and weaknesses of the reasoning in Document 1. [12]", "Compare the perspectives in Documents 1 and 2. Which do you find more convincing and why? [10]", "Suggest one further piece of evidence that would strengthen the argument. [2]". The Sample Answer is the mark scheme: for the low-tariff parts, the exact point that scores and the near miss that does not (a reason given as the conclusion; a restatement); for the 10- and 12-mark parts, the AO2 (analysis and evaluation of arguments, perspectives and evidence) level descriptors (Level 4: a sustained, balanced evaluation of reasoning, evidence and assumptions with a supported judgement; Level 2: some evaluation, mostly description; Level 1: paraphrase) and a model plan of the points.`,
      `- Evaluation uses the course's vocabulary: conclusion, reason, evidence, assumption, counter-argument, perspective (the position and the values behind it), implication, credibility criteria (expertise, vested interest, ability to see, reputation, corroboration, neutrality), reliability and validity of evidence, bias, generalisation, correlation versus causation, appeal to emotion, straw man, slippery slope, false dichotomy, the weighing of local, national and global perspectives.`,
      `- Essay (Paper 2) items ask for one piece of the essay: a research question on a global issue that has more than one perspective, is answerable and is not a yes/no ("To what extent should richer countries fund climate adaptation in poorer ones?" rather than "Is climate change bad?"); an outline (introduction with the question's significance, two or three perspectives from different places or disciplines, an evaluation of the evidence for each, a judgement); a paragraph evaluating a source's reliability by the criteria; a conclusion that answers the question and reflects on how the candidate's view changed. The Sample Answer gives the AO1 (research: a range of relevant sources selected and referenced), AO2 and AO3 (reflection: on how the research changed the candidate's perspective) descriptors and a model.`,
      `- Team project (Paper 3) items ask for one piece of the project: choosing a local problem connected to a global issue, identifying the perspectives of those affected, proposing a solution and judging it against alternatives, structuring the eight-to-ten-minute individual presentation (problem, perspectives, proposed solution, evaluation, personal view), or writing the reflective paper (what the team did well, what the candidate learned about working with others and about their own perspective). The Sample Answer gives the descriptors for communication (clear structure, audience addressed, sources cited) and reflection (specific, honest, linked to evidence from the process).`,
      `- Research Report (Paper 4) items ask for one piece of the report: refining a question so it is researchable within 5,000 words and contested, choosing a research method (literature review, interviews, surveys, case study, textual analysis) and justifying it, evaluating two sources for a literature review, planning the structure, or a logbook entry that records a decision and its reason. The Sample Answer gives the descriptors (research design and methodology, analysis and evaluation of sources and perspectives, communication, reflection) and a model.`,
      `- Multiple-choice quick checks (at most half the items, four options A-D) ask the student to identify, in a short passage in a \`\`\`passage fence, the main conclusion, an unstated assumption, the weakest step in the reasoning, the perspective being voiced, or the credibility problem with a source. Every option is a sentence a reader might choose; wrong ones are reasons mistaken for conclusions, the opposite perspective, or a flaw the passage does not commit.`,
      `- Themes with balanced perspectives: migration and work, climate change and adaptation, technology and employment, education for all, trade, aid and debt, cultural heritage and tourism, health systems, water and food security, urbanisation, gender equality. Every perspective must be stated fairly in its own terms before it is evaluated.`,
    ],
  }),
  domains: [
    {
      id: 'deconstruction',
      name: 'Deconstruction and critical thinking (Paper 1: reasoning, evidence, assumptions, perspectives, credibility)',
      share: 'Paper 1 is the written exam (a quarter of the AS)',
      detect: /\b(paper 1|deconstruct\w*|reconstruct\w*|critical (?:thinking|path)|argument\w*|reason\w*|conclusion\w*|evidence|assumption\w*|counter[- ]?argument\w*|perspective\w*|credib\w+|bias\w*|vested interest|expertise|corroborat\w+|reliab\w+|validity|flaw\w*|generali[sz]\w+|correlation|causation|straw man|slippery slope|false dichotomy|appeal to emotion|logic\w*|evaluate the (?:argument|reasoning)|document\w*|source\w*)\b/i,
      skills: [
        'Finding the main conclusion of a document (what the author wants the reader to accept) and separating it from the reasons, examples and background',
        'Identifying unstated assumptions (what must be true for the reason to support the conclusion) and testing them',
        'Evaluating evidence: its source, relevance, representativeness, recency, whether correlation is treated as cause, whether the figure is used fairly',
        'Judging credibility by criteria (expertise, vested interest, ability to see, reputation, corroboration, neutrality) and weighing them against each other',
        'Recognising a perspective as a position plus the values and interests behind it, and comparing two perspectives on the same issue fairly',
      ],
      hard: [
        'A document whose conclusion is implied rather than stated, so it must be inferred from the reasons',
        'An assumption hidden in a causal claim ("because tourism grew, incomes rose"), to be stated as a sentence',
        'Two documents that agree on the facts and differ in values, where the comparison must be about perspective, not evidence',
        'Weighing a credible source with a vested interest against a neutral one with no expertise',
      ],
      traps: ['giving a reason as the conclusion', 'calling every opinion "biased"', 'evaluating the issue instead of the argument', 'a strengths-and-weaknesses list with no judgement'],
      exemplars: [
        `SA_QUESTION: Read Document 1. (a) Identify the main conclusion of the document. [2] (b) Identify one reason the author gives to support this conclusion and explain how it supports it. [4] (c) Identify and explain one assumption the author makes. [3]
\`\`\`passage
Document 1: an opinion article by a columnist in a national newspaper, 2022 (model text)

Every summer the old town fills with visitors who photograph the square, buy an ice cream and leave. The council calls this success. It is not. Rents in the centre have risen so far that the bakery, the cobbler and the last greengrocer have gone, replaced by shops selling the same magnets to the same coaches. A place that exists only to be looked at is a museum, and museums do not need residents. If the council wants the town to survive as a town, it should cap the number of short-term holiday lets and spend the tourist tax on housing for the people who actually live here. Otherwise, in ten years, there will be no one left to photograph.
\`\`\`
Sample Answer: (a) 2 marks: the council should cap short-term holiday lets and spend the tourist tax on housing for residents (the policy recommendation is the main conclusion; "the town is becoming a museum" is an intermediate conclusion and earns 1; "tourism is success / not success" earns 0). (b) 4 marks: 1 for a reason (rents in the centre have risen so that local shops have closed and been replaced by souvenir shops; or: a place that exists only to be looked at does not need residents), 1 for linking it to the conclusion (rising rents from holiday letting push out residents and their shops, so limiting lets and funding housing would keep residents), up to 2 for explaining the support with the author's logic (the cap addresses the cause the author names; the housing spending addresses the effect). (c) 3 marks: 1 for identifying an assumption, up to 2 for explaining it, e.g. the author assumes that short-term holiday lets are the main cause of the rent rises (if rents rose for other reasons, such as general housing demand, the cap would not have the claimed effect); or assumes that shops closing means residents leaving; or that the tourist tax is large enough to fund housing. Does not score: "the author assumes tourism is bad" (a restatement of the view, not a hidden step); "the author is biased" without saying what is assumed.`,
        `MC_QUESTION: Which of the following is the weakest step in the reasoning of the passage below?
\`\`\`passage
A post on the website of a campaign group (model text)

Since the new tram line opened, the number of cyclists on the parallel road has fallen by a third, according to our volunteers' counts. The tram has clearly taken people off their bikes. Cities that want more cycling should therefore think twice before building trams.
\`\`\`
A) It relies on volunteers' counts, which may not be accurate.
B) It assumes the tram caused the fall in cycling when other causes (weather, a road closure, a change of route) have not been ruled out.
C) It uses the word "clearly", which is an appeal to emotion.
D) It is written by a campaign group, so it must be wrong.
Correct Answer: B
Explanation: The argument moves from a correlation (tram opened, cycling fell) to a cause ("the tram has clearly taken people off their bikes") and then generalises to all cities; the untested causal step is the weakest link. A is a fair point about evidence but a smaller one; C mislabels a rhetorical intensifier; D judges the source instead of the reasoning, which is itself a flaw.`,
      ],
    },
    {
      id: 'essay',
      name: 'Essay (Paper 2: a research question, perspectives, evaluation of sources, judgement and reflection)',
      share: 'Paper 2 is coursework (a quarter of the AS)',
      detect: /\b(paper 2|essay\w*|research question\w*|question\w* of (?:my|your|the candidate'?s) (?:own )?choice|outline\w*|introduction\w*|conclusion\w*|perspectives? (?:from|on)|evaluat\w+ (?:a |the )?sources?|source reliability|reference\w*|bibliograph\w*|citation\w*|judgement|judgment|reflect\w+|how my view changed|global issue\w*|1,?750|2,?000 words)\b/i,
      skills: [
        'Framing a research question that is global, contested (has at least two perspectives from different places, disciplines or values), focused and answerable in 2,000 words',
        'Researching perspectives from more than one country or culture and from sources of different kinds (academic, governmental, NGO, journalistic), and referencing them',
        'Evaluating each source for credibility and each perspective for the strength of its reasoning and evidence',
        'Reaching a supported judgement and reflecting on how the research changed the candidate\'s own perspective',
      ],
      hard: [
        'Turning a topic ("fast fashion") into a question that is neither yes/no nor unanswerable',
        'Presenting a perspective the candidate disagrees with fairly, in its own best terms, before evaluating it',
        'Evaluating a reputable source that still has a vested interest, with a nuanced verdict',
        'A reflection that names a specific change of view with the evidence that caused it, not "I learned a lot"',
      ],
      traps: ['a descriptive report on the issue with no question answered', 'perspectives that are all from one country', 'source evaluation as "it is a reliable website"', 'a conclusion that sits on the fence'],
      exemplars: [
        `SA_QUESTION: A candidate wants to write their Paper 2 essay on migration. (a) Write a research question that is suitable for the essay and explain in two sentences why it is suitable. [4] (b) Outline the structure of the essay in five to seven bullet points, naming the perspectives you would include and where they would come from. [8]
Sample Answer: (a) 4 marks: 2 for a question that is global, contested and focused, e.g. "To what extent do remittances from migrant workers help the countries they leave?" or "Should wealthy countries recruit nurses from lower-income countries?"; 2 for the explanation: it has perspectives that genuinely disagree (economists on remittance income versus critics of brain drain; receiving-country health services versus source-country ministries), it can be answered with a judgement rather than yes/no, and it can be researched from sources in more than one country within 2,000 words. "Is migration good or bad?" earns 1 at most (too broad, yes/no). (b) 8 marks across AO1-AO3 as planning: introduction stating the question, why it matters globally and the candidate's starting view; perspective 1 (a development economist's view that remittances exceed aid and fund schooling and housing; sources from an international organisation and a university study); perspective 2 (a source-country view that skilled emigration empties hospitals and schools; a health ministry report and a journalist's account from one such country); perspective 3 (a migrant workers' own view, from an NGO's interviews, on separation, risk and choice); evaluation of the sources (expertise, vested interest, how the figures were gathered) and of each perspective's reasoning; a judgement that answers "to what extent" with conditions (helps when ..., harms when ...); reflection on how the candidate's view moved and what evidence moved it. Does not score: an outline that is a list of facts about migration; perspectives that are all from the candidate's own country; "conclusion: both sides have a point".`,
      ],
    },
    {
      id: 'team-project',
      name: 'Team project and presentation (Paper 3: a local problem, perspectives, a proposed solution, the individual presentation, the reflective paper)',
      share: 'Paper 3 is coursework (a quarter of the AS)',
      detect: /\b(paper 3|team\w*|group (?:work|project)|project\w*|presentation\w*|present\w+|slide\w*|local (?:problem|issue)\w*|community|solution\w*|propos\w+|reflective (?:paper|report|essay)|reflection|collaborat\w+|teamwork|audience|speak\w*|8[- ](?:to[- ])?10 minutes)\b/i,
      skills: [
        'Choosing a local problem that connects to a global issue and that the team can research first-hand (interviews, observation, local data)',
        'Identifying the perspectives of the people affected (residents, businesses, officials, young people) and representing them fairly',
        'Proposing a solution, judging it against at least one alternative by criteria (cost, feasibility, who benefits, who bears the cost), and taking a personal position',
        'Structuring an 8-10 minute individual presentation for a live audience, with sources cited, and writing a reflective paper that is specific about the process and the candidate\'s own learning',
      ],
      hard: [
        'A problem where the obvious solution serves one group and harms another, so the evaluation must weigh them',
        'Presenting a perspective the candidate finds unsympathetic without caricature',
        'A reflection that admits a wrong turn in the team\'s process and what it taught',
        'Keeping a presentation to time while still evaluating, not only describing',
      ],
      traps: ['a solution with no alternative considered', 'perspectives invented rather than researched', 'a presentation that describes the problem for eight minutes and proposes in one', 'a reflective paper about the topic instead of about the process'],
      exemplars: [
        `SA_QUESTION: A team has chosen the local problem of litter and overflowing bins around a park used by families, dog walkers and teenagers in the evenings. (a) Identify three groups whose perspectives the team should research and state what each is likely to want. [3] (b) The team's proposed solution is more bins and a weekly volunteer clean-up. Evaluate this solution against one alternative, using at least two criteria. [6]
Sample Answer: (a) 3 marks, 1 per group with its likely perspective: families with young children (safety and cleanliness of play areas; willing to support rules); dog walkers (bins for dog waste placed on their routes; resistance to being blamed); teenagers who use the park in the evenings (somewhere to gather without being moved on; likely to resent being singled out; may support bins near where they sit); also credited: the council's parks department (budget and maintenance rounds), nearby residents (noise and smell), local shopkeepers (packaging that ends up as litter). (b) 6 marks (levels): Level 3 (5-6) evaluates both options against named criteria with a supported judgement; Level 2 (3-4) compares with some criteria; Level 1 (1-2) asserts. Model: the proposed solution scores well on feasibility and cost (bins are cheap; volunteers are free) and on fairness (it blames no one), but weakly on sustainability (volunteer turnout usually falls within months; more bins only help if emptied, which depends on the council's rounds) and on cause (it treats the symptom). An alternative, working with the council to move the collection round to after the busy evening period and installing two large bins where teenagers gather, scores better on sustainability and cause (the bins fill in the evening, so the timing of emptying matters more than the number) but worse on feasibility (it depends on a council decision) and raises a fairness question (singling out one group's spot). Judgement: combine them, with the volunteer clean-up as a short-term start and the timing change as the aim, and measure success by bin overflow counts over a month. Does not score: "more bins is a good idea because there will be more bins".`,
      ],
    },
    {
      id: 'research-report',
      name: 'Cambridge Research Report (A Level Paper 4: research question, methodology, literature review, logbook, the 5,000-word report)',
      share: 'Paper 4 is the whole A Level component',
      detect: /\b(paper 4|research report|cambridge research|5,?000 words|dissertation|methodolog\w*|research method\w*|literature review|primary (?:research|data)|secondary (?:research|data)|interview\w*|survey\w*|questionnaire\w*|case stud\w+|textual analysis|sampl\w+|ethic\w*|logbook|log\b|supervisor|outline proposal|refin\w+ (?:the|a|my) question|scope|feasib\w+)\b/i,
      skills: [
        'Refining a question so that it is contested, researchable within 5,000 words, answerable with available sources or data, and genuinely the candidate\'s own',
        'Choosing a methodology and justifying it: a literature review of academic and other sources, or primary research (interviews, surveys, observation) with its sampling, ethics and limits',
        'Evaluating sources for a literature review by their methods, evidence and perspective, and placing them in conversation with each other',
        'Keeping a logbook that records decisions, dead ends and changes of direction with reasons; structuring the report; reflecting on the research process and its limits',
      ],
      hard: [
        'A question that is interesting but not researchable (no sources, or a prediction), and how to narrow it without losing the interest',
        'Justifying a small-sample interview study over a survey, with its limits stated honestly',
        'Two sources that reach opposite conclusions from similar data, and what the difference in method explains',
        'A logbook entry that records a change of question and the evidence that forced it',
      ],
      traps: ['a question answerable with a yes', 'a methodology section that describes methods in general instead of the one chosen', 'a literature review that summarises sources one after another with no synthesis', 'a reflection that lists the stages instead of evaluating them'],
      exemplars: [
        `SA_QUESTION: A candidate proposes the research question "How has social media affected teenagers?" for their Cambridge Research Report. (a) Explain two reasons why this question needs refining. [4] (b) Write a refined version of the question and justify one research method for answering it, including one limitation of that method. [6]
Sample Answer: (a) 4 marks, 2 per reason explained: it is too broad (every effect on every teenager everywhere cannot be researched in 5,000 words, so the answer would be a list of generalities); it is not clearly contested (nobody argues social media has had no effect; a report needs perspectives that disagree); also credited: "affected" is undefined (mental health, politics, friendship, study habits), and "teenagers" is a global population with very different access. (b) 6 marks: 2 for a refined question that is focused and contested, e.g. "To what extent does the use of image-based social media explain the rise in reported anxiety among 15-18 year olds in high-income countries since 2010?"; 2 for a justified method, e.g. a literature review of published studies (large samples and longitudinal designs the candidate could not replicate; the question is about an existing body of contested research, so the task is to weigh it), or a small primary survey of students at the candidate's school triangulated with published research (adds a local perspective the literature lacks); 2 for a limitation stated honestly: a literature review depends on the quality and selection of the studies and risks confirmation bias in what is chosen; a school survey has a small, non-representative sample, relies on self-report, and raises ethical requirements (consent, anonymity, no questions that could distress) that the candidate must plan for. Does not score: "I will use the internet"; "interviews because they are detailed" with no link to the question.`,
      ],
    },
  ],
  difficulty: AICE_DIFFICULTY,
}
