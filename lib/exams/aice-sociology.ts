// The Cambridge International AS & A Level Sociology exam (9699; AICE
// Sociology in Florida) as a reference for the guide prompts. No multiple-
// choice paper: every paper is a ladder of parts from a 2-mark definition to
// a 26-mark essay marked by levels. Paper 1 (socialisation and research
// methods, with a Source A data item), Paper 2 (the family), Paper 3
// (education), Paper 4 (globalisation, media or religion).

import type { ExamProfile } from './types'
import { AICE_DIFFICULTY, AICE_ITEM_RULES } from './aice'

export const AICE_SOCIOLOGY: ExamProfile = {
  id: 'aice-sociology',
  name: 'the Cambridge AS & A Level Sociology exam (AICE Sociology, 9699)',
  detect: {
    exam: /\b(?:AICE|Cambridge|(?:AS|A)[- ]?Level)\s+Sociology\b|\bSociology\b.*\b(?:AICE|Cambridge|A[- ]?Level)\b/i,
    subjectHints: /./,
    subjects: ['history', 'social-studies', 'social studies', 'other'],
    explicit: /\b(?:AICE|Cambridge|(?:AS|A)[- ]?Level)\s+Sociology\b|\bSociology\b.*\b(?:AICE|Cambridge|A[- ]?Level)\b/i,
  },
  itemRules: AICE_ITEM_RULES('the Cambridge AS & A Level Sociology exam', {
    mcq: false,
    structured: 'Every paper climbs the same ladder: 2, 4, 6 or 8 marks, then a 26-mark essay.',
    extra: [
      '- Parts use the papers\' exact ladder and wording: "Define the term ... [2]" (a clear definition for 2, a partial one for 1), "Describe two ways in which ... [4]" (1 for each way identified, 1 for each described), "Explain two reasons why ... [6]" (1 identified, up to 2 developed, for each), "Explain two strengths and two limitations of ... [8]" (2 marks each), and "Evaluate the view that ... [26]" or "\'...\' Evaluate this view. [26]" or "To what extent ... [26]".',
      '- The 26-mark essay is an SA_QUESTION whose Sample Answer is a plan, not a finished essay: a thesis that takes a position on the view; three arguments for the view, each with the perspective it comes from (functionalist, Marxist, feminist, New Right, interactionist, postmodern) and a named sociologist or study from the syllabus used for their published position; two or three evaluations against the view, also with perspective and evidence; and a conclusion that weighs them and answers "to what extent". Then the level descriptors in the three assessment objectives: knowledge and understanding (accurate and wide-ranging, with concepts and studies), interpretation and application (the material is used to answer this question, not the topic in general), analysis and evaluation (both sides, a sustained judgement). Band 4 (20-26): all three strong; Band 3 (14-19): sound knowledge, some evaluation, a conclusion that is mainly assertion; Band 2 (8-13): descriptive, one-sided; Band 1 (1-7): common sense.',
      '- Sociologists may be cited by name for their published positions (Durkheim, Parsons, Murdock, Marx, Engels, Zaretsky, Oakley, Ann Oakley\'s dual burden, Young and Willmott\'s symmetrical family, Murray on the underclass, Willis\'s lads, Bowles and Gintis\'s correspondence principle, Ball on setting, Becker on labelling, Bernstein on language codes, Bourdieu on cultural capital, Weber, Bruce and Wilson on secularisation, Stark and Bainbridge, Bauman and Giddens on globalisation) but never with an invented quotation or an invented statistic. Any data in a Source A passage is labelled as illustrative.',
      '- Paper 1 Section A is built on a Source A: a short model-written passage (80-150 words, in a \`\`\`passage fence) describing a piece of research or a social trend, followed by "From Source A, identify ... [2]", "Using Source A and your own knowledge, describe two ... [4]", "Explain two strengths/limitations of the method in Source A [6]".',
      '- Key terms are the syllabus\'s: norms, values, roles, status, culture, subculture, socialisation (primary, secondary), agencies of socialisation, social control (formal, informal), identity, structure and agency, positivism and interpretivism, reliability, validity, representativeness, generalisability, triangulation, nuclear and extended family, family diversity, conjugal roles, the dual burden, childhood as a social construct, meritocracy, hidden curriculum, labelling, self-fulfilling prophecy, cultural and material deprivation, cultural capital, secularisation, fundamentalism, new religious movements, hegemony, moral panic, globalisation, dependency theory.',
    ],
  }),
  domains: [
    {
      id: 'socialisation-methods',
      name: 'Paper 1: socialisation, culture and identity, and the research process',
      share: 'all of Paper 1 (AS)',
      detect: /\b(paper 1|sociali[sz]ation|nature (?:and|vs|versus) nurture|feral child\w*|norm\w*|value\w*|role\w*|culture\b|subculture\w*|agenc\w* of sociali[sz]ation|social control|identit\w+|class identity|gender identity|ethnic identity|age identity|structure and agency|research (?:method|process)\w*|positivis\w+|interpretivis\w+|quantitative|qualitative|questionnaire\w*|interview\w*|observation\w*|ethnograph\w+|sampl\w+|reliab\w+|validity|representativ\w+|generali[sz]\w+|triangulation|source a|data item|ethic\w*)\b/i,
      skills: [
        'Socialisation and identity: the nature-nurture debate and evidence from feral children, primary and secondary socialisation and the agencies (family, education, peer group, media, religion, workplace), norms, values, roles and status, formal and informal social control, culture and subcultures, the social construction of class, gender, ethnic and age identities, structure vs agency (and the structuration view)',
        'Methodology: positivism (objective, quantitative, patterns and causes) vs interpretivism (verstehen, meanings, qualitative), the research process (aims, hypotheses, operationalisation, pilot studies), sampling (random, stratified, quota, snowball, opportunity), ethics',
        'Methods and their evaluation: questionnaires, structured and unstructured interviews, participant and non-participant observation, experiments, case studies, longitudinal studies, official statistics and documents, with reliability, validity, representativeness, practical issues and researcher imposition for each; triangulation and mixed methods',
        'Source A skills: reading a method out of a description, identifying its strengths and limitations in context, using the source and own knowledge together',
      ],
      hard: [
        'Explaining why interpretivists favour a method in terms of verstehen and validity, not just "it gives detail"',
        'Evaluating a method as used in Source A rather than in general',
        'An essay on whether sociology can or should be a science that uses Durkheim, Weber, Popper and the interpretivist critique',
        'Describing how an identity is socially constructed with agencies and evidence, not an assertion that it is',
      ],
      traps: [
        'reliability and validity confused',
        'a representative sample claimed because it is large',
        'positivists said to use interviews because they are detailed',
        'socialisation described as only happening in childhood',
        '"define" answered with an example instead of a definition',
      ],
      exemplars: [
        `SA_QUESTION: Define the term 'primary socialisation'. [2]
Sample Answer: 2 marks: the first stage of socialisation, in early childhood, usually within the family, in which a child learns the basic norms, values and language of its culture through close emotional relationships. 1 mark for a partial definition such as "learning norms and values from the family" with no reference to early childhood or to it being the first stage. Does not score: "being socialised" or an example alone ("a parent teaching a child to say please").`,
        `SA_QUESTION: Read Source A and answer the question. Explain two limitations of the research method used in Source A. [6]
\`\`\`passage
Source A
A sociologist wanted to find out how young people use social media to build their identities. She joined an online gaming community under a username that gave no hint that she was a researcher and took part in its chat for six months, keeping notes each evening of the conversations she had read and the way members presented themselves. She later wrote up her notes as an account of the community's culture. The data in this source are illustrative.
\`\`\`
Sample Answer: Each limitation: 1 mark for identifying it, up to 2 for explaining it with reference to the source. Limitation 1: ethics. The research is a covert participant observation, so the gamers did not give informed consent and could not withdraw; the sociologist deceived them by hiding her role, and an interpretivist account of their identities is built on words they thought were private. Limitation 2: reliability and representativeness. The notes were written from memory each evening and depend on what one researcher noticed and how she interpreted it, so another researcher could not repeat the study and get the same findings; one gaming community over six months also cannot represent young people's use of social media in general, so the findings cannot be generalised. Also credited: the Hawthorne effect is avoided but researcher bias is not; the practical difficulty of recording in real time. Does not score: "it took a long time" with no explanation, or a limitation of questionnaires.`,
      ],
    },
    {
      id: 'family',
      name: 'Paper 2: the family (theories, diversity, roles and relationships, childhood, demographic change)',
      share: 'all of Paper 2 (AS)',
      detect: /\b(paper 2|famil\w+|household\w*|nuclear|extended famil\w*|lone[- ]parent|single[- ]parent|reconstituted|cohabit\w+|marriage|divorce|childhood|children\b|conjugal|domestic (?:labou?r|division|violence|abuse)|symmetrical|dual burden|triple shift|housework|parsons|murdock|zaretsky|engels|oakley|young and willmott|new right|murray|underclass|postmodern\w* famil\w*|demograph\w+|birth rate|fertility|ageing population|aging population|life expectancy|dependency ratio|migration)\b/i,
      skills: [
        'Theories of the family: functionalist (Murdock\'s four functions, Parsons\' two irreducible functions and the fit thesis), Marxist (Engels on inheritance, Zaretsky on the family as a prop to capitalism), feminist (liberal, Marxist and radical feminism, Oakley on housework and the dual burden, Delphy and Leonard), the New Right (Murray on the underclass and lone parents, the nuclear family as the norm), postmodern views of choice and diversity (Stacey, Beck and Beck-Gernsheim, Giddens on the pure relationship)',
        'Family diversity: types of family and household (nuclear, extended, lone-parent, reconstituted, same-sex, cohabiting, living alone), the Rapoports\' five types of diversity, cross-cultural variations, is the nuclear family in decline',
        'Roles, power and relationships: conjugal roles (segregated and joint), Young and Willmott\'s symmetrical family and the feminist critique, decision making and the control of money, domestic violence and its sociological explanations, changing gender roles and the "new man"',
        'Childhood: childhood as a social construct (Ariès), the march of progress vs conflict views, the toxic childhood and the disappearance of childhood (Postman), children\'s rights and child-centredness',
        'Demographic change: falling birth and death rates and their causes, the ageing population and its consequences, migration and family forms, changing patterns of marriage, divorce and cohabitation and their explanations (secularisation, changing position of women, legal changes, declining stigma)',
      ],
      hard: [
        'An essay on the decline of the nuclear family that weighs statistics on diversity against the argument that most people still live in or pass through nuclear families',
        'Applying the feminist critique to Young and Willmott with specific evidence (Oakley\'s figures on the share of housework, the dual burden, emotion work)',
        'Explaining a demographic trend with two developed reasons rather than a list',
        'Using the New Right and its critics in the same essay without caricature',
      ],
      traps: [
        'functionalism treated as a single writer\'s view (Murdock and Parsons differ on functions)',
        'the symmetrical family presented as proven rather than contested',
        'divorce rates read as showing marriage is rejected (most divorcees remarry)',
        'childhood described as natural rather than socially constructed, with no evidence either way',
        'evaluation that lists another theory without saying what it shows about the view in the question',
      ],
      exemplars: [
        `SA_QUESTION: Describe two ways in which the family may perform functions for society. [4]
Sample Answer: 1 mark for each way identified, 1 mark for each described. Way 1: primary socialisation. The family teaches children the norms and values of society (Parsons called the family a "factory" producing human personalities), so that culture is passed from one generation to the next and social order is maintained. Way 2: the stabilisation of adult personalities. According to Parsons, the family provides emotional support and a release from the stresses of work (the "warm bath" idea), keeping adults functioning as workers and citizens. Also credited: reproduction, economic support, regulation of sexual behaviour (Murdock), the family as a unit of consumption (Marxist, though described as a function for capitalism). Does not score: "the family looks after children" with no function for society explained.`,
        `SA_QUESTION: Evaluate the view that the nuclear family has lost its dominant position in modern industrial societies. [26]
Sample Answer: A Band 4 plan. Thesis: diversity has grown and the nuclear family is no longer the only accepted norm, but it remains the most common and most valued form, so the view overstates the change. For the view (three arguments, each with perspective and evidence): postmodernists (Stacey, Beck and Beck-Gernsheim) argue individual choice has replaced fixed structures, shown by rising cohabitation, lone-parent and reconstituted families and people living alone; the Rapoports' five types of diversity (organisational, cultural, class, life-course, cohort) show no single dominant form; feminists argue the decline of the nuclear family reflects women's greater independence through paid work, contraception and divorce law. Against the view (evaluation with evidence): Chester argues most people still live in a nuclear family at some point in their lives (the neo-conventional family), so snapshots of households exaggerate the change; functionalists and the New Right (Murray) argue the nuclear family remains the ideal that policy and most people aspire to, with most children still raised by two parents; many "new" forms (reconstituted, cohabiting couples with children) are nuclear in structure if not in legal form. Conclusion: the nuclear family's monopoly has gone but not its dominance; the extent depends on whether dominance means numbers, norms or the life course. Bands: Band 4 (20-26) uses perspectives and named studies to answer this question with sustained evaluation and a supported judgement; Band 3 (14-19) sound knowledge with some evaluation and a conclusion that is mainly asserted; Band 2 (8-13) description of family types with little theory; Band 1 (1-7) common-sense assertion.`,
      ],
    },
    {
      id: 'education',
      name: 'Paper 3: education (theories of its role, differential achievement, in-school processes, policy)',
      share: 'all of Paper 3 (A Level)',
      detect: /\b(paper 3|education\w*|school\w*|teacher\w*|pupil\w*|student achievement|differential achievement|underachieve\w*|meritocra\w+|hidden curriculum|correspondence principle|bowles|gintis|willis|lads|labelling|labeling|self[- ]fulfilling|setting|streaming|banding|anti[- ]school|subculture\w*|cultural (?:deprivation|capital)|material deprivation|bernstein|bourdieu|ball\b|becker|gender gap|ethnic\w* achievement|class (?:and|in) education|vocational|marketisation|league table\w*|parentocracy|selection|private school\w*|global\w* education)\b/i,
      skills: [
        'Theories of the role of education: functionalist (Durkheim on social solidarity, Parsons on meritocracy and role allocation, Davis and Moore), Marxist (Bowles and Gintis\'s correspondence principle and the hidden curriculum, Althusser on the ideological state apparatus, Willis\'s lads as a critique), feminist, New Right (marketisation and parental choice), postmodern and interactionist views',
        'Differential achievement by social class: material deprivation, cultural deprivation (Bernstein\'s codes, Douglas on parental interest, Sugarman), cultural capital (Bourdieu), and the critique that blames the school instead',
        'Achievement by gender and ethnicity: explanations for girls\' improvement and boys\' underachievement, the gendered curriculum and subject choice, ethnic differences explained by home factors, racism and labelling in school, and the interaction with class',
        'In-school processes: labelling and the self-fulfilling prophecy (Becker, Rosenthal and Jacobson), setting and streaming (Ball, Gillborn and Youdell on the A-C economy), pupil subcultures (Willis, Lacey), teacher expectations, the hidden curriculum',
        'Policy and change: comprehensive vs selective systems, marketisation and league tables, vocational education, education and the global economy, private and state schooling, access in developing countries',
      ],
      hard: [
        'Weighing home-background and in-school explanations of class differences in one essay with evidence for each',
        'Using Willis both as a Marxist and as a critique of Bowles and Gintis',
        'Explaining the gender gap with reasons that are specific (changes in the labour market, feminism, coursework, teacher attention) rather than "girls work harder"',
        'Applying labelling theory with the mechanism (label, treatment, internalisation, outcome) rather than naming it',
      ],
      traps: [
        'meritocracy treated as a fact rather than a functionalist claim',
        'the correspondence principle described as what schools teach rather than how they are organised',
        'cultural deprivation and cultural capital used as if they were the same explanation',
        'the self-fulfilling prophecy described without the step where the pupil accepts the label',
      ],
      exemplars: [
        `SA_QUESTION: Explain two ways in which in-school processes may affect the achievement of working-class pupils. [6]
Sample Answer: Each way: 1 mark identified, up to 2 marks developed. Way 1: labelling and the self-fulfilling prophecy. Interactionists such as Becker found teachers judge pupils against an image of the "ideal pupil" that favours middle-class speech and behaviour; working-class pupils labelled as less able may be given less attention and easier work, come to see themselves that way, and achieve less, so the label comes true. Way 2: setting and streaming. Ball found working-class pupils were over-represented in lower sets, where teachers had lower expectations and a narrower curriculum was taught, which limited the grades pupils could reach and encouraged anti-school subcultures. Also credited: the hidden curriculum (Bowles and Gintis), teacher-pupil relationships, the curriculum's middle-class cultural capital (Bourdieu). Does not score: material deprivation or home factors (not in-school), or "teachers are biased" with no process explained.`,
        `MC_QUESTION: A sociologist argues that schools reward punctuality, obedience and acceptance of hierarchy because these are the qualities employers need in a workforce, so that the way schools are organised mirrors the workplace. Which concept is being described?
A) The hidden curriculum as described by Bowles and Gintis in the correspondence principle
B) Role allocation as described by Parsons
C) Cultural capital as described by Bourdieu
D) The self-fulfilling prophecy as described by Rosenthal and Jacobson
Correct Answer: A
Explanation: The correspondence principle is the Marxist claim that the social relationships of school mirror those of work, teaching the hidden curriculum of obedience to capitalism. Choice B is the functionalist view that school sorts pupils into roles by merit.`,
      ],
    },
    {
      id: 'globalisation-media-religion',
      name: 'Paper 4 options: globalisation, media, religion',
      share: 'all of Paper 4 (A Level; candidates answer on their option)',
      detect: /\b(paper 4|globali[sz]ation|developing (?:world|countr\w+)|development\b|modernisation theory|modernization theory|dependency theory|world systems|transnational|global culture|cultural imperialism|hybridi[sz]\w+|glocali[sz]\w+|media\b|mass media|news|ownership|pluralis\w+|hegemon\w+|representation\w*|stereotyp\w+|audience\w*|hypodermic|two[- ]step|uses and gratifications|moral panic\w*|new media|digital|religio\w+|secularis\w+|secularization|church\w*|sect\w*|cult\w*|denomination\w*|new religious movement\w*|NRM\w*|fundamentalis\w+|religiosity|rational choice|spiritual)\b/i,
      skills: [
        'Globalisation and the developing world: definitions and dimensions of globalisation, theories of development (modernisation theory, dependency theory, world systems theory, neo-liberalism), transnational corporations, aid and debt, global inequality and its measures, cultural globalisation (homogenisation, hybridisation, cultural imperialism), global risks and movements',
        'Media: ownership and control (pluralist vs Marxist and neo-Marxist/hegemonic views, concentration of ownership, new media and the digital divide), the selection and presentation of news (news values, agenda setting, gatekeeping), representations of class, gender, ethnicity, age and disability and how they are changing, theories of audience effects (hypodermic syringe, two-step flow, uses and gratifications, reception analysis, cultivation), moral panics',
        'Religion: definitions (substantive, functional), theories of religion (functionalist, Marxist, feminist, Weber on the Protestant ethic), religious organisations (church, denomination, sect, cult, new religious movements and Wallis\'s types), religion and social groups (class, gender, ethnicity, age), the secularisation debate (Wilson, Bruce vs Stark and Bainbridge, Davie\'s believing without belonging, Berger), fundamentalism and religion in a global context',
      ],
      hard: [
        'The secularisation essay that treats the evidence by indicator (attendance, belief, influence) and by country rather than as one trend',
        'Comparing pluralist and hegemonic accounts of news with evidence about ownership and journalists\' autonomy',
        'Using dependency theory and modernisation theory on the same case without caricaturing either',
        'Explaining why representations have changed with reasons (ownership, regulation, audiences, social movements) rather than describing that they have',
      ],
      traps: [
        'secularisation measured by church attendance alone',
        'pluralism described as "the media are biased" (that is the Marxist view)',
        'a cult and a sect confused (Troeltsch and Wallis distinguish them by organisation and attitude to the world)',
        'globalisation treated as only economic',
        'audience theories presented without the evidence that undermines the hypodermic model',
      ],
      exemplars: [
        `SA_QUESTION: Explain two reasons why some sociologists argue that secularisation is occurring in modern industrial societies. [6]
Sample Answer: Each reason: 1 mark identified, up to 2 marks developed. Reason 1: rationalisation. Following Weber, Bruce argues that science and technology have replaced religious explanations of the world, so people turn to medicine, meteorology or psychology rather than prayer, and religion loses its plausibility as the frame through which life is understood. Reason 2: structural differentiation and disengagement. Wilson argues that institutions such as education, welfare and law, once run by the church, are now run by the state, so religion has lost its social functions and influence over public life and is confined to the private sphere, which shows in falling attendance and fewer religious marriages. Also credited: social and cultural diversity undermining a shared sacred canopy (Berger), the decline in religious socialisation of children. Does not score: "people do not go to church any more" as a reason rather than evidence, or an argument against secularisation.`,
        `MC_QUESTION: Which view of media ownership holds that media owners cannot impose their views because a range of competing media compete for audiences, who get the content they want?
A) The Marxist (manipulative) view
B) The neo-Marxist (hegemonic) view
C) The pluralist view
D) The cultivation view
Correct Answer: C
Explanation: Pluralists argue that competition and consumer choice keep media diverse and audiences in control. Choices A and B both hold that owners or a dominant ideology shape content; choice D is an audience-effects theory, not a theory of ownership.`,
      ],
    },
  ],
  difficulty: AICE_DIFFICULTY,
}
