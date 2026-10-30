// The AP Psychology exam (redesigned for 2024-25) as a reference for the guide
// prompts: Section I multiple choice (four options, mostly scenarios and
// described studies) and Section II's two free-response questions, the
// Article Analysis Question (AAQ) and the Evidence-Based Question (EBQ).
// Units 1-5 grouped into four domains.

import type { ExamProfile } from './types'

export const AP_PSYCHOLOGY: ExamProfile = {
  id: 'ap-psychology',
  pace: 72,
  name: 'the AP Psychology exam',
  detect: {
    exam: /\bAP\s+Psych(?:ology)?\b/i,
    subjectHints: /./,
    subjects: ['science', 'health', 'history', 'social-studies', 'social studies'],
    explicit: /\bAP\s+Psych(?:ology)?\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly four options A-D, as on Section I of the redesigned AP Psychology exam. No true/false, no "I, II and III" lists. Most items are scenarios: two or three sentences about a named but ordinary person ("Marisol studies for her exam only when her roommate reminds her ...") followed by "Which of the following concepts best explains ...", "Which psychological perspective is the researcher using?", "Which of the following is the most likely explanation for ...", "Which research method did the psychologist use?". Some items sit on a described study in a \`\`\`passage fence (participants, procedure, measure, result) or on a kind: table figure of results, and ask about the method, the variable, the statistic or the conclusion that is supported. Items that share a study each repeat it, so every item stands alone.
- Options are four course terms or four short claims at the same level of detail; the wrong ones are real concepts that a student would confuse with the right one (negative reinforcement vs punishment, retroactive vs proactive interference, fundamental attribution error vs self-serving bias, reliability vs validity). Never a joke option, never "all of the above".
- Free-response items are SA_QUESTION, one per part, in the exam's two forms. Article Analysis Question parts come after a described study in a passage fence: "Identify the research method used in the study.", "State the operational definition of [the dependent variable].", "Describe the meaning of the [mean / correlation / effect size] reported.", "Identify at least one ethical guideline applied by the researchers.", "Explain the extent to which the research findings may or may not be generalizable, using specific and relevant evidence from the study.", "Explain how at least one of the research findings supports or refutes [a claim]." Evidence-Based Question parts: "Propose a specific and defensible claim based in psychological science that responds to the question ...", "Support your claim using at least one piece of specific and relevant evidence from one of the sources.", "Explain how the evidence supports your claim using a psychological perspective, theory, concept or research finding." The Sample Answer is the scoring guideline: the statement that earns each point and a note on what is too vague ("'the study was ethical' earns nothing; naming informed consent and where the study obtained it does").
- Studies you describe are generic and plausible, with round numbers; never attribute them to a real named psychologist or journal, and never invent a statistic for a real study. Course-named theories and classic findings (Piaget's stages, Pavlov's conditioning, Milgram's obedience results in general terms) may be named as content.
- Before writing an item's answer, check that exactly one option fits the scenario and that each other option is a different, nameable concept. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the cue in the scenario that points to the concept, and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'biological-bases',
      name: 'Unit 1: Biological Bases of Behavior',
      share: 'about 15-25% of the test',
      detect: /\b(unit 1\b|neuron\w*|neurotransmitter\w*|dopamine|serotonin|acetylcholine|GABA|glutamate|endorphin\w*|synap\w+|action potential|myelin|brain|cortex|hippocampus|amygdala|hypothalamus|cerebellum|brainstem|medulla|thalamus|corpus callosum|hemisphere\w*|lesion\w*|fMRI|EEG|nervous system|sympathetic|parasympathetic|endocrine|hormone\w*|adrenaline|cortisol|heredity|twin stud\w+|genetic\w*|evolutionary|sleep|circadian|REM|insomnia|narcolepsy|sleep apnea|dream\w*|consciousness|psychoactive|drug\w*|tolerance|withdrawal|sensation|perception|absolute threshold|difference threshold|weber|signal detection|retina|rods|cones|cochlea|vestibular|gestalt|depth cue\w*|binocular|monocular|perceptual constancy|bottom[- ]up|top[- ]down)\b/i,
      skills: [
        'Heredity and environment: twin and adoption studies, evolutionary explanations, nature-nurture interaction',
        'The nervous system and the neuron: structure, action potentials, neurotransmitters and their roles (dopamine, serotonin, acetylcholine, GABA, glutamate, endorphins), agonists and antagonists, the endocrine system',
        'The brain: lobes and structures (hippocampus, amygdala, hypothalamus, cerebellum, brainstem), hemispheric specialization and split-brain findings, plasticity, research tools (EEG, fMRI, lesion studies)',
        'Sleep and consciousness: circadian rhythm, sleep stages and REM, sleep disorders, dream theories, psychoactive drugs (tolerance, withdrawal, categories)',
        'Sensation and perception: thresholds and Weber\'s law, signal detection, vision and hearing systems, other senses, Gestalt principles, depth cues, constancies, bottom-up vs top-down processing',
      ],
      hard: [
        'A symptom pattern matched to the brain structure most likely damaged (a man who forms no new memories but recalls his childhood)',
        'A drug\'s effect reasoned from whether it is an agonist or antagonist of a named neurotransmitter',
        'A perception scenario distinguished between a monocular cue, a binocular cue and a constancy',
        'Reading a described twin study for what a difference between identical and fraternal pairs shows about heritability',
      ],
      traps: ['hippocampus (new memories) and amygdala (fear) swapped', 'sympathetic (arousal) and parasympathetic (calming) confused', 'absolute threshold and difference threshold confused', 'the sensory organ named instead of the brain area doing the perceiving'],
      exemplars: [
        `MC_QUESTION: After a car accident, Devon can carry on a conversation and remember his childhood, but he cannot remember the names of nurses he meets each day in the hospital. Devon most likely has damage to which structure?
A) The hippocampus
B) The cerebellum
C) The amygdala
D) The hypothalamus
Correct Answer: A
Explanation: Forming new explicit memories while old ones stay intact points to the hippocampus; the amygdala (C) is involved in fear and emotional memory, not forming new facts.`,
        `MC_QUESTION: A new medication blocks receptor sites for dopamine so that dopamine released into the synapse cannot bind. The medication is best described as which of the following?
