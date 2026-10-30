// The Cambridge International AS & A Level English Language exam (9093; AICE
// English Language in Florida) as a reference for the guide prompts. AS Paper 1
// is reading and directed writing (analyse a text, write a directed response,
// compare the two); AS Paper 2 is writing (a shorter and an extended piece);
// A Level Paper 3 is language topics (the language of the self, English in
// the world, language and the self); A Level Paper 4 is language analysis
// (spoken language and social groups, child language acquisition, language
// change). No multiple-choice paper, so no pace.

import type { ExamProfile } from './types'
import { AICE_DIFFICULTY, AICE_ITEM_RULES } from './aice'

const EXAM = /\b(?:AICE|Cambridge|(?:AS|A)[- ]?Level)\s+English\s+Language\b|\bEnglish\s+Language\b.*\b(?:AICE|Cambridge|A[- ]?Level)\b/i

export const AICE_ENGLISH_LANGUAGE: ExamProfile = {
  id: 'aice-english-language',
  name: 'the Cambridge AS & A Level English Language exam (AICE English Language, 9093)',
  detect: {
    exam: EXAM,
    subjectHints: /./,
    subjects: ['english'],
    explicit: EXAM,
  },
  itemRules: AICE_ITEM_RULES('the Cambridge AS & A Level English Language exam', {
    mcq: false,
    structured: 'Paper 1 (reading): a 15-mark analysis of a text, a 10-mark directed response in a different form, then a 5-mark comparison of the two styles. Paper 2 (writing): a 15-mark shorter piece and a 25-mark extended piece. Papers 3 and 4: 25-mark essays and data-response analyses, with 10-mark structured parts on the given data.',
    extra: [
      `- Analysis items are SA_QUESTION on a model-written text of 150-350 words in a \`\`\`passage fence (a travel blog post, an advertisement, a speech, a review, a charity appeal, an obituary, an extract from a memoir; attributed generically with a date and form: "an extract from a travel blog, 2019"; never a real author's text), in Paper 1's exact wording: "Analyse the text, focusing on form, structure and language. [15]", or Paper 4's: "Read the following transcript of a conversation ... Analyse ways in which the speakers are using language to communicate ... In your answer you should refer to specific details from the transcript, relating your observations to ideas and studies from your wider study of spoken language. [25]". The Sample Answer is the mark scheme: the AO descriptors (AO4 analysis: form, structure and language explained for their effects on purpose and audience, linked with terminology used precisely; AO5 for Paper 4: wider knowledge of theories and concepts applied, not listed), Level 5 (13-15 or 21-25) against Level 3 (7-9 or 11-15) in one sentence each, and a plan of three or four analytical points each naming a feature, quoting it from the text and explaining its effect ("the imperative 'picture yourself' places the reader inside the scene, so the persuasion feels like an invitation").`,
      `- Directed writing items are SA_QUESTION in Paper 1's form: "The text is [form]. Write the opening of [a different form, e.g. a speech / a letter / a diary entry / a news report] for [an audience], basing your answer on the text. Write between 150 and 200 words. [10]", followed by "Compare your style with the style of the original text. [5]". The Sample Answer gives the marks for the new form's conventions (register, address, structure), for keeping to the text's content, and for the comparison's two or three points of difference explained with a quotation from each.`,
      `- Writing items (Paper 2) are SA_QUESTION with the paper's task shapes: "Write a descriptive piece called ... In your writing, create a sense of ... [15]", "Write the opening of a story in which ... [25]", "Write a review of ... for a ... website [25]", "Write a speech to ... in which you ... [25]", "Write a discursive essay on ... [25]". The Sample Answer gives the AO2 (writing: effective, accurate, appropriate to form, audience and purpose) and AO3 (content and structure: ideas developed, structure controlled) level descriptors and a plan of structure, register and three deliberate techniques for the piece, plus 60-100 words of model opening.`,
      `- Language topics (Paper 3) items are SA_QUESTION essays ("'English is no longer the property of its native speakers.' Discuss. [25]", "Discuss the view that our idiolect is the most important part of our identity. [25]") and data responses ("The following text is a transcript of an online discussion about ... Analyse ... In your answer you should refer to specific details from the text, relating your observations to ideas from your wider study of English in the world. [25]"). The Sample Answer is a plan with the concepts the mark scheme rewards (Kachru's three circles, Crystal on global English, pidgins and creoles, code-switching, language death and revitalisation, prestige and accommodation, Giles's accommodation theory, idiolect and sociolect, Labov and Trudgill on class and variation, Lakoff and Tannen on gender) used for their published positions only, with no invented quotations or statistics.`,
      `- Language analysis (Paper 4) data is model-written: a transcript with the conventions the paper uses ((.) micropause, (2) a pause in seconds, // overlapping speech, CAPITALS for emphasis, [laughs] non-verbal) in a \`\`\`passage fence, a child's utterances with the age in years;months ("Child (2;4): daddy gone car"), two short texts from different centuries for language change (written by you in a plausible period style, attributed as "an extract from a letter, 1780s"), or described corpus data ("an n-gram graph showing the frequency of 'thee' falling steadily from 1700 to 1900"). Child language items use the stages (holophrastic, two-word, telegraphic, post-telegraphic), features (overextension, underextension, virtuous errors such as "runned", holophrases) and theorists (Skinner's operant conditioning, Chomsky's LAD and the poverty of the stimulus, Bruner's LASS and scaffolding, Halliday's seven functions, Piaget's cognitive stages, Vygotsky's zone of proximal development, Berko's wug test) for their published claims only.`,
      `- Multiple-choice quick checks (at most half the items, four options A-D) point at a [[bracketed]] line of a passage or transcript and ask which feature it shows and to what effect ("The speaker's [[you know what I mean]] is best described as ..."), or which theory an observed child utterance best supports. Every option is a feature a student might name; wrong ones are near misses (a hedge for a filler, a virtuous error for overextension, synthetic personalisation for direct address). Never a bare definition item.`,
    ],
  }),
  domains: [
    {
      id: 'reading-directed-writing',
      name: 'Reading and directed writing (AS Paper 1: analysing form, structure and language; writing in a new form; comparing styles)',
      share: 'Paper 1 is half the AS',
      detect: /\b(paper 1|reading|directed (?:writing|response)|analys\w+ the text|form,? structure and language|purpose|audience|register|compare your style|text type\w*|advert\w*|blog\w*|review\w*|speech\w*|appeal|memoir|travel writ\w+|leaflet|article\w*|rhetoric\w*|persua\w+|tone)\b/i,
      skills: [
        'Reading a text for its form (genre conventions), structure (how it opens, orders and closes) and language (lexis, grammar, imagery, sound, address) and relating each to purpose and audience',
        'Precise terminology used to explain an effect, never as a label on its own: imperative, modal, second-person address, synthetic personalisation, tricolon, semantic field, nominalisation, hedging, hyperbole',
        'Writing a directed response in a different form for a stated audience, keeping to the content of the original while changing register and conventions',
        'Comparing two styles point by point with a quotation from each and the reason for the difference (form, audience, purpose)',
      ],
      hard: [
        'A text whose tone shifts halfway (warm to ironic) and must be tracked through the structure',
        'A directed task that demands a formal register from an informal original, so the content must be transformed, not copied',
        'Explaining the effect of grammar (sentence length, mood, passive voice) rather than only lexis',
        'A comparison that explains why each style suits its form rather than listing differences',
      ],
      traps: ['feature-spotting: naming devices with no effect', 'retelling the content instead of analysing the language', 'a directed response that copies phrases from the original', 'treating "the writer uses adjectives" as analysis'],
      exemplars: [
        `SA_QUESTION: Read the text below, the opening of a post from a travel blog (2019). Analyse the text, focusing on form, structure and language. [15]
\`\`\`passage
An extract from a travel blog post, 2019

Picture yourself at the end of the pier at six in the morning. The gulls have not started yet. The sea is doing that thing it does before anyone is watching, folding over itself in slow grey sheets, and the only sound is the clank of a halyard against a mast somewhere behind you.

I'd been told that Port Ellen was nothing: a ferry stop, a few whitewashed houses, a distillery you could smell before you saw it. Nothing. Reader, I stayed a week.

Here is what nobody tells you about small places. They are not small. They are simply unhurried about showing you what they have.
\`\`\`
Sample Answer: Mark scheme (AO4): Level 5 (13-15) analyses form, structure and language with precise terminology, explaining effects on the reader in relation to the blog's purpose (to entertain and to persuade the reader to visit) and audience (independent travellers who read blogs); Level 3 (7-9) identifies features with some comment on effect; Level 1 (1-3) describes content. Points that score: form and address: the imperative "Picture yourself" and second-person "you" place the reader in the scene (synthetic personalisation typical of travel blogs); structure: the move from sensory present-tense description, to a reported judgement ("nothing"), to a reversal ("Reader, I stayed a week"), to a general reflection, follows the blog's persuasive arc; language: the semantic field of quiet ("not started", "before anyone is watching", "only sound") and the personification "the sea is doing that thing it does" create intimacy; the single-word minor sentence "Nothing." repeated then overturned builds the reversal; the literary apostrophe "Reader" borrows a novelistic register for humour; the final tricolon of short declaratives ("They are not small. They are simply unhurried ...") gives the reflection the weight of an aphorism. Does not score: "the writer uses descriptive language to describe the place" with no quotation or effect; summarising the morning.`,
        `SA_QUESTION: The text in the passage above is the opening of a travel blog post. Write the opening of a leaflet produced by the island's tourist board, aimed at families planning a holiday, basing your answer on the text. Write between 150 and 200 words. [10] Then: Compare your style with the style of the original text. [5]
Sample Answer: Directed response (10): marks for the leaflet's conventions (a headline, short paragraphs or bullet points, present-tense promises, direct address to "your family", practical information such as the ferry and things to do), for a register suited to families (warm, concrete, safe, no literary irony), and for staying with the content (the quiet mornings, the whitewashed houses, the distillery, the pier). A response written as a blog or diary, or one that invents attractions the text does not mention, loses marks. Comparison (5): 1 mark per developed point, with a quotation from each text, e.g. the blog's first-person reflective voice ("I'd been told") against the leaflet's second-person promotional voice ("your family will ..."); the blog's literary devices (personification, the apostrophe "Reader") against the leaflet's plain, informative sentences; the blog's structure built on a reversal against the leaflet's structure of headline, benefits and practical details; the blog's irony about "nothing" against the leaflet's consistently positive lexis. Stating differences with no quotation or reason earns at most 2.`,
      ],
    },
    {
      id: 'writing',
      name: 'Writing (AS Paper 2: narrative, descriptive, discursive, review, speech, letter; form, style and register)',
      share: 'Paper 2 is half the AS',
      detect: /\b(paper 2|writing|narrative\w*|descriptive|descrip\w+ piece|discursive|story|opening of a story|review\w*|speech\w*|letter\w*|voice\w*|imagery|show(?:ing)? not tell\w*|creative|composition|essay)\b/i,
      skills: [
        'Choosing and sustaining the conventions of the set form: a review evaluates and recommends, a speech addresses and persuades, a descriptive piece builds atmosphere through selected detail',
        'Controlling register for audience and purpose, and sustaining it (formal to a council, intimate in a diary, playful in a magazine review)',
        'Structure that is planned: a descriptive piece that moves through space or time; a story opening that establishes voice, setting and a question; a discursive essay that develops a line of thought',
        'Deliberate technique: varied sentence length, precise verbs, imagery that earns its place, dialogue that reveals character; accuracy of grammar, spelling and punctuation',
      ],
      hard: [
        'A descriptive task with an abstract brief ("create a sense of anticipation") that must be shown through concrete detail',
        'A story opening that withholds and hints rather than explaining the backstory',
        'A discursive essay that handles a counterview fairly and still reaches a judgement',
        'A review that evaluates with evidence and a consistent persona rather than summarising the plot',
      ],
      traps: ['a story that tries to tell everything in 400 words', 'description that lists adjectives', 'a speech with no sense of a live audience', 'a review that retells instead of judging'],
      exemplars: [
        `SA_QUESTION: Write a descriptive piece called "The Waiting Room". In your writing, create a sense of time passing slowly and of the people who share the space. Write between 300 and 400 words. [15] For this task, give the plan you would follow and the opening 60-90 words.
Sample Answer: Mark scheme: AO2 (writing, 10 marks): Level 5 (9-10) is fluent, accurate and deliberately crafted for the form, with varied sentence structures and precise vocabulary; Level 3 (5-6) is generally accurate with some effective choices; AO3 (content and structure, 5 marks): Level 5 is a controlled structure with developed, relevant content answering both parts of the brief (slow time; the people). Plan that scores: a structure that moves around the room (the clock, the chairs, one person at a time, back to the clock), present tense to hold the moment, time shown through small repeated events (a drip, a page turning, a name not yet called) rather than stated, two or three people sketched through one telling detail each, sentence length that lengthens as the waiting stretches, a closing return to the clock showing little has changed. Model opening: "The clock above the reception desk has a second hand that hesitates before every tick, as if it too would rather not. Eleven chairs, bolted together in a row, and nine of them taken. Nobody speaks. A man in a hi-vis jacket turns the same page of a magazine for the third time; the woman beside him has given up on hers and is studying the pattern in the carpet, which is the colour of weak tea." Does not score highly: a piece that narrates an event (the fire alarm goes off) instead of describing; "time went slowly" stated outright.`,
        `MC_QUESTION: A student is writing a review of a new café for a local lifestyle magazine. Which opening best suits the form and audience?
A) This review will evaluate the new café on Bridge Street in terms of its food, service and atmosphere.
B) Bridge Street has waited a long time for a café worth crossing the road for. It has one now, as long as you can forgive the chairs.
C) The café, which opened in March, is located on Bridge Street and serves coffee, cakes and light lunches between 8 am and 5 pm.
D) I went to the café and I thought it was quite good, the coffee was nice but it was a bit expensive, so I'd say maybe go if you're nearby.
Correct Answer: B
Explanation: A magazine review needs a persona with a judgement and a hook: B evaluates ("worth crossing the road for"), signals a reservation in a playful register and invites the reader on. A is an essay's announcement, C is a listing's information with no evaluation, and D has a view but no control of register or structure.`,
      ],
    },
    {
      id: 'language-topics',
      name: 'Language topics (A Level Paper 3: the language of the self, English in the world, language and the self)',
      share: 'Paper 3 is a quarter of the A Level',
      detect: /\b(paper 3|english in the world|global english|world english\w*|variet\w+ of english|kachru|three circles|crystal|lingua franca|pidgin\w*|creole\w*|code[- ]switch\w*|language death|endangered language\w*|revitali[sz]\w+|standard english|prestige|accommodation|giles|idiolect|sociolect|dialect\w*|accent\w*|identity|language and the self|language of the self|labov|trudgill|lakoff|tannen|gender and language|class and language|slang|jargon)\b/i,
      skills: [
        'English in the world: the spread of English, Kachru\'s inner, outer and expanding circles, World Englishes as varieties with their own norms, English as a lingua franca, pidgins and creoles, attitudes to varieties and the standard, language death and revitalisation',
        'Language and the self: idiolect, sociolect and dialect; how speakers signal identity through lexis, accent and grammar; accommodation (convergence and divergence); code-switching; attitudes and prestige (overt and covert)',
        'Essay craft for Paper 3: a line of argument on a contested claim, concepts and named studies used to reason rather than listed, examples from varieties and contexts explained',
        'Data response: analysing a model-written text or transcript about or in a variety of English, linking details to wider study',
      ],
      hard: [
        'A claim ("English belongs to no one") that needs the circles model and the lingua-franca argument weighed against prestige and testing regimes',
        'Explaining why covert prestige keeps a stigmatised variety alive',
        'A transcript where a speaker converges and then diverges, and the identity work this does',
        'Using Labov, Trudgill, Lakoff or Tannen as evidence while noting what later work qualified',
      ],
      traps: ['listing theorists without applying them', 'treating "Standard English" as "correct English"', 'a World Englishes essay with no example from a variety', 'confusing accent with dialect'],
      exemplars: [
        `SA_QUESTION: "The idea of a single, correct English no longer makes sense." Discuss. In your answer you should refer to specific examples and to ideas from your wider study of English in the world. [25] Give the plan you would follow.
Sample Answer: Mark scheme: AO1 (knowledge of concepts and research), AO2 (a reasoned, evaluated argument) and AO3 (communication); Level 5 (21-25) shows detailed, accurate knowledge applied to a sustained argument that weighs the claim; Level 3 (11-15) has sound knowledge with some argument. Plan that scores: thesis: a single correct English never described how English was spoken, but the claim overstates how far one standard has lost its power. For the claim: Kachru's circles show more speakers in the outer and expanding circles than the inner, with outer-circle varieties (Indian, Singaporean, Nigerian English) developing their own codified norms (e.g. "prepone", "lah", "I am having a car"); English as a lingua franca is used between non-native speakers with norms of intelligibility rather than nativeness; Crystal's view that a language that belongs to so many belongs to none. Against: exams, dictionaries, publishing and international business still privilege Standard British or American English, so a standard retains overt prestige and gatekeeping power; attitudes research shows speakers of regional and global varieties still judged on deviation from the standard. Evaluation: the useful distinction is between a standard as a convenient written variety for wide communication and a standard as the only correct form; the first survives, the second has gone. Conclusion answering the claim with that qualification. Does not score: a list of theorists; "everyone speaks differently so there is no right way" with no examples or evaluation.`,
      ],
    },
    {
      id: 'language-analysis',
      name: 'Language analysis (A Level Paper 4: spoken language and social groups, child language acquisition, language change)',
      share: 'Paper 4 is a quarter of the A Level',
      detect: /\b(paper 4|spoken (?:language|discourse|interaction)|transcript\w*|conversation\w*|turn[- ]taking|adjacency pair\w*|filler\w*|hedg\w+|back[- ]?channel\w*|micropause|overlap\w*|interrupt\w*|grice\w*|maxim\w*|politeness|face|brown and levinson|child language|language acquisition|CLA\b|holophras\w+|two[- ]word|telegraphic|post[- ]telegraphic|overextension|underextension|virtuous error\w*|wug|skinner|chomsky|LAD\b|bruner|LASS\b|halliday|piaget|vygotsky|scaffold\w*|child[- ]directed speech|motherese|language change|diachronic|etymolog\w*|semantic (?:change|shift|broadening|narrowing)|amelioration|pejoration|great vowel shift|standardi[sz]ation|prescriptiv\w+|descriptiv\w+|n[- ]gram|corpus|corpora|old english|middle english|early modern)\b/i,
      skills: [
        'Spoken language: transcription conventions, features of speech (fillers, hedges, false starts, ellipsis, tag questions, back-channelling, overlaps, discourse markers), turn-taking and adjacency pairs, Grice\'s maxims, politeness and face, how social groups mark membership',
        'Child language acquisition: stages (pre-verbal, holophrastic, two-word, telegraphic, post-telegraphic), features (overextension, underextension, virtuous errors, phonological simplification), the theories (Skinner, Chomsky, Bruner, Halliday, Piaget, Vygotsky) and the evidence that supports or qualifies each',
        'Language change: lexical change (borrowing, coinage, compounding, blending, clipping), semantic change (broadening, narrowing, amelioration, pejoration), grammatical and orthographic change, standardisation, prescriptivism and descriptivism, reading diachronic texts and corpus data',
        'Data response: the paper gives data (a transcript, a child\'s speech, two texts, a graph described) and asks for analysis linked to wider study; observations must be specific and tied to a concept',
      ],
      hard: [
        'A transcript where overlaps are supportive (co-operative) rather than interruptive, and the analysis must say which and why',
        'A child utterance that fits two theories ("I goed" as Chomsky\'s rule-generation and as a virtuous error no adult modelled) and the evaluation that follows',
        'Two texts a century apart where spelling has changed less than the grammar, so the candidate must look past the surface',
        'Corpus data that shows a word rising while a prescriptivist text condemns it, and what that says about descriptivism',
      ],
      traps: ['calling every overlap an interruption', 'treating a stage as a fixed age', 'using "old-fashioned" instead of naming the change', 'reading an n-gram graph as proof of correctness'],
      exemplars: [
        `SA_QUESTION: Read the following transcript of a conversation between two friends, Jas and Mo, deciding where to eat. Analyse ways in which the speakers are using language to communicate. In your answer you should refer to specific details from the transcript, relating your observations to ideas and studies from your wider study of spoken language. [25] Give the plan you would follow.
\`\`\`passage
A transcript of a conversation between two friends (model data)

Jas: so (.) where d'you wanna go (1) I'm easy
Mo: I mean (.) I'm not THAT hungry // but
Jas: // we could just do the noodle place
Mo: yeah (.) yeah no that's fine (2) is it the one by the station or
Jas: the other one (.) you know (.) with the (.) the red chairs
Mo: oh RIGHT yeah (.) yeah no I like that one [laughs]
Jas: [laughs] sorted
\`\`\`
Sample Answer: Mark scheme: AO4 (analysis of language with terminology, effects explained) and AO5 (wider knowledge of spoken language applied); Level 5 (21-25) analyses specific features in context and relates them to concepts and studies; Level 3 (11-15) identifies features with some linkage. Plan that scores: the informal register and shared context ("the noodle place", "the one with the red chairs") marking an established friendship (Brown and Levinson: positive politeness, closeness assumed); hedges and fillers ("I mean", "I'm easy", "I'm not THAT hungry") as face-saving while a preference is negotiated; the overlap "// we could just" is co-operative, completing Mo's turn rather than seizing it (Tannen's high-involvement style); "yeah no" as a discourse marker signalling agreement while managing the shift; the pauses and false starts "the (.) the red chairs" as online planning typical of unplanned speech; the adjacency pair question ("is it the one by the station or") with its repair in the next turn; back-channelling and shared laughter closing the exchange, and "sorted" as a single-word summary that ends the episode (Grice's maxim of quantity observed). Evaluation: the transcript shows co-operation rather than competition, so a deficit reading of fillers and hedges as weakness misses their social work. Does not score: listing "fillers, pauses, overlaps" with no example or effect; treating "// we could just" as rudeness without argument.`,
        `MC_QUESTION: A child aged 2;6 looks at a horse in a field and says "big doggy". Which concept does this utterance best illustrate?
A) Underextension, because the child restricts the word "doggy" to a single animal
B) Overextension, because the child applies "doggy" to an animal that shares features with dogs
C) A virtuous error, because the child has applied a grammatical rule too widely
D) The holophrastic stage, because one word carries the meaning of a whole sentence
Correct Answer: B
Explanation: "Doggy" stretched to cover a horse (four legs, fur, a tail) is overextension, a categorical error typical of the two-word stage. Underextension would be refusing to call any other dog "doggy"; a virtuous error is grammatical ("runned"); and "big doggy" is two words, so the child has left the holophrastic stage.`,
      ],
    },
  ],
  difficulty: AICE_DIFFICULTY,
}
