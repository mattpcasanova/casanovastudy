// The Cambridge International AS & A Level Literature in English exam (9695;
// AICE Literature in Florida) as a reference for the guide prompts. Set texts
// rotate, so the reference teaches the skills the papers reward: passage-based
// and whole-text essays on drama, poetry and prose (25 marks each), and the
// unseen paper. Passages and poems in the exemplars are written by the model
// in a period voice and attributed generically. No multiple-choice paper, so
// no pace.

import type { ExamProfile } from './types'
import { AICE_DIFFICULTY, AICE_ITEM_RULES } from './aice'

const EXAM = /\b(?:AICE|Cambridge|(?:AS|A)[- ]?Level)\s+(?:English\s+)?Lit(?:erature)?(?:\s+in\s+English)?\b|\bLiterature\s+in\s+English\b|\bLit(?:erature)?\b.*\b(?:AICE|Cambridge|A[- ]?Level)\b/i

export const AICE_LITERATURE: ExamProfile = {
  id: 'aice-literature',
  name: 'the Cambridge AS & A Level Literature in English exam (AICE Literature, 9695)',
  detect: {
    exam: EXAM,
    subjectHints: /./,
    subjects: ['english'],
    explicit: EXAM,
  },
  itemRules: AICE_ITEM_RULES('the Cambridge AS & A Level Literature in English exam', {
    mcq: false,
    structured: 'Every question is a 25-mark essay: on each paper the candidate chooses either a passage-based question ("Comment closely on ...", with the extract printed) or a whole-text question ("Discuss ways in which ...") for each set text; Paper 3 (unseen) and Paper 4 (A Level drama and poetry, pre- and post-1900) follow the same forms.',
    extra: [
      `- Essay items are SA_QUESTION in the exam's exact forms, each on a model-written passage or poem of 100-250 words in a \`\`\`passage fence, written in a plausible period voice and attributed generically ("an extract from a novel set in a northern mill town, 1850s"; "a sonnet"; "the opening of a play's second act; a kitchen, evening"); never a real author's text, never a real title. Forms: "Comment closely on the following extract, considering ways in which [the writer] presents ... [25]", "Paying close attention to language and dramatic action, discuss the following extract ... [25]", "Discuss ways in which the poet presents ... in the following poem. [25]", "In what ways, and with what effects, does the writer ... [25]". Since the set texts rotate and no real text may be used, whole-text questions are asked about the passage's imagined text ("the novel from which this extract is taken") only when the passage gives enough to answer.`,
      `- The question line asks exactly what the paper asks ("Discuss ways in which ... [25]"), never "give the plan" or "outline your answer": the student may answer in full or in note form. The Sample Answer is a plan, not a finished essay: an argument (a reading of the passage that answers the question's "ways" and "effects"), three or four points each naming a technique, quoting the words from the passage that carry it and explaining the effect it has on the reader or audience, a note on form or structure (stanza, metre, stage direction, narrative point of view), and a conclusion that returns to the argument. Then the Band descriptors from the mark scheme's assessment objectives: AO1 knowledge and understanding of the text (here, the passage) and its contexts, AO2 analysis of form, structure and language and their effects, AO3 a personal, informed response, AO4 communication (a coherent argument in appropriate literary language): Band 1 (21-25) a sophisticated, sustained argument with precise, integrated analysis; Band 3 (13-16) a sound, relevant response with some analysis of effects and some assertion; Band 5 (5-8) narrative or paraphrase with occasional comment. End with what does not score: retelling the content, listing devices with no effect, quoting at length without comment.`,
      `- Drama items must treat the extract as performance: stage directions, entrances and exits, silence, what the audience knows that a character does not, pace and dramatic tension; poetry items must handle form (stanza, rhyme, metre, line endings, enjambment, caesura) and sound as well as imagery; prose items must handle narrative method (point of view, free indirect style, tense, focalisation, irony) and structure as well as description.`,
      `- Multiple-choice quick checks (at most half the items, four options A-D) ask about the effect of a [[bracketed]] line or the function of a structural choice in a passage ("The shift to the present tense in the final paragraph most clearly ..."); every option is a reading a student might offer, and the wrong ones misread tone, overstate, or describe content instead of effect. Never a terminology-definition item.`,
      `- Quotations in a plan are quoted from the passage given; invented critics and invented authors are never cited. Contexts are described generally ("a period when ...") rather than with invented dates or facts.`,
    ],
  }),
  domains: [
    {
      id: 'drama',
      name: 'Drama (character, dramatic method, staging, audience response, the passage question)',
      share: 'one of three genres on each paper',
      detect: /\b(drama\w*|play\w*|playwright\w*|stage\w*|staging|stage direction\w*|scene\w*|act [1-5]\b|soliloqu\w+|aside\w*|dramatic (?:irony|tension|action|method)|audience\w*|dialogue|monologue|character\w*|tragedy|tragic|comedy|comic|shakespeare\w*|miller|williams|wilde|beckett|stoppard|pinter|ibsen|chekhov|hansberry|churchill|friel|performance)\b/i,
      skills: [
        'Reading an extract as something performed: who is on stage, who speaks and who is silent, entrances and exits, stage directions and what they imply for pace, movement and tone',
        'Dramatic method: dramatic irony, soliloquy and aside, contrast between scenes, the handling of time and revelation, and how each shapes the audience\'s response',
        'Character through language: register, rhythm of speech, interruption, shifts in address (thou/you, titles, names), what is not said',
        'Linking the extract to the play\'s concerns (power, family, deception, class) without retelling the plot',
      ],
      hard: [
        'A scene where the tension is in what the audience knows and a character does not, so the "effect" is dramatic irony sustained across the passage',
        'An extract in which a long stage direction does the characterising work, and the candidate must analyse it as text',
        'Comedy that turns dark mid-scene, with the tonal shift tracked through dialogue',
        'Judging how a line would be played (two valid readings) and arguing for one',
      ],
      traps: ['treating the play as a novel (ignoring performance)', 'narrating what happens in the scene', 'quoting a speech at length without commenting on its language', 'asserting "the audience feels" without showing how the text produces it'],
      exemplars: [
        `SA_QUESTION: Paying close attention to language and dramatic action, discuss the following extract, considering ways in which the playwright creates tension between the two characters. [25]
\`\`\`passage
An extract from the second act of a play; a kitchen, evening (model text)

[The table is laid for three. MARGARET sits with her coat still on. DAVID enters, carrying a newspaper, which he does not put down.]

DAVID: You've not taken your coat off.
MARGARET: No.
DAVID: It's warm in here.
MARGARET: Is it.
[Pause. DAVID looks at the third place setting, then away.]
DAVID: She said half past.
MARGARET: She said a lot of things.
DAVID: Margaret.
MARGARET: I'm only saying what she said.
[He folds the newspaper once, twice. He does not sit.]
DAVID: We'll give her till eight.
MARGARET: You'll give her till eight. I've given her twenty-two years.
\`\`\`
Sample Answer: Mark scheme (AO1-AO4): Band 1 (21-25) argues a sustained reading of how tension is built through dramatic action and language, with precise analysis of effects; Band 3 (13-16) identifies tension with some analysis and some narration; Band 5 (5-8) retells the scene. Plan: argument: tension is created less by what is said than by what both characters refuse to do (sit, take off a coat, name the absent daughter). Points: the opening stage direction (the third place laid, the coat kept on, the newspaper "which he does not put down") sets up two people holding on to objects as shields, so the audience reads the room before a word is spoken; the clipped exchange ("No." / "Is it.") with Margaret's refusal of the question mark turns small talk into refusal, and the stichomythic rhythm quickens the pace while the content stalls; the pronoun "She" never given a name signals the taboo subject and makes the audience wait for it; the pause and David's look "then away" is dramatic action carrying guilt or dread without exposition; the repeated folding of the newspaper externalises what David will not say, and "He does not sit" keeps the picture unresolved; the shift from "We'll give her" to "You'll give her" splits the couple in a single pronoun, and the final line's antithesis ("till eight" / "twenty-two years") releases the history under the scene and ends on Margaret's bitterness. Form: an extract built almost entirely of monosyllables and silences, so any longer line lands as a blow. Conclusion: the playwright makes the audience do the work of inference, which is where the tension lives. Does not score: "they are arguing about their daughter who is late" as the answer; listing "pauses, short sentences, stage directions" without effects.`,
      ],
    },
    {
      id: 'poetry',
      name: 'Poetry (form, imagery, sound, voice; unseen and set poems; comparing two poems)',
      share: 'one of three genres on each paper',
      detect: /\b(poem\w*|poet\w*|poetry|verse|stanza\w*|sonnet\w*|rhyme\w*|rhythm\w*|metre|meter|iamb\w*|enjamb\w*|caesura\w*|line (?:break|ending)s?|imagery|image\w*|metaphor\w*|simile\w*|symbol\w*|speaker|persona|voice|tone|lyric\w*|ode\w*|elegy|ballad\w*|dramatic monologue|free verse|blank verse|compar\w+ (?:two|the) poems)\b/i,
      skills: [
        'Form and structure: stanza pattern, rhyme and its breaks, metre and its disruptions, line endings (enjambment, end-stopping, caesura), the volta, how the poem\'s shape enacts its meaning',
        'Imagery and sound: patterns of image, extended metaphor, symbol; alliteration, assonance, sibilance, rhythm, used for their effect in context rather than named',
        'Voice: who speaks, to whom, in what tone; shifts of tone across the poem; the gap between speaker and poet',
        'Comparing two poems on a shared subject by method and effect, not by listing similarities and differences',
      ],
      hard: [
        'A poem whose regular form holds an unsettled content, so the tension between form and meaning is the point',
        'Tracking a tonal turn that happens in a single line (a volta disguised as a continuation)',
        'Analysing sound (a cluster of plosives, a line that runs on) for its effect rather than naming it',
        'A comparison where the poems agree in subject and differ in attitude, and the argument must explain the difference through method',
      ],
      traps: ['translating the poem into prose and calling it analysis', 'rhyme-scheme labelling (ABAB) with no effect', 'assuming the speaker is the poet', 'counting devices rather than reading the poem'],
      exemplars: [
        `SA_QUESTION: Discuss ways in which the poet presents the experience of returning to a childhood home in the following poem. [25]
\`\`\`passage
A poem (model text)

The gate still sticks. I knew it would,
and lifted as I pushed, the way my father did,
the way, it seems, my hands remembered when I could
not. The garden's smaller. So's the shed.

Somebody's painted the front door a blue
my mother would have called a shade too loud,
and I stand on a path I've walked a thousand times through,
a stranger with a key that fits, and no one home, and proud

of nothing I can name. The rooms are clean.
They've kept the hook where coats went. Not the coats.
I open the back door on the same green
and hear, from nowhere, someone humming. Then it stops.
\`\`\`
Sample Answer: Mark scheme: Band 1 (21-25) offers a sustained personal reading of how the poem presents return, analysing form, imagery, sound and voice precisely; Band 3 (13-16) a relevant reading with some analysis and some paraphrase; Band 5 (5-8) paraphrase. Plan: argument: the poem presents return as a double experience in which the body remembers what the mind has lost, and the house is at once the same and taken over. Points: the opening monosyllables and the enjambment "when I could / not" enact the stall of memory, and "my hands remembered" gives agency to the body against the conscious "I"; the flat declaratives "The garden's smaller. So's the shed." mimic the deflation of adult perspective, two sentences where a child would have needed none; the painted door's "blue / my mother would have called a shade too loud" lets the absent mother speak through the speaker's own judgement, so the house is still hers in idiom; the paradox "a stranger with a key that fits" and the suspended "proud / of nothing I can name" across the stanza break hold the speaker between belonging and intrusion; "They've kept the hook where coats went. Not the coats." uses the caesura and the fragment to make absence concrete; the closing humming "from nowhere" and the abrupt "Then it stops." refuse the consolation of a ghost or a memory and end the poem on the present tense of loss. Form: loose quatrains with off-rhymes (would/could, door/loud) suggesting a half-remembered pattern, a shape that nearly holds. Conclusion: return is presented as recognition without possession. Does not score: "the speaker is sad about the past"; listing "enjambment, caesura, rhyme" with no reading of their effects.`,
        `MC_QUESTION: In the poem above, what is the main effect of the line break in "[[and proud / of nothing I can name]]"?
A) It creates a regular rhythm that reassures the reader the speaker is at peace
B) It suspends "proud" at the line end so the reader briefly takes the pride as real before the next line empties it
C) It signals a change of speaker from the adult to the child
D) It shows the speaker has found the word for what they feel
Correct Answer: B
Explanation: The enjambment leaves "proud" hanging across the stanza break, so for a moment the pride stands alone; "of nothing I can name" then undercuts it. A misreads the tone, C invents a second speaker, and D says the opposite of "nothing I can name".`,
      ],
    },
    {
      id: 'prose',
      name: 'Prose (narrative method, point of view, structure, setting; the passage question and the whole-text essay)',
      share: 'one of three genres on each paper',
      detect: /\b(prose|novel\w*|novelist\w*|short stor\w+|fiction|narrat\w+|narrator\w*|point of view|first[- ]person|third[- ]person|omniscient|free indirect|focali[sz]\w+|setting\w*|description|characteri[sz]ation|protagonist|irony|ironic|dialogue|chapter\w*|opening|ending|closure|austen|dickens|bront[eë]\w*|hardy|woolf|joyce|conrad|fitzgerald|achebe|morrison|atwood|ishiguro|mcewan|adichie|roy)\b/i,
      skills: [
        'Narrative method: who tells, from where, with what knowledge; first person and its limits, omniscience and its judgements, free indirect style and its irony, shifts of focalisation',
        'Structure within a passage: how it opens and where it leaves the reader, the placing of description against dialogue, changes of pace, what is withheld',
        'Setting and description as meaning: the weather, the room, the object that carries a character\'s state; patterns of imagery across a passage',
        'Dialogue as characterisation: register, what characters avoid, the gap between what is said and what the narration shows',
      ],
      hard: [
        'A passage in free indirect style where the narrator\'s irony and the character\'s self-deception share the same sentences',
        'A description whose details are all doing symbolic work, so "setting" is the argument',
        'A passage that changes pace (a page of thought, then a line of action) and the effect of that structure',
        'An unreliable first-person narrator whose unreliability must be shown from the passage',
      ],
      traps: ['summarising the plot of the passage', 'ignoring the narrator and treating the events as facts', 'noting "descriptive language" with no reading of the images', 'confusing the author with the narrator'],
      exemplars: [
        `SA_QUESTION: Comment closely on the following extract, considering ways in which the writer presents the narrator's state of mind. [25]
\`\`\`passage
An extract from a novel set in a northern mill town in the 1850s (model text)

I had resolved to be sensible about the letter, and so I read it only once before breakfast, and once after, and then I put it in the drawer of the writing desk where I could not see it, and sat with my sewing by the window, which looks over the yard and the wall and, above the wall, the chimney of Thornley's, which had not smoked these three weeks.

It is a very good thing to have one's hands occupied. I have always said so. The needle went in and out, and I counted the stitches, and when I had counted forty I found that I had been thinking of the letter after all, and had put the thread through the same hole twice. I unpicked it. The chimney did not smoke. Somewhere below, Mary was singing over the pans, which she does when she is pleased, and I thought it unkind of her, and then thought it unkind of me to think so, and read the letter again.
\`\`\`
Sample Answer: Mark scheme: Band 1 (21-25) sustains a reading of the narrator's state of mind through close analysis of narrative method, structure and language; Band 3 (13-16) identifies the anxiety with some analysis and some paraphrase; Band 5 (5-8) retells. Plan: argument: the writer presents a mind that insists on its own composure while every detail of the narration betrays it, so the reader knows the narrator better than she knows herself. Points: the first-person retrospective voice with its claim "I had resolved to be sensible" is undone by the very next clause ("only once before breakfast, and once after"), the comic precision of "only" exposing the compulsion; the long accumulating sentence of the first paragraph, clause after clause of "and", enacts the effort of controlling attention, and ends on the chimney "which had not smoked these three weeks", so the unexplained letter is tied to the stopped mill and the town's anxiety without a word of explanation; the maxim "It is a very good thing to have one's hands occupied. I have always said so." shifts to the present tense of general truth, a self-instruction the reader hears as denial; the counted stitches and the thread "through the same hole twice" make the distraction concrete and small, and "I unpicked it." as a one-sentence paragraph of action performs the effort of starting again; the repeated chimney ("The chimney did not smoke.") works as a refrain of dread; Mary's singing and the double correction ("unkind of her, and then ... unkind of me") show a conscience turning on itself; the final clause, "and read the letter again", closes the loop the paragraph opened, structure enacting the mind's inability to leave the subject. Context handled generally: a time when a mill's stopping meant a town's livelihood. Does not score: "she is worried about a letter and keeps reading it" as the answer; quoting the whole second paragraph with "this shows she is anxious".`,
      ],
    },
    {
      id: 'unseen-essay-craft',
      name: 'Unseen analysis and essay craft (Paper 3 unseen; the assessment objectives; planning a 25-mark essay)',
      share: 'Paper 3 is a quarter of the A Level; essay craft runs through every paper',
      detect: /\b(unseen\w*|paper 3|essay\w*|plan\w*|argument\w*|thesis|assessment objective\w*|AO[1-5]\b|band\w*|mark scheme|personal response|embedded quotation\w*|quot\w+|PEE\b|PETAL|analysis of effects?|close reading|comment closely|exam technique|timing|introduction\w*|conclusion\w*|how to (?:write|answer|structure))\b/i,
      skills: [
        'Reading an unseen passage or poem fast and well: genre and form first, then voice and tone, then the pattern of images, then the single line that turns the piece',
        'The assessment objectives as the plan: AO1 knowledge and understanding (of this text, shown by accurate reference), AO2 analysis of form, structure and language for effects, AO3 a personal, informed response, AO4 a coherent argument in appropriate literary language',
        'Building an argument that answers the question\'s terms ("ways", "effects", "presents") with three or four points, each technique then quotation then effect, and a conclusion that develops rather than repeats',
        'Embedding short quotations in the sentence of analysis; choosing the words that carry the effect rather than the whole line',
      ],
      hard: [
        'An unseen piece whose tone is ironic, so a literal reading inverts the meaning',
        'Choosing the three points that build an argument rather than the eight that describe the passage',
        'Writing about effects without the vocabulary of certainty ("the reader feels"), using "invites", "suggests", "unsettles" with reasons',
        'A conclusion that offers a qualification or a reading of the ending instead of a summary',
      ],
      traps: ['the introduction that restates the question and announces "this essay will"', 'quoting then paraphrasing instead of analysing', 'a point per device rather than per idea', 'treating the mark scheme as a checklist of devices'],
      exemplars: [
        `SA_QUESTION: A candidate has fifteen minutes to plan a 25-mark response to an unseen poem question: "Discuss ways in which the poet presents the sea in the following poem." Describe the plan the candidate should produce, and give one model analytical sentence (technique, quotation, effect) they might write, using this line from the poem's second stanza as the quotation: [[the tide came back the way a dog comes back, unasked]].
Sample Answer: Mark scheme: credit for a plan that reads the poem before writing (form and shape, voice, the pattern of images, where the poem turns) and turns that reading into an argument about how the sea is presented (e.g. as familiar and indifferent at once), not a list of features; three or four points each tied to the argument, each with the technique, the words to quote and the effect; a note on form (stanza, rhyme, line endings) placed where it supports a point, not as a separate paragraph; a conclusion that reads the ending; and timing (plan 15, write 45, check 5). Model sentence that earns AO2 and AO4 credit: "The simile 'the tide came back the way a dog comes back, unasked' domesticates the sea into something loyal and ordinary, yet the final word 'unasked' holds the unease of a return the speaker did not want, so the sea's constancy reads as both comfort and intrusion." The sentence names the technique, embeds the quotation, and explains two layers of effect, which is what Band 1 looks like at sentence level. Does not score: a plan that is a list of devices to find; a model sentence of the kind "the poet uses a simile to compare the sea to a dog, which shows it is like a dog".`,
        `MC_QUESTION: An unseen prose extract ends: "She closed the ledger, squared it with the edge of the desk, and only then allowed herself to look at the door." Which comment on the ending would earn the most credit under AO2 (analysis of effects)?
A) The writer uses a list of three actions to describe what she does before looking at the door.
B) The delayed main point, held back by the sequence of small controlled actions and the phrase "only then allowed herself", shows a character rationing her own feeling, so the look at the door carries all the emotion the sentence has withheld.
C) The ending is effective because it makes the reader want to know who is at the door.
D) The ledger and the desk show that she works in an office, which tells us about the setting.
Correct Answer: B
Explanation: B names the structural technique (delay through accumulated controlled actions), quotes the words that carry it and explains the effect on the reader's sense of the character. A describes without effect, C asserts an effect with no analysis of how the text produces it, and D is content, not method.`,
      ],
    },
  ],
  difficulty: AICE_DIFFICULTY,
}