A) A dopamine agonist
B) A dopamine antagonist
C) A reuptake inhibitor
D) A stimulant
Correct Answer: B
Explanation: Blocking receptors so the neurotransmitter cannot act is antagonism; a reuptake inhibitor (C) would increase dopamine's effect by leaving it in the synapse longer.`,
      ],
    },
    {
      id: 'cognition',
      name: 'Unit 2: Cognition',
      share: 'about 15-25% of the test',
      detect: /\b(unit 2\b|memory|encoding|storage|retrieval|working memory|short[- ]term|long[- ]term|sensory memory|iconic|echoic|chunking|mnemonic\w*|rehearsal|elaborative|spacing effect|serial position|primacy|recency|episodic|semantic|procedural|implicit|explicit|flashbulb|forgetting|interference|proactive|retroactive|amnesia|misinformation|false memor\w+|recall|recognition|state[- ]dependent|context[- ]dependent|schema\w*|prototype\w*|concept\w*|heuristic\w*|availability|representativeness|algorithm\w*|framing|anchoring|functional fixedness|mental set|confirmation bias|hindsight|overconfidence|sunk cost|gambler|intelligence|IQ|g factor|Spearman|Gardner|Sternberg|Flynn|standardiz\w+|reliability|validity|stereotype threat|creativity|divergent|convergent|language|phoneme\w*|morpheme\w*|syntax|grammar|babbling|telegraphic|overgeneraliz\w+|metacognition|executive function\w*|attention|selective attention|cocktail party|change blindness|inattentional)\b/i,
      skills: [
        'Perception and attention: selective and divided attention, inattentional and change blindness, Gestalt grouping as a cognitive process',
        'Thinking and problem solving: concepts, prototypes, schemas, algorithms vs heuristics (availability, representativeness), biases (framing, anchoring, confirmation, hindsight, overconfidence, sunk cost, gambler\'s fallacy), mental set and functional fixedness, creativity',
        'Memory: the multi-store and working-memory models, encoding (chunking, mnemonics, spacing, levels of processing), explicit vs implicit and episodic vs semantic vs procedural, serial position, retrieval cues and context/state/mood-dependent memory, forgetting (decay, proactive and retroactive interference, amnesia types), misinformation and constructive memory',
        'Intelligence: theories (g, multiple intelligences, triarchic), test construction (standardization, reliability, validity), the Flynn effect, stereotype threat, bias and fairness in testing, achievement vs aptitude',
      ],
      hard: [
        'A scenario distinguished between proactive and retroactive interference by which memory is disrupted',
        'A judgment error classified as availability vs representativeness by what the person is relying on (ease of recall vs resemblance to a category)',
        'Test results interpreted: high reliability but low validity, or the opposite, from a described pattern',
        'A described study design in cognition read for its operational definition and what statistic would answer the question',
      ],
      traps: ['proactive and retroactive interference swapped (pro = old blocks new)', 'reliability (consistency) and validity (measuring what it claims) confused', 'availability and representativeness heuristics confused', 'recognition and recall confused'],
      exemplars: [
        `MC_QUESTION: After learning Spanish in high school, Priya takes Italian in college and finds that Spanish words keep coming to mind when she tries to produce Italian ones. Her difficulty is best explained by which of the following?
A) Retroactive interference
B) Proactive interference
C) Encoding failure
D) Source amnesia
Correct Answer: B
Explanation: Older learning (Spanish) disrupting newer learning (Italian) is proactive interference; retroactive interference (A) would be new Italian words making it harder to recall Spanish.`,
        `MC_QUESTION: A school gives the same aptitude test to a class twice, two weeks apart, and the two sets of scores are nearly identical. However, the scores do not predict the students' later grades at all. The test is best described as having
A) high validity and low reliability
B) low validity and low reliability
C) high reliability and low validity
D) high content validity and high predictive validity
Correct Answer: C
Explanation: Consistent scores across administrations show test-retest reliability; failing to predict the outcome it claims to measure is low predictive validity.`,
      ],
    },
    {
      id: 'development-learning',
      name: 'Unit 3: Development and Learning',
      share: 'about 15-25% of the test',
      detect: /\b(unit 3\b|development\w*|lifespan|prenatal|teratogen\w*|infan\w+|reflex\w*|motor development|attachment|secure|insecure|strange situation|Ainsworth|Harlow|Bowlby|parenting style\w*|authoritative|authoritarian|permissive|Piaget|sensorimotor|preoperational|concrete operational|formal operational|object permanence|conservation|egocentri\w+|theory of mind|Vygotsky|scaffolding|zone of proximal|Erikson|identity|psychosocial|adolescen\w+|puberty|adulthood|aging|dementia|Kohlberg|moral development|gender|sex|temperament|critical period|sensitive period|language acquisition|classical conditioning|Pavlov|unconditioned|conditioned stimulus|conditioned response|acquisition|extinction|spontaneous recovery|generalization|discrimination|taste aversion|operant|Skinner|reinforce\w*|punish\w*|shaping|schedule\w*|fixed[- ]ratio|variable[- ]ratio|fixed[- ]interval|variable[- ]interval|primary reinforcer|secondary reinforcer|token economy|learned helplessness|observational learning|Bandura|modeling|vicarious|latent learning|cognitive map|insight learning|Tolman|habituation)\b/i,
      skills: [
        'Themes and methods in development: cross-sectional vs longitudinal designs, stability and change, nature and nurture, continuous vs discontinuous development',
        'Physical development: prenatal influences and teratogens, infant reflexes and motor milestones, puberty, adulthood and aging',
        'Social-emotional development: attachment styles (Ainsworth\'s strange situation, Harlow\'s findings), parenting styles, temperament, Erikson\'s psychosocial stages, adolescence and identity, adverse childhood experiences',
        'Cognitive development: Piaget\'s stages and their signature tasks (object permanence, conservation, egocentrism, abstract reasoning), Vygotsky\'s zone of proximal development and scaffolding, theory of mind, language acquisition stages',
        'Classical conditioning: UCS/UCR/CS/CR identified in a scenario, acquisition, extinction, spontaneous recovery, generalization and discrimination, taste aversion and biological preparedness',
        'Operant conditioning: positive and negative reinforcement, positive and negative punishment, primary and secondary reinforcers, shaping, the four schedules and their response patterns, learned helplessness',
        'Social and cognitive learning: observational learning and vicarious reinforcement, latent learning and cognitive maps, insight',
      ],
      hard: [
        'A classical conditioning scenario where the CS and UCS must be identified from a description that lists them out of order',
        'A reward or penalty classified as one of the four operant consequences from what was added or removed and whether the behavior rose or fell',
        'A schedule of reinforcement identified from a described response pattern (a steady high rate with no pause after reward)',
        'A child\'s answer on a task matched to a Piagetian stage, or a described study design in development classified as longitudinal or cross-sectional and its weakness named',
      ],
      traps: ['negative reinforcement read as punishment (it increases behavior by removing something)', 'variable-ratio and variable-interval confused (ratio = count of responses)', 'the conditioned and unconditioned stimulus swapped', 'authoritative and authoritarian parenting swapped', 'preoperational and concrete operational stages confused on conservation'],
      exemplars: [
        `MC_QUESTION: Every time Luis buckles his seat belt, the car's warning chime stops. Luis now buckles his seat belt as soon as he sits down. The change in his behavior is best explained by
A) positive reinforcement
B) negative reinforcement
C) positive punishment
D) negative punishment
Correct Answer: B
Explanation: A behavior increases because an unpleasant stimulus (the chime) is removed: negative reinforcement. Punishment (C, D) would make buckling less likely, not more.`,
        `MC_QUESTION: A researcher shows a four-year-old two identical glasses of juice, then pours one into a tall, thin glass. The child says the tall glass now has more juice. According to Piaget, the child's answer shows a lack of
A) object permanence
B) conservation
C) theory of mind
D) abstract reasoning
Correct Answer: B
Explanation: Believing quantity changes when the shape of the container changes is a failure of conservation, typical of the preoperational stage; object permanence (A) is mastered in the sensorimotor stage.`,
      ],
    },
    {
      id: 'social-personality-health',
      name: 'Units 4-5: Social Psychology and Personality; Mental and Physical Health',
      share: 'about 35-50% of the test',
      detect: /\b(unit [45]\b|social psych\w*|attribution\w*|fundamental attribution|actor[- ]observer|self[- ]serving|just[- ]world|attitude\w*|cognitive dissonance|persuasion|central route|peripheral route|foot[- ]in[- ]the[- ]door|door[- ]in[- ]the[- ]face|conformity|Asch|obedience|Milgram|normative|informational|groupthink|group polarization|social loafing|social facilitation|deindividuation|bystander|diffusion of responsibility|prejudice|stereotype\w*|discrimination|in[- ]group|out[- ]group|scapegoat|implicit|altruism|reciprocity|aggression|frustration[- ]aggression|personality|psychodynamic|Freud|id|ego|superego|defense mechanism\w*|projection|repression|humanistic|Rogers|Maslow|self[- ]actualiz\w+|unconditional positive regard|trait\w*|Big Five|OCEAN|openness|conscientiousness|extraversion|agreeableness|neuroticism|social[- ]cognitive|reciprocal determinism|self[- ]efficacy|locus of control|Bandura|projective|Rorschach|TAT|MMPI|motivation|drive[- ]reduction|arousal|Yerkes|incentive|intrinsic|extrinsic|hierarchy of needs|hunger|emotion\w*|James[- ]Lange|Cannon[- ]Bard|Schachter|two[- ]factor|facial feedback|display rules|stress\w*|general adaptation|fight[- ]or[- ]flight|tend[- ]and[- ]befriend|coping|problem[- ]focused|emotion[- ]focused|resilience|positive psycholog\w*|well[- ]being|gratitude|disorder\w*|DSM|abnormal|diathesis[- ]stress|anxiety|phobia\w*|panic|OCD|obsessive|PTSD|trauma|depress\w+|bipolar|schizophreni\w+|delusion\w*|hallucination\w*|dissociative|personality disorder\w*|eating disorder\w*|anorexia|bulimia|ADHD|autism|neurodevelopmental|therap\w+|psychotherapy|cognitive[- ]behavioral|CBT|exposure|systematic desensitization|aversion therapy|psychoanalysis|free association|client[- ]centered|group therapy|biomedical|SSRI|antipsychotic|lithium|ECT|deinstitutionalization|evidence[- ]based|therapeutic alliance)\b/i,
      skills: [
        'Attribution and social cognition: dispositional vs situational attributions, fundamental attribution error, actor-observer and self-serving biases, just-world belief, attitudes and cognitive dissonance, persuasion routes and compliance techniques',
        'Social influence: conformity (Asch; normative vs informational), obedience (Milgram, in general terms), group effects (social facilitation, social loafing, deindividuation, group polarization, groupthink), bystander effect and diffusion of responsibility',
        'Prejudice and group relations: stereotypes, in-group bias, scapegoating, implicit attitudes, contact and superordinate goals; aggression and altruism',
        'Personality: psychodynamic (structure, defense mechanisms, projective tests), humanistic (Rogers, Maslow), trait theory (the Big Five), social-cognitive (reciprocal determinism, self-efficacy, locus of control), how personality is measured and the limits of each approach',
        'Motivation and emotion: drive reduction, arousal and the Yerkes-Dodson relationship, incentives, intrinsic vs extrinsic motivation, hunger, theories of emotion (James-Lange, Cannon-Bard, Schachter-Singer two-factor), facial feedback, display rules',
        'Health: stress and the general adaptation syndrome, stressors and appraisal, coping styles, positive psychology (well-being, gratitude, resilience)',
        'Psychological disorders: the DSM and the diathesis-stress model, defining features of anxiety, obsessive-compulsive, trauma, depressive, bipolar, schizophrenia spectrum, dissociative, personality, feeding and eating, and neurodevelopmental disorders',
        'Treatment: psychodynamic, humanistic, cognitive and behavioral therapies (CBT, exposure, systematic desensitization, aversion therapy), group therapy, biomedical treatments (SSRIs, antipsychotics, lithium, ECT), evidence-based practice and the therapeutic alliance',
      ],
      hard: [
        'A judgment about another person classified as fundamental attribution error vs self-serving bias from whose behavior is explained and how',
        'A symptom description that must be sorted between two disorders with overlapping features (panic disorder vs specific phobia, bipolar vs major depressive)',
        'A therapy technique matched to the approach it comes from and the disorder it is evidence-based for',
        'A scenario on emotion where the order of body response and feeling decides between James-Lange, Cannon-Bard and two-factor theory',
      ],
      traps: ['fundamental attribution error (others\' behavior) and self-serving bias (own outcomes) confused', 'normative and informational social influence swapped', 'negative symptoms of schizophrenia read as depression', 'exposure therapy credited to the psychodynamic approach', 'an increase in arousal with a wrong-source label (two-factor) confused with James-Lange'],
      exemplars: [
        `MC_QUESTION: Keisha watches a driver cut across two lanes without signaling and decides the driver is a careless, selfish person. When Keisha later does the same thing, she explains that she was late for an important appointment. Keisha's two explanations best illustrate
A) the self-serving bias
B) the actor-observer bias
C) cognitive dissonance
D) the just-world phenomenon
Correct Answer: B
Explanation: Explaining another person's act by their disposition and one's own identical act by the situation is the actor-observer bias; the self-serving bias (A) concerns taking credit for successes and blaming failures on circumstances.`,
        `SA_QUESTION: Researchers wanted to know whether a brief gratitude exercise affects well-being. State the operational definition of the dependent variable, and explain the extent to which the findings may or may not be generalizable, using specific and relevant evidence from the study.
\`\`\`passage
Summary of the study

Participants were 120 first-year students at one university who volunteered through a psychology course for extra credit. They were randomly assigned to write for five minutes each night about either three things they were grateful for or three things that happened that day, for two weeks. Well-being was measured as the score on a 20-item life-satisfaction questionnaire (range 20 to 100) completed before and after the two weeks. The gratitude group's mean score rose from 61 to 68; the comparison group's mean rose from 62 to 63. Participants gave informed consent and were debriefed.
\`\`\`
Sample Answer: Operational definition (1 point): well-being was defined as the participant's score on the 20-item life-satisfaction questionnaire, scored 20 to 100 ("well-being" or "how happy they were" earns nothing). Generalizability (1 point): the findings may not generalize because the sample was first-year students at a single university who volunteered for extra credit, so the results may not hold for other ages, non-students or people who did not choose to take part; the random assignment supports a causal claim within the sample but does not make the sample representative. A response must point to a specific feature of the sample or procedure, not just say "the sample was small".`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the definition items. At most 1 item in 8 that just asks what a term means, never first in a section; about half typical (one scenario, one concept) and at least a third of the kind under WHAT HARD LOOKS LIKE. Free-response parts must need the specific element that scores (an operational definition in measurable terms, a named ethical guideline tied to the study), not a term.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 4 from a 5. At least 4 of every 5 items must be ones a student headed for a 3 would miss: scenarios where two course concepts fit at first glance and one detail decides, described studies read for a flaw in design or an unsupported causal conclusion, statistics interpreted (what a correlation of -0.6 or an effect size says and does not say), therapies matched to disorders by evidence, and AAQ parts where a vague answer loses the point. Hard never means trivia outside the course framework.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one concept each, with the cue stated plainly in the scenario. Still real exam items in the exam's voice.`,
  },
}
