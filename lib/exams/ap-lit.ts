// The AP English Literature and Composition exam as a reference for the guide
// prompts: Section I multiple choice with FIVE options A-E on poetry and prose
// passages, Section II three essays (poetry analysis, prose fiction analysis,
// literary argument) scored on the 6-point rubric (thesis 1, evidence and
// commentary 4, sophistication 1). Every passage is written by the model in a
// period voice and attributed generically, never a real author's text.

import type { ExamProfile } from './types'

export const AP_LIT: ExamProfile = {
  id: 'ap-lit',
  pace: 65,
  name: 'the AP English Literature and Composition exam',
  detect: {
    exam: /\bAP\s+(?:english\s+)?lit(?:erature)?\b/i,
    exclude: /\bAP\s+(?:english\s+)?lang(?:uage)?\b/i,
    subjectHints: /./,
    subjects: ['english'],
    explicit: /\bAP\s+(?:english\s+)?lit(?:erature)?\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly FIVE options A-E, as on Section I of this exam (never four). No true/false, no "I, II and III" lists. Every item is about a passage: a poem (12-30 lines) or a prose excerpt (100-250 words of fiction or drama) written BY YOU in the voice of a named period and form, attributed generically ("from a 19th-century British novel", "a sonnet in the Petrarchan form, early 17th century", "from a 20th-century American short story", "from a play, late 19th century"). Never quote or imitate a real titled work or a real author by name. The line or phrase the item asks about goes in [[double brackets]]. Items that share a passage each repeat it, so every item stands alone.
- Stems are the exam's: "In context, the phrase [[...]] primarily serves to ...", "The speaker's attitude toward ... is best described as ...", "The shift that occurs at line 9 can best be described as ...", "Which of the following best describes the function of the second stanza?", "The narrator's description of ... most directly characterizes her as ...", "In the passage, the setting functions primarily to ...", "The contrast between ... and ... emphasizes ...", "The final sentence of the passage suggests that ...", "The imagery in lines 3-6 conveys ...". Items ask what the text does and means, never for a term's definition; a literary term appears only inside a stem the exam would write (the function of the simile, the effect of the enjambment).
- Free-response items are SA_QUESTION asking for one piece of an essay in the exam's voice: "Write a thesis statement for an essay that analyzes how the poet uses ... to convey the speaker's complex understanding of ...", "In one paragraph, analyze how the narrator's point of view in the passage shapes the reader's understanding of ...", "For a literary argument on the prompt '...', write a thesis and name a work you would use, with one sentence on why it fits". The Sample Answer is the rubric: the thesis point needs a defensible interpretation of the work (not a restatement of the prompt or a summary); evidence and commentary points need specific textual evidence tied by commentary to the line of reasoning (1 point for general evidence, 2-3 for specific evidence with commentary, 4 for consistent commentary that explains how the evidence supports the interpretation); the sophistication point rewards tensions, complexities, or a broader context, not a single "insightful" sentence.
- Options are five parallel phrasings of similar length and register; the wrong ones are the misreadings under WRONG ANSWERS ARE BUILT FROM: the literal reading of a figurative line, a tone that fits a different line, an interpretation that ignores the shift, a claim about the author rather than the speaker or narrator.
- Before writing an item's answer, reread the passage and check that exactly one option is supported by its words. Fix the passage or the options until that is true. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the words in the passage that settle it, and why the most tempting wrong option fails.`,
  domains: [
    {
      id: 'short-fiction',
      name: 'Short fiction (Units 1, 4, 7): character, setting, narration, structure',
      share: 'about 42-49% of the test is prose fiction (with longer fiction)',
      detect: /\b(short (?:story|fiction)|unit [147]\b|narrator|narration|point of view|characteriz\w+|setting|plot|conflict|irony|tone|diction|syntax|prose passage|flashback|foreshadow\w*|dialogue|pacing)\b/i,
      skills: [
        'Characterization from what a figure says, does, thinks and what others say, and how the narrator\'s distance from a character shapes judgment',
        'Setting as more than place: its relation to character, mood, and social situation',
        'Narration: perspective, reliability, free indirect discourse, what the narrator knows and withholds',
        'Structure within a passage: the order of events, a shift in focus, a sentence that turns the passage',
      ],
      hard: [
        'A narrator whose judgment the passage quietly undercuts, where the right option reads the irony rather than the surface claim',
        'A characterization item where the detail describes one character but reveals another (the observer)',
        'A function item on a sentence of description that the reader must see as a comment on the preceding dialogue',
        'A tone option set where two options fit the first half of the passage and only one fits the whole',
      ],
      traps: ['the narrator taken for the author', 'a character\'s self-description taken as the passage\'s judgment', 'tone read from one vivid word instead of the whole', 'the literal reading of a figurative sentence'],
      exemplars: [
        `MC_QUESTION: In context, the sentence [[She had the look of a woman who has just remembered an appointment she never made.]] primarily serves to
\`\`\`passage
From a 20th-century American short story.

Mrs. Alden set the teacup down a little too carefully, the way she did everything when company was present. "Of course we were delighted," she said. "Of course." The word had grown thinner each time she used it, and now it would scarcely hold the weight of a saucer. Across the table her sister-in-law was describing the wedding again, the flowers, the organist who had arrived late, the bride's remarkable composure. [[She had the look of a woman who has just remembered an appointment she never made.]] Mrs. Alden nodded at the right places. Outside, the lawn had begun to take on the blue of early evening, and somewhere a screen door closed on a house where, she supposed, people said what they meant.
\`\`\`
A) suggest that Mrs. Alden is forgetful and distracted by household duties
B) convey the sister-in-law's growing impatience with Mrs. Alden's silence
C) reveal, through the narrator's ironic simile, Mrs. Alden's wish to escape a conversation she must appear to welcome
D) establish that the wedding was an event Mrs. Alden was not invited to attend
E) indicate that Mrs. Alden has suddenly recalled a genuine obligation elsewhere
Correct Answer: C
Explanation: An appointment "she never made" is an invented excuse to leave; paired with "of course" wearing thin and the house where "people said what they meant," the simile exposes her concealed wish to be gone. A and E read the simile literally; B assigns the look to the wrong woman.`,
        `SA_QUESTION: In one paragraph, analyze how the narrator's point of view in the passage above shapes the reader's understanding of Mrs. Alden. Use at least one specific detail from the passage and explain how it supports your reading.
Sample Answer: Scoring: the paragraph earns evidence and commentary credit when it names the point of view (a third-person narrator closely aligned with Mrs. Alden, with access to her perception that "of course" has grown thinner) and ties a specific detail to a claim about her: for example, that the narrator's wry simile about the appointment lets the reader see the gap between her polite nods and her wish to leave, so the reader judges the social performance rather than the woman. One point for evidence that is general ("the narrator describes her carefully"), two to three points for specific quotation with commentary that explains how the detail works, four for commentary that consistently connects the detail to a line of reasoning about the narration's effect. A summary of what happens, or a paragraph about the sister-in-law, earns nothing for this prompt.`,
      ],
    },
    {
      id: 'poetry',
      name: 'Poetry (Units 2, 5, 8): speaker, figurative language, structure, sound',
      share: 'about 36-45% of the test',
      detect: /\b(poem|poetry|poet|sonnet|stanza|speaker|meter|rhyme|enjambment|caesura|volta|imagery|metaphor|simile|personification|apostrophe|allusion|symbol\w*|lyric|elegy|ode|ballad|blank verse|couplet|quatrain|unit [258]\b)\b/i,
      skills: [
        'The speaker as a constructed voice: situation, attitude, and how the attitude develops across the poem',
        'Figurative language read for what the comparison claims and what it leaves out; extended metaphors and conceits',
        'Structure: the shift (volta), the relation of stanzas, how a closed form contains or strains against the thought',
        'Sound and syntax as meaning: enjambment, repetition, a sentence that runs past the line, a line that stops short',
      ],
      hard: [
        'A shift item where the turn is marked by syntax rather than a signal word, so the student must find the line',
        'An attitude item whose correct option names a mixed feeling (tenderness edged with resentment) while the wrong ones name one half',
        'A figurative-language item where the metaphor\'s vehicle is concrete and tempting as the literal subject',
        'A final-lines item where the ending qualifies rather than resolves what came before',
      ],
      traps: ['the poet named as the speaker', 'the literal reading of the vehicle', 'the first stanza\'s mood applied to the whole poem', 'a shift placed at the stanza break instead of where the sentence turns'],
      exemplars: [
        `MC_QUESTION: The shift that occurs in line 9 can best be described as a movement from
\`\`\`passage
A sonnet in the Petrarchan form, written in the manner of the early 17th century.

(1) I kept thy letters in a cedar chest,
(2) And read them when the house was still and dark,
(3) Each folded page a small and faithful ark
(4) That bore across the years thy plain behest.
(5) I thought the words would keep, as cedar must,
(6) Their scent of thee; I thought the ink would hold
(7) Thy hand's slight tremor, patient, unconsoled,
(8) Against the slow indifference of dust.
(9) [[But paper is a poor and dutiful thing;]]
(10) It keeps the shape of what thou didst intend
(11) And nothing of the voice that gave it wing,
(12) Nor how thou paused, nor where thy sentence turned.
(13) I have the letters still. I have, my friend,
(14) The ashes, and the memory of burning.
\`\`\`
A) grief over a loss to acceptance of its finality
B) trust in the letters' power to preserve the beloved to recognition of what they cannot hold
C) description of the cedar chest to praise of the beloved's handwriting
D) private reading to a public declaration of friendship
E) the speaker's fear of dust to a celebration of memory
Correct Answer: B
Explanation: The octave repeats "I thought the words would keep"; line 9 answers with "But paper is a poor and dutiful thing," and the sestet lists what the letters lack (the voice, the pauses). A overstates: the close is loss, not acceptance; E takes the dust literally.`,
        `MC_QUESTION: The speaker's attitude toward the letters in the final two lines is best described as
\`\`\`passage
A sonnet in the Petrarchan form, written in the manner of the early 17th century.

(1) I kept thy letters in a cedar chest,
(2) And read them when the house was still and dark,
(3) Each folded page a small and faithful ark
(4) That bore across the years thy plain behest.
(5) I thought the words would keep, as cedar must,
(6) Their scent of thee; I thought the ink would hold
(7) Thy hand's slight tremor, patient, unconsoled,
(8) Against the slow indifference of dust.
(9) But paper is a poor and dutiful thing;
(10) It keeps the shape of what thou didst intend
(11) And nothing of the voice that gave it wing,
(12) Nor how thou paused, nor where thy sentence turned.
(13) [[I have the letters still. I have, my friend,]]
(14) [[The ashes, and the memory of burning.]]
\`\`\`
A) contempt for objects that failed to do their work
B) relief that the burden of remembering has been lifted
C) possessive attachment to the beloved's words, despite knowing their limits
D) a rueful sense that what remains is the residue of a feeling rather than the feeling itself
E) renewed confidence that the letters will preserve the friendship
Correct Answer: D
Explanation: "The ashes, and the memory of burning" turns the kept letters into what is left after a fire: the speaker still has them and knows they are residue. C is tempting but "ashes" is not attachment; A and B are too strong for the quiet close.`,
      ],
    },
    {
      id: 'longer-fiction',
      name: 'Longer fiction and drama (Units 3, 6, 9): character development, dramatic situation, symbol, perspective',
      share: 'prose fiction with short fiction, about 42-49% of the test',
      detect: /\b(novel|drama|play|playwright|scene|act [1-5]|stage direction|soliloquy|monologue|aside|dramatic irony|protagonist|antagonist|foil|motif|symbol\w*|archetype|epiphany|tragic|comic|unit [369]\b|excerpt from a (?:novel|play))\b/i,
      skills: [
        'Character development across a passage: what changes, what the character fails to see, foils',
        'Dramatic situation in a play excerpt: who knows what, what the stage directions and asides do, dramatic irony',
        'Symbols and motifs read in context, including when a passage resists a symbolic reading',
        'Shifts in perspective and in the narrator\'s distance within a longer work\'s excerpt',
      ],
      hard: [
        'A drama item where the aside contradicts the spoken line and the question asks what the audience understands that another character does not',
        'A foil item where the resemblance between two characters matters as much as the contrast',
        'A symbol item where the right option is the limited, textually grounded reading and a wrong option is the grand one',
        'A perspective item where free indirect discourse blends the narrator with a character and the option set separates them',
      ],
      traps: ['stage directions ignored', 'a character\'s claim about another taken as fact', 'a symbol given a universal meaning the passage does not support', 'the protagonist\'s view treated as the work\'s'],
      exemplars: [
        `MC_QUESTION: The stage direction [[(He straightens the papers that are already straight.)]] primarily serves to
\`\`\`passage
From a play, late 19th century. The scene is the office of a provincial bank; MR. HALVORSEN, the manager, is at his desk when his clerk, PETERSEN, enters.

PETERSEN. The auditors have asked for the ledger from the spring, sir.
HALVORSEN. Have they. [[(He straightens the papers that are already straight.)]] Well, they shall have it. They shall have whatever they ask for. That is what auditors are for, Petersen: to be given things.
PETERSEN. Yes, sir. Only the spring ledger is not in the cabinet.
HALVORSEN. Then it is somewhere else. Ledgers do not walk away. (Aside.) Though I have known one to be carried.
PETERSEN. Shall I tell them tomorrow, sir?
HALVORSEN. Tell them today. Tell them cheerfully. A man who hesitates over a ledger, Petersen, has already told them everything.
\`\`\`
A) establish Halvorsen's reputation for order and efficiency
B) reveal, through a nervous gesture, an anxiety that his confident words deny
C) show that Halvorsen is bored by the routine of the auditors' request
D) indicate that Petersen has interrupted important work
E) emphasize the tidiness of the bank's record-keeping
Correct Answer: B
Explanation: Straightening what is already straight is a gesture with no purpose but to occupy the hands; it undercuts "they shall have whatever they ask for," and the aside about a ledger being "carried" confirms the fear. A and E read the gesture at face value.`,
      ],
    },
    {
      id: 'argument',
      name: 'Literary argument (the Question 3 essay and the sophistication point)',
      share: 'one of the three essays, 18% of the exam score',
      detect: /\b(literary argument|question 3|q3|open (?:essay|question|prompt)|thesis|line of reasoning|sophistication|rubric|free[- ]response|FRQ|essay|commentary|body paragraph|interpretation|defensible)\b/i,
      skills: [
        'Choosing a work and a moment in it that answers the prompt, then building a thesis that interprets rather than summarizes',
        'A line of reasoning: claims that develop in order, each supported by specific evidence from the work and commentary that explains how it supports the interpretation',
        'The sophistication point: exploring a tension or complexity in the work, situating the interpretation in a broader context, or a consistently vivid and persuasive style',
        'The same skills on Questions 1 and 2, where the evidence is the given poem or passage',
      ],
      hard: [
        'A thesis that takes a position on the prompt\'s terms ("a character\'s deception reveals ...") rather than noting that deception occurs',
        'Commentary that explains how a detail produces meaning, not that it does ("this shows")',
        'Complexity that comes from the text (the work rewards a motive it also condemns) rather than a hedge ("although some may disagree")',
        'Knowing what loses the thesis point: a restatement of the prompt, a plot summary, or a claim about life rather than the work',
      ],
      traps: ['summary in place of analysis', 'a thesis that names a theme without an interpretive claim', '"this shows" commentary', 'sophistication attempted by a general statement about human nature'],
      exemplars: [
        `SA_QUESTION: Many works of literature feature a character who keeps a secret from those closest to them. Choose a novel or play in which such a secret is central. Write a thesis statement for an essay that analyzes how the character's secrecy contributes to an interpretation of the work as a whole, and in one sentence name the work and the moment you would build the essay around.
Sample Answer: Scoring guideline for the thesis point (1 point): the thesis must make a defensible interpretive claim that connects the secrecy to a meaning of the work, with a line of reasoning the essay could follow. Earns the point: "In the novel, the protagonist's concealment of her past protects the people she loves only by making her unknowable to them, so the work presents loyalty and intimacy as demands that cannot both be met." Does not earn it: "The character keeps a secret, which has many effects on the plot" (restates the prompt), "Secrets are harmful" (a claim about life, not the work), or a summary of when the secret is revealed. The second sentence should name the work and a specific scene (the moment the secret is nearly told, or the revelation) rather than "the whole book." Note for the essay itself: evidence and commentary points come from specific moments explained in relation to this thesis; a sophistication point could come from showing that the work rewards the secrecy it also punishes.`,
        `SA_QUESTION: Write one body paragraph for an essay analyzing how the poet in the sonnet above uses the shift at line 9 to convey the speaker's complex understanding of memory. Quote at least one phrase and explain how it supports your reading.
Sample Answer: Scoring: evidence and commentary (up to 4 points). A paragraph that quotes "paper is a poor and dutiful thing" and explains that "dutiful" grants the letters obedience while denying them life, then connects that to the sestet's catalogue of what the paper lacks ("the voice that gave it wing," "where thy sentence turned"), and ties both to a claim (the speaker now understands memory as something the living voice carried and the object cannot) earns 3-4 points depending on how consistently the commentary serves the line of reasoning. A paragraph that quotes without explaining how the words work (1-2 points), or that paraphrases the poem in order ("first he kept the letters, then he realized...") without a claim about memory, earns at most 1. The thesis point is scored separately; this paragraph should advance it, not restate it.`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the recall items (a term's definition, what a word means). At most 1 item in 8 that easy, never first in a section; about half typical (one reading of a line or stanza in context) and at least a third of the kind under WHAT HARD LOOKS LIKE. Free-response pieces should need a specific quotation and commentary, not a summary.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 4 from a 5. At least 4 of every 5 items must be ones a student headed for a 3 would miss: irony the surface denies, a shift marked only by syntax, attitudes that mix two feelings, options that read the vehicle of a metaphor literally, figurative sentences whose function is a comment on the scene, and rubric tasks where one missing element loses the point. Hard never means obscure vocabulary or a trick about the form's name.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one reading each, with the speaker's situation stated plainly in the passage and the relevant line bracketed. Still real exam items with five options.`,
  },
}
