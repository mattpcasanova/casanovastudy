// The Cambridge International AS Level English General Paper (8021; AICE
// General Paper in Florida) as a reference for the guide prompts. Paper 1 is
// one essay (600-700 words) chosen from ten questions in three topic sections;
// Paper 2 is comprehension of two or three texts with short answers and a
// 150-200 word extended response. No multiple-choice paper, so no pace.

import type { ExamProfile } from './types'
import { AICE_DIFFICULTY, AICE_ITEM_RULES } from './aice'

const EXAM = /\b(?:AICE|Cambridge)\s+(?:English\s+)?(?:General\s+Paper|GP)\b|\bGeneral\s+Paper\b/i

export const AICE_GENERAL_PAPER: ExamProfile = {
  id: 'aice-general-paper',
  name: 'the Cambridge AS Level English General Paper (AICE General Paper, 8021)',
  detect: {
    exam: EXAM,
    subjectHints: /./,
    subjects: ['english'],
    explicit: EXAM,
  },
  itemRules: AICE_ITEM_RULES('the English General Paper', {
    mcq: false,
    structured: 'Paper 1 is one essay of 600-700 words from a choice of ten questions in three sections (economic, historical, moral, political and social topics; science, the environment, technology and mathematics; literature, language, the arts and the media); Paper 2 is comprehension of two or three texts with short answers (1-4 marks) and a 150-200 word extended response (10 marks).',
    extra: [
      `- Essay-skill items are SA_QUESTION asking for one piece of a Paper 1 essay on a General Paper question written in the paper's voice ("To what extent should governments fund the arts?", "'Technology has made us less able to think for ourselves.' Discuss.", "Is it ever justifiable to limit freedom of speech?"): write the introduction with a clear thesis that addresses every part of the question; write one developed paragraph with a specific example and a link back to the thesis; plan three arguments and a counterargument with how it will be answered; write a conclusion that weighs rather than repeats. The Sample Answer gives the marks across AO1 (selection and application of information: relevant, specific, balanced examples), AO2 (analysis and evaluation: a line of reasoning, counterargument handled, a judgement) and AO3 (communication: structure, paragraphing, register, accuracy), what a Level 4-5 response does, and a model piece of 80-150 words.`,
      `- Comprehension items are SA_QUESTION on a model-written passage of 150-350 words in a \`\`\`passage fence (an opinion piece, a report, a letter, attributed generically: "from an article in a national newspaper, 2021"), in Paper 2's forms: "Identify the writer's main argument. [1]", "Explain, in your own words, what the writer means by [[the bracketed phrase]]. [2]", "Give two reasons the writer offers for ... [2]", "How far do you agree with the writer's view that ...? Support your answer with evidence from the text. [4]", and the extended response: "Using the material in both texts, write a letter / a speech / a response of 150-200 words in which you ... [10]". The Sample Answer is the mark scheme: the points that score, the "own words" requirement (lifting from the text earns nothing), and for the extended response the level descriptors and a model.`,
      `- Multiple-choice quick checks (at most half the items, four options A-D) ask the student to identify a claim, an assumption, an example used as evidence, the writer's tone, or the best paraphrase of a sentence in a short passage. Every option is a sentence a careful reader might choose; the wrong ones misread scope, tone or the writer's position.`,
      `- Topics must be handled with balanced, specific examples from more than one country or context, as the mark scheme rewards ("the arts" with a named kind of funding model, not "some countries do this"), without invented statistics; where a figure is useful, say "illustrative" or keep it general.`,
    ],
  }),
  domains: [
    {
      id: 'essay-structure',
      name: 'Essay planning and structure (Paper 1: thesis, paragraphs, examples, counterargument, conclusion)',
      share: 'Paper 1 is half the qualification',
      detect: /\b(essay\w*|paper 1|thesis|introduction\w*|conclusion\w*|paragraph\w*|argument\w*|counter[- ]?argument\w*|plan\w*|structure|AO[123]|to what extent|discuss|assess|evaluate|how far)\b/i,
      skills: [
        'Reading the question for every part it contains (a quotation plus "discuss", "to what extent", "how far do you agree") and answering all of them',
        'A thesis that takes a position and signals the line of reasoning, then topic sentences that each advance it',
        'Specific, relevant examples from more than one context, explained and linked back to the question (AO1), rather than listed',
        'A counterargument stated fairly and answered, and a conclusion that weighs and judges rather than repeats (AO2)',
        'Register, paragraphing, cohesion and accuracy under the 600-700 word limit (AO3)',
      ],
      hard: [
        'A question whose quotation hides two claims, both of which must be addressed',
        'Turning a general example ("social media causes anxiety") into a specific, explained one',
        'A counterargument that is genuinely strong, answered without dismissing it',
        'Conclusions that qualify the thesis ("justified when ..., not when ...") instead of restating it',
      ],
      traps: ['answering a nearby question instead of the one set', 'a "balanced" essay with no judgement', 'examples asserted without explanation', 'the introduction that announces the topic but takes no position'],
      exemplars: [
        `SA_QUESTION: Write the introduction (60-90 words) for a Paper 1 essay answering this question: "To what extent should governments fund the arts?" Your introduction must take a position and show how your argument will proceed.
Sample Answer: Mark scheme: AO2 credit for a clear, qualified position that answers "to what extent" (not just "yes" or "no"); AO1 credit for defining the scope ("the arts" as theatres, museums, music education, public broadcasting); AO3 credit for a controlled register and a sentence that signals the line of reasoning. A Level 5 introduction does all three in under 90 words; an introduction that only announces "this essay will discuss both sides" earns Level 1-2. Model: "Public money for the arts is often attacked as a subsidy for the tastes of the few. Yet the arts are not only galleries and opera houses but school music lessons, local libraries and the broadcasting that shapes a shared culture. Governments should fund the arts substantially where the market will not, chiefly in access and education, while leaving commercial entertainment to pay its own way. The question is less whether to fund than which parts of the arts deserve the public's money."`,
        `SA_QUESTION: Plan one body paragraph for the essay question "'Technology has made us less able to think for ourselves.' Discuss." State the paragraph's claim, the specific example you would use, how you would explain the example, and the sentence that links it back to the question. [AO1 and AO2]
Sample Answer: Mark scheme: 1 mark for a claim that is one step of the argument (e.g. "Search engines and recommendation feeds reduce the need to remember or to choose, which weakens independent judgement"); 1 mark for a specific example (e.g. navigation apps: drivers who follow turn-by-turn directions lose the ability to find a route without one; or students who read summaries generated for them rather than the source); 1 mark for explaining the mechanism (the skill is not practised, so it fades; the app also makes the choice the user would once have made); 1 mark for a link sentence that answers the question's wording ("so in this respect technology has indeed made us less able, though it is the habit of use, not the tool, that does the damage"). A paragraph that lists three examples without explaining any earns at most 2 of the 4; "technology is bad for thinking" with no example earns 1.`,
      ],
    },
    {
      id: 'comprehension',
      name: "Comprehension and the writer's view (Paper 2: argument, inference, tone, implicit meaning)",
      share: 'most of the short-answer marks on Paper 2',
      detect: /\b(comprehension|paper 2|passage\w*|text\w*|writer\w*|author\w*|infer\w*|implicit|tone|attitude|view\w*|opinion\w*|main (?:idea|argument|point)|evidence|claim\w*|assumption\w*)\b/i,
      skills: [
        "Identifying the writer's main argument and the reasons given for it, as distinct from examples and asides",
        'Inferring the writer\'s attitude and tone from word choice, and recognising irony',
        'Explaining a phrase in context "in your own words" without lifting from the text',
        'Judging how far the writer supports a claim, and answering "how far do you agree" with evidence from the text rather than opinion alone',
      ],
      hard: [
        'A writer who concedes a point before rejecting it, so the concession is mistaken for the view',
        'A phrase whose meaning in context differs from its usual sense',
        'Separating the writer\'s claim from a quoted opponent\'s claim inside the passage',
      ],
      traps: ['quoting the text when "own words" was asked', 'reporting the example instead of the point it supports', 'reading a concession as the writer\'s conclusion', 'tone judged from one word rather than the passage'],
      exemplars: [
        `MC_QUESTION: Which of the following best states the writer's main argument in the passage?
\`\`\`passage
From an opinion column in a national newspaper, 2022

Every few years a report announces that young people cannot read maps, do mental arithmetic or write a letter by hand, and every few years the same conclusion is drawn: technology is making us stupid. It is a comforting story, because it blames a tool rather than ourselves. But the skills on these lists were never ends in themselves; they were means to getting somewhere, paying for something, reaching someone. [[When the means change, the old skills fade, as they always have, and new ones take their place that the report-writers have not yet thought to measure.]] The real question is not whether we have lost the ability to fold a map, but whether we are teaching the judgement needed to use the tools we have.
\`\`\`
A) Worries about lost skills miss the point; what matters is teaching judgement in using new tools
B) Technology has made young people unable to read maps or do arithmetic
C) Schools should return to teaching handwriting and mental arithmetic
D) Reports about young people's skills are usually inaccurate
Correct Answer: A
Explanation: The writer dismisses the "technology makes us stupid" story and ends on the real question: teaching judgement. B is the view the writer argues against; C is never proposed; D overstates what is said about the reports (they measure the wrong things, not that they are inaccurate).`,
        `SA_QUESTION: Read the passage in the question above. Explain, in your own words, what the writer means by the sentence in double brackets. [2]
Sample Answer: Mark scheme: 1 mark for the first idea in own words: when the way we do everyday tasks changes (new tools, new methods), the abilities tied to the old way are no longer practised and disappear, which has happened throughout history; 1 mark for the second idea: different abilities grow up around the new tools, but the people who write the reports have not yet decided to test for them, so they go unnoticed. Lifting "the old skills fade" or "new ones take their place" without rephrasing earns nothing for that idea; "technology changes skills" alone is too vague for the second mark.`,
      ],
    },
    {
      id: 'language-summary',
      name: 'Language and summary skills (own words, paraphrase, concision, the extended response)',
      share: 'the own-words and extended-response marks on Paper 2',
      detect: /\b(summar\w+|own words|paraphras\w+|concis\w+|extended response|150|200 words|letter|speech|report|register|audience|purpose|vocabulary|synonym\w*|word choice)\b/i,
      skills: [
        'Paraphrasing a sentence so that meaning survives and no key phrase is lifted',
        'Summarising an argument in a fixed word count, keeping the points and dropping the examples',
        'The extended response: using material from both texts, in the form asked for (letter, speech, article), for the stated audience and purpose, within 150-200 words',
        'Register and cohesion: formal where the task is formal, linked rather than listed',
      ],
      hard: [
        'A summary that must combine two texts\' points without repeating either',
        'Keeping the required form (a speech has an address and a close; a letter has a purpose stated early) while covering the content',
        'Choosing which points to drop when the word limit bites',
      ],
      traps: ['lifting phrases from the text', 'summarising the examples rather than the points', 'ignoring the form or audience set by the task', 'running over the word count'],
      exemplars: [
        `SA_QUESTION: Text 1 argues that towns should ban cars from their centres to cut pollution and make streets safer; Text 2 argues that bans hurt small shops, disabled residents and people who live outside the town. Write the opening paragraph (60-80 words) of a speech to a town council in which you propose a way forward that uses material from both texts. [Part of a 10-mark extended response]
Sample Answer: Mark scheme (levels): Level 3 (8-10 for the whole response) uses specific points from both texts, keeps the form of a speech (addresses the council, states the proposal early), and proposes rather than summarises; Level 2 (5-7) uses both texts but mostly repeats them or slips out of the speech form; Level 1 (1-4) uses one text or summarises without a proposal. Model opening: "Councillors, both sides of this debate are right about something. Cleaner air and safer streets matter, and so do the trader who depends on passing cars and the resident who cannot walk far. I propose that we close the central square to through traffic on weekdays, keep delivery and disabled access open at all hours, and run a frequent shuttle from the edge-of-town car parks, so that the town gains the quiet without losing the people." Credit also goes to a different proposal that draws on both texts; a paragraph that only restates Text 1 earns Level 1.`,
      ],
    },
    {
      id: 'topics',
      name: 'Topic knowledge across the three sections (balanced, specific examples)',
      share: 'what AO1 rewards in every essay',
      detect: /\b(globali[sz]ation|economy|economic|politic\w*|democra\w+|justice|crime|punishment|education|school\w*|universit\w+|environment\w*|climate|energy|science|scientif\w+|technolog\w+|artificial intelligence|\bAI\b|social media|internet|mathematics|medicine|health|art\w*|music|literature|language\w*|media|journalism|film|sport\w*|culture|heritage|tourism|censorship|free speech|human rights|equality|gender|religion|tradition\w*)\b/i,
      skills: [
        'Section 1 themes (economic, historical, moral, political, social): globalisation, inequality, democracy and its discontents, justice and punishment, education, equality, tradition versus change',
        'Section 2 themes (science, environment, technology, mathematics): climate and energy, artificial intelligence and automation, medical ethics, the value of pure science, risk and uncertainty',
        'Section 3 themes (literature, language, the arts, the media): arts funding, censorship and free expression, the role of journalism, minority languages, popular versus high culture, sport',
        'Examples from more than one country or era, explained and judged, without invented figures',
      ],
      hard: [
        'Balancing a question across contexts (a policy that works in a rich democracy and fails elsewhere)',
        'A moral question where both sides have a principle, not just an interest',
        'Using a historical example to illuminate a present question without a history essay taking over',
      ],
      traps: ['one-country essays', 'statistics made up to sound precise', 'examples that illustrate the topic but not the claim', 'treating "the media" or "technology" as one thing'],
      exemplars: [
        `SA_QUESTION: For the essay question "Is it ever justifiable to limit freedom of speech?", give three distinct arguments you would develop and one counterargument, each with the specific example you would use. [AO1 and AO2 planning]
Sample Answer: Mark scheme: 1 mark for each argument stated as a claim with a specific example (up to 3), 1 mark for a counterargument with how it would be answered. Creditable: (1) speech that incites violence can be limited, as most democracies limit incitement and direct threats, because the harm is immediate and the speech adds nothing to debate; (2) false claims in specific settings (advertising, court testimony) are already limited without anyone calling it censorship, which shows the principle is accepted; (3) limits set by governments on criticism of themselves are not justifiable, because the test of a limit is whether it protects people or protects power, with the example of laws against "insulting" officials used to jail journalists. Counterargument: once the state may decide which speech is harmful, the line moves, so the safest rule is no limits; answered by showing that the limits above are narrow, defined in law and tested in courts, unlike the discretion the counterargument fears. "Hate speech is bad" with no example, or three examples that all make the same point, earns at most 2.`,
      ],
    },
  ],
  difficulty: AICE_DIFFICULTY,
}
