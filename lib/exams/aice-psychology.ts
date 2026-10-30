// The Cambridge International AS & A Level Psychology exam (9990; AICE
// Psychology in Florida) as a reference for the guide prompts. No multiple-
// choice paper: Paper 1 asks about the twelve core studies, Paper 2 about
// research methods (with a novel study to analyse and a study to plan),
// Papers 3 and 4 about the A Level specialist options and the issues and
// debates. The core studies are real published studies on the syllabus, so
// their published aims, procedures, results and conclusions are fair game.

import type { ExamProfile } from './types'
import { AICE_DIFFICULTY, AICE_ITEM_RULES } from './aice'

export const AICE_PSYCHOLOGY: ExamProfile = {
  id: 'aice-psychology',
  name: 'the Cambridge AS & A Level Psychology exam (AICE Psychology, 9990)',
  detect: {
    exam: /\b(?:AICE|Cambridge|(?:AS|A)[- ]?Level)\s+Psych(?:ology)?\b|\bPsych(?:ology)?\b.*\b(?:AICE|Cambridge|A[- ]?Level)\b/i,
    subjectHints: /./,
    subjects: ['science', 'health', 'history', 'social-studies', 'social studies'],
    explicit: /\b(?:AICE|Cambridge|(?:AS|A)[- ]?Level)\s+Psych(?:ology)?\b|\bPsych(?:ology)?\b.*\b(?:AICE|Cambridge|A[- ]?Level)\b/i,
  },
  itemRules: AICE_ITEM_RULES('the Cambridge AS & A Level Psychology exam', {
    mcq: false,
    structured: 'Paper 1 parts run 2-4 marks for describe/outline/explain and 10 marks for the evaluation; Paper 2 parts run 1-4 marks with a 10-mark "Plan a study".',
    extra: [
      '- Paper 1 parts name the core study and use its ladder: "Describe the procedure of the study by Andrade (doodling). [4]", "Outline one result from the study by Milgram (obedience). [2]", "Explain one strength and one weakness of the sample used in the study by Baron-Cohen et al. (eyes test). [4]", "Evaluate the study by Piliavin et al. (subway Samaritans), including a discussion of ecological validity. [10]". The twelve core studies are: Dement and Kleitman (sleep and dreams), Hassett et al. (monkey toy preferences), Hölzel et al. (mindfulness and brain structure); Andrade (doodling), Baron-Cohen et al. (eyes test), Pozzulo et al. (line-ups); Bandura et al. (aggression), Fagen et al. (elephant learning), Saavedra and Silverman (button phobia); Milgram (obedience), Perry et al. (personal space), Piliavin et al. (subway Samaritans). Use only their published details (sample, design, materials, measures, results, conclusions); never invent a figure or a quotation and never ask about a study that is not on the list.',
      '- Paper 2 parts are built on a novel study written by you in a \`\`\`passage fence (a psychologist, a question, a sample and how it was found, a design, how the variable was measured, a result): "Identify the independent variable. [1]", "Suggest an appropriate directional (one-tailed) hypothesis. [2]", "Explain one weakness of the sampling technique used. [2]", "Suggest one way the reliability of the measure could be checked. [2]", "Explain one ethical issue and how it could be dealt with. [3]", "Plan a study to investigate ... [10]" (the 10-mark plan is marked on: a named method and design, the sample and sampling technique, how the variables are operationalised and measured, procedure in order, controls, ethics; the Sample Answer gives one complete plan and the level descriptors).',
      '- Evaluation points are specific: a strength or weakness must be named (ecological validity, demand characteristics, generalisability of a volunteer sample, quantitative data), applied to the study ("the stooges fell in a real subway carriage, so passengers behaved as they would") and, for 10 marks, weighed in a conclusion.',
      '- Mark-scheme answers use the course\'s terms: independent and dependent variable, operationalise, standardisation, inter-rater reliability, ecological validity, demand characteristics, individual vs situational explanation, nature vs nurture, reductionism, cultural bias, application to everyday life.',
    ],
  }),
  domains: [
    {
      id: 'biological-cognitive',
      name: 'Biological and cognitive approaches (Dement and Kleitman, Hassett et al., Hölzel et al.; Andrade, Baron-Cohen et al., Pozzulo et al.)',
      share: 'half of Paper 1',
      detect: /\b(biological approach|cognitive approach|dement|kleitman|REM\b|dream\w*|hassett|monkey\w*|toy preference\w*|h[öo]lzel|mindfulness|grey matter|gray matter|MRI|andrade|doodl\w*|baron[- ]cohen|eyes test|theory of mind|autism|pozzulo|line[- ]?up\w*|eyewitness|false positive\w*|children'?s? memory)\b/i,
      skills: [
        'Dement and Kleitman: EEG recording of sleep, waking participants in REM and NREM, dream recall and the estimate of dream length (5 vs 15 minutes), eye-movement direction and dream content; conclusions about REM and dreaming',
        'Hassett et al.: rhesus monkeys and wheeled vs plush toys, frequency and duration of interaction coded from video, sex differences compared with children; the nature side of toy preference',
        'Hölzel et al.: an 8-week mindfulness-based stress reduction course, MRI before and after, grey matter concentration changes (hippocampus, posterior cingulate, cerebellum) compared with a waiting-list control',
        'Andrade: 40 participants listening to a dull telephone message, a doodling (shape-shading) group vs a control, monitoring names and a surprise recall test; doodling improved recall',
        'Baron-Cohen et al.: the revised Reading the Mind in the Eyes test, adults with Asperger syndrome or high-functioning autism vs comparison groups, forced-choice from four words, IQ and the AQ; theory of mind deficits',
        'Pozzulo et al.: children and adults identifying a cartoon character and a human from target-present and target-absent line-ups, correct identifications vs false positives; children\'s false positives explained by social factors',
        'For each study: aim, sample and sampling, design and variables, materials, procedure in order, quantitative and qualitative results, conclusions, and evaluation (validity, reliability, generalisability, ethics, nature vs nurture, individual vs situational)',
      ],
      hard: [
        'Stating a result with its numbers and what it shows, not just "the doodlers remembered more"',
        'Evaluating generalisability when the sample is MRC panel volunteers, rhesus monkeys or adults with Asperger syndrome, and saying what the finding can and cannot be extended to',
        'Explaining a methodological choice (why a waiting-list control, why target-absent line-ups) in terms of what it rules out',
        'Linking a study to a debate (Hassett et al. and nature vs nurture; Pozzulo et al. and individual vs situational) with evidence from the study, not a slogan',
      ],
      traps: [
        'Andrade\'s doodling described as drawing freely (participants shaded printed shapes)',
        'Dement and Kleitman read as showing dreaming happens only in REM (dreams were recalled far less often, not never, in NREM)',
        'Hölzel et al. read as proving mindfulness causes the changes in every brain region (the control comparison only held for some regions)',
        'Pozzulo et al.\'s children said to be worse at everything (they matched adults on target-present line-ups)',
        'results and conclusions swapped in a "describe" answer',
      ],
      exemplars: [
        `SA_QUESTION: Describe the procedure of the study by Andrade (doodling). [4]
Sample Answer: 1 mark each for four of: participants were tested individually after finishing another experiment and were told they would listen to a tape and jot down the names of people coming to a party; the doodling group was given a sheet with printed shapes to shade in while listening, the control group a lined sheet for the names; all heard the same dull 2.5-minute mock telephone message naming eight party-goers (and other names and places) at a slow pace; after the tape the sheets were collected and, in a surprise test, participants recalled the names of party-goers and then the places mentioned (order counterbalanced); the researcher recorded correct names, false alarms and plausible mishearings. Does not score: "they doodled and then did a memory test" with no detail, or results in place of procedure.`,
        `MC_QUESTION: In the study by Dement and Kleitman (sleep and dreams), participants were woken after either 5 or 15 minutes of REM sleep and asked how long they had been dreaming. What did the results show?
A) Participants were accurate for 5-minute periods but overestimated 15-minute periods
B) Participants could usually tell whether it had been 5 or 15 minutes, with most errors being underestimates of the 15-minute periods
C) Participants had no idea how long they had been dreaming
D) Participants always reported 15 minutes, whichever period it was
Correct Answer: B
Explanation: Estimates were correct in most cases (45 of 51 for the 5-minute and 47 of 60 for the 15-minute awakenings), and most errors came from one participant who underestimated the 15-minute periods, so dream time tracked REM time. Choice C is the opposite of the finding.`,
      ],
    },
    {
      id: 'learning-social',
      name: 'Learning and social approaches (Bandura et al., Fagen et al., Saavedra and Silverman; Milgram, Perry et al., Piliavin et al.)',
      share: 'half of Paper 1',
      detect: /\b(learning approach|social approach|bandura|bobo|imitat\w+|aggress\w+|fagen|elephant\w*|secondary positive reinforcement|saavedra|silverman|button phobia|disgust|evaluative learning|milgram|obedien\w+|shock\w*|perry|personal space|oxytocin|CID\b|piliavin|subway|samaritan\w*|bystander\w*|diffusion of responsibility|helping behaviou?r)\b/i,
      skills: [
        'Bandura et al.: 72 children at the Stanford nursery, matched on aggression, watching an aggressive or non-aggressive adult model (same or opposite sex) or no model, mild aggression arousal, 20 minutes of observed play with the Bobo doll; imitation, sex of model and child',
        'Fagen et al.: five Asian elephants in Nepal trained with secondary positive reinforcement (a chime then food) to accept a trunk wash; tasks learnt as behavioural steps, offers and successes recorded',
        'Saavedra and Silverman: a case study of a 9-year-old boy with a button phobia, classical conditioning origin, treatment by positive reinforcement then imagery exposure, disgust and distress ratings before and after',
        'Milgram: 40 men aged 20-50 recruited by newspaper advert, the learner-teacher rigged draw, shocks in 15-volt steps to 450 V, the four prods; 65% obeyed fully, signs of tension; situational explanation of obedience',
        'Perry et al.: oxytocin vs placebo nasal spray, preferred interpersonal distance in a computerised task and a room task, high vs low empathy participants; oxytocin reduced preferred distance for high-empathy participants',
        'Piliavin et al.: a field experiment on the New York subway, a victim who appeared drunk or carried a cane, race of victim, a model helper, 103 trials, time to help and who helped; the cost-reward model and no diffusion of responsibility',
        'For each study: aim, sample, design, procedure, results with figures, conclusions, evaluation, and the debate it informs',
      ],
      hard: [
        'Explaining a result the student did not expect (no diffusion of responsibility in Piliavin et al.; low-empathy participants in Perry et al.) in terms of the study\'s own explanation',
        'A 10-mark evaluation that weighs a named issue (ethics in Milgram, ecological validity in Piliavin et al.) on both sides and reaches a judgement',
        'Separating the three learning studies\' kinds of learning (observational, operant with a secondary reinforcer, classical conditioning and its treatment)',
        'Describing a procedure in the order it happened without sliding into results',
      ],
      traps: [
        'Milgram\'s prods confused with threats or the sample read as students',
        'Piliavin et al. read as supporting diffusion of responsibility (it found the opposite)',
        'Bandura et al.\'s aggression arousal step omitted or read as the independent variable',
        'Fagen et al. described with primary reinforcement only (the chime was the secondary reinforcer)',
        'Saavedra and Silverman generalised as if it were an experiment on many children',
      ],
      exemplars: [
        `MC_QUESTION: In the study by Milgram (obedience), what proportion of the 40 participants continued to the maximum 450-volt shock?
A) 12.5%
B) 35%
C) 65%
D) 100%
Correct Answer: C
Explanation: 26 of 40 participants (65%) gave the maximum shock, although all 40 went to at least 300 volts. Choice B is the proportion who stopped before the end.`,
        `SA_QUESTION: Explain one strength and one weakness of the field experiment method as used in the study by Piliavin et al. (subway Samaritans). [4]
Sample Answer: Strength (1 mark identified, 1 mark applied): high ecological validity, because the victim collapsed in a real moving subway carriage, so the passengers who helped behaved as they would in everyday life and did not know they were being studied. Weakness (1 mark, 1 mark): the researchers could not gain informed consent or debrief the passengers, and could not control extraneous variables such as how crowded the carriage was or who happened to be present on each of the 103 trials, so some differences between trials were not due to the victim's condition. Does not score: "it was realistic" or "it was unethical" with no link to what happened in the subway study.`,
      ],
    },
    {
      id: 'research-methods',
      name: 'Research methods (Paper 2: methods, designs, sampling, variables, reliability and validity, ethics, data, and planning a study)',
      share: 'all of Paper 2 (AS) and the methods marks in every paper',
      detect: /\b(research method\w*|paper 2|experiment\w*|laboratory|field experiment|natural experiment|self[- ]report\w*|questionnaire\w*|interview\w*|case stud\w+|observation\w*|correlation\w*|scatter|independent variable|dependent variable|IV\b|DV\b|operationali[sz]\w+|hypothes[ie]s|null hypothesis|one[- ]tailed|two[- ]tailed|directional|sampl\w+|opportunity|volunteer|random|independent measures|repeated measures|matched pairs|counterbalanc\w+|order effect\w*|demand characteristic\w*|reliab\w+|validity|generali[sz]\w+|ethic\w*|informed consent|deception|debrief\w*|right to withdraw|mean|median|mode|standard deviation|quantitative|qualitative|plan a study)\b/i,
      skills: [
        'Methods: laboratory, field and natural experiments; self-reports (questionnaires and interviews, open and closed questions, rating scales); case studies; observations (naturalistic and controlled, covert and overt, participant and non-participant, structured with behavioural categories, time and event sampling); correlations and scatter graphs',
        'Experimental design: independent measures, repeated measures, matched pairs, with order effects and counterbalancing, participant variables and demand characteristics',
        'Variables and hypotheses: identifying and operationalising the IV and DV, controls and standardisation, directional and non-directional alternative hypotheses, the null hypothesis',
        'Sampling: opportunity, volunteer (self-selected) and random sampling, with a strength and a weakness of each and the effect on generalisability',
        'Reliability (test-retest, inter-rater) and validity (ecological, face, construct) and how to improve each; subjectivity vs objectivity',
        'Ethics: informed consent, deception, right to withdraw, protection from harm, confidentiality, debriefing, and the use of animals',
        'Data: quantitative vs qualitative, measures of central tendency and spread (mean, median, mode, range, standard deviation), tables and graphs',
        'Planning a study (10 marks): method and design, sample, operationalised variables, procedure, controls, ethics, how the data will be analysed',
      ],
      hard: [
        'Writing a directional hypothesis that names both operationalised variables and the direction, in one sentence',
        'Suggesting a way to check reliability that fits the measure in the novel study (inter-rater for an observation, test-retest for a questionnaire)',
        'A 10-mark plan that is replicable: another psychologist could run it from the answer',
        'Evaluating a sampling technique in the context given, not in general ("students from one college at one time of day")',
      ],
      traps: [
        'the hypothesis written as a question or a prediction about one group only',
        'reliability and validity swapped (consistency vs measuring what it claims to)',
        'independent measures said to have order effects',
        'a random sample claimed when the study used volunteers who answered an advert',
        'ethics answered as "it was ethical" with no issue named',
      ],
      exemplars: [
        `SA_QUESTION: Read the study and answer the questions that follow. (a) Identify the independent variable in this study. [1] (b) Suggest an appropriate directional (one-tailed) hypothesis for this study. [2] (c) Explain one weakness of the sampling technique used. [2]
\`\`\`passage
A psychologist investigated whether background music affects reading comprehension. Thirty students who responded to a notice on a college noticeboard took part. Each student was randomly allocated to read a 600-word passage either in silence or with instrumental music playing at a fixed volume, then answered ten comprehension questions. The psychologist recorded the number of correct answers out of ten.
\`\`\`
Sample Answer: (a) 1 mark: whether the passage was read in silence or with instrumental music playing (the reading condition). (b) 2 marks: "Students who read the passage in silence will score more correct answers out of ten on the comprehension questions than students who read it with instrumental music playing" (1 mark for naming both operationalised variables, 1 mark for the direction; a two-tailed "there will be a difference" earns 1 at most). (c) 1 mark identified, 1 mark explained: a volunteer (self-selected) sample from one college noticeboard is likely to be biased towards students who are confident readers or interested in psychology and who were in that building, so the results may not generalise to other students. Does not score: "the sample was too small" with no reason, or "it was an opportunity sample" (they volunteered).`,
        `SA_QUESTION: Plan a study to investigate whether people are more likely to hold a door open for a stranger when the stranger is carrying several bags than when they are carrying nothing. Your plan must include the method and design, the sample, how the variables will be operationalised and measured, the procedure, controls, and ethical considerations. [10]
Sample Answer: A Level 3 plan (8-10 marks) gives a complete, replicable study: a field experiment with an independent measures design in the entrance of a shopping centre; a confederate (same person each time, same clothing) approaches the door 2-3 metres behind a member of the public who is about to go through, in two conditions on alternate trials: carrying three full shopping bags, or carrying nothing; the IV is the confederate's load, the DV is operationalised as whether the door is held (held open until the confederate reaches it, held briefly, or not held), recorded by a second researcher seated nearby using a tally sheet, for 40 trials per condition; controls: same door, same times of day, confederate stays a fixed distance behind, only lone adults are used as participants, trials are not run when a group is passing; ethics: no consent can be gained beforehand, so the behaviour is one that happens in a public place where people expect to be seen, no personal data is recorded, and a small sign at the exit tells passers-by the study took place with a contact for questions; the data are analysed by comparing the percentage of doors held in each condition. Level 2 (4-7 marks): the main features present but a key element (controls, how the DV is measured, ethics) missing or vague. Level 1 (1-3 marks): a method named with little detail. Does not score: a plan nobody else could carry out ("see if people hold doors").`,
      ],
    },
    {
      id: 'a-level-options',
      name: 'A Level specialist options (clinical, consumer, health, organisational psychology) and issues and debates',
      share: 'Papers 3 and 4 (A Level)',
      detect: /\b(paper [34]|specialist option\w*|clinical|abnormal\w*|schizophreni\w+|depress\w+|phobia\w*|OCD|obsessive|anxiety disorder\w*|consumer|retail|advertis\w+|product|health psychology|adherence|pain|stress|substance|organi[sz]ational|work\w* psychology|motivation|leadership|group behaviou?r|issues and debates|nature (?:versus|vs|and) nurture|reductionism|holism|individual (?:versus|vs|and) situational|determinism|free will|idiographic|nomothetic|cultural bias|application to everyday life)\b/i,
      skills: [
        'Clinical psychology: diagnosis and classification (ICD/DSM), schizophrenia, mood disorders, anxiety and fear-related disorders, obsessive-compulsive disorder, impulse control; explanations (biological, cognitive, learning, psychodynamic) and treatments (drugs, CBT, systematic desensitisation) with named syllabus studies',
        'Consumer psychology: the physical environment (store layout, sound, odour), the psychological environment, consumer decision making, product and advertising, with named syllabus studies',
        'Health psychology: the patient-practitioner relationship, adherence to medical advice, pain, stress, health promotion',
        'Organisational psychology: motivation at work, leadership and management, group behaviour, organisational work conditions, satisfaction at work',
        'Issues and debates: nature vs nurture, reductionism vs holism, individual vs situational explanations, determinism vs free will, idiographic vs nomothetic, cultural bias, the use of children and animals, application to everyday life; applied to named studies and treatments',
        'Paper 3 and 4 question forms: describe a theory or study, evaluate it with reference to a named issue, design and evaluate an application ("Design a study to ... Describe your study and justify your choices"), and the 12-mark essay with a supported conclusion',
      ],
      hard: [
        'Evaluating a treatment using two debates at once (a drug treatment as reductionist and deterministic) with evidence',
        'Comparing two explanations of the same disorder and judging which has the stronger evidence base',
        'Designing an applied study that is specific to the option\'s context and justifying each methodological choice',
        'Essays that reach a judgement rather than listing strengths and weaknesses',
      ],
      traps: [
        'a debate named with no application to a study ("it is reductionist" alone)',
        'treatment effectiveness claimed with no outcome measure named',
        'the cognitive approach to depression described without the cognitive triad or the distorted thinking it targets',
        'individual and situational explanations treated as mutually exclusive',
      ],
      exemplars: [
        `SA_QUESTION: Explain how the cognitive approach explains and treats depression. [6]
Sample Answer: Explanation (3 marks): depression is caused and maintained by faulty, negative patterns of thinking (1 mark), such as Beck's negative cognitive triad of automatic negative thoughts about the self, the world and the future (1 mark), and cognitive distortions such as overgeneralisation and selective abstraction that make neutral events seem like failures (1 mark). Treatment (3 marks): cognitive behavioural therapy identifies the client's automatic negative thoughts with a thought diary (1 mark), challenges them by testing the evidence for and against them and by behavioural experiments or activity scheduling (1 mark), and replaces them with more realistic thoughts, which improves mood as the thinking changes (1 mark). Does not score: "they think negatively so they get depressed" with no mechanism, or "therapy" with no cognitive technique named.`,
        `MC_QUESTION: A researcher argues that a drug treatment for schizophrenia "treats the symptoms and not the person, by reducing a complex condition to the level of one neurotransmitter". Which issue or debate is the researcher raising?
A) Nature versus nurture
B) Reductionism versus holism
C) Idiographic versus nomothetic approaches
D) Cultural bias
Correct Answer: B
Explanation: Explaining or treating a disorder at the level of one biochemical is reductionist; the complaint that the whole person is ignored is the holist side. Choice A concerns origins, not the level of explanation.`,
      ],
    },
  ],
  difficulty: AICE_DIFFICULTY,
}
